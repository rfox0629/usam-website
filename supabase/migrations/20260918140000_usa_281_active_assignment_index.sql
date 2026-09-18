-- USA-281: reconcile the active-assignment uniqueness index, and stop a
-- removed assignment from reserving a slot forever.
--
-- Two separate problems, one index.
--
-- 1. THE REPOSITORY AND PRODUCTION DISAGREE, AND PRODUCTION IS RIGHT.
--
--    20260713113226 defines:
--      dos_resource_assignments_active_unique
--      (workspace_id, person_id, resource_slug)
--      where status in ('not_started','in_progress','paused')
--
--    Production instead has:
--      dos_resource_assignments_active_context_unique
--      (workspace_id, person_id, resource_slug, assignment_context,
--       coalesce(source_group_id, '00000000-0000-0000-0000-000000000000'))
--      where status in ('not_started','in_progress','paused')
--
--    The repository version is the stale one and was never applied to
--    production. It is also wrong: it allows a person only one active
--    assignment of a resource across the whole workspace, so it cannot express
--    the same study being run in two different groups. That is not
--    hypothetical. In production one person holds `marks-of-discipleship`
--    twice, in groups 0e6e43aa and 8ad0598a, with different start dates and
--    separate progress. The narrow index would reject the second one.
--
--    The coalesce sentinel is deliberate: a NULL source_group_id would
--    otherwise never collide with itself, because NULLs are not equal in a
--    unique index, and two self-assignments of the same resource would slip
--    through.
--
--    So the repository is corrected to match production rather than the other
--    way round. Nothing about production's behaviour changes here.
--
-- 2. A REMOVED ASSIGNMENT STILL RESERVES ITS SLOT.
--
--    USA-281 removal is a soft delete: `removed_at` is set and `status` is
--    left alone, so progress and notes survive. But the predicate above only
--    looks at status, so a removed assignment keeps occupying the unique slot
--    and re-assigning the same resource to the same person fails with a
--    duplicate key error. Verified against this exact index: the insert is
--    rejected.
--
--    Adding `removed_at is null` to the predicate fixes that.
--
-- SAFETY. This change only ever RELAXES the constraint: every row the current
-- index accepts is still accepted, because the new predicate matches a strict
-- subset of rows. It cannot fail on existing data, and the guard below proves
-- that before the index is created rather than trusting the claim.
--
-- TRANSACTIONAL. The whole file runs as one transaction, stated explicitly
-- here rather than relying on the runner to wrap it. There is a window inside
-- it where the unique index does not exist, so either every statement lands or
-- none does: a failure cannot leave the table with its old index dropped and
-- no replacement. CREATE INDEX CONCURRENTLY is deliberately NOT used, because
-- it cannot run inside a transaction and would open exactly that window for
-- real. The table is small enough that the brief lock this takes is not a
-- concern; if that ever changes, the concurrent form needs its own migration
-- with its own recovery story.

begin;

do $usa281$
declare
  conflicting integer;
begin
  select count(*) into conflicting
  from (
    select 1
    from public.dos_resource_assignments
    where status in ('not_started', 'in_progress', 'paused')
      and removed_at is null
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
      'USA-281: % group(s) of rows would violate the active assignment index. Resolve them before applying this migration; nothing has been changed.',
      conflicting;
  end if;
end
$usa281$;

-- The stale repository index, if a database was built from the migrations and
-- therefore has it. Production does not.
drop index if exists public.dos_resource_assignments_active_unique;

drop index if exists public.dos_resource_assignments_active_context_unique;

create unique index dos_resource_assignments_active_context_unique
  on public.dos_resource_assignments (
    workspace_id,
    person_id,
    resource_slug,
    assignment_context,
    coalesce(source_group_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where status in ('not_started', 'in_progress', 'paused')
    and removed_at is null;

comment on index public.dos_resource_assignments_active_context_unique is
  'USA-281: one active assignment per person per resource per context, and per group within a group context. Removed assignments are excluded so a soft delete does not block re-assigning the same resource.';

commit;
