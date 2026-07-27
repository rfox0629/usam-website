import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import { PrimaryNav } from "@/components/PrimaryNav";
import { resolveBoardBriefingImage } from "@/src/lib/board-briefing-media";
import { BoardBriefingMedia } from "./BoardBriefingMedia";
import { BoardBriefingMobileNav } from "./BoardBriefingMobileNav";
import { BoardBriefingPrintButton } from "./BoardBriefingPrintButton";
import { BoardBriefingScreenshotLightbox } from "./BoardBriefingScreenshotLightbox";
import { BoardBriefingSectionRail } from "./BoardBriefingSectionRail";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  description: "Private board briefing for USA Missionaries.",
  robots: {
    follow: false,
    index: false,
  },
  title: "Board Briefing | USA Missionaries",
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

/* ---------------------------------------------------------------------- */
/* SHARED EDITORIAL PRIMITIVES (mirrors app/partners/page.tsx conventions)  */
/* ---------------------------------------------------------------------- */

function Eyebrow({ center = false, children, tone = "gold" }: { center?: boolean; children: ReactNode; tone?: "gold" | "neutral" }) {
  const color = tone === "gold" ? "text-usam-gold" : "text-stone-300";
  const rule = tone === "gold" ? "bg-usam-gold/55" : "bg-stone-500/60";

  return (
    <p
      className={`flex items-center gap-4 text-[11px] uppercase tracking-[0.28em] ${color} ${center ? "justify-center" : ""}`}
      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
    >
      {children}
      <span className={`h-px w-14 ${rule}`} aria-hidden="true" />
    </p>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2
      className="mt-5 max-w-2xl text-[clamp(1.9rem,4vw,2.75rem)] font-bold leading-[1.1] text-stone-100"
      style={{ fontFamily: font.oswald }}
    >
      {children}
    </h2>
  );
}

function Lede({ children }: { children: ReactNode }) {
  return <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-400">{children}</p>;
}

function Prose({ children }: { children: ReactNode }) {
  return <div className="mt-6 max-w-2xl space-y-4 text-[15.5px] leading-8 text-stone-400">{children}</div>;
}

function PullQuote({ children }: { children: ReactNode }) {
  return (
    <blockquote className="mt-8 max-w-2xl border-l-2 border-usam-gold/70 pl-6">
      <p className="text-xl font-medium leading-8 text-stone-200" style={{ fontFamily: font.oswald }}>
        {children}
      </p>
    </blockquote>
  );
}

function Section({
  children,
  id,
  variant = "plain",
}: {
  children: ReactNode;
  id: string;
  variant?: "plain" | "panel" | "feature" | "save";
}) {
  const backgrounds: Record<typeof variant, string> = {
    feature:
      "relative overflow-hidden border-y border-stone-900/80 bg-[radial-gradient(circle_at_18%_10%,rgba(194,161,78,0.1),transparent_28%),linear-gradient(180deg,rgba(13,13,13,0.4),#0D0D0D_18%)]",
    panel: "border-y border-stone-900/80 bg-white/[0.015]",
    plain: "",
    save: "relative overflow-hidden border-y border-stone-900/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(13,13,13,0.5)_20%)]",
  };

  return (
    <section className={`scroll-mt-24 px-6 py-20 md:py-28 ${backgrounds[variant]}`} id={id}>
      <div className="relative mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

function TagGrid({ items }: { items: string[] }) {
  return (
    <div className="mt-8 grid grid-cols-1 gap-px bg-stone-800 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div className="bg-usam-black px-5 py-4 text-[14px] leading-6 text-stone-300" key={item}>
          {item}
        </div>
      ))}
    </div>
  );
}

