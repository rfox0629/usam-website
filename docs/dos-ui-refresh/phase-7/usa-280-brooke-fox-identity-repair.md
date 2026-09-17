# USA-280: reconciling the two Brooke Fox records

Authorized explicitly by Ryan. This is the one production data change in this
work; everything else uses synthetic records.

## What was duplicated, and what was not

Three People rows are named `Brooke Fox`. Only two are duplicates.

| Person id | Workspace | Email | Phone | Created | Visibility |
|---|---|---|---|---|---|
| `d23eee44-7fee-4eaa-9079-8110d525ced7` | `ryan-fox` | brooke@usamissionaries.org | `(651) 245-3375` | 2026-06-30, `created_by` null | `secondary` |
| `e1ca628f-c16d-4092-a3fc-39204d1335b1` | `ryan-fox` | brooke.r.fox@gmail.com | `6512453375` | 2026-07-09, created by Ryan | `primary` |
| `bf1a10e9-81d5-4809-bf1a-b3c1bf1a6da7` | **`bond-family`** | none | none | 2026-08-19, created by Dirk Bond | `primary` |

`bf1a10e9` is **Dirk Bond's own contact record for Brooke, in his own
workspace**. It is a separate legitimate workspace record and is not touched.

The other two are the same person in the same workspace: same name, same phone
number in two formats, both `relationship_context = family`.

## Which record is canonical, and why

**Canonical (target): `e1ca628f`.** Its own `household_notes` read:

> Household roster member in this workspace.
> Relationship: spouse.
> Role: Missionary.

It is the household roster entry for Ryan's wife: `field_visibility = primary`,
`engagement_level = +3`, `role_in_my_life = discipling_them`, created by Ryan
and maintained as recently as 2026-09-15. It carries the living discipleship
relationship: a group membership, a commitment, an accountability schedule, a
Journey assignment, an active discipleship connection where Brooke mentors
someone, a Kitchen Table entry, and 7 of the 11 relationship-score history rows.

**Retired (source): `d23eee44`.** Its own `household_notes` read:

> Prayer-only contact created from prayer partner record
> c70bc9b8-17c3-4a7f-964e-66db62b10ea0. Hidden from Field list by default.

It is a by-product of the prayer-partner CSV import
(`become-a-prayer-partner-2026-06-30.csv`, submission 36650757). It carries the
September 17 assessment plus incidental rows.

### Root cause of the duplication

The prayer-partner import created a new `missionary_field_people` row for
Brooke rather than matching the household roster member already in that
workspace. The phone numbers differ only by formatting (`(651) 245-3375` vs
`6512453375`) and the emails are her work and personal addresses, so an exact
match on either field would miss. This is the creation behaviour to fix, and it
is tracked separately from the repair itself.

## ID mapping

```
d23eee44-7fee-4eaa-9079-8110d525ced7  ->  e1ca628f-c16d-4092-a3fc-39204d1335b1
```

The retired row is **archived, never deleted** (`status = 'archived'` plus a
note naming the target and pointing at `dos_person_merge_log`), so the mapping
stays inspectable in the database itself.

## Pre-merge state (recovery snapshot)

Captured 2026-09-17T17:20:16Z. The merge function also writes both full person
rows to `dos_person_merge_log.before_snapshot`.

Rows owned by **`d23eee44`** (the retiring record):

| Table | Row id | Note |
|---|---|---|
| `dos_resource_share_assignments` | `dd09a7ce-0ded-4b87-ac49-240249222217` | the Sept 17 link, `completed` |
| `dos_assessment_results` | `4ec3b6b8-0567-413d-91a9-9de2e5a35308` | 138/150, 92% |
| `dos_relationship_scores` | `8603f936-5bfc-4b9b-a15e-21ac7da22660` | |
| `dos_relationship_score_history` | `7886eb95`, `34b90d5d`, `c2b1e6e6`, `e9d2df24` | 4 rows |
| `prayer_partners` | `c70bc9b8-17c3-4a7f-964e-66db62b10ea0` | the import origin |
| `person_roles` | `b8926e61-b9cc-4d18-8c8a-5109924ef0f8` | `prayer_partner` |

Rows already owned by **`e1ca628f`** (the canonical record, unaffected):

| Table | Row id |
|---|---|
| `dos_group_members` | `2d502935-0e2d-4bf0-964f-573dbbf3c15d` |
| `dos_person_commitments` | `359fb558-3a50-4fc0-9494-c8beb07e2557` |
| `dos_accountability_schedules` | `77e8ba41-44df-4b64-8bc9-032ea039cb66` |
| `dos_resource_assignments` | `77dcb1d7-0288-4eaa-9904-f7dc85a71214` |
| `dos_discipleship_connections` | `43e0976d-16c5-4666-9607-b5c5104bd601` |
| `missionary_tables` | `c1dd6544-9fdb-40dd-a972-a193caec255b` |
| `dos_relationship_scores` | `04c93ca7-8df1-45d8-9890-304553fb7770` |
| `dos_relationship_score_history` | 7 rows |

### The September 17 assessment, as it must remain

- share token `qZ8LyhArCkZsI_4cI2o-8sKMZxJ1OjMn`, `completed` at
  2026-09-17T16:33:56.424Z
- `primary_participant_role = Wife` (Brooke), `secondary_participant_role =
  Husband` (Ryan `540d151c`), `requested_by_name = Ryan Fox`
- result 138/150, 92%, five category rows, `participantNames` `{Wife: Brooke
  Fox, Husband: Ryan Fox}`
- all fifteen answers preserved verbatim

The wife-first attribution shipped in USA-279 is confirmed correct on this real
record, and the repair must not disturb it.

## Why the merge tool had to be extended first

`merge_person_records()` dates from 2026-08-06 and predates USA-278. Run
unchanged it would have archived `d23eee44` while the assessment share link
still pointed at it. The extension (`20260917190000_usa_280_person_merge_coverage.sql`)
adds `dos_resource_share_assignments`, `dos_discipleship_connections`,
`dos_circle_placements`, `discipleship_relationships`,
`dos_discipleship_account_connections`, `dos_discipleship_identity_matches`,
`meeting_people`, and the `missionary_tables.field_person_ids` /
`prayer_requests.linked_person_ids` array columns.

Running the extended `preview_person_merge()` on this pair immediately surfaced
three dependencies the old tool could not see, the assessment link among them.

### Proven on synthetic records first

A throwaway workspace (`usa280-merge-proof`) with three synthetic people
exercised the new paths before this pair was touched:

- a `completed` couple assignment moved, generated couple key recomputed,
  fifteen-answer payload preserved byte for byte
- a colliding **open** assignment was held on the source and logged as a
  conflict rather than violating the partial unique index
- a discipleship connection moved
- `missionary_tables.field_person_ids` swapped the element **and
  de-duplicated**, `[source, target]` becoming `[target]`
- the source person ended `archived`, never deleted

The fixture was then deleted in full: 0 synthetic people, 0 synthetic
workspaces, counts back to 139 people / 1 share / 1 result.

## Known behaviour worth recording

When an **open** share link cannot move because the target already holds one
for the same resource, it stays on the archived source row and is recorded in
`dos_person_merge_log.conflicts`. That is deliberate (the alternative violates
a unique index), but it does leave an open link pointing at an archived person.
It does not arise for this pair, whose only link is `completed`.
