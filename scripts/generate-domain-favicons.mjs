import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { deflateSync } from "node:zlib";

const outputRoot = "public";
const faviconRoot = join(outputRoot, "favicons");
const sizes = [16, 32, 48, 180, 192, 512];

const colors = {
  black: "#0D0D0D",
  cream: "#F5F5F4",
  dosBackground: "#070D14",
  dosBlue: "#378ADD",
  dosNavy: "#0A1622",
  gold: "#C2A14E",
  white: "#FFFFFF",
};

const brands = [
  {
    key: "usam",
    name: "USA Missionaries",
    shortName: "USAM",
    backgroundColor: colors.black,
    themeColor: colors.gold,
    render: renderUsam,
    svg: usamSvg,
  },
  {
    key: "dos",
    name: "Discipleship Operating System",
    shortName: "DOS",
    backgroundColor: colors.dosBackground,
    themeColor: colors.dosNavy,
    render: renderDos,
    svg: dosSvg,
  },
  {
    key: "kitchen-table-gospel",
    name: "Kitchen Table Gospel",
    shortName: "KTG",
    backgroundColor: colors.cream,
    themeColor: colors.gold,
    render: renderKitchenTableGospel,
    svg: kitchenTableGospelSvg,
  },
];

function hexToRgba(hex, alpha = 255) {
  const value = hex.replace("#", "");
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
    alpha,
  ];
}

function createCanvas(width, heightOrBackground, maybeBackground) {
  const height = typeof heightOrBackground === "number" ? heightOrBackground : width;
  const background = typeof heightOrBackground === "number" ? maybeBackground : heightOrBackground;
  const data = Buffer.alloc(width * height * 4);
  const color = hexToRgba(background);

  for (let i = 0; i < data.length; i += 4) {
    data[i] = color[0];
    data[i + 1] = color[1];
    data[i + 2] = color[2];
    data[i + 3] = color[3];
  }

  return { data, height, size: width, width };
}

function setPixel(canvas, x, y, rgba) {
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) {
    return;
  }

  const i = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;
  canvas.data[i] = rgba[0];
  canvas.data[i + 1] = rgba[1];
  canvas.data[i + 2] = rgba[2];
  canvas.data[i + 3] = rgba[3];
}

function drawRect(canvas, x, y, width, height, color) {
  const rgba = hexToRgba(color);
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(canvas.width, Math.ceil(x + width));
  const y1 = Math.min(canvas.height, Math.ceil(y + height));

  for (let py = y0; py < y1; py += 1) {
    for (let px = x0; px < x1; px += 1) {
      setPixel(canvas, px, py, rgba);
    }
  }
}

function drawRoundedRect(canvas, x, y, width, height, radius, color) {
  const rgba = hexToRgba(color);
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(canvas.width, Math.ceil(x + width));
  const y1 = Math.min(canvas.height, Math.ceil(y + height));
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));

  for (let py = y0; py < y1; py += 1) {
    for (let px = x0; px < x1; px += 1) {
      const cx = px + 0.5;
      const cy = py + 0.5;
      const nearestX = Math.max(x + r, Math.min(cx, x + width - r));
      const nearestY = Math.max(y + r, Math.min(cy, y + height - r));
      if ((cx - nearestX) ** 2 + (cy - nearestY) ** 2 <= r ** 2) {
        setPixel(canvas, px, py, rgba);
      }
    }
  }
}

function drawCircle(canvas, cx, cy, radius, color) {
  const rgba = hexToRgba(color);
  const r2 = radius * radius;
  const x0 = Math.max(0, Math.floor(cx - radius));
  const y0 = Math.max(0, Math.floor(cy - radius));
  const x1 = Math.min(canvas.width, Math.ceil(cx + radius));
  const y1 = Math.min(canvas.height, Math.ceil(cy + radius));

  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r2) {
        setPixel(canvas, x, y, rgba);
      }
    }
  }
}

