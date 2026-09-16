/**
 * USA-272 follow-up — My Record's missing upcoming mentor meeting.
 *
 * Reported: Ryan's Meetings calendar showed a meeting with Dirk Bond on
 * 16 September; My Record's Upcoming meeting card said "Nothing scheduled."
 * Cause: the card read `follow_up_date` on PAST `dos_user_mentor_meetings`
 * rows, so a meeting scheduled on the calendar could never reach it.
 *
 * These are behaviour checks against the selection module the card now uses,
 * plus the wiring that carries it to the screen. Every fixture date is
 * RELATIVE to a pinned `now`, so 16 September is never permanently "tomorrow"
 * and the suite still means the same thing next year.
 *
 *   node scripts/dos-my-record-mentor-meeting-regression.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./scripts/ts-loader.mjs", pathToFileURL("./"));

const {
  dosMyRecordDisciplerPersonIds,
  dosMyRecordLastMeeting,
  dosMyRecordMeetingDisciplerIds,
  dosMyRecordMeetingStartAt,
  dosMyRecordNextScheduledMeeting,
  dosMyRecordUnlinkedDisciplerRelationships,
} = await import("../src/lib/dos/my-record-meetings.ts");
const { isUpcomingDate } = await import("../src/lib/dos/display-dates.ts");

const failures = [];
const check = (ok, message) => {
  console.log(`${ok ? "  ok  " : "  FAIL"}  ${message}`);
  if (!ok) failures.push(message);
};

/* ---------- fixture ------------------------------------------------------
 * The reported day, expressed relatively. `now` is the middle of a day in
 * the DOS display time zone (America/Chicago, UTC-5 in September), and every
 * other date is an offset from it. Nothing below hard-codes a calendar date.
 */
const now = new Date("2026-09-16T14:00:00-05:00");
const DAY_MS = 24 * 60 * 60 * 1000;
const at = (dayOffset, hour = 9, minute = 0) => {
  const date = new Date(now.getTime() + dayOffset * DAY_MS);
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit", month: "2-digit", timeZone: "America/Chicago", year: "numeric",
  }).formatToParts(date);
  const value = (type) => parts.find((part) => part.type === type).value;

  return `${value("year")}-${value("month")}-${value("day")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00-05:00`;
};
const day = (dayOffset) => at(dayOffset).slice(0, 10);

const person = (id, name, roleInMyLife, status = "active") => ({ id, name, roleInMyLife, status });
const relationship = (id, fieldPersonId, mentorName, status = "active") => ({ fieldPersonId, id, mentorName, status });
const meeting = (id, personIds, meetingStatus, startAt, date = startAt) => ({
  date, fieldPersonIds: personIds, id, meetingStatus, scheduledStartAt: startAt,
});
const log = (id, meetingDate, mentorName, durationMinutes = 60) => ({ durationMinutes, id, meetingDate, mentorName });

/* Dirk disciples Ryan through a My Record relationship only -- his Person
   record carries no structured direction, exactly as production has it.
   Marty's Person confirms it. Sam is the conflict case: the Person says Ryan
   disciples Sam, a stale relationship row says the reverse. Tanner is simply
   someone Ryan disciples. */
const people = [
  person("p-dirk", "Dirk Bond", "not_active"),
  person("p-marty", "Marty Vanderzanden", "mentoring_me"),
  person("p-sam", "Sam Lucas", "discipling_them"),
  person("p-tanner", "Tanner Reed", "discipling_them"),
  person("p-old", "Archived Mentor", "mentoring_me", "archived"),
];
const relationships = [
  relationship("r-dirk", "p-dirk", "Dirk Bond"),
  relationship("r-sam", "p-sam", "Sam Lucas"),
  relationship("r-unlinked", null, "Someone With No Person Link"),
  relationship("r-ended", "p-tanner", "Tanner Reed", "archived"),
];
const disciplers = dosMyRecordDisciplerPersonIds(people, relationships);

