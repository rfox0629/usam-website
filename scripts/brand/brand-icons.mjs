/**
 * Brand icon source of truth.
 *
 * Each brand describes one approved mark plus its approved colors. Every favicon,
 * apple-touch icon, and PWA icon in `public/favicons/**` is generated from these
 * definitions by `build-favicons.mjs`, so the marks never drift apart.
 *
 * Marks are drawn on a 64x64 grid.
 *
 *   emblem  circular badge on a transparent field (browser tabs, PWA "any" icons)
 *   square  full-bleed brand field (apple-touch icons, PWA "maskable" icons)
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const marksDir = join(dirname(fileURLToPath(import.meta.url)), "marks");

function inlinePng(name) {
  return `data:image/png;base64,${readFileSync(join(marksDir, name)).toString("base64")}`;
}

/** Center a mark bounding box at a given width on the 64 grid. */
function centerTransform({ x, y, width, height }, targetWidth) {
  const scale = targetWidth / width;
  const scaledHeight = height * scale;
  const left = (64 - targetWidth) / 2;
  const top = (64 - scaledHeight) / 2;

  return `translate(${(left - x * scale).toFixed(3)} ${(top - y * scale).toFixed(3)}) scale(${scale.toFixed(5)})`;
}

const usamMark = {
  aspect: 476 / 214,
  href: inlinePng("usam-mark-wordmark.png"),
};

/** USAM: the approved wordmark, white, inside a black disc edged in USAM gold. */
function usamEmblem() {
  const width = 40;
  const height = width / usamMark.aspect;

  return `<circle cx="32" cy="32" r="32" fill="#0D0D0D"/>
  <circle cx="32" cy="32" r="30.9" fill="none" stroke="#C2A14E" stroke-width="2.2"/>
  <image href="${usamMark.href}" x="${((64 - width) / 2).toFixed(3)}" y="${((64 - height) / 2).toFixed(3)}" width="${width}" height="${height.toFixed(3)}" preserveAspectRatio="xMidYMid meet"/>`;
}

function usamSquare(markWidth) {
  const height = markWidth / usamMark.aspect;

  return `<rect width="64" height="64" fill="#0D0D0D"/>
  <image href="${usamMark.href}" x="${((64 - markWidth) / 2).toFixed(3)}" y="${((64 - height) / 2).toFixed(3)}" width="${markWidth}" height="${height.toFixed(3)}" preserveAspectRatio="xMidYMid meet"/>`;
}

/**
 * DOS: the approved concentric-circles mark (centre, ring, open arc) reversed to
 * white on a DOS-blue disc — the same blue gradient the DOS app uses for My 3.
 */
const dosGradient = `<linearGradient id="dosField" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#2563EB"/>
    <stop offset="1" stop-color="#1D4ED8"/>
  </linearGradient>`;

function dosMark(scale = 1) {
  return `<g transform="translate(32 32) scale(${scale}) translate(-32 -32)" fill="none" stroke="#FFFFFF" stroke-width="4.3">
    <circle cx="32" cy="32" r="5.5" fill="#FFFFFF" stroke="none"/>
    <circle cx="32" cy="32" r="13.5"/>
    <path d="M50.09 44.68 A22.15 22.15 0 1 1 50.09 19.32" stroke-linecap="round"/>
  </g>`;
}

function dosEmblem() {
  return `<defs>${dosGradient}</defs>
  <circle cx="32" cy="32" r="32" fill="url(#dosField)"/>
  ${dosMark(1)}`;
}

function dosSquare(scale) {
  return `<defs>${dosGradient}</defs>
  <rect width="64" height="64" fill="url(#dosField)"/>
  ${dosMark(scale)}`;
}

/**
 * Kitchen Table Gospel: the approved table mark standing alone, with no disc or
 * field behind it, in the Kitchen Table site's own accent blue.
 *
 * The color is forced by the standalone treatment. Against a transparent field
 * the mark has to survive both light and dark browser chrome: cream and white
 * disappear on light chrome, the warm near-black disappears on dark chrome, and
 * only the accent blue holds on both.
 */
const ktgBlue = "#378ADD";

const ktgTableBox = { height: 31, width: 46, x: 9, y: 22 };

function ktgTable(fill, targetWidth) {
  return `<g fill="${fill}" transform="${centerTransform(ktgTableBox, targetWidth)}">
    <path d="M17 22H47L55 34H9L17 22Z"/>
    <rect x="15" y="35" width="5.5" height="18"/>
    <rect x="25" y="35" width="4" height="11"/>
    <rect x="35" y="35" width="4" height="11"/>
    <rect x="43.5" y="35" width="5.5" height="18"/>
  </g>`;
}

function ktgEmblem() {
  return ktgTable(ktgBlue, 52);
}

/**
 * Apple touch and maskable icons cannot be transparent — iOS composites them onto
 * black and Android needs a full-bleed field to crop. White keeps them reading as
 * the same background-free mark.
 */
function ktgSquare(markWidth) {
  return `<rect width="64" height="64" fill="#FFFFFF"/>
  ${ktgTable(ktgBlue, markWidth)}`;
}

function svg(label, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${label}">
  ${body}
</svg>
`;
}

/**
 * PWA manifests, generated alongside the icons so a brand's colors are declared
 * once. `webAppName`/`themeColor` are what iOS and Android show for an installed
 * app, so they must match the surface the manifest is served from.
 */
export const brandIcons = [
  {
    backgroundColor: "#0D0D0D",
    dir: "usam",
    manifests: [{ file: "site.webmanifest", scope: "/", startUrl: "/" }],
    shortName: "USAM",
    themeColor: "#0D0D0D",
    webAppName: "USA Missionaries",
    emblem: () => svg("USA Missionaries", usamEmblem()),
    emblemBody: usamEmblem,
    label: "USA Missionaries",
    /** apple-touch icons get iOS's own corner mask, so the mark can run wider. */
    appleSquare: () => svg("USA Missionaries", usamSquare(42)),
    /** maskable icons must survive an aggressive circular crop: keep the mark small. */
    maskableSquare: () => svg("USA Missionaries", usamSquare(31)),
  },
  {
    // DOS is a white, blue-accented app: blue chrome, white splash.
    backgroundColor: "#FFFFFF",
    dir: "dos",
    manifests: [
      { file: "site.webmanifest", scope: "/", startUrl: "/" },
      // Served for the DOS app hosted under usamissionaries.org/dos.
      { file: "app.webmanifest", scope: "/dos", startUrl: "/dos" },
    ],
    shortName: "DOS",
    themeColor: "#2563EB",
    webAppName: "Discipleship Operating System",
    emblem: () => svg("Discipleship Operating System", dosEmblem()),
    emblemBody: dosEmblem,
    label: "Discipleship Operating System",
    appleSquare: () => svg("Discipleship Operating System", dosSquare(0.86)),
    maskableSquare: () => svg("Discipleship Operating System", dosSquare(0.62)),
  },
  {
    backgroundColor: "#160F0A",
    dir: "kitchen-table-gospel",
    manifests: [{ file: "site.webmanifest", scope: "/", startUrl: "/" }],
    shortName: "Kitchen Table",
    themeColor: "#160F0A",
    webAppName: "Kitchen Table Gospel",
    emblem: () => svg("Kitchen Table Gospel", ktgEmblem()),
    emblemBody: ktgEmblem,
    label: "Kitchen Table Gospel",
    appleSquare: () => svg("Kitchen Table Gospel", ktgSquare(40)),
    maskableSquare: () => svg("Kitchen Table Gospel", ktgSquare(29)),
  },
];
