alter table public.missionary_tables
  drop constraint if exists missionary_tables_type_check;

alter table public.missionary_tables
  add constraint missionary_tables_type_check
  check (table_type in (
    'kitchen_table',
    'coffee',
    'phone',
    'zoom',
    'text',
    'prayer',
    'group',
    'discipleship',
    'other'
  ));

comment on column public.missionary_tables.table_type is
  'Simple Missionary Workspace meeting type: kitchen_table, coffee, phone, zoom, text, prayer, group, discipleship, or other.';

do $$
begin
  if to_regclass('public.prayer_requests') is not null then
    alter table public.prayer_requests
      add column if not exists field_person_id uuid references public.missionary_field_people(id) on delete set null,
      add column if not exists source text not null default 'missionary_workspace';

    create index if not exists prayer_requests_household_person_status_idx
      on public.prayer_requests(household_id, field_person_id, status);

    create index if not exists prayer_requests_related_household_person_status_idx
      on public.prayer_requests(related_household_id, field_person_id, status);

    comment on column public.prayer_requests.field_person_id is
      'Optional private link to a Your Field person. Public profiles must not expose this relationship.';

    comment on column public.prayer_requests.source is
      'Creation surface for the prayer request, such as missionary_workspace, prayer_team, public_form, or dos.';
  end if;
end $$;
