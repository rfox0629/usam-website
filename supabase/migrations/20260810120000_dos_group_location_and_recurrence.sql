alter table public.dos_groups
  add column if not exists location_label text,
  add column if not exists location_address text,
  add column if not exists recurrence_effective_date date,
  add column if not exists recurrence_end_date date;

comment on column public.dos_groups.location_label is
  'Human-friendly place name, e.g. "Ryan''s House". Backward compatible with the legacy free-text default_location column, which stays in sync for existing readers.';

comment on column public.dos_groups.location_address is
  'Street/city/state/ZIP for the group''s default meeting place. Optional; a bare location_label remains valid.';

comment on column public.dos_groups.recurrence_effective_date is
  'Date from which the group''s recurring rhythm (rhythm_label / weekly schedule slots) is in effect for generating scheduled gatherings.';

comment on column public.dos_groups.recurrence_end_date is
  'Optional date after which the recurring rhythm stops generating scheduled gatherings.';

do $$
begin
  perform pg_notify('pgrst', 'reload schema');
end $$;
