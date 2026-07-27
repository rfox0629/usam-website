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
  publicGroupsDirectoryPath,
  requestHostname,
  resolvePublicSiteForHost,
  type PublicSiteConfig,
} from "@/src/lib/groups/public-site";
import { groupDisplayTimeZone } from "@/src/lib/groups/timezone";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import { formatLeaderLine, GroupTemplateArtwork } from "./GroupTemplateVisual";

type PublicDirectoryGroup = {
  description: string;
  leaders: string[];
  location: string;
  name: string;
  nextGathering: string;
  rhythm: string;
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
    description: "A men's discipleship community where we run together, pair up two-by-two, pray for one another, and pursue righteousness, faith, love, and peace.",
    leaders: ["Ryan Fox"],
    location: "Lebanon Hills Trailhead, Eagan, MN",
    name: "2three2",
    nextGathering: "Saturdays at 7:00 AM",
    rhythm: "Weekly · Saturday · 7:00 AM",
    scriptureReference: "2 Timothy 2:22",
    slug: "2three2",
    tagline: "Run. Pray. Pursue.",
    type: "Running Community",
  },
  {
    description: "A weekly gathering focused on Scripture, accountability, prayer, and helping men pursue Christ together.",
    leaders: ["Ryan Fox"],
    location: "Location TBD",
    name: "Tuesday Men's Community",
    nextGathering: "Tuesdays at 6:00 AM",
    rhythm: "Weekly · Tuesday · 6:00 AM",
    scriptureReference: "",
    slug: "tuesday-mens-group",
    tagline: "Grow together.",
    type: "Men's Community",
  },
  {
    description: "An evening gathering where men encourage one another, study Scripture, pray together, and build authentic Christian community.",
    leaders: ["Ryan Fox"],
    location: "Location TBD",
    name: "Wednesday Men's Community",
    nextGathering: "Wednesday evenings",
    rhythm: "Weekly · Wednesday · Evening",
    scriptureReference: "",
    slug: "wednesday-mens-group",
    tagline: "Brotherhood. Prayer. Discipleship.",
    type: "Men's Community",
  },
];

