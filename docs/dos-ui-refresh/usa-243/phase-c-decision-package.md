# USA-243 Phase C — founder decision package (the one gate before shared-model or schema work)

Everything below is a proposal. Nothing in it has been implemented; Phases A (inventory) and B (non-schema cleanup) are done and merged. Approving this package unlocks the bounded PRs in §8; rejecting or amending any row changes only that row.

## 1. Proposed final universal fruit vocabulary (11 labels, 4 groups)
| Key | Label | Group |
| --- | --- | --- |
| `new_believer` | New believer | Spiritual response |
| `rededication` | Rededication | Spiritual response |
| `baptized` | Baptized | Spiritual response |
| `baptized_holy_spirit` | Baptized in the Holy Spirit | Spiritual response |
| `answered_prayer` | Answered prayer | Prayer and restoration |
| `healing_or_freedom` | Healing or freedom | Prayer and restoration |
| `reconciliation` | Reconciliation / relationship restored | Prayer and restoration |
| `discipleship_growth` | Discipleship growth | Growth and discipleship |
| `began_discipling_others` | Began discipling others | Growth and discipleship |
| `connected_to_community` | Connected to church or Christian community | Community and mission |
| `serving_or_mission` | Serving or mission engagement | Community and mission |

Detail lives in an optional **context** note on the assertion (e.g. reconciliation · marriage; healing · addiction freedom), never as extra top-level labels.

## 2. Every legacy → canonical mapping
| Existing value (source) | Disposition | Canonical / class |
| --- | --- | --- |
| New Believers, New Believer, Salvation (leader), Decision for Christ / First Time Decision for Christ (Kitchen Table), "I decided to follow Jesus" = `New Believers` (Quick Review) | alias | `new_believer` (recipient-reported when from a review/testimony) |
| Rededication, Re Dedication; Repentance | alias; context | `rededication` |
| Baptized, Baptism | alias | `baptized` |
| Baptism in the Holy Spirit (KT) | alias | `baptized_holy_spirit` |
| Answered Prayer, Prayer Answered | alias | `answered_prayer` |
| Healing, Deliverance, Freedom / Deliverance, Healing or breakthrough (KT), KT healing/breakthrough groups | alias; context = subtype | `healing_or_freedom` |
| Reconciliation, Relationship restored, Marriage Restoration, Marriage Reconciliation (KT), Relationship Connection (KT) | alias; Marriage → context | `reconciliation` |
| Discipleship (legacy), Bible Study Started | alias; context | `discipleship_growth` |
| **"I felt closer to God"** = `Closer to God` (Quick Review, 3 in production) | **decide**: recipient-reported `discipleship_growth`, or keep as impact only | your call — §7 |
| Started Discipling Others; Disciple Maker | alias; Disciple Maker deprecated as an event (it is a Person stage) | `began_discipling_others` |
| Joined Discipleship, Church Connection, Joined Church, Connected to a church or ministry / Church Partner / Ministry Partner (KT) | alias | `connected_to_community` |
| Serving, Marketplace Ministry | alias; context | `serving_or_mission` |
| Gospel Conversation, Prayer Received / "Someone prayed with me", Prayer Ministry Took Place, Communion, Washing of Feet, Prophetic / Healing / Deliverance Prayer, Church Visit, Ongoing Accountability, Discipling, Testimony Shared / Shared Testimony | **activity** (evidence of ministry, never fruit) | — |
| Felt encouraged, Hope, Peace, "How was it?" ratings, Transformational, Challenging in a good way, Still processing, Not sure yet, Life giving | **impact** (how it felt) | — |
| Prayer Request, Follow Up Requested / `wants_follow_up`, "I want to keep growing" (`Discipling` from Quick Review), Baptism next step, Discipleship next step, Desire to be Baptized, Desire to Join Discipleship Group, Committed to Fasting / Tithe, testimony `next_step` / `decision_made` | **follow-up / next step** | — |
| Review free text, testimony story / what changed, Other, Other significant outcome | **narrative** | — |
| `meetings.outcome_markers` (legacy table, 7 rows, no reader) | archive as historical; not mapped into reporting | — |

No stored value is rewritten. The canonical key is derived from a static alias table; the original value stays beside it.

## 3. What remains activity rather than fruit
Gospel conversations, prayer received / prayer ministry, communion, foot washing, prophetic / healing / deliverance prayer, church visits, ongoing accountability, "discipling" as a relationship in progress, and a testimony having been shared. These are evidence of ministry and may accompany a fruit assertion as context, but never count as fruit.

