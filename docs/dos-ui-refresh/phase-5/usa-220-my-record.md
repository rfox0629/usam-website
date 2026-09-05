# USA-220 — Pilot: My Record

Branch `ryan/usa-220-my-record-pilot` (stacked on USA-222). Implements spec §5.8's header, rail and Overview for `MyRecordWorkspace`. Production already had the five sections (Overview, Walk, Growth, Purpose, Faithfulness) as a bespoke tab bar; this pilot changes the chrome and the Overview only. The Walk / Growth / Purpose / Faithfulness panels and every sheet are untouched.

## Routes / components changed
| Where | Change |
| --- | --- |
| Header (`MyRecordWorkspace`) | The Oswald title + "← More" pill + Share button become the canonical `PageHeader`: back arrow (mobile only, additive `mobileOnlyBack` prop on `PageHeader`), title "My Record", and the **🔒 Private** chip (spec §6). The chip toggles the same sharing panel the Share button opened ("My Record is private." + future sharing roles), so sharing scope and copy are unchanged. |
| Section rail | `MyRecordTabBar` (5-column grid of 10px labels) replaced by the canonical `PillRail` (`role=tablist`, 44px targets, scrolls with the selected pill kept in view; the fade shows there is more). The bespoke tab bar component is removed (no other references). Tab values unchanged, so `?tab=` deep links and the FAB's per-tab items keep working. |
| Overview | **Current + Recent + one View all.** "Today at a Glance" (four daily KPI cards) is removed along with its derivations and the `MyRecordAtAGlanceCard` component. **Current** (D10) lists exactly what production already treats as active: resources assigned to me that are not completed (row opens the Journey or the assignment) and assessments still in draft (row opens the result, else the Growth tab); hidden when empty, no new aggregate. **Recent** keeps the latest three timeline entries through the existing compact record cards and the single View all that opens the timeline sheet. |
| `scripts/dos-my-record-regression.mjs` | The three assertions that required the KPI cards (presence, 2-by-2 grid, compact padding) are **retired deliberately** and replaced by assertions for the new Overview (Current gated on active items, Recent with three entries and one View all, Current built only from not-completed assignments and draft assessments, canonical PillRail, Private chip opening the sharing panel). Every other assertion (tab labels, FAB items, sheets, routes, migrations) is unchanged. |
| `scripts/dos-visual-regression.mjs` | Tenth scene `mobile--my-record`. |

Not changed: Walk / Growth / Purpose / Faithfulness panels (spec §5.8's per-tab structure is Phase 6 work under USA-225-229 and PL-8), `MyRecordContextualFloatingActions` and its items, every sheet and form, `onSave`, the record data model, sharing scope.

## Behavior intentionally preserved
Private by default and the sharing panel's language (B8, B11); the five sections and their contents; FAB per tab; deep links; global-FAB suppression on My Record.

## Tests
- `npm run typecheck` ✓ · `npm run test:dos` ✓ 40/40 (`dos-my-record` passes with the retired KPI-card assertions replaced as described above; every other My Record assertion untouched).
- `npm run build` ✓ (37 s).
- `npm run test:dos:visual` before the update: the only failure was the **new** `mobile--my-record` scene having no baseline; no existing scene changed (`mobile--more` included). After `--update` **10/10 pass**.

## Screenshots
Before: Phase 0 `mobile-390--07-my-record.png`, `desktop-1440--07-my-record.png`. After: `./screenshots/usa-220/` — mobile Overview, Private panel open, Walk, Growth, Purpose, Faithfulness, 320px width; desktop Overview, Private panel, Walk, Growth, Purpose, Faithfulness. The demo workspace has no active assignment or draft assessment, so **Current is hidden in these captures** (D10 empty rule); it renders as a white surface of rows above Recent when data exists.

## Accessibility / overflow
Rail is a `tablist`; header back and chip are 44px/36px targets with focus rings; at 320px the rail scrolls, nothing overflows horizontally.

## Known limitations / unresolved (spec §9 D10, PL-8)
The "Current" rule beyond production's active items; the Settings control named in spec §5.8 (no My Record settings surface exists today, so none is invented); Scripture storage, per-tab add actions, Purpose record shape, Faithfulness kinds, cross-links, per-entry sharing, timer control, sheet vs task screen — all stay as production.

## Rollback
Revert the branch commit (the script returns to asserting the KPI cards; the new scene's baseline is removed).
