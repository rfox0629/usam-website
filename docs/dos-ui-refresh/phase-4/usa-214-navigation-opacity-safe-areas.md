# USA-214 — Navigation opacity, safe areas, and responsive overflow foundation

Branch `ryan/usa-214-nav-opacity-safe-area` (stacked on USA-213). Implements spec §4.1–4.5 and B2. **This is the first PR in the project with a visible change**, limited to the bottom-navigation surface, the layering ladder, and the clearance beneath scrollable content.

## Routes / components changed (all in `app/dos/app/DosMvpAppClient.tsx` unless noted)

| What | Before | After | Why |
| --- | --- | --- | --- |
| `BottomNavigation` surface | `border-white/75 bg-white/62 backdrop-blur-2xl supports-[backdrop-filter]:bg-white/58 shadow-[0_24px_55px_rgba(148,163,184,0.22)]` | `border-dos-line bg-white shadow-dos-float` | Opaque; content never shows through (project guardrail, V10 nav spec) |
| `BottomNavigation` layer | `z-[60]` | `z-dos-nav` (30) | Documented ladder |
| Tab colors | selected `bg-[#EBF2FF] text-[#2563EB]` + inset highlight; unselected `text-[#94A3B8]` | selected `bg-dos-blue50 text-dos-blueText`; unselected `text-dos-secondary` | Tokens; retire very-light-gray text. **Three tabs, icons, labels, sizes, and positions unchanged** |
| App scroll container (tabbed screens) | `pb-28` (112 px), `pb-40` on More (160 px) | `pb-dos-nav-clearance` (safe-area + 100 px ≈ 134 px) on every tab | One clearance constant so the last row always clears the nav (V10: 134 px) |
| In-content detail overlays (`CirclesDetailOverlay`, `MeetingDetailOverlay` ×2 containers) | `z-40`, `pb-28` / `pb-[calc(env(safe-area-inset-bottom)+7rem)]` | `z-dos-overlay` (20), `pb-dos-nav-clearance` | Overlays sit beneath the nav (as today) with the same clearance |
| `MobileFloatingActions` root | `z-[70]` (above the nav) | `z-dos-fab` (25: above overlays, beneath the nav) | V10: the FAB stacks beneath the nav |
| `tailwind.config.js` z ladder | `dos-fab: 10`, `dos-overlay: 50` (USA-208 draft values, unused) | `dos-overlay: 20`, `dos-fab: 25` | Reconciled with actual layering; nothing used the old values |
| Spec §4.3 | overlays 50 above nav | overlays 20 beneath nav, FAB 25 | Corrected to match production behavior (nav visible on Person/Meeting records) |
| `scripts/usa-168-stabilization-behavior.mjs` | `assert(/z-\[70\]/…)` "The FAB sits below the sheet layer" | `assert(/z-dos-fab/…)`, same message | Anchor moved to the token; intent unchanged (25 ≪ 1000) |
| `scripts/dos-design-tokens-regression.mjs` | expected `dos-fab: 10` | expects `dos-overlay: 20`, `dos-fab: 25` | Follows the ladder |

Not changed: the nav's height, padding, bottom offset (`safe-area + 0.55rem`), `md:hidden`, tab order, `aria-current`, the `Icon` set, the "More" label, the desktop sidebar, any sheet or dialog layer (bottom sheets 80, task screens 120, sheets 1000, dialog 1100 are untouched), the quick-actions menu itself, table `overflow-x-auto` containers, and the `overflow-x-hidden` app root.

## Behavior intentionally preserved
Three tabs; production icons; "More"; nav hidden on task screens and desktop; nav visible over Person / Meeting / Circles records; FAB reachable on every tab; sheets and dialogs above everything; Home content untouched (the nav is a shared component explicitly targeted by this issue, so Home's nav becomes opaque like every other tab's).

## Tests
- `npm run typecheck` ✓ · `npm run test:dos-design-tokens` ✓
- Offline DOS regression batch (40 scripts): **39 pass**, 1 pre-existing failure unchanged (`dos-field-contact-form`); all 72 USA-168 stabilization behaviors ✓ (one anchor moved to the `z-dos-fab` token, message unchanged).
- `npm run build` ✓ (45 s)

## Screenshots
Before = USA-213 captures; after = `./screenshots/usa-214/` at 390×844 @2x: Home, Meetings (top and scrolled to end), More launcher (top and scrolled to end — the last tile clears the nav), Person Record (top and end), quick-actions open, Log Meeting (nav hidden).

## Accessibility / overflow
Unselected tab labels move from `#94A3B8` (2.6:1) to `#5A6473` (5.8:1). Selected label `#1E3FB8` on `#F1F4FF` ≈ 6.3:1. No horizontal overflow introduced; every scrollable tab screen reserves the same clearance.

## Known limitations / unresolved
- Nav label size stays 10 px (protected production component; spec's 12 px floor applies to refreshed content, not to the nav until Ryan decides otherwise).
- The quick-actions menu (`bg-white/95 backdrop-blur-xl`) is not part of the nav and stays as is.
- `MyRecordContextualFloatingActions` keeps its own `fixed` offset; My Record's scroll padding (`safe-area + 9rem`) already exceeds the clearance constant.

## Rollback
Revert the branch commit.
