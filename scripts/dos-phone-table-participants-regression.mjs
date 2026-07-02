import { readFileSync } from "node:fs";

const clientSource = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");
const routeSource = readFileSync(new URL("../app/api/dos/app/meetings/route.ts", import.meta.url), "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const meetingFormStart = clientSource.indexOf("function MeetingFormContent");
const meetingFormEnd = clientSource.indexOf("function CalendarConnectionCard", meetingFormStart);
const meetingFormSource = meetingFormStart >= 0 && meetingFormEnd > meetingFormStart
  ? clientSource.slice(meetingFormStart, meetingFormEnd)
  : "";
const participantsSectionIndex = meetingFormSource.indexOf('title="Participants"');
const ministryTeamSectionIndex = meetingFormSource.indexOf('title="Ministry Team"');

assert(meetingFormSource, "MeetingFormContent source must be found.");
assert(participantsSectionIndex >= 0, "Meeting form must include a Participants section.");
assert(ministryTeamSectionIndex >= 0, "Meeting form must include a Ministry Team section.");
assert(
  participantsSectionIndex < ministryTeamSectionIndex,
  "Participants must appear before Ministry Team so Field people are entered as primary participants.",
);
assert(
  routeSource.includes("function meetingPersonRoleIds(payload: MeetingPayload)"),
  "Meeting route must normalize participant and ministry team person roles.",
);
assert(
  routeSource.includes("requestedMinistryTeamPersonIds.length === 1"),
  "Meeting route must catch the single Field person selected through the ministry team picker.",
);
assert(
  routeSource.includes("participantPersonIds: requestedMinistryTeamPersonIds"),
  "Single Field person role fallback must persist as a participant.",
);
assert(
  routeSource.includes("requestedMinistryTeamPersonIds.filter((personId) => !participantPersonIdSet.has(personId))"),
  "Meeting route must avoid duplicating the same Field person as participant and ministry team.",
);
assert(
  routeSource.includes("field_person_ids: validPersonIds") && routeSource.includes("participant_names: participantNames"),
  "Meeting create/edit payloads must continue writing legacy participant ids and display names.",
);

console.log("DOS phone table participant regression passed.");
