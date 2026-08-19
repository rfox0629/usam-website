"use client";

import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { font, v2 } from "./theme";

/* --------------------------------------------------------------- motion */

/**
 * Scroll reveal with a slightly longer travel than V1, since V2 leans on
 * motion for its energy. Honours prefers-reduced-motion.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  y = 34,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  y?: number;
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
      { threshold: 0.1, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={className}
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : `translateY(${y}px)`,
        transition: `opacity 850ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 850ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/** Slow vertical drift on a background layer, for hero parallax. */
export function useParallax(strength = 0.18) {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setOffset(window.scrollY * strength));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [strength]);
  return offset;
}

/* ----------------------------------------------------------- typography */

export function Kicker({
  children,
  tone = "light",
  accent = "orange",
}: {
  children: React.ReactNode;
  tone?: "light" | "dark";
  accent?: "orange" | "gold";
}) {
  const color = accent === "orange" ? (tone === "light" ? v2.orangeDeep : v2.orangeBright) : tone === "light" ? v2.goldDeep : v2.goldBright;
  return (
    <p
      className="inline-flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.26em]"
      style={{ color, fontFamily: font.ui }}
    >
      <span aria-hidden="true" className="h-[3px] w-7" style={{ background: color }} />
      {children}
    </p>
  );
}

/**
 * The V2 headline scale is deliberately large. Copy is short, so the type has
 * to do the work the paragraphs used to do in V1.
 */
export function Display({
  children,
  tone = "light",
  className,
  as: Tag = "h2",
}: {
  children: React.ReactNode;
  tone?: "light" | "dark";
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <Tag
      className={`font-bold leading-[0.94] tracking-[-0.01em] ${className ?? "text-[2.6rem] sm:text-6xl md:text-7xl"}`}
      style={{ color: tone === "light" ? v2.onLight : v2.onDark, fontFamily: font.display }}
    >
      {children}
    </Tag>
  );
}

/**
 * Body copy always carries its own colour. app/globals.css sets
 * `:where(p, li, dd) { color: #d1d5db }`, which targets the element directly
 * and therefore beats any inherited colour from a parent wrapper.
 */
export function Body({
  children,
  tone = "light",
  className,
}: {
  children: React.ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <p
      className={className ?? "text-lg leading-relaxed md:text-xl"}
      style={{ color: tone === "light" ? v2.onLightMuted : v2.onDarkMuted }}
    >
      {children}
    </p>
  );
}

/* -------------------------------------------------------------- buttons */

type ButtonVariant = "solid" | "outline" | "ghost";

function buttonStyle(variant: ButtonVariant, tone: "light" | "dark"): React.CSSProperties {
  if (variant === "solid") {
    return { background: v2.orange, borderColor: v2.orange, color: "#FFFFFF", fontFamily: font.ui };
  }
  if (variant === "outline") {
    return {
      background: "transparent",
      borderColor: tone === "light" ? "rgba(20,23,28,0.28)" : "rgba(255,255,255,0.4)",
      color: tone === "light" ? v2.onLight : v2.onDark,
      fontFamily: font.ui,
    };
  }
  return { background: "transparent", borderColor: "transparent", color: tone === "light" ? v2.onLight : v2.onDark, fontFamily: font.ui };
}

export function ActionLink({
  children,
  href,
  variant = "solid",
  tone = "light",
  className,
}: {
  children: React.ReactNode;
  href: string;
  variant?: ButtonVariant;
  tone?: "light" | "dark";
  className?: string;
}) {
  const base =
    "group inline-flex items-center justify-center gap-2.5 whitespace-nowrap border px-7 py-4 text-[12px] font-bold uppercase tracking-[0.14em] transition-all duration-300 sm:text-[13px]";
  const isInternal = href.startsWith("/");
  const style = buttonStyle(variant, tone);

  const inner = (
    <>
      {children}
      <span
        aria-hidden="true"
        className="transition-transform duration-300 group-hover:translate-x-1"
        style={{ display: "inline-block" }}
      >
        &rarr;
      </span>
    </>
  );

  const handlers = {
    onMouseEnter: (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (variant === "solid") {
        e.currentTarget.style.background = v2.orangeDeep;
        e.currentTarget.style.borderColor = v2.orangeDeep;
      } else if (variant === "outline") {
        e.currentTarget.style.borderColor = v2.orange;
        e.currentTarget.style.color = tone === "light" ? v2.orangeDeep : v2.orangeBright;
      }
    },
    onMouseLeave: (e: React.MouseEvent<HTMLAnchorElement>) => {
      Object.assign(e.currentTarget.style, buttonStyle(variant, tone));
    },
  };

  if (isInternal) {
    return (
      <Link className={`${base} ${className ?? ""}`} href={href} style={style} {...handlers}>
        {inner}
      </Link>
    );
  }
  return (
    <a className={`${base} ${className ?? ""}`} href={href} style={style} {...handlers}>
      {inner}
    </a>
  );
}

/* ------------------------------------------------------------- wordmark */

export function Wordmark({ className, tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  return (
    <span
      className={`font-bold tracking-[0.03em] ${className ?? ""}`}
      style={{ color: tone === "light" ? v2.onLight : v2.onDark, fontFamily: font.display }}
    >
      2<span style={{ color: v2.gold }}>THREE</span>2
    </span>
  );
}

export function PoweredBy({ tone = "light", className }: { tone?: "light" | "dark"; className?: string }) {
  return (
    <span
      className={`text-[10px] font-bold uppercase tracking-[0.2em] ${className ?? ""}`}
      style={{ color: tone === "light" ? v2.onLightFaint : v2.onDarkFaint, fontFamily: font.ui }}
    >
      Powered by{" "}
      <a
        className="underline decoration-dotted underline-offset-4"
        href="https://usamissionaries.org"
        style={{ color: tone === "light" ? v2.goldDeep : v2.goldBright }}
      >
        USA Missionaries
      </a>
    </span>
  );
}
