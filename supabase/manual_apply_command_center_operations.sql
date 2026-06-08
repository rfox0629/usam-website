-- Command Center operations schema bootstrap.
-- Paste this into the Supabase SQL Editor for the usam-website project.
-- Safe to rerun where possible: it uses IF NOT EXISTS, upserts seeds,
-- drops/recreates policies and triggers, and does not delete table data.

begin;

create extension if not exists pgcrypto;

-- Admin policy compatibility. Earlier admin migrations create this, but keep
-- this script self-contained for projects where that migration lagged.
alter table public.admin_users
  add column if not exists is_active boolean not null default true;

update public.admin_users
set is_active = true
where is_active is null;

-- ---------------------------------------------------------------------------
-- 1. Fruit output records
-- ---------------------------------------------------------------------------

create table if not exists public.missionary_fruit_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.missionary_households(id) on delete cascade,
  source text not null default 'website_admin',
  source_app text,
  source_external_id text,
  title text,
  body text not null,
  category text,
  testimony_date date,
  submitted_by_name text,
  submitted_by_user_id text,
  permission_to_share boolean not null default false,
  missionary_public_approved boolean not null default false,
  visibility text not null default 'private',
  status text not null default 'draft',
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.missionary_fruit_items
  add column if not exists household_id uuid references public.missionary_households(id) on delete cascade,
  add column if not exists source text not null default 'website_admin',
  add column if not exists source_app text,
  add column if not exists source_external_id text,
  add column if not exists title text,
  add column if not exists body text,
  add column if not exists category text,
  add column if not exists testimony_date date,
  add column if not exists submitted_by_name text,
  add column if not exists submitted_by_user_id text,
  add column if not exists permission_to_share boolean not null default false,
  add column if not exists missionary_public_approved boolean not null default false,
  add column if not exists visibility text not null default 'private',
  add column if not exists status text not null default 'draft',
  add column if not exists is_featured boolean not null default false,
  add column if not exists sort_order integer not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.missionary_fruit_items
set
  source = coalesce(source, 'website_admin'),
  visibility = coalesce(visibility, 'private'),
  status = coalesce(status, 'draft'),
  permission_to_share = coalesce(permission_to_share, false),
  missionary_public_approved = coalesce(missionary_public_approved, false),
  is_featured = coalesce(is_featured, false),
  sort_order = coalesce(sort_order, 0);

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'missionary_fruit_items_source_check'
      and conrelid = 'public.missionary_fruit_items'::regclass
  ) then
    alter table public.missionary_fruit_items drop constraint missionary_fruit_items_source_check;
  end if;

  alter table public.missionary_fruit_items
    add constraint missionary_fruit_items_source_check
    check (source in ('website_admin', 'dos', 'public_form'));

  if exists (
    select 1 from pg_constraint
    where conname = 'missionary_fruit_items_status_check'
      and conrelid = 'public.missionary_fruit_items'::regclass
  ) then
    alter table public.missionary_fruit_items drop constraint missionary_fruit_items_status_check;
  end if;

  alter table public.missionary_fruit_items
    add constraint missionary_fruit_items_status_check
    check (status in ('draft', 'published', 'hidden', 'archived'));

  if exists (
    select 1 from pg_constraint
    where conname = 'missionary_fruit_items_visibility_check'
      and conrelid = 'public.missionary_fruit_items'::regclass
  ) then
    alter table public.missionary_fruit_items drop constraint missionary_fruit_items_visibility_check;
  end if;

  alter table public.missionary_fruit_items
    add constraint missionary_fruit_items_visibility_check
    check (visibility in ('private', 'internal', 'public'));
end $$;

create index if not exists missionary_fruit_items_household_status_idx
  on public.missionary_fruit_items(household_id, status);

create index if not exists missionary_fruit_items_public_profile_idx
  on public.missionary_fruit_items(
    household_id,
    is_featured desc,
    sort_order asc,
    testimony_date desc nulls last,
    created_at desc
  )
  where status = 'published'
    and visibility = 'public'
    and permission_to_share = true
    and missionary_public_approved = true;

create unique index if not exists missionary_fruit_items_source_external_unique
  on public.missionary_fruit_items(source, source_app, source_external_id)
  where source_external_id is not null;

create or replace function public.set_missionary_fruit_items_updated_at()
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

