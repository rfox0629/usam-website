// USA-251 / USA-268 — Master Ministry Report / Time Investment.
//
// These checks hold the report contract the founder set on 2026-09-09
// (USA-250 and the two PR #130 reviews), revised on 2026-09-10 (one table)
// and 2026-09-11 (USA-268): logged duration only; time invested kept apart
// from time invested in the missionary; EVERY logged meeting counted exactly
// once, in one of those two totals, whatever the relationship (a relationship
// is never an eligibility gate); Invested in me only when a record says so;
// check-ins separate from meetings; group time credited per person but
// counted once as elapsed time; the Person record canonical for direction;
// completeness stated rather than inferred; no circle input; no
// multiplication without a resolved Person relationship; nothing private in
// what flows upward; report-local detail that keeps the reader's place.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildDosMinistryReport,
  buildDosSafeMinistrySummary,
  dosDiscipleshipMeetingPersonId,
  dosLoggedMeetingMinutes,
  dosMinistryClassifyMeeting,
  dosMinistryCompletenessLabels,
  dosMinistryDirectionForPerson,
  dosMinistryDiscipleshipMeetings,
  dosMinistryFruitEntriesFromAppData,
  dosMinistryGatheringsFromAppData,
  dosMinistryMetricDefinitions,
  dosMinistryMultiplicationCell,
  dosMinistryMultiplicationLabel,
  dosMinistryRelationshipDirectionLabels,
  dosMinistryReportDefaultRange,
  dosMinistryReportDefaultSort,
  dosMinistryReportFilterOptions,
  dosMinistryReportInputFromAppData,
  dosMinistryReportPeriod,
  dosMinistryReportRangeOptions,
  dosMinistryRowMatchesFilter,
  dosMinistrySortRows,
  dosMinistryTimeBucketForRole,
  dosMinistryTimeBucketLabels,
  dosSafeMinistrySummaryExcluded,
  dosSafeMinistrySummaryFields,
  dosUpstreamViewers,
  formatDosMinistryDate,
  formatDosMinistryMinutes,
  formatDosMinistryPeriod,
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

/* Production-shaped: a logged meeting with no stored role (the loader's
   default "ministering", tableRoleRecorded false), optional duration. */
function legacyMeeting(id, offset, personIds, minutes = 60, extra = {}) {
  return {
    date: stamp(offset, 12),
    fieldPersonIds: personIds,
    id,
    meetingStatus: "logged",
    scheduledEndAt: minutes ? stamp(offset, 12 + Math.floor(minutes / 60), minutes % 60) : null,
    scheduledStartAt: minutes ? stamp(offset, 12) : null,
    source: "table",
    tableRole: "ministering",
    tableRoleRecorded: false,
    type: "coffee",
    ...extra,
  };
}

function recordedMeeting(id, offset, personIds, tableRole, minutes = 60, extra = {}) {
  return { ...legacyMeeting(id, offset, personIds, minutes), tableRole, tableRoleRecorded: true, ...extra };
}

/* The founder's production-shaped cases. `relationshipType` (the stored
   display summary) is deliberately present: the report must never read it. */
const people = [
  // Dirk discipling Ryan, confirmed on the Person record.
  { id: "dirk", name: "Dirk Bond", relationshipType: "Discipling me · Friend · Exploring", roleInMyLife: "mentoring_me", status: "new" },
  // A Person with no direction set, whom only My Record names as discipling Ryan.
  { id: "dirk-prod", name: "Dirk Bond (as stored)", relationshipType: "Mentor · Friend · Exploring", roleInMyLife: "not_active", status: "new" },
  { id: "tanner", name: "Tanner Kent", relationshipType: "Discipling · Family · Exploring", roleInMyLife: "discipling_them", status: "new" },
  { id: "tanner-dup", name: "Tanner Kent", relationshipType: "new", roleInMyLife: "not_active", status: "archived" },
  { id: "philip", name: "Philip John Saco", relationshipType: "Discipling · Church · Exploring", roleInMyLife: "discipling_them", status: "new" },
  { id: "naomi", name: "Naomi Lee", relationshipType: "Walking With · Friend · Exploring", roleInMyLife: "walking_with_them", status: "new" },
  // New (not_active): the Samuel Gaffney / Mike Anderson case.
  { id: "austin", name: "Austin Clifford", relationshipType: "New · Other · Exploring", roleInMyLife: "not_active", status: "new" },
  // Conflicting: the Person says I am discipling Sam; My Record says Sam is discipling me.
  { id: "sam", name: "Sam Lucas", relationshipType: "Discipling · Friend · Exploring", roleInMyLife: "discipling_them", status: "new" },
  { id: "quiet", name: "Quiet Person", relationshipType: "new", roleInMyLife: "not_active", status: "new" },
];

const meetings = [
  legacyMeeting("m-dirk-legacy", 2, ["dirk"], 60),
  recordedMeeting("m-dirk-recorded", 12, ["dirk"], "being_mentored", 120),
  recordedMeeting("m-dirk-mutual", 15, ["dirk"], "mutual_discipleship", 30),
  recordedMeeting("m-dirk-next", -5, ["dirk"], "being_mentored", 60, { meetingStatus: "scheduled" }),
  legacyMeeting("m-dirk-prod-legacy", 6, ["dirk-prod"], 70),
  legacyMeeting("m-tanner-1", 3, ["tanner"], 90),
  legacyMeeting("m-group", 10, ["tanner", "philip"], 120),
  legacyMeeting("m-philip-no-duration", 6, ["philip"], 0),
  legacyMeeting("m-austin", 9, ["austin"], 60),
  legacyMeeting("m-sam", 8, ["sam"], 60),
  // Mixed directions in one legacy meeting: Tanner (I am discipling) + Dirk (discipling me).
  legacyMeeting("m-mixed", 18, ["tanner", "dirk"], 75),
  recordedMeeting("m-mixed-recorded", 20, ["tanner", "dirk"], "ministering", 40),
  // Outside the 30-day window, inside 90.
  legacyMeeting("m-naomi-old", 45, ["naomi"], 60),
  // Canceled and connection-sourced records never count as meetings.
  legacyMeeting("m-naomi-canceled", 4, ["naomi"], 60, { meetingStatus: "canceled" }),
  legacyMeeting("connection-1", 4, ["naomi"], 0, { source: "connection", type: "other" }),
  // A meeting linked only to an archived duplicate.
  legacyMeeting("m-archived", 5, ["tanner-dup"], 60),
];

const checkIns = [
  { checkInDate: day(1), durationMinutes: 20, id: "c-tanner", personId: "tanner" },
  { checkInDate: day(8), durationMinutes: null, id: "c-naomi", personId: "naomi" },
  { checkInDate: day(4), durationMinutes: 10, id: "c-dirk", personId: "dirk" },
];

const disciplingMe = [
  { fieldPersonId: "dirk", id: "rel-dirk", mentorName: "Dirk Bond", status: "active" },
  { fieldPersonId: "dirk-prod", id: "rel-dirk-prod", mentorName: "Dirk Bond", status: "active" },
  { fieldPersonId: "sam", id: "rel-sam", mentorName: "Sam Lucas", status: "active" },
  { fieldPersonId: "naomi", id: "rel-ended", mentorName: "Naomi Lee", status: "archived" },
];

const downstream = [
  { discipleDisplayName: "Micah", disciplePersonId: "tanner-ws-micah", disciplerPersonId: "tanner", disciplerWorkspaceId: "tanner-ws", identityLinkId: "link-tanner", roleInMyLife: "discipling_them", source: "person_relationship", status: "active" },
  { discipleDisplayName: "Ended", disciplePersonId: "tanner-ws-ended", disciplerPersonId: "tanner", disciplerWorkspaceId: "tanner-ws", identityLinkId: "link-tanner", roleInMyLife: "discipling_them", source: "person_relationship", status: "ended" },
];

const schedules = [{ id: "s-naomi", nextCheckIn: day(3), personId: "naomi", status: "active" }];

const build = (range, period, extra = {}) => buildDosMinistryReport({ checkIns, disciplingMe, meetings, now, people, period, range, schedules, ...extra });
const ids = (rows) => rows.map((row) => row.personId);

// 1. Ranges: 30 days by default; 7 / 30 / 90 / custom offered; inclusive local days.
assert.equal(dosMinistryReportDefaultRange, "30d");
assert.deepEqual(dosMinistryReportRangeOptions.map((option) => option.value), ["7d", "30d", "90d", "custom"]);
assert.deepEqual(dosMinistryReportPeriod("30d", now), { end: "2026-09-09", range: "30d", start: "2026-08-11" });
assert.deepEqual(dosMinistryReportPeriod("7d", now), { end: "2026-09-09", range: "7d", start: "2026-09-03" });
assert.deepEqual(dosMinistryReportPeriod("custom", now, { end: "2026-08-01", start: "2026-08-31" }), { end: "2026-08-31", range: "custom", start: "2026-08-01" }, "A reversed custom range is normalised rather than rejected.");
assert.equal(formatDosMinistryPeriod({ end: "2026-09-10", start: "2026-08-12" }), "Aug 12 – Sep 10, 2026", "The period surface states the year once.");
assert.equal(formatDosMinistryPeriod({ end: "2026-01-05", start: "2025-12-20" }), "Dec 20, 2025 – Jan 5, 2026");

