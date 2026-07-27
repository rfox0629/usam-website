import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PrimaryNav } from "../../components/PrimaryNav";

const title = "Kitchen Table Gospel | USA Missionaries";
const description =
  "Kitchen Table Gospel is the table-based movement and methodology USA Missionaries uses to help believers meet, minister, and multiply.";
const previewImage = "/images/vision/kitchen-table-01.jpg";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/kitchen-table-gospel",
  },
  openGraph: {
    title,
    description,
    siteName: "USA Missionaries",
    type: "website",
    url: "/kitchen-table-gospel",
    images: [
      {
        url: previewImage,
        width: 2048,
        height: 1536,
        alt: "People gathered around a kitchen table for ministry conversation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [previewImage],
  },
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

const pathwaySteps = [
  {
    label: "Meet",
    title: "Sit where life is already happening.",
    body: "Homes, coffee shops, church foyers, and ordinary relationships become places for honest spiritual conversation.",
  },
  {
    label: "Minister",
    title: "Listen, pray, and bring the Gospel near.",
    body: "The table gives enough structure to ask real questions without turning the moment into a script.",
  },
  {
    label: "Multiply",
    title: "Leave people with a next faithful step.",
    body: "Follow-up, discipleship, and connection keep the encounter from ending when the evening ends.",
  },
] as const;

const stewardshipSignals = [
  {
    metric: "Tables",
    detail: "Where meaningful Gospel conversations are hosted and remembered.",
  },
  {
    metric: "People",
    detail: "Who was prayed with, encouraged, and invited into continued discipleship.",
  },
  {
    metric: "Next Steps",
    detail: "Follow-up, church connection, discipleship, prayer, or another clear movement step.",
  },
  {
    metric: "Fruit",
    detail: "Approved stories and outcomes that can encourage the wider mission without exposing raw details.",
  },
] as const;

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[11px] font-semibold uppercase leading-relaxed tracking-[0.22em] text-usam-gold"
      style={{ fontFamily: font.rajdhani }}
    >
      {children}
    </p>
  );
}

function ActionLink({
  children,
  href,
  variant = "primary",
}: {
  children: React.ReactNode;
  href: string;
  variant?: "primary" | "secondary";
}) {
  const className = variant === "primary"
    ? "border-usam-gold bg-usam-gold text-usam-black hover:bg-stone-100"
    : "border-white/30 bg-transparent text-white hover:border-usam-gold hover:bg-white/[0.04]";

  return (
    <Link
      className={`inline-flex min-h-12 w-full items-center justify-center border px-6 py-3 text-center text-xs font-bold uppercase leading-5 tracking-[0.22em] transition-colors sm:w-auto ${className}`}
      href={href}
      style={{ fontFamily: font.rajdhani }}
    >
      {children}
    </Link>
  );
}

function SectionHeading({
  children,
  id,
}: {
  children: React.ReactNode;
  id: string;
}) {
  return (
    <h2
      className="mt-5 text-4xl font-bold uppercase leading-tight tracking-normal text-stone-100 md:text-5xl"
      id={id}
      style={{ fontFamily: font.oswald }}
    >
      {children}
    </h2>
  );
}

