# USA-238 — Kitchen Table responses in Log Meeting (USAM only)

Review of PR #105 against the USA-238 requirements, with the corrections made during review. Screenshots in `screenshots/usa-238/` are 390px mobile captures of a local production build of this branch (`/dos/app/preview`), because the hosted Vercel preview was not reachable from the review session's network.

## What the PR does
- One collapsed, optional **Kitchen Table responses** row sits under "How did you connect?" in Log Meeting and Edit Meeting, only when the workspace is a USAM Missionary Workspace (`allowConversationFlows={data.workspace.isUsamWorkspace}`). The legacy Conversation Flow chooser is gone, so Four Questions is never offered for new capture.
- Opening the row does nothing to the meeting. The flow key becomes `kitchen_table_gospel` only when the first real answer is entered; "Remove Kitchen Table responses" clears it back to `none`.
- The row holds the eleven Kitchen Table questions (Yes / No, Yes / No / Unsure, and the 1–10 "Rate your relationship with Jesus" rating read as 1–3 Cold, 4–7 Lukewarm, 8–10 Hot), three gift groups (Manifestation, Motivational / Service, Fivefold Ministry) that appear only while Spiritual Gifts is Yes, and five collapsed outcome groups (Discipleship & Church Connection, Faith Commitments, Healing & Breakthrough, Relationship Restoration, Ministry Moments).
- Responses are stored through the existing `conversation_responses` JSONB normalization. No migration, no new persistence path, and nothing writes Fruit: outcomes stay raw meeting responses next to the separate "Fruit observed" record.

## Corrections made during review
- **Meeting detail now renders the saved responses.** The PR shipped a `ConversationFlowDetail` helper that nothing rendered, so a logged Kitchen Table meeting showed only the "Kitchen Table Gospel · Hot" badge. `ConversationResponsesSection` replaces it inside `MeetingDetailOverlay` (after "Fruit observed"), in the detail page's own section grammar: answered questions with their answers, the rating with its temperature, gift labels and outcome labels as chips, and for historical Four Questions meetings the notes and follow-up chips.
- **Hidden gift selections are cleared in the form, not just at save.** Changing Spiritual Gifts away from Yes drops the three gift groups' selections immediately, so the collapsed summary count, the payload, and what the leader sees agree. Normalization still strips hidden and invalid values server-side.
- **Editing a historical Four Questions meeting says so.** The row reads "Four Questions on record" and explains that those responses stay unless Kitchen Table responses are added. Saving without touching the row keeps the Four Questions data intact.
- **Regression coverage runs the normalizer for real.** `scripts/dos-log-meeting-form-regression.mjs` now imports `meeting-engine.ts` and asserts that invalid, duplicate, hidden-gift, and out-of-range values are removed, that gifts persist when Spiritual Gifts is Yes, that the temperature bands are right, that a non-USAM flow key normalizes to `none`, and that historical Four Questions responses still normalize. It also checks the detail render and the form's activation and pruning behavior.
- The demo preview fixture's Kitchen Table meeting now carries gifts, outcomes, and a rating so the detail render can be reviewed without a database.

## Known limit (pre-existing, not changed here)
The server-side gate in `app/api/dos/app/meetings/route.ts` passes `/missionaries/<slug>` into `isUsamKitchenTableGospelWorkspace`, which always matches, so the API accepts a `kitchen_table_gospel` flow key from any workspace. The client never sends one outside a USAM workspace (`conversationFlowKey = data.workspace.isUsamWorkspace ? selectedConversationFlow : "none"`), and generic workspaces do not render the row at all. Tightening the server gate means resolving the organization and USAM application on the write path, which is a separate change.

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

## Verification
`npm run typecheck`, `npm run test:dos-log-meeting-form`, `npm run test:dos`, `next build --webpack`, `git diff --check`.
