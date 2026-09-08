# USA-238 — Kitchen Table Gospel Responses in Log Meeting (USAM only)

Review of PR #105 against the USA-238 requirements, with the corrections made during review. Screenshots in `screenshots/usa-238/` are 390px mobile captures of a local production build of this branch (`/dos/app/preview`), because the hosted Vercel preview was not reachable from the review session's network.

## What the PR does
- One collapsed, optional **Kitchen Table Gospel Responses** row sits under "How did you connect?" in Log Meeting and Edit Meeting, only when the workspace is a USAM Missionary Workspace (`allowConversationFlows={data.workspace.isUsamWorkspace}`). The legacy Conversation Flow chooser is gone, so Four Questions is never offered for new capture.
- Opening the row does nothing to the meeting. The flow key becomes `kitchen_table_gospel` only when the first real answer is entered; "Remove Kitchen Table Gospel Responses" clears it back to `none`.
- The row holds the eleven Kitchen Table questions (Yes / No, Yes / No / Unsure, and the 1–10 "Rate your relationship with Jesus" rating read as 1–3 Cold, 4–7 Lukewarm, 8–10 Hot), three gift groups (Manifestation, Motivational / Service, Fivefold Ministry) that appear only while Spiritual Gifts is Yes, and five collapsed outcome groups (Discipleship & Church Connection, Faith Commitments, Healing & Breakthrough, Relationship Restoration, Ministry Moments).
- Responses are stored through the existing `conversation_responses` JSONB normalization. No migration, no new persistence path, and nothing writes Fruit: outcomes stay raw meeting responses next to the separate "Fruit observed" record.

## Corrections made during review
- **Meeting detail now renders the saved responses.** The PR shipped a `ConversationFlowDetail` helper that nothing rendered, so a logged Kitchen Table meeting showed only the "Kitchen Table Gospel · Hot" badge. `ConversationResponsesSection` replaces it inside `MeetingDetailOverlay` (after "Fruit observed"), in the detail page's own section grammar: answered questions with their answers, the rating with its temperature, gift labels and outcome labels as chips, and for historical Four Questions meetings the notes and follow-up chips.
- **Hidden gift selections are cleared in the form, not just at save.** Changing Spiritual Gifts away from Yes drops the three gift groups' selections immediately, so the collapsed summary count, the payload, and what the leader sees agree. Normalization still strips hidden and invalid values server-side.
- **Editing a historical Four Questions meeting says so.** The row reads "Four Questions on record" and explains that those responses stay unless Kitchen Table Gospel Responses are added. Saving without touching the row keeps the Four Questions data intact.
- **Regression coverage runs the normalizer for real.** `scripts/dos-log-meeting-form-regression.mjs` now imports `meeting-engine.ts` and asserts that invalid, duplicate, hidden-gift, and out-of-range values are removed, that gifts persist when Spiritual Gifts is Yes, that the temperature bands are right, that a non-USAM flow key normalizes to `none`, and that historical Four Questions responses still normalize. It also checks the detail render and the form's activation and pruning behavior.
- The demo preview fixture's Kitchen Table meeting now carries gifts, outcomes, and a rating so the detail render can be reviewed without a database.

## Server-side USAM boundary (closed in this PR, USA-239 Phase 2)
The meetings API previously passed `/missionaries/<slug>` into a profile-path heuristic, so it accepted a `kitchen_table_gospel` flow key from any workspace and only the client kept generic workspaces out. That is now enforced at the boundary from actual workspace state:

