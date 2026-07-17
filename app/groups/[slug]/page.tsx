import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getCanonicalSiteUrl } from "@/src/lib/site-url";
import {
  fallbackUsamPublicSite,
  missingPublicSiteSchema,
  publicGroupPath,
  requestHostname,
  resolvePublicSiteForHost,
  type PublicSiteConfig,
} from "@/src/lib/groups/public-site";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import { PublicGroupPageTemplate, type PublicGroupDetail, type PublicGroupPageData, type PublicGroupStep } from "../PublicGroupPageTemplate";

type PublicGroupRow = {
  activity_type?: string | null;
  audience?: string | null;
  default_location: string | null;
  description: string | null;
  id: string;
  image_url: string | null;
  name: string;
  organization_id: string | null;
  public_site_id?: string | null;
  public_status?: string | null;
  rhythm_label: string | null;
  scripture_reference: string | null;
  scripture_text: string | null;
  slug: string;
  tagline: string | null;
  type: string | null;
};

type GatheringRow = {
  location: string | null;
  starts_at: string | null;
  title: string | null;
};

type PublicGroupContent = {
  scheduleIntro: string;
  scheduleTitle: string;
  typicalSchedule: readonly PublicGroupStep[];
  whatToExpect: readonly PublicGroupDetail[];
  whoThisIsFor: readonly PublicGroupDetail[];
};

const fallbackPublicGroups: Record<string, PublicGroupRow> = {
  "2three2": {
    activity_type: "running",
    audience: "men",
    default_location: "Lebanon Hills Trailhead, Eagan, MN",
    description: "A men's discipleship group where we run together, pair up two-by-two, pray for one another, and pursue righteousness, faith, love, and peace.",
    id: "2three2",
    image_url: "/images/usam/2three2-share.png",
    name: "2three2",
    organization_id: null,
    rhythm_label: "Weekly · Saturday · 7:00 AM",
    scripture_reference: "2 Timothy 2:22",
    scripture_text: "Flee also youthful lusts; but pursue righteousness, faith, love, peace with those who call on the Lord out of a pure heart.",
    slug: "2three2",
    tagline: "Run. Pray. Pursue.",
    type: "running",
  },
};

const defaultGroupsShareImage = "/images/usam/groups-share.png";

const fallbackGatherings: Record<string, GatheringRow> = {
  "2three2": {
    location: "Lebanon Hills Trailhead, Eagan, MN",
    starts_at: null,
    title: "Saturday Run & Prayer",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const headersList = await headers();
  const group = await loadPublicGroup(slug, requestHostname(headersList));

  if (!group) {
    return {
      description: "Find discipleship groups connected to USA Missionaries.",
      title: "Group | USA Missionaries",
    };
  }

  const title = `${group.name} | ${group.siteName}`;
  const description = group.description || `A recurring discipleship rhythm connected with ${group.siteName}.`;
  const url = group.siteHostname
    ? `https://${group.siteHostname}${publicGroupPath(group.slug, { basePath: group.siteBasePath })}`
    : `${getCanonicalSiteUrl()}/groups/${group.slug}`;
  const image = groupShareImageUrl(group.shareImageUrl);

  return {
    alternates: {
      canonical: url,
    },
    description,
    openGraph: {
      description,
      images: [
        {
          alt: `${group.name} discipleship group`,
          height: 630,
          url: image,
          width: 1200,
        },
      ],
      siteName: group.siteName,
      title,
      type: "website",
      url,
    },
    title,
    twitter: {
      card: "summary_large_image",
      description,
      images: [image],
      title,
    },
  };
}

export default async function PublicGroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const headersList = await headers();
  const group = await loadPublicGroup(slug, requestHostname(headersList));

  if (!group) {
    notFound();
  }

  const query = searchParams ? await searchParams : {};
  const requestParam = Array.isArray(query.request) ? query.request[0] : query.request;
  const requestState = requestParam === "received" || requestParam === "missing" || requestParam === "unavailable" || requestParam === "error"
    ? requestParam
    : null;

  return <PublicGroupPageTemplate group={group} requestState={requestState} />;
}

async function loadPublicGroup(slug: string, hostname: string): Promise<PublicGroupPageData | null> {
  if (!isSupabaseAdminConfigured()) {
    const fallback = fallbackPublicGroups[slug];

    return fallback ? toPublicGroupData(fallback, fallbackGatherings[slug] ?? null, fallbackUsamPublicSite) : null;
  }

  const supabase = createSupabaseAdminClient();
  const siteResolution = await resolvePublicSiteForHost(supabase, hostname);
  const site = siteResolution.site ?? fallbackUsamPublicSite;
  const groupQuery = supabase
    .from("dos_groups")
    .select("id, name, slug, description, tagline, scripture_reference, scripture_text, type, rhythm_label, default_location, image_url, organization_id, audience, activity_type, public_site_id, public_status")
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
        .select("id, name, slug, description, tagline, scripture_reference, scripture_text, type, rhythm_label, default_location, image_url, organization_id, audience, activity_type")
        .eq("slug", slug)
        .eq("active", true)
        .maybeSingle();

      if (legacyResult.error || !legacyResult.data) {
        return null;
      }

      return loadPublicGroupGatheringData(supabase, legacyResult.data as PublicGroupRow, site);
    }

    console.warn("[Public Group] Unable to load group", error.message);
    return null;
  }

  if (!group) {
    return null;
  }

  return loadPublicGroupGatheringData(supabase, group as PublicGroupRow, site);
}

