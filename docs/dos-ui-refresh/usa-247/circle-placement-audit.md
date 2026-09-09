# Circle placement — read-only production audit

Read-only. No circle assignment, score, override or history row was created, changed or deleted. Workspace `2f68ba2b…` (Ryan's), audited 2026-09-09.

## 1. Answer first

**Nobody put Ryan Coggins, Samuel Gaffney or Garrett Grahl in My 3.** All three were placed there automatically, by an older scoring algorithm, driven mainly by **Engagement Level** and a single recent meeting. They then froze in place when a later change stopped recalculation from ever moving anyone.

Two facts settle it:

- **All 73 score rows in the workspace have `assignment_source = 'automatic'`. There are zero rows in `dos_circle_overrides`.** Not one placement in this workspace was ever human-confirmed.
- **My 3 is not a ranking.** Tanner Kent scores **34.58** with 270 minutes of ministry time and sits in My 12, while Garrett Grahl scores **18.75** with 60 minutes and sits in My 3. If My 3 were "the top three", these would be reversed.

## 2. Where placement is stored

| Concern | Location |
|---|---|
| Canonical placement | `dos_relationship_scores.circle_assignment` (enum: `three`, `twelve`, `seventy`, `my_120`, `field`), one row per person |
| How it was set | `dos_relationship_scores.assignment_source` (enum: `automatic`, `manual`) |
| Human override | `dos_circle_overrides.manual_circle` + `locked` + `reason` |
| Movement log | `dos_relationship_score_history` (`previous_circle`, `new_circle`, `movement_reason` jsonb) |

There is no circle column on `missionary_field_people`, no SQL view, and no other table involved.

**Exclusive, not cumulative.** Each person holds exactly one `circle_assignment`. Production: `three` 3 + `twelve` 9 + `seventy` 49 + `field` 12 = **73**, which equals the workspace's person count. My 12 does not contain My 3; the four circles never double-count. `my_120` currently holds **0** people.

**All is a superset, not a total.** 12 people sit in `field` — saved, but not placed in any circle. They appear under **All** and under none of the four tabs, which is why All is larger than the four combined and now says so.

## 3. Every path that can change a circle

`recalculateCircleScores(workspaceId)` is the only writer. It is called from:

- `app/api/dos/app/people/route.ts` — on **create**, on **edit**, and on **delete** (three call sites)
- `app/api/dos/app/people/import/route.ts` — after a CSV import
- `app/api/dos/app/reflections/route.ts`
- `app/api/dos/app/fruit-events/[eventId]/route.ts`

**There is no Add/Edit Person control, no API route, and no UI anywhere that sets a circle or writes an override.** A code comment refers to "the existing `dos_circle_overrides` pathway", but no route writes that table. The human-confirmation pathway is referenced and not implemented — which is exactly why every row reads `automatic`.

Consequence worth stating plainly: **creating or editing any person recalculates the whole workspace.** Garrett Grahl's last move to My 3 is stamped `2026-08-30 17:32:14`, the same second a different person was created. An unrelated edit moved him.

## 4. What the score is made of

`total_score` is a weighted sum of six sub-scores stored on the row: `meeting_frequency`, `time_invested`, `discipleship_progress`, `fruit`, `momentum`, `multiplication`. The stored `movement_reason` shows the factors the old algorithm acted on, and they are dominated by **Engagement Level** (`"Engagement marked +3"`) and **meeting recency** (`"1 meetings in the last 30 days"`).

No AI or suggestion engine is involved. No sorting rule or report feeds back into placement.

## 5. Evidence table

Stored facts from production. "Provenance" is read from `dos_relationship_score_history`; where a row is absent that is stated rather than guessed.

| | Ryan Coggins | Samuel Gaffney | Garrett Grahl | Tanner Kent *(comparison)* |
|---|---|---|---|---|
| **Stored circle** | `three` | `three` | `three` | `twelve` |
| **Assignment source** | automatic | automatic | automatic | automatic |
| **Manual override** | none | none | none | none |
| **Total score** | 29.58 | 27.92 | **18.75** | **34.58** |
| Meeting frequency | 50 | 25 | **0** | 25 |
| Time invested | 20 | 10 | 10 | 20 |
| Discipleship progress | 56 | 84 | 84 | 84 |
| Fruit | 0 | 0 | 0 | 0 |
| Momentum | 35 | 35 | **0** | 100 |
| Multiplication | 0 | 0 | 0 | 0 |
| **Logged meetings** | 2 | 1 | 1 | 2 |
| **Ministry minutes** | 120 | 60 | 60 | **270** |
| **Fruit items / events** | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 2 |
| **Latest meeting** | 2026-08-20 | 2026-08-20 | 2026-08-01 | 2026-09-02 |
| **Last activity** | 2026-08-20 | 2026-08-20 | 2026-08-02 | 2026-09-02 |
| **Engagement Level** | +2 | +3 | +3 | +3 |
| **Relationship** | Walking With · Friend | New · Other | Discipling · Friend | Discipling · Family |
| **Person created** | 2026-08-21 22:32:07 | 2026-08-21 22:39:33 | 2026-07-31 22:58:34 | 2026-07-08 17:47:32 |
| **Recorded circle changes** | 1 | 0 (placed on creation) | 3 | 21 |

### Provenance, stored

- **Samuel Gaffney** — placed directly into **My 3 at the moment his record was created** (`null → three`, `2026-08-21 22:39:33`). The stored reason lists a negative factor of *"No logged discipleship activity yet"* and a single positive factor: *"Engagement marked +3"*. He entered the inner circle on an engagement rating alone, with nothing logged.
- **Ryan Coggins** — created `2026-08-21 22:32:07` into `seventy`; **46 seconds later** moved `seventy → three` (`22:32:53`), positive factors *"1 meetings in the last 30 days"*, *"Engagement marked +2"*.
- **Garrett Grahl** — created into `twelve` (2026-07-31); `twelve → three` (2026-08-13); `three → twelve` (2026-08-21); `twelve → three` (2026-08-30). He has oscillated in and out of My 3 four times, with the same stored reason each time and a standing negative factor of *"No recent follow up in the last 10 days"*.
- **Tanner Kent** — 21 recorded circle changes, including eight `twelve ↔ seventy` flips on 2026-07-01 and 2026-07-09, several **one second apart**. He also has **three duplicate person records** in this workspace (one in `twelve`, two in `field`).

Workspace-wide: **414 history rows, 187 of them actual circle changes.**

### Inferred, not stored

- The pattern above is consistent with the older algorithm assigning on every recalculation, and every person create/edit/import triggering one. The stored reasons support it; there is no log that names the triggering request, so the link between Garrett's 2026-08-30 move and the person created in the same second is inference from matching timestamps, not a recorded fact.
- Why My 3 holds exactly three people is not recorded anywhere. There is no stored cap. With 73 people and no override rows, three is what the old thresholds happened to produce.

## 6. Why it is now frozen

`canonicalCircleForRecalculation` (added 2026-08-24, commit `fe75007`) made recalculation refuse to move anyone: a locked override wins, otherwise the existing circle is kept, otherwise a new person starts in `field`. The last recalculation (2026-09-08 16:41:43) rewrote every score row and moved **nobody**.

So today's behaviour already honours the governing rule — activity never silently promotes or demotes. But it also means **the residue of the old algorithm is now permanent**: the three people in My 3 are there because of what an old calculation decided in August, and nothing in the product can move them.

## 7. Recommended correction

Not designed here, and not implemented. In order of cleanliness:

1. **Build the human control first.** Add an explicit "Circle" choice on the Person record that writes `dos_circle_overrides` with `locked = true`, `assignment_source = 'manual'` and a reason. Until this exists, no placement in DOS can be called intentional, and Reports must not treat circle as a trustworthy dimension.
2. **Then reset the unconfirmed placements**, as a bounded, approved migration: move every `automatic` placement to `field` (or leave it visible but flagged "not yet confirmed"), so that My 3 / 12 / 70 / 120 contain only people a human actually chose. 73 rows, all currently `automatic`; rollback is a restore of `circle_assignment` from a snapshot taken in the same migration.
3. **Keep the score as a recommendation only** — visible, explainable, never applied. The existing sub-scores and `movement_reason` are already good raw material for "you might consider moving X", which is what the founder's governing rule allows.
4. **Separately: three duplicate Tanner Kent records** should be merged with the existing `merge_person_records` capability. Not part of circle work, but it distorts any count that uses circles.

**Until step 1 exists, Reports should not use circle placement as a reporting dimension.**

## 8. People-list counts (implemented alongside this audit)

Every number on the People rail is counted **after** the same two filters the list applies — the household/secondary toggle and the search box — so a tab never promises rows the list will not show. Workspace scope, permissions and privacy are applied upstream: `people` is loaded for one workspace, `hidden` people never enter the field list, and archived people are excluded.

| Tab | Counts |
|---|---|
| **All** | Every person currently listed, including those not placed in any circle |
| **My 3 / My 12 / My 70 / My 120** | People whose single stored `circle_assignment` is that circle |

Because the circles are exclusive and `field` people belong to none of them, All is larger than the four combined. When that is true, All carries the line *"Includes N not yet placed in a circle, so All is larger than My 3, 12, 70 and 120 combined."* rather than a silent discrepancy.

The full-width **Show household & secondary** row under Search is gone. In its place, immediately after **My 120**, a compact **Household** control shows how many household-only people are hidden right now (respecting the search), expands and collapses them, and states in both states that **saved visibility does not change**.
