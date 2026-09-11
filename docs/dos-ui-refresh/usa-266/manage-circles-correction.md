# USA-266 — Manage circles: save, exit, filters, Household

Founder correction of 2026-09-11 to the USA-247 circle placement release (PR #128). UI and state only; the placement contract is untouched.

## Root causes (inspected on `main` c4bb288)

1. **False exit warning.** `DosWorkflowPage` decides "unsaved work" by snapshotting every rendered control (`readSurfaceValues`) against the snapshot taken when the page opened. Manage circles renders its search field, filter buttons (`aria-pressed`), and the expanded per-person choice buttons inside that snapshot, so a search, a filter, or opening a person made the page "dirty" with no pending placement change.
2. **Post-save revert.** After a successful save the draft was cleared at once while rows kept reading the server prop, which only updates when `router.refresh()` completes; in that interval every row showed the old placement. "Confirmed: …" was derived from the draft, so an unsaved selection read as confirmed. The open editor never collapsed.
3. **Misleading filters and footer.** "Reviewed" meant deliberately not placed; "Changed" meant current unsaved edits; the disabled "No changes to review" footer read as "someone is still unclassified".

## Behaviour now

- Unsaved work = proposed placements that differ from confirmed ones (`isDirty` on `DosWorkflowPage`). Search, filters, Household, open/close never count. No pending changes: Back leaves immediately. Pending changes: **Leave without saving?** · "Only your unsaved changes will be lost. Saved placements will stay." · **Keep editing** / **Leave without saving**. Choosing the confirmed value again clears the pending change. Leaving never undoes an earlier save.
- Save: rows update from the server's `placements` response, overlaid on the prop until the refresh delivers the same rows; draft cleared; review exited; open editor collapsed; brief "Saved N changes"; Back leaves at once. Rows read "My 70 · Not saved" until persistence succeeds, "Confirmed: My 70" only after. Editing and Back wait while a save is in flight; a refused save keeps every selection and explains itself.
- Filters: **All | Confirmed | Unplaced**. Unplaced holds never-reviewed ("Not reviewed") and deliberately not placed ("Reviewed, not in a circle"). Footer only with pending edits: Review N changes → the differences → Confirm these changes.
- **Household** toggle (off by default) hides unplaced Household-only people; confirmed Household-only people stay visible with the badge; pending edits are never hidden; one result count follows search, filter, and Household. Private people keep their existing access rules. Spouses are independently placeable.

## Shared primitives (additive, backward-compatible)

`DosWorkflowPage`: optional `isDirty`, `discardCopy`, `backDisabled`. `useUnsavedWorkGuard` and `DiscardChangesDialog`: optional `copy`. `unsaved-work.ts`: `leaveWithoutSavingCopy`. Every other task screen and editable sheet keeps the snapshot comparison and the existing wording.

## Preserved contract

`dos_circle_placements` canonical; confirmations and history; cumulative capacity and concurrency (the DB function); explicit review before saving; idempotent operation keys and safe retries; workspace authorization; "not currently placed" vs "not reviewed"; legacy machine assignments untrusted; Reports and Fruit untouched. No production placement was reset or created.

## Verification

Typecheck · full DOS aggregate · build · visual suite (16 scenes, no baseline change; the fixture gains Patty Gaffney, Household only and unplaced, hidden by default). Playwright on the production build of the preview fixture at 390, 1440, and 320 (`screenshots/`): 99 checks. The DB-free preview simulates the save in memory (700 ms, labelled in code); a signed-in production save was not exercised.
