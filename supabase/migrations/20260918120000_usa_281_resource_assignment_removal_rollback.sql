-- Rollback for USA-281 resource assignment removal.
-- Dropping these columns restores the previous shape. Any assignment that was
-- removed becomes visible again, which is the pre-USA-281 behaviour.
drop index if exists public.dos_resource_assignments_person_active_idx;

alter table public.dos_resource_assignments
  drop column if exists removed_by_user_id,
  drop column if exists removed_at;
