# USA-243 Phase A — Fruit evidence inventory and canonical mapping (no mutation)

Read-only audit of `main` `dbd7661` (application `0dcf304`) and production (read-only SQL, 2026-09-08). Nothing was written, migrated or reinterpreted. Every count below is an aggregate; no personal data is reproduced.

## 1. Where fruit-like values are captured, stored, normalized and shown

| # | Surface (who) | Capture UI | Storage | Server normalization | Rendered by | Feeds |
| --- | --- | --- | --- | --- | --- | --- |
| A | **Observed Fruit** (leader) — Log Meeting → From this meeting → "+ Observed Fruit" (`MeetingLeaderReflectionSection` → `ObservedFruitMultiSelect`, prompt "What fruit became evident in this interaction?") | 8 offered values in 4 groups (`meetingObservedFruitCategories`): New Believers, Baptized · Answered Prayer, Reconciliation, Marriage Restoration · Testimony Shared · Gospel Conversation, Serving | `meeting_reflections.observed_fruit` (jsonb array of display labels; one reflection per meeting, replaced on edit) | `app/api/dos/app/reflections/route.ts` keeps only values in `dosAppOutcomeTags` (31 labels) | Meeting detail "Fruit observed" (filtered through `renderableObservedFruitValues`, i.e. every value ever offered), Person fruit summary, dashboard "Recent Fruit", Fruit app stories | `syncFruitEventsForReflection` upserts one `fruit_events` row per value (`source_type=leader_reflection`, `generated_by=leader_review`, `confidence_level=observed`, `visibility=private`, `status=submitted`, unique `generation_key`) and deletes stale ones |
| B | **Kitchen Table Gospel Responses** (leader, USAM only) — "Add significant outcomes" row (USA-238) | 9 flat values (`significantOutcomes`); 5 historical groups (`historicalOnly`) | `missionary_tables.conversation_responses` (jsonb) | `normalizeConversationResponses` (engine) | Meeting detail "Kitchen Table Gospel Responses" only | Nothing — by design never touches Fruit |
| C | **Quick Review** (recipient, secure link) — `/dos/review/[token]` (`DosQuickReviewForm`; `/review/[token]` is an alias page) | "How was it?" (5 ratings) · "Did any of this happen?" 4 chips: I felt closer to God, Someone prayed with me, I decided to follow Jesus, I want to keep growing · free text · "I'd like someone to follow up with me" · first/last name only when the link has no recipient or the person taps "Not you?" | `dos_meeting_reviews` (overall_rating, outcome_tags, stood_out, wants_follow_up, step_toward_jesus, submitted name/email, `share_permission` always `private`, `response_details` jsonb, `fruit_item_id` never set) | `normalizeQuickReviewSubmission`; tags validated against the 10-value historical list (`dosQuickReviewOutcomeOptions`) | Fruit app "Reviews" list, dashboard "Recent Reviews", meeting detail "Review received" | No fruit event (the old "Follow Up Engagement" inference is not called anywhere; `dos-fruit-guard` forbids passive inference) |
| D | **Testimony Review** (recipient, secure link) — `/dos/testimony/[token]` (`DosTestimonyForm`; `/testimony/[token]` is an alias) | Your name · Email address · What happened? (required) · What changed? · Did you take a next step? · "What fruit did you notice?" 7 checkboxes (`dosReviewOutcomeOptions`: Reconciliation, New Believers, Marriage Restoration, Baptized, Discipling, Started Discipling Others, Answered Prayer) · "May we share this testimony?" (anonymous / with name / private) · public display name when "with name" | `participant_testimonies` (story, what_changed, decision_made, next_step, outcome_tags, permission_to_share, public_display_name, submitted name/email) | `normalizeTestimonySubmission` | Fruit app stories (text-matched, see §5), Reviews list | No fruit event ("should not become Fruit until a missionary confirms" — no confirm path exists) |
| E | **Review Options** (recipient) — `/dos/review-options/[token]` chooses C or D | — | same as C/D | — | — | — |
| F | **Record Fruit** (leader, manual) — Fruit app / Person "Add observed fruit" → `POST /api/dos/app/fruit` | summary + `outcome_tags` from `dosAppOutcomeTags` | `missionary_fruit_items` (status `draft`, `permission_to_share=false`, `source_app=record_fruit`, `cc_status=draft`) | tags validated against `dosAppOutcomeTags` | Fruit app stories (approved only), My Record "Fruit Observed" metric, admin fruit-reviews approval, public profile after approval | `dos_circle_scoring` fruit score reads **only this table** |
| G | Legacy leader "Table review" — none in UI | — | `missionary_table_reviews` | — | — | 0 rows, no writer |
| H | Legacy `meetings.outcome_markers` (pre-DOS) | — | `meetings` table | — | **no reader in the codebase** | 7 rows, dead |
| I | Missionary profile "Fruit from the field" (public site) | admin/intake text | `missionary_households.fruit_from_field`, `show_fruit` | — | public profile | outside DOS |

