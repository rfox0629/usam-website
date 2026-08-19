/**
 * DOS text-color ladder.
 *
 * Fixes a recurring pattern across DOS: information users are expected to
 * read (dates, counts, cadence, metadata, supporting copy) was rendered in
 * very light gray — `#9AA4B2` / `#94A3B8` — which reads as disabled rather
 * than secondary. Lightening text is a color decision standing in for a
 * layout decision, and it is why several surfaces read as unfinished.
 *
 * The rule: hierarchy comes from size, weight, and position. Color only
 * separates *kinds* of text, and nothing lighter than `secondary` may carry
 * a date, a count, or a sentence.
 *
 * These values are registered as Tailwind theme colors in
 * tailwind.config.js, so surfaces should prefer the utility classes —
 * `text-dos-primary`, `text-dos-body`, `text-dos-secondary`,
 * `text-dos-eyebrow`, `text-dos-disabled` — over one-off hex values. The
 * constants below exist for inline styles and non-Tailwind contexts.
 *
 * Adopted by the USA-168 Person surfaces and intended as the DOS standard.
 * USA-168 deliberately does not restyle unrelated production screens;
 * migrating the remaining `#9AA4B2` / `#94A3B8` usages onto these tokens is
 * tracked as follow-up.
 */
export const dosText = {
  /** Titles, names, committed statements — the things being scanned for. */
  primary: "#0F1520",
  /** Body copy, excerpts, descriptions. Comfortable at 15px / 1.55. */
  body: "#3D4654",
  /** Dates, counts, cadence, metadata. The floor for readable information. */
  secondary: "#5A6473",
  /** Small-caps section eyebrows only (11px bold, tracked). */
  eyebrow: "#6B7686",
  /** Genuinely disabled or inactive UI. Never used for readable content. */
  disabled: "#B4BBC5",
} as const;

/** Surface, rule, and accent tokens used alongside the text ladder. */
export const dosSurface = {
  /** Hairline between peer rows. */
  hairline: "#E7E9ED",
  /** Chrome/content boundary and section rules. */
  rule: "#EDEFF2",
  /** Tinted working-region band — figure/ground without a card. */
  band: "#FBFAF8",
  /** DOS blue — actions, progress, and the single section eyebrow. */
  blue: "#2450C8",
} as const;
