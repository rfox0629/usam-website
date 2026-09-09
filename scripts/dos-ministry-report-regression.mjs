// USA-251 — Master Ministry Report / Time Investment.
//
// These checks hold the report contract the founder set on 2026-09-09
// (USA-250 and the PR #130 review): logged duration only, invested time kept
// apart from time invested in the missionary, check-ins separate from
// meetings, group time credited per person but never summed as unique
// elapsed time, the Person record canonical for direction, completeness
// stated rather than inferred, no circle input, no multiplication without a
// resolved Person relationship, and nothing private in what flows upward.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildDosMinistryReport,
  buildDosSafeMinistrySummary,
  dosLoggedMeetingMinutes,
  dosMinistryCompletenessLabels,
  dosMinistryDirectionForPerson,
  dosMinistryRelationshipDirectionLabels,
  dosMinistryReportDefaultRange,
  dosMinistryReportPeriod,
  dosMinistryReportRangeOptions,
  dosMinistryTimeBucketForRole,
  dosMinistryTimeBucketLabels,
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
  // Production shape: legacy summary says Mentor, structured role says Not active, My Record says discipling me.
  { id: "dirk", name: "Dirk Bond", relationshipType: "Mentor · Friend · Exploring", roleInMyLife: "not_active", status: "new" },
  { id: "tanner", name: "Tanner Kent", relationshipType: "Discipling · Family · Exploring", roleInMyLife: "discipling_them", status: "new" },
  { id: "tanner-dup", name: "Tanner Kent", relationshipType: "new", roleInMyLife: "not_active", status: "archived" },
  { id: "philip", name: "Philip John Saco", relationshipType: "Discipling · Church · Exploring", roleInMyLife: "discipling_them", status: "new" },
  { id: "naomi", name: "Naomi Lee", relationshipType: "Walking With · Friend · Exploring", roleInMyLife: "walking_with_them", status: "new" },
  // The Person record is canonical: structured role says discipling me.
  { id: "marty", name: "Marty Vanderzanden", relationshipType: "Mentor · Church · Exploring", roleInMyLife: "mentoring_me", status: "new" },
  { id: "quiet", name: "Quiet Person", relationshipType: "new", roleInMyLife: "not_active", status: "new" },
];

const meetings = [
  // Tanner: two logged meetings, one of them a group meeting shared with Philip.
  { date: stamp(3, 12), fieldPersonIds: ["tanner"], id: "m-tanner-1", meetingStatus: "logged", scheduledEndAt: stamp(3, 13, 30), scheduledStartAt: stamp(3, 12), source: "table", tableRole: "ministering", type: "kitchen_table" },
  { date: stamp(10, 18), fieldPersonIds: ["tanner", "philip"], id: "m-group", meetingStatus: "logged", scheduledEndAt: stamp(10, 20), scheduledStartAt: stamp(10, 18), source: "table", tableRole: "ministering", type: "discipleship" },
  // Philip: one meeting without a logged duration -> Partial.
  { date: stamp(6, 10), fieldPersonIds: ["philip"], id: "m-philip-no-duration", meetingStatus: "logged", scheduledEndAt: null, scheduledStartAt: null, source: "table", tableRole: "ministering", type: "coffee" },
  // Dirk: meetings where Ryan was being discipled (time invested in Ryan), one where Ryan ministered, plus a scheduled one.
  { date: stamp(2, 7), fieldPersonIds: ["dirk"], id: "m-dirk-received", meetingStatus: "logged", scheduledEndAt: stamp(2, 8), scheduledStartAt: stamp(2, 7), source: "table", tableRole: "being_mentored", type: "coffee" },
  { date: stamp(12, 7), fieldPersonIds: ["dirk"], id: "m-dirk-received-2", meetingStatus: "logged", scheduledEndAt: stamp(12, 9), scheduledStartAt: stamp(12, 7), source: "table", tableRole: "being_mentored", type: "coffee" },
  { date: stamp(15, 7), fieldPersonIds: ["dirk"], id: "m-dirk-invested", meetingStatus: "logged", scheduledEndAt: stamp(15, 7, 30), scheduledStartAt: stamp(15, 7), source: "table", tableRole: "mutual_discipleship", type: "coffee" },
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
  // A check-in with Dirk is Ryan's own activity, so it lands in invested, never in received.
  { checkInDate: day(4), durationMinutes: 10, id: "c-dirk", personId: "dirk" },
];

