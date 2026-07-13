import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getCanonicalSiteUrl } from "@/src/lib/site-url";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type PublicDirectoryGroup = {
  description: string;
  location: string;
  name: string;
  nextGathering: string;
  rhythm: string;
  scriptureReference: string;
  slug: string;
  tagline: string;
  type: string;
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
    location: "Lebanon Hills Trailhead, Eagan, MN",
    name: "2three2",
    nextGathering: "Saturdays at 7:00 AM",
    rhythm: "Weekly · Saturday · 7:00 AM",
    scriptureReference: "2 Timothy 2:22",
    slug: "2three2",
    tagline: "Run. Pray. Pursue.",
    type: "2three2 Running",
  },
  {
    description: "A weekly gathering focused on Scripture, accountability, prayer, and helping men pursue Christ together.",
    location: "Location TBD",
    name: "Tuesday Men's Group",
    nextGathering: "Tuesdays at 6:00 AM",
    rhythm: "Weekly · Tuesday · 6:00 AM",
    scriptureReference: "",
    slug: "tuesday-mens-group",
    tagline: "Grow together.",
    type: "Men's Group",
  },
  {
    description: "An evening gathering where men encourage one another, study Scripture, pray together, and build authentic Christian community.",
    location: "Location TBD",
    name: "Wednesday Men's Group",
    nextGathering: "Wednesday evenings",
    rhythm: "Weekly · Wednesday · Evening",
    scriptureReference: "",
    slug: "wednesday-mens-group",
    tagline: "Brotherhood. Prayer. Discipleship.",
    type: "Men's Group",
  },
];

const groupsTitle = "Groups | USA Missionaries";
const groupsDescription = "Find discipleship groups connected to USA Missionaries.";
const groupsShareImage = "/images/usam/groups-share.png";
const groupsUrl = `${getCanonicalSiteUrl()}/groups`;

export const metadata: Metadata = {
  alternates: {
    canonical: groupsUrl,
  },
  description: groupsDescription,
  openGraph: {
    description: groupsDescription,
    images: [
      {
        alt: "USA Missionaries Discipleship Groups",
        height: 630,
        url: groupsShareImage,
        width: 1200,
      },
    ],
    siteName: "USA Missionaries",
    title: groupsTitle,
    type: "website",
    url: groupsUrl,
  },
  title: groupsTitle,
  twitter: {
    card: "summary_large_image",
    description: groupsDescription,
    images: [groupsShareImage],
    title: groupsTitle,
  },
};

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

    return `2three2 ${activityLabel}`;
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

async function loadPublicDirectoryGroups(): Promise<PublicDirectoryGroup[]> {
  if (!isSupabaseAdminConfigured()) {
    return fallbackPublicDirectoryGroups;
  }

  const supabase = createSupabaseAdminClient();
  const { data: groups, error } = await supabase
    .from("dos_groups")
    .select("id, name, slug, description, tagline, scripture_reference, type, rhythm_label, default_location, audience, activity_type")
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) {
    console.warn("[Public Groups] Unable to load directory", error.message);
    return [];
  }

  const groupRows = (groups ?? []) as PublicDirectoryGroupRow[];
  const groupIds = groupRows.map((group) => group.id).filter(Boolean);
  const nextGatheringsByGroupId = new Map<string, { location: string | null; starts_at: string | null; title: string | null }>();

  if (groupIds.length) {
    const { data: gatherings, error: gatheringsError } = await supabase
      .from("dos_group_gatherings")
      .select("group_id, title, starts_at, location")
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
        location: gathering.location ?? null,
        starts_at: gathering.starts_at ?? null,
        title: gathering.title ?? null,
      });
    }
  }

  return groupRows.map((group) => {
    const nextGathering = nextGatheringsByGroupId.get(group.id);
    const nextGatheringDate = formatPublicDirectoryDate(nextGathering?.starts_at);

    return {
      description: group.description ?? "A recurring discipleship rhythm.",
      location: nextGathering?.location ?? group.default_location ?? "Location TBD",
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
  const groups = await loadPublicDirectoryGroups();

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-8 lg:px-10">
        <div className="flex flex-1 flex-col gap-5">
          <header className="overflow-hidden rounded-[28px] border border-[#DCEBFF] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <div className="relative isolate bg-[#06111F] px-5 py-10 text-white sm:px-8 lg:px-10">
              <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_82%_18%,rgba(248,197,106,0.28),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0),rgba(2,6,23,0.72))]" aria-hidden="true" />
              <Link className="inline-flex items-center gap-3" href="/">
                <Image alt="USA Missionaries" className="h-8 w-8 rounded-sm object-contain" height={32} priority src="/brand/logo/usam-website-logo.png" width={32} />
                <span className="text-xs font-black uppercase tracking-[0.18em] text-[#F8C56A]">USA Missionaries Groups</span>
              </Link>
              <h1 className="mt-4 max-w-3xl text-4xl font-black leading-none tracking-tight sm:text-5xl">Find a discipleship rhythm.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/78">
                Explore public discipleship rhythms connected with USA Missionaries and request information from a group leader.
              </p>
            </div>
          </header>
          {groups.length ? (
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {groups.map((group) => (
                <Link
                  className="flex min-h-[260px] flex-col rounded-[24px] border border-[#DCEBFF] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.055)] transition-colors hover:border-[#93C5FD] hover:bg-[#FBFDFF]"
                  href={`/groups/${group.slug}`}
                  key={group.slug}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="rounded-full bg-[#EBF2FF] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#2563EB]">{group.type}</span>
                    {group.scriptureReference ? <span className="text-xs font-black text-[#64748B]">{group.scriptureReference}</span> : null}
                  </span>
                  <span className="mt-5 block text-2xl font-black leading-tight text-[#0F172A]">{group.name}</span>
                  <span className="mt-1 block text-sm font-black text-[#2563EB]">{group.tagline}</span>
                  <span className="mt-4 block text-xs font-black uppercase tracking-[0.12em] text-[#64748B]">{group.rhythm}</span>
                  <span className="mt-2 line-clamp-3 block text-sm leading-6 text-[#475569]">{group.description}</span>
                  <span className="mt-auto grid gap-1 pt-5 text-sm font-bold text-[#0F172A]">
                    <span>{group.nextGathering}</span>
                    <span className="text-[#64748B]">{group.location}</span>
                  </span>
                </Link>
              ))}
            </section>
          ) : (
            <section className="rounded-[24px] border border-[#DCEBFF] bg-white p-6 text-sm leading-6 text-[#64748B] shadow-[0_14px_34px_rgba(15,23,42,0.055)]">
              <p className="font-black text-[#0F172A]">No public groups yet.</p>
              <p className="mt-1">Groups will appear here when they are ready to share publicly.</p>
            </section>
          )}
        </div>
        <footer className="pt-6 text-center text-xs font-bold text-[#64748B]">
          Powered by{" "}
          <Link className="text-[#1D4ED8] underline-offset-4 hover:underline" href="https://usamissionaries.org">
            USA Missionaries
          </Link>
        </footer>
      </section>
    </main>
  );
}
