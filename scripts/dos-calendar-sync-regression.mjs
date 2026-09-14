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
  client.includes("const selectedDayItems = itemsByDay.get(selectedDateKey) ?? []") &&
    client.includes("const needsLoggingItems = filteredItems") &&
    !client.includes("CalendarUpcomingSection"),
  "Meetings page must keep the selected-day agenda and Needs Logging queue separate without a duplicate Upcoming strip.",
);
assert(
  client.includes("function calendarItemNeedsLogging") &&
    client.includes('item.meeting.source !== "table" || item.meeting.meetingStatus !== "scheduled"') &&
    client.includes("meetingNeedsLoggingEndTime(item.meeting)") &&
    client.includes(".filter((item) => calendarItemNeedsLogging(item, nowTime))"),
  "Needs Logging must only include past scheduled DOS meetings with deterministic table linkage.",
);
assert(
    client.includes("calendarDayCellTitle(item)") &&
    client.includes("+{dayItems.length - 2} more") &&
    !client.includes("dayItems.slice(0, 3).map((item) => ("),
  "Month cells must show compact event labels plus +X more instead of anonymous dots only.",
);
assert(
  client.includes("CalendarDayView") &&
    client.includes("setIsDayViewOpen(true)") &&
    client.includes("onClick={() => openDayView(date)}") &&
    !client.includes("CalendarQuickView") &&
    !client.includes("selectedQuickItem"),
  "Clicking a date must open the Day view and must not render the old selected-event card above the calendar.",
);
assert(
  client.includes("meetingCalendarWeekHours") &&
    client.includes("weekEventStyle") &&
    client.includes('gridTemplateColumns: "42px repeat(7, minmax(0, 1fr))"') &&
    !client.includes("CalendarAgendaEventRow compact"),
  "Week view must stay on the compact hourly grid, not the agenda-card format.",
);
assert(
  client.includes('activeTab !== "meetings"') &&
    !client.includes('meetingsView !== "calendar"') &&
    client.includes("calendarAutoSyncKeyRef") &&
    client.includes("handleSyncGoogleCalendar({ silent: true })"),
  "Opening Meetings must automatically refresh synchronized Google data.",
);

if (process.exitCode) {
  process.exit(process.exitCode);
}

// Founder request (2026-09-14): week and month events read like Google Calendar --
// solid filled blocks with white text; week titles wrap instead of truncating and
// blocks are sized to their duration; month bars drop the dot and clip, not ellipsize.
{
  const view = client.slice(client.indexOf("function MeetingCalendarView("), client.indexOf("<CalendarKey items={filteredItems} />"));
  const tone = client.slice(client.indexOf("function calendarItemTone("), client.indexOf("function calendarItemTone(") + 2000);
  assert((tone.match(/solid: "/g) ?? []).length === 6, "Every calendar item kind has a solid fill.");
  assert(view.includes("text-white ${tone.solid}") && view.includes("[overflow-wrap:anywhere]") && !view.includes('<span className="block truncate text-[10px] font-black leading-4 sm:text-xs">{item.title}</span>'), "Week blocks are solid and their titles wrap rather than truncate.");
  assert(view.includes("height: `${height}px`") && view.includes("weekHourRowPx"), "Week blocks are sized to the event's duration.");
  assert(view.includes("`${tone.solid} text-white`") && !view.includes("h-1.5 w-1.5 shrink-0 rounded-full") && !view.includes('<span className="truncate">{calendarDayCellTitle(item)}</span>'), "Month bars are solid, dot-free and clip their text.");
}

console.log("DOS calendar sync regression checks passed.");
