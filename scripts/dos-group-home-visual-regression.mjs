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
assertIncludes(directory, "formatLeaderLine(group.leaders)", "Directory cards must show leader attribution.");
assertIncludes(directory, "loadPublicGroupLeaderNames", "Directory must load public leader names through the server helper.");
assertIncludes(directory, "Public rhythms. Leader operated. Organization published.", "Directory hero must describe organization-owned groups.");
assertIncludes(directory, "GroupTemplateArtwork input={group}", "Directory cards must use generated template artwork.");
assertNotIncludes(directory, "line-clamp-3", "Directory cards should avoid paragraph-heavy copy.");

assertIncludes(publicTemplate, "Member Sign In", "Public group page must use member-friendly sign-in copy.");
assertIncludes(publicTemplate, "group.memberAccessEnabled ?", "Member Sign In must render only when member access is enabled.");
assertIncludes(publicTemplate, "Manage in DOS", "Leader-only management action must remain available when authorized.");
assertIncludes(publicTemplate, "GroupTemplateArtwork", "Public group hero must include generated template artwork.");
assertIncludes(publicTemplate, "group.manageHref ?", "Manage in DOS must remain conditional.");
assertIncludes(publicTemplate, "Leaders", "Public group hero must keep leader attribution visible.");
assertNotIncludes(publicTemplate, "Typical Schedule", "Public group page must stay out of old content-heavy sections.");

assertIncludes(memberHomeView, "GroupTemplateArtwork", "Member Group Home must include generated template artwork.");
assertIncludes(memberHomeView, "Route details will appear here when your leader shares them.", "Route placeholder must feel intentional and remain non-functional.");
assertIncludes(memberHomeView, "Save RSVP", "Member Group Home must preserve RSVP.");
assertIncludes(memberHomeView, "Keep Me Updated", "Member Group Home must preserve update preferences.");
assertNotIncludes(memberHomeView, "Member Portal", "Member Group Home must not use portal language.");
assertNotIncludes(memberHomeView, "Dashboard", "Member Group Home must not use dashboard language.");

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