drop trigger if exists set_missionary_fruit_items_updated_at on public.missionary_fruit_items;
create trigger set_missionary_fruit_items_updated_at
  before update on public.missionary_fruit_items
  for each row
  execute function public.set_missionary_fruit_items_updated_at();

alter table public.missionary_fruit_items enable row level security;

revoke all on table public.missionary_fruit_items from anon;
revoke all on table public.missionary_fruit_items from authenticated;
grant select on table public.missionary_fruit_items to anon;
grant select, insert, update on table public.missionary_fruit_items to authenticated;

drop policy if exists "Public can read approved missionary fruit" on public.missionary_fruit_items;
create policy "Public can read approved missionary fruit"
  on public.missionary_fruit_items
  for select
  to anon, authenticated
  using (
    status = 'published'
    and visibility = 'public'
    and permission_to_share = true
    and missionary_public_approved = true
    and exists (
      select 1
      from public.missionary_households
      where missionary_households.id = missionary_fruit_items.household_id
        and missionary_households.public_visible = true
    )
  );

drop policy if exists "Admins can read missionary fruit" on public.missionary_fruit_items;
create policy "Admins can read missionary fruit"
  on public.missionary_fruit_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
        and coalesce(admin_users.is_active, true)
    )
  );

drop policy if exists "Admins can insert missionary fruit" on public.missionary_fruit_items;
create policy "Admins can insert missionary fruit"
  on public.missionary_fruit_items
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
        and coalesce(admin_users.is_active, true)
    )
  );

drop policy if exists "Admins can update missionary fruit" on public.missionary_fruit_items;
create policy "Admins can update missionary fruit"
  on public.missionary_fruit_items
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
        and coalesce(admin_users.is_active, true)
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
        and coalesce(admin_users.is_active, true)
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Encounters raw intake
-- ---------------------------------------------------------------------------

create table if not exists public.missionary_encounters (
  id uuid primary key default gen_random_uuid(),
  missionary_profile_id uuid,
  missionary_household_id uuid references public.missionary_households(id) on delete cascade,
  submitter_name text,
  submitter_email text,
  submitter_phone text,
  encounter_date date,
  original_testimony text,
  public_summary text,
  permission_to_share boolean not null default false,
  status text not null default 'raw',
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.missionary_encounters
  add column if not exists missionary_profile_id uuid,
  add column if not exists missionary_household_id uuid references public.missionary_households(id) on delete cascade,
  add column if not exists submitter_name text,
  add column if not exists submitter_email text,
  add column if not exists submitter_phone text,
  add column if not exists encounter_date date,
  add column if not exists original_testimony text,
  add column if not exists public_summary text,
  add column if not exists permission_to_share boolean not null default false,
  add column if not exists status text not null default 'raw',
  add column if not exists source text not null default 'manual',
  add column if not exists internal_notes text,
  add column if not exists do_not_publish boolean not null default false,
  add column if not exists submission_type text not null default 'full_testimony',
  add column if not exists outcome_tags text[] not null default '{}',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.missionary_encounters
set status = case status
  when 'new' then 'raw'
  when 'published' then 'approved'
  else coalesce(status, 'raw')
end
where status is null or status in ('new', 'published');

update public.missionary_encounters
set source = 'manual'
where source is null or source not in ('manual', 'public_form', 'dos');

alter table public.missionary_encounters
  alter column status set default 'raw',
  alter column source set default 'manual',
  alter column permission_to_share set default false,
  alter column do_not_publish set default false,
  alter column submission_type set default 'full_testimony',
  alter column outcome_tags set default '{}';

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'missionary_encounters_status_check'
      and conrelid = 'public.missionary_encounters'::regclass
  ) then
    alter table public.missionary_encounters drop constraint missionary_encounters_status_check;
  end if;

  alter table public.missionary_encounters
    add constraint missionary_encounters_status_check
    check (status in ('raw', 'reviewed', 'approved', 'hidden', 'archived'));

  if exists (
    select 1 from pg_constraint
    where conname = 'missionary_encounters_source_check'
      and conrelid = 'public.missionary_encounters'::regclass
  ) then
    alter table public.missionary_encounters drop constraint missionary_encounters_source_check;
  end if;

  alter table public.missionary_encounters
    add constraint missionary_encounters_source_check
    check (source in ('manual', 'public_form', 'dos'));

  if exists (
    select 1 from pg_constraint
    where conname = 'missionary_encounters_submission_type_check'
      and conrelid = 'public.missionary_encounters'::regclass
  ) then
    alter table public.missionary_encounters drop constraint missionary_encounters_submission_type_check;
  end if;

  alter table public.missionary_encounters
    add constraint missionary_encounters_submission_type_check
    check (submission_type in ('quick_response', 'full_testimony'));

  if exists (
    select 1 from pg_constraint
    where conname = 'missionary_encounters_outcome_tags_check'
      and conrelid = 'public.missionary_encounters'::regclass
  ) then
    alter table public.missionary_encounters drop constraint missionary_encounters_outcome_tags_check;
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