const groupsShareImage = "/images/usam/groups-share.png";

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = requestHostname(headersList);
  const site = isSupabaseAdminConfigured()
    ? (await resolvePublicSiteForHost(createSupabaseAdminClient(), host)).site ?? fallbackUsamPublicSite
    : fallbackUsamPublicSite;
  const directoryPath = publicGroupsDirectoryPath(site);
  const url = site.id
    ? `https://${site.hostname}${directoryPath}`
    : `${getCanonicalSiteUrl()}${directoryPath}`;
  const title = `Community | ${site.displayName}`;
  const description = `Find discipleship communities connected to ${site.displayName}.`;

  return {
  alternates: {
    canonical: url,
  },
  description,
  openGraph: {
    description,
    images: [
      {
        alt: `${site.displayName} Discipleship Community`,
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

function formatPublicDirectoryDate(value: string | null | undefined) {
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
    timeZone: groupDisplayTimeZone,
    weekday: "long",
  }).format(date);
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

    return `${activityLabel} Community`;
  }

  if (name.toLowerCase().includes("men")) {
    return "Men's Community";
  }

  if (value === "running") {
    return "Running Community";
  }

  if (value === "mens" || value === "men") {
    return "Men's Community";
  }

  return "Discipleship Community";
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
    const nextGatheringDate = formatPublicDirectoryDate(nextGathering?.starts_at);

    return {
      description: group.description ?? "A recurring discipleship rhythm.",
      leaders: leadersByGroupId.get(group.id) ?? [],
      location: group.default_location ?? "Location shared after leader confirmation",
      name: group.name,
      nextGathering: nextGathering ? `${nextGathering.title ?? "Next gathering"} · ${nextGatheringDate || "Time TBD"}` : "Upcoming gathering TBD",
      rhythm: group.rhythm_label ?? "Recurring",
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
    <main className="min-h-screen bg-[#080A0D] text-[#F5F3EE]">
      <section className="relative isolate mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-8 lg:px-10">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-30 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:28px_28px]"
        />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-20 h-64 bg-[linear-gradient(110deg,rgba(248,197,106,0.18),transparent_58%)]" />
        <div className="flex flex-1 flex-col gap-6">
          <header className="border-b border-white/10 pb-6 text-white">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link className="inline-flex min-w-0 items-center gap-3" href="/">
                <Image alt={site.displayName} className="h-8 w-8 rounded-sm object-contain" height={32} priority src={site.logoUrl ?? "/brand/logo/usam-website-logo.png"} width={32} />
                <span className="min-w-0 truncate text-xs font-black uppercase tracking-[0.18em] text-[#F8C56A]">{site.displayName}</span>
              </Link>
              <span className="rounded-sm border border-[#C2A14E]/35 bg-[#C2A14E]/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#F8C56A]">
                Community
              </span>
            </div>
            <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-end">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F8C56A]">Meet · Connect · Pray</p>
                <h1 className="mt-3 max-w-3xl text-4xl font-black leading-none text-white sm:text-5xl">Community by {site.displayName}.</h1>
                <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/70">
                  Public rhythms. Leader operated. Organization published.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
                <DirectoryExpectation label="Meet" note="Recurring rhythms" />
                <DirectoryExpectation label="Connect" note="Leader guided" />
                <DirectoryExpectation label="Pray" note="Shared next steps" />
              </div>
            </div>
          </header>
          {groups.length ? (
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {groups.map((group) => (
                <Link
                  className="group flex h-full min-h-[22rem] min-w-0 flex-col overflow-hidden rounded-lg border border-white/10 bg-[#101317] shadow-[0_18px_48px_rgba(0,0,0,0.28)] transition-colors hover:border-[#C2A14E]/55 hover:bg-[#13171D]"
                  href={publicGroupPath(group.slug, site)}
                  key={group.slug}
                >
                  <GroupTemplateArtwork input={group} />
                  <span className="flex min-w-0 flex-1 flex-col p-4">
                    {group.scriptureReference ? <span className="text-xs font-black text-white/52">{group.scriptureReference}</span> : null}
                    <span className={group.scriptureReference ? "mt-4 block break-words text-2xl font-black leading-tight text-white" : "block break-words text-2xl font-black leading-tight text-white"}>{group.name}</span>
                    <span className="mt-1 block text-sm font-black text-[#F8C56A]">{group.tagline}</span>
                    <span className="mt-3 block text-sm font-semibold text-white/70">{formatLeaderLine(group.leaders)}</span>
                    <span className="mt-auto grid min-w-0 gap-2 pt-5 text-sm font-bold text-white">
                      <span className="grid gap-1 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/38">Schedule</span>
                        <span className="break-words">{group.rhythm}</span>
                      </span>
                      <span className="grid gap-1 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/38">Next</span>
                        <span className="break-words">{group.nextGathering}</span>
                      </span>
                      <span className="break-words text-white/60">{group.location}</span>
                    </span>
                  </span>
                </Link>
              ))}
            </section>
          ) : (
            <section className="rounded-lg border border-white/10 bg-[#111418] p-6 text-sm leading-6 text-white/65 shadow-[0_18px_48px_rgba(0,0,0,0.22)]">
              <p className="font-black text-white">No public communities yet.</p>
              <p className="mt-1 text-white/65">Communities will appear here when they are ready to share publicly.</p>
            </section>
          )}
        </div>
        <footer className="pt-6 text-center text-xs font-bold text-white/45">
          Powered by{" "}
          <Link className="text-[#F8C56A] underline-offset-4 hover:underline" href="https://usamissionaries.org">
            {site.displayName}
          </Link>
        </footer>
      </section>
    </main>
  );
}

function DirectoryExpectation({ label, note }: { label: string; note: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#F8C56A]">{label}</p>
      <p className="mt-1 text-sm font-bold leading-5 text-white/70">{note}</p>
    </div>
  );
}
