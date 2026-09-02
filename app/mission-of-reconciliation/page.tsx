import type { Metadata } from "next";
import { buildDomainSiteIcons, buildDomainSiteSocialImage } from "@/src/lib/domain-metadata";
import { domainSites } from "@/src/lib/domain-sites";
import { MissionHeader } from "@/components/mission-of-reconciliation/MissionHeader";
import { PartnershipLine } from "@/components/mission-of-reconciliation/PartnershipLine";
import { JoinMissionInterestModal } from "@/components/forms/JoinMissionInterestModal";
import { dontWasteYourLife, morBrand, morColor, morFont } from "@/src/lib/mission-of-reconciliation/brand";
import { missionCanonical, missionCanonicalOrigin } from "@/src/lib/mission-of-reconciliation/domain";
import type { MissionPaths } from "@/src/lib/mission-of-reconciliation/domain";
import { getMissionPaths } from "@/src/lib/mission-of-reconciliation/request-domain";
import { caseStudies, featuredCaseStudies } from "@/src/lib/mission-of-reconciliation/case-studies";
import {
  Body,
  Display,
  Eyebrow,
  Lede,
  ScriptureQuote,
  Section,
} from "./_components/MissionPrimitives";
import { PrimaryCta, SecondaryCta, morTriggerClassName } from "./_components/MissionCta";
import { StoryCard } from "./_components/StoryCard";
import { SermonVideoLink } from "./_components/SermonVideoLink";

export const metadata: Metadata = {
  // The root layout emits USA Missionaries icons for every route, so the
  // Mission of Reconciliation surfaces restate their own brand identity.
  icons: buildDomainSiteIcons(domainSites["mission-of-reconciliation"]),
  manifest: domainSites["mission-of-reconciliation"].manifestPath,
  alternates: { canonical: missionCanonical.home },
  description:
    "Mission of Reconciliation equips followers of Jesus across America to come alongside people with love, truth, prayer, and Scripture, pointing them toward restoration and freedom in Jesus Christ. In partnership with USA Missionaries.",
  openGraph: {
    description:
      "Mission of Reconciliation equips followers of Jesus across America to come alongside people with love, truth, prayer, and Scripture, pointing them toward restoration and freedom in Jesus Christ.",
    images: [buildDomainSiteSocialImage(domainSites["mission-of-reconciliation"], missionCanonicalOrigin)],
    siteName: domainSites["mission-of-reconciliation"].siteName,
    title: "Mission of Reconciliation | Healing, Freedom & Restoration",
    type: "website",
    url: missionCanonical.home,
  },
  title: { absolute: "Mission of Reconciliation | Healing, Freedom & Restoration" },
};

const journeySteps = [
  {
    body: "Together we name the wounds, lies, unforgiveness, and fears that quietly shape how we live.",
    heading: "Recognize",
    lead: "Bring what has been hidden into the light.",
    number: "01",
  },
  {
    body: "Through prayer, forgiveness, repentance, and Scripture. We are not analyzing the past. We are inviting Jesus into it.",
    heading: "Respond",
    lead: "Bring it to Jesus.",
    number: "02",
  },
  {
    body: "Replace lies with truth, renew the mind, and live from your identity in Christ long after the process ends.",
    heading: "Renew",
    lead: "Learn to walk in freedom.",
    number: "03",
  },
] as const;

function HeroSection({ paths }: { paths: MissionPaths }) {
  return (
    <section
      className="px-5 pb-16 pt-14 md:px-8 md:pb-24 md:pt-24"
      id="hero"
      style={{ backgroundColor: morColor.page }}
    >
      <div className="mx-auto w-full max-w-6xl">
        <Eyebrow>
          <PartnershipLine />
        </Eyebrow>

        <h1
          className="mt-6 max-w-5xl"
          style={{
            color: morColor.ink,
            fontFamily: morFont.oswald,
            fontSize: "clamp(2.5rem, 8vw, 6rem)",
            fontWeight: 600,
            letterSpacing: 0,
            lineHeight: 0.98,
          }}
        >
          Mission of Reconciliation
        </h1>

        <p
          className="mt-6 text-[1.35rem] leading-snug md:mt-8 md:text-[2rem]"
          style={{ color: morColor.goldInk, fontFamily: morFont.oswald, fontWeight: 400 }}
        >
          {morBrand.tagline}
        </p>

        <div className="mt-8 md:mt-10">
          <Lede>
            A national ministry helping people across America experience reconciliation,
            restoration, and freedom in Jesus Christ, and calling followers of Jesus to come
            alongside others right where they already live.
          </Lede>
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap md:mt-12">
          <PrimaryCta href={paths.restoration}>Begin Your Restoration Journey</PrimaryCta>
          <SecondaryCta href="#join-the-mission">Join the Mission</SecondaryCta>
        </div>
      </div>
    </section>
  );
}

