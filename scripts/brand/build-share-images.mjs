/**
 * Generates the standard 1200x630 social preview image for each brand into
 * `public/images/share/`.
 *
 *   node scripts/brand/build-share-images.mjs
 *
 * Every brand gets an exact 1.91:1 asset so Open Graph and Twitter previews frame
 * the same way everywhere instead of being cropped differently per platform.
 * Source material is existing approved brand art: the USAM field photo, the
 * Kitchen Table photo, and — for DOS, which has no approved landscape photo — the
 * DOS emblem on the DOS blue field.
 */
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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

const cards = [
  { file: "usam.jpg", render: () => fromPhoto("images/usam/default-hero-background.png") },
  { file: "dos.png", render: dosPlate },
  { file: "kitchen-table-gospel.jpg", render: () => fromPhoto("images/vision/kitchen-table-01.jpg") },
];

await mkdir(outDir, { recursive: true });

for (const card of cards) {
  const data = await card.render();
  await sharp(data).toFile(join(outDir, card.file));
  const { height, width } = await sharp(join(outDir, card.file)).metadata();
  console.log(`${card.file}  ${width}x${height}  ${(data.length / 1024).toFixed(0)} kB`);
}
