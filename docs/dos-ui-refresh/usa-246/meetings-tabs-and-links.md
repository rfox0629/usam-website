# USA-246 — Meetings navigation: Calendar / Timeline / Links

2026-09-08, branch `ryan/usa-246-meetings-tabs-and-links` from `main` `554039e`. The no-schema part of the founder addendum. **No data, API, persistence, permission or scheduling-engine change.**

Depends on nothing, but pairs with the Person polish PR: both use the same canonical `Segmented` control, and the 44px height lives in that PR. Until it merges the Meetings segments render at the current 36px; afterwards both rails are 44px automatically, because the height belongs to the shared component.

## What changed
| Requirement | Change |
| --- | --- |
| Meetings navigation becomes Calendar · Timeline · **Links** | `meetingsViewOptions` gains Links and the view state widens to `MeetingsView`. |
| Same aligned, equal-width segmented rail as the Person record | The two-option `PillRail` is replaced by the canonical `Segmented` control — the same one the Person rail uses. |
| Links is a full task surface, not a narrow settings modal | The Links tab renders `DesktopInvitePanel` inline under the page title **Scheduling Links** with "Create and share booking links for meetings." |
| The obsolete generic **View** label disappears | Both View controls are now **Settings** with an explicit `aria-label="Calendar settings"`, and the page-level one renders only on the Calendar view instead of competing with the rail. Both grew to a 44px touch target. |
| Do not delete working calendar settings | Nothing was removed. Month/week, the reminder overlay, the external-calendar overlay, and Google connect/refresh are all still behind the same control; only its name and scope changed. Inside the sheet the month/week group heading reads **Display** rather than View. |
| One home for scheduling links | The sheet is retired. Every entry point — the calendar's own link action and the FAB's **Invite** quick action — now navigates to the Links tab, so the same list is never shown in two kinds of surface. |
| Keep Calendar and Timeline mutually exclusive | Unchanged. The calendar stays mounted but hidden while another view is shown, so the selected date, month and settings survive a tab switch. |
| Keep the floating plus button | Unchanged. |

Search is hidden on Links: searching meetings has nothing to do with booking links.

## Not in this PR
Everything that needs the planned-vs-actual schema decision, and the rest of the interaction matrix:

- Day view contextual actions by date state (future → Schedule, today → Schedule or Log, past → Log a past meeting). The Day agenda exists and opens on every date, but has no add action yet.
- Schedule Meeting's Start + End with derived duration.
- The schedule-to-log lifecycle, which is blocked on the columns proposed in the Phase 1 audit.
- The booking → meeting write path, booking idempotency, and person matching that does not create silent duplicates.

These are laid out with evidence in `phase-1-lifecycle-audit.md` §9–§11.

## Verification
typecheck ✓ · test:dos 46 scripts ✓ · build ✓ · smoke ✓ · a11y/responsive sweep, no overflow ✓ · Person UI ✓ · dead-code scan ✓ (840 declared, 28 reference-only — the retired sheet left nothing behind) · visual: two intended baselines re-recorded (`mobile--meetings`, `mobile--meetings-timeline`), both showing the three-segment rail.

Measured at 390 and 1440: three equal-width segments labelled Calendar / Timeline / Links, no horizontal overflow, and zero remaining "View" buttons on the Links tab.

Screenshots: `screenshots/meetings-calendar-390.png`, `meetings-timeline-390.png`, `meetings-links-390.png`, `meetings-links-1440.png`.
