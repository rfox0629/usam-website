import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const require = createRequire(import.meta.url);

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertIncludes(source, needle, label) {
  if (!source.includes(needle)) {
    throw new Error(`${label}: missing ${needle}`);
  }
}

function assertNotIncludes(source, needle, label) {
  if (source.includes(needle)) {
    throw new Error(`${label}: unexpectedly found ${needle}`);
  }
}

function assertMatches(source, pattern, label) {
  if (!pattern.test(source)) {
    throw new Error(`${label}: missing ${pattern}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${actual}`);
  }
}

function assertCountAtLeast(source, needle, count, label) {
  const matches = source.split(needle).length - 1;

  if (matches < count) {
    throw new Error(`${label}: expected at least ${count} occurrences of ${needle}, found ${matches}`);
  }
}

function loadResourceAssignmentHelpers() {
  const ts = require("typescript");
  const source = read("src/lib/dos/resource-assignments.ts");
  const module = { exports: {} };
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;

  vm.runInNewContext(output, {
    Date,
    exports: module.exports,
    module,
    require,
  }, {
    filename: "src/lib/dos/resource-assignments.ts",
  });

  return module.exports;
}

const migration = read("supabase/migrations/20260713113226_dos_resource_assignments.sql");
const assignmentContextMigration = read("supabase/migrations/20260807151800_dos_journey_assignment_context.sql");
const catalog = read("src/lib/dos/resource-catalog.ts");
const assignmentTypes = read("src/lib/dos/resource-assignments.ts");
const assignmentApiHelper = read("src/lib/dos/resource-assignments-api.ts");
const assignmentsRoute = read("app/api/dos/app/resource-assignments/route.ts");
const checkInsRoute = read("app/api/dos/app/resource-assignments/check-ins/route.ts");
const loader = read("src/lib/dos/missionary-app.ts");
const client = read("app/dos/app/DosMvpAppClient.tsx");
const preview = read("app/dos/app/preview/page.tsx");
const packageJson = read("package.json");
const resourceAssignmentFormSheet = client.slice(
  client.indexOf("function ResourceAssignmentFormSheet"),
  client.indexOf("function ResourceAssignmentCheckInSheet"),
);
const resourceAssignmentSuccessSheet = client.slice(
  client.indexOf("function ResourceAssignmentSuccessSheet"),
  client.indexOf("function ResourceAssignmentDuplicateSheet"),
);
const groupJourneyAssignSheet = client.slice(
  client.indexOf("function GroupJourneyAssignSheet"),
  client.indexOf("function AssignTargetPickerSheet"),
);
const assignmentHelpers = loadResourceAssignmentHelpers();

const calendarDateCases = [
  {
    days: 49,
    expected: "2026-10-02",
    label: "seven-week Discipleship estimate adds forty-nine calendar days",
    startDate: "2026-08-14",
  },
  {
    days: 14,
    expected: "2026-08-28",
    label: "fourteen-day resource estimate adds fourteen calendar days",
    startDate: "2026-08-14",
  },
  {
    days: 14,
    expected: "2026-02-14",
    label: "fourteen-day estimate crosses month boundary",
    startDate: "2026-01-31",
  },
  {
    days: 14,
    expected: "2027-01-14",
    label: "fourteen-day estimate crosses year boundary",
    startDate: "2026-12-31",
  },
  {
    days: 14,
    expected: "2026-03-21",
    label: "fourteen-day estimate crosses daylight-saving start boundary",
    startDate: "2026-03-07",
  },
  {
    days: 14,
    expected: "2026-11-14",
    label: "fourteen-day estimate crosses daylight-saving end boundary",
    startDate: "2026-10-31",
  },
];
const previousTz = process.env.TZ;

