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
const accountabilityPanel = sliceBetween(client, "function HomeAccountabilityPanel", "function HomeTodayPanel");
const todayPanel = sliceBetween(client, "function HomeTodayPanel", "function CommitmentSuccessSheet");
const homeAccountabilityRow = sliceBetween(client, "function HomeAccountabilityPersonRow", "function HomeAccountabilitySectionHeading");
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
const order = ["<HomeTodayPanel", 'aria-label="Home quick actions"', "<HomeAccountabilityPanel", 'eyebrow="Top Time Investments"', 'eyebrow="Meeting Activity"', 'eyebrow="Upcoming"'];
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

/* 5. USA-282 and its follow-ups: Today sits above the action buttons and
   carries only today; Accountability sits below them, above Top Time
   Investments, and lists PEOPLE -- one row each, today first.

   USA-257's Due Today / Overdue / 7 Days boxes and its "N more on the people
   themselves" line are superseded, and so is the Notifications panel that
   carried a badge for the very backlog listed below it. */
assert(todayPanel.includes('eyebrow="Today"'), "Home's first section is Today.");
assert(todayPanel.includes("homeTodaySummaryLabel(counts)"), "It says what today holds, in units.");
assert(todayPanel.includes("homeTodayEmptyLabel"), "And says so plainly when today is empty.");
assert(dashboard.includes("<HomeTodayPanel counts={todayCounts} onOpen={onOpenToday} />"), "Tapping it opens the combined agenda.");
assert(!client.includes("function DashboardNotificationsPanel("), "The Notifications panel is retired.");
assert(dashboard.indexOf("<HomeTodayPanel") < dashboard.indexOf('aria-label="Home quick actions"'), "Today sits above the action buttons.");

assert(accountabilityPanel.includes('eyebrow="Accountability"'), "The section below the buttons is Accountability.");
assert(accountabilityPanel.includes("View all"), "Home offers one clear way to the full list.");
assert(accountabilityPanel.includes("onClick={onOpenAll}"), "View all opens it.");
assert(accountabilityPanel.includes("accountabilityPersonStatusOrder"), "The groups come from the shared module, in its order.");
assert(accountabilityPanel.includes("accountabilityPeopleForStatus(people, status)") && accountabilityPanel.includes("accountabilityPeopleForStatus(visible, status)"), "Each heading counts everyone in the group, not only those shown.");
assert(/const homeAccountabilityVisiblePeople = 6;/.test(client), "Home shows six people before handing off.");
assert(accountabilityPanel.includes("people.slice(0, homeAccountabilityVisiblePeople)"), "And exactly those six.");
assert(accountabilityPanel.includes("No one needs a check-in right now."), "The empty state is one short line.");
assert(!/Due Today|7 Days|more on the people themselves/.test(dashboard + accountabilityPanel), "The three large count boxes and the \"N more on the people themselves\" line are gone.");
assert(dashboard.indexOf("<HomeAccountabilityPanel") < dashboard.indexOf('eyebrow="Top Time Investments"'), "Accountability sits above Top Time Investments.");
assert(dashboard.indexOf('aria-label="Home quick actions"') < dashboard.indexOf("<HomeAccountabilityPanel"), "And below the action buttons.");

/* Home says who, when and how many -- never what. */
assert(homeAccountabilityRow.includes("person.personName") && homeAccountabilityRow.includes("person.statusDateLabel") && homeAccountabilityRow.includes("person.itemCountLabel"), "A row shows the person, the date and the count.");
assert(!/\.topic|\.context|CheckInStatusChip|checkInSecondaryLine/.test(homeAccountabilityRow), "No subject reaches Home.");
assert(!/title=\{/.test(homeAccountabilityRow), "No tooltip carries it either.");
assert(homeAccountabilityRow.includes(">Check in</span>"), "The row offers the check-in by name.");

/* 5b. One grouping, read by every surface: Home, the full list, today's
   agenda and the People control cannot disagree about who is behind. */
assert(client.includes("accountabilityPeople={checkInPeople}"), "Home is handed the grouped people.");
assert(client.includes("counts={checkInPeopleCounts}"), "The full list's filter counts come from the same grouping.");
assert(client.includes("todayCounts={todayCounts}"), "Today's counts come from the same rows.");
assert(client.includes("accountabilityPeopleDueToday(checkInPeopleAll)"), "Today includes anyone due today, whatever group they are classified into.");
assert(client.includes("const reportToday = useMemo(() => displayDateKey(reportNow)"), "Today's day key is the workspace's display timezone, from the render instant (USA-257 §9).");
assert(!dashboard.includes("new Date()"), "Nothing the dashboard renders reads the wall clock.");

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
for (const [label, region] of [["Home", dashboard], ["Accountability", accountabilityPanel + todayPanel + homeAccountabilityRow], ["Reports view", reportsView]]) {
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
assert(client.includes("const reportToday = useMemo(() => displayDateKey(reportNow) || reportNow.toISOString().slice(0, 10), [reportNow]);"), "The accountability day key comes from the same instant, read in the workspace's display timezone.");
/* USA-282: the check-in rows are derived once in the app, from that same day
   key, and Home is handed the result -- so Home computes no bucket from the
   wall clock and the full list compares against the identical day. */
assert(client.includes("today: reportToday,"), "The check-in buckets compare against the server render's day key.");
assert(!accountabilityPanel.includes("todayCommitmentDateKey()") && !todayPanel.includes("todayCommitmentDateKey()"), "The accountability surfaces are told which day it is, rather than reading the clock mid-render.");
assert(!dashboard.includes("new Date()"), "Home reads no wall clock during render.");

// 10. No mentor language on Home or Reports.
assert(!/mentor/i.test(dashboard.replace(/dashboardMentor|MentorMeeting|mentorRelationships/g, "")), "Home copy uses discipleship language.");

console.log("DOS Home V1 (USA-257) regression passed.");
