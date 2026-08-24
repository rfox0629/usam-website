-- USA-170 draft only.
-- Do not apply to production until Founder Approved.

begin;

-- Active Journey uniqueness must be scoped to the assignment instance context.
-- Group instances are unique per exact source_group_id; self/person/library
-- instances are unique per assignment_context with no group context.
drop index if exists public.dos_resource_assignments_active_unique;

create unique index dos_resource_assignments_active_context_unique
  on public.dos_resource_assignments (
    workspace_id,
    person_id,
    resource_slug,
    assignment_context,
    coalesce(source_group_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where status in ('not_started', 'in_progress', 'paused');

comment on index public.dos_resource_assignments_active_context_unique is
  'USA-170: prevents duplicate active Journey assignments only inside the same exact context; permits the same person/resource in different Groups and separate self/direct contexts.';

-- Guided progress must be unique by assignment instance/session, not by
-- person/resource/session. Keep a legacy null-assignment guard so older
-- unbound progress rows still cannot duplicate each other.
drop index if exists public.dos_guided_resource_progress_person_session_unique;

create unique index dos_guided_resource_progress_assignment_session_unique
  on public.dos_guided_resource_progress(workspace_id, assignment_id, session_id)
  where assignment_id is not null;

create unique index dos_guided_resource_progress_legacy_person_session_unique
  on public.dos_guided_resource_progress(workspace_id, person_id, resource_slug, session_id)
  where assignment_id is null;

comment on index public.dos_guided_resource_progress_assignment_session_unique is
  'USA-170: Journey progress is isolated by assignment_id so the same week in separate Group Journey instances can carry different reflections.';

comment on index public.dos_guided_resource_progress_legacy_person_session_unique is
  'USA-170 compatibility guard for legacy progress rows that have not been bound to an assignment_id.';

do $$
begin
  perform pg_notify('pgrst', 'reload schema');
end $$;

commit;

-- Rollback SQL:
-- begin;
-- drop index if exists public.dos_resource_assignments_active_context_unique;
-- create unique index dos_resource_assignments_active_unique
--   on public.dos_resource_assignments(workspace_id, person_id, resource_slug)
--   where status in ('not_started', 'in_progress', 'paused');
-- drop index if exists public.dos_guided_resource_progress_assignment_session_unique;
-- drop index if exists public.dos_guided_resource_progress_legacy_person_session_unique;
-- create unique index dos_guided_resource_progress_person_session_unique
--   on public.dos_guided_resource_progress(workspace_id, person_id, resource_slug, session_id);
-- do $$
-- begin
--   perform pg_notify('pgrst', 'reload schema');
-- end $$;
-- commit;
