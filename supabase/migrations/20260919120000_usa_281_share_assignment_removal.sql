-- USA-281 follow-up: a sent assessment can be taken off a record too.
--
-- 20260918120000 gave Journey assignments a Remove control. It did not reach
-- the Marriage Assessment, because a sent assessment is not a Journey
-- assignment: it lives in dos_resource_share_assignments, a different table
-- with a different lifecycle, a public token and a couple who both see it.
-- So the deployed Remove menu appeared on Journeys and on nothing else.
--
-- Removal here is a soft delete, for the same reason as before and one more.
-- An unfinished assessment carries the couple's partial answers in
-- `responses`. A completed one carries the whole submission plus a
-- dos_assessment_results row. Deleting either destroys answers two people sat
-- down and gave, so nothing is deleted.
--
-- Two shapes, because the table's own check constraints allow only one of
-- them per row:
--
--   unfinished (link_ready, in_progress)
--     removed_at is set AND the link is revoked through the existing path,
--     status = 'revoked' with revoked_at. That kills the public link and frees
--     the partial unique index slot, so the couple can be sent a new
--     assessment immediately.
--
--   completed
--     removed_at alone. status stays 'completed' and completed_at stays set,
--     because dos_resource_share_assignments_completed_check ties those two
--     together and dos_resource_share_assignments_revoked_check would demand
--     status = 'revoked' if revoked_at were set. The two constraints cannot
--     both hold on one row, which is exactly why a completed assessment needs
--     a column of its own rather than reusing revocation.
--
-- Public access is cut off in both shapes by a column of its own,
-- `public_access_revoked_at`, which removal always sets.
--
-- It is separate from `removed_at` because the two answer different
-- questions. `removed_at` asks whether this assessment is on the record;
-- `public_access_revoked_at` asks whether the link still opens. Restoring a
-- removal should bring back the record and its results WITHOUT quietly
-- reopening a URL two people already have, so restore clears the first and
-- never the second. Turning sharing back on is its own deliberate action.
--
-- Nothing is deleted and no existing row changes meaning.

alter table public.dos_resource_share_assignments
  add column if not exists removed_at timestamptz,
  add column if not exists removed_by_user_id uuid,
  add column if not exists public_access_revoked_at timestamptz;

comment on column public.dos_resource_share_assignments.removed_at is
  'USA-281: set when a workspace member removes this sent assessment from the record. A soft delete: responses, completed_at, result_id and the dos_assessment_results row it points at are all preserved, and clearing this column restores it. Readers must filter on removed_at is null, and the public token path must refuse a row where it is set.';

comment on column public.dos_resource_share_assignments.removed_by_user_id is
  'USA-281: who removed it, so a restore can be attributed. Never used for access control.';

comment on column public.dos_resource_share_assignments.public_access_revoked_at is
  'USA-281: set when the public link is withdrawn, which removal always does. The token path refuses any row where it is set, whatever the status. Restoring a removed assessment does NOT clear it: recovering a record must not silently reopen a URL the couple already holds. Only the explicit enable-sharing action clears it, and only for an assessment that is neither expired nor independently revoked.';

-- Record reads are always "the assessments still on this record", for either
-- participant, so the partial indexes match those queries rather than the
-- whole table.
create index if not exists dos_resource_share_assignments_primary_active_idx
  on public.dos_resource_share_assignments (primary_person_id)
  where removed_at is null;

create index if not exists dos_resource_share_assignments_secondary_active_idx
  on public.dos_resource_share_assignments (secondary_person_id)
  where secondary_person_id is not null and removed_at is null;

-- Every row that has ever been removed or had its link withdrawn, which is
-- what an operator looks for when auditing public access.
create index if not exists dos_resource_share_assignments_public_access_idx
  on public.dos_resource_share_assignments (workspace_id)
  where public_access_revoked_at is not null;

-- The open-assignment indexes are deliberately NOT changed. Both are already
-- predicated on status in ('link_ready', 'in_progress'), and removing an
-- unfinished assessment moves it to 'revoked', so its slot is freed by the
-- status change alone. A completed row was never in those indexes, so it never
-- blocked a reassessment either. Adding `removed_at is null` to them would be
-- redundant and would widen a constraint for no reason.
