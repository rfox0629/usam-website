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
const demoMemberAccess = read("src/lib/groups/demo-member-access.ts");
const memberPage = read("app/groups/[slug]/member/page.tsx");
const publicGroupPage = read("app/groups/[slug]/page.tsx");
const memberHomeView = read("app/groups/GroupHomeMemberView.tsx");
const memberInstallPrompt = read("app/groups/MemberHomeInstallPrompt.tsx");
const memberActions = read("app/groups/[slug]/member/actions.ts");
const memberAccessPage = read("app/groups/[slug]/member/access/page.tsx");
const memberJourneyPage = read("app/groups/[slug]/journey/page.tsx");
const memberManifestRoute = read("app/groups/[slug]/manifest.webmanifest/route.ts");
const groupLayout = read("app/groups/[slug]/layout.tsx");
const joinRequestsRoute = read("app/api/dos/app/groups/join-requests/route.ts");
const membersRoute = read("app/api/dos/app/groups/members/route.ts");
const missionaryApp = read("src/lib/dos/missionary-app.ts");
const appClient = read("app/dos/app/DosMvpAppClient.tsx");
const previewPanel = read("app/dos/app/MemberGroupHomePreview.tsx");
const preview = read("app/dos/app/preview/page.tsx");
const groupJourneyView = read("app/groups/GroupJourneyView.tsx");
const sharedJourneyUi = read("src/components/dos/GuidedJourneyUi.tsx");
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
// USA-170: the claim surface is a page with an explicit POST, not a GET route
// handler. A GET handler here is what let iMessage's unfurler redeem the token.
assert(exists("app/groups/[slug]/member/access/page.tsx"), "Member access claim page must exist.");
assert(!exists("app/groups/[slug]/member/access/route.ts"), "Member access must not redeem from a GET route handler.");
assert(exists("app/groups/[slug]/manifest.webmanifest/route.ts"), "Group member PWA manifest route must exist.");
assert(exists("app/groups/[slug]/layout.tsx"), "Group routes must attach member-home manifest metadata.");
assertIncludes(memberAccess, "createHash(\"sha256\")", "Member access helper must hash tokens.");
assertIncludes(memberAccess, "randomBytes", "Member access helper must generate random tokens.");
assertIncludes(memberAccess, "createGroupMemberAccessInvitation", "Member access helper must create invitations.");
assertIncludes(memberAccess, "claimGroupMemberAccessToken", "Member access helper must claim tokens.");
assertIncludes(memberAccess, "loadGroupMemberPortalData", "Member access helper must load portal data through active membership checks.");
assertIncludes(memberAccess, "claimDemoGroupMemberAccessToken", "Demo-safe preview access must reuse the member access claim boundary.");
assertIncludes(memberAccess, "loadDemoGroupMemberPortalData", "Demo-safe preview access must load the same scoped member home shape.");
assertIncludes(memberAccess, "process.env.NODE_ENV !== \"production\" || process.env.VERCEL_ENV === \"preview\"", "Demo-safe member access must remain disabled in production.");
assertIncludes(demoMemberAccess, "demoGroupMemberAccessTokenPrefix", "Demo-safe invitations must use an explicit scoped token prefix.");
assertIncludes(demoMemberAccess, "demoGroupMemberSessionTokenPrefix", "Demo-safe member sessions must use an explicit scoped session prefix.");
assertIncludes(memberAccess, "name: person.name ?? \"Group member\"", "Member home data must include the scoped participant name.");
assertIncludes(memberAccess, "memberIsActive", "Member portal must require active membership.");
assertIncludes(memberAccess, "groupIsMemberAccessible", "Member portal must require active group/member access.");
assertIncludes(memberAccess, "Boolean(group && group.active !== false", "Member access must not treat missing groups as accessible.");
assertIncludes(memberAccess, ".from(\"public_sites\")", "Member access links must resolve through public_sites when available.");
assertIncludes(memberActions, "httpOnly: true", "Member session cookie must be httpOnly.");
assertIncludes(memberActions, "sameSite: \"lax\"", "Member session cookie must be same-site protected.");
assertIncludes(memberActions, "claimDemoGroupMemberAccessToken", "Redemption must support demo-safe scoped invitations through the canonical action.");
assertIncludes(memberActions, "access-invalid", "Invalid or missing member access must show a deliberate invalid-access screen.");
// USA-170: redemption is a POST server action, not a GET route handler, and it
// redirects using the token's own Group slug so a public rename cannot strand a
// link that was already sent.
assertIncludes(memberActions, "publicGroupPath(result.groupSlug ?? slug)}?state=signed-in", "Access claim must redirect to stable member home, not a raw journey URL.");
assertIncludes(memberAccessPage, "<form action={openGroupMemberAccess}", "Invitation redemption must require an explicit human POST.");
assertIncludes(memberPage, "loadDemoGroupMemberPortalData", "Member sign-in bridge must recognize demo-safe scoped sessions.");
assertIncludes(publicGroupPage, "loadDemoGroupMemberPortalData", "Stable public group route must prefer an active scoped member session before public-page 404 handling.");
assertIncludes(memberJourneyPage, "loadDemoGroupMemberPortalData", "Member Journey route must recognize demo-safe scoped sessions.");
assertIncludes(groupLayout, "manifest: `${publicGroupPath(slug)}/manifest.webmanifest`", "Group layout must attach a slug-specific manifest.");
assertIncludes(memberManifestRoute, "start_url: startUrl", "Member manifest must start on the stable group member home.");
assertIncludes(memberManifestRoute, "scope: `${startUrl}/`", "Member manifest scope must cover the group member experience.");
assertIncludes(memberManifestRoute, "/favicons/dos/icon-192.png", "Member manifest must reuse DOS icons.");
assertIncludes(memberManifestRoute, "display: \"standalone\"", "Member manifest must open as a standalone app.");