/* ---------- 1. who counts as discipling the account holder --------------- */
check(disciplers.includes("p-dirk"), "1a. an active My Record relationship makes Dirk a discipler even with no structured Person role");
check(disciplers.includes("p-marty"), "1b. a Person confirmed as discipling me counts");
check(!disciplers.includes("p-sam"), "1c. the Person record is canonical: Sam, whom Ryan disciples, is excluded despite a stale relationship row");
check(!disciplers.includes("p-tanner"), "1d. someone the account holder disciples is never a discipler");
check(!disciplers.includes("p-old"), "1e. an archived Person is excluded, as it is in the report");
check(
  dosMyRecordDisciplerPersonIds(people, relationships.map((row) => ({ ...row, mentorName: "Dirk Bond" }))).sort().join()
    === disciplers.sort().join(),
  "1f. the answer comes from ids alone -- rewriting every stored name changes nothing",
);
check(
  dosMyRecordUnlinkedDisciplerRelationships(relationships).map((row) => row.id).join() === "r-unlinked",
  "1g. an active relationship with no Person link is reported, not guessed at from its name",
);
check(
  dosMyRecordDisciplerPersonIds([], [relationship("r-ghost", "p-ghost", "Not Loaded")]).join() === "p-ghost",
  "1h. a relationship pointing at a Person this workspace did not load still carries a real id",
);

/* ---------- 2. the reported fault --------------------------------------- */
/* The Sep 16 meeting, as the calendar holds it: a scheduled row for later
   today, linked to Dirk. The old card read a follow-up date on a past log and
   so found nothing. */
const sep16 = meeting("m-dirk-today", ["p-dirk"], "scheduled", at(0, 19));
const calendar = [
  sep16,
  meeting("m-dirk-past", ["p-dirk"], "logged", at(-9, 7)),
  meeting("m-tanner-next", ["p-tanner"], "scheduled", at(1, 10)),
  meeting("m-sam-next", ["p-sam"], "scheduled", at(1, 11)),
  meeting("m-dirk-canceled", ["p-dirk"], "canceled", at(2, 9)),
  meeting("m-dirk-later", ["p-dirk"], "scheduled", at(7, 9)),
  meeting("m-unlinked", [], "scheduled", at(1, 12)),
];

check(
  dosMyRecordNextScheduledMeeting(calendar, disciplers, now)?.id === "m-dirk-today",
  "2a. a meeting scheduled with a discipler later TODAY is the upcoming meeting -- the reported Sep 16 case",
);
check(
  dosMyRecordMeetingDisciplerIds(sep16, disciplers).join() === "p-dirk",
  "2b. the card can name the person from the meeting's own Person link",
);
check(dosMyRecordMeetingStartAt(sep16) === at(0, 19), "2c. the time shown is the calendar's own scheduled start");
check(
  dosMyRecordNextScheduledMeeting([meeting("m-legacy", ["p-dirk"], "scheduled", null, at(0, 19))], disciplers, now)?.id === "m-legacy",
  "2d. a row saved before scheduled_start_at existed falls back to its date, as the calendar does",
);

/* ---------- 3. what must NOT qualify ------------------------------------ */
check(
  dosMyRecordNextScheduledMeeting(calendar.filter((row) => row.id !== "m-dirk-today"), disciplers, now)?.id === "m-dirk-later",
  "3a. outgoing discipleship meetings (Tanner) and the conflict case (Sam) are skipped for a later real one",
);
check(
  dosMyRecordNextScheduledMeeting([meeting("m-c", ["p-dirk"], "canceled", at(1, 9))], disciplers, now) === null,
  "3b. a canceled meeting is never upcoming",
);
check(
  dosMyRecordNextScheduledMeeting([meeting("m-l", ["p-dirk"], "logged", at(1, 9))], disciplers, now) === null,
  "3c. a completed (logged) meeting is never upcoming, even dated ahead",
);
check(
  dosMyRecordNextScheduledMeeting([meeting("m-past", ["p-dirk"], "scheduled", at(-1, 9))], disciplers, now) === null,
  "3d. yesterday's scheduled meeting is not upcoming",
);
check(
  dosMyRecordNextScheduledMeeting([meeting("m-none", [], "scheduled", at(1, 9))], disciplers, now) === null,
  "3e. a scheduled meeting with nobody linked never qualifies",
);
check(
  dosMyRecordNextScheduledMeeting(calendar, [], now) === null,
  "3f. with nobody discipling the account holder there is no upcoming meeting, whatever else is on the calendar",
);

