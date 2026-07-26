"use client";

import {
  BookOpen,
  Building2,
  GitBranch,
  HandHeart,
  HeartHandshake,
  HelpCircle,
  Home,
  MapPin,
  Repeat,
  Users,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  PublicFormGrid,
  PublicFormHeader,
  PublicFormMessage,
  PublicFormSection,
  PublicFormShell,
  PublicSelect,
  PublicSubmitButton,
  PublicTextarea,
  PublicTextInput,
} from "@/components/forms/PublicForm";
import { getString, submitPublicForm } from "@/components/forms/submitPublicForm";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

// Kitchen Table Gospel keeps the USAM brand family (Oswald / Rajdhani / Inter, dark
// canvas, uppercase tactical labels) and uses the founder-approved DOS blue as its
// accent. Distinctness from DOS comes from the warm cream/brown surfaces, table
// symbolism, and relational copy, not from a second bright brand color.
const ktg = {
  bg: "#160F0A",
  bgAlt: "#100A06",
  panel: "#1E140D",
  panelBorder: "rgba(230,196,180,0.14)",
  accent: "#378ADD",
  accentSoft: "#9CC7EF",
  accentDim: "rgba(55,138,221,0.5)",
  accentDeep: "#255F97",
  cream: "#F3E4CC",
};

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
      style={{ fontFamily: font.rajdhani, color: ktg.accentSoft }}
    >
      <span className="h-px w-8" style={{ background: ktg.accentDim }} />
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
  const className =
    variant === "primary"
      ? "inline-flex items-center justify-center gap-2 whitespace-nowrap px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-all duration-300 sm:px-7 sm:py-3.5 sm:text-sm sm:tracking-[0.18em]"
      : "inline-flex items-center justify-center gap-2 whitespace-nowrap border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-all duration-300 sm:px-7 sm:py-3.5 sm:text-sm sm:tracking-[0.18em]";
  const style: React.CSSProperties =
    variant === "primary"
      ? { fontFamily: font.rajdhani, background: ktg.accent, color: ktg.cream }
      : { fontFamily: font.rajdhani, borderColor: ktg.accentDim, color: ktg.cream };

  return { className, style };
}

function ctaHoverHandlers(variant: "primary" | "secondary") {
  return {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      if (variant === "secondary") e.currentTarget.style.background = "rgba(55,138,221,0.12)";
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      if (variant === "secondary") e.currentTarget.style.background = "transparent";
    },
  };
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
    <a href={href} onClick={onClick} className={className} style={style} {...ctaHoverHandlers(variant)}>
      {children}
    </a>
  );
}

const tableIntentOptions = ["Join a table", "Host a table", "Get trained", "Partner with the movement"] as const;

