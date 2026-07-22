import { mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(repoRoot, "public");
const faviconsDir = path.join(publicDir, "favicons");

const colors = {
  black: "#0D0D0D",
  cream: "#F5F5F4",
  dosBlue: "#378ADD",
  dosNavy: "#070D14",
  gold: "#C2A14E",
  stone: "#A8A29E",
  white: "#FFFFFF",
};

const glyphs = {
  "1": ["010", "110", "010", "010", "111"],
  "2": ["111", "001", "111", "100", "111"],
  "3": ["111", "001", "111", "001", "111"],
  "4": ["101", "101", "111", "001", "001"],
  "6": ["111", "100", "111", "101", "111"],
  A: ["111", "101", "111", "101", "101"],
  D: ["110", "101", "101", "101", "110"],
  G: ["111", "100", "101", "101", "111"],
  K: ["101", "110", "100", "110", "101"],
  M: ["101", "111", "111", "101", "101"],
  O: ["111", "101", "101", "101", "111"],
  S: ["111", "100", "111", "001", "111"],
  T: ["111", "010", "010", "010", "010"],
  U: ["101", "101", "101", "101", "111"],
};

const pngSizes = [
  ["favicon-16x16.png", 16],
  ["favicon-32x32.png", 32],
  ["favicon-48x48.png", 48],
  ["apple-touch-icon.png", 180],
  ["icon-192.png", 192],
  ["icon-512.png", 512],
];

const sites = [
  {
    backgroundColor: colors.black,
    directory: "usam",
    key: "usam",
    label: "USAM",
    name: "USA Missionaries",
    render: drawUsamIcon,
    shortName: "USAM",
    svg: usamSvg,
    themeColor: colors.black,
  },
  {
    backgroundColor: colors.dosNavy,
    directory: "dos",
    key: "dos",
    label: "DOS",
    name: "Discipleship Operating System",
    render: drawDosIcon,
    shortName: "DOS",
    svg: dosSvg,
    themeColor: colors.dosNavy,
  },
  {
    backgroundColor: colors.cream,
    directory: "kitchen-table-gospel",
    key: "kitchen-table-gospel",
    label: "KTG",
    name: "Kitchen Table Gospel",
    render: drawKitchenTableGospelIcon,
    shortName: "KTG",
    svg: kitchenTableGospelSvg,
    themeColor: colors.gold,
  },
];

function main() {
  for (const site of sites) {
    const siteDir = path.join(faviconsDir, site.directory);
    mkdirSync(siteDir, { recursive: true });

    writeFileSync(path.join(siteDir, "favicon.svg"), site.svg());

    const icoImages = [];

    for (const [filename, size] of pngSizes) {
      const image = renderIcon(site, size);
      const png = encodePng(size, size, image);
      writeFileSync(path.join(siteDir, filename), png);

      if (filename.startsWith("favicon-")) {
        icoImages.push({ png, size });
      }
    }

    writeFileSync(path.join(siteDir, "favicon.ico"), encodeIco(icoImages));
    writeFileSync(
      path.join(siteDir, "site.webmanifest"),
      `${JSON.stringify(buildManifest(site, `/favicons/${site.directory}`, "/"), null, 2)}\n`,
    );
  }

  for (const filename of [
    "apple-touch-icon.png",
    "favicon-16x16.png",
    "favicon-32x32.png",
    "favicon-48x48.png",
    "favicon.ico",
    "favicon.svg",
    "icon-192.png",
    "icon-512.png",
  ]) {
    copyFileSync(path.join(faviconsDir, "usam", filename), path.join(publicDir, filename));
  }

  const usamSite = sites.find((site) => site.key === "usam");
  const dosSite = sites.find((site) => site.key === "dos");

  writeFileSync(
    path.join(publicDir, "site.webmanifest"),
    `${JSON.stringify(buildManifest(usamSite, "", "/"), null, 2)}\n`,
  );

  writeFileSync(
    path.join(publicDir, "dos.webmanifest"),
    `${JSON.stringify(buildManifest(dosSite, "/favicons/dos", "/dos"), null, 2)}\n`,
  );

  writeReviewImages();
}

function buildManifest(site, iconBasePath, startUrl) {
  return {
    name: site.name,
    short_name: site.shortName,
    start_url: startUrl,
    display: "standalone",
    background_color: site.backgroundColor,
    theme_color: site.themeColor,
    icons: [
      {
        src: `${iconBasePath}/icon-192.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: `${iconBasePath}/icon-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };
}

function renderIcon(site, size) {
  const viewBox = site.key === "dos" ? 52 : 64;
  const canvas = new VectorCanvas(size, size, viewBox, viewBox, 4);
  site.render(canvas);
  return canvas.toRgba();
}

function drawUsamIcon(canvas) {
  canvas.roundedRect(0, 0, 64, 64, 9, colors.white);
  canvas.roundedRect(4, 4, 56, 56, 6, colors.black);
  canvas.rect(17, 30.9, 30, 2.3, colors.gold);
  drawCenteredText(canvas, "US", 32, 8.7, 4.55, colors.white, 3.8);
  drawCenteredText(canvas, "AM", 32, 34.4, 4.55, colors.white, 3.8);
}

function drawDosIcon(canvas) {
  canvas.rect(0, 0, 52, 52, colors.dosNavy);
  canvas.circle(26, 26, 4.5, colors.dosBlue);
  canvas.ring(26, 26, 11, 3.5, colors.white);
  canvas.arcStroke(26, 26, 18, 3.5, 35.015, 324.985, colors.white);
}

function drawKitchenTableGospelIcon(canvas) {
  canvas.roundedRect(0, 0, 64, 64, 9, colors.black);
  canvas.roundedRect(4, 4, 56, 56, 7, colors.cream);
  canvas.roundedRect(10, 17, 44, 12, 4, colors.gold);
  canvas.rect(13, 29, 38, 4.6, colors.black);
  canvas.rect(18, 32.5, 7.5, 19.5, colors.black);
  canvas.rect(38.5, 32.5, 7.5, 19.5, colors.black);
  canvas.roundedRect(15, 50, 34, 4, 2, colors.gold);
}

function usamSvg() {
  const glyphs = [
    ...glyphRects("US", 32 - textWidth("US", 4.55, 3.8) / 2, 8.7, 4.55, 3.8, colors.white),
    ...glyphRects("AM", 32 - textWidth("AM", 4.55, 3.8) / 2, 34.4, 4.55, 3.8, colors.white),
  ].join("");

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="USA Missionaries">',
    `<rect width="64" height="64" rx="9" fill="${colors.white}"/>`,
    `<rect x="4" y="4" width="56" height="56" rx="6" fill="${colors.black}"/>`,
    `<rect x="17" y="30.9" width="30" height="2.3" fill="${colors.gold}"/>`,
    glyphs,
    "</svg>\n",
  ].join("");
}

function dosSvg() {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" fill="none" role="img" aria-label="Discipleship Operating System">',
    `<rect width="52" height="52" fill="${colors.dosNavy}"/>`,
    '<circle cx="26" cy="26" r="4.5" fill="#378ADD"/>',
    '<circle cx="26" cy="26" r="11" stroke="#FFFFFF" stroke-width="3.5" fill="none"/>',
    '<path d="M40.7 36.3 A18 18 0 1 1 40.7 15.7" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round"/>',
    "</svg>\n",
  ].join("");
}

function kitchenTableGospelSvg() {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Kitchen Table Gospel">',
    `<rect width="64" height="64" rx="9" fill="${colors.black}"/>`,
    `<rect x="4" y="4" width="56" height="56" rx="7" fill="${colors.cream}"/>`,
    `<rect x="10" y="17" width="44" height="12" rx="4" fill="${colors.gold}"/>`,
    `<rect x="13" y="29" width="38" height="4.6" fill="${colors.black}"/>`,
    `<rect x="18" y="32.5" width="7.5" height="19.5" fill="${colors.black}"/>`,
    `<rect x="38.5" y="32.5" width="7.5" height="19.5" fill="${colors.black}"/>`,
    `<rect x="15" y="50" width="34" height="4" rx="2" fill="${colors.gold}"/>`,
    "</svg>\n",
  ].join("");
}

