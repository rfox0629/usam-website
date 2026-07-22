"use client";

import {
  BookOpen,
  Building2,
  Church,
  Droplet,
  FileText,
  Gift,
  GitBranch,
  HandHeart,
  HeartHandshake,
  Home,
  Mail,
  MapPin,
  Megaphone,
  Menu,
  Moon,
  Sparkles,
  Users,
  Utensils,
  X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

// Kitchen Table Gospel keeps the USAM brand family (Oswald / Rajdhani / Inter, dark
// canvas, uppercase tactical labels) but shifts the accent from cool USAM gold to a
// warmer amber/terracotta so the table — not a command post — is the visual anchor.
const ktg = {
  bg: "#160F0A",
  bgAlt: "#100A06",
  panel: "#1E140D",
  panelBorder: "rgba(232,196,140,0.14)",
  amber: "#D9924A",
  amberSoft: "#E8B074",
  amberDim: "rgba(217,146,74,0.5)",
  rust: "#B85A2E",
  cream: "#F3E4CC",
};

const contactEmail = "ryan@usamissionaries.org";

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
      style={{ fontFamily: font.rajdhani, color: ktg.amberSoft }}
    >
      <span className="h-px w-8" style={{ background: ktg.amberDim }} />
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
  const className =
    variant === "primary"
      ? "inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-semibold uppercase tracking-[0.18em] transition-all duration-300"
      : "inline-flex items-center justify-center gap-2 border px-7 py-3.5 text-sm font-semibold uppercase tracking-[0.18em] transition-all duration-300";
  const style: React.CSSProperties =
    variant === "primary"
      ? { fontFamily: font.rajdhani, background: ktg.amber, color: "#180F08" }
      : { fontFamily: font.rajdhani, borderColor: ktg.amberDim, color: ktg.cream };

  return (
    <a
      href={href}
      onClick={onClick}
      className={className}
      style={style}
      onMouseEnter={(e) => {
        if (variant === "secondary") e.currentTarget.style.background = "rgba(217,146,74,0.1)";
      }}
      onMouseLeave={(e) => {
        if (variant === "secondary") e.currentTarget.style.background = "transparent";
      }}
    >
      {children}
    </a>
  );
}

const navItems = [
  { href: "#pattern", label: "The Pattern" },
  { href: "#commission", label: "The Commission" },
  { href: "#model", label: "The Model" },
  { href: "#vision", label: "The Vision" },
  { href: "#join", label: "Join" },
] as const;

function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 w-full border-b"
      style={{ background: "rgba(22,15,10,0.92)", borderColor: ktg.panelBorder, backdropFilter: "blur(12px)" }}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 md:px-10">
        <a href="#top" className="flex flex-col leading-none">
          <span className="text-lg font-bold tracking-[0.08em] text-stone-100 md:text-xl" style={{ fontFamily: font.oswald }}>
            KITCHEN TABLE GOSPEL
          </span>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.28em]" style={{ fontFamily: font.rajdhani, color: ktg.amberSoft }}>
            A USA Missionaries Ministry
          </span>
        </a>

        <nav className="ml-auto hidden md:flex" aria-label="Primary navigation">
          <ul className="flex items-center gap-8 lg:gap-10">
            {navItems.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-400 transition-colors duration-200 hover:text-stone-100"
                  style={{ fontFamily: font.rajdhani }}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden md:block">
          <CTAButton href="#join">Host a Table</CTAButton>
        </div>

        <button
          type="button"
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center border text-stone-200 md:hidden"
          style={{ borderColor: ktg.panelBorder }}
        >
          {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>

      {open ? (
        <nav className="border-t md:hidden" style={{ borderColor: ktg.panelBorder }} aria-label="Mobile navigation">
          <div className="mx-auto flex w-full max-w-7xl flex-col px-6 py-3">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex min-h-[48px] items-center border-b py-3 text-[15px] uppercase tracking-[0.1em] text-stone-200"
                style={{ borderColor: ktg.panelBorder, fontFamily: font.rajdhani, fontWeight: 600 }}
              >
                {item.label}
              </a>
            ))}
            <div className="py-4">
              <CTAButton href="#join" onClick={() => setOpen(false)}>
                Host a Table
              </CTAButton>
            </div>
          </div>
        </nav>
      ) : null}
    </header>
  );
}

