# USA-211 — Editable surfaces and meeting-form primitives

Branch `ryan/usa-211-editable-surfaces` (stacked on USA-208). Implements spec §3 (Sheet inspection/editable, BottomSheet, Dialog, TaskScreen, Field, Select, Stepper, Chip, ToggleRow, HelperLine, StickyPrimary) and B7.

## Routes / components changed

**Pure moves out of `app/dos/app/DosMvpAppClient.tsx` (46,898 → 46,062 lines), byte-for-byte except `export` keywords and imports:**

| New module | Functions moved (original client lines) |
| --- | --- |
| `src/components/dos/Icon.tsx` | `IconName` (164), `Icon` (1423–1599) — the production icon set incl. the protected nav icons |
| `src/components/dos/forms/FormPrimitives.tsx` | `FieldLabel`, `FieldInputClass`, `FieldSelectClass`, `FieldTextareaClass`, `DosFormSection`, `DosFormField`, `DosFormGrid`, `RequiredMark`, `OptionalTag`, `DisclosureSection`, `FormMessage`, `StickyFormFooter` (4757–4920) |
| `src/components/dos/overlays/DosSurfaces.tsx` | `DosWorkflowPage`, `DiscardChangesDialog`, `useUnsavedWorkGuard`, `readSurfaceValues`, `Sheet`, `MobileBottomSheet` (15937–16329), in the original order |
| `src/components/dos/forms/OptionSelect.tsx` | `CompactOptionSelect`, `FormOptionSelect` (21152–21257) |

The client now imports these; its unused `unsaved-work` import was removed. `font.rajdhani` (`'Inter', sans-serif`) is re-declared locally in the two modules that use it, with the same value.

**New, additive (nothing adopts them yet):** `src/components/dos/forms/primitives.tsx` — `HelperLine`, `fieldControlClass`, `Field` (required asterisk / "optional" hint / error replaces helper), `Stepper` (fixed steps, no ceiling, hidden input for FormData and the guard), `Chip` + `ChipGroup` (36px, `aria-pressed`, ~190px truncation, removable), `ToggleRow` (real checkbox behind the switch), `StickyPrimary` (never disabled for validation; tinted "Fix N things to …"; disabled only while saving). Tokens only, no hex literals.

**Regression scripts:** new `scripts/dos-form-primitives-regression.mjs` (`npm run test:dos-form-primitives`); three existing scripts had their *anchor path* moved with the code and their assertions kept verbatim: `usa-168-stabilization-behavior.mjs` (five slices of Sheet / DosWorkflowPage / MobileBottomSheet / useUnsavedWorkGuard now read `DosSurfaces.tsx`), `dos-readability-regression.mjs` (FieldLabel and CompactOptionSelect slices), `dos-disclosure-section-overflow-regression.mjs` (reads `FormPrimitives.tsx`).

## Behavior intentionally preserved
- Every sheet, task screen, and form renders the same markup as before: the moved code is unchanged, so backdrop rules, Escape, the discard dialog, dirtiness-from-DOM, portal targets, and z-indexes are identical.
- Navigation icons are drawn by the same `Icon` function from its new file.
- No screen adopts the new primitives in this PR; no copy, data path, or API changed.

## Tests
- `npm run typecheck` ✓
- `npm run test:dos-form-primitives` ✓ (new) · `npm run test:dos-design-tokens` ✓
- Offline DOS regression batch (39 scripts): **38 pass**, 1 pre-existing failure unchanged (`dos-field-contact-form`). Two scripts needed only an anchor move after the extraction (`dos-disclosure-section-overflow` end anchor now `export function StickyFormFooter`; `usa-168-stabilization` reads the primitive from `DosSurfaces.tsx` and the mounts/declarations from the client) — all 72 stabilization behaviors pass, assertions unchanged.
- `npm run build` ✓ (39 s)

## Screenshots
Same six flows as USA-208 (`./screenshots/usa-211/`). **All six PNGs are byte-identical to the USA-208 captures**, and the mobile Home capture is byte-identical to the Phase 0 baseline — the move changed no rendered pixel.

## Accessibility / overflow
New primitives: 44px hit areas on stepper buttons and toggle rows, `focus-visible` rings, `aria-pressed` on chips, `role="alert"` on error lines, `aria-live` on the stepper value and the sticky primary. No layout change to existing screens.

## Known limitations / unresolved
- `DosDateInput`, `AppButton`, `CompactButton`, `EmptyState`, `TabHero` and the tab rails move in USA-213; `ProfileSheetFrame` (used by the read-only profile sheet and Edit Profile) is not yet `kind`-aware — Edit Profile holds one input and is tracked for USA-213.
- `AvailabilityEditSheet` and `InvitationDetailSheet` hold inputs but do not declare `kind="editable"`; declaring them is a behavior change (backdrop stops dismissing) and is scheduled for the Settings batch with its own before/after.
- The Meeting-form date/time pair and the people picker stay in the client until USA-216 adopts `Field`/`Chip`.

## Rollback
Revert the branch commit; the client regains the private copies and the scripts their old anchors.