- `src/lib/dos/usam-workspace.ts` holds one pure decision, `decideUsamWorkspace`: a workspace is USAM when its latest USAM application is **approved or active**, or its **public missionary profile is live**, or its **owning organization** (through its collective) is USA Missionaries. Nothing else — not the slug, and not the loader's display-only USAM-organization fallback, which is now marked `inferred` and ignored for this decision.
- `app/api/dos/app/meetings/route.ts` (POST and PATCH) resolves `isUsamWorkspaceById(supabase, workspaceId)` and rejects a gated flow key with **403 "Kitchen Table Gospel is not available for this workspace."** before writing anything; a generic workspace's responses never reach `conversation_responses`.
- `src/lib/dos/missionary-app.ts` computes `workspace.isUsamWorkspace` with the same decision, so what the client shows and what the server accepts agree.
- The retired heuristic `isUsamKitchenTableGospelWorkspace` is removed from `meeting-engine.ts`.
- Coverage (`scripts/dos-log-meeting-form-regression.mjs`, in `test:dos`): the decision is exercised for active / approved applications, a live profile, a USAM owner organization, another organization's workspace, a pending unowned applicant, an archived workspace and a plain generic workspace; `normalizeConversationFlowKey` returns `none` for both gated flows without access; the route is asserted to gate both handlers from workspace state, never the slug, and to answer 403.
- The route reads workspace state only when the request names a gated flow (`conversationFlowRequiresGate`); an ordinary meeting with flow `none` never pays for the four organization reads. An unknown flow key is still refused, and a read failure is refusal, never access.
- Behavior coverage at the boundary (`scripts/dos-kitchen-table-usam-boundary-behavior.mjs`, `npm run test:dos-kitchen-table-boundary`, in `test:dos`): runs `decideUsamWorkspace`, `loadUsamWorkspaceFacts` / `isUsamWorkspaceById` against fake Supabase rows (generic partner-owned, unowned pending applicant, approved application over a stale household status, USAM-owned, live profile, unreadable household, missing collectives table, unknown workspace) and composes them with the engine exactly as POST and PATCH do. It proves: USAM create and edit succeed with responses intact and hidden gifts pruned; generic and unowned workspaces get 403 for both gated flows and nothing gated survives normalization; historical Four Questions saves unchanged for a USAM workspace and is never offered in the form; `none` saves without any lookup even when the organization rows are unreadable.
- Production check (read-only, 2026-09-07): of the five workspaces, the two real USAM missionary workspaces qualify by active application (one also by live profile) and the preview household by its USA Missionaries owner organization; the archived workspace and an unowned pending-review test applicant become generic. No schema change.

## Founder review corrections (hosted mobile review, 2026-09-07)
- **Row copy.** Every user-facing "Kitchen Table responses" is now **Kitchen Table Gospel Responses** (row title, remove control, historical note, meeting-detail heading). The collapsed row reads title / "Questions, spiritual gifts, and ministry outcomes" / status ("Not added" or "n of 11 answered · m selected"). The sentence "Optional USAM ministry record…" is removed. USAM gating in the product and the API is unchanged.
- **Structure for later guides.** The row is `DiscussionGuideResponsesSection`, driven by the engine's `dosDiscussionGuides` (flows with `offeredForNewCapture`, `rowTitle`, `rowDescription`). Log Meeting renders one row per guide and no chooser; adding a guide is a definition, not a schema change. Four Questions is not a guide. No Journey selector and no one-option dropdown.
- **Spiritual-gift taxonomy** (values are the stored keys; production held no saved gift values on 2026-09-07, so no data mapping was needed — the one relabelled entry keeps its key):

  | Group | Labels (value) |
  | --- | --- |
  | Manifestation Gifts (1 Cor 12:7-11) | Word of Wisdom (`word_of_wisdom`), Word of Knowledge (`word_of_knowledge`), Faith (`faith`), Gifts of Healing (`gifts_of_healing`), Working of Miracles (`working_of_miracles`), Prophecy (`prophecy`), Distinguishing/Discernment of Spirits (`discerning_of_spirits`, relabelled from "Discerning of Spirits"), Various Kinds of Tongues (`various_kinds_of_tongues`), Interpretation of Tongues (`interpretation_of_tongues`), Exploring / Unsure (`exploring_unsure`, new) |
  | Motivational / Service Gifts (Rom 12:6-8) | Prophecy (`prophecy`), Serving (Ministry/Helps) (`serving`), Teaching (`teaching`), Encouragement (Exhortation) (`encouragement`), Giving (`giving`), Leadership (`leadership`), Mercy (`mercy`) — unchanged, confirmed against the established DOS definition |
  | Fivefold Ministry Gifts (Eph 4:11) | Apostle (`apostle`), Prophet (`prophet`), Evangelist (`evangelist`), Pastor (Shepherd) (`pastor`), Teacher (`teacher`) — unchanged, confirmed |