for (const timezone of ["UTC", "America/Chicago", "America/Los_Angeles", "Pacific/Kiritimati"]) {
  process.env.TZ = timezone;

  for (const testCase of calendarDateCases) {
    assertEqual(
      assignmentHelpers.addDaysToResourceAssignmentDateKey(testCase.startDate, testCase.days),
      testCase.expected,
      `${testCase.label} in ${timezone}`,
    );
    assertEqual(
      assignmentHelpers.defaultResourceAssignmentDueDate(testCase.startDate, testCase.days),
      testCase.expected,
      `${testCase.label} through default helper in ${timezone}`,
    );
  }
}

if (previousTz === undefined) {
  delete process.env.TZ;
} else {
  process.env.TZ = previousTz;
}

assertIncludes(migration, "create table if not exists public.dos_resource_assignments", "migration creates assignment table");
assertIncludes(migration, "resource_slug text not null", "migration stores canonical resource slug");
assertIncludes(migration, "linked_commitment_id uuid references public.dos_person_commitments", "migration links commitment");
assertIncludes(migration, "status in ('not_started', 'in_progress', 'completed', 'paused')", "migration constrains statuses");
assertIncludes(migration, "follow_up_cadence in ('none', 'midpoint_and_completion', 'due_only', 'weekly')", "migration constrains follow-up cadence");
assertIncludes(migration, "dos_resource_assignments_active_unique", "migration prevents duplicate active resource assignments");
assertIncludes(migration, "alter table public.dos_resource_assignments enable row level security", "migration enables RLS");
assertIncludes(migration, "grant select, insert, update on table public.dos_resource_assignments to authenticated", "migration grants authenticated access");
assertIncludes(migration, "public.can_access_dos_workspace(workspace_id, array['admin', 'editor', 'viewer'])", "migration preserves workspace read scope");
assertIncludes(migration, "public.can_access_dos_workspace(workspace_id, array['admin', 'editor'])", "migration preserves workspace write scope");
assertIncludes(migration, "Library remains the source of truth", "migration documents catalog ownership");
assertIncludes(assignmentContextMigration, "assignment_context text not null default 'person'", "assignment context migration stores assignment origin");
assertIncludes(assignmentContextMigration, "source_group_id uuid references public.dos_groups", "assignment context migration stores optional group context");
assertIncludes(assignmentContextMigration, "sharing_level text not null default 'leader_progress'", "assignment context migration stores leader sharing default");
assertIncludes(assignmentContextMigration, "dos_resource_assignments_group_context_check", "group assignments must carry group context");
assertIncludes(assignmentContextMigration, "dos_resource_assignments_group_context_idx", "group context lookup must be indexed");

assertIncludes(assignmentTypes, "dosResourceAssignmentStatuses", "assignment status helpers exist");
assertIncludes(assignmentTypes, "dosResourceAssignmentFollowUpCadences", "assignment cadence helpers exist");
assertIncludes(assignmentTypes, "dosResourceAssignmentContexts", "assignment context helpers exist");
assertIncludes(assignmentTypes, "dosResourceAssignmentSharingLevels", "assignment sharing-level helpers exist");
assertIncludes(assignmentTypes, "resourceAssignmentCommitmentTitle", "linked commitment title helper exists");
assertIncludes(assignmentTypes, "resourceAssignmentFollowUpScheduleHeading = \"Growth follow-up due\"", "follow-up schedule display heading exists");
assertIncludes(assignmentTypes, "resourceAssignmentFollowUpScheduleMarker", "follow-up schedules carry assignment marker");
assertIncludes(assignmentTypes, "resourceAssignmentFollowUpScheduleDisplayTitle", "follow-up schedule marker is hidden from users");
assertIncludes(assignmentTypes, "resourceAssignmentMidpointDate", "midpoint date helper exists");
assertIncludes(assignmentTypes, "resourceAssignmentFollowUpDates", "follow-up date helper exists");
assertIncludes(assignmentTypes, "Date.UTC(parts.year, parts.month - 1, parts.day + dayCount)", "duration math must add whole calendar days.");
assertMatches(assignmentTypes, /followUpCadence === "midpoint_and_completion"[\s\S]*kind: "midpoint"[\s\S]*kind: "completion"/, "midpoint cadence creates midpoint and completion dates");
assertMatches(assignmentTypes, /status === "completed" \|\| status === "paused" \|\| followUpCadence === "none"/, "completed, paused, and none suppress future follow-ups");

