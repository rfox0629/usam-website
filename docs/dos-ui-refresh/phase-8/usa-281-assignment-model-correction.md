# USA-281: the assignment model, and a correction

## The correction

Earlier work in this issue, including commit messages and the first version of
the pull request, described two of Ryan's resource assignments as **duplicates**
and proposed "consolidating" them. **That was wrong**, and this document is the
correction of record.

They are not duplicates. They are the same study running in **two different
groups**:

| Assignment | Resource | Group | Start date | Status |
|---|---|---|---|---|
| `1df68cab-4c5a-4554-b742-10ff14bfc825` | `marks-of-discipleship` | `0e6e43aa-1d23-483d-9a8f-73cd7205519c` | 2026-08-26 | in progress |
| `c7470415-c5be-4feb-872e-6ccbdca6844a` | `marks-of-discipleship` | `8ad0598a-174e-438e-b198-8cd4e451d011` | 2026-08-25 | in progress |

Each carries its own week-1 guided-resource progress, with its own reflection,
action step and prayer focus. Neither is a copy of the other, neither is an
accident, and **merging or deleting either one destroys a real record of what
somebody did**.

What made them look like duplicates was a separate and genuine bug: both rows
store the catalog **id** `discipleship-marks-of-discipleship` where the **slug**
`marks-of-discipleship` belongs, so the title lookup missed and both rendered as
"Assigned Resource" with no title, no dates and no way in. Two anonymous rows
for the same thing read as duplication. Resolving the id form fixed the display;
it did not make them one thing.

## The model DOS actually has

One active assignment per person, per resource, **per context**, and **per group
within a group context**. Production's index has enforced exactly this all
along:

```sql
unique (workspace_id, person_id, resource_slug, assignment_context,
        coalesce(source_group_id, '00000000-0000-0000-0000-000000000000'))
where status in ('not_started', 'in_progress', 'paused')
```

So the following are all legitimate and all distinct:

- the same resource in two different groups (the case above)
- a personal copy alongside a group copy
- a repeat study of the same resource after the earlier one is completed,
  because a completed assignment leaves the predicate
- since USA-281, a fresh assignment after an earlier one was removed

The `coalesce` sentinel is deliberate: `NULL` never equals `NULL` in a unique
index, so without it two self-assignments of one resource would both be
accepted.

`supabase/migrations/20260713113226_dos_resource_assignments.sql` defines a
narrower index, `(workspace_id, person_id, resource_slug)`, that was never
applied to production. It is the stale one and it is wrong: it would reject the
two rows above. USA-281 corrects the repository to match production rather than
the other way round.

## What the interface does with this

Assignments for one resource are grouped into a single entry so the screen does
not read as duplication, but grouping is **display only**:

- every assignment names its group and its start date, whether or not another
  assignment of the same resource is open
- each one opens on its own and is removed on its own
- the row menu and the removal confirmation both say which assignment they are
  acting on, because "Remove Discipleship?" is ambiguous when a person holds two
- nothing is merged, and no row is rewritten

## Removal

Removal is a soft delete. `removed_at` hides an assignment everywhere it is
read; the row, its dates and every `dos_guided_resource_progress` record
attached to it stay exactly where they are, and clearing one column restores it.

`20260918140000` adds `and removed_at is null` to the index predicate, because a
removed assignment otherwise keeps occupying its slot and the same resource can
never be assigned again. That was verified against the real index: blocked
before, accepted after.

## What was superseded

- "two duplicate assignments" in the USA-281 commit messages and the first pull
  request description. They are separate group assignments. Commit messages
  cannot be edited after the fact, so this file is the correction.
- any suggestion of consolidating, merging or deleting one of them. Neither is
  redundant.

This does not change `docs/dos-ui-refresh/phase-7/usa-280-brooke-fox-identity-repair.md`.
The two **People** records reconciled there were genuine duplicates of one
person in one workspace, which is a different thing from two assignments of one
resource in two groups.
