import { readFileSync } from "node:fs";
import { dosGroupHomeReadinessFixtures as fixtures } from "./dos-group-home-readiness-fixtures.mjs";

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

function assertMatches(source, pattern, message) {
  assert(pattern.test(source), message);
}

function assertNotMatches(source, pattern, message) {
  assert(!pattern.test(source), message);
}

function assertBefore(source, first, second, message) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);

  assert(firstIndex >= 0 && secondIndex >= 0 && firstIndex < secondIndex, message);
}

const migration = read("supabase/migrations/20260717143757_dos_public_groups_member_portal_foundation.sql");
const prayerMigration = read("supabase/migrations/20260707132434_dos_unified_prayer_context.sql");
const packageJson = read("package.json");
const publicDirectory = read("app/groups/page.tsx");
const publicPage = read("app/groups/[slug]/page.tsx");
const publicTemplate = read("app/groups/PublicGroupPageTemplate.tsx");
const publicActions = read("app/groups/actions.ts");
const publicGroupLoader = read("src/lib/public-groups.ts");
const memberAccess = read("src/lib/groups/member-access.ts");
const memberActions = read("app/groups/[slug]/member/actions.ts");
const memberAccessRoute = read("app/groups/[slug]/member/access/route.ts");
const memberSignInPage = read("app/groups/[slug]/member/page.tsx");
const memberHomeView = read("app/groups/GroupHomeMemberView.tsx");
const groupHomeAccess = read("src/lib/groups/group-home-access.ts");
const routeBuilder = read("src/lib/groups/route-builder.ts");
const appClient = read("app/dos/app/DosMvpAppClient.tsx");
const architectureDoc = read("docs/dos-public-groups-member-portal-architecture.md");

const publicSurface = `${publicDirectory}\n${publicPage}\n${publicTemplate}\n${publicGroupLoader}`;
const memberSurface = `${memberAccess}\n${memberActions}\n${memberAccessRoute}\n${memberSignInPage}\n${memberHomeView}`;

for (const table of [
  "public_sites",
  "dos_group_member_identities",
  "dos_group_member_access_tokens",
  "dos_group_member_sessions",
  "dos_group_rsvps",
  "dos_group_updates",
  "dos_group_member_notification_preferences",
  "dos_group_notification_deliveries",
]) {
  assertIncludes(migration, `create table if not exists public.${table}`, `Migration must create ${table}.`);
  assertIncludes(migration, `alter table public.${table} enable row level security`, `${table} must have RLS enabled.`);
}

for (const memberTable of [
  "dos_group_member_identities",
  "dos_group_member_access_tokens",
  "dos_group_member_sessions",
  "dos_group_rsvps",
  "dos_group_updates",
  "dos_group_member_notification_preferences",
  "dos_group_notification_deliveries",
]) {
  assertIncludes(migration, `revoke all on table public.${memberTable} from anon`, `${memberTable} must revoke anon access.`);
  assertIncludes(migration, `revoke all on table public.${memberTable} from authenticated`, `${memberTable} must revoke authenticated direct access.`);
  assertIncludes(migration, `grant select, insert, update, delete on table public.${memberTable} to service_role`, `${memberTable} must stay service-role managed.`);
}

for (const requiredIndex of [
  "public_sites_hostname_base_path_unique",
  "public_sites_default_organization_unique",
  "dos_groups_public_site_slug_unique",
  "dos_group_member_access_tokens_hash_unique",
  "dos_group_member_sessions_hash_unique",
  "dos_group_rsvps_gathering_person_unique",
  "dos_group_member_notification_preferences_unique",
  "dos_group_notification_deliveries_dedupe_unique",
]) {
  assertIncludes(migration, requiredIndex, `Migration must define ${requiredIndex}.`);
}

