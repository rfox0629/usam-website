import type { Metadata } from "next";
import Link from "next/link";
import { PrimaryNav } from "../../components/PrimaryNav";

export const metadata: Metadata = {
  title: "Support the Mission | USA Missionaries",
  description: "Support page for helping fuel disciple making across cities.",
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

function ActionLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const className = variant === "primary"
    ? "border border-transparent bg-[#F5B942] text-black hover:bg-amber-300 hover:shadow-[0_0_22px_rgba(245,185,66,0.24)]"
    : "border border-white/[0.3] bg-transparent text-white hover:border-amber-400 hover:bg-white/[0.04]";

  return (
    <Link
      href={href}
      className={`inline-flex min-h-12 w-full items-center justify-center px-7 py-3 text-center text-xs uppercase leading-5 tracking-[0.26em] transition-all duration-300 sm:w-auto ${className}`}
      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
    >
      {children}
    </Link>
  );
}

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

export default function SupportPage() {
  const resourceAreas = [
    "Equipping and training leaders",
    "Supporting active missionaries",
    "Expanding into new cities",
    "Building future infrastructure",
  ];

  const givingOptions = [
    {
      title: "Standard Giving",
      description: "One-time or recurring support. Simple and secure.",
      cta: "Give Now",
      href: "https://usa-missionaries-506166.churchcenter.com/giving",
      variant: "primary" as const,
      featured: true,
    },
    {
      title: "Give with Crypto",
      description: "Fast and secure digital asset giving. Ideal for non-cash contributions.",
      cta: "Give Crypto",
      href: "https://crypto.giving/MzktMzYyNzcwOA==",
      variant: "secondary" as const,
      featured: false,
    },
    {
      title: "Give Stock",
      description: "Tax-efficient giving option. Donate appreciated assets.",
      cta: "Give Stock",
      href: "https://stock.giving/MzktMzYyNzcwOA==",
      variant: "secondary" as const,
      featured: false,
    },
  ];

  return (
    <main className="min-h-screen bg-[#050505] text-stone-100">
      <PrimaryNav active="support" />

      <section className="relative overflow-hidden px-6 pb-24 pt-24 md:pb-32 md:pt-32">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[length:72px_72px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(212,160,84,0.1),transparent_26%),radial-gradient(ellipse_at_center,transparent_30%,#050505_100%)]" />
        <div className="relative mx-auto max-w-6xl">
          <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
            Support the Mission
          </p>
          <h1 className="mt-6 text-5xl md:text-7xl font-bold tracking-tight leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
            SUPPORT
            <br />
            THE MISSION
          </h1>
          <p className="mt-8 max-w-3xl text-base md:text-lg leading-8 text-stone-400">
            This work moves through people, presence, and provision. Your support helps deploy and sustain disciple making across cities.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <ActionLink href="#giving">Give Now</ActionLink>
            <ActionLink href="/mission" variant="secondary">View the Briefing</ActionLink>
          </div>
        </div>
      </section>

      <section className="px-6 py-24 md:py-28">
        <div className="mx-auto max-w-6xl">
          <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
            Why Support Matters
          </p>
          <div className="mt-8 grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight text-stone-100" style={{ fontFamily: font.oswald }}>
              SUPPORT
              <br />
              HELPS THE
              <br />
              WORK ENDURE
            </h2>
            <div className="space-y-6 text-base md:text-lg leading-8 text-stone-400">
              <p>Lives are being changed. People are stepping into obedience. The mission is expanding through real relationships, real presence, and real follow-through.</p>
              <p>Support makes continuation possible. It helps strengthen what is already active in the field and creates room for the work to continue with greater reach and greater integrity.</p>
              <p>The need is not abstract. Provision helps sustain faithful labor, strengthen leaders, and support the kind of long-term multiplication that cannot be built on momentum alone.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#080808] px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
            Where Resources Go
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {resourceAreas.map((item, index) => (
              <div key={item} className="border border-stone-800/60 bg-stone-950/55 p-6 md:p-7">
                <div className="tactical-amber-label text-xs tracking-[0.28em]" style={{ fontFamily: font.rajdhani }}>
                  0{index + 1}
                </div>
                <p className="mt-4 text-base leading-7 text-stone-300">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="giving" className="bg-[#080808] px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
            Give to the Mission
          </p>
          <h2 className="mt-5 max-w-4xl text-4xl md:text-5xl font-bold tracking-tight leading-tight text-stone-100" style={{ fontFamily: font.oswald }}>
            GENEROSITY
            <br />
            FUELS THE WORK
          </h2>
          <p className="mt-6 max-w-3xl text-base md:text-lg leading-8 text-stone-400">
            Your generosity helps deploy disciple making across cities, support leaders in the field, and expand the reach of the mission.
          </p>
          <p className="tactical-label mt-8 uppercase" style={{ fontFamily: font.rajdhani }}>
            Choose how you want to support the mission
          </p>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {givingOptions.map((option) => (
              <div
                key={option.title}
                className={`border p-7 md:p-8 ${
                  option.featured
                    ? "border-amber-500/20 bg-[radial-gradient(circle_at_20%_18%,rgba(212,160,84,0.08),transparent_30%),rgba(10,10,10,0.96)] shadow-[0_20px_60px_rgba(0,0,0,0.28)]"
                    : "border-stone-800/60 bg-stone-950/55"
                }`}
              >
                <h3 className={`text-3xl ${option.featured ? "md:text-4xl" : ""} text-stone-100`} style={{ fontFamily: font.oswald }}>
                  {option.title}
                </h3>
                <p className="mt-4 text-base leading-8 text-stone-400">
                  {option.description}
                </p>
                <div className="mt-8">
                  <ExternalActionLink href={option.href} variant={option.variant}>
                    {option.cta}
                  </ExternalActionLink>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-28 md:py-36">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-4xl md:text-6xl font-bold tracking-tight leading-tight text-stone-100" style={{ fontFamily: font.oswald }}>
            This mission moves through people. Thank you for standing with it.
          </p>
        </div>
      </section>
    </main>
  );
}
