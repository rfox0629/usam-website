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
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const className = variant === "primary"
    ? "bg-stone-100 text-stone-950 hover:bg-amber-200"
    : "border border-stone-600 text-stone-300 hover:border-stone-400 hover:text-stone-100";

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`inline-block px-7 py-3 text-sm uppercase tracking-[0.2em] transition-all duration-300 ${className}`}
      style={{ fontFamily: font.rajdhani, fontWeight: 600 }}
    >
      {children}
    </a>
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

      <section className="relative overflow-hidden px-6 pb-24 pt-24 md:pb-32 md:pt-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_24%,rgba(212,160,84,0.1),transparent_24%),linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px),radial-gradient(ellipse_at_center,transparent_34%,#050505_100%)] bg-[length:auto,72px_72px,72px_72px,auto]" />
        <div className="relative mx-auto grid max-w-6xl gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
              Prayer Team
            </p>
            <h1 className="mt-6 text-5xl md:text-7xl font-bold tracking-tight leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
              JOIN THE
              <br />
              PRAYER TEAM
            </h1>
            <p className="mt-8 max-w-2xl text-base md:text-lg leading-8 text-stone-400">
              Stand with the mission in prayer. Join a growing group of people committed to covering this work in prayer.
            </p>
            <p className="mt-6 max-w-2xl text-base md:text-lg leading-8 text-stone-400">
              Prayer is not secondary to the mission. It is part of the mission. This work depends on faithful prayer coverage for open doors, transformed lives, strengthened leaders, and endurance in the field.
            </p>
            <div className="mt-10">
              <ExternalActionLink href={signupLink}>Join the Prayer Team</ExternalActionLink>
            </div>
          </div>

          <div className="relative overflow-hidden border border-stone-800/70 bg-[rgba(8,8,8,0.95)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] md:p-8">
            <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(255,255,255,0.015)_3px,rgba(255,255,255,0.015)_4px)]" />
            <div className="relative">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
                  Join the Prayer Team
                </span>
              </div>
              <p className="mt-5 max-w-xl text-sm leading-7 text-stone-400">
                Join us in praying for open doors, transformed lives, strengthened leaders, and endurance in the field. This is the real prayer team signup flow through Church Center.
              </p>
              <div className="mt-8">
                <ExternalActionLink href={signupLink}>Join the Prayer Team</ExternalActionLink>
              </div>
            </div>
          </div>
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