assertIncludes(catalog, "assignable: true", "reading plan is assignable");
assertIncludes(catalog, "durationDays: 14", "reading plan assignment duration defaults to fourteen days");
assertIncludes(catalog, 'followUpCadence: "midpoint_and_completion"', "reading plan defaults midpoint and completion follow-up");

assertIncludes(assignmentApiHelper, "resolveAssignableDosResource", "API helper validates assignable resources");
assertIncludes(assignmentApiHelper, "value === null", "API helper must preserve intentionally blank due dates.");
assertIncludes(assignmentApiHelper, "value === undefined", "API helper must not default missing due dates into enforced due dates.");
assertIncludes(assignmentApiHelper, "value.trim() === \"\"", "API helper must not silently default blank due dates.");
assertIncludes(assignmentApiHelper, "mapResourceAssignmentRow", "API helper maps assignment rows");
assertIncludes(assignmentApiHelper, "normalizeResourceAssignmentContext", "API helper normalizes assignment context");
assertIncludes(assignmentApiHelper, "normalizeResourceAssignmentSharingLevel", "API helper normalizes sharing levels");
assertIncludes(assignmentApiHelper, "sourceGroupId: row.source_group_id", "API helper maps group context");
assertIncludes(assignmentApiHelper, "resourceAssignmentCommitmentStatusPatch", "API helper syncs assignment status to commitment status");
assertIncludes(assignmentApiHelper, "syncResourceAssignmentFollowUpSchedules", "API helper syncs accountability schedules");
assertIncludes(assignmentApiHelper, "pauseResourceAssignmentFollowUpSchedules", "API helper pauses due resource follow-ups");
assertIncludes(assignmentApiHelper, "dos_accountability_schedules", "API helper reuses accountability schedules");
assertIncludes(assignmentApiHelper, "frequency: \"one_time\"", "resource follow-ups use one-time accountability schedules");
assertIncludes(assignmentApiHelper, "next_check_in: row.date", "date edits update scheduled follow-up dates");
assertIncludes(assignmentApiHelper, "existingForKind.slice(1)", "duplicate follow-up schedules are paused");
assertIncludes(assignmentApiHelper, "status: \"paused\"", "stale future follow-ups are paused instead of duplicated");

[
  assignmentsRoute,
  checkInsRoute,
].forEach((route, index) => {
  assertIncludes(route, "authorizeDosCommitmentsWrite", `route ${index} authorizes DOS writes`);
  assertIncludes(route, "resolveAuthorizedCommitmentsWorkspace", `route ${index} resolves workspace access`);
  assertIncludes(route, "requireCommitmentsFeature", `route ${index} reuses commitments feature gate`);
});

