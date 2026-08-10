import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(source, needle, message) {
  assert(source.includes(needle), message);
}

function assertNotIncludes(source, needle, message) {
  assert(!source.includes(needle), message);
}

const appClient = read("app/dos/app/DosMvpAppClient.tsx");
const gatheringsRoute = read("app/api/dos/app/groups/gatherings/route.ts");
const settingsRoute = read("app/api/dos/app/groups/settings/route.ts");
const resourceAssignmentsRoute = read("app/api/dos/app/resource-assignments/route.ts");
const resourceAssignmentsApiLib = read("src/lib/dos/resource-assignments-api.ts");

const groupGatheringsTabSource = appClient.slice(
  appClient.indexOf("function GroupGatheringsTab"),
  appClient.indexOf("function GroupAttendanceTab"),
);
const computeGroupJourneyRowsSource = appClient.slice(
  appClient.indexOf("type GroupJourneyRowState"),
  appClient.indexOf("function groupNamesForAssignmentContext"),
);
const groupJourneysTabV2Source = appClient.slice(
  appClient.indexOf("function GroupJourneysTabV2"),
  appClient.indexOf("function GroupJourneyRowCard"),
);
const groupJourneyRowCardSource = appClient.slice(
  appClient.indexOf("function GroupJourneyRowCard"),
  appClient.indexOf("function GroupJourneyAssignSheet"),
);

// USA-161 Founder edit: canonical Group / Gathering / Journey model.
// Group = ongoing recurring rhythm. Gathering = a logged occurrence or exception.
// Journey = temporary formation content layered on top, with its own independent lifecycle.

// 1 & 2. A weekly recurring group with a valid weekday/time shows a derived next gathering
// without pre-generating occurrences, and no bulk-generation step is required.
assertIncludes(appClient, "function nextExpectedGroupOccurrence(group: DosAppGroup)", "Groups must derive the next expected gathering from the recurring rhythm, not only from materialized rows.");
assertIncludes(appClient, "computeGroupScheduleOccurrences(group, 1)[0]", "The derived next occurrence must come from the recurring rhythm rule, not a pre-generated row.");
assertIncludes(groupGatheringsTabSource, "nextExpectedGroupOccurrence(group)", "The Gatherings tab must render the derived next gathering, not just materialized rows.");
assertNotIncludes(groupGatheringsTabSource, 'label="Schedule Gatherings"', "The Gatherings tab must not present bulk 4/8/12/26 generation as its primary action.");
assertIncludes(groupGatheringsTabSource, "Advanced: schedule several gatherings at once", "Bulk generation must be de-emphasized behind an advanced affordance, not removed outright.");

// 3. Changing the recurring rhythm updates future derived expectations but must not rewrite
// historical logged gatherings - the settings route's future-gathering cascade must be scoped
// to scheduled + future-dated rows only.
assertIncludes(settingsRoute, '.eq("status", "scheduled")', "Applying a location/rhythm change to future gatherings must not touch non-scheduled (completed/canceled) history.");
assertIncludes(settingsRoute, '.gte("starts_at", new Date().toISOString())', "Applying a location/rhythm change to future gatherings must only affect gatherings that have not happened yet.");
assertNotIncludes(settingsRoute, '.from("dos_group_gatherings")\n    .update({ location: updateRecord.default_location, updated_at: new Date().toISOString() })\n    .eq("group_id", resolvedGroupId)\n    .eq("status", "scheduled")\n    .lte(', "Rhythm/location edits must never cascade into past gatherings.");

// 4 & 5. Skip/cancel/edit-this-occurrence and one-off gatherings only ever affect a single
// targeted occurrence, scoped by gatheringId, and never touch the group's recurring rhythm
// columns on dos_groups.
assertIncludes(gatheringsRoute, 'action === "cancel"', "Skip must be a single-occurrence action.");
assertIncludes(gatheringsRoute, ".eq(\"id\", gatheringId)", "Skip/edit must scope by a single gathering id, never a bulk update.");
assertIncludes(gatheringsRoute, 'action === "one_off"', "A one-off gathering must be its own isolated create action.");
assertNotIncludes(gatheringsRoute, '.from("dos_groups")\n    .update(', "Gathering create/edit/skip/generate actions must never write to the group's own recurring-rhythm row.");
assertIncludes(gatheringsRoute, "payload.skip === true", "Skipping a derived (not-yet-materialized) occurrence must lazily create a single canceled row instead of requiring bulk pre-generation first.");

// 6 & 7. Assigning/ending a Journey must never create, end, or otherwise mutate the group's
// gatherings or recurring-rhythm columns.
assertNotIncludes(resourceAssignmentsRoute, "dos_group_gatherings", "Resource assignment writes must never touch dos_group_gatherings.");
assertNotIncludes(resourceAssignmentsRoute, "recurrence_effective_date", "Resource assignment writes must never touch the group's recurring rhythm.");
assertNotIncludes(resourceAssignmentsRoute, "recurrence_end_date", "Resource assignment writes must never touch the group's recurring rhythm end date.");
assertNotIncludes(resourceAssignmentsApiLib, "dos_group_gatherings", "Resource assignment helpers must never touch dos_group_gatherings.");

// 8 & 9. Group Journey lifecycle (Current/Upcoming/Past) is displayed separately from, and is
// never derived from, aggregate participant completion - so a past study period with an
// incomplete participant cannot misleadingly read as fully completed.
assertIncludes(computeGroupJourneyRowsSource, "type GroupJourneyRowState = \"current\" | \"past\" | \"upcoming\";", "Journey row lifecycle states must use explicit Current/Upcoming/Past language, not a bare 'completed' that implies every participant finished.");
assertIncludes(computeGroupJourneyRowsSource, "studyPeriodEndTime", "Journey row lifecycle must be computed from the study period's date window.");
assertIncludes(groupJourneysTabV2Source, "journeysSummary", "The Journeys tab summary must be built from lifecycle counts, not an 'active/completed' aggregate that conflates lifecycle with participant completion.");
assertNotIncludes(groupJourneysTabV2Source, "completedRows.length} completed", "The Journeys tab must not summarize a Journey as group-wide 'completed' based on participant aggregation.");
assertIncludes(groupJourneyRowCardSource, "Study period ended", "A past Journey row must say its study period ended, not imply universal participant completion.");
assertIncludes(groupJourneyRowCardSource, "\"Assigned · Not started\"", "An assigned-but-not-started participant must read as Assigned / Not started, distinct from Not assigned and from Completed.");
assertIncludes(groupJourneyRowCardSource, "of ${assignments.length} ${assignments.length === 1 ? \"participant\" : \"participants\"} completed", "A past Journey must report exactly how many of its participants completed it, never implying all of them did.");

// 10. Multiple sequential/simultaneous Journeys can exist over the lifetime of the same group -
// rows are keyed per distinct resource slug, not a single group-wide journey slot.
assertIncludes(computeGroupJourneyRowsSource, "assignmentsBySlug.forEach((assignments, resourceSlug)", "Each distinct resource assigned to the group must produce its own Journey row so multiple Journeys can coexist.");

// 11. No production data rewrite: gathering/journey history must remain intact. The gatherings
// API must never delete rows, only insert or status-update them.
assertNotIncludes(gatheringsRoute, ".delete()", "Gatherings API must never delete history - skip/cancel only changes status.");
assertNotIncludes(resourceAssignmentsRoute, ".delete()", "Resource assignments API must never delete Journey/assignment history.");

console.log("DOS groups recurring rhythm / Journey lifecycle regression passed.");
