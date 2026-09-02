/**
 * Generates the standard 1200x630 social preview image for each brand into
 * `public/images/share/`.
 *
 *   node scripts/brand/build-share-images.mjs
 *
 * Every brand gets an exact 1.91:1 asset so Open Graph and Twitter previews frame
 * the same way everywhere instead of being cropped differently per platform.
 * Source material is existing approved brand art: the USAM field photo, the
 * Kitchen Table photo, and, for the brands with no approved landscape photo, a
 * typographic plate on the brand's own field.
 *
 * Mission of Reconciliation's plate is rendered in a headless browser rather
 * than by sharp, because its wordmark is set in Oswald and librsvg only sees
 * fonts installed on the machine. The browser loads the same Google Fonts the
 * live site does, so the card matches the page it represents.
 */
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";
import { brandIcons } from "./brand-icons.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const publicDir = join(repoRoot, "public");
const outDir = join(publicDir, "images", "share");

const SIZE = { height: 630, width: 1200 };

/** Crop an approved photo to the social aspect ratio. JPEG keeps photos light
 * enough for link unfurlers, which drop images over a few megabytes. */
async function fromPhoto(source) {
  return sharp(join(publicDir, source))
    .resize({ ...SIZE, fit: "cover", position: "centre" })
    .jpeg({ mozjpeg: true, quality: 84 })
    .toBuffer();
}

/** DOS: the emblem centered on its own blue field. */
async function dosPlate() {
  const emblem = brandIcons.find((brand) => brand.dir === "dos").emblemBody();
  const plate = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE.width}" height="${SIZE.height}" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="plate" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#F5F9FF"/>
      <stop offset="1" stop-color="#E4EEFF"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#plate)"/>
  <svg x="443" y="158" width="314" height="314" viewBox="0 0 64 64">${emblem}</svg>
</svg>`;

  return sharp(Buffer.from(plate), { density: 300 })
    .resize(SIZE.width, SIZE.height)
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * Mission of Reconciliation: the site's own cream field, condensed black
 * wordmark, and restrained gold accent. Deliberately typographic so it never
 * reads as the USA Missionaries field photo in a link unfurl.
 */
async function missionPlate() {
  const emblem = brandIcons.find((brand) => brand.dir === "mission-of-reconciliation").emblemBody();
  const html = `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;600&family=Rajdhani:wght@600;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; background: #FCFAF6; font-family: Inter, system-ui, sans-serif;
         display: flex; flex-direction: column; justify-content: center; padding: 0 86px; }
  .eyebrow { font-family: Rajdhani, sans-serif; font-weight: 700; font-size: 21px; letter-spacing: 0.24em;
             text-transform: uppercase; color: #7C6423; }
  h1 { font-family: Oswald, sans-serif; font-weight: 600; font-size: 104px; line-height: 0.98;
       letter-spacing: 0; color: #15120C; margin-top: 30px; max-width: 900px; }
  .tagline { font-family: Oswald, sans-serif; font-weight: 400; font-size: 44px; color: #7C6423; margin-top: 26px; }
  .rule { width: 128px; height: 5px; background: #C2A14E; margin-top: 44px; }
  .mark { position: absolute; top: 74px; right: 86px; width: 108px; height: 108px; }
</style></head>
<body>
  <svg class="mark" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">${emblem}</svg>
  <p class="eyebrow">In partnership with USA Missionaries</p>
  <h1>Mission of Reconciliation</h1>
  <p class="tagline">People coming alongside people.</p>
  <div class="rule"></div>
</body></html>`;

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: SIZE, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const shot = await page.screenshot({ type: "png" });
  await browser.close();

  return sharp(shot).resize(SIZE.width, SIZE.height).png({ compressionLevel: 9 }).toBuffer();
}

const cards = [
  { file: "usam.jpg", render: () => fromPhoto("images/usam/default-hero-background.png") },
  { file: "dos.png", render: dosPlate },
  { file: "kitchen-table-gospel.jpg", render: () => fromPhoto("images/vision/kitchen-table-01.jpg") },
  { file: "mission-of-reconciliation.png", render: missionPlate },
];

await mkdir(outDir, { recursive: true });

for (const card of cards) {
  const data = await card.render();
  await sharp(data).toFile(join(outDir, card.file));
  const { height, width } = await sharp(join(outDir, card.file)).metadata();
  console.log(`${card.file}  ${width}x${height}  ${(data.length / 1024).toFixed(0)} kB`);
}
