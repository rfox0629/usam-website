import type { Metadata } from "next";
import Link from "next/link";
import { PrimaryNav } from "../../components/PrimaryNav";
import {
  SHOW_SUPPORTING_CHURCHES,
  ecosystemFlagships,
  ecosystemOperatingSequence,
  strategicPartners,
  supportingChurches,
} from "@/src/lib/ecosystem-content";

export const metadata: Metadata = {
  title: "Ecosystem | USA Missionaries",
  description: "Everything USA Missionaries uses to train, equip, and deploy disciple makers.",
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] uppercase tracking-[0.32em] text-usam-gold/80" style={{ fontFamily: font.rajdhani }}>
      {children}
    </p>
  );
}

function ExternalLink({
  children,
  href,
  variant = "primary",
}: {
  children: React.ReactNode;
  href: string;
  variant?: "primary" | "secondary";
}) {
  const className = variant === "primary"
    ? "border-usam-gold bg-usam-gold text-black hover:bg-transparent hover:text-usam-gold"
    : "border-stone-700 bg-black/30 text-stone-200 hover:border-usam-gold hover:text-usam-gold";

  return (
    <a
      className={`inline-flex min-h-11 items-center justify-center border px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] transition-colors ${className}`}
      href={href}
      rel="noreferrer"
      target="_blank"
      style={{ fontFamily: font.rajdhani }}
    >
      {children}
    </a>
  );
}

export default function EcosystemPage() {
  const isProduction = process.env.VERCEL_ENV === "production";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0D0D0D] text-stone-100">
      <PrimaryNav active="dos" />

      <section className="relative overflow-hidden border-b border-stone-900/80 px-4 pb-16 pt-28 sm:px-6 md:pb-24 md:pt-36">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[length:72px_72px]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0D0D0D] to-transparent" />

        <div className="relative mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div className="max-w-3xl">
            <SectionLabel>The USA Missionaries Ecosystem</SectionLabel>
            <h1
              className="mt-7 text-6xl font-bold uppercase leading-none text-stone-100 md:text-8xl lg:text-9xl"
              style={{ fontFamily: font.oswald }}
            >
              Train. Equip. Deploy.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-300 md:text-xl">
              Everything we use to train, equip, and deploy disciple makers.
            </p>
          </div>

          <div className="border border-stone-800/80 bg-black/50 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.38)]">
            <div className="grid gap-px bg-stone-800/80">
              {ecosystemOperatingSequence.map((step, index) => (
                <div key={step.label} className="bg-[#0D0D0D] p-5">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase tracking-[0.28em] text-usam-gold/80" style={{ fontFamily: font.rajdhani }}>
                      0{index + 1}
                    </span>
                    <h2 className="text-2xl font-bold uppercase text-stone-100" style={{ fontFamily: font.oswald }}>
                      {step.label}
                    </h2>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-stone-400">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <SectionLabel>Flagship Initiatives</SectionLabel>
            <h2 className="mt-5 text-4xl font-bold uppercase leading-tight text-stone-100 md:text-5xl" style={{ fontFamily: font.oswald }}>
              Two USA Missionaries-developed tools carry the ecosystem.
            </h2>
          </div>

          <div className="mt-10 space-y-7">
            {ecosystemFlagships.map((initiative) => (
              <article key={initiative.title} className="border border-stone-800/80 bg-black/45 p-5 md:p-8">
                <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.28em] text-usam-gold/80" style={{ fontFamily: font.rajdhani }}>
                      {initiative.label}
                    </p>
                    <h3 className="mt-4 text-4xl font-bold uppercase leading-none text-stone-100 md:text-6xl" style={{ fontFamily: font.oswald }}>
                      {initiative.title}
                    </h3>
                    <p className="mt-6 max-w-xl text-base leading-8 text-stone-300">{initiative.body}</p>
                    <div className="mt-7">
                      <ExternalLink href={isProduction ? initiative.href : initiative.previewHref}>{initiative.cta}</ExternalLink>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {initiative.points.map((point) => (
                      <div key={point} className="border border-stone-800/80 bg-[#0D0D0D] px-4 py-4 text-sm leading-6 text-stone-300">
                        {point}
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-stone-900/80 bg-black/35 px-4 py-14 sm:px-6 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <SectionLabel>How USA Missionaries Operates</SectionLabel>
              <h2 className="mt-5 text-4xl font-bold uppercase leading-tight text-stone-100 md:text-5xl" style={{ fontFamily: font.oswald }}>
                A clear path from formation to field.
              </h2>
            </div>

            <div className="grid gap-px bg-stone-800/80 md:grid-cols-3">
              {ecosystemOperatingSequence.map((step, index) => (
                <div key={step.label} className="bg-[#0D0D0D] p-6">
                  <span className="text-[10px] uppercase tracking-[0.28em] text-usam-gold/75" style={{ fontFamily: font.rajdhani }}>
                    0{index + 1}
                  </span>
                  <h3 className="mt-4 text-3xl font-bold uppercase text-stone-100" style={{ fontFamily: font.oswald }}>
                    {step.label}
                  </h3>
                  <p className="mt-4 text-sm leading-6 text-stone-400">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <SectionLabel>Strategic Partners</SectionLabel>
            <h2 className="mt-5 text-4xl font-bold uppercase leading-tight text-stone-100 md:text-5xl" style={{ fontFamily: font.oswald }}>
              Partner ministries remain distinct.
            </h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {strategicPartners.map((partner) => (
              <article key={partner.title} className="border border-stone-800/80 bg-black/35 p-6">
                <p className="text-[11px] uppercase tracking-[0.28em] text-usam-gold/80" style={{ fontFamily: font.rajdhani }}>
                  {partner.label}
                </p>
                <h3 className="mt-4 text-3xl font-bold uppercase text-stone-100" style={{ fontFamily: font.oswald }}>
                  {partner.title}
                </h3>
                <p className="mt-4 text-sm leading-6 text-stone-400">{partner.body}</p>
                <div className="mt-6">
                  <ExternalLink href={partner.href} variant="secondary">
                    Visit Partner
                  </ExternalLink>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {SHOW_SUPPORTING_CHURCHES ? (
        <section className="border-t border-stone-900/80 px-4 py-14 sm:px-6 md:py-20">
          <div className="mx-auto max-w-6xl">
            <SectionLabel>Supporting Churches</SectionLabel>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {supportingChurches.map((church) => (
                <article key={church.name} className="border border-stone-800/80 bg-black/35 p-6">
                  <h2 className="text-3xl font-bold uppercase text-stone-100" style={{ fontFamily: font.oswald }}>
                    {church.name}
                  </h2>
                  <p className="mt-4 text-sm leading-6 text-stone-400">{church.quote}</p>
                  <Link className="mt-5 inline-flex text-sm text-usam-gold" href={church.website}>
                    Church Website
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
