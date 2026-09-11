import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/* USA-265: discipleship meetings reach the Person record and Reports.
   Ryan logged discipleship meetings with Dirk Bond and Marty Vanderzanden
   through Log Discipleship Meeting. They were saved correctly
   (`dos_user_mentor_meetings`, linked to each Person), but the Person record
   and the report read only logged meetings, so both said nothing was logged.
   The report's behaviour is proven in dos-ministry-report-regression §16c;
   this guards the wiring that carries the records to the screens. */

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\s*\}/g, "");
const client = stripComments(read("app/dos/app/DosMvpAppClient.tsx"));
const reportUi = stripComments(read("src/components/dos/reports/MinistryTimeInvestmentReport.tsx"));
const slice = (start, end = "\nfunction ") => {
  const index = client.indexOf(start);
  assert.ok(index !== -1, `${start} must exist`);
  return client.slice(index, client.indexOf(end, index + start.length));
};

/* ---- Report input ------------------------------------------------------- */
assert.ok(
  client.includes("discipleshipMeetings: data.myRecord.mentorMeetings,") && client.includes("data.myRecord.mentorMeetings, data.myRecord.mentorRelationships"),
  "the report reads My Record discipleship meetings and recomputes when they change",
);
assert.ok(
  client.includes('onOpenMeeting={(meetingId, kind) => (kind === "discipleship_meeting" ? openDiscipleshipMeeting(meetingId) : openMeetingDetail(meetingId))}'),
  "a discipleship meeting in the report opens the discipleship meeting, not a missing logged meeting",
);
assert.ok(
  reportUi.includes('record.open.kind === "person" ? onOpenPerson(record.open.id) : onOpenMeeting(record.open.id, record.open.kind)'),
  "the report passes the record's kind when it opens a meeting",
);

/* ---- Person record ------------------------------------------------------ */
const overlay = slice("function PersonDetailOverlay({");
assert.ok(
  overlay.includes("dosDiscipleshipMeetingPersonId(meeting, discipleshipRelationships) === person.id"),
  "a Person shows the discipleship meetings linked to it, by stored link or saved relationship, never by name",
);
assert.ok(
  overlay.includes("personDiscipleshipMeetings[0]?.meetingDate") && overlay.includes("const lastDiscipleshipMeeting = "),
  "the last meeting and last contact include discipleship meetings",
);
assert.ok(
  overlay.includes("onClick={() => onOpenDiscipleshipMeeting(lastDiscipleshipMeeting.id)}") && overlay.includes('title: "Discipleship meeting"'),
  "the last-meeting card and the timeline both show and open discipleship meetings",
);
assert.ok(
  client.includes("discipleshipMeetings={data.myRecord.mentorMeetings}") && client.includes("discipleshipRelationships={data.myRecord.mentorRelationships}") && client.includes("onOpenDiscipleshipMeeting={openDiscipleshipMeeting}"),
  "the Person record is given the meetings, their relationships, and a way to open them",
);

/* ---- Opening one -------------------------------------------------------- */
assert.ok(
  client.includes("function openDiscipleshipMeeting(meetingId: string) {") && client.includes("launchMyRecordAction(`mentor_meeting:${meetingId}`);"),
  "opening a discipleship meeting launches My Record with that meeting",
);
const workspace = slice("function MyRecordWorkspace({", "\nfunction GrowthMilestoneRow(");
assert.ok(
  workspace.includes('launchAction.startsWith("mentor_meeting:")') && workspace.includes('mode: "view" });'),
  "My Record shows the requested discipleship meeting as a record",
);

console.log("DOS discipleship meeting linkage (USA-265) regression passed.");