create index if not exists missionary_encounters_household_status_date_idx
  on public.missionary_encounters(missionary_household_id, status, encounter_date desc, created_at desc);

create index if not exists missionary_encounters_profile_status_date_idx
  on public.missionary_encounters(missionary_profile_id, status, encounter_date desc, created_at desc);

create index if not exists missionary_encounters_review_status_idx
  on public.missionary_encounters(missionary_household_id, status, do_not_publish, submission_type);

create or replace function public.set_missionary_encounters_updated_at()
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

drop trigger if exists set_missionary_encounters_updated_at on public.missionary_encounters;
create trigger set_missionary_encounters_updated_at
  before update on public.missionary_encounters
  for each row
  execute function public.set_missionary_encounters_updated_at();

alter table public.missionary_encounters enable row level security;

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
        and coalesce(admin_users.is_active, true)
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
        and coalesce(admin_users.is_active, true)
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
        and coalesce(admin_users.is_active, true)
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
        and coalesce(admin_users.is_active, true)
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Your Field / People
-- ---------------------------------------------------------------------------

create table if not exists public.missionary_field_people (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.missionary_households(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  church text,
  relationship_type text,
  engagement_level text,
  notes text,
  status text default 'active',
  source text not null default 'command_center',
  created_by uuid,
  last_activity_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
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
  add column if not exists status text default 'active',
  add column if not exists source text not null default 'command_center',
  add column if not exists created_by uuid,
  add column if not exists last_activity_at timestamptz,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.missionary_field_people
set name = 'Unnamed'
where name is null;

update public.missionary_field_people
set status = 'active'
where status is null
  or status not in ('new', 'active', 'follow_up', 'discipleship', 'paused', 'archived');

update public.missionary_field_people
set source = 'command_center'
where source is null
  or source not in ('command_center', 'field');

alter table public.missionary_field_people
  alter column id set default gen_random_uuid(),
  alter column name set not null,
  alter column phone drop not null,
  alter column status set default 'active',
  alter column source set default 'command_center',
  alter column created_at set default now(),
  alter column updated_at set default now();

do $$
begin
  if not exists (
    select 1
    from public.missionary_field_people
    where household_id is null
  ) then
    alter table public.missionary_field_people
      alter column household_id set not null;
  end if;

  if exists (
    select 1 from pg_constraint
    where conname = 'missionary_field_people_status_check'
      and conrelid = 'public.missionary_field_people'::regclass
  ) then
    alter table public.missionary_field_people drop constraint missionary_field_people_status_check;
  end if;

  alter table public.missionary_field_people
    add constraint missionary_field_people_status_check
    check (status in ('new', 'active', 'follow_up', 'discipleship', 'paused', 'archived'));

  if exists (
    select 1 from pg_constraint
    where conname = 'missionary_field_people_source_check'
      and conrelid = 'public.missionary_field_people'::regclass
  ) then
    alter table public.missionary_field_people drop constraint missionary_field_people_source_check;
  end if;

  alter table public.missionary_field_people
    add constraint missionary_field_people_source_check
    check (source in ('command_center', 'field'));
end $$;

create index if not exists missionary_field_people_household_id_idx
  on public.missionary_field_people(household_id);

create index if not exists missionary_field_people_phone_idx
  on public.missionary_field_people(phone);

create index if not exists missionary_field_people_household_phone_idx
  on public.missionary_field_people(household_id, phone);

create index if not exists missionary_field_people_status_idx
  on public.missionary_field_people(status);

create index if not exists missionary_field_people_created_at_idx
  on public.missionary_field_people(created_at);

create index if not exists missionary_field_people_household_updated_idx
  on public.missionary_field_people(household_id, updated_at desc);

create index if not exists missionary_field_people_household_last_activity_idx
  on public.missionary_field_people(household_id, last_activity_at desc nulls last);

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
grant select, insert, update, delete on table public.missionary_field_people to authenticated;

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
        and coalesce(admin_users.is_active, true)
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
        and coalesce(admin_users.is_active, true)
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
        and coalesce(admin_users.is_active, true)
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
        and coalesce(admin_users.is_active, true)
    )
  );

