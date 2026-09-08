# USA-246 Phase 1 — architecture and lifecycle audit (read-only)

2026-09-08, against `main` `554039e` and production (read-only SQL; counts and shapes only, no personal data reproduced). **Nothing was mutated.** This is the gate the issue requires before any persistence change.

## 0. The headline

**Logging a scheduled meeting destroys the time it was scheduled for.** `missionary_tables` has exactly one pair of time columns, and both the plan and the actual are written to it. When a scheduled meeting is logged the client writes a synthetic local-noon start plus the actual duration:

```
const loggedStartAt = localDateTimeIso(tableDate, "12:00");
const loggedEndAt   = loggedStartAt + durationMinutes;
payload.scheduledStartAt = loggedStartAt;   // overwrites the plan
payload.scheduledEndAt   = loggedEndAt;
```

Production confirms it: **all 59 logged meetings start at exactly 12:00 local time.** Not one retains the hour it actually happened, or the hour it was planned for. The duration survives only as `end − start`.

Everything else in the lifecycle is in better shape than the issue assumes — including one thing the issue asks to build that already exists. This one defect is the real work, and it is the one thing that needs a schema decision from you.

## 1. Data model as it stands
`missionary_tables` (the meeting record) columns relevant here:

| Column | Role today |
| --- | --- |
| `table_date` (date, not null) | the day, used for ordering and the calendar |
| `meeting_status` (text, not null) | `scheduled` · `logged` · `canceled` (a third value exists in data) |
| `scheduled_start_at`, `scheduled_end_at` (timestamptz, nullable) | **both** the planned time and, after logging, the actual duration |
| `timezone` (text) | IANA zone captured at write time |
| `google_sync_enabled` (bool) | whether an external event was created |
| `field_person_ids`, `participant_names` (arrays) | attendees |

There is **no** `actual_*` column, **no** `duration_minutes`, **no** `logged_at`, and **no** reference to the scheduling link that produced the meeting.

Production distribution:

| Status | Rows | Start at 12:00 local | Google sync | Range |
| --- | --- | --- | --- | --- |
| logged | 59 | **59** | 0 | 2026-06-26 → 2026-09-02 |
| scheduled | 6 | 0 | 5 | 2026-06-24 → 2026-08-14 |
| canceled | 1 | 0 | 1 | 2026-06-26 |

## 2. Scheduled → logged linkage
**There is no duplicate, and that part is already right.** Logging PATCHes the same row and flips `meeting_status` from `scheduled` to `logged`; no second record is created. The scheduled item leaves the calendar's scheduled set and enters the logged set because both read the same row.

What is missing is only the separation of planned from actual. The transition currently:
- keeps the row, attendees, notes, type and workspace — correct;
- writes the reflection (Observed Fruit, prayer needs, follow-up) — correct;
- **overwrites** the planned start and end — the defect.

## 3. Needs logging — already correct
`calendarItemNeedsLogging` requires `source === "table"`, `meetingStatus === "scheduled"`, and a scheduled **end timestamp** in the past. It is based on the timestamp and status, not the calendar date, which is exactly what the issue asks for. No change needed.

## 4. The month calendar — already interactive
The issue describes a calendar where "tapping dates does nothing". That is no longer true on `main`:

- Every date cell is a `<button>` with a full-date `aria-label` and `aria-pressed`; none is disabled.
- Tapping a date calls `openDayAgenda`, which selects the date and opens a **Day agenda** sheet.
- Each cell shows up to two event chips and then `+N more`, so multiple meetings never overflow the cell.
- Tapping an event calls `openCalendarItem`, which opens that meeting, reminder or external event.
- Month/week view modes, a Calendar settings sheet, reminder and external-calendar overlays, and Google connect/refresh all already exist.

**What is genuinely missing** from the interaction matrix:
- The Day agenda has **no add action at all** — no Schedule meeting, no Log meeting, and nothing that varies by whether the date is past, today or future. Its empty state reads "Nothing scheduled for this day." with only a "Full Month" button.
- The date's own state (past / today / future) is not used anywhere to choose the offered action.

## 5. Meetings navigation
Today: a two-option `PillRail` (Calendar · Timeline) plus a separate calendar-settings entry point, and **Scheduling Links live in a sheet** (`isMeetingsInviteSheetOpen`), not a tab. The addendum's Calendar / Timeline / **Links** rail does not exist yet. The canonical `Segmented` control the Person rail now uses (44px, equal widths, content-aligned) is the right control to adopt — that change is already made in the Person polish PR.

## 6. Scheduling links and public booking
The engine exists and is real: `dos_table_invitations` (token, kind, status, host mode, settings JSON, `public_enabled`) and `dos_table_invitation_bookings` (invitation, workspace, person, **`table_id`**, requester fields, status, start/end, timezone, `calendar_event_synced`). Public routes: `/dos/book/[token]` and `POST /api/dos/book/[token]`. Availability, minimum notice, buffers, booking horizon and busy intervals (DOS meetings, DOS reminders, Google free/busy) are all implemented in `table-invitations.ts` / `table-invitation-data.ts`.