async function loadPublicGroupGatheringData(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  group: PublicGroupRow,
  site: PublicSiteConfig,
) {
  const { data: gatherings, error: gatheringsError } = await supabase
    .from("dos_group_gatherings")
    .select("title, starts_at, location")
    .eq("group_id", group.id)
    .eq("status", "scheduled")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(1);

  if (gatheringsError) {
    console.warn("[Public Group] Unable to load next gathering", gatheringsError.message);
  }

  return toPublicGroupData(group, gatherings?.[0] ?? null, site);
}

function toPublicGroupData(group: PublicGroupRow, nextGathering: GatheringRow | null, site: PublicSiteConfig): PublicGroupPageData {
  const typeLabel = publicGroupType(group);
  const content = contentForGroup(group);
  const dateParts = nextGatheringDateParts(nextGathering?.starts_at);
  const scriptureReference = group.scripture_reference ?? "";
  const anchor = scriptureAnchor(scriptureReference);
  const nextGatheringTitle = nextGathering?.title ?? nextGatheringTitleFor(group);
  const nextGatheringTime = dateParts.time || nextGatheringTimeFor(group);
  const location = group.default_location ?? nextGathering?.location ?? "Location TBD";

  return {
    anchorMark: anchor.mark,
    anchorSubtext: anchor.subtext,
    description: group.description ?? "A recurring discipleship rhythm connected with USA Missionaries.",
    location,
    name: group.name,
    nextGatheringDay: dateParts.weekday || nextGatheringDayFor(group),
    nextGatheringLocation: nextGathering?.location ?? location,
    nextGatheringMonth: dateParts.month || "Soon",
    nextGatheringNumber: dateParts.day || "TBD",
    nextGatheringTime,
    nextGatheringTitle,
    rhythm: group.rhythm_label ?? "Recurring",
    scheduleIntro: content.scheduleIntro,
    scheduleTitle: content.scheduleTitle,
    scriptureReference,
    scriptureText: group.scripture_text ?? "",
    shareImageUrl: group.image_url,
    slug: group.slug,
    siteBasePath: site.basePath,
    siteHostname: site.id ? site.hostname : null,
    siteLogoUrl: site.logoUrl,
    siteName: site.displayName,
    tagline: group.tagline ?? "Discipleship happens in rhythms.",
    typeLabel,
    typicalSchedule: content.typicalSchedule,
    whatToExpect: content.whatToExpect,
    whoThisIsFor: content.whoThisIsFor,
  };
}

function groupShareImageUrl(value: string | null | undefined) {
  const imageUrl = value?.trim();

  if (!imageUrl || /\b(?:table|dos-table)\b/i.test(imageUrl)) {
    return defaultGroupsShareImage;
  }

  if (/^https?:\/\//i.test(imageUrl) || imageUrl.startsWith("/")) {
    return imageUrl;
  }

  return defaultGroupsShareImage;
}

