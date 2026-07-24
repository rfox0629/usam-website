import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ExternalLink, Handshake, MonitorCheck, Network, Table2 } from "lucide-react";
import { PrimaryNav } from "@/components/PrimaryNav";
import { domainSites } from "@/src/lib/domain-sites";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };
const canonicalUrl = `${domainSites.usam.canonicalOrigin}/ecosystem`;
const socialImage = "/images/usam/default-hero-background.png";

export const metadata: Metadata = {
  alternates: {
    canonical: canonicalUrl,
  },
  description: "The USA Missionaries ecosystem connects Kitchen Table Gospel, the Discipleship Operating System, and strategic ministry partners.",
  openGraph: {
    description: "Kitchen Table Gospel, DOS, and strategic partners connected through the USA Missionaries ecosystem.",
    images: [
      {
        alt: "USA Missionaries ecosystem",
        height: 916,
        url: socialImage,
        width: 1718,
      },
    ],
    siteName: domainSites.usam.siteName,
    title: "Ecosystem | USA Missionaries",
    type: "website",
    url: canonicalUrl,
  },
  title: "Ecosystem | USA Missionaries",
  twitter: {
    card: "summary_large_image",
    description: "Kitchen Table Gospel, DOS, and strategic partners connected through the USA Missionaries ecosystem.",
    images: [socialImage],
    title: "Ecosystem | USA Missionaries",
  },
};

const coreInitiatives = [
  {
    accent: "gold",
    body: "Kitchen Table Gospel is where the ecosystem starts: people gather around tables, share the Gospel with clarity, and pray together. It is a USA Missionaries initiative, sent and covered by USA Missionaries.",
    cta: "Open Kitchen Table Gospel",
    href: domainSites["kitchen-table-gospel"].canonicalOrigin,
    icon: Table2,
    label: "USA Missionaries Initiative",
    step: "Start",
    title: "Kitchen Table Gospel",
  },
  {
    accent: "blue",
    body: "The Discipleship Operating System carries those table conversations forward: it helps disciple makers track people, tables, fruit, and next steps without losing the relationship. It is a USA Missionaries product/initiative, sent and covered by USA Missionaries.",
    cta: "Open DOS",
    href: domainSites["discipleship-operating-system"].canonicalOrigin,
    icon: MonitorCheck,
    label: "USA Missionaries Product/Initiative",
    step: "Continue",
    title: "Discipleship Operating System",
  },
] as const;

const partnerCard = {
  body: "MOR is an independent ministry with its own leadership and website, listed here as a current strategic relationship. This card does not imply MOR is owned by USA Missionaries or that its website has been rebuilt inside USAM.",
  cta: "Visit MOR",
  href: "https://mor-mn.com/",
  icon: Handshake,
  label: "Strategic Partner",
  meta: "Current relationship: Category 1 strategic partner",
  title: "Ministry of Reconciliation (MOR)",
} as const;

const accentStyles = {
  blue: {
    badgeMutedText: "text-[#7FB8F0]/75",
    badgeText: "text-[#7FB8F0]",
    border: "border-[#378ADD]/35",
    hoverBorder: "hover:border-[#378ADD]/60",
    iconBg: "bg-[#378ADD]/10",
    iconBorder: "border-[#378ADD]/40",
  },
  gold: {
    badgeMutedText: "text-usam-gold/75",
    badgeText: "text-usam-gold",
    border: "border-usam-gold/35",
    hoverBorder: "hover:border-usam-gold/60",
    iconBg: "bg-usam-gold/10",
    iconBorder: "border-usam-gold/40",
  },
} as const;

function EcosystemLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[11px] font-bold uppercase tracking-[0.28em] text-usam-gold/85"
      style={{ fontFamily: font.rajdhani }}
    >
      {children}
    </p>
  );
}