assertIncludes(migration, "grant select on table public.public_sites to anon", "Only active public site metadata should be public-readable.");
assertIncludes(migration, "using (status = 'active')", "Public site RLS must expose active sites only.");
assertIncludes(migration, "on conflict do nothing", "USA public-site seed must avoid duplicate records.");
assertIncludes(migration, "where lower(hostname) = 'usamissionaries.org'", "USA public-site seed must resolve by canonical hostname.");
assertIncludes(migration, "public_status = case", "Existing active USA group URLs must be preserved intentionally.");
assertIncludes(migration, "status in ('active', 'used', 'revoked', 'expired')", "Token lifecycle states must include used, revoked, and expired.");
assertIncludes(migration, "where revoked_at is null", "Session index must support active-session revocation checks.");
assertNotMatches(migration, /\bsecurity\s+(definer|invoker)\b/i, "This migration must not add new SECURITY DEFINER/INVOKER functions.");
assertNotMatches(migration, /\bcreate\s+(or\s+replace\s+)?view\b/i, "This migration must not add exposed views.");
assertNotMatches(migration, /\bdrop\s+table\b/i, "Migration must not drop tables.");
assertNotMatches(migration, /\btruncate\b/i, "Migration must not truncate data.");
assertNotMatches(migration, /\bdelete\s+from\s+public\./i, "Migration must not destructively delete public data.");
assertNotIncludes(migration, "dos_group_routes", "Route placeholder must not add route tables.");
assertNotIncludes(migration, "route_id", "Route placeholder must not add gathering route foreign keys.");
assertIncludes(prayerMigration, "add column if not exists group_id uuid references public.dos_groups", "Unified prayer context must add group_id before Group Home prayer can ship.");
assertBefore(
  prayerMigration,
  "add constraint prayer_requests_visibility_check",
  "update public.prayer_requests",
  "Unified prayer context must widen visibility constraints before normalizing existing public prayer rows.",
);

assertIncludes(publicPage, "accepting_members", "Public group page must load accepting_members.");
assertIncludes(publicPage, "acceptingRequests: group.accepting_members !== false", "Public group model must expose closed-group state.");
assertIncludes(publicTemplate, "group.acceptingRequests ? <JoinRequestPanel", "Closed groups must not render the join request form.");
assertIncludes(publicTemplate, "JoinClosedPanel", "Closed groups need a concise public state.");
assertIncludes(publicActions, "group.accepting_members === false", "Forged join submissions must fail when a group is not accepting members.");
assertNotIncludes(publicPage, "nextGathering?.location ??", "Public group detail must not fall back to exact gathering location.");
assertNotIncludes(publicDirectory, "location: nextGathering?.location", "Public directory must not expose exact gathering location.");
assertNotIncludes(publicGroupLoader, "nextGathering?.location", "Legacy public group loader must not expose exact gathering location.");

for (const forbiddenPublicTerm of [
  "dos_group_member_identities",
  "dos_group_member_sessions",
  "dos_group_attendance",
  "dos_identity_links",
  "prayer_requests",
  "workspace_id",
  "person_id",
  "sessionId",
  "Save RSVP",
  "Keep Me Updated",
  "Latest Update",
]) {
  assertNotIncludes(publicSurface, forbiddenPublicTerm, `Unauthenticated public surfaces must not expose ${forbiddenPublicTerm}.`);
}

