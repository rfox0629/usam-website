// USA-251 — Master Ministry Report / Time Investment.
//
// These checks hold the report contract the founder set on 2026-09-09
// (USA-250 and the two PR #130 reviews): logged duration only; invested
// time kept apart from time invested in the missionary; a meeting's
// direction classified by a recorded role, else by the confirmed Person
// direction of everyone present, else honestly "Relationship not set" (the
// founder's 2026-09-10 wording for what was "Direction unresolved") and
// never defaulted; check-ins separate from meetings; group time credited per
// person but never summed as unique elapsed time; the Person record canonical
// for direction; completeness stated rather than inferred; no circle input;
// no multiplication without a resolved Person relationship; nothing private
// in what flows upward.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildDosMinistryReport,
  buildDosSafeMinistrySummary,
  dosLoggedMeetingMinutes,
  dosMinistryFruitEntriesFromAppData,
  dosMinistryMultiplicationLabel,
  dosMinistryReportFilterOptions,
  dosMinistryRowMatchesFilter,
  dosMinistryClassifyMeeting,
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

/* The founder's production-shaped cases. */
const people = [
  // Dirk discipling Ryan, confirmed on the Person record (the reconciled end state).
  { id: "dirk", name: "Dirk Bond", relationshipType: "Discipling me · Friend · Exploring", roleInMyLife: "mentoring_me", status: "new" },
  // Dirk as production has him today: legacy summary says Mentor, structured role Not active, My Record says discipling me.
  { id: "dirk-prod", name: "Dirk Bond (as stored)", relationshipType: "Mentor · Friend · Exploring", roleInMyLife: "not_active", status: "new" },
  // Ryan discipling Tanner (production).
  { id: "tanner", name: "Tanner Kent", relationshipType: "Discipling · Family · Exploring", roleInMyLife: "discipling_them", status: "new" },
  { id: "tanner-dup", name: "Tanner Kent", relationshipType: "new", roleInMyLife: "not_active", status: "archived" },
  { id: "philip", name: "Philip John Saco", relationshipType: "Discipling · Church · Exploring", roleInMyLife: "discipling_them", status: "new" },
  { id: "naomi", name: "Naomi Lee", relationshipType: "Walking With · Friend · Exploring", roleInMyLife: "walking_with_them", status: "new" },
  // A person with no direction at all.
  { id: "austin", name: "Austin Clifford", relationshipType: "new", roleInMyLife: "not_active", status: "new" },
  // Conflicting: the Person says I am discipling Sam; My Record says Sam is discipling me.
  { id: "sam", name: "Sam Lucas", relationshipType: "Discipling · Friend · Exploring", roleInMyLife: "discipling_them", status: "new" },
  { id: "quiet", name: "Quiet Person", relationshipType: "new", roleInMyLife: "not_active", status: "new" },
];

