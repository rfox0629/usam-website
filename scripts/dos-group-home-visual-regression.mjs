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

const packageJson = read("package.json");
const directory = read("app/groups/page.tsx");
const publicTemplate = read("app/groups/PublicGroupPageTemplate.tsx");
const memberHomeView = read("app/groups/GroupHomeMemberView.tsx");
const visualSystem = read("app/groups/GroupTemplateVisual.tsx");
const memberInstallPrompt = read("app/groups/MemberHomeInstallPrompt.tsx");
const appClient = read("app/dos/app/DosMvpAppClient.tsx");
const routeAwareFooter = read("components/RouteAwareSiteFooter.tsx");
const communityContent = read("app/groups/community-content.ts");
const publicGroupPage = read("app/groups/[slug]/page.tsx");
const groupLogoMark = appClient.slice(appClient.indexOf("function GroupLogoMark"), appClient.indexOf("function groupTypeLabel"));

assertIncludes(packageJson, "test:dos-group-home-visual", "Package scripts must expose the visual regression check.");

for (const requiredPhrase of [
  "RUN",
  "PRAY",
  "PURSUE",
  "WALK",
  "HIKE",
  "RIDE",
  "GROW TOGETHER.",
  "BROTHERHOOD",
]) {
  assertIncludes(visualSystem, requiredPhrase, `Generated template artwork must preserve phrase: ${requiredPhrase}.`);
}

// USA-57 founder correction: every actual Group page and listing is part of
// the DOS ecosystem and uses the DOS light/white system with DOS blue.
//
// The earlier gold public card treatment is retired. USA Missionaries may still
// be named as the publisher/affiliation, but it is a label, not a second visual
// system. Member/installable surfaces were already DOS and stay that way.
// Public surfaces pick up #2563EB through the shared token classes, so accept
// either member of the DOS blue pair here; the token-module import is asserted
// separately below.
for (const source of [directory, publicTemplate]) {
  assert(
    source.includes("#2563EB") || source.includes("#1D4ED8"),
    "Public Group surfaces must use DOS blue.",
  );
}

for (const source of [memberHomeView, memberInstallPrompt]) {
  assertIncludes(source, "#2563EB", "DOS member surfaces must use DOS blue.");
}

for (const source of [directory, publicTemplate, visualSystem]) {
  assertNotIncludes(source, "usamPublic", "Public Group surfaces must not reintroduce the retired gold token set.");
  for (const goldHex of ["#C2A14E", "#A47F2A", "#FBF9F4", "#EFE6D0"]) {
    assertNotIncludes(source, goldHex, `Public Group surfaces must not reintroduce the gold card treatment (${goldHex}).`);
  }
}

// USA Missionaries survives as an affiliation label only.
assertIncludes(publicTemplate, "A {group.siteName} Group", "Public Group detail must carry a quiet USA Missionaries affiliation label.");
assertIncludes(publicTemplate, "communityAffiliation", "Affiliation must use the subtle label token, not brand chrome.");

for (const source of [directory, publicTemplate, memberHomeView, visualSystem, memberInstallPrompt]) {
  assertNotIncludes(source, "#080A0D", "Groups surfaces must not reintroduce the dark Community drift.");
}

for (const source of [directory, publicTemplate, memberHomeView]) {
  assertIncludes(source, "community-design", "Groups surfaces must read the shared Community token module.");
}

assertIncludes(visualSystem, "GroupTemplateArtwork", "Generated template artwork component must exist.");
assertIncludes(visualSystem, "formatLeaderLine", "Leader attribution helper must exist.");
assertIncludes(visualSystem, "Led by", "Leader attribution must use public-friendly language.");
assertIncludes(visualSystem, "Running Group", "Generated activity artwork must avoid redundant 2three2 running labels.");
assertNotIncludes(visualSystem, "2three2 ${titleCase", "Generated artwork must not repeat 2three2 in the activity label.");
assertIncludes(directory, "formatLeaderLine(group.leaders)", "Directory cards must show leader attribution.");
assertIncludes(directory, "loadPublicGroupLeaderNames", "Directory must load public leader names through the server helper.");
assertIncludes(directory, "Find a group near you.", "Directory hero must invite a visitor to find a group.");
assertIncludes(directory, "<GroupTemplateArtwork input={group} />", "Directory cards must use the shared DOS template artwork.");
assertNotIncludes(directory, "line-clamp-3", "Directory cards should avoid paragraph-heavy copy.");
assertIncludes(routeAwareFooter, 'pathname?.startsWith("/groups")', "Groups routes must suppress the full site footer.");

assertIncludes(publicTemplate, "Member sign in", "Public group page must use member-friendly sign-in copy.");
assertIncludes(publicTemplate, "group.memberAccessEnabled ?", "Member Sign In must render only when member access is enabled.");
assertNotIncludes(publicTemplate, "Manage in DOS", "Public group page must not render DOS management actions.");
assertNotIncludes(publicTemplate, "group.manageHref", "Public group page must not carry management hrefs.");
assertNotIncludes(publicTemplate, "PrimaryNav", "Public group page must use the minimal Groups header.");
assertIncludes(publicTemplate, "PublicGroupHeader", "Public group page must render the minimal Groups header.");
assertIncludes(publicTemplate, "What to expect", "Public group page must restore the concise What to expect section.");
assertNotIncludes(publicTemplate, "Join the rhythm.", "Public group page must remove the redundant lower join card.");
assertIncludes(publicTemplate, "Powered by", "Public group page must render a minimal footer.");
assertIncludes(publicTemplate, "GroupTemplateArtwork", "Public group hero must include generated template artwork.");
assertIncludes(publicTemplate, "Leaders", "Public group hero must keep leader attribution visible.");
assertNotIncludes(publicTemplate, "Typical Schedule", "Public group page must stay out of old content-heavy sections.");

