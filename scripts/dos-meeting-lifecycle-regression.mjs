import { readFileSync } from "node:fs";

const files = {
  client: "app/dos/app/DosMvpAppClient.tsx",
  helper: "src/lib/dos/meeting-lifecycle.ts",
  loader: "src/lib/dos/missionary-app.ts",
  packageJson: "package.json",
  route: "app/api/dos/app/meetings/route.ts",
};

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertInOrder(source, snippets, message) {
  let cursor = -1;

  snippets.forEach((snippet) => {
    const index = source.indexOf(snippet, cursor + 1);

    assert(index !== -1, `${message} Missing: ${snippet}`);
    assert(index > cursor, message);
    cursor = index;
  });
}

const client = read(files.client);
const helper = read(files.helper);
const loader = read(files.loader);
const packageJson = read(files.packageJson);
const route = read(files.route);
const lifecycle = await import("../src/lib/dos/meeting-lifecycle.ts");

assert(
  lifecycle.dosMeetingEventDate({
    createdAt: "2026-08-13T16:00:00.000Z",
    scheduledStartAt: "2026-08-13T17:00:00.000Z",
    tableDate: "2026-08-13",
  }) === "2026-08-13",
  "Same-day logged meetings must resolve to the selected meeting date.",
);
assert(
  lifecycle.dosMeetingEventDate({
    createdAt: "2026-08-13T16:00:00.000Z",
    scheduledStartAt: "2026-08-13T17:00:00.000Z",
    tableDate: "2026-08-08",
    updatedAt: "2026-08-13T17:00:00.000Z",
  }) === "2026-08-08",
  "Past meetings entered later must resolve to the past selected meeting date.",
);
assert(
  lifecycle.dosMeetingEventSortValue({ createdAt: "2026-08-13T16:00:00.000Z", tableDate: "2026-08-08" })
    < lifecycle.dosMeetingEventSortValue({ createdAt: "2026-08-09T16:00:00.000Z", tableDate: "2026-08-09" }),
  "Chronological meeting sort values must follow actual meeting dates, not created_at.",
);
assert(
  lifecycle.dosMeetingEventTimestamp({ createdAt: "2026-08-13T16:00:00.000Z", tableDate: "2026-08-08" }) === "2026-08-08T12:00:00.000Z",
  "Person activity reconciliation must store an event-date timestamp for past meetings.",
);

assert(
  helper.includes("dosMeetingEventDate") &&
    helper.includes("dosMeetingEventTimestamp") &&
    helper.includes("dosMeetingEventSortValue"),
  "Meeting lifecycle helper must expose canonical event date, timestamp, and sort helpers.",
);
assertInOrder(
  helper,
  ["dateKeyFromValue(input.tableDate)", "dateKeyFromValue(input.scheduledStartAt)", "dateKeyFromValue(input.createdAt)", "dateKeyFromValue(input.updatedAt)"],
  "Meeting event date must prefer the user-selected table_date before scheduled/current timestamps.",
);

assert(
  route.includes("const tableDate = asDateString(payload.tableDate);") &&
    route.includes("table_date: tableDate") &&
    route.includes("tableDate,") &&
    !route.includes("last_activity_at: new Date().toISOString()"),
  "Meeting create/update must persist and reconcile from the selected meeting date, not record entry time.",
);
assert(
  route.includes("reconcilePeopleLastActivity(supabase, workspaceId, validPersonIds)") &&
    route.includes("dosMeetingEventTimestamp") &&
    route.includes("latestLoggedMeetingActivityForPerson"),
  "Person activity reconciliation must use actual logged meeting dates.",
);
assert(
  loader.includes("import { dosMeetingEventDate, dosMeetingEventSortValue }") &&
    loader.includes("function sortMeetingRows") &&
    loader.includes("dosMeetingEventSortValue({") &&
    !loader.includes("latestActivityDate(meeting.table_date, meeting.updated_at, meeting.created_at)") &&
    !loader.includes("latestActivityDate(meeting.scheduled_start_at, meeting.table_date, meeting.updated_at, meeting.created_at)"),
  "Meeting lists and chronological sorting must use actual event dates, not updated_at or created_at.",
);
assert(
  loader.includes("date: dosMeetingEventDate({") &&
    loader.includes("lastActivityAt: latestActivityByPersonId.get(person.id) ?? person.last_activity_at"),
  "Loaded meetings and person last activity must prefer derived actual meeting history.",
);

assert(
  client.includes("const latestMeetingDateByPersonId = useMemo(() =>") &&
    client.includes("latestDates.set(personId, meeting.date)") &&
    client.includes("const meetingsThisWeek = ministryLoggedMeetings.filter((meeting) => isDateWithinRange(meeting.date, start, end));") &&
    client.includes("const tablesThisWeek = loggedMeetings.filter((meeting) => isDateWithinRange(meeting.date ?? meeting.scheduledStartAt, start, end));") &&
    client.includes("const ministryTables = meetings.filter((meeting) => meeting.source === \"table\" && isMyRecordDateInRange(meeting.date, range));"),
  "Last-meeting and time/reporting calculations must consume the canonical loaded meeting date.",
);

assert(
  client.includes("function calendarItemNeedsLogging") &&
    client.includes("meetingNeedsLoggingEndTime(item.meeting)") &&
    client.includes("onLogScheduledMeeting(item.meeting);") &&
    client.includes("Delete Meeting"),
  "Scheduled meetings that reach Needs Logging must remain actionable through the existing meeting sheet.",
);
assert(
  route.includes("loadMeetingDeleteTarget") &&
    route.includes("loadAffectedMeetingPersonIds") &&
    route.includes("cleanupMeetingReferences") &&
    route.includes("deleteMeetingMinistryEvents") &&
    route.includes("deleteLocalCalendarLinkIfNoExternalCleanupNeeded"),
  "Meeting delete must verify scope and reconcile associated DOS records.",
);
assert(
  route.includes(".from(\"prayer_requests\")") &&
    route.includes(".update({ meeting_id: null })") &&
    route.includes(".from(\"dos_group_gatherings\")") &&
    route.includes(".update({ linked_table_event_id: null })") &&
    route.includes(".from(\"external_calendar_events\")") &&
    route.includes(".from(\"relationship_reminders\")") &&
    route.includes(".from(\"ministry_events\")") &&
    route.includes(".from(\"calendar_event_links\")"),
  "Deleted/canceled meetings must not leave ghost references in DOS surfaces.",
);
assert(
  route.includes(".from(\"missionary_tables\")\n    .delete()\n    .eq(\"id\", target.id)") &&
    !route.includes(".delete()\n    .eq(\"id\", id)\n    .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)"),
  "Delete must remove the verified target row, including Needs Logging rows visible through ministry events.",
);
assert(
  packageJson.includes("\"test:dos-meeting-lifecycle\": \"node --no-warnings scripts/dos-meeting-lifecycle-regression.mjs\""),
  "package.json must expose the DOS meeting lifecycle regression script.",
);

console.log("DOS meeting lifecycle regression passed.");
