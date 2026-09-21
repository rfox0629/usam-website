/**
 * Two visual treatments for the dashboard concepts.
 *
 * These carry no organisation identity. Which treatment an example uses is
 * decided in the content, so this file never states which organisation a
 * concept is for, nor implies any partnership.
 *
 * "contemporary" is open and warm: generous whitespace, rounded corners, soft
 * shadow, sentence case. "tactical" is dense and high contrast: squared
 * corners, condensed uppercase labels, strong rules.
 *
 * Chart colour follows one rule: a single accent hue carries the data, a
 * lighter step of the same hue carries the de-emphasised part of it, and gold
 * is reserved for fruit markers. Everything else is neutral ink.
 */

export type ExampleThemeName = "contemporary" | "tactical";

export type ExampleTheme = {
  accent: string;
  /** A lighter step of the accent, for the de-emphasised part of a chart. */
  accentLight: string;
  accentSoft: string;
  accentText: string;
  band: string;
  card: string;
  cardRadius: string;
  /** Border radius in px, for SVG rects and inline styles. */
  radiusPx: number;
  /** Fruit markers only. Never a series colour. */
  gold: string;
  goldSoft: string;
  goldText: string;
  headerBg: string;
  headerBorder: string;
  headerKicker: string;
  headerText: string;
  headerMuted: string;
  ink: string;
  label: string;
  line: string;
  muted: string;
  page: string;
  pill: string;
  statValue: string;
  /** Alternate surface for chart plots and nested panels. */
  surfaceAlt: string;
  uppercaseLabels: boolean;
};

export const exampleThemes: Record<ExampleThemeName, ExampleTheme> = {
  contemporary: {
    accent: "#1F6FEB",
    accentLight: "#9EC5F4",
    accentSoft: "#EAF1FE",
    accentText: "#1A4FB0",
    band: "#F6F7F9",
    card: "border border-[#E6E8EC] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_28px_rgba(16,24,40,0.05)]",
    cardRadius: "rounded-xl",
    radiusPx: 12,
    gold: "#B7791F",
    goldSoft: "#FBF3E2",
    goldText: "#7A5012",
    headerBg: "#0F172A",
    headerBorder: "#1E293B",
    headerKicker: "#9BA6B8",
    headerText: "#FFFFFF",
    headerMuted: "#64748B",
    ink: "#101828",
    label: "#667085",
    line: "#E6E8EC",
    muted: "#667085",
    page: "#F6F7F9",
    pill: "rounded-full border border-[#E6E8EC] bg-white",
    statValue: "#101828",
    surfaceAlt: "#F9FAFB",
    uppercaseLabels: false,
  },
  tactical: {
    accent: "#C8102E",
    accentLight: "#F0A3B0",
    accentSoft: "#FBE9EC",
    accentText: "#9B0C23",
    band: "#F2F3F5",
    card: "border border-[#D5D8DD] bg-white",
    cardRadius: "rounded-none",
    radiusPx: 0,
    gold: "#B7791F",
    goldSoft: "#FBF3E2",
    goldText: "#7A5012",
    headerBg: "#0A0E14",
    headerBorder: "#C8102E",
    headerKicker: "#B9C0CC",
    headerText: "#FFFFFF",
    headerMuted: "#6B7482",
    ink: "#0A0E14",
    label: "#5B6472",
    line: "#D5D8DD",
    muted: "#5B6472",
    page: "#F2F3F5",
    pill: "rounded-none border border-[#D5D8DD] bg-white",
    statValue: "#0A0E14",
    surfaceAlt: "#F5F6F8",
    uppercaseLabels: true,
  },
};
