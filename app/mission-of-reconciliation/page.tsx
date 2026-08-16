import type { Metadata } from "next";
import Image from "next/image";
import { MissionHeader } from "@/components/mission-of-reconciliation/MissionHeader";
import { JoinMissionInterestModal } from "@/components/forms/JoinMissionInterestModal";
import {
  dontWasteYourLife,
  morBrand,
  morColor,
  morFont,
  morRoutes,
} from "@/src/lib/mission-of-reconciliation/brand";
import {
  Body,
  Display,
  Eyebrow,
  Lede,
  ScriptureQuote,
  Section,
} from "./_components/MissionPrimitives";
import { PrimaryCta, SecondaryCta, morTriggerClassName } from "./_components/MissionCta";

export const metadata: Metadata = {
  alternates: { canonical: morRoutes.home },
  description:
    "Mission of Reconciliation comes alongside people across America with biblical truth, prayer, relationship, and discipleship, helping people find healing, freedom, and restoration in Jesus Christ. In partnership with USA Missionaries.",
  openGraph: {
    description:
      "Mission of Reconciliation comes alongside people across America with biblical truth, prayer, relationship, and discipleship, helping people find healing, freedom, and restoration in Jesus Christ.",
    title: "Mission of Reconciliation | Healing, Freedom & Restoration",
    type: "website",
    url: morRoutes.home,
  },
  title: "Mission of Reconciliation | Healing, Freedom & Restoration",
};

const journeySteps = [
  {
    heading: "Recognize",
    lead: "Bring what has been hidden into the light.",
    body: "Together, prayerfully recognize wounds, unforgiveness, fears, lies, destructive emotions, spiritual strongholds, or patterns influencing how we think and live.",
    number: "01",
  },
  {
    heading: "Respond",
    lead: "Bring it to Jesus.",
    body: "Respond through prayer, forgiveness, repentance, surrender, and Scripture. We are not simply analyzing the past. We are inviting Jesus into the places that have shaped us.",
    number: "02",
  },
  {
    heading: "Renew",
    lead: "Learn to walk in freedom.",
    body: "Replace lies with truth. Renew the mind. Understand our identity in Christ. Learn practical biblical patterns that allow us to keep walking with Jesus long after the formal restoration process is complete.",
    number: "03",
  },
] as const;

const whatItLooksLike = [
  {
    heading: "Someone to walk with you",
    body: "You do not have to process everything alone. Someone comes alongside you to listen, pray, encourage, and help you process what God may be revealing.",
  },
  {
    heading: "A place to be honest",
    body: "People should be able to speak honestly about wounds, relationships, unforgiveness, fear, sin, shame, or areas where they feel stuck without feeling condemned.",
  },
  {
    heading: "Scripture and truth",
    body: "Everything continually points people toward Jesus, God's Word, and their identity in Christ.",
  },
  {
    heading: "Seeking Jesus together",
    body: "Prayer is not something being performed on someone. We seek Jesus together.",
  },
  {
    heading: "Walking forward",
    body: "The goal is never dependence upon Mission of Reconciliation. The goal is increasing dependence upon Jesus, and learning how to recognize lies, respond with truth, forgive, pray, renew the mind, obey Christ, and continue walking in freedom.",
  },
] as const;

const progression = [
  {
    body: "Through Jesus Christ, we are reconciled to God.",
    title: "Reconciliation",
  },
  {
    body: "Jesus brings truth, forgiveness, healing, and freedom into broken places.",
    title: "Restoration",
  },
  {
    body: "We learn to follow Jesus, obey His commands, and put His Word into practice.",
    title: "Discipleship",
  },
  {
    body: "People who have been loved begin loving others. People who have been discipled begin discipling others. People who have experienced restoration begin coming alongside others.",
    title: "Multiplication",
  },
] as const;

const peopleWhoNeedSomeone = [
  "Young couples",
  "Broken marriages",
  "Single parents",
  "Men without fathers",
  "Women carrying wounds",
  "Families in crisis",
  "New believers",
  "People trapped in shame",
  "People who simply need someone to listen",
] as const;

