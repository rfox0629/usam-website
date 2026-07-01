import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");
const editMeetingStart = source.indexOf('formMode === "editMeeting"');
const meetingNotesStart = source.indexOf('formMode === "meetingNotes"', editMeetingStart);
const editMeetingBlock = editMeetingStart >= 0 && meetingNotesStart > editMeetingStart
  ? source.slice(editMeetingStart, meetingNotesStart)
  : "";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(
  source.includes("onLogScheduledMeeting: (meeting: DosAppMeeting) => void;"),
  "Meeting calendar must expose a scheduled-table logging callback.",
);
assert(
  source.includes("onLogScheduledMeeting(item.meeting);"),
  "Needs Review scheduled meetings must log the existing meeting instead of starting a new table.",
);
assert(
  source.includes('meetingStatus: isLoggingScheduledMeeting ? "logged" : selectedMeeting.meetingStatus'),
  "Scheduled-table log submit must convert the existing record to logged.",
);
assert(
  editMeetingBlock.includes('title={isLoggingSelectedScheduledMeeting ? "Log Table" : "Edit Table"}'),
  "Scheduled-table log sheet should present itself as Log Table.",
);
assert(
  editMeetingBlock.includes('size={isLoggingSelectedScheduledMeeting ? "form" : "default"}'),
  "Scheduled-table log sheet should use desktop form sizing while preserving normal edit sizing.",
);
assert(
  editMeetingBlock.includes("includeReflectionFields={isLoggingSelectedScheduledMeeting}"),
  "Scheduled-table log sheet should include normal logging reflection fields.",
);
assert(
  editMeetingBlock.includes("onToggleOutcomeTag={toggleOutcomeTag}"),
  "Scheduled-table log sheet should wire observed fruit toggles.",
);
assert(
  editMeetingBlock.includes("selectedOutcomeTags={selectedOutcomeTags}"),
  "Scheduled-table log sheet should receive selected observed fruit state.",
);
assert(
  !source.includes("onLogTable(personIds, item.meeting?.type)"),
  "Scheduled meetings must not use the generic new-table log path.",
);

console.log("DOS scheduled table log regression passed.");
