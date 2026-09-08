# USA-243 Phase B1 — Kitchen Table Gospel keeps no outcome capture of its own

Settled decision 2 (USA-243) and Ryan's Phase B instruction. Branch off `main` dbd7661. No schema, API or data change.

## What changed
- `significantOutcomes` (the flat nine-item picker added by USA-238's second review) is now `historicalOnly` in the engine, exactly like the five earlier outcome groups: the Log Meeting form never offers it, saved values keep normalizing through edits (`normalizeConversationResponses` still iterates historical questions) and meeting detail still renders them with their labels. Nothing was deleted from the definition; no saved record changes (production had none).
- The collapsed row now reads **Kitchen Table Gospel Responses** / **Questions, spiritual gifts, and relationship rating** / status. The "ministry outcomes" wording was removed with the picker.
- The meeting's **Observed Fruit** disclosure (From this meeting → + Observed Fruit, "What fruit became evident in this interaction?") is unchanged and remains the one leader-facing fruit entry point on every logged meeting (Log and Edit; scheduled meetings show it once they are logged).
- Spec §5.3 updated; `scripts/dos-log-meeting-form-regression.mjs` now asserts: no outcome picker in the form, only the conditional gift groups are offered multi-selects, the row description, Observed Fruit present on Log and Edit, and historical `significantOutcomes` values still normalize. The `mobile--log-meeting` baseline is re-recorded for the description line only.

## 390px evidence (local production build, pinned clock)
| File | Shows |
| --- | --- |
| `screenshots/b1/mobile-390--01-row-collapsed-new-description.png` | Collapsed row with the new description. |
| `screenshots/b1/mobile-390--02-rating-then-no-outcomes-row.png` | Opened row ends with the relationship rating; no outcomes row. |
| `screenshots/b1/mobile-390--03-observed-fruit-entry-point.png`, `03b-observed-fruit-open.png` | The universal Observed Fruit entry point below Meeting Notes, collapsed and opened. |
| `screenshots/b1/mobile-390--04-detail-historical-outcomes-still-render.png` | A saved meeting with historical significant outcomes still renders them under "Significant outcomes", below the separate "Fruit observed". |

Runtime checks: form labels in order end at "Rate your relationship with Jesus"; "Add significant outcomes" count in form = 0; Observed Fruit prompt present; detail renders historical outcomes and Fruit observed.

## Verification
`npm run typecheck` ✓ · `npm run test:dos` ✓ (43) · `npm run build` ✓ · `npm run smoke` ✓ · `npm run test:dos:visual` (1 intended scene re-recorded, then 16/16) ✓ · a11y sweep ✓ · `npm run test:usa-168-person-ui` ✓.
