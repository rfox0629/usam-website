# Circle management — data contract, semantics, migration and open decisions

> **The canonical contract for Reports is [`circle-reporting-contract.md`](./circle-reporting-contract.md).** This file carries the migration plan, the open decisions and the Tanner Kent audit.

Prototype for founder review. **Nothing is merged, deployed or reset. No production circle assignment was altered.** The audit that motivates this is `circle-placement-audit.md` in this folder.

## 1. Proposed data contract

Two concepts, deliberately separate in code (`src/lib/dos/circle-tiers.ts`) and in tests (`scripts/dos-circle-tiers-regression.mjs`).

### Tier — what is stored

Mutually exclusive. A person holds exactly one, or none.

| Tier | Capacity | Stored value |
|---|---|---|
| Inner 3 | 3 | `inner_3` |
| Next 9 | 9 | `next_9` |
| Next 58 | 58 | `next_58` |
| Next 50 | 50 | `next_50` |
| Not placed | — | `not_placed` (or no row) |

### View — what a missionary reads

Cumulative, biblical, derived from tiers. Never stored.

| View | Tiers | Capacity |
|---|---|---|
| My 3 | Inner 3 | 3 |
| My 12 | Inner 3 + Next 9 | 12 |
| My 70 | My 12 + Next 58 | 70 |
| My 120 | My 70 + Next 50 | 120 |

The tier sizes exist so the cumulative views land exactly on 3 / 12 / 70 / 120. That arithmetic is asserted, not hand-maintained.

### The rule that protects reporting

**Aggregate on tiers, display on views.** A person appears in several views by design, so summing views is never a headcount. `placedTotal()` is the only correct answer to "how many people are placed", and the suite asserts that summing the four views does **not** equal it — the double-count this contract exists to prevent.

### Proposed storage

A new confirmed-placement column (or a small table) holding the tier, plus who confirmed it and when. The existing `dos_circle_overrides` shape already fits: `manual_circle` → tier, `locked`, `reason`, `created_by`. **Recommended: keep the confirmed placement in `dos_circle_overrides` and stop treating `dos_relationship_scores.circle_assignment` as placement at all** — it becomes purely a recommendation input. No new table needed; the enum gains the four tier values.

## 2. Current versus proposed semantics

| | Current (production today) | Proposed |
|---|---|---|
| Where placement lives | `dos_relationship_scores.circle_assignment` | `dos_circle_overrides.manual_circle` (confirmed only) |
| Who sets it | The scoring engine, on every person create/edit/import and on reflections and fruit events | A human, in Manage circles, one person at a time |
| Values | `three`, `twelve`, `seventy`, `my_120`, `field` | `inner_3`, `next_9`, `next_58`, `next_50`, `not_placed` |
| Exclusive or cumulative | Exclusive, but the names imply cumulative and the UI reads them as if cumulative | Exclusive tiers, explicitly cumulative views |
| Capacity | None. My 3 held three people by coincidence, not by rule | Enforced per tier, with conflicts surfaced before saving |
| Confirmed vs suggested | Indistinguishable. All 73 rows read `automatic`; zero overrides | Confirmed placement and recommendation are different objects and look different |
| Effect of activity | Historically moved people silently (187 recorded changes). Frozen since 2026-08-24 | Never moves anyone. Activity can only produce a suggestion |
| Trustworthy for Reports | **No** | Only once a human has confirmed a placement |

## 3. Recommendation explainability rules

A recommendation may be shown when, and only when, all of these hold:

1. **It is visibly not a placement.** Different container, different words: "Suggested: Inner 3" against "Confirmed: Inner 3".
2. **It states its reasons concretely**, drawn from the stored `score_explanation` — the same positive and negative factors already recorded, e.g. *"1 meetings in the last 30 days"*, *"Engagement marked +3"*, *"Against: No recent follow up in the last 10 days"*.
3. **It requires an explicit human action** to take effect. In the prototype the only way a suggestion becomes a placement is the "Accept and place in …" button.
4. **It never fires as a side effect.** No effect, timer, save or recalculation may place anyone. The suite asserts the placement module reads no score, meeting, minute, Fruit, engagement or recency signal at all, and that nothing places a person from inside an effect.
5. **It is refusable and silent about it.** Declining a suggestion records nothing and changes nothing.
6. **It never reorders the list.** Suggestions annotate people; they do not sort them.

## 4. Correction plan for the 73 machine assignments

Not run. Requires explicit approval of the exact SQL.

