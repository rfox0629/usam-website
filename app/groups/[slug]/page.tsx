import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

const publicGroups = {
  "2three2": {
    description: "A men's discipleship group where we run together, pair up two-by-two, pray for one another, and pursue righteousness, faith, love, and peace.",
    location: "Lebanon Hills Trailhead, Eagan, MN",
    name: "2three2",
    nextGathering: "Saturday Run & Prayer · Saturdays at 7:00 AM",
    rhythm: "Weekly · Saturday · 7:00 AM",
    scriptureReference: "2 Timothy 2:22",
    scriptureText: "Flee also youthful lusts; but pursue righteousness, faith, love, peace with those who call on the Lord out of a pure heart.",
    tagline: "Run. Pray. Pursue.",
    typicalSchedule: ["Meet at the trailhead", "Run in pairs", "Pray as you go", "Regroup and share next steps"],
    whatToExpect: ["A steady weekly rhythm", "Two-by-two prayer during the run", "Simple follow-up and encouragement"],
    whoThisIsFor: ["Men pursuing Christ", "Runners of any normal training pace", "Men who want accountability, prayer, and brotherhood"],
  },
} as const;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const group = publicGroups[slug as keyof typeof publicGroups];

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
  const group = publicGroups[slug as keyof typeof publicGroups];

  if (!group) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <div className="flex flex-1 flex-col justify-center gap-6">
          <div className="overflow-hidden rounded-[28px] border border-[#DCEBFF] bg-white shadow-[0_22px_60px_rgba(15,23,42,0.08)]">
            <div className="bg-[#0B1120] px-6 py-10 text-white sm:px-8 lg:px-10">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#F8C56A]">{group.scriptureReference}</p>
              <h1 className="mt-3 text-5xl font-black leading-none tracking-tight sm:text-6xl">{group.name}</h1>
              <p className="mt-3 text-xl font-black text-[#F8C56A]">{group.tagline}</p>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/78">"{group.scriptureText}"</p>
            </div>
            <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:p-10">
              <div>
                <p className="text-base leading-8 text-[#334155]">{group.description}</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <InfoTile label="Rhythm" value={group.rhythm} />
                  <InfoTile label="Location" value={group.location} />
                  <InfoTile label="Upcoming" value={group.nextGathering} />
                </div>
              </div>
              <aside className="rounded-[22px] border border-[#DCEBFF] bg-[#F8FBFF] p-5">
                <p className="text-sm font-black text-[#0F172A]">Request Information</p>
                <p className="mt-2 text-sm leading-6 text-[#475569]">Share interest and a group leader will follow up when public group intake is ready.</p>
                <button className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#2563EB] px-4 text-sm font-black text-white" type="button">
                  Join Group
                </button>
              </aside>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <PublicGroupSection items={group.whatToExpect} title="What to Expect" />
            <PublicGroupSection items={group.typicalSchedule} title="Typical Schedule" />
            <PublicGroupSection items={group.whoThisIsFor} title="Who This Is For" />
          </div>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-[22px] border border-[#DCEBFF] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.055)]">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#64748B]">Upcoming Gathering</p>
              <p className="mt-2 text-lg font-black text-[#0F172A]">{group.nextGathering}</p>
              <p className="mt-2 text-sm leading-6 text-[#475569]">{group.location}</p>
            </div>
            <div className="rounded-[22px] border border-[#DCEBFF] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.055)]">
              <p className="text-sm font-black text-[#0F172A]">Request Information</p>
              <button className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[#BFDBFE] bg-white px-4 text-sm font-black text-[#1D4ED8]" type="button">
                Request Info
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
