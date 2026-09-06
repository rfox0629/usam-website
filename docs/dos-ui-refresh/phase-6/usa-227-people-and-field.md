# USA-227 — Batch: People and Field

Branch `ryan/usa-227-people-field` (stacked on USA-224). Implements spec §5.11 for the Field list (`activeTab === "people"`). Placement stays human-confirmed (B4) and the dimensions stay separate (B5): the row shows the person's relationship and the circle they are already in; nothing scores, suggests, or moves anyone.

## Routes / components changed (`app/dos/app/DosMvpAppClient.tsx`)
| Where | Change |
| --- | --- |
| Mobile header | Oswald title + Settings pill → canonical `PageHeader` "Field" with a Settings chip (opens the same Settings view). No back control is added: Field is reached from More and from Home's circle target and the bottom nav is the way back, as in production. |
| Mobile search | `MobileSectionSearch` → shared `SearchField` ("Search field" label, "Search people" placeholder, same `peopleQuery` state). Desktop search unchanged. |
| "Show household & secondary" | Same toggle and count, restyled as a full-width row-like control with a `StatusPill` count (blue when showing). Production behavior preserved: household and secondary people stay hidden until shown. |
| Circle tabs | Bespoke `PeopleCircleTabs` (five-column grid, 11px labels) → canonical `PillRail` **All \| My 3 \| My 12 \| My 70 \| My 120** on mobile and desktop; same `peopleCircleView` state and option values; the bespoke component is removed (single use). |
| Mobile list (new `FieldPeopleList` / `FieldPersonRow`) | One white surface of 60px rows: initials `Avatar`, name (15/600), `Relationship · My N · Met N days ago` in ink-2 (circle omitted when the person is not yet placed; "Follow up today" / "No meeting yet" keep production wording, no longer as coloured text), the **Log meeting** shortcut as its own 44px control (B8), and a chevron. The row's accessible name stays `Open <name>`. The shared `CircleLayerList` is untouched because Home's circle sheets render it. |
| Empty states | The three list empty states use the shared `EmptyState` (one sentence, production copy joined; the no-people state keeps its "Add Person" action as a tinted `Button`). |
| `scripts/dos-visual-regression.mjs` | Eleventh scene `mobile--field`; the `person-record` scene now clicks the "All" tab role. |

Not changed: `DesktopPeopleIndex` (desktop table, B12), `fieldListPeople` / circle grouping / search filtering, the import message banner, the quick-actions FAB (production shortcut menu; the spec's extended "Add person" FAB waits on D12's FAB policy), the Circle Suggestion and "DOS noticed something" sheets (**D11**: the Needs-placement block is not built; production sheets stay), every handler.

## Behavior intentionally preserved
Circle placement human-confirmed and visible with its reason (B4); relationship / circle / engagement / fruit never merged (B5; engagement shown only when the Advanced Feature is on, unchanged); household and secondary hidden behind Show (B8); search semantics; Log meeting per row; Settings reachable; deep links.

## Tests
- `npm run typecheck` ✓ · `npm run test:dos` ✓ 40/40 (no script anchors on the Field list; `usa-168-person-ui` still finds `Open Naomi Lee`).
- `npm run build` ✓ (35 s).
- `npm run test:dos:visual` before the update: only the **new** `mobile--field` scene lacked a baseline; no existing scene changed (`mobile--person-record`, which now reaches the person through the "All" tab, is byte-identical; Home untouched). After `--update` **11/11 pass**.

## Screenshots
Before: Phase 0 `mobile-390--08-field-people.png`, `mobile-390--15-field-all.png`, `desktop-1440--08-field-people.png`. After: `./screenshots/usa-227/` — mobile My 12 / All / search / My 120 empty / 320px; desktop Field (rail only; table unchanged).

## Accessibility / overflow
Rail is a `tablist`; every row control ≥ 44px with focus rings; secondary line truncates rather than overflows; 320px scrolls the rail and keeps the list inside the viewport.

## Known limitations / unresolved (spec §9 D11, D12, PL-1)
Needs-placement bounded block (production sheets stay); extended "Add person" FAB vs the shared "+" menu; rhythm pills not built (no per-person rhythm in data). The demo workspace places only one person, so most rows show no circle segment.

## Rollback
Revert the branch commit; the `mobile--field` baseline is removed with it.
