import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ExternalLink, Handshake, MonitorCheck, Network, Table2 } from "lucide-react";
import { PrimaryNav } from "@/components/PrimaryNav";
import { domainSites } from "@/src/lib/domain-sites";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };
const canonicalUrl = `${domainSites.usam.canonicalOrigin}/system`;
const socialImage = "/images/usam/default-hero-background.png";

export const metadata: Metadata = {
  alternates: {
    canonical: canonicalUrl,
  },
  description: "The USA Missionaries System includes two connected disciple-making initiatives: Kitchen Table Gospel and the Discipleship Operating System.",
  openGraph: {
    description: "Kitchen Table Gospel and the Discipleship Operating System are connected USA Missionaries initiatives.",
    images: [
      {
        alt: "USA Missionaries System",
        height: 916,
        url: socialImage,
        width: 1718,
      },
    ],
    siteName: domainSites.usam.siteName,
    title: "System | USA Missionaries",
    type: "website",
    url: canonicalUrl,
  },
  title: "System | USA Missionaries",
  twitter: {
    card: "summary_large_image",
    description: "Kitchen Table Gospel and the Discipleship Operating System are connected USA Missionaries initiatives.",
    images: [socialImage],
    title: "System | USA Missionaries",
  },
};

const coreInitiatives = [
  {
    accent: "gold",
    body: "Kitchen Table Gospel was developed and implemented by USA Missionaries as a simple, relational approach to making disciples around tables, conversations, prayer, and obedience.",
    cta: "Open Kitchen Table Gospel",
    href: domainSites["kitchen-table-gospel"].canonicalOrigin,
    icon: Table2,
    label: "USA Missionaries Initiative",
    step: "Start",
    title: "Kitchen Table Gospel",
  },
  {
    accent: "blue",
    body: "The Discipleship Operating System was developed and implemented by USA Missionaries to give disciple makers practical tools, structure, and visibility as relationships and next steps grow.",
    cta: "Open DOS",
    href: domainSites["discipleship-operating-system"].canonicalOrigin,
    icon: MonitorCheck,
    label: "USA Missionaries Initiative",
    step: "Continue",
    title: "Discipleship Operating System",
  },
] as const;

/**
 * Ministry partners rendered by the shared PartnerCard grid.
 *
 * Add future partners here; the section scales without layout changes. Only use
 * canonical partner URLs confirmed by USA Missionaries — never invent a link.
 */
const ministryPartners = [
  {
    category: "Strategic Partner",
    focus: "Freedom • Healing • Discipleship",
    href: "https://mor-mn.com/",
    name: "Ministry of Reconciliation",
  },
  {
    category: "Church Partner",
    focus: "Local Church • Discipleship • Community",
    href: "http://www.faithalive.church/",
    name: "Faith Alive Church",
  },
  {
    category: "Mission Partner",
    focus: "Compassion • Outreach • Missions",
    href: "https://www.project-miracle.org/",
    name: "Project Miracle",
  },
  {
    category: "Mission Partner",
    focus: "International Missions • Compassion • Discipleship",
    href: "https://www.shineintheworld.org/",
    name: "Shine International",
  },
] as const;

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

function SystemLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[11px] font-bold uppercase tracking-[0.28em] text-usam-gold/85"
      style={{ fontFamily: font.rajdhani }}
    >
      {children}
    </p>
  );
}