function drawCircleStroke(canvas, cx, cy, radius, strokeWidth, color) {
  const rgba = hexToRgba(color);
  const outer = radius + strokeWidth / 2;
  const inner = Math.max(0, radius - strokeWidth / 2);
  const outer2 = outer * outer;
  const inner2 = inner * inner;
  const x0 = Math.max(0, Math.floor(cx - outer));
  const y0 = Math.max(0, Math.floor(cy - outer));
  const x1 = Math.min(canvas.width, Math.ceil(cx + outer));
  const y1 = Math.min(canvas.height, Math.ceil(cy + outer));

  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const d2 = (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2;

      if (d2 >= inner2 && d2 <= outer2) {
        setPixel(canvas, x, y, rgba);
      }
    }
  }
}

function drawArcStroke(canvas, cx, cy, radius, startDeg, endDeg, strokeWidth, color) {
  const rgba = hexToRgba(color);
  const outer = radius + strokeWidth / 2;
  const inner = Math.max(0, radius - strokeWidth / 2);
  const outer2 = outer * outer;
  const inner2 = inner * inner;
  const x0 = Math.max(0, Math.floor(cx - outer));
  const y0 = Math.max(0, Math.floor(cy - outer));
  const x1 = Math.min(canvas.width, Math.ceil(cx + outer));
  const y1 = Math.min(canvas.height, Math.ceil(cy + outer));

  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d2 = dx * dx + dy * dy;
      let deg = Math.atan2(dy, dx) * 180 / Math.PI;

      if (deg < 0) {
        deg += 360;
      }

      if (d2 >= inner2 && d2 <= outer2 && deg >= startDeg && deg <= endDeg) {
        setPixel(canvas, x, y, rgba);
      }
    }
  }

  const start = pointOnCircle(cx, cy, radius, startDeg);
  const end = pointOnCircle(cx, cy, radius, endDeg);
  drawCircle(canvas, start.x, start.y, strokeWidth / 2, color);
  drawCircle(canvas, end.x, end.y, strokeWidth / 2, color);
}

function pointOnCircle(cx, cy, radius, deg) {
  const radians = deg * Math.PI / 180;

  return {
    x: cx + Math.cos(radians) * radius,
    y: cy + Math.sin(radians) * radius,
  };
}

function drawPolygon(canvas, points, color) {
  const rgba = hexToRgba(color);
  const minX = Math.max(0, Math.floor(Math.min(...points.map((point) => point.x))));
  const minY = Math.max(0, Math.floor(Math.min(...points.map((point) => point.y))));
  const maxX = Math.min(canvas.width, Math.ceil(Math.max(...points.map((point) => point.x))));
  const maxY = Math.min(canvas.height, Math.ceil(Math.max(...points.map((point) => point.y))));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (pointInPolygon(x + 0.5, y + 0.5, points)) {
        setPixel(canvas, x, y, rgba);
      }
    }
  }
}