const report = build("30d");
const invested = (id) => report.investedRows.find((row) => row.personId === id);
const received = (id) => report.receivedRows.find((row) => row.personId === id);
const byId = (id) => meetings.find((meeting) => meeting.id === id);
const directionByPersonId = new Map(people.filter((person) => person.status !== "archived").map((person) => [person.id, { ...dosMinistryDirectionForPerson(person, disciplingMe), personName: person.name }]));
const classify = (meeting) => dosMinistryClassifyMeeting(meeting, directionByPersonId);

// 2. Classification (USA-268): two totals; Invested in me only when a record says so.
assert.deepEqual(dosMinistryTimeBucketLabels, { invested: "Time invested", received: "Invested in me" });
assert.equal(dosMinistryTimeBucketForRole("being_mentored"), "received");
assert.equal(dosMinistryTimeBucketForRole("mutual_discipleship"), "invested");
assert.deepEqual(classify(byId("m-dirk-recorded")), { bucket: "received", reason: "Role recorded on the meeting: being discipled" }, "Rule 1: a recorded being-discipled role.");
assert.equal(classify(byId("m-dirk-mutual")).bucket, "invested", "Rule 1: a recorded mutual role is time invested even with a Discipling-me Person.");
assert.equal(classify(byId("m-mixed-recorded")).bucket, "invested", "Rule 1: a recorded role decides even for a mixed meeting.");
assert.deepEqual(classify(byId("m-dirk-legacy")), { bucket: "received", reason: "The Person record says they are discipling you" }, "Rule 2: everyone present is confirmed as discipling Ryan.");
assert.deepEqual(classify(byId("m-dirk-prod-legacy")), { bucket: "received", reason: "My Record says they are discipling you" }, "Rule 2: My Record is the fallback when the Person carries no direction.");
assert.deepEqual(classify(byId("m-austin")), { bucket: "invested", reason: "No recorded role" }, "Rule 3: a New person's meeting is counted, never dropped.");
assert.equal(classify(byId("m-sam")).bucket, "invested", "Rule 3: in a conflict the Person record wins (I am discipling Sam).");
assert.deepEqual(classify(byId("m-mixed")), { bucket: "invested", reason: "Mixed group with no recorded role, counted once as time invested" }, "Rule 3: a mixed group counts once, as time invested, and says so.");
assert.equal(classify(byId("m-group")).bucket, "invested");
assert.equal(classify(byId("m-naomi-old")).bucket, "invested", "Walking with is time invested.");
assert.deepEqual(classify({ fieldPersonIds: ["nobody"], tableRole: "ministering", tableRoleRecorded: false }), { bucket: "invested", reason: "No recorded role and no linked person" });
const twoDisciplers = new Map([["a", { direction: "discipling_me", directionStatus: "confirmed", personName: "A" }], ["b", { direction: "discipling_me", directionStatus: "confirmed", personName: "B" }]]);
assert.deepEqual(dosMinistryClassifyMeeting({ fieldPersonIds: ["a", "b"], tableRole: "ministering", tableRoleRecorded: false }, twoDisciplers), { bucket: "received", reason: "Everyone present is discipling you" });

// 3. The lists: never ranked together; nothing dropped for want of a relationship.
assert.deepEqual(ids(report.investedRows), ["tanner", "philip", "dirk", "austin", "sam", "naomi"], "Invested rows rank by duration invested; New and conflicting people keep their time.");
assert.deepEqual(ids(report.receivedRows), ["dirk", "dirk-prod"]);
assert.equal(invested("dirk").loggedMinutes, 30 + 40, "Dirk's invested row holds only the recorded mutual and ministering meetings.");
assert.equal(received("dirk").loggedMinutes, 60 + 120 + 75, "On Dirk's row the unrecorded mixed meeting is time with someone discipling Ryan.");
assert.equal(received("dirk").meetingCount, 3);
assert.equal(received("dirk").checkInCount, 0, "Check-ins are Ryan's own activity and never sit under time received.");
assert.equal(invested("dirk").checkInCount, 1);
assert.equal(invested("austin").loggedMinutes, 60, "Austin (New) keeps his time.");
assert.equal(invested("sam").loggedMinutes, 60);
assert.equal(received("dirk-prod").loggedMinutes, 70);
assert.equal(invested("quiet"), undefined, "A person with no activity is not a row.");
assert.equal(invested("tanner-dup"), undefined, "Archived rows never appear.");

// 4. Reconciliation: Meetings = time invested meetings + invested in me meetings; each meeting once.
assert.equal(report.totals.meetings, 12, "Canceled, connection-sourced, out-of-range, and scheduled records are not meetings.");
assert.equal(report.totals.investedMeetings, 9);
assert.equal(report.totals.receivedMeetings, 3);
assert.equal(report.totals.investedMeetings + report.totals.receivedMeetings, report.totals.meetings, "Every logged meeting is in exactly one total.");
assert.equal(report.meetings.length, report.totals.meetings, "The meeting list holds each meeting once.");
assert.equal(new Set(report.meetings.map((meeting) => meeting.id)).size, report.meetings.length);
assert.equal(report.totals.uniqueLoggedMinutesInvested, 30 + 90 + 120 + 60 + 60 + 75 + 40 + 60, "Invested total counts every group meeting once.");
assert.equal(report.totals.uniqueLoggedMinutesReceived, 60 + 120 + 70);
for (const bucket of ["invested", "received"]) {
  const listed = report.meetings.filter((meeting) => meeting.bucket === bucket).reduce((sum, meeting) => sum + (meeting.minutes ?? 0), 0);
  assert.equal(listed, bucket === "invested" ? report.totals.uniqueLoggedMinutesInvested : report.totals.uniqueLoggedMinutesReceived, `The ${bucket} metric detail lists exactly the meetings in its total.`);
}
/* The unit rules the Meetings detail states (USA-268 follow-up): counts add
   up to Meetings, minutes add up to the logged duration, and person rows may
   exceed both because a shared meeting is credited to everyone present. */
const everyMeetingMinutes = report.meetings.reduce((sum, meeting) => sum + (meeting.minutes ?? 0), 0);
assert.equal(report.totals.uniqueLoggedMinutesInvested + report.totals.uniqueLoggedMinutesReceived, everyMeetingMinutes, "Invested minutes + received minutes = the logged duration of every meeting in range.");
assert.equal(report.meetings.filter((meeting) => meeting.minutes === null).length, report.totals.meetingsMissingDuration, "A meeting without a logged duration is counted as a meeting and adds no minutes.");
assert.equal(report.totals.unlinkedMeetings, 1, "The meeting linked only to an archived person is counted and named in the Meetings detail.");
assert.equal(report.totals.connectionLogs, 1);
assert.deepEqual([report.meetings.find((meeting) => meeting.id === "m-archived").bucket, report.meetings.find((meeting) => meeting.id === "m-archived").people], ["invested", []]);
assert.deepEqual(report.meetings.find((meeting) => meeting.id === "m-mixed").people.map((person) => person.id).sort(), ["dirk", "tanner"]);
assert.equal(report.meetings.find((meeting) => meeting.id === "m-mixed").roleLabel, null, "No recorded role is stated as none, not defaulted.");
assert.deepEqual(
  [report.meetings.find((meeting) => meeting.id === "m-mixed").bucket, invested("tanner").records.find((record) => record.id === "m-mixed")?.bucket, received("dirk").records.find((record) => record.id === "m-mixed")?.bucket],
  ["invested", "invested", "received"],
  "An unrecorded mixed group counts once as time invested in the totals; on each row it follows that person's relationship, so someone discipling Ryan is never ranked as his time investment.",
);
assert.equal(report.meetings.find((meeting) => meeting.id === "m-dirk-recorded").roleLabel, "Being discipled");
assert.ok(!/unresolved|Relationship not set|Not set\b|Needs relationship/.test(JSON.stringify(report)), "There is no third bucket and no not-set wording in any output.");

// 5. Duration: logged only; check-ins separate; group time credited per person.
const tanner = invested("tanner");
assert.equal(tanner.meetingCount, 4, "tanner-1, the group, the mixed meeting, and the recorded mixed meeting.");
assert.equal(tanner.loggedMinutes, 90 + 120 + 75 + 40);
assert.equal(tanner.checkInCount, 1);
assert.equal(tanner.checkInMinutes, 20);
const philip = invested("philip");
assert.equal(philip.meetingCount, 2, "The group meeting credits Philip too.");
assert.equal(philip.loggedMinutes, 120, "The meeting without a duration contributes nothing, not an estimate.");
assert.equal(philip.meetingsMissingDuration, 1);
assert.equal(philip.completeness, "partial");
assert.equal(philip.nextAction.kind, "complete_record");
assert.equal(report.totals.checkIns, 3);
assert.equal(report.totals.meetingsMissingDuration, 1);
assert.equal(report.totals.peopleWithActivity, 7);
assert.ok(report.rows.reduce((sum, row) => sum + row.loggedMinutes, 0) > report.totals.uniqueLoggedMinutesInvested + report.totals.uniqueLoggedMinutesReceived, "Person rows credit a group meeting to each person, so rows are never summed as your time.");
assert.equal(dosLoggedMeetingMinutes({ scheduledEndAt: stamp(1, 12), scheduledStartAt: stamp(1, 13) }), null, "End before start logs nothing.");