const disciplingMe = [
  { fieldPersonId: "dirk", id: "rel-dirk", mentorName: "Dirk Bond", status: "active" },
  { fieldPersonId: "marty", id: "rel-marty", mentorName: "Marty Vanderzanden", status: "active" },
  { fieldPersonId: "naomi", id: "rel-ended", mentorName: "Naomi Lee", status: "archived" },
  // My Record disagrees with a canonical Person role: the Person wins and the row says so.
  { fieldPersonId: "tanner", id: "rel-wrong", mentorName: "Tanner Kent", status: "active" },
];

const downstream = [
  { discipleDisplayName: "Micah", disciplePersonId: "tanner-ws-micah", disciplerPersonId: "tanner", disciplerWorkspaceId: "tanner-ws", identityLinkId: "link-tanner", roleInMyLife: "discipling_them", source: "person_relationship", status: "active" },
  { discipleDisplayName: "Ended", disciplePersonId: "tanner-ws-ended", disciplerPersonId: "tanner", disciplerWorkspaceId: "tanner-ws", identityLinkId: "link-tanner", roleInMyLife: "discipling_them", source: "person_relationship", status: "ended" },
];

const schedules = [{ id: "s-naomi", nextCheckIn: day(3), personId: "naomi", status: "active" }];

const build = (range, period, extra = {}) => buildDosMinistryReport({ checkIns, disciplingMe, meetings, now, people, period, range, schedules, ...extra });

// 1. Ranges: 30 days by default; 7 / 30 / 90 / custom offered; inclusive local days.
assert.equal(dosMinistryReportDefaultRange, "30d");
assert.deepEqual(dosMinistryReportRangeOptions.map((option) => option.value), ["7d", "30d", "90d", "custom"]);
assert.deepEqual(dosMinistryReportPeriod("30d", now), { end: "2026-09-09", range: "30d", start: "2026-08-11" });
assert.deepEqual(dosMinistryReportPeriod("7d", now), { end: "2026-09-09", range: "7d", start: "2026-09-03" });
assert.deepEqual(dosMinistryReportPeriod("custom", now, { end: "2026-08-01", start: "2026-08-31" }), { end: "2026-08-31", range: "custom", start: "2026-08-01" }, "A reversed custom range is normalised rather than rejected.");

const report = build("30d");
const invested = (id) => report.investedRows.find((row) => row.personId === id);
const received = (id) => report.receivedRows.find((row) => row.personId === id);

// 2. Two lists: time I invested, ranked by logged duration; time invested in me, kept apart.
assert.deepEqual(dosMinistryTimeBucketLabels, { invested: "Time I invested", received: "Time invested in me" });
assert.equal(dosMinistryTimeBucketForRole("being_mentored"), "received");
assert.equal(dosMinistryTimeBucketForRole("mutual_discipleship"), "invested");
assert.equal(dosMinistryTimeBucketForRole("ministering"), "invested");
assert.deepEqual(report.investedRows.map((row) => row.personId), ["tanner", "philip", "dirk", "naomi"], "Invested rows rank by duration I invested; Dirk appears only for the mutual meeting and the check-in.");
assert.deepEqual(report.receivedRows.map((row) => row.personId), ["dirk"], "Only Dirk invested time in Ryan.");
assert.equal(invested("dirk").loggedMinutes, 30, "Dirk is never ranked by the time he invested in Ryan.");
assert.equal(received("dirk").loggedMinutes, 180);
assert.equal(received("dirk").meetingCount, 2);
assert.equal(received("dirk").checkInCount, 0, "Check-ins are Ryan's own activity and never sit under time received.");
assert.equal(invested("dirk").checkInCount, 1);
assert.equal(invested("quiet"), undefined, "A person with no activity is not a row.");
assert.equal(invested("tanner-dup"), undefined, "Archived rows never appear.");