assertIncludes(memberPage, "Group Home", "Member sign-in bridge must use Group Home language.");
assertNotIncludes(memberPage, "Member Portal", "Member sign-in bridge must not present a separate portal.");
assertIncludes(memberHomeView, "Group Home", "Member home must present a stable scoped member home.");
assertIncludes(memberHomeView, "data.group.name", "Member home must lead with the Group identity.");
assertIncludes(memberHomeView, "access-invalid", "Member home must show a clear invalid-access message.");
assertIncludes(memberHomeView, "data.identity.name", "Member home must lead with participant identity.");
assertIncludes(memberHomeView, "Current Journey", "Member home must focus the current Journey.");
assertIncludes(memberHomeView, "Continue", "Member home must expose one obvious Continue action.");
assertIncludes(memberHomeView, "Completed (", "Member home must preserve useful completed Journey history.");
assertIncludes(memberHomeView, "Scoped DOS member access", "Member home must preserve the limited-access boundary in footer copy.");
assertIncludes(memberHomeView, "MemberHomeInstallPrompt", "Member home must show the one-time install prompt after successful entry.");
assertNotIncludes(memberHomeView, "Save RSVP", "Member home must not default to broad group portal RSVP controls.");
assertNotIncludes(memberHomeView, "Send Prayer Request", "Member home must not default to broad group portal prayer controls.");
assertNotIncludes(memberHomeView, "Save Updates", "Member home must not default to broad notification controls.");
assertNotIncludes(memberHomeView, "Notification Preferences", "Approved member Group Home must avoid technical notification preference language.");
assertIncludes(memberInstallPrompt, "Keep DOS on your phone", "Install prompt must use approved launch copy.");
assertIncludes(memberInstallPrompt, "Add it to your Home Screen so you can return each week.", "Install prompt must explain the weekly return value.");
assertIncludes(memberInstallPrompt, "Show Me How", "Install prompt must offer walkthrough.");
assertIncludes(memberInstallPrompt, "Add DOS to your Home Screen", "Install help must collapse to a compact row.");
assertIncludes(memberInstallPrompt, "Maybe Later", "Install prompt must be dismissible.");
assertIncludes(memberInstallPrompt, "display-mode: standalone", "Install prompt must hide in installed standalone mode.");
assertIncludes(memberInstallPrompt, "Open this link in Safari.", "Install prompt must handle iOS in-app browser.");
assertIncludes(memberInstallPrompt, "Safari: tap Share.", "Install prompt must include iPhone/Safari instructions.");
assertIncludes(memberInstallPrompt, "Install app or Add to Home screen", "Install prompt must include Android/Chrome instructions.");
assertIncludes(memberInstallPrompt, "window.localStorage.setItem(storageKey, \"true\")", "Install prompt dismissal must be one-time per identity.");
assertIncludes(memberActions, ".from(\"dos_group_rsvps\")", "Member RSVP action must use dos_group_rsvps.");
assertIncludes(memberActions, ".upsert(", "RSVP/preferences actions must update existing records.");
assertIncludes(memberActions, ".from(\"prayer_requests\")", "Member prayer must reuse prayer_requests.");
assertIncludes(memberActions, "visibility: \"group_leaders\"", "Member prayer must default to leaders-only visibility.");
assertIncludes(memberActions, "requestGroupMemberAccess", "Member portal must provide low-friction access request.");
assertIncludes(memberActions, "loadDemoGroupMemberPortalData", "Demo-safe save/resume must remain scoped to the member session cookie.");

