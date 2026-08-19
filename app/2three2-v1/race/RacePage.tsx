"use client";

import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { KitSpec, sponsors } from "../KitSpec";
import { CTAButton, Eyebrow, PoweredBy, Reveal, SectionHeading, Wordmark } from "../primitives";
import { font, t2 } from "../theme";

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
        <div className="flex flex-col leading-none">
          <Link href="/2three2-v1">
            <Wordmark className="text-lg sm:text-xl" />
          </Link>
          <PoweredBy className="mt-1 hidden sm:inline" />
        </div>
        <CTAButton href="/2three2-v1#start-or-join">Join the Movement</CTAButton>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------- page data */

/**
 * Scripture on training and racing. These are the passages the founder asked
 * to tie in, quoted plainly and attributed. They carry the section rather than
 * decorating it.
 */
const seasonSteps = [
  {
    body: "A gathering picks something genuinely hard and puts a date on it. A first 5K, a half marathon, a long hike, a triathlon.",
    n: "01",
    title: "Choose the goal",
  },
  {
    body: "Weeks of showing up together. Early mornings, long weekends, prayer at every stop. This is where the discipleship actually happens.",
    n: "02",
    title: "Train together",
  },
  {
    body: "Nobody trains alone and nobody finishes alone. The people beside you at the start are the people beside you at the line.",
    n: "03",
    title: "Race together",
  },
  {
    body: "The season becomes a story worth telling, and a reason to invite others into the next one.",
    n: "04",
    title: "Carry it forward",
  },
] as const;

const raceOutcomes = [
  "Build awareness for USA Missionaries",
  "Invite prayer partners into the journey",
  "Engage business sponsors",
  "Rally a local community around the mission",
  "Support missionary deployment",
] as const;

const missionFields = [
  "Prisons",
  "Juvenile facilities",
  "Orphan care",
  "Nursing homes",
  "Schools",
  "Campuses",
  "First responders",
  "Military & veterans",
  "Immigrant & refugee communities",
  "Homeless communities",
  "Neighborhoods & workplaces",
] as const;

/* ------------------------------------------------------------------- page */