assertIncludes(memberHomeView, "GroupTemplateArtwork", "Member Group Home must include generated template artwork.");
assertIncludes(memberHomeView, "Group Home", "Member Group Home must present a stable member home.");
assertIncludes(memberHomeView, "Current Journey", "Member Group Home must prioritize the current Journey.");
assertIncludes(memberHomeView, "Continue", "Member Group Home must include a clear Continue action.");
assertIncludes(memberHomeView, "Scoped DOS member access", "Member Group Home must communicate scoped access without platform language.");
assertNotIncludes(memberHomeView, "Route details will appear here when your leader shares them.", "Member Group Home must not surface deferred route placeholders.");
assertNotIncludes(memberHomeView, "Save RSVP", "Member Group Home must not preserve RSVP as a primary surface.");
assertNotIncludes(memberHomeView, "Keep Me Updated", "Member Group Home must not preserve update preferences as a primary surface.");
assertNotIncludes(memberHomeView, "Member Portal", "Member Group Home must not use portal language.");
assertNotIncludes(memberHomeView, "Dashboard", "Member Group Home must not use dashboard language.");
assertNotIncludes(memberHomeView, "Manage in DOS", "Member Group Home must not render DOS management actions.");

// The generated label system is still what names the template; it now renders
// as a pill beside the Group name rather than being repeated inside the artwork.
assertIncludes(appClient, "<GroupPill>{groupTemplateDisplayLabel(group)}</GroupPill>", "Internal group cards must use the generated-card label system.");
assertNotIncludes(groupLogoMark, "groupTemplateDisplayLabel(group)", "Internal group artwork must not repeat the template label already shown as a pill.");

// USA-57: the in-app Group listing is part of the DOS ecosystem too.
assertNotIncludes(groupLogoMark, '"GO"', "Internal group cards must not reintroduce the decorative GO badge.");
assertIncludes(groupLogoMark, '"2:22"', "Internal group cards keep the scripture anchor for activity Groups.");
for (const darkGold of ["#F8C56A", "#0B1120", "#060B16"]) {
  assertNotIncludes(groupLogoMark, darkGold, `Internal group cards must not keep the dark-and-gold treatment (${darkGold}).`);
}
assertIncludes(groupLogoMark, "#1D4ED8", "Internal group cards must use DOS blue.");
assertIncludes(groupLogoMark, "break-words", "Internal group card title and badge text must wrap instead of overlapping.");
assertNotIncludes(groupLogoMark, "group.imageUrl", "Internal group cards must not render uploaded 2three2 logo artwork.");
assertNotIncludes(groupLogoMark, "<img", "Internal group cards must use generated artwork, not image tags.");
assertIncludes(appClient, "return `${activity} Group`", "Internal activity cards must avoid redundant 2three2 running labels.");

for (const forbiddenPublicTerm of [
  "Save RSVP",
  "Keep Me Updated",
  "dos_group_member_identities",
  "workspace_id",
  "person_id",
]) {
  assertNotIncludes(`${directory}\n${publicTemplate}`, forbiddenPublicTerm, `Public visitor surfaces must not expose ${forbiddenPublicTerm}.`);
}

/* ------------------------------------------------------------------ *
 * USA-57: one card structure across every Group.
 * ------------------------------------------------------------------ */

// Decorative badges that did not help a visitor choose a Group.
assertNotIncludes(visualSystem, 'mark: "GO"', "Group artwork must not reintroduce the decorative GO badge.");
assertNotIncludes(publicGroupPage, 'mark: "GO"', "Public Group detail must not reintroduce the decorative GO badge.");

// Location belongs in the schedule/location field, never as a chip above the
// heading. That chip is what put "Lebanon Hills" over the 2THREE2 title.
assertNotIncludes(publicTemplate, "publicSafeText(group.location)", "Public Group detail must not render a location chip beside the type label.");
assertNotIncludes(directory, "publicSafeText(group.location)", "Directory cards must not render a location pill.");
assertIncludes(publicTemplate, "{schedule.location}", "Location must appear in the canonical schedule block.");

// One canonical source, so the directory and detail cannot disagree again.
for (const surface of [directory, publicGroupPage]) {
  assertIncludes(surface, "APPROVED_PUBLIC_GROUPS", "Group surfaces must read the one canonical approved-Group list.");
  assertIncludes(surface, "communityCopyFor", "Group surfaces must resolve copy from the shared template module.");
}

// Two Groups on the same template must read identically. Only name, day/time
// and location may differ.
const mensEntries = [...communityContent.matchAll(/template:\s*"mens"/g)];
assert(mensEntries.length >= 2, "Both men's Groups must resolve to the shared men's template.");
assertIncludes(communityContent, 'typeLabel: "Men\'s Group"', "The men's template must carry one shared type label.");
for (const canonical of [
  'rhythmLabel: "Weekly · Tuesday · 6:00 AM"',
  'rhythmLabel: "Weekly · Wednesday · 5:30 PM"',
  'rhythmLabel: "Weekly · Saturday · 7:00 AM"',
]) {
  assertIncludes(communityContent, canonical, `Canonical schedule must be preserved: ${canonical}.`);
}

// Secure member access must survive the simplification.
assertIncludes(publicTemplate, "group.memberAccessEnabled ?", "Member sign-in must stay gated on member access.");
assertIncludes(publicTemplate, "Request to join", "Public Group detail must keep one clear join action.");

console.log("dos-group-home-visual-regression: all checks passed.");
