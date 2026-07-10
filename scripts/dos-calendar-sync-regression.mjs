import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  }
};

const client = read("app/dos/app/DosMvpAppClient.tsx");
const googleCalendar = read("src/lib/dos/google-calendar.ts");
const loader = read("src/lib/dos/missionary-app.ts");
const eventsRoute = read("app/api/dos/app/calendar/events/route.ts");
const syncRoute = read("app/api/dos/app/calendar/google/sync/route.ts");

assert(
  googleCalendar.includes("pullGoogleCalendarEvents") && syncRoute.includes("pullGoogleCalendarEvents"),
  "Google event sync route must use the current pullGoogleCalendarEvents helper.",
);
assert(
  googleCalendar.includes('params.set("syncToken", syncToken)') &&
    googleCalendar.includes("nextSyncToken") &&
    googleCalendar.includes("isGoogleCalendarSyncTokenExpired") &&
    googleCalendar.includes("status?: number }).status === 410"),
  "Google event sync must use syncToken and recover from expired tokens with a full sync.",
);
assert(
  googleCalendar.includes('showDeleted: "true"') &&
    !googleCalendar.includes('event.status !== "cancelled"') &&
    googleCalendar.includes('status === "cancelled" ? "Cancelled Google Calendar event"'),
  "Google event sync must keep cancelled/deleted events instead of filtering them out.",
);
assert(
  googleCalendar.includes('onConflict: "workspace_id,provider,external_calendar_id,external_event_id"'),
  "Google events must upsert by stable workspace/provider/calendar/event id.",
);
assert(
  googleCalendar.includes("isGoogleCalendarReconnectError") &&
    googleCalendar.includes("invalid_grant") &&
    googleCalendar.includes("token has been revoked"),
  "Google auth failures must surface as reconnect-required states.",
);
assert(
  loader.includes("status: string | null;") &&
    loader.includes("i_cal_uid, status, summary") &&
    eventsRoute.includes("i_cal_uid, status, summary") &&
    client.includes("calendarItemStatusLabel"),
  "External Google event status must be projected through loader, API, and client types.",
);
assert(
  client.includes('.filter((meeting) => meeting.source === "table")') &&
    !client.includes('.filter((meeting) => meeting.meetingStatus === "scheduled")\n    .map((meeting) => {'),
  "Month calendar must include logged/completed DOS table history, not scheduled-only meetings.",
);
assert(
  client.includes(".filter((item) => dateSortValue(item.date) >= nowTime)") &&
    client.includes("const selectedDayItems = itemsByDay.get(selectedDateKey) ?? []"),
  "Upcoming and selected-day agenda filters must stay separate.",
);
assert(
    client.includes("calendarDayCellTitle(item)") &&
    client.includes("+{dayItems.length - 2} more") &&
    !client.includes("dayItems.slice(0, 3).map((item) => ("),
  "Month cells must show compact event labels plus +X more instead of anonymous dots only.",
);
assert(
  client.includes("CalendarDayAgenda") &&
    client.includes("setIsDayAgendaOpen(true)") &&
    client.includes("onClick={() => openDayAgenda(date)}") &&
    !client.includes("CalendarQuickView") &&
    !client.includes("selectedQuickItem"),
  "Clicking a date must open a day agenda and must not render the old selected-event card above the calendar.",
);
assert(
  client.includes("CalendarAgendaEventRow compact") &&
    client.includes('md:grid-cols-7') &&
    !client.includes("meetingCalendarWeekHours") &&
    !client.includes("weekEventStyle"),
  "Week view must use readable day agenda rows instead of tiny positioned event pills.",
);
assert(
  client.includes('activeTab !== "meetings"') &&
    client.includes('meetingsView !== "calendar"') &&
    client.includes("calendarAutoSyncKeyRef") &&
    client.includes("handleSyncGoogleCalendar({ silent: true })"),
  "Opening the Calendar tab must automatically refresh synchronized Google data.",
);

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("DOS calendar sync regression checks passed.");