function StepSequence({ steps }: { steps: string[] }) {
  return (
    <div className="mt-10 flex flex-col divide-y divide-stone-800 border-y border-stone-800 sm:flex-row sm:divide-x sm:divide-y-0">
      {steps.map((step, index) => (
        <div className="flex flex-1 items-center gap-3 px-5 py-4" key={step}>
          <span
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-usam-gold/50 text-[11px] font-bold text-usam-gold"
            style={{ fontFamily: font.rajdhani }}
          >
            {index + 1}
          </span>
          <span className="text-[13.5px] font-medium uppercase tracking-[0.04em] text-stone-300" style={{ fontFamily: font.rajdhani }}>
            {step}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* SECTION 01 — COVER                                                      */
/* ---------------------------------------------------------------------- */

function CoverSection() {
  return (
    <header
      className="relative overflow-hidden bg-[radial-gradient(1200px_700px_at_78%_-20%,rgba(194,161,78,0.14),transparent_62%)] px-6 pb-16 pt-20 md:pt-28"
      id="cover"
    >
      <div className="relative mx-auto max-w-6xl">
        <Eyebrow>Private Board Briefing</Eyebrow>
        <h1
          className="mt-6 max-w-3xl text-[clamp(2.2rem,5.6vw,3.5rem)] font-bold leading-[1.08] text-stone-100"
          style={{ fontFamily: font.oswald }}
        >
          What God Has Built, What It&rsquo;s Teaching Us, and Where It Might Lead
        </h1>
        <p className="mt-7 max-w-2xl text-xl leading-8 text-stone-400">
          A short, personal walkthrough of USA Missionaries, why we built DOS to steward relationships and fruit
          with wisdom, and why that same journey has led to an emerging opportunity to help the SAVE Standard come
          to life.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-6 border-t border-stone-900 pt-6">
          <div>
            <p className="text-sm font-semibold text-stone-200">Ryan Fox</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-stone-500" style={{ fontFamily: font.rajdhani }}>
              Founder, USA Missionaries
            </p>
          </div>
          <span className="hidden h-8 w-px bg-stone-800 sm:block" aria-hidden="true" />
          <p className="max-w-md text-[12.5px] leading-6 text-stone-600">
            Prepared for a private board conversation. Please do not share this link or access code outside the
            board.
          </p>
          <div className="ml-auto">
            <BoardBriefingPrintButton />
          </div>
        </div>
      </div>
    </header>
  );
}

/* ---------------------------------------------------------------------- */
/* SECTION 02 — WHO I AM                                                   */
/* ---------------------------------------------------------------------- */

function WhoIAmSection() {
  return (
    <Section id="who-i-am">
      <Eyebrow>Sec 02 · Who I Am</Eyebrow>
      <SectionHeading>Who I Am</SectionHeading>
      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Prose>
          <p>
            I&rsquo;m Ryan Fox. My wife Brooke and I founded USA Missionaries because we kept meeting people who
            wanted to follow Jesus more seriously and had nowhere practical to start. We began at kitchen tables,
            in coffee shops, and in living rooms &mdash; and we&rsquo;re still there today.
          </p>
          <p>
            Before ministry, my background was in business, operations, and building systems &mdash; finance,
            process design, and technology. That background is why USA Missionaries has always tried to pair real
            relational ministry with real infrastructure, rather than choosing one or the other.
          </p>
          <p>
            My role with SAVE is still developing. Today it&rsquo;s best described as advisor, contributor, and
            systems-builder &mdash; helping translate a vision Dirk and Julia have carried for decades into working
            tools. I don&rsquo;t own the SAVE Standard, and this briefing isn&rsquo;t about USA Missionaries and SAVE
            becoming one thing.
          </p>
        </Prose>

        <div className="grid grid-cols-2 gap-3">
          <div className="relative aspect-[3/4] overflow-hidden border border-stone-800">
            <Image alt="Ryan Fox" className="object-cover" fill sizes="180px" src="/images/board/ryan-fox.webp" />
          </div>
          <div className="relative aspect-[3/4] overflow-hidden border border-stone-800">
            <Image alt="Brooke Fox" className="object-cover" fill sizes="180px" src="/images/board/brooke-fox.webp" />
          </div>
          <BoardBriefingMedia
            alt="Ryan and Brooke Fox in relational ministry"
            aspect="wide"
            className="col-span-2"
            id="ryan-brooke-ministry-01"
            kind="photo"
            subject="Ryan & Brooke together in ministry — a kitchen table or home setting"
          />
        </div>
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------------- */
/* SECTION 03 — WHAT USA MISSIONARIES IS BUILDING                          */
/* ---------------------------------------------------------------------- */

const trainEquipDeploySupport = [
  { body: "We teach believers what it actually looks like to follow Jesus and make disciples in ordinary life.", title: "Train" },
  { body: "We give people practical tools, language, and pathways they can use immediately, not just theory.", title: "Equip" },
  { body: "We send people into real relationships and real conversations, not just programs.", title: "Deploy" },
  { body: "We stay with people through accountability, prayer, and infrastructure so the work is sustained.", title: "Support" },
] as const;

function VisionSection() {
  return (
    <Section id="vision" variant="panel">
      <Eyebrow>Sec 03 · The Vision</Eyebrow>
      <SectionHeading>What USA Missionaries Is Building</SectionHeading>
      <Lede>USA Missionaries trains, equips, deploys, and supports everyday missionaries.</Lede>

      <div className="mt-10 grid grid-cols-1 gap-px bg-stone-800 sm:grid-cols-2 lg:grid-cols-4">
        {trainEquipDeploySupport.map((item) => (
          <div className="bg-usam-black px-6 py-8" key={item.title}>
            <p className="text-[11px] uppercase tracking-[0.22em] text-usam-gold" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              {item.title}
            </p>
            <p className="mt-3 text-[14.5px] leading-7 text-stone-400">{item.body}</p>
          </div>
        ))}
      </div>

      <PullQuote>We help everyday believers move from good intentions to practical disciple-making.</PullQuote>

      <Prose>
        <p>
          USA Missionaries isn&rsquo;t an event series, a content channel, or a piece of software. Those things
          support the work, but they aren&rsquo;t the work. The work is ordinary people learning to have real
          spiritual conversations, build real relationships, and disciple real people &mdash; with enough structure
          behind them that it doesn&rsquo;t depend on any one person&rsquo;s memory or willpower.
        </p>
      </Prose>
    </Section>
  );
}

/* ---------------------------------------------------------------------- */
/* SECTION 04 — KITCHEN TABLE                                              */
/* ---------------------------------------------------------------------- */

const kitchenTablePathways = [
  { label: "Kitchen Table Gospel", status: "In use today" },
  { label: "Commands of Jesus", status: "In use today" },
  { label: "Are You Really a Disciple?", status: "In development" },
  { label: "Testimony development", status: "In development" },
  { label: "Grace and truth conversations", status: "In development" },
  { label: "Evangelism", status: "In development" },
  { label: "One-on-one discipleship", status: "In development" },
  { label: "Home gatherings", status: "In development" },
  { label: "Coffee-shop meetings", status: "In development" },
] as const;

function KitchenTableSection() {
  return (
    <Section id="kitchen-table">
      <Eyebrow>Sec 04 · Practical Ministry</Eyebrow>
      <SectionHeading>Kitchen Table: One Way We Put Training Into Practice</SectionHeading>
      <Lede>
        Kitchen Table is one practical ministry methodology we use &mdash; not the whole of USA Missionaries. It
        gives people a simple, repeatable way to have real spiritual conversations wherever life already happens.
      </Lede>

      <Prose>
        <p>
          We give people practical teaching and ministry pathways they can use immediately &mdash; in homes,
          coffee shops, churches, workplaces, and everyday relationships. Some of these pathways are already in
          active use. Others are still being developed and refined.
        </p>
      </Prose>

      <p className="mt-10 text-[11px] uppercase tracking-[0.2em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        A Simple Ministry Sequence
      </p>
      <StepSequence steps={["Relationship", "Conversation", "Truth", "Response", "Follow-up", "Multiplication"]} />

      <p className="mt-12 text-[11px] uppercase tracking-[0.2em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        Current &amp; Developing Pathways
      </p>
      <div className="mt-4 grid grid-cols-1 gap-px bg-stone-800 sm:grid-cols-2">
        {kitchenTablePathways.map((pathway) => (
          <div className="flex items-center justify-between gap-4 bg-usam-black px-5 py-3.5" key={pathway.label}>
            <span className="text-[14px] text-stone-300">{pathway.label}</span>
            <span
              className={`whitespace-nowrap text-[10px] uppercase tracking-[0.14em] ${
                pathway.status === "In use today" ? "text-usam-gold" : "text-stone-600"
              }`}
              style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
            >
              {pathway.status}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <BoardBriefingMedia alt="Kitchen table conversation" id="kitchen-table-01" subject="A real kitchen-table conversation" />
        <BoardBriefingMedia alt="Kitchen table ministry moment" id="kitchen-table-02" subject="A kitchen-table or coffee-shop ministry moment" />
        <BoardBriefingMedia alt="Group prayer" id="group-prayer-01" subject="A group praying together" />
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------------- */
/* SECTION 05 — WHY ACCOUNTABLE STEWARDSHIP MATTERS (DOS)                  */
/* ---------------------------------------------------------------------- */

const engagementScale = [
  { helper: "All in. No reservations. Has counted the cost.", label: "+3", name: "Fully Committed" },
  { helper: "Committed with some reservations. Currently counting the cost.", label: "+2", name: "Committed" },
  { helper: "Desires to follow Jesus but struggles with competing priorities and distractions.", label: "+1", name: "Seeking Commitment" },
  { helper: "Interested in spiritual things but not currently taking action.", label: "0", name: "Interested" },
  { helper: "Often seeks God's help during difficulties but repeatedly encounters roadblocks.", label: "-1", name: "Crisis Driven" },
  { helper: "Consumed by personal issues and rarely receptive to counsel or guidance.", label: "-2", name: "Resistant" },
  { helper: "Refuses counsel. Refuses responsibility. Unwilling to consider change.", label: "-3", name: "Hardened" },
] as const;

function EngagementScale() {
  return (
    <div className="mt-8 divide-y divide-stone-800 border-y border-stone-800">
      {engagementScale.map((row) => (
        <div className="flex items-start gap-5 py-3.5" key={row.name}>
          <span
            className="mt-0.5 w-9 flex-shrink-0 text-right text-[15px] font-bold text-usam-gold"
            style={{ fontFamily: font.oswald }}
          >
            {row.label}
          </span>
          <div>
            <p className="text-[14.5px] font-semibold text-stone-200">{row.name}</p>
            <p className="mt-0.5 text-[13.5px] leading-6 text-stone-500">{row.helper}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function CirclesDiagram() {
  const rings = [
    { label: "3", r: 46 },
    { label: "12", r: 92 },
    { label: "70", r: 138 },
    { label: "120", r: 184 },
  ] as const;

  return (
    <figure className="mt-8">
      <svg aria-labelledby="circles-title" className="mx-auto w-full max-w-md" role="img" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
        <title id="circles-title">Concentric circles of relational investment: 3, 12, 70, 120, and the wider field</title>
        <circle cx="200" cy="200" fill="none" r="196" stroke="#2a2f36" strokeDasharray="3 5" strokeWidth="1.5" />
        {rings.map((ring) => (
          <circle
            cx="200"
            cy="200"
            fill="none"
            key={ring.label}
            r={ring.r}
            stroke="#C2A14E"
            strokeOpacity={0.35 + (184 - ring.r) / 184 * 0.4}
            strokeWidth="1.75"
          />
        ))}
        <circle cx="200" cy="200" fill="#C2A14E" r="4" />
        {rings.map((ring) => (
          <text
            fill="#d1d5db"
            fontFamily="'Rajdhani', sans-serif"
            fontSize="13"
            fontWeight={700}
            key={`label-${ring.label}`}
            textAnchor="middle"
            x="200"
            y={200 - ring.r - 8}
          >
            My {ring.label}
          </text>
        ))}
        <text fill="#8a8f97" fontFamily="'Rajdhani', sans-serif" fontSize="12" letterSpacing="1.5" textAnchor="middle" x="200" y="18">
          THE WIDER FIELD
        </text>
      </svg>
      <figcaption
        className="mt-3 flex flex-wrap justify-center gap-3 border-t border-stone-800 pt-3 text-center text-[11px] uppercase tracking-[0.18em] text-stone-500"
        style={{ fontFamily: font.rajdhani }}
      >
        <span>Jesus loved everyone, but He did not invest equal time in everyone.</span>
      </figcaption>
    </figure>
  );
}

const fruitExamples = [
  "Keeping commitments",
  "Growing in Scripture and prayer",
  "Obeying Jesus",
  "Taking responsibility",
  "Sharing testimony",
  "Making disciples",
  "Leading others",
  "Sustained life change",
];

function StewardshipSection() {
  const engagementSrc = resolveBoardBriefingImage("dos-engagement");
  const circlesSrc = resolveBoardBriefingImage("dos-circles");
  const meetingsSrc = resolveBoardBriefingImage("dos-meetings");

  return (
    <Section id="stewardship" variant="feature">
      <Eyebrow>Sec 05 · Stewardship</Eyebrow>
      <SectionHeading>Why Accountable Stewardship Matters</SectionHeading>
      <Lede>DOS helps leaders steward relationships, time, accountability, and ministry fruit with wisdom.</Lede>

      <Prose>
        <p>
          Every leader has met people who take significant time and prayer, again and again, without any real
          change or follow-through &mdash; while other people, ready for deeper investment, quietly wait. Without
          an intentional system, time, prayer needs, commitments, and next steps are easy to forget. DOS exists to
          make those patterns visible.
        </p>
      </Prose>

      <div className="mt-16 grid gap-16 lg:grid-cols-2 lg:gap-12">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-usam-gold" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            A. Engagement
          </p>
          <p className="mt-2 text-[15px] leading-7 text-stone-400">
            A discernment and conversation tool &mdash; not a label or a condemnation.
          </p>
          <EngagementScale />
          <PullQuote>Where is this person today, and what is the most loving and responsible next step?</PullQuote>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-usam-gold" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            B. Circles of Investment
          </p>
          <p className="mt-2 text-[15px] leading-7 text-stone-400">
            Time, engagement, commitments, and fruit help a leader see where deeper investment may be appropriate
            &mdash; a discernment aid, never a substitute for prayer.
          </p>
          <CirclesDiagram />
        </div>
      </div>

      <div className="mt-16 grid gap-16 lg:grid-cols-2 lg:gap-12">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-usam-gold" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            C. Meetings &amp; Follow-Through
          </p>
          <Prose>
            <p>
              Meaningful ministry meetings happen at kitchen tables, in coffee shops, at church, at home, during
              evangelism, in mentoring, and online. DOS helps preserve what was discussed, prayer needs,
              commitments, next steps, follow-up, and time invested &mdash; so nothing depends on memory alone.
            </p>
          </Prose>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-usam-gold" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            D. Fruit
          </p>
          <p className="mt-2 text-[15px] leading-7 text-stone-400">Activity alone is not the goal. There must be fruit.</p>
          <TagGrid items={fruitExamples} />
        </div>
      </div>

      <p className="mt-16 text-[11px] uppercase tracking-[0.2em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        A Few Screens, Not a Product Demo
      </p>
      <BoardBriefingScreenshotLightbox
        items={[
          {
            alt: "DOS engagement scale on a person's record, showing the discernment tool in context.",
            caption: "Engagement scale",
            id: "dos-engagement",
            src: engagementSrc,
          },
          {
            alt: "DOS circles of investment view, grouping people into My 3, My 12, My 70, and My 120.",
            caption: "Circles of investment",
            id: "dos-circles",
            src: circlesSrc,
          },
          {
            alt: "DOS meetings and fruit overview showing follow-up and ministry fruit.",
            caption: "Meetings & fruit overview",
            id: "dos-meetings",
            src: meetingsSrc,
          },
        ]}
      />
    </Section>
  );
}

/* ---------------------------------------------------------------------- */
/* SECTION 06 — THE SAVE STANDARD                                          */
/* ---------------------------------------------------------------------- */

const ministryProblems = [
  "Leaders are overwhelmed",
  "Knowledge stays in people's heads",
  "Processes are undocumented",
  "Transparency is limited",
  "Accountability is inconsistent",
  "Administrative work is duplicated",
  "Leadership health is often ignored",
  "Passion grows faster than infrastructure",
];

const organizationalHealthAreas = [
  "Leadership integrity",
  "Doctrine and mission alignment",
  "Governance",
  "Financial stewardship",
  "Transparency",
  "Compliance",
  "Processes and documentation",
  "Technology",
  "Communication",
  "Fruit",
  "External trust",
  "Sustainability",
];

const leaderHealthQuestions = [
  "Is the leader healthy?",
  "Are they overwhelmed?",
  "Are they isolated?",
  "Do they have accountability?",
  "Is their family under strain?",
  "Are they approaching burnout?",
  "Do trusted people truly know them?",
  "Is their inner life strong enough to sustain the mission?",
];

function SaveStandardSection() {
  return (
    <>
      <div className="border-t border-stone-800 bg-usam-black px-6 py-6">
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <span className="text-[11px] uppercase tracking-[0.3em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Part Two
          </span>
          <span className="h-px flex-1 bg-stone-800" aria-hidden="true" />
          <span className="text-[11px] uppercase tracking-[0.3em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            The SAVE Standard
          </span>
        </div>
      </div>

      <Section id="save-standard" variant="save">
        <Eyebrow tone="neutral">Sec 06 · A Different Organization</Eyebrow>
        <SectionHeading>Why Ministries Need the SAVE Standard</SectionHeading>

        <PullQuote>
          The lessons learned while building USA Missionaries led to deeper conversations with Dirk about a problem
          facing ministries everywhere.
        </PullQuote>

        <Prose>
          <p>
            SAVE is its own organization. The SAVE Standard is a SAVE initiative &mdash; it does not belong to USA
            Missionaries or to me. I helped develop SAVE&rsquo;s website and processes, and I&rsquo;m being invited
            into a growing advisory role, but SAVE&rsquo;s mission and leadership are Dirk and Julia&rsquo;s, not
            mine.
          </p>
        </Prose>

        <p className="mt-10 text-[11px] uppercase tracking-[0.2em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          The Problem
        </p>
        <TagGrid items={ministryProblems} />

        <div className="mt-16 grid gap-px bg-stone-800 lg:grid-cols-2">
          <div className="bg-usam-black px-7 py-9">
            <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Organizational Health
            </p>
            <p className="mt-3 text-[14px] leading-7 text-stone-500">
              A structured look at how a ministry actually runs.
            </p>
            <ul className="mt-5 space-y-2 text-[14px] leading-6 text-stone-400">
              {organizationalHealthAreas.map((area) => (
                <li className="flex items-start gap-2" key={area}>
                  <span aria-hidden="true" className="mt-2 h-1 w-1 flex-shrink-0 rotate-45 border border-stone-600" />
                  {area}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-usam-black px-7 py-9">
            <p className="text-[11px] uppercase tracking-[0.2em] text-usam-gold" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Leader Health &mdash; The Differentiator
            </p>
            <p className="mt-3 text-[14px] leading-7 text-stone-500">
              Dirk and Julia bring more than thirty years of sitting with ministry leaders &mdash; sharing meals,
              listening, and asking how they&rsquo;re really doing, not just reviewing documents.
            </p>
            <ul className="mt-5 space-y-2 text-[14px] leading-6 text-stone-400">
              {leaderHealthQuestions.map((question) => (
                <li className="flex items-start gap-2" key={question}>
                  <span aria-hidden="true" className="mt-2 h-1 w-1 flex-shrink-0 rotate-45 border border-usam-gold/60" />
                  {question}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <PullQuote>Healthy ministries require healthy systems and healthy leaders.</PullQuote>

        <div className="mt-14 grid gap-4 sm:grid-cols-2">
          <BoardBriefingMedia alt="SAVE Standard website" id="save-standard-home" subject="SAVE Standard homepage" />
          <BoardBriefingMedia alt="Dirk and Julia Bond" id="dirk-julia" subject="Dirk and Julia Bond" />
        </div>

        <p className="mt-8 text-[13.5px] leading-7 text-stone-500">
          Learn more directly from SAVE:{" "}
          <a
            className="text-usam-gold underline decoration-usam-gold/40 underline-offset-4 hover:decoration-usam-gold"
            href="https://www.savestandard.org/"
            rel="noreferrer noopener"
            target="_blank"
          >
            savestandard.org
          </a>
          .
        </p>
      </Section>
    </>
  );
}

/* ---------------------------------------------------------------------- */
/* SECTION 07 — MY CONTRIBUTION                                            */
/* ---------------------------------------------------------------------- */

const contributionAreas = [
  "Systems thinking",
  "Process design",
  "Technology",
  "Website & product development",
  "Documentation",
  "Standardization",
  "Organizational structure",
  "User experience",
  "Translating vision into working tools",
  "Testing and refinement",
];

function ContributionSection() {
  return (
    <Section id="contribution" variant="panel">
      <Eyebrow tone="neutral">Sec 07 · My Contribution</Eyebrow>
      <SectionHeading>How My Experience Could Help Bring It to Life</SectionHeading>
      <Lede>
        Before asking other ministries to go through the process, USA Missionaries is willing to be evaluated,
        learn from the results, and help identify what works and what needs refinement.
      </Lede>

      <TagGrid items={contributionAreas} />

      <p className="mt-14 text-[11px] uppercase tracking-[0.2em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        A Simple Process
      </p>
      <StepSequence steps={["Assess", "Understand", "Recommend", "Implement", "Measure", "Refine"]} />

      <Prose>
        <p>
          USA Missionaries may become one of the first organizations to go through the SAVE Standard so SAVE can
          test the model, find its weak points, and refine the experience before offering it more broadly.
        </p>
        <p className="text-stone-500">
          A future integration between Ministry of Reconciliation and USA Missionaries may also become a useful
          case study on reducing duplicated overhead and strengthening shared infrastructure &mdash; that work is
          still exploratory, and nothing here should be read as confirming a completed merger.
        </p>
      </Prose>
    </Section>
  );
}

/* ---------------------------------------------------------------------- */
/* SECTION 08 — CLOSING                                                    */
/* ---------------------------------------------------------------------- */

function ClosingSection() {
  return (
    <Section id="closing">
      <Eyebrow>Sec 08 · Discussion</Eyebrow>
      <SectionHeading>One Opportunity, Two Distinct Ministries</SectionHeading>

      <Prose>
        <p>
          The opportunity here is not to combine USA Missionaries and SAVE. The opportunity is to bring
          complementary experience to the table &mdash; SAVE&rsquo;s decades of relational ministry wisdom, and my
          ability to organize, build, document, and operationalize vision.
        </p>
      </Prose>

      <PullQuote>How could these gifts best serve SAVE and the ministries it supports?</PullQuote>

      <div className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-stone-800 pt-8">
        <a className="text-[12px] uppercase tracking-[0.16em] text-stone-400 hover:text-usam-gold" href="/" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          USA Missionaries →
        </a>
        <a
          className="text-[12px] uppercase tracking-[0.16em] text-stone-400 hover:text-usam-gold"
          href="https://www.savestandard.org/"
          rel="noreferrer noopener"
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          target="_blank"
        >
          SAVE Standard →
        </a>
        <a
          className="text-[12px] uppercase tracking-[0.16em] text-stone-600 hover:text-usam-gold"
          href="/dos/app/preview"
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
        >
          DOS Preview (separate access) →
        </a>
        <div className="ml-auto">
          <BoardBriefingPrintButton />
        </div>
      </div>

      <p className="mt-10 text-xs leading-6 text-stone-600">
        Private board briefing · USA Missionaries and SAVE are independent organizations · Not a fundraising or
        legal document.
      </p>
    </Section>
  );
}

/* ---------------------------------------------------------------------- */
/* PAGE                                                                    */
/* ---------------------------------------------------------------------- */

export default function BoardBriefingPage() {
  return (
    <main className="min-h-screen bg-usam-black text-stone-100">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @page { size: letter; margin: 0.5in; }
        @media print {
          .no-print { display: none !important; }
          html, body { background: #ffffff !important; color: #111111 !important; }
        }
      `,
        }}
      />
      <PrimaryNav minimal />
      <BoardBriefingMobileNav />
      <BoardBriefingSectionRail />

      <CoverSection />
      <WhoIAmSection />
      <VisionSection />
      <KitchenTableSection />
      <StewardshipSection />
      <SaveStandardSection />
      <ContributionSection />
      <ClosingSection />
    </main>
  );
}
