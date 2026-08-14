import type { Metadata } from "next";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { getCanonicalSiteUrl } from "@/src/lib/site-url";
import { loadPublicGroupLeaderNames } from "@/src/lib/groups/group-home-access";
import {
  fallbackUsamPublicSite,
  missingPublicSiteSchema,
  publicGroupPath,
  requestHostname,
  resolvePublicSiteForHost,
  type PublicSiteConfig,
} from "@/src/lib/groups/public-site";
import { groupDisplayTimeZone } from "@/src/lib/groups/timezone";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import {
  communityCard,
  communityCardInteractive,
  communityChip,
  communityChipMuted,
  communityFieldLabel,
  communityOrgLabel,
  communityPage,
} from "./community-design";
import { buildCommunitySchedule, type CommunitySchedule } from "./community-schedule";
import { formatLeaderLine, GroupTemplateArtwork } from "./GroupTemplateVisual";

type PublicDirectoryGroup = {
  description: string;
  leaders: string[];
  location: string;
  name: string;
  schedule: CommunitySchedule;
  scriptureReference: string;
  slug: string;
  tagline: string;
  type: string;
};

type PublicDirectoryData = {
  groups: PublicDirectoryGroup[];
  site: PublicSiteConfig;
};

type PublicDirectoryGroupRow = {
  activity_type?: string | null;
  audience?: string | null;
  default_location: string | null;
  description: string | null;
  id: string;
  name: string;
  rhythm_label: string | null;
  scripture_reference: string | null;
  slug: string;
  tagline: string | null;
  type: string | null;
};

const fallbackPublicDirectoryGroups: PublicDirectoryGroup[] = [
  {
    description: "A men's discipleship group where we run together, pair up two-by-two, pray for one another, and pursue righteousness, faith, love, and peace.",
    leaders: ["Ryan Fox"],
    location: "Lebanon Hills Trailhead, Eagan, MN",
    name: "2three2",
    schedule: buildCommunitySchedule({ location: "Lebanon Hills Trailhead, Eagan, MN", rhythmLabel: "Weekly · Saturday · 7:00 AM" }),
    scriptureReference: "2 Timothy 2:22",
    slug: "2three2",
    tagline: "Run. Pray. Pursue.",
    type: "Running Group",
  },
  {
    description: "A weekly gathering focused on Scripture, accountability, prayer, and helping men pursue Christ together.",
    leaders: ["Ryan Fox"],
    location: "Location TBD",
    name: "Tuesday Men's Group",
    schedule: buildCommunitySchedule({ rhythmLabel: "Weekly · Tuesday · 6:00 AM" }),
    scriptureReference: "",
    slug: "tuesday-mens-group",
    tagline: "Grow together.",
    type: "Men's Group",
  },
  {
    description: "An evening gathering where men encourage one another, study Scripture, pray together, and build authentic Christian community.",
    leaders: ["Ryan Fox"],
    location: "Location TBD",
    name: "Wednesday Men's Group",
    schedule: buildCommunitySchedule({ rhythmLabel: "Weekly · Wednesday · Evening" }),
    scriptureReference: "",
    slug: "wednesday-mens-group",
    tagline: "Brotherhood. Prayer. Discipleship.",
    type: "Men's Group",
  },
];

const groupsShareImage = "/images/usam/groups-share.png";

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = requestHostname(headersList);
  const site = isSupabaseAdminConfigured()
    ? (await resolvePublicSiteForHost(createSupabaseAdminClient(), host)).site ?? fallbackUsamPublicSite
    : fallbackUsamPublicSite;
  const url = site.id
    ? `https://${site.hostname}${site.basePath}`
    : `${getCanonicalSiteUrl()}/groups`;
  const title = `Groups | ${site.displayName}`;
  const description = `Find discipleship groups connected to ${site.displayName}.`;

  return {
  alternates: {
    canonical: url,
  },
  description,
  openGraph: {
    description,
    images: [
      {
        alt: `${site.displayName} Discipleship Groups`,
        height: 630,
        url: groupsShareImage,
        width: 1200,
      },
    ],
    siteName: site.displayName,
    title,
    type: "website",
    url,
  },
  title,
  twitter: {
    card: "summary_large_image",
    description,
    images: [groupsShareImage],
    title,
  },
  };
}