const meetings = [
  // Dirk (confirmed): a legacy one-to-one meeting -> invested in me (rule 2); a recorded being-discipled meeting -> same (rule 1);
  // a recorded mutual meeting -> Time I invested (rule 1) despite his direction; next one scheduled.
  legacyMeeting("m-dirk-legacy", 2, ["dirk"], 60),
  recordedMeeting("m-dirk-recorded", 12, ["dirk"], "being_mentored", 120),
  recordedMeeting("m-dirk-mutual", 15, ["dirk"], "mutual_discipleship", 30),
  recordedMeeting("m-dirk-next", -5, ["dirk"], "being_mentored", 60, { meetingStatus: "scheduled" }),
  // Dirk as stored in production: legacy meeting -> unresolved (only My Record says so).
  legacyMeeting("m-dirk-prod-legacy", 6, ["dirk-prod"], 70),
  // Tanner: two legacy meetings, one shared with Philip (both I am discipling) -> invested (rules 3, group agreement).
  legacyMeeting("m-tanner-1", 3, ["tanner"], 90),
  legacyMeeting("m-group", 10, ["tanner", "philip"], 120),
  // Philip: legacy meeting without a duration -> Partial.
  legacyMeeting("m-philip-no-duration", 6, ["philip"], 0),
  // Austin: no direction -> unresolved. Sam: conflicting -> unresolved.
  legacyMeeting("m-austin", 9, ["austin"], 60),
  legacyMeeting("m-sam", 8, ["sam"], 60),
  // Mixed directions in one legacy meeting: Tanner (I am discipling) + Dirk (discipling me) -> unresolved for both.
  legacyMeeting("m-mixed", 18, ["tanner", "dirk"], 75),
  // A recorded role on a mixed meeting still decides (rule 1).
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
  // A check-in with Dirk is Ryan's own activity, so it lands in invested, never in received.
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

// 1. Ranges: 30 days by default; 7 / 30 / 90 / custom offered; inclusive local days.
assert.equal(dosMinistryReportDefaultRange, "30d");
assert.deepEqual(dosMinistryReportRangeOptions.map((option) => option.value), ["7d", "30d", "90d", "custom"]);
assert.deepEqual(dosMinistryReportPeriod("30d", now), { end: "2026-09-09", range: "30d", start: "2026-08-11" });
assert.deepEqual(dosMinistryReportPeriod("7d", now), { end: "2026-09-09", range: "7d", start: "2026-09-03" });
assert.deepEqual(dosMinistryReportPeriod("custom", now, { end: "2026-08-01", start: "2026-08-31" }), { end: "2026-08-31", range: "custom", start: "2026-08-01" }, "A reversed custom range is normalised rather than rejected.");

const report = build("30d");
const invested = (id) => report.investedRows.find((row) => row.personId === id);
const received = (id) => report.receivedRows.find((row) => row.personId === id);
const unresolved = (id) => report.unresolvedRows.find((row) => row.personId === id);
const directionByPersonId = new Map(people.map((person) => [person.id, { ...dosMinistryDirectionForPerson(person, disciplingMe), personName: person.name }]));
const classify = (meeting) => dosMinistryClassifyMeeting(meeting, directionByPersonId);

// 2. Classification rules, one by one.
assert.deepEqual(dosMinistryTimeBucketLabels, { invested: "Time I invested", received: "Time invested in me", unresolved: "Relationship not set" });
assert.equal(dosMinistryTimeBucketForRole("being_mentored"), "received");
assert.equal(dosMinistryTimeBucketForRole("mutual_discipleship"), "invested");
assert.equal(classify(meetings.find((meeting) => meeting.id === "m-dirk-recorded")).bucket, "received", "Rule 1: a recorded being-discipled role.");
assert.equal(classify(meetings.find((meeting) => meeting.id === "m-dirk-mutual")).bucket, "invested", "Rule 1: a recorded mutual role is time I invested even with a Discipling-me Person.");
assert.equal(classify(meetings.find((meeting) => meeting.id === "m-mixed-recorded")).bucket, "invested", "Rule 1: a recorded role decides even for a mixed meeting.");
assert.equal(classify(meetings.find((meeting) => meeting.id === "m-dirk-legacy")).bucket, "received", "Rule 2: legacy one-to-one with a confirmed Discipling-me Person.");
assert.equal(classify(meetings.find((meeting) => meeting.id === "m-tanner-1")).bucket, "invested", "Rule 3: legacy meeting with a person I am discipling.");
assert.equal(classify(meetings.find((meeting) => meeting.id === "m-group")).bucket, "invested", "Rule 3: everyone present is someone I am discipling.");
assert.equal(classify(meetings.find((meeting) => meeting.id === "m-naomi-old")).bucket, "invested", "Rule 3: walking with them is time I invested.");
const dirkProdClassification = classify(meetings.find((meeting) => meeting.id === "m-dirk-prod-legacy"));
assert.equal(dirkProdClassification.bucket, "unresolved", "Rule 4: only My Record says Dirk is discipling me; that is unconfirmed and cannot classify.");
assert.ok(dirkProdClassification.reason.includes("only My Record says so"));
const austinClassification = classify(meetings.find((meeting) => meeting.id === "m-austin"));
assert.equal(austinClassification.bucket, "unresolved", "Rule 4: no direction.");
assert.ok(austinClassification.reason.includes("relationship not set"));
const samClassification = classify(meetings.find((meeting) => meeting.id === "m-sam"));
assert.equal(samClassification.bucket, "unresolved", "Rule 4: conflicting Person / My Record direction.");
assert.ok(samClassification.reason.includes("conflicting"));
const mixedClassification = classify(meetings.find((meeting) => meeting.id === "m-mixed"));
assert.equal(mixedClassification.bucket, "unresolved", "Rule 4: people present in both directions.");
assert.ok(mixedClassification.reason.includes("both directions"));
assert.equal(classify({ fieldPersonIds: ["nobody"], tableRole: "ministering", tableRoleRecorded: false }).bucket, "unresolved", "No linked person means no direction to read.");

// 3. The lists: never ranked together; nothing defaulted to Time I invested.
assert.deepEqual(report.investedRows.map((row) => row.personId), ["tanner", "philip", "dirk", "naomi"], "Invested rows rank by duration I invested; Dirk appears only for the mutual and recorded-ministering meetings and his check-in.");
assert.deepEqual(report.receivedRows.map((row) => row.personId), ["dirk"], "Only Dirk (confirmed) invested time in Ryan.");
assert.deepEqual(report.unresolvedRows.map((row) => row.personId), ["dirk", "tanner", "dirk-prod", "austin", "sam"], "Unresolved rows ranked by unresolved duration: the mixed meeting for Dirk and Tanner, Dirk as stored, Austin, Sam.");
assert.equal(invested("dirk").loggedMinutes, 30 + 40, "Dirk is never ranked by the time he invested in Ryan.");
assert.equal(received("dirk").loggedMinutes, 60 + 120, "Rule 2 and rule 1 both land under time invested in me.");
assert.equal(received("dirk").meetingCount, 2);
assert.equal(received("dirk").checkInCount, 0, "Check-ins are Ryan's own activity and never sit under time received.");
assert.equal(invested("dirk").checkInCount, 1);
assert.equal(invested("austin"), undefined, "A person with no direction is never defaulted into Time I invested.");
assert.equal(invested("dirk-prod"), undefined, "Dirk as stored in production is not defaulted into Time I invested.");
assert.equal(invested("sam"), undefined, "A conflicting direction is not defaulted into Time I invested.");
assert.equal(invested("quiet"), undefined, "A person with no activity is not a row.");
assert.equal(invested("tanner-dup"), undefined, "Archived rows never appear.");

// 4. Unresolved rows: completeness, next action, reasons, and nothing counted.
const austin = unresolved("austin");
assert.equal(austin.completeness, "unresolved");
assert.equal(austin.completenessLabel, "Relationship not set");
assert.equal(austin.nextAction.kind, "confirm_direction");
assert.equal(austin.nextAction.label, "Set the relationship on the Person record");
assert.ok(austin.completenessDetail.includes("nothing is counted as invested or received"));
assert.ok(austin.records.every((record) => record.kind === "meeting" && record.bucket === "unresolved" && record.bucketReason.includes("relationship not set")));
assert.equal(unresolved("sam").directionConflict !== null, true, "The conflict is stated on Sam's row.");
assert.equal(unresolved("sam").directionStatus, "conflicting");
assert.equal(unresolved("dirk-prod").directionStatus, "unconfirmed");
assert.equal(unresolved("tanner").meetingCount, 1, "Tanner's unresolved row holds only the mixed meeting.");
assert.ok(invested("tanner").completenessDetail.includes("1 more meeting with this person is not counted because the relationship is not set"), "The invested row points at the not-counted meeting.");
assert.equal(invested("tanner").completeness, "recorded", "The unresolved meeting does not degrade the resolved row's duration completeness.");
assert.equal(report.totals.unresolvedMeetings, 5, "Dirk as stored, Austin, Sam, the mixed meeting, and the meeting linked only to an archived person.");
assert.equal(report.totals.uniqueLoggedMinutesUnresolved, 70 + 60 + 60 + 75 + 60);
assert.ok(report.notes.some((note) => note.includes("counted as neither invested nor received")), "The not-set count is named in the notes.");

// 5. Duration: logged only; check-ins separate; group time credited per person; totals per bucket, each meeting once.
const tanner = invested("tanner");
assert.equal(tanner.meetingCount, 3, "Two legacy meetings plus the recorded-ministering mixed meeting.");
assert.equal(tanner.loggedMinutes, 90 + 120 + 40);
assert.equal(tanner.checkInCount, 1);
assert.equal(tanner.checkInMinutes, 20);
const philip = invested("philip");
assert.equal(philip.meetingCount, 2, "The group meeting credits Philip too.");
assert.equal(philip.loggedMinutes, 120, "The meeting without a duration contributes nothing, not an estimate.");
assert.equal(philip.meetingsMissingDuration, 1);
assert.equal(philip.completeness, "partial");
assert.equal(philip.nextAction.kind, "complete_record");
assert.equal(philip.nextAction.label, "Add the missing meeting duration");
assert.equal(report.totals.meetings, 12, "Canceled, connection-sourced, out-of-range, and scheduled records are not meetings.");
assert.equal(report.totals.investedMeetings, 5, "tanner-1, group, philip, dirk-mutual, mixed-recorded; the archived-only meeting has no direction to read.");
assert.equal(report.totals.receivedMeetings, 2);
assert.equal(report.totals.uniqueLoggedMinutesInvested, 90 + 120 + 0 + 30 + 40, "Invested total counts the group meeting once.");
assert.equal(report.totals.uniqueLoggedMinutesReceived, 60 + 120);
assert.ok(report.investedRows.reduce((sum, row) => sum + row.loggedMinutes, 0) > report.totals.uniqueLoggedMinutesInvested - 60, "Person rows over-count relative to unique time, which is why they are never summed as your time.");
assert.equal(report.totals.checkIns, 3);
assert.equal(report.totals.meetingsMissingDuration, 1);
assert.equal(report.totals.peopleWithActivity, 7);
assert.ok(report.notes.some((note) => note.includes("connection log")), "Connection logs are named, not silently folded in.");
assert.ok(report.notes.some((note) => note.includes("no linked active person")), "A meeting linked only to an archived person is named in the notes.");
assert.equal(dosLoggedMeetingMinutes({ scheduledEndAt: stamp(1, 12), scheduledStartAt: stamp(1, 13) }), null, "End before start logs nothing.");

// 6. Direction: the Person's structured role is canonical; My Record is a fallback for the label only; conflicts are stated.
const dirk = received("dirk");
assert.equal(dirk.direction, "discipling_me");
assert.equal(dirk.directionSource, "person");
assert.equal(dirk.directionStatus, "confirmed");
assert.equal(dirk.directionConflict, null);
const dirkProd = unresolved("dirk-prod");
assert.equal(dirkProd.direction, "discipling_me", "The label still comes from My Record so the relationship is not hidden.");
assert.equal(dirkProd.directionSource, "my_record");
assert.ok(dirkProd.directionConflict?.includes("The Person record is canonical"), "The row says the Person record must be confirmed.");
assert.equal(tanner.direction, "i_am_discipling");
assert.equal(tanner.directionStatus, "confirmed");
assert.equal(unresolved("sam").direction, "i_am_discipling", "When My Record disagrees with a canonical Person role, the Person wins for the label.");
assert.ok(unresolved("sam").directionConflict?.includes("is canonical"));
assert.equal(dosMinistryDirectionForPerson(people[1], []).direction, "none", "Without My Record, the display summary alone does not become a direction.");
assert.ok(dosMinistryDirectionForPerson(people[1], []).directionConflict?.includes("Set the relationship"));
assert.equal(dirk.nextAction.kind, "scheduled");
assert.equal(dirk.nextAction.label, `Next meeting ${formatDosMinistryDate(day(-5), now)}`, "The next-action label carries a readable date.");
assert.equal(formatDosMinistryDate("2025-12-03", now), "Dec 3, 2025");

// 7. Completeness language: never "inactive"; duration language, not clock time; no mentor language.
assert.deepEqual(Object.values(dosMinistryCompletenessLabels), ["Recorded", "Partial", "No qualifying activity", "Relationship not set"]);
const naomi = invested("naomi");
assert.equal(naomi.completeness, "partial", "A check-in without a duration is Partial.");
assert.equal(naomi.nextAction.kind, "log_check_in");
const serialized = JSON.stringify(report);
assert.ok(!/inactive/i.test(serialized), "The word inactive never appears.");
assert.ok(!/recorded time|clock/i.test(serialized), "Nothing implies clock-in / clock-out precision.");
const visible = JSON.stringify([...report.investedRows, ...report.receivedRows, ...report.unresolvedRows].map((row) => [row.directionLabel, row.nextAction, row.records.map((record) => record.label), row.completenessDetail]));
assert.ok(!/mentor/i.test(visible), "No visible mentor language.");
assert.deepEqual(Object.values(dosMinistryRelationshipDirectionLabels), ["Discipling me", "I am discipling", "Walking with", "Peer encouragement", "Not set"]);
assert.equal(formatDosMinistryMinutes(null), "Not logged");
assert.equal(formatDosMinistryMinutes(210), "3h 30m");

// 8. Relationship rows: people with a direction but no activity in range are listed with "No qualifying activity".
const narrow = build("custom", { end: day(25), start: day(28) });
assert.equal(narrow.relationshipRows.some((row) => row.personId === "dirk"), true);
assert.equal(narrow.relationshipRows.find((row) => row.personId === "dirk").completenessLabel, "No qualifying activity");
assert.equal(report.relationshipRows.some((row) => row.personId === "quiet"), false, "No direction and no activity means no row.");

// 9. Multiplication only from a resolved Person relationship; otherwise an honest state, never a zero or a "No".
assert.equal(tanner.downstreamStatus, "not_connected", "Without a verified DOS identity nothing can be read, so nothing is claimed.");
assert.equal(dosMinistryMultiplicationLabel(tanner), "Not connected");
assert.deepEqual(tanner.downstream, []);
const linkedOnly = build("30d", undefined, { linkedPersonIds: ["tanner"] }).investedRows.find((row) => row.personId === "tanner");
assert.equal(linkedOnly.downstreamStatus, "not_resolved", "A linked identity alone does not let the report say Not recorded; the reader is not built.");
assert.equal(dosMinistryMultiplicationLabel(linkedOnly), "Not resolved yet");
const readEmpty = build("30d", undefined, { downstreamReadPersonIds: ["tanner"], linkedPersonIds: ["tanner"] }).investedRows.find((row) => row.personId === "tanner");
assert.equal(readEmpty.downstreamStatus, "not_recorded", "Only a person whose own records were read can be Not recorded.");
assert.equal(dosMinistryMultiplicationLabel(readEmpty), "Not recorded");
const resolved = build("30d", undefined, { downstream, downstreamReadPersonIds: ["tanner"], linkedPersonIds: ["tanner"] }).investedRows.find((row) => row.personId === "tanner");
assert.equal(resolved.downstreamStatus, "resolved");
assert.deepEqual(resolved.downstream, [{ name: "Micah", personId: "tanner-ws-micah" }], "The ended relationship is not counted.");
assert.equal(dosMinistryMultiplicationLabel(resolved), "1 person");
assert.equal(naomi.downstreamStatus, "not_applicable");
assert.equal(dosMinistryMultiplicationLabel(naomi), "—");
assert.ok(!/\b0 people\b|: No\b/.test(JSON.stringify([tanner, linkedOnly, readEmpty, resolved].map(dosMinistryMultiplicationLabel))), "Never a zero, never a No.");
assert.equal(report.investedRows.every((row) => !("circle" in row) && !("score" in row)), true, "No circle field on any row.");

// 10. Drill-through: every row lists its contributing records with a target to open and the rule that placed it.
assert.deepEqual(tanner.records.map((record) => [record.kind, record.open.kind]), [["check_in", "person"], ["meeting", "meeting"], ["meeting", "meeting"], ["meeting", "meeting"]]);
assert.ok(tanner.records.find((record) => record.id === "m-group").label.includes("with 1 other"));
assert.ok(tanner.records.find((record) => record.id === "m-group").bucketReason.includes("everyone present"));
assert.ok(tanner.records.find((record) => record.id === "m-tanner-1").label.includes("no recorded role"), "A legacy meeting says it has no recorded role.");
assert.equal(tanner.lastActivity.kind, "check_in");
assert.ok(received("dirk").records.every((record) => record.bucket === "received"));

// 11. The 90-day range picks up the older meeting.
assert.equal(build("90d").investedRows.find((row) => row.personId === "naomi").meetingCount, 1);

// 12. What flows upward: only the safe summary fields, invested / received / unresolved apart, only while the relationship is active.
const summary = buildDosSafeMinistrySummary(report);
assert.deepEqual(Object.keys(summary).sort(), [...dosSafeMinistrySummaryFields].sort());
for (const field of dosSafeMinistrySummaryExcluded) {
  assert.ok(!(field in summary), `${field} must not be in the safe summary.`);
}
assert.ok(!JSON.stringify(summary).includes("Tanner"), "The safe summary carries counts, not names.");
assert.equal(summary.loggedMinutesInvested, 280);
assert.equal(summary.loggedMinutesReceived, 180);
assert.equal(summary.loggedMinutesUnresolved, 325);
assert.equal(summary.meetingsUnresolved, 5);
assert.equal(summary.downstreamRelationships, 0);
assert.equal(summary.completeness, "partial");
assert.deepEqual(
  dosUpstreamViewers(people, disciplingMe).map((viewer) => [viewer.name, viewer.source]),
  [["Dirk Bond", "person"], ["Dirk Bond", "my_record"], ["Sam Lucas", "my_record"]],
  "The Person record is first; My Record adds only what the Person does not carry; an archived relationship no longer receives the summary.",
);
assert.equal(dosUpstreamViewers(people, disciplingMe.map((relationship) => ({ ...relationship, status: "archived" }))).length, 1, "Ending every My Record relationship leaves only the canonical Person one.");

// 13. The module reads nothing private, keeps no chain model, and never defaults a direction.
const source = readFileSync(new URL("../src/lib/dos/ministry-report.ts", import.meta.url), "utf8");
const inputTypes = source.slice(source.indexOf("/* ---------- inputs"), source.indexOf("/* ---------- outputs"));
for (const forbidden of ["notes", "prayerNeeds", "privateNotes", "whatHappened", "conversationResponses", "story", "journal", "reflection", "description", "comments", "whatChanged", "decisionMade", "nextStep", "prayerFocus", "actionStep", "body", "summary"]) {
  /* A declared input field, e.g. `  story: string;`. Display labels such as
     "Fruit story" are not fields. */
  assert.ok(!new RegExp(`^\\s*${forbidden}\\??:`, "m").test(inputTypes), `Report inputs must not read ${forbidden}.`);
}
assert.ok(!source.includes('import "server-only"'), "The report module stays pure so it can run anywhere.");
assert.ok(!/45|75/.test(source.replace(/\/\*[\s\S]*?\*\//g, "")), "No duration estimate constants in the calculation.");
const loader = readFileSync(new URL("../src/lib/dos/missionary-app.ts", import.meta.url), "utf8");
assert.ok(!source.includes("discipleshipChain") && !loader.includes("discipleshipChain"), "Person is the canonical relationship record; no separate chain model.");
assert.ok(inputTypes.includes('source: "person_relationship"') && inputTypes.includes("identityLinkId"), "Downstream relationships resolve from Person relationships through a DOS identity.");
assert.ok(loader.includes("tableRoleRecorded: dosAppTableRoles.includes(meeting.table_role as DosAppTableRole)"), "The loader says whether a role was stored, so a default never classifies a meeting.");
assert.ok(inputTypes.includes("tableRoleRecorded: boolean"), "The report reads whether the role was recorded.");

// 14. Colour language (founder, 2026-09-09): no yellow, amber, orange, or red in the report; green only for confirmed status.
const reportUi = readFileSync(new URL("../src/components/dos/reports/MinistryTimeInvestmentReport.tsx", import.meta.url), "utf8");
const warningColour = /amber|orange|yellow|text-red|bg-red|border-red|ring-red|#F59|#FEF3|#FDE68|#B45309|#D97706|#DC2626|#EF4444|#FCA5A5|#FEE2E2|#B91C1C|#F97316|#FBBF24|#FFF7ED|#EA580C|#FDF0D5|#FDE8E8|#FECACA|#F87171/i;
assert.ok(!warningColour.test(reportUi.replace(/\/\*[\s\S]*?\*\//g, "")), "The report never uses yellow, amber, orange, or red.");
assert.ok(/partial: "blue"/.test(reportUi) && /unresolved: "blue"/.test(reportUi) && /none: "grey"/.test(reportUi) && /recorded: "green"/.test(reportUi), "Partial and unresolved are blue, no activity is grey, recorded is the only green.");
assert.ok(reportUi.includes("bg-dos-blue50 px-3 py-2 text-dos-meta text-dos-blueText\">{row.directionConflict}"), "Conflict notes are calm blue notices.");

// 15. One primary table (founder, 2026-09-10): one row per person; per-direction figures kept apart; "Relationship not set" language.
const rowOf = (id) => report.rows.find((row) => row.personId === id);
assert.equal(report.rows.filter((row) => row.personId === "dirk").length, 1, "Dirk appears once, not once per direction.");
const dirkRow = rowOf("dirk");
assert.equal(dirkRow.meetingCount, 5, "Legacy, recorded, mutual, mixed, and mixed-recorded meetings all sit on the one row.");
assert.deepEqual(dirkRow.minutesByBucket, { invested: 30 + 40, received: 60 + 120, unresolved: 75 }, "The row keeps invested, invested-in-me, and not-counted time apart.");
assert.equal(dirkRow.loggedMinutes, 70 + 180 + 75);
assert.equal(dirkRow.checkInCount, 1);
assert.equal(dirkRow.relationshipLabel, "Discipling me");
assert.equal(dirkRow.relationshipNote, null);
assert.equal(dirkRow.completeness, "recorded", "A confirmed person whose only not-counted meeting is a mixed group is not 'needs relationship'.");
assert.ok(dirkRow.completenessDetail.includes("1 meeting not counted in either direction"), "The row says which meeting is not counted and why.");
assert.equal(dirkRow.lastActivity.date, day(2), "Latest activity across every direction (the legacy meeting, two days ago; his check-in was four).");
const samuelLike = rowOf("austin");
assert.equal(samuelLike.relationshipLabel, "Not set", "The Samuel Gaffney case: the relationship is Not set, never inferred.");
assert.equal(samuelLike.completeness, "unresolved");
assert.equal(samuelLike.completenessLabel, "Relationship not set");
assert.equal(samuelLike.meetingCount, 1, "The meeting is kept.");
assert.equal(samuelLike.loggedMinutes, 60, "The duration is kept.");
assert.deepEqual(samuelLike.minutesByBucket, { invested: 0, received: 0, unresolved: 60 }, "Counted in neither direction.");
assert.equal(rowOf("dirk-prod").relationshipLabel, "Discipling me", "Dirk as stored keeps the My Record label so the relationship is not hidden.");
assert.equal(rowOf("dirk-prod").relationshipNote, "Not confirmed on the Person record");
assert.equal(rowOf("dirk-prod").completeness, "unresolved");
assert.equal(rowOf("sam").relationshipNote, "My Record disagrees");
assert.equal(rowOf("sam").completeness, "unresolved");
assert.equal(rowOf("tanner").completeness, "recorded");
assert.equal(rowOf("philip").completeness, "partial");
assert.equal(rowOf("quiet"), undefined, "No relationship and no activity means no row.");
assert.equal(rowOf("tanner-dup"), undefined, "Archived rows never appear.");
assert.ok(rowOf("naomi").direction === "walking_with", "Walking-with rows are on the table.");
const narrowRows = build("custom", { end: day(25), start: day(28) }).rows;
const dirkNoActivity = narrowRows.find((row) => row.personId === "dirk");
assert.equal(dirkNoActivity.completeness, "none", "A confirmed relationship with no activity is on the table as No qualifying activity, never a task.");
assert.equal(dirkNoActivity.meetingCount, 0);
assert.equal(dirkNoActivity.loggedMinutes, 0);
assert.ok(!/inactive/i.test(JSON.stringify(report.rows)));
assert.ok(!/Direction unresolved/.test(JSON.stringify(report)), "The old wording is gone from every output.");
// Filters.
assert.deepEqual(dosMinistryReportFilterOptions.map((option) => option.value), ["all", "i_am_discipling", "discipling_me", "not_set"]);
const filtered = (filter) => report.rows.filter((row) => dosMinistryRowMatchesFilter(row, filter)).map((row) => row.personId);
assert.deepEqual(filtered("all"), report.rows.map((row) => row.personId));
assert.ok(filtered("i_am_discipling").includes("tanner") && filtered("i_am_discipling").includes("sam") && !filtered("i_am_discipling").includes("dirk"));
assert.ok(filtered("discipling_me").includes("dirk") && filtered("discipling_me").includes("dirk-prod") && !filtered("discipling_me").includes("tanner"));
assert.deepEqual(filtered("not_set").sort(), ["austin", "dirk-prod", "sam"].sort(), "Not set, not confirmed, and conflicting all need the relationship set.");
assert.ok(report.rows[0].loggedMinutes >= report.rows[1].loggedMinutes, "Rows sort by logged duration.");

// 16. Ministry Fruit: structured sources only, stored links only, honest status.
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
    { comments: "Private comment that must never appear", conversationHelpful: null, feltCaredFor: null, feltHeard: null, id: "rev-1", meetingId: "m-tanner-1", outcomeTags: ["Felt encouraged", "Discipling"], overallRating: "very_meaningful", personId: null, status: "submitted", submittedAt: stamp(1, 20), submittedEmail: null, submittedFirstName: null, submittedLastName: null, submittedName: null, wantsFollowUp: null, wouldMeetAgain: null, wouldMeetAgainResponse: null },
    { comments: null, conversationHelpful: null, feltCaredFor: null, feltHeard: null, id: "rev-draft", meetingId: "m-tanner-1", outcomeTags: [], overallRating: null, personId: "tanner", status: "draft", submittedAt: stamp(1, 21), submittedEmail: null, submittedFirstName: null, submittedLastName: null, submittedName: null, wantsFollowUp: null, wouldMeetAgain: null, wouldMeetAgainResponse: null },
  ],
  participantTestimonies: [
    { decisionMade: "private", id: "test-1", meetingId: "m-philip-no-duration", nextStep: "private", outcomeTags: ["Discipleship growth"], permissionToShare: true, personId: "philip", publicDisplayName: null, status: "approved", story: "Private story that must never appear", submittedAt: stamp(2, 19), submittedEmail: null, submittedName: null, whatChanged: "private" },
  ],
  resolveJourneySession: (slug, session) => ({ resourceTitle: slug === "marks-of-discipleship" ? "Marks of Discipleship" : null, sessionTitle: session === "week-1" ? "Week 1: Follow Me" : null }),
});
const withFruit = build("30d", undefined, { fruit: fruitEntries });
const fruitById = new Map(withFruit.fruitRows.map((row) => [row.id, row]));
assert.deepEqual(withFruit.fruitRows.map((row) => row.id), ["review-rev-1", "testimony-test-1", "fruit_event-ev-1", "fruit_story-story-1", "fruit_event-ev-2", "journey_progress-prog-1"], "Newest first (same-day entries by person name); hidden, draft, incomplete, and undated entries are not rows.");
assert.deepEqual([fruitById.get("fruit_event-ev-1").text, fruitById.get("fruit_event-ev-1").sourceLabel, fruitById.get("fruit_event-ev-1").statusLabel, fruitById.get("fruit_event-ev-1").statusTone], ["Gospel Conversation", "Fruit", "Verified", "green"], "A fruit event shows its fruit type; verified is the only green.");
assert.deepEqual(fruitById.get("fruit_event-ev-1").open, { id: "m-tanner-1", kind: "meeting" }, "The stored meeting link opens the meeting.");
assert.equal(fruitById.get("fruit_event-ev-1").personName, "Tanner Kent");
assert.deepEqual([fruitById.get("fruit_event-ev-2").personName, fruitById.get("fruit_event-ev-2").personSource, fruitById.get("fruit_event-ev-2").statusLabel, fruitById.get("fruit_event-ev-2").statusTone], ["Not linked", "none", "Observed", "blue"], "A meeting with two people does not pick one; observed is blue.");
assert.deepEqual([fruitById.get("review-rev-1").text, fruitById.get("review-rev-1").personName, fruitById.get("review-rev-1").personSource, fruitById.get("review-rev-1").statusLabel], ["Very meaningful · Felt encouraged · Discipling", "Tanner Kent", "meeting", "Submitted"], "A review shows its rating and chosen tags; the person comes from the meeting's single stored link.");
assert.deepEqual([fruitById.get("testimony-test-1").text, fruitById.get("testimony-test-1").statusLabel, fruitById.get("testimony-test-1").statusTone], ["Testimony shared · Discipleship growth", "Approved", "green"]);
assert.deepEqual([fruitById.get("fruit_story-story-1").text, fruitById.get("fruit_story-story-1").sourceLabel], ["Joined Discipleship", "Fruit story"]);
assert.deepEqual([fruitById.get("journey_progress-prog-1").text, fruitById.get("journey_progress-prog-1").relatedLabel, fruitById.get("journey_progress-prog-1").statusLabel, fruitById.get("journey_progress-prog-1").open], ["Completed Week 1: Follow Me", "Marks of Discipleship", "Completed", null], "Journey progress is a completed session, related to its resource, with no fabricated meeting link.");
const fruitSerialized = JSON.stringify(withFruit.fruitRows);
for (const secret of ["private", "Private", "never appear", "A leader-written title"]) {
  assert.ok(!fruitSerialized.includes(secret), `Narrative never reaches the fruit table (${secret}).`);
}
assert.equal(withFruit.rows.find((row) => row.personId === "tanner").fruitCount, 3, "The Fruit column counts entries that name the person (the story and the event) plus one resolved through the meeting's single link (the review).");
assert.equal(withFruit.rows.find((row) => row.personId === "philip").fruitCount, 2);
assert.equal(withFruit.rows.find((row) => row.personId === "dirk").fruitCount, 0);
assert.ok(withFruit.notes.some((note) => note.includes("no date")), "Undated fruit is named, not silently dropped.");
assert.deepEqual(report.fruitRows, [], "No fruit input, no fruit rows.");
assert.ok(!JSON.stringify(fruitEntries).includes("never appear"), "The adapter never carries narrative, so the calculation cannot show it.");

// 17. The revised UI: one table in a scroll container with a sticky Person column; removed sections stay removed; founder wording.
const reportUiCode = reportUi.replace(/\/\*[\s\S]*?\*\//g, "");
assert.ok(reportUiCode.includes("overflow-x-auto") && reportUiCode.includes("<table") && reportUiCode.includes("sticky left-0"), "The table scrolls inside its own container and keeps the Person column visible.");
assert.ok(!reportUiCode.includes("overflow-hidden"), "Nothing in the report clips its own content.");
assert.ok(reportUiCode.includes("grid min-w-0 gap-6"), "The report root never inherits a forced intrinsic width.");
assert.equal((reportUiCode.match(/<table/g) ?? []).length, 2, "Exactly two tables: Time Investment and Ministry Fruit.");
for (const gone of ["What flows upward", "Where discipleship is multiplying", "without activity in this range", "Next action", "nextAction", "Direction unresolved", "Recent Fruit", "Recent Reviews", "buildDosSafeMinistrySummary", "dosUpstreamViewers"]) {
  assert.ok(!reportUiCode.includes(gone), `The report no longer renders ${gone}.`);
}
for (const kept of ["Relationship not set", "Needs relationship", "Not connected", "Ministry Fruit", "How this is calculated", "Relationship filter", "Contributing records", "Report range", "Duration I invested", "Invested in me"]) {
  assert.ok(reportUiCode.includes(kept), `The report keeps ${kept}.`);
}
assert.ok(!/\b0 people\b|"No"/.test(reportUiCode), "Multiplication never renders a zero or a No.");
assert.ok(!reportUiCode.includes("StatusPill"), "The 100px StatusPill would truncate 'Needs relationship'; the local pill uses the same tokens.");

console.log("DOS ministry report (USA-251) regression passed.");
