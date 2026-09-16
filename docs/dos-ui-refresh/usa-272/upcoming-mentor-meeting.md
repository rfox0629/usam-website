# USA-272 follow-up — My Record's missing upcoming mentor meeting

Ryan's Meetings calendar showed a scheduled meeting with Dirk Bond on
16 September. My Record's Overview said **"Nothing scheduled."** Both were
telling the truth about different things.

## Cause

The Upcoming meeting card never read meetings. It read `follow_up_date` on
**past** `dos_user_mentor_meetings` rows — the optional "when next?" note the
Log Discipleship Meeting form offers:

```ts
// before
function myRecordNextFollowUp(record: DosAppUserRecord) {
  return [...record.mentorMeetings]
    .filter((meeting) => meeting.followUpDate && isUpcomingDate(meeting.followUpDate))
    …
}
```

Scheduling a meeting on the calendar writes a `missionary_meetings` row with
`meeting_status = 'scheduled'` and `scheduled_start_at`. It does not — and
should not — reach back and stamp a follow-up date onto an old discipleship
log. So no meeting scheduled through Meetings could ever appear on the card,
however correctly it was saved. Nothing was mis-linked, nothing was lost, and
no data needed repair: the card was reading the wrong field.

The diagnosis is from the code path, not from a production query: this
session did not open a production session or run any SQL. The production
shape it has to hold is the one USA-272 recorded — five
`dos_user_mentor_meetings` rows, two `dos_user_mentor_relationships` rows,
Dirk as Person `61ec2d81…` and the counterpart of relationship `40dd5e84…`
— and that shape is reproduced in the regression fixture below, including
Dirk's "no structured Person role, relationship only" case.

## Fix

A new module, `src/lib/dos/my-record-meetings.ts`, decides three things and
writes nothing:

1. **Who is discipling the account holder**, by Person id. It calls
   `dosMinistryDirectionForPerson` — the same resolution the Master Ministry
   Report uses, so the two cannot drift: the Person's structured role is
   canonical (USA-251), an active My Record relationship is the fallback when
   the Person carries no direction. People the account holder *disciples* are
   excluded, including the stored conflict case where a stale relationship row
   disagrees with the Person record. No name is ever matched.
2. **The next scheduled meeting**, from the rows the Meetings calendar itself
   reads, filtered to those people. `meeting_status = 'scheduled'` only, so a
   canceled meeting and an already-logged one are both out. "Upcoming" is
   day-granular in the DOS display time zone, so a meeting later *today*
   still counts — that is the 16 September case. A repeating rhythm is stored
   as one row per occurrence, so the earliest qualifying row is the next
   occurrence.
3. **The last meeting**, preserving every personal discipleship log.

The card shows the person, the date and the scheduled time, and opens that
existing meeting through `openMeetingDetail` — the same handler the Meetings
calendar uses. It does not copy the meeting into My Record.

Empty state: **"No meeting scheduled with someone discipling you."** with
**Schedule**, not Log. Schedule opens the app's existing schedule-meeting form
and pre-fills a Person only when exactly one person is discipling the account
holder; with several it leaves the choice to the form rather than picking one.

The shared People record layout is unchanged and the mentor roster stays
retired.

### A decision worth naming: Last meeting now reads both sources

Last meeting used to read only the personal discipleship logs. It now shows
whichever is more recent: the latest personal log, or a **logged** calendar
meeting with one of those same people. Personal logs are never dropped — the
discipleship form records the direction, so every one of them qualifies even
when it carries no Person link — and a same-day tie still goes to the log,
which is what the card showed before.

The reason is that the pair is one question asked backwards and forwards. If
Upcoming reads the calendar and Last does not, then the moment the 16
September meeting is logged on the calendar, Upcoming empties and Last still
points at an older log. The alternative — leaving Last on logs alone — is a
one-line change to `dosMyRecordLastMeeting` if the founder prefers it.

Nothing is merged, de-duplicated or counted. The card displays one record and
opens it. `MyRecordReportPanel` and the Reports totals are untouched, so
there is no double-count and no duplicate event.

### Shared display dates