drop policy if exists "Admins can delete missionary field people" on public.missionary_field_people;
create policy "Admins can delete missionary field people"
  on public.missionary_field_people
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
        and coalesce(admin_users.is_active, true)
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Tables / intentional meetings
-- ---------------------------------------------------------------------------

create table if not exists public.missionary_tables (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.missionary_households(id) on delete cascade,
  table_date date not null default current_date,
  table_type text not null default 'kitchen_table',
  participant_names text[] not null default '{}',
  field_person_ids uuid[] not null default '{}',
  notes text,
  source text not null default 'command_center',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.missionary_tables
  add column if not exists household_id uuid references public.missionary_households(id) on delete cascade,
  add column if not exists table_date date not null default current_date,
  add column if not exists table_type text not null default 'kitchen_table',
  add column if not exists participant_names text[] not null default '{}',
  add column if not exists field_person_ids uuid[] not null default '{}',
  add column if not exists notes text,
  add column if not exists source text not null default 'command_center',
  add column if not exists created_by uuid,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.missionary_tables
set table_type = 'other'
where table_type is null
  or table_type not in ('kitchen_table', 'coffee', 'phone', 'zoom', 'group', 'other');

update public.missionary_tables
set source = 'command_center'
where source is null or source not in ('command_center', 'field');

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'missionary_tables_type_check'
      and conrelid = 'public.missionary_tables'::regclass
  ) then
    alter table public.missionary_tables drop constraint missionary_tables_type_check;
  end if;

  alter table public.missionary_tables
    add constraint missionary_tables_type_check
    check (table_type in ('kitchen_table', 'coffee', 'phone', 'zoom', 'group', 'other'));

  if exists (
    select 1 from pg_constraint
    where conname = 'missionary_tables_source_check'
      and conrelid = 'public.missionary_tables'::regclass
  ) then
    alter table public.missionary_tables drop constraint missionary_tables_source_check;
  end if;

  alter table public.missionary_tables
    add constraint missionary_tables_source_check
    check (source in ('command_center', 'field'));
end $$;

create index if not exists missionary_tables_household_date_idx
  on public.missionary_tables(household_id, table_date desc, created_at desc);

create index if not exists missionary_tables_field_person_ids_idx
  on public.missionary_tables using gin(field_person_ids);

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
        and coalesce(admin_users.is_active, true)
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
        and coalesce(admin_users.is_active, true)
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
        and coalesce(admin_users.is_active, true)
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
        and coalesce(admin_users.is_active, true)
    )
  );

-- Links that depend on missionary_tables.
alter table public.missionary_encounters
  add column if not exists table_id uuid references public.missionary_tables(id) on delete set null;

create index if not exists missionary_encounters_table_id_idx
  on public.missionary_encounters(table_id);

create index if not exists missionary_encounters_household_table_status_idx
  on public.missionary_encounters(missionary_household_id, table_id, status);

alter table public.missionary_fruit_items
  add column if not exists encounter_id uuid references public.missionary_encounters(id) on delete set null;

create unique index if not exists missionary_fruit_items_encounter_id_unique
  on public.missionary_fruit_items(encounter_id)
  where encounter_id is not null;

-- ---------------------------------------------------------------------------
-- 5. Review, assessment, quick touches, library, and in-season focus
-- ---------------------------------------------------------------------------

create table if not exists public.missionary_table_reviews (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.missionary_households(id) on delete cascade,
  table_id uuid not null references public.missionary_tables(id) on delete cascade,
  how_meeting_went text,
  key_observations text,
  breakthroughs_or_concerns text,
  follow_up_needed text,
  movement_step text,
  teaching_used text,
  questions_covered text,
  assessment_notes text,
  readiness text,
  follow_up_areas text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint missionary_table_reviews_table_unique unique (table_id)
);

