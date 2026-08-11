create unique index if not exists dos_guided_resource_progress_assignment_session_unique
  on public.dos_guided_resource_progress(workspace_id, assignment_id, session_id)
  where assignment_id is not null;

comment on index public.dos_guided_resource_progress_assignment_session_unique is
  'Staged repeat-Journey support: once legacy rows are backfilled and the old person/resource/session uniqueness is retired, progress is uniquely scoped to the Journey assignment instance.';

comment on column public.dos_guided_resource_progress.assignment_id is
  'Journey instance identity from dos_resource_assignments. New guided progress writes should bind here when an active assignment exists so repeat Journeys do not overwrite prior reflections.';

do $$
begin
  perform pg_notify('pgrst', 'reload schema');
end $$;
