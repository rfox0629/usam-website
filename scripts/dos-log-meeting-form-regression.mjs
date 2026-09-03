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
const meetingFormStart = appClient.indexOf("function MeetingFormContent");
const meetingFormEnd = appClient.indexOf("function CalendarConnectionCard", meetingFormStart);
const meetingFormBlock = appClient.slice(meetingFormStart, meetingFormEnd);

assert(peopleSelectorStart !== -1 && peopleSelectorEnd !== -1, "MeetingPeopleSelector must exist in DosMvpAppClient.tsx.");
assert(meetingFormStart !== -1 && meetingFormEnd !== -1, "MeetingFormContent must exist in DosMvpAppClient.tsx.");

assert(
  peopleSelectorBlock.includes("function selectPerson(personId: string)") &&
    peopleSelectorBlock.includes("onToggle(personId);") &&
    peopleSelectorBlock.includes("onQueryChange(\"\");") &&
    peopleSelectorBlock.includes("onClick={() => selectPerson(person.id)}"),
  "Selecting an existing participant must clear the participants search query after adding the chip.",
);

/* USA-168 locked the primary path to date -> who -> more people. "Your role"
   left the visible flow: a Person meeting is the user's relationship with that
   person, so it is no longer asked per meeting -- but the value still posts,
   which is asserted below. The guarantee being guarded is unchanged:
   participants come first, and everyone else stays behind one collapsed
   disclosure rather than expanding the form by default. */
assert(
  meetingFormBlock.indexOf('title="Who was there?"') !== -1
    && meetingFormBlock.indexOf('title="Who was there?"') < meetingFormBlock.indexOf('title="More people"'),
  "Log Meeting must show participants before the collapsed More people disclosure.",
);

const morePeopleStart = meetingFormBlock.indexOf('title="More people"');
const morePeopleBlock = meetingFormBlock.slice(0, morePeopleStart);

assert(
  morePeopleBlock.includes("<DisclosureSection"),
  "More people must be rendered as a collapsed disclosure.",
);

assert(
  meetingFormBlock.includes("<MinistryTeamSelector")
    && meetingFormBlock.includes("<SupportingAttendeeSelector"),
  "Ministry Team and Supporting Attendees must remain available inside the disclosure.",
);

// Role left the UI but not the contract: the payload still carries it, so
// historical role data and the backend stay unchanged.
assert(
  !meetingFormBlock.includes("<TableRolePicker")
    && meetingFormBlock.includes('name="table_role" type="hidden" value={selectedTableRole}'),
  "Your role must be gone from the visible flow while still posting table_role.",
);

// Nothing is prefilled any more -- the old workspace ministry-team default was
// a single household's workflow, not a DOS default -- so the disclosure opens
// only when the launch context genuinely supplied someone.
assert(
  meetingFormBlock.includes("defaultOpen={selectedMinistryTeamPersonIds.length + selectedMinistryTeamMemberIds.length + selectedSupportingAttendeeIds.length > 0}"),
  "More people must auto-open only for a genuinely supplied team member or supporting attendee.",
);

assert(
  appClient.includes("const [selectedMinistryTeamMemberIds, setSelectedMinistryTeamMemberIds] = useState<string[]>([]);"),
  "Log Meeting must not prefill any ministry team member by default.",
);

assert(
  meetingFormBlock.includes("summary={morePeopleSummary}")
    && meetingFormBlock.includes("const morePeopleSummary = (() => {"),
  "The collapsed More people header must report who it contains.",
);

assert(
  !meetingFormBlock.includes('title="What happened?"')
    && meetingFormBlock.includes('title={showScheduledTiming ? "What are you scheduling?" : "How did you connect?"}'),
  "Meeting context must ask how the interaction happened, not the vague \"What happened?\".",
);

const leaderStart = appClient.indexOf("function MeetingLeaderReflectionSection");
const leaderEnd = appClient.indexOf("function MeetingGrowthReflectionSection", leaderStart);
const leaderBlock = appClient.slice(leaderStart, leaderEnd);

assert(leaderStart !== -1 && leaderEnd !== -1, "MeetingLeaderReflectionSection must exist in DosMvpAppClient.tsx.");

assert(
  leaderBlock.includes('title="Meeting Notes"') && leaderBlock.includes("<MeetingCaptureNotes"),
  "The ministering reflection flow must lead with one primary Meeting Notes field.",
);

/* USA-168 renamed these to the locked vocabulary -- Accountability is what
   they must do, Reminder is what I must remember -- and gave them a heading so
   the structured records a conversation produces are not read as
   miscellaneous extras. They remain optional and inline. */
assert(
  leaderBlock.includes('title="From this meeting"') || leaderBlock.includes("From this meeting"),
  "The structured outcomes must sit under a From this meeting heading.",
);

assert(
  leaderBlock.includes('label: "Accountability"')
    && leaderBlock.includes('label: "Prayer request"')
    && leaderBlock.includes('label: "Reminder"')
    && leaderBlock.includes('label: "Observed Fruit"'),
  "Accountability, Prayer request, Reminder and Observed Fruit must be reachable as optional inline actions.",
);

// Every one is a true toggle: re-tapping collapses it and clears the values it
// owns, so a section opened and thought better of cannot save a blank record.
assert(
  leaderBlock.includes("const closePrayer = ")
    && leaderBlock.includes("const closeFollowUp = ")
    && leaderBlock.includes("const closeFruit = ")
    && leaderBlock.includes("const closeAccountability = "),
  "Each optional outcome must collapse and clear its own values.",
);