assertIncludes(memberAccess, "createHash(\"sha256\")", "Tokens and sessions must be hashed.");
assertIncludes(memberAccess, "randomBytes", "Tokens and sessions must be generated from random bytes.");
assertIncludes(memberAccess, ".eq(\"token_hash\", tokenHash(cleanedToken))", "Token claim must look up only hashed tokens.");
assertIncludes(memberAccess, "accessToken.status !== \"active\" || isExpired(accessToken.expires_at)", "Expired or non-active tokens must fail closed.");
assertIncludes(memberAccess, ".update({ revoked_at: updateTime })", "Claiming a new token must revoke existing active sessions.");
assertIncludes(memberAccess, ".eq(\"member_identity_id\", identity.id)", "Session revocation must be scoped to the member identity.");
assertIncludes(memberAccess, ".eq(\"group_id\", identity.group_id)", "Session revocation must be scoped to the group.");
assertIncludes(memberAccess, ".is(\"revoked_at\", null)", "Only active sessions should be revoked during claim.");
assertBefore(memberAccess, "const sessionRevocationResult", "const sessionResult = await supabase", "Existing active sessions must be revoked before creating a new session.");
assertIncludes(memberAccess, "accessToken.status !== \"active\"", "Used or revoked tokens must not be replayed.");
assertIncludes(memberAccess, "status: \"used\"", "Claimed access tokens must be marked used.");
assertIncludes(memberAccess, "!session || session.revoked_at || isExpired(session.expires_at)", "Revoked and expired sessions must fail closed.");
assertIncludes(memberAccess, ".eq(\"slug\", input.slug)", "Member session loads must be bound to the requested group slug.");
assertIncludes(memberAccess, "!identity || identity.status !== \"verified\" || !memberIsActive(member) || !groupIsMemberAccessible(group)", "Member access must recheck active identity, membership, and group state.");
assertIncludes(memberAccess, ".eq(\"person_id\", session.person_id)", "Member loader must scope attendance and RSVP reads to the session person.");
assertIncludes(memberAccess, ".eq(\"member_identity_id\", identity.id)", "Preference reads must be scoped to the current identity.");
assertIncludes(memberAccess, ".eq(\"visibility\", \"group_members\")", "Member prayer must be group-member visible only.");
assertIncludes(memberActions, ".eq(\"group_id\", session.groupId)", "RSVP writes must be scoped to the authenticated member group.");
assertIncludes(memberActions, ".eq(\"person_id\", session.personId)", "Member writes must be scoped to the authenticated person.");
assertIncludes(memberActions, ".upsert(", "RSVP and preference writes must update existing records.");
assertIncludes(memberActions, "onConflict: \"gathering_id,person_id\"", "RSVP duplicate prevention must be enforced by response shape.");
assertIncludes(memberActions, "onConflict: \"member_identity_id,group_id,channel,notification_type\"", "Preference duplicate prevention must be enforced by response shape.");
assertIncludes(memberActions, "visibility: \"group_leaders\"", "Member-submitted prayer must default to leader-only visibility.");
assertIncludes(memberActions, "redirectToSignIn(slug, \"access-requested\")", "Access requests must avoid email-membership enumeration.");
assertIncludes(memberActions, "path: \"/groups\"", "Sign-out cookie clearing must match the session cookie path.");
assertIncludes(memberActions, "maxAge: 0", "Sign-out must expire the member session cookie.");
assertIncludes(memberAccessRoute, "httpOnly: true", "Member session cookie must be HTTP-only.");
assertIncludes(memberAccessRoute, "sameSite: \"lax\"", "Member session cookie must be same-site protected.");
assertIncludes(memberAccessRoute, "secure: process.env.NODE_ENV === \"production\"", "Member session cookie must be secure in production.");
assertNotMatches(memberSurface, /console\.(?:log|warn|error)\([^)]*token/i, "Raw access tokens must not be logged.");

for (const stateChangingAction of [
  "submitMemberRsvp",
  "submitMemberPrayerRequest",
  "updateMemberNotificationPreferences",
]) {
  const actionIndex = memberActions.indexOf(`export async function ${stateChangingAction}`);
  const requireIndex = memberActions.indexOf("const portalResult = await requireMemberPortal", actionIndex);
  assert(actionIndex >= 0 && requireIndex > actionIndex, `${stateChangingAction} must require an active member session.`);
}

assertIncludes(groupHomeAccess, "allowedRoles: [\"leader\", \"co_leader\"]", "Management helper must remain leader/co-leader only.");
assertNotIncludes(publicPage, "loadManageHrefForGroup(group.id)", "Public Group Home must not resolve leader management access.");
assertNotIncludes(publicPage, "loadManageGroupHref", "Public Group Home must not import management-link access.");
assertNotIncludes(publicTemplate, "Manage in DOS", "Public Group Home must not render a DOS management action.");
assertNotIncludes(memberHomeView, "Manage in DOS", "Member Group Home must not render a DOS management action.");
assertIncludes(publicPage, "groupDisplayTimeZone", "Public Group Home must use the shared group display timezone.");
assertIncludes(publicDirectory, "groupDisplayTimeZone", "Public directory must use the shared group display timezone.");
assertIncludes(memberHomeView, "groupDisplayTimeZone", "Member Group Home must use the shared group display timezone.");
assertIncludes(appClient, "const dosDisplayTimeZone = groupDisplayTimeZone", "DOS leader views must use the shared group display timezone.");
assertNotIncludes(publicPage, "nextGatheringTimeFor", "Public Group Home must not invent next-gathering times from rhythm text.");
assertIncludes(appClient, "GroupRouteBuilderPlaceholder", "DOS leader gathering workflow must show the disabled route placeholder.");
assertIncludes(memberHomeView, "Route details will appear here when your leader shares them.", "Member Group Home route placeholder must be non-functional.");
assertIncludes(memberHomeView, "aria-disabled=\"true\"", "Member route placeholder must expose disabled state.");
assertIncludes(appClient, "aria-disabled=\"true\"", "Leader route placeholder must expose disabled state.");