function publicGroupType(group: Pick<PublicDirectoryGroupRow, "activity_type" | "audience" | "name" | "slug" | "type">) {
  const value = group.type;
  const name = group.name ?? "";
  const activity = group.activity_type;

  if (group.slug?.startsWith("2three2") || name.toLowerCase().includes("2three2")) {
    const activityLabel = activity === "fitness"
      ? "General Fitness"
      : activity
        ? activity.replace(/^\w/, (letter) => letter.toUpperCase())
        : value === "running"
          ? "Running"
          : "Activity";

    return `${activityLabel} Group`;
  }

  if (name.toLowerCase().includes("men")) {
    return "Men's Group";
  }

  if (value === "running") {
    return "Running Group";
  }

  if (value === "mens" || value === "men") {
    return "Men's Group";
  }

  return "Discipleship Group";
}

async function loadPublicDirectoryData(hostname: string): Promise<PublicDirectoryData> {
  if (!isSupabaseAdminConfigured()) {
    return {
      groups: fallbackPublicDirectoryGroups,
      site: fallbackUsamPublicSite,
    };
  }

  const supabase = createSupabaseAdminClient();
  const siteResolution = await resolvePublicSiteForHost(supabase, hostname);
  const site = siteResolution.site ?? fallbackUsamPublicSite;
  const publicQuery = supabase
    .from("dos_groups")
    .select("id, name, slug, description, tagline, scripture_reference, type, rhythm_label, default_location, audience, activity_type, public_site_id, public_status")
    .eq("active", true)
    .order("name", { ascending: true });
  const { data: groups, error } = siteResolution.schemaReady && site.id
    ? await publicQuery
      .eq("public_site_id", site.id)
      .eq("public_status", "published")
    : siteResolution.allowLegacyGlobalGroups
      ? await publicQuery
      : { data: [], error: null };

  if (error) {
    if (missingPublicSiteSchema(error)) {
      const legacyResult = await supabase
        .from("dos_groups")
        .select("id, name, slug, description, tagline, scripture_reference, type, rhythm_label, default_location, audience, activity_type")
        .eq("active", true)
        .order("name", { ascending: true });

      return {
        groups: legacyResult.error ? fallbackPublicDirectoryGroups : await mapDirectoryGroups((legacyResult.data ?? []) as PublicDirectoryGroupRow[], supabase),
        site,
      };
    }

    console.warn("[Public Groups] Unable to load directory", error.message);
    return { groups: [], site };
  }

  const groupRows = (groups ?? []) as PublicDirectoryGroupRow[];
  const mappedGroups = await mapDirectoryGroups(groupRows, supabase);

  return { groups: mappedGroups, site };
}