function HeroSection() {
  return (
    <section
      className="px-5 pb-16 pt-14 md:px-8 md:pb-24 md:pt-24 lg:pb-28 lg:pt-28"
      style={{ backgroundColor: morColor.page }}
      id="hero"
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

        <div className="mt-8 max-w-3xl space-y-6 md:mt-10">
          <Lede>
            Across America, people are carrying wounds, broken relationships, fear, unforgiveness,
            shame, isolation, and burdens they were never meant to carry alone.
          </Lede>
          <Body>
            Mission of Reconciliation exists to mobilize followers of Jesus who are willing to love
            people, walk with them, pray with them, open Scripture together, and point them toward
            the healing, freedom, and restoration found in Jesus Christ.
          </Body>
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap md:mt-12">
          <PrimaryCta href={morRoutes.restoration}>Begin Your Restoration Journey</PrimaryCta>
          <SecondaryCta href="#join-the-mission">Join the Mission</SecondaryCta>
        </div>
      </div>
    </section>
  );
}

function TheNeedSection() {
  return (
    <Section id="the-need" tone="band">
      <Eyebrow>The Need</Eyebrow>
      <Display>The need is all around us.</Display>

      <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="space-y-6">
          <Lede>You do not have to look far to find someone carrying pain.</Lede>
          <div
            className="space-y-2 text-[1.0625rem] leading-9 md:text-lg"
            style={{ color: morColor.body }}
          >
            <p style={{ color: morColor.body }}>Marriages are struggling.</p>
            <p style={{ color: morColor.body }}>Families are fractured.</p>
            <p style={{ color: morColor.body }}>People are isolated.</p>
            <p style={{ color: morColor.body }}>
              Past wounds continue shaping present relationships.
            </p>
            <p style={{ color: morColor.body }}>Unforgiveness becomes bitterness.</p>
            <p style={{ color: morColor.body }}>Lies become identities.</p>
            <p style={{ color: morColor.body }}>Fear becomes bondage.</p>
          </div>
          <Body>
            And many people quietly carry these things while sitting in churches, going to work,
            raising families, and trying to move forward.
          </Body>
        </div>

        <div className="space-y-8">
          <Body style={{ color: morColor.ink }}>
            Jesus never intended His people to walk alone. Mission of Reconciliation believes
            followers of Jesus can come alongside one another with love, truth, prayer, Scripture,
            forgiveness, and genuine relationship.
          </Body>
          <ScriptureQuote reference="Galatians 6:2">
            Carry each other&rsquo;s burdens, and in this way you will fulfill the law of Christ.
          </ScriptureQuote>
          <Body>
            This is not something reserved for professionals. It is part of what it means to be the
            body of Christ.
          </Body>
        </div>
      </div>
    </Section>
  );
}

function WhatItIsSection() {
  return (
    <Section id="what-it-is">
      <Eyebrow>What Is Mission of Reconciliation?</Eyebrow>
      <Display>Helping people walk in freedom.</Display>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16">
        <div className="space-y-6">
          <Lede>
            Mission of Reconciliation comes alongside people who desire greater healing, freedom,
            reconciliation, and wholeness in Jesus Christ.
          </Lede>
          <Body>
            Through relationship, biblical truth, prayer, forgiveness, repentance, and renewing the
            mind, we help people bring difficult and broken places before Jesus.
          </Body>
          <ScriptureQuote reference="2 Corinthians 5:18">
            All this is from God, who reconciled us to himself through Christ and gave us the
            ministry of reconciliation.
          </ScriptureQuote>
        </div>

        <div
          className="border-t-2 pt-8 lg:border-l-2 lg:border-t-0 lg:pl-10 lg:pt-0"
          style={{ borderColor: morColor.gold }}
        >
          <p
            className="text-[1.5rem] leading-[1.35] md:text-[1.9rem]"
            style={{ color: morColor.ink, fontFamily: morFont.oswald, fontWeight: 500 }}
          >
            We do not believe we are the ones who fix people. Jesus is the healer, restorer, and
            source of freedom.
          </p>
          <p
            className="mt-5 text-lg leading-9 md:text-xl"
            style={{ color: morColor.body }}
          >
            Our role is to love people, come alongside them, and point them toward Him.
          </p>
        </div>
      </div>
    </Section>
  );
}

