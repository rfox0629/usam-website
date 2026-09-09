// USA-251 — Master Ministry Report / Time Investment.
//
// These checks hold the report contract the founder set on 2026-09-09
// (USA-250): recorded time only, check-ins separate from meetings, group time
// credited per person but never summed as unique elapsed time, completeness
// stated rather than inferred, no circle input, no multiplication claim
// without an explicit record, and nothing private in what flows upward.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildDosMinistryReport,
  buildDosSafeMinistrySummary,
  dosMinistryCompletenessLabels,
  dosMinistryDirectionForPerson,
  dosMinistryRelationshipDirectionLabels,
  dosMinistryReportDefaultRange,
  dosMinistryReportPeriod,
  dosMinistryReportRangeOptions,
  dosRecordedMeetingMinutes,
  dosSafeMinistrySummaryExcluded,
  dosSafeMinistrySummaryFields,
  dosUpstreamViewers,
  formatDosMinistryDate,
  formatDosMinistryMinutes,
} from "../src/lib/dos/ministry-report.ts";

const now = new Date("2026-09-09T12:00:00");

function day(offset) {
  const date = new Date(now);
  date.setDate(date.getDate() - offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function stamp(offset, hour, minute = 0) {
  return `${day(offset)}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}

const people = [
  { id: "dirk", name: "Dirk Bond", relationshipType: "Mentor · Friend · Exploring", roleInMyLife: "not_active", status: "new" },
  { id: "tanner", name: "Tanner Kent", relationshipType: "Discipling · Family · Exploring", roleInMyLife: "discipling_them", status: "new" },
  { id: "tanner-dup", name: "Tanner Kent", relationshipType: "new", roleInMyLife: "not_active", status: "archived" },
  { id: "philip", name: "Philip John Saco", relationshipType: "Discipling · Church · Exploring", roleInMyLife: "discipling_them", status: "new" },
  { id: "naomi", name: "Naomi Lee", relationshipType: "Walking With · Friend · Exploring", roleInMyLife: "walking_with_them", status: "new" },
  { id: "quiet", name: "Quiet Person", relationshipType: "new", roleInMyLife: "not_active", status: "new" },
];

const meetings = [
  // Tanner: two recorded meetings, one of them a group meeting shared with Philip.
  { date: stamp(3, 12), fieldPersonIds: ["tanner"], id: "m-tanner-1", meetingStatus: "logged", scheduledEndAt: stamp(3, 13, 30), scheduledStartAt: stamp(3, 12), source: "table", tableRole: "ministering", type: "kitchen_table" },
  { date: stamp(10, 18), fieldPersonIds: ["tanner", "philip"], id: "m-group", meetingStatus: "logged", scheduledEndAt: stamp(10, 20), scheduledStartAt: stamp(10, 18), source: "table", tableRole: "ministering", type: "discipleship" },
  // Philip: one meeting without recorded time -> Partial.
  { date: stamp(6, 10), fieldPersonIds: ["philip"], id: "m-philip-no-time", meetingStatus: "logged", scheduledEndAt: null, scheduledStartAt: null, source: "table", tableRole: "ministering", type: "coffee" },
  // Dirk: a meeting where Ryan was being discipled, plus a scheduled one.
  { date: stamp(2, 7), fieldPersonIds: ["dirk"], id: "m-dirk", meetingStatus: "logged", scheduledEndAt: stamp(2, 8), scheduledStartAt: stamp(2, 7), source: "table", tableRole: "being_mentored", type: "coffee" },
  { date: stamp(-5, 7), fieldPersonIds: ["dirk"], id: "m-dirk-next", meetingStatus: "scheduled", scheduledEndAt: stamp(-5, 8), scheduledStartAt: stamp(-5, 7), source: "table", tableRole: "being_mentored", type: "coffee" },
  // Outside the 30-day window, inside 90.
  { date: stamp(45, 12), fieldPersonIds: ["naomi"], id: "m-naomi-old", meetingStatus: "logged", scheduledEndAt: stamp(45, 13), scheduledStartAt: stamp(45, 12), source: "table", tableRole: "ministering", type: "coffee" },
  // Canceled and connection-sourced records never count as meetings.
  { date: stamp(4, 12), fieldPersonIds: ["naomi"], id: "m-naomi-canceled", meetingStatus: "canceled", scheduledEndAt: stamp(4, 13), scheduledStartAt: stamp(4, 12), source: "table", tableRole: "ministering", type: "coffee" },
  { date: stamp(4, 12), fieldPersonIds: ["naomi"], id: "connection-1", meetingStatus: "logged", scheduledEndAt: null, scheduledStartAt: null, source: "connection", tableRole: "ministering", type: "other" },
  // A meeting linked only to an archived duplicate.
  { date: stamp(5, 12), fieldPersonIds: ["tanner-dup"], id: "m-archived", meetingStatus: "logged", scheduledEndAt: stamp(5, 13), scheduledStartAt: stamp(5, 12), source: "table", tableRole: "ministering", type: "coffee" },
];

const checkIns = [
  { checkInDate: day(1), durationMinutes: 20, id: "c-tanner", personId: "tanner" },
  { checkInDate: day(8), durationMinutes: null, id: "c-naomi", personId: "naomi" },
];

const disciplingMe = [
  { fieldPersonId: "dirk", id: "rel-dirk", mentorName: "Dirk Bond", status: "active" },
  { fieldPersonId: null, id: "rel-marty", mentorName: "Marty Vanderzanden", status: "active" },
  { fieldPersonId: "naomi", id: "rel-ended", mentorName: "Naomi Lee", status: "archived" },
];

const chain = [
  { discipleDisplayName: "Placeholder disciple", disciplePersonId: null, disciplerPersonId: "tanner", id: "link-1", recordedAt: day(20), source: "explicit", status: "active" },
  { discipleDisplayName: "A", disciplePersonId: null, disciplerPersonId: "philip", id: "link-2", recordedAt: day(20), source: "explicit", status: "active" },
  { discipleDisplayName: "B", disciplePersonId: null, disciplerPersonId: "philip", id: "link-3", recordedAt: day(20), source: "explicit", status: "active" },
  { discipleDisplayName: "C", disciplePersonId: null, disciplerPersonId: "philip", id: "link-4", recordedAt: day(20), source: "explicit", status: "active" },
  { discipleDisplayName: "Ended", disciplePersonId: null, disciplerPersonId: "philip", id: "link-5", recordedAt: day(20), source: "explicit", status: "ended" },
];

const schedules = [{ id: "s-naomi", nextCheckIn: day(3), personId: "naomi", status: "active" }];

const build = (range, period) => buildDosMinistryReport({ chain, checkIns, disciplingMe, meetings, now, people, period, range, schedules });

// 1. Ranges: 30 days by default; 7 / 30 / 90 / custom offered; inclusive local days.
assert.equal(dosMinistryReportDefaultRange, "30d");
assert.deepEqual(dosMinistryReportRangeOptions.map((option) => option.value), ["7d", "30d", "90d", "custom"]);
assert.deepEqual(dosMinistryReportPeriod("30d", now), { end: "2026-09-09", range: "30d", start: "2026-08-11" });
assert.deepEqual(dosMinistryReportPeriod("7d", now), { end: "2026-09-09", range: "7d", start: "2026-09-03" });
assert.deepEqual(dosMinistryReportPeriod("custom", now, { end: "2026-08-01", start: "2026-08-31" }), { end: "2026-08-31", range: "custom", start: "2026-08-01" }, "A reversed custom range is normalised rather than rejected.");

const report = build("30d");
const rowFor = (id) => report.rows.find((row) => row.personId === id);

// 2. One row per person with qualifying activity, ranked by recorded time.
assert.deepEqual(report.rows.map((row) => row.personId), ["tanner", "philip", "dirk", "naomi"]);
assert.equal(rowFor("quiet"), undefined, "A person with no activity is not a row.");
assert.equal(rowFor("tanner-dup"), undefined, "Archived rows never appear.");

// 3. Meetings and time: recorded only; check-ins are separate; group time credited per person.
const tanner = rowFor("tanner");
assert.equal(tanner.meetingCount, 2);
assert.equal(tanner.recordedMinutes, 90 + 120);
assert.equal(tanner.checkInCount, 1);
assert.equal(tanner.checkInMinutes, 20);
assert.equal(tanner.completeness, "recorded");
const philip = rowFor("philip");
assert.equal(philip.meetingCount, 2, "The group meeting credits Philip too.");
assert.equal(philip.recordedMinutes, 120, "The meeting without time contributes nothing, not an estimate.");
assert.equal(philip.meetingsMissingTime, 1);
assert.equal(philip.completeness, "partial");
assert.equal(philip.nextAction.kind, "complete_record");
assert.equal(report.totals.meetings, 5, "Canceled, connection-sourced, and out-of-range records are not meetings.");
assert.equal(report.totals.uniqueRecordedMinutes, 90 + 120 + 60 + 60, "Unique elapsed time counts the group meeting once.");
assert.ok(report.rows.reduce((sum, row) => sum + row.recordedMinutes, 0) > report.totals.uniqueRecordedMinutes, "Person rows over-count relative to unique time, which is why they are never summed as your time.");
assert.equal(report.totals.checkIns, 2);
assert.equal(report.totals.meetingsMissingTime, 1);
assert.ok(report.notes.some((note) => note.includes("connection log")), "Connection logs are named, not silently folded in.");
assert.ok(report.notes.some((note) => note.includes("no linked active person")), "A meeting linked only to an archived person is named in the notes.");
assert.equal(dosRecordedMeetingMinutes({ scheduledEndAt: stamp(1, 12), scheduledStartAt: stamp(1, 13) }), null, "End before start records nothing.");

// 4. Direction: My Record wins for "Discipling me"; the Person record's structured role otherwise; conflicts are stated.
const dirk = rowFor("dirk");
assert.equal(dirk.direction, "discipling_me");
assert.equal(dirk.directionLabel, "Discipling me");
assert.equal(dirk.directionSource, "my_record");
assert.ok(dirk.directionConflict?.includes("no direction recorded"), "Dirk's Person record says Not active while My Record says discipling me; the row says so.");
assert.equal(tanner.direction, "i_am_discipling");
assert.equal(tanner.directionLabel, "I am discipling");
assert.equal(rowFor("naomi").direction, "walking_with");
assert.equal(dosMinistryDirectionForPerson(people[0], []).direction, "none", "Without My Record, the display summary alone does not become a direction.");
assert.ok(dosMinistryDirectionForPerson(people[0], []).directionConflict?.includes("Confirm the direction"));
assert.equal(dirk.meetingCount, 1, "A meeting where I was being discipled still counts as recorded contact time with that person.");
assert.equal(dirk.nextAction.kind, "scheduled");
assert.equal(dirk.nextAction.label, `Next meeting ${formatDosMinistryDate(day(-5), now)}`, "The next-action label carries a readable date.");
assert.equal(formatDosMinistryDate("2025-12-03", now), "Dec 3, 2025");

// 5. Completeness language: Recorded / Partial / No qualifying activity, never "inactive".
assert.deepEqual(Object.values(dosMinistryCompletenessLabels), ["Recorded", "Partial", "No qualifying activity"]);
const naomi = rowFor("naomi");
assert.equal(naomi.completeness, "partial", "A check-in without a duration is Partial.");
assert.equal(naomi.nextAction.kind, "log_check_in");
const serialized = JSON.stringify(report);
assert.ok(!/inactive/i.test(serialized), "The word inactive never appears.");
assert.ok(!/mentor/i.test(JSON.stringify([report.rows.map((row) => [row.directionLabel, row.nextAction, row.records.map((record) => record.label), row.completenessDetail])])), "No visible mentor language.");
assert.deepEqual(Object.values(dosMinistryRelationshipDirectionLabels), ["Discipling me", "I am discipling", "Walking with", "Peer encouragement", "No direction recorded"]);

// 6. Relationship rows: people with a direction but no activity in range are listed with "No qualifying activity".
const quietPeriod = build("7d");
const dirkQuiet = quietPeriod.relationshipRows.find((row) => row.personId === "tanner");
assert.equal(quietPeriod.rows.map((row) => row.personId).includes("tanner"), true, "Tanner's check-in is within 7 days.");
assert.equal(build("custom", { end: day(20), start: day(25) }).relationshipRows.some((row) => row.personId === "dirk"), true);
assert.equal(build("custom", { end: day(20), start: day(25) }).relationshipRows.find((row) => row.personId === "dirk").completenessLabel, "No qualifying activity");
assert.equal(dirkQuiet, undefined);

// 7. Multiplication only from explicit, active links.
assert.deepEqual(tanner.downstream, [{ name: "Placeholder disciple", personId: null }]);
assert.equal(philip.downstream.length, 3, "Philip is discipling three people; the ended link is not counted.");
assert.equal(rowFor("naomi").downstream.length, 0);
assert.equal(build("30d").rows.every((row) => !("circle" in row) && !("score" in row)), true, "No circle field on any row.");

// 8. Drill-through: every row lists its contributing records with a target to open.
assert.deepEqual(tanner.records.map((record) => [record.kind, record.open.kind]), [["check_in", "person"], ["meeting", "meeting"], ["meeting", "meeting"]]);
assert.ok(tanner.records.find((record) => record.id === "m-group").label.includes("with 1 other"));
assert.equal(tanner.lastActivity.kind, "check_in");
assert.equal(formatDosMinistryMinutes(null), "Not recorded");
assert.equal(formatDosMinistryMinutes(210), "3h 30m");

// 9. The 90-day range picks up the older meeting.
assert.equal(build("90d").rows.find((row) => row.personId === "naomi").meetingCount, 1);

// 10. What flows upward: only the safe summary fields, and only while the relationship is active.
const summary = buildDosSafeMinistrySummary(report);
assert.deepEqual(Object.keys(summary).sort(), [...dosSafeMinistrySummaryFields].sort());
for (const field of dosSafeMinistrySummaryExcluded) {
  assert.ok(!(field in summary), `${field} must not be in the safe summary.`);
}
assert.ok(!JSON.stringify(summary).includes("Tanner"), "The safe summary carries counts, not names.");
assert.equal(summary.downstreamRelationships, 4);
assert.equal(summary.completeness, "partial");
assert.deepEqual(dosUpstreamViewers(disciplingMe).map((viewer) => viewer.name), ["Dirk Bond", "Marty Vanderzanden"], "An archived relationship no longer receives the summary.");

// 11. The module reads nothing private: its input types name no notes, prayer, narrative, or response fields.
const source = readFileSync(new URL("../src/lib/dos/ministry-report.ts", import.meta.url), "utf8");
const inputTypes = source.slice(source.indexOf("/* ---------- inputs"), source.indexOf("/* ---------- outputs"));
for (const forbidden of ["notes", "prayerNeeds", "privateNotes", "whatHappened", "conversationResponses", "story", "journal", "reflection"]) {
  assert.ok(!new RegExp(`\\b${forbidden}\\b`).test(inputTypes), `Report inputs must not read ${forbidden}.`);
}
assert.ok(!source.includes('import "server-only"'), "The report module stays pure so it can run anywhere.");
assert.ok(!/45|75/.test(source.replace(/\/\*[\s\S]*?\*\//g, "")), "No duration estimate constants in the calculation.");

console.log("DOS ministry report (USA-251) regression passed.");
