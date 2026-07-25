import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Home, type LucideIcon } from "lucide-react";
import { PrimaryNav } from "@/components/PrimaryNav";
import { domainSites, type DomainSiteConfig } from "@/src/lib/domain-sites";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

const usamHref = domainSites.usam.canonicalOrigin;
const usamNavHrefs = {
  briefing: `${usamHref}/briefing`,
  mission: usamHref,
  prayer: `${usamHref}/prayer`,
  support: `${usamHref}/support`,
  system: `${usamHref}/system`,
} as const;

type DomainMarketingPageProps = {
  accent: "amber" | "blue";
  attribution: string;
  body: string;
  heroImage: {
    alt: string;
    src: string;
  };
  highlights: readonly string[];
  icon: LucideIcon;
  site: DomainSiteConfig;
};

function accentClasses(accent: DomainMarketingPageProps["accent"]) {
  return accent === "blue"
    ? {
        border: "border-[#378ADD]/35",
        fill: "bg-[#378ADD]",
        soft: "bg-[#378ADD]/[0.12]",
        text: "text-[#7FB8F0]",
      }
    : {
        border: "border-usam-gold/35",
        fill: "bg-usam-gold",
        soft: "bg-usam-gold/[0.12]",
        text: "text-usam-gold",
      };
}

export function DomainMarketingPage({
  accent,
  attribution,
  body,
  heroImage,
  highlights,
  icon: Icon,
  site,
}: DomainMarketingPageProps) {
  const accentClass = accentClasses(accent);

  return (
    <main className="min-h-screen overflow-hidden bg-[#0D0D0D] text-stone-100">
      <PrimaryNav
        active="system"
        brandHref={usamHref}
        hrefOverrides={usamNavHrefs}
      />

      <section className="relative overflow-hidden border-b border-stone-900/80 px-6 pb-16 pt-28 md:pb-24 md:pt-36">
        <Image
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-[0.2]"
          fill
          priority
          sizes="100vw"
          src={heroImage.src}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#0D0D0D_0%,rgba(13,13,13,0.88)_42%,rgba(13,13,13,0.64)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.016)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.016)_1px,transparent_1px)] bg-[length:72px_72px]" />

        <div className="relative mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_0.88fr] lg:items-center">
          <div className="max-w-3xl">
            <p
              className={`inline-flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.28em] ${accentClass.text}`}
              style={{ fontFamily: font.rajdhani }}
            >
              <span className={`h-1.5 w-1.5 ${accentClass.fill}`} />
              {attribution}
            </p>
            <h1
              className="mt-7 text-5xl font-bold uppercase leading-[0.92] text-stone-100 sm:text-6xl md:text-7xl"
              style={{ fontFamily: font.oswald }}
            >
              {site.siteName}
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-200 md:text-xl md:leading-9">
              {body}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                className={`inline-flex min-h-12 items-center justify-center gap-2 border ${accentClass.border} ${accentClass.soft} px-5 text-center text-xs font-bold uppercase tracking-[0.22em] ${accentClass.text} transition-colors duration-200 hover:bg-white/[0.04]`}
                href={`${usamHref}/system`}
                style={{ fontFamily: font.rajdhani }}
              >
                USA Missionaries System
                <ArrowRight className="h-4 w-4" aria-hidden="true" strokeWidth={2} />
              </Link>
              <Link
                className="inline-flex min-h-12 items-center justify-center gap-2 border border-stone-700 bg-black/35 px-5 text-center text-xs font-bold uppercase tracking-[0.22em] text-stone-100 transition-colors duration-200 hover:border-usam-gold hover:text-usam-gold"
                href={usamHref}
                style={{ fontFamily: font.rajdhani }}
              >
                <Home className="h-4 w-4" aria-hidden="true" strokeWidth={2} />
                USA Missionaries
              </Link>
            </div>
          </div>

          <div className="border border-stone-800/75 bg-black/50 p-4 shadow-[0_22px_70px_rgba(0,0,0,0.42)] md:p-5">
            <div className="relative aspect-[4/3] overflow-hidden border border-stone-800/80">
              <Image
                alt={heroImage.alt}
                className="h-full w-full object-cover"
                fill
                sizes="(min-width: 1024px) 42vw, 100vw"
                src={heroImage.src}
              />
            </div>
            <div className="mt-5 flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center border ${accentClass.border} ${accentClass.soft} ${accentClass.text}`}>
                <Icon className="h-5 w-5" aria-hidden="true" strokeWidth={1.8} />
              </div>
              <p className="text-sm leading-6 text-stone-300">
                Sent and covered by USA Missionaries, connected to shared System navigation.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          {highlights.map((highlight) => (
            <div className="border border-stone-800/70 bg-black/45 p-6" key={highlight}>
              <CheckCircle2 className={`h-5 w-5 ${accentClass.text}`} aria-hidden="true" strokeWidth={1.8} />
              <p className="mt-4 text-sm leading-7 text-stone-300">{highlight}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
