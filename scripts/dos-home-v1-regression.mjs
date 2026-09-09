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
assert(homeCallSite.includes("timeInvestments={homeMinistryReport.rows}"), "Top Time Investments rows come from the Master Ministry Report calculation.");
assert(homeCallSite.includes("meetingActivity={homeMinistryReport.totals}"), "Meeting Activity comes from the same calculation.");
assert(client.includes('buildDosMinistryReport({ ...ministryReportInput, now: reportNow, range: "30d" })'), "Home uses the report's default 30-day range.");
assert(dashboard.includes("Last 30 days · recorded meeting time · check-ins not included"), "Top Time Investments states its range and definition.");
assert(dashboard.includes(">Meetings</span>") && dashboard.includes(">Time</span>"), "Top Time Investments keeps its Meetings and Time headings.");
assert(dashboard.includes("dashboardTimeInvestmentRelationshipLine(person, engagementLevelsEnabled, row.directionLabel)"), "The relationship line shows the report's direction and keeps the engagement toggle.");
assert(!dashboard.includes("tableDurationMinutes") && !dashboard.includes("meetingMinutesEstimate"), "Home never falls back to a duration estimate.");
assert(!dashboard.includes("accountabilityCheckInDurationMinutes"), "Home never adds check-in minutes to meeting time.");

// 4. Meeting Activity says what it counts.
assert(dashboard.includes('label: "Logged meetings"') && dashboard.includes('label: "Recorded time"') && dashboard.includes('label: "People met with"') && dashboard.includes('label: "Check-ins (separate)"'), "Meeting Activity metrics are logged meetings, recorded time, people met with, and check-ins kept separate.");
assert(!dashboard.includes("Total meetings") && !dashboard.includes("Total hours logged") && !dashboard.includes("Total reviews"), "The old combined totals are gone.");
assert(dashboard.includes("each meeting counted once"), "Meeting Activity states that recorded time counts each meeting once.");

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

// 8. No mentor language on Home or Reports.
assert(!/mentor/i.test(dashboard.replace(/dashboardMentor|MentorMeeting|mentorRelationships/g, "")), "Home copy uses discipleship language.");

console.log("DOS Home V1 (USA-257) regression passed.");
