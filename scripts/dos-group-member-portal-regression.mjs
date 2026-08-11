import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function exists(path) {
  return existsSync(new URL(`../${path}`, import.meta.url));
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

const migration = read("supabase/migrations/20260717143757_dos_public_groups_member_portal_foundation.sql");
const memberAccess = read("src/lib/groups/member-access.ts");
const memberPage = read("app/groups/[slug]/member/page.tsx");
const memberHomeView = read("app/groups/GroupHomeMemberView.tsx");
const memberActions = read("app/groups/[slug]/member/actions.ts");
const memberAccessRoute = read("app/groups/[slug]/member/access/route.ts");
const joinRequestsRoute = read("app/api/dos/app/groups/join-requests/route.ts");
const membersRoute = read("app/api/dos/app/groups/members/route.ts");
const missionaryApp = read("src/lib/dos/missionary-app.ts");
const appClient = read("app/dos/app/DosMvpAppClient.tsx");
const groupJourneyView = read("app/groups/GroupJourneyView.tsx");
const architectureDoc = read("docs/dos-public-groups-member-portal-architecture.md");

for (const table of [
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
  assertIncludes(migration, `revoke all on table public.${table} from anon`, `${table} must revoke anon access.`);
  assertIncludes(migration, `grant select, insert, update, delete on table public.${table} to service_role`, `${table} must be service-route managed.`);
}

assertIncludes(migration, "token_hash text not null", "Access tokens must store hashes.");
assertIncludes(migration, "session_token_hash text not null", "Sessions must store hashes.");
assertNotIncludes(migration, "token text not null", "Migration must not store plaintext member tokens.");
assertIncludes(migration, "dos_group_rsvps_gathering_person_unique", "RSVPs must update per gathering/person instead of duplicating.");
assertIncludes(migration, "response in ('going', 'not_going', 'maybe')", "RSVP responses must be constrained.");
assertIncludes(migration, "visibility in ('public', 'group_members', 'leaders')", "Group updates must have scoped visibility.");
assertIncludes(migration, "notification_type in", "Notification preferences must be typed.");

assert(exists("app/groups/[slug]/member/page.tsx"), "Group Home sign-in bridge must exist.");
assert(exists("app/groups/[slug]/member/access/route.ts"), "Member access claim route must exist.");
assertIncludes(memberAccess, "createHash(\"sha256\")", "Member access helper must hash tokens.");
assertIncludes(memberAccess, "randomBytes", "Member access helper must generate random tokens.");
assertIncludes(memberAccess, "createGroupMemberAccessInvitation", "Member access helper must create invitations.");
assertIncludes(memberAccess, "claimGroupMemberAccessToken", "Member access helper must claim tokens.");
assertIncludes(memberAccess, "loadGroupMemberPortalData", "Member access helper must load portal data through active membership checks.");
assertIncludes(memberAccess, "memberIsActive", "Member portal must require active membership.");
assertIncludes(memberAccess, "groupIsMemberAccessible", "Member portal must require active group/member access.");
assertIncludes(memberAccess, "Boolean(group && group.active !== false", "Member access must not treat missing groups as accessible.");
assertIncludes(memberAccess, ".from(\"public_sites\")", "Member access links must resolve through public_sites when available.");
assertIncludes(memberAccessRoute, "httpOnly: true", "Member session cookie must be httpOnly.");
assertIncludes(memberAccessRoute, "sameSite: \"lax\"", "Member session cookie must be same-site protected.");

assertIncludes(memberPage, "Group Home", "Member sign-in bridge must use Group Home language.");
assertNotIncludes(memberPage, "Member Portal", "Member sign-in bridge must not present a separate portal.");
assertIncludes(memberHomeView, "Next Gathering", "Approved member Group Home must prioritize next gathering.");
assertIncludes(memberHomeView, "Save RSVP", "Approved member Group Home must support RSVP.");
assertIncludes(memberHomeView, "Latest Update", "Approved member Group Home must show the latest update.");
assertIncludes(memberHomeView, "Send Prayer Request", "Approved member Group Home must support prayer submission.");
assertIncludes(memberHomeView, "Keep Me Updated", "Approved member Group Home must use friendly update language.");
assertIncludes(memberHomeView, "Save Updates", "Approved member Group Home must save update preferences.");
assertNotIncludes(memberHomeView, "Notification Preferences", "Approved member Group Home must avoid technical notification preference language.");
assertIncludes(memberActions, ".from(\"dos_group_rsvps\")", "Member RSVP action must use dos_group_rsvps.");
assertIncludes(memberActions, ".upsert(", "RSVP/preferences actions must update existing records.");
assertIncludes(memberActions, ".from(\"prayer_requests\")", "Member prayer must reuse prayer_requests.");
assertIncludes(memberActions, "visibility: \"group_leaders\"", "Member prayer must default to leaders-only visibility.");
assertIncludes(memberActions, "requestGroupMemberAccess", "Member portal must provide low-friction access request.");

assertIncludes(joinRequestsRoute, "createGroupMemberAccessInvitation", "Accepting a join request must prepare member access.");
assertIncludes(membersRoute, "send_member_access", "Leader members API must support resending member access.");
assertIncludes(membersRoute, "loadDosGroupRoleAccess", "Member access resend must remain leader-authorized.");
assertIncludes(missionaryApp, "memberAccess", "DOS payload must expose compact member access summary.");
assertIncludes(appClient, "Portal Link", "Leader UI must expose a compact member access control.");
assertIncludes(appClient, "groupMemberPortalStatusLabel", "Leader UI must display member portal status separately from membership status.");
assertNotIncludes(appClient, "Not Invited", "Leader UI must not conflate participant portal state with group membership language.");

assertIncludes(groupJourneyView, "function groupJourneySessionChapterRange", "Member Journey view must expose compact chapter ranges such as Ch. 2-3.");
assertIncludes(groupJourneyView, "function groupJourneySessionSelectorTitle", "Member Journey view must show compact chapter titles in the custom selector.");
assertIncludes(groupJourneyView, "function groupJourneyChapterHeading", "Member Journey view must render chapter number before chapter title.");
assertIncludes(groupJourneyView, "isSessionSelectorOpen", "Member Journey view must use one custom week/day selector.");
assertIncludes(groupJourneyView, "Choose ${unitLabelLower}", "Member Journey selector must be an accessible custom control.");
assertIncludes(groupJourneyView, "Completed", "Member Journey selector must expose completed state.");
assertIncludes(groupJourneyView, "Current", "Member Journey selector must expose current state.");
assertIncludes(groupJourneyView, "Upcoming", "Member Journey selector must expose upcoming state.");
assertIncludes(groupJourneyView, "groupJourneyChapterHeading(chapter)", "Member Journey detail panel must use chapter-number-first headings.");
assertIncludes(groupJourneyView, ">Question<", "Member Journey detail panel must show the simplified chapter question label.");
assertIncludes(groupJourneyView, ">Scripture<", "Member Journey detail panel must show Scripture after the question.");
assertIncludes(groupJourneyView, "What stood out?", "Member Journey view must preserve the canonical first weekly reflection prompt.");
assertIncludes(groupJourneyView, "What stood out to you as you considered this question and chapter?", "Member Journey single-chapter reflection helper must connect to the chapter question.");
assertIncludes(groupJourneyView, "Looking across both chapters and questions, what stood out most?", "Member Journey two-chapter reflection helper must connect to both questions.");
assertIncludes(groupJourneyView, "What will you do with it?", "Member Journey view must preserve the canonical second weekly reflection prompt.");
assertIncludes(groupJourneyView, "What is one response or next step you want to take this week?", "Member Journey two-chapter action helper must stay weekly.");
assertIncludes(groupJourneyView, "Prayer", "Member Journey view must preserve the canonical prayer reflection prompt.");
assertIncludes(groupJourneyView, "Your Journey", "Member Journey progress area must use the Journey hierarchy label.");
assert(groupJourneyView.indexOf("chapter.chapterQuestion") < groupJourneyView.indexOf("chapter.keyScriptures?.length"), "Member Journey Scripture must render after each chapter-specific question.");
assert(!/<select\b/i.test(groupJourneyView), "Member Journey selector must not use a native select/dropdown.");
assertNotIncludes(groupJourneyView, "Chapter Question", "Member Journey view must not keep the old Chapter Question card label.");
assertNotIncludes(groupJourneyView, "Search the Scriptures", "Member Journey view must not keep the old Search the Scriptures card label.");
assertNotIncludes(groupJourneyView, "Optional Leader Notes", "Member Journey open-week UI must not show Optional Leader Notes.");
assertNotIncludes(groupJourneyView, "eyebrow=\"Multiply\"", "Member Journey open-week UI must not show the extra Multiply card.");

assertIncludes(architectureDoc, "Plain tokens are never stored", "Architecture doc must document token storage safety.");
assertIncludes(architectureDoc, "Lightweight members do not receive a DOS workspace", "Architecture doc must preserve product boundary.");

console.log("dos-group-member-portal-regression: all checks passed.");
