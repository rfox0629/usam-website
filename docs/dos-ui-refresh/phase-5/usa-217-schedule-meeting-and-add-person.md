# USA-217 — Pilot: Schedule Meeting and Add Person

Branch `ryan/usa-217-schedule-and-person-pilot` (stacked on USA-216). Implements spec §5.4 and §5.5 within B8/B10/B11, using the same grammar as USA-216.

## Routes / components changed
| Where | Change |
| --- | --- |
| `ScheduleMeetingForm` | Sections Person, When, How will you connect? adopt `DosFormSection variant="label"`; the Date / Start time / Duration fields use sentence-case labels (the Log form's "Remind me" date label too); primary becomes the spec `Button` reading **"Schedule"** (spec §6) inside the unchanged `StickyFormFooter`. Person picker, hidden `table_role` and `google_sync_enabled`, Notes disclosure, Google sync toggle, invitation behavior unchanged. |
| `ScheduledDurationSelect` | Preset menu (30 / 45 / 60 / 90 / 120 + Custom minutes) → shared `Stepper`, 15-minute steps, minimum 15, no ceiling; same hidden field name and default (60); an existing scheduled duration keeps its exact minutes. |
| `MeetingPeopleSelector` (shared by Log's search mode and Schedule) | Selected-people chips use the shared `Chip` with the same `Remove <name> <context>` labels; search input and results unchanged. |
| `PersonFormContent` (Add / Edit Person) | Sections Person and Relationship adopt `variant="label"`; all 14 field labels, the Children label, the two date inputs (via an additive `DosDateInput labelVariant`), and the `PersonChoiceField` legends (relationship, how you know them, person role — used only by this form) move to the sentence-case 13.5/600 grammar; primary becomes the spec `Button`; labels "Add person" / "Save person" (spec §6). The USA-168 Basic form, its three questions, the Engagement disclosure (flag-gated), Household & Family / Address & Details / Notes disclosures, duplicate detection, and Save-outranks-Delete are unchanged. |
| `scripts/dos-field-contact-form-regression.mjs` | **Retired and rewritten (Phase 1 S7).** The July script asserted a pre-USA-168 section order ("Relationship & Ministry" as a disclosure, an `ImportantDatesReminderSection`, `showDetailsToggle`) that has not existed since 2026-09-04 and was the one pre-existing failure recorded in Phase 0. The replacement asserts the shipped USA-168 shape (Person → Relationship → optional Engagement → Household & Family → Address & Details → Notes; email in the Person section; independent disclosures; duplicate detection wired; sticky footer) and is added to `test:dos`. |

## Behavior intentionally preserved
Scheduling creates the same scheduled `missionary_tables` row (appears under Needs Logging), Google sync and invitations unchanged, reminder behavior unchanged; Person create/edit posts the same fields, phone stays required (production), no circle at creation (PL-5), Household stays a disclosure with spouse/children fields (B8), engagement hidden unless the Advanced Feature is on, Save outranks Delete, no reminder on edit. Production defaults kept where V10 marks "Product logic — later" (Repeat, reminder default, Where field absent because no such data exists).

## Tests
- `npm run typecheck` ✓ · `npm run test:dos` ✓ **40/40** (the rewritten `dos-field-contact-form` now runs in the aggregate; `dos-schedule-meeting-form`, `dos-log-meeting-form`, `dos-table-detail-edit`, 72/72 stabilization all pass).
- `npm run build` ✓ (36 s) · `npm run test:dos:visual` 8/8 ✓ unchanged (no baseline scene covers these forms; `log-meeting` and `person-record` did not move).

## Screenshots
Before: Phase 0 `05-schedule-meeting`, USA-208 `16-edit-person`. After: `./screenshots/usa-217/` (Schedule Meeting top/end, Schedule from a Person with the attendee chip, Add Person top/end, Edit Person, desktop Schedule and Add Person).

## Accessibility / overflow
Same as USA-216: 44px stepper buttons, labelled chips, sentence-case 13.5px labels at 5.8:1, no horizontal overflow.

## Known limitations / unresolved (spec §9 PL-4, PL-5, PL-10)
Date + time as one 44px pair with "Tue, Sep 8" display, Where field, Repeat row, reminder default, Relationship option list vs V10's, Circle at creation, single Name field vs First/Last, Contact optional vs phone required — all stay as production until decided.

## Rollback
Revert the branch commit (the field-contact script returns to its stale, failing form).
