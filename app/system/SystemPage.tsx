import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import {
  ArrowDown,
  ExternalLink,
  Footprints,
  HeartHandshake,
  Table2,
  Users,
} from "lucide-react";
import { PrimaryNav } from "@/components/PrimaryNav";
import { JoinMissionInterestModal } from "@/components/forms/JoinMissionInterestModal";
import { buildDomainSiteSocialImage } from "@/src/lib/domain-metadata";
import { domainSites } from "@/src/lib/domain-sites";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

const kitchenTableGospelUrl = domainSites["kitchen-table-gospel"].canonicalOrigin;
const dosUrl = domainSites["discipleship-operating-system"].canonicalOrigin;
const canonicalUrl = `${domainSites.usam.canonicalOrigin}/system`;
const socialImage = domainSites.usam.socialImage.path;
const systemDescription =
  "USA Missionaries trains, equips, and sends ordinary Christians to obey Jesus, make disciples, and serve people wherever they are.";

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
    href: "/mission-of-reconciliation",
    name: "Mission of Reconciliation",
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

export const metadata: Metadata = {
  alternates: {
    canonical: canonicalUrl,
  },
  description: systemDescription,
  openGraph: {
    description: systemDescription,
    images: [
      {
        ...buildDomainSiteSocialImage(domainSites.usam),
        alt: "USA Missionaries System",
      },
    ],
    siteName: domainSites.usam.siteName,
    title: "System | USA Missionaries",
    type: "website",
    url: canonicalUrl,
  },
  title: "System",
  twitter: {
    card: "summary_large_image",
    description: systemDescription,
    images: [socialImage],
    title: "System | USA Missionaries",
  },
};

/* ---------------------------------------------------------------------- */
/* SHARED PIECES                                                           */
/* ---------------------------------------------------------------------- */

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p
      className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-[0.28em] text-usam-gold"
      style={{ fontFamily: font.rajdhani }}
    >
      {children}
      <span aria-hidden="true" className="h-px w-12 bg-usam-gold/50" />
    </p>
  );
}

function Section({
  children,
  id,
  variant = "plain",
}: {
  children: ReactNode;
  id?: string;
  variant?: "plain" | "panel" | "feature" | "light";
}) {
  const backgrounds = {
    feature:
      "relative overflow-hidden border-y border-stone-900/80 bg-[radial-gradient(circle_at_16%_8%,rgba(194,161,78,0.11),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.022),#0D0D0D_26%)]",
    light: "bg-[#F5F3EE] text-[#141414]",
    panel: "border-y border-stone-900/80 bg-white/[0.015]",
    plain: "",
  } as const;

  return (
    <section className={`scroll-mt-24 px-6 py-20 md:py-28 ${backgrounds[variant]}`} id={id}>
      <div className="relative mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2
      className="mt-6 max-w-3xl text-[clamp(2rem,5vw,3.25rem)] font-bold uppercase leading-[1.03] text-stone-100"
      style={{ fontFamily: font.oswald }}
    >
      {children}
    </h2>
  );
}

function Chip({ children, tone = "dark" }: { children: ReactNode; tone?: "dark" | "gold" }) {
  const toneClass = tone === "gold"
    ? "border-usam-gold/35 bg-usam-gold/[0.08] text-usam-gold"
    : "border-stone-700/80 bg-white/[0.02] text-stone-300";

  return (
    <span
      className={`inline-flex items-center border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${toneClass}`}
      style={{ fontFamily: font.rajdhani }}
    >
      {children}
    </span>
  );
}

const primaryCtaClassName =
  "inline-flex min-h-12 cursor-pointer items-center justify-center border border-usam-gold bg-usam-gold px-7 py-3 text-center text-[12px] font-bold uppercase tracking-[0.2em] text-usam-black transition-colors duration-200 hover:bg-usam-gold/90";

/* ---------------------------------------------------------------------- */
/* 01 — HERO                                                               */
/* ---------------------------------------------------------------------- */

