"use client";

import {
  Bike,
  Church,
  Compass,
  Dumbbell,
  Flag,
  Footprints,
  HandHeart,
  Handshake,
  Mountain,
  PersonStanding,
  Waves,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { CTAButton, Eyebrow, PoweredBy, Reveal, SectionHeading, Wordmark } from "./primitives";
import { font, t2 } from "./theme";

/* ------------------------------------------------------------------ chrome */

function FounderPreviewBanner() {
  return (
    <div
      className="relative z-[60] w-full border-b px-4 py-2 text-center text-[9px] font-semibold uppercase leading-tight tracking-[0.18em] sm:text-[10px] sm:tracking-[0.2em]"
      style={{ background: t2.inkDeep, borderColor: t2.panelBorder, color: t2.goldSoft, fontFamily: font.ui }}
    >
      Founder Preview &middot; 2THREE2 Design Concept &middot; Not a Live Site
    </div>
  );
}

function Header() {
  return (
    <header
      className="fixed inset-x-0 top-[27px] z-50 w-full border-b sm:top-[29px]"
      style={{ background: "rgba(6,9,13,0.9)", backdropFilter: "blur(14px)", borderColor: t2.panelBorder }}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-3.5 md:px-10 md:py-4">
        {/* not a single wrapping anchor: PoweredBy carries its own link out to
            usamissionaries.org, and nesting anchors is invalid HTML */}
        <div className="flex flex-col leading-none">
          <a href="#top">
            <Wordmark className="text-lg sm:text-xl" />
          </a>
          <PoweredBy className="mt-1 hidden sm:inline" />
        </div>
        <CTAButton href="#start-or-join">Join the Movement</CTAButton>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ vision */

const whatItIs = [
  "An active discipleship movement for ordinary people.",
  "A way to build real friendships while you move.",
  "A rhythm of prayer for each other and for the places you go.",
  "A front door into growth, service, and mission.",
] as const;

const whatItIsNot = [
  "A running club.",
  "A gym or a fitness brand.",
  "A team for serious athletes only.",
  "A replacement for your local church.",
] as const;

const whatGrows = [
  "Relationships",
  "Prayer",
  "Spiritual growth",
  "Accountability",
  "Community involvement",
  "Service",
  "Disciple-making",
  "Mission",
] as const;

/* ------------------------------------------------------- why we move flow */

const progressionSteps = [
  "Show up",
  "Move together",
  "Build trust",
  "Pray together",
  "Pursue Jesus",
  "Live on mission",
] as const;

function ProgressionFlow() {
  const nodes = progressionSteps.map((label, i) => ({
    label,
    x: 96 + i * 186,
    y: 168 - i * 24,
  }));
  const linePath = nodes
    .map((n, i) => {
      if (i === 0) return `M${n.x},${n.y}`;
      const prev = nodes[i - 1];
      const mx = (prev.x + n.x) / 2;
      return `C${mx},${prev.y} ${mx},${n.y} ${n.x},${n.y}`;
    })
    .join(" ");

  return (
    <>
      {/* desktop: an ascending path, so the progression reads as growth */}
      <svg aria-hidden="true" className="hidden w-full md:block" viewBox="0 0 1120 230">
        <defs>
          <linearGradient id="flow-line" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor={t2.goldDeep} stopOpacity={0.35} />
            <stop offset="100%" stopColor={t2.goldSoft} />
          </linearGradient>
        </defs>
        <path d={linePath} fill="none" stroke="url(#flow-line)" strokeLinecap="round" strokeWidth={2} />
        {nodes.map((n, i) => (
          <g key={n.label}>
            <circle cx={n.x} cy={n.y} fill={t2.ink} r={10} stroke={t2.gold} strokeWidth={1.8} />
            <circle cx={n.x} cy={n.y} fill={t2.gold} opacity={0.35 + i * 0.13} r={4} />
            <text
              fill={t2.creamFaint}
              fontFamily={font.ui}
              fontSize={11}
              fontWeight={600}
              letterSpacing={2}
              textAnchor="middle"
              x={n.x}
              y={n.y - 24}
            >
              {String(i + 1).padStart(2, "0")}
            </text>
            <text
              fill="#FFFFFF"
              fontFamily={font.display}
              fontSize={17}
              fontWeight={500}
              textAnchor="middle"
              x={n.x}
              y={n.y + 34}
            >
              {n.label}
            </text>
          </g>
        ))}
      </svg>

      {/* mobile view, and the accessible representation of the flow above */}
      <ol className="relative md:hidden">
        <span aria-hidden="true" className="absolute bottom-4 left-[13px] top-4 w-px" style={{ background: t2.goldDeep }} />
        {progressionSteps.map((step, i) => (
          <li className="relative flex items-center gap-4 py-3" key={step}>
            <span
              className="relative z-10 flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-full border text-[10px] font-bold"
              style={{ background: t2.ink, borderColor: t2.gold, color: t2.goldSoft, fontFamily: font.ui }}
            >
              {i + 1}
            </span>
            <span className="text-lg font-medium" style={{ color: "#FFFFFF", fontFamily: font.display }}>
              {step}
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}

/* ------------------------------------------------------------- commitments */

const commitments: Array<{ icon: LucideIcon; title: string; body: string }> = [
  { body: "Create consistent rhythms of activity together.", icon: Footprints, title: "Move" },
  { body: "Pray for one another and the places we move through.", icon: HandHeart, title: "Pray" },
  { body: "Pursue righteousness, faith, love, peace, and Jesus together.", icon: Compass, title: "Pursue" },
  {
    body: "Carry faith into homes, workplaces, neighborhoods, communities, and mission fields.",
    icon: Flag,
    title: "Go",
  },
];

/* --------------------------------------------------------------- activities */

const activities: Array<{ icon: LucideIcon; label: string }> = [
  { icon: Footprints, label: "Running" },
  { icon: PersonStanding, label: "Walking" },
  { icon: Mountain, label: "Hiking" },
  { icon: Bike, label: "Cycling" },
  { icon: Waves, label: "Triathlon" },
  { icon: Dumbbell, label: "Fitness" },
];

const gatheringSteps = [
  "Meet consistently.",
  "Share a short Scripture, question, or prayer focus.",
  "Move together.",
  "Pray during or after the activity.",
  "Encourage a practical next step.",
  "Look for opportunities to serve and make disciples.",
] as const;

/* --------------------------------------------------------- interest concept */

type InterestKind = "join" | "start";

/**
 * Local-only concept UI. No network call, no Supabase, no backend: submitting
 * flips a confirmation so the founder can see the intended shape of the flow
 * without this preview ever collecting real data.
 */
function InterestConceptCard({
  kind,
  title,
  body,
  ctaLabel,
}: {
  kind: InterestKind;
  title: string;
  body: string;
  ctaLabel: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const fieldPrefix = `${kind}-gathering`;

  return (
    <div
      className="flex h-full flex-col border p-7 md:p-8"
      style={{ background: t2.panel, borderColor: t2.panelBorder }}
    >
      <h3 className="text-2xl font-bold" style={{ color: "#FFFFFF", fontFamily: font.display }}>
        {title}
      </h3>
      <p className="mt-3 flex-1 text-sm leading-relaxed" style={{ color: t2.creamMuted }}>
        {body}
      </p>

      {!isOpen ? (
        <button
          className="mt-6 inline-flex items-center justify-center gap-2 border px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors duration-300 sm:text-sm sm:tracking-[0.18em]"
          onClick={() => setIsOpen(true)}
          style={{ borderColor: t2.gold, color: t2.goldSoft, fontFamily: font.ui }}
          type="button"
        >
          {ctaLabel}
        </button>
      ) : (
        <form
          className="mt-6 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            setIsSubmitted(true);
          }}
        >
          {isSubmitted ? (
            <p
              className="border p-4 text-sm leading-relaxed"
              style={{ background: "rgba(212,168,85,0.08)", borderColor: t2.goldDeep, color: t2.goldSoft }}
            >
              Thanks for the interest. This is a design preview only, so nothing was sent or stored. A real
              interest form comes in a later phase.
            </p>
          ) : (
            <>
              <div>
                <label
                  className="text-[11px] uppercase tracking-[0.15em]"
                  htmlFor={`${fieldPrefix}-name`}
                  style={{ color: t2.creamFaint, fontFamily: font.ui }}
                >
                  Name
                </label>
                <input
                  className="mt-2 min-h-11 w-full border bg-transparent px-3 text-sm outline-none"
                  id={`${fieldPrefix}-name`}
                  placeholder="Your name"
                  style={{ borderColor: t2.panelBorder, color: "#FFFFFF" }}
                  type="text"
                />
              </div>
              <div>
                <label
                  className="text-[11px] uppercase tracking-[0.15em]"
                  htmlFor={`${fieldPrefix}-city`}
                  style={{ color: t2.creamFaint, fontFamily: font.ui }}
                >
                  City
                </label>
                <input
                  className="mt-2 min-h-11 w-full border bg-transparent px-3 text-sm outline-none"
                  id={`${fieldPrefix}-city`}
                  placeholder="City, State"
                  style={{ borderColor: t2.panelBorder, color: "#FFFFFF" }}
                  type="text"
                />
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: t2.creamFaint }}>
                Concept only. This preview form is not connected to anything.
              </p>
              <button
                className="inline-flex w-full items-center justify-center gap-2 px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] sm:text-sm sm:tracking-[0.18em]"
                style={{ background: t2.gold, color: "#140F04", fontFamily: font.ui }}
                type="submit"
              >
                Submit interest
              </button>
            </>
          )}
        </form>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- page */

export function Two3TwoPage() {
  return (
    <main
      className="min-h-screen overflow-x-hidden"
      data-domain-site="2three2-v1"
      id="top"
      style={{ background: t2.ink, color: t2.cream }}
    >
      <FounderPreviewBanner />
      <Header />

      {/* ============================================================ HERO */}
      <section className="relative flex min-h-[86vh] items-center overflow-hidden pt-28 md:min-h-screen md:pt-24">
        {/* Real photograph of real people from the ministry, already used on
            /vision. Placeholder illustrations of invented people were removed
            at the founder's direction. */}
        <Image
          alt="A group gathered together after moving and praying"
          className="object-cover object-center"
          fill
          priority
          sizes="100vw"
          src="/images/vision/group-prayer-01.jpg"
        />
        <div
          className="absolute inset-0 md:hidden"
          style={{
            background:
              "linear-gradient(180deg, rgba(5,7,10,0.93) 0%, rgba(5,7,10,0.86) 46%, rgba(5,7,10,0.72) 74%, rgba(5,7,10,0.9) 100%)",
          }}
        />
        <div
          className="absolute inset-0 hidden md:block"
          style={{
            background:
              "linear-gradient(100deg, rgba(5,7,10,0.96) 0%, rgba(5,7,10,0.9) 38%, rgba(5,7,10,0.6) 64%, rgba(5,7,10,0.42) 100%)",
          }}
        />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-12 md:px-10 md:py-16">
          <div className="max-w-2xl">
            <Reveal>
              <Eyebrow>An active discipleship movement</Eyebrow>
            </Reveal>
            <Reveal delay={100}>
              <h1
                className="text-[2.9rem] font-bold leading-[0.98] tracking-tight sm:text-6xl md:text-7xl lg:text-[5.25rem]"
                style={{ color: "#FFFFFF", fontFamily: font.display }}
              >
                Run. Pray.
                <br />
                <span style={{ color: t2.gold }}>Pursue.</span>
              </h1>
            </Reveal>
            <Reveal delay={200}>
              <p
                className="mt-5 text-[12px] font-semibold uppercase leading-loose tracking-[0.18em] sm:text-sm sm:tracking-[0.2em]"
                style={{ color: t2.goldSoft, fontFamily: font.ui }}
              >
                Move together. Pray together. Pursue Jesus together.
              </p>
            </Reveal>
            <Reveal delay={300}>
              <p className="mt-5 max-w-xl text-base leading-relaxed md:text-lg" style={{ color: t2.creamMuted }}>
                2THREE2 is an active discipleship movement powered by USA Missionaries. Ordinary people gather
                around movement, pray over the places they live, build honest friendships, and pursue Jesus
                side by side.
              </p>
            </Reveal>
            <Reveal delay={420}>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:gap-4">
                <CTAButton href="#start-or-join">Join the Movement</CTAButton>
                <CTAButton href="#why-we-move" variant="secondary">
                  See How It Works
                </CTAButton>
              </div>
            </Reveal>
            <Reveal delay={520}>
              <p className="mt-6 sm:hidden">
                <PoweredBy />
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ================================================== WHAT 2THREE2 IS */}
      <section className="px-6 py-20 md:px-10 md:py-28" id="what-it-is">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionHeading eyebrow="The Vision" headline="Physical activity is the environment. Pursuing Jesus together is the purpose.">
              Almost anyone will go for a walk, a run, or a ride with a friend. 2THREE2 takes that ordinary
              space and builds something lasting inside it: people who know each other, pray for each other,
              grow in Christ together, and carry that into the places they already live and work.
            </SectionHeading>
          </Reveal>

          <div className="mt-14 grid gap-5 md:grid-cols-2">
            <Reveal>
              <div className="h-full border p-7 md:p-8" style={{ background: t2.panel, borderColor: t2.panelBorderStrong }}>
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.24em]"
                  style={{ color: t2.goldSoft, fontFamily: font.ui }}
                >
                  What this is
                </p>
                <ul className="mt-5 space-y-3.5">
                  {whatItIs.map((item) => (
                    <li className="flex items-start gap-3 text-[15px] leading-relaxed" key={item} style={{ color: t2.cream }}>
                      <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0" style={{ background: t2.gold }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="h-full border p-7 md:p-8" style={{ background: t2.panel, borderColor: t2.panelBorder }}>
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.24em]"
                  style={{ color: t2.creamFaint, fontFamily: font.ui }}
                >
                  What this is not
                </p>
                <ul className="mt-5 space-y-3.5">
                  {whatItIsNot.map((item) => (
                    <li className="flex items-start gap-3 text-[15px] leading-relaxed" key={item} style={{ color: t2.creamMuted }}>
                      <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0" style={{ background: t2.creamFaint }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>

          <Reveal delay={200}>
            <div className="mt-10">
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.24em]"
                style={{ color: t2.goldSoft, fontFamily: font.ui }}
              >
                What grows when we move together
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {whatGrows.map((item) => (
                  <span
                    className="border px-3.5 py-2 text-[13px]"
                    key={item}
                    style={{ background: t2.panelRaised, borderColor: t2.panelBorder, color: t2.cream }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ==================================================== WHY WE MOVE */}
      <section
        className="border-y px-6 py-20 md:px-10 md:py-28"
        id="why-we-move"
        style={{ background: t2.inkDeep, borderColor: t2.panelBorder }}
      >
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionHeading eyebrow="Why We Move" headline="Movement creates room for relationship.">
              Side by side, guards come down. Conversation moves easier. There is time, there is honesty, and
              there is room for God to do something.
            </SectionHeading>
          </Reveal>
          <Reveal delay={150}>
            <div className="mt-12 md:mt-6">
              <ProgressionFlow />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================================================ FOUR COMMITMENTS */}
      <section className="px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionHeading eyebrow="What We Commit To" headline="Four commitments, held together.">
              Not a program to finish. A rhythm to keep, with people who keep it alongside you.
            </SectionHeading>
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {commitments.map((c, i) => (
              <Reveal delay={i * 110} key={c.title}>
                <div className="h-full border p-7" style={{ background: t2.panel, borderColor: t2.panelBorder }}>
                  <div
                    className="mb-5 inline-flex h-11 w-11 items-center justify-center border"
                    style={{ borderColor: t2.goldDeep, color: t2.goldSoft }}
                  >
                    <c.icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.6} />
                  </div>
                  <h3 className="text-xl font-bold" style={{ color: "#FFFFFF", fontFamily: font.display }}>
                    {c.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: t2.creamMuted }}>
                    {c.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================= SCRIPTURE */}
      <section
        className="relative overflow-hidden border-y px-6 py-24 md:px-10 md:py-32"
        style={{ background: t2.inkDeep, borderColor: t2.panelBorder }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(212,168,85,0.11) 0%, transparent 62%)" }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <Reveal>
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.3em]"
              style={{ color: t2.goldSoft, fontFamily: font.ui }}
            >
              2 Timothy 2:22
            </p>
          </Reveal>
          <Reveal delay={120}>
            <blockquote
              className="mt-7 text-2xl font-medium leading-[1.35] sm:text-3xl md:text-[2.5rem]"
              style={{ color: "#FFFFFF", fontFamily: font.display }}
            >
              &ldquo;Pursue righteousness, faith, love, and peace, along with those who call on the Lord from a
              pure heart.&rdquo;
            </blockquote>
          </Reveal>
          <Reveal delay={240}>
            <p className="mx-auto mt-8 max-w-xl text-base leading-relaxed" style={{ color: t2.creamMuted }}>
              The whole movement sits on one phrase in that verse: <em style={{ color: t2.goldSoft }}>along with</em>.
              We are not told to pursue Jesus by ourselves. 2THREE2 exists to make the together part normal.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ================================================ MORE THAN RUNNING */}
      <section className="px-6 py-20 md:px-10 md:py-28" style={{ background: t2.light }}>
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <SectionHeading eyebrow="More Than Running" headline="Move however you already move." tone="light">
              Running started it, but the movement makes room for whatever gets people out the door together.
              No pace requirement. No athletic background needed.
            </SectionHeading>
          </Reveal>
          <Reveal delay={150}>
            <div className="mt-11 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {activities.map((a) => (
                <div
                  className="flex items-center gap-3 border px-4 py-3.5"
                  key={a.label}
                  style={{ background: "#FFFFFF", borderColor: t2.lightBorder }}
                >
                  <a.icon
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0"
                    strokeWidth={1.8}
                    style={{ color: t2.goldDeep }}
                  />
                  <span className="text-sm font-semibold" style={{ color: t2.onLight }}>
                    {a.label}
                  </span>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={260}>
            <p
              className="mx-auto mt-12 max-w-xl text-center text-2xl font-semibold leading-snug md:text-3xl"
              style={{ color: t2.onLight, fontFamily: font.display }}
            >
              The activity may change.
              <br />
              The purpose does not.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ============================================ WHAT A GATHERING IS */}
      <section className="border-t px-6 py-20 md:px-10 md:py-28" style={{ background: t2.lightAlt, borderColor: t2.lightBorder }}>
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <SectionHeading eyebrow="What a Gathering Looks Like" headline="Simple. Not rigid." tone="light">
              No script, no building, no title required. Just a consistent, honest rhythm with a few people.
            </SectionHeading>
          </Reveal>
          <Reveal delay={150}>
            <ol className="mt-11 grid gap-3 sm:grid-cols-2">
              {gatheringSteps.map((step, i) => (
                <li
                  className="flex items-start gap-4 border p-5"
                  key={step}
                  style={{ background: "#FFFFFF", borderColor: t2.lightBorder }}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center border text-xs font-bold"
                    style={{ borderColor: t2.gold, color: t2.goldDeep, fontFamily: font.ui }}
                  >
                    {i + 1}
                  </span>
                  <span className="pt-1 text-[15px] leading-relaxed" style={{ color: t2.onLight }}>
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </Reveal>
          <Reveal delay={260}>
            <p className="mx-auto mt-9 max-w-2xl text-center text-sm leading-relaxed" style={{ color: t2.onLightMuted }}>
              A gathering never replaces the local church. It sends people back to it, more connected, more
              prayed for, and more likely to obey what they already know.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ============================================= ACTIVE DISCIPLESHIP */}
      <section className="px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <SectionHeading
              eyebrow="Active Discipleship"
              headline="Discipleship does not have to begin in a classroom."
            >
              A shared mile opens space a classroom rarely does. Unhurried conversation. Honest prayer.
              Encouragement that lands because someone is actually beside you. And room to practice obedience
              together instead of only hearing about it.
            </SectionHeading>
          </Reveal>
          <Reveal delay={150}>
            <div className="mt-11 grid gap-5 sm:grid-cols-2">
              <a
                className="group flex items-center justify-between gap-4 border p-6 transition-colors duration-300"
                href="https://usamissionaries.org"
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = t2.panelBorderStrong; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = t2.panelBorder; }}
                style={{ background: t2.panel, borderColor: t2.panelBorder }}
              >
                <div>
                  <p
                    className="text-[11px] font-semibold uppercase tracking-[0.2em]"
                    style={{ color: t2.goldSoft, fontFamily: font.ui }}
                  >
                    Trains, equips, and sends
                  </p>
                  <p className="mt-2 text-lg font-bold" style={{ color: "#FFFFFF", fontFamily: font.display }}>
                    USA Missionaries
                  </p>
                </div>
                <Handshake aria-hidden="true" className="h-6 w-6 shrink-0" strokeWidth={1.6} style={{ color: t2.goldSoft }} />
              </a>
              <a
                className="group flex items-center justify-between gap-4 border p-6 transition-colors duration-300"
                href="https://kitchentablegospel.org"
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = t2.panelBorderStrong; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = t2.panelBorder; }}
                style={{ background: t2.panel, borderColor: t2.panelBorder }}
              >
                <div>
                  <p
                    className="text-[11px] font-semibold uppercase tracking-[0.2em]"
                    style={{ color: t2.goldSoft, fontFamily: font.ui }}
                  >
                    Table-shaped discipleship
                  </p>
                  <p className="mt-2 text-lg font-bold" style={{ color: "#FFFFFF", fontFamily: font.display }}>
                    Kitchen Table Gospel
                  </p>
                </div>
                <Church aria-hidden="true" className="h-6 w-6 shrink-0" strokeWidth={1.6} style={{ color: t2.goldSoft }} />
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================================== TRAIN TOGETHER LINK */}
      <section className="border-y px-6 py-20 md:px-10 md:py-24" style={{ background: t2.inkDeep, borderColor: t2.panelBorder }}>
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <div
              className="flex flex-col gap-8 border p-8 md:flex-row md:items-center md:justify-between md:p-12"
              style={{ background: t2.panel, borderColor: t2.panelBorderStrong }}
            >
              <div className="max-w-xl">
                <Eyebrow>Something to work toward</Eyebrow>
                <h2
                  className="text-3xl font-bold leading-tight md:text-4xl"
                  style={{ color: "#FFFFFF", fontFamily: font.display }}
                >
                  We train together, then we race together.
                </h2>
                <p className="mt-4 text-base leading-relaxed" style={{ color: t2.creamMuted }}>
                  Some gatherings pick something hard and work toward it as a team. A first 5K. A long hike. A
                  triathlon. The training season becomes the discipleship season, and the finish line is
                  something you cross with the people who got you there.
                </p>
              </div>
              <div className="shrink-0">
                <CTAButton href="/2three2-v1/race">Race With Purpose</CTAButton>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===================================================== START OR JOIN */}
      <section className="px-6 py-20 md:px-10 md:py-28" id="start-or-join">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <SectionHeading eyebrow="Start or Join" headline="There is a place for you in this.">
              Two ways in. Neither one requires an athletic background or a title.
            </SectionHeading>
          </Reveal>
          <Reveal delay={150}>
            <div className="mt-12 grid gap-5 md:grid-cols-2">
              <InterestConceptCard
                body="Find people near you who move, pray, and pursue Jesus together. Any pace, any activity, any starting point."
                ctaLabel="I'm interested in joining"
                kind="join"
                title="Join a Gathering"
              />
              <InterestConceptCard
                body="Gather a few people around a consistent rhythm of movement and prayer. USA Missionaries will help you start it well."
                ctaLabel="I'm interested in starting"
                kind="start"
                title="Start a Gathering"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================================================ FINAL CONNECTION */}
      <section
        className="relative overflow-hidden border-t px-6 py-24 md:px-10 md:py-32"
        style={{ background: t2.inkDeep, borderColor: t2.panelBorder }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 50% 80%, rgba(212,168,85,0.12) 0%, transparent 60%)" }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <Reveal>
            <Eyebrow>Movement that leads to mission</Eyebrow>
          </Reveal>
          <Reveal delay={120}>
            <p className="mx-auto max-w-xl text-base leading-relaxed md:text-lg" style={{ color: t2.creamMuted }}>
              2THREE2 is powered by USA Missionaries, which trains, equips, and sends ordinary Christians to
              obey Jesus, make disciples, and serve people wherever they are.
            </p>
          </Reveal>
          <Reveal delay={220}>
            <h2
              className="mt-10 text-[2.5rem] font-bold leading-[1.02] tracking-tight sm:text-5xl md:text-6xl"
              style={{ color: "#FFFFFF", fontFamily: font.display }}
            >
              You do not have to
              <br />
              pursue Jesus alone.
            </h2>
          </Reveal>
          <Reveal delay={330}>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
              <CTAButton href="#start-or-join">Join the Movement</CTAButton>
              <CTAButton href="#why-we-move" variant="secondary">
                See How It Works
              </CTAButton>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="border-t px-6 py-10 md:px-10" style={{ borderColor: t2.panelBorder }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
          <div>
            <Wordmark className="text-base" />
            <p className="mt-1.5">
              <PoweredBy />
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 md:items-end">
            <Link
              className="text-[11px] font-semibold uppercase tracking-[0.2em] underline decoration-dotted underline-offset-4"
              href="/2three2-v1/race"
              style={{ color: t2.goldSoft, fontFamily: font.ui }}
            >
              Race With Purpose
            </Link>
            <p className="max-w-md text-[11px] leading-relaxed" style={{ color: t2.creamFaint }}>
              Founder-review concept. Temporary wordmark and a non-functional interest form. No production
              routes, navigation, domains, or data were changed to build this preview.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