function NationTableMap() {
  const gold = ktg.amber;
  // Illustrative points spread across a 0-960 x 0-560 viewBox behind the USA outline.
  // Not a literal atlas — a visual cue that one table's pattern is meant to repeat everywhere.
  const nodes: Array<[number, number]> = [
    [210, 140], [150, 230], [230, 340], [300, 420], [360, 200], [420, 300],
    [470, 150], [520, 260], [560, 380], [610, 190], [650, 300], [700, 240],
    [740, 340], [780, 170], [560, 130], [330, 260], [480, 420], [640, 400],
    [260, 180], [400, 120],
  ];
  const origin: [number, number] = [430, 250];
  const spokes = nodes.slice(0, 8);

  return (
    <svg viewBox="0 0 960 560" className="h-auto w-full overflow-visible" aria-hidden="true">
      <defs>
        <radialGradient id="ktgGlow" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor={gold} stopOpacity={0.24} />
          <stop offset="55%" stopColor={gold} stopOpacity={0.06} />
          <stop offset="100%" stopColor={gold} stopOpacity={0} />
        </radialGradient>
        <filter id="ktgTint">
          <feFlood floodColor={gold} result="fill" />
          <feComposite in="fill" in2="SourceAlpha" operator="in" result="tinted" />
          <feComponentTransfer in="tinted">
            <feFuncA type="linear" slope="0.62" />
          </feComponentTransfer>
        </filter>
      </defs>

      <ellipse cx={origin[0]} cy={origin[1]} rx={260} ry={170} fill="url(#ktgGlow)">
        <animate attributeName="opacity" values="0.6;1;0.6" dur="6s" repeatCount="indefinite" />
      </ellipse>

      <image
        href="/usa-outline-clean.png"
        x={20}
        y={10}
        width={920}
        height={512}
        preserveAspectRatio="xMidYMid meet"
        opacity={0.66}
        filter="url(#ktgTint)"
      />

      {spokes.map(([x, y], i) => (
        <line
          key={`spoke-${i}`}
          x1={origin[0]}
          y1={origin[1]}
          x2={x}
          y2={y}
          stroke={gold}
          strokeWidth={0.6}
          strokeOpacity={0.28}
          strokeDasharray="3,7"
        >
          <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="3.2s" repeatCount="indefinite" />
        </line>
      ))}

      {nodes.map(([x, y], i) => (
        <g key={`node-${i}`}>
          <circle cx={x} cy={y} r={2.4} fill={gold} opacity={0.75}>
            <animate attributeName="opacity" values="0.35;0.9;0.35" dur={`${2.4 + i * 0.25}s`} repeatCount="indefinite" />
          </circle>
          <circle cx={x} cy={y} r={7} fill="none" stroke={gold} strokeWidth={0.4} opacity={0.32}>
            <animate attributeName="r" values="5;14;5" dur={`${3 + i * 0.3}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3;0;0.3" dur={`${3 + i * 0.3}s`} repeatCount="indefinite" />
          </circle>
        </g>
      ))}

      <circle cx={origin[0]} cy={origin[1]} r={13} fill={ktg.bg} stroke={gold} strokeWidth={1.4} />
      <circle cx={origin[0]} cy={origin[1]} r={4} fill={gold} />
      <text
        x={origin[0]}
        y={origin[1] + 42}
        textAnchor="middle"
        fill={ktg.cream}
        fontSize={13}
        letterSpacing="0.28em"
        style={{ fontFamily: font.rajdhani, fontWeight: 600 }}
      >
        IT STARTS HERE
      </text>
    </svg>
  );
}

function PatternCard({
  icon: Icon,
  reference,
  name,
  description,
  delay,
}: {
  icon: LucideIcon;
  reference: string;
  name: string;
  description: string;
  delay: number;
}) {
  return (
    <Reveal delay={delay}>
      <div className="h-full border p-7" style={{ background: ktg.panel, borderColor: ktg.panelBorder }}>
        <div
          className="mb-5 inline-flex h-11 w-11 items-center justify-center border"
          style={{ borderColor: ktg.amberDim, color: ktg.amberSoft }}
        >
          <Icon className="h-5 w-5" aria-hidden="true" strokeWidth={1.6} />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ fontFamily: font.rajdhani, color: ktg.amberSoft }}>
          {reference}
        </p>
        <h3 className="mt-2 text-xl font-bold text-stone-100" style={{ fontFamily: font.oswald }}>
          {name}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-stone-400">{description}</p>
      </div>
    </Reveal>
  );
}

const commands = [
  { icon: Droplet, label: "Baptism" },
  { icon: HandHeart, label: "Prayer & Fasting" },
  { icon: BookOpen, label: "Daily Bible Reading" },
  { icon: Megaphone, label: "Evangelism" },
  { icon: Users, label: "Discipleship" },
  { icon: Gift, label: "Biblical Giving" },
  { icon: Moon, label: "Sabbath" },
  { icon: Sparkles, label: "Spiritual Gifts" },
  { icon: Church, label: "Attending Church" },
] as const;

function CommandPill({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div
      className="flex items-center gap-3 border px-4 py-3"
      style={{ background: ktg.panel, borderColor: ktg.panelBorder }}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" strokeWidth={1.7} style={{ color: ktg.amberSoft }} />
      <span className="text-sm font-semibold text-stone-200">{label}</span>
    </div>
  );
}

const modelSteps = [
  {
    n: "01",
    icon: Users,
    title: "GATHER",
    body: "Around a real table, in a real home. No stage, no platform — just chairs pulled close.",
  },
  {
    n: "02",
    icon: BookOpen,
    title: "LEARN & OBEY",
    body: "Study one command of Jesus, then practice it before the group meets again.",
  },
  {
    n: "03",
    icon: HandHeart,
    title: "PRAY & CONFESS",
    body: "Bring your wins and your failures into the light with people who actually know you.",
  },
  {
    n: "04",
    icon: GitBranch,
    title: "MULTIPLY",
    body: "Train someone at your table to gather one of their own. Repeat, city by city.",
  },
] as const;

function VisionStat({ icon: Icon, value, label }: { icon: LucideIcon; value: string; label: string }) {
  return (
    <div className="border p-8 text-center" style={{ background: ktg.panel, borderColor: ktg.panelBorder }}>
      <Icon className="mx-auto h-6 w-6" aria-hidden="true" strokeWidth={1.6} style={{ color: ktg.amberSoft }} />
      <p className="mt-4 text-4xl font-bold text-stone-100 md:text-5xl" style={{ fontFamily: font.oswald }}>
        {value}
      </p>
      <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500" style={{ fontFamily: font.rajdhani }}>
        {label}
      </p>
    </div>
  );
}

export function KitchenTableGospelPage() {
  return (
    <main id="top" className="min-h-screen" style={{ background: ktg.bg, color: ktg.cream }}>
      <Header />

      {/* HERO */}
      <section className="relative flex min-h-screen items-center overflow-hidden pt-28">
        <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(ellipse at 30% 30%, rgba(217,146,74,0.08) 0%, transparent 55%)` }} />
        <div className="pointer-events-none absolute inset-0" style={{ background: `linear-gradient(180deg, ${ktg.bgAlt} 0%, ${ktg.bg} 45%, ${ktg.bgAlt} 100%)` }} />

        <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-16 px-6 py-16 md:grid-cols-2 md:items-center md:px-10">
          <div>
            <Reveal>
              <Eyebrow>A USA Missionaries Ministry</Eyebrow>
            </Reveal>
            <Reveal delay={100}>
              <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-stone-100 sm:text-5xl md:text-6xl" style={{ fontFamily: font.oswald }}>
                Discipleship Doesn&apos;t Start on a Stage.
                <br />
                It Starts at a Table.
              </h1>
            </Reveal>
            <Reveal delay={220}>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-stone-400 md:text-lg">
                Jesus turned kitchens and dining rooms into classrooms, confession booths, and launching pads. Kitchen
                Table Gospel exists to help ordinary believers do what he did — learn, obey, and teach the commands of
                Jesus around a real table, with real people.
              </p>
            </Reveal>
            <Reveal delay={340}>
              <p
                className="mt-8 text-[11px] font-semibold uppercase leading-loose tracking-[0.22em] text-stone-500"
                style={{ fontFamily: font.rajdhani }}
              >
                &ldquo;Go and make disciples&hellip; teaching them to obey everything I have commanded you.&rdquo;
                <br />
                <span style={{ color: ktg.amberSoft }}>MATTHEW 28:19&ndash;20</span>
              </p>
            </Reveal>
            <Reveal delay={440}>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <CTAButton href="#pattern">See the Pattern of Jesus</CTAButton>
                <CTAButton variant="secondary" href="#join">
                  Host a Table
                </CTAButton>
              </div>
            </Reveal>
          </div>

          <Reveal delay={300}>
            <div className="relative mx-auto max-w-md md:max-w-none">
              <NationTableMap />
            </div>
          </Reveal>
        </div>
      </section>

      {/* THE PATTERN OF JESUS */}
      <section id="pattern" className="px-6 py-24 md:px-10 md:py-32">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionHeading eyebrow="From Table to Nations" headline="We Are Not Reinventing Discipleship.">
              <p>We are returning to the way Jesus practiced it — again and again, around ordinary tables and in ordinary homes.</p>
            </SectionHeading>
          </Reveal>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            <PatternCard
              icon={Home}
              reference="Luke 19"
              name="Zacchaeus"
              description="Jesus invited himself into a tax collector's home. Met at his table, Zacchaeus was led to genuine transformation."
              delay={0}
            />
            <PatternCard
              icon={Utensils}
              reference="Matthew 9"
              name="Matthew the Tax Collector"
              description="Jesus shared a meal with Matthew and his friends. A shared table sparked a lifelong calling."
              delay={120}
            />
            <PatternCard
              icon={BookOpen}
              reference="Luke 10"
              name="Mary & Martha"
              description="Jesus taught in their home and honored a sister's devotion to sit, listen, and learn at his feet."
              delay={240}
            />
          </div>
        </div>
      </section>

      {/* THE GREAT COMMISSION */}
      <section id="commission" className="border-y px-6 py-24 md:px-10 md:py-32" style={{ borderColor: ktg.panelBorder, background: ktg.bgAlt }}>
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <SectionHeading eyebrow="Matthew 28:19–20" headline="Teach Them to Obey — Not Just Go, Not Just Baptize.">
              <p>
                The Great Commission does not end at the water. It ends when ordinary believers can actually teach one
                another to obey what Jesus commanded — and that requires a place to practice, not just a place to listen.
              </p>
            </SectionHeading>
          </Reveal>

          <Reveal delay={150}>
            <div className="mt-14 grid grid-cols-2 gap-px md:grid-cols-4" style={{ background: ktg.panelBorder }}>
              {[
                { label: "Go", accent: false },
                { label: "Make Disciples", accent: false },
                { label: "Baptize Them", accent: false },
                { label: "Teach Them to Obey", accent: true },
              ].map((step) => (
                <div key={step.label} className="p-6 text-center md:p-8" style={{ background: ktg.bg }}>
                  <p
                    className="text-lg font-bold uppercase tracking-tight md:text-xl"
                    style={{ fontFamily: font.oswald, color: step.accent ? ktg.amberSoft : "#f5f5f4" }}
                  >
                    {step.label}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={280}>
            <p className="mx-auto mt-12 max-w-2xl text-center text-lg font-medium leading-relaxed text-stone-300">
              How can we teach the commands of Jesus if we have never learned them, never practiced them, and have no
              place to work them out with other people?
            </p>
          </Reveal>
        </div>
      </section>

      {/* THE PROBLEM */}
      <section className="px-6 py-24 md:px-10 md:py-32">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <SectionHeading eyebrow="The Problem" headline="You Can't Teach What You've Never Practiced.">
              <p>
                Most believers have heard hundreds of sermons about the commands of Jesus — and never sat in a room
                where someone helped them actually obey one. Kitchen Table Gospel exists to close that gap.
              </p>
            </SectionHeading>
          </Reveal>

          <Reveal delay={150}>
            <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {commands.map((command) => (
                <CommandPill key={command.label} icon={command.icon} label={command.label} />
              ))}
            </div>
          </Reveal>

          <Reveal delay={280}>
            <p className="mt-10 text-center text-sm font-semibold uppercase tracking-[0.2em] text-stone-500" style={{ fontFamily: font.rajdhani }}>
              These are the commands of Jesus. A table is where you learn to keep them — and teach them.
            </p>
          </Reveal>
        </div>
      </section>

      {/* THE MODEL */}
      <section id="model" className="border-y px-6 py-24 md:px-10 md:py-32" style={{ borderColor: ktg.panelBorder, background: ktg.bgAlt }}>
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionHeading eyebrow="The Model" headline="Gather. Learn. Confess. Multiply.">
              <p>Simple enough for a kitchen table. Reproducible enough for a nation.</p>
            </SectionHeading>
          </Reveal>

          <div className="mt-14 grid gap-px sm:grid-cols-2 lg:grid-cols-4" style={{ background: ktg.panelBorder }}>
            {modelSteps.map((step, i) => (
              <Reveal key={step.n} delay={i * 130}>
                <div className="h-full p-7" style={{ background: ktg.bg }}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold tracking-[0.2em]" style={{ fontFamily: font.rajdhani, color: ktg.amberSoft }}>
                      {step.n}
                    </span>
                    <step.icon className="h-4 w-4" aria-hidden="true" strokeWidth={1.7} style={{ color: ktg.amberSoft }} />
                  </div>
                  <h3 className="mt-4 text-xl font-bold tracking-wide text-stone-100" style={{ fontFamily: font.oswald }}>
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-stone-400">{step.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* THE NATIONAL VISION */}
      <section id="vision" className="px-6 py-24 md:px-10 md:py-32">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionHeading eyebrow="The Vision" headline="Thousands of Tables. Every State.">
              <p>
                Not one organization running every table — thousands of ordinary believers trained, equipped, and
                sent to host tables of their own, in every state and in the major cities within them.
              </p>
            </SectionHeading>
          </Reveal>

          <Reveal delay={150}>
            <div className="mt-14 mx-auto max-w-3xl">
              <NationTableMap />
            </div>
          </Reveal>

          <Reveal delay={250}>
            <div className="mt-14 grid gap-5 sm:grid-cols-3">
              <VisionStat icon={MapPin} value="50" label="States Reached" />
              <VisionStat icon={Building2} value="3+" label="Major Cities per State" />
              <VisionStat icon={Users} value="1,000s" label="Believers Trained & Sent" />
            </div>
          </Reveal>

          <Reveal delay={350}>
            <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-relaxed text-stone-500">
              This is the goal we are building toward — ordinary Christians leading reproducible, table-based
              discipleship where they already live, work, and eat.
            </p>
          </Reveal>
        </div>
      </section>

      {/* REAL TABLES */}
      <section className="border-y px-6 py-24 md:px-10 md:py-32" style={{ borderColor: ktg.panelBorder, background: ktg.bgAlt }}>
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <SectionHeading eyebrow="Not a Stage" headline="These Are Real Tables.">
              <p>Not stock photos. Just ordinary believers, ordinary homes, and the gospel worked out together.</p>
            </SectionHeading>
          </Reveal>

          <Reveal delay={180}>
            <div className="mt-14 grid gap-5 sm:grid-cols-2">
              <div className="relative aspect-[4/3] overflow-hidden border" style={{ borderColor: ktg.panelBorder }}>
                <Image
                  alt="A team gathered around a wooden kitchen table with a Kitchen Table Gospel binder open"
                  className="object-cover"
                  fill
                  sizes="(min-width: 640px) 50vw, 100vw"
                  src="/images/vision/kitchen-table-01.jpg"
                />
              </div>
              <div className="relative aspect-[4/3] overflow-hidden border" style={{ borderColor: ktg.panelBorder }}>
                <Image
                  alt="Friends gathered around a home dining table with coffee and cookies during a Kitchen Table Gospel conversation"
                  className="object-cover"
                  fill
                  sizes="(min-width: 640px) 50vw, 100vw"
                  src="/images/vision/kitchen-table-02.jpg"
                />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FINAL CTA */}
      <section id="join" className="px-6 py-28 md:px-10 md:py-36">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <div className="mx-auto h-px w-12" style={{ background: ktg.amberDim }} />
          </Reveal>
          <Reveal delay={100}>
            <h2 className="mt-10 text-4xl font-bold tracking-tight text-stone-100 md:text-6xl" style={{ fontFamily: font.oswald }}>
              PULL UP A CHAIR.
            </h2>
          </Reveal>
          <Reveal delay={220}>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-stone-400 md:text-lg">
              Join a table, host one in your home, get trained to lead one, or partner with this work. There is a
              seat for you.
            </p>
          </Reveal>
          <Reveal delay={340}>
            <div className="mt-10 flex flex-col flex-wrap items-center justify-center gap-4 sm:flex-row">
              <CTAButton href={`mailto:${contactEmail}?subject=I%20want%20to%20start%20a%20Kitchen%20Table`}>
                <HeartHandshake className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
                Host or Join a Table
              </CTAButton>
              <CTAButton variant="secondary" href="/guides/kitchen-table-gospel.pdf">
                <FileText className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
                Download the Guide
              </CTAButton>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="border-t px-6 py-10 md:px-10" style={{ borderColor: ktg.panelBorder, background: ktg.bgAlt }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-stone-200" style={{ fontFamily: font.oswald }}>
              Kitchen Table Gospel
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-stone-500" style={{ fontFamily: font.rajdhani }}>
              A ministry of{" "}
              <Link href="https://usamissionaries.org" className="underline decoration-dotted underline-offset-4 hover:text-stone-300">
                USA Missionaries
              </Link>
            </p>
          </div>
          <a
            href={`mailto:${contactEmail}`}
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-stone-400 hover:text-stone-200"
            style={{ fontFamily: font.rajdhani }}
          >
            <Mail className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.8} />
            {contactEmail}
          </a>
        </div>
      </footer>
    </main>
  );
}
