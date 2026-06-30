create extension if not exists pgcrypto;

alter table public.prayer_partners
  add column if not exists field_person_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'prayer_partners_field_person_id_fkey'
      and conrelid = 'public.prayer_partners'::regclass
  ) then
    alter table public.prayer_partners
      add constraint prayer_partners_field_person_id_fkey
      foreign key (field_person_id)
      references public.missionary_field_people(id)
      on delete set null;
  end if;
end $$;

create index if not exists prayer_partners_field_person_id_idx
  on public.prayer_partners(field_person_id)
  where field_person_id is not null;

create index if not exists prayer_partners_scope_field_person_status_idx
  on public.prayer_partners(
    coalesce(recruited_by_household_id, workspace_id, missionary_profile_id),
    field_person_id,
    status
  )
  where field_person_id is not null;

create table if not exists public.person_roles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  field_person_id uuid not null references public.missionary_field_people(id) on delete cascade,
  role text not null,
  status text not null default 'active',
  source text not null default 'system',
  role_record_table text,
  role_record_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.person_roles
  add column if not exists workspace_id uuid references public.missionary_households(id) on delete cascade,
  add column if not exists field_person_id uuid references public.missionary_field_people(id) on delete cascade,
  add column if not exists role text,
  add column if not exists status text default 'active',
  add column if not exists source text default 'system',
  add column if not exists role_record_table text,
  add column if not exists role_record_id uuid,
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.person_roles
set
  metadata = coalesce(metadata, '{}'::jsonb),
  role = coalesce(nullif(role, ''), 'field_contact'),
  source = coalesce(nullif(source, ''), 'system'),
  status = case
    when status in ('active', 'archived', 'declined', 'inactive', 'invited', 'pending') then status
    else 'active'
  end
where role is null
  or source is null
  or status is null
  or metadata is null
  or status not in ('active', 'archived', 'declined', 'inactive', 'invited', 'pending');

alter table public.person_roles
  alter column workspace_id set not null,
  alter column field_person_id set not null,
  alter column role set not null,
  alter column status set not null,
  alter column status set default 'active',
  alter column source set not null,
  alter column source set default 'system',
  alter column metadata set not null,
  alter column metadata set default '{}'::jsonb,
  alter column created_at set default now(),
  alter column updated_at set default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'person_roles_role_check'
      and conrelid = 'public.person_roles'::regclass
  ) then
    alter table public.person_roles
      add constraint person_roles_role_check
      check (role in ('field_contact', 'household_member', 'mentor', 'prayer_partner', 'support_partner'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'person_roles_status_check'
      and conrelid = 'public.person_roles'::regclass
  ) then
    alter table public.person_roles
      add constraint person_roles_status_check
      check (status in ('active', 'archived', 'declined', 'inactive', 'invited', 'pending'));
  end if;
end $$;

create index if not exists person_roles_workspace_role_status_idx
  on public.person_roles(workspace_id, role, status);

create index if not exists person_roles_field_person_idx
  on public.person_roles(field_person_id);

create unique index if not exists person_roles_role_record_unique_idx
  on public.person_roles(role_record_table, role_record_id)
  where role_record_table is not null
    and role_record_id is not null;

create unique index if not exists person_roles_workspace_person_role_unique_idx
  on public.person_roles(workspace_id, field_person_id, role)
  where role_record_table is null
    and role_record_id is null;

create or replace function public.set_person_roles_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_person_roles_updated_at on public.person_roles;
create trigger set_person_roles_updated_at
  before update on public.person_roles
  for each row
  execute function public.set_person_roles_updated_at();

alter table public.person_roles enable row level security;

revoke all on table public.person_roles from anon;
revoke all on table public.person_roles from authenticated;
grant select, insert, update, delete on table public.person_roles to authenticated;
grant all on table public.person_roles to service_role;

drop policy if exists "Admins can manage person roles" on public.person_roles;
create policy "Admins can manage person roles"
  on public.person_roles
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
        and coalesce(admin_users.is_active, true) = true
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
        and coalesce(admin_users.is_active, true) = true
    )
  );

with scoped_partners as (
  select
    prayer_partners.id,
    prayer_partners.field_person_id,
    prayer_partners.email,
    lower(nullif(btrim(prayer_partners.email), '')) as email_key,
    nullif(regexp_replace(coalesce(prayer_partners.phone, ''), '[^0-9]', '', 'g'), '') as phone_digits,
    coalesce(prayer_partners.workspace_id, prayer_partners.recruited_by_household_id, prayer_partners.missionary_profile_id) as scope_id
  from public.prayer_partners
  where prayer_partners.field_person_id is null
),
email_matches as (
  select distinct on (scoped_partners.id)
    scoped_partners.id as partner_id,
    missionary_field_people.id as person_id
  from scoped_partners
  join public.missionary_field_people
    on coalesce(missionary_field_people.workspace_id, missionary_field_people.household_id) = scoped_partners.scope_id
  where scoped_partners.email_key is not null
    and lower(nullif(btrim(missionary_field_people.email), '')) = scoped_partners.email_key
    and coalesce(missionary_field_people.status, 'active') not in ('archived', 'deleted')
  order by
    scoped_partners.id,
    case coalesce(missionary_field_people.field_visibility, 'primary')
      when 'primary' then 0
      when 'secondary' then 1
      else 2
    end,
    missionary_field_people.updated_at desc nulls last
)
update public.prayer_partners
set field_person_id = email_matches.person_id
from email_matches
where prayer_partners.id = email_matches.partner_id
  and prayer_partners.field_person_id is null;

