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
  Sparkles,
  Users,
  Waves,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

// 2THREE2 keeps the USAM brand family (Oswald / Rajdhani / Inter, dark canvas,
// Reveal-on-scroll pattern) established by the other domain-site mockups
// (Kitchen Table Gospel, DOS) but trades their cool blues for a warm sunrise
// accent, since this is an outdoors / active-movement brand, not a study or
// operations tool. Deep green-charcoal reads "trail," not "gym" or "ops room."
const t2 = {
  accent: "#E8873F",
  accentDeep: "#B85F1F",
  accentSoft: "#F5B979",
  bg: "#0F1611",
  bgAlt: "#0B100C",
  cream: "#F3ECDD",
  panel: "#171F19",
  panelBorder: "rgba(243,236,221,0.12)",
} as const;

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisible(true);
    }, { threshold: 0.15 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="transition-all duration-700"
      style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(28px)", transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-4 inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.32em]"
      style={{ color: t2.accentSoft, fontFamily: font.rajdhani }}
    >
      <span className="h-px w-8" style={{ background: t2.accentDeep }} />
      {children}
    </p>
  );
}

function SectionHeading({
  eyebrow,
  headline,
  children,
  align = "center",
}: {
  eyebrow?: string;
  headline: React.ReactNode;
  children?: React.ReactNode;
  align?: "center" | "left";
}) {
  return (
    <div className={`max-w-3xl ${align === "center" ? "mx-auto text-center" : "text-left"}`}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2
        className="text-3xl font-bold leading-[1.05] tracking-tight text-stone-100 md:text-5xl"
        style={{ fontFamily: font.oswald }}
      >
        {headline}
      </h2>
      {children ? <div className="mt-5 text-base leading-relaxed text-stone-400 md:text-lg">{children}</div> : null}
    </div>
  );
}

function ctaVisuals(variant: "primary" | "secondary") {
  const className = "inline-flex items-center justify-center gap-2 whitespace-nowrap border px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition-all duration-300 sm:px-7 sm:text-sm sm:tracking-[0.18em]";
  const style: React.CSSProperties = variant === "primary"
    ? { background: t2.accent, borderColor: t2.accent, color: "#1A1006", fontFamily: font.rajdhani }
    : { borderColor: t2.accentDeep, color: t2.cream, fontFamily: font.rajdhani };

  return { className, style };
}

function CTAButton({
  children,
  variant = "primary",
  href,
  onClick,
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  href?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}) {
  const { className, style } = ctaVisuals(variant);

  return (
    <a
      href={href}
      onClick={onClick}
      className={className}
      style={style}
      onMouseEnter={(e) => { if (variant === "secondary") e.currentTarget.style.background = "rgba(232,135,63,0.12)"; }}
      onMouseLeave={(e) => { if (variant === "secondary") e.currentTarget.style.background = "transparent"; }}
    >
      {children}
    </a>
  );
}

// Slim strip, not the main header, so it can't be mistaken for real site chrome
// but still makes it obvious to anyone with the link that this is a concept.
function FounderPreviewBanner() {
  return (
    <div
      className="relative z-[60] w-full border-b px-4 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.2em]"
      style={{ background: t2.bgAlt, borderColor: t2.panelBorder, color: t2.accentSoft, fontFamily: font.rajdhani }}
    >
      Founder Preview &middot; 2THREE2 Design Concept &middot; Not a Live Site
    </div>
  );
}

function Header() {
  return (
    <header
      className="fixed inset-x-0 top-[29px] z-50 w-full border-b"
      style={{ background: "rgba(15,22,17,0.92)", backdropFilter: "blur(12px)", borderColor: t2.panelBorder }}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-4 md:px-10">
        <div className="flex flex-col leading-none">
          <a
            href="#top"
            className="text-lg font-bold tracking-[0.06em] text-stone-100 sm:text-xl"
            style={{ fontFamily: font.oswald }}
          >
            2THREE2
          </a>
          <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.14em] sm:text-[10px] sm:tracking-[0.26em]" style={{ color: t2.accentSoft, fontFamily: font.rajdhani }}>
            Powered by{" "}
            <a href="https://usamissionaries.org" className="underline decoration-dotted underline-offset-4 hover:text-stone-100">
              USA Missionaries
            </a>
          </span>
        </div>

        <CTAButton href="#start-or-join">Join the Movement</CTAButton>
      </div>
    </header>
  );
}

