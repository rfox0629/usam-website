# USA-213 — Controls, tabs, cards, rows, and state components

Branch `ryan/usa-213-controls` (stacked on USA-211). Implements the spec §3 controls that do not hold form values, and consolidates the component root (Phase 1 S5, Phase 2 I18).

## Routes / components changed

**Pure move** (byte-for-byte apart from `export` and imports) from `app/dos/app/DosMvpAppClient.tsx` (46,062 → 45,937 lines) into `src/components/dos/ui/legacy-controls.tsx`: `ButtonTone`, `AppButton`, `CompactButton`, `TabPageHeader`, `SectionHeading`, `MoreBackButton`, `UserProfileAvatar`. These keep rendering exactly what production renders today (including the `#2563EB→#1D4ED8` gradient primary) until each screen adopts the spec controls. `DesktopPanel` and `DetailCard` were deliberately left in place: two regression scripts use them as slice anchors and they are screen-specific.

**New spec controls, additive and unadopted,** under `src/components/dos/ui/` with a barrel `index.ts`:

| Component | Contract (spec §3) |
| --- | --- |
| `Button` | 48px / compact 36px, pill radius, variants `primary` (blue fill), `tinted`, `secondary`, `text`, `danger` (red text, never filled), optional `Icon` |
| `PageHeader`, `Eyebrow` | back (44px) · display title · one trailing control · optional lede; eyebrows are the only uppercase text — `section` blue, `sub` grey, optional count/action |
| `PillRail`, `Segmented` | tablist of 36px pills inside 44px hit areas, 15px padding, 6px gap, active filled blue, native horizontal scroll with right-edge fade, selected pill scrolls into view, no truncation; Segmented = surface-2 track, 4px padding, white active pill |
| `StatusPill`, `Avatar`, `IconTile` | 20px pill, five tones on tokens, capped at 100px, not a control; initials avatar with the amber overdue ring; 38px / 30px icon tiles |
| `Row`, `Card` | hairline rows with 12px padding, ladder typography, whole-row tap target (button / link / static), chevron and trailing pill slots; card = r2, hairline, 14/16 padding, never nested |
| `EmptyState`, `SearchField` | one sentence + at most one action, no illustration; 48px search with clear control |

**Component root:** `src/components/dos/DosCircleTarget.ts` and `DosTargetLoader.ts` re-export the two components that still live under `components/dos/` (the `loading.tsx` files keep their existing imports).

**Scripts:** new `scripts/dos-ui-controls-regression.mjs` (`npm run test:dos-ui-controls`) — pure-move checks, tokens-only / no-blur / nothing-below-12px checks, PillRail semantics and hit areas, StatusPill tones, Row/Card grammar, barrel and root re-exports. No existing script needed an anchor change.

## Behavior intentionally preserved
Every screen renders identical markup; the moved controls are unchanged. No screen adopts the new controls in this PR; no copy, data path, API, or navigation changed. The bottom navigation and its icons are untouched (USA-214 is next).

## Tests
- `npm run typecheck` ✓ · `npm run test:dos-ui-controls` ✓ (new)
- Offline DOS regression batch (40 scripts): **39 pass**, 1 pre-existing failure unchanged (`dos-field-contact-form`); all 72 USA-168 stabilization behaviors ✓; no anchor changes were needed.
- `npm run build` ✓ (36 s)

## Screenshots
Same six flows (`./screenshots/usa-213/`). **All six PNGs are byte-identical to the USA-211 captures** (and therefore to USA-208 and, for mobile Home, to the Phase 0 baseline).

## Accessibility / overflow
PillRail is a `tablist` with roving `tabIndex`, 44px targets, visible focus rings; buttons and rows have `focus-visible` rings; StatusPill is decorative; SearchField has an accessible label and a 44px clear button.

## Known limitations / unresolved
- `TabHero` (the current hero header), `MyRecordTabBar`, `PeopleCircleTabs`, `GroupDetailTabBar`, `DesktopPanel`, `DetailCard`, `EmptyState`/`SectionEmptyState` (legacy) stay in the client until the pilots replace them with `PageHeader`/`PillRail`/`Card`/`EmptyState`.
- Icon system choice (I7): the spec controls accept the production inline `Icon` set; lucide remains for non-nav glyphs. Decision recorded, no change to nav icons.

## Rollback
Revert the branch commit.