function InitiativeCard({ card, stepNumber }: { card: (typeof coreInitiatives)[number]; stepNumber: 1 | 2 }) {
  const Icon = card.icon;
  const accent = accentStyles[card.accent];

  return (
    <article
      className={`flex flex-1 flex-col border ${accent.border} bg-black/48 p-6 shadow-[0_18px_56px_rgba(0,0,0,0.28)] transition-colors duration-200 ${accent.hoverBorder} md:p-7`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className={`flex h-11 w-11 items-center justify-center border ${accent.iconBorder} ${accent.iconBg} ${accent.badgeText}`}>
          <Icon className="h-5 w-5" aria-hidden="true" strokeWidth={1.8} />
        </div>
        <span
          className={`max-w-[180px] text-right text-[10px] font-bold uppercase tracking-[0.2em] ${accent.badgeMutedText}`}
          style={{ fontFamily: font.rajdhani }}
        >
          {card.label}
        </span>
      </div>

      <p
        className={`mt-6 text-[10px] font-bold uppercase tracking-[0.24em] ${accent.badgeText}`}
        style={{ fontFamily: font.rajdhani }}
      >
        Step {stepNumber}: {card.step}
      </p>
      <h3
        className="mt-3 text-3xl font-bold uppercase leading-tight text-stone-100"
        style={{ fontFamily: font.oswald }}
      >
        {card.title}
      </h3>
      <p className="mt-5 flex-1 text-base leading-7 text-stone-300">{card.body}</p>
      <a
        className={`mt-8 inline-flex min-h-12 items-center justify-center gap-2 border ${accent.border} bg-white/[0.03] px-5 text-center text-xs font-bold uppercase tracking-[0.22em] ${accent.badgeText} transition-colors duration-200 hover:bg-white/[0.06]`}
        href={card.href}
        style={{ fontFamily: font.rajdhani }}
      >
        {card.cta}
        <ArrowRight className="h-4 w-4" aria-hidden="true" strokeWidth={2} />
      </a>
    </article>
  );
}

export default function EcosystemPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#0D0D0D] text-stone-100">
      <PrimaryNav active="ecosystem" />

      <section className="relative overflow-hidden border-b border-stone-900/80 px-6 pb-16 pt-28 md:pb-24 md:pt-36">
        <Image
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-[0.16]"
          fill
          priority
          sizes="100vw"
          src="/images/usam/default-hero-background.png"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,13,13,0.48),#0D0D0D_92%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[length:70px_70px]" />

        <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-end">
          <div className="max-w-3xl">
            <EcosystemLabel>USA Missionaries Ecosystem</EcosystemLabel>
            <h1
              className="mt-7 text-5xl font-bold uppercase leading-[0.92] text-stone-100 sm:text-6xl md:text-7xl lg:text-8xl"
              style={{ fontFamily: font.oswald }}
            >
              One Mission.
              <br />
              Distinct Doors.
            </h1>
          </div>

          <div className="max-w-2xl lg:justify-self-end">
            <p className="text-lg leading-8 text-stone-200 md:text-xl md:leading-9">
              USA Missionaries is the sending and covering organization behind this ecosystem: public ministry initiatives, practical tools, and strategic relationships serving one mission.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <span className="inline-flex border border-usam-gold/35 bg-usam-gold/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-usam-gold" style={{ fontFamily: font.rajdhani }}>
                Kitchen Table Gospel
              </span>
              <span className="inline-flex border border-[#378ADD]/35 bg-[#378ADD]/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#7FB8F0]" style={{ fontFamily: font.rajdhani }}>
                DOS
              </span>
              <span className="inline-flex border border-stone-700 bg-black/30 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-stone-300" style={{ fontFamily: font.rajdhani }}>
                Strategic Partners
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <EcosystemLabel>Sent and Covered by USA Missionaries</EcosystemLabel>
            <h2
              className="mt-5 text-4xl font-bold uppercase leading-tight text-stone-100 md:text-5xl"
              style={{ fontFamily: font.oswald }}
            >
              Two Initiatives.
              <br />
              One Disciple-Making Path.
            </h2>
            <p className="mt-5 text-base leading-7 text-stone-300 md:text-lg md:leading-8">
              Kitchen Table Gospel and the Discipleship Operating System are not separate products. They are two USA Missionaries initiatives that work in sequence: Kitchen Table Gospel starts the Gospel conversation, and DOS carries that relationship forward so no person, table, or next step gets lost.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
            <InitiativeCard card={coreInitiatives[0]} stepNumber={1} />

            <div className="flex items-center justify-center py-2 lg:py-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-stone-700 bg-black text-stone-300">
                <ArrowDown className="h-4 w-4 lg:hidden" aria-hidden="true" strokeWidth={2} />
                <ArrowRight className="hidden h-4 w-4 lg:block" aria-hidden="true" strokeWidth={2} />
              </div>
            </div>

            <InitiativeCard card={coreInitiatives[1]} stepNumber={2} />
          </div>
        </div>
      </section>

      <section className="border-y border-stone-900/80 px-6 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <EcosystemLabel>Strategic Partner</EcosystemLabel>
            <h2
              className="mt-5 text-4xl font-bold uppercase leading-tight text-stone-100 md:text-5xl"
              style={{ fontFamily: font.oswald }}
            >
              Independent. Not Owned.
              <br />
              Still In The Ecosystem.
            </h2>
          </div>

          <article className="mt-10 flex flex-col gap-6 border border-dashed border-stone-700 bg-black/30 p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-stone-600 bg-stone-900/60 text-stone-300">
                <partnerCard.icon className="h-5 w-5" aria-hidden="true" strokeWidth={1.8} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3
                    className="text-2xl font-bold uppercase leading-tight text-stone-100"
                    style={{ fontFamily: font.oswald }}
                  >
                    {partnerCard.title}
                  </h3>
                  <span
                    className="inline-flex items-center gap-1.5 border border-stone-600 bg-stone-950/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-stone-300"
                    style={{ fontFamily: font.rajdhani }}
                  >
                    {partnerCard.label}
                  </span>
                </div>
                <p
                  className="mt-3 inline-flex w-fit border border-stone-700/80 bg-stone-950/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-stone-300"
                  style={{ fontFamily: font.rajdhani }}
                >
                  {partnerCard.meta}
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-300">{partnerCard.body}</p>
              </div>
            </div>
            <a
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 border border-stone-600 bg-black/35 px-5 text-center text-xs font-bold uppercase tracking-[0.22em] text-stone-100 transition-colors duration-200 hover:border-stone-400 hover:text-stone-50"
              href={partnerCard.href}
              rel="noopener noreferrer"
              style={{ fontFamily: font.rajdhani }}
              target="_blank"
            >
              {partnerCard.cta}
              <ExternalLink className="h-4 w-4" aria-hidden="true" strokeWidth={2} />
            </a>
          </article>
        </div>
      </section>

      <section className="px-6 py-16 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <EcosystemLabel>Domain Routing</EcosystemLabel>
            <h2
              className="mt-5 text-4xl font-bold uppercase leading-tight text-stone-100 md:text-5xl"
              style={{ fontFamily: font.oswald }}
            >
              Dedicated Sites.
              <br />
              Shared Mission.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border border-stone-800/70 bg-black/42 p-6">
              <p className="text-sm font-semibold text-stone-100">Primary DOS URL</p>
              <a className="mt-3 inline-flex items-center gap-2 text-sm text-[#7FB8F0] hover:text-[#9CC8F4]" href={domainSites["discipleship-operating-system"].canonicalOrigin}>
                discipleshipoperatingsystem.com
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
            <div className="border border-stone-800/70 bg-black/42 p-6">
              <p className="text-sm font-semibold text-stone-100">Primary Kitchen Table Gospel URL</p>
              <a className="mt-3 inline-flex items-center gap-2 text-sm text-usam-gold hover:text-usam-gold/80" href={domainSites["kitchen-table-gospel"].canonicalOrigin}>
                kitchentablegospel.org
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
            <div className="border border-stone-800/70 bg-black/42 p-6 md:col-span-2">
              <div className="flex items-start gap-4">
                <Network className="mt-1 h-5 w-5 shrink-0 text-usam-gold" aria-hidden="true" strokeWidth={1.8} />
                <p className="text-sm leading-7 text-stone-300">
                  The dedicated DOS and Kitchen Table Gospel domains are served from the same codebase and carry USA Missionaries ecosystem navigation, so visitors never lose their way back. MOR remains an external, independent website.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 md:py-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 border border-usam-gold/25 bg-usam-gold/[0.08] p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div>
            <EcosystemLabel>USA Missionaries</EcosystemLabel>
            <p className="mt-3 max-w-2xl text-lg leading-8 text-stone-200">
              Return to the public mission, prayer, and support pages at any time through the shared navigation.
            </p>
          </div>
          <Link
            className="inline-flex min-h-12 items-center justify-center gap-2 border border-stone-600 bg-black/35 px-5 text-center text-xs font-bold uppercase tracking-[0.22em] text-stone-100 transition-colors duration-200 hover:border-usam-gold hover:text-usam-gold"
            href="/"
            style={{ fontFamily: font.rajdhani }}
          >
            USA Missionaries
            <ArrowRight className="h-4 w-4" aria-hidden="true" strokeWidth={2} />
          </Link>
        </div>
      </section>
    </main>
  );
}