export default function KitchenTableGospelPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0D0D0D] text-stone-100">
      <PrimaryNav />

      <section className="relative overflow-hidden border-b border-stone-900/80 px-6 pb-14 pt-24 md:pb-20 md:pt-32">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[length:72px_72px]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,13,13,0.48),rgba(13,13,13,0.9)_76%,#0D0D0D)]" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="max-w-2xl">
            <Eyebrow>Movement Methodology</Eyebrow>
            <h1
              className="mt-6 text-5xl font-bold uppercase leading-none tracking-normal text-stone-100 md:text-7xl"
              style={{ fontFamily: font.oswald }}
            >
              Kitchen Table
              <br />
              Gospel
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-8 text-stone-300 md:text-lg">
              USA Missionaries is the sending and covering organization. Kitchen Table Gospel is one of the
              practical ways that mission becomes visible: believers gathered around ordinary tables to meet,
              minister, and multiply.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ActionLink href="/briefing">See Field Reports</ActionLink>
              <ActionLink href="/support" variant="secondary">Partner With USAM</ActionLink>
            </div>
          </div>

          <div className="relative overflow-hidden border border-white/[0.11] bg-black shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
            <div className="relative aspect-[4/3] min-h-[320px]">
              <Image
                alt="People smiling around a kitchen table with USA Missionaries ministry materials"
                className="object-cover opacity-[0.88] saturate-[0.86]"
                fill
                priority
                sizes="(min-width: 1024px) 620px, 100vw"
                src={previewImage}
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.05),rgba(13,13,13,0.86)),linear-gradient(90deg,rgba(194,161,78,0.18),transparent_36%)]" />
              <div className="absolute bottom-0 left-0 right-0 border-t border-white/[0.14] bg-black/62 p-5 backdrop-blur-sm md:p-6">
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.24em] text-usam-gold"
                  style={{ fontFamily: font.rajdhani }}
                >
                  The table is not the stage. It is the starting place.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mx-auto mt-12 grid max-w-6xl gap-px bg-stone-800/80 md:grid-cols-2">
          <div className="bg-[#0D0D0D] p-5 md:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500" style={{ fontFamily: font.rajdhani }}>
              USA Missionaries
            </p>
            <p className="mt-3 text-base leading-7 text-stone-300">
              Sends, covers, equips, and supports everyday missionaries across America.
            </p>
          </div>
          <div className="bg-[#0D0D0D] p-5 md:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-usam-gold" style={{ fontFamily: font.rajdhani }}>
              Kitchen Table Gospel
            </p>
            <p className="mt-3 text-base leading-7 text-stone-300">
              Provides a simple ministry rhythm for Gospel conversation, prayer, follow-up, and multiplication.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="relationship-title" className="border-b border-stone-900/80 px-6 py-16 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.82fr_1.18fr]">
          <div>
            <Eyebrow>The Relationship</Eyebrow>
            <SectionHeading id="relationship-title">
              One mission.
              <br />
              One method in motion.
            </SectionHeading>
          </div>
          <div className="space-y-5 text-base leading-8 text-stone-300 md:text-lg">
            <p>
              Kitchen Table Gospel is not a separate organization competing with USA Missionaries. It is a
              field-tested movement and methodology inside the USAM ecosystem.
            </p>
            <p>
              The public idea is simple on purpose: create room for real conversation, minister personally,
              record what needs to be stewarded, and help people take the next step with Jesus.
            </p>
            <p>
              The deeper training stays relational. This page gives the shape of the pathway without turning the
              work into a public playbook.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="pathway-title" className="relative overflow-hidden border-b border-stone-900/80 px-6 py-16 md:py-20">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.03),transparent_36%,rgba(194,161,78,0.06)_100%)]" />
        <div className="relative mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <Eyebrow>The Pathway</Eyebrow>
            <SectionHeading id="pathway-title">
              Meet.
              <br />
              Minister.
              <br />
              Multiply.
            </SectionHeading>
          </div>

          <div className="mt-10 grid gap-px bg-stone-800/80 md:grid-cols-3">
            {pathwaySteps.map((step, index) => (
              <article className="bg-[#0D0D0D] p-6 md:p-7" key={step.label}>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-usam-gold" style={{ fontFamily: font.rajdhani }}>
                  0{index + 1} / {step.label}
                </p>
                <h3 className="mt-5 text-2xl font-bold uppercase leading-tight text-stone-100" style={{ fontFamily: font.oswald }}>
                  {step.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-stone-400">
                  {step.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="outcomes-title" className="border-b border-stone-900/80 px-6 py-16 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative min-h-[360px] overflow-hidden border border-white/[0.11] bg-black">
            <Image
              alt="A group gathered after prayer and ministry"
              className="object-cover opacity-[0.82] saturate-[0.86]"
              fill
              sizes="(min-width: 1024px) 520px, 100vw"
              src="/images/vision/group-prayer-01.jpg"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,13,13,0.08),rgba(13,13,13,0.92)),linear-gradient(90deg,rgba(13,13,13,0.78),transparent_58%)]" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <p className="max-w-sm text-2xl font-bold uppercase leading-tight text-stone-100 md:text-3xl" style={{ fontFamily: font.oswald }}>
                Outcomes matter because people matter.
              </p>
            </div>
          </div>

          <div>
            <Eyebrow>Stewardship Signals</Eyebrow>
            <SectionHeading id="outcomes-title">
              Enough metrics
              <br />
              to care well.
            </SectionHeading>
            <p className="mt-6 max-w-xl text-base leading-8 text-stone-300 md:text-lg">
              Kitchen Table metrics are not a scoreboard. They help USAM remember people, honor follow-up, and
              approve only the fruit that should be shared publicly.
            </p>

            <div className="mt-8 divide-y divide-stone-800 border-y border-stone-800">
              {stewardshipSignals.map((signal) => (
                <div className="grid gap-2 py-4 sm:grid-cols-[150px_1fr] sm:items-start" key={signal.metric}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-usam-gold" style={{ fontFamily: font.rajdhani }}>
                    {signal.metric}
                  </p>
                  <p className="text-sm leading-7 text-stone-400">
                    {signal.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="invitation-title" className="px-6 py-16 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 border border-white/[0.11] bg-[linear-gradient(135deg,rgba(255,255,255,0.035),rgba(255,255,255,0.012)_52%,rgba(194,161,78,0.05))] p-6 md:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="max-w-3xl">
            <Eyebrow>The Invitation</Eyebrow>
            <h2
              className="mt-5 text-4xl font-bold uppercase leading-tight tracking-normal text-stone-100 md:text-5xl"
              id="invitation-title"
              style={{ fontFamily: font.oswald }}
            >
              Help carry the Gospel
              <br />
              back to the table.
            </h2>
            <p className="mt-6 text-base leading-8 text-stone-300 md:text-lg">
              Read what is already happening in the field, then prayerfully consider how to help USA Missionaries
              send, cover, and sustain this work.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <ActionLink href="/briefing">Read Field Reports</ActionLink>
            <ActionLink href="/support" variant="secondary">Support the Mission</ActionLink>
          </div>
        </div>
      </section>
    </main>
  );
}
