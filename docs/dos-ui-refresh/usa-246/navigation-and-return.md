# USA-246 — People as a destination, and returning where you were

2026-09-08, branch `ryan/usa-246-navigation-and-return`, stacked on the planned-versus-actual branch. Implements the founder addendum's navigation and context-aware return. **No schema change beyond the migration already reported; no data change.**

## 1. Mobile navigation: Home / People / Meetings / More
People was already a real destination in the code — it was simply unreachable except through More, and the navigation lit up **More** while you were looking at People. It is now the second of four destinations, with the product-facing name in both mobile and desktop navigation even though older internal code still says Field.

Measured at 320, 375, 390 and 430px: the order is Home / People / Meetings / More, every destination is 48px tall and at least 68px wide, the bar stays fully opaque (`rgb(255, 255, 255)`), and there is no horizontal overflow. From 768px the desktop rail takes over, as before, and it now reads **People** with no **Field** label left in navigation.

Home remains the landing screen, keeps the bullseye as the "who needs my attention now?" surface, and keeps its quick actions — Log Meeting, Schedule Meeting, Add Person and Accountability. Nothing was moved off Home to force a trip through People.

## 2. Returning where you were after saving
Saving a meeting used to run `setActiveTab("meetings")` regardless of where the flow began, so logging from a Person dropped you in the Meetings list. Worse, the `router.refresh()` that follows a save could remount the shell, and anything held only in component state came back at its default — which is Home — losing the person or the date you had been working from.

Two changes:

**The flow remembers where it started.** The origin is read from the screen you launched from, so no entry point has to be told: a Person, a calendar date, Timeline, Meetings, or Home. The calendar and a scheduled meeting set it explicitly because they know which date you came from.

| Launch origin | Where a successful save returns |
| --- | --- |
| Person record | that same Person, with the saved meeting selected |
| Calendar date or scheduled meeting | Meetings → Calendar, on that date |
| Timeline | Meetings → Timeline |
| Meetings (elsewhere) | Meetings |
| Home | Home, with one short success confirmation |

A failed save still stays on the form with the entered data and the error, and Back or Cancel still returns without saving.

**The view survives a refresh.** `activeTab`, the Meetings subview, the selected calendar date and the selected person are persisted in **workspace-scoped** session storage and restored on mount instead of falling back to component defaults. A restored person is re-validated against this workspace's loaded people, so a stale or foreign id can never select someone. A browser that refuses session storage simply gets the previous behaviour; persisting never throws and never blocks a save.

Verified in the browser: selecting Meetings → Timeline, then reloading, returns to **Meetings → Timeline** rather than Home, with `{"activeTab":"meetings","meetingsCalendarDate":"2026-09-04","meetingsView":"timeline","selectedPersonId":null}` in storage.

## 3. What still needs an authenticated session
The post-save return itself runs only after a successful write. The demo preview is deliberately database-free, so the four return paths can be exercised end to end only in an authenticated workspace. The contract is held by `scripts/dos-meeting-return-context-regression.mjs`, and the founder preview is the place to confirm the behaviour with real data.

## 4. Verification
typecheck ✓ · test:dos 48 scripts ✓ (new `test:dos-meeting-return-context`) · build ✓ · smoke ✓ · a11y/responsive sweep, no overflow, opaque nav ✓ · Person UI ✓ (its navigation check now accepts either label) · visual: 13 baselines re-recorded, all showing the four-destination bar.

Screenshots: `screenshots/nav-390-home.png`, `nav-390-people.png`, `nav-390-after-reload.png`, `nav-1440-desktop.png`.
