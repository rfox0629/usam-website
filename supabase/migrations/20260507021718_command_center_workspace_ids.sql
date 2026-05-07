create extension if not exists pgcrypto;

-- Command Center operational records are scoped to a Missionary Workspace.
-- Keep legacy household_id / missionary_household_id columns in place for now
-- so existing data, public Profile reads, and older deploys do not break.

alter table if exists public.missionary_field_people
  add column if not exists workspace_id uuid references public.missionary_households(id) on delete cascade;

alter table if exists public.missionary_tables
  add column if not exists workspace_id uuid references public.missionary_households(id) on delete cascade;

alter table if exists public.missionary_table_reviews
  add column if not exists workspace_id uuid references public.missionary_households(id) on delete cascade;

alter table if exists public.missionary_connection_logs
  add column if not exists workspace_id uuid references public.missionary_households(id) on delete cascade;

alter table if exists public.missionary_library_items
  add column if not exists workspace_id uuid references public.missionary_households(id) on delete cascade;

alter table if exists public.missionary_in_season_focus
  add column if not exists workspace_id uuid references public.missionary_households(id) on delete cascade;

alter table if exists public.missionary_fruit_items
  add column if not exists workspace_id uuid references public.missionary_households(id) on delete cascade;

alter table if exists public.missionary_encounters
  add column if not exists workspace_id uuid references public.missionary_households(id) on delete cascade;

update public.missionary_field_people
set workspace_id = household_id
where workspace_id is null
  and household_id is not null;

update public.missionary_tables
set workspace_id = household_id
where workspace_id is null
  and household_id is not null;

update public.missionary_table_reviews
set workspace_id = household_id
where workspace_id is null
  and household_id is not null;

update public.missionary_connection_logs
set workspace_id = household_id
where workspace_id is null
  and household_id is not null;

update public.missionary_library_items
set workspace_id = household_id
where workspace_id is null
  and household_id is not null;

update public.missionary_in_season_focus
set workspace_id = household_id
where workspace_id is null
  and household_id is not null;

update public.missionary_fruit_items
set workspace_id = household_id
where workspace_id is null
  and household_id is not null;

update public.missionary_encounters
set workspace_id = coalesce(missionary_household_id, missionary_profile_id)
where workspace_id is null
  and coalesce(missionary_household_id, missionary_profile_id) is not null;

create index if not exists missionary_field_people_workspace_id_idx
  on public.missionary_field_people(workspace_id);

create index if not exists missionary_field_people_workspace_phone_idx
  on public.missionary_field_people(workspace_id, phone);

create index if not exists missionary_field_people_workspace_status_idx
  on public.missionary_field_people(workspace_id, status);

create index if not exists missionary_tables_workspace_date_idx
  on public.missionary_tables(workspace_id, table_date desc, created_at desc);

create index if not exists missionary_encounters_workspace_status_date_idx
  on public.missionary_encounters(workspace_id, status, encounter_date desc, created_at desc);

create index if not exists missionary_encounters_workspace_table_status_idx
  on public.missionary_encounters(workspace_id, table_id, status);

create index if not exists missionary_table_reviews_workspace_table_idx
  on public.missionary_table_reviews(workspace_id, table_id);

create index if not exists missionary_fruit_items_workspace_status_idx
  on public.missionary_fruit_items(workspace_id, cc_status, testimony_date desc nulls last, created_at desc);

create index if not exists missionary_fruit_items_workspace_table_idx
  on public.missionary_fruit_items(workspace_id, table_id);

create index if not exists missionary_fruit_items_workspace_person_idx
  on public.missionary_fruit_items(workspace_id, field_person_id);

create index if not exists missionary_connection_logs_workspace_date_idx
  on public.missionary_connection_logs(workspace_id, connection_date desc, created_at desc);

create index if not exists missionary_connection_logs_workspace_person_idx
  on public.missionary_connection_logs(workspace_id, field_person_id);

create index if not exists missionary_library_items_workspace_title_idx
  on public.missionary_library_items(workspace_id, title);

