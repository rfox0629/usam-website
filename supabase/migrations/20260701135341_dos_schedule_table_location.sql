alter table public.missionary_tables
  add column if not exists location text;

create index if not exists missionary_tables_workspace_scheduled_location_idx
  on public.missionary_tables(workspace_id, meeting_status, scheduled_start_at)
  where meeting_status = 'scheduled'
    and location is not null;

comment on column public.missionary_tables.location is
  'Optional scheduled table place or address for DOS calendar sync and field planning.';

notify pgrst, 'reload schema';
