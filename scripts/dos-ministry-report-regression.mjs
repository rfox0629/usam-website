// USA-251 — Master Ministry Report / Time Investment.
//
// These checks hold the report contract the founder set on 2026-09-09
// (USA-250 and the two PR #130 reviews): logged duration only; invested
// time kept apart from time invested in the missionary; a meeting's
// direction classified by a recorded role, else by the confirmed Person
// direction of everyone present, else honestly "Direction unresolved" and
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
assert.deepEqual(dosMinistryTimeBucketLabels, { invested: "Time I invested", received: "Time invested in me", unresolved: "Direction unresolved" });
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
assert.ok(austinClassification.reason.includes("no direction recorded"));
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
assert.equal(austin.completenessLabel, "Direction unresolved");
assert.equal(austin.nextAction.kind, "confirm_direction");
assert.equal(austin.nextAction.label, "Confirm the direction on the Person record");
assert.ok(austin.completenessDetail.includes("nothing is counted as invested or received"));
assert.ok(austin.records.every((record) => record.kind === "meeting" && record.bucket === "unresolved" && record.bucketReason.includes("no direction recorded")));
assert.equal(unresolved("sam").directionConflict !== null, true, "The conflict is stated on Sam's row.");
assert.equal(unresolved("sam").directionStatus, "conflicting");
assert.equal(unresolved("dirk-prod").directionStatus, "unconfirmed");
assert.equal(unresolved("tanner").meetingCount, 1, "Tanner's unresolved row holds only the mixed meeting.");
assert.ok(invested("tanner").completenessDetail.includes("1 more meeting with this person is under Direction unresolved"), "The invested row points at the unresolved meeting.");
assert.equal(invested("tanner").completeness, "recorded", "The unresolved meeting does not degrade the resolved row's duration completeness.");
assert.equal(report.totals.unresolvedMeetings, 5, "Dirk as stored, Austin, Sam, the mixed meeting, and the meeting linked only to an archived person.");
assert.equal(report.totals.uniqueLoggedMinutesUnresolved, 70 + 60 + 60 + 75 + 60);
assert.ok(report.notes.some((note) => note.includes("Direction unresolved")), "The unresolved count is named in the notes.");

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
assert.ok(dosMinistryDirectionForPerson(people[1], []).directionConflict?.includes("Confirm the direction"));
assert.equal(dirk.nextAction.kind, "scheduled");
assert.equal(dirk.nextAction.label, `Next meeting ${formatDosMinistryDate(day(-5), now)}`, "The next-action label carries a readable date.");
assert.equal(formatDosMinistryDate("2025-12-03", now), "Dec 3, 2025");

// 7. Completeness language: never "inactive"; duration language, not clock time; no mentor language.
assert.deepEqual(Object.values(dosMinistryCompletenessLabels), ["Recorded", "Partial", "No qualifying activity", "Direction unresolved"]);
const naomi = invested("naomi");
assert.equal(naomi.completeness, "partial", "A check-in without a duration is Partial.");
assert.equal(naomi.nextAction.kind, "log_check_in");
const serialized = JSON.stringify(report);
assert.ok(!/inactive/i.test(serialized), "The word inactive never appears.");
assert.ok(!/recorded time|clock/i.test(serialized), "Nothing implies clock-in / clock-out precision.");
const visible = JSON.stringify([...report.investedRows, ...report.receivedRows, ...report.unresolvedRows].map((row) => [row.directionLabel, row.nextAction, row.records.map((record) => record.label), row.completenessDetail]));
assert.ok(!/mentor/i.test(visible), "No visible mentor language.");
assert.deepEqual(Object.values(dosMinistryRelationshipDirectionLabels), ["Discipling me", "I am discipling", "Walking with", "Peer encouragement", "No direction recorded"]);
assert.equal(formatDosMinistryMinutes(null), "Not logged");
assert.equal(formatDosMinistryMinutes(210), "3h 30m");

// 8. Relationship rows: people with a direction but no activity in range are listed with "No qualifying activity".
const narrow = build("custom", { end: day(25), start: day(28) });
assert.equal(narrow.relationshipRows.some((row) => row.personId === "dirk"), true);
assert.equal(narrow.relationshipRows.find((row) => row.personId === "dirk").completenessLabel, "No qualifying activity");
assert.equal(report.relationshipRows.some((row) => row.personId === "quiet"), false, "No direction and no activity means no row.");

// 9. Multiplication only from a resolved Person relationship; otherwise honestly not linked.
assert.equal(tanner.downstreamStatus, "not_linked", "Without a resolved Person relationship nothing is claimed.");
assert.deepEqual(tanner.downstream, []);
const resolved = build("30d", undefined, { downstream }).investedRows.find((row) => row.personId === "tanner");
assert.equal(resolved.downstreamStatus, "resolved");
assert.deepEqual(resolved.downstream, [{ name: "Micah", personId: "tanner-ws-micah" }], "The ended relationship is not counted.");
assert.equal(naomi.downstreamStatus, "not_applicable");
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
for (const forbidden of ["notes", "prayerNeeds", "privateNotes", "whatHappened", "conversationResponses", "story", "journal", "reflection"]) {
  assert.ok(!new RegExp(`\\b${forbidden}\\b`).test(inputTypes), `Report inputs must not read ${forbidden}.`);
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

console.log("DOS ministry report (USA-251) regression passed.");
