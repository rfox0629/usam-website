"use client";

import React, { useEffect, useRef, useState } from "react";
import { font, t2 } from "./theme";

export type Tone = "dark" | "light";

/**
 * Scroll-reveal wrapper, matching the pattern already used by the other
 * domain-site mockups in this repo. Respects prefers-reduced-motion by showing
 * content immediately instead of animating it in.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-[900ms] ease-out ${className ?? ""}`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(26px)",
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export function Eyebrow({ children, tone = "dark" }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <p
      className="mb-4 inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.3em]"
      style={{ color: tone === "dark" ? t2.goldSoft : t2.goldDeep, fontFamily: font.ui }}
    >
      <span className="h-px w-8" style={{ background: tone === "dark" ? t2.goldDeep : t2.gold }} />
      {children}
    </p>
  );
}

export function SectionHeading({
  eyebrow,
  headline,
  children,
  align = "center",
  tone = "dark",
}: {
  eyebrow?: string;
  headline: React.ReactNode;
  children?: React.ReactNode;
  align?: "center" | "left";
  tone?: Tone;
}) {
  return (
    <div className={`max-w-3xl ${align === "center" ? "mx-auto text-center" : "text-left"}`}>
      {eyebrow ? <Eyebrow tone={tone}>{eyebrow}</Eyebrow> : null}
      <h2
        className="text-[2rem] font-bold leading-[1.06] tracking-tight sm:text-4xl md:text-5xl"
        style={{ color: tone === "dark" ? "#FFFFFF" : t2.onLight, fontFamily: font.display }}
      >
        {headline}
      </h2>
      {/* The body copy is rendered as the <p> itself rather than wrapped in a
          styled div: app/globals.css sets `:where(p, li, dd) { color: #d1d5db }`,
          and because that targets the element directly it beats an inherited
          colour from a parent, which left light-band paragraphs near-invisible
          on cream. Styling the <p> directly is what actually wins. */}
      {children ? (
        <p
          className="mt-5 text-base leading-relaxed md:text-lg"
          style={{ color: tone === "dark" ? t2.creamMuted : t2.onLightMuted }}
        >
          {children}
        </p>
      ) : null}
    </div>
  );
}

const ctaBase =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap border px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition-all duration-300 sm:px-7 sm:text-sm sm:tracking-[0.18em]";

export function CTAButton({
  children,
  variant = "primary",
  href,
  tone = "dark",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  href: string;
  tone?: Tone;
}) {
  const style: React.CSSProperties =
    variant === "primary"
      ? { background: t2.gold, borderColor: t2.gold, color: "#140F04", fontFamily: font.ui }
      : {
          background: "transparent",
          borderColor: tone === "dark" ? t2.goldDeep : t2.lightBorder,
          color: tone === "dark" ? t2.cream : t2.onLight,
          fontFamily: font.ui,
        };

  return (
    <a
      href={href}
      className={ctaBase}
      style={style}
      onMouseEnter={(e) => {
        if (variant === "secondary") {
          e.currentTarget.style.background = "rgba(212,168,85,0.12)";
          e.currentTarget.style.borderColor = t2.gold;
        } else {
          e.currentTarget.style.background = t2.goldSoft;
          e.currentTarget.style.borderColor = t2.goldSoft;
        }
      }}
      onMouseLeave={(e) => {
        if (variant === "secondary") {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.borderColor = tone === "dark" ? t2.goldDeep : t2.lightBorder;
        } else {
          e.currentTarget.style.background = t2.gold;
          e.currentTarget.style.borderColor = t2.gold;
        }
      }}
    >
      {children}
    </a>
  );
}

/**
 * Temporary wordmark. The public brand name is always "2THREE2" (never "232"),
 * so the letterforms stay uppercase; the gold "THREE" echoes the colour split
 * already used in public/images/usam/2three2-share.png. This is a placeholder
 * until an approved logo asset exists. See the placeholder list in the PR.
 */
export function Wordmark({
  className,
  tone = "dark",
}: {
  className?: string;
  tone?: Tone;
}) {
  return (
    <span
      className={`font-bold tracking-[0.04em] ${className ?? ""}`}
      style={{ color: tone === "dark" ? "#FFFFFF" : t2.onLight, fontFamily: font.display }}
    >
      2<span style={{ color: t2.gold }}>THREE</span>2
    </span>
  );
}

export function PoweredBy({ tone = "dark", className }: { tone?: Tone; className?: string }) {
  return (
    <span
      className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${className ?? ""}`}
      style={{ color: tone === "dark" ? t2.creamFaint : t2.onLightFaint, fontFamily: font.ui }}
    >
      Powered by{" "}
      <a
        href="https://usamissionaries.org"
        className="underline decoration-dotted underline-offset-4 transition-colors"
        style={{ color: tone === "dark" ? t2.goldSoft : t2.goldDeep }}
      >
        USA Missionaries
      </a>
    </span>
  );
}
