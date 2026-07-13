import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");

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
  source.includes('title={isLoggingSelectedScheduledMeeting ? "Log Meeting" : "Edit Meeting"}'),
  "Scheduled-table log sheet should present itself as Log Meeting.",
);
assert(
  source.includes('includeReflectionFields={selectedMeeting.meetingStatus !== "scheduled" || isLoggingSelectedScheduledMeeting}'),
  "Scheduled-table log sheet should include normal logging reflection fields while logged edit keeps reflection editing.",
);
assert(
  !source.includes("onLogTable(personIds, item.meeting?.type)"),
  "Scheduled meetings must not use the generic new-table log path.",
);

console.log("DOS scheduled table log regression passed.");
