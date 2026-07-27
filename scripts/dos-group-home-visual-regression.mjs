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
const appClient = read("app/dos/app/DosMvpAppClient.tsx");
const routeAwareFooter = read("components/RouteAwareSiteFooter.tsx");
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

for (const source of [directory, publicTemplate, memberHomeView, visualSystem]) {
  assertIncludes(source, "#C2A14E", "Groups surfaces must preserve USA Missionaries gold.");
  assertIncludes(source, "#080A0D", "Groups surfaces must preserve the dark USA Missionaries atmosphere.");
}

assertIncludes(visualSystem, "GroupTemplateArtwork", "Generated template artwork component must exist.");
assertIncludes(visualSystem, "formatLeaderLine", "Leader attribution helper must exist.");
assertIncludes(visualSystem, "Led by", "Leader attribution must use public-friendly language.");
assertIncludes(visualSystem, "Running Community", "Generated activity artwork must avoid redundant 2three2 running labels.");
assertNotIncludes(visualSystem, "2three2 ${titleCase", "Generated artwork must not repeat 2three2 in the activity label.");
assertIncludes(directory, "formatLeaderLine(group.leaders)", "Directory cards must show leader attribution.");
assertIncludes(directory, "loadPublicGroupLeaderNames", "Directory must load public leader names through the server helper.");
assertIncludes(directory, "Public rhythms. Leader operated. Organization published.", "Directory hero must describe organization-owned groups.");
assertIncludes(directory, "GroupTemplateArtwork input={group}", "Directory cards must use generated template artwork.");
assertIncludes(directory, "Running Community", "Directory cards must avoid redundant 2three2 running labels.");
assertNotIncludes(directory, "line-clamp-3", "Directory cards should avoid paragraph-heavy copy.");
assertIncludes(routeAwareFooter, 'pathname?.startsWith("/groups")', "Groups routes must suppress the full site footer.");

assertIncludes(publicTemplate, "Member Sign In", "Public group page must use member-friendly sign-in copy.");
assertIncludes(publicTemplate, "group.memberAccessEnabled ?", "Member Sign In must render only when member access is enabled.");
assertNotIncludes(publicTemplate, "Manage in DOS", "Public group page must not render DOS management actions.");
assertNotIncludes(publicTemplate, "group.manageHref", "Public group page must not carry management hrefs.");
assertNotIncludes(publicTemplate, "PrimaryNav", "Public group page must use the minimal Groups header.");
assertIncludes(publicTemplate, "PublicGroupHeader", "Public group page must render the minimal Groups header.");
assertIncludes(publicTemplate, "What to Expect", "Public group page must restore the concise What to Expect section.");
assertNotIncludes(publicTemplate, "Join the rhythm.", "Public group page must remove the redundant lower join card.");
assertIncludes(publicTemplate, "Powered by", "Public group page must render a minimal footer.");
assertIncludes(publicTemplate, "GroupTemplateArtwork", "Public group hero must include generated template artwork.");
assertIncludes(publicTemplate, "Leaders", "Public group hero must keep leader attribution visible.");
assertNotIncludes(publicTemplate, "Typical Schedule", "Public group page must stay out of old content-heavy sections.");

assertIncludes(memberHomeView, "GroupTemplateArtwork", "Member Group Home must include generated template artwork.");
assertIncludes(memberHomeView, "Route details will appear here when your leader shares them.", "Route placeholder must feel intentional and remain non-functional.");
assertIncludes(memberHomeView, "Save RSVP", "Member Group Home must preserve RSVP.");
assertIncludes(memberHomeView, "Keep Me Updated", "Member Group Home must preserve update preferences.");
assertNotIncludes(memberHomeView, "Member Portal", "Member Group Home must not use portal language.");
assertNotIncludes(memberHomeView, "Dashboard", "Member Group Home must not use dashboard language.");
assertNotIncludes(memberHomeView, "Manage in DOS", "Member Group Home must not render DOS management actions.");

assertIncludes(groupLogoMark, "groupTemplateDisplayLabel(group)", "Internal group cards must use the generated-card label system.");
assertIncludes(groupLogoMark, "break-words", "Internal group card title and badge text must wrap instead of overlapping.");
assertNotIncludes(groupLogoMark, "group.imageUrl", "Internal group cards must not render uploaded 2three2 logo artwork.");
assertNotIncludes(groupLogoMark, "<img", "Internal group cards must use generated artwork, not image tags.");
assertIncludes(appClient, "return `${activity} Community`", "Internal activity cards must avoid redundant 2three2 running labels.");

for (const forbiddenPublicTerm of [
  "Save RSVP",
  "Keep Me Updated",
  "dos_group_member_identities",
  "workspace_id",
  "person_id",
]) {
  assertNotIncludes(`${directory}\n${publicTemplate}`, forbiddenPublicTerm, `Public visitor surfaces must not expose ${forbiddenPublicTerm}.`);
}

console.log("dos-group-home-visual-regression: all checks passed.");
