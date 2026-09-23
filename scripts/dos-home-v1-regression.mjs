// USA-257 — Home V1: Time Investment is the primary reporting doorway.
//
// Replaces the never-wired dashboard-alignment script (which asserted the
// Today's Alignment panel and a "Commitment" quick action that no longer
// existed). These checks hold the founder's Home direction of 2026-09-09.
import { readFileSync } from "node:fs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sliceBetween(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  assert(start >= 0, `Missing start marker: ${startNeedle}`);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  assert(end >= 0, `Missing end marker: ${endNeedle}`);

  return source.slice(start, end);
}

const client = readFileSync("app/dos/app/DosMvpAppClient.tsx", "utf8");
const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const dashboard = stripComments(sliceBetween(client, "function DesktopHomeDashboard", "function desktopOrganizationCopy"));
const reportUi = readFileSync("src/components/dos/reports/MinistryTimeInvestmentReport.tsx", "utf8");
const checkInsPanel = sliceBetween(client, "function HomeCheckInsPanel", "const checkInFilterLabels");
const checkInList = sliceBetween(client, "function CheckInListRow", "function HomeCheckInRow");
const homeCheckInRow = sliceBetween(client, "function HomeCheckInRow", "function HomeCheckInSectionHeading");
const reportsView = sliceBetween(client, 'activeMoreAppView === "reports" ? (', 'activeMoreAppView === "organizations" ? (');
const homeCallSite = sliceBetween(client, "<DesktopHomeDashboard\n", "upcomingItems={upcomingTimelineItems}");

// 1. What left Home.
for (const gone of ["Today's Alignment", "Weekly Report Card", "Next Discipleship Meeting", "Recent Fruit", "Recent Reviews", "Table Activity", "ResourceAssignmentsDashboardCard", "DashboardAlignmentRow"]) {
  assert(!dashboard.includes(gone), `Home must no longer render ${gone} (USA-257).`);
}
assert(!client.includes("function ResourceAssignmentsDashboardCard"), "The Assigned Resources card is retired from Home until USA-258 proves the status source.");

/* 2. Order: notifications, the primary actions, the compact Check-ins
   preview directly beneath them, then Top Time Investments, Meeting Activity
   and Upcoming. USA-282 moved the check-in list up under the action buttons
   and retired the lower Accountability card, so the order below is that
   issue's, superseding USA-257's placement of it. */
const order = ["<DashboardNotificationsPanel", 'aria-label="Home quick actions"', "<HomeCheckInsPanel", 'eyebrow="Top Time Investments"', 'eyebrow="Meeting Activity"', 'eyebrow="Upcoming"'];
order.reduce((previous, needle) => {
  const index = dashboard.indexOf(needle);
  assert(index > previous, `Home order: ${needle} must follow the previous element.`);
  return index;
}, -1);

// 3. Top Time Investments is the doorway into the report, from the shared calculation.
assert(dashboard.includes("View Report"), "Top Time Investments' action must read View Report.");
assert(dashboard.includes("onClick={onOpenReport}"), "View Report must open the report.");
assert(homeCallSite.includes('onOpenReport={() => openMoreApp("reports")}'), "View Report opens the Reports destination.");
assert(homeCallSite.includes("timeInvestments={homeMinistryReport.investedRows}"), "Top Time Investments rows are the report's Time I invested rows; time invested in the missionary is never ranked on Home.");
assert(homeCallSite.includes("meetingActivity={homeMinistryReport.totals}"), "Meeting Activity comes from the same calculation.");
assert(client.includes('buildDosMinistryReport({ ...ministryReportInput, now: reportNow, range: "30d" })'), "Home uses the report's default 30-day range.");
assert(dashboard.includes("Last 30 days · logged duration I invested · check-ins not included"), "Top Time Investments states its range and definition.");
assert(dashboard.includes(">Meetings</span>") && dashboard.includes(">Time</span>"), "Top Time Investments keeps its Meetings and Time headings.");
assert(dashboard.includes("dashboardTimeInvestmentRelationshipLine(person, engagementLevelsEnabled, row.directionLabel)"), "The relationship line shows the report's direction and keeps the engagement toggle.");
assert(!dashboard.includes("tableDurationMinutes") && !dashboard.includes("meetingMinutesEstimate"), "Home never falls back to a duration estimate.");
assert(dashboard.includes('row.meetingsMissingDuration === row.meetingCount ? "Not logged"'), "A ranked person whose meetings all lack a duration reads Not logged on Home, never 0m (2026-09-10).");
assert(!dashboard.includes("accountabilityCheckInDurationMinutes"), "Home never adds check-in minutes to meeting time.");

