# USA-216 — Pilot: Log Meeting and Edit Meeting

Branch `ryan/usa-216-log-meeting-pilot` (stacked on USA-215). Implements spec §5.3 within B8/B10/B11: the approved compact form grammar and the 15-minute duration stepper, with every field, validation rule, persistence path, and dismissal protection preserved.

## Routes / components changed
| Where | Change |
| --- | --- |
| `src/components/dos/forms/FormPrimitives.tsx` → `DosFormSection` | Additive `variant="label"` (sentence-case 13.5/600 label, optional right-aligned `hint`, helper line, no icon tile) and `hint` prop. Default `section` variant unchanged, so every other form renders as before; the `title` strings are unchanged so regression anchors hold. |
| `MeetingFormContent` | Sections Date / Date & Time, Who was there?, Duration (hint "15-minute steps"), How did you connect? / What are you scheduling?, Notes adopt `variant="label"`. Attendee chips use the shared `Chip` (same `Remove <name>` labels, whole-chip truncation); "Add person" is a tokenized dashed chip. Primary action is the spec `Button` (`variant="primary"`, 48px) inside the unchanged `StickyFormFooter`. |
| `MeetingLeaderReflectionSection` | "Meeting Notes" section adopts `variant="label"`; the "From this meeting" heading uses the blue section eyebrow; the four optional-outcome toggles (Accountability, Prayer request, Reminder, Observed Fruit) move to tokens (`aria-pressed`, behavior unchanged); the nested prayer/reminder fields and the More-people fields use the new `DosFormField labelVariant="sentence"` (additive prop; default caps unchanged elsewhere). |
| `scripts/dos-table-detail-edit-regression.mjs` | The assertion "must support custom hours and minutes" (which pinned the removed hours/minutes inputs) was rewritten to its surviving intent — any duration through the 15-minute stepper with no ceiling, same posted field — with the delta stated in the script. **Sub-15-minute precision for new entries is an intentional, V10-approved change**; existing values are never rounded. |
| `MeetingDurationSelector` | Preset pills (15m/30m/45m/1h/Custom + hours/minutes inputs) → shared `Stepper`: 15-minute steps, minimum 15, **no ceiling**, `aria-live` value, 44px buttons. Posts the same hidden `meeting_duration_minutes`; default stays 30; an existing meeting keeps its exact minutes and steps from there, so no saved duration is ever rounded. `meetingDurationOptions` and its type were removed (no other reader). |
| Primary labels | "Log Meeting" → "Log meeting"; "Save Meeting" → "Save meeting" (spec §6 sentence-case rule for form primaries; the task-screen titles "Log Meeting" / "Edit Meeting" are unchanged). |

Not changed: `MeetingPeopleSelector` (search, results, create-person path), `DosDateInput`, `MeetingContextPicker` and its production default ("In person"), `ConversationFlowPicker` and USAM gating, `DisclosureSection` "More people" with Ministry Team / Supporting Attendees, hidden `table_role`, `ObservedFruitMultiSelect`, `AccountabilityFields`, prayer/reminder fields, `MeetingRecommendationsPreview`, `FormMessage`, `StickyFormFooter`, every submit handler and API call, the unsaved-work guard, desktop offset.

## Behavior intentionally preserved
Attendees, dates, historical-meeting semantics (`dosDisplayTimeZone`, option labels for retired contexts), context, conversation flow, notes, prayer / reminder / accountability / fruit outcomes, validation, persistence (`/api/dos/app/meetings` POST/PATCH, reminders, accountability writer), review links, Edit keeps the meeting id, discard-on-dirty protection, Escape/Back routing, keyboard-safe sticky footer. Production defaults kept where V10 marks "Product logic — later" (context "In person", duration 30m, Fruit inside "From this meeting", no future-date redirect, no 4-hour confirm).

## Tests
- `npm run typecheck` ✓ · `npm run test:dos` ✓ 39/39 (incl. `dos-log-meeting-form`, `dos-table-detail-edit` with the rewritten duration assertion, `dos-scheduled-table-log`, `dos-meeting-lifecycle`, `usa-168-stabilization` 72/72).
- `npm run build` ✓ · `npm run test:dos:visual` before recording: **failed on exactly one scene, `mobile--log-meeting`** (the intended change; every other scene unchanged) · after `--update`: 8/8 ✓.

## Screenshots
Before: `docs/dos-ui-refresh/phase-4/screenshots/usa-214/mobile-390--04-log-meeting.png`. After: `./screenshots/usa-216/` (Log Meeting top / mid / end, optional outcomes open, Edit Meeting top / end, desktop Log Meeting) and the updated `mobile--log-meeting` visual baseline.

## Accessibility / overflow
Stepper buttons 44px with "15 minutes less/more" labels; chips keep `Remove <name>`; toggles keep `aria-pressed`; labels 13.5px at 5.8:1; no horizontal overflow (chips truncate).

## Known limitations / unresolved (spec §9 PL-3)
Compact "Today, Sep 4" date display, future-date block/redirect, 4-hour confirm, prayer "with" vs "for" rows, Fruit on the form vs afterward, and the 12px/15px type scale on the date picker remain production behavior until decided. Desktop uses the same form with the sidebar offset (no desktop frame in V10).

## Rollback
Revert the branch commit; the visual baseline for `mobile--log-meeting` reverts with it.
