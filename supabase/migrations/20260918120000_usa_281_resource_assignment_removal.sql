-- USA-281: let a person remove a resource they did not want, without
-- destroying anything.
--
-- A discipler created an assignment by accident and had no way to take it off
-- their record. The obvious fix, deleting the row, is the wrong one: an
-- assignment can carry guided-resource progress, reflections, action steps and
-- prayer notes, and two of the rows this was reported against do exactly that.
--
-- So removal is a soft delete. `removed_at` hides the assignment everywhere it
-- is read; the row, its dates and every progress record attached to it stay
-- exactly where they are and can be restored by clearing one column.
--
-- The status check constraint is untouched, so no existing row changes meaning.

alter table public.dos_resource_assignments
  add column if not exists removed_at timestamptz,
  add column if not exists removed_by_user_id uuid;

comment on column public.dos_resource_assignments.removed_at is
  'USA-281: set when a workspace member removes this assignment from their record. A soft delete: the row and all dos_guided_resource_progress attached to it are preserved, and clearing this column restores it. Readers must filter on removed_at is null.';

comment on column public.dos_resource_assignments.removed_by_user_id is
  'USA-281: who removed it, so a restore can be attributed. Never used for access control.';

-- Reads are always "the assignments that are still on the record", so the
-- partial index matches the query rather than the whole table.
create index if not exists dos_resource_assignments_person_active_idx
  on public.dos_resource_assignments (person_id)
  where removed_at is null;
