/**
 * Two visual treatments for the dashboard concepts.
 *
 * These carry no organisation identity. Which treatment an example uses is
 * decided in the private payload, so this repository never states which
 * organisation a concept is for, nor implies any partnership.
 *
 * "contemporary" is open and warm: generous whitespace, rounded corners, soft
 * shadow, sentence case. "tactical" is dense and high contrast: squared
 * corners, condensed uppercase labels, strong rules.
 */

export type ExampleThemeName = "contemporary" | "tactical";

export type ExampleTheme = {
  accent: string;
  accentSoft: string;
  accentText: string;
  band: string;
  card: string;
  cardRadius: string;
  headerBg: string;
  headerBorder: string;
  headerKicker: string;
  headerText: string;
  ink: string;
  label: string;
  line: string;
  muted: string;
  page: string;
  pill: string;
  statValue: string;
  uppercaseLabels: boolean;
};

export const exampleThemes: Record<ExampleThemeName, ExampleTheme> = {
  contemporary: {
    accent: "#1F6FEB",
    accentSoft: "#EAF1FE",
    accentText: "#1A4FB0",
    band: "#F6F7F9",
    card: "border border-[#E6E8EC] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_28px_rgba(16,24,40,0.05)]",
    cardRadius: "rounded-xl",
    headerBg: "#111827",
    headerBorder: "#1F2937",
    headerKicker: "#9BA6B8",
    headerText: "#FFFFFF",
    ink: "#101828",
    label: "#667085",
    line: "#E6E8EC",
    muted: "#667085",
    page: "#FFFFFF",
    pill: "rounded-full border border-[#E6E8EC] bg-white",
    statValue: "#101828",
    uppercaseLabels: false,
  },
  tactical: {
    accent: "#C8102E",
    accentSoft: "#FBE9EC",
    accentText: "#9B0C23",
    band: "#F2F3F5",
    card: "border border-[#D5D8DD] bg-white",
    cardRadius: "rounded-none",
    headerBg: "#0A0E14",
    headerBorder: "#C8102E",
    headerKicker: "#B9C0CC",
    headerText: "#FFFFFF",
    ink: "#0A0E14",
    label: "#5B6472",
    line: "#D5D8DD",
    muted: "#5B6472",
    page: "#FFFFFF",
    pill: "rounded-none border border-[#D5D8DD] bg-white",
    statValue: "#0A0E14",
    uppercaseLabels: true,
  },
};