// 4. Meeting Activity says what it counts.
assert(dashboard.includes('label: "Logged meetings"') && dashboard.includes('label: "Logged duration"') && dashboard.includes('label: "People met with"') && dashboard.includes('label: "Check-ins (separate)"'), "Meeting Activity metrics are logged meetings, logged duration, people met with, and check-ins kept separate.");
assert(dashboard.includes("uniqueLoggedMinutesInvested") && dashboard.includes("invested in me is in Reports"), "Meeting Activity reports the duration I invested and points to Reports for time invested in me.");
/* USA-268: a relationship never keeps a meeting out of the totals, so there is no not-set figure to name. */
assert(!dashboard.includes("relationship not set"), "Meeting Activity no longer names meetings with the relationship not set: every logged meeting is invested or invested in me.");
assert(!dashboard.includes("uniqueLoggedMinutesUnresolved") && !dashboard.includes("unresolvedMeetings"), "There is no unresolved bucket for Home to read.");
assert(!/Recorded time/.test(dashboard), "Home says logged duration, never recorded time (start times are synthetic).");
assert(!dashboard.includes("Total meetings") && !dashboard.includes("Total hours logged") && !dashboard.includes("Total reviews"), "The old combined totals are gone.");
assert(dashboard.includes("each meeting counted once"), "Meeting Activity states that logged duration counts each meeting once.");

/* 5. USA-282 and its follow-up: Check-ins sits above Top Time Investments,
   says only who and when, groups Today and Overdue with simple counts, and
   opens the rest in place. The workflow still lives on the Person.

   USA-257's Due Today / Overdue / 7 Days boxes and its "N more on the people
   themselves" line are superseded: the counts are now section headings here
   and filters on the full list under People. */
assert(checkInsPanel.includes('eyebrow="Check-ins"'), "Home's check-in section is headed Check-ins.");
assert(checkInsPanel.includes("View all check-ins"), "Home offers one clear way to the full list.");
assert(checkInsPanel.includes("onClick={onOpenAll}"), "View all check-ins opens the full list.");
assert(checkInsPanel.includes('label="Today"') && checkInsPanel.includes('label="Overdue"'), "Home groups the work into Today and Overdue sections.");
assert(checkInsPanel.includes("count={sections.today.length}") && checkInsPanel.includes("count={sections.overdue.length}"), "Each section carries its own simple count.");
assert(checkInsPanel.indexOf('label="Today"') < checkInsPanel.indexOf('label="Overdue"'), "Today leads, so an overdue backlog never buries the day's own work.");
assert(checkInsPanel.includes("accountabilityCheckInHomeSections(rows)"), "The sections come from the shared eligibility module, not from a second rule here.");
assert(checkInsPanel.includes("No check-ins need attention."), "The empty state is one short line.");
assert(!/Due Today|7 Days|more on the people themselves/.test(dashboard + checkInsPanel), "The three large count boxes and the \"N more on the people themselves\" line are gone.");
assert(dashboard.includes("checkInRows"), "Home renders the rows it is handed.");
assert(client.includes('accountabilityCheckInRowsForFilter(checkInRows, "attention")'), "Home is handed exactly the rows that need attention, from the shared helper.");
assert(dashboard.indexOf("<HomeCheckInsPanel") < dashboard.indexOf('eyebrow="Top Time Investments"'), "Check-ins sits above Top Time Investments.");

