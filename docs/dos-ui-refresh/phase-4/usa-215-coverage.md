# USA-215 — Component and visual-regression coverage

Branch `ryan/usa-215-regression-coverage` (stacked on USA-214). Closes Phase 1 S4 and the Phase 0 finding that no DOS script ran in CI and no rendered-DOS check existed.

## Routes / components changed
- `app/dos/app/preview/PrimitivesGallery.tsx` (new) — every shared primitive in its states (buttons ×5, pill rail, segmented, status pills incl. truncation, rows with avatar / overdue ring / icon tile, cards, empty state, search, fields valid / required / optional / error, chips incl. a long truncating one, stepper, toggle rows, helper line, sticky primary invalid and saving). Synthetic content only.
- `app/dos/app/preview/page.tsx` — behind the same demo token, `&gallery=primitives` renders the gallery instead of the app. No new route; the demo route's gating is unchanged.
- `package.json` — `test:dos` (the 39 offline DOS scripts in one command; excludes `dos-field-contact-form`, the pre-existing failure retired in USA-217) and `test:dos:visual`.
- `.github/workflows/ci.yml` — one added step after Typecheck: `npm run test:dos` (~10 s). **A DOS regression can now fail CI.**
- `scripts/dos-visual-regression.mjs` (new) — boots the production build like `ci-smoke`, renders eight scenes (mobile: home, meetings, more, person record, log meeting, gallery; desktop: dashboard, gallery), compares byte-for-byte with `docs/dos-ui-refresh/visual-baseline/<platform>/`, saves mismatches to `test-results/visual/`, `--update` records intentional changes. Platform-keyed; skips with a notice where no baselines exist (CI), so Linux baselines are a deliberate future step.
- `docs/dos-ui-refresh/visual-baseline/darwin-arm64/` — eight baseline PNGs recorded at the end of Phase 4.

## Behavior intentionally preserved
No production screen changed. The gallery is reachable only with the demo token and only on the demo route.

## Tests
- `npm run typecheck` ✓ · `npm run test:dos` ✓ (39 scripts, 6 s) · `npm run build` ✓ (42 s) · `npm run test:dos:visual -- --update` ✓ (8 scenes recorded, 21 s) · `npm run test:dos:visual` ✓ (8/8 scenes match, 20 s).

## Screenshots
The gallery itself at 390 and 1440 is part of the visual baseline set.

## Accessibility / overflow
Gallery renders inside the DOS container with the nav clearance; primitives' own a11y was verified in USA-211/213.

## Known limitations / unresolved
- Visual comparison is byte-equality on one platform; a Linux baseline set and a tolerance-based diff are follow-ups if CI should run it.
- No unit-test runner exists (Phase 0/1 finding); component coverage stays static-assertion scripts plus the gallery screenshots, consistent with the repository's testing style.

## Rollback
Revert the branch commit (removes the CI step, the aggregate, the gallery, the script, and the baselines).
