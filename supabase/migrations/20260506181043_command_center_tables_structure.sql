alter table public.missionary_tables
  add column if not exists field_person_ids uuid[] not null default '{}';

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'missionary_tables_type_check'
      and conrelid = 'public.missionary_tables'::regclass
  ) then
    alter table public.missionary_tables
      drop constraint missionary_tables_type_check;
  end if;

  alter table public.missionary_tables
    add constraint missionary_tables_type_check
    check (table_type in ('kitchen_table', 'coffee', 'phone', 'zoom', 'group', 'other'));
end $$;

create index if not exists missionary_tables_field_person_ids_idx
  on public.missionary_tables using gin(field_person_ids);

comment on column public.missionary_tables.field_person_ids is
  'Optional links to internal Your Field people connected to this meeting. Profiles never expose these IDs.';

comment on column public.missionary_tables.table_type is
  'Simple meeting type used by Command Center and future Field: kitchen_table, coffee, phone, zoom, group, or other.';