/* The section is taller than the three rows it replaced, and the remainder
   opens in place rather than sending the reader away to find them. */
assert(/const homeCheckInVisibleRows = ([6-9]|1\d);/.test(client), "Home shows at least six check-ins before the expander.");
assert(checkInsPanel.includes("Show ${hiddenCount} more") && checkInsPanel.includes('"Show fewer"'), "The remaining check-ins expand and collapse in place.");
assert(checkInsPanel.includes("setIsExpanded((current) => !current)"), "The expander is wired, not decorative.");
assert(checkInsPanel.includes("sections.today.slice(0, homeCheckInVisibleRows)") && checkInsPanel.includes("homeCheckInVisibleRows - visibleToday.length"), "Today is shown in full first; the overdue backlog takes what is left.");

/* Upcoming stays reachable without taking a row from today. */
assert(checkInsPanel.includes("upcomingCount ?") && checkInsPanel.includes("onClick={onOpenUpcoming}"), "Upcoming is one quiet line under the list.");
assert(client.includes('onOpenCheckInsUpcoming={() => openCheckIns("upcoming")}'), "It opens the full list already on the Upcoming filter.");
assert(client.includes("checkInUpcomingCount={checkInCounts.upcoming}"), "Its count comes from the same eligibility function as every other count.");

/* Home is discreet: who and when, and the action -- never what the
   accountability is about, in the row, a tooltip or an accessibility label. */
for (const leak of ["row.topic", "row.context", "checkInSecondaryLine", "<CheckInStatusChip", "title={"]) {
  assert(!homeCheckInRow.includes(leak), `Home's check-in row must not carry ${leak}: the subject stays off the home screen.`);
}
assert(homeCheckInRow.includes("row.personName") && homeCheckInRow.includes("row.dueDateLabel"), "A Home row shows the person's name and the due date.");
assert(homeCheckInRow.includes("`Check in with ${row.personName}, due ${row.dueDateLabel}`"), "The accessible name is the name and the date, and nothing else.");
assert(homeCheckInRow.includes(">Check in</span>"), "Each row offers the check-in by name.");
for (const control of ["Log Check-In", "Mark Complete", "Reschedule", "onLogCheckIn", "onLogResourceCheckIn", "onMarkResourceAssignmentComplete"]) {
  assert(!checkInsPanel.includes(control), `Home's Check-ins must not run the ${control} workflow.`);
}
assert(checkInList.includes("row.personName"), "Each row of the full list leads with the person's name.");
assert(checkInList.includes("checkInSecondaryLine(row)") && client.includes("row.context ? `${row.topic} · ${row.context}`"), "The full list, not Home, states the topic and what distinguishes it.");
assert(checkInList.includes("<CheckInStatusChip row={row} />"), "Each row of the full list states its due date or status.");
assert(checkInsPanel.includes("onOpenRow(row)"), "A Home check-in row opens the accountability item itself.");

/* 5b. The top notification is preserved and opens that same full list, with
   the same count -- one number, one destination (USA-282). */
assert(dashboard.includes("<DashboardNotificationsPanel"), "Home keeps its top notification panel.");
assert(dashboard.includes('id: "check-ins"') && dashboard.includes("onClick: onOpenCheckIns"), "The check-in notification opens the full check-in list.");
assert(dashboard.includes("badge: `${checkInAttentionCount} due`"), "The notification's count is the same attention count as the preview.");
assert(client.includes("checkInAttentionCount={checkInCounts.attention}"), "Home's count comes from the shared eligibility function.");
assert(client.includes("counts={checkInCounts}"), "The full list's filter counts come from the same function, so they cannot disagree.");

