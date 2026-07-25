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
  description: "The USA Missionaries System connects Kitchen Table Gospel, the Discipleship Operating System, and strategic ministry partners.",
  openGraph: {
    description: "Kitchen Table Gospel, DOS, and strategic partners connected through the USA Missionaries System.",
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
    description: "Kitchen Table Gospel, DOS, and strategic partners connected through the USA Missionaries System.",
    images: [socialImage],
    title: "System | USA Missionaries",
  },
};

const coreInitiatives = [
  {
    accent: "gold",
    body: "Kitchen Table Gospel is where the System starts: people gather around tables, share the Gospel with clarity, and pray together. It is a USA Missionaries initiative, sent and covered by USA Missionaries.",
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

const riverTributaries = [
  {
    begin: "0s",
    color: "url(#riverGold)",
    d: "M54 118 C170 96 222 144 328 170 C420 192 478 214 568 228",
    dot: "#F2C766",
    duration: "8s",
    id: "kitchen-table-gospel",
    label: "Kitchen Table Gospel",
    strokeWidth: 3.2,
  },
  {
    begin: "-2.5s",
    color: "url(#riverBlue)",
    d: "M82 258 C192 232 284 254 374 246 C448 240 508 238 568 228",
    dot: "#7FB8F0",
    duration: "9.2s",
    id: "discipleship-operating-system",
    label: "DOS",
    strokeWidth: 3.4,
  },
  {
    begin: "-1.4s",
    color: "url(#riverStone)",
    d: "M116 384 C230 332 318 336 404 306 C468 284 512 254 568 228",
    dot: "#D6D3D1",
    duration: "10.5s",
    id: "strategic-partners",
    label: "Strategic Partners",
    strokeWidth: 2.8,
  },
  {
    begin: "-4.8s",
    color: "url(#riverAmberBlue)",
    d: "M274 458 C362 398 430 380 492 326 C526 296 548 258 568 228",
    dot: "#E8D8AA",
    duration: "11s",
    id: "local-ministries",
    label: "Local Ministries",
    strokeWidth: 2.6,
  },
] as const;

const riverMainPath = "M568 228 C658 222 704 244 774 282 C868 334 982 340 1146 268";

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

function RiverOfMinistries() {
  return (
    <section className="relative overflow-hidden border-y border-stone-900/80 px-6 py-16 md:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(194,161,78,0.09),transparent_28%),radial-gradient(circle_at_72%_62%,rgba(55,138,221,0.12),transparent_30%)]" />
      <div className="relative mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
          <div>
            <SystemLabel>River of Ministries</SystemLabel>
            <h2
              className="mt-5 text-4xl font-bold uppercase leading-tight text-stone-100 md:text-5xl"
              style={{ fontFamily: font.oswald }}
            >
              Many Streams.
              <br />
              One Movement.
            </h2>
          </div>
          <p className="max-w-2xl text-base leading-7 text-stone-300 md:text-lg md:leading-8 lg:justify-self-end">
            USA Missionaries helps aligned ministries move together without flattening their callings. Each stream keeps its distinct work while joining a shared disciple-making current.
          </p>
        </div>

        <div className="relative mt-10 overflow-hidden border border-stone-800/80 bg-[#070707] shadow-[0_28px_90px_rgba(0,0,0,0.4)]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[length:58px_58px]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),transparent)]" />

          <svg
            aria-hidden="true"
            className="relative h-[360px] w-full md:h-[440px]"
            preserveAspectRatio="xMidYMid slice"
            viewBox="0 0 1200 520"
          >
            <defs>
              <linearGradient id="riverGold" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#5B4820" stopOpacity="0.2" />
                <stop offset="58%" stopColor="#C2A14E" stopOpacity="0.82" />
                <stop offset="100%" stopColor="#F2C766" />
              </linearGradient>
              <linearGradient id="riverBlue" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#12304D" stopOpacity="0.24" />
                <stop offset="62%" stopColor="#378ADD" stopOpacity="0.82" />
                <stop offset="100%" stopColor="#9CC8F4" />
              </linearGradient>
              <linearGradient id="riverStone" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#292524" stopOpacity="0.15" />
                <stop offset="62%" stopColor="#A8A29E" stopOpacity="0.62" />
                <stop offset="100%" stopColor="#E7E5E4" />
              </linearGradient>
              <linearGradient id="riverAmberBlue" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#5B4820" stopOpacity="0.18" />
                <stop offset="52%" stopColor="#C2A14E" stopOpacity="0.72" />
                <stop offset="100%" stopColor="#7FB8F0" />
              </linearGradient>
              <linearGradient id="riverMain" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#C2A14E" />
                <stop offset="46%" stopColor="#E8D8AA" />
                <stop offset="100%" stopColor="#378ADD" />
              </linearGradient>
              <radialGradient id="riverNode">
                <stop offset="0%" stopColor="#FFF7D6" />
                <stop offset="42%" stopColor="#C2A14E" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#378ADD" stopOpacity="0" />
              </radialGradient>
              <filter id="riverGlow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="4" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <rect fill="url(#riverNode)" height="420" opacity="0.18" width="420" x="392" y="34" />
            <path
              className="river-main"
              d={riverMainPath}
              fill="none"
              filter="url(#riverGlow)"
              opacity="0.82"
              stroke="url(#riverMain)"
              strokeLinecap="round"
              strokeWidth="16"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={riverMainPath}
              fill="none"
              opacity="0.58"
              stroke="#FFF7D6"
              strokeLinecap="round"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />

            {riverTributaries.map((stream) => (
              <g key={stream.id}>
                <path
                  className="river-tributary"
                  d={stream.d}
                  fill="none"
                  id={`river-${stream.id}`}
                  opacity="0.9"
                  stroke={stream.color}
                  strokeLinecap="round"
                  strokeWidth={stream.strokeWidth}
                  vectorEffect="non-scaling-stroke"
                />
                <circle className="river-dot" fill={stream.dot} r="5.5">
                  <animateMotion begin={stream.begin} dur={stream.duration} repeatCount="indefinite">
                    <mpath href={`#river-${stream.id}`} />
                  </animateMotion>
                </circle>
                <circle className="river-dot" fill={stream.dot} opacity="0.72" r="3.5">
                  <animateMotion begin={`-${parseFloat(stream.duration) / 2}s`} dur={stream.duration} repeatCount="indefinite">
                    <mpath href={`#river-${stream.id}`} />
                  </animateMotion>
                </circle>
              </g>
            ))}

            <circle className="river-dot" fill="#FFF7D6" r="7">
              <animateMotion begin="-1s" dur="7.5s" repeatCount="indefinite">
                <mpath href="#river-main-flow" />
              </animateMotion>
            </circle>
            <circle className="river-dot" fill="#7FB8F0" opacity="0.86" r="5">
              <animateMotion begin="-4s" dur="7.5s" repeatCount="indefinite">
                <mpath href="#river-main-flow" />
              </animateMotion>
            </circle>
            <path d={riverMainPath} fill="none" id="river-main-flow" opacity="0" stroke="transparent" />

            <circle cx="568" cy="228" fill="url(#riverNode)" filter="url(#riverGlow)" r="30" />
            <circle cx="568" cy="228" fill="#FFF7D6" r="4.8" />
          </svg>

          <div className="relative grid gap-px border-t border-stone-900 bg-stone-900/70 sm:grid-cols-4">
            {riverTributaries.map((stream) => (
              <div className="bg-black/55 px-4 py-3" key={stream.id}>
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400"
                  style={{ fontFamily: font.rajdhani }}
                >
                  {stream.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <style>{`
          .river-tributary {
            stroke-dasharray: 1 13;
            animation: riverPulse 6.4s ease-in-out infinite;
          }

          .river-main {
            animation: riverMainPulse 7.8s ease-in-out infinite;
          }

          @keyframes riverPulse {
            0%, 100% {
              opacity: 0.48;
            }
            50% {
              opacity: 0.96;
            }
          }

          @keyframes riverMainPulse {
            0%, 100% {
              opacity: 0.64;
            }
            50% {
              opacity: 0.92;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .river-tributary,
            .river-main {
              animation: none;
            }

            .river-dot {
              display: none;
            }
          }
        `}</style>
      </div>
    </section>
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
              USA Missionaries is the sending and covering organization behind this system: public ministry initiatives, practical tools, and strategic relationships serving one mission.
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
            <SystemLabel>Sent and Covered by USA Missionaries</SystemLabel>
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

      <RiverOfMinistries />

      <section className="border-y border-stone-900/80 px-6 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <SystemLabel>Strategic Partner</SystemLabel>
            <h2
              className="mt-5 text-4xl font-bold uppercase leading-tight text-stone-100 md:text-5xl"
              style={{ fontFamily: font.oswald }}
            >
              Independent. Not Owned.
              <br />
              Still In The System.
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
                  The dedicated DOS and Kitchen Table Gospel domains are served from the same codebase and carry USA Missionaries System navigation, so visitors never lose their way back. MOR remains an external, independent website.
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