// A hand-tuned wave (not a literal GPS track) representing a run/ride/hike route.
// Four waypoints along it echo the Four Commitments below, so the hero visual
// pays off later in the page instead of being decorative-only.
const trailPoints: Array<[number, number]> = Array.from({ length: 48 }, (_, i) => {
  const progress = i / 47;
  const x = 30 + progress * 480;
  const y = 260 + Math.sin(progress * Math.PI * 2.3) * 130 * (1 - progress * 0.25);
  return [x, y];
});
const trailPathD = trailPoints.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
const trailWaypoints = [0.06, 0.36, 0.66, 0.95].map((progress) => {
  const index = Math.round(progress * (trailPoints.length - 1));
  return trailPoints[index];
});
const trailLabels = ["MOVE", "PRAY", "PURSUE", "GO"] as const;

function TrailHero() {
  return (
    <svg viewBox="0 0 540 400" className="h-auto w-full overflow-visible" aria-hidden="true">
      <defs>
        <radialGradient id="trailGlow" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor={t2.accent} stopOpacity={0.16} />
          <stop offset="100%" stopColor={t2.accent} stopOpacity={0} />
        </radialGradient>
      </defs>
      <ellipse cx={270} cy={230} rx={260} ry={190} fill="url(#trailGlow)" />
      <path d={trailPathD} fill="none" stroke={t2.panelBorder} strokeWidth={2} />
      <path d={trailPathD} fill="none" stroke={t2.accent} strokeWidth={2} strokeDasharray="2,10" strokeLinecap="round" opacity={0.85}>
        <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="2.4s" repeatCount="indefinite" />
      </path>
      {trailWaypoints.map(([x, y], i) => (
        <g key={trailLabels[i]}>
          <circle cx={x} cy={y} r={16} fill={t2.bg} stroke={t2.accent} strokeWidth={1.6} />
          <circle cx={x} cy={y} r={4} fill={t2.accent}>
            <animate attributeName="opacity" values="0.5;1;0.5" dur={`${2.4 + i * 0.4}s`} repeatCount="indefinite" />
          </circle>
          <text
            x={x}
            y={i % 2 === 0 ? y - 28 : y + 40}
            textAnchor="middle"
            fill={t2.cream}
            fontSize={13}
            letterSpacing="0.16em"
            style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          >
            {trailLabels[i]}
          </text>
        </g>
      ))}
    </svg>
  );
}

const progressionSteps = [
  "Show up",
  "Move together",
  "Build trust",
  "Pray together",
  "Pursue Jesus",
  "Live on mission",
] as const;

function ProgressionFlow() {
  return (
    <div className="flex flex-wrap items-stretch justify-center gap-3 md:flex-nowrap md:gap-2">
      {progressionSteps.map((step, i) => (
        <React.Fragment key={step}>
          <div
            className="flex min-w-[128px] flex-1 items-center justify-center border px-4 py-4 text-center md:min-w-0"
            style={{ background: t2.panel, borderColor: t2.panelBorder }}
          >
            <span className="text-xs font-bold uppercase leading-snug tracking-[0.1em] text-stone-100 sm:text-sm" style={{ fontFamily: font.rajdhani }}>
              {step}
            </span>
          </div>
          {i < progressionSteps.length - 1 ? (
            <span
              aria-hidden="true"
              className="hidden items-center justify-center text-lg md:flex"
              style={{ color: t2.accentSoft }}
            >
              &rarr;
            </span>
          ) : null}
        </React.Fragment>
      ))}
    </div>
  );
}