alter table public.missionary_table_reviews
  add column if not exists household_id uuid references public.missionary_households(id) on delete cascade,
  add column if not exists table_id uuid references public.missionary_tables(id) on delete cascade,
  add column if not exists how_meeting_went text,
  add column if not exists key_observations text,
  add column if not exists breakthroughs_or_concerns text,
  add column if not exists follow_up_needed text,
  add column if not exists movement_step text,
  add column if not exists teaching_used text,
  add column if not exists questions_covered text,
  add column if not exists assessment_notes text,
  add column if not exists readiness text,
  add column if not exists follow_up_areas text[] not null default '{}',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'missionary_table_reviews_table_unique'
      and conrelid = 'public.missionary_table_reviews'::regclass
  ) then
    alter table public.missionary_table_reviews
      add constraint missionary_table_reviews_table_unique unique (table_id);
  end if;

  if exists (
    select 1 from pg_constraint
    where conname = 'missionary_table_reviews_movement_step_check'
      and conrelid = 'public.missionary_table_reviews'::regclass
  ) then
    alter table public.missionary_table_reviews drop constraint missionary_table_reviews_movement_step_check;
  end if;

  alter table public.missionary_table_reviews
    add constraint missionary_table_reviews_movement_step_check
    check (
      movement_step is null
      or movement_step in (
        'Continue meeting',
        'Begin discipleship',
        'Send follow up',
        'Invite to group',
        'Connect to church',
        'Connect to ministry',
        'Hand off',
        'Pray and wait',
        'Other'
      )
    );

  if exists (
    select 1 from pg_constraint
    where conname = 'missionary_table_reviews_teaching_used_check'
      and conrelid = 'public.missionary_table_reviews'::regclass
  ) then
    alter table public.missionary_table_reviews drop constraint missionary_table_reviews_teaching_used_check;
  end if;

  alter table public.missionary_table_reviews
    add constraint missionary_table_reviews_teaching_used_check
    check (
      teaching_used is null
      or teaching_used in (
        'Kitchen Table Gospel',
        'Are You Really a Disciple',
        'Commands of Jesus',
        'Other'
      )
    );

  if exists (
    select 1 from pg_constraint
    where conname = 'missionary_table_reviews_readiness_check'
      and conrelid = 'public.missionary_table_reviews'::regclass
  ) then
    alter table public.missionary_table_reviews drop constraint missionary_table_reviews_readiness_check;
  end if;

  alter table public.missionary_table_reviews
    add constraint missionary_table_reviews_readiness_check
    check (
      readiness is null
      or readiness in (
        'Not ready',
        'Curious',
        'Open',
        'Ready to follow',
        'Actively following'
      )
    );

  if exists (
    select 1 from pg_constraint
    where conname = 'missionary_table_reviews_follow_up_areas_check'
      and conrelid = 'public.missionary_table_reviews'::regclass
  ) then
    alter table public.missionary_table_reviews drop constraint missionary_table_reviews_follow_up_areas_check;
  end if;

  alter table public.missionary_table_reviews
    add constraint missionary_table_reviews_follow_up_areas_check
    check (
      follow_up_areas <@ array[
        'Repentance',
        'Baptism',
        'Scripture',
        'Prayer',
        'Community',
        'Obedience'
      ]::text[]
    );
end $$;

create index if not exists missionary_table_reviews_household_table_idx
  on public.missionary_table_reviews(household_id, table_id);

alter table public.missionary_fruit_items
  add column if not exists table_id uuid references public.missionary_tables(id) on delete set null,
  add column if not exists field_person_id uuid references public.missionary_field_people(id) on delete set null,
  add column if not exists internal_notes text,
  add column if not exists outcome_tags text[] not null default '{}',
  add column if not exists cc_status text not null default 'draft';

update public.missionary_fruit_items
set cc_status = 'draft'
where cc_status is null
  or cc_status not in ('draft', 'approved', 'private');

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'missionary_fruit_items_cc_status_check'
      and conrelid = 'public.missionary_fruit_items'::regclass
  ) then
    alter table public.missionary_fruit_items drop constraint missionary_fruit_items_cc_status_check;
  end if;

  alter table public.missionary_fruit_items
    add constraint missionary_fruit_items_cc_status_check
    check (cc_status in ('draft', 'approved', 'private'));

  if exists (
    select 1 from pg_constraint
    where conname = 'missionary_fruit_items_outcome_tags_check'
      and conrelid = 'public.missionary_fruit_items'::regclass
  ) then
    alter table public.missionary_fruit_items drop constraint missionary_fruit_items_outcome_tags_check;
  end if;

  alter table public.missionary_fruit_items
    add constraint missionary_fruit_items_outcome_tags_check
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

