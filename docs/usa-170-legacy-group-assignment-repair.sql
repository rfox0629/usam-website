-- ARCHIVED 2026-09-04 (DOS UI refresh, Phase 7 / USA-234). NEVER RUN.
-- This is a historical repair script kept for reference. It is not a pending migration;
-- the production schema is the source of truth (see docs/dos-ui-refresh/phase-0/01-baseline-report.md).

-- USA-170: restore Tanner's legacy Discipleship assignment to the Wednesday Group.
-- Apply to production only after Founder Approval.
--
-- Why this exists: PR #67 scoped the member Group Home and Journey to
-- assignment instances with assignment_context = 'group' and an exact
-- source_group_id, but shipped no data backfill. Assignments created before
-- instance contexts carry the legacy default ('library', source_group_id null),
-- so PR #67 hid them from the Group they belong to instead of deleting them.
-- The repair adopts the legacy row into its Group context. It preserves the
-- assignment id and every progress row: dos_guided_resource_progress rows are
-- bound by assignment_id, so they surface again the moment the assignment is
-- visible. Nothing is inserted, deleted, or re-keyed.
--
-- Affected rows (audited 2026-09-03, production):
--   exactly one assignment — bbc7f4fa-1b4d-481d-bb1e-5e7e03c4947c
--   (marks-of-discipleship, person de72ef8c-31b7-4a1f-a645-4e14f6bf92bf,
--   active member of group 0e6e43aa-1d23-483d-9a8f-73cd7205519c), with one
--   bound progress row c329c2df-3f47-4212-951d-7d99145c95c6 (week-1).
--   Every other non-group-context assignment belongs to no active group
--   membership or is an intentional person/self instance.
--
-- Safety: the person has no other marks-of-discipleship assignment in this
-- workspace, so the dos_resource_assignments_active_context_unique partial
-- index cannot conflict. The WHERE guards make the statement a no-op if the
-- row was already repaired or has changed shape since the audit.

begin;

update public.dos_resource_assignments
set assignment_context = 'group',
    source_group_id = '0e6e43aa-1d23-483d-9a8f-73cd7205519c',
    updated_at = now()
where id = 'bbc7f4fa-1b4d-481d-bb1e-5e7e03c4947c'
  and person_id = 'de72ef8c-31b7-4a1f-a645-4e14f6bf92bf'
  and resource_slug = 'marks-of-discipleship'
  and assignment_context = 'library'
  and source_group_id is null;
-- expect: UPDATE 1

commit;

-- Verification (read-only, after commit):
-- select id, assignment_context, source_group_id, status
-- from public.dos_resource_assignments
-- where id = 'bbc7f4fa-1b4d-481d-bb1e-5e7e03c4947c';
-- expect: assignment_context = 'group',
--         source_group_id = '0e6e43aa-1d23-483d-9a8f-73cd7205519c'
--
-- select id, assignment_id, session_id
-- from public.dos_guided_resource_progress
-- where assignment_id = 'bbc7f4fa-1b4d-481d-bb1e-5e7e03c4947c';
-- expect: one row, c329c2df-3f47-4212-951d-7d99145c95c6, session week-1

-- Rollback SQL (restores the exact pre-repair values):
-- begin;
-- update public.dos_resource_assignments
-- set assignment_context = 'library',
--     source_group_id = null,
--     updated_at = now()
-- where id = 'bbc7f4fa-1b4d-481d-bb1e-5e7e03c4947c';
-- commit;
