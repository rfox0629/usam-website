import type { Metadata } from "next";
import Link from "next/link";
import { PrimaryNav } from "../../components/PrimaryNav";
import { getCanonicalSiteUrl } from "@/src/lib/site-url";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

const pageTitle = "Discipleship Operating System | USA Missionaries";
const pageDescription =
  "The Discipleship Operating System is the technology tool inside the USA Missionaries ecosystem for ministry memory, prayer, accountability, Bible engagement, disciple making, and practical follow-up.";
const pagePath = "/discipleship-operating-system";
const pageUrl = `${getCanonicalSiteUrl()}${pagePath}`;
const socialImage = "/images/usam/2three2-share.png";

export const metadata: Metadata = {
  alternates: {
    canonical: pagePath,
  },
  description: pageDescription,
  openGraph: {
    description: pageDescription,
    images: [
      {
        alt: "USA Missionaries Discipleship Operating System",
        height: 630,
        url: socialImage,
        width: 1200,
      },
    ],
    siteName: "USA Missionaries",
    title: pageTitle,
    type: "website",
    url: pageUrl,
  },
  title: pageTitle,
  twitter: {
    card: "summary_large_image",
    description: pageDescription,
    images: [socialImage],
    title: pageTitle,
  },
};

const outcomes = [
  {
    label: "Ministry Memory",
    text: "People, conversations, and care rhythms are remembered after the table ends.",
  },
  {
    label: "Prayer",
    text: "Requests stay visible so teams can pray with attention and consistency.",
  },
  {
    label: "Accountability",
    text: "Follow-through becomes clear without turning discipleship into paperwork.",
  },
  {
    label: "Bible Engagement",
    text: "Scripture plans and simple assignments keep the Word central.",
  },
  {
    label: "Disciple Making",
    text: "Leaders can help people obey Jesus and teach others to do the same.",
  },
  {
    label: "Practical Follow-Up",
    text: "The next faithful step is easier to see, share, and complete.",
  },
] as const;

const sampleViews = [
  {
    eyebrow: "Sample View 01",
    title: "Ministry Memory",
    detail: "A simple record keeps the next step from being lost.",
    meta: ["Tuesday Table", "3 People", "Follow-up Ready"],
    rows: [
      ["Remember", "Local family asked for a baptism conversation."],
      ["Pray", "Peace in the home and courage to obey Jesus."],
      ["Next", "Send the Commands of Jesus reading plan."],
    ],
  },
  {
    eyebrow: "Sample View 02",
    title: "Prayer + Accountability",
    detail: "Care stays active between meetings.",
    meta: ["This Week", "2 Open Steps", "Team Prayer"],
    rows: [
      ["Today", "Pray for a neighbor returning to Scripture."],
      ["Thursday", "Check in after the first Bible reading."],
      ["Sunday", "Invite the group to pray before lunch."],
    ],
  },
  {
    eyebrow: "Sample View 03",
    title: "Bible + Follow-Up",
    detail: "The tool supports obedience, not distraction.",
    meta: ["John 15", "Luke 10 Next", "Shared Rhythm"],
    rows: [
      ["Read", "Abide in Jesus before the next conversation."],
      ["Practice", "Pray out loud with one person this week."],
      ["Share", "Teach the passage at the next table."],
    ],
  },
] as const;

function Eyebrow({ children, gold = false }: { children: React.ReactNode; gold?: boolean }) {
  return (
    <p
      className={`text-[11px] font-semibold uppercase tracking-[0.26em] ${
        gold ? "text-usam-gold" : "text-stone-400"
      }`}
      style={{ fontFamily: font.rajdhani }}
    >
      {children}
    </p>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-300"
      style={{ fontFamily: font.rajdhani }}
    >
      {children}
    </span>
  );
}