const commitments: Array<{ icon: LucideIcon; title: string; body: string }> = [
  { body: "Create consistent rhythms of activity together.", icon: Footprints, title: "Move" },
  { body: "Pray for one another and the places we move through.", icon: HandHeart, title: "Pray" },
  { body: "Pursue righteousness, faith, love, peace, and Jesus.", icon: Compass, title: "Pursue" },
  { body: "Carry faith into homes, workplaces, neighborhoods, and mission fields.", icon: Flag, title: "Go" },
];

function CommitmentCard({ icon: Icon, title, body, delay }: { icon: LucideIcon; title: string; body: string; delay: number }) {
  return (
    <Reveal delay={delay}>
      <div className="h-full border p-7" style={{ background: t2.panel, borderColor: t2.panelBorder }}>
        <div className="mb-5 inline-flex h-11 w-11 items-center justify-center border" style={{ borderColor: t2.accentDeep, color: t2.accentSoft }}>
          <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.6} />
        </div>
        <h3 className="text-xl font-bold text-stone-100" style={{ fontFamily: font.oswald }}>{title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-stone-400">{body}</p>
      </div>
    </Reveal>
  );
}

const activities: Array<{ icon: LucideIcon; label: string }> = [
  { icon: Footprints, label: "Running" },
  { icon: Footprints, label: "Walking" },
  { icon: Mountain, label: "Hiking" },
  { icon: Bike, label: "Cycling" },
  { icon: Waves, label: "Triathlon" },
  { icon: Dumbbell, label: "Fitness" },
];

function ActivityPill({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div
      className="flex items-center gap-2.5 border px-4 py-3"
      style={{ background: t2.panel, borderColor: t2.panelBorder }}
    >
      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.7} style={{ color: t2.accentSoft }} />
      <span className="text-sm font-semibold text-stone-200">{label}</span>
    </div>
  );
}

const gatheringSteps = [
  "Meet consistently.",
  "Share a short Scripture, question, or prayer focus.",
  "Move together.",
  "Pray during or after the activity.",
  "Encourage a practical next step.",
  "Look for opportunities to serve and make disciples.",
] as const;

const raceExamples = [
  "Raise awareness for the mission",
  "Recruit prayer partners",
  "Invite business sponsors",
  "Rally support around a missionary assignment",
] as const;

type InterestKind = "join" | "start";

// Local-only concept UI. No network call, no Supabase, no backend: submitting
// just flips a confirmation message so the founder can see the intended shape
// of the flow without this preview accidentally collecting real data.
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
    <div className="flex h-full flex-col border p-7 md:p-8" style={{ background: t2.panel, borderColor: t2.panelBorder }}>
      <h3 className="text-2xl font-bold text-stone-100" style={{ fontFamily: font.oswald }}>{title}</h3>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-stone-400">{body}</p>

      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="mt-6 inline-flex items-center justify-center gap-2 border px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors duration-300 sm:text-sm sm:tracking-[0.18em]"
          style={{ borderColor: t2.accent, color: t2.accentSoft, fontFamily: font.rajdhani }}
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
            <p className="border p-4 text-sm leading-relaxed" style={{ background: "rgba(232,135,63,0.08)", borderColor: t2.accentDeep, color: t2.accentSoft }}>
              Thanks for the interest. This is a design preview only, so nothing was actually sent. A real interest form will be built in a future phase.
            </p>
          ) : (
            <>
              <div>
                <label htmlFor={`${fieldPrefix}-name`} className="text-[11px] uppercase tracking-[0.15em] text-stone-500" style={{ fontFamily: font.rajdhani }}>
                  Name
                </label>
                <input
                  id={`${fieldPrefix}-name`}
                  type="text"
                  placeholder="Your name"
                  className="mt-2 min-h-11 w-full border bg-transparent px-3 text-sm text-stone-100 outline-none placeholder:text-stone-600"
                  style={{ borderColor: t2.panelBorder }}
                />
              </div>
              <div>
                <label htmlFor={`${fieldPrefix}-city`} className="text-[11px] uppercase tracking-[0.15em] text-stone-500" style={{ fontFamily: font.rajdhani }}>
                  City
                </label>
                <input
                  id={`${fieldPrefix}-city`}
                  type="text"
                  placeholder="City, State"
                  className="mt-2 min-h-11 w-full border bg-transparent px-3 text-sm text-stone-100 outline-none placeholder:text-stone-600"
                  style={{ borderColor: t2.panelBorder }}
                />
              </div>
              <p className="text-[11px] leading-relaxed text-stone-600">
                Concept only &mdash; this preview form is not connected to anything yet.
              </p>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] sm:text-sm sm:tracking-[0.18em]"
                style={{ background: t2.accent, color: "#1A1006", fontFamily: font.rajdhani }}
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