assertIncludes(joinRequestsRoute, "createGroupMemberAccessInvitation", "Accepting a join request must prepare member access.");
assertIncludes(membersRoute, "send_member_access", "Leader members API must support resending member access.");
assertIncludes(membersRoute, "memberAccessUrlForRequest", "Leader member access API must return preview-local working URLs when running on Vercel previews.");
assertIncludes(membersRoute, "loadDosGroupRoleAccess", "Member access resend must remain leader-authorized.");
assertIncludes(memberAccess, "ensureGroupMemberAccessReady", "Member access helpers must expose idempotent scoped access preparation.");
assertIncludes(memberAccess, "member_access_enabled: true", "Copy Link must auto-enable the existing scoped member surface for the target group.");
assertIncludes(memberAccess, "Auto-enabled scoped member access", "Automatic group member-access provisioning must be logged server-side.");
assertIncludes(memberAccess, "status: \"revoked\"", "Invitation regeneration must revoke prior active tokens before minting one canonical active token.");
assertIncludes(missionaryApp, "memberAccess", "DOS payload must expose compact member access summary.");
assertIncludes(appClient, "Portal Link", "Leader UI must expose a compact member access control.");
assertIncludes(appClient, "participantInvitationUrlForCurrentContext", "Leader UI must canonicalize participant invitation URLs in one helper.");
assertIncludes(appClient, "_vercel_share", "Protected Vercel preview share links must be preserved on participant invitations.");
assertIncludes(appClient, "vercelShareTokenForCurrentContext", "Protected Vercel preview share links must survive Vercel's auth redirect before leader copy actions.");
assertIncludes(appClient, "dos:vercel-share-token", "Protected Vercel preview share tokens must persist for subsequent Copy Link actions in the same session.");
assertIncludes(appClient, "buildPreviewParticipantAccessUrl", "Preview assignments must generate a real demo-safe scoped member access URL.");
assertIncludes(appClient, "completedSessionIds", "Demo-safe participant invitations must carry non-private progress state.");
assertIncludes(appClient, "Preview {participantFirstName(target.personName)}'s Experience", "Leader UI must expose a read-only participant preview action.");
// USA-170: the preview moved out of the leader client into a thin frame around
// the shared member Group Home. The read-only promise moved with it.
assertIncludes(previewPanel, "Read-only — no progress, private responses, token, or onboarding state changes.", "Leader preview must not impersonate, write progress, expose private responses, rotate tokens, or alter onboarding state.");
assertIncludes(previewPanel, "GroupHomeMemberView", "Leader preview must render the same shared member Group Home as the participant's real secure link.");
assertIncludes(appClient, "Copy blocked. Select this secure link", "Leader copy actions must provide selectable secure-link fallback when iPhone Safari blocks clipboard.");
assertIncludes(preview, "Tanner Kent", "DOS preview must include Tanner Kent for USA-170 acceptance.");
assertIncludes(preview, "demo-group-wednesday-member-tanner", "Tanner Kent must be an active Wednesday Men's Group member in preview data.");
assertIncludes(appClient, "groupMemberPortalStatusLabel", "Leader UI must display member portal status separately from membership status.");
assertNotIncludes(appClient, "Not Invited", "Leader UI must not conflate participant portal state with group membership language.");

