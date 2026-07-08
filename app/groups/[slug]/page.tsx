import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type PublicGroup = {
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

const fallbackPublicGroups: Record<string, PublicGroup> = {
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

async function loadPublicGroup(slug: string): Promise<PublicGroup | null> {
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

export default async function PublicGroupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const group = await loadPublicGroup(slug);

  if (!group) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-8 lg:px-10">
        <div className="flex flex-1 flex-col justify-center gap-5">
          <div className="overflow-hidden rounded-[28px] border border-[#DCEBFF] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.1)]">
            <div className="relative isolate overflow-hidden bg-[#06111F] px-5 py-10 text-white sm:px-8 lg:px-10 lg:py-14">
              <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_82%_18%,rgba(248,197,106,0.3),transparent_28%),linear-gradient(135deg,rgba(15,23,42,0),rgba(2,6,23,0.72))]" aria-hidden="true" />
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#F8C56A]">{group.scriptureReference}</p>
              <h1 className="mt-4 text-5xl font-black leading-none tracking-tight sm:text-6xl lg:text-7xl">{group.name}</h1>
              <p className="mt-3 text-2xl font-black text-[#F8C56A]">{group.tagline}</p>
              {group.scriptureText ? <p className="mt-5 max-w-2xl text-sm leading-7 text-white/78">"{group.scriptureText}"</p> : null}
              <div className="mt-7 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/18 bg-white/10 px-3 py-1.5 text-xs font-black text-white">{group.rhythm}</span>
                <span className="rounded-full border border-white/18 bg-white/10 px-3 py-1.5 text-xs font-black text-white">{group.location}</span>
              </div>
            </div>
            <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:p-10">
              <div className="space-y-5">
                <p className="text-base leading-8 text-[#334155]">{group.description}</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <InfoTile label="Rhythm" value={group.rhythm} />
                  <InfoTile label="Location" value={group.location} />
                  <InfoTile label="Upcoming" value={group.nextGathering} />
                </div>
              </div>
              <aside className="rounded-[22px] border border-[#DCEBFF] bg-[#F8FBFF] p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#64748B]">Request Information</p>
                <p className="mt-2 text-xl font-black text-[#0F172A]">Join the rhythm</p>
                <p className="mt-2 text-sm leading-6 text-[#475569]">Share interest and a group leader will follow up when public group intake is ready.</p>
                <div className="mt-4 grid gap-2">
                  <button className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#2563EB] px-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(37,99,235,0.22)]" type="button">
                    Join Group
                  </button>
                  <button className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[#BFDBFE] bg-white px-4 text-sm font-black text-[#1D4ED8]" type="button">
                    Request Info
                  </button>
                </div>
              </aside>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <PublicGroupSection items={group.whatToExpect} title="What to Expect" />
            <PublicGroupSection items={group.typicalSchedule} title="Typical Schedule" />
            <PublicGroupSection items={group.whoThisIsFor} title="Who This Is For" />
          </div>
          <div className="rounded-[24px] border border-[#DCEBFF] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.055)] sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#64748B]">Next Gathering</p>
            <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(13rem,auto)] md:items-center">
              <div>
                <p className="text-xl font-black text-[#0F172A]">{group.nextGathering}</p>
                <p className="mt-2 text-sm leading-6 text-[#475569]">{group.nextGatheringLocation}</p>
              </div>
              <button className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#BFDBFE] bg-white px-5 text-sm font-black text-[#1D4ED8]" type="button">
                Request Information
              </button>
            </div>
          </div>
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

function PublicGroupSection({ items, title }: { items: readonly string[]; title: string }) {
  return (
    <section className="rounded-[22px] border border-[#DCEBFF] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.055)]">
      <h2 className="text-sm font-black text-[#0F172A]">{title}</h2>
      <div className="mt-4 grid gap-2">
        {items.map((item) => (
          <p className="rounded-[16px] bg-[#F8FBFF] px-3 py-2 text-sm font-semibold leading-6 text-[#475569]" key={item}>{item}</p>
        ))}
      </div>
    </section>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[#EAF2FF] bg-white p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#64748B]">{label}</p>
      <p className="mt-1 text-sm font-black leading-5 text-[#0F172A]">{value}</p>
    </div>
  );
}