// 6. Fruit lives in Reports as the Ministry Fruit table (2026-09-10); the card panels are gone from both Home and Reports.
assert(!client.includes("function ReportsFruitAndReviews") && !reportsView.includes("<ReportsFruitAndReviews"), "The Recent Fruit / Recent Reviews cards are retired.");
assert(reportUi.includes("Ministry Fruit"), "Reports carries the Ministry Fruit table.");
assert(reportsView.includes("<MinistryTimeInvestmentReport"), "Reports renders the Master Ministry Report.");
assert(reportsView.includes("linkedPersonIds") === false && client.includes("linkedPersonIds: data.identityLinkedPersonIds"), "Multiplication's connection state comes from verified identity links, read in-workspace by the loader.");
assert(client.includes("fruit: dosMinistryFruitEntriesFromAppData("), "Fruit reaches the report only through the structured adapter.");
assert(!reportsView.includes("Coming soon") && !reportsView.includes("coming soon"), "Reports is no longer a Coming Soon screen.");
assert(reportsView.includes("input={ministryReportInput}"), "The report reads the narrowed input, never the raw workspace data.");

// 7. Quick actions unchanged.
assert(dashboard.includes('aria-label="Home quick actions"') && dashboard.includes("md:hidden"), "Mobile quick actions remain and stay hidden on desktop.");
for (const label of ['label: "Schedule"', 'label: "Add Person"', 'label: "Accountability"']) {
  assert(dashboard.includes(label), `Quick actions must include ${label}.`);
}

// 8. Colour language (founder, 2026-09-09): no yellow, amber, orange, or red on Home or in the Reports view; green only for confirmed status.
const warningColour = /amber|orange|yellow|text-red|bg-red|border-red|ring-red|#F59|#FEF3|#FDE68|#B45309|#D97706|#DC2626|#EF4444|#FCA5A5|#FEE2E2|#B91C1C|#F97316|#FBBF24|#FFF7ED|#EA580C|#FDF0D5|#FDE8E8|#FECACA|#F87171/i;
for (const [label, region] of [["Home", dashboard], ["Check-ins", checkInsPanel + checkInList], ["Reports view", reportsView]]) {
  assert(!warningColour.test(region), `${label} must not use yellow, amber, orange, or red.`);
}

/* 9. Home's first render is clock-free. Home is the screen the server renders
   and the browser hydrates, so anything it computes from the wall clock during
   render is computed twice, at two different instants, and React discards the
   tree when the two disagree (hydration error #418). The instant comes from
   the server render instead, as a prop. */
assert(client.includes("renderedAt }: { data: DosAppData; renderedAt: string }"), "The app takes the server render's instant as a prop.");
assert(!client.includes("const reportNow = useMemo(() => new Date(), []);"), "The report window must not read the wall clock during render.");
assert(client.includes("const rendered = new Date(renderedAt);"), "reportNow is derived from the server render's instant.");
assert(client.includes("const reportToday = useMemo(() => reportNow.toISOString().slice(0, 10), [reportNow]);"), "The accountability day key comes from the same instant.");
/* USA-282: the check-in rows are derived once in the app, from that same day
   key, and Home is handed the result -- so Home computes no bucket from the
   wall clock and the full list compares against the identical day. */
assert(client.includes("today: reportToday,"), "The check-in buckets compare against the server render's day key.");
assert(!checkInsPanel.includes("todayCommitmentDateKey()") && !checkInList.includes("todayCommitmentDateKey()"), "The check-in surfaces are told which day it is, rather than reading the clock mid-render.");
assert(!dashboard.includes("new Date()"), "Home reads no wall clock during render.");

// 10. No mentor language on Home or Reports.
assert(!/mentor/i.test(dashboard.replace(/dashboardMentor|MentorMeeting|mentorRelationships/g, "")), "Home copy uses discipleship language.");

console.log("DOS Home V1 (USA-257) regression passed.");