function contentForGroup(group: PublicGroupRow): PublicGroupContent {
  if (isTwoThreeTwoActivityGroup(group)) {
    const activityLabel = publicGroupActivityLabel(group).toLowerCase();

    return {
      scheduleIntro: "Every gathering follows a simple activity rhythm where prayer, Scripture, and honest conversation have room to breathe.",
      scheduleTitle: "The Rhythm",
      typicalSchedule: [
        {
          description: "Meet up, check in, and pair up two-by-two.",
          meta: "Start",
          title: "Gather",
        },
        {
          description: "Each pair prays for one another out loud and on the move.",
          meta: "On the way",
          title: "Pray",
        },
        {
          description: "Carry a short passage into the activity and let it shape the conversation.",
          meta: "Turnaround",
          title: "Open Scripture",
        },
        {
          description: "Return with one clear commitment for obedience and follow-up.",
          meta: "Finish",
          title: "Share Next Steps",
        },
      ],
      whatToExpect: [
        {
          note: "Same rhythm each week. Show up and the group is there.",
          title: "A steady recurring rhythm",
        },
        {
          note: "Paired two-by-two so nobody runs alone and nobody prays alone.",
          title: "Prayer and accountability",
        },
        {
          note: "A simple check-in during the week. Honest, direct, and encouraging.",
          title: "Simple follow-up",
        },
      ],
      whoThisIsFor: [
        {
          note: "The activity serves the people, not the other way around.",
          title: `People looking for a ${activityLabel} group`,
        },
        {
          note: "Pursuit is the operative word. This group moves toward Jesus together.",
          title: "Those pursuing Christ together",
        },
        {
          note: "Come ready for prayer, encouragement, and a practical next step.",
          title: "Men wanting discipleship and brotherhood",
        },
      ],
    };
  }

  return {
    scheduleIntro: "Each gathering keeps the rhythm simple: arrive, open Scripture, pray together, and leave with a clear next step.",
    scheduleTitle: "The Rhythm",
    typicalSchedule: [
      {
        description: "Arrive, settle in, and share what matters from the week.",
        meta: "Open",
        title: "Gather",
      },
      {
        description: "Read Scripture together and listen for one practical step of obedience.",
        meta: "Scripture",
        title: "Open the Word",
      },
      {
        description: "Pray honestly for one another and for the people God has placed nearby.",
        meta: "Prayer",
        title: "Pray",
      },
      {
        description: "Name one next step and one way the group can follow up.",
        meta: "Send",
        title: "Share Next Steps",
      },
    ],
    whatToExpect: [
      {
        note: "A consistent place to pursue Jesus with other people.",
        title: "A steady recurring rhythm",
      },
      {
        note: "Scripture, prayer, accountability, and real follow-up.",
        title: "Simple discipleship",
      },
      {
        note: "A group leader will help you know what to expect before you come.",
        title: "A clear first step",
      },
    ],
    whoThisIsFor: [
      {
        note: "People who want a consistent discipleship rhythm, not another event.",
        title: "Those pursuing Christ together",
      },
      {
        note: "People looking for prayer, accountability, and community.",
        title: "Those wanting spiritual friendship",
      },
      {
        note: "People ready to take a practical next step in obedience.",
        title: "Those ready for a next step",
      },
    ],
  };
}

function isTwoThreeTwoActivityGroup(group: PublicGroupRow) {
  return Boolean(
    group.activity_type
    || group.type === "running"
    || group.slug?.startsWith("2three2")
    || group.name.toLowerCase().includes("2three2"),
  );
}

function publicActivityLabel(activity: string | null | undefined) {
  if (activity === "fitness") {
    return "General Fitness";
  }

  return activity ? activity.replace(/^\w/, (letter) => letter.toUpperCase()) : "Activity";
}

function publicGroupActivityLabel(group: PublicGroupRow) {
  return group.activity_type
    ? publicActivityLabel(group.activity_type)
    : group.type === "running"
      ? "Running"
      : "Activity";
}

function nextGatheringDateParts(value: string | null | undefined) {
  if (!value) {
    return {
      day: "",
      month: "",
      time: "",
      weekday: "",
    };
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      day: "",
      month: "",
      time: "",
      weekday: "",
    };
  }

  return {
    day: new Intl.DateTimeFormat("en-US", { day: "numeric" }).format(date),
    month: new Intl.DateTimeFormat("en-US", { month: "long" }).format(date),
    time: new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date),
    weekday: new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date),
  };
}

function nextGatheringDayFor(group: PublicGroupRow) {
  if (group.rhythm_label?.toLowerCase().includes("tuesday")) {
    return "Tuesday";
  }

  if (group.rhythm_label?.toLowerCase().includes("wednesday")) {
    return "Wednesday";
  }

  if (group.rhythm_label?.toLowerCase().includes("saturday")) {
    return "Saturday";
  }

  return "Upcoming";
}

function nextGatheringTimeFor(group: PublicGroupRow) {
  const rhythm = group.rhythm_label ?? "";
  const timeMatch = rhythm.match(/\b\d{1,2}:\d{2}\s?(?:AM|PM)\b/i);

  if (timeMatch) {
    return timeMatch[0].replace(/\s+/, " ");
  }

  if (rhythm.toLowerCase().includes("evening")) {
    return "Evening";
  }

  return "Time TBD";
}

function nextGatheringTitleFor(group: PublicGroupRow) {
  if (isTwoThreeTwoActivityGroup(group)) {
    return `Saturday ${publicGroupActivityLabel(group)} & Prayer`;
  }

  return group.name;
}

function publicGroupType(group: PublicGroupRow) {
  const value = group.type;
  const name = group.name;
  const activity = group.activity_type;

  if (isTwoThreeTwoActivityGroup(group)) {
    return `2three2 ${publicGroupActivityLabel(group)}`;
  }

  if (name.toLowerCase().includes("men")) {
    return "Men's Group";
  }

  if (value === "running") {
    return "Running Group";
  }

  if (value === "mens" || value === "men" || value === "discipleship") {
    return "Discipleship Group";
  }

  if (value === "prayer") {
    return "Prayer Group";
  }

  if (value === "study") {
    return "Bible Study";
  }

  return "Discipleship Group";
}

function scriptureAnchor(reference: string) {
  const match = reference.match(/^(.+?)\s+(\d+):(\d+)/);

  if (!match) {
    return {
      mark: "GO",
      subtext: "Groups",
    };
  }

  return {
    mark: `${match[2]}:${match[3]}`,
    subtext: match[1],
  };
}
