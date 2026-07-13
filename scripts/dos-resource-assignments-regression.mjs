import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertIncludes(source, needle, label) {
  if (!source.includes(needle)) {
    throw new Error(`${label}: missing ${needle}`);
  }
}

function assertMatches(source, pattern, label) {
  if (!pattern.test(source)) {
    throw new Error(`${label}: missing ${pattern}`);
  }
}

const migration = read("supabase/migrations/20260713113226_dos_resource_assignments.sql");
const catalog = read("src/lib/dos/resource-catalog.ts");
const assignmentTypes = read("src/lib/dos/resource-assignments.ts");
const assignmentApiHelper = read("src/lib/dos/resource-assignments-api.ts");
const assignmentsRoute = read("app/api/dos/app/resource-assignments/route.ts");
const checkInsRoute = read("app/api/dos/app/resource-assignments/check-ins/route.ts");
const loader = read("src/lib/dos/missionary-app.ts");
const client = read("app/dos/app/DosMvpAppClient.tsx");
const preview = read("app/dos/app/preview/page.tsx");
const packageJson = read("package.json");

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

assertIncludes(assignmentTypes, "dosResourceAssignmentStatuses", "assignment status helpers exist");
assertIncludes(assignmentTypes, "dosResourceAssignmentFollowUpCadences", "assignment cadence helpers exist");
assertIncludes(assignmentTypes, "resourceAssignmentCommitmentTitle", "linked commitment title helper exists");

assertIncludes(catalog, "assignable: true", "reading plan is assignable");
assertIncludes(catalog, "durationDays: 14", "reading plan assignment duration defaults to fourteen days");
assertIncludes(catalog, 'followUpCadence: "midpoint_and_completion"', "reading plan defaults midpoint and completion follow-up");

assertIncludes(assignmentApiHelper, "resolveAssignableDosResource", "API helper validates assignable resources");
assertIncludes(assignmentApiHelper, "mapResourceAssignmentRow", "API helper maps assignment rows");
assertIncludes(assignmentApiHelper, "resourceAssignmentCommitmentStatusPatch", "API helper syncs assignment status to commitment status");

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
assertIncludes(assignmentsRoute, "loadWorkspacePerson", "assignment route scopes person to workspace");
assertIncludes(assignmentsRoute, "resourceAssignmentCommitmentStatusPatch", "assignment status syncs commitment");
assertIncludes(checkInsRoute, "dos_accountability_check_ins", "resource check-ins use accountability check-ins");
assertIncludes(checkInsRoute, "dos_accountability_check_in_commitments", "resource check-ins link discussed commitment");
assertIncludes(checkInsRoute, "dos_commitment_updates", "resource check-ins create commitment progress updates");

assertIncludes(loader, "type DosAppResourceAssignment", "loader exposes resource assignment type");
assertIncludes(loader, "loadResourceAssignmentsForWorkspace", "loader loads resource assignments");
assertIncludes(loader, "resourceAssignments: DosAppResourceAssignment[]", "DOS app data includes resource assignments");
assertIncludes(loader, "latestActivityByPersonId.set(assignment.person_id", "assignments affect person activity");
assertIncludes(preview, "resourceAssignments: []", "preview supplies resource assignments");

assertIncludes(client, "ResourceAssignmentFormSheet", "client has assignment form sheet");
assertIncludes(client, "ResourceAssignmentCheckInSheet", "client has assignment check-in sheet");
assertIncludes(client, "ResourceAssignmentSuccessSheet", "client has assignment success/share sheet");
assertIncludes(client, "ResourceAssignmentCard", "client has reusable assignment card");
assertIncludes(client, "Assigned Resources", "person Growth/My Record show assigned resources");
assertIncludes(client, "Completed Resources", "person Growth/My Record show completed resources");
assertIncludes(client, "ResourceAssignmentsDashboardCard", "dashboard has resource follow-up presentation");
assertIncludes(client, "onAssign={openResourceAssignmentCreate}", "Library list wires Assign action");
assertIncludes(client, "Read Online", "assignment card keeps online reading action");
assertIncludes(client, "Download PDF", "Library card keeps PDF action");
assertIncludes(client, "getDosResourceBySlug", "client resolves canonical catalog metadata by slug");
assertIncludes(client, "setResourceAssignmentStatus(assignment, \"completed\")", "assignment completion action exists");
assertIncludes(client, "setResourceAssignmentStatus(assignment, assignment.status === \"paused\" ? \"in_progress\" : \"paused\")", "assignment pause/resume action exists");
assertMatches(client, /name="general_update"[\s\S]*required/, "resource check-in note is required");

assertIncludes(packageJson, "\"test:dos-resource-assignments\"", "package registers resource assignment regression");

console.log("DOS resource assignments regression checks passed.");