export function RacePage() {
  return (
    <main
      className="min-h-screen overflow-x-hidden"
      data-domain-site="2three2-v1-race"
      id="top"
      style={{ background: t2.ink, color: t2.cream }}
    >
      <FounderPreviewBanner />
      <Header />

      {/* ============================================================ HERO */}
      <section className="relative flex min-h-[78vh] items-center overflow-hidden pt-28 md:min-h-[88vh] md:pt-24">
        {/* A different real photo from the main page hero, so the two pages do
            not repeat the same image. */}
        <Image
          alt="Two men outside together in winter"
          className="object-cover"
          fill
          priority
          sizes="100vw"
          src="/images/assignments/ryan-and-garrett.webp"
          style={{ objectPosition: "center 28%" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(5,7,10,0.94) 0%, rgba(5,7,10,0.84) 40%, rgba(5,7,10,0.74) 70%, rgba(5,7,10,0.94) 100%)",
          }}
        />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-12 md:px-10 md:py-16">
          <div className="max-w-3xl">
            <Reveal>
              <Link
                className="mb-6 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em]"
                href="/2three2-v1"
                style={{ color: t2.goldSoft, fontFamily: font.ui }}
              >
                <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
                Back to 2THREE2
              </Link>
            </Reveal>
            <Reveal delay={80}>
              <Eyebrow>Something to work toward</Eyebrow>
            </Reveal>
            <Reveal delay={140}>
              <h1
                className="text-[2.9rem] font-bold leading-[0.98] tracking-tight sm:text-6xl md:text-7xl"
                style={{ color: "#FFFFFF", fontFamily: font.display }}
              >
                We train together.
                <br />
                <span style={{ color: t2.gold }}>Then we race together.</span>
              </h1>
            </Reveal>
            <Reveal delay={260}>
              <p className="mt-6 max-w-2xl text-base leading-relaxed md:text-lg" style={{ color: t2.creamMuted }}>
                Anyone can go for a run once. It is the season of training that changes people. Picking
                something hard, committing to it as a group, and showing up for months is where friendship,
                honesty, endurance, and faith get built at the same time.
              </p>
            </Reveal>
            <Reveal delay={380}>
              <p
                className="mt-7 text-2xl font-bold tracking-[0.06em] sm:text-3xl"
                style={{ color: t2.gold, fontFamily: font.display }}
              >
                Race. Pray. Pursue.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ======================================================= SCRIPTURE */}
      <section className="border-y px-6 py-20 md:px-10 md:py-28" style={{ background: t2.inkDeep, borderColor: t2.panelBorder }}>
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <SectionHeading eyebrow="Why the language of training" headline="Scripture already talks this way.">
              Paul reached for running and training when he wanted to describe following Jesus. Not because
              the race is the point, but because everyone understands what it costs to train for one.
            </SectionHeading>
          </Reveal>

          <div className="mt-14 grid gap-5 md:grid-cols-2">
            {[
              {
                ref: "1 Corinthians 9:24-25",
                text: "Do you not know that in a race all the runners run, but only one gets the prize? Run in such a way as to get the prize. Everyone who competes in the games goes into strict training.",
              },
              {
                ref: "Hebrews 12:1",
                text: "Let us run with endurance the race that is set before us, fixing our eyes on Jesus.",
              },
              {
                ref: "1 Timothy 4:7-8",
                text: "Train yourself for godliness. For physical training is of some value, but godliness has value for all things.",
              },
              {
                ref: "2 Timothy 4:7",
                text: "I have fought the good fight, I have finished the race, I have kept the faith.",
              },
            ].map((verse, i) => (
              <Reveal delay={i * 110} key={verse.ref}>
                <figure
                  className="flex h-full flex-col border p-7 md:p-8"
                  style={{ background: t2.panel, borderColor: t2.panelBorder }}
                >
                  <blockquote
                    className="flex-1 text-lg leading-relaxed"
                    style={{ color: "#FFFFFF", fontFamily: font.display, fontWeight: 400 }}
                  >
                    &ldquo;{verse.text}&rdquo;
                  </blockquote>
                  <figcaption
                    className="mt-5 text-[11px] font-semibold uppercase tracking-[0.24em]"
                    style={{ color: t2.goldSoft, fontFamily: font.ui }}
                  >
                    {verse.ref}
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>

          <Reveal delay={240}>
            <p className="mx-auto mt-12 max-w-2xl text-center text-lg leading-relaxed" style={{ color: t2.creamMuted }}>
              Physical training has some value. Godliness has value for everything. A training season is
              simply a place where both can be practiced at once, in public, with people who will notice if
              you stop showing up.
            </p>
          </Reveal>
        </div>
      </section>

      {/* =================================================== HOW A SEASON GOES */}
      <section className="px-6 py-20 md:px-10 md:py-28" style={{ background: t2.light }}>
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <SectionHeading eyebrow="How a season works" headline="Four months, one goal, one group." tone="light">
              There is nothing complicated about it. The structure exists to keep people showing up for each
              other long enough for something real to grow.
            </SectionHeading>
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {seasonSteps.map((step, i) => (
              <Reveal delay={i * 110} key={step.n}>
                <div className="h-full border p-6 md:p-7" style={{ background: "#FFFFFF", borderColor: t2.lightBorder }}>
                  <p
                    className="text-[11px] font-semibold tracking-[0.28em]"
                    style={{ color: t2.goldDeep, fontFamily: font.ui }}
                  >
                    {step.n}
                  </p>
                  <h3 className="mt-3 text-xl font-bold" style={{ color: t2.onLight, fontFamily: font.display }}>
                    {step.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-relaxed" style={{ color: t2.onLightMuted }}>
                    {step.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={300}>
            <p className="mx-auto mt-10 max-w-2xl text-center text-sm leading-relaxed" style={{ color: t2.onLightMuted }}>
              A race is one expression of the movement, never the movement itself. Most people in 2THREE2 will
              never sign up for one, and that is completely fine.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ==================================================== KIT DIRECTION */}
      <section className="px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionHeading
              align="left"
              eyebrow="Ironman 70.3 &middot; campaign concept"
              headline="One team, one kit."
            >
              When a team takes on an endurance goal together, a coordinated kit does something simple and
              useful. It makes the group visible, it starts conversations at every race, and it points back to
              the mission behind the training.
            </SectionHeading>
          </Reveal>

          <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_1.05fr] lg:gap-10">
            <Reveal>
              <div className="border p-6 md:p-8" style={{ background: t2.panel, borderColor: t2.panelBorder }}>
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.24em]"
                  style={{ color: t2.goldSoft, fontFamily: font.ui }}
                >
                  Kit direction &middot; v1
                </p>
                <h3 className="mt-3 text-xl font-bold" style={{ color: "#FFFFFF", fontFamily: font.display }}>
                  Black base. Gold type. Nothing extra.
                </h3>
                <KitSpec className="mt-5 w-full" />
                <div className="mt-5 grid gap-2 text-[13px] leading-relaxed" style={{ color: t2.creamMuted }}>
                  <p>
                    <span style={{ color: t2.goldSoft }}>On the kit:</span>{" "}2THREE2, Race. Pray. Pursue., a
                    small Powered by USA Missionaries, and a few restrained sponsor marks.
                  </p>
                  <p>
                    <span style={{ color: t2.goldSoft }}>Held back:</span>{" "}the lower back stays blank in v1.
                    The optional campaign line &ldquo;Deploying Missionaries Across America&rdquo; is
                    documented for a later version rather than printed now.
                  </p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={140}>
              <div className="flex h-full flex-col justify-center">
                <h3 className="text-2xl font-bold" style={{ color: "#FFFFFF", fontFamily: font.display }}>
                  A team trains. A whole community gets pulled in.
                </h3>
                <p className="mt-4 text-base leading-relaxed" style={{ color: t2.creamMuted }}>
                  Picture three friends taking on an Ironman 70.3 together. The training is real, the season is
                  long, and everyone around them ends up watching. That attention can point somewhere useful.
                </p>
                <ul className="mt-7 space-y-2.5">
                  {raceOutcomes.map((item) => (
                    <li className="flex items-start gap-3 text-sm leading-relaxed" key={item} style={{ color: t2.creamMuted }}>
                      <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0" style={{ background: t2.gold }} />
                      {item}
                    </li>
                  ))}
                </ul>

                <p
                  className="mt-8 text-[10px] font-semibold uppercase tracking-[0.22em]"
                  style={{ color: t2.creamFaint, fontFamily: font.ui }}
                >
                  Placeholder sponsor marks
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {sponsors.map((s) => (
                    <span
                      className="border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
                      key={s}
                      style={{ borderColor: t2.panelBorder, color: t2.creamFaint, fontFamily: font.ui }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-[11px] leading-relaxed" style={{ color: t2.creamFaint }}>
                  Invented names, shown only to test placement and scale. No sponsor relationships exist.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============================================ MISSIONARY DEPLOYMENT */}
      <section className="border-y px-6 py-20 md:px-10 md:py-28" style={{ background: t2.inkDeep, borderColor: t2.panelBorder }}>
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionHeading eyebrow="Awareness &amp; Deployment" headline="Where a training season can lead.">
              A race can do more than finish. It can point people toward missionaries being sent into places
              most of America never looks at.
            </SectionHeading>
          </Reveal>

          <Reveal delay={140}>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {[
                { body: "2THREE2 develops active disciples.", n: "01" },
                { body: "Challenges build awareness.", n: "02" },
                { body: "The Missionary Deployment Fund sends missionaries.", n: "03" },
              ].map((step) => (
                <div className="border p-6" key={step.n} style={{ background: t2.panel, borderColor: t2.panelBorder }}>
                  <p
                    className="text-[11px] font-semibold tracking-[0.28em]"
                    style={{ color: t2.goldSoft, fontFamily: font.ui }}
                  >
                    {step.n}
                  </p>
                  <p
                    className="mt-3 text-lg font-semibold leading-snug"
                    style={{ color: "#FFFFFF", fontFamily: font.display }}
                  >
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>

          <div className="mt-12 grid gap-5 lg:grid-cols-[1.15fr_1fr]">
            <Reveal>
              <div className="h-full border p-7 md:p-8" style={{ background: t2.panel, borderColor: t2.panelBorder }}>
                <h3 className="text-xl font-bold" style={{ color: "#FFFFFF", fontFamily: font.display }}>
                  Overlooked places across America
                </h3>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: t2.creamMuted }}>
                  The fund concept would help USA Missionaries train, equip, and deploy missionaries into
                  fields like these.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {missionFields.map((field) => (
                    <span
                      className="border px-3 py-2 text-[12px]"
                      key={field}
                      style={{ background: t2.panelRaised, borderColor: t2.panelBorder, color: t2.cream }}
                    >
                      {field}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={140}>
              <div
                className="flex h-full flex-col border p-7 md:p-8"
                style={{ background: t2.panel, borderColor: t2.panelBorderStrong }}
              >
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                  style={{ color: t2.goldSoft, fontFamily: font.ui }}
                >
                  Story concept &middot; placeholder
                </p>
                <h3 className="mt-3 text-xl font-bold" style={{ color: "#FFFFFF", fontFamily: font.display }}>
                  One missionary. One campaign.
                </h3>
                <p className="mt-4 flex-1 text-sm leading-relaxed" style={{ color: t2.creamMuted }}>
                  A future campaign could follow a single missionary preparing to serve in prisons, juvenile
                  facilities, orphan care, and nursing homes, giving the training season a face and a name. A
                  real USA Missionaries missionary (for example, Tanner Kent) may be featured here once the
                  story is written and approved. No biography is published in this preview.
                </p>
                <p
                  className="mt-6 border-t pt-5 text-[13px] leading-relaxed"
                  style={{ borderColor: t2.panelBorder, color: t2.goldSoft }}
                >
                  Funds raised through this campaign support the USA Missionaries Missionary Deployment Fund.
                </p>
              </div>
            </Reveal>
          </div>

          <Reveal delay={220}>
            <p className="mt-7 text-[12px] leading-relaxed" style={{ color: t2.creamFaint }}>
              Nothing on this page processes a donation. No totals, progress meters, campaign accounts,
              individual fundraising pages, or sponsor checkout exist in this preview, by design.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ============================================================= CTA */}
      <section className="relative overflow-hidden px-6 py-24 md:px-10 md:py-32">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 50% 80%, rgba(212,168,85,0.12) 0%, transparent 60%)" }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <Reveal>
            <Eyebrow>Start where you are</Eyebrow>
          </Reveal>
          <Reveal delay={120}>
            <h2
              className="text-[2.5rem] font-bold leading-[1.02] tracking-tight sm:text-5xl md:text-6xl"
              style={{ color: "#FFFFFF", fontFamily: font.display }}
            >
              Pick something hard.
              <br />
              Do it with people.
            </h2>
          </Reveal>
          <Reveal delay={240}>
            <p className="mx-auto mt-8 max-w-xl text-base leading-relaxed" style={{ color: t2.creamMuted }}>
              You do not need to be fast, experienced, or in shape to start. You need a date on the calendar
              and a few people willing to show up with you.
            </p>
          </Reveal>
          <Reveal delay={340}>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
              <CTAButton href="/2three2-v1#start-or-join">Join the Movement</CTAButton>
              <CTAButton href="/2three2-v1" variant="secondary">
                Back to 2THREE2
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
          <p className="max-w-md text-[11px] leading-relaxed" style={{ color: t2.creamFaint }}>
            Founder-review concept. Kit artwork is a design spec, not a photograph, and the sponsor marks are
            invented placeholders. No production routes, navigation, domains, or data were changed.
          </p>
        </div>
      </footer>
    </main>
  );
}
