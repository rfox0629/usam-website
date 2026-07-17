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

assert(
  leaderReflectionSectionBlock.includes("title=\"Meeting Notes\"")
    && leaderReflectionSectionBlock.includes("Capture the conversation, important takeaways, and next actions.")
    && leaderReflectionSectionBlock.includes("label=\"Meeting Notes\"")
    && appClient.includes("name=\"notes\"")
    && !leaderReflectionSectionBlock.includes("name=\"next_step\""),
  "Log Table form must use one canonical Meeting Notes field instead of a separate Next Steps field.",
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
    && meetingsRoute.includes(".update({ deleted_at: new Date().toISOString() })"),
  "Deleting a Table must soft-delete linked follow-up reminders so they are not orphaned.",
);

assert(
  prayerRequestsRoute.includes("existingMeetingPrayerResult")
    && prayerRequestsRoute.includes(".eq(\"meeting_id\", meetingId)")
    && prayerRequestsRoute.includes(".eq(\"source\", \"dos_table\")")
    && prayerRequestsRoute.includes(".update(insertPayload)"),
  "Table Prayer Needs must upsert the existing linked dos_table prayer request instead of duplicating it.",
);

assert(
  appClient.includes("description: meetingActivityPreview(meeting, personReflections)")
    && appClient.includes("{meetingActivityPreview(meeting, personReflections)}"),
  "Person activity/history must show saved legacy next_step when canonical table notes are empty.",
);

console.log("DOS table Notes & Next Steps workflow regression passed.");
