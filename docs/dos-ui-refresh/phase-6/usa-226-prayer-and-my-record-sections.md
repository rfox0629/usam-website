# USA-226 — Batch: Prayer and remaining My Record sections

Branch `ryan/usa-226-prayer-my-record` (stacked on USA-227). Implements spec §5.10 for the mobile Prayer hub and a token pass on the My Record Walk / Growth / Purpose / Faithfulness panels. **No change to field meanings, links, sorting, or follow-up logic** (spec §5.10); privacy, history, CRUD, associations and category behavior preserved.

## Prayer (`activeMoreAppView === "prayer"`, mobile; desktop untouched, B12)
| Where | Change |
| --- | --- |
| Header | "← More" pill + Oswald title + Settings pill → canonical `PageHeader` "Prayer" (mobile-only back to More, Settings chip). |
| Search | Unchanged (`MobileSectionSearch`, always visible, "Search prayers"); the prayer regression script guards it. |
| Rail | `SegmentedTabs` → canonical `PillRail` **Prayers \| Prayer Team \| Answered** (same `prayerWorkspaceTabs`, same state). |
| Section panels (`MobilePrayerPanel`) | Bordered card → `Eyebrow` (blue) with the existing Filter control as its action, one quiet summary line under Prayers (`N open`), rows on one white surface, empty state on the shared `EmptyState` with production copy. |
| Rows (`PrayerRequestListRow`, `PrayerDetailListRow`, `PrayerPartnerListRow`) | Row grammar: initials `Avatar` when a person is linked (neutral `IconTile` otherwise), title 15/600 ink, `person · category · group` context line, status line ("Follow-up overdue", "High priority", "Public") as subtle ink-2 text, chevron; hairlines. Same open targets. |

**Deliberately kept as production:** the follow-up state as text rather than the spec's amber `StatusPill` — the prayer regression script forbids badge components and amber/rose classes on the list surface ("no badge walls"), a recorded product choice; the pill variant is left under PL-10. The FAB stays the shared "+" quick-actions menu with "Add Prayer Request" / "Add Prayer Partner" (guarded; the §6 "Add request" extended-FAB copy waits on the D12 FAB policy). Add request form unchanged (fields and defaults exactly as production).

## My Record sections (`MyRecordWalkWithGodPanel`, `MyRecordGrowthPanel`, `MyRecordCallingPanel`, `MyRecordLegacyPanel`)
The four panels carried only four hard-coded colours of their own (Walk's filter chips, Growth's completed-resources disclosure); those move to tokens (`dos-blue` / `blue50` / `blueText`, `dos-line`, `dos-secondary`, the eyebrow size). Section headings stay on the shared legacy `SectionHeading` (the My Record script asserts `SectionHeading title="Time With God"` on Walk); its token restyle is a shared change taken in USA-229 with every baseline checked. Structure, per-tab add actions, sheets, forms and records are unchanged (spec §5.8 per-tab structure waits on PL-8: Scripture storage, per-tab add actions, Purpose record shape, Faithfulness kinds, cross-links, per-entry sharing, timer, sheet vs task screen).

## Tests
- `npm run typecheck` ✓ · `dos-prayer-ui` ✓ (every guard intact: tab model, filter control, row context, no badge walls, mobile search, request sheet, detail sheet, routes) · `dos-my-record` ✓.
- `npm run test:dos` ✓ 40/40 · `npm run build` ✓ (37 s).
- `npm run test:dos:visual` before the update: only the **new** `mobile--prayer` scene lacked a baseline; no existing scene changed (`mobile--my-record` byte-identical). After `--update` **12/12 pass**.

## Screenshots
Before: Phase 0 `desktop-1440--13-prayer.png` (desktop only; the mobile hub had no Phase 0 capture), USA-220 Walk / Growth captures. After: `./screenshots/usa-226/` — mobile Prayer (Prayers, Prayer Team, Answered, 320px), My Record Walk and Growth.

## Accessibility / overflow
Rail is a `tablist`; rows are 60px buttons with focus rings; context and status lines truncate; 320px scrolls the rail with the fade and keeps rows inside the viewport.

## Rollback
Revert the branch commit.