function PartnerCard({ partner }: { partner: (typeof ministryPartners)[number] }) {
  return (
    <article className="group flex h-full flex-col border border-stone-800 bg-black/40 p-6 transition-colors duration-200 hover:border-usam-gold/45 focus-within:border-usam-gold/45">
      <div className="flex h-9 w-9 items-center justify-center border border-stone-700 bg-stone-900/60 text-stone-300 transition-colors duration-200 group-hover:border-usam-gold/45 group-hover:text-usam-gold">
        <Handshake className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
      </div>

      <span
        className="mt-5 inline-flex w-fit items-center border border-stone-700/80 bg-stone-950/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-stone-300"
        style={{ fontFamily: font.rajdhani }}
      >
        {partner.category}
      </span>

      <h3
        className="mt-4 text-xl font-bold uppercase leading-tight text-stone-100"
        style={{ fontFamily: font.oswald }}
      >
        {partner.name}
      </h3>

      <p
        className="mt-3 flex-1 text-[11px] font-semibold uppercase leading-5 tracking-[0.12em] text-stone-400"
        style={{ fontFamily: font.rajdhani }}
      >
        {partner.focus}
      </p>

      <a
        className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 border border-stone-700 bg-black/35 px-4 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-stone-100 transition-colors duration-200 hover:border-usam-gold hover:text-usam-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-usam-gold"
        href={partner.href}
        rel="noopener noreferrer"
        style={{ fontFamily: font.rajdhani }}
        target="_blank"
      >
        <span>
          Visit Website
          <span className="sr-only"> for {partner.name} (opens in a new tab)</span>
        </span>
        <ExternalLink
          className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
          aria-hidden="true"
          strokeWidth={2}
        />
      </a>
    </article>
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

export default function SystemPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#0D0D0D] text-stone-100">
      <PrimaryNav active="system" />

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
            <SystemLabel>USA Missionaries System</SystemLabel>
            <h1
              className="mt-7 text-4xl font-bold uppercase leading-[0.92] text-stone-100 sm:text-6xl md:text-7xl"
              style={{ fontFamily: font.oswald }}
            >
              One Mission.
              <br />
              Two Initiatives.
            </h1>
          </div>

          <div className="max-w-2xl lg:justify-self-end">
            <p className="text-lg leading-8 text-stone-200 md:text-xl md:leading-9">
              USA Missionaries has developed two connected initiatives to help Christians live out the Great Commission: Kitchen Table Gospel provides the disciple-making approach, and the Discipleship Operating System provides the practical tools to support it.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a className="inline-flex min-h-12 max-w-full items-center justify-center border border-usam-gold/35 bg-usam-gold/10 px-4 py-2 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-usam-gold transition-colors duration-200 hover:bg-usam-gold/15 sm:w-auto" href={domainSites["kitchen-table-gospel"].canonicalOrigin} style={{ fontFamily: font.rajdhani }}>
                Kitchen Table Gospel
              </a>
              <a className="inline-flex min-h-12 max-w-full items-center justify-center border border-[#378ADD]/35 bg-[#378ADD]/10 px-4 py-2 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-[#7FB8F0] transition-colors duration-200 hover:bg-[#378ADD]/15 sm:w-auto" href={domainSites["discipleship-operating-system"].canonicalOrigin} style={{ fontFamily: font.rajdhani }}>
                Discipleship Operating System
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <SystemLabel>Developed by USA Missionaries</SystemLabel>
            <h2
              className="mt-5 text-4xl font-bold uppercase leading-tight text-stone-100 md:text-5xl"
              style={{ fontFamily: font.oswald }}
            >
              Two Initiatives.
              <br />
              One Disciple-Making Mission.
            </h2>
            <p className="mt-5 text-base leading-7 text-stone-300 md:text-lg md:leading-8">
              Kitchen Table Gospel provides a simple, relational approach to making disciples. The Discipleship Operating System provides the tools, structure, and visibility needed to help that work grow.
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
            <SystemLabel>Strategic Ministry Partners</SystemLabel>
            <h2
              className="mt-5 text-4xl font-bold uppercase leading-tight text-stone-100 md:text-5xl"
              style={{ fontFamily: font.oswald }}
            >
              We Do Not Go Alone.
            </h2>
            <p className="mt-5 text-base leading-7 text-stone-300 md:text-lg md:leading-8">
              USA Missionaries works alongside trusted churches and ministry organizations already serving people with
              experience and care. Rather than duplicating their work, we train and send missionaries to serve alongside
              them.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {ministryPartners.map((partner) => (
              <PartnerCard key={partner.name} partner={partner} />
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <SystemLabel>Domain Routing</SystemLabel>
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
                  The dedicated DOS and Kitchen Table Gospel domains are served from the same codebase and carry USA Missionaries System navigation, so visitors can move between the connected initiatives clearly. MOR is linked as a strategic ministry partner.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 md:py-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 border border-usam-gold/25 bg-usam-gold/[0.08] p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div>
            <SystemLabel>USA Missionaries</SystemLabel>
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
