import { readFileSync } from "node:fs";

const files = {
  migration: "supabase/migrations/20260629135120_dos_prayer_public_profile_bridge.sql",
  prayerLoader: "src/lib/missionaries/prayer.ts",
  queries: "src/lib/missionaries/queries.ts",
  template: "src/components/missionaries/MissionaryProfileTemplate.tsx",
};

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function extractStringSet(source, declarationName) {
  const match = source.match(new RegExp(`${declarationName}[^=]*= (?:new Set\\()?\\[(.*?)\\]`, "s"));

  assert(match, `${declarationName} must declare a string list.`);

  return new Set([...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]));
}

const migration = read(files.migration);
const prayerLoader = read(files.prayerLoader);
const queries = read(files.queries);
const template = read(files.template);
const loaderProfileVisibilities = extractStringSet(prayerLoader, "publicProfilePrayerVisibilities");
const templateProfileVisibilities = extractStringSet(template, "publicProfilePrayerRequestVisibilities");

assert(
  prayerLoader.includes("loadPublicProfilePrayerData"),
  "Public profile prayer data loader must exist.",
);
assert(
  prayerLoader.includes("prayerRequestScopeFilter(profileId)")
    && prayerLoader.includes("workspace_id.eq")
    && prayerLoader.includes("household_id.eq")
    && prayerLoader.includes("related_household_id.eq")
    && prayerLoader.includes("related_missionary_profile_id.eq"),
  "Prayer requests must be scoped to the public missionary profile workspace/household.",
);
assert(
  prayerLoader.includes('const publicPrayerStatuses = ["active", "open"] as const'),
  "Public profile prayer loader must include active/open prayer requests.",
);
assert(
  prayerLoader.includes("publicProfilePrayerVisibilities")
    && prayerLoader.includes("isPublicProfilePrayerRequestRow")
    && !prayerLoader.includes('.eq("visibility", "public")')
    && prayerLoader.includes('normalizeRequestScopeValue(row.confidentiality_level) === "general"'),
  "Public profile prayer loader must use the public-safe visibility helper instead of requiring only visibility=public at query time.",
);
assert(
  loaderProfileVisibilities.has("public")
    && loaderProfileVisibilities.has("public_profile")
    && loaderProfileVisibilities.has("mission_profile")
    && !loaderProfileVisibilities.has("private")
    && !loaderProfileVisibilities.has("team"),
  "Prayer loader public-safe visibility set must include profile-facing values and exclude private/team values.",
);
assert(
  prayerLoader.includes("normalizeRequestText(row.request) || normalizeRequestText(row.description)")
    && prayerLoader.includes("category: row.category")
    && prayerLoader.includes("date: row.created_at")
    && prayerLoader.includes("description,"),
  "Public prayer request mapping must include text, category, and created date.",
);
assert(
  queries.includes("loadPublicProfilePrayerData({")
    && queries.includes("profileId: household.id")
    && queries.includes("prayerRequests: prayerData?.prayerRequests ?? []"),
  "Missionary profile queries must attach public prayer requests to the profile model.",
);
assert(
  template.includes("function PrayerProfileCard")
    && template.includes('id="prayer-requests"')
    && template.includes("Prayer Requests"),
  "Missionary profile template must render a Prayer Requests card.",
);
assert(
  template.includes("function isPublicProfilePrayerRequest")
    && template.includes("const publicProfilePrayerRequestVisibilities = new Set")
    && template.includes("features.showPrayer ? missionary.prayerRequests ?? [] : []")
    && template.includes("<PrayerProfileCard requests={prayerRequests} />"),
  "Missionary profile template must render public-safe, feature-enabled prayer requests in the card grid.",
);
assert(
  templateProfileVisibilities.has("public")
    && templateProfileVisibilities.has("public_profile")
    && templateProfileVisibilities.has("mission_profile")
    && !templateProfileVisibilities.has("private")
    && !templateProfileVisibilities.has("team"),
  "Prayer card visibility set must include profile-facing values and exclude private/team values.",
);
assert(
  template.includes("request.title")
    && template.includes("request.description")
    && template.includes("request.category")
    && template.includes("formatPrayerDate(request.date)"),
  "Prayer Requests card must show title, request text, category, and created date.",
);
assert(
  template.includes("const previewPrayerRequests = publicPrayerRequests.slice(0, 2)")
    && template.includes("Pray With Us"),
  "Prayer Requests card must show up to two public requests and keep a clear CTA.",
);
assert(
  template.includes("function MissionProfileCard")
    && template.includes("function PrayerProfileCard")
    && template.includes("<MissionProfileCard")
    && template.includes('icon={<Heart aria-hidden="true"'),
  "Prayer Requests must reuse the same MissionProfileCard shell as the other profile cards.",
);

const gridStart = template.indexOf('<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">');
const storyCard = template.indexOf("<StoryProfileCard", gridStart);
const teamCard = template.indexOf("<TeamProfileCard", gridStart);
const supportCard = template.indexOf("<SupportProfileCard", gridStart);
const prayerCard = template.indexOf("<PrayerProfileCard", gridStart);

assert(
  gridStart >= 0
    && storyCard > gridStart
    && teamCard > storyCard
    && supportCard > teamCard
    && prayerCard > supportCard,
  "Prayer Requests must render as the fourth Connect With The Mission grid card.",
);
assert(
  template.includes("md:grid-cols-2 lg:grid-cols-4") && !template.includes("xl:grid-cols-4"),
  "Connect With The Mission grid must support four desktop columns at the large breakpoint.",
);
assert(
  !template.includes("function PrayerRequestsSection")
    && !template.includes("<section id=\"prayer-requests\""),
  "Prayer Requests must not render as a separate full-width section below the card grid.",
);
assert(
  migration.includes("Public can read approved household prayer requests")
    && migration.includes("visibility = 'public'")
    && migration.includes("status in ('active', 'open')"),
  "Prayer request RLS policy must limit public reads to active/open public requests.",
);
assert(
  !template.includes("SubmitPrayerRequestModal")
    && !template.includes("JoinPrayerTeamModal"),
  "Public Prayer Requests restore must not reintroduce public prayer action modals.",
);

const liveLikeFoxFamilyRequests = [
  { title: "Expansion", visibility: "public" },
  { title: "Partnerships", visibility: "private" },
  { title: "Prayer Team Covering", visibility: "team" },
  { title: "Public Profile Alias", visibility: "public_profile" },
];
const visibleFixtureTitles = liveLikeFoxFamilyRequests
  .filter((request) => templateProfileVisibilities.has(request.visibility))
  .map((request) => request.title);

assert(
  visibleFixtureTitles.includes("Expansion")
    && visibleFixtureTitles.includes("Public Profile Alias"),
  "Live-like fox-family public/profile prayer requests must render.",
);
assert(
  !visibleFixtureTitles.includes("Partnerships")
    && !visibleFixtureTitles.includes("Prayer Team Covering"),
  "Live-like fox-family private and prayer-team-only requests must not render.",
);

console.log("Public profile prayer section regression passed.");