assertIncludes(assignmentsRoute, "dos_person_commitments", "assignment creation creates/updates linked commitment");
assertIncludes(assignmentsRoute, "dos_resource_assignments", "assignment route writes assignments");
assertIncludes(assignmentsRoute, "reuseExisting", "assignment route requires explicit duplicate reuse");
assertIncludes(assignmentsRoute, "duplicate: true", "assignment route returns duplicate warnings");
assertIncludes(assignmentsRoute, "{ status: 409 }", "assignment route must not silently overwrite active duplicates");
assertIncludes(assignmentsRoute, ".from(\"dos_groups\")", "assignment route validates group context");
assertIncludes(assignmentsRoute, ".from(\"dos_group_members\")", "assignment route validates group membership context");
assertIncludes(assignmentsRoute, "assignment_context: assignmentContext", "assignment route writes canonical assignment context");
assertIncludes(assignmentsRoute, "source_group_id: sourceGroupId", "assignment route writes group context");
assertIncludes(assignmentsRoute, "loadWorkspacePerson", "assignment route scopes person to workspace");
assertIncludes(assignmentsRoute, "resourceAssignmentCommitmentStatusPatch", "assignment status syncs commitment");
assertIncludes(assignmentsRoute, "syncResourceAssignmentFollowUpSchedules", "assignment route syncs follow-up schedules");
assertCountAtLeast(assignmentsRoute, "syncResourceAssignmentFollowUpSchedules", 3, "create and update paths both sync follow-up schedules");
assertIncludes(checkInsRoute, "dos_accountability_check_ins", "resource check-ins use accountability check-ins");
assertIncludes(checkInsRoute, "dos_accountability_check_in_commitments", "resource check-ins link discussed commitment");
assertIncludes(checkInsRoute, "dos_commitment_updates", "resource check-ins create commitment progress updates");
assertIncludes(checkInsRoute, "pauseResourceAssignmentFollowUpSchedules", "resource check-ins close due follow-up schedules");
assertIncludes(checkInsRoute, "includeFuture: nextAssignmentStatus === \"completed\" || nextAssignmentStatus === \"paused\"", "completion and pause close future follow-ups");

assertIncludes(loader, "type DosAppResourceAssignment", "loader exposes resource assignment type");
assertIncludes(loader, "loadResourceAssignmentsForWorkspace", "loader loads resource assignments");
assertIncludes(loader, "resourceAssignments: DosAppResourceAssignment[]", "DOS app data includes resource assignments");
assertIncludes(loader, "latestActivityByPersonId.set(assignment.person_id", "assignments affect person activity");
assertIncludes(preview, "resourceAssignments:", "preview supplies resource assignments");