// 3. Duration: logged only; check-ins separate; group time credited per person; totals per bucket, each meeting once.
const tanner = invested("tanner");
assert.equal(tanner.meetingCount, 2);
assert.equal(tanner.loggedMinutes, 90 + 120);
assert.equal(tanner.checkInCount, 1);
assert.equal(tanner.checkInMinutes, 20);
assert.equal(tanner.completeness, "recorded");
const philip = invested("philip");
assert.equal(philip.meetingCount, 2, "The group meeting credits Philip too.");
assert.equal(philip.loggedMinutes, 120, "The meeting without a duration contributes nothing, not an estimate.");
assert.equal(philip.meetingsMissingDuration, 1);
assert.equal(philip.completeness, "partial");
assert.equal(philip.nextAction.kind, "complete_record");
assert.equal(philip.nextAction.label, "Add the missing meeting duration");
assert.equal(report.totals.meetings, 7, "Canceled, connection-sourced, and out-of-range records are not meetings.");
assert.equal(report.totals.investedMeetings, 5);
assert.equal(report.totals.receivedMeetings, 2);
assert.equal(report.totals.uniqueLoggedMinutesInvested, 90 + 120 + 30 + 60, "Invested total counts the group meeting once and the archived-only meeting.");
assert.equal(report.totals.uniqueLoggedMinutesReceived, 60 + 120);
assert.ok(report.investedRows.reduce((sum, row) => sum + row.loggedMinutes, 0) > report.totals.uniqueLoggedMinutesInvested - 60, "Person rows over-count relative to unique time, which is why they are never summed as your time.");
assert.equal(report.totals.checkIns, 3);
assert.equal(report.totals.meetingsMissingDuration, 1);
assert.equal(report.totals.peopleWithActivity, 4);
assert.ok(report.notes.some((note) => note.includes("connection log")), "Connection logs are named, not silently folded in.");
assert.ok(report.notes.some((note) => note.includes("no linked active person")), "A meeting linked only to an archived person is named in the notes.");
assert.equal(dosLoggedMeetingMinutes({ scheduledEndAt: stamp(1, 12), scheduledStartAt: stamp(1, 13) }), null, "End before start logs nothing.");

// 4. Direction: the Person's structured role is canonical; My Record is a fallback; conflicts are stated.
const dirk = invested("dirk");
assert.equal(dirk.direction, "discipling_me");
assert.equal(dirk.directionLabel, "Discipling me");
assert.equal(dirk.directionSource, "my_record", "Dirk's Person record has no direction, so My Record is the fallback.");
assert.ok(dirk.directionConflict?.includes("The Person record is canonical"), "The row says the Person record must be confirmed.");
const marty = report.relationshipRows.find((row) => row.personId === "marty");
assert.equal(marty.directionSource, "person", "A structured mentoring_me role is read from the Person, not My Record.");
assert.equal(marty.directionConflict, null);
assert.equal(tanner.direction, "i_am_discipling");
assert.equal(tanner.directionSource, "person");
assert.ok(tanner.directionConflict?.includes("is canonical"), "When My Record disagrees with a canonical Person role, the Person wins and the row says so.");
assert.equal(invested("naomi").direction, "walking_with");
assert.equal(dosMinistryDirectionForPerson(people[0], []).direction, "none", "Without My Record, the display summary alone does not become a direction.");
assert.ok(dosMinistryDirectionForPerson(people[0], []).directionConflict?.includes("Confirm the direction"));
assert.equal(received("dirk").nextAction.kind, "scheduled");
assert.equal(received("dirk").nextAction.label, `Next meeting ${formatDosMinistryDate(day(-5), now)}`, "The next-action label carries a readable date.");
assert.equal(formatDosMinistryDate("2025-12-03", now), "Dec 3, 2025");

// 5. Completeness language: Recorded / Partial / No qualifying activity, never "inactive"; duration language, not clock time.
assert.deepEqual(Object.values(dosMinistryCompletenessLabels), ["Recorded", "Partial", "No qualifying activity"]);
const naomi = invested("naomi");
assert.equal(naomi.completeness, "partial", "A check-in without a duration is Partial.");
assert.equal(naomi.nextAction.kind, "log_check_in");
const serialized = JSON.stringify(report);
assert.ok(!/inactive/i.test(serialized), "The word inactive never appears.");
assert.ok(!/recorded time|clock/i.test(serialized), "Nothing implies clock-in / clock-out precision.");
assert.ok(!/mentor/i.test(JSON.stringify([...report.investedRows, ...report.receivedRows].map((row) => [row.directionLabel, row.nextAction, row.records.map((record) => record.label), row.completenessDetail]))), "No visible mentor language.");
assert.deepEqual(Object.values(dosMinistryRelationshipDirectionLabels), ["Discipling me", "I am discipling", "Walking with", "Peer encouragement", "No direction recorded"]);
assert.equal(formatDosMinistryMinutes(null), "Not logged");
assert.equal(formatDosMinistryMinutes(210), "3h 30m");