async function mapDirectoryGroups(groupRows: PublicDirectoryGroupRow[], supabase: ReturnType<typeof createSupabaseAdminClient>): Promise<PublicDirectoryGroup[]> {
  const groupIds = groupRows.map((group) => group.id).filter(Boolean);
  const nextGatheringsByGroupId = new Map<string, { starts_at: string | null; title: string | null }>();
  const leadersByGroupId = new Map<string, string[]>();

  if (groupIds.length) {
    const { data: gatherings, error: gatheringsError } = await supabase
      .from("dos_group_gatherings")
      .select("group_id, title, starts_at")
      .in("group_id", groupIds)
      .eq("status", "scheduled")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true });

    if (gatheringsError) {
      console.warn("[Public Groups] Unable to load upcoming gatherings", gatheringsError.message);
    }

    for (const gathering of gatherings ?? []) {
      if (!gathering.group_id || nextGatheringsByGroupId.has(gathering.group_id)) {
        continue;
      }

      nextGatheringsByGroupId.set(gathering.group_id, {
        starts_at: gathering.starts_at ?? null,
        title: gathering.title ?? null,
      });
    }
  }

  await Promise.all(groupRows.map(async (group) => {
    leadersByGroupId.set(group.id, await loadPublicGroupLeaderNames(supabase, group.id));
  }));

  return groupRows.map((group) => {
    const nextGathering = nextGatheringsByGroupId.get(group.id);

    return {
      description: group.description ?? "A recurring discipleship rhythm.",
      leaders: leadersByGroupId.get(group.id) ?? [],
      location: group.default_location ?? "Location shared after leader confirmation",
      name: group.name,
      schedule: buildCommunitySchedule({
        location: group.default_location,
        nextGatheringStartsAt: nextGathering?.starts_at,
        nextGatheringTitle: nextGathering?.title,
        rhythmLabel: group.rhythm_label,
        timeZone: groupDisplayTimeZone,
      }),
      scriptureReference: group.scripture_reference ?? "",
      slug: group.slug,
      tagline: group.tagline ?? "Discipleship happens in rhythms.",
      type: publicGroupType(group),
    };
  });
}

export default async function PublicGroupsDirectoryPage() {
  const headersList = await headers();
  const { groups, site } = await loadPublicDirectoryData(requestHostname(headersList));

  return (
    <main className={communityPage}>
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-3">
          <Link className={communityOrgLabel} href="/">
            <Image
              alt={site.displayName}
              className="h-7 w-7 rounded-md object-contain"
              height={28}
              priority
              src={site.logoUrl ?? "/brand/logo/usam-website-logo.png"}
              width={28}
            />
            {site.displayName}
          </Link>
          <span className={communityChipMuted}>Groups</span>
        </header>

        <section className="mt-6">
          <h1 className="text-3xl font-black leading-tight tracking-tight text-[#0F172A] sm:text-4xl">
            Find a group near you.
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#475569]">
            Groups meeting in real rhythms, led by people you can actually sit with. Request to join and a leader
            will follow up.
          </p>
        </section>

        {groups.length ? (
          <section className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {groups.map((group) => (
              <Link
                className={`group flex flex-col overflow-hidden ${communityCardInteractive}`}
                href={publicGroupPath(group.slug, site)}
                key={group.slug}
              >
                <GroupTemplateArtwork input={group} />
                <span className="flex flex-1 flex-col p-4">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className={communityChip}>{group.type}</span>
                    {group.location ? <span className={communityChipMuted}>{group.location}</span> : null}
                  </span>
                  <span className="mt-3 block text-xl font-black leading-tight text-[#0F172A]">{group.name}</span>
                  <span className="mt-1 block text-sm font-bold text-[#1D4ED8]">{group.tagline}</span>
                  <span className="mt-2 block text-sm font-semibold leading-6 text-[#64748B]">
                    {formatLeaderLine(group.leaders)}
                  </span>

                  <span className="mt-auto block pt-4">
                    <span className="block rounded-2xl bg-[#F8FBFF] px-3 py-2.5">
                      <span className={communityFieldLabel}>{group.schedule.isDated ? "Next gathering" : "Meets"}</span>
                      <span className="mt-1 block text-sm font-bold text-[#0F172A]">{group.schedule.headline}</span>
                      <span className="mt-0.5 block text-xs font-semibold text-[#64748B]">{group.schedule.detail}</span>
                    </span>
                  </span>
                </span>
              </Link>
            ))}
          </section>
        ) : (
          <section className={`mt-6 p-6 ${communityCard}`}>
            <p className="text-base font-black text-[#0F172A]">No public groups yet.</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-[#64748B]">
              Groups appear here once a leader publishes them.
            </p>
          </section>
        )}

        <footer className="mt-auto pt-8 text-center text-xs font-bold text-[#64748B]">
          Powered by{" "}
          <Link className="text-[#1D4ED8] underline-offset-4 hover:underline" href="https://usamissionaries.org">
            {site.displayName}
          </Link>
        </footer>
      </div>
    </main>
  );
}