Classification engine already in the client: `fruitOutcomeConfig` (24 keys with alias lists, `sources`, `group`) drives the Fruit app "Impact" groups and story tags via `fruitOutcomesFromValues`, which **text-matches aliases inside free text** (testimony story / what changed / next step, fruit descriptions). That is silent inference from narrative and is flagged for removal in the canonical model (USA-243: "Do not infer spiritual fruit from free text").

## 2. Production values (read-only, 2026-09-08)
| Store | Rows | Values (count) |
| --- | --- | --- |
| `meeting_reflections.observed_fruit` | 42 reflections, 17 with fruit | Prayer Received 10 · Discipling 4 · Testimony Shared 4 · Felt encouraged 4 · Reconciliation 2 · Started Discipling Others 2 · Serving 1 · Gospel Conversation 1 |
| `fruit_events` | 41 (all `leader_reflection` / `leader_review` / `observed` / `private` / `submitted`) | Prayer Received 11 · Prayer Request 8 · Felt encouraged 6 · Testimony Shared 4 · Discipling 4 · Reconciliation 2 · Answered Prayer 2 · Started Discipling Others 2 · Gospel Conversation 1 · Serving 1. **8 orphans** whose reflection no longer exists (Prayer Request 3, Answered Prayer 2, Felt encouraged 2, Prayer Received 1; all with `meeting_id` null). 4 (meeting, type) pairs duplicated (Answered Prayer, Felt encouraged, Prayer Request, Testimony Shared). **None is `approved`**, so the Fruit app's story list and the Person "latest fruit" (approved-only) show nothing from them today. |
| `dos_meeting_reviews` | 5 (all quick_review, submitted, `share_permission=private`) | Felt encouraged 4 · Discipling 3 · Closer to God 3 · Prayer Received 3 · Peace 2 · Hope 1 · Reconciliation 1; overall_rating very_meaningful 4, life_changing 1; step_toward_jesus yes 4; 3 carry a submitted email |
| `participant_reviews` (legacy) | 4 | same tag mix — the loader concatenates canonical + legacy rows **without de-duplication** |
| `participant_testimonies` | 0 | — (1 testimony link pending, 1 opened) |
| `missionary_fruit_items` | 0 | — (so circle `fruit_score` is always 0 and My Record "Fruit Observed" is 0) |
| `missionary_tables.conversation_responses` | 0 with content | — (no Kitchen Table outcome has ever been saved) |
| `dos_review_links` | 13 (quick_review 10, testimony_review 2, review_options 1) | every link has `recipient_person_id` and `reviewer_person_id` set; **none has `expires_at`** (the 30-day expiry is only applied to links created by the current code) |
| `meetings.outcome_markers` (legacy) | 7 | gospel_conversation 3, breakthrough_moment, testimony_shared, wants_to_meet_again, follow_up_needed, interested_discipleship |
| Cross-source overlap | | 4 of 5 reviews sit on meetings that also have leader fruit events; the same tag appears in both the review and the leader's observed fruit for Prayer Received (2) and Discipling (1) — counted twice today |

