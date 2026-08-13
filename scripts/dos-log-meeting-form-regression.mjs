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

assert(
  meetingFormBlock.indexOf('title="Discipleship Role"') < meetingFormBlock.indexOf('title="Participants"')
    && meetingFormBlock.indexOf('title="Participants"') < meetingFormBlock.indexOf('title="Edit People"'),
  "Log Table must show Discipleship Role then Participants before the collapsed Edit People disclosure.",
);

const editPeopleStart = meetingFormBlock.indexOf('title="Edit People"');
const editPeopleBlock = meetingFormBlock.slice(editPeopleStart, meetingFormBlock.indexOf('title="Duration"', editPeopleStart) === -1 ? undefined : meetingFormBlock.indexOf('title="Duration"', editPeopleStart));

assert(
  editPeopleBlock.includes("<MinistryTeamSelector") && editPeopleBlock.includes("<SupportingAttendeeSelector"),
  "Ministry Team and Supporting Attendees must be hidden behind the Edit People disclosure, not always expanded.",
);

assert(
  meetingFormBlock.includes("defaultOpen={selectedMinistryTeamPersonIds.length + selectedMinistryTeamMemberIds.length + selectedSupportingAttendeeIds.length > 0}"),
  "Edit People must auto-open when a ministry team member or supporting attendee is already selected, so existing data is never hidden.",
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
