import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

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

export async function loadPublicGroup(slug: string): Promise<PublicGroup | null> {
  if (!isSupabaseAdminConfigured()) {
    return fallbackPublicGroups[slug] ?? null;
  }

  const supabase = createSupabaseAdminClient();
  const { data: group, error } = await supabase
    .from("dos_groups")
    .select("id, name, slug, description, tagline, scripture_reference, scripture_text, type, rhythm_label, default_location")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    console.warn("[Public Group] Unable to load group", error.message);
    return null;
  }

  if (!group) {
    return null;
  }

  const { data: gatherings } = await supabase
    .from("dos_group_gatherings")
    .select("title, starts_at, location")
    .eq("group_id", group.id)
    .eq("status", "scheduled")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(1);
  const nextGathering = gatherings?.[0];
  const groupType = group.type === "running" ? "running group" : "discipleship group";

  return {
    description: group.description ?? "A recurring discipleship rhythm.",
    location: group.default_location ?? nextGathering?.location ?? "Location TBD",
    name: group.name,
    nextGathering: nextGathering ? `${nextGathering.title} · ${formatPublicGroupDate(nextGathering.starts_at)}` : "Upcoming gathering TBD",
    nextGatheringLocation: nextGathering?.location ?? group.default_location ?? "Location TBD",
    rhythm: group.rhythm_label ?? "Recurring",
    scriptureReference: group.scripture_reference ?? "",
    scriptureText: group.scripture_text ?? "",
    tagline: group.tagline ?? "Discipleship happens in rhythms.",
    typicalSchedule: ["Gather", "Pray", "Open Scripture", "Share next steps"],
    whatToExpect: ["A steady recurring rhythm", "Prayer and accountability", "Simple follow-up and encouragement"],
    whoThisIsFor: [`People looking for a ${groupType}`, "Those pursuing Christ together", "Anyone wanting prayer, community, and discipleship"],
  };
}
