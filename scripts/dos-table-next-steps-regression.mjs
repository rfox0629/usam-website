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
const meetingsRoute = read("app/api/dos/app/meetings/route.ts");
const prayerRequestsRoute = read("app/api/dos/app/prayer-requests/route.ts");
const reflectionsRoute = read("app/api/dos/app/reflections/route.ts");
const notesCardStart = appClient.indexOf("function NotesReflectionDetailCard");
const notesCardEnd = appClient.indexOf("function FollowUpStatusRow", notesCardStart);
const notesCardBlock = appClient.slice(notesCardStart, notesCardEnd);
const leaderReflectionSectionStart = appClient.indexOf("function MeetingLeaderReflectionSection");
const leaderReflectionSectionEnd = appClient.indexOf("function MeetingGrowthReflectionSection", leaderReflectionSectionStart);
const leaderReflectionSectionBlock = appClient.slice(leaderReflectionSectionStart, leaderReflectionSectionEnd);

assert(
  reflectionsRoute.includes("next_step: asString(payload.nextStep) || null"),
  "Legacy Leader Reflection next_step must remain capable of storing full multiline values.",
);

assert(
  !reflectionsRoute.includes("asString(payload.nextStep, 160)"),
  "Leader Reflection next_step must not be truncated to 160 characters.",
);

assert(
  appClient.includes("function notesAndNextStepsText(meeting: DosAppMeeting, reflection: DosAppLeaderReflection | null)")
    && appClient.includes("return `${canonicalNotes}\\n\\nNext Steps:\\n${legacyNextStep}`;")
    && appClient.includes("meetingActivityPreview(meeting: DosAppMeeting, reflections: DosAppLeaderReflection[])"),
  "Table and activity previews must fold legacy next_step into canonical Notes & Next Steps.",
);

// Meeting Notes remains the single canonical narrative field. USA-168 added one
// deliberate companion input — "What did you agree to?" — because the agreed
// step is the most prominent line on the Person page and previously had no way
// to be captured from a ministering log at all.
assert(
  leaderReflectionSectionBlock.includes("title=\"Meeting Notes\"")
    && leaderReflectionSectionBlock.includes("label=\"Meeting Notes\"")
    && appClient.includes("name=\"notes\""),
  "Log Meeting form must keep one canonical Meeting Notes field.",
);

assert(
  leaderReflectionSectionBlock.includes("label=\"What did you agree to?\"")
    && leaderReflectionSectionBlock.includes("name=\"next_step\""),
  "Log Meeting must capture the agreed next step, which populates the Person page.",
);

// Guard the write path: the agreed step has to reach the reflection record even
// when it is the only thing the user filled in.
assert(
  appClient.includes("|| agreedNextStepInput"),
  "The agreed next step must be enough on its own to save the leader reflection.",
);

assert(
  notesCardBlock.includes("title=\"Notes & Next Steps\"")
    && notesCardBlock.includes("notesAndNextStepsText(meeting, reflection)")
    && notesCardBlock.includes(">Prayer Needs<")
    && notesCardBlock.includes(">Observed Fruit<")
    && !notesCardBlock.includes(">Leader Reflection<"),
  "Completed Table detail must show Notes & Next Steps, optional Prayer Needs, and Observed Fruit without an empty Leader Reflection block.",
);

assert(
  appClient.includes("function tableFollowUpReminderForMeeting(reminders: DosAppRelationshipReminder[], meetingId: string)")
    && appClient.includes("joinTableFollowUpReminderMetadata(trimmedFollowUpNote || notes, meetingId)")
    && appClient.includes("async function saveTableFollowUpReminder")
    && appClient.includes("name=\"follow_up_date\""),
  "Follow-Up Needed must create/update/delete one Table-linked relationship_reminder with a due date.",
);

assert(
  meetingsRoute.includes(".from(\"relationship_reminders\")")
    && meetingsRoute.includes(".eq(\"reminder_type\", \"follow_up\")")
    && meetingsRoute.includes("DOS_TABLE_FOLLOW_UP")
    // Assert the soft-delete itself, not the expression that produces the
    // timestamp: the route now hoists one `deleteTimestamp` for the whole
    // cleanup, which is the same behaviour.
    && /\.update\(\{ deleted_at: [A-Za-z0-9_.()"'\s:]+\}\)/.test(meetingsRoute),
  "Deleting a Table must soft-delete linked follow-up reminders so they are not orphaned.",
);

assert(
  prayerRequestsRoute.includes("existingMeetingPrayerResult")
    && prayerRequestsRoute.includes(".eq(\"meeting_id\", meetingId)")
    && prayerRequestsRoute.includes(".eq(\"source\", \"dos_table\")")
    && prayerRequestsRoute.includes(".update(insertPayload)"),
  "Table Prayer Needs must upsert the existing linked dos_table prayer request instead of duplicating it.",
);

// USA-168 replaced the fragmented Activity list with one Timeline, so the
// preview is now rendered through the timeline entry's description. The
// guarantee is the same: it goes through notesAndNextStepsText, which folds a
// saved legacy next_step in when canonical notes are empty.
assert(
  appClient.includes("description: meetingActivityPreview(meeting, personReflections)")
    && appClient.includes("return notesAndNextStepsText(meeting, latestLeaderReflectionForMeeting(reflections, meeting.id))"),
  "Person Timeline must show saved legacy next_step when canonical meeting notes are empty.",
);

console.log("DOS table Notes & Next Steps workflow regression passed.");