/* ---------- 4. a repeating rhythm --------------------------------------- */
/* A rhythm is stored as one scheduled row per occurrence. The card shows the
   NEXT occurrence, and the same one on every render. */
const weekly = [3, 10, 17, 24].map((offset) => meeting(`m-weekly-${offset}`, ["p-dirk"], "scheduled", at(offset, 7)));
check(
  dosMyRecordNextScheduledMeeting([...weekly].reverse(), disciplers, now)?.id === "m-weekly-3",
  "4a. the nearest future occurrence of a repeating rhythm wins, whatever order the rows arrive in",
);
check(
  dosMyRecordNextScheduledMeeting([...weekly, meeting("m-weekly-past", ["p-dirk"], "scheduled", at(-4, 7))], disciplers, now)?.id === "m-weekly-3",
  "4b. an occurrence already past is not resurrected",
);
const sameInstant = [
  meeting("m-b-tie", ["p-dirk"], "scheduled", at(2, 9)),
  meeting("m-a-tie", ["p-marty"], "scheduled", at(2, 9)),
];
check(
  dosMyRecordNextScheduledMeeting(sameInstant, disciplers, now)?.id === dosMyRecordNextScheduledMeeting([...sameInstant].reverse(), disciplers, now)?.id,
  "4c. two meetings at the same instant resolve to the same one on every render",
);

/* ---------- 5. time zone and date boundaries ---------------------------- */
/* "Upcoming" is day-granular in the DOS display time zone. These hold the
   edges that a UTC-based comparison gets wrong. */
const lateEvening = "2026-09-16T23:30:00-05:00";      // 04:30Z on the 17th
const earlyMorning = "2026-09-16T00:30:00-05:00";     // 05:30Z on the 16th
check(isUpcomingDate(lateEvening, now), "5a. tonight at 23:30 local is still today, not tomorrow, though it is past midnight UTC");
check(isUpcomingDate(earlyMorning, now), "5b. 00:30 this morning is still today: today counts as upcoming all day");
check(
  !isUpcomingDate("2026-09-15T23:30:00-05:00", now),
  "5c. 23:30 yesterday local is past, though its UTC instant falls on today's UTC date",
);
check(isUpcomingDate(day(0), now), "5d. a bare calendar date for today is upcoming");
check(!isUpcomingDate(day(-1), now), "5e. a bare calendar date for yesterday is not");
check(
  isUpcomingDate(day(0), new Date("2026-09-16T23:59:00-05:00")) && isUpcomingDate(day(0), new Date("2026-09-16T00:01:00-05:00")),
  "5f. the same day reads the same at either end of it",
);
check(
  dosMyRecordNextScheduledMeeting([meeting("m-tonight", ["p-dirk"], "scheduled", lateEvening)], disciplers, new Date("2026-09-17T00:30:00-05:00")) === null,
  "5g. once the local day turns over, last night's meeting is no longer upcoming",
);