function SampleInterfaceView({ view }: { view: (typeof sampleViews)[number] }) {
  return (
    <article className="overflow-hidden border border-white/10 bg-[#101010] shadow-[0_22px_70px_rgba(0,0,0,0.34)]">
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Eyebrow gold>{view.eyebrow}</Eyebrow>
          <span
            className="text-[10px] uppercase tracking-[0.18em] text-stone-500"
            style={{ fontFamily: font.rajdhani }}
          >
            Illustrative Data
          </span>
        </div>
        <h3 className="mt-4 text-2xl font-semibold uppercase text-white" style={{ fontFamily: font.oswald }}>
          {view.title}
        </h3>
        <p className="mt-3 text-sm leading-6 text-stone-400">{view.detail}</p>
      </div>

      <div className="px-5 py-5">
        <div className="flex flex-wrap gap-2">
          {view.meta.map((item) => (
            <Pill key={item}>{item}</Pill>
          ))}
        </div>

        <div className="mt-5 divide-y divide-white/10 border-y border-white/10">
          {view.rows.map(([label, text]) => (
            <div key={label} className="grid gap-2 py-4 sm:grid-cols-[96px_1fr]">
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.18em] text-usam-gold"
                style={{ fontFamily: font.rajdhani }}
              >
                {label}
              </span>
              <p className="text-sm leading-6 text-stone-300">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function OutcomeCard({ outcome, index }: { outcome: (typeof outcomes)[number]; index: number }) {
  return (
    <article className="border border-white/10 bg-white/[0.022] p-5 md:p-6">
      <div
        className="text-[10px] font-semibold uppercase tracking-[0.24em] text-usam-gold"
        style={{ fontFamily: font.rajdhani }}
      >
        {String(index + 1).padStart(2, "0")}
      </div>
      <h3 className="mt-4 text-xl font-semibold uppercase text-white" style={{ fontFamily: font.oswald }}>
        {outcome.label}
      </h3>
      <p className="mt-3 text-sm leading-6 text-stone-400">{outcome.text}</p>
    </article>
  );
}

export default function DiscipleshipOperatingSystemPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0D0D0D] text-stone-100">
      <PrimaryNav active="dos" />

      <section className="relative overflow-hidden border-b border-white/10 px-5 pb-16 pt-24 sm:px-6 md:pb-20 md:pt-32">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[length:72px_72px]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,13,13,0.28),rgba(13,13,13,0.92)),linear-gradient(120deg,rgba(194,161,78,0.14),transparent_38%,rgba(15,157,118,0.08))]"
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="max-w-2xl">
            <Eyebrow gold>USA Missionaries // Technology Tool</Eyebrow>
            <h1
              className="mt-6 text-5xl font-bold uppercase leading-none text-white md:text-7xl"
              style={{ fontFamily: font.oswald }}
            >
              Discipleship Operating System
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-stone-300 md:text-xl">
              USAM sends, covers, and equips missionaries. DOS is the tool that helps the everyday work of discipleship stay remembered, prayed over, accountable, and actionable.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex min-h-[46px] items-center justify-center border border-usam-gold bg-usam-gold px-6 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#0D0D0D] transition-colors hover:bg-white"
                href="/briefing"
                style={{ fontFamily: font.rajdhani }}
              >
                See The Mission
              </Link>
              <Link
                className="inline-flex min-h-[46px] items-center justify-center border border-white/20 bg-white/[0.03] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-usam-gold/70 hover:text-usam-gold"
                href="/support"
                style={{ fontFamily: font.rajdhani }}
              >
                Support USAM
              </Link>
            </div>
          </div>

          <div className="border border-white/10 bg-black/55 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.44)] md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <Eyebrow>Public Overview</Eyebrow>
              <Pill>Sample Data Only</Pill>
            </div>

            <div className="grid gap-4 pt-4">
              {[
                ["USAM", "Sending, covering, training, and spiritual care."],
                ["DOS", "A protected technology tool for discipleship follow-through."],
                ["Public Boundary", "No real names, contact details, or personal notes are shown here."],
              ].map(([label, text]) => (
                <div key={label} className="border border-white/10 bg-white/[0.025] p-4">
                  <div
                    className="text-[10px] font-semibold uppercase tracking-[0.2em] text-usam-gold"
                    style={{ fontFamily: font.rajdhani }}
                  >
                    {label}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-stone-300">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 px-5 py-16 sm:px-6 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <Eyebrow gold>What It Makes Possible</Eyebrow>
            <h2
              className="mt-5 text-4xl font-bold uppercase leading-tight text-white md:text-5xl"
              style={{ fontFamily: font.oswald }}
            >
              Less Forgotten Ministry.
              <br />
              More Faithful Follow-Through.
            </h2>
          </div>

          <div className="mt-10 grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
            {outcomes.map((outcome, index) => (
              <OutcomeCard key={outcome.label} outcome={outcome} index={index} />
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden px-5 py-16 sm:px-6 md:py-20">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(194,161,78,0.7),transparent)]"
        />
        <div className="relative mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <Eyebrow gold>Curated Interface Views</Eyebrow>
              <h2
                className="mt-5 text-4xl font-bold uppercase leading-tight text-white md:text-5xl"
                style={{ fontFamily: font.oswald }}
              >
                A Quiet Tool For The Work Between Tables.
              </h2>
            </div>
            <p className="max-w-2xl text-base leading-8 text-stone-400 lg:justify-self-end">
              These are limited public illustrations of the promise, not a map of the full product. The point is simple: help missionaries remember, pray, engage Scripture, make disciples, and take the next faithful step.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {sampleViews.map((view) => (
              <SampleInterfaceView key={view.title} view={view} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-5 py-16 sm:px-6 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <Eyebrow gold>USAM + DOS</Eyebrow>
            <h2
              className="mt-5 text-4xl font-bold uppercase leading-tight text-white md:text-5xl"
              style={{ fontFamily: font.oswald }}
            >
              Covering For The Mission.
              <br />
              Tools For The Field.
            </h2>
          </div>
          <div className="border-l border-usam-gold/45 pl-6">
            <p className="text-lg leading-8 text-stone-300">
              USA Missionaries is the sending and covering organization. The Discipleship Operating System is one of the tools being built to serve that mission with care, clarity, and practical obedience.
            </p>
            <p className="mt-5 text-sm leading-7 text-stone-500">
              This public page shows the purpose and promise only. Protected ministry details remain inside the appropriate USAM systems.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