assertIncludes(client, "ResourceAssignmentFormSheet", "client has assignment form sheet");
assertIncludes(client, "ResourceAssignmentCheckInSheet", "client has assignment check-in sheet");
assertIncludes(client, "ResourceAssignmentSuccessSheet", "client has assignment success/share sheet");
assertIncludes(client, "displayTimeZoneForValue(value)", "calendar-date display must avoid browser timezone shifts.");
assertIncludes(client, "ResourceAssignmentDuplicateSheet", "client warns before reusing active duplicate assignments");
assertIncludes(client, "AssignTargetPickerSheet", "Library Assign asks who the assignment is for");
assertIncludes(client, "Who is this for?", "Library Assign target picker uses the required prompt");
assertIncludes(client, "GroupJourneyAssignSheet", "Groups can assign journeys to selected members");
assertIncludes(client, "computeGroupFocusAssignment", "group journey view derives from canonical assignments");
assertIncludes(client, "groupNamesForAssignmentContext", "person profile exposes assignment context");
assertIncludes(client, "ResourceAssignmentCard", "client has reusable assignment card");
assertIncludes(client, "Assigned Resources", "person Growth/My Record show assigned resources");
assertIncludes(client, "Completed Journeys (", "person Growth shows a collapsible completed-journeys history");
assertIncludes(client, "ResourceAssignmentsDashboardCard", "dashboard has resource follow-up presentation");
assertIncludes(client, "AccountabilityDashboardCard", "dashboard keeps accountability due presentation");
assertIncludes(client, "resourceAssignmentForFollowUpSchedule", "dashboard connects follow-up schedules to assignments");
assertIncludes(client, "resourceAssignmentFollowUpScheduleHeading", "dashboard uses growth follow-up heading");
assertIncludes(client, "Check in with ${personName} about", "dashboard displays resource follow-up item text");
assertIncludes(client, "Open Person", "dashboard exposes person action for due follow-ups");
assertIncludes(client, "Log Check-In", "dashboard exposes check-in action for due follow-ups");
assertIncludes(client, "Mark Complete", "dashboard exposes completion action for due follow-ups");
assertIncludes(client, "Reschedule", "dashboard exposes reschedule action for due follow-ups");
assertIncludes(client, "onLogResourceCheckIn(assignment)", "dashboard uses resource check-in flow for resource follow-ups");
assertIncludes(client, "resourceAssignmentFollowUpScheduleDisplayTitle", "client hides resource assignment schedule marker");
assertIncludes(client, "onAssign={openAssignTargetPicker}", "Library list routes Assign through target picker");
assertIncludes(client, "openResourceAssignmentCreate(resource, myPersonId, { assignmentContext: \"self\" })", "Library Assign supports Myself target");
assertIncludes(client, "openResourceAssignmentCreate(resource, null, { assignmentContext: \"library\" })", "Library Assign supports Person target through the canonical assignment form");
assertIncludes(client, "assignmentContext: \"group\"", "Group Journey assignment writes group context");
assertIncludes(client, "sourceGroupId", "Client carries source group id for group-context assignments");
assertIncludes(client, "dueDate: \"\"", "Assignment launch must intentionally store no enforced due date.");
assertIncludes(client, "followUpCadence: \"none\"", "Group assignment launch must not create per-participant due reminders by default.");
assertIncludes(client, "reuseExistingResourceAssignment", "duplicate warning offers explicit existing-assignment reuse");
assertIncludes(client, "openLeaderJourneyProgress(personId, resource.slug)", "Person profile opens leader progress instead of editable private participant fields");
assertIncludes(client, "Read Online", "assignment card keeps online reading action");
assertIncludes(client, "Download PDF", "Library card keeps PDF action");
assertIncludes(client, "getDosResourceBySlug", "client resolves canonical catalog metadata by slug");
assertIncludes(client, "setResourceAssignmentStatus(assignment, \"completed\")", "assignment completion action exists");
assertIncludes(client, "setResourceAssignmentStatus(assignment, assignment.status === \"paused\" ? \"in_progress\" : \"paused\")", "assignment pause/resume action exists");
assertMatches(client, /name="general_update"[\s\S]*required/, "resource check-in note is required");

