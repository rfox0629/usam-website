alter table public.missionary_households
  add column if not exists show_household boolean not null default true,
  add column if not exists show_photos boolean not null default true,
  add column if not exists show_team boolean not null default true,
  add column if not exists show_story boolean not null default true,
  add column if not exists show_fruit boolean not null default true,
  add column if not exists show_support boolean not null default true,
  add column if not exists show_prayer boolean not null default true,
  add column if not exists fruit_from_field text,
  add column if not exists original_story text,
  add column if not exists public_story text,
  add column if not exists support_mode text not null default 'household',
  add column if not exists support_target_household_id uuid references public.missionary_households(id) on delete set null,
  add column if not exists support_target_fund text,
  add column if not exists support_public_label text,
  add column if not exists support_button_label text,
  add column if not exists support_explanation text,
  add column if not exists prayer_cta_label text,
  add column if not exists prayer_destination text,
  add column if not exists enable_prayer_team boolean not null default true,
  add column if not exists prayer_section_headline text,
  add column if not exists prayer_section_description text,
  add column if not exists primary_state text,
  add column if not exists serving_scope text not null default 'nationwide',
  add column if not exists secondary_states text[] not null default '{}',
  add column if not exists region text,
  add column if not exists role_type text not null default 'missionary_household',
  add column if not exists custom_serving_label text,
  add column if not exists location_visibility text not null default 'public';

update public.missionary_households
set show_household = coalesce(show_household, public_visible, true),
    public_visible = coalesce(public_visible, show_household, true),
    public_story = coalesce(public_story, story),
    primary_state = coalesce(primary_state, location),
    updated_at = now()
where show_household is distinct from coalesce(show_household, public_visible, true)
   or public_visible is distinct from coalesce(public_visible, show_household, true)
   or public_story is null
   or primary_state is null;

create index if not exists missionary_households_support_target_idx
  on public.missionary_households(support_target_household_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'missionary_households_support_mode_check'
      and conrelid = 'public.missionary_households'::regclass
  ) then
    alter table public.missionary_households
      add constraint missionary_households_support_mode_check
      check (
        support_mode in (
          'household',
          'general_fund',
          'state_leader',
          'regional_leader',
          'national_leadership',
          'household_nomination',
          'hidden'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'missionary_households_serving_scope_check'
      and conrelid = 'public.missionary_households'::regclass
  ) then
    alter table public.missionary_households
      add constraint missionary_households_serving_scope_check
      check (serving_scope in ('local', 'statewide', 'regional', 'nationwide', 'global'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'missionary_households_region_check'
      and conrelid = 'public.missionary_households'::regclass
  ) then
    alter table public.missionary_households
      add constraint missionary_households_region_check
      check (region is null or region in ('midwest', 'south', 'northeast', 'west', 'southwest', 'other'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'missionary_households_role_type_check'
      and conrelid = 'public.missionary_households'::regclass
  ) then
    alter table public.missionary_households
      add constraint missionary_households_role_type_check
      check (
        role_type in (
          'missionary_household',
          'state_leader',
          'regional_leader',
          'national_leader',
          'prayer_leader',
          'support_leader',
          'operations_leader',
          'training_leader',
          'founder_national_missionary'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'missionary_households_location_visibility_check'
      and conrelid = 'public.missionary_households'::regclass
  ) then
    alter table public.missionary_households
      add constraint missionary_households_location_visibility_check
      check (location_visibility in ('public', 'hidden'));
  end if;
end $$;

comment on column public.missionary_households.show_household is
  'Controls whether the Missionary Workspace profile is visible publicly. Kept in sync with legacy public_visible during launch.';

alter table if exists public.missionary_field_people
  add column if not exists workspace_id uuid references public.missionary_households(id) on delete cascade;

alter table if exists public.missionary_tables
  add column if not exists workspace_id uuid references public.missionary_households(id) on delete cascade;

alter table if exists public.missionary_fruit_items
  add column if not exists workspace_id uuid references public.missionary_households(id) on delete cascade;

update public.missionary_field_people
set workspace_id = household_id
where workspace_id is null
  and household_id is not null;

update public.missionary_tables
set workspace_id = household_id
where workspace_id is null
  and household_id is not null;

update public.missionary_fruit_items
set workspace_id = household_id
where workspace_id is null
  and household_id is not null;

create index if not exists missionary_field_people_workspace_id_idx
  on public.missionary_field_people(workspace_id);

create index if not exists missionary_tables_workspace_date_idx
  on public.missionary_tables(workspace_id, table_date desc, created_at desc);

create index if not exists missionary_fruit_items_workspace_status_idx
  on public.missionary_fruit_items(workspace_id, cc_status, testimony_date desc nulls last, created_at desc);

notify pgrst, 'reload schema';