// 6. Relationship rows: people with a direction but no activity in range are listed with "No qualifying activity".
const narrow = build("custom", { end: day(20), start: day(25) });
assert.equal(narrow.relationshipRows.some((row) => row.personId === "dirk"), true);
assert.equal(narrow.relationshipRows.find((row) => row.personId === "dirk").completenessLabel, "No qualifying activity");
assert.equal(report.relationshipRows.some((row) => row.personId === "quiet"), false, "No direction and no activity means no row.");

// 7. Multiplication only from a resolved Person relationship; otherwise honestly not linked.
assert.equal(tanner.downstreamStatus, "not_linked", "Without a resolved Person relationship nothing is claimed.");
assert.deepEqual(tanner.downstream, []);
const resolved = build("30d", undefined, { downstream }).investedRows.find((row) => row.personId === "tanner");
assert.equal(resolved.downstreamStatus, "resolved");
assert.deepEqual(resolved.downstream, [{ name: "Micah", personId: "tanner-ws-micah" }], "The ended relationship is not counted.");
assert.equal(invested("naomi").downstreamStatus, "not_applicable");
assert.equal(report.investedRows.every((row) => !("circle" in row) && !("score" in row)), true, "No circle field on any row.");

// 8. Drill-through: every row lists its contributing records with a target to open.
assert.deepEqual(tanner.records.map((record) => [record.kind, record.open.kind]), [["check_in", "person"], ["meeting", "meeting"], ["meeting", "meeting"]]);
assert.ok(tanner.records.find((record) => record.id === "m-group").label.includes("with 1 other"));
assert.equal(tanner.lastActivity.kind, "check_in");
assert.ok(received("dirk").records.every((record) => record.bucket === "received" && record.role === "being_mentored"));

// 9. The 90-day range picks up the older meeting.
assert.equal(build("90d").investedRows.find((row) => row.personId === "naomi").meetingCount, 1);

// 10. What flows upward: only the safe summary fields, invested and received apart, and only while the relationship is active.
const summary = buildDosSafeMinistrySummary(report);
assert.deepEqual(Object.keys(summary).sort(), [...dosSafeMinistrySummaryFields].sort());
for (const field of dosSafeMinistrySummaryExcluded) {
  assert.ok(!(field in summary), `${field} must not be in the safe summary.`);
}
assert.ok(!JSON.stringify(summary).includes("Tanner"), "The safe summary carries counts, not names.");
assert.equal(summary.loggedMinutesInvested, 300);
assert.equal(summary.loggedMinutesReceived, 180);
assert.equal(summary.downstreamRelationships, 0);
assert.equal(summary.completeness, "partial");
assert.deepEqual(
  dosUpstreamViewers(people, disciplingMe).map((viewer) => [viewer.name, viewer.source]),
  [["Marty Vanderzanden", "person"], ["Dirk Bond", "my_record"], ["Tanner Kent", "my_record"]],
  "The Person record is first; My Record adds only what the Person does not carry; an archived relationship no longer receives the summary.",
);
assert.equal(dosUpstreamViewers(people, disciplingMe.map((relationship) => ({ ...relationship, status: "archived" }))).length, 1, "Ending every My Record relationship leaves only the canonical Person one.");

// 11. The module reads nothing private and keeps no chain model.
const source = readFileSync(new URL("../src/lib/dos/ministry-report.ts", import.meta.url), "utf8");
const inputTypes = source.slice(source.indexOf("/* ---------- inputs"), source.indexOf("/* ---------- outputs"));
for (const forbidden of ["notes", "prayerNeeds", "privateNotes", "whatHappened", "conversationResponses", "story", "journal", "reflection"]) {
  assert.ok(!new RegExp(`\\b${forbidden}\\b`).test(inputTypes), `Report inputs must not read ${forbidden}.`);
}
assert.ok(!source.includes('import "server-only"'), "The report module stays pure so it can run anywhere.");
assert.ok(!/45|75/.test(source.replace(/\/\*[\s\S]*?\*\//g, "")), "No duration estimate constants in the calculation.");
assert.ok(!source.includes("discipleshipChain") && !readFileSync(new URL("../src/lib/dos/missionary-app.ts", import.meta.url), "utf8").includes("discipleshipChain"), "Person is the canonical relationship record; no separate chain model.");
assert.ok(inputTypes.includes('source: "person_relationship"') && inputTypes.includes("identityLinkId"), "Downstream relationships resolve from Person relationships through a DOS identity.");

console.log("DOS ministry report (USA-251) regression passed.");
