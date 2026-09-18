-- Rollback for USA-281 active assignment index.
--
-- Restores production's pre-USA-281 index: the same columns, without the
-- removed_at term. This RE-TIGHTENS the constraint, so a removed assignment
-- reserves its slot again and re-assigning that resource fails. It can also
-- fail outright if a resource was re-assigned after its predecessor was
-- removed, because both rows then collide. That is the state this migration
-- exists to fix, so roll back only if the index itself is the problem.
--
-- The stale dos_resource_assignments_active_unique is deliberately NOT
-- recreated: it was never in production and it rejects the same study run in
-- two different groups.

drop index if exists public.dos_resource_assignments_active_context_unique;

create unique index dos_resource_assignments_active_context_unique
  on public.dos_resource_assignments (
    workspace_id,
    person_id,
    resource_slug,
    assignment_context,
    coalesce(source_group_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where status in ('not_started', 'in_progress', 'paused');
