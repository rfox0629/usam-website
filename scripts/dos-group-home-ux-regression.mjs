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

const packageJson = read("package.json");
const publicGroupPage = read("app/groups/[slug]/page.tsx");
const publicTemplate = read("app/groups/PublicGroupPageTemplate.tsx");
const memberPage = read("app/groups/[slug]/member/page.tsx");
const memberActions = read("app/groups/[slug]/member/actions.ts");
const memberHomeView = read("app/groups/GroupHomeMemberView.tsx");
const memberAccess = read("src/lib/groups/member-access.ts");
const groupHomeAccess = read("src/lib/groups/group-home-access.ts");
const routeBuilder = read("src/lib/groups/route-builder.ts");
const appClient = read("app/dos/app/DosMvpAppClient.tsx");
const architectureDoc = read("docs/dos-public-groups-member-portal-architecture.md");

assertIncludes(publicGroupPage, "loadGroupMemberPortalData", "Canonical public group page must adapt for authenticated members.");
assertIncludes(publicGroupPage, "GroupHomeMemberView", "Canonical public group page must render the approved member Group Home.");
assertNotIncludes(publicGroupPage, "loadManageGroupHref", "Canonical public group page must not resolve public management links.");
assertNotIncludes(publicGroupPage, "loadManageHrefForGroup", "Canonical public group page must not render public management links.");
assertIncludes(memberActions, "redirectToMember(result.groupSlug ?? slug, \"signed-in\")", "Access claim should send members to the canonical Group Home.");
assertIncludes(memberActions, "${publicGroupPath(slug)}?state=${state}", "The canonical Group Home redirect helper must target the public group path, not a raw journey URL.");
assertIncludes(memberPage, "redirect(`${groupPath}", "Valid member sessions on /member should redirect to the canonical Group Home.");

assertIncludes(publicTemplate, "PublicGroupHeader", "Public visitor page must use the minimal Groups header.");
assertNotIncludes(publicTemplate, "PrimaryNav", "Public visitor page must not use the full public nav.");
assertIncludes(publicTemplate, "Request to join", "Public visitor page must keep the join action.");
assertIncludes(publicTemplate, "Member sign in", "Public visitor page must keep the sign-in action.");
assertIncludes(publicTemplate, "Leaders", "Public visitor page must show leaders.");
assertNotIncludes(publicTemplate, "Manage in DOS", "Public visitor page must not expose DOS management actions.");
assertNotIncludes(publicTemplate, "group.manageHref", "Public visitor page must not carry management hrefs.");
assertBefore(publicTemplate, "<WhatToExpectSection group={group} />", "id=\"join\"", "Public visitor page must restore What to Expect before the join form.");
assertIncludes(publicTemplate, "group.whatToExpect.map", "Public visitor page must render the concise What to Expect rhythm items.");
assertNotIncludes(publicTemplate, "Join the rhythm.", "Public visitor page must remove the redundant lower join card.");
assertNotIncludes(publicTemplate, "Typical Schedule", "Public visitor page must remove the old long schedule section.");
assertNotIncludes(publicTemplate, "What You Are Signing Up For", "Public visitor page must remove repeated explanatory sections.");
assertNotIncludes(publicTemplate, "Member Portal", "Public visitor page must not present a member portal.");
assertNotIncludes(publicTemplate, "Member Dashboard", "Public visitor page must not present a dashboard.");

