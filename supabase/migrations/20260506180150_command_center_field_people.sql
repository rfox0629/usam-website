create extension if not exists pgcrypto;

create table if not exists public.missionary_field_people (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.missionary_households(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  church text,
  notes text,
  status text not null default 'new',
  relationship_type text,
  engagement_level text,
  source text not null default 'command_center',
  created_by uuid,
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint missionary_field_people_status_check
    check (status in ('new', 'active', 'follow_up', 'discipleship', 'paused', 'archived')),
  constraint missionary_field_people_source_check
    check (source in ('command_center', 'field'))
);

create index if not exists missionary_field_people_household_updated_idx
  on public.missionary_field_people(household_id, updated_at desc);

create index if not exists missionary_field_people_household_last_activity_idx
  on public.missionary_field_people(household_id, last_activity_at desc nulls last);

alter table public.missionary_field_people enable row level security;

revoke all on table public.missionary_field_people from anon;
revoke all on table public.missionary_field_people from authenticated;
grant select, insert, update on table public.missionary_field_people to authenticated;

drop policy if exists "Admins can read missionary field people" on public.missionary_field_people;
create policy "Admins can read missionary field people"
  on public.missionary_field_people
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
    )
  );

drop policy if exists "Admins can insert missionary field people" on public.missionary_field_people;
create policy "Admins can insert missionary field people"
  on public.missionary_field_people
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
    )
  );

drop policy if exists "Admins can update missionary field people" on public.missionary_field_people;
create policy "Admins can update missionary field people"
  on public.missionary_field_people
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
    )
  );

create or replace function public.set_missionary_field_people_updated_at()
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

drop trigger if exists set_missionary_field_people_updated_at on public.missionary_field_people;
create trigger set_missionary_field_people_updated_at
  before update on public.missionary_field_people
  for each row
  execute function public.set_missionary_field_people_updated_at();

comment on table public.missionary_field_people is
  'Command Center and future Field relationship map. These are internal ministry contacts, not public Profile Team records.';

comment on column public.missionary_field_people.relationship_type is
  'Editable relationship context learned over time. Do not duplicate this on Encounters.';

comment on column public.missionary_field_people.engagement_level is
  'Editable engagement context learned over time. Do not duplicate this on Encounters.';

comment on column public.missionary_field_people.last_activity_at is
  'Prepared for future Tables and Connection Logs insights; not public profile data.';
