# USA-218 — Pilot: Meetings Calendar and Timeline

Branch `ryan/usa-218-meetings-calendar-timeline` (stacked on USA-217). Implements spec §5.1 and §5.2: Calendar and Timeline are mutually exclusive views; the Calendar shows nothing beneath the grid but its key; the Timeline contains logged meetings only, newest first, grouped by month, with the shared search and no status filters. This is the pilot's one structural change and it is measured against the Phase 0 finding that production had no such toggle and repeated history beneath the calendar.

## Routes / components changed (`app/dos/app/DosMvpAppClient.tsx` unless noted)
| Where | Change |
| --- | --- |
| Meetings tab (`activeTab === "meetings"`) | New `PillRail` **Calendar \| Timeline** (`meetingsView` state, default Calendar) under the header on mobile and desktop; the search field stays shared by both views (spec S-8). The calendar is hidden (not unmounted) while the Timeline shows, so calendar month/day/menu state survives a switch. |
| `MeetingCalendarView` | Additive `showRecentlyLogged` prop (default `true`); the Meetings tab passes `false`, so **the "Recently Logged" list no longer repeats beneath the calendar**. New `CalendarKey` renders one line beneath the grid listing only the kinds present in the visible items (Meeting, Reminder, Prayer, Google Calendar, Birthday, Anniversary) with the same dot tones the cells use. Needs Logging, the month/week "View" menu, prev/next, day cells, the existing day sheet (`CalendarDayAgenda`) on tap, Google sources, and every handler are unchanged. |
| `MeetingsTimeline` (new) | Every logged meeting (`meetingStatus === "logged"`; scheduled and canceled never appear) filtered by the same `tableQuery` as the calendar, newest first, grouped by month with `Eyebrow` "September 2026 · N logged"; rows are the shared `Row`: icon tile, **when** line (`Wed, Sep 2 · 9:00 AM` in the DOS display time zone), `person · context · duration`, chevron → `openMeetingDetail`. Empty state uses the existing copy. No filters, no status pills. |
| `src/components/dos/ui/PillRail.tsx` | Additive `edgeInset` (4 or 5) so the rail bleeds to the container edge on 16px-padded screens; the right-edge fade now renders only when the rail actually overflows (it painted a white strip on short rails over tinted grounds). |
| `scripts/dos-visual-regression.mjs` | Ninth scene `mobile--meetings-timeline`. |

Not changed: `RecentlyLoggedMeetings` (still used by nothing else, kept for now), `CalendarNeedsLoggingSection`, the calendar settings menu and Google sync, `CalendarDayAgenda`, the FAB (Log / Schedule quick actions), meeting detail, log/edit flows, timezone formatting (`displayTimeZoneForValue`).

## Behavior intentionally preserved
Every meeting action (open, log a scheduled meeting, edit, reminders, Google events, add-to-DOS), the Needs Logging queue, month/week view and its settings, day-tap agenda, search semantics (`filteredTables` / `filteredCalendarItems`), the opaque nav and clearance, timezone/historical display. Scheduled and unlogged meetings never appear in the Timeline (B9, spec §5.2).

## Tests
- `npm run typecheck` ✓ · `npm run test:dos` ✓ 40/40 (`dos-ui-controls`, `dos-table-detail-edit`, stabilization 72/72 unchanged).
- `npm run build` ✓ (37 s).
- `npm run test:dos:visual` before the baseline update: **failed as intended** on `mobile--meetings` (calendar no longer followed by Recently Logged; key line and rail added) and on `mobile--meetings-timeline` (new scene, no baseline). After `--update`: **9/9 pass**. `mobile--home`, `mobile--more`, `mobile--person-record`, `mobile--log-meeting`, and both gallery scenes are byte-identical to the USA-217 baselines.
- **Baseline drift not caused by this issue:** `desktop--dashboard.png` also re-recorded. The demo fixture's accountability schedule due on Sep 5 moved from "Next 7 Days" to "Due Today" (and the summary counts 0/2/1 → 1/2/0) because the UTC day rolled over between the USA-215 recording and this run. The suite is clock-sensitive for date-relative fixture rows; recorded as a Phase 7 cleanup candidate (freeze the demo clock for the visual run) rather than fixed here.
- The visual script's Timeline scene had to click a `tab` (the rail is a `tablist`), not a `button`; fixed in the script in this PR.

## Screenshots
Before: Phase 0 `02-meetings-calendar`, `03b-meetings-history-below-calendar` (history repeated beneath the calendar). After: `./screenshots/usa-218/` — mobile Calendar top/end (key line, no history), Timeline top/end, day sheet; desktop Calendar top/end, Timeline top/end and with search.

## Accessibility / overflow
Rail is a `tablist` with 44px targets; Timeline rows are buttons with 60px minimum height; the key is decorative text at 5.8:1; no horizontal overflow (rail scrolls inside its own container; rows truncate).

## Known limitations / unresolved (spec §9 PL-6)
Empty-day sheet content, Schedule date pre-fill, whether search stays on Calendar, and the week view stay as production. Context-specific timeline icons (coffee / phone / video) are not in the data model; one meeting icon is used. Group meetings appear in the Timeline (V10 shown yes). The V10 "extended Schedule FAB" is not adopted (FAB is shared; D12).

## Rollback
Revert the branch commit; the `meetings` baseline reverts and the `meetings-timeline` baseline is removed with it.