function RestorationJourneySection() {
  return (
    <Section id="restoration-journey" tone="band">
      <Eyebrow>The Restoration Journey</Eyebrow>
      <Display>Three movements, walked together.</Display>

      <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8 lg:gap-12">
        {journeySteps.map((step) => (
          <div key={step.number}>
            <div
              className="pb-4"
              style={{ borderBottom: `1px solid ${morColor.rule}` }}
            >
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

      <div className="mt-14">
        <PrimaryCta href={morRoutes.restoration}>Begin Your Restoration Journey</PrimaryCta>
      </div>
    </Section>
  );
}

function WhatItLooksLikeSection() {
  return (
    <Section id="what-it-looks-like">
      <Eyebrow>What It Looks Like</Eyebrow>
      <Display>Relationship, not a program.</Display>

      <dl className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2 lg:gap-y-14">
        {whatItLooksLike.map((item) => (
          <div key={item.heading}>
            <dt
              className="text-xl md:text-[1.4rem]"
              style={{ color: morColor.ink, fontFamily: morFont.oswald, fontWeight: 500 }}
            >
              {item.heading}
            </dt>
            <dd className="mt-3 text-base leading-8" style={{ color: morColor.body }}>
              {item.body}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-14">
        <ScriptureQuote reference="Romans 12:2">
          Do not conform to the pattern of this world, but be transformed by the renewing of your
          mind.
        </ScriptureQuote>
      </div>
    </Section>
  );
}

function PartnershipSection() {
  return (
    <Section id="partnership" tone="deep">
      <Eyebrow onDark>Mission of Reconciliation + USA Missionaries</Eyebrow>
      <Display onDark>Restoration that leads to discipleship.</Display>

      <div className="mt-8">
        <Lede onDark>
          Mission of Reconciliation works in partnership with USA Missionaries because restoration
          and discipleship belong together.
        </Lede>
      </div>

      <ol className="mt-14 grid gap-0">
        {progression.map((step, index) => (
          <li
            className="grid gap-3 py-7 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-10"
            key={step.title}
            style={{
              borderTop: index === 0 ? "none" : "1px solid rgba(255,255,255,0.14)",
            }}
          >
            <h3
              className="text-[1.65rem] uppercase leading-none tracking-[0.06em] md:text-[2.1rem]"
              style={{ color: morColor.gold, fontFamily: morFont.oswald, fontWeight: 600 }}
            >
              {step.title}
            </h3>
            <p
              className="max-w-2xl text-base leading-8 md:text-[1.0625rem] md:leading-9"
              style={{ color: "rgba(255,255,255,0.76)" }}
            >
              {step.body}
            </p>
          </li>
        ))}
      </ol>

      <div
        className="mt-14 border-t pt-10"
        style={{ borderColor: "rgba(255,255,255,0.14)" }}
      >
        <p
          className="text-[1.5rem] leading-[1.4] md:text-[2rem]"
          style={{ color: "#FFFFFF", fontFamily: morFont.oswald, fontWeight: 400 }}
        >
          People coming alongside people.
          <br />
          Disciples making disciples.
          <br />
          <span style={{ color: morColor.gold }}>Jesus at the center of it all.</span>
        </p>

        <Image
          alt="USA Missionaries"
          className="mt-10 h-auto w-[84px] object-contain"
          height={52}
          src="/brand/logo/usam-website-logo.png"
          width={84}
        />
      </div>
    </Section>
  );
}

function MartyAndLauriSection() {
  return (
    <Section id="marty-and-lauri">
      <Eyebrow>Marty + Lauri Fox</Eyebrow>
      <Display>A life poured out for Christ.</Display>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 md:gap-8">
        <figure>
          <div className="relative aspect-[4/3] w-full overflow-hidden" style={{ backgroundColor: morColor.band }}>
            <Image
              alt="Marty and Lauri Fox early in their marriage"
              className="object-cover"
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1152px) 50vw, 576px"
              src="/images/mission-of-reconciliation/marty-lauri-early.webp"
            />
          </div>
          <figcaption
            className="mt-3 text-[11px] uppercase tracking-[0.18em]"
            style={{ color: morColor.muted, fontFamily: morFont.rajdhani, fontWeight: 600 }}
          >
            Early in their marriage
          </figcaption>
        </figure>

        <figure>
          <div className="relative aspect-[4/3] w-full overflow-hidden" style={{ backgroundColor: morColor.band }}>
            <Image
              alt="Marty and Lauri Fox today"
              className="object-cover"
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1152px) 50vw, 576px"
              src="/images/mission-of-reconciliation/marty-lauri-today.webp"
            />
          </div>
          <figcaption
            className="mt-3 text-[11px] uppercase tracking-[0.18em]"
            style={{ color: morColor.muted, fontFamily: morFont.rajdhani, fontWeight: 600 }}
          >
            Today &mdash; nearly 30 years of coming alongside people
          </figcaption>
        </figure>
      </div>

      <div className="mt-14 grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="space-y-6">
          <Lede>
            Marty and Lauri Fox gave their lives to the Lord in their late twenties.
          </Lede>
          <Body>
            Through discipleship, they began learning what it truly means to follow Jesus, build
            their lives on His Word, and raise a family that fears God and obeys His commands.
          </Body>
          <Body>
            But they did not learn to follow Jesus alone. Throughout their lives, God placed
            incredible men and women around them who poured into them, discipled them, challenged
            them, loved them, and showed them what it looks like to genuinely follow Christ.
          </Body>
          <Body style={{ color: morColor.ink }}>
            They learned that following Jesus means more than knowing the Word. It means doing the
            Word.
          </Body>
          <ScriptureQuote reference="James 1:22">
            Do not merely listen to the word, and so deceive yourselves. Do what it says.
          </ScriptureQuote>
        </div>

        <div className="space-y-6">
          <Body>
            For nearly 30 years, Marty and Lauri have tried to do for others what faithful men and
            women once did for them.
          </Body>
          <ul className="space-y-3">
            {[
              "They have opened their home.",
              "Sat around kitchen tables.",
              "Walked with marriages and families.",
              "Prayed with people.",
              "Encouraged people through difficult seasons.",
              "Shared what God has taught them.",
              "And made themselves available when someone needed people willing to come alongside them.",
            ].map((line) => (
              <li
                className="border-l pl-5 text-base leading-8 md:text-[1.0625rem]"
                key={line}
                style={{ borderColor: morColor.rule, color: morColor.body }}
              >
                {line}
              </li>
            ))}
          </ul>
          <Body>
            They do not claim to have all the answers. They simply want to love people well, point
            them toward Jesus, and pour into others what God has spent decades pouring into them.
          </Body>
        </div>
      </div>
    </Section>
  );
}

function DontWasteYourLifeSection() {
  return (
    <Section id="dont-waste-your-life" tone="band">
      <Eyebrow>Don&rsquo;t Waste Your Life</Eyebrow>
      <Display>Retirement looks different when your life belongs to Jesus.</Display>

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
        <div className="space-y-6">
          <Lede>
            Marty and Lauri are entering a season when many people begin asking,
            &ldquo;When can we retire?&rdquo;
          </Lede>
          <Body style={{ color: morColor.ink }}>
            They are asking a different question: &ldquo;How can we spend the rest of our lives for
            Jesus?&rdquo;
          </Body>
          <Body>
            In <cite style={{ fontStyle: "normal" }}>Don&rsquo;t Waste Your Life</cite>, John Piper
            describes the tragedy of reaching the end of a life and having little to show for it but
            a collection of seashells &mdash; comfort accumulated, and not much else laid up for
            Christ. Marty and Lauri do not want the final chapter of their lives to simply be about
            comfort.
          </Body>

          <ul className="space-y-3 pt-2">
            {[
              "Keep opening their home.",
              "Keep loving people.",
              "Keep making disciples.",
              "Keep walking with marriages and families.",
              "Keep obeying Jesus.",
              "Keep pouring into others what God has spent decades pouring into them.",
            ].map((line) => (
              <li
                className="border-l pl-5 text-base leading-8 md:text-[1.0625rem]"
                key={line}
                style={{ borderColor: morColor.gold, color: morColor.body }}
              >
                {line}
              </li>
            ))}
          </ul>

          <p
            className="pt-4 text-[1.35rem] leading-[1.45] md:text-[1.7rem]"
            style={{ color: morColor.ink, fontFamily: morFont.oswald, fontWeight: 500 }}
          >
            For Marty and Lauri, this is not retirement. It is a life sold out to Christ until the
            very end.
          </p>
        </div>

        <div>
          <div
            className="relative w-full overflow-hidden"
            style={{ aspectRatio: "16 / 9", backgroundColor: morColor.deep }}
          >
            <iframe
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              src={dontWasteYourLife.embedUrl}
              title={dontWasteYourLife.title}
            />
          </div>
          <p className="mt-4 text-sm leading-7" style={{ color: morColor.muted }}>
            John Piper, <cite style={{ fontStyle: "normal" }}>Don&rsquo;t Waste Your Life</cite>.{" "}
            <a
              className="underline underline-offset-4"
              href={dontWasteYourLife.watchUrl}
              rel="noopener noreferrer"
              style={{ color: morColor.goldInk }}
              target="_blank"
            >
              Watch on YouTube
            </a>
            .
          </p>
        </div>
      </div>
    </Section>
  );
}

function NationalInvitationSection() {
  return (
    <Section id="join-the-mission">
      <Eyebrow>The Invitation</Eyebrow>
      <Display size="xl">What if thousands of us lived this way?</Display>

      <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="space-y-6">
          <Lede>
            Marty and Lauri are not extraordinary because they have a special title. They simply
            made themselves available.
          </Lede>
          <Body>
            Across America, there are followers of Jesus with decades of life experience, biblical
            wisdom, stories of God&rsquo;s faithfulness, healed marriages, lessons learned through
            failure, and years of walking with Christ.
          </Body>
          <Body style={{ color: morColor.ink }}>
            And all around them are people who desperately need someone to come alongside them.
          </Body>

          <ul className="grid gap-x-8 gap-y-2 pt-2 sm:grid-cols-2">
            {peopleWhoNeedSomeone.map((person) => (
              <li
                className="text-base leading-8"
                key={person}
                style={{ color: morColor.body }}
              >
                {person}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-6">
          <p
            className="text-[2rem] leading-[1.1] md:text-[2.75rem]"
            style={{ color: morColor.ink, fontFamily: morFont.oswald, fontWeight: 600 }}
          >
            The need is great.
            <br />
            <span style={{ color: morColor.goldInk }}>The time is now.</span>
          </p>
          <Body>
            Mission of Reconciliation exists not only to help people experience restoration, but to
            call followers of Jesus across America to become people who carry reconciliation
            wherever God has placed them.
          </Body>
          <div className="space-y-1 pt-2">
            <p className="text-base leading-8" style={{ color: morColor.body }}>
              You do not need a platform.
            </p>
            <p className="text-base leading-8" style={{ color: morColor.body }}>
              You do not need a stage.
            </p>
            <p className="text-base leading-8" style={{ color: morColor.body }}>
              You do not need a professional title.
            </p>
            <p className="text-base leading-8" style={{ color: morColor.ink }}>
              You need to be willing to love people, obey Jesus, and make yourself available.
            </p>
          </div>
          <ScriptureQuote reference="James 1:22">
            Do what it says.
          </ScriptureQuote>
        </div>
      </div>

      <div
        className="mt-16 border-t pt-12"
        style={{ borderColor: morColor.rule }}
      >
        <p
          className="max-w-4xl text-[1.9rem] leading-[1.15] md:text-[2.75rem]"
          style={{ color: morColor.ink, fontFamily: morFont.oswald, fontWeight: 600 }}
        >
          Join the Mission of Reconciliation.
        </p>
        <p
          className="mt-5 max-w-2xl text-lg leading-9 md:text-xl"
          style={{ color: morColor.goldInk, fontFamily: morFont.oswald, fontWeight: 400 }}
        >
          Your kitchen table may be where someone&rsquo;s restoration begins.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <JoinMissionInterestModal
            defaultInterest="Come alongside people through Mission of Reconciliation"
            triggerClassName={morTriggerClassName}
            triggerFontWeight={700}
          >
            Join the Mission of Reconciliation
          </JoinMissionInterestModal>
          <PrimaryCta href={morRoutes.restoration}>Begin My Restoration Journey</PrimaryCta>
        </div>
      </div>
    </Section>
  );
}

function ClosingSection() {
  return (
    <section
      className="px-5 py-14 md:px-8 md:py-16"
      style={{ backgroundColor: morColor.deep }}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p
            className="text-lg uppercase tracking-[0.1em] md:text-xl"
            style={{ color: "#FFFFFF", fontFamily: morFont.oswald, fontWeight: 500 }}
          >
            {morBrand.name}
          </p>
          <p
            className="mt-2 text-[11px] uppercase tracking-[0.18em]"
            style={{ color: morColor.gold, fontFamily: morFont.rajdhani, fontWeight: 600 }}
          >
            {morBrand.partnership}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <PrimaryCta href={morRoutes.restoration}>Begin Your Restoration Journey</PrimaryCta>
          <SecondaryCta href="/" onDark>
            USA Missionaries
          </SecondaryCta>
        </div>
      </div>
    </section>
  );
}

export default function MissionOfReconciliationPage() {
  return (
    <>
      <MissionHeader />
      <main style={{ backgroundColor: morColor.page }}>
        <HeroSection />
        <TheNeedSection />
        <WhatItIsSection />
        <RestorationJourneySection />
        <WhatItLooksLikeSection />
        <PartnershipSection />
        <MartyAndLauriSection />
        <DontWasteYourLifeSection />
        <NationalInvitationSection />
        <ClosingSection />
      </main>
    </>
  );
}
