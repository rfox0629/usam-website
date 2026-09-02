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

function assertNotIncludes(source, needle, label) {
  if (source.includes(needle)) {
    throw new Error(`${label}: found ${needle}`);
  }
}

function assertMatches(source, pattern, label) {
  if (!pattern.test(source)) {
    throw new Error(`${label}: missing ${pattern}`);
  }
}

const migration = read("supabase/migrations/20260711021920_dos_commitments_accountability.sql");
const client = read("app/dos/app/DosMvpAppClient.tsx");
const loader = read("src/lib/dos/missionary-app.ts");
const preview = read("app/dos/app/preview/page.tsx");
const commitmentsRoute = read("app/api/dos/app/commitments/route.ts");
const updatesRoute = read("app/api/dos/app/commitments/updates/route.ts");
const schedulesRoute = read("app/api/dos/app/accountability/schedules/route.ts");
const checkInsRoute = read("app/api/dos/app/accountability/check-ins/route.ts");
const apiHelper = read("src/lib/dos/commitments-accountability-api.ts");

[
  "dos_workspace_feature_flags",
  "dos_person_commitments",
  "dos_commitment_updates",
  "dos_accountability_schedules",
  "dos_accountability_check_ins",
  "dos_accountability_check_in_commitments",
].forEach((table) => {
  assertIncludes(migration, `create table if not exists public.${table}`, `migration creates ${table}`);
  assertIncludes(migration, `alter table public.${table} enable row level security`, `migration enables RLS for ${table}`);
});

assertIncludes(migration, "public.can_access_dos_workspace", "workspace-scoped RLS helper");
assertIncludes(migration, "'dos_commitments_accountability'", "feature flag key");
assertIncludes(migration, "slug in ('ryan-fox', 'ryan-brooke-fox')", "Ryan-only initial seed");
assertIncludes(migration, "status in ('active', 'completed', 'paused', 'cancelled')", "commitment statuses");
assertIncludes(migration, "frequency in ('weekly', 'every_two_weeks', 'monthly', 'one_time')", "schedule frequencies");
assertIncludes(migration, "unique (check_in_id, commitment_id)", "check-in commitment link uniqueness");

[
  commitmentsRoute,
  updatesRoute,
  schedulesRoute,
  checkInsRoute,
].forEach((route, index) => {
  assertIncludes(route, "authorizeDosCommitmentsWrite", `route ${index} authorizes DOS writes`);
  assertIncludes(route, "resolveAuthorizedCommitmentsWorkspace", `route ${index} resolves workspace`);
  assertIncludes(route, "requireCommitmentsFeature", `route ${index} checks feature flag`);
});

assertIncludes(apiHelper, "loadWorkspacePerson", "API helper scopes people to workspace");
assertIncludes(apiHelper, ".or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)", "person lookup prevents cross-workspace writes");
assertIncludes(checkInsRoute, "nextAccountabilityCheckInDate", "check-in logging advances recurrence");
assertIncludes(checkInsRoute, "dos_accountability_check_in_commitments", "check-in logging links commitments");
assertIncludes(checkInsRoute, "newCommitment", "check-in logging supports inline new commitment");
assertIncludes(checkInsRoute, "general_update", "check-in logging uses general update as primary note");
assertIncludes(checkInsRoute, "duration_minutes: asNullableInteger", "check-in logging persists duration minutes");

const quickActionsMatch = client.match(/const quickActionItems:[\s\S]*?\];/);

if (!quickActionsMatch) {
  throw new Error("dashboard quick actions not found");
}

/* USA-168 locked the user-facing word to Accountability. The storage contract
   is unchanged -- dos_commitments and its routes keep their names, asserted
   above -- so this is vocabulary, not a migration. */
assertIncludes(quickActionsMatch[0], 'label: "Accountability"', "dashboard quick action uses the Accountability vocabulary");
if (quickActionsMatch[0].includes('label: "Commitment"')) {
  throw new Error("dashboard quick action must not still say Commitment");
}
assertNotIncludes(quickActionsMatch[0], 'label: "Pray Now"', "dashboard quick action does not fall back to Pray Now");