function WhyItMattersSection() {
  return (
    <Section id="why-it-matters" tone="band">
      <Eyebrow>Why It Matters</Eyebrow>
      <div className="mt-5">
        <Display>No one was meant to walk alone.</Display>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="space-y-6">
          <Lede>
            Across America, marriages are struggling and families are fractured. People carry
            wounds, shame, unforgiveness, and fear they rarely say out loud.
          </Lede>
          <Body>
            Mission of Reconciliation equips followers of Jesus to come alongside them with love,
            truth, prayer, Scripture, and real relationship. We are not the ones who heal anyone.
            Jesus is the healer, restorer, and source of freedom. We make ourselves available and
            point people to Him.
          </Body>
        </div>

        <ScriptureQuote reference="2 Corinthians 5:18">
          All this is from God, who reconciled us to himself through Christ and gave us the ministry
          of reconciliation.
        </ScriptureQuote>
      </div>
    </Section>
  );
}

function RestorationJourneySection({ paths }: { paths: MissionPaths }) {
  return (
    <Section id="restoration-journey">
      <Eyebrow>The Restoration Journey</Eyebrow>
      <div className="mt-5">
        <Display>Three movements, walked together.</Display>
      </div>

      <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8 lg:gap-12">
        {journeySteps.map((step) => (
          <div key={step.number}>
            <div className="pb-4" style={{ borderBottom: `1px solid ${morColor.rule}` }}>
              <span
                className="text-[2.5rem] leading-none md:text-[3rem]"
                style={{ color: morColor.gold, fontFamily: morFont.oswald, fontWeight: 600 }}
              >
                {step.number}
              </span>
            </div>
            <h3
              className="mt-5 text-2xl uppercase tracking-[0.04em] md:text-[1.75rem]"
              style={{ color: morColor.ink, fontFamily: morFont.oswald, fontWeight: 600 }}
            >
              {step.heading}
            </h3>
            <p
              className="mt-3 text-lg leading-8"
              style={{ color: morColor.goldInk, fontFamily: morFont.oswald, fontWeight: 400 }}
            >
              {step.lead}
            </p>
            <p className="mt-4 text-base leading-8" style={{ color: morColor.body }}>
              {step.body}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-12">
        <PrimaryCta href={paths.restoration}>Begin Your Restoration Journey</PrimaryCta>
      </div>
    </Section>
  );
}

function PartnershipSection() {
  return (
    <Section compact id="partnership" tone="deep">
      {/* Centred: this band is a single statement, not a column of reading. */}
      <div className="text-center">
        <Eyebrow onDark>Mission of Reconciliation + USA Missionaries</Eyebrow>
        <p
          className="mx-auto mt-4 max-w-3xl text-[1.0625rem] leading-8 md:text-xl md:leading-9"
          style={{ color: "rgba(255,255,255,0.82)" }}
        >
          Mission of Reconciliation works in partnership with USA Missionaries because restoration
          and discipleship belong together. We want to see people reconciled to God, restored
          through Jesus, walking in obedience, and helping others follow Him.
        </p>
      </div>
    </Section>
  );
}

function DontWasteYourLifeSection() {
  return (
    <Section id="dont-waste-your-life">
      <Eyebrow>Don&rsquo;t Waste Your Life</Eyebrow>
      <div className="mt-5">
        <Display>What will you do with what God has given you?</Display>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <Body>
          John Piper challenges Christians not to spend the final chapters of life simply pursuing
          comfort, leisure, and retirement. The goal is not to arrive safely at the end with a
          collection of experiences, but to spend our lives for what matters eternally.
        </Body>

        <div>
          <p className="text-[15px] leading-8" style={{ color: morColor.muted }}>
            For Mission of Reconciliation, that raises a simple question:
          </p>
          <p
            className="mt-4 text-[1.4rem] leading-[1.35] md:text-[1.75rem]"
            style={{ color: morColor.ink, fontFamily: morFont.oswald, fontWeight: 500 }}
          >
            What if the wisdom, experience, testimony, and years God has given you were meant to be
            poured into <span style={{ color: morColor.goldInk }}>someone else?</span>
          </p>
        </div>
      </div>

      <div className="mt-10">
        <SermonVideoLink
          embedUrl={dontWasteYourLife.embedUrl}
          label={"Watch \u201cDon\u2019t Waste Your Life\u201d"}
          title={dontWasteYourLife.title}
          watchUrl={dontWasteYourLife.watchUrl}
        />
      </div>
    </Section>
  );
}

function StoriesSection({ paths }: { paths: MissionPaths }) {
  const onlyOne = featuredCaseStudies.length === 1;

  return (
    <Section id="stories" tone="band">
      <Eyebrow>Stories of Reconciliation</Eyebrow>
      <div className="mt-5">
        <Display>Meet people who said yes.</Display>
      </div>

      <div className="mt-8">
        <Lede>
          Ordinary followers of Jesus making themselves available to the people God has placed
          around them.
        </Lede>
      </div>

      {/*
        One published story gets the wide feature treatment so it does not read as
        a lone tile in an empty grid. Two or three fall into the card grid, and
        anything beyond that lives on the stories index.
      */}
      <div className={onlyOne ? "mt-12" : "mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8"}>
        {featuredCaseStudies.map((study, index) => (
          <StoryCard
            href={paths.storyHref(study.id)}
            index={index + 1}
            key={study.id}
            layout={onlyOne ? "feature" : "card"}
            study={study}
          />
        ))}
      </div>

      {caseStudies.length > 1 ? (
        <div className="mt-10">
          <SecondaryCta href={paths.stories}>All Stories of Reconciliation</SecondaryCta>
        </div>
      ) : null}
    </Section>
  );
}

function NationalInvitationSection({ paths }: { paths: MissionPaths }) {
  return (
    <Section id="join-the-mission">
      <Eyebrow>The Invitation</Eyebrow>
      <div className="mt-5">
        <Display size="xl">What if thousands of us lived this way?</Display>
      </div>

      {/*
        One column, no rules, no split. This is the close, so it reads straight
        down: what it asks of you, why now, and the two doors.
      */}
      <div className="mt-10 max-w-3xl md:mt-12">
        <p
          className="text-[1.6rem] leading-[1.25] md:text-[2rem]"
          style={{ color: morColor.ink, fontFamily: morFont.oswald, fontWeight: 600 }}
        >
          You need to be willing to love people, obey Jesus, and{" "}
          <span style={{ color: morColor.goldInk }}>make yourself available.</span>
        </p>

        <p
          className="mt-10 text-[1.5rem] leading-[1.25] md:text-[1.9rem]"
          style={{ color: morColor.ink, fontFamily: morFont.oswald, fontWeight: 600 }}
        >
          The need is great. <span style={{ color: morColor.goldInk }}>The time is now.</span>
        </p>

        <p className="mt-4 text-[1.0625rem] leading-8" style={{ color: morColor.body }}>
          Your kitchen table may be where someone&rsquo;s restoration begins.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <JoinMissionInterestModal
            defaultInterest="Come alongside people through Mission of Reconciliation"
            triggerClassName={morTriggerClassName}
            triggerFontWeight={700}
          >
            Join the Mission
          </JoinMissionInterestModal>
          <PrimaryCta href={paths.restoration}>Begin Your Restoration Journey</PrimaryCta>
        </div>
      </div>
    </Section>
  );
}

export default async function MissionOfReconciliationPage() {
  const paths = await getMissionPaths();

  return (
    <>
      <MissionHeader paths={paths} />
      <main style={{ backgroundColor: morColor.page }}>
        <HeroSection paths={paths} />
        <WhyItMattersSection />
        <RestorationJourneySection paths={paths} />
        <PartnershipSection />
        <DontWasteYourLifeSection />
        <StoriesSection paths={paths} />
        <NationalInvitationSection paths={paths} />
      </main>
    </>
  );
}
