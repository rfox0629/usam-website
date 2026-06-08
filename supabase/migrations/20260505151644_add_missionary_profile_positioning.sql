alter table public.missionary_households
  add column if not exists region text,
  add column if not exists role_type text not null default 'missionary_household',
  add column if not exists custom_serving_label text,
  add column if not exists location_visibility text not null default 'public';

alter table public.missionary_households
  drop constraint if exists missionary_households_region_check;

alter table public.missionary_households
  add constraint missionary_households_region_check
  check (
    region is null
    or region in ('midwest', 'south', 'northeast', 'west', 'southwest', 'other')
  );

alter table public.missionary_households
  drop constraint if exists missionary_households_role_type_check;

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

alter table public.missionary_households
  drop constraint if exists missionary_households_location_visibility_check;

alter table public.missionary_households
  add constraint missionary_households_location_visibility_check
  check (location_visibility in ('public', 'hidden'));
