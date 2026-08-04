// 2THREE2 founder-preview design tokens.
//
// The palette is deliberately anchored to the USAM brand pair (black + gold,
// see --usam-black / --usam-gold in app/globals.css) and to the existing
// 2THREE2 share asset at public/images/usam/2three2-share.png, which already
// established a gold "2three2" wordmark on a deep navy field. Keeping that pair
// means the black-and-gold triathlon kit in the Race With Purpose section reads
// as the same brand as the rest of the page rather than a separate campaign.
//
// 2THREE2 separates itself from usamissionaries.org (flat black, tactical) by
// leaning on dawn light, real photography, and, importantly, alternating
// light cream sections. The brief warns against "excessive darkness"; the light
// bands are what keep this from reading as a gym or a militaristic brand.
export const t2 = {
  // Dark canvas
  ink: "#0A0E14",
  inkDeep: "#05070A",
  midnight: "#101825",
  slate: "#182333",
  panel: "#131C29",
  panelRaised: "#1A2536",
  panelBorder: "rgba(233,222,199,0.13)",
  panelBorderStrong: "rgba(212,168,85,0.34)",

  // Gold accent family
  gold: "#D4A855",
  goldSoft: "#F0CE8E",
  goldDeep: "#8F6A25",
  goldGlow: "rgba(212,168,85,0.14)",

  // Dawn accents used in the illustrations
  dawn: "#E9A15C",
  dawnDeep: "#B4633A",

  // Text on dark
  cream: "#F2ECDF",
  creamMuted: "#B9B3A6",
  creamFaint: "#8A8578",

  // Light band
  light: "#F6F1E6",
  lightAlt: "#EDE5D5",
  lightBorder: "rgba(24,35,51,0.14)",
  onLight: "#131C29",
  onLightMuted: "#4E5A6B",
  onLightFaint: "#77808E",
} as const;

export const font = {
  display: "'Oswald', sans-serif",
  ui: "'Rajdhani', sans-serif",
} as const;
