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

// USA-168 simplified the primary path to date -> who -> more people & role.
// "Discipleship Role" / "Participants" / "Edit People" are the pre-USA-168
// section names; the guarantee being guarded is unchanged: participants come
// first, and role/ministry team/supporting attendees stay behind one collapsed
// disclosure rather than expanding the form by default.
assert(
  meetingFormBlock.indexOf('title="Who was there?"') !== -1
    && meetingFormBlock.indexOf('title="Who was there?"') < meetingFormBlock.indexOf('title="More people & role"'),
  "Log Meeting must show participants before the collapsed More people & role disclosure.",
);

const morePeopleStart = meetingFormBlock.indexOf('title="More people & role"');
const morePeopleBlock = meetingFormBlock.slice(0, morePeopleStart);

assert(
  morePeopleBlock.includes("<DisclosureSection"),
  "More people & role must be rendered as a collapsed disclosure.",
);

assert(
  meetingFormBlock.includes("<TableRolePicker")
    && meetingFormBlock.includes("<MinistryTeamSelector")
    && meetingFormBlock.includes("<SupportingAttendeeSelector"),
  "Role, Ministry Team and Supporting Attendees must remain available inside the disclosure.",
);

// The workspace ministry team is prefilled on every log, so the disclosure must
// not open merely because it is populated, or it is never actually collapsed.
assert(
  !meetingFormBlock.includes("defaultOpen={selectedMinistryTeamPersonIds.length + selectedMinistryTeamMemberIds.length + selectedSupportingAttendeeIds.length > 0}"),
  "More people & role must not open just because the default ministry team is present.",
);

// The original guarantee was "existing data is never hidden", previously met by
// auto-opening. Ad-hoc content still auto-opens; the prefilled default team is
// instead reported in the collapsed summary, which keeps the guarantee without
// leaving the section permanently expanded.
assert(
  meetingFormBlock.includes("defaultOpen={selectedMinistryTeamPersonIds.length + selectedSupportingAttendeeIds.length > 0 || selectedTableRole !== \"ministering\"}"),
  "More people & role must auto-open for an ad-hoc ministry team person, a supporting attendee, or a non-default role.",
);

assert(
  meetingFormBlock.includes("summary={morePeopleSummary}")
    && meetingFormBlock.includes("const morePeopleSummary = (() => {"),
  "The collapsed More people & role header must report the role and ministry team it contains.",
);

assert(
  !meetingFormBlock.includes('title="What happened?"'),
  "The unclear \"What happened?\" heading must be replaced with a clearer Meeting Context label.",
);

const leaderStart = appClient.indexOf("function MeetingLeaderReflectionSection");
const leaderEnd = appClient.indexOf("function MeetingGrowthReflectionSection", leaderStart);
const leaderBlock = appClient.slice(leaderStart, leaderEnd);

assert(leaderStart !== -1 && leaderEnd !== -1, "MeetingLeaderReflectionSection must exist in DosMvpAppClient.tsx.");

assert(
  leaderBlock.includes('title="Meeting Notes"') && leaderBlock.includes("<MeetingCaptureNotes"),
  "The ministering reflection flow must lead with one primary Meeting Notes field.",
);

assert(
  leaderBlock.includes("Add observed fruit")
    && leaderBlock.includes("Add prayer need")
    && leaderBlock.includes("Add follow-up")
    && leaderBlock.includes("Add commitment"),
  "Fruit, prayer, follow-up, and commitment must be reachable as compact optional actions instead of always-open sections.",
);

assert(
  leaderBlock.includes("const [isFruitOpen, setIsFruitOpen] = useState(selectedOutcomeTags.length > 0);")
    && leaderBlock.includes("const [isPrayerOpen, setIsPrayerOpen] = useState(Boolean(prayerNeedsDefault?.trim()));"),
  "Optional sections with existing data must start open so editing a table never hides previously saved fruit or prayer needs.",
);

assert(
  leaderBlock.includes('name="follow_up_note"')
    && leaderBlock.includes("required")
    && leaderBlock.includes("What needs to happen?"),
  "Follow Up must collect a required, specific note instead of only a checkbox and a due date.",
);

assert(
  leaderBlock.includes('onOpenCommitment(primaryPersonId || selectedPersonIds[0] || null)'),
  "Add commitment must open the existing commitment sheet pre-filled with the current participant.",
);

assert(
  appClient.includes("followUpNote?: string;")
    && appClient.includes("const trimmedFollowUpNote = followUpNote?.trim() ?? \"\";")
    && appClient.includes('notes: joinTableFollowUpReminderMetadata(trimmedFollowUpNote || notes, meetingId)')
    && appClient.includes("title: trimmedFollowUpNote ? trimmedFollowUpNote.slice(0, 80) : \"Follow up from Table\","),
  "saveTableFollowUpReminder must use the specific follow-up note as the reminder's title/notes when provided, not a generic label.",
);

const saveReminderCallCount = (appClient.match(/await saveTableFollowUpReminder\(\{[^}]*followUpNote,/gs) ?? []).length;

assert(
  saveReminderCallCount >= 3,
  "Every saveTableFollowUpReminder call site (create, edit-logged, edit-scheduled-log) must forward the new follow-up note.",
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

assert(
  appClient.includes("onOpenCommitment={(personId) => setCommitmentSheet({ kind: \"commitment\", personId })}"),
  "Log Table and Edit Table sheets must wire Add Commitment to the existing commitment sheet state.",
);

assert(
  meetingFormBlock.includes("<StickyFormFooter>") && meetingFormBlock.includes("</StickyFormFooter>"),
  "Log Table's primary action must sit in a sticky footer so it stays reachable on mobile.",
);

console.log("DOS Log Meeting form regression passed.");
