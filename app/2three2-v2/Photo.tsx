"use client";

import Image from "next/image";
import React from "react";
import { font, v2 } from "./theme";

/**
 * Tailwind defines `.relative` after `.absolute`, so a hardcoded `relative` on a
 * component root silently beats an `absolute` passed in by the caller no matter
 * which order the classes appear in the attribute. These components only supply
 * their own positioning when the caller has not asked for one.
 */
function positionClass(className?: string) {
  return /\b(absolute|fixed|relative|sticky)\b/.test(className ?? "") ? "" : "relative";
}

/**
 * Real photography from the repo's approved asset library.
 *
 * `focus` is an object-position string, because most of these are portrait or
 * square source images being used in wide crops.
 */
export function Photo({
  src,
  alt,
  className,
  focus = "center",
  priority = false,
  sizes = "100vw",
  scrim,
}: {
  src: string;
  alt: string;
  className?: string;
  focus?: string;
  priority?: boolean;
  sizes?: string;
  scrim?: string;
}) {
  return (
    <div className={`${positionClass(className)} overflow-hidden ${className ?? ""}`}>
      <Image alt={alt} className="object-cover" fill priority={priority} sizes={sizes} src={src} style={{ objectPosition: focus }} />
      {scrim ? <div aria-hidden="true" className="absolute inset-0" style={{ background: scrim }} /> : null}
    </div>
  );
}

/**
 * A reserved photography plate.
 *
 * This exists because parts of the V2 art direction call for images that do not
 * exist yet and cannot be faked responsibly: there is no photograph anywhere of
 * athletes in 2THREE2 kits, and the brief explicitly rules out passing an
 * illustration off as sports photography.
 *
 * So the plate holds the exact final crop and carries the shot brief, rather
 * than filling the slot with something misleading. It is deliberately styled as
 * a production placeholder, not as finished art, so nobody reviewing the page
 * can mistake it for the real image.
 */
export function ReservedPlate({
  className,
  title,
  brief,
  spec,
  detail = "full",
}: {
  className?: string;
  title: string;
  brief: string;
  spec?: readonly string[];
  /** "minimal" is for frames where headline copy is overlaid on top of the
      plate, so the plate itself must stay quiet. */
  detail?: "full" | "minimal";
}) {
  return (
    <div
      className={`${positionClass(className)} flex justify-center overflow-hidden ${detail === "minimal" ? "items-start" : "items-center"} ${className ?? ""}`}
      style={{
        background: `repeating-linear-gradient(135deg, ${v2.inkPanel} 0px, ${v2.inkPanel} 14px, ${v2.ink} 14px, ${v2.ink} 28px)`,
      }}
    >
      {/* corner registration marks, the visual language of an unfilled plate */}
      {[
        { left: 18, top: 18 },
        { right: 18, top: 18 },
        { bottom: 18, left: 18 },
        { bottom: 18, right: 18 },
      ].map((pos, i) => (
        <span
          aria-hidden="true"
          key={i}
          style={{
            border: `2px solid ${v2.goldBright}`,
            borderBottomWidth: i > 1 ? 2 : 0,
            borderLeftWidth: i % 2 === 0 ? 2 : 0,
            borderRightWidth: i % 2 === 1 ? 2 : 0,
            borderTopWidth: i > 1 ? 0 : 2,
            height: 26,
            opacity: 0.75,
            position: "absolute",
            width: 26,
            ...pos,
          }}
        />
      ))}

      <div
        className={`relative mx-auto max-w-2xl px-8 text-center ${detail === "minimal" ? "pb-8 pt-24 md:pt-28" : "py-14"}`}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-[0.3em]"
          style={{ color: v2.orangeBright, fontFamily: font.ui }}
        >
          Reserved for commissioned photography
        </p>
        <h3
          className="mt-4 text-2xl font-bold leading-tight sm:text-3xl"
          style={{ color: v2.onDark, fontFamily: font.display }}
        >
          {title}
        </h3>
        {detail === "full" ? (
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed" style={{ color: v2.onDarkMuted }}>
            {brief}
          </p>
        ) : null}
        {spec ? (
          <ul className="mx-auto mt-6 flex max-w-lg flex-wrap justify-center gap-2">
            {spec.map((item) => (
              <li
                className="border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em]"
                key={item}
                style={{ borderColor: v2.inkEdge, color: v2.onDarkFaint, fontFamily: font.ui }}
              >
                {item}
              </li>
            ))}
          </ul>
        ) : null}
        {detail === "full" ? (
          <p className="mx-auto mt-6 max-w-lg text-[11px] leading-relaxed" style={{ color: v2.onDarkFaint }}>
            This frame is the final crop. No stand-in image is shown here on purpose, so nothing on the page
            implies a photograph that has not been taken.
          </p>
        ) : null}
      </div>
    </div>
  );
}
