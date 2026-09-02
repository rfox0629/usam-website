import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const appClient = read("app/dos/app/DosMvpAppClient.tsx");
const peopleSelectorStart = appClient.indexOf("function MeetingPeopleSelector");
const peopleSelectorEnd = appClient.indexOf("function MinistryTeamSelector", peopleSelectorStart);
const peopleSelectorBlock = appClient.slice(peopleSelectorStart, peopleSelectorEnd);
const formStart = appClient.indexOf("function ScheduleMeetingForm");
const formEnd = appClient.indexOf("function ReminderFormContent", formStart);
const formBlock = appClient.slice(formStart, formEnd);

assert(peopleSelectorStart !== -1 && peopleSelectorEnd !== -1, "MeetingPeopleSelector must exist in DosMvpAppClient.tsx.");
assert(formStart !== -1 && formEnd !== -1, "ScheduleMeetingForm must exist in DosMvpAppClient.tsx.");

assert(
  peopleSelectorBlock.includes("const normalizedQuery = query.trim().toLowerCase();")
    && peopleSelectorBlock.includes("const queryMatchesSelectedPerson = selectedPeople.some((person) => {")
    && peopleSelectorBlock.includes("return normalizedName === normalizedQuery || nameParts.includes(normalizedQuery);")
    && peopleSelectorBlock.includes("onQueryChange(\"\");"),
  "Schedule Meeting must clear stale person search text when the query matches a selected person chip.",
);

/* USA-168 order: Person -> When -> How will you connect? -> optional Notes.
   "Timing" is now "When" and "Meeting Context" is "How will you connect?",
   which asks the communication medium rather than the meeting's purpose. */
assert(
  formBlock.indexOf('title="Person"') < formBlock.indexOf('title="When"')
    && formBlock.indexOf('title="When"') < formBlock.indexOf('title="How will you connect?"')
    && formBlock.indexOf('title="How will you connect?"') < formBlock.indexOf('title="Notes"'),
  "Schedule Meeting must present Person, then When, then How will you connect? before the Notes disclosure.",
);

assert(
  formBlock.includes("DisclosureSection") && formBlock.includes('title="Notes"'),
  "Notes must stay behind a disclosure by default.",
);

const moreOptionsStart = formBlock.indexOf('title="Notes"');

/* Calendar connection management moved to Settings: scheduling a meeting is
   not the place to connect or disconnect Google. The sync state still posts,
   which the hidden-input guard below asserts, so no capability was lost. */
assert(
  !formBlock.includes("<CalendarConnectionCard")
    && !formBlock.includes("<DosFormToggleRow"),
  "Calendar connection management must not live inside Schedule Meeting.",
);

/* Role is inherited from the Person relationship rather than asked per
   meeting, but the value still posts so the payload is unchanged. */
assert(
  !formBlock.includes("<TableRolePicker")
    && formBlock.includes('name="table_role" type="hidden" value={selectedTableRole}'),
  "Schedule Meeting must inherit the relationship role while still posting table_role.",
);

/* The duration control is a designed DOS control, not an OS select. */
assert(
  formBlock.includes("<ScheduledTableTimingFields")
    && appClient.includes("function ScheduledDurationSelect(")
    && appClient.includes("<CompactOptionSelect"),
  "Duration must use a designed DOS control rather than a native select.",
);

assert(
  formBlock.includes("<StickyFormFooter>") && formBlock.includes("</StickyFormFooter>"),
  "Schedule Meeting's primary action must sit in a sticky footer so it stays reachable on mobile.",
);

const googleSyncHiddenInputIndex = formBlock.indexOf('<input name="google_sync_enabled" type="hidden"');

assert(
  googleSyncHiddenInputIndex !== -1 && googleSyncHiddenInputIndex < moreOptionsStart,
  "google_sync_enabled must be carried by an always-mounted hidden input outside More Options, so scheduling without expanding More Options still submits the default sync state. " +
  "(Regression guard: the visible checkbox alone is unmounted while More Options is collapsed, and unchecked/absent checkboxes are indistinguishable in FormData, which silently disabled calendar sync for the default fast path.)",
);

/* The visible Sync to Google toggle moved to Settings, so the state is now
   seeded from the workspace calendar connection and carried by the hidden
   input alone. Scheduling therefore respects the user's own calendar setting
   without asking again, and the submitted value is still explicit. */
assert(
  formBlock.includes("const [syncToGoogle, setSyncToGoogle] = useState(canSyncToGoogle);")
    && formBlock.includes('value={syncToGoogle ? "on" : ""}'),
  "Schedule Meeting must seed calendar sync from the workspace connection and submit it explicitly.",
);

assert(
  formBlock.includes("Log Meeting Instead") && formBlock.includes("onClick={onStartLogMeeting}"),
  "The Log Meeting Instead escape hatch must remain available from the schedule form.",
);

console.log("DOS Schedule Meeting form regression passed.");
