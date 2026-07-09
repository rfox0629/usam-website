import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import { PublicGroupPageTemplate, type PublicGroupDetail, type PublicGroupPageData, type PublicGroupStep } from "../PublicGroupPageTemplate";

type PublicGroupRow = {
  default_location: string | null;
  description: string | null;
  id: string;
  name: string;
  organization_id: string | null;
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
    default_location: "Lebanon Hills Trailhead, Eagan, MN",
    description: "A men's discipleship group where we run together, pair up two-by-two, pray for one another, and pursue righteousness, faith, love, and peace.",
    id: "2three2",
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

const fallbackGatherings: Record<string, GatheringRow> = {
  "2three2": {
    location: "Lebanon Hills Trailhead, Eagan, MN",
    starts_at: null,
    title: "Saturday Run & Prayer",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const group = await loadPublicGroup(slug);

  if (!group) {
    return {
      title: "Group | USA Missionaries",
    };
  }

  return {
    description: group.description,
    title: `${group.name} | USA Missionaries`,
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
  const group = await loadPublicGroup(slug);

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

async function loadPublicGroup(slug: string): Promise<PublicGroupPageData | null> {
  if (!isSupabaseAdminConfigured()) {
    const fallback = fallbackPublicGroups[slug];

    return fallback ? toPublicGroupData(fallback, fallbackGatherings[slug] ?? null) : null;
  }

  const supabase = createSupabaseAdminClient();
  const { data: group, error } = await supabase
    .from("dos_groups")
    .select("id, name, slug, description, tagline, scripture_reference, scripture_text, type, rhythm_label, default_location, organization_id")
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

  return toPublicGroupData(group as PublicGroupRow, gatherings?.[0] ?? null);
}

function toPublicGroupData(group: PublicGroupRow, nextGathering: GatheringRow | null): PublicGroupPageData {
  const typeLabel = publicGroupType(group.type, group.name);
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
    slug: group.slug,
    tagline: group.tagline ?? "Discipleship happens in rhythms.",
    typeLabel,
    typicalSchedule: content.typicalSchedule,
    whatToExpect: content.whatToExpect,
    whoThisIsFor: content.whoThisIsFor,
  };
}

function contentForGroup(group: PublicGroupRow): PublicGroupContent {
  if (group.type === "running" || group.slug === "2three2") {
    return {
      scheduleIntro: "Every gathering follows a simple route. The miles are where prayer, Scripture, and honest conversation have room to breathe.",
      scheduleTitle: "The Route",
      typicalSchedule: [
        {
          description: "Meet at the trailhead, check in, stretch, and pair up two-by-two.",
          meta: "Start",
          title: "Gather",
        },
        {
          description: "Each pair prays for one another out loud and on the move.",
          meta: "On the trail",
          title: "Pray",
        },
        {
          description: "Carry a short passage into the run and let it shape the conversation.",
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
          note: "All normal training paces are welcome. The route serves the people, not the other way around.",
          title: "Men looking for a running group",
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
  if (group.type === "running" || group.slug === "2three2") {
    return "Saturday Run & Prayer";
  }

  return group.name;
}

function publicGroupType(value: string | null | undefined, name: string) {
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
