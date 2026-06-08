alter table public.missionary_households
  add column if not exists show_team boolean not null default true;

create table if not exists public.missionary_team_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.missionary_households(id) on delete cascade,
  display_name text not null,
  public_number text,
  role_title text,
  short_description text,
  sort_order integer not null default 0,
  is_public boolean not null default true,
  dos_user_id text,
  source text not null default 'website_admin',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.missionary_team_members
  add column if not exists household_id uuid references public.missionary_households(id) on delete cascade,
  add column if not exists display_name text,
  add column if not exists public_number text,
  add column if not exists role_title text,
  add column if not exists short_description text,
  add column if not exists sort_order integer not null default 0,
  add column if not exists is_public boolean not null default true,
  add column if not exists dos_user_id text,
  add column if not exists source text not null default 'website_admin',
  add column if not exists status text not null default 'active',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.missionary_team_members
set display_name = 'Unnamed Team Member'
where display_name is null or btrim(display_name) = '';

alter table public.missionary_team_members
  alter column display_name set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'missionary_team_members_status_check'
      and conrelid = 'public.missionary_team_members'::regclass
  ) then
    alter table public.missionary_team_members
      add constraint missionary_team_members_status_check
      check (status in ('active', 'hidden', 'archived'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'missionary_team_members_source_check'
      and conrelid = 'public.missionary_team_members'::regclass
  ) then
    alter table public.missionary_team_members
      add constraint missionary_team_members_source_check
      check (source in ('website_admin', 'dos', 'public_form'));
  end if;
end $$;

create index if not exists missionary_team_members_household_status_sort_idx
  on public.missionary_team_members(household_id, status, is_public, sort_order);

alter table public.missionary_team_members enable row level security;

create or replace function public.set_missionary_team_members_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_missionary_team_members_updated_at on public.missionary_team_members;
create trigger set_missionary_team_members_updated_at
  before update on public.missionary_team_members
  for each row
  execute function public.set_missionary_team_members_updated_at();

drop policy if exists "Public can read visible team members" on public.missionary_team_members;
create policy "Public can read visible team members"
  on public.missionary_team_members
  for select
  to anon, authenticated
  using (
    is_public = true
    and status = 'active'
    and exists (
      select 1
      from public.missionary_households
      where missionary_households.id = missionary_team_members.household_id
        and missionary_households.public_visible = true
        and missionary_households.show_household is not false
        and missionary_households.show_team is not false
    )
  );

update public.missionary_team_members
set public_number = lpad(regexp_replace(public_number, '\D', '', 'g'), 4, '0')
where public_number is not null
  and btrim(public_number) <> ''
  and regexp_replace(public_number, '\D', '', 'g') ~ '^\d{1,4}$';

insert into public.missionary_team_members (
  household_id,
  display_name,
  public_number,
  role_title,
  sort_order,
  is_public,
  source,
  status
)
select
  missionary_people.household_id,
  trim(concat_ws(' ', missionary_people.first_name, missionary_people.last_name)) as display_name,
  case
    when nullif(trim(missionary_people.missionary_number), '') is null then null
    when nullif(regexp_replace(missionary_people.missionary_number, '\D', '', 'g'), '') is null then null
    else lpad(regexp_replace(missionary_people.missionary_number, '\D', '', 'g'), 4, '0')
  end as public_number,
  missionary_people.role as role_title,
  coalesce(missionary_people.sort_order, 0) as sort_order,
  missionary_people.is_public is not false as is_public,
  'website_admin' as source,
  case when missionary_people.is_public is false then 'hidden' else 'active' end as status
from public.missionary_people
where trim(concat_ws(' ', missionary_people.first_name, missionary_people.last_name)) <> ''
  and not exists (
    select 1
    from public.missionary_team_members existing_member
    where existing_member.household_id = missionary_people.household_id
      and lower(existing_member.display_name) = lower(trim(concat_ws(' ', missionary_people.first_name, missionary_people.last_name)))
  );

do $$
declare
  fox_household uuid;
begin
  select id into fox_household
  from public.missionary_households
  where slug = 'ryan-brooke-fox';

  if fox_household is not null then
    update public.missionary_team_members
    set public_number = seed.public_number,
        role_title = seed.role_title,
        sort_order = seed.sort_order,
        is_public = true,
        status = 'active',
        updated_at = now()
    from (
      values
        ('God', '0001', null, 1),
        ('Ryan Fox', '0002', 'Missionary', 2),
        ('Brooke Fox', '0003', 'Missionary', 3),
        ('Parker Fox', '0004', null, 4),
        ('Oakley Fox', '0005', null, 5),
        ('Gunner Fox', '0006', null, 6),
        ('Axel Fox', '0007', null, 7),
        ('Jersey Fox', '0008', null, 8)
    ) as seed(display_name, public_number, role_title, sort_order)
    where missionary_team_members.household_id = fox_household
      and lower(missionary_team_members.display_name) = lower(seed.display_name);

    insert into public.missionary_team_members (
      household_id,
      display_name,
      public_number,
      role_title,
      sort_order,
      is_public,
      source,
      status
    )
    select
      fox_household,
      seed.display_name,
      seed.public_number,
      seed.role_title,
      seed.sort_order,
      true,
      'website_admin',
      'active'
    from (
      values
        ('God', '0001', null, 1),
        ('Ryan Fox', '0002', 'Missionary', 2),
        ('Brooke Fox', '0003', 'Missionary', 3),
        ('Parker Fox', '0004', null, 4),
        ('Oakley Fox', '0005', null, 5),
        ('Gunner Fox', '0006', null, 6),
        ('Axel Fox', '0007', null, 7),
        ('Jersey Fox', '0008', null, 8)
    ) as seed(display_name, public_number, role_title, sort_order)
    where not exists (
      select 1
      from public.missionary_team_members existing_member
      where existing_member.household_id = fox_household
        and lower(existing_member.display_name) = lower(seed.display_name)
    );
  end if;
end $$;

do $$
declare
  invalid_numbers text;
begin
  select string_agg(display_name || ' (' || id::text || '): ' || public_number, ', ')
  into invalid_numbers
  from public.missionary_team_members
  where public_number is not null
    and public_number !~ '^\d{4}$';

  if invalid_numbers is not null then
    raise exception 'Cannot add global public_number format constraint. Invalid public numbers: %', invalid_numbers;
  end if;
end $$;

do $$
declare
  duplicate_numbers text;
begin
  select string_agg(public_number || ' => ' || members, '; ')
  into duplicate_numbers
  from (
    select
      public_number,
      string_agg(display_name || ' (' || id::text || ')', ', ' order by display_name) as members
    from public.missionary_team_members
    where public_number is not null
    group by public_number
    having count(*) > 1
  ) duplicates;

  if duplicate_numbers is not null then
    raise exception 'Cannot add global public_number uniqueness constraint. Duplicate public numbers: %', duplicate_numbers;
  end if;
end $$;

alter table public.missionary_team_members
  drop constraint if exists missionary_team_members_household_number_unique;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'missionary_team_members_public_number_format_check'
      and conrelid = 'public.missionary_team_members'::regclass
  ) then
    alter table public.missionary_team_members
      add constraint missionary_team_members_public_number_format_check
      check (public_number is null or public_number ~ '^\d{4}$');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'missionary_team_members_public_number_unique'
      and conrelid = 'public.missionary_team_members'::regclass
  ) then
    alter table public.missionary_team_members
      add constraint missionary_team_members_public_number_unique
      unique (public_number);
  end if;
end $$;

comment on table public.missionary_team_members is
  'Profiles public roster records only. Do not use Team for disciples, follow-up contacts, or ministry relationship storage.';

comment on column public.missionary_team_members.public_number is
  'Global display-only USA Missionaries public roster number. UUID remains the backend database ID.';

comment on column public.missionary_team_members.dos_user_id is
  'Optional legacy/user identity reference for a public roster member. Not a relationship model.';
