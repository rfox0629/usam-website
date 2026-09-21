"use client";

import { useEffect } from "react";

/**
 * Keeps the two sticky bars on the briefing from covering content.
 *
 * The global USA Missionaries header is sticky at the top of the page, and the
 * briefing's section rail sticks directly beneath it. Both heights vary a
 * little by viewport (the header's brand line wraps on the narrowest phones),
 * so rather than hardcoding offsets in several places, this measures the two
 * bars and publishes their heights as CSS custom properties on the document:
 *
 *   --advisor-nav-h   height of the global header
 *   --advisor-rail-h  height of the section rail
 *
 * app/globals.css consumes them: the rail's `top`, every section's
 * `scroll-margin-top`, and the document's `scroll-padding-top` are all
 * derived from these two values, so an anchor click always lands the heading
 * below both bars. The CSS declares sensible defaults, so the layout is right
 * before this runs and merely stays right as the viewport changes.
 */

const NAV_SELECTOR = "body > div > header, main > header";
const RAIL_SELECTOR = 'nav[aria-label="Section navigation"]';

export function AdvisorStickyOffsets() {
  useEffect(() => {
    const root = document.documentElement;
    const nav = document.querySelector<HTMLElement>(NAV_SELECTOR);
    const rail = document.querySelector<HTMLElement>(RAIL_SELECTOR);

    if (!nav && !rail) {
      return;
    }

    const publish = () => {
      if (nav) {
        root.style.setProperty("--advisor-nav-h", `${Math.ceil(nav.getBoundingClientRect().height)}px`);
      }
      if (rail) {
        root.style.setProperty("--advisor-rail-h", `${Math.ceil(rail.getBoundingClientRect().height)}px`);
      }
    };

    publish();

    const observer = new ResizeObserver(publish);
    if (nav) observer.observe(nav);
    if (rail) observer.observe(rail);

    return () => {
      observer.disconnect();
      root.style.removeProperty("--advisor-nav-h");
      root.style.removeProperty("--advisor-rail-h");
    };
  }, []);

  return null;
}
