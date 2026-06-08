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
  updated_at timestamptz not null default now(),
  constraint missionary_team_members_status_check check (status in ('active', 'hidden', 'archived')),
  constraint missionary_team_members_source_check check (source in ('website_admin', 'dos', 'public_form')),
  constraint missionary_team_members_household_number_unique unique (household_id, public_number)
);

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
    when left(trim(missionary_people.missionary_number), 1) = '#' then trim(missionary_people.missionary_number)
    else '#' || trim(missionary_people.missionary_number)
  end as public_number,
  missionary_people.role as role_title,
  coalesce(missionary_people.sort_order, 0) as sort_order,
  missionary_people.is_public is not false as is_public,
  'website_admin' as source,
  case when missionary_people.is_public is false then 'hidden' else 'active' end as status
from public.missionary_people
where trim(concat_ws(' ', missionary_people.first_name, missionary_people.last_name)) <> ''
on conflict on constraint missionary_team_members_household_number_unique do update
set display_name = excluded.display_name,
    role_title = excluded.role_title,
    sort_order = excluded.sort_order,
    is_public = excluded.is_public,
    status = excluded.status,
    updated_at = now();

do $$
declare
  fox_household uuid;
begin
  select id into fox_household
  from public.missionary_households
  where slug = 'ryan-brooke-fox';

  if fox_household is not null then
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
    values
      (fox_household, 'Ryan Fox', '#001', 'Missionary', 1, true, 'website_admin', 'active'),
      (fox_household, 'Brooke Fox', '#002', 'Missionary', 2, true, 'website_admin', 'active'),
      (fox_household, 'Parker Fox', '#003', null, 3, true, 'website_admin', 'active'),
      (fox_household, 'Oakley Fox', '#004', null, 4, true, 'website_admin', 'active'),
      (fox_household, 'Gunner Fox', '#005', null, 5, true, 'website_admin', 'active'),
      (fox_household, 'Axel Fox', '#006', null, 6, true, 'website_admin', 'active'),
      (fox_household, 'Jersey Fox', '#007', null, 7, true, 'website_admin', 'active')
    on conflict on constraint missionary_team_members_household_number_unique do update
    set display_name = excluded.display_name,
        role_title = excluded.role_title,
        sort_order = excluded.sort_order,
        is_public = excluded.is_public,
        status = excluded.status,
        updated_at = now();
  end if;
end $$;
