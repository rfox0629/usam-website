import type { Metadata } from "next";
import { PrimaryNav } from "../../components/PrimaryNav";
import { PrayerTeamApplicationModal } from "./PrayerTeamApplicationModal";

export const metadata: Metadata = {
  title: "Prayer | USA Missionaries",
  description: "Join the prayer team and stand with the mission in prayer.",
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

const prayerRows = [
  { focus: "Kitchen Tables", status: "Covered", tone: "amber" },
  { focus: "Missionary Couples", status: "Covered", tone: "emerald" },
  { focus: "Leaders", status: "Covered", tone: "amber" },
  { focus: "Cities", status: "Covered", tone: "emerald" },
  { focus: "Government", status: "Covered", tone: "amber" },
  { focus: "Finances", status: "Covered", tone: "emerald" },
] as const;

const prayerCards = [
  {
    body: "Pray over the homes, conversations, and follow up happening through Kitchen Table ministry.",
    title: "Cover the Tables",
  },
  {
    body: "Receive key prayer needs for missionaries, leaders, families, cities, and open doors.",
    title: "Strengthen the Field",
  },
  {
    body: "Support the work from wherever you are through faithful, confidential intercession.",
    title: "Stand Behind the Mission",
  },
  {
    body: "Celebrate answered prayer, breakthrough, salvations, healing, and multiplication.",
    title: "Pray Until Fruit Comes",
  },
] as const;

function PrayerCoverageBoard() {
  return (
    <div className="relative border border-stone-800/80 bg-[#060606]/95 shadow-[0_0_36px_rgba(0,0,0,0.45)]">
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.018),rgba(255,255,255,0.018)_1px,transparent_1px,transparent_5px)]" />

      <div className="relative border-b border-stone-800/70 px-4 py-4 md:px-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_14px_rgba(245,158,11,0.38)]" />
            <span
              className="truncate text-[10px] uppercase tracking-[0.26em] text-stone-400"
              style={{ fontFamily: font.rajdhani }}
            >
              Prayer // Coverage Board
            </span>
          </div>
          <span className="shrink-0 text-right text-[10px] text-stone-500">v0.1.0-prayer</span>
        </div>
      </div>

      <div className="relative divide-y divide-stone-900/80">
        {prayerRows.map((row) => (
          <div key={row.focus} className="grid min-h-[62px] grid-cols-[1fr_auto] items-center gap-4 px-4 py-4 md:px-5">
            <p className="text-sm uppercase tracking-[0.14em] text-stone-200" style={{ fontFamily: font.rajdhani }}>
              {row.focus}
            </p>
            <span
              className={`inline-flex px-2.5 py-1.5 text-[10px] uppercase tracking-[0.16em] ${
                row.tone === "emerald"
                  ? "bg-emerald-950/70 text-emerald-400"
                  : "bg-amber-950/60 text-amber-400"
              }`}
              style={{ fontFamily: font.rajdhani }}
            >
              {row.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

type SearchParams = {
  join?: string;
  previewForm?: string;
};

export default async function PrayerPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const shouldOpenApplication = params.join === "1" || params.previewForm === "prayer_team_application";

  return (
    <main className="min-h-screen bg-[#050505] text-stone-100">
      <PrimaryNav active="prayer" />

      <section className="relative overflow-hidden border-b border-stone-900/80 px-6 pb-14 pt-28 md:pb-20 md:pt-32">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[length:64px_64px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(245,158,11,0.06),transparent_24%),linear-gradient(180deg,rgba(5,5,5,0.15),#050505_88%)]" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_0.92fr] lg:gap-14">
          <div className="max-w-[660px]">
            <p className="text-[11px] uppercase tracking-[0.32em] text-amber-500/80" style={{ fontFamily: font.rajdhani }}>
              PRAYER TEAM
            </p>
            <h1
              className="mt-6 text-5xl font-bold uppercase leading-[0.92] tracking-tight text-stone-100 md:text-7xl"
              style={{ fontFamily: font.oswald }}
            >
              COVER THE FIELD
              <br />
              IN PRAYER
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-200 md:text-xl">
              Every table, every missionary, every open door needs prayer covering. Join a trusted team of intercessors standing behind the work as the Gospel moves from homes to cities.
            </p>
            <p className="mt-5 max-w-2xl text-base leading-8 text-stone-400 md:text-lg">
              Prayer is not secondary to the mission. It is part of the mission. As USA Missionaries sends and supports disciple makers, prayer partners help cover the people, the conversations, the leaders, the cities, and the needs that come with advancing the Kingdom.
            </p>
            <div className="mt-8">
              <PrayerTeamApplicationModal initialOpen={shouldOpenApplication}>
                Join the Prayer Team
              </PrayerTeamApplicationModal>
            </div>
          </div>

          <div className="lg:justify-self-end lg:w-full lg:max-w-[520px]">
            <PrayerCoverageBoard />
          </div>
        </div>
      </section>

      <section className="bg-[#080808] px-6 py-20 md:py-24">
        <div className="mx-auto max-w-6xl">
          <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
            WHAT YOU&apos;RE JOINING
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {prayerCards.map((card, index) => (
              <div key={card.title} className="border border-stone-700/70 bg-[#101010] p-6 shadow-[0_18px_36px_rgba(0,0,0,0.18)] md:p-7">
                <div className="text-xs uppercase tracking-[0.16em] text-amber-400" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  0{index + 1}
                </div>
                <h3 className="mt-4 text-2xl uppercase leading-tight text-stone-100" style={{ fontFamily: font.oswald }}>
                  {card.title}
                </h3>
                <p className="mt-4 text-base leading-7 text-stone-300">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
