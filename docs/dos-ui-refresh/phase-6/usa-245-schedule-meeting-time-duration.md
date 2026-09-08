# USA-245 — Schedule Meeting: Start time and Duration overlap on phones

Production bug on mobile Schedule Meeting: the Start time input ran under the Duration stepper and the stepper sat across the right of the time field; opening the iOS time picker made it worse. Follow-up to USA-217, USA-236, USA-237.

## Cause (shared-component audit)
Not Schedule-specific CSS, not absolute positioning, not container overflow, not the date field.

1. **Breakpoint rule.** `ScheduledTableTimingFields` placed Start time and Duration in `DosFormGrid`, which pairs its cells from **380px**. On every iPhone width (390, 430) the two controls therefore shared a row in ~170px columns. That grid is right for two short values (name pairs, phone/email, date + select) and wrong for a time input beside a three-region stepper, each of which needs ~280px of its own.
2. **Shared time field on iOS Safari.** `<input type="time">` keeps its intrinsic width on iOS unless appearance is reset, so `w-full` did not make it obey the 170px cell; the input spilled to the right and the stepper (later in DOM order, white background) painted over it. The native picker then focused a field that was already visually under another control.

## Fix (narrowest canonical sources)
- `ScheduledTableTimingFields` gives Start time and Duration one row each (a one-column grid, normal flow, nothing positioned) at **every** width. Pairing them was re-checked at wider widths too: on the 768px tablet sheet the pair would get ~230px columns and "3 hrs 30 min" still clipped, so no breakpoint pairs them; the form body is at most 620px wide and a full-width stepper matches Log Meeting. `DosFormGrid` itself is unchanged, so every other form (Add Person, Prayer Partner, Reminder) renders exactly as before.
- `FieldTimeInputClass()` in `FormPrimitives`: the text-input class plus `block min-w-0 appearance-none` and a left-aligned `::-webkit-date-and-time-value`, so the time field stays inside its containing block on every engine. Used by the scheduled Start time and by the two time inputs on the availability sheet (same iOS quirk, no visual change elsewhere).
- Shared `Stepper`: below 360px the value region takes a fixed 1 : 1.4 : 1 share so "3 hrs 30 min" no longer clips at 320px; from 360px the three regions stay equal thirds as approved. The share is width-based, so a changing label never moves the minus/plus regions. Blue-tinted ends, 15-minute steps, the hidden field and the 56px height are untouched; Log Meeting and Time with God (the other Stepper consumers) are unchanged from 360px up.

No database, API, schema, auth, timezone, serialization, recurrence, persistence or navigation change. Posted fields (`scheduled_date`, `scheduled_time`, `duration_minutes`) and defaults are identical.

## Regression
`scripts/dos-schedule-meeting-form-regression.mjs` (in `test:dos`) now asserts the contract: Start time before Duration in a one-column grid with no `DosFormGrid`, no `grid-cols` and no absolute positioning in the timing block, the shared time-input class on the Start time field, and the Stepper's fixed regions. The Stepper anchors in `dos-form-primitives` and `dos-log-meeting-form` moved with the class string (intent unchanged).

## Evidence (production build of this branch, Chromium, browser clock pinned)
Measured with Playwright at 320 / 360 / 375 / 390 / 430 px (mobile emulation) and 768 px: bounding boxes of the Start time input and the Duration group never intersect, the input stays inside its label cell, the stepper starts below the input on every phone width, the document never overflows horizontally, and "3 hrs 30 min" never overflows its region. At 390px the same holds with the input focused, after a real tap on the input (the native picker is a browser popup outside the page raster; the underlying layout is what is asserted), with the field cleared and the form submitted (browser validation focuses the invalid field; the sticky Schedule action does not cover it), and at 130% text scaling. Keyboard: typing a time, then Enter on the minus and Space on the plus buttons step the value and the hidden field together.

| Screenshot | State |
| --- | --- |
| `screenshots/usa-245/mobile-390--05a-schedule-time-closed.png` | Closed time field above the full-width stepper |
| `screenshots/usa-245/mobile-390--05d-schedule-time-picker-open.png` | Time input active after a real tap (Chromium; the iOS wheel renders outside the page) |
| `screenshots/usa-245/mobile-390--05b-schedule-duration-long-label.png` | "3 hrs 30 min" |
| `screenshots/usa-245/mobile-390--05e-schedule-time-required-focus.png` | Required/validation focus state after Schedule with an empty time |
| `screenshots/usa-245/mobile-320--05-schedule-when.png` | Narrowest width, long label |
| `screenshots/usa-245/tablet-768--05-schedule-when.png` | Tablet sheet: the same stacked rows |

iOS Safari itself cannot be driven from this environment; the hosted Vercel preview of the branch is the founder check for the real wheel picker and safe areas (the sticky footer already reserves `env(safe-area-inset-bottom)`).

## Verification
`npm run typecheck` · `npm run test:dos-schedule-meeting-form` · `npm run test:dos` · `next build --webpack` · `npm run smoke` · a11y/responsive sweep · `git diff --check`. Visual baselines are macOS-only: the Log Meeting and Schedule scenes at 390px are pixel-identical to before from 360px up (the Stepper change is below 360px only), and the Schedule scene changes by design (stacked controls) — re-record once on macOS after merge.
