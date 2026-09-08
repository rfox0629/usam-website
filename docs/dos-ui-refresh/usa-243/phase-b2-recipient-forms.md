# USA-243 Phase B2 — Quick Review, Testimony and Review Options on the canonical white form system

Settled USA-243 decisions ("Quick Review corrections", "Testimony corrections") and Ryan's Phase B instruction. Branch off `main` cfb1b99. No schema, API-contract, vocabulary or data change.

## What changed
- **Testimony form** (`app/dos/testimony/[token]/DosTestimonyForm.tsx`) is rebuilt on the same white surface, hairline rules, eyebrow question labels, chips and DOS-blue action the Quick Review already uses. Because the secure link binds the recipient, person, meeting and request (Phase A §4 — 13/13 production links), it **no longer asks for a name or email**; it shows "You're sharing as {name}" and posts the bound name only as confirmation. The one fallback — a single "Your name" field — appears only when a link carries no recipient (none does today), and the server still never takes identity from the form. The three sharing choices (Yes, anonymously / Yes, with my name included / No, keep it private) stay explicit, default to private, and named sharing is never inferred; the display-name field appears only for named sharing. "What happened?" stays required; "What changed?", the next step and "What fruit did you notice?" (same seven options as before; vocabulary changes wait for Phase C) stay optional.
- **Review Options** chooser and the **state pages** (already submitted / expired / unavailable) use the same white card and wording.
- **"Table" → "meeting"** on every user-facing recipient and leader-side string in this flow: the testimony definition ("after a saved meeting", "Who is sharing" notice instead of name/email fields), the Review Options copy, the send sheet's descriptions, "Meeting" detail label and helper, the Fruit app form cards, and the three server error strings ("missing a meeting recipient", "Select a recipient from this meeting"). Kitchen Table Gospel keeps its name.
- **Leader-side send sheet and previews** drop the baby-blue panels (`#F8FBFF` / `#DCEBFF`): recipient and request-type card, recipient select, helper line, "Preview questions" card and the Fruit app preview sheet are white with hairline borders; blue is used only for actions and selected states.
- **Demo gallery** (`/dos/app/preview?demo=dos2026&gallery=recipient-forms&form=testimony|testimony-unbound|quick-review|review-options`): the recipient forms with a synthetic bound link, so they can be reviewed and screenshotted without a real secure link (a real one would expose a recipient and mark the link opened). Submitting there is refused by the real API with the fake token; nothing is written.
- **Regression** `scripts/dos-recipient-forms-regression.mjs` (in `test:dos`): bound identity from the link, no email field, name only as the unbound fallback; the leader preview definition lists no name/email; explicit three-way sharing; no baby-blue panels on the recipient pages, send sheet or previews; no "Table" wording on these surfaces or in the recipient errors; "Someone prayed with me" stays an activity chip.

## 390px evidence (local production build)
| File | Shows |
| --- | --- |
| `screenshots/b2/mobile-390--01-testimony-bound.png` | Bound testimony: "You're sharing as George Jenko", no name/email fields, white surfaces, explicit sharing rows. |
| `screenshots/b2/mobile-390--02-testimony-share-with-name.png` | "Yes, with my name included" selected → display-name field, DOS-blue "Share story". |
| `screenshots/b2/mobile-390--03-testimony-unbound-fallback.png` | The safe fallback when a link carries no recipient: one "Your name" field. |
| `screenshots/b2/mobile-390--04-quick-review.png` | Quick Review (unchanged behavior) for parity. |
| `screenshots/b2/mobile-390--05-review-options.png` | Review Options chooser: "…share from this meeting." |
| `screenshots/b2/mobile-390--06-leader-send-sheet.png`, `07-…-preview-questions.png` | Leader send sheet with "Meeting" labels and the white preview card. |

Runtime checks: email inputs 0, name inputs 0 and "sharing as" present on the bound form; unbound fallback shows exactly one name field; no "Table" text on Review Options or the send sheet; no horizontal overflow at 390.

## Verification
`npm run typecheck` ✓ · `npm run test:dos` ✓ (44 scripts) · `npm run build` ✓ · `npm run smoke` ✓ · `npm run test:dos:visual` 16/16 identical ✓ · a11y sweep ✓ · `npm run test:usa-168-person-ui` ✓.

## Left for later (listed, not changed here)
Other "Table" wording elsewhere in DOS (Prayer "Related Table"/"Open Table", "Table Follow-Up", "Table saved successfully", Library "Table Teachings", "Table Flow"); the unused `app/testimony/[token]/TestimonyForm.tsx`; Quick Review / Testimony vocabulary and provenance (Phase C).