## 3. Classification of every existing value

Classes: **activity** (ministry activity), **milestone** (objective, datable), **leader-observed fruit**, **recipient-reported fruit**, **narrative/evidence**, **follow-up/next step**, **impact** (how it felt; neither activity nor fruit).

### 3a. Leader Observed Fruit — offered today
| Value | Class | Canonical target (§6) |
| --- | --- | --- |
| New Believers | leader-observed fruit | New believer |
| Baptized | milestone (leader-observed) | Baptized |
| Answered Prayer | leader-observed fruit | Answered prayer |
| Reconciliation | leader-observed fruit | Reconciliation / relationship restored |
| Marriage Restoration | leader-observed fruit (subtype) | Reconciliation / relationship restored · context: marriage |
| Testimony Shared | **activity / evidence** (a story was told) | activity — keep as evidence, not fruit |
| Gospel Conversation | **activity** | activity |
| Serving | leader-observed fruit | Serving or mission engagement |

### 3b. Historical leader values still in data or in the server allow-list
| Value | Class | Target |
| --- | --- | --- |
| Prayer Received (10 refl / 11 events) | activity | activity |
| Prayer Request (8 events) | follow-up | follow-up (already canonical Prayer request) |
| Felt encouraged (4 / 6) | impact | impact — alias of Quick Review "Felt encouraged"; not fruit |
| Discipling (4 / 4) | relationship stage / activity | activity (stage lives on the Person; USA-235 moved multiplication to Accountability) |
| Started Discipling Others (2 / 2) | leader-observed fruit | Began discipling others |
| Joined Discipleship, Church Connection, Joined Church, Church Visit | milestone / fruit | Connected to church or Christian community (Church Visit → activity) |
| Bible Study Started | activity → growth | Discipleship growth (context: Bible study) |
| Disciple Maker | status (Person stage), not an event | deprecate as fruit value; keep readable |
| Salvation, New Believer | leader-observed fruit | New believer (aliases) |
| Re Dedication, Rededication, Repentance | leader-observed fruit | Rededication (Repentance → context) |
| Baptism | milestone | Baptized |
| Shared Testimony | activity | activity (alias of Testimony Shared) |
| Marketplace Ministry | activity / mission engagement | Serving or mission engagement (context: marketplace) |
| Freedom / Deliverance, Healing, Deliverance (legacy) | fruit | Healing or freedom |
| Ongoing Accountability | activity (now an Accountability record) | activity |
| Prayer Answered (legacy) | fruit | Answered prayer |
| Discipleship (legacy) | growth | Discipleship growth |
| Other (legacy) | narrative | narrative |

### 3c. Quick Review
| Value | Class | Target |
| --- | --- | --- |
| How was it? (life_changing … not_very_helpful) | impact rating | stays an impact rating, never fruit |
| I felt closer to God (`Closer to God`, 3) | recipient-reported growth | **candidate** Discipleship growth (recipient-reported) — needs Ryan's approval |
| Someone prayed with me (`Prayer Received`, 3) | activity evidence | activity |
| I decided to follow Jesus (`New Believers`) | recipient-reported fruit | New believer (recipient-reported) |
| I want to keep growing (`Discipling`, 3) | intent / follow-up | follow-up (wants discipleship); not fruit |
| Felt encouraged (4), Hope (1), Peace (2) — historical | impact | impact |
| Reconciliation (1) — historical | recipient-reported fruit | Reconciliation / relationship restored |
| Follow Up Requested — historical | follow-up | follow-up (now the explicit `wants_follow_up`) |
| Other — historical | narrative | narrative |
| "Anything you'd like us to know?" | narrative | narrative |
| I'd like someone to follow up with me | follow-up | follow-up |

