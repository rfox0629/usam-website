// DOS meeting start times.
//
// The reported fault: meeting records read "started at 7 a.m." over and over.
// Two faults met to produce it, and both are held here.
//
//   1. Log Meeting never asked for a start time. It posted a synthetic local
//      noon for every logged meeting. 68 of the 72 logged rows in production
//      sit at exactly 12:00 in the time zone they were written in -- 17:00Z
//      for America/Chicago, 19:00Z for America/Phoenix -- and not one of those
//      times was entered by anybody.
//   2. The screens printed a clock time for a value that has no clock time. A
//      calendar date is parsed at noon UTC so it stays the day it says it is;
//      formatted as a TIME in the DOS display zone, noon UTC is 7:00 AM (6:00
//      AM outside daylight saving). The Meetings timeline asked `meeting.date`
//      what time it was, and 7:00 AM is what a day answered.
//
// What must now hold: a start time is entered, may be left unknown, is read
// and written in the DOS display zone across daylight saving, is preserved
// when a scheduled meeting is completed, and is never invented by a screen.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";

register("./ts-loader.mjs", import.meta.url);

const {
  dosDisplayTimeZone,
  hasDisplayClockTime,
  zonedClockTime,
  zonedDateTimeIso,
} = await import("../src/lib/dos/display-dates.ts");
const { dosMeetingDurationMinutes } = await import("../src/lib/dos/meeting-lifecycle.ts");
const { dosLoggedMeetingMinutes } = await import("../src/lib/dos/ministry-report.ts");

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const client = read("app/dos/app/DosMvpAppClient.tsx");
const route = read("app/api/dos/app/meetings/route.ts");
const loader = read("src/lib/dos/missionary-app.ts");
const report = read("src/lib/dos/ministry-report.ts");
const migration = read("supabase/migrations/20260916120000_dos_meeting_start_time.sql");
const rollback = read("supabase/migrations/20260916120000_dos_meeting_start_time_rollback.sql");
const repair = read("supabase/migrations/20260916121000_dos_meeting_start_time_repair.sql");
const repairRollback = read("supabase/migrations/20260916121000_dos_meeting_start_time_repair_rollback.sql");

/* ---------------------------------------------------------------- 1. the zone */

assert.equal(dosDisplayTimeZone, "America/Chicago", "The DOS display zone is the zone entered times are read in.");

// Entering 6:30 PM means 6:30 PM, on both sides of the daylight-saving change.
assert.equal(zonedDateTimeIso("2026-09-16", "18:30"), "2026-09-16T23:30:00.000Z", "A summer 6:30 PM is UTC-5.");
assert.equal(zonedDateTimeIso("2026-01-16", "18:30"), "2026-01-17T00:30:00.000Z", "A winter 6:30 PM is UTC-6.");
assert.equal(zonedClockTime("2026-09-16T23:30:00.000Z"), "18:30", "A summer instant reads back as what was entered.");
assert.equal(zonedClockTime("2026-01-17T00:30:00.000Z"), "18:30", "A winter instant reads back as what was entered.");

