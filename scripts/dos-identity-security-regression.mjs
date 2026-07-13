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

function assertBefore(source, first, second, message) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);

  assert(firstIndex >= 0 && secondIndex >= 0 && firstIndex < secondIndex, message);
}

const groupsMigration = read("supabase/migrations/20260712235050_dos_groups_simplification_shared_leadership.sql");
const identityMigration = read("supabase/migrations/20260713022111_dos_identity_shared_leadership.sql");
const identityResolver = read("src/lib/dos/identity.ts");
const dosWorkspaceRoute = read("app/dos/[collectiveSlug]/page.tsx");
const groupMembersRoute = read("app/api/dos/app/groups/members/route.ts");
const groupSettingsRoute = read("app/api/dos/app/groups/settings/route.ts");
const groupJoinRequestsRoute = read("app/api/dos/app/groups/join-requests/route.ts");
const groupPendingRequestsRoute = read("app/api/dos/app/groups/pending-requests/route.ts");
const peopleRoute = read("app/api/dos/app/people/route.ts");
const meetingsRoute = read("app/api/dos/app/meetings/route.ts");
const myRecordRoute = read("app/api/dos/app/my-record/route.ts");
const prayerRequestsRoute = read("app/api/dos/app/prayer-requests/route.ts");
const prayerPartnersRoute = read("app/api/dos/app/prayer-partners/route.ts");
const publicGroupsDirectory = read("app/groups/page.tsx");
const publicGroupPage = read("app/groups/[slug]/page.tsx");
const publicGroupTemplate = read("app/groups/PublicGroupPageTemplate.tsx");

const publicGroupSurface = `${publicGroupsDirectory}\n${publicGroupPage}\n${publicGroupTemplate}`;
const allMigrations = `${groupsMigration}\n${identityMigration}`;
const leaderOnlyRoutes = [groupMembersRoute, groupSettingsRoute, groupJoinRequestsRoute];

assertIncludes(identityMigration, "create schema if not exists private_dos", "Identity authorization helpers must live in a non-exposed schema.");
assertIncludes(identityMigration, "revoke all on schema private_dos from public", "The private DOS schema must revoke public schema usage.");
assertIncludes(identityMigration, "grant usage on schema private_dos to authenticated", "Authenticated users need only explicit private helper execution for RLS policies.");
assertIncludes(identityMigration, "security definer\nset search_path = ''", "Security definer helpers must use an explicit empty search_path.");
assert(
  !/create or replace function public\.(current_dos_identity_person_ids|can_view_dos_group|can_manage_dos_group)[\s\S]*?security definer/i.test(allMigrations),
  "Security definer identity/group helpers must not be created in the exposed public schema.",
);
assertNotIncludes(groupsMigration, "create or replace function public.can_manage_dos_group", "Groups schema migration must not add broad public group management helpers.");

assertIncludes(identityMigration, "create table if not exists public.dos_identity_links", "Identity links table must exist.");
assertIncludes(identityMigration, "alter table public.dos_identity_links enable row level security", "Identity links must have RLS enabled.");
assertIncludes(identityMigration, "revoke all on table public.dos_identity_links from anon", "Anonymous users must have no identity link access.");
assertIncludes(identityMigration, "revoke all on table public.dos_identity_links from authenticated", "Authenticated identity link privileges must start from no access.");
assertIncludes(identityMigration, "grant select on table public.dos_identity_links to authenticated", "Authenticated users may read identity links only through RLS.");
assertNotIncludes(identityMigration, "grant select, insert, update, delete on table public.dos_identity_links to authenticated", "Authenticated users must not have broad identity link write grants.");
assertIncludes(identityMigration, "public.is_dos_admin(array['admin', 'editor'])", "Only DOS admins/editors may manage identity links through RLS.");
assertIncludes(identityMigration, "dos_identity_links_verified_user_workspace_unique", "A user must not silently accumulate multiple verified identities in one workspace.");
assertIncludes(identityMigration, "dos_identity_links_verified_person_unique", "A Field person must not silently link to multiple authenticated users.");
assertIncludes(identityMigration, "verification_status in ('candidate', 'ambiguous', 'verified', 'rejected', 'revoked', 'inactive')", "Revoked and inactive identity states must be representable.");
assertIncludes(identityMigration, "identity_links.verification_status = 'verified'", "Only verified identity links can authorize shared access.");
assertNotIncludes(identityMigration, "identity_links.verification_status <> 'rejected'", "Authorization must not treat all non-rejected identity links as active.");
assertNotIncludes(identityMigration, "identity_links.verification_status <> 'revoked'", "Revoked links must not be authorized through negative status checks.");

assertIncludes(identityResolver, "onlyNameMatches", "Name-only identity matches must be recognized separately.");
assertIncludes(identityResolver, "contact verification is required", "Name-only identity matches must fail closed until verified.");
assertIncludes(identityResolver, "recordAmbiguousIdentityCandidates", "Ambiguous identity candidates must be preserved for review.");
assertBefore(
  identityResolver,
  "if (matches.length > 1 || onlyNameMatches)",
  "if (matches.length === 1)",
  "Ambiguous and name-only matches must be handled before automatic verification.",
);
assertIncludes(identityResolver, ".eq(\"verification_status\", \"verified\")", "Server identity loading must only use verified links.");
assertIncludes(identityResolver, "status: identity.status === \"ambiguous\" ? \"forbidden\" : \"configuration_error\"", "Ambiguous identities must fail closed as forbidden group access.");

