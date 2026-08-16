import type { CSSProperties, ReactNode } from "react";
import { morColor, morFont } from "@/src/lib/mission-of-reconciliation/brand";

/**
 * Layout and type primitives for the Mission of Reconciliation page.
 *
 * Colour is set inline on every text element on purpose: app/globals.css runs a
 * site-wide dark-theme readability pass over bare `p`, `li`, and heading tags,
 * which would otherwise wash this light page out to near-invisible grey.
 */

export function Section({
  children,
  id,
  tone = "page",
}: {
  children: ReactNode;
  id?: string;
  tone?: "band" | "deep" | "page";
}) {
  const background = {
    band: morColor.band,
    deep: morColor.deep,
    page: morColor.page,
  }[tone];

  return (
    <section
      className="scroll-mt-20 px-5 py-16 md:px-8 md:py-24 lg:py-32"
      id={id}
      style={{ backgroundColor: background }}
    >
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  );
}

export function Eyebrow({ children, onDark = false }: { children: ReactNode; onDark?: boolean }) {
  return (
    <p
      className="text-[11px] uppercase leading-none tracking-[0.24em] md:text-xs"
      style={{
        color: onDark ? morColor.gold : morColor.goldInk,
        fontFamily: morFont.rajdhani,
        fontWeight: 700,
      }}
    >
      {children}
    </p>
  );
}

export function Display({
  children,
  onDark = false,
  size = "lg",
}: {
  children: ReactNode;
  onDark?: boolean;
  size?: "lg" | "xl";
}) {
  const fontSize = size === "xl"
    ? "clamp(2.6rem, 7.5vw, 5.25rem)"
    : "clamp(2rem, 4.6vw, 3.35rem)";

  return (
    <h2
      className="max-w-4xl"
      style={{
        color: onDark ? "#FFFFFF" : morColor.ink,
        fontFamily: morFont.oswald,
        fontSize,
        fontWeight: 600,
        letterSpacing: 0,
        lineHeight: 1.02,
      }}
    >
      {children}
    </h2>
  );
}

export function Lede({ children, onDark = false }: { children: ReactNode; onDark?: boolean }) {
  return (
    <p
      className="max-w-3xl text-[1.0625rem] leading-8 md:text-xl md:leading-9"
      style={{ color: onDark ? "rgba(255,255,255,0.78)" : morColor.body }}
    >
      {children}
    </p>
  );
}

export function Body({
  children,
  onDark = false,
  style,
}: {
  children: ReactNode;
  onDark?: boolean;
  style?: CSSProperties;
}) {
  return (
    <p
      className="max-w-2xl text-base leading-8 md:text-[1.0625rem] md:leading-9"
      style={{ color: onDark ? "rgba(255,255,255,0.72)" : morColor.body, ...style }}
    >
      {children}
    </p>
  );
}

export function Rule({ onDark = false }: { onDark?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="h-px w-16"
      style={{ backgroundColor: onDark ? "rgba(194,161,78,0.55)" : morColor.gold }}
    />
  );
}

export function ScriptureQuote({
  children,
  onDark = false,
  reference,
}: {
  children: ReactNode;
  onDark?: boolean;
  reference: string;
}) {
  return (
    <figure
      className="max-w-3xl border-l-2 pl-5 md:pl-7"
      style={{ borderColor: onDark ? "rgba(194,161,78,0.6)" : morColor.gold }}
    >
      <blockquote>
        <p
          className="text-xl leading-9 md:text-[1.6rem] md:leading-[1.6]"
          style={{
            color: onDark ? "#FFFFFF" : morColor.ink,
            fontFamily: morFont.oswald,
            fontWeight: 400,
          }}
        >
          {children}
        </p>
      </blockquote>
      <figcaption
        className="mt-4 text-[11px] uppercase tracking-[0.2em]"
        style={{
          color: onDark ? morColor.gold : morColor.goldInk,
          fontFamily: morFont.rajdhani,
          fontWeight: 700,
        }}
      >
        {reference}
      </figcaption>
    </figure>
  );
}
