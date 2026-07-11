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

const quickActionsMatch = client.match(/const quickActionItems:[\s\S]*?\];/);

if (!quickActionsMatch) {
  throw new Error("dashboard quick actions not found");
}

assertIncludes(quickActionsMatch[0], 'label: "Commitment"', "dashboard quick action replaced with Commitment");

if (quickActionsMatch[0].includes("Pray Now")) {
  throw new Error("dashboard quick actions still include Pray Now");
}

assertIncludes(client, "AccountabilityDashboardCard", "dashboard accountability card");
assertIncludes(client, "PersonAccountabilitySummaryCard", "person overview accountability summary");
assertIncludes(client, 'activeDetailTab === "commitments"', "person commitments tab");
assertIncludes(client, "CommitmentsPanel", "person commitments panel");
assertIncludes(client, "CommitmentFormSheet", "commitment creation sheet");
assertIncludes(client, "CommitmentUpdateSheet", "progress update sheet");
assertIncludes(client, "LogCheckInSheet", "accountability logging sheet");
assertIncludes(client, 'const buttonType = type === "submit" ? "button" : type', "AppButton manually handles submit clicks");
assertIncludes(client, "form.requestSubmit()", "AppButton submit clicks request form submission");
assertIncludes(client, "grid-cols-3 sm:grid-cols-6", "mobile-safe profile tab grid");
assertIncludes(client, "setCommitmentStatus(commitment, \"completed\")", "complete quick action");
assertIncludes(client, "commitment.status === \"paused\" ? \"active\" : \"paused\"", "pause/reactivate quick action");

assertIncludes(loader, "featureFlags: DosAppFeatureFlags", "loader exposes feature flags");
assertIncludes(loader, "commitmentsAccountability", "loader maps commitments feature flag");
assertIncludes(loader, "latestActivityByPersonId.set(commitment.person_id", "commitments affect person activity");
assertIncludes(loader, "accountabilityCheckInCommitments", "loader returns check-in links");
assertIncludes(preview, "commitmentsAccountability: false", "preview keeps feature disabled");

assertMatches(client, /name="general_update"[\s\S]*required/, "check-in general update is required");
assertMatches(client, /name="progress_note"[\s\S]*required/, "progress note is primary required update field");

console.log("DOS commitments accountability regression checks passed.");