with scoped_partners as (
  select
    prayer_partners.id,
    prayer_partners.field_person_id,
    nullif(regexp_replace(coalesce(prayer_partners.phone, ''), '[^0-9]', '', 'g'), '') as phone_digits,
    coalesce(prayer_partners.workspace_id, prayer_partners.recruited_by_household_id, prayer_partners.missionary_profile_id) as scope_id
  from public.prayer_partners
  where prayer_partners.field_person_id is null
),
phone_matches as (
  select distinct on (scoped_partners.id)
    scoped_partners.id as partner_id,
    missionary_field_people.id as person_id
  from scoped_partners
  join public.missionary_field_people
    on coalesce(missionary_field_people.workspace_id, missionary_field_people.household_id) = scoped_partners.scope_id
  where length(scoped_partners.phone_digits) >= 7
    and regexp_replace(coalesce(missionary_field_people.phone, ''), '[^0-9]', '', 'g') = scoped_partners.phone_digits
    and coalesce(missionary_field_people.status, 'active') not in ('archived', 'deleted')
  order by
    scoped_partners.id,
    case coalesce(missionary_field_people.field_visibility, 'primary')
      when 'primary' then 0
      when 'secondary' then 1
      else 2
    end,
    missionary_field_people.updated_at desc nulls last
)
update public.prayer_partners
set field_person_id = phone_matches.person_id
from phone_matches
where prayer_partners.id = phone_matches.partner_id
  and prayer_partners.field_person_id is null;

with unlinked_partners as (
  select
    prayer_partners.id,
    lower(nullif(btrim(prayer_partners.email), '')) as email_key,
    nullif(regexp_replace(coalesce(prayer_partners.phone, ''), '[^0-9]', '', 'g'), '') as phone_digits,
    prayer_partners.email,
    coalesce(
      nullif(btrim(prayer_partners.name), ''),
      nullif(btrim(concat_ws(' ', prayer_partners.first_name, prayer_partners.last_name)), ''),
      nullif(btrim(prayer_partners.email), ''),
      nullif(btrim(prayer_partners.phone), ''),
      'Prayer Partner'
    ) as display_name,
    prayer_partners.phone,
    coalesce(prayer_partners.workspace_id, prayer_partners.recruited_by_household_id, prayer_partners.missionary_profile_id) as scope_id
  from public.prayer_partners
  where prayer_partners.field_person_id is null
),
missing_partner_people as (
  select unlinked_partners.*
  from unlinked_partners
  where unlinked_partners.scope_id is not null
    and not exists (
      select 1
      from public.missionary_field_people existing_people
      where coalesce(existing_people.workspace_id, existing_people.household_id) = unlinked_partners.scope_id
        and coalesce(existing_people.status, 'active') not in ('archived', 'deleted')
        and (
          (
            unlinked_partners.email_key is not null
            and lower(nullif(btrim(existing_people.email), '')) = unlinked_partners.email_key
          )
          or (
            length(unlinked_partners.phone_digits) >= 7
            and regexp_replace(coalesce(existing_people.phone, ''), '[^0-9]', '', 'g') = unlinked_partners.phone_digits
          )
        )
    )
)
insert into public.missionary_field_people (
  household_id,
  workspace_id,
  name,
  phone,
  email,
  relationship_type,
  engagement_level,
  field_visibility,
  household_notes,
  source,
  status
)
select
  scope_id,
  scope_id,
  display_name,
  nullif(btrim(phone), ''),
  nullif(btrim(email), ''),
  'new',
  '0',
  'hidden',
  'Prayer-only contact created from prayer partner record ' || id::text || '. Hidden from Field list by default.',
  'field',
  'new'
from missing_partner_people;

with created_hidden_people as (
  select
    prayer_partners.id as partner_id,
    missionary_field_people.id as person_id
  from public.prayer_partners
  join public.missionary_field_people
    on missionary_field_people.household_notes = 'Prayer-only contact created from prayer partner record ' || prayer_partners.id::text || '. Hidden from Field list by default.'
  where prayer_partners.field_person_id is null
)
update public.prayer_partners
set field_person_id = created_hidden_people.person_id
from created_hidden_people
where prayer_partners.id = created_hidden_people.partner_id
  and prayer_partners.field_person_id is null;

insert into public.person_roles (
  workspace_id,
  field_person_id,
  role,
  status,
  source,
  role_record_table,
  role_record_id,
  metadata
)
select
  coalesce(prayer_partners.workspace_id, prayer_partners.recruited_by_household_id, prayer_partners.missionary_profile_id),
  prayer_partners.field_person_id,
  'prayer_partner',
  case
    when prayer_partners.status in ('active', 'archived', 'declined', 'inactive', 'pending') then prayer_partners.status
    else 'pending'
  end,
  coalesce(nullif(prayer_partners.source, ''), 'system'),
  'prayer_partners',
  prayer_partners.id,
  jsonb_build_object(
    'prayer_partner_status', prayer_partners.status,
    'source', prayer_partners.source
  )
from public.prayer_partners
where prayer_partners.field_person_id is not null
  and coalesce(prayer_partners.workspace_id, prayer_partners.recruited_by_household_id, prayer_partners.missionary_profile_id) is not null
on conflict (role_record_table, role_record_id)
where role_record_table is not null
  and role_record_id is not null
do update set
  workspace_id = excluded.workspace_id,
  field_person_id = excluded.field_person_id,
  role = excluded.role,
  status = excluded.status,
  source = excluded.source,
  metadata = public.person_roles.metadata || excluded.metadata,
  updated_at = now();

comment on column public.prayer_partners.field_person_id is
  'Canonical DOS person/contact linked to this prayer partner. Prayer-only people should remain hidden from Field unless promoted.';

comment on table public.person_roles is
  'Workspace-scoped roles attached to canonical DOS person/contact records, allowing one person to be a field contact, prayer partner, support partner, mentor, or household member without duplicate identities.';

notify pgrst, 'reload schema';