create index if not exists missionary_fruit_items_cc_household_status_idx
  on public.missionary_fruit_items(household_id, cc_status, testimony_date desc nulls last, created_at desc);

create index if not exists missionary_fruit_items_table_id_idx
  on public.missionary_fruit_items(table_id);

create index if not exists missionary_fruit_items_field_person_id_idx
  on public.missionary_fruit_items(field_person_id);

create table if not exists public.missionary_connection_logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.missionary_households(id) on delete cascade,
  field_person_id uuid references public.missionary_field_people(id) on delete set null,
  connection_date date not null default current_date,
  duration_minutes integer,
  interaction_type text not null default 'Phone call',
  notes text,
  movement_step text,
  follow_up_needed text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.missionary_connection_logs
  add column if not exists household_id uuid references public.missionary_households(id) on delete cascade,
  add column if not exists field_person_id uuid references public.missionary_field_people(id) on delete set null,
  add column if not exists connection_date date not null default current_date,
  add column if not exists duration_minutes integer,
  add column if not exists interaction_type text not null default 'Phone call',
  add column if not exists notes text,
  add column if not exists movement_step text,
  add column if not exists follow_up_needed text,
  add column if not exists created_by uuid,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'missionary_connection_logs_duration_check'
      and conrelid = 'public.missionary_connection_logs'::regclass
  ) then
    alter table public.missionary_connection_logs drop constraint missionary_connection_logs_duration_check;
  end if;

  alter table public.missionary_connection_logs
    add constraint missionary_connection_logs_duration_check
    check (duration_minutes is null or duration_minutes >= 0);

  if exists (
    select 1 from pg_constraint
    where conname = 'missionary_connection_logs_interaction_type_check'
      and conrelid = 'public.missionary_connection_logs'::regclass
  ) then
    alter table public.missionary_connection_logs drop constraint missionary_connection_logs_interaction_type_check;
  end if;

  alter table public.missionary_connection_logs
    add constraint missionary_connection_logs_interaction_type_check
    check (interaction_type in ('Phone call', 'Zoom', 'Text', 'Coffee', 'Prayer', 'Discipleship', 'Other'));

  if exists (
    select 1 from pg_constraint
    where conname = 'missionary_connection_logs_movement_step_check'
      and conrelid = 'public.missionary_connection_logs'::regclass
  ) then
    alter table public.missionary_connection_logs drop constraint missionary_connection_logs_movement_step_check;
  end if;

  alter table public.missionary_connection_logs
    add constraint missionary_connection_logs_movement_step_check
    check (
      movement_step is null
      or movement_step in (
        'Continue meeting',
        'Begin discipleship',
        'Send follow up',
        'Invite to group',
        'Connect to church',
        'Connect to ministry',
        'Hand off',
        'Pray and wait',
        'Other'
      )
    );
end $$;

create index if not exists missionary_connection_logs_household_date_idx
  on public.missionary_connection_logs(household_id, connection_date desc, created_at desc);

create index if not exists missionary_connection_logs_field_person_idx
  on public.missionary_connection_logs(field_person_id, connection_date desc);

create table if not exists public.missionary_library_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.missionary_households(id) on delete cascade,
  title text not null,
  category text,
  description text,
  content_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint missionary_library_items_household_title_unique unique (household_id, title)
);

alter table public.missionary_library_items
  add column if not exists household_id uuid references public.missionary_households(id) on delete cascade,
  add column if not exists title text,
  add column if not exists category text,
  add column if not exists description text,
  add column if not exists content_notes text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists missionary_library_items_household_title_idx
  on public.missionary_library_items(household_id, title);

