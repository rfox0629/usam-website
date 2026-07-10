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

const migration = read(files.migration);
const prayerLoader = read(files.prayerLoader);
const queries = read(files.queries);
const template = read(files.template);

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
  prayerLoader.includes('.eq("visibility", "public")')
    && prayerLoader.includes('row.visibility !== "public"'),
  "Public profile prayer loader must only expose public prayer requests.",
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
  template.includes('request.visibility === "public"')
    && template.includes("features.showPrayer ? missionary.prayerRequests ?? [] : []")
    && template.includes("<PrayerProfileCard requests={prayerRequests} />"),
  "Missionary profile template must render only public, feature-enabled prayer requests in the card grid.",
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
const gridStart = template.indexOf('<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">');
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

console.log("Public profile prayer section regression passed.");