Production: **3 invitations, all active and public, 4 bookings.**

Three findings:

1. **No booking has ever reached the DOS calendar.** All four bookings have `table_id = null`, even though all three invitations now carry `calendarRules.createDosMeeting: true`. A booking only creates a meeting when that flag is on at booking time, so either the flag was off when these were taken or the create failed; either way the observable state is that bookings and meetings are unlinked in production, and the founder-visible promise "a booking appears on the calendar" is currently unmet. The schema already supports the link (`bookings.table_id` → `missionary_tables.id`), so **this needs no migration** — only a correct, verified write path.
2. **No idempotency.** There is no unique constraint on `dos_table_invitation_bookings` beyond the primary key, and no dedup key in the insert. A double-tapped confirm, or two people racing for one slot, can create two bookings — and, with `createDosMeeting` on, two scheduled meetings. The slot re-check before insert narrows but does not close the race.
3. **Person matching is email-only.** `resolveOrCreatePublicPerson` matches `missionary_field_people` on `email ilike`, workspace-scoped, and otherwise **inserts a new person**. A known person booking with a different address silently becomes a second record — the exact duplicate creation the issue forbids. Name and phone are not consulted, and the duplicate-detection helpers used elsewhere in DOS are not reused here.

## 7. Timezone and DST
Slot generation and date keys format through `Intl.DateTimeFormat` with an explicit `timeZone`, so zone conversion and DST transitions are handled by the platform rather than by offset arithmetic. The invitation carries its own timezone; the meeting row stores the timezone captured at write time. No defect found. The one caveat is §0: the synthetic noon stamp is computed in the *browser's* local zone at logging time, so a leader logging from a different zone than the meeting's shifts the stored instant.

## 8. Permissions and workspace isolation
Every read and write goes through `requireDosWorkspaceRouteAccess` / workspace-scoped filters with a `workspace_id`-or-`household_id` fallback for pre-migration rows. The public booking route is deliberately unauthenticated but resolves the workspace from the link token and scopes every query to it. Bookings and invitations both cascade from `missionary_households`. No isolation gap found.

## 9. Migration: what is and is not needed
**Needed (founder decision):** separating planned from actual. There is nowhere to put an actual time today, which is why the plan is overwritten.

*Recommended, additive and reversible:*
```sql
alter table missionary_tables
  add column actual_start_at timestamptz,
  add column actual_end_at   timestamptz;
```
- Backfill: for `meeting_status = 'logged'`, copy the current `scheduled_*` into `actual_*` (that pair is already the actual duration), and leave `scheduled_*` untouched.
- The 59 historical rows cannot recover their true planned or actual clock time — it was never stored. They keep the noon stamp as the actual, which is what the app shows today, so nothing regresses.
- Logging then writes `actual_*` only and never touches `scheduled_*`.
- Reads prefer `actual_*` when present, else `scheduled_*`. Reverting the code restores today's behaviour with the columns simply unread.
- Rollback: `alter table … drop column`.

*Also recommended, separately:* a unique index for booking idempotency, e.g. `create unique index … on dos_table_invitation_bookings (invitation_id, start_at) where status = 'booked';`. This one can fail on existing duplicates, so it needs a check first (there are none today: 4 bookings, 4 distinct slots).

**Not needed:** the booking → meeting link (the column exists), Needs-logging (correct), calendar interactivity (exists), timezone handling (sound), and the Links tab (pure UI over the existing engine).

**No production data correction is proposed here**, and none has been executed.

## 10. Recommended sequencing
1. **Now, no schema:** the Calendar / Timeline / Links rail on the canonical segmented control; Links as a full tab over the existing engine; date-state-aware actions in the Day agenda (future → Schedule, today → Schedule or Log, past → Log a past meeting).
2. **After your schema decision:** planned-vs-actual columns, then Log Meeting's actual duration and Adjust time, then the calendar and time reporting reading actual values.
3. **Then:** Schedule Meeting's Start + End with derived duration (it can land before the schema change, but it is most useful once actual time exists).
4. **Then:** booking → meeting write path with idempotency, and person matching that reuses DOS's duplicate detection instead of email-only.

## 11. Open questions for you
1. Approve the additive `actual_start_at` / `actual_end_at` columns and the backfill above?
2. Approve the booking idempotency unique index?
3. Bookings currently never appear on the DOS calendar. Do you want that switched on for the three live links once the write path is verified — and do you want the two existing links that predate it left alone, or their four historical bookings linked to meetings retroactively (a data change, not proposed)?
4. Person matching on booking: keep email-only, or reuse DOS's name/phone/email duplicate detection and surface a possible match rather than creating a record?
