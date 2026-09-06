# USA-208 — Typography, contrast, spacing, and surface tokens

Branch `ryan/usa-208-dos-tokens` (stacked on the Phase 3 docs branch). Implements spec §2 of `docs/dos-ui-refresh/phase-3/dos-ui-canonical-spec.md`.

## Routes / components changed
- `tailwind.config.js` — `theme.extend.colors.dos` reconciled and extended (23 names); new `fontSize` scale (`text-dos-display` … `text-dos-pill`), `borderRadius` (`rounded-dos-1/2/3`), `boxShadow` (`shadow-dos-float`), `spacing` (`pb-dos-nav-clearance`), and the `zIndex` ladder (`z-dos-*`).
- `src/lib/dos/text-tokens.ts` — same values as constants (`dosText`, `dosSurface`, `dosStatus`, new `dosLayout`, `dosType`). No importers exist yet; the file is the non-Tailwind mirror.
- `scripts/dos-design-tokens-regression.mjs` + `npm run test:dos-design-tokens` — asserts Tailwind and the constants agree, retired values are not tokens, existing token names survive, and `app/globals.css` carries no DOS token.
- `docs/dos-ui-refresh/phase-3/dos-ui-canonical-spec.md` §2.1 — one clarification: `dos.eyebrow` stays grey (`#6B7686`) for sub-eyebrows and un-refreshed screens; the new `dos.eyebrowSection` (`#2251E8`) is the blue section eyebrow for refreshed screens.
- No component, screen, route, API, or data file changed.

## Token value changes that affect rendered pixels today

Only screens that already use `text-dos-*` / `bg-dos-*` / `border-dos-*` utilities are affected (the USA-168 Person surfaces and `app/dos/review/[token]/DosQuickReviewForm.tsx`). Every other screen uses literal hex values and is untouched.

| Token | Before | After | Where it renders today |
| --- | --- | --- | --- |
| `dos.primary` | `#0F1520` | `#0B1220` | Person form/overview titles (127 uses) |
| `dos.blue` | `#2450C8` | `#2251E8` | Person form primary actions, "+ Add" links (50 uses) |
| `dos.disabled` | `#B4BBC5` | `#9AA3B2` | 2 disabled controls |
| `dos.hairline` | `#E7E9ED` | `#E5E8EF` | 15 hairlines |
| `dos.rule` | `#EDEFF2` | `#E5E8EF` | 41 rules |
| `dos.band` | `#F6F9FE` | `#F7F8FB` | 3 bands |
| `dos.body`, `dos.secondary`, `dos.eyebrow` | unchanged | unchanged | — |

All changed pairs differ by a few RGB units; none crosses a contrast threshold (all readable tokens ≥ 4.6:1 on white).

## Behavior intentionally preserved
Home and Dashboard use no DOS token utilities and render byte-for-byte the same markup; the navigation, all forms, all data paths, and all copy are unchanged. `#94A3B8` and the other retired values remain as literals until each screen is refreshed (spec §10: never a blind global replace).

## Tests
- `npm run typecheck` ✓ (24 s)
- `npm run test:dos-design-tokens` ✓ (new)
- 37 offline DOS regression scripts: **37 pass, 1 pre-existing failure unchanged** (`dos-field-contact-form`, recorded in Phase 0)
- `npm run build` — see below

## Screenshots
Before = Phase 0 baseline (`docs/dos-ui-refresh/phase-0/screenshots/`); after = `./screenshots/usa-208/` (same demo route, same flows).

## Accessibility / overflow
Contrast table in spec §2.1; no layout change.

## Known limitations / unresolved
- `GuidedJourneyUi` (shared with the public participant portal) still pins `#2563EB`/`#1D4ED8` by parity-script assertion; it adopts tokens in the Library batch with the assertion updated explicitly in that PR.
- Home keeps `#2563EB` and its gradient wash (spec S-4).

## Rollback
Revert the branch commit; production deployment before merge: whichever is READY at merge time (recorded on the PR).