1. **Preserve.** Before any write, copy every current row's `person_id`, `circle_assignment`, `assignment_source`, `total_score`, `score_explanation` and `last_calculated_at` into a snapshot table (`dos_circle_assignment_snapshot_2026_09`) inside the same transaction. `dos_relationship_score_history` (414 rows, 187 circle changes) is retained untouched as the provenance record.
2. **Mark unconfirmed, do not reinterpret.** Write **no** `dos_circle_overrides` rows. Because confirmed placement will live in overrides, and there are none, every one of the 73 becomes "not placed, with a recommendation" the moment the app reads placement from overrides. Nothing is destroyed and nothing is silently promoted into Ryan's name.
3. **Block reporting.** Reports must read confirmed placements only. Today Reports is still a "Coming soon" placeholder and consumes no circle data, so this is preventive: the block goes in before the first report is built, not after.
4. **Let Ryan confirm deliberately.** Manage circles lists everyone with their suggestion and reasons; each acceptance writes one override with `locked = true`, `assignment_source = 'manual'`, `created_by`, and a reason.
5. **Optionally retire the legacy column** only after confirmations exist, as a separate approved step.

### Rollback

- **Before any confirmations:** drop the snapshot table. Nothing else changed, because step 2 writes nothing.
- **After confirmations:** delete the `dos_circle_overrides` rows created after the migration timestamp; placement reverts to none and the legacy column is still intact and untouched.
- **If the legacy column is ever rewritten** (not proposed): restore it from the snapshot table by `person_id`, which is why the snapshot is taken in the same transaction.

Nothing in this plan deletes a person, a score, a history row or a meeting.

## 5. Report dependencies

- **Reports today consumes no circle data.** It is a placeholder screen. Nothing to unwind.
- **Home's bullseye** and the **People rail** both read `data.circles`, which is built from `dos_relationship_scores`. They are the only current consumers, and both are presentation, not reporting.
- **When Reports is built**, it must aggregate on **tiers**, never on views, or it will double-count everyone in an inner circle. `placedTotal()` exists for exactly that call site.
- **Blocked until correction:** any report that treats circle placement as a ministry fact. Until a human has confirmed placements, the honest report is "not yet confirmed", not a number.

## 6. Unresolved decisions for the founder

1. **Where confirmed placement lives** — reuse `dos_circle_overrides` (my recommendation, no new table) or add a dedicated column on the person.
2. **What happens to the 73 legacy values** — leave them in place as recommendation inputs (my recommendation) or null them once confirmations exist.
3. **Whether capacity is a hard stop or a warning.** The prototype blocks saving over capacity. A softer rule ("warn, allow, show over by N") may fit real ministry better.
4. **Whether Not placed is a real state or an absence.** The prototype treats it as an absence, which keeps the data clean; an explicit "deliberately not placed" marker would let Ryan record that he has considered someone and chosen not to place them.
5. **Whether a person may be placed while household-only or private.** Currently the People list hides them; the prototype does not exclude them.
6. **Whether suggestions should appear at all in the first release**, or whether the first pass should be purely manual to establish trust.

## 7. Tanner Kent duplicates — audited, not merged

Read-only. **No Tanner record was merged, edited or deleted.**

| | `4cef88d6` | `de72ef8c` | `1fe7dfbe` |
|---|---|---|---|
| Created | 2026-06-30 | **2026-07-08** | 2026-07-12 |
| Status | archived | **new (active)** | archived |
| Visibility | hidden | **primary** | primary |
| Phone / email | — / yes | **yes / yes** | yes / — |
| Legacy circle · score | field · 0 | **twelve · 34.58** | field · 17.5 |
| Meetings (logged) | 0 | **2** | 0 |
| Group memberships | 0 | **1** | 0 |
| Journeys · progress | 0 · 0 | **2 · 1** | 0 · 0 |
| Prayer partners | 0 | **1** | 0 |
| Accountability (commitments · check-ins · schedules) | 0 · 0 · 0 | **2 · 1 · 5** | 0 · 0 · 0 |
| Group member identity · portal sessions | 0 · 0 | **1 · 5** | 0 · 0 |
| Fruit events | 0 | **2** | 0 |
| Reviews · testimonies · reminders · bookings | all 0 | all 0 | all 0 |

**Proposed canonical record: `de72ef8c`.** It holds 100% of the linked data — every meeting, group membership, journey, prayer partner, accountability record, portal identity and session, and both Fruit events. It is also the only one that is active and visible.

**Proposed merge plan (not run):** the other two carry **no linked rows at all**, so `merge_person_records` would move nothing. Run `preview_person_merge` on each pair to confirm zero row moves, then merge `4cef88d6` and `1fe7dfbe` into `de72ef8c`, which archives the duplicates and writes an audit row to `dos_person_merge_log`. Both are already archived, so the visible field list does not change. Rollback is the existing merge log plus a pre-merge snapshot of the three rows.

**Why it matters here:** three person rows for one human inflate any count that uses people or circles. It is listed separately, and deliberately not bundled with the circle work.
