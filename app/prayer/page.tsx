import type { Metadata } from "next";
import { PrimaryNav } from "../../components/PrimaryNav";

export const metadata: Metadata = {
  title: "Prayer | USA Missionaries",
  description: "Join the prayer team and stand with the mission in prayer.",
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

function ExternalActionLink({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const variantClassName = variant === "primary"
    ? "bg-stone-100 text-stone-950 hover:bg-amber-200"
    : "border border-stone-600 text-stone-300 hover:border-stone-400 hover:text-stone-100";

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`inline-block min-h-[48px] px-7 py-3.5 text-center text-sm uppercase tracking-[0.2em] transition-all duration-300 ${variantClassName} ${className}`}
      style={{ fontFamily: font.rajdhani, fontWeight: 600 }}
    >
      {children}
    </a>
  );
}

const prayerRows = [
  { focus: "Tables", status: "Covered", tone: "amber" },
  { focus: "Couples", status: "Covered", tone: "emerald" },
  { focus: "Leaders", status: "Covered", tone: "amber" },
  { focus: "Major Cities", status: "Covered", tone: "emerald" },
  { focus: "Government", status: "Covered", tone: "amber" },
  { focus: "Finances", status: "Covered", tone: "emerald" },
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
          <div key={row.focus} className="grid min-h-[58px] grid-cols-[1fr_auto] items-center gap-4 px-4 py-4 md:px-5">
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

export default function PrayerPage() {
  const signupLink = "https://usa-missionaries-506166.churchcenter.com/people/forms/1021734";
  const points = [
    "Prayer coverage for the mission",
    "Updates on key needs and opportunities",
    "A way to stand with the work from wherever you are",
    "Participation in what God is doing across cities",
  ];

  return (
    <main className="min-h-screen bg-[#050505] text-stone-100">
      <PrimaryNav active="prayer" />

      <section className="relative overflow-hidden border-b border-stone-900/80 px-6 pb-16 pt-28 md:pb-20 md:pt-36">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[length:64px_64px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(245,158,11,0.06),transparent_24%),linear-gradient(180deg,rgba(5,5,5,0.15),#050505_88%)]" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.32em] text-amber-500/80" style={{ fontFamily: font.rajdhani }}>
              Prayer Team
            </p>
            <h1
              className="mt-7 text-5xl font-bold uppercase leading-[0.92] tracking-tight text-stone-100 md:text-7xl"
              style={{ fontFamily: font.oswald }}
            >
              JOIN THE
              <br />
              PRAYER TEAM
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-stone-400 md:text-xl">
              Stand with the mission in prayer. Cover the work, the leaders, the tables, and the people being reached.
            </p>
            <p className="mt-6 max-w-xl text-base leading-8 text-stone-400 md:text-lg">
              Prayer is not secondary to the mission. It is part of the mission. USA Missionaries depends on faithful prayer coverage for open doors, transformed lives, strengthened leaders, and endurance in the field.
            </p>
            <div className="mt-9">
              <ExternalActionLink href={signupLink}>Join the Prayer Team</ExternalActionLink>
            </div>
          </div>

          <PrayerCoverageBoard />
        </div>
      </section>

      <section className="bg-[#080808] px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
            What You&apos;re Joining
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {points.map((item, index) => (
              <div key={item} className="border border-stone-800/60 bg-stone-950/55 p-6 md:p-7">
                <div className="tactical-amber-label text-xs tracking-[0.14em]" style={{ fontFamily: font.rajdhani }}>
                  0{index + 1}
                </div>
                <p className="mt-4 text-base leading-7 text-stone-300">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-28 md:py-36">
        <div className="mx-auto max-w-4xl text-center">
          <p className="max-w-3xl mx-auto text-base md:text-lg leading-8 text-stone-400">
            Join us in covering the mission with prayer from wherever you are. Faithful intercession helps strengthen the work, sustain the field, and create room for what God is doing across cities.
          </p>
          <div className="mt-10">
            <ExternalActionLink href={signupLink} variant="secondary">Open Prayer Signup</ExternalActionLink>
          </div>
        </div>
      </section>
    </main>
  );
}
