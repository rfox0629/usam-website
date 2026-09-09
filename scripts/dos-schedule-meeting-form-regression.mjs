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

/* USA-246 (founder correction 3): Schedule Meeting asks for Date, Start
   time and End time, and derives the duration. Start and End are the same
   DOS control at the same width in one row; each picker expands inline
   beneath its own field, in normal flow, so nothing floats over the sticky
   action or clips. The scheduling stepper is gone; Log Meeting keeps its
   15-minute duration stepper (founder correction 4). */
const timingStart = appClient.indexOf("function ScheduledTableTimingFields(");
const timingEnd = appClient.indexOf("\nfunction ", timingStart + 1);
const timingBlock = appClient.slice(timingStart, timingEnd);
const timeInputStart = appClient.indexOf("function DosTimeInput(");
const timeInputEnd = appClient.indexOf("\nfunction ", timeInputStart + 1);
const timeInputBlock = appClient.slice(timeInputStart, timeInputEnd);

assert(timingStart !== -1 && timingEnd !== -1, "ScheduledTableTimingFields must exist in DosMvpAppClient.tsx.");
assert(timeInputStart !== -1 && timeInputEnd !== -1, "DosTimeInput must exist in DosMvpAppClient.tsx.");
assert(
  timingBlock.includes('<div className="grid grid-cols-2 gap-3">')
    && timingBlock.includes('label="Start time" name={timeName}')
    && timingBlock.includes('label="End time" name="scheduled_end_time"')
    && timingBlock.indexOf('label="Start time"') < timingBlock.indexOf('label="End time"')
    && !timingBlock.includes('label="Duration"')
    && !timingBlock.includes("<Stepper")
    && !timingBlock.includes("absolute"),
  "Schedule Meeting must present Start time and End time as equal-weight DOS time controls in one row, with no duration stepper.",
);
assert(
  timingBlock.includes("<input name={durationName} readOnly type=\"hidden\" value={durationMinutes ?? \"\"} />")
    && timingBlock.includes("formatDurationLabel(durationMinutes)"),
  "Schedule Meeting must derive the duration from Start and End and still post it under the existing duration field name.",
);
assert(
  timingBlock.includes("End time must be after the start time.")
    && timingBlock.includes("if (!endTouched && nextStartMinutes !== null")
    && timingBlock.includes("setEndTouched(true);"),
  "End must follow Start until it is edited, and an End at or before Start must be rejected.",
);
assert(
  timeInputBlock.includes('type="hidden" value={value}')
    && timeInputBlock.includes('role="combobox"')
    && timeInputBlock.includes('role="listbox"')
    && timeInputBlock.includes('role="option"')
    && timeInputBlock.includes("mt-2 max-h-56 overflow-y-auto")
    && !timeInputBlock.includes("absolute mt-2")
    && !timeInputBlock.includes('type="time"'),
  "The DOS time control must post HH:MM from a hidden input, accept typed entry, and open an inline (non-floating, non-native) 15-minute listbox.",
);
assert(
  !appClient.includes("function ScheduledDurationSelect(")
    && appClient.includes("function MeetingDurationSelector(")
    && appClient.includes('incrementLabel="15 minutes more"'),
  "The scheduling stepper must be gone while Log Meeting keeps its 15-minute duration stepper.",
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