function pointInPolygon(x, y, points) {
  let inside = false;

  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const xi = points[i].x;
    const yi = points[i].y;
    const xj = points[j].x;
    const yj = points[j].y;
    const intersects = ((yi > y) !== (yj > y))
      && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function drawPixelLetter(canvas, pattern, x, y, cell, color) {
  const gap = Math.max(1, Math.round(cell * 0.12));

  pattern.forEach((row, rowIndex) => {
    [...row].forEach((value, columnIndex) => {
      if (value === "1") {
        drawRect(
          canvas,
          x + columnIndex * cell,
          y + rowIndex * cell,
          Math.max(1, cell - gap),
          Math.max(1, cell - gap),
          color,
        );
      }
    });
  });
}

function renderUsam(size) {
  const scale = size / 100;
  const canvas = createCanvas(size, colors.black);
  const letterScale = size / 100;
  const cell = 4.35 * letterScale;
  const leftX = 12.2 * scale;
  const rightX = 53.3 * scale;
  const topY = 12.5 * scale;
  const bottomY = 50.2 * scale;

  drawRoundedRect(canvas, 3.5 * scale, 3.5 * scale, 93 * scale, 93 * scale, 8 * scale, colors.white);
  drawRoundedRect(canvas, 8 * scale, 8 * scale, 84 * scale, 84 * scale, 4 * scale, colors.black);
  drawRect(canvas, 13 * scale, 82 * scale, 74 * scale, 5.8 * scale, colors.gold);

  drawPixelLetter(canvas, letterPatterns.U, leftX, topY, cell, colors.white);
  drawPixelLetter(canvas, letterPatterns.S, rightX, topY, cell, colors.white);
  drawPixelLetter(canvas, letterPatterns.A, leftX, bottomY, cell, colors.white);
  drawPixelLetter(canvas, letterPatterns.M, rightX, bottomY, cell, colors.white);

  return canvas;
}

function renderDos(size) {
  const canvas = createCanvas(size, colors.dosBackground);
  const scale = size / 52;

  drawArcStroke(canvas, 26 * scale, 26 * scale, 18 * scale, 34.9, 325.1, 3.5 * scale, colors.white);
  drawCircleStroke(canvas, 26 * scale, 26 * scale, 11 * scale, 3.5 * scale, colors.white);
  drawCircle(canvas, 26 * scale, 26 * scale, 4.5 * scale, colors.dosBlue);

  return canvas;
}

function renderKitchenTableGospel(size) {
  const scale = size / 100;
  const canvas = createCanvas(size, colors.cream);

  drawRoundedRect(canvas, 5 * scale, 5 * scale, 90 * scale, 90 * scale, 9 * scale, colors.gold);
  drawRoundedRect(canvas, 10 * scale, 10 * scale, 80 * scale, 80 * scale, 5 * scale, colors.cream);
  drawPolygon(canvas, [
    { x: 21 * scale, y: 34 * scale },
    { x: 79 * scale, y: 34 * scale },
    { x: 88 * scale, y: 50 * scale },
    { x: 12 * scale, y: 50 * scale },
  ], colors.gold);
  drawRoundedRect(canvas, 22 * scale, 53 * scale, 56 * scale, 7 * scale, 2 * scale, colors.black);
  drawPolygon(canvas, [
    { x: 25 * scale, y: 59 * scale },
    { x: 39 * scale, y: 59 * scale },
    { x: 35 * scale, y: 85 * scale },
    { x: 29 * scale, y: 85 * scale },
  ], colors.black);
  drawPolygon(canvas, [
    { x: 61 * scale, y: 59 * scale },
    { x: 75 * scale, y: 59 * scale },
    { x: 71 * scale, y: 85 * scale },
    { x: 65 * scale, y: 85 * scale },
  ], colors.black);

  return canvas;
}

const letterPatterns = {
  A: [
    "01110",
    "10001",
    "10001",
    "11111",
    "10001",
    "10001",
    "10001",
  ],
  M: [
    "10001",
    "11011",
    "10101",
    "10101",
    "10001",
    "10001",
    "10001",
  ],
  S: [
    "01111",
    "10000",
    "10000",
    "01110",
    "00001",
    "00001",
    "11110",
  ],
  U: [
    "10001",
    "10001",
    "10001",
    "10001",
    "10001",
    "10001",
    "01110",
  ],
};

function downsample(canvas, targetSize, factor) {
  if (factor === 1) {
    return canvas;
  }

  const output = createCanvas(targetSize, "#000000");
  const samples = factor * factor;

  for (let y = 0; y < targetSize; y += 1) {
    for (let x = 0; x < targetSize; x += 1) {
      const channels = [0, 0, 0, 0];

      for (let sy = 0; sy < factor; sy += 1) {
        for (let sx = 0; sx < factor; sx += 1) {
          const sourceIndex = ((y * factor + sy) * canvas.width + (x * factor + sx)) * 4;
          channels[0] += canvas.data[sourceIndex];
          channels[1] += canvas.data[sourceIndex + 1];
          channels[2] += canvas.data[sourceIndex + 2];
          channels[3] += canvas.data[sourceIndex + 3];
        }
      }

      const targetIndex = (y * output.width + x) * 4;
      output.data[targetIndex] = Math.round(channels[0] / samples);
      output.data[targetIndex + 1] = Math.round(channels[1] / samples);
      output.data[targetIndex + 2] = Math.round(channels[2] / samples);
      output.data[targetIndex + 3] = Math.round(channels[3] / samples);
    }
  }

  return output;
}

function renderAntialiased(render, size) {
  const factor = size <= 64 ? 8 : 4;

  return downsample(render(size * factor), size, factor);
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);

  length.writeUInt32BE(data.length, 0);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(canvas) {
  const scanlines = [];

  for (let y = 0; y < canvas.height; y += 1) {
    const rowStart = y * canvas.width * 4;
    scanlines.push(Buffer.from([0]));
    scanlines.push(canvas.data.subarray(rowStart, rowStart + canvas.width * 4));
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(canvas.width, 0);
  ihdr.writeUInt32BE(canvas.height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(Buffer.concat(scanlines))),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;

  for (let k = 0; k < 8; k += 1) {
    c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  }

  return c >>> 0;
});

function crc32(buffer) {
  let crc = 0xFFFFFFFF;

  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
  }

  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function encodeIco(pngs) {
  const header = Buffer.alloc(6);
  const directory = Buffer.alloc(16 * pngs.length);
  let offset = 6 + directory.length;

  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);

  pngs.forEach(({ size, buffer }, index) => {
    const entry = index * 16;

    directory[entry] = size >= 256 ? 0 : size;
    directory[entry + 1] = size >= 256 ? 0 : size;
    directory[entry + 2] = 0;
    directory[entry + 3] = 0;
    directory.writeUInt16LE(1, entry + 4);
    directory.writeUInt16LE(32, entry + 6);
    directory.writeUInt32LE(buffer.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    offset += buffer.length;
  });

  return Buffer.concat([header, directory, ...pngs.map(({ buffer }) => buffer)]);
}

function writeAsset(path, contents) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

function writeBrandAssets(brand) {
  const brandPath = join(faviconRoot, brand.key);
  const pngs = new Map();

  sizes.forEach((size) => {
    const buffer = encodePng(renderAntialiased(brand.render, size));
    pngs.set(size, buffer);

    const name = size === 180
      ? "apple-touch-icon.png"
      : size === 16 || size === 32 || size === 48
        ? `favicon-${size}x${size}.png`
        : `icon-${size}.png`;

    writeAsset(join(brandPath, name), buffer);
  });

  writeAsset(join(brandPath, "favicon.ico"), encodeIco([16, 32, 48].map((size) => ({ size, buffer: pngs.get(size) }))));
  writeAsset(join(brandPath, "favicon.svg"), brand.svg());
  writeAsset(join(brandPath, "site.webmanifest"), `${JSON.stringify({
    name: brand.name,
    short_name: brand.shortName,
    start_url: "/",
    display: "standalone",
    background_color: brand.backgroundColor,
    theme_color: brand.themeColor,
    icons: [
      {
        src: `/favicons/${brand.key}/icon-192.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: `/favicons/${brand.key}/icon-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  }, null, 2)}\n`);

  if (brand.key === "usam") {
    writeAsset(join(outputRoot, "favicon.ico"), encodeIco([16, 32, 48].map((size) => ({ size, buffer: pngs.get(size) }))));
    writeAsset(join(outputRoot, "favicon.svg"), brand.svg());
    writeAsset(join(outputRoot, "favicon-16x16.png"), pngs.get(16));
    writeAsset(join(outputRoot, "favicon-32x32.png"), pngs.get(32));
    writeAsset(join(outputRoot, "favicon-48x48.png"), pngs.get(48));
    writeAsset(join(outputRoot, "apple-touch-icon.png"), pngs.get(180));
    writeAsset(join(outputRoot, "icon-192.png"), pngs.get(192));
    writeAsset(join(outputRoot, "icon-512.png"), pngs.get(512));
    writeAsset(join(outputRoot, "site.webmanifest"), `${JSON.stringify({
      name: brand.name,
      short_name: brand.shortName,
      start_url: "/",
      display: "standalone",
      background_color: brand.backgroundColor,
      theme_color: brand.themeColor,
      icons: [
        {
          src: "/icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable",
        },
        {
          src: "/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable",
        },
      ],
    }, null, 2)}\n`);
  }
}

function writeDosAppManifest() {
  writeAsset(join(outputRoot, "dos.webmanifest"), `${JSON.stringify({
    name: "DOS",
    short_name: "DOS",
    start_url: "/dos",
    display: "standalone",
    background_color: colors.dosBackground,
    theme_color: colors.dosNavy,
    icons: [
      {
        src: "/favicons/dos/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/favicons/dos/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  }, null, 2)}\n`);
}

function writeReviewImages() {
  const largeIconSize = 160;
  const padding = 32;
  const labelHeight = 34;
  const comparison = createCanvas((largeIconSize + padding) * brands.length + padding, largeIconSize + padding + labelHeight + padding, colors.black);

  brands.forEach((brand, index) => {
    const icon = renderAntialiased(brand.render, largeIconSize);
    const x = padding + index * (largeIconSize + padding);
    const y = padding;

    blit(comparison, icon, x, y);
    drawSimpleLabel(comparison, brand.shortName, x, y + largeIconSize + 14, largeIconSize, colors.cream);
  });

  writeAsset(join(faviconRoot, "review", "brand-comparison.png"), encodePng(comparison));

  const scaleRows = [16, 32, 64];
  const rowHeight = 98;
  const labelWidth = 58;
  const scaleCanvas = createCanvas(372, padding + rowHeight * scaleRows.length, colors.black);

  scaleRows.forEach((size, row) => {
    const y = padding + row * rowHeight;

    drawSimpleLabel(scaleCanvas, `${size}px`, 10, y + Math.max(0, (64 - 12) / 2), labelWidth, colors.cream);

    brands.forEach((brand, index) => {
      const icon = renderAntialiased(brand.render, size);
      const x = labelWidth + padding + index * 92 + Math.floor((64 - size) / 2);
      const iconY = y + Math.floor((64 - size) / 2);

      blit(scaleCanvas, icon, x, iconY);
    });
  });

  writeAsset(join(faviconRoot, "review", "scale-comparison.png"), encodePng(scaleCanvas));
}

function blit(target, source, x, y) {
  for (let py = 0; py < source.size; py += 1) {
    for (let px = 0; px < source.size; px += 1) {
      const sourceIndex = (py * source.size + px) * 4;

      setPixel(target, x + px, y + py, [
        source.data[sourceIndex],
        source.data[sourceIndex + 1],
        source.data[sourceIndex + 2],
        source.data[sourceIndex + 3],
      ]);
    }
  }
}

function drawSimpleLabel(canvas, text, x, y, width, color) {
  const glyphs = {
    "1": ["01", "11", "01", "01", "01", "01", "11"],
    "2": ["111", "001", "001", "111", "100", "100", "111"],
    "3": ["111", "001", "001", "111", "001", "001", "111"],
    "4": ["101", "101", "101", "111", "001", "001", "001"],
    "6": ["111", "100", "100", "111", "101", "101", "111"],
    "P": ["110", "101", "101", "110", "100", "100", "100"],
    "A": letterPatterns.A,
    "D": ["1110", "1001", "1001", "1001", "1001", "1001", "1110"],
    "G": ["0111", "1000", "1000", "1011", "1001", "1001", "0111"],
    "K": ["1001", "1010", "1100", "1000", "1100", "1010", "1001"],
    "M": letterPatterns.M,
    "O": ["0110", "1001", "1001", "1001", "1001", "1001", "0110"],
    "S": letterPatterns.S,
    "T": ["111", "010", "010", "010", "010", "010", "010"],
    "U": letterPatterns.U,
    "X": ["101", "101", "101", "010", "101", "101", "101"],
    "p": ["000", "110", "101", "101", "110", "100", "100"],
    "x": ["000", "101", "101", "010", "101", "101", "000"],
  };
  const cell = 2;
  const spacing = 2;
  const chars = [...text];
  const totalWidth = chars.reduce((sum, char) => sum + ((glyphs[char]?.[0]?.length ?? 2) * cell) + spacing, -spacing);
  let cursor = x + Math.max(0, Math.floor((width - totalWidth) / 2));

  chars.forEach((char) => {
    const glyph = glyphs[char];

    if (!glyph) {
      cursor += 4;
      return;
    }

    drawPixelLetter(canvas, glyph, cursor, y, cell, color);
    cursor += glyph[0].length * cell + spacing;
  });
}

function usamSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="USA Missionaries favicon">
  <rect width="100" height="100" rx="8" fill="${colors.black}"/>
  <rect x="3.5" y="3.5" width="93" height="93" rx="8" fill="none" stroke="${colors.white}" stroke-width="7"/>
  <path fill="${colors.white}" d="${pixelLetterPath(letterPatterns.U, 12.2, 12.5, 4.35)} ${pixelLetterPath(letterPatterns.S, 53.3, 12.5, 4.35)} ${pixelLetterPath(letterPatterns.A, 12.2, 50.2, 4.35)} ${pixelLetterPath(letterPatterns.M, 53.3, 50.2, 4.35)}"/>
  <rect x="13" y="82" width="74" height="5.8" fill="${colors.gold}"/>
</svg>
`;
}

function dosSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" fill="none" role="img" aria-label="DOS favicon">
  <rect width="52" height="52" fill="${colors.dosBackground}"/>
  <circle cx="26" cy="26" r="4.5" fill="${colors.dosBlue}"/>
  <circle cx="26" cy="26" r="11" stroke="${colors.white}" stroke-width="3.5" fill="none"/>
  <path d="M40.7 36.3 A18 18 0 1 1 40.7 15.7" stroke="${colors.white}" stroke-width="3.5" stroke-linecap="round"/>
</svg>
`;
}

function kitchenTableGospelSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="Kitchen Table Gospel favicon">
  <rect width="100" height="100" rx="9" fill="${colors.cream}"/>
  <rect x="5" y="5" width="90" height="90" rx="9" fill="none" stroke="${colors.gold}" stroke-width="10"/>
  <path d="M21 34H79L88 50H12L21 34Z" fill="${colors.gold}"/>
  <rect x="22" y="53" width="56" height="7" rx="2" fill="${colors.black}"/>
  <path d="M25 59H39L35 85H29L25 59Z" fill="${colors.black}"/>
  <path d="M61 59H75L71 85H65L61 59Z" fill="${colors.black}"/>
</svg>
`;
}

function pixelLetterPath(pattern, x, y, cell) {
  const gap = cell * 0.12;
  const rects = [];

  pattern.forEach((row, rowIndex) => {
    [...row].forEach((value, columnIndex) => {
      if (value === "1") {
        const rx = Number((x + columnIndex * cell).toFixed(2));
        const ry = Number((y + rowIndex * cell).toFixed(2));
        const size = Number((cell - gap).toFixed(2));

        rects.push(`M${rx} ${ry}h${size}v${size}h-${size}Z`);
      }
    });
  });

  return rects.join(" ");
}

brands.forEach(writeBrandAssets);
writeDosAppManifest();
writeReviewImages();
