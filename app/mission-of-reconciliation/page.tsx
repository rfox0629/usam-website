import type { Metadata } from "next";
import { buildDomainSiteSocialImage } from "@/src/lib/domain-metadata";
import { domainSites } from "@/src/lib/domain-sites";
import { MissionHeader } from "@/components/mission-of-reconciliation/MissionHeader";
import { JoinMissionInterestModal } from "@/components/forms/JoinMissionInterestModal";
import { morBrand, morColor, morFont, morRoutes } from "@/src/lib/mission-of-reconciliation/brand";
import { caseStudies } from "@/src/lib/mission-of-reconciliation/case-studies";
import {
  Body,
  Display,
  Eyebrow,
  Lede,
  ScriptureQuote,
  Section,
} from "./_components/MissionPrimitives";
import { PrimaryCta, SecondaryCta, morTriggerOnDarkClassName } from "./_components/MissionCta";
import { CaseStudyBlock } from "./_components/CaseStudy";

export const metadata: Metadata = {
  alternates: { canonical: morRoutes.home },
  description:
    "Mission of Reconciliation equips followers of Jesus across America to come alongside people with love, truth, prayer, and Scripture, pointing them toward restoration and freedom in Jesus Christ. In partnership with USA Missionaries.",
  openGraph: {
    description:
      "Mission of Reconciliation equips followers of Jesus across America to come alongside people with love, truth, prayer, and Scripture, pointing them toward restoration and freedom in Jesus Christ.",
    images: [buildDomainSiteSocialImage(domainSites.usam)],
    siteName: domainSites.usam.siteName,
    title: "Mission of Reconciliation | Healing, Freedom & Restoration",
    type: "website",
    url: morRoutes.home,
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

function HeroSection() {
  return (
    <section
      className="px-5 pb-16 pt-14 md:px-8 md:pb-24 md:pt-24"
      id="hero"
      style={{ backgroundColor: morColor.page }}
    >
      <div className="mx-auto w-full max-w-6xl">
        <Eyebrow>{morBrand.partnership}</Eyebrow>

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
          <PrimaryCta href={morRoutes.restoration}>Begin Your Restoration Journey</PrimaryCta>
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

function RestorationJourneySection() {
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
        <PrimaryCta href={morRoutes.restoration}>Begin Your Restoration Journey</PrimaryCta>
      </div>
    </Section>
  );
}

function PartnershipSection() {
  return (
    <Section compact id="partnership" tone="deep">
      <Eyebrow onDark>Mission of Reconciliation + USA Missionaries</Eyebrow>
      <p
        className="mt-4 max-w-3xl text-[1.0625rem] leading-8 md:text-xl md:leading-9"
        style={{ color: "rgba(255,255,255,0.82)" }}
      >
        Mission of Reconciliation works in partnership with USA Missionaries because restoration and
        discipleship belong together. We want to see people reconciled to God, restored through
        Jesus, walking in obedience, and helping others follow Him.
      </p>
    </Section>
  );
}

function StoriesSection() {
  return (
    <Section id="stories">
      <Eyebrow>Stories of Reconciliation</Eyebrow>
      <div className="mt-5">
        <Display>Reconciliation lived out.</Display>
      </div>

      <div className="mt-8">
        <Lede>
          What this looks like in real life: ordinary followers of Jesus walking with the people
          God has placed around them.
        </Lede>
      </div>

      <div className="mt-14 space-y-16 md:space-y-20">
        {caseStudies.map((study, index) => (
          <CaseStudyBlock index={index + 1} key={study.id} study={study} />
        ))}
      </div>
    </Section>
  );
}

function NationalInvitationSection() {
  return (
    <Section id="join-the-mission" tone="band">
      <Eyebrow>The Invitation</Eyebrow>
      <div className="mt-5">
        <Display size="xl">What if thousands of us lived this way?</Display>
      </div>

      <p
        className="mt-8 max-w-2xl text-base leading-8 md:text-[1.0625rem] md:leading-9"
        style={{ color: morColor.muted }}
      >
        Across America are followers of Jesus with years of wisdom, lessons learned, healed
        marriages, and stories of God&rsquo;s faithfulness. Around them are people who need someone
        willing to come alongside them.
      </p>

      {/* The turn: three things you don't need, set against the one thing you do. */}
      <div
        className="mt-12 grid gap-8 border-t pt-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16"
        style={{ borderColor: morColor.rule }}
      >
        <div className="space-y-2">
          {["You do not need a platform.", "You do not need a stage.", "You do not need a professional title."].map((line) => (
            <p
              className="text-[1.3rem] leading-[1.35] md:text-[1.45rem]"
              key={line}
              style={{ color: morColor.muted, fontFamily: morFont.oswald, fontWeight: 400 }}
            >
              {line}
            </p>
          ))}
        </div>

        <p
          className="text-[1.75rem] leading-[1.25] md:text-[2.15rem]"
          style={{ color: morColor.ink, fontFamily: morFont.oswald, fontWeight: 600 }}
        >
          You need to be willing to love people, obey Jesus, and{" "}
          <span style={{ color: morColor.goldInk }}>make yourself available.</span>
        </p>
      </div>

    </Section>
  );
}

function FinalCtaSection() {
  return (
    <Section id="next-step" tone="deep">
      <div className="grid gap-12 md:grid-cols-2 md:gap-16">
        <div>
          <h2
            className="text-[1.75rem] leading-tight md:text-[2.25rem]"
            style={{ color: "#FFFFFF", fontFamily: morFont.oswald, fontWeight: 600 }}
          >
            Do you need someone to come alongside you?
          </h2>
          <p className="mt-4 max-w-md text-base leading-8" style={{ color: "rgba(255,255,255,0.72)" }}>
            Share your story confidentially and we will prayerfully consider how to walk with you.
          </p>
          <div className="mt-7">
            <PrimaryCta href={morRoutes.restoration}>Begin Your Restoration Journey</PrimaryCta>
          </div>
        </div>

        <div>
          <h2
            className="text-[1.75rem] leading-tight md:text-[2.25rem]"
            style={{ color: "#FFFFFF", fontFamily: morFont.oswald, fontWeight: 600 }}
          >
            Are you ready to come alongside others?
          </h2>
          <p className="mt-4 max-w-md text-base leading-8" style={{ color: "rgba(255,255,255,0.72)" }}>
            Tell us a little about where God has placed you and we will follow up.
          </p>
          <div className="mt-7">
            <JoinMissionInterestModal
              defaultInterest="Come alongside people through Mission of Reconciliation"
              triggerClassName={morTriggerOnDarkClassName}
              triggerFontWeight={700}
            >
              Join the Mission
            </JoinMissionInterestModal>
          </div>
        </div>
      </div>

    </Section>
  );
}

export default function MissionOfReconciliationPage() {
  return (
    <>
      <MissionHeader />
      <main style={{ backgroundColor: morColor.page }}>
        <HeroSection />
        <WhyItMattersSection />
        <RestorationJourneySection />
        <PartnershipSection />
        <StoriesSection />
        <NationalInvitationSection />
        <FinalCtaSection />
      </main>
    </>
  );
}