### 3d. Testimony Review
| Value | Class | Target |
| --- | --- | --- |
| What happened? / What changed? | narrative/evidence | narrative |
| Did you take a next step? (`next_step`), `decision_made` | milestone / follow-up (free text) | follow-up; never auto-classified |
| Reconciliation, New Believers, Marriage Restoration, Baptized, Started Discipling Others, Answered Prayer | recipient-reported fruit | same canonical targets as 3a |
| Discipling | intent | follow-up / growth context |
| May we share this testimony? | consent | consent (kept explicit) |

### 3e. Kitchen Table Gospel (USAM)
| Value | Class | Target |
| --- | --- | --- |
| Decision for Christ | leader-observed fruit | New believer |
| Rededication | leader-observed fruit | Rededication |
| Baptism next step | follow-up | follow-up |
| Baptism in the Holy Spirit | milestone | Baptized in the Holy Spirit |
| Connected to a church or ministry | milestone | Connected to church or Christian community |
| Discipleship next step | follow-up | follow-up |
| Healing or breakthrough | leader-observed fruit | Healing or freedom |
| Relationship restored | leader-observed fruit | Reconciliation / relationship restored |
| Other significant outcome | narrative | narrative |
| Historical groups (Communion, Washing of Feet, Prophetic/Healing/Deliverance Prayer, Prayer Ministry Took Place, Connected to Church/Ministry Partner, First Time Decision, Desire to be Baptized, Committed to Fasting/Tithe, Inner/Emotional/Physical Healing, Addiction Freedom, Financial/Forgiveness/Identity Breakthrough, Marriage Reconciliation, Relationship Restored/Connection…) | activities (prayer types, communion, foot washing), follow-ups (desire/committed), fruit (healings, breakthroughs, reconciliation, first-time decision), milestones (connected) | mapped per row in §6; all stay readable; **Decision 2: no new Kitchen Table outcome capture** — the whole row is removed for new capture in Phase B |

## 4. Secure-link binding (proven from code and data)
- **Creation** (`createDosReviewRequestLink`): the leader picks a recipient who must be a meeting participant (`field_person_ids` or ministry-event participants); the link stores `workspace_id`, `meeting_id`, `recipient_person_id` (= `reviewer_person_id`), `sender_person_id`, `created_by_user_id`, `review_type` (quick_review / testimony_review / review_options; legacy `review`, `quick_check_in`, `testimony` still load), `expires_at` = now + 30 days, `status=pending`, token = 24 random bytes base64url. An unused, unexpired link for the same meeting/recipient/type is reused.
- **Load** (`loadDosReviewLink` / `loadDosTestimonyLink`): validates the token, refuses submitted/expired links, marks `opened`, and returns only: sender display name (quick review), meeting date/type, recipient name and email, workspace display name, ids. Nothing else about the meeting crosses the token boundary.
- **Submit**: re-reads the link by token, refuses expired (410) and already-used (409), requires a bound recipient (409 "missing a Table recipient"), single-use claim with stale-claim recovery (quick review), writes `person_id`/`reviewer_person_id` from the link — **never from the form**. Submitted name/email are stored only as free-text confirmation.
- **Consequence**: every production link (13/13) is recipient-bound; the Quick Review already hides the name inputs behind "You're answering as … · Not you?"; the Testimony form still asks "Your name" and "Email address" unconditionally although the server ignores them for identity. They are redundant for the bound flow. There is **no genuinely unbound/public testimony route**: `/testimony/[token]` and `/review/[token]` re-export the token-bound DOS pages; the older `app/testimony/[token]/TestimonyForm.tsx` has no importer (dead file, listed for a later cleanup manifest).
- Robots: both pages are `noindex, nofollow`.