assertIncludes(client, "AccountabilityDashboardCard", "dashboard accountability card");
assertIncludes(client, '<AccountabilityDashboardCard', "dashboard renders accountability card");
assertIncludes(client, "PersonAccountabilitySummaryCard", "person overview accountability summary");
// USA-168 consolidated the Person's six tabs into Overview / Timeline /
// Details, so there is no standalone Commitments tab any more. The capability
// must survive the consolidation: active accountability appears in Overview's
// RIGHT NOW with a Check in action, and the deeper management sheets below are
// still reachable.
assertIncludes(client, "accountabilityTopics.map", "person overview lists active accountability");
assertIncludes(client, "onClick={topic.onCheckIn}", "person overview offers an accountability check-in");
assertIncludes(client, 'kind: "check_in"', "accountability check-ins appear in the Person timeline");
assertIncludes(client, "CommitmentsPanel", "person commitments panel");
assertIncludes(client, "CommitmentFormSheet", "commitment creation sheet");
assertIncludes(client, "CommitmentUpdateSheet", "progress update sheet");
assertIncludes(client, "LogCheckInSheet", "accountability logging sheet");
assertIncludes(client, 'type="submit"', "commitment sheets use native form submission");
assertIncludes(client, "new FormData(event.currentTarget)", "commitment handlers read one submitted form");
// The six-across tab grid this guarded no longer exists: USA-168 reduced the
// Person to three destinations, which fit on a phone without a wrapping grid.
assertIncludes(client, 'grid grid-cols-3', "profile tab strip stays a mobile-safe three-across grid");
assertIncludes(client, 'label: "Overview", value: "overview"', "Person keeps three destinations");
assertIncludes(client, 'label: "Timeline", value: "history"', "Person keeps three destinations");
assertIncludes(client, 'label: "Details", value: "details"', "Person keeps three destinations");
assertIncludes(client, "setCommitmentStatus(commitment, \"completed\")", "complete quick action");
assertIncludes(client, "commitment.status === \"paused\" ? \"active\" : \"paused\"", "pause/reactivate quick action");
assertIncludes(client, "function accountabilityCheckInDurationMinutes", "client normalizes check-in duration for aggregation");
assertIncludes(client, "data.accountabilityCheckIns.forEach((checkIn) => {", "client includes check-ins in person aggregation");
assertIncludes(client, "addPersonInteractionStats(stats, checkIn.personId, accountabilityCheckInDurationMinutes(checkIn))", "person meeting stats include check-in duration");
assertIncludes(client, "loggedMeetings.length + accountabilityCheckIns.length", "dashboard meeting count includes accountability check-ins");
assertIncludes(client, "accountabilityCheckIns.map((checkIn) => checkIn.personId)", "dashboard people-met count includes check-in people");
// The Growth milestone list was folded into the unified Person Timeline, where
// check-ins are ordinary chronological events carrying their own date and note.
assertIncludes(client, "id: `history-check-in-${checkIn.id}`", "check-ins are Person timeline entries");
assertIncludes(client, "date: checkIn.checkInDate", "check-in timeline entries carry their date");

assertIncludes(loader, "featureFlags: DosAppFeatureFlags", "loader exposes feature flags");
assertIncludes(loader, "commitmentsAccountability", "loader maps commitments feature flag");
assertIncludes(loader, "latestActivityByPersonId.set(commitment.person_id", "commitments affect person activity");
assertIncludes(loader, "accountabilityCheckInCommitments", "loader returns check-in links");
assertIncludes(loader, "meetingsCount: meetings.filter((meeting) => meeting.meetingStatus === \"logged\").length + accountabilityCheckInRows.length", "loader meeting count includes accountability check-ins");
assertIncludes(preview, "commitmentsAccountability: true", "preview enables assignment/accountability UX validation");
assertIncludes(apiHelper, "-[89ab][0-9a-f]{3}-[0-9a-f]{12}", "UUID validation accepts normal UUID group separators");

assertMatches(client, /name="general_update"[\s\S]*required/, "check-in general update is required");
assertMatches(client, /name="progress_note"[\s\S]*required/, "progress note is primary required update field");

console.log("DOS commitments accountability regression checks passed.");
