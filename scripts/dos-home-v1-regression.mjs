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
const dashboard = stripComments(sliceBetween(client, "function DesktopHomeDashboard", "function ReportsFruitAndReviews"));
const reports = sliceBetween(client, "function ReportsFruitAndReviews", "function DesktopMoreLauncher");
const accountabilityCard = sliceBetween(client, "function AccountabilityDashboardCard", "function CommitmentSuccessSheet");
const reportsView = sliceBetween(client, 'activeMoreAppView === "reports" ? (', 'activeMoreAppView === "organizations" ? (');
const homeCallSite = sliceBetween(client, "<DesktopHomeDashboard\n", "upcomingItems={upcomingTimelineItems}");

// 1. What left Home.
for (const gone of ["Today's Alignment", "Weekly Report Card", "Next Discipleship Meeting", "Recent Fruit", "Recent Reviews", "Table Activity", "ResourceAssignmentsDashboardCard", "DashboardAlignmentRow"]) {
  assert(!dashboard.includes(gone), `Home must no longer render ${gone} (USA-257).`);
}
assert(!client.includes("function ResourceAssignmentsDashboardCard"), "The Assigned Resources card is retired from Home until USA-258 proves the status source.");

// 2. Order: notifications and primary actions, then Top Time Investments, Meeting Activity, Accountability, Upcoming.
const order = ["<DashboardNotificationsPanel", 'aria-label="Home quick actions"', 'eyebrow="Top Time Investments"', 'eyebrow="Meeting Activity"', "<AccountabilityDashboardCard", 'eyebrow="Upcoming"'];
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
assert(!dashboard.includes("accountabilityCheckInDurationMinutes"), "Home never adds check-in minutes to meeting time.");

// 4. Meeting Activity says what it counts.
assert(dashboard.includes('label: "Logged meetings"') && dashboard.includes('label: "Logged duration"') && dashboard.includes('label: "People met with"') && dashboard.includes('label: "Check-ins (separate)"'), "Meeting Activity metrics are logged meetings, logged duration, people met with, and check-ins kept separate.");
assert(dashboard.includes("uniqueLoggedMinutesInvested") && dashboard.includes("invested in me is in Reports"), "Meeting Activity reports the duration I invested and points to Reports for time invested in me.");
assert(dashboard.includes("with unresolved direction in Reports"), "Meeting Activity names meetings whose direction is unresolved instead of counting them as invested.");
assert(!dashboard.includes("uniqueLoggedMinutesUnresolved") || dashboard.includes("unresolvedMeetings"), "Unresolved time is never folded into Home's invested figure.");
assert(!/Recorded time/.test(dashboard), "Home says logged duration, never recorded time (start times are synthetic).");
assert(!dashboard.includes("Total meetings") && !dashboard.includes("Total hours logged") && !dashboard.includes("Total reviews"), "The old combined totals are gone.");
assert(dashboard.includes("each meeting counted once"), "Meeting Activity states that logged duration counts each meeting once.");

// 5. Accountability is a compact attention summary; the workflow lives on the Person.
assert(accountabilityCard.includes('eyebrow="Accountability"'), "Accountability keeps its heading.");
for (const label of ['"Due Today"', '"Overdue"', '"7 Days"']) {
  assert(accountabilityCard.includes(label), `Accountability must include ${label}.`);
}
assert(accountabilityCard.includes("rows.slice(0, 3)"), "Accountability shows the few most important items.");
for (const control of ["Log Check-In", "Mark Complete", "Reschedule", "onLogCheckIn", "onLogResourceCheckIn", "onMarkResourceAssignmentComplete"]) {
  assert(!accountabilityCard.includes(control), `Home's Accountability must not run the ${control} workflow.`);
}
assert(accountabilityCard.includes("onOpenPerson(person.id)"), "Each attention item opens the Person.");

// 6. Recent Fruit and Recent Reviews live in Reports.
assert(reports.includes('eyebrow="Recent Fruit"') && reports.includes('eyebrow="Recent Reviews"'), "Recent Fruit and Recent Reviews render inside Reports.");
assert(reportsView.includes("<MinistryTimeInvestmentReport") && reportsView.includes("<ReportsFruitAndReviews"), "Reports renders the Master Ministry Report followed by Fruit and Reviews.");
assert(!reportsView.includes("Coming soon") && !reportsView.includes("coming soon"), "Reports is no longer a Coming Soon screen.");
assert(reportsView.includes("input={ministryReportInput}"), "The report reads the narrowed input, never the raw workspace data.");

// 7. Quick actions unchanged.
assert(dashboard.includes('aria-label="Home quick actions"') && dashboard.includes("md:hidden"), "Mobile quick actions remain and stay hidden on desktop.");
for (const label of ['label: "Schedule"', 'label: "Add Person"', 'label: "Accountability"']) {
  assert(dashboard.includes(label), `Quick actions must include ${label}.`);
}

// 8. Colour language (founder, 2026-09-09): no yellow, amber, orange, or red on Home or in the Reports view; green only for confirmed status.
const warningColour = /amber|orange|yellow|text-red|bg-red|border-red|ring-red|#F59|#FEF3|#FDE68|#B45309|#D97706|#DC2626|#EF4444|#FCA5A5|#FEE2E2|#B91C1C|#F97316|#FBBF24|#FFF7ED|#EA580C|#FDF0D5|#FDE8E8|#FECACA|#F87171/i;
for (const [label, region] of [["Home", dashboard], ["Accountability", accountabilityCard], ["Reports view", reportsView], ["Fruit and Reviews", reports]]) {
  assert(!warningColour.test(region), `${label} must not use yellow, amber, orange, or red.`);
}

// 9. No mentor language on Home or Reports.
assert(!/mentor/i.test(dashboard.replace(/dashboardMentor|MentorMeeting|mentorRelationships/g, "")), "Home copy uses discipleship language.");

console.log("DOS Home V1 (USA-257) regression passed.");