assertIncludes(resourceAssignmentFormSheet, "Start Date", "Assignment launch must ask for Start Date.");
assertIncludes(resourceAssignmentFormSheet, "DosDateInput", "Assignment launch must use the compact DOS date input instead of the native iOS date pill.");
assertIncludes(resourceAssignmentFormSheet, "onChange={setStartDate}", "Assignment estimate must update when the selected start date changes.");
assertIncludes(resourceAssignmentFormSheet, "value={startDate}", "Assignment start date must be controlled for reliable estimate recalculation.");
assertIncludes(resourceAssignmentFormSheet, "min-[380px]:grid-cols", "Assignment launch should keep person and date compact side-by-side on standard phone widths.");
assertIncludes(resourceAssignmentFormSheet, "This is not a due date.", "Assignment launch must explain derived completion is not enforced.");
assertIncludes(resourceAssignmentFormSheet, "Leader Reminder (Optional)", "Assignment launch must demote reminders to a collapsed optional control.");
assertNotIncludes(resourceAssignmentFormSheet, "Due Date", "Assignment launch must not expose an editable Due Date field.");
assertNotIncludes(resourceAssignmentFormSheet, "Personal Message", "Assignment launch must not expose a large personal-message field.");
assertNotIncludes(resourceAssignmentFormSheet, "Linked Commitment", "Assignment launch must not show linked-commitment plumbing.");
assertIncludes(groupJourneyAssignSheet, "Start Date", "Group assignment launch must ask for Start Date.");
assertIncludes(groupJourneyAssignSheet, "DosDateInput", "Group assignment launch must use the compact DOS date input.");
assertIncludes(groupJourneyAssignSheet, "already has this Journey", "Group assignment must explain duplicate active Journeys in plain member language.");
assertIncludes(groupJourneyAssignSheet, "Keep their progress", "Group assignment must preserve duplicate prevention without backend wording.");
assertNotIncludes(groupJourneyAssignSheet, "canonical per-person record", "Group assignment must not expose canonical record terminology to leaders.");
assertIncludes(groupJourneyAssignSheet, "reuseExisting", "Group assignment must submit the explicit reuse decision.");
assertIncludes(resourceAssignmentSuccessSheet, "Secure Invitation", "Assignment success must surface secure member invitation actions.");
assertIncludes(resourceAssignmentSuccessSheet, "send_member_access", "Assignment success must reuse the scoped member access endpoint.");
assertIncludes(resourceAssignmentSuccessSheet, "Text Invitation", "Assignment success must offer native share/text flow when supported.");
assertIncludes(resourceAssignmentSuccessSheet, "Copy Link", "Assignment success must offer secure link copy.");
assertIncludes(resourceAssignmentSuccessSheet, "Preview {participantFirstName(target.personName)}'s Experience", "Assignment success must offer a read-only participant experience preview.");
// USA-170: the preview must be the shared member Group Home, not a second
// hand-built mock of it. `MemberGroupHomePreview` wraps the same
// `GroupHomeMemberView` the participant's real secure link renders.
assertIncludes(resourceAssignmentSuccessSheet, "MemberGroupHomePreview", "Assignment success must render the shared member Group Home preview without creating another participant route.");
assertNotIncludes(client, "MemberExperiencePreviewPanel", "The duplicate legacy preview panel must stay deleted.");
assertIncludes(client, "Copy blocked. Select this secure link", "Invitation copy must provide a selectable-link fallback when clipboard/share is blocked.");
assertIncludes(resourceAssignmentSuccessSheet, "buildPreviewParticipantAccessUrl", "Preview assignment success must generate a real demo-safe member access route.");
assertIncludes(resourceAssignmentSuccessSheet, "participantInvitationUrlForCurrentContext", "Invitation actions must share one canonical URL normalizer.");
assertNotIncludes(resourceAssignmentSuccessSheet, "Copy Public Link", "Assignment success must not fall back to a generic public Journey link.");
assertIncludes(assignmentsRoute, "ensureGroupMemberAccessReady", "Group Journey assignment must prepare existing scoped member access behind the scenes.");
assertIncludes(assignmentsRoute, "source: \"leader_assignment\"", "Assignment provisioning must not mint or rotate participant invitation tokens.");

// USA-161: Group -> Assign Journey must visibly offer Discipleship, not just theoretically
// allow it. The picker renders every catalog resource marked assignable, so Discipleship
// (marks-of-discipleship) must be one of them.
assertIncludes(catalog, 'id: "discipleship-marks-of-discipleship"', "Discipleship guided journey resource must exist in the catalog");

const discipleshipCatalogIdIndex = catalog.indexOf('id: "discipleship-marks-of-discipleship"');

// USA-162 expanded Discipleship from the obsolete six-week draft to the final
// seven-week model covering all thirteen book chapters, so the object is longer than it used to be -
// widen the lookbehind window rather than truncating past "assignable: true".
assertIncludes(
  catalog.slice(Math.max(0, discipleshipCatalogIdIndex - 20000), discipleshipCatalogIdIndex),
  "assignable: true",
  "Discipleship guided journey must be assignable so it appears in the Assign Journey picker",
);
assertIncludes(client, "dosAssignableResourceItems = dosResourceCatalog.filter((resource) => resource.assignable)", "Assign Journey picker must list every assignable catalog resource, including Discipleship");
assertIncludes(client, "resources={dosAssignableResourceItems}", "Group Assign Journey sheet must use the assignable-resources list that includes Discipleship");

assertIncludes(packageJson, "\"test:dos-resource-assignments\"", "package registers resource assignment regression");

console.log("DOS resource assignments regression checks passed.");
