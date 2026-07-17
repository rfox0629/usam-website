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
const formStart = appClient.indexOf("function ScheduleMeetingForm");
const formEnd = appClient.indexOf("function ReminderFormContent", formStart);
const formBlock = appClient.slice(formStart, formEnd);

assert(formStart !== -1 && formEnd !== -1, "ScheduleMeetingForm must exist in DosMvpAppClient.tsx.");

assert(
  formBlock.indexOf('title="Person"') < formBlock.indexOf('title="Timing"')
    && formBlock.indexOf('title="Timing"') < formBlock.indexOf('title="Meeting Context"')
    && formBlock.indexOf('title="Meeting Context"') < formBlock.indexOf('title="More Options"'),
  "Schedule Meeting must present Person, then Timing, then Meeting Context before any More Options disclosure.",
);

assert(
  formBlock.includes("DisclosureSection") && formBlock.includes('title="More Options"'),
  "Calendar sync, discipleship role, and notes must be tucked behind a More Options disclosure by default.",
);

const moreOptionsStart = formBlock.indexOf('title="More Options"');
const moreOptionsBlock = formBlock.slice(moreOptionsStart);

assert(
  moreOptionsBlock.includes("<CalendarConnectionCard")
    && moreOptionsBlock.includes("<TableRolePicker")
    && moreOptionsBlock.includes('name="notes"'),
  "Calendar connection, discipleship role, and notes must live inside the More Options disclosure.",
);

assert(
  !formBlock.slice(0, moreOptionsStart).includes("<CalendarConnectionCard")
    && !formBlock.slice(0, moreOptionsStart).includes("<TableRolePicker"),
  "Calendar connection and discipleship role must not also appear above the fold outside More Options.",
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

assert(
  formBlock.includes("const [syncToGoogle, setSyncToGoogle] = useState(canSyncToGoogle);")
    && formBlock.includes("checked={syncToGoogle}")
    && formBlock.includes("onChange={(event) => setSyncToGoogle(event.currentTarget.checked)}"),
  "The Sync to Google checkbox must be a controlled input wired to the same syncToGoogle state that drives the hidden field, so toggling it while More Options is open still updates what gets submitted.",
);

assert(
  formBlock.includes("Log Table Instead") && formBlock.includes("onClick={onStartLogMeeting}"),
  "The Log Table Instead escape hatch must remain available from the schedule form.",
);

console.log("DOS Schedule Meeting form regression passed.");