## 5. Privacy, consent, duplicates, corroboration — current behavior
- Quick Review never asks for share consent; rows are written `share_permission=private`. Testimony asks explicitly (anonymous / with my name / private); `permission_to_share` = not private; `public_display_name` only with "with name". Recorded Fruit defaults to `permission_to_share=false` and needs admin approval plus `missionary_public_approved` before the public profile shows it. Fruit events default `visibility=private`.
- Duplicates: `fruit_events.generation_key` (source, source id, person, type) prevents duplicates **within one reflection**, but a replaced reflection strands its events (8 orphans) and the same meeting can carry the same type twice (4 pairs). Quick Review and leader entries for the same meeting are independent rows; today the Fruit app's Impact counts would count a review's "Prayer Received" and the leader's "Prayer Received" as two.
- Corroboration: nothing links a review or testimony tag to a leader observation (`dos_meeting_reviews.fruit_item_id` is never set; testimony tags are never confirmed).
- Free-text inference: `fruitOutcomesFromValues` derives Impact tags by matching alias phrases in narrative fields (testimony story/what changed/next step, fruit description). It is deterministic, but it is inference from prose.
- Reporting today: no aggregate report exists (Reports app is "coming soon"); the consumers are the dashboard "Recent Fruit"/"Recent Reviews", the Fruit app (Impact groups + approved stories + Reviews), Person summary (latest approved fruit, multiplication status by text match), My Record "Fruit Observed" (counts `missionary_fruit_items` = 0), circle `fruit_score` (from `missionary_fruit_items` = 0).