function writeReviewImages() {
  const reviewDir = path.join(faviconsDir, "review");
  mkdirSync(reviewDir, { recursive: true });

  const brandCanvas = new VectorCanvas(1040, 360, 1040, 360, 1);
  brandCanvas.rect(0, 0, 1040, 360, "#EDEAE3");
  [170, 424, 678].forEach((x, index) => {
    const site = sites[index];
    const image = renderIcon(site, 192);
    brandCanvas.blit(image, 192, 192, x, 56);
    drawCenteredText(brandCanvas, site.label, x + 96, 282, 8, colors.black, 5);
  });
  writeFileSync(path.join(reviewDir, "brand-comparison.png"), encodePng(1040, 360, brandCanvas.toRgba()));

  const scaleCanvas = new VectorCanvas(760, 360, 760, 360, 1);
  scaleCanvas.rect(0, 0, 760, 360, "#EDEAE3");
  const columns = [
    { site: sites[0], x: 190 },
    { site: sites[1], x: 380 },
    { site: sites[2], x: 570 },
  ];
  const rows = [
    { label: "16", size: 16, y: 76 },
    { label: "32", size: 32, y: 168 },
    { label: "64", size: 64, y: 276 },
  ];

  for (const column of columns) {
    drawCenteredText(scaleCanvas, column.site.label, column.x, 30, 6, colors.black, 4);
  }

  for (const row of rows) {
    drawCenteredText(scaleCanvas, row.label, 72, row.y - 9, 6, colors.black, 4);
    for (const column of columns) {
      scaleCanvas.roundedRect(column.x - 48, row.y - 48, 96, 96, 6, "#FFFFFF");
      scaleCanvas.roundedRect(column.x - 47, row.y - 47, 94, 94, 5, "#F7F5EF");
      const image = renderIcon(column.site, row.size);
      scaleCanvas.blit(image, row.size, row.size, column.x - row.size / 2, row.y - row.size / 2);
    }
  }
  writeFileSync(path.join(reviewDir, "scale-comparison.png"), encodePng(760, 360, scaleCanvas.toRgba()));
}

