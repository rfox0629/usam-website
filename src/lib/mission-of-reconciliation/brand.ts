/**
 * Mission of Reconciliation shares the USA Missionaries typographic system and
 * gold accent, but carries its own warm, light identity so the landing page and
 * the /restoration intake read as one continuous experience.
 *
 * Every text element on these pages must set its own colour class. app/globals.css
 * applies a site-wide dark-theme readability pass to bare `p`, `li`, and heading
 * elements, so unstyled copy on a light background renders nearly invisible.
 * Use the hex values below as Tailwind arbitrary values (`text-[#15120c]`) and
 * never the `text-stone-*` utilities, which globals.css overrides at equal
 * specificity.
 */

export const morFont = {
  oswald: "'Oswald', sans-serif",
  rajdhani: "'Rajdhani', sans-serif",
} as const;

export const morColor = {
  /** Page background. Warm, near-white, generous. */
  page: "#FCFAF6",
  /** Alternating section band. */
  band: "#F4F0E5",
  /** Deep band used for the partnership progression. */
  deep: "#15120C",
  /** Primary ink for headings. */
  ink: "#15120C",
  /** Body copy. */
  body: "#4A4237",
  /** Secondary and supporting copy. */
  muted: "#736A5B",
  /** Hairline rules and card borders. */
  rule: "#E4DDCE",
  /** Shared USA Missionaries gold. */
  gold: "#C2A14E",
  /** Gold dark enough for text on a light background (WCAG AA at body sizes). */
  goldInk: "#7C6423",
} as const;

export const morBrand = {
  name: "Mission of Reconciliation",
  /** Rendered by <PartnershipLine> so the partner name can be a link. */
  partner: "USA Missionaries",
  partnershipPrefix: "In partnership with",
  partnerUrl: "https://usamissionaries.org",
  /** Plain-text form, for places that cannot carry markup. */
  partnership: "In partnership with USA Missionaries",
  tagline: "People coming alongside people.",
} as const;

export const morRoutes = {
  home: "/mission-of-reconciliation",
  restoration: "/restoration",
  stories: "/mission-of-reconciliation/stories",
  joinAnchor: "/mission-of-reconciliation#join-the-mission",
} as const;

/** John Piper, "Don't Waste Your Life." Embedded via the no-cookie host. */
export const dontWasteYourLife = {
  embedUrl: "https://www.youtube-nocookie.com/embed/mfpmbmsvu3A",
  title: "John Piper, Don't Waste Your Life",
  watchUrl: "https://www.youtube.com/watch?v=mfpmbmsvu3A",
} as const;