`isUpcomingDate` and the date primitives under it lived inside the 47k-line
`DosMvpAppClient.tsx`, where no test could reach them. They moved to
`src/lib/dos/display-dates.ts` unchanged and the client imports them, so the
screens and the selection logic read one clock rather than two
implementations of "which day is this". `isUpcomingDate` now takes an optional
`now`, which is what makes the time-zone and date-boundary cases testable; the
screens pass nothing and read the wall clock exactly as before. The
`dosDisplayTimeZone` assertions in `dos-group-home-ux-regression.mjs` and
`dos-group-home-readiness-regression.mjs` were repointed at the new home; the
requirement they hold (the shared group time zone) is unchanged.

This is a pure move. It does **not** fix the pre-existing render-time
wall-clock hazard USA-272 flagged (`reportNow`, the accountability day key,
`dayOffsetFromToday` and the render-time `new Date()` reads around them). That
remains open.

## Regression coverage

`scripts/dos-my-record-mentor-meeting-regression.mjs` (49 checks, wired into
`npm run test:dos`) runs against the selection module with **relative** fixture
dates — a pinned `now` and offsets from it, so 16 September is never
permanently "tomorrow" and the suite means the same thing next year:

- linked mentor meetings, including a relationship-only link with no
  structured Person role (Dirk's production shape) and a Person-confirmed one;
- outgoing discipleship meetings excluded, and the Person-canonical conflict
  case excluded;
- canceled and completed meetings excluded from Upcoming, and canceled
  excluded from Last;
- recurring occurrences: the nearest future one wins whatever order the rows
  arrive in, an occurrence already past is not resurrected, and two meetings
  at the same instant resolve identically on every render;
- time zone and date boundaries: 23:30 tonight is still today though it is
  past midnight UTC, 23:30 last night is not, a bare calendar date reads the
  same at either end of its day, and the meeting drops off once the local day
  turns over;
- existing personal logs: still Last meeting, still never dropped for want of
  a Person link, still winning a same-day tie;
- ids only — rewriting every stored name changes no answer;
- the module performs no write and no fetch, and no note, reflection or
  counsel field enters it.

`scripts/dos-my-record-mentor-meeting-browser.mjs` (wired into CI, screenshots
uploaded) drives the production build at **320, 390 and 1440**: the Upcoming
card names Dirk Bond with the scheduled time, the page does not scroll
horizontally, clicking the card opens that same scheduled meeting record, and
Dirk's own perspective — nobody disciples him — shows the empty wording with
Schedule and no Log. No application errors at any width.

## Evidence

| check | result |
|---|---|
| `npm run typecheck` | passed |
| `npm run test:dos` (62 suites) | passed |
| `npm run build` | passed |
| `scripts/dos-my-record-mentor-meeting-browser.mjs` @ 320/390/1440 | passed |
| `scripts/dos-my-record-browser.mjs` @ 320/390/1440 (USA-272's own suite) | passed, unchanged |
| `npm run test:dos:visual` | skipped — see below |

Screenshots: `test-results/usa-272-mentor-meeting/`.

## Data preservation

No migration, no write, no reseed, and no production access of any kind this
session — not a session, not a query. Every record, ownership boundary
(`record_id` / `workspace_id` / `user_id`), privacy setting, date and duration
is untouched, and the USA-270 unsaved-work guard is not on any path this
change touches — `test:dos-my-record-unsaved-work` and the browser guard check
both pass unchanged.

## Limitations

- **Production is not verified fixed.** Everything above is the local
  production build and the token-gated demo fixture. The fix is not fixed
  until it is deployed and Ryan sees the meeting on his own record.
- **Visual baselines.** Only `darwin-arm64` baselines exist; this work was done
  on `linux-x64`, where `test:dos:visual` prints a notice and exits 0. The
  `mobile--my-record` macOS baseline now describes the pre-change Upcoming
  card and must be re-recorded on macOS. No byte-for-byte visual pass should
  be claimed for this change.
- **Relationships with no Person link need a person's decision, not code's.**
  An active `dos_user_mentor_relationships` row whose `field_person_id` is
  null links to nobody. Nothing on the calendar can be attributed to it
  without matching `mentor_name` against participant names, which this change
  refuses to do — a name match is what USA-265 removed. Such rows are reported
  by `dosMyRecordUnlinkedDisciplerRelationships` rather than guessed at.
  Ryan's two production relationship rows both carry a `field_person_id`, so
  none is affected today; linking a future one is an edit on the relationship,
  and no code here will make that choice.
- **Meetings the calendar does not hold.** A meeting that exists only on a
  connected external calendar, and was never scheduled in DOS, is not in
  `data.meetings` and so cannot appear. That is the same boundary the
  Meetings calendar has.