assertIncludes(groupJourneyView, "GuidedJourneySessionSelector", "Member Journey view must reuse the shared custom Journey selector.");
assertIncludes(groupJourneyView, "GuidedJourneyChapterContent", "Member Journey view must reuse the shared chapter renderer.");
assertIncludes(sharedJourneyUi, "function guidedJourneySessionChapterRange", "Member Journey view must expose compact chapter ranges through shared Journey UI.");
assertIncludes(sharedJourneyUi, "function guidedJourneySessionSelectorTitle", "Member Journey view must show compact chapter titles in the custom selector.");
assertIncludes(sharedJourneyUi, "function guidedJourneyChapterHeading", "Member Journey view must render chapter number before chapter title.");
assertIncludes(groupJourneyView, "isSessionSelectorOpen", "Member Journey view must use one custom week/day selector.");
assertIncludes(sharedJourneyUi, 'aria-label={`${unitLabel} selector`}', "Member Journey selector must be an accessible custom control.");
assertIncludes(sharedJourneyUi, "Completed", "Member Journey selector must expose completed state.");
assertIncludes(sharedJourneyUi, "Current", "Member Journey selector must expose current state.");
assertIncludes(sharedJourneyUi, "Upcoming", "Member Journey selector must expose upcoming state.");
assertIncludes(sharedJourneyUi, "kicker={`Chapter ${chapter.order}`}", "Member Journey detail panel must use chapter-number-first editorial headings.");
assertIncludes(sharedJourneyUi, "function JourneyQuestionBand", "Member Journey detail panel must show the canonical question band.");
assertIncludes(sharedJourneyUi, "export function GuidedJourneyScripture", "Member Journey detail panel must show Scripture rows.");
assertIncludes(groupJourneyView, "What stood out?", "Member Journey view must preserve the canonical first weekly reflection prompt.");
assertIncludes(sharedJourneyUi, "What stood out to you as you considered this question and chapter?", "Member Journey single-chapter reflection helper must connect to the chapter question.");
assertIncludes(sharedJourneyUi, "Looking across both chapters and questions, what stood out most?", "Member Journey two-chapter reflection helper must connect to both questions.");
assertIncludes(groupJourneyView, "What will you do with it?", "Member Journey view must preserve the canonical second weekly reflection prompt.");
assertIncludes(sharedJourneyUi, "What is one response or next step you want to take this week?", "Member Journey two-chapter action helper must stay weekly.");
assertIncludes(groupJourneyView, "PRAYER", "Member Journey view must preserve the canonical prayer reflection prompt.");
assertIncludes(sharedJourneyUi, "Your Journey", "Member Journey progress area must use the Journey hierarchy label.");
assert(
  !sharedJourneyUi.includes("references={chapter.keyScriptures"),
  "Member Journey Scripture must render as one combined list after the responses, not per chapter.",
);
assert(!/<select\b/i.test(groupJourneyView), "Member Journey selector must not use a native select/dropdown.");
assertNotIncludes(groupJourneyView, "Chapter Question", "Member Journey view must not keep the old Chapter Question card label.");
assertNotIncludes(groupJourneyView, "Search the Scriptures", "Member Journey view must not keep the old Search the Scriptures card label.");
assertNotIncludes(groupJourneyView, "Optional Leader Notes", "Member Journey open-week UI must not show Optional Leader Notes.");
assertNotIncludes(groupJourneyView, "eyebrow=\"Multiply\"", "Member Journey open-week UI must not show the extra Multiply card.");
assertNotIncludes(groupJourneyView, "Voice Response", "Member Journey view must not show the disabled voice placeholder.");

assertIncludes(architectureDoc, "Plain tokens are never stored", "Architecture doc must document token storage safety.");
assertIncludes(architectureDoc, "Lightweight members do not receive a DOS workspace", "Architecture doc must preserve product boundary.");

console.log("dos-group-member-portal-regression: all checks passed.");
