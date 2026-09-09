# Circle & Reporting Contract (canonical)

**This file is the canonical reference for anything that reports on circles.** The Reports work should link to it rather than restating it. Code of record:

| Concern | Module | Tests |
|---|---|---|
| Tiers, views, capacity, change sets | `src/lib/dos/circle-tiers.ts` | `scripts/dos-circle-tiers-regression.mjs` |
| Alignment windows, states, evidence, dismissals | `src/lib/dos/circle-alignment.ts` | `scripts/dos-circle-alignment-regression.mjs` |

Both are dependency-free and importable directly under Node's type stripping. The alignment module restates the tier order; a cross-module assertion proves the two agree, so they cannot drift.

## 0. Governing model

> The missionary chooses intended placement. DOS measures whether lived investment aligns with it. DOS never silently moves someone.

## 1. Storage is exclusive; display is cumulative

| Tier (stored, one per person) | Capacity | | View (displayed) | Made of | Capacity |
|---|---|---|---|---|---|
| `inner_3` | 3 | | My 3 | `inner_3` | 3 |
| `next_9` | 9 | | My 12 | + `next_9` | 12 |
| `next_58` | 58 | | My 70 | + `next_58` | 70 |
| `next_50` | 50 | | My 120 | + `next_50` | 120 |
| `not_placed` | — | | | | |

A person holds exactly one tier, or none. `closestCircleForTier()` maps a tier to the circle a missionary reads.

## 2. Rules Reports must follow

1. **Aggregate unique headcount on exclusive tiers.** `placedTotal(tierCounts(...))` is the only correct answer to "how many people". Never derive a headcount from views.
2. **Never sum My 3 + My 12 + My 70 + My 120.** They overlap by construction; the sum is meaningless. The test suite asserts this explicitly.
3. **Display cumulative views when the question is "who is in my twelve".** `viewCounts()` returns them, already nested.
4. **Label which model a metric uses.** Every published number states either "unique people" (tier-based) or the circle name (view-based). A number with no model label is a defect.
5. **Distinguish current placement from historical placement.** A report about the past must read the placement that was in force then, not today's. See §4.
6. **Keep circle alignment separate from the discipling / multiplication graph.** See §5.
7. **Exclude unconfirmed placements.** See §3.

## 3. Only confirmed placements are reportable

Today **all 73 placements in the founder's workspace are unconfirmed machine assignments** (`assignment_source = 'automatic'`, zero rows in `dos_circle_overrides`). They are preserved as provenance and may be surfaced as *possibilities*, but:

- they must **not** appear in trusted circle counts;
- they must **not** feed any report;
- a report whose data is entirely unconfirmed should say "not yet confirmed", not show a number.

`evaluateCircleAlignment()` enforces the same rule: a person with no confirmed placement is never evaluated, because a machine assignment is not a decision to measure against.

## 4. Persistence and effective-dated history

Canonical confirmed placement lives in the existing workspace-scoped `dos_circle_overrides`, extended to carry:

| Field | Purpose |
|---|---|
| `workspace_id` | scope |
| `person_id` | who |
| `previous_tier` | what it was |
| `manual_circle` → tier | what it became |
| `confirmed_by` | which user decided |
| `confirmed_at` | when the decision was made |
| `source` | `manual` or `accepted_recommendation` |
| `reason` | optional, free text |
| `effective_from` / `effective_to` | the window this placement was in force |

**Changing a placement today must not rewrite history.** A change closes the current row (`effective_to = now`) and opens a new one. A report for a past period reads the row whose effective window covers that period. Machine recommendations are never written here; they stay in `dos_relationship_scores` and are read as suggestions only.

## 5. Relationship boundary

Circles represent **people the missionary is intentionally pouring into**. They are not, and must never be conflated with:

- **Discipling me** — someone investing in the missionary;
- **peers**;
- **household and family**;
- **general ministry relationships**.

Two hard rules:

- **A circle placement must never create a discipling relationship.**
- **A discipling relationship must never automatically create a circle placement.**

Worked example: Dirk discipling Ryan belongs in the confirmed discipling relationship graph. Dirk's visibility into multiplication flowing through Ryan is a **Reports** concern and must not depend on Ryan placing Dirk in a personal circle. If a report needs that view, it reads the discipling graph, not circles.

## 6. Circle Alignment

Default window **trailing 90 days**; also `30d` and `12m` (`alignmentWindows`).

| State | Meaning |
|---|---|
| `aligned` | intended placement and actual investment generally agree |
| `needs_attention` | someone in an inner circle has received little recent investment |
| `review_placement` | someone farther out is consistently receiving materially more investment than someone closer in |
| `insufficient_data` | not enough activity to make a responsible observation |

Signals that may inform an observation — meeting count, actual ministry time, tables, consistency, recency, active Journeys, Accountability, Prayer, Fruit, multiplication — and **none of them may assign, promote, demote, remove or reorder a person.**

Four dimensions stay distinct and are never collapsed into one number:

- **Time** validates actual investment.
- **Fruit** reflects observed movement or outcomes.
- **Multiplication** reflects reproduction through discipling others.
- **Confirmed circle** records the missionary's intended stewardship.

A score may order suggestions internally. **Every user-facing recommendation must show the concrete evidence behind it**, e.g.

> **Review My 3** — You logged 45 minutes with Samuel during the last 90 days and 12 hours with Philip, currently in My 70.

Guard rails asserted in tests:

- **Absence of Fruit alone never questions a placement.** New, difficult or seasonal relationships require faithful investment before visible Fruit. Steady investment with zero Fruit is `aligned`, and the observation does not mention Fruit.
- **Fruit alone never substitutes for investment** when judging an inner placement.
- **A fresh placement is not judged** before its window has elapsed.
- **"Materially more" is strict** — at least double and at least an hour more — so ordinary variation never raises a review.
- **Comparisons only point inward-out.** An inner person receiving the most investment is aligned; an outer person receiving less is not a problem to raise.
- **No user-facing observation exposes a score.**

The missionary may keep the placement, move the person, or **dismiss with an optional reason**. A dismissal records that the observation was considered; it never edits, hides or deletes the underlying activity.

## 7. Explainability rules for any recommendation

1. Visibly not a placement — different container, different words ("Possible My 12" vs "Confirmed: My 12").
2. States concrete reasons drawn from stored evidence.
3. Takes effect only on an explicit human action.
4. Never fires as a side effect — no effect, timer, save or recalculation may place anyone.
5. Refusable, and silent when refused.
6. Never reorders the list.

## 8. Status

**Blocked for reporting until a missionary confirms placements.** The Manage circles surface exists as a founder-review prototype and writes nothing. The correction plan for the 73 unconfirmed assignments is documented in `circle-data-contract.md` §4 and has not been run.