// 6. Direction: the Person's structured role is canonical; My Record a fallback; the display summary never read.
const dirk = received("dirk");
assert.deepEqual([dirk.direction, dirk.directionSource, dirk.directionStatus, dirk.directionConflict], ["discipling_me", "person", "confirmed", null]);
const dirkProd = received("dirk-prod");
assert.deepEqual([dirkProd.direction, dirkProd.directionSource, dirkProd.directionStatus], ["discipling_me", "my_record", "unconfirmed"]);
assert.ok(dirkProd.directionConflict?.includes("Only My Record says"), "The detail says the Person record should confirm it.");
assert.deepEqual([tanner.direction, tanner.directionStatus], ["i_am_discipling", "confirmed"]);
assert.deepEqual([invested("sam").direction, invested("sam").directionStatus], ["i_am_discipling", "conflicting"]);
assert.ok(invested("sam").directionConflict?.includes("The Person record is used"));
assert.deepEqual(dosMinistryDirectionForPerson(people[1], []), { direction: "none", directionConflict: null, directionLabel: "New", directionSource: "none", directionStatus: "none" }, "Without My Record, a stale summary such as \"Mentor · Friend · Exploring\" is not a direction and is not mentioned.");
const adaptedPeople = dosMinistryReportInputFromAppData({ accountabilityCheckIns: [], accountabilitySchedules: [], disciplingMe: [], meetings: [], people: [{ id: "lyf", name: "Lyf Nimmo", relationshipType: "Discipling · Outreach · Exploring", roleInMyLife: "not_active", status: "new" }] }).people;
assert.deepEqual(Object.keys(adaptedPeople[0]).sort(), ["id", "name", "roleInMyLife", "status"], "The stored display summary never reaches the report (Lyf Nimmo's stale \"Discipling · Outreach · Exploring\").");
assert.equal(dirk.nextAction.kind, "scheduled");
assert.equal(dirk.nextAction.label, `Next meeting ${formatDosMinistryDate(day(-5), now)}`);
assert.equal(formatDosMinistryDate("2025-12-03", now), "Dec 3, 2025");

// 7. Language: never "inactive"; duration, not clock time; no mentor language; direction is not stage.
assert.deepEqual(Object.values(dosMinistryCompletenessLabels), ["Recorded", "Partial", "No activity"]);
const naomi = invested("naomi");
assert.equal(naomi.completeness, "partial", "A check-in without a duration is Partial.");
assert.equal(naomi.nextAction.kind, "log_check_in");
const serialized = JSON.stringify(report);
assert.ok(!/inactive/i.test(serialized), "The word inactive never appears.");
assert.ok(!/recorded time|clock/i.test(serialized), "Nothing implies clock-in / clock-out precision.");
const visible = JSON.stringify([...report.investedRows, ...report.receivedRows].map((row) => [row.directionLabel, row.nextAction, row.records.map((record) => [record.label, record.kind === "meeting" ? record.bucketReason : ""]), row.completenessDetail]));
assert.ok(!/mentor/i.test(visible), "No visible mentor language.");
assert.deepEqual(dosMinistryRelationshipDirectionLabels, { discipling_me: "Discipling me", i_am_discipling: "Discipling", walking_with: "Walking with", peer: "Peer encouragement", none: "New" }, "The report's relationship words match the Person record's pill.");
assert.ok(!Object.values(dosMinistryRelationshipDirectionLabels).includes("Exploring"), "Exploring is the spiritual-journey stage, never a relationship direction.");
assert.deepEqual(Object.fromEntries(Object.entries(dosMinistryMetricDefinitions).map(([key, value]) => [key, value.label])), { invested: "Time invested", received: "Invested in me", meetings: "Meetings" }, "Exactly three summary figures.");
assert.ok(Object.values(dosMinistryMetricDefinitions).every((metric) => metric.definition.length > 40), "Every figure carries its definition for the detail.");
assert.equal(formatDosMinistryMinutes(null), "Not logged");
assert.equal(formatDosMinistryMinutes(210), "3h 30m");

// 8. Relationship rows: people with a direction but no activity in range are listed with "No activity".
const narrow = build("custom", { end: day(25), start: day(28) });
assert.equal(narrow.relationshipRows.find((row) => row.personId === "dirk").completenessLabel, "No activity");
assert.equal(report.relationshipRows.some((row) => row.personId === "quiet"), false, "No direction and no activity means no row.");

// 9. Multiplication only from a resolved Person relationship: "0" is a verified zero, "—" is unavailable.
assert.deepEqual([tanner.downstreamStatus, dosMinistryMultiplicationLabel(tanner), dosMinistryMultiplicationCell(tanner)], ["not_connected", "Not connected", "—"], "Without a verified DOS identity nothing can be read, so nothing is claimed.");
assert.deepEqual(tanner.downstream, []);
const linkedOnly = build("30d", undefined, { linkedPersonIds: ["tanner"] }).investedRows.find((row) => row.personId === "tanner");
assert.deepEqual([linkedOnly.downstreamStatus, dosMinistryMultiplicationLabel(linkedOnly), dosMinistryMultiplicationCell(linkedOnly)], ["not_resolved", "Not resolved yet", "—"]);
const readEmpty = build("30d", undefined, { downstreamReadPersonIds: ["tanner"], linkedPersonIds: ["tanner"] }).investedRows.find((row) => row.personId === "tanner");
assert.deepEqual([readEmpty.downstreamStatus, dosMinistryMultiplicationLabel(readEmpty), dosMinistryMultiplicationCell(readEmpty)], ["not_recorded", "Not recorded", "0"], "Only a person whose own records were read has a known zero.");
const resolved = build("30d", undefined, { downstream, downstreamReadPersonIds: ["tanner"], linkedPersonIds: ["tanner"] }).investedRows.find((row) => row.personId === "tanner");
assert.equal(resolved.downstreamStatus, "resolved");
assert.deepEqual(resolved.downstream, [{ name: "Micah", personId: "tanner-ws-micah" }], "The ended relationship is not counted.");
assert.deepEqual([dosMinistryMultiplicationLabel(resolved), dosMinistryMultiplicationCell(resolved)], ["1 person", "1"]);
assert.deepEqual([naomi.downstreamStatus, dosMinistryMultiplicationCell(naomi)], ["not_applicable", "—"]);
assert.equal(report.investedRows.every((row) => !("circle" in row) && !("score" in row)), true, "No circle field on any row.");

// 10. Drill-through: every row lists its contributing records with a target to open and the rule that placed it.
assert.deepEqual(tanner.records.map((record) => [record.kind, record.open.kind]), [["check_in", "person"], ["meeting", "meeting"], ["meeting", "meeting"], ["meeting", "meeting"], ["meeting", "meeting"]]);
assert.equal(tanner.records.find((record) => record.id === "m-group").label, "Coffee · with 1 other");
assert.equal(tanner.records.find((record) => record.id === "m-tanner-1").label, "Coffee", "A legacy meeting's record is its type; the missing role is stated in the meeting detail.");
assert.equal(tanner.records.find((record) => record.id === "m-mixed-recorded").label, "Coffee · Ministering · with 1 other");
assert.equal(tanner.lastActivity.kind, "check_in");
assert.ok(received("dirk").records.every((record) => record.bucket === "received"));

// 11. The 90-day range picks up the older meeting.
assert.equal(build("90d").investedRows.find((row) => row.personId === "naomi").meetingCount, 1);

// 12. What flows upward: only the safe summary fields, invested and received apart.
const summary = buildDosSafeMinistrySummary(report);
assert.deepEqual(Object.keys(summary).sort(), [...dosSafeMinistrySummaryFields].sort());
for (const field of dosSafeMinistrySummaryExcluded) {
  assert.ok(!(field in summary), `${field} must not be in the safe summary.`);
}
assert.ok(!JSON.stringify(summary).includes("Tanner"), "The safe summary carries counts, not names.");
assert.equal(summary.loggedMinutesInvested, 535);
assert.equal(summary.loggedMinutesReceived, 250);
assert.equal(summary.downstreamRelationships, 0);
assert.equal(summary.completeness, "partial");
assert.deepEqual(
  dosUpstreamViewers(people, disciplingMe).map((viewer) => [viewer.name, viewer.source]),
  [["Dirk Bond", "person"], ["Dirk Bond", "my_record"], ["Sam Lucas", "my_record"]],
  "The Person record is first; My Record adds only what the Person does not carry; an archived relationship no longer receives the summary.",
);
assert.equal(dosUpstreamViewers(people, disciplingMe.map((relationship) => ({ ...relationship, status: "archived" }))).length, 1);

