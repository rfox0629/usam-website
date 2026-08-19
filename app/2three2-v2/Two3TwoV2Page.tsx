"use client";

import { Bike, Compass, Flag, Footprints, HandHeart, Mountain, PersonStanding, Waves } from "lucide-react";
import React, { useState } from "react";
import { Footer, PreviewBanner, SmartHeader } from "./Chrome";
import { Photo, ReservedPlate } from "./Photo";
import { ActionLink, Body, Display, Kicker, Reveal, useParallax } from "./primitives";
import { font, photos, v2 } from "./theme";

/* ------------------------------------------------------------------ hero */

function Hero() {
  const offset = useParallax(0.16);

  return (
    <section className="relative flex min-h-[92vh] items-end overflow-hidden md:min-h-screen">
      <div className="absolute inset-0" style={{ transform: `translate3d(0, ${offset}px, 0)`, willChange: "transform" }}>
        <Photo
          alt={photos.landscape.alt}
          className="h-[112%] w-full"
          focus="center 42%"
          priority
          scrim="linear-gradient(180deg, rgba(10,12,16,0.62) 0%, rgba(10,12,16,0.28) 34%, rgba(10,12,16,0.72) 74%, rgba(10,12,16,0.94) 100%)"
          src={photos.landscape.src}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-6 pb-20 pt-32 md:px-10 md:pb-28">
        <Reveal>
          <Kicker tone="dark">An active discipleship movement</Kicker>
        </Reveal>
        <Reveal delay={90}>
          <Display
            as="h1"
            className="mt-6 text-[3.4rem] leading-[0.88] sm:text-7xl md:text-8xl lg:text-[7.5rem]"
            tone="dark"
          >
            Run. Pray.
            <br />
            <span style={{ color: v2.goldBright }}>Pursue.</span>
          </Display>
        </Reveal>
        <div className="mt-10 flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <Reveal delay={200}>
            <Body className="max-w-lg text-lg leading-relaxed md:text-xl" tone="dark">
              Move together. Pray together. Pursue Jesus together.
            </Body>
          </Reveal>
          <Reveal delay={300}>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ActionLink href="#join" tone="dark" variant="solid">
                Join the Movement
              </ActionLink>
              <ActionLink href="/2three2-v2/race" tone="dark" variant="outline">
                Race With Purpose
              </ActionLink>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- purpose */

function Purpose() {
  return (
    <section className="px-6 py-24 md:px-10 md:py-40" style={{ background: v2.paper }}>
      <div className="mx-auto max-w-[1100px]">
        <Reveal>
          <Kicker>The purpose</Kicker>
        </Reveal>
        <Reveal delay={100}>
          <Display className="mt-7 text-[2.4rem] leading-[1.02] sm:text-5xl md:text-[4.2rem]">
            Physical activity is the environment.
            <br />
            <span style={{ color: v2.orange }}>Pursuing Jesus together</span> is the purpose.
          </Display>
        </Reveal>
        <Reveal delay={200}>
          <Body className="mt-9 max-w-2xl text-lg leading-relaxed md:text-xl">
            Almost anyone will go for a walk, a run, or a ride with a friend. 2THREE2 builds something lasting
            inside that ordinary space.
          </Body>
        </Reveal>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- progression */

const steps = ["Show up", "Move together", "Build trust", "Pray together", "Pursue Jesus", "Live on mission"] as const;

function Progression() {
  return (
    <section className="overflow-hidden px-6 py-24 md:px-10 md:py-32" style={{ background: v2.ink }}>
      <div className="mx-auto max-w-[1400px]">
        <Reveal>
          <Kicker tone="dark">Why we move</Kicker>
        </Reveal>
        <Reveal delay={80}>
          <Display className="mt-6 max-w-3xl text-[2.2rem] leading-[1.02] sm:text-5xl md:text-6xl" tone="dark">
            Movement creates room for relationship.
          </Display>
        </Reveal>

        <div className="mt-16 md:mt-24">
          {/* one continuous rail rather than six boxes */}
          <div className="relative">
            <span
              aria-hidden="true"
              className="absolute left-0 right-0 top-[13px] hidden h-[2px] md:block"
              style={{ background: `linear-gradient(90deg, ${v2.goldDeep} 0%, ${v2.gold} 45%, ${v2.orange} 100%)` }}
            />
            <ol className="grid gap-8 md:grid-cols-6 md:gap-4">
              {steps.map((step, i) => (
                <Reveal delay={i * 90} key={step}>
                  <li className="relative flex items-start gap-4 md:block">
                    <span
                      aria-hidden="true"
                      className="relative z-10 block h-7 w-7 shrink-0 rounded-full border-[3px]"
                      style={{
                        background: v2.ink,
                        borderColor: i === steps.length - 1 ? v2.orange : v2.gold,
                      }}
                    />
                    <div className="md:mt-6">
                      <p
                        className="text-[11px] font-bold tracking-[0.24em]"
                        style={{ color: v2.onDarkFaint, fontFamily: font.ui }}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </p>
                      <p
                        className="mt-1.5 text-xl font-bold leading-tight md:text-2xl"
                        style={{ color: v2.onDark, fontFamily: font.display }}
                      >
                        {step}
                      </p>
                    </div>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- commitments */

const commitments = [
  { body: "Consistent rhythms of activity, together.", icon: Footprints, title: "Move" },
  { body: "For one another, and for the places we move through.", icon: HandHeart, title: "Pray" },
  { body: "Righteousness, faith, love, peace, and Jesus.", icon: Compass, title: "Pursue" },
  { body: "Into homes, workplaces, neighborhoods, and mission fields.", icon: Flag, title: "Go" },
] as const;

function Commitments() {
  return (
    <section className="px-6 py-24 md:px-10 md:py-36" style={{ background: v2.paperWarm }}>
      <div className="mx-auto max-w-[1400px]">
        <Reveal>
          <Kicker>Four commitments</Kicker>
        </Reveal>
        <div className="mt-14 grid gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
          {commitments.map((c, i) => (
            <Reveal delay={i * 100} key={c.title}>
              {/* no card chrome: a rule, a big word, one line */}
              <div className="border-t pt-6" style={{ borderColor: v2.paperEdge }}>
                <c.icon aria-hidden="true" className="h-7 w-7" strokeWidth={1.5} style={{ color: v2.orange }} />
                <h3
                  className="mt-6 text-4xl font-bold leading-none md:text-5xl"
                  style={{ color: v2.onLight, fontFamily: font.display }}
                >
                  {c.title}
                </h3>
                <p className="mt-4 text-base leading-relaxed" style={{ color: v2.onLightMuted }}>
                  {c.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ activities */

const activities = [
  { icon: Footprints, label: "Running" },
  { icon: PersonStanding, label: "Walking" },
  { icon: Mountain, label: "Hiking" },
  { icon: Bike, label: "Cycling" },
  { icon: Waves, label: "Triathlon" },
] as const;

function Activities() {
  return (
    <section className="overflow-hidden" style={{ background: v2.paper }}>
      <div className="mx-auto max-w-[1400px] px-6 pt-24 md:px-10 md:pt-36">
        <Reveal>
          <Kicker>However you already move</Kicker>
        </Reveal>
        <Reveal delay={80}>
          <Display className="mt-6 max-w-4xl text-[2.4rem] leading-[1.02] sm:text-5xl md:text-[4rem]">
            The activity may change.
            <br />
            The purpose does not.
          </Display>
        </Reveal>
      </div>

      {/* full-bleed image band */}
      <Reveal className="mt-14 md:mt-20" delay={120}>
        <div className="grid gap-1 md:grid-cols-[1.4fr_1fr]">
          <Photo
            alt={photos.pair.alt}
            className="h-[46vh] min-h-[280px] w-full md:h-[62vh]"
            focus="center 26%"
            sizes="(max-width: 768px) 100vw, 58vw"
            src={photos.pair.src}
          />
          <div className="grid grid-rows-2 gap-1">
            <Photo
              alt={photos.community.alt}
              className="h-[26vh] min-h-[170px] w-full md:h-auto"
              focus="center 34%"
              sizes="(max-width: 768px) 100vw, 42vw"
              src={photos.community.src}
            />
            <ReservedPlate
              brief="Trail running, hiking, and cycling. Mixed ages and ability levels, men and women, ordinary people rather than elite athletes."
              className="h-[26vh] min-h-[170px] w-full md:h-auto"
              spec={["Run", "Hike", "Ride", "Mixed ages"]}
              title="Activity set"
            />
          </div>
        </div>
      </Reveal>

      <div className="mx-auto max-w-[1400px] px-6 py-14 md:px-10 md:py-20">
        <Reveal>
          <ul className="flex flex-wrap items-center gap-x-10 gap-y-5">
            {activities.map((a) => (
              <li className="flex items-center gap-3" key={a.label}>
                <a.icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.7} style={{ color: v2.goldDeep }} />
                <span
                  className="text-xl font-bold uppercase tracking-[0.04em] md:text-2xl"
                  style={{ color: v2.onLight, fontFamily: font.display }}
                >
                  {a.label}
                </span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- gathering */

const rhythm = [
  "Meet consistently.",
  "Share a short Scripture or prayer focus.",
  "Move together.",
  "Pray during or after.",
  "Encourage one next step.",
] as const;

function Gathering() {
  return (
    <section className="px-6 py-24 md:px-10 md:py-36" style={{ background: v2.paperAlt }}>
      <div className="mx-auto grid max-w-[1400px] gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24">
        <div>
          <Reveal>
            <Kicker>The rhythm</Kicker>
          </Reveal>
          <Reveal delay={80}>
            <Display className="mt-6 text-[2.4rem] leading-[1.02] sm:text-5xl md:text-[3.6rem]">
              Simple.
              <br />
              Not rigid.
            </Display>
          </Reveal>
          <Reveal delay={160}>
            <Body className="mt-7 max-w-md text-base leading-relaxed md:text-lg">
              No script, no building, no title required. A gathering sends people back to their local church
              more connected and more prayed for.
            </Body>
          </Reveal>
        </div>

        <Reveal delay={120}>
          <ol>
            {rhythm.map((step, i) => (
              <li
                className="flex items-baseline gap-6 border-b py-6"
                key={step}
                style={{ borderColor: v2.paperEdge }}
              >
                <span
                  className="text-sm font-bold tabular-nums"
                  style={{ color: v2.orange, fontFamily: font.ui }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className="text-xl leading-snug md:text-2xl"
                  style={{ color: v2.onLight, fontFamily: font.display, fontWeight: 500 }}
                >
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- scripture */

function Scripture() {
  return (
    <section className="relative overflow-hidden px-6 py-28 md:px-10 md:py-44" style={{ background: v2.inkDeep }}>
      <div className="mx-auto max-w-4xl text-center">
        <Reveal>
          <p
            className="text-[11px] font-bold uppercase tracking-[0.3em]"
            style={{ color: v2.goldBright, fontFamily: font.ui }}
          >
            2 Timothy 2:22
          </p>
        </Reveal>
        <Reveal delay={120}>
          <blockquote
            className="mt-10 text-[1.9rem] font-medium leading-[1.24] sm:text-4xl md:text-[3.1rem]"
            style={{ color: v2.onDark, fontFamily: font.display }}
          >
            {/* explicit {" "} on both sides: relying on JSX line-break whitespace
                around the highlighted span dropped the space in the build */}
            &ldquo;Pursue righteousness, faith, love, and peace,{" "}
            <span style={{ color: v2.goldBright }}>along with those</span>{" "}
            who call on the Lord from a pure heart.&rdquo;
          </blockquote>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ race gateway */

function RaceGateway() {
  return (
    <section className="relative overflow-hidden">
      <ReservedPlate
        brief="Three triathletes riding together in formation on premium tri bikes, in black-and-gold 2THREE2 kits. Cinematic, low golden-hour sun, real sports photography."
        className="h-[62vh] min-h-[420px] w-full"
        detail="minimal"
        spec={["Three riders", "Tri bikes", "Black + gold kit", "Golden hour"]}
        title="Race With Purpose"
      />
      <div className="pointer-events-none absolute inset-0 flex items-end">
        <div
          className="w-full px-6 pb-12 md:px-10 md:pb-16"
          style={{ background: "linear-gradient(180deg, transparent 0%, rgba(10,12,16,0.92) 72%)" }}
        >
          <div className="pointer-events-auto mx-auto flex max-w-[1400px] flex-col gap-7 md:flex-row md:items-end md:justify-between">
            <div>
              <Kicker tone="dark">Something to work toward</Kicker>
              <Display className="mt-5 max-w-xl text-[2.2rem] leading-[1.02] sm:text-5xl" tone="dark">
                We train together.
                <br />
                Then we race together.
              </Display>
            </div>
            <ActionLink href="/2three2-v2/race" tone="dark" variant="solid">
              See Race With Purpose
            </ActionLink>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- join CTA */

function JoinCTA() {
  const [sent, setSent] = useState<null | "join" | "start">(null);

  return (
    <section className="px-6 py-24 md:px-10 md:py-36" id="join" style={{ background: v2.paper }}>
      <div className="mx-auto max-w-[1400px]">
        <Reveal>
          <Display className="max-w-3xl text-[2.6rem] leading-[0.98] sm:text-6xl md:text-[5rem]">
            Pick something hard.
            <br />
            <span style={{ color: v2.orange }}>Do it with people.</span>
          </Display>
        </Reveal>

        <div className="mt-16 grid gap-px" style={{ background: v2.paperEdge }}>
          {(
            [
              { body: "Find people near you. Any pace, any activity, any starting point.", kind: "join", title: "Join a gathering" },
              { body: "Gather a few people around a rhythm of movement and prayer.", kind: "start", title: "Start a gathering" },
            ] as const
          ).map((card, i) => (
            <Reveal delay={i * 110} key={card.kind}>
              <div
                className="flex flex-col gap-6 px-2 py-10 md:flex-row md:items-center md:justify-between md:px-6"
                style={{ background: v2.paper }}
              >
                <div className="max-w-xl">
                  <h3
                    className="text-3xl font-bold leading-none md:text-4xl"
                    style={{ color: v2.onLight, fontFamily: font.display }}
                  >
                    {card.title}
                  </h3>
                  <p className="mt-3 text-base leading-relaxed" style={{ color: v2.onLightMuted }}>
                    {card.body}
                  </p>
                </div>
                {sent === card.kind ? (
                  <p
                    className="shrink-0 border px-6 py-4 text-sm"
                    style={{ borderColor: v2.orange, color: v2.orangeDeep }}
                  >
                    Preview only. Nothing was sent.
                  </p>
                ) : (
                  <button
                    className="group inline-flex shrink-0 items-center justify-center gap-2.5 border px-7 py-4 text-[12px] font-bold uppercase tracking-[0.14em] transition-colors duration-300 sm:text-[13px]"
                    onClick={() => setSent(card.kind)}
                    style={{ borderColor: "rgba(20,23,28,0.28)", color: v2.onLight, fontFamily: font.ui }}
                    type="button"
                  >
                    I&apos;m interested
                    <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
                      &rarr;
                    </span>
                  </button>
                )}
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={200}>
          <p className="mt-10 text-[12px] leading-relaxed" style={{ color: v2.onLightFaint }}>
            Concept only. These buttons are not connected to anything and collect no information.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- page */

export function Two3TwoV2Page() {
  return (
    <main className="overflow-x-hidden" data-domain-site="2three2-v2" id="top" style={{ background: v2.paper }}>
      <SmartHeader />
      <Hero />
      <Purpose />
      <Progression />
      <Commitments />
      <Activities />
      <Gathering />
      <Scripture />
      <RaceGateway />
      <JoinCTA />
      <Footer />
      <PreviewBanner />
    </main>
  );
}