- **Ministry Team search.** Choosing a result adds the person once (a repeat pick is ignored), clears the typed query immediately, keeps the chip, and leaves the field empty for the next name. Keyboard (Enter/Space on a result), touch and mobile all go through the same click handler.
- **Duration control.** The shared `Stepper` is 56px tall in three equal regions with the value and both buttons vertically centered; 15-minute steps and 44px+ targets are unchanged. Checked at 390px for 30 min, 1 hr, 1 hr 15 min and 2 hrs 30 min.
- **Outcomes vs Fruit.** Outcomes are stored in `conversation_responses` with the meeting and rendered in its detail and history. The regression now proves the meetings API and the engine reference no Fruit table, the guide section calls no Fruit setter, and the normalized payload holds only guide question keys. The outcomes section keeps "Capture what happened during this Kitchen Table conversation." to make the distinction from Observed Fruit.
- **Compactness.** Default form unchanged apart from the single row; questions, gift groups and the five outcome groups render only after opening; each group is a collapsed `<details>` with "n selected".
- **Regression coverage added** (`scripts/dos-log-meeting-form-regression.mjs`): exact taxonomy per group; relabelled key stability; every supported gift saves, reopens, edits and is pruned when Spiritual Gifts leaves Yes; detail render maps values to labels; search clearing and duplicate guard; Fruit separation; row copy and absence of a guide picker.

## Evidence
| Screenshot | What it shows |
| --- | --- |
| `mobile-390--04-log-meeting-kitchen-table-collapsed.png` | Default Log Meeting: compact form with the single collapsed row reading "Not added". |
| `mobile-390--04b-log-meeting-gifts-revealed.png` | Spiritual Gifts = Yes reveals the three gift groups; outcome groups stay collapsed. |
| `mobile-390--04c-log-meeting-outcomes-open.png` | One outcome group opened with a selection; the others remain collapsed. |
| `mobile-390--04d-log-meeting-gifts-hidden-after-no.png` | Spiritual Gifts = No hides the gift groups and the summary count drops. |
| `mobile-390--04e-edit-meeting-four-questions-note.png` | Editing a historical Four Questions meeting shows the "on record" note. |
| `mobile-390--10-meeting-detail-kitchen-table-responses.png` | Meeting detail renders the answers, rating, gift chips, and outcome chips. |
| `mobile-390--10b-meeting-detail-four-questions-historical.png` | A historical Four Questions meeting still renders its answers and notes. |
| `review-390--01-log-meeting-row-collapsed.png` | Founder-review build: the row reads "Kitchen Table Gospel Responses" / "Questions, spiritual gifts, and ministry outcomes" / "Not added"; the form stays compact. |
| `review-390--02-duration-2hrs30min.png` | The 56px Stepper with three equal regions, value and buttons centered ("2 hrs 30 min"). |
| `review-390--03-ministry-search-cleared.png` | After picking two ministry team results the chips stay and the search field is empty and focused. |
| `review-390--04-row-open.png` | Opening the row reveals the questions; no explanatory paragraph. |
| `review-390--05-manifestation-taxonomy.png` | Manifestation Gifts tail: "Distinguishing/Discernment of Spirits" and "Exploring / Unsure". |
| `review-390--06-service-and-fivefold.png` | Motivational / Service and Fivefold lists. |
| `review-390--07-outcomes-collapsed.png` | Five outcome groups collapsed with counts; "Remove Kitchen Table Gospel Responses". |
| `review-390--08-gifts-hidden-after-no.png` | Spiritual Gifts = No hides the groups; status reads "1 of 11 answered". |
| `review-390--09-meeting-detail-heading.png` | Meeting detail heading "Kitchen Table Gospel Responses" below the separate "Fruit observed". |

## Verification
`npm run typecheck`, `npm run test:dos-log-meeting-form`, `npm run test:dos`, `next build --webpack`, `git diff --check`.
