"use client";

import React from "react";
import { Footer, PreviewBanner, SmartHeader } from "../Chrome";
import { Photo, ReservedPlate } from "../Photo";
import { ActionLink, Body, Display, Kicker, Reveal } from "../primitives";
import { font, photos, v2 } from "../theme";

/**
 * The centerpiece shot brief.
 *
 * Kept as data so it renders on the page and can be lifted straight into a
 * photographer's brief or an image-generation prompt without being retyped.
 */
const CENTERPIECE = {
  brief:
    "Three triathletes riding in tight formation on premium triathlon bikes, shot from a low chase angle on an open road at golden hour. Coordinated black-and-gold 2THREE2 kits with gold 2THREE2 across the chest and back, Race. Pray. Pursue. beneath it, a small Powered by USA Missionaries, and restrained sponsor placement. Shallow depth of field, motion in the background, warm low sun. Real sports photography.",
  spec: [
    "Three riders in formation",
    "Premium tri bikes",
    "Black + gold 2THREE2 kit",
    "Golden hour, low chase angle",
    "Shallow depth of field",
  ],
} as const;

function Hero() {
  return (
    <section className="relative min-h-screen w-full overflow-hidden">
      <ReservedPlate
        brief={CENTERPIECE.brief}
        className="absolute inset-0 h-full w-full"
        detail="minimal"
        spec={CENTERPIECE.spec}
        title="Race-page centerpiece"
      />

      <div className="pointer-events-none absolute inset-0 flex items-end">
        <div
          className="w-full px-6 pb-24 pt-40 md:px-10 md:pb-28"
          style={{ background: "linear-gradient(180deg, rgba(10,12,16,0) 0%, rgba(10,12,16,0.86) 58%, rgba(10,12,16,0.97) 100%)" }}
        >
          <div className="pointer-events-auto mx-auto max-w-[1400px]">
            <Reveal>
              <Kicker tone="dark">Ironman 70.3</Kicker>
            </Reveal>
            <Reveal delay={90}>
              <Display
                as="h1"
                className="mt-6 text-[3rem] leading-[0.9] sm:text-7xl md:text-8xl lg:text-[6.5rem]"
                tone="dark"
              >
                Race. Pray.
                <br />
                <span style={{ color: v2.goldBright }}>Pursue.</span>
              </Display>
            </Reveal>
            <div className="mt-10 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
              <Reveal delay={200}>
                <Body className="max-w-lg text-lg md:text-xl" tone="dark">
                  We train together. Then we race together.
                </Body>
              </Reveal>
              <Reveal delay={280}>
                <ActionLink href="#season" tone="dark" variant="solid">
                  How a season works
                </ActionLink>
              </Reveal>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- the point */

function ThePoint() {
  return (
    <section className="px-6 py-24 md:px-10 md:py-40" style={{ background: v2.paper }}>
      <div className="mx-auto max-w-[1100px]">
        <Reveal>
          <Kicker>Why a race at all</Kicker>
        </Reveal>
        <Reveal delay={100}>
          <Display className="mt-7 text-[2.3rem] leading-[1.02] sm:text-5xl md:text-[4rem]">
            Anyone can run once.
            <br />
            <span style={{ color: v2.orange }}>A season</span> is what changes people.
          </Display>
        </Reveal>
        <Reveal delay={200}>
          <Body className="mt-9 max-w-2xl">
            Months of early mornings with the same few people is where friendship, honesty, endurance, and
            faith get built at the same time.
          </Body>
        </Reveal>
      </div>
    </section>
  );
}

/* --------------------------------------------------------- art direction */

/**
 * The shot brief, rendered on the page.
 *
 * This is here because the centerpiece image does not exist and could not be
 * responsibly faked. Publishing the brief next to the empty frame makes the gap
 * legible to a reviewer and gives a photographer or image tool everything it
 * needs, rather than leaving the blank frame unexplained.
 */
function ArtDirection() {
  return (
    <section className="px-6 pb-24 md:px-10 md:pb-36" style={{ background: v2.paper }}>
      <div className="mx-auto max-w-[1400px]">
        <div className="border-t pt-10" style={{ borderColor: v2.paperEdge }}>
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <div>
              <Kicker>Art direction, centerpiece</Kicker>
              <p className="mt-6 text-base leading-relaxed" style={{ color: v2.onLightMuted }}>
                The frame above is reserved. No photograph of athletes in 2THREE2 kits exists yet, so nothing
                is shown in its place. This is the brief for the shot.
              </p>
            </div>
            <div>
              <p
                className="text-lg leading-relaxed"
                style={{ color: v2.onLight, fontFamily: font.display, fontWeight: 400 }}
              >
                {CENTERPIECE.brief}
              </p>
              <ul className="mt-7 flex flex-wrap gap-2">
                {CENTERPIECE.spec.map((item) => (
                  <li
                    className="border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em]"
                    key={item}
                    style={{ borderColor: v2.paperEdge, color: v2.onLightMuted, fontFamily: font.ui }}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- scripture */

const verses = [
  {
    ref: "1 Corinthians 9:24-25",
    text: "Run in such a way as to get the prize. Everyone who competes in the games goes into strict training.",
  },
  {
    ref: "Hebrews 12:1",
    text: "Let us run with endurance the race that is set before us, fixing our eyes on Jesus.",
  },
  {
    ref: "1 Timothy 4:7-8",
    text: "Train yourself for godliness. For physical training is of some value, but godliness has value for all things.",
  },
] as const;

function ScriptureRail() {
  return (
    <section className="px-6 py-24 md:px-10 md:py-36" style={{ background: v2.ink }}>
      <div className="mx-auto max-w-[1400px]">
        <Reveal>
          <Kicker tone="dark">Scripture already talks this way</Kicker>
        </Reveal>
        <div className="mt-14 grid gap-x-12 gap-y-14 md:grid-cols-3">
          {verses.map((verse, i) => (
            <Reveal delay={i * 110} key={verse.ref}>
              <figure className="border-t pt-7" style={{ borderColor: v2.inkEdge }}>
                <blockquote
                  className="text-xl leading-snug md:text-2xl"
                  style={{ color: v2.onDark, fontFamily: font.display, fontWeight: 400 }}
                >
                  &ldquo;{verse.text}&rdquo;
                </blockquote>
                <figcaption
                  className="mt-6 text-[11px] font-bold uppercase tracking-[0.2em]"
                  style={{ color: v2.goldBright, fontFamily: font.ui }}
                >
                  {verse.ref}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- season */

const season = [
  { body: "Put a date on something genuinely hard.", title: "Choose the goal" },
  { body: "Show up for months. This is where the discipleship happens.", title: "Train together" },
  { body: "Nobody trains alone and nobody finishes alone.", title: "Race together" },
  { body: "It becomes a story, and a reason to invite others into the next one.", title: "Carry it forward" },
] as const;

function Season() {
  return (
    <section className="px-6 py-24 md:px-10 md:py-36" id="season" style={{ background: v2.paperWarm }}>
      <div className="mx-auto max-w-[1400px]">
        <Reveal>
          <Kicker>How a season works</Kicker>
        </Reveal>
        <div className="mt-14 grid gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
          {season.map((step, i) => (
            <Reveal delay={i * 100} key={step.title}>
              <div className="border-t pt-6" style={{ borderColor: v2.paperEdge }}>
                <p className="text-sm font-bold tabular-nums" style={{ color: v2.orange, fontFamily: font.ui }}>
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3
                  className="mt-5 text-2xl font-bold leading-tight md:text-3xl"
                  style={{ color: v2.onLight, fontFamily: font.display }}
                >
                  {step.title}
                </h3>
                <p className="mt-3 text-base leading-relaxed" style={{ color: v2.onLightMuted }}>
                  {step.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={260}>
          <p className="mt-14 max-w-2xl text-base leading-relaxed" style={{ color: v2.onLightMuted }}>
            A race is one expression of the movement, never the movement itself. Most people in 2THREE2 will
            never sign up for one, and that is completely fine.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------- kit */

function Kit() {
  return (
    <section className="overflow-hidden" style={{ background: v2.paper }}>
      <div className="mx-auto max-w-[1400px] px-6 pt-24 md:px-10 md:pt-36">
        <Reveal>
          <Kicker>The kit</Kicker>
        </Reveal>
        <Reveal delay={80}>
          <Display className="mt-6 max-w-3xl text-[2.2rem] leading-[1.02] sm:text-5xl md:text-[3.6rem]">
            Black base. Gold type.
            <br />
            Nothing extra.
          </Display>
        </Reveal>
      </div>

      <Reveal className="mt-14 md:mt-20" delay={140}>
        <ReservedPlate
          brief="Studio product photography of the finished tri suit, front and back, on a neutral seamless background. Gold 2THREE2 across the chest, Race. Pray. Pursue. beneath it, small Powered by USA Missionaries at the hem, restrained sponsor placement. The lower back stays blank in this version."
          className="h-[46vh] min-h-[300px] w-full"
          spec={["Front + back", "Studio seamless", "Lower back blank"]}
          title="Kit photography"
        />
      </Reveal>

      <div className="mx-auto max-w-[1400px] px-6 py-14 md:px-10 md:py-20">
        <Reveal>
          <div className="grid gap-10 md:grid-cols-2 md:gap-20">
            <div>
              <p
                className="text-[11px] font-bold uppercase tracking-[0.2em]"
                style={{ color: v2.goldDeep, fontFamily: font.ui }}
              >
                On the kit
              </p>
              <p className="mt-4 text-base leading-relaxed" style={{ color: v2.onLightMuted }}>
                2THREE2 in gold, Race. Pray. Pursue., a small Powered by USA Missionaries, and a few restrained
                sponsor marks. Sponsor names used in mockups are invented placeholders; no sponsor
                relationships exist.
              </p>
            </div>
            <div>
              <p
                className="text-[11px] font-bold uppercase tracking-[0.2em]"
                style={{ color: v2.goldDeep, fontFamily: font.ui }}
              >
                Held back
              </p>
              <p className="mt-4 text-base leading-relaxed" style={{ color: v2.onLightMuted }}>
                The lower back stays blank in this version. &ldquo;Deploying Missionaries Across America&rdquo;
                is documented as an option for later rather than printed now.
              </p>
              <p className="mt-4 text-sm leading-relaxed" style={{ color: v2.onLightFaint }}>
                The flat technical drawing of this kit remains on the V1 race page for comparison.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* --------------------------------------------------------- deployment fund */

const fields = [
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
] as const;

function Deployment() {
  return (
    <section className="px-6 py-24 md:px-10 md:py-36" style={{ background: v2.inkDeep }}>
      <div className="mx-auto max-w-[1400px]">
        <Reveal>
          <Kicker tone="dark">Awareness and deployment</Kicker>
        </Reveal>

        <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-6">
          {[
            "2THREE2 develops active disciples.",
            "Challenges build awareness.",
            "The Missionary Deployment Fund sends missionaries.",
          ].map((line, i) => (
            <Reveal delay={i * 110} key={line}>
              <div className="border-t pt-6" style={{ borderColor: i === 2 ? v2.orange : v2.inkEdge }}>
                <p
                  className="text-[11px] font-bold tracking-[0.24em]"
                  style={{ color: i === 2 ? v2.orangeBright : v2.onDarkFaint, fontFamily: font.ui }}
                >
                  {String(i + 1).padStart(2, "0")}
                </p>
                <p
                  className="mt-4 text-2xl font-bold leading-tight md:text-3xl"
                  style={{ color: v2.onDark, fontFamily: font.display }}
                >
                  {line}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={200}>
          <div className="mt-20 grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
            <div>
              <p className="text-base leading-relaxed" style={{ color: v2.onDarkMuted }}>
                The fund concept would help USA Missionaries train, equip, and deploy missionaries into
                overlooked places across America.
              </p>
              <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-3">
                {fields.map((field) => (
                  <li
                    className="text-base md:text-lg"
                    key={field}
                    style={{ color: v2.onDark, fontFamily: font.display, fontWeight: 400 }}
                  >
                    {field}
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t pt-7" style={{ borderColor: v2.inkEdge }}>
              <p
                className="text-[10px] font-bold uppercase tracking-[0.2em]"
                style={{ color: v2.goldBright, fontFamily: font.ui }}
              >
                Story concept, placeholder
              </p>
              <p className="mt-4 text-base leading-relaxed" style={{ color: v2.onDarkMuted }}>
                A future campaign could follow one missionary preparing to serve in prisons, juvenile
                facilities, orphan care, and nursing homes. A real USA Missionaries missionary may be featured
                here once the story is written and approved. No biography is published in this preview.
              </p>
              <p className="mt-6 text-sm leading-relaxed" style={{ color: v2.goldBright }}>
                Funds raised through this campaign support the USA Missionaries Missionary Deployment Fund.
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={260}>
          <p className="mt-14 text-[12px] leading-relaxed" style={{ color: v2.onDarkFaint }}>
            Nothing on this page processes a donation. No totals, progress meters, campaign accounts,
            individual fundraising pages, or sponsor checkout exist in this preview, by design.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------- CTA */

function FinalCTA() {
  return (
    <section className="relative overflow-hidden">
      <Photo
        alt={photos.community.alt}
        className="h-[70vh] min-h-[440px] w-full"
        focus="center 30%"
        scrim="linear-gradient(180deg, rgba(10,12,16,0.5) 0%, rgba(10,12,16,0.78) 60%, rgba(10,12,16,0.95) 100%)"
        sizes="100vw"
        src={photos.community.src}
      />
      <div className="absolute inset-0 flex items-center">
        <div className="mx-auto w-full max-w-[1400px] px-6 md:px-10">
          <Reveal>
            <Display className="max-w-3xl text-[2.6rem] leading-[0.98] sm:text-6xl md:text-[5rem]" tone="dark">
              Pick something hard.
              <br />
              <span style={{ color: v2.orangeBright }}>Do it with people.</span>
            </Display>
          </Reveal>
          <Reveal delay={150}>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <ActionLink href="/2three2-v2#join" tone="dark" variant="solid">
                Join the Movement
              </ActionLink>
              <ActionLink href="/2three2-v2" tone="dark" variant="outline">
                Back to 2THREE2
              </ActionLink>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- page */

export function RaceV2Page() {
  return (
    <main className="overflow-x-hidden" data-domain-site="2three2-v2-race" id="top" style={{ background: v2.paper }}>
      <SmartHeader />
      <Hero />
      <ThePoint />
      <ArtDirection />
      <ScriptureRail />
      <Season />
      <Kit />
      <Deployment />
      <FinalCTA />
      <Footer />
      <PreviewBanner />
    </main>
  );
}
