/**
 * Generates every favicon/app-icon file under `public/favicons/<brand>/` from the
 * mark definitions in `brand-icons.mjs`.
 *
 *   node scripts/brand/build-favicons.mjs
 *
 * Outputs per brand:
 *   favicon.svg            circular emblem, transparent (modern browsers)
 *   favicon.ico            16/32/48 circular emblem (legacy + bookmarks)
 *   favicon-16/32/48.png   circular emblem
 *   icon-192/512.png       circular emblem, PWA purpose "any"
 *   icon-maskable-512.png  full-bleed brand field, PWA purpose "maskable"
 *   apple-touch-icon.png   180px full-bleed brand field (iOS adds its own mask)
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { brandIcons } from "./brand-icons.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const faviconsRoot = join(repoRoot, "public", "favicons");

async function png(svgMarkup, size) {
  return sharp(Buffer.from(svgMarkup), { density: 384 })
    .resize(size, size, { fit: "contain" })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
}

/**
 * Minimal ICO writer: an ICO is a small directory header followed by embedded
 * PNGs, which is what every browser we care about reads.
 */
function ico(entries) {
  const header = Buffer.alloc(6 + entries.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);

  let offset = header.length;

  entries.forEach(({ data, size }, index) => {
    const directory = 6 + index * 16;
    header.writeUInt8(size >= 256 ? 0 : size, directory);
    header.writeUInt8(size >= 256 ? 0 : size, directory + 1);
    header.writeUInt8(0, directory + 2);
    header.writeUInt8(0, directory + 3);
    header.writeUInt16LE(1, directory + 4);
    header.writeUInt16LE(32, directory + 6);
    header.writeUInt32LE(data.length, directory + 8);
    header.writeUInt32LE(offset, directory + 12);
    offset += data.length;
  });

  return Buffer.concat([header, ...entries.map((entry) => entry.data)]);
}

async function buildBrand(brand) {
  const outDir = join(faviconsRoot, brand.dir);
  await mkdir(outDir, { recursive: true });

  const emblem = brand.emblem();
  const written = [];

  async function emit(name, data) {
    await writeFile(join(outDir, name), data);
    written.push(`${name} (${(data.length / 1024).toFixed(1)} kB)`);
  }

  await emit("favicon.svg", Buffer.from(emblem));

  const emblemSizes = [16, 32, 48, 192, 512];
  const rasters = new Map();

  for (const size of emblemSizes) {
    rasters.set(size, await png(emblem, size));
  }

  await emit("favicon-16x16.png", rasters.get(16));
  await emit("favicon-32x32.png", rasters.get(32));
  await emit("favicon-48x48.png", rasters.get(48));
  await emit("icon-192.png", rasters.get(192));
  await emit("icon-512.png", rasters.get(512));
  await emit(
    "favicon.ico",
    ico([16, 32, 48].map((size) => ({ data: rasters.get(size), size }))),
  );

  await emit("apple-touch-icon.png", await png(brand.appleSquare(), 180));
  await emit("icon-maskable-512.png", await png(brand.maskableSquare(), 512));

  for (const manifest of brand.manifests) {
    await emit(
      manifest.file,
      Buffer.from(`${JSON.stringify(
        {
          background_color: brand.backgroundColor,
          display: "standalone",
          icons: [
            {
              purpose: "any",
              sizes: "192x192",
              src: `/favicons/${brand.dir}/icon-192.png`,
              type: "image/png",
            },
            {
              purpose: "any",
              sizes: "512x512",
              src: `/favicons/${brand.dir}/icon-512.png`,
              type: "image/png",
            },
            {
              purpose: "maskable",
              sizes: "512x512",
              src: `/favicons/${brand.dir}/icon-maskable-512.png`,
              type: "image/png",
            },
          ],
          name: brand.webAppName,
          scope: manifest.scope,
          short_name: brand.shortName,
          start_url: manifest.startUrl,
          theme_color: brand.themeColor,
        },
        null,
        2,
      )}\n`),
    );
  }

  console.log(`${brand.dir}\n  ${written.join("\n  ")}`);
}

for (const brand of brandIcons) {
  await buildBrand(brand);
}