class VectorCanvas {
  constructor(outputWidth, outputHeight, viewBoxWidth, viewBoxHeight, sampleRate) {
    this.outputWidth = outputWidth;
    this.outputHeight = outputHeight;
    this.viewBoxWidth = viewBoxWidth;
    this.viewBoxHeight = viewBoxHeight;
    this.sampleRate = sampleRate;
    this.width = outputWidth * sampleRate;
    this.height = outputHeight * sampleRate;
    this.data = new Uint8ClampedArray(this.width * this.height * 4);
  }

  rect(x, y, width, height, color) {
    this.fillShape(x, y, width, height, color, (px, py) => (
      px >= x && px <= x + width && py >= y && py <= y + height
    ));
  }

  roundedRect(x, y, width, height, radius, color) {
    const r = Math.min(radius, width / 2, height / 2);
    this.fillShape(x, y, width, height, color, (px, py) => {
      if (px < x || px > x + width || py < y || py > y + height) {
        return false;
      }

      const cx = px < x + r ? x + r : px > x + width - r ? x + width - r : px;
      const cy = py < y + r ? y + r : py > y + height - r ? y + height - r : py;

      return (px - cx) ** 2 + (py - cy) ** 2 <= r ** 2;
    });
  }

  circle(cx, cy, radius, color) {
    this.fillShape(cx - radius, cy - radius, radius * 2, radius * 2, color, (px, py) => (
      (px - cx) ** 2 + (py - cy) ** 2 <= radius ** 2
    ));
  }

  ring(cx, cy, radius, strokeWidth, color) {
    const outer = radius + strokeWidth / 2;
    const inner = radius - strokeWidth / 2;
    this.fillShape(cx - outer, cy - outer, outer * 2, outer * 2, color, (px, py) => {
      const distance = Math.hypot(px - cx, py - cy);

      return distance >= inner && distance <= outer;
    });
  }

