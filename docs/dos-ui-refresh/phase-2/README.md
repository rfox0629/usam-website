# DOS UI System Audit & Visual Refresh — Phase 2: product and UI inventory

Linear: USA-194 (phase) · USA-221 (route/screen/state matrix) · USA-209 (shared components and inconsistencies) · USA-205 (current vs mockups vs missing designs).

Evidence-only, at `de6862f`, 2026-09-04. Nothing outside `docs/dos-ui-refresh/phase-2/` changed.

| Deliverable | File |
| --- | --- |
| Route, screen, and application-state matrix; overlays; fixed nav, safe areas, overflow | [01-route-screen-state-matrix.md](./01-route-screen-state-matrix.md) |
| Screen → pattern map, component families, 18 inconsistencies, extraction order | [02-shared-components-and-pattern-inconsistencies.md](./02-shared-components-and-pattern-inconsistencies.md) |
| Per-surface comparison: production vs V10 vs approved direction; screens with no design; open product logic | [03-current-vs-mockup-comparison.md](./03-current-vs-mockup-comparison.md) |

Gate check: every reachable DOS route, in-app view (4 tabs, 15 More views, 9 Group tabs, 5 My Record tabs, 4 Fruit views, 3 Prayer tabs, Library view states), overlay (60 sheets + 3 overlays + 4 task pages + 1 dialog), and material state (auth ×5, loading, empty, success, error, confirmation, destructive, demo, flags) is accounted for. Missing design decisions are listed explicitly (§6 of the matrix and the comparison doc); none is guessed.

New decision for Ryan surfaced by Phase 2: **D12** — the Apps/More "+" FAB is a shortcut menu to the More apps in production; V10 removes it as unexplained. Keep or remove?
