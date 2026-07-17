import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import {
  fallbackUsamPublicSite,
  missingPublicSiteSchema,
  resolvePublicSiteForHost,
} from "@/src/lib/groups/public-site";

export type PublicGroup = {
  description: string;
  location: string;
  name: string;
  nextGathering: string;
  nextGatheringLocation: string;
  rhythm: string;
  scriptureReference: string;
  scriptureText: string;
  tagline: string;
  typicalSchedule: string[];
  whatToExpect: string[];
  whoThisIsFor: string[];
};

export const fallbackPublicGroups: Record<string, PublicGroup> = {
  "2three2": {
    description: "A men's discipleship group where we run together, pair up two-by-two, pray for one another, and pursue righteousness, faith, love, and peace.",
    location: "Lebanon Hills Trailhead, Eagan, MN",
    name: "2three2",
    nextGathering: "Saturday Run & Prayer · Saturdays at 7:00 AM",
    nextGatheringLocation: "Lebanon Hills Trailhead, Eagan, MN",
    rhythm: "Weekly · Saturday · 7:00 AM",
    scriptureReference: "2 Timothy 2:22",
    scriptureText: "Flee also youthful lusts; but pursue righteousness, faith, love, peace with those who call on the Lord out of a pure heart.",
    tagline: "Run. Pray. Pursue.",
    typicalSchedule: ["Meet at the trailhead", "Run in pairs", "Pray as you go", "Regroup and share next steps"],
    whatToExpect: ["A steady weekly rhythm", "Two-by-two prayer during the run", "Simple follow-up and encouragement"],
    whoThisIsFor: ["Men pursuing Christ", "Runners of any normal training pace", "Men who want accountability, prayer, and brotherhood"],
  },
};

function formatPublicGroupDate(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    weekday: "long",
  }).format(date);
}

export async function loadPublicGroup(slug: string, hostname = fallbackUsamPublicSite.hostname): Promise<PublicGroup | null> {
  if (!isSupabaseAdminConfigured()) {
    return fallbackPublicGroups[slug] ?? null;
  }

  const supabase = createSupabaseAdminClient();
  const siteResolution = await resolvePublicSiteForHost(supabase, hostname);
  const site = siteResolution.site ?? fallbackUsamPublicSite;
  const groupQuery = supabase
    .from("dos_groups")
    .select("id, name, slug, description, tagline, scripture_reference, scripture_text, type, rhythm_label, default_location, public_site_id, public_status")
    .eq("slug", slug)
    .eq("active", true);
  const { data: group, error } = siteResolution.schemaReady && site.id
    ? await groupQuery
      .eq("public_site_id", site.id)
      .eq("public_status", "published")
      .maybeSingle()
    : siteResolution.allowLegacyGlobalGroups
      ? await groupQuery.maybeSingle()
      : { data: null, error: null };

  if (error) {
    if (missingPublicSiteSchema(error)) {
      const legacyResult = await supabase
        .from("dos_groups")
        .select("id, name, slug, description, tagline, scripture_reference, scripture_text, type, rhythm_label, default_location")
        .eq("slug", slug)
        .eq("active", true)
        .maybeSingle();

      if (legacyResult.error || !legacyResult.data) {
        return null;
      }

      return mapPublicGroup(supabase, legacyResult.data);
    }

    console.warn("[Public Group] Unable to load group", error.message);
    return null;
  }

  if (!group) {
    return null;
  }

  return mapPublicGroup(supabase, group);
}

async function mapPublicGroup(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  group: {
    default_location: string | null;
    description: string | null;
    id: string;
    name: string;
    rhythm_label: string | null;
    scripture_reference: string | null;
    scripture_text: string | null;
    tagline: string | null;
    type: string | null;
  },
) {
  const { data: gatherings } = await supabase
    .from("dos_group_gatherings")
    .select("title, starts_at")
    .eq("group_id", group.id)
    .eq("status", "scheduled")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(1);
  const nextGathering = gatherings?.[0];
  const groupType = group.name.toLowerCase().includes("2three2")
    ? "2three2 activity group"
    : group.type === "running"
      ? "running group"
      : "discipleship group";

  return {
    description: group.description ?? "A recurring discipleship rhythm.",
    location: group.default_location ?? "Location shared after leader confirmation",
    name: group.name,
    nextGathering: nextGathering ? `${nextGathering.title} · ${formatPublicGroupDate(nextGathering.starts_at)}` : "Upcoming gathering TBD",
    nextGatheringLocation: group.default_location ?? "Location shared after leader confirmation",
    rhythm: group.rhythm_label ?? "Recurring",
    scriptureReference: group.scripture_reference ?? "",
    scriptureText: group.scripture_text ?? "",
    tagline: group.tagline ?? "Discipleship happens in rhythms.",
    typicalSchedule: ["Gather", "Pray", "Open Scripture", "Share next steps"],
    whatToExpect: ["A steady recurring rhythm", "Prayer and accountability", "Simple follow-up and encouragement"],
    whoThisIsFor: [`People looking for a ${groupType}`, "Those pursuing Christ together", "Anyone wanting prayer, community, and discipleship"],
  };
}