// 13. The module reads nothing private, keeps no chain model, and never estimates.
const source = readFileSync(new URL("../src/lib/dos/ministry-report.ts", import.meta.url), "utf8");
const inputTypes = source.slice(source.indexOf("/* ---------- inputs"), source.indexOf("/* ---------- outputs"));
for (const forbidden of ["notes", "prayerNeeds", "privateNotes", "whatHappened", "conversationResponses", "story", "journal", "reflection", "description", "comments", "whatChanged", "decisionMade", "nextStep", "prayerFocus", "actionStep", "body", "summary", "relationshipType"]) {
  assert.ok(!new RegExp(`^\\s*${forbidden}\\??:`, "m").test(inputTypes), `Report inputs must not read ${forbidden}.`);
}
assert.ok(!source.includes('import "server-only"'), "The report module stays pure so it can run anywhere.");
assert.ok(!/45|75/.test(source.replace(/\/\*[\s\S]*?\*\//g, "")), "No duration estimate constants in the calculation.");
const loader = readFileSync(new URL("../src/lib/dos/missionary-app.ts", import.meta.url), "utf8");
assert.ok(!source.includes("discipleshipChain") && !loader.includes("discipleshipChain"), "Person is the canonical relationship record; no separate chain model.");
assert.ok(inputTypes.includes('source: "person_relationship"') && inputTypes.includes("identityLinkId"));
assert.ok(loader.includes("tableRoleRecorded: dosAppTableRoles.includes(meeting.table_role as DosAppTableRole)"), "The loader says whether a role was stored, so a default never decides a direction.");
assert.ok(inputTypes.includes("tableRoleRecorded: boolean"));

// 14. Colour language (founder, 2026-09-09): no yellow, amber, orange, or red in the report; green only for confirmed status.
const reportUi = readFileSync(new URL("../src/components/dos/reports/MinistryTimeInvestmentReport.tsx", import.meta.url), "utf8");
const reportUiCode = reportUi.replace(/\/\*[\s\S]*?\*\//g, "");
const warningColour = /amber|orange|yellow|text-red|bg-red|border-red|ring-red|#F59|#FEF3|#FDE68|#B45309|#D97706|#DC2626|#EF4444|#FCA5A5|#FEE2E2|#B91C1C|#F97316|#FBBF24|#FFF7ED|#EA580C|#FDF0D5|#FDE8E8|#FECACA|#F87171/i;
assert.ok(!warningColour.test(reportUiCode), "The report never uses yellow, amber, orange, or red.");
assert.ok(/recorded: "green"/.test(reportUi) && /partial: "blue"/.test(reportUi) && /none: "grey"/.test(reportUi), "Partial is blue, no activity is grey, recorded is the only green.");
assert.ok(reportUi.includes("bg-dos-blue50 px-3 py-2 text-dos-meta text-dos-blueText\">{row.directionConflict}"), "A relationship disagreement is a calm blue notice inside the person detail.");
assert.ok(!/#[0-9A-Fa-f]{3,8}\b/.test(reportUiCode), "The report uses DOS tokens, never raw hex values.");

// 15. One primary table: one row per person; per-direction figures kept apart; relationship filters and sorting.
const rowOf = (id) => report.rows.find((row) => row.personId === id);
assert.deepEqual(ids(report.rows), ["dirk", "tanner", "philip", "dirk-prod", "austin", "sam", "naomi"], "One row per person, by logged duration (ties by meetings, then name).");
const dirkRow = rowOf("dirk");
assert.equal(dirkRow.meetingCount, 5);
assert.deepEqual(dirkRow.minutesByBucket, { invested: 30 + 40, received: 60 + 120 + 75 }, "The row keeps time invested and invested in me apart.");
assert.deepEqual(dirkRow.meetingsByBucket, { invested: 2, received: 3 });
assert.equal(dirkRow.loggedMinutes, 145 + 180);
assert.deepEqual([dirkRow.checkInCount, dirkRow.relationshipLabel, dirkRow.relationshipNote, dirkRow.completeness], [1, "Discipling me", null, "recorded"]);
assert.equal(dirkRow.lastActivity.date, day(2));
const samuelLike = rowOf("austin");
assert.deepEqual([samuelLike.relationshipLabel, samuelLike.completeness, samuelLike.meetingCount, samuelLike.loggedMinutes], ["New", "recorded", 1, 60], "The Samuel Gaffney case: New, and the meeting and its time are counted.");
assert.deepEqual(samuelLike.minutesByBucket, { invested: 60, received: 0 });
assert.deepEqual([rowOf("dirk-prod").relationshipLabel, rowOf("dirk-prod").relationshipNote], ["Discipling me", "Not on the Person record"]);
assert.deepEqual(rowOf("dirk-prod").minutesByBucket, { invested: 0, received: 70 });
assert.deepEqual([rowOf("sam").relationshipLabel, rowOf("sam").relationshipNote], ["Discipling", "My Record differs"]);
assert.equal(rowOf("philip").completeness, "partial");
assert.equal(rowOf("quiet"), undefined, "No relationship and no activity means no row.");
assert.equal(rowOf("tanner-dup"), undefined);
const dirkNoActivity = narrow.rows.find((row) => row.personId === "dirk");
assert.deepEqual([dirkNoActivity.completeness, dirkNoActivity.meetingCount, dirkNoActivity.loggedMinutes], ["none", 0, 0], "A relationship with no activity is on the table, never a task.");
assert.deepEqual(dosMinistryReportFilterOptions.map((option) => [option.value, option.label]), [["all", "All"], ["i_am_discipling", "Discipling"], ["walking_with", "Walking with"], ["discipling_me", "Discipling me"], ["none", "New"]]);
const filtered = (filter) => ids(report.rows.filter((row) => dosMinistryRowMatchesFilter(row, filter)));
assert.deepEqual(filtered("all"), ids(report.rows));
assert.deepEqual(filtered("i_am_discipling"), ["tanner", "philip", "sam"]);
assert.deepEqual(filtered("walking_with"), ["naomi"]);
assert.deepEqual(filtered("discipling_me"), ["dirk", "dirk-prod"]);
assert.deepEqual(filtered("none"), ["austin"]);
assert.deepEqual(dosMinistryReportDefaultSort, { direction: "desc", key: "time" });
assert.deepEqual(ids(dosMinistrySortRows(report.rows, dosMinistryReportDefaultSort)), ids(report.rows), "The default sort is the report's own order.");
assert.deepEqual(ids(dosMinistrySortRows(report.rows, { direction: "asc", key: "person" })), ["austin", "dirk", "dirk-prod", "naomi", "philip", "sam", "tanner"]);
assert.deepEqual(ids(dosMinistrySortRows(report.rows, { direction: "desc", key: "meetings" })), ["dirk", "tanner", "philip", "dirk-prod", "austin", "sam", "naomi"]);
assert.deepEqual(ids(dosMinistrySortRows(report.rows, { direction: "asc", key: "relationship" })), ["tanner", "philip", "sam", "naomi", "dirk", "dirk-prod", "austin"]);
assert.deepEqual(ids(dosMinistrySortRows(report.rows, { direction: "asc", key: "time" })), ["naomi", "austin", "sam", "dirk-prod", "philip", "dirk", "tanner"], "Equal rows keep a stable order in either direction.");
assert.ok(!/inactive/i.test(JSON.stringify(report.rows)));

// 16. Ministry Fruit: structured sources only, stored links only, honest status, one-line outcome.
const fruitEntries = dosMinistryFruitEntriesFromAppData({
  fruit: [{ fieldPersonId: "tanner", id: "story-1", outcomeTags: ["Joined Discipleship"], permissionToShare: true, sourceApp: null, status: "approved", submittedByName: "Ryan", summary: "A private story that must never appear", tableId: null, testimonyDate: stamp(3, 9), updatedAt: null }],
  fruitEvents: [
    { confidenceLevel: "verified", date: stamp(2, 9), debugContext: {}, description: "Narrative that must never appear", fruitType: "Gospel Conversation", generatedBy: "leader_review", generationKey: null, id: "ev-1", meetingId: "m-tanner-1", personId: "tanner", sourceId: null, sourceType: "leader_reflection", status: "submitted", title: "A leader-written title", visibility: "internal" },
    { confidenceLevel: "observed", date: stamp(4, 9), debugContext: {}, description: null, fruitType: "Prayer Received", generatedBy: null, generationKey: null, id: "ev-2", meetingId: "m-group", personId: null, sourceId: null, sourceType: "leader_reflection", status: "submitted", title: null, visibility: "internal" },
    { confidenceLevel: "confirmed", date: stamp(5, 9), debugContext: {}, description: null, fruitType: "Hidden", generatedBy: null, generationKey: null, id: "ev-3", meetingId: null, personId: "tanner", sourceId: null, sourceType: "manual", status: "hidden", title: null, visibility: "private" },
    { confidenceLevel: "observed", date: null, debugContext: {}, description: null, fruitType: "Undated", generatedBy: null, generationKey: null, id: "ev-4", meetingId: null, personId: "tanner", sourceId: null, sourceType: "manual", status: "submitted", title: null, visibility: "internal" },
  ],
  guidedResourceProgress: [
    { actionStep: "private", assignmentId: null, completedAt: stamp(6, 9), createdAt: null, createdByUserId: null, id: "prog-1", personId: "philip", prayerFocus: "private", reflection: "private", resourceSlug: "marks-of-discipleship", sessionId: "week-1", updatedAt: null, workspaceId: "ws" },
    { actionStep: "private", assignmentId: null, completedAt: null, createdAt: null, createdByUserId: null, id: "prog-2", personId: "philip", prayerFocus: "private", reflection: "private", resourceSlug: "marks-of-discipleship", sessionId: "week-2", updatedAt: null, workspaceId: "ws" },
  ],
  participantReviews: [
    { comments: "Private comment that must never appear", conversationHelpful: null, feltCaredFor: null, feltHeard: null, legacyForm: null, id: "rev-1", meetingId: "m-tanner-1", outcomeTags: ["Felt encouraged", "Discipling"], overallRating: "very_meaningful", personId: null, status: "submitted", submittedAt: stamp(1, 20), submittedEmail: null, submittedFirstName: null, submittedLastName: null, submittedName: null, wantsFollowUp: null, wouldMeetAgain: null, wouldMeetAgainResponse: null },
    { comments: null, conversationHelpful: null, feltCaredFor: null, feltHeard: null, legacyForm: null, id: "rev-draft", meetingId: "m-tanner-1", outcomeTags: [], overallRating: null, personId: "tanner", status: "draft", submittedAt: stamp(1, 21), submittedEmail: null, submittedFirstName: null, submittedLastName: null, submittedName: null, wantsFollowUp: null, wouldMeetAgain: null, wouldMeetAgainResponse: null },
  ],
  participantTestimonies: [
    { decisionMade: "private", id: "test-1", meetingId: "m-philip-no-duration", nextStep: "private", outcomeTags: ["Discipleship growth"], permissionToShare: true, personId: "philip", publicDisplayName: null, status: "approved", story: "Private story that must never appear", submittedAt: stamp(2, 19), submittedEmail: null, submittedName: null, whatChanged: "private" },
  ],
  resolveJourneySession: (slug, session) => ({ resourceTitle: slug === "marks-of-discipleship" ? "Marks of Discipleship" : null, sessionTitle: session === "week-1" ? "Week 1: Follow Me" : null }),
});
const withFruit = build("30d", undefined, { fruit: fruitEntries });
const fruitById = new Map(withFruit.fruitRows.map((row) => [row.id, row]));
assert.deepEqual(withFruit.fruitRows.map((row) => row.id), ["review-rev-1", "testimony-test-1", "fruit_event-ev-1", "fruit_story-story-1", "fruit_event-ev-2", "journey_progress-prog-1"], "Newest first (same-day entries by person name); hidden, draft, incomplete, and undated entries are not rows.");
assert.deepEqual([fruitById.get("fruit_event-ev-1").text, fruitById.get("fruit_event-ev-1").sourceLabel, fruitById.get("fruit_event-ev-1").statusLabel, fruitById.get("fruit_event-ev-1").statusTone], ["Gospel Conversation", "Fruit", "Verified", "green"]);
assert.deepEqual(fruitById.get("fruit_event-ev-1").open, { id: "m-tanner-1", kind: "meeting" }, "The stored meeting link opens the meeting.");
assert.equal(fruitById.get("fruit_event-ev-1").personName, "Tanner Kent");
assert.deepEqual([fruitById.get("fruit_event-ev-2").personName, fruitById.get("fruit_event-ev-2").personSource, fruitById.get("fruit_event-ev-2").statusLabel, fruitById.get("fruit_event-ev-2").statusTone], ["Not linked", "none", "Observed", "blue"], "A meeting with two people does not pick one.");
assert.deepEqual([fruitById.get("review-rev-1").text, fruitById.get("review-rev-1").personName, fruitById.get("review-rev-1").personSource, fruitById.get("review-rev-1").statusLabel], ["Very meaningful · Felt encouraged · Discipling", "Tanner Kent", "meeting", "Submitted"]);
assert.deepEqual([fruitById.get("testimony-test-1").text, fruitById.get("testimony-test-1").statusLabel, fruitById.get("testimony-test-1").statusTone], ["Testimony shared · Discipleship growth", "Approved", "green"]);
assert.deepEqual([fruitById.get("fruit_story-story-1").text, fruitById.get("fruit_story-story-1").sourceLabel], ["Joined Discipleship", "Fruit story"]);
assert.deepEqual([fruitById.get("journey_progress-prog-1").text, fruitById.get("journey_progress-prog-1").relatedLabel, fruitById.get("journey_progress-prog-1").statusLabel, fruitById.get("journey_progress-prog-1").open], ["Completed Week 1: Follow Me", "Marks of Discipleship", "Completed", null]);
// USA-268: the table cell is one short outcome in the entry's own words; the tags move to the detail.
assert.deepEqual(withFruit.fruitRows.map((row) => [row.id, row.summary, row.sourceLabel]), [
  ["review-rev-1", "Very meaningful", "Review"],
  ["testimony-test-1", "Testimony shared", "Testimony"],
  ["fruit_event-ev-1", "Gospel Conversation", "Fruit"],
  ["fruit_story-story-1", "Joined Discipleship", "Fruit story"],
  ["fruit_event-ev-2", "Prayer Received", "Fruit"],
  ["journey_progress-prog-1", "Week 1: Follow Me", "Journey progress"],
], "A review stays a review and a completed session stays Journey progress: shortening never relabels feedback or activity as Fruit.");
assert.deepEqual(fruitById.get("review-rev-1").tags, ["Felt encouraged", "Discipling"]);
const fruitSerialized = JSON.stringify(withFruit.fruitRows);
for (const secret of ["private", "Private", "never appear", "A leader-written title"]) {
  assert.ok(!fruitSerialized.includes(secret), `Narrative never reaches the fruit table (${secret}).`);
}
assert.equal(withFruit.rows.find((row) => row.personId === "tanner").fruitCount, 3);
assert.equal(withFruit.rows.find((row) => row.personId === "philip").fruitCount, 2);
assert.equal(withFruit.rows.find((row) => row.personId === "dirk").fruitCount, 0);
assert.equal(withFruit.totals.undatedFruit, 1, "Undated fruit is counted, not silently dropped.");
assert.deepEqual(report.fruitRows, [], "No fruit input, no fruit rows.");
assert.ok(!JSON.stringify(fruitEntries).includes("never appear"), "The adapter never carries narrative, so the calculation cannot show it.");

// 16b. Imported feedback is Feedback, not Fruit (USA-264 × USA-251).
const danny = { id: "danny", name: "Danny Lundquist", roleInMyLife: "discipling_them", status: "new" };
const dannyMeeting = legacyMeeting("m-danny", 7, ["danny"], 60);
const reviewFixture = (overrides) => ({ comments: null, conversationHelpful: null, feltCaredFor: null, feltHeard: null, legacyForm: null, meetingId: "m-danny", outcomeTags: [], overallRating: null, personId: "danny", status: "submitted", submittedAt: stamp(1, 17), submittedEmail: null, submittedFirstName: null, submittedLastName: null, submittedName: null, wantsFollowUp: null, wouldMeetAgain: null, wouldMeetAgainResponse: null, ...overrides });
const importedLegacyForm = {
  answers: [{ answers: ["Still processing"], question: "Did anything shift for you? (Select all that apply)" }],
  formName: "2 Minute Reflection (After Coffee)",
  importedAt: stamp(0, 9),
  privacyNote: "Your responses are kept private and handled with care.",
  sourceFormId: "1199861",
  sourceLabel: "Planning Center",
  sourceSubmissionId: "42200110",
  submittedAtLocal: `${day(2)}T17:55`,
  submittedTimezone: null,
};
const importedFeedback = reviewFixture({ id: "rev-danny-imported", legacyForm: importedLegacyForm, meetingId: "", submittedAt: stamp(2, 17, 55) });
const nativeReview = reviewFixture({ id: "rev-danny-native", outcomeTags: ["Felt encouraged"], overallRating: "meaningful" });
const independentFruit = { confidenceLevel: "confirmed", date: stamp(3, 9), debugContext: {}, description: null, fruitType: "Gospel Conversation", generatedBy: null, generationKey: null, id: "ev-danny", meetingId: null, personId: "danny", sourceId: null, sourceType: "manual", status: "submitted", title: null, visibility: "internal" };
const dannyEntries = (participantReviews) => dosMinistryFruitEntriesFromAppData({ fruit: [], fruitEvents: [independentFruit], guidedResourceProgress: [], participantReviews, participantTestimonies: [] });
const dannyDownstream = [{ discipleDisplayName: "Eli", disciplePersonId: "danny-ws-eli", disciplerPersonId: "danny", disciplerWorkspaceId: "danny-ws", identityLinkId: "link-danny", roleInMyLife: "discipling_them", source: "person_relationship", status: "active" }];
const dannyBuild = (participantReviews, range = "30d", period) => build(range, period, {
  downstream: dannyDownstream,
  downstreamReadPersonIds: ["danny"],
  fruit: dannyEntries(participantReviews),
  linkedPersonIds: ["danny"],
  meetings: [...meetings, dannyMeeting],
  people: [...people, danny],
});
const withImport = dannyBuild([importedFeedback, nativeReview]);
const withoutImport = dannyBuild([nativeReview]);
assert.deepEqual(dannyEntries([importedFeedback, nativeReview]), dannyEntries([nativeReview]), "The adapter emits nothing for imported feedback.");
assert.deepEqual(withImport.fruitRows, withoutImport.fruitRows, "Imported feedback adds no Ministry Fruit row.");
assert.deepEqual(withImport.rows, withoutImport.rows, "Imported feedback changes no person row.");
assert.deepEqual(withImport.totals, withoutImport.totals, "Imported feedback changes no total.");
assert.deepEqual(buildDosSafeMinistrySummary(withImport), buildDosSafeMinistrySummary(withoutImport), "Imported feedback changes nothing that flows upward.");
const dannyRow = withImport.rows.find((row) => row.personId === "danny");
assert.equal(dannyRow.fruitCount, 2, "Danny's independently recorded Fruit and his native review still count.");
assert.deepEqual(withImport.fruitRows.filter((row) => row.personId === "danny").map((row) => row.id).sort(), ["fruit_event-ev-danny", "review-rev-danny-native"]);
assert.equal(dosMinistryMultiplicationLabel(dannyRow), "1 person");
assert.deepEqual(dannyBuild([importedFeedback], "custom", { end: day(0), start: day(60) }).fruitRows.map((row) => row.id), ["fruit_event-ev-danny"], "No range reaches the import as Fruit.");
const unmarked = dannyBuild([{ ...importedFeedback, legacyForm: null }, nativeReview]);
assert.ok(unmarked.fruitRows.some((row) => row.id === "review-rev-danny-imported"), "Probe: without legacyForm the fixture would be a Fruit row.");
assert.equal(unmarked.rows.find((row) => row.personId === "danny").fruitCount, 3, "Probe: and it would be counted.");

// 16c. Discipleship meetings from My Record (USA-265): time invested in Ryan whatever the Person relationship says.
const discipleshipRelationships = [{ fieldPersonId: "dirk", id: "rel-dirk" }, { fieldPersonId: "marty", id: "rel-marty" }];
const discipleshipFixture = (id, offset, minutes, extra = {}) => ({ actionSteps: "private action", counselReceived: "private counsel", createdAt: null, discussed: "private discussion", durationMinutes: minutes, fieldPersonId: null, followUpDate: null, id, meetingDate: day(offset), mentorName: "Dirk Bond", notes: "private notes", relationshipId: "rel-dirk", updatedAt: null, ...extra });
const discipleshipMeetings = [
  discipleshipFixture("dm-dirk-1", 3, 120, { fieldPersonId: "dirk" }),
  discipleshipFixture("dm-dirk-2", 6, 70),
  discipleshipFixture("dm-dirk-3", 17, 70, { fieldPersonId: "dirk" }),
  discipleshipFixture("dm-marty", 4, 120, { fieldPersonId: "marty", mentorName: "Marty Vanderzanden", relationshipId: "rel-marty" }),
  discipleshipFixture("dm-unlinked", 5, 45, { mentorName: "A visiting pastor", relationshipId: "rel-unknown" }),
  discipleshipFixture("dm-old", 60, 60, { fieldPersonId: "dirk" }),
];
const mappedDiscipleship = dosMinistryDiscipleshipMeetings(discipleshipMeetings, discipleshipRelationships);
assert.deepEqual(mappedDiscipleship.map((meeting) => [meeting.id, meeting.fieldPersonIds]), [["dm-dirk-1", ["dirk"]], ["dm-dirk-2", ["dirk"]], ["dm-dirk-3", ["dirk"]], ["dm-marty", ["marty"]], ["dm-unlinked", []], ["dm-old", ["dirk"]]], "The Person comes from the stored link, else the saved relationship; an unknown relationship links no one.");
assert.equal(dosDiscipleshipMeetingPersonId({ fieldPersonId: null, relationshipId: null }, discipleshipRelationships), null, "No link, no Person; names are never matched.");
assert.ok(mappedDiscipleship.every((meeting) => meeting.source === "discipleship" && meeting.tableRole === "being_mentored" && meeting.tableRoleRecorded && meeting.meetingStatus === "logged"));
assert.ok(!JSON.stringify(mappedDiscipleship).includes("private"), "Notes, discussion, counsel and action steps never enter the report input.");
assert.equal(dosLoggedMeetingMinutes(mappedDiscipleship[0]), 120, "Entered minutes are the logged duration.");
assert.equal(dosLoggedMeetingMinutes({ ...mappedDiscipleship[0], durationMinutes: 0 }), null, "A zero duration is missing, never 0m.");
const martyPerson = { id: "marty", name: "Marty Vanderzanden", roleInMyLife: "not_active", status: "new" };
const withDiscipleship = build("30d", undefined, { meetings: [...meetings, ...mappedDiscipleship], people: [...people, martyPerson] });
const withoutDiscipleship = build("30d", undefined, { people: [...people, martyPerson] });
const receivedRow = (result, id) => result.receivedRows.find((row) => row.personId === id);
assert.equal(receivedRow(withDiscipleship, "dirk").meetingCount - receivedRow(withoutDiscipleship, "dirk").meetingCount, 3, "Dirk's three in-range discipleship meetings count as time invested in Ryan.");
assert.equal(receivedRow(withDiscipleship, "dirk").loggedMinutes - receivedRow(withoutDiscipleship, "dirk").loggedMinutes, 260);
assert.equal(receivedRow(withoutDiscipleship, "marty"), undefined, "Before USA-265 Marty had nothing logged.");
const martyReceived = receivedRow(withDiscipleship, "marty");
assert.ok(martyReceived && martyReceived.meetingCount === 1 && martyReceived.loggedMinutes === 120, "Marty's meeting is time invested in Ryan even though his Person relationship is New: the form recorded the direction.");
assert.deepEqual([martyReceived.records[0].label, martyReceived.records[0].open, martyReceived.records[0].bucketReason], ["Discipleship meeting · Being discipled", { id: "dm-marty", kind: "discipleship_meeting" }, "Logged in My Record as a discipleship meeting"]);
assert.equal(withDiscipleship.meetings.find((meeting) => meeting.id === "dm-marty").label, "Discipleship meeting");
assert.equal(withDiscipleship.totals.receivedMeetings - withoutDiscipleship.totals.receivedMeetings, 5, "Totals count each in-range discipleship meeting once, the unlinked one included.");
assert.equal(withDiscipleship.totals.uniqueLoggedMinutesReceived - withoutDiscipleship.totals.uniqueLoggedMinutesReceived, 120 + 70 + 70 + 120 + 45);
assert.equal(withDiscipleship.totals.uniqueLoggedMinutesInvested, withoutDiscipleship.totals.uniqueLoggedMinutesInvested, "Being discipled never adds to time invested.");
assert.deepEqual([withoutDiscipleship.totals.unlinkedMeetings, withDiscipleship.totals.unlinkedMeetings], [1, 2], "An unlinked discipleship meeting is counted and named in the Meetings detail, not silently dropped.");
const adaptedDiscipleship = dosMinistryReportInputFromAppData({ accountabilityCheckIns: [], accountabilitySchedules: [], disciplingMe: [{ fieldPersonId: "dirk", id: "rel-dirk", mentorName: "Dirk Bond", status: "active" }], discipleshipMeetings: [discipleshipFixture("dm-adapter", 2, 50)], meetings: [], people: [] });
assert.deepEqual(adaptedDiscipleship.meetings.map((meeting) => [meeting.id, meeting.source, meeting.fieldPersonIds, meeting.durationMinutes]), [["dm-adapter", "discipleship", ["dirk"], 50]]);

// 17. USA-268, production-shaped: Ryan's workspace (read-only audit, 2026-09-11). Aug 12 – Sep 10 holds
// fourteen logged meetings, all with a synthetic noon start and no stored role, and Dirk's Sep 10
// discipleship meeting. Mike Anderson, Lyf Nimmo (as the founder's screenshot showed him) and Samuel
// Gaffney are New (role_in_my_life not_active; "Exploring" is only their stage). Before this revision
// their four meetings (3h 30m) were "Relationship not set" and counted in neither total: 14 meetings,
// 10 invested, 17h 30m. Every meeting now counts once.
const prodNow = new Date("2026-09-11T09:00:00");
const prodPeople = [
  ["mike", "Mike Anderson", "not_active"],
  ["lyf", "Lyf Nimmo", "not_active"],
  ["samuel", "Samuel Gaffney", "not_active"],
  ["danny-p", "Danny Lundquist", "discipling_them"],
  ["philip-p", "Philip John Suaco", "discipling_them"],
  ["tanner-p", "Tanner Kent", "discipling_them"],
  ["release", "Release Test", "discipling_them"],
  ["austin-p", "Austin Clifford", "discipling_them"],
  ["kyle", "Kyle Loving", "discipling_them"],
  ["coggins", "Ryan Coggins", "walking_with_them"],
  ["dirk-p", "Dirk Bond", "mentoring_me"],
  ["marty-p", "Marty Vanderzanden", "not_active"],
].map(([id, name, roleInMyLife]) => ({ id, name, roleInMyLife, status: "new" }));
const noon = (date) => new Date(`${date}T12:00:00`);
const prodMeeting = (id, date, personIds, minutes, type) => ({
  date,
  fieldPersonIds: personIds,
  id,
  meetingStatus: "logged",
  scheduledEndAt: minutes ? new Date(noon(date).getTime() + minutes * 60_000).toISOString() : null,
  scheduledStartAt: minutes ? noon(date).toISOString() : null,
  source: "table",
  tableRole: "ministering",
  tableRoleRecorded: false,
  type,
});
const prodTableMeetings = [
  prodMeeting("t-mike-1", "2026-09-10", ["mike"], 30, "kitchen_table"),
  prodMeeting("t-lyf", "2026-09-10", ["lyf"], 60, "phone"),
  prodMeeting("t-mike-2", "2026-09-10", ["mike"], 60, "zoom"),
  prodMeeting("t-danny-1", "2026-09-09", ["danny-p"], 150, "zoom"),
  prodMeeting("t-danny-2", "2026-09-05", ["danny-p"], 150, "kitchen_table"),
  prodMeeting("t-philip", "2026-09-02", ["philip-p"], 210, "kitchen_table"),
  prodMeeting("t-tanner", "2026-09-02", ["tanner-p"], 150, "kitchen_table"),
  prodMeeting("t-release", "2026-09-02", ["release"], 60, "kitchen_table"),
  prodMeeting("t-austin", "2026-08-21", ["austin-p"], 60, "coffee"),
  prodMeeting("t-danny-3", "2026-08-20", ["danny-p"], 30, "phone"),
  prodMeeting("t-samuel", "2026-08-20", ["samuel"], 60, "phone"),
  prodMeeting("t-kyle", "2026-08-20", ["kyle"], 120, "coffee"),
  prodMeeting("t-coggins-1", "2026-08-20", ["coggins"], 60, "phone"),
  prodMeeting("t-coggins-2", "2026-08-17", ["coggins"], 60, "phone"),
];
const prodDiscipleship = dosMinistryDiscipleshipMeetings([
  { durationMinutes: 120, fieldPersonId: "marty-p", id: "d-marty", meetingDate: "2026-07-06", notes: "private", relationshipId: "rel-marty" },
  { durationMinutes: 120, fieldPersonId: "dirk-p", id: "d-dirk-1", meetingDate: "2026-07-07", notes: "private", relationshipId: "rel-dirk" },
  { durationMinutes: 70, fieldPersonId: "dirk-p", id: "d-dirk-2", meetingDate: "2026-07-10", notes: "private", relationshipId: "rel-dirk" },
  { durationMinutes: 70, fieldPersonId: "dirk-p", id: "d-dirk-3", meetingDate: "2026-07-21", notes: "private", relationshipId: "rel-dirk" },
  { durationMinutes: 60, fieldPersonId: "dirk-p", id: "d-dirk-4", meetingDate: "2026-09-10", notes: "private", relationshipId: "rel-dirk" },
], []);
const prodBuild = (range, period, extra = {}) => buildDosMinistryReport({ checkIns: [], disciplingMe: [], meetings: [...prodTableMeetings, ...prodDiscipleship], now: prodNow, people: prodPeople, period, range, schedules: [], ...extra });
const founder = prodBuild("custom", { end: "2026-09-10", start: "2026-08-12" });
assert.deepEqual([founder.totals.meetings, founder.totals.investedMeetings, founder.totals.receivedMeetings], [15, 14, 1], "Aug 12 – Sep 10: 15 meetings = 14 time invested + 1 invested in me.");
assert.deepEqual([founder.totals.uniqueLoggedMinutesInvested, founder.totals.uniqueLoggedMinutesReceived], [1260, 60], "21h invested (was 17h 30m) and Dirk's 1h.");
const beforeRule = founder.meetings.filter((meeting) => meeting.source === "table" && meeting.people.every((person) => prodPeople.find((item) => item.id === person.id).roleInMyLife !== "not_active"));
assert.deepEqual([beforeRule.length, beforeRule.reduce((sum, meeting) => sum + meeting.minutes, 0)], [10, 1050], "The meetings the 2026-09-09 rule could place: the founder's observed 10 of 14.");
assert.deepEqual(founder.rows.filter((row) => ["mike", "lyf", "samuel"].includes(row.personId)).map((row) => [row.personId, row.relationshipLabel, row.meetingCount, row.minutesByBucket.invested]).sort(), [["lyf", "New", 1, 60], ["mike", "New", 2, 90], ["samuel", "New", 1, 60]], "New relationships keep every meeting and minute.");
assert.deepEqual(["coggins", "danny-p", "dirk-p"].map((id) => { const row = founder.rows.find((item) => item.personId === id); return [row.relationshipLabel, row.minutesByBucket]; }), [["Walking with", { invested: 120, received: 0 }], ["Discipling", { invested: 330, received: 0 }], ["Discipling me", { invested: 0, received: 60 }]], "Walking with, Discipling, and Discipling me all keep their time.");
assert.ok(!JSON.stringify(founder).includes("private"), "No note from a discipleship meeting reaches the report.");
// July: the audited discipleship meetings are in July, outside the founder's screenshot range.
const withJuly = prodBuild("custom", { end: "2026-09-10", start: "2026-07-01" });
assert.deepEqual([withJuly.totals.receivedMeetings, withJuly.totals.uniqueLoggedMinutesReceived], [5, 440], "A range including July shows Dirk's and Marty's July meetings as invested in me.");
assert.deepEqual(withJuly.rows.filter((row) => ["dirk-p", "marty-p"].includes(row.personId)).map((row) => [row.personId, row.relationshipLabel, row.minutesByBucket.received]).sort(), [["dirk-p", "Discipling me", 320], ["marty-p", "New", 120]], "Marty's meeting counts although his Person relationship is New.");
assert.deepEqual([prodBuild("90d").totals.receivedMeetings, prodBuild("90d").totals.uniqueLoggedMinutesReceived], [5, 440], "The 90-day preset (Jun 14 – Sep 11) includes July.");
const withoutJuly = prodBuild("custom", { end: "2026-09-10", start: "2026-07-22" });
assert.deepEqual([withoutJuly.totals.receivedMeetings, withoutJuly.totals.uniqueLoggedMinutesReceived], [1, 60], "A range after Jul 21 shows none of July: nothing out of range is shown to make a figure nonzero.");
const lastWeek = prodBuild("7d");
assert.deepEqual([lastWeek.period.start, lastWeek.totals.uniqueLoggedMinutesInvested, lastWeek.totals.uniqueLoggedMinutesReceived], ["2026-09-05", 30 + 60 + 60 + 150 + 150, 60]);
// A group meeting, a meeting without a duration, a record loaded twice, and a person listed twice.
const groupNew = prodMeeting("t-group", "2026-09-01", ["mike", "lyf", "samuel"], 90, "kitchen_table");
const edge = prodBuild("custom", { end: "2026-09-10", start: "2026-08-12" }, {
  meetings: [...prodTableMeetings, ...prodDiscipleship, groupNew, { ...groupNew }, prodMeeting("t-samuel-no-duration", "2026-08-30", ["samuel"], 0, "phone"), prodMeeting("t-kyle-twice", "2026-08-25", ["kyle", "kyle"], 30, "coffee")],
});
assert.equal(edge.totals.meetings, 15 + 3, "The group meeting loaded twice counts once; the undated-duration meeting and the one listing Kyle twice count once each.");
assert.equal(edge.totals.uniqueLoggedMinutesInvested, 1260 + 90 + 30, "Global elapsed time counts the group's 90 minutes once.");
assert.deepEqual(["mike", "lyf", "samuel"].map((id) => edge.rows.find((row) => row.personId === id).records.filter((record) => record.id === "t-group").length), [1, 1, 1], "Each person present shows the group meeting once.");
assert.deepEqual(["mike", "lyf", "samuel"].map((id) => edge.rows.find((row) => row.personId === id).loggedMinutes - founder.rows.find((row) => row.personId === id).loggedMinutes), [90, 90, 90], "Each row is credited the group's duration.");
assert.equal(edge.meetings.find((meeting) => meeting.id === "t-group").people.length, 3);
assert.equal(edge.rows.find((row) => row.personId === "kyle").meetingCount, 2);
const samuelEdge = edge.rows.find((row) => row.personId === "samuel");
assert.deepEqual([samuelEdge.meetingCount, samuelEdge.meetingsMissingDuration, samuelEdge.completeness, samuelEdge.loggedMinutes], [3, 1, "partial", 150], "Missing duration is not zero duration: the meeting counts, adds no minutes, and marks the row Partial.");
assert.equal(edge.totals.meetingsMissingDuration, 1);

// 17b. Group attendance (USA-271) under the USA-268 contract: recorded
// attendance is its own count, never a meeting, never contact time, never Fruit.
const gatheringFixture = (id, offset, attendeePersonIds, extra = {}) => ({ attendeePersonIds, date: day(offset), groupId: "group-1", groupName: "Tuesday Men's Group", id, status: "completed", ...extra });
const withGatherings = build("30d", undefined, {
  gatherings: [
    gatheringFixture("g-1", 5, ["tanner", "quiet", "quiet"]),
    gatheringFixture("g-2", 9, ["quiet"]),
    gatheringFixture("g-old", 45, ["quiet"]),
    gatheringFixture("g-scheduled", 3, ["quiet"], { status: "scheduled" }),
    gatheringFixture("g-empty", 4, []),
  ],
});
const quietRow = withGatherings.rows.find((row) => row.personId === "quiet");
assert.ok(quietRow, "A person with only recorded attendance is on the table, even with no meeting and no relationship.");
assert.deepEqual([quietRow.gatheringsAttended, quietRow.meetingCount, quietRow.loggedMinutes, quietRow.fruitCount], [2, 0, 0, 0], "Attendance is counted once per gathering and adds no meeting, minute, or Fruit.");
assert.equal(withGatherings.rows.find((row) => row.personId === "tanner").gatheringsAttended, 1);
assert.deepEqual([withGatherings.totals.meetings, withGatherings.totals.uniqueLoggedMinutesInvested], [report.totals.meetings, report.totals.uniqueLoggedMinutesInvested], "Gatherings change no meeting count and no time total.");
assert.equal(withGatherings.totals.gatheringsWithAttendance, 2, "Only completed gatherings in range with a recorded attendee count.");
assert.deepEqual(withGatherings.fruitRows, report.fruitRows, "Attendance is never Fruit.");
assert.equal(dosMinistryGatheringsFromAppData([{ gatherings: [{ attendance: [{ personId: "a", status: "present" }, { personId: "b", status: "absent" }, { personId: "c", status: "guest" }], completedAt: day(2), id: "g", startsAt: day(2), status: "completed" }], id: "group-1", name: "Tuesday Men's Group" }])[0].attendeePersonIds.join(","), "a,c", "Only present and guest attendance reaches the report.");

// 18. The revised surface (USA-268): one period surface, three figures, two tables, report-local detail.
assert.ok(reportUiCode.includes("overflow-x-auto") && reportUiCode.includes("<table") && reportUiCode.includes("sticky left-0"), "The wide table scrolls inside its own container and keeps the Person column visible.");
assert.ok(!reportUiCode.includes("overflow-hidden"), "Nothing in the report clips its own content.");
assert.ok(reportUiCode.includes("grid min-w-0 gap-5"), "The report root never inherits a forced intrinsic width.");
assert.equal((reportUiCode.match(/<table/g) ?? []).length, 2, "Exactly two tables: Time Investment and Ministry Fruit.");
assert.ok(reportUiCode.includes('aria-label="Report period"') && reportUiCode.includes("formatDosMinistryPeriod(report.period)") && reportUiCode.includes('label="Report range"'), "The period and its controls share one surface.");
const summarySurface = reportUiCode.slice(reportUiCode.indexOf('aria-label="Summary"'), reportUiCode.indexOf("</section>", reportUiCode.indexOf('aria-label="Summary"')));
assert.equal((summarySurface.match(/<MetricCard /g) ?? []).length, 3, "Three summary figures.");
assert.ok(!/checkIns|Check-in|unresolved|meetingsMissingDuration|note=/.test(summarySurface), "No check-ins, not-set figure, repeated counts, or notes on the summary.");
for (const gone of ["What flows upward", "Where discipleship is multiplying", "Next action", "nextAction", "Direction unresolved", "Relationship not set", "Needs relationship", "How this is calculated", "each counted once", "logged DOS activity only", "None recorded", " recorded`", "Not connected", "report.notes", "Duration I invested", "Master Ministry Report</"]) {
  assert.ok(!reportUiCode.includes(gone), `The report no longer renders ${gone}.`);
}
for (const kept of ["Ministry Fruit", "Relationship filter", "Contributing records", "Time Investment", "DosDetailSheet", "Open person record", "Open meeting", "Open in My Record", "dosMinistryMultiplicationCell(row)", "<Pill tone=\"grey\">{row.relationshipLabel}</Pill>"]) {
  assert.ok(reportUiCode.includes(kept), `The report keeps ${kept}.`);
}
assert.ok(!reportUiCode.includes("StatusPill"), "The 100px StatusPill would truncate a relationship pill; the local pill uses the same tokens.");
assert.ok(reportUiCode.includes("onClick={() => openPersonDetail(row.personId)}") && reportUiCode.includes("onClick={() => openDetail({ id: row.id, kind: \"fruit\" })}"), "Ordinary person and fruit clicks open report-local detail.");
assert.equal((reportUiCode.match(/onOpenPerson\(/g) ?? []).length, 2, "The full Person record opens only from the detail's Open person record action.");
assert.equal((reportUiCode.match(/onOpenMeeting\(/g) ?? []).length, 1, "The full meeting opens only from the meeting detail's Open action.");
// View state survives detail, a full record, and a reload, without a hydration mismatch (USA-261).
assert.ok(reportUiCode.includes("useLayoutEffect(() => {") && reportUiCode.includes("const saved = readReportView(storageKey);"), "The saved report view is restored in a layout effect after hydration.");
assert.ok(!/use(?:Ref|State|Memo)\([^\n]*readReportView\(/.test(reportUiCode), "Storage is never read during a render.");
assert.ok(reportUiCode.includes("writeReportView(storageKey, { customPeriod, detail, expandedId, filter, range, sort })"), "Range, custom dates, filter, sort, expanded row, and open detail are all remembered.");
assert.ok(reportUiCode.includes("window.history.pushState") && reportUiCode.includes('window.addEventListener("popstate", handlePopState)'), "Browser Back closes detail one level at a time.");
assert.ok(reportUi.includes("catch {\n    /* A browser that refuses session storage simply starts from the defaults. */"), "Storage failure degrades, never throws.");

// 19. Return to Reports from a full record, and the launcher (USA-268).
const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");
const reportsView = client.slice(client.indexOf('activeMoreAppView === "reports" ? ('), client.indexOf('activeMoreAppView === "organizations" ? ('));
assert.ok(reportsView.includes("storageKey={`dos-report-view:${data.workspace.id}`}"), "The report view is remembered per workspace.");
assert.ok(reportsView.includes("onOpenPerson={(personId) => openRecordFromReports(() => openPersonDetail(personId))}"), "Opening a full Person from Reports records the way back.");
assert.ok(client.includes("function openRecordFromReports(open: () => void)") && client.includes("appScrollRef.current?.scrollTop ?? 0") && client.includes('dosReturnTo: "reports"'), "The scroll position and a history entry are kept when a record opens from Reports.");
assert.ok(client.includes('returnLabel={reportsReturn ? "Reports" : null}') && client.includes('returnLabel={!meetingOriginPersonId && reportsReturn ? "Reports" : null}') && client.includes('backLabel={reportsReturn ? "Back to Reports" : "Back to More"}'), "Person, meeting, and My Record offer Back to Reports.");
assert.ok(client.includes("if (reportsReturnRef.current && state?.dosReturnTo !== \"reports\")"), "The browser's Back from that record returns to Reports.");
assert.ok(client.includes("reportsReturn: { scrollTop: number } | null;") && client.includes("reportsReturn,\n      selectedPersonId,"), "A reload keeps the return context.");
const selectTabBody = client.slice(client.indexOf("function selectTab(tab: ActiveTab) {"), client.indexOf("setActiveTab(tab);", client.indexOf("function selectTab(tab: ActiveTab) {")));
assert.ok(selectTabBody.includes("clearReportsReturn();"), "Choosing another destination ends the return context.");
/* A successful save re-enters the app the record lives in (My Record re-opens
   its own tab). That must not end the return context, or the reader loses the
   way back to the report after saving. */
assert.ok(client.includes('if (nextView !== "reports" && nextView !== activeMoreAppView) {\n      clearReportsReturn();'), "Only a move to a different destination ends the return context, so a save keeps Back to Reports.");
const catalog = client.slice(client.indexOf("const appCatalogSections: DosAppCatalogSection[] = ["), client.indexOf("const mobileAppCatalogItems = appCatalogSections"));
const comingSoon = catalog.slice(catalog.indexOf('label: "Coming Soon",'));
const reportsCard = catalog.slice(catalog.indexOf('label: "Reports",'), catalog.indexOf("},", catalog.indexOf('label: "Reports",')));
assert.ok(reportsCard.includes('section: "installed"') && reportsCard.includes('status: "Installed"'), "Reports is an installed app on both launchers.");
assert.ok(!comingSoon.includes('label: "Reports"'), "Reports is never listed under Coming Soon.");
assert.ok(/dosMobileMoreLauncherAppLabels = \[[^\]]*"Reports"/.test(client) && /dosDesktopMoreLauncherAppLabels = \[[^\]]*"Reports"/.test(client));

console.log("DOS ministry report (USA-251 / USA-268) regression passed.");
