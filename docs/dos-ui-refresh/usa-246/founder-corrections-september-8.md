# USA-246 — Founder review corrections (September 8 stacked preview)

Branch `ryan/usa-246-preview-corrections`, stacked on #124 (`ryan/usa-246-navigation-and-return`). PRs #122–#124 are preserved unchanged; this branch corrects the five items from the founder review section "Founder review — September 8 stacked preview corrections".

## What changed

1. **Search is Timeline-only.** The Calendar and Links views render no search control. Timeline keeps the desktop and mobile search.
2. **Day view.** Tapping a month cell opens a `Sheet` (portalled, above the bottom nav and the floating action; Escape closes). It knows the kind of day:
   - Future: "Nothing scheduled yet." + **Schedule meeting**.
   - Today: **Schedule meeting** + **Log meeting**.
   - Past: "No meeting was recorded for this day." + **Log a past meeting**.
   - Populated: a chronological list, one row per meeting, each row opens that meeting. Multiple meetings are individually selectable. The day's actions stay beneath the list.
   - Log / Schedule from a Day view open on that date (`meetingDraftDate`) and return to that day on the calendar after saving (calendar origin).
   - Cell `aria-label` now includes the count ("…, 2 on the calendar").
3. **Schedule Meeting: Date, Start time, End time, derived duration.** `DosTimeInput` is a DOS control: a text field that accepts typed times ("6", "6pm", "6:30 pm", "18:30", "noon"), a clock button, and an inline 15‑minute listbox (`role="listbox"` / `role="option"`, ArrowUp/Down, Home/End, Enter, Escape) rendered in normal flow beneath the field, so it never floats over the sticky action or clips. It posts `HH:MM` through a hidden input. Start and End are the same control at the same width in one row.
   - Default End = Start + 60 min. Until End is edited, changing Start moves End by the current interval (capped at 11:45 PM). After End is edited it is preserved.
   - End at or before Start sets `aria-invalid`, a visible `role="alert"` message, and `setCustomValidity`, so the form cannot submit. Cross‑midnight is not representable on one date and is treated as this error.
   - The scheduling stepper (`ScheduledDurationSelect`) is deleted. Duration is derived and still posted as `duration_minutes`, so both submit paths and the planned snapshot (`plannedStartAt` / `plannedEndAt` / `plannedDurationMinutes`) are unchanged.
4. **Log Meeting keeps its 15‑minute duration stepper** (`MeetingDurationSelector`, "15 minutes more/less").
5. **Scheduling Links.** White content‑first panel with a hairline border (no tinted nested cards). The page keeps the "Scheduling Links" title and description (now `#334155`, 15px). Empty: one sentence + one **Create scheduling link** action. Active: "N active", one **New scheduling link** action, compact rows (title · status / audience · duration / days · hours, Copy link, Edit). The global floating action is hidden on Links (mobile and desktop). User‑facing "invitation" wording is now "scheduling link" (editor sections label, Sharing "Open scheduling link", calendar conflict copy, save/copy messages, close label).

Demo fixtures (`/dos/app/preview?demo=dos2026`, pinned today 2026‑09‑04): `&links=active` adds two synthetic scheduling links (one active, one paused); Sep 7 has two scheduled meetings; Sep 3 has a meeting scheduled for 1 hr and logged as 1h 30m with the planned snapshot retained.

## Verification

- `npm run typecheck`, `npm run test:dos` (51 scripts), `npm run build`, `npm run smoke`, `npm run test:dos:visual` (16 scenes re‑recorded: mobile meetings without search, timeline/field/dashboard reflect the added demo meeting), `node scripts/dos-a11y-responsive-verification.mjs`, `npm run test:usa-168-person-ui` — all pass.
- Playwright behavior script (scratch, not committed) at 320 / 360 / 375 / 390 / 430 / 1440 in Chromium and 375 / 390 in WebKit, 0 failures across 8 runs × ~60 checks: no search on Calendar/Links and search on Timeline; every Day‑view state and its actions reachable (elementFromPoint on the action is the action, above nav and FAB); Escape closes; Log a past meeting opens dated 2026‑09‑01 with the stepper; Schedule from today opens dated 2026‑09‑04 with no stepper; Start/End equal width, same row, inside the form, no overflow; picker opens inline (`position: static`), selected option focused, visible, not under the sticky footer; arrows + Enter, Escape, pointer selection, typed entry ("7pm", "9:15 pm", "10:45 PM"), End‑follows‑Start, End preserved after edit, End‑before‑Start blocked, unparseable text rejected with the posted value unchanged; Links empty/active states, no FAB, no gray `#64748B` copy, no "invitation" wording, editor opens with "Open scheduling link".
- Regression scripts updated: `dos-schedule-meeting-form-regression.mjs` (Start/End contract), `dos-calendar-sync-regression.mjs` (Day view), `dos-table-invitations-regression.mjs` (wording).

Screenshots: `screenshots/corrections/` (mobile 390 for all eleven preview items, desktop 1440 for calendar / multi‑meeting Day view / open Start picker / active Links, WebKit 390 for the open picker and today's Day view).

## Not in this branch

Public booking write path, idempotency and person matching; the four open USA‑246 founder questions. Unchanged from the previous report.
