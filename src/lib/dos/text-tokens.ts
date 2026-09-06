/**
 * DOS design tokens — text ladder, surfaces, accent, and status.
 *
 * The canonical definition is docs/dos-ui-refresh/phase-3/dos-ui-canonical-spec.md
 * §2. These values are registered as Tailwind theme entries in
 * tailwind.config.js (`text-dos-primary`, `bg-dos-blue`, `border-dos-line`,
 * `text-dos-label`, `rounded-dos-2`, `shadow-dos-float`, `pb-dos-nav-clearance`,
 * `z-dos-nav` …), so surfaces should prefer the utility classes. The constants
 * below exist for inline styles, SVG, and non-Tailwind contexts, and
 * scripts/dos-design-tokens-regression.mjs asserts the two stay identical.
 *
 * The rule this ladder exists to enforce: information users are expected to
 * read (dates, counts, cadence, metadata, supporting copy) must never be
 * rendered in very light gray — `#9AA4B2` / `#94A3B8` read as disabled rather
 * than secondary. Hierarchy comes from size, weight, and position; color only
 * separates *kinds* of text, and nothing lighter than `secondary` may carry a
 * date, a count, or a sentence.
 *
 * History: adopted by the USA-168 Person surfaces; values reconciled with the
 * V10 design reference in USA-208. Migrating the remaining one-off hex values
 * onto these tokens happens screen by screen in Phases 5–6, never by blind
 * global replacement.
 */
export const dosText = {
  /** Titles, names, committed statements — the things being scanned for. */
  primary: "#0B1220",
  /** Body copy, excerpts, descriptions. Comfortable at 15px / 1.5. */
  body: "#3D4654",
  /** Dates, counts, cadence, metadata. The floor for readable information. */
  secondary: "#5A6473",
  /** Grey eyebrow: sub-group eyebrows and not-yet-refreshed section eyebrows. */
  eyebrow: "#6B7686",
  /** Blue section eyebrow on refreshed screens (11.5px, 600, tracked). */
  eyebrowSection: "#2251E8",
  /** Genuinely disabled or inactive UI. Never used for readable content. */
  disabled: "#9AA3B2",
} as const;

/** Surface, rule, and accent tokens used alongside the text ladder. */
export const dosSurface = {
  /** Hairline between peer rows, field borders, the nav border. */
  hairline: "#E5E8EF",
  /** Chrome/content boundary and section rules (same value as hairline). */
  rule: "#E5E8EF",
  /** Working-region band, segmented-control track, desktop page ground. */
  band: "#F7F8FB",
  /** DOS blue — actions, progress, active pills, section eyebrows. */
  blue: "#2251E8",
  /** Blue text on light tints where 4.5:1 is needed at small sizes. */
  blueText: "#1E3FB8",
  /** Selected fills, tinted buttons, icon tiles. */
  blue50: "#F1F4FF",
  /** Borders on tint, hover. */
  blue100: "#E4EAFF",
} as const;

/** Status colors: pills and validation only, never body text. */
export const dosStatus = {
  amber: "#B45309",
  amberBg: "#FDF0D5",
  green: "#047857",
  greenBg: "#DCF5E9",
  red: "#B91C1C",
  redBg: "#FDE8E8",
} as const;

/** Layout constants shared by navigation, FAB, and scroll containers (px). */
export const dosLayout = {
  /** Bottom navigation height. */
  navHeight: 70,
  /** Gap between the nav and the bottom safe-area edge. */
  navGap: 14,
  /** Breathing room reserved above the nav at the end of scrollable content. */
  navBreathing: 16,
  /** navHeight + navGap + navBreathing; add the safe-area inset at runtime. */
  navClearance: 100,
  /** Every tappable control's minimum hit area. */
  hitArea: 44,
} as const;

/** Type scale (px). Nothing readable below `pill`. */
export const dosType = {
  display: 30,
  title: 26,
  heading: 20,
  question: 17,
  body: 15,
  label: 13.5,
  meta: 12.5,
  eyebrow: 11.5,
  pill: 12,
} as const;
