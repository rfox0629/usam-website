create extension if not exists pgcrypto;

alter table public.missionary_households
  add column if not exists enable_prayer_team boolean not null default true,
  add column if not exists prayer_section_headline text,
  add column if not exists prayer_section_description text;

create table if not exists public.prayer_partners (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  workspace_id uuid references public.missionary_households(id) on delete set null,
  missionary_profile_id uuid references public.missionary_households(id) on delete set null,
  missionary_profile_slug text,
  name text,
  first_name text,
  last_name text,
  email text,
  phone text,
  city text,
  state text,
  region text,
  how_heard text,
  source text not null default 'public_profile',
  status text not null default 'pending',
  permissions jsonb not null default '{}'::jsonb,
  assigned_coverage jsonb not null default '{}'::jsonb,
  email_alerts boolean not null default true,
  sms_alerts boolean not null default false,
  internal_notes text,
  recruited_by text,
  recruited_by_household_id uuid references public.missionary_households(id) on delete set null,
  recruited_by_household_name text,
  recruited_by_household_number text,
  recruited_by_profile_slug text,
  date_joined timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.prayer_partners
  add column if not exists organization_id uuid,
  add column if not exists workspace_id uuid references public.missionary_households(id) on delete set null,
  add column if not exists missionary_profile_id uuid references public.missionary_households(id) on delete set null,
  add column if not exists missionary_profile_slug text,
  add column if not exists name text,
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists region text,
  add column if not exists how_heard text,
  add column if not exists source text default 'public_profile',
  add column if not exists status text default 'pending',
  add column if not exists permissions jsonb default '{}'::jsonb,
  add column if not exists assigned_coverage jsonb default '{}'::jsonb,
  add column if not exists email_alerts boolean default true,
  add column if not exists sms_alerts boolean default false,
  add column if not exists internal_notes text,
  add column if not exists recruited_by text,
  add column if not exists recruited_by_household_id uuid references public.missionary_households(id) on delete set null,
  add column if not exists recruited_by_household_name text,
  add column if not exists recruited_by_household_number text,
  add column if not exists recruited_by_profile_slug text,
  add column if not exists date_joined timestamptz default now(),
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.prayer_partners
set
  assigned_coverage = coalesce(assigned_coverage, '{}'::jsonb),
  date_joined = coalesce(date_joined, created_at, now()),
  email_alerts = coalesce(email_alerts, true),
  missionary_profile_id = coalesce(missionary_profile_id, recruited_by_household_id),
  missionary_profile_slug = coalesce(missionary_profile_slug, recruited_by_profile_slug),
  permissions = coalesce(permissions, '{}'::jsonb),
  sms_alerts = coalesce(sms_alerts, false),
  source = coalesce(nullif(source, ''), 'public_profile'),
  status = case
    when status = 'active' then 'active'
    when status = 'inactive' then 'inactive'
    when status = 'archived' then 'archived'
    when status = 'declined' then 'declined'
    else 'pending'
  end,
  workspace_id = coalesce(workspace_id, recruited_by_household_id);

alter table public.prayer_partners
  alter column source set default 'public_profile',
  alter column status set default 'pending',
  alter column permissions set default '{}'::jsonb,
  alter column assigned_coverage set default '{}'::jsonb,
  alter column email_alerts set default true,
  alter column sms_alerts set default false,
  alter column date_joined set default now(),
  alter column created_at set default now(),
  alter column updated_at set default now();

alter table public.prayer_partners
  drop constraint if exists prayer_partners_status_check,
  drop constraint if exists prayer_partners_source_check;

alter table public.prayer_partners
  add constraint prayer_partners_status_check
  check (status in ('pending', 'active', 'inactive', 'declined', 'archived')),
  add constraint prayer_partners_source_check
  check (source in ('public_profile', 'admin_added', 'import', 'dos', 'public_form', 'prayer_team_application'));

create unique index if not exists prayer_partners_email_household_unique_idx
  on public.prayer_partners (
    lower(email),
    coalesce(recruited_by_household_id, workspace_id, missionary_profile_id)
  )
  where email is not null and btrim(email) <> '';

create index if not exists prayer_partners_household_status_idx
  on public.prayer_partners(recruited_by_household_id, status);

create index if not exists prayer_partners_workspace_status_idx
  on public.prayer_partners(workspace_id, status);

create index if not exists prayer_partners_profile_slug_idx
  on public.prayer_partners(missionary_profile_slug);

create index if not exists prayer_partners_status_joined_idx
  on public.prayer_partners(status, date_joined desc);

create index if not exists prayer_partners_state_region_idx
  on public.prayer_partners(state, region);

create table if not exists public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  workspace_id uuid references public.missionary_households(id) on delete set null,
  household_id uuid references public.missionary_households(id) on delete set null,
  related_household_id uuid references public.missionary_households(id) on delete set null,
  related_missionary_profile_id uuid references public.missionary_households(id) on delete set null,
  field_person_id uuid,
  title text,
  request text,
  description text,
  category text,
  urgency text not null default 'normal',
  status text not null default 'open',
  visibility text not null default 'private',
  confidentiality_level text not null default 'missionary_couple',
  source text not null default 'public_form',
  assigned_partner_ids uuid[],
  prayer_notes text,
  prayed_count integer not null default 0,
  last_prayed_at timestamptz,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.prayer_requests
  add column if not exists organization_id uuid,
  add column if not exists workspace_id uuid references public.missionary_households(id) on delete set null,
  add column if not exists household_id uuid references public.missionary_households(id) on delete set null,
  add column if not exists related_household_id uuid references public.missionary_households(id) on delete set null,
  add column if not exists related_missionary_profile_id uuid references public.missionary_households(id) on delete set null,
  add column if not exists field_person_id uuid,
  add column if not exists title text,
  add column if not exists request text,
  add column if not exists description text,
  add column if not exists category text,
  add column if not exists urgency text default 'normal',
  add column if not exists status text default 'open',
  add column if not exists visibility text default 'private',
  add column if not exists confidentiality_level text default 'missionary_couple',
  add column if not exists source text default 'public_form',
  add column if not exists assigned_partner_ids uuid[],
  add column if not exists prayer_notes text,
  add column if not exists prayed_count integer default 0,
  add column if not exists last_prayed_at timestamptz,
  add column if not exists answered_at timestamptz,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.prayer_requests
set
  confidentiality_level = coalesce(nullif(confidentiality_level, ''), 'missionary_couple'),
  description = coalesce(description, request),
  prayed_count = coalesce(prayed_count, 0),
  request = coalesce(request, description, ''),
  source = coalesce(nullif(source, ''), 'public_form'),
  status = case
    when status = 'active' then 'open'
    when status in ('open', 'covered', 'answered', 'archived') then status
    else 'open'
  end,
  urgency = coalesce(nullif(urgency, ''), 'normal'),
  visibility = coalesce(nullif(visibility, ''), 'private'),
  workspace_id = coalesce(workspace_id, household_id, related_household_id);

alter table public.prayer_requests
  alter column urgency set default 'normal',
  alter column status set default 'open',
  alter column visibility set default 'private',
  alter column confidentiality_level set default 'missionary_couple',
  alter column source set default 'public_form',
  alter column prayed_count set default 0,
  alter column created_at set default now(),
  alter column updated_at set default now();

alter table public.prayer_requests
  drop constraint if exists prayer_requests_status_check,
  drop constraint if exists prayer_requests_urgency_check,
  drop constraint if exists prayer_requests_visibility_check,
  drop constraint if exists prayer_requests_confidentiality_level_check,
  drop constraint if exists prayer_requests_source_check;

alter table public.prayer_requests
  add constraint prayer_requests_status_check
  check (status in ('open', 'covered', 'answered', 'archived', 'active')),
  add constraint prayer_requests_urgency_check
  check (urgency in ('normal', 'important', 'urgent')),
  add constraint prayer_requests_visibility_check
  check (visibility in ('public', 'team', 'private')),
  add constraint prayer_requests_confidentiality_level_check
  check (confidentiality_level in ('general', 'missionary_couple', 'kitchen_table', 'confidential')),
  add constraint prayer_requests_source_check
  check (source in ('public_form', 'admin_added', 'dos', 'prayer_team'));

create index if not exists prayer_requests_workspace_status_idx
  on public.prayer_requests(workspace_id, status);

create index if not exists prayer_requests_household_status_idx
  on public.prayer_requests(household_id, status);

create index if not exists prayer_requests_related_household_idx
  on public.prayer_requests(related_household_id, status);

create index if not exists prayer_requests_visibility_status_idx
  on public.prayer_requests(visibility, status);

create index if not exists prayer_requests_status_urgency_idx
  on public.prayer_requests(status, urgency, created_at desc);

create or replace function public.set_prayer_team_updated_at()
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

drop trigger if exists set_prayer_partners_updated_at on public.prayer_partners;
create trigger set_prayer_partners_updated_at
  before update on public.prayer_partners
  for each row
  execute function public.set_prayer_team_updated_at();

drop trigger if exists set_prayer_requests_updated_at on public.prayer_requests;
create trigger set_prayer_requests_updated_at
  before update on public.prayer_requests
  for each row
  execute function public.set_prayer_team_updated_at();

alter table public.prayer_partners enable row level security;
alter table public.prayer_requests enable row level security;

revoke all on table public.prayer_partners from anon;
revoke all on table public.prayer_partners from authenticated;
revoke all on table public.prayer_requests from anon;
revoke all on table public.prayer_requests from authenticated;

grant select, insert, update on table public.prayer_partners to authenticated;
grant select on table public.prayer_requests to anon;
grant select, insert, update on table public.prayer_requests to authenticated;
grant all on table public.prayer_partners to service_role;
grant all on table public.prayer_requests to service_role;

drop policy if exists "Admins can manage prayer partners" on public.prayer_partners;
create policy "Admins can manage prayer partners"
  on public.prayer_partners
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role = 'admin'
        and coalesce(admin_users.is_active, true) = true
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role = 'admin'
        and coalesce(admin_users.is_active, true) = true
    )
  );

drop policy if exists "Admins can manage prayer requests" on public.prayer_requests;
create policy "Admins can manage prayer requests"
  on public.prayer_requests
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role = 'admin'
        and coalesce(admin_users.is_active, true) = true
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role = 'admin'
        and coalesce(admin_users.is_active, true) = true
    )
  );

drop policy if exists "Public can read approved household prayer requests" on public.prayer_requests;
create policy "Public can read approved household prayer requests"
  on public.prayer_requests
  for select
  to anon, authenticated
  using (
    visibility = 'public'
    and status in ('active', 'open')
    and exists (
      select 1
      from public.missionary_households
      where missionary_households.id = prayer_requests.household_id
        and missionary_households.public_visible = true
        and missionary_households.show_prayer is not false
    )
  );

comment on table public.prayer_partners is
  'Household-connected prayer partners for public profile signups and National Command Center prayer ministry operations.';

comment on column public.prayer_partners.status is
  'Prayer partner workflow status: pending, active, inactive, declined, or archived.';

comment on table public.prayer_requests is
  'Private-by-default prayer requests submitted from public missionary profiles or created by admins.';
