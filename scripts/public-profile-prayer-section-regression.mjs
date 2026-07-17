import { readFileSync } from "node:fs";

const files = {
  prayerActions: "src/components/missionaries/JoinPrayerTeamModal.tsx",
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
const prayerActions = read(files.prayerActions);
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
  prayerLoader.includes('const publicProfilePrayerVisibilities = ["public_profile", "public"] as const')
    && prayerLoader.includes('.in("visibility", [...publicProfilePrayerVisibilities])')
    && prayerLoader.includes("isPublicProfilePrayerVisibility(row.visibility"),
  "Public profile prayer loader must only expose canonical or legacy public prayer requests.",
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
    && template.includes("PrayerRequestPreviewList")
    && template.includes("PrayerRequestsModalButton")
    && prayerActions.includes("Prayer Requests"),
  "Missionary profile template must render a Prayer Requests card.",
);
assert(
  template.includes("features.showPrayer")
    && template.includes("const requests = missionary.prayerRequests ?? []")
    && template.includes("<PrayerProfileCard missionary={missionary} />")
    && template.includes("<PrayerRequestPreviewList requests={previewRequests} />"),
  "Missionary profile template must render loader-filtered, feature-enabled prayer requests in the card grid.",
);
assert(
  prayerActions.includes("request.title")
    && prayerActions.includes("request.description")
    && prayerActions.includes("request.category")
    && prayerActions.includes("formatPrayerDate(request.date)"),
  "Prayer Requests card must show title, request text, category, and created date.",
);
assert(
  template.includes("const previewRequests = requests.slice(0, 2)")
    && template.includes("Become a Prayer Partner")
    && template.includes("PrayerRequestsModalButton"),
  "Prayer Requests card must show up to two public requests and keep prayer actions available.",
);
assert(
  template.includes("function MissionProfileCard")
    && template.includes("function PrayerProfileCard")
    && template.includes("<MissionProfileCard")
    && template.includes('icon={<HeartHandshake aria-hidden="true"'),
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
    && prayerCard > teamCard
    && supportCard > prayerCard,
  "Prayer Requests must render in the Connect With The Mission grid before Support.",
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
  template.includes("SubmitPrayerRequestModal")
    && template.includes("JoinPrayerTeamModal"),
  "Public Prayer Requests must keep prayer request and prayer-team actions available.",
);

console.log("Public profile prayer section regression passed.");