// Submits through the same public form pipeline every other USAM lead form uses
// (/api/form-submissions -> Supabase form_submissions -> the support team's admin
// inbox at /admin/support-team). formType stays "general" so this ships without a
// schema change; payload.source distinguishes Kitchen Table Gospel submissions.
function JoinTheTableModal({
  children,
  variant = "primary",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"error" | "idle" | "success">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  function openModal() {
    setStatus("idle");
    setErrorMessage("");
    setIsOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    // Honeypot: a field real visitors never see or fill. Bots that fill every field
    // trip it, so we quietly show success without sending anything to Supabase.
    if (getString(formData, "website")) {
      form.reset();
      setStatus("success");
      return;
    }

    setIsSubmitting(true);
    setStatus("idle");
    setErrorMessage("");

    const firstName = getString(formData, "first_name");
    const lastName = getString(formData, "last_name");
    const email = getString(formData, "email");
    const phone = getString(formData, "phone");
    const city = getString(formData, "city");
    const state = getString(formData, "state");
    const intent = getString(formData, "intent");
    const message = getString(formData, "message");
    const sourcePage = typeof window === "undefined"
      ? pathname || "/"
      : `${window.location.pathname}${window.location.search}`;

    try {
      await submitPublicForm({
        email,
        firstName,
        formType: "general",
        lastName,
        message,
        payload: {
          city,
          email,
          first_name: firstName,
          intent,
          last_name: lastName,
          message,
          phone,
          source: "kitchen_table_gospel",
          source_page: sourcePage,
          state,
        },
        phone,
        sourcePage,
      });

      form.reset();
      setStatus("success");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to submit this form.");
      setStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  const { className: triggerClassName, style: triggerStyle } = ctaVisuals(variant);

  const modal = isOpen && isMounted ? createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 px-4 py-6 backdrop-blur-sm sm:px-5 md:py-10"
      onMouseDown={() => setIsOpen(false)}
      role="presentation"
    >
      <div className="flex min-h-full items-start justify-center py-4 md:items-center md:py-8">
        <div
          aria-labelledby="join-the-table-title"
          aria-modal="true"
          className="relative w-full"
          onMouseDown={(event) => event.stopPropagation()}
          role="dialog"
        >
          <PublicFormShell size="standard">
            <button
              aria-label="Close join the table form"
              className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-white text-xl leading-none text-stone-700 shadow-sm transition-colors hover:border-[#378ADD] hover:text-stone-950"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              &times;
            </button>

            <div className="space-y-4">
              <PublicFormHeader
                description="Tell us a little about yourself and how you want to be part of Kitchen Table Gospel. A real person from our team will follow up, not an automated reply."
                eyebrow="Join the Table"
                title={<span id="join-the-table-title">Pull Up a Chair</span>}
              />

              {status === "success" ? (
                <PublicFormMessage>
                  Thank you. Someone from our team will reach out soon to help you take the next step.
                </PublicFormMessage>
              ) : (
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-0 w-0 overflow-hidden">
                    <label htmlFor="ktg-website">Leave this field blank</label>
                    <input autoComplete="off" id="ktg-website" name="website" tabIndex={-1} type="text" />
                  </div>

                  <PublicFormSection title="Contact Information">
                    <PublicFormGrid>
                      <PublicTextInput autoComplete="given-name" label="First name" name="first_name" required />
                      <PublicTextInput autoComplete="family-name" label="Last name" name="last_name" required />
                      <PublicTextInput autoComplete="email" label="Email" name="email" required type="email" />
                      <PublicTextInput autoComplete="tel" label="Phone" name="phone" type="tel" />
                    </PublicFormGrid>
                  </PublicFormSection>

                  <PublicFormSection title="Location">
                    <PublicFormGrid>
                      <PublicTextInput autoComplete="address-level2" label="City" name="city" />
                      <PublicTextInput autoComplete="address-level1" label="State" name="state" />
                    </PublicFormGrid>
                  </PublicFormSection>

                  <PublicFormSection title="How do you want to be involved?">
                    <PublicSelect defaultValue="" label="I want to" name="intent" required>
                      <option value="">Select one</option>
                      {tableIntentOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </PublicSelect>
                    <div className="mt-4">
                      <PublicTextarea label="Anything you want us to know? (optional)" name="message" rows={3} />
                    </div>
                  </PublicFormSection>

                  {status === "error" ? (
                    <PublicFormMessage tone="error">
                      {errorMessage || "Something went wrong. Please try again."}
                    </PublicFormMessage>
                  ) : null}

                  <PublicFormSection title="Submit">
                    <PublicSubmitButton disabled={isSubmitting}>
                      {isSubmitting ? "Submitting..." : "Submit"}
                    </PublicSubmitButton>
                  </PublicFormSection>
                </form>
              )}
            </div>
          </PublicFormShell>
        </div>
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <button
        className={triggerClassName}
        onClick={openModal}
        style={triggerStyle}
        type="button"
        {...ctaHoverHandlers(variant)}
      >
        {children}
      </button>
      {modal}
    </>
  );
}

// Single identity/return path to USA Missionaries (the subtitle link) and a single
// primary action (Join the Table). No section nav, no second USA Missionaries link,
// and no separate mobile menu: the same compact header works at every breakpoint.
function Header() {
  return (
    <header
      className="fixed inset-x-0 top-0 z-50 w-full border-b"
      style={{ background: "rgba(22,15,10,0.92)", borderColor: ktg.panelBorder, backdropFilter: "blur(12px)" }}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-4 md:px-10">
        <div className="flex flex-col leading-none">
          <a href="#top" className="text-base font-bold tracking-[0.05em] text-stone-100 sm:text-lg sm:tracking-[0.08em] md:text-xl" style={{ fontFamily: font.oswald }}>
            KITCHEN TABLE GOSPEL
          </a>
          <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.12em] sm:text-[10px] sm:tracking-[0.28em]" style={{ fontFamily: font.rajdhani, color: ktg.accentSoft }}>
            An initiative of{" "}
            <a href="https://usamissionaries.org" className="underline decoration-dotted underline-offset-4 hover:text-stone-100">
              USA Missionaries
            </a>
          </span>
        </div>

        <JoinTheTableModal>Join the Table</JoinTheTableModal>
      </div>
    </header>
  );
}

// One major metro per state, hand-calibrated against the exact pixel geometry of
// /usa-outline-clean.png (735x441 source, placed at x=20 y=10 w=920 h=512 with
// preserveAspectRatio="xMidYMid meet" inside this component's 960x560 viewBox, which
// scales the source by 512/441 and centers it horizontally). Verified visually against
// the source image so every marker lands on land inside the correct state, including
// the Alaska and Hawaii insets; none fall in open ocean or between states. Minnesota is
// intentionally excluded here since it already has its own origin marker below.
const futureNodes: Array<[number, number]> = [
  [180.9, 73.9], // Washington
  [186.7, 120.3], // Oregon
  [256.4, 300.2], // California
  [320.2, 248.0], // Nevada
  [291.2, 184.2], // Idaho
  [424.7, 91.3], // Montana
  [407.3, 190.0], // Wyoming
  [314.4, 213.2], // Utah
  [326.0, 311.9], // Arizona
  [389.9, 224.8], // Colorado
  [389.9, 306.1], // New Mexico
  [564.0, 68.1], // North Dakota
  [569.8, 143.5], // South Dakota
  [604.7, 201.6], // Nebraska
  [587.3, 259.6], // Kansas
  [575.7, 306.1], // Oklahoma
  [506.0, 393.1], // Texas
  [587.3, 190.0], // Iowa
  [633.7, 242.2], // Missouri
  [604.7, 306.1], // Arkansas
  [587.3, 379.2], // Louisiana
  [668.5, 143.5], // Wisconsin
  [645.3, 172.5], // Illinois
  [738.2, 184.2], // Michigan
  [651.1, 219.0], // Indiana
  [720.8, 213.2], // Ohio
  [668.5, 259.6], // Kentucky
  [680.1, 282.8], // Tennessee
  [616.3, 346.7], // Mississippi
  [651.1, 335.1], // Alabama
  [726.6, 311.9], // Georgia
  [755.6, 410.5], // Florida
  [790.4, 282.8], // South Carolina
  [784.6, 253.8], // North Carolina
  [831.1, 213.2], // Virginia
  [767.2, 224.8], // West Virginia
  [845.0, 181.8], // Pennsylvania
  [848.5, 155.1], // New York
  [852.0, 170.2], // New Jersey
  [813.7, 195.8], // Maryland
  [833.4, 193.4], // Delaware
  [833.4, 131.9], // Connecticut
  [856.6, 135.4], // Rhode Island
  [860.1, 123.8], // Massachusetts
  [807.9, 97.1], // Vermont
  [825.3, 114.5], // New Hampshire
  [854.3, 73.9], // Maine
  [197.2, 393.1], // Alaska
  [334.2, 432.6], // Hawaii
];

function NationTableMap({ variant = "vision" }: { variant?: "hero" | "vision" }) {
  const accent = ktg.accent;
  const showFuture = variant === "vision";
  // Minnesota, calibrated to where /usa-outline-clean.png actually lands inside this
  // 960x560 viewBox at the placement below (x=20 y=10 w=920 h=512). This is the one
  // real, active origin point. Everything else is explicitly a future goal, not a
  // current location, and is only drawn in the "vision" variant.
  const origin: [number, number] = [547, 120];
  const spokes = futureNodes;

  return (
    <svg viewBox="0 0 960 560" className="h-auto w-full overflow-visible" aria-hidden="true">
      <defs>
        <radialGradient id="ktgGlow" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor={accent} stopOpacity={0.24} />
          <stop offset="55%" stopColor={accent} stopOpacity={0.06} />
          <stop offset="100%" stopColor={accent} stopOpacity={0} />
        </radialGradient>
        <filter id="ktgTint">
          <feFlood floodColor={accent} result="fill" />
          <feComposite in="fill" in2="SourceAlpha" operator="in" result="tinted" />
          <feComponentTransfer in="tinted">
            <feFuncA type="linear" slope="0.62" />
          </feComponentTransfer>
        </filter>
      </defs>

      <ellipse cx={origin[0]} cy={origin[1]} rx={showFuture ? 260 : 150} ry={showFuture ? 170 : 100} fill="url(#ktgGlow)">
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

      {showFuture ? spokes.map(([x, y], i) => (
        <line
          key={`spoke-${i}`}
          x1={origin[0]}
          y1={origin[1]}
          x2={x}
          y2={y}
          stroke={accent}
          strokeWidth={0.5}
          strokeOpacity={0.16}
          strokeDasharray="3,7"
        >
          <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="3.2s" repeatCount="indefinite" />
        </line>
      )) : null}

      {showFuture ? futureNodes.map(([x, y], i) => (
        <g key={`node-${i}`}>
          <circle cx={x} cy={y} r={2.2} fill={accent} opacity={0.55} />
          <circle cx={x} cy={y} r={6} fill="none" stroke={accent} strokeWidth={0.5} opacity={0.3} />
        </g>
      )) : null}

      {/* Minnesota: the one real, active origin point, not a future node */}
      <circle cx={origin[0]} cy={origin[1]} r={18} fill="none" stroke={accent} strokeWidth={1} opacity={0.45}>
        <animate attributeName="r" values="14;22;14" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.55;0.05;0.55" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx={origin[0]} cy={origin[1]} r={9} fill={ktg.bg} stroke={accent} strokeWidth={1.8} />
      <circle cx={origin[0]} cy={origin[1]} r={3.5} fill={accent} />

      <line x1={origin[0] + 7} y1={origin[1] - 7} x2={origin[0] + 32} y2={origin[1] - 28} stroke={accent} strokeWidth={1} strokeOpacity={0.65} />
      <text
        x={origin[0] + 38}
        y={origin[1] - 24}
        fill={ktg.cream}
        fontSize={16}
        letterSpacing="0.08em"
        style={{ fontFamily: font.oswald, fontWeight: 700 }}
      >
        MINNESOTA
      </text>
      <text
        x={origin[0] + 38}
        y={origin[1] - 6}
        fill={ktg.accentSoft}
        fontSize={11}
        letterSpacing="0.02em"
        style={{ fontFamily: font.rajdhani, fontWeight: 600 }}
      >
        Where the first tables launched
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
          style={{ borderColor: ktg.accentDim, color: ktg.accentSoft }}
        >
          <Icon className="h-5 w-5" aria-hidden="true" strokeWidth={1.6} />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ fontFamily: font.rajdhani, color: ktg.accentSoft }}>
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

const places = ["Homes", "Groups", "Churches", "Workplaces", "Everyday Relationships"] as const;

const modelSteps = [
  {
    n: "01",
    icon: Users,
    title: "GATHER",
    body: "Around a real table, in a real home. No stage, no platform, just chairs pulled close.",
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
    icon: HeartHandshake,
    title: "ENCOURAGE",
    body: "Care doesn't end when the table does. Follow up, show up, and carry each other's week.",
  },
  {
    n: "05",
    icon: GitBranch,
    title: "MULTIPLY",
    body: "Train someone at your table to gather one of their own. Repeat, city by city.",
  },
] as const;

const problemPoints = [
  {
    icon: HelpCircle,
    title: "A Trusted Place to Ask",
    body: "Many believers have never had a safe place to ask honest questions about following Jesus.",
  },
  {
    icon: Repeat,
    title: "Practice, Not Just Theory",
    body: "Hearing a sermon is not the same as learning to put Jesus's teaching into practice with someone else.",
  },
  {
    icon: BookOpen,
    title: "Scripture, Prayer, Obedience",
    body: "Real discipleship grows through Scripture, prayer, obedience, relationships, and faithful follow-through.",
  },
  {
    icon: Users,
    title: "Discerned, Not Prescribed",
    body: "Every table discerns what each person actually needs, not a public checklist.",
  },
] as const;

function ProblemPoint({
  icon: Icon,
  title,
  body,
  delay,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  delay: number;
}) {
  return (
    <Reveal delay={delay}>
      <div className="h-full border p-6" style={{ background: ktg.panel, borderColor: ktg.panelBorder }}>
        <div
          className="mb-4 inline-flex h-10 w-10 items-center justify-center border"
          style={{ borderColor: ktg.accentDim, color: ktg.accentSoft }}
        >
          <Icon className="h-5 w-5" aria-hidden="true" strokeWidth={1.6} />
        </div>
        <h3 className="text-base font-bold text-stone-100" style={{ fontFamily: font.oswald }}>
          {title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-stone-400">{body}</p>
      </div>
    </Reveal>
  );
}

function VisionStat({ icon: Icon, value, label }: { icon: LucideIcon; value: string; label: string }) {
  return (
    <div className="border p-8 text-center" style={{ background: ktg.panel, borderColor: ktg.panelBorder }}>
      <Icon className="mx-auto h-6 w-6" aria-hidden="true" strokeWidth={1.6} style={{ color: ktg.accentSoft }} />
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
        <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(ellipse at 30% 30%, rgba(55,138,221,0.1) 0%, transparent 55%)` }} />
        <div className="pointer-events-none absolute inset-0" style={{ background: `linear-gradient(180deg, ${ktg.bgAlt} 0%, ${ktg.bg} 45%, ${ktg.bgAlt} 100%)` }} />

        <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-16 px-6 py-16 md:grid-cols-2 md:items-center md:px-10">
          <div>
            <Reveal>
              <Eyebrow>An initiative of USA Missionaries</Eyebrow>
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
                Table Gospel exists to help believers do what he did: learn, obey, and teach the commands of Jesus
                around a real table, with real people.
              </p>
            </Reveal>
            <Reveal delay={340}>
              <p
                className="mt-8 text-[11px] font-semibold uppercase leading-loose tracking-[0.22em] text-stone-500"
                style={{ fontFamily: font.rajdhani }}
              >
                &ldquo;Go and make disciples&hellip; teaching them to obey everything I have commanded you.&rdquo;
                <br />
                <span style={{ color: ktg.accentSoft }}>MATTHEW 28:19&ndash;20</span>
              </p>
            </Reveal>
            <Reveal delay={440}>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <CTAButton href="#pattern">See the Pattern of Jesus</CTAButton>
                <JoinTheTableModal variant="secondary">Join the Table</JoinTheTableModal>
              </div>
            </Reveal>
          </div>

          <Reveal delay={300}>
            <div className="relative mx-auto max-w-md md:max-w-none">
              <NationTableMap variant="hero" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* THE PATTERN OF JESUS */}
      <section id="pattern" className="px-6 py-24 md:px-10 md:py-32">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionHeading eyebrow="From Table to Nations" headline="We Are Not Reinventing Discipleship.">
              <p>We are returning to the way Jesus practiced it, again and again, around ordinary tables and in ordinary homes.</p>
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
            <SectionHeading eyebrow="Matthew 28:19–20" headline="Teach Them to Obey: Not Just Go, Not Just Baptize.">
              <p>
                The Great Commission does not end at the water. It continues as disciples learn to follow Jesus and
                teach others to obey everything he commanded, and that takes a place to practice, not just a place to
                listen.
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
                    style={{ fontFamily: font.oswald, color: step.accent ? ktg.accentSoft : "#f5f5f4" }}
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
                Most believers have heard hundreds of sermons about following Jesus, but few have ever had someone
                walk with them while they actually tried to obey one. Kitchen Table Gospel exists to close that gap.
              </p>
            </SectionHeading>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {problemPoints.map((point, i) => (
              <ProblemPoint key={point.title} body={point.body} delay={i * 120} icon={point.icon} title={point.title} />
            ))}
          </div>
        </div>
      </section>

      {/* THE MODEL */}
      <section id="model" className="border-y px-6 py-24 md:px-10 md:py-32" style={{ borderColor: ktg.panelBorder, background: ktg.bgAlt }}>
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionHeading eyebrow="The Model" headline="Gather. Learn. Confess. Encourage. Multiply.">
              <p>Simple enough for a kitchen table. Reproducible enough for a nation.</p>
            </SectionHeading>
          </Reveal>

          <div className="mt-14 grid gap-px sm:grid-cols-2 lg:grid-cols-5" style={{ background: ktg.panelBorder }}>
            {modelSteps.map((step, i) => (
              <Reveal key={step.n} delay={i * 130}>
                <div className="h-full p-7" style={{ background: ktg.bg }}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold tracking-[0.2em]" style={{ fontFamily: font.rajdhani, color: ktg.accentSoft }}>
                      {step.n}
                    </span>
                    <step.icon className="h-4 w-4" aria-hidden="true" strokeWidth={1.7} style={{ color: ktg.accentSoft }} />
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
                Not one organization running every table. Thousands of believers trained, equipped, and sent to host
                tables of their own, in every state and in the major cities within them.
              </p>
            </SectionHeading>
          </Reveal>

          <Reveal delay={150}>
            <div className="mt-14 mx-auto max-w-3xl">
              <NationTableMap variant="vision" />
              <p className="mt-6 text-center text-xs leading-relaxed text-stone-500" style={{ fontFamily: font.rajdhani }}>
                Minnesota is where this began, and where tables are active today. Every other point marks where we
                are asking God to send trained believers next, not a place we are already working.
              </p>
            </div>
          </Reveal>

          <Reveal delay={250}>
            <div className="mt-14 grid gap-5 sm:grid-cols-3">
              <VisionStat icon={MapPin} value="50" label="States in the Vision" />
              <VisionStat icon={Building2} value="3+" label="Major Cities per State" />
              <VisionStat icon={Users} value="Thousands" label="Believers Equipped to Make Disciples" />
            </div>
          </Reveal>

          <Reveal delay={350}>
            <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-relaxed text-stone-500">
              This is the goal we are building toward. Believers leading reproducible, table-based discipleship
              where they already live, work, and eat.
            </p>
          </Reveal>
        </div>
      </section>

      {/* REAL TABLES */}
      <section className="border-y px-6 py-24 md:px-10 md:py-32" style={{ borderColor: ktg.panelBorder, background: ktg.bgAlt }}>
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <SectionHeading eyebrow="Not a Stage" headline="These Are Real Tables.">
              <p>Real relationships. Real homes. A life of following Jesus worked out together.</p>
            </SectionHeading>
          </Reveal>

          <Reveal delay={100}>
            <p
              className="mt-8 text-center text-xs font-semibold uppercase tracking-[0.22em] text-stone-500"
              style={{ fontFamily: font.rajdhani }}
            >
              {places.join(" · ")}
            </p>
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
            <div className="mx-auto h-px w-12" style={{ background: ktg.accentDim }} />
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
            <div className="mt-10 flex justify-center">
              <JoinTheTableModal>
                <HeartHandshake className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
                Join the Table
              </JoinTheTableModal>
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
              An initiative of{" "}
              <Link href="https://usamissionaries.org" className="underline decoration-dotted underline-offset-4 hover:text-stone-300">
                USA Missionaries
              </Link>
            </p>
          </div>
          <JoinTheTableModal variant="secondary">Join the Table</JoinTheTableModal>
        </div>
      </footer>
    </main>
  );
}
