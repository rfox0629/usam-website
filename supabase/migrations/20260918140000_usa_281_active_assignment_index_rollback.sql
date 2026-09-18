-- Rollback for USA-281 active assignment index (20260918140000).
--
-- WHAT THIS RESTORES
--
-- Production's pre-USA-281 index: the same columns and the same coalesce
-- sentinel, without the `removed_at is null` term.
--
--   (workspace_id, person_id, resource_slug, assignment_context,
--    coalesce(source_group_id, '00000000-0000-0000-0000-000000000000'))
--   where status in ('not_started', 'in_progress', 'paused')
--
-- The stale dos_resource_assignments_active_unique from 20260713113226 is
-- deliberately NOT recreated. It was never in production, and it rejects the
-- same study running in two different groups, which production legitimately
-- holds today.
--
-- THIS ROLLBACK CAN LEGITIMATELY FAIL, AND THAT IS NOT A BUG
--
-- The forward migration RELAXES the constraint, so rolling it back TIGHTENS
-- one. Between the two, the application allows something the old index forbids:
--
--   1. someone removes an assignment. It keeps its status and gains removed_at.
--   2. someone assigns that same resource to that same person again, in the
--      same context or group. The forward index permits this, because the
--      removed row no longer counts.
--   3. both rows now exist with an active status, in the same slot.
--
-- Restoring the old predicate makes those two rows collide, and CREATE UNIQUE
-- INDEX fails with a duplicate key error naming the slot.
--
-- HOW TO RESOLVE IT, AND HOW NOT TO
--
-- Do NOT delete the removed assignment, and do NOT clear its notes, its
-- guided-resource progress or its history to make the index build. That data is
-- the whole reason removal is a soft delete. Deleting it to satisfy a rollback
-- destroys exactly what the feature exists to protect.
--
-- The honest options, in order of preference:
--
--   a. Do not roll back. The forward index is a superset of the old one's
--      behaviour; the only thing it permits that the old one did not is
--      re-assigning after a removal, which is the intended product behaviour.
--   b. Roll back the APPLICATION instead, leaving this index in place. Nothing
--      in the older application writes removed_at, so the extra predicate term
--      is inert and the index behaves exactly as it did before.
--   c. If the index itself must be reverted, first decide per conflicting pair
--      which assignment is the live one, and retire the other through the
--      product's own path rather than by deletion: set its status to
--      'completed' with a completed_at, or leave it removed and instead revert
--      the newer assignment. Every row and every note stays.
--
-- The preflight below reports the conflicts and refuses rather than guessing.
-- It changes nothing when it fails.

begin;

do $usa281_rollback$
declare
  conflicting integer;
  detail text;
begin
  select count(*), coalesce(string_agg(slot, '; '), '')
    into conflicting, detail
  from (
    select
      person_id::text || ' / ' || resource_slug || ' / ' || assignment_context as slot
    from public.dos_resource_assignments
    where status in ('not_started', 'in_progress', 'paused')
    group by
      workspace_id,
      person_id,
      resource_slug,
      assignment_context,
      coalesce(source_group_id, '00000000-0000-0000-0000-000000000000'::uuid)
    having count(*) > 1
  ) duplicates;

  if conflicting > 0 then
    raise exception
      'USA-281 rollback: % slot(s) hold more than one active assignment, so the pre-USA-281 index cannot be rebuilt: %. Resolve these through the product rather than by deleting an assignment or its progress. Nothing has been changed.',
      conflicting, detail;
  end if;
end
$usa281_rollback$;

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

commit;