## 6. Proposed canonical vocabulary and mapping (for Ryan's approval in Phase C)
Canonical fruit (short, ministry-agnostic; Ryan's foundation), each with provenance `leader_observed | recipient_reported | system_evidenced | historical`:

| Key | Label | Group | Maps from (retain = same meaning; alias = renamed; context = kept as subtype note) |
| --- | --- | --- | --- |
| `new_believer` | New believer | Spiritual response | New Believers, New Believer, Salvation, Decision for Christ, First Time Decision for Christ (KT), Quick Review "I decided to follow Jesus" (recipient) |
| `rededication` | Rededication | Spiritual response | Rededication, Re Dedication, Repentance (context) |
| `baptized` | Baptized | Spiritual response (milestone) | Baptized, Baptism; **not** "Baptism next step" / "Desire to be Baptized" (follow-up) |
| `baptized_holy_spirit` | Baptized in the Holy Spirit | Spiritual response | Baptism in the Holy Spirit (KT) |
| `answered_prayer` | Answered prayer | Prayer & restoration | Answered Prayer, Prayer Answered |
| `healing_or_freedom` | Healing or freedom | Prayer & restoration | Healing, Deliverance, Freedom / Deliverance, Healing or breakthrough (KT), KT healing/breakthrough groups (context: inner/emotional/physical/addiction/financial/forgiveness/identity) |
| `reconciliation` | Reconciliation / relationship restored | Prayer & restoration | Reconciliation, Relationship restored, Marriage Restoration (context: marriage), Marriage Reconciliation (KT), Relationship Connection (KT, context) |
| `discipleship_growth` | Discipleship growth | Growth & discipleship | Discipleship (legacy), Bible Study Started (context), Quick Review "I felt closer to God" (recipient — **pending approval**) |
| `began_discipling_others` | Began discipling others | Growth & discipleship | Started Discipling Others, Disciple Maker (deprecate as event) |
| `connected_to_community` | Connected to church or Christian community | Community & mission | Joined Discipleship, Church Connection, Joined Church, Connected to a church or ministry (KT), Connected to Church/Ministry Partner (KT), Desire to Join Discipleship Group (KT → follow-up) |
| `serving_or_mission` | Serving or mission engagement | Community & mission | Serving, Marketplace Ministry (context) |

**Activities (never fruit):** Gospel Conversation, Prayer Received / "Someone prayed with me", Prayer Ministry Took Place, Communion, Washing of Feet, Prophetic/Healing/Deliverance Prayer, Church Visit, Ongoing Accountability, Discipling, Shared Testimony / Testimony Shared (evidence that a testimony exists).
**Impact (how it felt):** Felt encouraged, Hope, Peace, "How was it?" ratings, Transformational / Challenging / Still processing / Not sure yet / Life giving.
**Follow-up / next step:** Prayer Request, Follow Up Requested / wants_follow_up, "I want to keep growing", Baptism next step, Discipleship next step, Committed to Fasting/Tithe, testimony `next_step`/`decision_made` (free text).
**Narrative:** review free text, testimony story / what changed, "Other".

Nothing is renamed or discarded in storage: original values stay in `observed_fruit`, `fruit_type`, `outcome_tags` and `conversation_responses`; the canonical key is derived by a static alias table (no free-text matching) and the original value is kept beside it.

## 7. Smallest backward-compatible implementation (proposal; Phase C gate before any schema work)
1. **Vocabulary module** `src/lib/dos/fruit-vocabulary.ts`: canonical keys/labels/groups and an explicit alias table (§6) with `classify(value) → { kind: fruit|activity|impact|follow_up|narrative, key?, context? }`; replaces `fruitOutcomeConfig`'s prose matching for classification. No storage change.
2. **Leader Observed Fruit** offers the 11 canonical labels (stored as labels in `observed_fruit`/`fruit_type` exactly as today), one collapsed disclosure with an optional note (`meeting_reflections.what_happened` already exists for context; no new column).
3. **Provenance at read time**: `fruit_events` rows = leader-observed; `dos_meeting_reviews.outcome_tags` and `participant_testimonies.outcome_tags` = recipient-reported; Kitchen Table historical outcomes = historical. A read-time model `fruitAssertions(meeting)` groups by (meeting, person, canonical key) → one assertion with N supporting sources, so counts distinguish unique fruit from corroborating evidence without writing anything.
4. **Only later, with approval (schema)**: `fruit_events.canonical_key` + `original_value`, recipient-reported events (`source_type participant_review|testimony`, `generated_by quick_review|testimony_review` already typed), `dos_meeting_reviews.fruit_item_id` → `fruit_event_id` link, expiry backfill for the 13 unexpired links, cleanup of the 8 orphan events, legacy `participant_reviews` merge, `meetings.outcome_markers` archive.

## 8. Phase B — settled non-schema PRs (from USA-243 and Ryan's instruction)
- **B1** Remove the new Kitchen Table "Add significant outcomes" capture; keep questions, conditional gifts, rating; historical outcomes still normalize and render; Observed Fruit stays the one entry point on every meeting (Log and Edit).
- **B2** Quick Review, Testimony, Review Options, and the leader-side send sheet / previews: white canonical surfaces (no `#F8FBFF` page ground, `#DCEBFF` cards or blue pill context), "Table" → "Meeting" (form-config descriptions and helper, review-options copy, send-sheet labels, fruit form cards, error strings), remove the redundant name/email inputs from the bound Testimony flow (binding proven in §4; keep the Quick Review "Not you?" affordance), keep the three explicit sharing choices, keep "Someone prayed with me" as an activity label. No vocabulary change yet.
- Out of Phase B scope, listed for Ryan: other "Table" wording in DOS (Prayer "Related Table"/"Open Table", "Table Follow-Up", "Table saved successfully", Library "Table Teachings", "Table Flow"), the dead `app/testimony/[token]/TestimonyForm.tsx`, the un-deduplicated legacy `participant_reviews` display.

## 9. Phase C — the founder decision package (prepared after B lands)
Final vocabulary (§6), every legacy→canonical mapping (§3/§6), the activity list, storage of leader vs recipient evidence (§7.3–7.4), double-count rule (one assertion per meeting+person+key; sources counted as evidence), privacy implications (recipient tags become countable fruit only with provenance shown; share consent unchanged), exact schema/API impact (§7.4) and rollback.
