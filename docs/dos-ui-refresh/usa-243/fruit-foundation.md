# USA-243 — the fruit foundation (one vocabulary, two evidence sources, no schema change)

2026-09-08, branch `ryan/usa-243-fruit-foundation` from `main` `554039e`. **No migration, no production data change, nothing stored is rewritten.** This is the implementation of the Phase C package's read-time option (§7.4, "keep everything read-time only"), which needs no founder schema decision to ship. The schema questions stay open and are restated in §6.

Companions: [phase-a-fruit-evidence-inventory.md](./phase-a-fruit-evidence-inventory.md), [phase-c-decision-package.md](./phase-c-decision-package.md) (PR #115).

## 1. What the founder asked for, and where it now lives
| Requirement | Where it is satisfied |
| --- | --- |
| Two evidence sources, one system: **Observed Fruit** (what the leader witnessed) and **Reported Fruit** (what the person said) | `FruitProvenanceSource` = `leader_observed` · `recipient_reported` · `system_evidenced` · `historical`, carried on every `FruitObservation` |
| Preserve source, meeting, person, date, evidence type, privacy and sharing permission | `FruitObservation` fields: `source`, `meetingId`, `personId`, `observedAt`, the classifier's `class`, and `shareConsent`. Counting never depends on consent; showing someone's words still does. |
| General, reusable categories across meetings and forms | `canonicalFruitOptions` — 11 labels in 4 groups, used by **both** the leader's Observed Fruit control and the recipient's "What fruit did you notice?" |
| Avoid separate competing lists that mean the same thing | The testimony list and the Observed Fruit list are now the same array. `dosReviewOutcomeOptions` is derived from `canonicalFruitOptions`. |
| Reporting must not double count | `buildFruitAssertions` / `fruitReportingTotals`: one **assertion** per (workspace, person, canonical key, meeting), every matching row a **supporting observation**. The two counts are returned separately and must never be summed. |

## 2. The one vocabulary
Spiritual response — New believer · Rededication · Baptized · Baptized in the Holy Spirit
Prayer and restoration — Answered prayer · Healing or freedom · Reconciliation / relationship restored
Growth and discipleship — Discipleship growth · Began discipling others
Community and mission — Connected to church or Christian community · Serving or mission engagement

Detail that a canonical label drops is kept as **context** on the assertion, derived from the recorded wording: "Marriage Restoration" reads as Reconciliation · Marriage, "Deliverance" as Healing or freedom · Deliverance. No twelfth top-level label.

## 3. Activity is not fruit
Gospel conversations, prayer received, communion, washing of feet, prophetic / healing / deliverance prayer, church visits, ongoing accountability, "discipling" as a relationship in progress, and a testimony having been shared are **ministry activity**. They are still recorded, still rendered, still evidence — and never counted as fruit. Impact ("felt encouraged", "peace", "I felt closer to God") and follow-up ("prayer request", "wants baptism") are likewise separated out. Every one of these is returned by `buildFruitAssertions` in its own bucket, so nothing is lost.

## 4. Fruit is no longer inferred from free text
`fruitOutcomeMatchesText` searched a story's summary, title and description for any label longer than three characters and treated a substring hit as fruit. Writing "we talked about how her marriage is healing" silently produced a Marriage Restoration outcome nobody recorded, and one sentence could manufacture several. **It is deleted.** Classification is now an exact match on the normalized value, and only explicit selections are classified:
- testimony → `testimony.outcomeTags` (newly surfaced from `participant_testimonies.outcome_tags`, which the app never read)
- leader reflection → `reflection.observedFruit`
- fruit event → `event.fruitType`
- recorded fruit → `fruit.outcomeTags`

The one visual baseline that changed (`mobile--fruit.png`) is exactly this: two stories lost a "Discipling" tag that had been manufactured from the words in their narrative.

## 5. Backward compatibility (the part that protects production)
- **Nothing stored is rewritten.** The canonical key is derived at read time; `originalValue` is always the string as recorded.
- **Every historical value still renders.** `renderableObservedFruitValues` is unchanged in purpose and still spans every value DOS has ever offered.
- **A historical value survives an edit.** `formObservedFruit` now validates against the renderable set rather than the narrowed picker. Previously, opening an old meeting and pressing Save would have deleted any value the picker no longer offered — with the canonical switch that would have silently dropped Gospel Conversation, Testimony Shared, Marriage Restoration and more from real records.
- **The picker shows what it no longer offers.** Anything already recorded appears in a "Recorded earlier" group, selected, so the leader sees it rather than losing it.
- **Testimony validation accepts offered ∪ historical**, so a testimony already submitted still re-validates.
- An unmapped value is classified `unmapped`, rendered as recorded, and counted as nothing. It is never guessed into fruit.

## 6. Still open — founder decisions, unchanged by this PR
1. **Schema (Phase C §7.4).** Everything here is read-time. The additive columns (`canonical_key`, `original_value`, `context`) plus a backfill would make provenance queryable in SQL and let reports run server-side. Not needed for correctness; recommended before aggregate reporting is built.
2. **Materializing recipient-reported fruit as `fruit_events` rows (§7.3).** Not done. Recipient tags stay on the review/testimony row and are read into the one model at read time, which is the reversible half of the recommendation.
3. **Legacy cleanup (§7.5)** — merging the 4 `participant_reviews` rows and deleting the 8 orphan `fruit_events`. **Not executed**: production data mutation.
4. **"I felt closer to God" (§7.2).** Implemented as the documented recommendation: **impact, not fruit**. It is a feeling rather than an event, stays visible on the review, and stays out of fruit counts. Moving it is a one-line change in the alias table.

Aggregate fruit reporting is deliberately **not** started; the guardrail in the issue holds until the vocabulary is approved.

## 7. Form cleanup — verified on this branch
Delivered by B1/B2 (#113, #114) and re-checked here: no baby-blue containers on Quick Review, Testimony or Review Options; every user-facing "Table" reads "meeting" except Kitchen Table Gospel; the secure link identifies the recipient and the bound Testimony flow asks for no name or email (a single name field only when a link carries no recipient — none does); Quick Review is still four chips; Testimony keeps its open narrative; sharing consent is still an explicit three-way choice defaulting to private. Guarded by `dos-recipient-forms-regression.mjs`.

## 8. Verification
`typecheck` ✓ · `test:dos` 46 scripts ✓ (new `test:dos-fruit-vocabulary`) · `build` ✓ · `smoke` ✓ · `test:dos:visual` 16/16 with one intended re-record ✓ · a11y/responsive sweep, no overflow ✓ · `test:usa-168-person-ui` ✓ · `scan:dos-dead-code` ✓ (839 declared, 28 reference-only — unchanged). Screenshots at 390px in `screenshots/foundation/`.

## 9. Rollback
Revert the squash. The vocabulary module is pure and read-time, so reverting restores the previous rendering without touching a single row.
