import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewDir = path.join(repoRoot, "public", "favicons", "review");

const colors = {
  black: "#0D0D0D",
  navy: "#070D14",
  offWhite: "#F8F6EF",
  panel: "#EDEAE3",
  red: "#B8322C",
  muted: "#615A50",
};

const concepts = [
  {
    key: "monogram",
    label: "1. Bold USAM",
    note: "Two-line block monogram",
    svg: buildMonogramSvg(),
  },
  {
    key: "flag",
    label: "2. Flag Mark",
    note: "Few bold fields and stripes",
    svg: buildFlagSvg(),
  },
  {
    key: "compass",
    label: "3. North Star",
    note: "Mission and sending symbol",
    svg: buildCompassSvg(),
  },
];

async function main() {
  mkdirSync(reviewDir, { recursive: true });

  for (const concept of concepts) {
    writeFileSync(path.join(reviewDir, `usam-concept-${concept.key}.svg`), concept.svg);
  }

  await writePng("brand-comparison.png", buildLargeComparisonSvg());
  await writePng("scale-comparison.png", buildScaleComparisonSvg());
}

function buildMonogramSvg() {
  const top = blockLetters("US", 4.6, 3);
  const bottom = blockLetters("AM", 4.6, 3);

  return iconSvg([
    `<rect width="64" height="64" rx="9" fill="${colors.black}"/>`,
    `<g transform="translate(${(64 - top.width) / 2} 8)">${top.markup}</g>`,
    `<g transform="translate(${(64 - bottom.width) / 2} 31)">${bottom.markup}</g>`,
    `<rect x="12" y="56" width="40" height="4" rx="2" fill="${colors.red}"/>`,
  ].join(""));
}

function buildFlagSvg() {
  return iconSvg([
    `<rect width="64" height="64" rx="9" fill="${colors.black}"/>`,
    `<rect x="8" y="9" width="17" height="35" rx="2.5" fill="${colors.red}"/>`,
    `<rect x="29" y="10" width="27" height="7" rx="1.8" fill="${colors.offWhite}"/>`,
    `<rect x="29" y="25" width="27" height="7" rx="1.8" fill="${colors.offWhite}"/>`,
    `<rect x="29" y="40" width="27" height="7" rx="1.8" fill="${colors.offWhite}"/>`,
    `<rect x="8" y="52" width="48" height="5.5" rx="2.75" fill="${colors.offWhite}"/>`,
  ].join(""));
}

function buildCompassSvg() {
  return iconSvg([
    `<rect width="64" height="64" rx="9" fill="${colors.navy}"/>`,
    `<path d="M32 7L39 26L57 32L39 38L32 57L25 38L7 32L25 26Z" fill="${colors.offWhite}"/>`,
    `<path d="M32 7L39 26L32 23L25 26Z" fill="${colors.red}"/>`,
    `<circle cx="32" cy="32" r="5.5" fill="${colors.navy}"/>`,
  ].join(""));
}

function iconSvg(content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="USA Missionaries favicon concept">${content}</svg>\n`;
}

function buildLargeComparisonSvg() {
  const columns = concepts.map((concept, index) => {
    const x = 104 + index * 278;

    return [
      `<g transform="translate(${x} 54)">`,
      svgImage(concept.svg, 0, 0, 192),
      `<text x="96" y="238" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" fill="${colors.black}">${concept.label}</text>`,
      `<text x="96" y="268" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="600" fill="${colors.muted}">${concept.note}</text>`,
      "</g>",
    ].join("");
  }).join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="860" height="360" viewBox="0 0 860 360">`,
    `<rect width="860" height="360" fill="${colors.panel}"/>`,
    columns,
    "</svg>",
  ].join("");
}

function buildScaleComparisonSvg() {
  const header = concepts.map((concept, index) => {
    const x = 220 + index * 200;

    return `<text x="${x}" y="38" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="700" fill="${colors.black}">${concept.label.replace(/^[0-9]+\\. /, "")}</text>`;
  }).join("");

  const rows = [
    { label: "16px", size: 16, y: 96 },
    { label: "32px", size: 32, y: 208 },
    { label: "64px", size: 64, y: 328 },
  ];

  const cells = rows.map((row) => {
    const label = `<text x="72" y="${row.y + 6}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="${colors.black}">${row.label}</text>`;
    const icons = concepts.map((concept, index) => {
      const centerX = 220 + index * 200;
      const iconX = centerX - row.size / 2;
      const iconY = row.y - row.size / 2;

      return [
        `<rect x="${centerX - 52}" y="${row.y - 52}" width="104" height="104" rx="8" fill="#FFFFFF"/>`,
        `<rect x="${centerX - 51}" y="${row.y - 51}" width="102" height="102" rx="7" fill="#F7F5EF"/>`,
        svgImage(concept.svg, iconX, iconY, row.size),
      ].join("");
    }).join("");

    return label + icons;
  }).join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="400" viewBox="0 0 760 400">`,
    `<rect width="760" height="400" fill="${colors.panel}"/>`,
    header,
    cells,
    "</svg>",
  ].join("");
}

function svgImage(svg, x, y, size) {
  return `<image x="${x}" y="${y}" width="${size}" height="${size}" href="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}"/>`;
}

function blockLetters(text, cellSize, letterGap) {
  const glyphs = {
    A: ["010", "101", "111", "101", "101"],
    M: ["101", "111", "111", "101", "101"],
    S: ["111", "100", "111", "001", "111"],
    U: ["101", "101", "101", "101", "111"],
  };
  let x = 0;
  let markup = "";

  for (const [index, letter] of [...text].entries()) {
    const glyph = glyphs[letter];

    for (let row = 0; row < glyph.length; row += 1) {
      for (let column = 0; column < glyph[row].length; column += 1) {
        if (glyph[row][column] === "1") {
          markup += `<rect x="${round(x + column * cellSize)}" y="${round(row * cellSize)}" width="${round(cellSize * 0.9)}" height="${round(cellSize * 0.9)}" rx="${round(cellSize * 0.18)}" fill="${colors.offWhite}"/>`;
        }
      }
    }

    x += glyph[0].length * cellSize + (index === text.length - 1 ? 0 : letterGap);
  }

  return {
    markup,
    width: x,
  };
}

function round(value) {
  return Number(value.toFixed(2));
}

async function writePng(filename, svg) {
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  writeFileSync(path.join(reviewDir, filename), png);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
