"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { ActionLink, PoweredBy, Wordmark } from "./primitives";
import { font, v2 } from "./theme";

/**
 * V2 chrome.
 *
 * The founder's note was that V1's tall persistent header chopped the page into
 * separate slides. Here the bar starts invisible over the hero, condenses to a
 * slim line once you are past it, and gets out of the way entirely while you
 * scroll down, returning only when you scroll back up.
 */
export function SmartHeader() {
  const [past, setPast] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setPast(y > window.innerHeight * 0.72);
      setHidden(y > last && y > window.innerHeight);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Over the hero the bar is transparent on a dark photo, so its contents must
  // be light. Once it condenses onto the paper background they must be dark.
  const overHero = !past;
  const barTone: "light" | "dark" = overHero ? "dark" : "light";

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 w-full"
      style={{
        background: overHero ? "transparent" : v2.paper,
        borderBottom: overHero ? "1px solid transparent" : `1px solid ${v2.paperEdge}`,
        boxShadow: overHero ? "none" : "0 1px 20px rgba(20,23,28,0.06)",
        transform: hidden ? "translateY(-100%)" : "translateY(0)",
        transition: "transform 420ms cubic-bezier(0.16,1,0.3,1), background 320ms ease, box-shadow 320ms ease",
      }}
    >
      <div
        className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-5 md:px-10"
        style={{ height: overHero ? 76 : 56, transition: "height 320ms ease" }}
      >
        <Link className="flex items-center gap-3" href="/2three2-v2">
          <Wordmark className={overHero ? "text-xl" : "text-base"} tone={barTone} />
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            className="hidden text-[11px] font-bold uppercase tracking-[0.16em] transition-opacity hover:opacity-70 sm:inline"
            href="/2three2-v2/race"
            style={{ color: barTone === "dark" ? v2.onDark : v2.onLight, fontFamily: font.ui }}
          >
            Race
          </Link>
          <ActionLink
            className="!px-5 !py-2.5 !text-[11px]"
            href="/2three2-v2#join"
            tone={barTone}
            variant="solid"
          >
            Join
          </ActionLink>
        </nav>
      </div>
    </header>
  );
}

export function PreviewBanner() {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[60] w-full px-4 py-1.5 text-center text-[9px] font-bold uppercase tracking-[0.2em]"
      style={{ background: v2.inkDeep, color: v2.goldBright, fontFamily: font.ui }}
    >
      Founder Preview V2 &middot; Design Concept &middot; Not a Live Site
    </div>
  );
}

export function Footer() {
  return (
    <footer className="px-6 pb-16 pt-16 md:px-10" style={{ background: v2.inkDeep }}>
      <div className="mx-auto flex max-w-[1400px] flex-col gap-10 md:flex-row md:items-end md:justify-between">
        <div>
          <Wordmark className="text-3xl" tone="dark" />
          <p className="mt-3">
            <PoweredBy tone="dark" />
          </p>
        </div>
        <div className="flex flex-col gap-3 md:items-end">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link
              className="text-[11px] font-bold uppercase tracking-[0.16em]"
              href="/2three2-v2"
              style={{ color: v2.onDarkMuted, fontFamily: font.ui }}
            >
              Movement
            </Link>
            <Link
              className="text-[11px] font-bold uppercase tracking-[0.16em]"
              href="/2three2-v2/race"
              style={{ color: v2.onDarkMuted, fontFamily: font.ui }}
            >
              Race With Purpose
            </Link>
            <Link
              className="text-[11px] font-bold uppercase tracking-[0.16em]"
              href="/2three2-v1"
              style={{ color: v2.onDarkFaint, fontFamily: font.ui }}
            >
              Compare V1
            </Link>
          </div>
          <p className="max-w-md text-[11px] leading-relaxed md:text-right" style={{ color: v2.onDarkFaint }}>
            Founder-review concept. Temporary wordmark, non-functional interest form, and reserved photography
            plates where commissioned images do not exist yet. No production routes, navigation, domains, or
            data were changed.
          </p>
        </div>
      </div>
    </footer>
  );
}