// Accountability is captured inline through the one shared field set rather
// than launching the separate legacy Commitment screen.
assert(
  leaderBlock.includes("<AccountabilityFields")
    && !leaderBlock.includes("New Commitment"),
  "Log Meeting accountability must use the canonical inline AccountabilityFields, not the legacy Commitment sheet.",
);

/* Existing data still opens its own section, so editing a meeting never hides
   previously saved fruit, prayer or reminder. Fruit additionally opens when the
   Person "Add observed fruit" path requests it. */
assert(
  leaderBlock.includes("useState(selectedOutcomeTags.length > 0 || openFruitSection)")
    && leaderBlock.includes("const [isPrayerOpen, setIsPrayerOpen] = useState(Boolean(prayerNeedsDefault?.trim()));")
    && leaderBlock.includes("const [isFollowUpNeeded, setIsFollowUpNeeded] = useState(followUpNeededDefault);"),
  "Optional sections with existing data must start open so editing a meeting never hides previously saved fruit, prayer or reminder.",
);

/* Follow-up is Reminder in V2: something the DOS user needs to remember, as
   against Accountability, which is what the person agreed to do. It still
   collects a specific note and a date rather than a bare checkbox. */
assert(
  leaderBlock.includes('name="follow_up_note"')
    && leaderBlock.includes("What do you want to remember?")
    && leaderBlock.includes('name="follow_up_date"'),
  "Reminder must collect a specific note and a date, not just a checkbox.",
);

/* Accountability is captured inline now rather than launching a sheet, and it
   knows the person from the meeting -- so it neither asks again nor needs the
   legacy Commitment record type. */
assert(
  leaderBlock.includes("namePrefix={`meeting_accountability_${index}`}")
    && !leaderBlock.includes("onOpenCommitment"),
  "Log Meeting accountability must be captured inline against the meeting's person.",
);

// The inline items are written through the canonical accountability contract.
assert(
  appClient.includes("accountabilitySchedulePayload(formData, `meeting_accountability_${index}`)")
    && appClient.includes('await fetch("/api/dos/app/accountability/schedules"'),
  "Inline accountability must persist through the canonical accountability schedules API.",
);

// Written after the meeting workflow, never inside it, so a failure here cannot
// make a saved meeting look unsaved or re-run its idempotent children -- and
// any item that fails is named rather than dropped.
/* Accountability is now written by one shared function used by both the direct
   Log Meeting path and the Schedule-then-Log path, which previously dropped it
   silently. Failures are still named rather than swallowed. */
assert(
  appClient.includes("async function persistMeetingAccountability({")
    && appClient.includes("These accountability items did not save")
    && (appClient.match(/await persistMeetingAccountability\(\{/g) ?? []).length === 2,
  "Both meeting paths must persist accountability through the shared writer and surface failures by name.",
);

assert(
  appClient.includes("followUpNote?: string;")
    && appClient.includes("const trimmedFollowUpNote = followUpNote?.trim() ?? \"\";")
    && appClient.includes('notes: joinTableFollowUpReminderMetadata(trimmedFollowUpNote || notes, meetingId)')
    && appClient.includes("title: trimmedFollowUpNote ? trimmedFollowUpNote.slice(0, 80) : \"Reminder from meeting\","),
  "saveTableFollowUpReminder must use the specific reminder note as the record's title/notes when provided, not a generic label.",
);

const saveReminderCallCount = (appClient.match(/await saveTableFollowUpReminder\(\{[^}]*followUpNote,/gs) ?? []).length;

assert(
  saveReminderCallCount >= 2
    && appClient.includes('return postWorkflowJson("/api/dos/app/reminders"')
    && appClient.includes("joinTableFollowUpReminderMetadata(trimmedFollowUpNote || meetingNotes, meetingId)"),
  "Create and edit Log Meeting paths must forward the specific follow-up note through their retry-safe reminder saves.",
);

assert(
  appClient.includes("const followUpNote = String(formData.get(\"follow_up_note\") ?? \"\");"),
  "Meeting submit handlers must read the new follow_up_note field out of the form.",
);

assert(
  appClient.includes("primaryPersonId: explicitPrimaryPersonId,")
    && appClient.includes("const primaryPersonId = explicitPrimaryPersonId || (personIds.length === 1 ? personIds[0] : null);"),
  "createPrayerRequestFromMeeting must accept an explicit primary person so prayer needs attach to the right participant when there are multiple attendees.",
);

assert(
  appClient.includes('name="prayer_needs_person_id"'),
  "The Prayer Need action must let the user choose which participant a request belongs to when more than one is selected.",
);

/* The Person profile and Log Meeting share one Accountability field set and
   one payload builder, so neither can drift into a second implementation. */
assert(
  appClient.includes("function AccountabilityFields({")
    && (appClient.match(/<AccountabilityFields/g) ?? []).length >= 2
    && appClient.includes("function accountabilitySchedulePayload(formData: FormData, prefix: string)"),
  "Person and Log Meeting must share one canonical Accountability component and payload.",
);

assert(
  meetingFormBlock.includes("<StickyFormFooter>") && meetingFormBlock.includes("</StickyFormFooter>"),
  "Log Table's primary action must sit in a sticky footer so it stays reachable on mobile.",
);

console.log("DOS Log Meeting form regression passed.");