// Round-trips on every 15-minute step of a DST-transition day, in both
// directions, because those are the days an offset assumption breaks.
for (const day of ["2026-03-08", "2026-11-01", "2026-06-15", "2026-12-15"]) {
  for (let minutes = 0; minutes < 24 * 60; minutes += 15) {
    const clock = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    const instant = zonedDateTimeIso(day, clock);

    if (day === "2026-03-08" && minutes >= 2 * 60 && minutes < 3 * 60) {
      // The 2 a.m. hour does not exist that morning. Each step inside the gap
      // resolves forward by the hour the clock actually jumped.
      const forward = `${String(Math.floor(minutes / 60) + 1).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
      assert.equal(zonedClockTime(instant), forward, `${clock} is inside the spring-forward gap and must resolve forward.`);
      continue;
    }

    assert.equal(zonedClockTime(instant), clock, `${day} ${clock} must round-trip through the display zone.`);
  }
}

// Date boundaries: the last quarter-hour of a day stays on that day, and the
// first stays on it too, when read back in the zone it was entered in.
assert.equal(zonedDateTimeIso("2026-09-16", "23:45"), "2026-09-17T04:45:00.000Z", "Late evening crosses into the next UTC day.");
assert.equal(zonedClockTime("2026-09-17T04:45:00.000Z"), "23:45", "...and still reads as 11:45 PM on the 16th.");
assert.equal(zonedDateTimeIso("2026-09-16", "00:00"), "2026-09-16T05:00:00.000Z", "Midnight is the start of the entered day.");

// Unknown stays unknown. Nothing here has a substitute value to hand back.
assert.equal(zonedDateTimeIso("2026-09-16", ""), null, "A blank time is unknown, not midnight.");
assert.equal(zonedDateTimeIso("2026-09-16", null), null, "A missing time is unknown.");
assert.equal(zonedDateTimeIso("", "18:30"), null, "A missing date cannot make an instant.");
assert.equal(zonedDateTimeIso("2026-09-16", "25:00"), null, "A malformed time is refused, not coerced.");

/* ------------------------------------------------- 2. a day has no clock time */

assert.equal(zonedClockTime("2026-09-16"), null, "A calendar date carries no clock time.");
assert.equal(hasDisplayClockTime("2026-09-16"), false, "A calendar date must never be shown as a time.");
assert.equal(hasDisplayClockTime("2026-09-16T17:00:00.000Z"), true, "An instant can be shown as a time.");
assert.equal(hasDisplayClockTime(null), false, "Nothing has no clock time.");

// The exact shape of the bug: the anchor a date-only value is parsed at is
// 7:00 AM in the display zone, and 6:00 AM outside daylight saving.
const anchorInSummer = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: dosDisplayTimeZone })
  .format(new Date("2026-09-16T12:00:00.000Z"));
const anchorInWinter = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: dosDisplayTimeZone })
  .format(new Date("2026-01-16T12:00:00.000Z"));
assert.equal(anchorInSummer, "7:00 AM", "The reported 7 a.m. is the date-only parse anchor read as a time.");
assert.equal(anchorInWinter, "6:00 AM", "...and it is 6:00 AM outside daylight saving, which is why it moved.");

assert(
  client.includes("function formatTime(value: string | null | undefined) {\n  if (!hasDisplayClockTime(value)) {\n    return \"\";\n  }"),
  "The one time formatter must refuse to print a clock time for a day.",
);
assert(
  !client.includes("formatTime(meeting.date)") && !client.includes("formatTime(meeting.scheduledStartAt ?? meeting.date)"),
  "No screen may ask a calendar date what time it is.",
);
assert(
  client.includes("const time = formatTime(meeting.scheduledStartAt);"),
  "The Meetings timeline must read the start time, which is where the repeated 7 a.m. was shown.",
);

/* ------------------------------------------- 3. the field, and unknown times */

assert(
  client.includes("function LoggedTableTimingFields(")
    && client.includes('<DosTimeInput\n          allowUnknown\n          label="Start time"\n          name="start_time"'),
  "Log Meeting must have a Start time field that can be left unknown.",
);
assert(
  client.includes('placeholder="Not recorded"'),
  "The Start time field must say what blank means.",
);
assert(
  /allowUnknown && value \? \(\s*<button/.test(client) && client.includes("Clear time"),
  "A recorded time must be clearable back to unknown when editing.",
);
assert(
  client.includes('const startTimeInput = String(formData.get("start_time") ?? "").trim();')
    && client.includes("const loggedStartAt = displayZoneDateTimeIso(tableDate, startTimeInput);"),
  "Both save paths must build the start from the entered time, in the display zone.",
);
assert(
  (client.match(/const loggedStartAt = displayZoneDateTimeIso\(tableDate, startTimeInput\);/g) ?? []).length === 2,
  "Log Meeting and Edit Meeting must share one rule for the start time.",
);
assert(
  !/localDateTimeIso/.test(client),
  "Saving must not read a clock time in the browser's zone.",
);
assert(
  !/"12:00"/.test(client.slice(client.indexOf("function handleMeetingSubmit"))),
  "No save path may fall back to noon.",
);
assert(
  client.includes("function displayZoneDateTimeIso(")
    && client.includes("return zonedDateTimeIso(dateValue, timeValue, dosDisplayTimeZone);"),
  "The save path must interpret the entered clock in the DOS display zone.",
);
assert(
  client.includes("timezone: dosDisplayTimeZone,"),
  "The saved record must name the zone its clock times are expressed in.",
);

// Duration is a separate field, in 15-minute increments, and survives an
// unknown start time.
assert(
  client.includes('name="meeting_duration_minutes"') && client.includes("step={15}"),
  "Duration stays its own 15-minute control.",
);
assert(
  client.includes("{durationSelector}") && !client.includes('name="actual_start_time"'),
  "The Adjust time disclosure is replaced by the plain Start time field.",
);

/* ------------------------------ 4. a length without a start, and equal totals */

assert.equal(dosMeetingDurationMinutes({ durationMinutes: 45 }), 45, "A recorded duration needs no start time.");
assert.equal(
  dosMeetingDurationMinutes({ scheduledStartAt: "2026-09-16T17:00:00Z", scheduledEndAt: "2026-09-16T18:15:00Z" }),
  75,
  "A row written before the duration column still reports its length.",
);
assert.equal(dosMeetingDurationMinutes({ durationMinutes: 0 }), null, "A non-positive duration is no duration.");
assert.equal(dosMeetingDurationMinutes({}), null, "Nothing recorded is not an estimate.");

// The report counts the same minutes before and after the start time is
// removed, which is the whole reason duration got a column of its own.
const beforeRepair = { durationMinutes: null, scheduledStartAt: "2026-09-16T17:00:00Z", scheduledEndAt: "2026-09-16T18:30:00Z" };
const afterRepair = { durationMinutes: 90, scheduledStartAt: null, scheduledEndAt: null };
assert.equal(dosLoggedMeetingMinutes(beforeRepair), 90, "The synthetic-noon row counted 90 minutes.");
assert.equal(dosLoggedMeetingMinutes(afterRepair), 90, "The repaired row counts exactly the same 90 minutes.");

assert(
  loader.includes("durationMinutes: dosMeetingDurationMinutes({"),
  "The loader must expose a meeting's recorded duration.",
);
assert(
  loader.includes("planned_timezone, logged_at, duration_minutes, timezone"),
  "The loader must select the duration column.",
);
assert(
  report.includes("durationMinutes: meeting.durationMinutes,"),
  "The Master Ministry Report must read the recorded duration.",
);
assert(
  client.includes("if (typeof meeting.durationMinutes === \"number\" && meeting.durationMinutes > 0) {"),
  "Person and circle time must read the recorded duration before falling back to the start/end pair.",
);
assert(
  route.includes("function asDurationMinutes(value: unknown)") && route.includes("duration_minutes: durationMinutes,"),
  "The write path must persist the duration on its own.",
);
assert(
  route.includes('const durationKeys = ["duration_minutes"];'),
  "The duration column must be droppable so code deployed ahead of the schema still writes.",
);

/* ------------------------- 5. a scheduled meeting keeps the time it was set for */

assert(
  client.includes('const loggedStartTimeDefault = timeInputValueFromDateTime(scheduledStartAtDefault ?? plannedStartAtDefault, "");'),
  "Completing a scheduled meeting must open on the time it was scheduled for.",
);
assert(
  client.includes('plannedStartAtDefault={selectedMeeting.plannedStartAt ?? (selectedMeeting.meetingStatus === "scheduled" ? selectedMeeting.scheduledStartAt : null)}'),
  "The plan must stay readable after the status flips to logged.",
);
const loggingBlock = client.slice(client.indexOf("if (isLoggingScheduledMeeting) {"), client.indexOf("if (isLoggingScheduledMeeting) {") + 1000);
assert(
  !/planned(Date|StartAt|EndAt|Timezone|DurationMinutes)/.test(loggingBlock),
  "A logging write must not carry the planned snapshot, so the server cannot overwrite it.",
);
// The server-side half of the same guarantee: before this change
// `plannedSnapshotFields` substituted today's date for a missing planned date,
// so its "no plan was sent" test could never fire and every update wrote a
// blank plan over a real one.
assert(
  route.includes("const plannedDate = asNullableDateString(payload.plannedDate);")
    && route.includes("function asNullableDateString(value: unknown)"),
  "A missing planned date must stay missing, or logging silently erases the plan it was meant to protect.",
);
assert(
  route.includes("if (!plannedStartAt && !plannedEndAt && !plannedDate && !plannedTimezone && !plannedDurationMinutes) {"),
  "A payload carrying no plan must write no plan.",
);
assert(
  client.includes("payload.plannedStartAt = scheduledStartAt;"),
  "Rescheduling a meeting must move the plan with it.",
);

/* ------------------------------------------- 6. what happens to what is stored */

assert(
  migration.includes("add column if not exists duration_minutes integer"),
  "The migration must add the duration column.",
);
assert(
  !/alter\s+column|drop\s+column(?!\s+if exists)/i.test(migration),
  "The migration must not alter or drop an existing column.",
);
assert(
  migration.includes("set duration_minutes = greatest(1, round(extract(epoch from (scheduled_end_at - scheduled_start_at)) / 60)::int)"),
  "Every duration readable today must be preserved before anything is cleared.",
);
assert(
  migration.includes("create table if not exists public.dos_meeting_start_time_repair"),
  "Every repaired row's previous values must be recorded.",
);

// The schema step must be safe to apply before the code that reads the new
// column, so it may not clear anything on its own. Clearing the starts before
// the code is live would leave 68 logged meetings with no derivable duration
// and drop the report totals for as long as the gap lasted.
assert(
  !/scheduled_start_at\s*=\s*null/.test(migration),
  "The schema step must not clear any timestamp; that is the separate repair step.",
);

// The repair must re-sync duration from the start/end pair first: while the
// old code is still live it writes that pair without knowing about
// `duration_minutes`, so a meeting logged in that window has none and one
// edited in that window has a stale one. Clearing the start before fixing
// that would destroy a duration or freeze a wrong one.
assert(
  repair.includes("set duration_minutes = greatest(1, round(extract(epoch from (scheduled_end_at - scheduled_start_at)) / 60)::int)")
    && repair.includes("and duration_minutes is distinct from greatest(1, round(extract(epoch from (scheduled_end_at - scheduled_start_at)) / 60)::int);"),
  "The repair must re-sync duration from the start/end pair before clearing anything.",
);
assert(
  repair.indexOf("set duration_minutes =") < repair.indexOf("insert into public.dos_meeting_start_time_repair"),
  "The duration re-sync must come before the rows are recorded and cleared.",
);

for (const condition of [
  "where meeting_status = 'logged'",
  "and planned_start_at is null",
  "and timezone is not null",
  "and scheduled_start_at is not null",
  "to_char(scheduled_start_at at time zone timezone, 'HH24:MI') = '12:00'",
]) {
  assert(repair.includes(condition), `The repair must be scoped by: ${condition}`);
}
// The repair's only write is "both timestamps become null", and only for a row
// whose duration is already recorded. Nothing is shifted by an interval, and
// no other column is assigned.
assert(
  repair.includes(`update public.missionary_tables
set scheduled_start_at = null,
    scheduled_end_at = null
where id in (select meeting_id from public.dos_meeting_start_time_repair)
  and duration_minutes is not null;`),
  "A provably invented start becomes unknown, and only once its duration is safely recorded.",
);
assert(
  !/interval\s*'|at time zone[^\n]*\+/i.test(repair),
  "No timestamp arithmetic may appear in the repair.",
);
assert(
  !/table_date\s*=|notes\s*=|field_person_ids\s*=|participant_names\s*=/.test(repair),
  "The repair must not touch dates, notes, attendance or participants.",
);
assert(
  repairRollback.includes("set scheduled_start_at = repair.previous_scheduled_start_at")
    && repairRollback.includes("and meetings.scheduled_start_at is null"),
  "The repair rollback must restore exactly the rows it cleared, from their recorded values.",
);
assert(
  rollback.includes("drop column if exists duration_minutes"),
  "The schema rollback must drop the column it added.",
);

console.log("DOS meeting start time regression passed.");
