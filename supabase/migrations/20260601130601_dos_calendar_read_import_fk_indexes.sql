create index if not exists external_calendar_events_calendar_source_id_idx
  on public.external_calendar_events(calendar_source_id)
  where calendar_source_id is not null;

create index if not exists calendar_sync_cursors_calendar_source_id_idx
  on public.calendar_sync_cursors(calendar_source_id)
  where calendar_source_id is not null;

notify pgrst, 'reload schema';
