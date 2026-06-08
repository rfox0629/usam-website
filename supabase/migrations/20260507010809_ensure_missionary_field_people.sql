create extension if not exists pgcrypto;

create table if not exists public.missionary_field_people (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.missionary_households(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  church text,
  relationship_type text,
  engagement_level text,
  notes text,
  status text not null default 'new',
  source text not null default 'command_center',
  created_by uuid,
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.missionary_field_people
  add column if not exists household_id uuid references public.missionary_households(id) on delete cascade,
  add column if not exists name text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists church text,
  add column if not exists relationship_type text,
  add column if not exists engagement_level text,
  add column if not exists notes text,
  add column if not exists status text not null default 'new',
  add column if not exists source text not null default 'command_center',
  add column if not exists created_by uuid,
  add column if not exists last_activity_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.missionary_field_people
  alter column status set default 'new',
  alter column source set default 'command_center',
  alter column created_at set default now(),
  alter column updated_at set default now();

update public.missionary_field_people
set status = 'new'
where status is null
  or status not in ('new', 'active', 'follow_up', 'discipleship', 'paused', 'archived');

update public.missionary_field_people
set source = 'command_center'
where source is null
  or source not in ('command_center', 'field');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'missionary_field_people_status_check'
      and conrelid = 'public.missionary_field_people'::regclass
  ) then
    alter table public.missionary_field_people
      add constraint missionary_field_people_status_check
      check (status in ('new', 'active', 'follow_up', 'discipleship', 'paused', 'archived'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'missionary_field_people_source_check'
      and conrelid = 'public.missionary_field_people'::regclass
  ) then
    alter table public.missionary_field_people
      add constraint missionary_field_people_source_check
      check (source in ('command_center', 'field'));
  end if;
end $$;

create index if not exists missionary_field_people_household_id_idx
  on public.missionary_field_people(household_id);

create index if not exists missionary_field_people_phone_idx
  on public.missionary_field_people(phone);

create index if not exists missionary_field_people_household_phone_idx
  on public.missionary_field_people(household_id, phone);

create index if not exists missionary_field_people_household_updated_idx
  on public.missionary_field_people(household_id, updated_at desc);

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

comment on table public.missionary_field_people is
  'Command Center and future Field relationship map. These are internal ministry contacts, not public Profile Team records.';

notify pgrst, 'reload schema';
