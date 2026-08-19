// 2THREE2 V2 design tokens.
//
// V1 was a dark page throughout, which read as a strategy document. V2 inverts
// that: warm paper is the default surface, charcoal appears only where a
// section needs to hit hard, and photography carries the emotion instead of
// cards. Gold stays as the brand tie to USA Missionaries; a hot orange is added
// purely for energy and motion cues (rules, arrows, kickers), never for body
// text on light, where it would fail contrast.
export const v2 = {
  // Light surfaces
  paper: "#FDFBF7",
  paperWarm: "#F6F1E7",
  paperAlt: "#EEE7DA",
  paperEdge: "rgba(20,23,28,0.10)",

  // Dark surfaces, used sparingly
  ink: "#14171C",
  inkDeep: "#0A0C10",
  inkPanel: "#1C2128",
  inkEdge: "rgba(255,255,255,0.14)",

  // Brand
  gold: "#C9A24B",
  goldBright: "#E4C071",
  goldDeep: "#8A6B22",

  // Energy accent
  orange: "#E2591F",
  orangeBright: "#F5854A",
  orangeDeep: "#B33F10",

  // Text
  onLight: "#14171C",
  onLightMuted: "#57606E",
  onLightFaint: "#7C8593",
  onDark: "#FFFFFF",
  onDarkMuted: "#C6CBD3",
  onDarkFaint: "#8D949F",
} as const;

export const font = {
  display: "'Oswald', sans-serif",
  ui: "'Rajdhani', sans-serif",
} as const;

/**
 * Photography inventory for this route.
 *
 * Only real, already-approved assets from this repo are listed. Anything the
 * design calls for that does not exist yet is rendered as an explicit reserved
 * plate rather than substituted with a stand-in, so nothing on the page implies
 * a photograph that was never taken.
 */
export const photos = {
  community: {
    alt: "A group gathered together outside after meeting",
    credit: "Existing USA Missionaries photo, also used on /vision",
    src: "/images/vision/group-prayer-01.jpg",
  },
  landscape: {
    alt: "Open mountain country at first light",
    credit: "Existing USA Missionaries asset",
    src: "/images/usam/default-hero-background.png",
  },
  pair: {
    alt: "Two men outside together in winter",
    credit: "Existing USA Missionaries photo",
    src: "/images/assignments/ryan-and-garrett.webp",
  },
  table: {
    alt: "People gathered around a kitchen table",
    credit: "Existing USA Missionaries photo",
    src: "/images/vision/kitchen-table-01.jpg",
  },
  couple: {
    alt: "A couple serving together",
    credit: "Existing USA Missionaries photo",
    src: "/images/vision/dirk-julia.jpg",
  },
} as const;