assertIncludes(memberHomeView, "Group Home", "Approved member view must use stable Group Home language.");
assertIncludes(memberHomeView, "data.identity.name", "Approved member view must identify the scoped member.");
assertBefore(memberHomeView, "Group Home", "Current Journey", "Member view must start with the Group identity before the current Journey.");
assertBefore(memberHomeView, "Current Journey", "<MemberHomeInstallPrompt", "Member view must keep the Journey above install help.");
assertIncludes(memberHomeView, "MemberHomeInstallPrompt", "Successful member entry must offer the one-time Home Screen prompt.");
assertIncludes(memberHomeView, "MemberJourneySummaryRow", "Member view must summarize assigned Journeys.");
assertIncludes(memberHomeView, "journeyProgress", "Member Journey rows must be progress-aware.");
assertIncludes(memberHomeView, "Continue", "Member Journey rows must include a Continue action.");
assertIncludes(memberHomeView, "Completed (", "Completed Journeys must stay available without competing with active work.");
assertNotIncludes(memberHomeView, "Save RSVP", "Approved member Group Home must not prioritize RSVP over active Journeys.");
assertNotIncludes(memberHomeView, "Latest Update", "Approved member Group Home must not surface general update feeds.");
assertNotIncludes(memberHomeView, "Keep Me Updated", "Approved member Group Home must not surface notification preference controls.");
assertNotIncludes(memberHomeView, "Attendance", "Approved member Group Home must not show attendance history.");
assertNotIncludes(memberHomeView, "Workspace", "Approved member Group Home must not expose workspace language.");
assertNotIncludes(memberHomeView, "Internal", "Approved member Group Home must not expose internal language.");
assertNotIncludes(memberHomeView, "Manage in DOS", "Approved member Group Home must not expose DOS management actions.");
assertIncludes(memberAccess, ".in(\"visibility\", [\"public\", \"group_members\"])", "Member updates must be member-visible or public only.");
assertIncludes(memberAccess, ".eq(\"visibility\", \"group_members\")", "Member prayer list must show only group-member shared prayer.");
assertIncludes(memberActions, "visibility: \"group_leaders\"", "Member-submitted prayer must remain leader-only by default.");

assertIncludes(groupHomeAccess, "loadPublicGroupLeaderNames", "Public Group Home must load leader names through a server helper.");
assertIncludes(groupHomeAccess, "allowedRoles: [\"leader\", \"co_leader\"]", "Management helper must remain leader authorized outside the public Group Home.");

assertIncludes(publicGroupPage, "groupDisplayTimeZone", "Public Group Home must format gatherings in the shared group timezone.");
// The intent here is right — never fabricate a clock time from rhythm copy —
// but requiring the literal "Time TBD" is what produced the contradiction the
// founder flagged: a confident "Weekly · Wednesday · 5:30-6:30" sitting beside
// "Next gathering: TBD". buildCommunitySchedule enforces the same intent by
// folding rhythm and dated gathering into one canonical answer.
assertIncludes(publicGroupPage, "buildCommunitySchedule", "Public Group Home must derive one canonical schedule.");
assertNotIncludes(publicGroupPage, "Time TBD", "Public Group Home must not contradict the rhythm with a competing TBD time.");
assertNotIncludes(publicGroupPage, "nextGatheringTimeFor", "Public Group Home must not parse rhythm text into next-gathering time.");
assertIncludes(memberHomeView, "groupDisplayTimeZone", "Member Group Home must format gatherings in the shared group timezone.");
assertIncludes(appClient, "const dosDisplayTimeZone = groupDisplayTimeZone", "DOS leader views must use the shared group timezone.");

for (const activity of ["running", "walking", "hiking", "cycling", "fitness"]) {
  assertIncludes(routeBuilder, activity, `Route placeholder eligibility must include ${activity}.`);
}
assertIncludes(routeBuilder, "includes(\"2three2\")", "Route placeholder must be limited to 2three2 templates.");
assertIncludes(routeBuilder, "is2three2Template\n    &&", "Non-2three2 groups must not pass route placeholder eligibility.");
assertIncludes(appClient, "GroupRouteBuilderPlaceholder", "DOS leader gathering experience must include the route placeholder.");
assertIncludes(appClient, "Plan and share the route for this gathering.", "Leader route placeholder must use restrained future copy.");
assertIncludes(appClient, "aria-disabled=\"true\"", "Leader route placeholder must be non-functional and accessible.");

for (const forbidden of ["maps.googleapis", "google.maps", "@googlemaps", "mapbox", "leaflet"]) {
  assertNotIncludes(packageJson, forbidden, `No map provider dependency should be added: ${forbidden}.`);
  assertNotIncludes(routeBuilder, forbidden, `Route placeholder helper must not add provider code: ${forbidden}.`);
  assertNotIncludes(memberHomeView, forbidden, `Member Group Home must not add provider code: ${forbidden}.`);
  assertNotIncludes(architectureDoc, forbidden, `Architecture doc must stay provider-neutral: ${forbidden}.`);
}

assertIncludes(architectureDoc, "Deferred Route Builder", "Architecture doc must describe the deferred route builder.");
assertIncludes(architectureDoc, "dos_group_routes", "Architecture doc must name the future route model.");
assertIncludes(architectureDoc, "A route is reusable", "Architecture doc must clarify reusable routes.");
assertIncludes(architectureDoc, "Public visitors should not automatically receive exact route or location data", "Architecture doc must preserve public privacy.");

console.log("dos-group-home-ux-regression: all checks passed.");