export function Two3TwoPage() {
  return (
    <main id="top" className="min-h-screen" data-domain-site="2three2-v1" style={{ background: t2.bg, color: t2.cream }}>
      <FounderPreviewBanner />
      <Header />

      {/* HERO */}
      <section className="relative flex min-h-screen items-center overflow-hidden pt-40 md:pt-32">
        <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(ellipse at 25% 30%, rgba(232,135,63,0.1) 0%, transparent 55%)` }} />
        <div className="pointer-events-none absolute inset-0" style={{ background: `linear-gradient(180deg, ${t2.bgAlt} 0%, ${t2.bg} 45%, ${t2.bgAlt} 100%)` }} />

        <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-16 px-6 py-16 md:grid-cols-2 md:items-center md:px-10">
          <div>
            <Reveal>
              <Eyebrow>An active discipleship movement</Eyebrow>
            </Reveal>
            <Reveal delay={100}>
              <h1 className="text-5xl font-bold leading-[1.03] tracking-tight text-stone-100 sm:text-6xl md:text-7xl" style={{ fontFamily: font.oswald }}>
                Run. Pray.
                <br />
                Pursue.
              </h1>
            </Reveal>
            <Reveal delay={200}>
              <p
                className="mt-6 text-[13px] font-semibold uppercase leading-loose tracking-[0.2em] sm:text-sm"
                style={{ color: t2.accentSoft, fontFamily: font.rajdhani }}
              >
                Move together. Pray together. Pursue Jesus together.
              </p>
            </Reveal>
            <Reveal delay={300}>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-stone-400 md:text-lg">
                2THREE2 is an active discipleship movement where people move together, pray over their communities,
                build authentic relationships, and pursue Jesus side by side.
              </p>
            </Reveal>
            <Reveal delay={420}>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <CTAButton href="#start-or-join">Join the Movement</CTAButton>
                <CTAButton variant="secondary" href="#why-we-move">See How It Works</CTAButton>
              </div>
            </Reveal>
          </div>

          <Reveal delay={260}>
            <div className="relative mx-auto max-w-md md:max-w-none">
              <TrailHero />
            </div>
          </Reveal>
        </div>
      </section>

      {/* WHY WE MOVE */}
      <section id="why-we-move" className="px-6 py-24 md:px-10 md:py-32">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionHeading eyebrow="Why We Move" headline="Movement creates room for relationship.">
              <p>Side by side, guards come down. Conversation moves easier. There is time, and there is trust.</p>
            </SectionHeading>
          </Reveal>
          <Reveal delay={150}>
            <div className="mt-14">
              <ProgressionFlow />
            </div>
          </Reveal>
        </div>
      </section>

      {/* FOUR COMMITMENTS */}
      <section className="border-y px-6 py-24 md:px-10 md:py-32" style={{ background: t2.bgAlt, borderColor: t2.panelBorder }}>
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionHeading eyebrow="What We Commit To" headline="Four commitments, held together.">
              <p>Not a program to finish. A rhythm to keep, with people who keep it alongside you.</p>
            </SectionHeading>
          </Reveal>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {commitments.map((c, i) => (
              <CommitmentCard key={c.title} body={c.body} delay={i * 120} icon={c.icon} title={c.title} />
            ))}
          </div>
        </div>
      </section>

      {/* MORE THAN RUNNING */}
      <section className="px-6 py-24 md:px-10 md:py-32">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <SectionHeading eyebrow="More Than Running" headline="Move however you move.">
              <p>Running got us started, but the movement makes room for however people already gather and move.</p>
            </SectionHeading>
          </Reveal>
          <Reveal delay={150}>
            <div className="mt-12 flex flex-wrap justify-center gap-3">
              {activities.map((a) => (
                <ActivityPill key={a.label} icon={a.icon} label={a.label} />
              ))}
            </div>
          </Reveal>
          <Reveal delay={260}>
            <p className="mx-auto mt-14 max-w-xl text-center text-xl font-semibold leading-relaxed text-stone-100 md:text-2xl" style={{ fontFamily: font.oswald }}>
              The activity may change.
              <br />
              The purpose does not.
            </p>
          </Reveal>
        </div>
      </section>

      {/* WHAT A GATHERING LOOKS LIKE */}
      <section className="border-y px-6 py-24 md:px-10 md:py-32" style={{ background: t2.bgAlt, borderColor: t2.panelBorder }}>
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <SectionHeading eyebrow="What a Gathering Looks Like" headline="Simple. Not rigid.">
              <p>No script, no building, no title required. Just a consistent, honest rhythm.</p>
            </SectionHeading>
          </Reveal>
          <Reveal delay={150}>
            <ol className="mt-12 space-y-3">
              {gatheringSteps.map((step, i) => (
                <li
                  key={step}
                  className="flex items-start gap-4 border p-5"
                  style={{ background: t2.panel, borderColor: t2.panelBorder }}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center border text-xs font-bold"
                    style={{ borderColor: t2.accentDeep, color: t2.accentSoft, fontFamily: font.rajdhani }}
                  >
                    {i + 1}
                  </span>
                  <span className="pt-1 text-base leading-relaxed text-stone-200">{step}</span>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      {/* ACTIVE DISCIPLESHIP */}
      <section className="px-6 py-24 md:px-10 md:py-32">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <SectionHeading eyebrow="Active Discipleship" headline="Discipleship doesn't have to begin in a classroom.">
              <p>
                A shared mile or a shared trail opens space that a classroom rarely does: unhurried conversation,
                honest prayer, and room to practice obedience together, not just hear about it.
              </p>
            </SectionHeading>
          </Reveal>
          <Reveal delay={150}>
            <div className="mt-12 grid gap-5 sm:grid-cols-2">
              <a
                href="https://usamissionaries.org"
                className="group flex items-center justify-between gap-4 border p-6 transition-colors duration-300 hover:border-[rgba(232,135,63,0.6)]"
                style={{ background: t2.panel, borderColor: t2.panelBorder }}
              >
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: t2.accentSoft, fontFamily: font.rajdhani }}>
                    Trains, equips, and sends
                  </p>
                  <p className="mt-2 text-lg font-bold text-stone-100" style={{ fontFamily: font.oswald }}>USA Missionaries</p>
                </div>
                <Handshake aria-hidden="true" className="h-6 w-6 shrink-0" strokeWidth={1.6} style={{ color: t2.accentSoft }} />
              </a>
              <a
                href="https://kitchentablegospel.org"
                className="group flex items-center justify-between gap-4 border p-6 transition-colors duration-300 hover:border-[rgba(232,135,63,0.6)]"
                style={{ background: t2.panel, borderColor: t2.panelBorder }}
              >
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: t2.accentSoft, fontFamily: font.rajdhani }}>
                    Table-shaped discipleship
                  </p>
                  <p className="mt-2 text-lg font-bold text-stone-100" style={{ fontFamily: font.oswald }}>Kitchen Table Gospel</p>
                </div>
                <Church aria-hidden="true" className="h-6 w-6 shrink-0" strokeWidth={1.6} style={{ color: t2.accentSoft }} />
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* RACE WITH PURPOSE */}
      <section className="border-y px-6 py-20 md:px-10 md:py-28" style={{ background: t2.bgAlt, borderColor: t2.panelBorder }}>
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <SectionHeading align="left" eyebrow="Secondary Expression" headline="Race with purpose.">
              <p>
                Races and endurance challenges are not the movement&apos;s identity, but they can support it. A race
                or challenge can:
              </p>
            </SectionHeading>
          </Reveal>
          <Reveal delay={150}>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {raceExamples.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 border px-5 py-4 text-sm text-stone-300"
                  style={{ background: t2.panel, borderColor: t2.panelBorder }}
                >
                  <Sparkles aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.7} style={{ color: t2.accentSoft }} />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={260}>
            <p className="mt-8 text-sm leading-relaxed text-stone-500">
              No campaigns, donation totals, or missionary progress are shown here. This section is a concept
              placeholder for how races could point back to the mission.
            </p>
          </Reveal>
        </div>
      </section>

      {/* START OR JOIN */}
      <section id="start-or-join" className="px-6 py-24 md:px-10 md:py-32">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <SectionHeading eyebrow="Start or Join" headline="There is a place for you.">
              <p>Two simple ways in. Neither requires an athletic background.</p>
            </SectionHeading>
          </Reveal>
          <Reveal delay={150}>
            <div className="mt-14 grid gap-6 md:grid-cols-2">
              <InterestConceptCard
                body="Find people near you who move, pray, and pursue Jesus together. No pace requirement, no experience needed."
                ctaLabel="I'm interested in joining"
                kind="join"
                title="Join a Gathering"
              />
              <InterestConceptCard
                body="Gather a few people around a consistent rhythm of movement and prayer. We'll help you get it started."
                ctaLabel="I'm interested in starting"
                kind="start"
                title="Start a Gathering"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* FINAL CONNECTION */}
      <section className="border-t px-6 py-28 md:px-10 md:py-36" style={{ background: t2.bgAlt, borderColor: t2.panelBorder }}>
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <div className="mx-auto h-px w-12" style={{ background: t2.accentDeep }} />
          </Reveal>
          <Reveal delay={100}>
            <Eyebrow>Movement that leads to mission</Eyebrow>
          </Reveal>
          <Reveal delay={180}>
            <p className="mx-auto max-w-xl text-base leading-relaxed text-stone-400 md:text-lg">
              2THREE2 is powered by USA Missionaries, which trains, equips, and sends ordinary Christians to obey
              Jesus, make disciples, and serve people wherever they are.
            </p>
          </Reveal>
          <Reveal delay={280}>
            <h2 className="mt-10 text-4xl font-bold tracking-tight text-stone-100 md:text-6xl" style={{ fontFamily: font.oswald }}>
              You do not have to pursue Jesus alone.
            </h2>
          </Reveal>
          <Reveal delay={380}>
            <div className="mt-10 flex justify-center">
              <CTAButton href="#start-or-join">
                <Users aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
                Join the Movement
              </CTAButton>
            </div>
          </Reveal>
          <Reveal delay={460}>
            <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-600" style={{ fontFamily: font.rajdhani }}>
              2 Timothy 2:22
            </p>
          </Reveal>
        </div>
      </section>

      <footer className="px-6 py-10 md:px-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-stone-200" style={{ fontFamily: font.oswald }}>
              2THREE2
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-stone-500" style={{ fontFamily: font.rajdhani }}>
              Powered by{" "}
              <Link href="https://usamissionaries.org" className="underline decoration-dotted underline-offset-4 hover:text-stone-300">
                USA Missionaries
              </Link>
            </p>
          </div>
          <p className="max-w-sm text-[11px] leading-relaxed text-stone-600">
            Temporary wordmark and placeholder concept for founder review. No production routes, domains, or data
            were changed to build this preview.
          </p>
        </div>
      </footer>
    </main>
  );
}
