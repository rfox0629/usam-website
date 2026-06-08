create extension if not exists pgcrypto;

create table if not exists public.missionary_tables (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.missionary_households(id) on delete cascade,
  table_date date not null default current_date,
  table_type text not null default 'kitchen_table',
  participant_names text[] not null default '{}',
  notes text,
  source text not null default 'command_center',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint missionary_tables_type_check
    check (table_type in ('kitchen_table', 'coffee', 'group')),
  constraint missionary_tables_source_check
    check (source in ('command_center', 'field'))
);

create index if not exists missionary_tables_household_date_idx
  on public.missionary_tables(household_id, table_date desc, created_at desc);

alter table public.missionary_tables enable row level security;

revoke all on table public.missionary_tables from anon;
revoke all on table public.missionary_tables from authenticated;
grant select, insert, update on table public.missionary_tables to authenticated;

drop policy if exists "Admins can read missionary tables" on public.missionary_tables;
create policy "Admins can read missionary tables"
  on public.missionary_tables
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

drop policy if exists "Admins can insert missionary tables" on public.missionary_tables;
create policy "Admins can insert missionary tables"
  on public.missionary_tables
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

drop policy if exists "Admins can update missionary tables" on public.missionary_tables;
create policy "Admins can update missionary tables"
  on public.missionary_tables
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

create or replace function public.set_missionary_tables_updated_at()
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

drop trigger if exists set_missionary_tables_updated_at on public.missionary_tables;
create trigger set_missionary_tables_updated_at
  before update on public.missionary_tables
  for each row
  execute function public.set_missionary_tables_updated_at();

alter table public.missionary_encounters
  add column if not exists table_id uuid references public.missionary_tables(id) on delete set null,
  add column if not exists outcome_tags text[] not null default '{}';

alter table public.missionary_tables
  add column if not exists participant_names text[] not null default '{}';

update public.missionary_encounters
set status = case status
  when 'new' then 'raw'
  when 'published' then 'approved'
  else status
end
where status in ('new', 'published');

alter table public.missionary_encounters
  alter column status set default 'raw';

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'missionary_encounters_status_check'
      and conrelid = 'public.missionary_encounters'::regclass
  ) then
    alter table public.missionary_encounters
      drop constraint missionary_encounters_status_check;
  end if;

  alter table public.missionary_encounters
    add constraint missionary_encounters_status_check
    check (status in ('raw', 'reviewed', 'approved', 'hidden', 'archived'));
end $$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'missionary_encounters_outcome_tags_check'
      and conrelid = 'public.missionary_encounters'::regclass
  ) then
    alter table public.missionary_encounters
      drop constraint missionary_encounters_outcome_tags_check;
  end if;

  alter table public.missionary_encounters
    add constraint missionary_encounters_outcome_tags_check
    check (
      outcome_tags <@ array[
        'Salvation',
        'Baptism',
        'Healing',
        'Deliverance',
        'Church Connection',
        'Discipleship',
        'Prayer Answered',
        'Other'
      ]::text[]
    );
end $$;

create index if not exists missionary_encounters_table_id_idx
  on public.missionary_encounters(table_id);

create index if not exists missionary_encounters_household_table_status_idx
  on public.missionary_encounters(missionary_household_id, table_id, status);

revoke all on table public.missionary_encounters from anon;
revoke all on table public.missionary_encounters from authenticated;
grant select, insert, update on table public.missionary_encounters to authenticated;

drop policy if exists "Admins can read missionary encounters" on public.missionary_encounters;
create policy "Admins can read missionary encounters"
  on public.missionary_encounters
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

drop policy if exists "Admins can insert missionary encounters" on public.missionary_encounters;
create policy "Admins can insert missionary encounters"
  on public.missionary_encounters
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

drop policy if exists "Admins can update missionary encounters" on public.missionary_encounters;
create policy "Admins can update missionary encounters"
  on public.missionary_encounters
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

alter table public.missionary_fruit_items
  add column if not exists encounter_id uuid references public.missionary_encounters(id) on delete set null;

create unique index if not exists missionary_fruit_items_encounter_id_unique
  on public.missionary_fruit_items(encounter_id)
  where encounter_id is not null;

comment on table public.missionary_tables is
  'Command Center meeting layer for ministry tables. Field can create these later; Profiles never read raw table records.';

comment on column public.missionary_tables.table_type is
  'Simple meeting type used by Command Center and future Field: kitchen_table, coffee, or group.';

comment on column public.missionary_tables.participant_names is
  'Optional quick display names for table logging. This is not the People relationship model and should not replace future People records.';

comment on column public.missionary_encounters.table_id is
  'Optional link to the meeting where the raw encounter was captured.';

comment on column public.missionary_encounters.outcome_tags is
  'Reviewed outcome tags used to derive Fruit. Raw Encounter text should never be exposed publicly.';

comment on column public.missionary_fruit_items.encounter_id is
  'Reference to the approved Encounter that produced this public-safe Fruit summary.';