function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-stone-900/80 px-6 pb-20 pt-28 md:pb-28 md:pt-36">
      <Image
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover opacity-[0.32]"
        fill
        priority
        sizes="100vw"
        src="/images/usam/default-hero-background.png"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,13,13,0.34),rgba(13,13,13,0.62)_62%,#0D0D0D_98%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[length:70px_70px]" />

      <div className="relative mx-auto max-w-6xl">
        <Eyebrow>USA Missionaries</Eyebrow>
        <h1
          className="mt-8 text-[clamp(3rem,13vw,6rem)] font-bold uppercase leading-[0.88] text-stone-100"
          style={{ fontFamily: font.oswald }}
        >
          Jesus Went.
          <br />
          <span className="text-usam-gold">So Do We.</span>
        </h1>
        <p className="mt-9 max-w-2xl text-lg leading-8 text-stone-200 md:text-xl md:leading-9">
          USA Missionaries trains, equips, and sends ordinary Christians to obey Jesus, make disciples, and serve people
          wherever they are.
        </p>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------- */
/* 02 — WE COPY WHAT JESUS DID                                             */
/* ---------------------------------------------------------------------- */

function NarrativeSection() {
  return (
    <Section id="how-it-works">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div>
          <Eyebrow>The Pattern</Eyebrow>
          <SectionTitle>
            We Copy
            <br />
            What Jesus Did.
          </SectionTitle>
        </div>

        <div className="lg:pt-2">
          <p className="text-lg leading-9 text-stone-300 md:text-xl md:leading-9">
            Throughout the Gospels, Jesus ministered in homes, around tables, throughout towns and villages, in gathered
            settings, and among people who were hurting or overlooked. USA Missionaries trains, equips, and sends
            Christians to follow His example.
          </p>
          <blockquote className="mt-9 border-l-2 border-usam-gold/70 pl-6">
            <p
              className="text-2xl font-bold uppercase leading-[1.15] text-stone-100 md:text-3xl"
              style={{ fontFamily: font.oswald }}
            >
              Our mission is to go where people already are.
            </p>
          </blockquote>
        </div>
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------------- */
/* 03 — THE MISSION FLOW                                                   */
/* ---------------------------------------------------------------------- */

const flowPatterns = [
  { icon: Table2, label: "Homes and Tables" },
  { icon: Footprints, label: "Streets and Communities" },
  { icon: HeartHandshake, label: "Places of Suffering" },
  { icon: Users, label: "Gathered People" },
];

const missionSupports = [
  { detail: "Relational discipleship framework", title: "Kitchen Table Gospel", tone: "gold" },
  { detail: "Operational foundation", title: "Discipleship Operating System", tone: "blue" },
  { detail: "Specialized ministry expertise", title: "Trusted Ministry Partners", tone: "stone" },
] as const;

function FlowLink() {
  return (
    <div className="flex flex-col items-center py-4 md:py-5" aria-hidden="true">
      <span className="h-9 w-px bg-gradient-to-b from-usam-gold/5 to-usam-gold/45 md:h-10" />
      <ArrowDown className="h-3.5 w-3.5 text-usam-gold/50" strokeWidth={2.5} />
    </div>
  );
}

function FlowStep({
  detail,
  title,
  tone = "default",
}: {
  detail: string;
  title: string;
  tone?: "default" | "origin" | "outcome";
}) {
  const titleClass = {
    default: "text-[clamp(1.6rem,4.2vw,2.4rem)] text-stone-100",
    origin: "text-[clamp(2.6rem,8vw,4.5rem)] text-usam-gold",
    outcome: "text-[clamp(1.25rem,3.6vw,2.2rem)] text-usam-gold",
  }[tone];

  return (
    <div className="text-center">
      <h3 className={`font-bold uppercase leading-[1.04] ${titleClass}`} style={{ fontFamily: font.oswald }}>
        {title}
      </h3>
      <p
        className="mx-auto mt-3 max-w-md text-[11px] font-bold uppercase leading-5 tracking-[0.22em] text-stone-400 md:text-[12px]"
        style={{ fontFamily: font.rajdhani }}
      >
        {detail}
      </p>
    </div>
  );
}

function MissionFlowSection() {
  return (
    <Section variant="feature">
      <div className="mx-auto max-w-3xl text-center">
        <p
          className="text-[11px] font-bold uppercase tracking-[0.28em] text-usam-gold"
          style={{ fontFamily: font.rajdhani }}
        >
          The Model
        </p>
      </div>

      <div className="mx-auto mt-12 max-w-2xl md:mt-14">
        <FlowStep title="Jesus" detail="His commands, teaching, and example" tone="origin" />
        <FlowLink />
        <FlowStep title="USA Missionaries" detail="Train · Equip · Send" />
        <FlowLink />
        <FlowStep title="Missionaries" detail="Go to people wherever they are" />
        <FlowLink />

        <div className="grid grid-cols-2 gap-px border border-stone-800 bg-stone-800 md:grid-cols-4">
          {flowPatterns.map((pattern) => {
            const Icon = pattern.icon;

            return (
              <div
                className="flex min-h-[112px] flex-col items-center justify-center gap-3 bg-[#0D0D0D] px-4 py-5 text-center"
                key={pattern.label}
              >
                <Icon className="h-5 w-5 text-usam-gold" aria-hidden="true" strokeWidth={1.7} />
                <span
                  className="text-[11px] font-bold uppercase leading-5 tracking-[0.16em] text-stone-200"
                  style={{ fontFamily: font.rajdhani }}
                >
                  {pattern.label}
                </span>
              </div>
            );
          })}
        </div>

        <FlowLink />
        <FlowStep title="People Served · Disciples Made" detail="The reason for all of it" tone="outcome" />
      </div>

      <div className="mt-16 md:mt-20">
        <div className="flex items-center gap-5">
          <span className="h-px flex-1 bg-stone-800" aria-hidden="true" />
          <p
            className="text-[11px] font-bold uppercase tracking-[0.24em] text-stone-500"
            style={{ fontFamily: font.rajdhani }}
          >
            Supporting the mission
          </p>
          <span className="h-px flex-1 bg-stone-800" aria-hidden="true" />
        </div>

        <div className="mt-8 grid gap-px bg-stone-800 md:grid-cols-3">
          {missionSupports.map((support) => {
            const toneClass = {
              blue: "text-[#7FB8F0] border-t-[#378ADD]",
              gold: "text-usam-gold border-t-usam-gold",
              stone: "text-stone-200 border-t-stone-500",
            }[support.tone];

            return (
              <div className={`border-t-2 bg-[#0D0D0D] p-6 ${toneClass}`} key={support.title}>
                <h3 className="text-lg font-bold uppercase leading-tight md:text-xl" style={{ fontFamily: font.oswald }}>
                  {support.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-stone-400">{support.detail}</p>
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-sm leading-7 text-stone-500">
          These support the mission. They are not steps in it.
        </p>
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------------- */
/* 04 — HOW JESUS MINISTERED                                               */
/* ---------------------------------------------------------------------- */

type Expression = {
  body: string;
  icon: typeof Table2;
  lead: string;
  number: string;
  title: string;
};

const expressions: Expression[] = [
  {
    body: "Jesus entered homes, shared meals, taught around tables, and made disciples through close relationships. Kitchen Table Gospel helps ordinary Christians do the same.",
    icon: Table2,
    lead: "Meet people personally.",
    number: "01",
    title: "Homes and Tables",
  },
  {
    body: "Jesus walked through towns and villages, spoke with people others ignored, and brought the Kingdom into everyday life. Missionaries carry that same presence into their own communities.",
    icon: Footprints,
    lead: "Pray, proclaim, and be present.",
    number: "02",
    title: "Streets and Communities",
  },
  {
    body: "Jesus moved toward the sick, poor, oppressed, lonely, rejected, imprisoned, and vulnerable. USA Missionaries prepares people to serve them directly or alongside trusted ministry partners.",
    icon: HeartHandshake,
    lead: "Go toward the overlooked.",
    number: "03",
    title: "Places of Suffering",
  },
  {
    body: "Jesus gathered people for teaching, prayer, fellowship, and accountability. We help believers form consistent relationships centered on Scripture, obedience, and making disciples.",
    icon: Users,
    lead: "Help disciples grow together.",
    number: "04",
    title: "Gathered People",
  },
];

function ExpressionRow({ expression, children }: { expression: Expression; children?: ReactNode }) {
  const Icon = expression.icon;

  return (
    <article className="grid gap-6 border-t border-stone-800/70 py-10 md:grid-cols-[0.85fr_1.15fr] md:gap-12 md:py-12">
      <div className="flex items-start gap-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-usam-gold/40 bg-usam-gold/[0.08] text-usam-gold">
          <Icon className="h-5 w-5" aria-hidden="true" strokeWidth={1.7} />
        </div>
        <div>
          <p
            className="text-[11px] font-bold uppercase tracking-[0.26em] text-usam-gold/80"
            style={{ fontFamily: font.rajdhani }}
          >
            {expression.number}
          </p>
          <h3
            className="mt-2 text-3xl font-bold uppercase leading-[1.05] text-stone-100 md:text-4xl"
            style={{ fontFamily: font.oswald }}
          >
            {expression.title}
          </h3>
          <p className="mt-3 text-base font-medium leading-7 text-stone-200">{expression.lead}</p>
        </div>
      </div>

      <div>
        <p className="text-base leading-8 text-stone-400 md:text-[17px]">{expression.body}</p>
        {children ? <div className="mt-6">{children}</div> : null}
      </div>
    </article>
  );
}

function WhereWeGoSection() {
  return (
    <Section id="where-we-go" variant="panel">
      <div className="max-w-3xl">
        <Eyebrow>Following The Pattern Of Jesus</Eyebrow>
        <SectionTitle>How Jesus Ministered.</SectionTitle>
        <p className="mt-6 text-base leading-8 text-stone-400 md:text-lg">
          Four patterns run through His ministry in the Gospels. Missionaries are trained to follow the same ones.
        </p>
      </div>

      <div className="mt-12">
        <ExpressionRow expression={expressions[0]}>
          <a
            className="inline-flex min-h-12 items-center justify-center gap-2 border border-usam-gold/40 bg-usam-gold/[0.08] px-5 py-3 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-usam-gold transition-colors duration-200 hover:bg-usam-gold/[0.14]"
            href={kitchenTableGospelUrl}
            rel="noopener noreferrer"
            style={{ fontFamily: font.rajdhani }}
            target="_blank"
          >
            Explore Kitchen Table Gospel
            <ExternalLink className="h-4 w-4" aria-hidden="true" strokeWidth={2} />
          </a>
        </ExpressionRow>

        <ExpressionRow expression={expressions[1]}>
          <div className="flex flex-wrap gap-2">
            <Chip>Prayer walks</Chip>
            <Chip>Evangelism</Chip>
            <Chip>Community presence</Chip>
            <Chip tone="gold">2THREE2</Chip>
          </div>
          <p className="mt-5 text-sm leading-7 text-stone-500">
            2THREE2 is an emerging active discipleship initiative where people run, walk, hike, cycle, and train while
            praying over their communities, pursuing Jesus, and encouraging one another.
          </p>
        </ExpressionRow>

        <ExpressionRow expression={expressions[2]}>
          <div className="flex flex-wrap gap-2">
            <Chip>Hospitals</Chip>
            <Chip>Prisons</Chip>
            <Chip>Nursing homes</Chip>
            <Chip>Streets</Chip>
            <Chip>Homes</Chip>
            <Chip>Shelters</Chip>
          </div>
          <p className="mt-5 border-l-2 border-stone-700 pl-5 text-sm leading-7 text-stone-400">
            USA Missionaries trains and sends the missionary. Trusted partners provide the specialized experience and
            infrastructure.
          </p>
        </ExpressionRow>

        <ExpressionRow expression={expressions[3]}>
          <div className="flex flex-wrap gap-2">
            <Chip>Discipleship gatherings</Chip>
            <Chip>Prayer</Chip>
            <Chip>Scripture</Chip>
            <Chip>Accountability</Chip>
            <Chip>Preparation for mission</Chip>
          </div>
        </ExpressionRow>
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------------- */
/* 04 — WHO WE SERVE                                                       */
/* ---------------------------------------------------------------------- */

const servedPeople = [
  "The poor",
  "The hungry",
  "The sick",
  "Prisoners",
  "Widows",
  "Orphans",
  "The lonely",
  "The oppressed",
  "The stranger",
  "The rejected",
];

function WhoWeServeSection() {
  return (
    <Section variant="light">
      <div className="max-w-3xl">
        <p
          className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-[0.28em] text-[#8C6D1F]"
          style={{ fontFamily: font.rajdhani }}
        >
          Who We Serve
          <span aria-hidden="true" className="h-px w-12 bg-[#8C6D1F]/45" />
        </p>
        <h2
          className="mt-6 text-[clamp(2rem,5vw,3.25rem)] font-bold uppercase leading-[1.03] text-[#141414]"
          style={{ fontFamily: font.oswald }}
        >
          The People Jesus
          <br />
          Told Us Not To Overlook.
        </h2>
        <p className="mt-6 text-base leading-8 text-[#4B4740] md:text-lg">
          Our work is not chosen by trends or convenience. It is rooted in the commands, priorities, and example of
          Jesus.
        </p>
      </div>

      <ul className="mt-12 grid grid-cols-2 gap-px border border-[#DCD6C8] bg-[#DCD6C8] sm:grid-cols-3 lg:grid-cols-5">
        {servedPeople.map((person, index) => (
          <li className="flex min-h-[104px] flex-col justify-between bg-[#F5F3EE] p-5 md:min-h-[124px]" key={person}>
            <span
              className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8C6D1F]"
              style={{ fontFamily: font.rajdhani }}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span
              className="mt-6 text-xl font-bold uppercase leading-[1.1] text-[#141414] md:text-2xl"
              style={{ fontFamily: font.oswald }}
            >
              {person}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* ---------------------------------------------------------------------- */
/* 05 — TRAIN, EQUIP, SEND                                                 */
/* ---------------------------------------------------------------------- */

const responseSteps = [
  {
    body: "Provide biblical foundation, discipleship formation, prayer, safety, and practical preparation.",
    lead: "Know Jesus and His commands.",
    number: "01",
    title: "Train",
  },
  {
    body: "Provide coaching, resources, relationships, ministry partners, tools, and spiritual support.",
    lead: "Give missionaries what they need.",
    number: "02",
    title: "Equip",
  },
  {
    body: "Missionaries enter homes, communities, institutions, workplaces, and overlooked places.",
    lead: "Go to the people.",
    number: "03",
    title: "Send",
  },
];

function ResponseSection() {
  return (
    <Section variant="feature">
      <div className="max-w-3xl">
        <Eyebrow>How USA Missionaries Responds</Eyebrow>
        <SectionTitle>Train. Equip. Send.</SectionTitle>
      </div>

      <div className="mt-12 grid gap-px bg-stone-800/70 md:grid-cols-3">
        {responseSteps.map((step) => (
          <div className="flex flex-col bg-[#0D0D0D] p-7 md:p-8" key={step.title}>
            <span
              className="text-[10px] font-bold uppercase tracking-[0.28em] text-usam-gold/80"
              style={{ fontFamily: font.rajdhani }}
            >
              {step.number}
            </span>
            <h3
              className="mt-4 text-3xl font-bold uppercase leading-tight text-stone-100"
              style={{ fontFamily: font.oswald }}
            >
              {step.title}
            </h3>
            <p className="mt-3 text-base font-medium leading-7 text-stone-200">{step.lead}</p>
            <p className="mt-4 text-[15px] leading-7 text-stone-400">{step.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------------- */
/* 06 — THE METHOD AND THE FOUNDATION                                      */
/* ---------------------------------------------------------------------- */

function MethodAndFoundationSection() {
  return (
    <Section>
      <div className="max-w-3xl">
        <Eyebrow>The Method And The Foundation</Eyebrow>
        <SectionTitle>
          How The Work Is Done,
          <br />
          And What Holds It Up.
        </SectionTitle>
      </div>

      <article className="mt-12 border border-usam-gold/35 bg-usam-gold/[0.05] p-7 md:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="inline-flex items-center gap-2 border border-usam-gold/40 bg-usam-gold/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-usam-gold"
                style={{ fontFamily: font.rajdhani }}
              >
                <Table2 className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={2} />
                The Method
              </span>
              <span
                className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400"
                style={{ fontFamily: font.rajdhani }}
              >
                Developed by USA Missionaries
              </span>
            </div>
            <h3
              className="mt-6 text-[clamp(1.9rem,4vw,2.75rem)] font-bold uppercase leading-[1.05] text-stone-100"
              style={{ fontFamily: font.oswald }}
            >
              Kitchen Table Gospel
            </h3>
            <p className="mt-5 max-w-2xl text-base leading-8 text-stone-300 md:text-[17px]">
              A simple, relational discipleship framework that helps missionaries meet people where they are, open
              Scripture, share life, and teach obedience to Jesus.
            </p>
          </div>

          <div className="lg:justify-self-end">
            <a
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 border border-usam-gold bg-usam-gold px-6 py-3 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-usam-black transition-colors duration-200 hover:bg-usam-gold/90 sm:w-auto"
              href={kitchenTableGospelUrl}
              rel="noopener noreferrer"
              style={{ fontFamily: font.rajdhani }}
              target="_blank"
            >
              Open Kitchen Table Gospel
              <ExternalLink className="h-4 w-4" aria-hidden="true" strokeWidth={2} />
            </a>
            <p className="mt-3 text-center text-[11px] uppercase tracking-[0.16em] text-stone-500 lg:text-right" style={{ fontFamily: font.rajdhani }}>
              kitchentablegospel.org
            </p>
          </div>
        </div>
      </article>

      <div className="mt-8 flex items-center justify-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#378ADD]/35" />
        <ArrowDown className="h-5 w-5 text-[#7FB8F0]/70" strokeWidth={2} />
        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#378ADD]/35" />
      </div>

      <article className="mt-6 border border-[#378ADD]/35 bg-[#378ADD]/[0.05] p-7 md:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="inline-flex items-center gap-2 border border-[#378ADD]/40 bg-[#378ADD]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#7FB8F0]"
                style={{ fontFamily: font.rajdhani }}
              >
                The Operational Foundation
              </span>
              <span
                className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400"
                style={{ fontFamily: font.rajdhani }}
              >
                Developed by USA Missionaries
              </span>
            </div>
            <h3
              className="mt-6 text-[clamp(1.7rem,3.6vw,2.5rem)] font-bold uppercase leading-[1.05] text-stone-100"
              style={{ fontFamily: font.oswald }}
            >
              Discipleship Operating System
            </h3>
            <p className="mt-5 max-w-2xl text-base leading-8 text-stone-300 md:text-[17px]">
              The operational foundation beneath the mission, helping missionaries care for people, follow up
              faithfully, and organize the work of discipleship.
            </p>
          </div>

          <div className="lg:justify-self-end">
            <a
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 border border-[#378ADD]/45 bg-[#378ADD]/12 px-6 py-3 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-[#7FB8F0] transition-colors duration-200 hover:bg-[#378ADD]/20 sm:w-auto"
              href={dosUrl}
              rel="noopener noreferrer"
              style={{ fontFamily: font.rajdhani }}
              target="_blank"
            >
              Open the Discipleship Operating System
              <ExternalLink className="h-4 w-4" aria-hidden="true" strokeWidth={2} />
            </a>
            <p className="mt-3 text-center text-[11px] uppercase tracking-[0.16em] text-stone-500 lg:text-right" style={{ fontFamily: font.rajdhani }}>
              discipleshipoperatingsystem.com
            </p>
          </div>
        </div>
      </article>
    </Section>
  );
}

/* ---------------------------------------------------------------------- */
/* 07 — WE DO NOT GO ALONE                                                 */
/* ---------------------------------------------------------------------- */

function PartnerCard({ partner }: { partner: (typeof ministryPartners)[number] }) {
  const isExternal = partner.href.startsWith("http");

  return (
    <article className="group flex h-full flex-col border border-stone-800 bg-black/35 p-6 transition-colors duration-200 hover:border-usam-gold/45 focus-within:border-usam-gold/45">
      <span
        className="inline-flex w-fit items-center border border-stone-700/80 bg-stone-950/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-stone-300"
        style={{ fontFamily: font.rajdhani }}
      >
        {partner.category}
      </span>

      <h3
        className="mt-5 text-xl font-bold uppercase leading-tight text-stone-100"
        style={{ fontFamily: font.oswald }}
      >
        {partner.name}
      </h3>

      <p
        className="mt-3 flex-1 text-[11px] font-semibold uppercase leading-5 tracking-[0.14em] text-stone-400"
        style={{ fontFamily: font.rajdhani }}
      >
        {partner.focus}
      </p>

      <a
        className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 border border-stone-700 bg-black/35 px-4 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-stone-200 transition-colors duration-200 hover:border-usam-gold hover:text-usam-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-usam-gold"
        href={partner.href}
        rel={isExternal ? "noopener noreferrer" : undefined}
        style={{ fontFamily: font.rajdhani }}
        target={isExternal ? "_blank" : undefined}
      >
        <span>
          {isExternal ? "Visit Website" : "Learn More"}
          <span className="sr-only">
            {" "}for {partner.name}
            {isExternal ? " (opens in a new tab)" : ""}
          </span>
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

function PartnersSection() {
  return (
    <Section variant="panel">
      <div className="max-w-3xl">
        <Eyebrow>Strategic Ministry Partners</Eyebrow>
        <SectionTitle>We Do Not Go Alone.</SectionTitle>
        <p className="mt-6 text-base leading-8 text-stone-400 md:text-lg">
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
    </Section>
  );
}

/* ---------------------------------------------------------------------- */
/* 08 — FINAL INVITATION                                                   */
/* ---------------------------------------------------------------------- */

function InvitationSection() {
  return (
    <Section variant="feature">
      <div className="mx-auto max-w-3xl text-center">
        <p
          className="text-[11px] font-bold uppercase tracking-[0.28em] text-usam-gold"
          style={{ fontFamily: font.rajdhani }}
        >
          The Invitation
        </p>
        <h2
          className="mt-7 text-[clamp(2.1rem,5.5vw,3.6rem)] font-bold uppercase leading-[1.02] text-stone-100"
          style={{ fontFamily: font.oswald }}
        >
          You May Already Be Standing In Your Mission Field.
        </h2>
        <p className="mt-7 text-base leading-8 text-stone-300 md:text-lg md:leading-9">
          You do not need to quit your job, move overseas, or start a nonprofit. USA Missionaries can help you recognize
          who God is sending you to, prepare you, and activate you for mission.
        </p>

        <div className="mt-10 flex justify-center">
          <JoinMissionInterestModal
            defaultInterest="Become a missionary"
            triggerClassName={primaryCtaClassName}
            triggerFontWeight={700}
          >
            Become a USA Missionary
          </JoinMissionInterestModal>
        </div>

        <p
          className="mt-12 text-[11px] font-bold uppercase tracking-[0.34em] text-stone-500"
          style={{ fontFamily: font.rajdhani }}
        >
          Jesus went. So do we.
        </p>
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------------- */
/* PAGE                                                                    */
/* ---------------------------------------------------------------------- */

export default function SystemV2Page() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0D0D0D] text-stone-100">
      <PrimaryNav active="system" />
      <HeroSection />
      <NarrativeSection />
      <MissionFlowSection />
      <WhereWeGoSection />
      <WhoWeServeSection />
      <ResponseSection />
      <MethodAndFoundationSection />
      <PartnersSection />
      <InvitationSection />
    </main>
  );
}
