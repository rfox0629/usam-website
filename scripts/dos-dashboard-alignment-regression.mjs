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
const dashboard = sliceBetween(client, "function DesktopHomeDashboard", "function DesktopInvitePanel");
const relationshipHelper = sliceBetween(client, "function dashboardDiscipleshipRelationshipLabel", "function dashboardEngagementScoreLabel");
const launchBridge = sliceBetween(client, "useEffect(() => {\n    if (!launchAction)", "function openMyRecordTimelineItem");

[
  "label=\"Time With God\"",
  "label=\"Prayer Time\"",
  "label=\"Next Mentor Meeting\"",
  "label=\"Weekly Report Card\"",
].forEach((needle) => {
  assert(dashboard.includes(needle), `Today's Alignment must render ${needle}.`);
});

assert(dashboard.includes("latestDashboardJournalEntry(myRecord)"), "Time With God must use My Record journal/encounter data.");
assert(dashboard.includes("latestDashboardPrayerLog(myRecord)"), "Prayer Time must use personal My Record prayer logs.");
assert(dashboard.includes("nextDashboardMentorMeeting(myRecord)"), "Next Mentor Meeting must use My Record mentor meetings.");
assert(dashboard.includes("buildDashboardWeeklyReportCard(myRecord, loggedMeetings)"), "Weekly Report Card must derive completion from real weekly report data.");
assert(dashboard.includes("progress={weeklyReportCard.completionPercent}"), "Weekly Report Card must render a derived completion percentage.");

assert(launchBridge.includes('openMyRecordSheet({ kind: "encounter", mode: "new", title: "Time With God" })'), "Time With God must launch the existing encounter flow.");
assert(launchBridge.includes('openMyRecordSheet({ kind: "prayer", mode: "new" })'), "Prayer Time must launch the personal prayer log flow.");
assert(launchBridge.includes('openMyRecordSheet({ kind: "mentor_meeting", mode: "new" })'), "Missing mentor meeting launch action.");
assert(launchBridge.includes('openMyRecordSheet({ fruit, kind: "weekly_report", meetings, mode: "view" })'), "Weekly report row must open the weekly report sheet.");

assert(dashboard.includes("dashboardTimeInvestmentRelationshipLine(item.person)"), "Top Time Investments must render the dashboard relationship line.");
assert(!dashboard.includes("relationshipLine(item.person)"), "Top Time Investments must not render the old context-heavy relationship line.");
assert(dashboard.includes(">Tables</span>"), "Top Time Investments must include a Tables heading.");
assert(dashboard.includes(">Time</span>"), "Top Time Investments must include a Time heading.");

assert(relationshipHelper.includes("person.discipleshipRelationship"), "Relationship label should use the existing discipleship relationship field.");
assert(relationshipHelper.includes("model.roleInMyLife"), "Relationship label should fall back to the discipleship role model.");
assert(relationshipHelper.includes("relationshipTypeFromModel(model)"), "Relationship label should fall back to the existing relationship type model.");
assert(!relationshipHelper.includes("relationshipContextLabel"), "Relationship label must not use Church/Family/Outreach context labels.");
assert(!relationshipHelper.includes("relationshipContext"), "Relationship label must not use relationship context categories.");

assert(client.includes("function dashboardEngagementScoreLabel"), "Dashboard engagement formatter must exist.");
assert(client.includes("relationshipScoreFromEngagementLevel(person.engagementLevel)"), "Engagement number must come from the existing engagement field.");
assert(client.includes('return "Not rated";'), "Missing engagement fallback for unrated people.");

console.log("DOS dashboard alignment regression passed.");