## 4. How leader-observed and recipient-reported evidence are stored (smallest change)
- **Leader-observed** stays where it is: `meeting_reflections.observed_fruit` (labels) synced to `fruit_events` (`source_type=leader_reflection`, `generated_by=leader_review`). Proposed additive columns on `fruit_events`: `canonical_key text`, `original_value text`, `context text` (nullable; backfilled from the alias table; original value preserved).
- **Recipient-reported** stays in `dos_meeting_reviews.outcome_tags` and `participant_testimonies.outcome_tags` (raw), and is additionally materialized as `fruit_events` rows with `source_type=participant_review|testimony`, `generated_by=quick_review|testimony_review` (types already exist in code), `confidence_level=confirmed` (recipient's own word), `visibility=private`, `person_id` = the link's recipient. Only canonical-fruit tags materialize; activity/impact/follow-up tags never do.
- **System-evidenced** (a completed DOS milestone such as a logged baptism date) is reserved for later; no schema now.
- **Historical / legacy** Kitchen Table outcomes stay in `conversation_responses` and are read-mapped only.
- Provenance kept on every assertion: person, meeting/request, occurred/reported timestamp, source, canonical key, original value, context/narrative pointer, share consent (from the review/testimony row), created-by.

## 5. How two sources supporting the same fruit avoid double-counting
One **assertion** = (workspace, person, canonical key, meeting) — or (workspace, person, canonical key, 30-day window) when no meeting is linked. Every `fruit_events` row that maps to the same assertion is a **supporting observation**. Reports count assertions, and separately count supporting observations by source. Rules are deterministic and reviewable: no text matching, no merging across different people or keys, no automatic merging of ambiguous records — a leader can unlink a wrongly grouped row from the Fruit app (`fruit_events.status` already carries `hidden`). Today's example: the review "Prayer Received" and the leader's "Prayer Received" on one meeting are both **activity**, so they never become assertions; a review "Reconciliation" plus a leader "Reconciliation" on one meeting become one assertion with two observations (leader + recipient).

## 6. Privacy implications
- Recipient tags become countable fruit only with provenance shown ("reported by the person") and remain `visibility=private` by default; share consent is unchanged and still governs stories, not counts.
- Quick Review still records `share_permission=private` (it asks no consent); nothing from a review is ever public.
- Testimony narrative is never classified by text; only the explicit "What fruit did you notice?" chips materialize.
- The public profile's approved `missionary_fruit_items` path is untouched.
- Aggregates never expose names; per-person views keep the existing workspace permissions and RLS.

## 7. Decisions that need your judgment
1. Approve the 11-label vocabulary and the mapping table (§1–§2), or amend rows.
2. "I felt closer to God": recipient-reported Discipleship growth, or impact only (recommendation: **impact only** — it is a feeling, not an event; keep it visible on the review, not in fruit counts).
3. Should recipient-reported fruit materialize as `fruit_events` rows (recommended, for one reporting model) or remain review-only until a leader confirms (today's testimony comment says "until a missionary confirms")? Recommendation: materialize with `confidence_level=confirmed` and provenance; confirmation becomes optional corroboration, not a gate.
4. Approve the additive schema (§8) and the historical backfill, or keep everything read-time only (possible, slower, no backfill).
5. Legacy cleanup: merge `participant_reviews` (4 rows) into `dos_meeting_reviews` and delete the 8 orphan `fruit_events`? Recommendation: yes, in the same backfill migration, with a reversible SQL script.

## 8. Exact schema / API impact if approved
- Migration (additive, reversible): `alter table fruit_events add column canonical_key text, add column original_value text, add column context text;` + index on `(meeting_id, person_id, canonical_key)`; backfill `original_value = fruit_type`, `canonical_key` via the alias table; orphan cleanup and `participant_reviews` merge as separate statements; `dos_review_links` backfill of `expires_at` for the 13 legacy links (optional).
- API: `/api/dos/reviews/[token]` and `/api/dos/testimonies/[token]` additionally call `createFruitEvent` for canonical tags only (existing `generatedBy` values); `/api/dos/app/reflections` unchanged; new read helper `fruitAssertions()` in `src/lib/dos/fruit-vocabulary.ts` used by the Fruit app, Person summary and dashboard; `fruitOutcomeConfig` text matching retired.
- UI: Observed Fruit offers the 11 labels with an optional context note; Quick Review keeps its four chips (mapping applied server-side); Testimony's "What fruit did you notice?" offers the same 11 labels.
- Reporting: only after the above lands — one report answering "what fruit is evident" (assertions) and "what evidence supports it" (observations by source).

## 9. Rollback
Every step is reversible: the migration only adds nullable columns and an index (`alter table … drop column`), the backfill writes derived values that can be nulled, the merge/orphan scripts run inside one transaction with a stored copy of the affected rows, the API changes are guarded by the existing `explicitFruitSourceActions` allow-list, and the UI reads through the alias table so reverting the code restores today's rendering without touching data.