create table if not exists public.missionary_in_season_focus (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.missionary_households(id) on delete cascade unique,
  current_focus text,
  prayer_emphasis text,
  active_people_note text,
  active_tables_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.missionary_in_season_focus
  add column if not exists household_id uuid references public.missionary_households(id) on delete cascade,
  add column if not exists current_focus text,
  add column if not exists prayer_emphasis text,
  add column if not exists active_people_note text,
  add column if not exists active_tables_note text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists missionary_in_season_focus_household_id_key
  on public.missionary_in_season_focus(household_id);

create or replace function public.set_command_center_workflow_updated_at()
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

drop trigger if exists set_missionary_table_reviews_updated_at on public.missionary_table_reviews;
create trigger set_missionary_table_reviews_updated_at
  before update on public.missionary_table_reviews
  for each row
  execute function public.set_command_center_workflow_updated_at();

drop trigger if exists set_missionary_connection_logs_updated_at on public.missionary_connection_logs;
create trigger set_missionary_connection_logs_updated_at
  before update on public.missionary_connection_logs
  for each row
  execute function public.set_command_center_workflow_updated_at();

drop trigger if exists set_missionary_library_items_updated_at on public.missionary_library_items;
create trigger set_missionary_library_items_updated_at
  before update on public.missionary_library_items
  for each row
  execute function public.set_command_center_workflow_updated_at();

drop trigger if exists set_missionary_in_season_focus_updated_at on public.missionary_in_season_focus;
create trigger set_missionary_in_season_focus_updated_at
  before update on public.missionary_in_season_focus
  for each row
  execute function public.set_command_center_workflow_updated_at();

alter table public.missionary_table_reviews enable row level security;
alter table public.missionary_connection_logs enable row level security;
alter table public.missionary_library_items enable row level security;
alter table public.missionary_in_season_focus enable row level security;

revoke all on table public.missionary_table_reviews from anon;
revoke all on table public.missionary_table_reviews from authenticated;
revoke all on table public.missionary_connection_logs from anon;
revoke all on table public.missionary_connection_logs from authenticated;
revoke all on table public.missionary_library_items from anon;
revoke all on table public.missionary_library_items from authenticated;
revoke all on table public.missionary_in_season_focus from anon;
revoke all on table public.missionary_in_season_focus from authenticated;

grant select, insert, update on table public.missionary_table_reviews to authenticated;
grant select, insert, update on table public.missionary_connection_logs to authenticated;
grant select, insert, update on table public.missionary_library_items to authenticated;
grant select, insert, update on table public.missionary_in_season_focus to authenticated;

drop policy if exists "Admins can read missionary table reviews" on public.missionary_table_reviews;
create policy "Admins can read missionary table reviews"
  on public.missionary_table_reviews for select to authenticated
  using (exists (
    select 1 from public.admin_users
    where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
      and admin_users.role in ('admin', 'editor')
      and coalesce(admin_users.is_active, true)
  ));

drop policy if exists "Admins can insert missionary table reviews" on public.missionary_table_reviews;
create policy "Admins can insert missionary table reviews"
  on public.missionary_table_reviews for insert to authenticated
  with check (exists (
    select 1 from public.admin_users
    where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
      and admin_users.role in ('admin', 'editor')
      and coalesce(admin_users.is_active, true)
  ));

drop policy if exists "Admins can update missionary table reviews" on public.missionary_table_reviews;
create policy "Admins can update missionary table reviews"
  on public.missionary_table_reviews for update to authenticated
  using (exists (
    select 1 from public.admin_users
    where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
      and admin_users.role in ('admin', 'editor')
      and coalesce(admin_users.is_active, true)
  ))
  with check (exists (
    select 1 from public.admin_users
    where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
      and admin_users.role in ('admin', 'editor')
      and coalesce(admin_users.is_active, true)
  ));

drop policy if exists "Admins can read missionary connection logs" on public.missionary_connection_logs;
create policy "Admins can read missionary connection logs"
  on public.missionary_connection_logs for select to authenticated
  using (exists (
    select 1 from public.admin_users
    where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
      and admin_users.role in ('admin', 'editor')
      and coalesce(admin_users.is_active, true)
  ));

drop policy if exists "Admins can insert missionary connection logs" on public.missionary_connection_logs;
create policy "Admins can insert missionary connection logs"
  on public.missionary_connection_logs for insert to authenticated
  with check (exists (
    select 1 from public.admin_users
    where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
      and admin_users.role in ('admin', 'editor')
      and coalesce(admin_users.is_active, true)
  ));

drop policy if exists "Admins can update missionary connection logs" on public.missionary_connection_logs;
create policy "Admins can update missionary connection logs"
  on public.missionary_connection_logs for update to authenticated
  using (exists (
    select 1 from public.admin_users
    where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
      and admin_users.role in ('admin', 'editor')
      and coalesce(admin_users.is_active, true)
  ))
  with check (exists (
    select 1 from public.admin_users
    where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
      and admin_users.role in ('admin', 'editor')
      and coalesce(admin_users.is_active, true)
  ));

drop policy if exists "Admins can read missionary library items" on public.missionary_library_items;
create policy "Admins can read missionary library items"
  on public.missionary_library_items for select to authenticated
  using (exists (
    select 1 from public.admin_users
    where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
      and admin_users.role in ('admin', 'editor')
      and coalesce(admin_users.is_active, true)
  ));

drop policy if exists "Admins can insert missionary library items" on public.missionary_library_items;
create policy "Admins can insert missionary library items"
  on public.missionary_library_items for insert to authenticated
  with check (exists (
    select 1 from public.admin_users
    where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
      and admin_users.role in ('admin', 'editor')
      and coalesce(admin_users.is_active, true)
  ));

drop policy if exists "Admins can update missionary library items" on public.missionary_library_items;
create policy "Admins can update missionary library items"
  on public.missionary_library_items for update to authenticated
  using (exists (
    select 1 from public.admin_users
    where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
      and admin_users.role in ('admin', 'editor')
      and coalesce(admin_users.is_active, true)
  ))
  with check (exists (
    select 1 from public.admin_users
    where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
      and admin_users.role in ('admin', 'editor')
      and coalesce(admin_users.is_active, true)
  ));

drop policy if exists "Admins can read missionary in season focus" on public.missionary_in_season_focus;
create policy "Admins can read missionary in season focus"
  on public.missionary_in_season_focus for select to authenticated
  using (exists (
    select 1 from public.admin_users
    where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
      and admin_users.role in ('admin', 'editor')
      and coalesce(admin_users.is_active, true)
  ));

drop policy if exists "Admins can insert missionary in season focus" on public.missionary_in_season_focus;
create policy "Admins can insert missionary in season focus"
  on public.missionary_in_season_focus for insert to authenticated
  with check (exists (
    select 1 from public.admin_users
    where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
      and admin_users.role in ('admin', 'editor')
      and coalesce(admin_users.is_active, true)
  ));

drop policy if exists "Admins can update missionary in season focus" on public.missionary_in_season_focus;
create policy "Admins can update missionary in season focus"
  on public.missionary_in_season_focus for update to authenticated
  using (exists (
    select 1 from public.admin_users
    where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
      and admin_users.role in ('admin', 'editor')
      and coalesce(admin_users.is_active, true)
  ))
  with check (exists (
    select 1 from public.admin_users
    where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
      and admin_users.role in ('admin', 'editor')
      and coalesce(admin_users.is_active, true)
  ));

insert into public.missionary_library_items (household_id, title, category, description, content_notes)
select missionary_households.id, seed.title, 'Teaching Framework', seed.description, ''
from public.missionary_households
cross join (
  values
    ('Kitchen Table Gospel', 'Simple gospel framework for conversations around the table.'),
    ('Are You Really a Disciple', 'Discipleship diagnostic for clarity and follow-through.'),
    ('Commands of Jesus', 'Teaching framework for obedience-based discipleship.')
) as seed(title, description)
on conflict (household_id, title) do nothing;

-- ---------------------------------------------------------------------------
-- Comments and schema-cache reload
-- ---------------------------------------------------------------------------

comment on table public.missionary_field_people is
  'Command Center and future Field relationship map. These are internal ministry contacts, not public Profile Team records.';

comment on table public.missionary_tables is
  'Command Center meeting layer for ministry activity. Field can create these later; Profiles never read raw meeting records.';

comment on table public.missionary_encounters is
  'Command Center raw intake for testimonies, forms, reviews, and story material. Encounters are never public until reviewed and derived into Fruit.';

comment on table public.missionary_table_reviews is
  'Command Center Review and Discipleship Assessment data for a meeting. This belongs to the meeting, not People or public Team.';

comment on table public.missionary_connection_logs is
  'Fast ongoing discipleship interactions outside intentional meetings. Feeds People insights and future Field summaries.';

comment on table public.missionary_library_items is
  'Light Command Center teaching framework library for future meeting references and Field use.';

comment on table public.missionary_in_season_focus is
  'Simple current focus notes for a missionary household. Internal Command Center data only.';

comment on table public.missionary_fruit_items is
  'Reviewed and structured Fruit derived from Encounters and Review. Approved public Fruit is the only structured outcome shown across Profiles and future Field summaries.';

notify pgrst, 'reload schema';

commit;