/* ---------- 6. Last meeting keeps the personal logs --------------------- */
const logs = [
  log("l-dirk-recent", day(-2), "Dirk Bond", 70),
  log("l-dirk-earlier", day(-14), "Dirk Bond", 120),
  log("l-marty", day(-4), "Marty Vanderzanden"),
];
const last = dosMyRecordLastMeeting(logs, calendar, disciplers);
check(last?.kind === "discipleship_log" && last.log.id === "l-dirk-recent", "6a. the most recent personal discipleship log is Last meeting");
check(
  dosMyRecordLastMeeting(logs, [], disciplers)?.log?.id === "l-dirk-recent",
  "6b. with no calendar meetings at all, the personal logs still answer",
);
check(
  dosMyRecordLastMeeting([log("l-unlinked", day(-1), "Someone With No Person Link")], calendar, disciplers)?.log?.id === "l-unlinked",
  "6c. a personal log is never dropped for want of a Person link -- its form recorded the direction",
);
const withRecentCalendar = [...calendar, meeting("m-dirk-yesterday", ["p-dirk"], "logged", at(-1, 7))];
check(
  dosMyRecordLastMeeting(logs, withRecentCalendar, disciplers)?.meeting?.id === "m-dirk-yesterday",
  "6d. a more recent logged calendar meeting with a discipler is Last meeting",
);
check(
  dosMyRecordLastMeeting(logs, [...calendar, meeting("m-tanner-yesterday", ["p-tanner"], "logged", at(-1, 7))], disciplers)?.log?.id === "l-dirk-recent",
  "6e. a meeting with someone the account holder disciples never becomes Last meeting",
);
check(
  dosMyRecordLastMeeting([log("l-same", day(-1), "Dirk Bond")], withRecentCalendar, disciplers)?.kind === "discipleship_log",
  "6f. on the same day the personal log wins, which is what the card showed before",
);
check(
  dosMyRecordLastMeeting(logs, [...calendar, meeting("m-dirk-cancelled-recent", ["p-dirk"], "canceled", at(-1, 7))], disciplers)?.log?.id === "l-dirk-recent",
  "6g. a canceled meeting is not a meeting that happened",
);
check(dosMyRecordLastMeeting([], [], disciplers) === null, "6h. an empty record has no Last meeting");
check(
  dosMyRecordLastMeeting(logs, calendar, disciplers)?.log?.id === last?.log?.id,
  "6i. reading twice returns the same record: nothing is created or consumed",
);

/* ---------- 7. wiring on the screen ------------------------------------- */
const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");
const cards = client.slice(client.indexOf("function MyRecordMeetingCards"), client.indexOf("function MyRecordOverviewPanel"));

check(cards.includes("dosMyRecordNextScheduledMeeting(meetings, disciplerPersonIds)"), "7a. the card reads the Meetings source, scoped to disciplers");
check(cards.includes("onOpenScheduledMeeting(nextMeeting.id)"), "7b. the card opens that existing meeting rather than a copy of it");
check(cards.includes("No meeting scheduled with someone discipling you."), "7c. the empty state says what is actually being looked for");
check(cards.includes(">Schedule</PDButton>") && !cards.includes("Nothing scheduled."), "7d. the empty upcoming action is Schedule, and the old \"Nothing scheduled.\" wording is gone");
check(
  cards.includes("disciplerPersonIds.length === 1 ? disciplerPersonIds[0] : null"),
  "7e. Schedule pre-fills a Person only when there is exactly one; with several the form asks",
);
check(!cards.includes("followUpDate"), "7f. the follow-up-date reading is gone from the card");
check(!/mentorName === |\.name ===|includes\(person\.name\)/.test(cards), "7g. the card matches nothing by name");
check(
  client.includes("onOpenScheduledMeeting={openMeetingDetail}"),
  "7h. My Record opens a scheduled meeting through the same handler the Meetings calendar uses",
);
check(
  client.includes("onScheduleMeeting={(personId) => openScheduleMeeting(personId ?? undefined)}"),
  "7i. Schedule opens the app's existing schedule-meeting form",
);
check(
  client.includes("<MyRecordMeetingCards") && client.includes("meetings={data.meetings}"),
  "7j. the rows come from the loaded workspace meetings, not a second fetch",
);

/* Ownership, privacy and the write boundary: this change reads and only
   reads. The module takes narrowed records and has no write path. */
const module = readFileSync(new URL("../src/lib/dos/my-record-meetings.ts", import.meta.url), "utf8");
check(!/fetch\(|supabase|insert|update|upsert|delete/i.test(module), "7k. the selection module performs no write and no fetch");
check(!/notes|reflection|counselReceived|discussed/.test(module.replace(/\/\*[\s\S]*?\*\//g, "")), "7l. no note, reflection or counsel field enters the selection");

console.log(failures.length ? `\n${failures.length} failing check(s).` : "\nDOS My Record mentor meeting regression checks passed.");
if (failures.length) process.exit(1);
