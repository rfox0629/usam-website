# USA-223 — Pilot: Apps launcher (More)

Branch `ryan/usa-223-apps-launcher` (stacked on USA-220). Implements spec §5.7 for the More tab's launcher: the same tile concept, compact, on a clear ground, with every app, its grouping, routing, icon and status kept. The bottom navigation and its "More" label are untouched (B2, D2).

## Routes / components changed (`app/dos/app/DosMvpAppClient.tsx`)
| Where | Change |
| --- | --- |
| `DesktopMoreAppCard` (the one tile used by the mobile launcher, the desktop More launcher and the dashboard "Available Tools" panel) | Restyled to the spec tile: 104px minimum height, 12px padding, hairline border with the `r2` radius and no drop shadow, a 30px icon circle on blue-50, the app name on one line (15/600, ellipsis), one 12.5px description line (truncated), and the count/status as the shared `StatusPill` (20px, capped at 100px). `data-dos-app-card` marker, `onClick`, items, order and icons unchanged. |
| Mobile More tab | Gains the canonical `PageHeader` "More" above the tiles. The launcher search (opened from the quick-actions menu's "Search More") and its empty state are unchanged. |
| Dead code | `MoreAppTile` and `AppsCatalogSection` had no references anywhere (grep + typecheck) and are removed. |

Not changed: `desktopAppCatalogItems` / `visibleMobileAppCatalogItems` (items, grouping, order, routing, statuses), the quick-actions FAB (kept per D12), the More sub-views (Settings, My Record, Groups, …), the scroll container and clearance (USA-214).

## Behavior intentionally preserved
Three-tab navigation with production icons and the "More" label (B2); every app reachable with the same tap; search behavior; desktop layout structure (B12: the desktop launcher and dashboard panel receive the shared tile by rule, no re-layout).

## Tests
- `npm run typecheck` ✓ · `npm run test:dos` ✓ 40/40 (`dos-groups` still finds the `data-dos-app-card` marker; `dos-readability` passes).
- `npm run build` ✓ (37 s).
- `npm run test:dos:visual` before the update: **failed on exactly `mobile--more`**; `desktop--dashboard` and every other scene byte-identical. After `--update` **10/10 pass**.

## Screenshots
Before: Phase 0 `mobile-390--06-more-launcher.png`. After: `./screenshots/usa-223/` — mobile launcher top / end / with search / 320px. Desktop has no launcher screen: the sidebar is the launcher and the `DesktopMoreLauncher` grid only mounts inside the mobile More tab (Phase 0's "desktop more-launcher" capture was the Dashboard). The dashboard does not render the tile, so B1 holds (its baseline is byte-identical).

## Accessibility / overflow
Tiles are buttons with focus rings; name and description truncate rather than overflow; 320px keeps two columns without horizontal scroll; status pill text at 12/600 grey ≥ 4.5:1.

## Known limitations / unresolved (spec §9 D2, D12, PL-2)
"More" → "Apps" rename; keep/remove the "+" FAB on this tab; app category membership. All stay as production.

## Rollback
Revert the branch commit; the `mobile--more` baseline reverts with it.