  arcStroke(cx, cy, radius, strokeWidth, startDegrees, endDegrees, color) {
    const outer = radius + strokeWidth / 2;
    const inner = radius - strokeWidth / 2;
    const start = degreesToRadians(startDegrees);
    const end = degreesToRadians(endDegrees);

    this.fillShape(cx - outer, cy - outer, outer * 2, outer * 2, color, (px, py) => {
      const distance = Math.hypot(px - cx, py - cy);

      if (distance < inner || distance > outer) {
        return false;
      }

      let angle = Math.atan2(py - cy, px - cx);

      if (angle < 0) {
        angle += Math.PI * 2;
      }

      return angle >= start && angle <= end;
    });

    this.circle(cx + Math.cos(start) * radius, cy + Math.sin(start) * radius, strokeWidth / 2, color);
    this.circle(cx + Math.cos(end) * radius, cy + Math.sin(end) * radius, strokeWidth / 2, color);
  }

  fillShape(x, y, width, height, color, includesPoint) {
    const rgba = hexToRgba(color);
    const minX = Math.max(0, Math.floor((x / this.viewBoxWidth) * this.width) - 1);
    const maxX = Math.min(this.width - 1, Math.ceil(((x + width) / this.viewBoxWidth) * this.width) + 1);
    const minY = Math.max(0, Math.floor((y / this.viewBoxHeight) * this.height) - 1);
    const maxY = Math.min(this.height - 1, Math.ceil(((y + height) / this.viewBoxHeight) * this.height) + 1);

    for (let py = minY; py <= maxY; py += 1) {
      const viewY = ((py + 0.5) / this.height) * this.viewBoxHeight;

      for (let px = minX; px <= maxX; px += 1) {
        const viewX = ((px + 0.5) / this.width) * this.viewBoxWidth;

        if (includesPoint(viewX, viewY)) {
          this.blendPixel(px, py, rgba);
        }
      }
    }
  }

  blendPixel(x, y, [red, green, blue, alpha]) {
    const index = (y * this.width + x) * 4;
    const sourceAlpha = alpha / 255;
    const destinationAlpha = this.data[index + 3] / 255;
    const outputAlpha = sourceAlpha + destinationAlpha * (1 - sourceAlpha);

    if (outputAlpha === 0) {
      return;
    }

    this.data[index] = Math.round((red * sourceAlpha + this.data[index] * destinationAlpha * (1 - sourceAlpha)) / outputAlpha);
    this.data[index + 1] = Math.round((green * sourceAlpha + this.data[index + 1] * destinationAlpha * (1 - sourceAlpha)) / outputAlpha);
    this.data[index + 2] = Math.round((blue * sourceAlpha + this.data[index + 2] * destinationAlpha * (1 - sourceAlpha)) / outputAlpha);
    this.data[index + 3] = Math.round(outputAlpha * 255);
  }

  blit(source, sourceWidth, sourceHeight, targetX, targetY) {
    const startX = Math.round(targetX * this.sampleRate);
    const startY = Math.round(targetY * this.sampleRate);

    for (let y = 0; y < sourceHeight; y += 1) {
      for (let x = 0; x < sourceWidth; x += 1) {
        const destinationX = startX + x * this.sampleRate;
        const destinationY = startY + y * this.sampleRate;

        if (destinationX < 0 || destinationY < 0 || destinationX >= this.width || destinationY >= this.height) {
          continue;
        }

        const sourceIndex = (y * sourceWidth + x) * 4;
        const destinationIndex = (destinationY * this.width + destinationX) * 4;
        this.data[destinationIndex] = source[sourceIndex];
        this.data[destinationIndex + 1] = source[sourceIndex + 1];
        this.data[destinationIndex + 2] = source[sourceIndex + 2];
        this.data[destinationIndex + 3] = source[sourceIndex + 3];
      }
    }
  }