for (const activity of ["running", "walking", "hiking", "cycling", "fitness"]) {
  assertIncludes(routeBuilder, activity, `Route placeholder eligibility must include ${activity}.`);
}

for (const providerTerm of ["maps.googleapis", "google.maps", "@googlemaps", "mapbox", "leaflet", "MAPBOX", "GOOGLE_MAPS"]) {
  assertNotIncludes(packageJson, providerTerm, `No map provider dependency or env should be added: ${providerTerm}.`);
  assertNotIncludes(routeBuilder, providerTerm, `Route placeholder must stay provider-free: ${providerTerm}.`);
  assertNotIncludes(memberHomeView, providerTerm, `Member Group Home must stay provider-free: ${providerTerm}.`);
  assertNotIncludes(appClient, providerTerm, `Leader placeholder must stay provider-free: ${providerTerm}.`);
}

assertNotIncludes(memberHomeView, "\"use client\"", "Group Home view should remain server-rendered to reduce hydration risk.");
assertNotMatches(memberHomeView, /\b(Date\.now|Math\.random|window\.|document\.|localStorage)\b/, "Group Home view must avoid browser-only or random render state.");
assertNotMatches(publicTemplate, /\b(Date\.now|Math\.random|window\.|document\.|localStorage)\b/, "Public template must avoid browser-only or random render state.");

for (const docNeedle of [
  "Group Home Member Model",
  "Public Authentication Patterns",
  "Authorization Matrix",
  "Deferred Route Builder",
  "RSVP does not count as leader-confirmed attendance",
  "Public visitors never receive more than public-safe location text",
  "SMS remains disabled",
]) {
  assertIncludes(architectureDoc, docNeedle, `Architecture doc must cover: ${docNeedle}.`);
}

for (const [key, site] of Object.entries(fixtures.publicSites)) {
  assert(site.hostname && site.basePath === "/groups", `Fixture public site ${key} must include a /groups base path.`);
}

for (const key of [
  "tuesdayMensGroup",
  "twoThreeTwoRunning",
  "twoThreeTwoWalking",
  "secondOrganizationSameSlug",
  "noNextGathering",
  "noMembers",
  "noUpdatesPrayerResources",
  "closedGroup",
  "privateGroup",
  "archivedGroup",
]) {
  assert(fixtures.groups[key], `Readiness fixtures must include group state: ${key}.`);
}

for (const key of [
  "ryanLeader",
  "brandonCoLeader",
  "justinLightweightMember",
  "unrelatedAuthenticatedUser",
  "removedMember",
  "expiredSessionMember",
  "revokedTokenMember",
  "otherGroupMember",
  "otherOrganizationMember",
]) {
  const person = fixtures.people[key];

  assert(person, `Readiness fixtures must include identity state: ${key}.`);
  assert(person.email.endsWith("@example.test"), `Fixture identity ${key} must use safe test contact data.`);
}

assert(fixtures.groups.secondOrganizationSameSlug.slug === fixtures.groups.twoThreeTwoRunning.slug, "Fixtures must cover the same slug across two public sites.");
assert(fixtures.groups.closedGroup.acceptingRequests === false, "Fixtures must cover a group not accepting members.");
assert(fixtures.gatherings.canceled.status === "canceled", "Fixtures must cover a canceled gathering.");
assert(new Date(fixtures.gatherings.past.startsAt).getTime() < Date.parse("2026-07-17T00:00:00.000Z"), "Fixtures must cover a past gathering.");
assert(fixtures.notificationStates.smsUnavailable.providerConfigured === false, "Fixtures must cover unavailable SMS.");

console.log("dos-group-home-readiness-regression: all checks passed.");