create unique index if not exists missionary_in_season_focus_workspace_id_key
  on public.missionary_in_season_focus(workspace_id)
  where workspace_id is not null;

create or replace function public.sync_workspace_and_household_id()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.workspace_id is null then
    new.workspace_id := new.household_id;
  end if;

  if new.household_id is null then
    new.household_id := new.workspace_id;
  end if;

  return new;
end;
$$;

create or replace function public.sync_encounter_workspace_id()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.workspace_id is null then
    new.workspace_id := coalesce(new.missionary_household_id, new.missionary_profile_id);
  end if;

  if new.missionary_household_id is null then
    new.missionary_household_id := new.workspace_id;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_missionary_field_people_workspace_id on public.missionary_field_people;
create trigger sync_missionary_field_people_workspace_id
  before insert or update on public.missionary_field_people
  for each row
  execute function public.sync_workspace_and_household_id();

drop trigger if exists sync_missionary_tables_workspace_id on public.missionary_tables;
create trigger sync_missionary_tables_workspace_id
  before insert or update on public.missionary_tables
  for each row
  execute function public.sync_workspace_and_household_id();

drop trigger if exists sync_missionary_table_reviews_workspace_id on public.missionary_table_reviews;
create trigger sync_missionary_table_reviews_workspace_id
  before insert or update on public.missionary_table_reviews
  for each row
  execute function public.sync_workspace_and_household_id();

drop trigger if exists sync_missionary_connection_logs_workspace_id on public.missionary_connection_logs;
create trigger sync_missionary_connection_logs_workspace_id
  before insert or update on public.missionary_connection_logs
  for each row
  execute function public.sync_workspace_and_household_id();

drop trigger if exists sync_missionary_library_items_workspace_id on public.missionary_library_items;
create trigger sync_missionary_library_items_workspace_id
  before insert or update on public.missionary_library_items
  for each row
  execute function public.sync_workspace_and_household_id();

drop trigger if exists sync_missionary_in_season_focus_workspace_id on public.missionary_in_season_focus;
create trigger sync_missionary_in_season_focus_workspace_id
  before insert or update on public.missionary_in_season_focus
  for each row
  execute function public.sync_workspace_and_household_id();

drop trigger if exists sync_missionary_fruit_items_workspace_id on public.missionary_fruit_items;
create trigger sync_missionary_fruit_items_workspace_id
  before insert or update on public.missionary_fruit_items
  for each row
  execute function public.sync_workspace_and_household_id();

drop trigger if exists sync_missionary_encounters_workspace_id on public.missionary_encounters;
create trigger sync_missionary_encounters_workspace_id
  before insert or update on public.missionary_encounters
  for each row
  execute function public.sync_encounter_workspace_id();

comment on column public.missionary_field_people.workspace_id is
  'Canonical Command Center scope: the Missionary Workspace this internal person belongs to. Legacy household_id is kept in sync for compatibility.';

comment on column public.missionary_tables.workspace_id is
  'Canonical Command Center scope: the Missionary Workspace this meeting belongs to. Legacy household_id is kept in sync for compatibility.';

comment on column public.missionary_encounters.workspace_id is
  'Canonical Command Center scope: the Missionary Workspace this raw encounter belongs to. Legacy missionary_household_id is kept in sync for compatibility.';

comment on column public.missionary_table_reviews.workspace_id is
  'Canonical Command Center scope: the Missionary Workspace this review belongs to. Legacy household_id is kept in sync for compatibility.';

comment on column public.missionary_fruit_items.workspace_id is
  'Canonical Command Center scope for operational Fruit. Public Profile publishing continues to use public visibility gates.';

comment on column public.missionary_connection_logs.workspace_id is
  'Canonical Command Center scope: the Missionary Workspace this quick touch belongs to.';

comment on column public.missionary_library_items.workspace_id is
  'Canonical Command Center scope: the Missionary Workspace this library item belongs to.';

comment on column public.missionary_in_season_focus.workspace_id is
  'Canonical Command Center scope: the Missionary Workspace this current focus belongs to.';

notify pgrst, 'reload schema';