assertIncludes(identityMigration, "members.status = 'active'", "Removed or archived group memberships must not authorize through RLS.");
assertIncludes(identityMigration, "members.role = any(allowed_roles)", "Group RLS must derive permissions from active role membership.");
assertIncludes(identityMigration, "groups.active is not false", "Inactive groups must not authorize shared access.");
assertIncludes(identityResolver, ".eq(\"status\", \"active\")", "Server group authorization must require active membership.");
assertIncludes(identityResolver, ".in(\"role\", input.allowedRoles)", "Server group authorization must require an allowed role.");
assertIncludes(groupMembersRoute, "status: \"removed\"", "Removing a leader/co-leader must immediately deactivate membership instead of leaving an active role.");
assertIncludes(groupMembersRoute, "Change the group leader before removing this member.", "The primary leader cannot be removed without an intentional leader change.");

for (const route of leaderOnlyRoutes) {
  assertIncludes(route, "loadDosGroupRoleAccess", "Group write APIs must authorize through canonical identity plus group role.");
  assertIncludes(route, "allowedRoles: [\"leader\", \"co_leader\"]", "Leader-only APIs must reject helper/member/guest writes.");
}
assertIncludes(groupPendingRequestsRoute, "resolveDosIdentityForWorkspace", "Pending request counts must resolve authenticated identity before honoring leadership.");
assertNotIncludes(groupPendingRequestsRoute, "requireDosWorkspaceRouteAccess", "Pending request counts must not require or imply broad workspace access for co-leaders.");

assertBefore(groupMembersRoute, "const groupAccess = await loadDosGroupRoleAccess", "const existingPersonResult = await resolveExistingPerson", "Forged person_id must not be processed before group authorization.");
assertBefore(groupSettingsRoute, "const groupAccess = await loadDosGroupRoleAccess", "const existingGroupSelect", "Forged workspace/group ids must not reach settings writes before group authorization.");
assertBefore(groupJoinRequestsRoute, "const accessResult = await requireGroupRequestAccess", "const requestResult = await supabase", "Join request actions must authorize before loading or mutating requests.");
assertIncludes(groupMembersRoute, ".or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)", "Selected members must be constrained to the authorized group workspace.");
assertIncludes(groupJoinRequestsRoute, ".eq(\"workspace_id\", workspaceId)", "Join requests must be constrained to the authorized group workspace.");
assertIncludes(groupSettingsRoute, ".eq(\"workspace_id\", workspaceId)", "Group settings must be constrained to the authorized workspace.");

assertNotIncludes(dosWorkspaceRoute, "return {\n    ...data,", "Shared group route must not spread the full private DOS payload.");
for (const privateReset of [
  "accountabilityCheckInCommitments: []",
  "accountabilityCheckIns: []",
  "accountabilitySchedules: []",
  "assessmentResults: []",
  "commitments: []",
  "externalCalendarEvents: []",
  "fruit: []",
  "fruitEvents: []",
  "householdMembers: []",
  "leaderReflections: []",
  "meetings: []",
  "myRecord: emptySharedGroupMyRecord(data.workspace.id)",
  "organizations: []",
  "participantReviews: []",
  "participantTestimonies: []",
  "prayerLogs: []",
  "prayerPartners: []",
  "reminders: []",
  "tableInvitations: []",
  "usamApplication: emptySharedGroupUsamApplication(data.usamApplication)",
]) {
  assertIncludes(dosWorkspaceRoute, privateReset, `Shared group route must clear private payload field: ${privateReset}`);
}
assertIncludes(dosWorkspaceRoute, "group.prayerRequests.filter(isSharedGroupPrayerRequest)", "Shared group route must expose only shareable group prayer requests.");
assertIncludes(dosWorkspaceRoute, ".filter((person) => sharedPersonIds.has(person.id))", "Shared group route must expose only people tied to the shared group.");
assertIncludes(dosWorkspaceRoute, "notes: null", "Shared group people must not include private notes.");
assertIncludes(dosWorkspaceRoute, "householdNotes: null", "Shared group people must not include household notes.");

for (const privateRoute of [peopleRoute, meetingsRoute, myRecordRoute, prayerRequestsRoute, prayerPartnersRoute]) {
  assertIncludes(privateRoute, "requireDosWorkspaceRouteAccess", "Private DOS APIs must require full workspace access, not shared group membership.");
}

for (const forbiddenPublicTerm of [
  "dos_identity_links",
  "private_dos",
  "dos_group_members",
  "dos_group_attendance",
  "prayer_requests",
  "workspace_id",
  "person_id",
]) {
  assertNotIncludes(publicGroupSurface, forbiddenPublicTerm, `Public group routes must not expose ${forbiddenPublicTerm}.`);
}

console.log("dos-identity-security-regression: all checks passed.");