  toRgba() {
    if (this.sampleRate === 1) {
      return this.data;
    }

    const output = new Uint8ClampedArray(this.outputWidth * this.outputHeight * 4);
    const sampleArea = this.sampleRate * this.sampleRate;

    for (let y = 0; y < this.outputHeight; y += 1) {
      for (let x = 0; x < this.outputWidth; x += 1) {
        const totals = [0, 0, 0, 0];

        for (let sy = 0; sy < this.sampleRate; sy += 1) {
          for (let sx = 0; sx < this.sampleRate; sx += 1) {
            const sourceX = x * this.sampleRate + sx;
            const sourceY = y * this.sampleRate + sy;
            const sourceIndex = (sourceY * this.width + sourceX) * 4;
            totals[0] += this.data[sourceIndex];
            totals[1] += this.data[sourceIndex + 1];
            totals[2] += this.data[sourceIndex + 2];
            totals[3] += this.data[sourceIndex + 3];
          }
        }

        const outputIndex = (y * this.outputWidth + x) * 4;
        output[outputIndex] = Math.round(totals[0] / sampleArea);
        output[outputIndex + 1] = Math.round(totals[1] / sampleArea);
        output[outputIndex + 2] = Math.round(totals[2] / sampleArea);
        output[outputIndex + 3] = Math.round(totals[3] / sampleArea);
      }
    }

    return output;
  }
}

function drawCenteredText(canvas, text, centerX, y, cellSize, color, gap = cellSize) {
  drawBlockText(canvas, text, centerX - textWidth(text, cellSize, gap) / 2, y, cellSize, color, gap);
}

function drawBlockText(canvas, text, x, y, cellSize, color, gap = cellSize) {
  let cursorX = x;

  for (const character of text) {
    const pattern = glyphs[character];

    if (!pattern) {
      cursorX += cellSize + gap;
      continue;
    }

    for (let row = 0; row < pattern.length; row += 1) {
      for (let column = 0; column < pattern[row].length; column += 1) {
        if (pattern[row][column] === "1") {
          canvas.rect(
            cursorX + column * cellSize,
            y + row * cellSize,
            cellSize * 0.88,
            cellSize * 0.88,
            color,
          );
        }
      }
    }

    cursorX += pattern[0].length * cellSize + gap;
  }
}

function glyphRects(text, x, y, cellSize, gap, color) {
  const rects = [];
  let cursorX = x;

  for (const character of text) {
    const pattern = glyphs[character];

    for (let row = 0; row < pattern.length; row += 1) {
      for (let column = 0; column < pattern[row].length; column += 1) {
        if (pattern[row][column] === "1") {
          rects.push(`<rect x="${round(cursorX + column * cellSize)}" y="${round(y + row * cellSize)}" width="${round(cellSize * 0.88)}" height="${round(cellSize * 0.88)}" fill="${color}"/>`);
        }
      }
    }

    cursorX += pattern[0].length * cellSize + gap;
  }

  return rects;
}

function textWidth(text, cellSize, gap = cellSize) {
  return [...text].reduce((width, character, index) => {
    const pattern = glyphs[character];
    const characterWidth = pattern ? pattern[0].length * cellSize : cellSize;

    return width + characterWidth + (index === text.length - 1 ? 0 : gap);
  }, 0);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const raw = Buffer.alloc((width * 4 + 1) * height);

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(raw, rowStart + 1);
  }

  return Buffer.concat([
    signature,
    pngChunk("IHDR", Buffer.concat([
      uint32be(width),
      uint32be(height),
      Buffer.from([8, 6, 0, 0, 0]),
    ])),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function encodeIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const entries = [];
  let offset = 6 + images.length * 16;

  for (const image of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(image.size >= 256 ? 0 : image.size, 0);
    entry.writeUInt8(image.size >= 256 ? 0 : image.size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(image.png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += image.png.length;
  }

  return Buffer.concat([header, ...entries, ...images.map((image) => image.png)]);
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const content = Buffer.concat([typeBuffer, data]);

  return Buffer.concat([
    uint32be(data.length),
    content,
    uint32be(crc32(content)),
  ]);
}

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  }

  return (crc ^ 0xffffffff) >>> 0;
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  return value >>> 0;
});

function uint32be(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0, 0);

  return buffer;
}

function hexToRgba(hex) {
  const normalized = hex.replace("#", "");

  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
    255,
  ];
}

function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function round(value) {
  return Number.parseFloat(value.toFixed(3));
}

main();
