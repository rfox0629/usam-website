/**
 * A very small PDF writer, enough for a typeset report and nothing more.
 *
 * Why this exists rather than `window.print()`:
 *
 * Browsers draw their own header and footer onto a printed page: the document
 * title, the page URL, the date. That is chrome the page cannot remove. CSS
 * `@page` margins influence where those headers sit in some browsers and are
 * ignored by others, and "ask the user to untick Headers and footers" is not a
 * fix. A DOS report printed that way carried the workspace URL and the words
 * "Workspace | DOS" on every page.
 *
 * So the report is not printed: it is *generated*. These bytes are the whole
 * document. Nothing outside this file can add a header, a URL or a token to it,
 * the document title is ours to set, and the download filename is ours too.
 *
 * Scope on purpose:
 *   - the 14 standard Type 1 fonts, so nothing is embedded and output stays
 *     small. Helvetica and Helvetica-Bold are what the report uses.
 *   - WinAnsiEncoding text, rectangles, lines, and RGB fill.
 *   - no images, no transparency, no compression, no hyperlinks. A report that
 *     cannot contain a link cannot leak one.
 */

/* Helvetica advance widths, 1/1000 em, keyed by WINANSI BYTE.
 *
 * USA-282: keyed by byte, not by Unicode code point, and that is the whole of
 * the bug this replaces. The writer emits WinAnsi bytes; the old table was
 * looked up by code point, so every character whose code point differs from
 * its WinAnsi byte measured as a question mark: the curly quotes, the bullet,
 * both dashes, and every accented letter except e-acute. Text containing any
 * of them was measured wrong, so it wrapped in the wrong place and any line
 * drawn in pieces at measured offsets came out unevenly spaced.
 *
 * Generated from the Adobe Core 14 AFM metrics (Helvetica.afm and
 * Helvetica-Bold.afm), covering every byte WinAnsiEncoding defines, so nothing
 * the report can encode falls back to a guess.
 */
const HELVETICA_WIDTHS: Record<number, number> = {
  32: 278, 33: 278, 34: 355, 35: 556, 36: 556, 37: 889, 38: 667, 39: 222,
  40: 333, 41: 333, 42: 389, 43: 584, 44: 278, 45: 333, 46: 278, 47: 278,
  48: 556, 49: 556, 50: 556, 51: 556, 52: 556, 53: 556, 54: 556, 55: 556,
  56: 556, 57: 556, 58: 278, 59: 278, 60: 584, 61: 584, 62: 584, 63: 556,
  64: 1015, 65: 667, 66: 667, 67: 722, 68: 722, 69: 667, 70: 611, 71: 778,
  72: 722, 73: 278, 74: 500, 75: 667, 76: 556, 77: 833, 78: 722, 79: 778,
  80: 667, 81: 778, 82: 722, 83: 667, 84: 611, 85: 722, 86: 667, 87: 944,
  88: 667, 89: 667, 90: 611, 91: 278, 92: 278, 93: 278, 94: 469, 95: 556,
  96: 222, 97: 556, 98: 556, 99: 500, 100: 556, 101: 556, 102: 278, 103: 556,
  104: 556, 105: 222, 106: 222, 107: 500, 108: 222, 109: 833, 110: 556, 111: 556,
  112: 556, 113: 556, 114: 333, 115: 500, 116: 278, 117: 556, 118: 500, 119: 722,
  120: 500, 121: 500, 122: 500, 123: 334, 124: 260, 125: 334, 126: 584, 128: 556,
  130: 222, 131: 556, 132: 333, 133: 1000, 134: 556, 135: 556, 136: 333, 137: 1000,
  138: 667, 139: 333, 140: 1000, 142: 611, 145: 222, 146: 222, 147: 333, 148: 333,
  149: 350, 150: 556, 151: 1000, 152: 333, 153: 1000, 154: 500, 155: 333, 156: 944,
  158: 500, 159: 667, 160: 278, 161: 333, 162: 556, 163: 556, 164: 556, 165: 556,
  166: 260, 167: 556, 168: 333, 169: 737, 170: 370, 171: 556, 172: 584, 173: 333,
  174: 737, 175: 333, 176: 400, 177: 584, 178: 333, 179: 333, 180: 333, 181: 556,
  182: 537, 183: 278, 184: 333, 185: 333, 186: 365, 187: 556, 188: 834, 189: 834,
  190: 834, 191: 611, 192: 667, 193: 667, 194: 667, 195: 667, 196: 667, 197: 667,
  198: 1000, 199: 722, 200: 667, 201: 667, 202: 667, 203: 667, 204: 278, 205: 278,
  206: 278, 207: 278, 208: 722, 209: 722, 210: 778, 211: 778, 212: 778, 213: 778,
  214: 778, 215: 584, 216: 778, 217: 722, 218: 722, 219: 722, 220: 722, 221: 667,
  222: 667, 223: 611, 224: 556, 225: 556, 226: 556, 227: 556, 228: 556, 229: 556,
  230: 889, 231: 500, 232: 556, 233: 556, 234: 556, 235: 556, 236: 278, 237: 278,
  238: 278, 239: 278, 240: 556, 241: 556, 242: 556, 243: 556, 244: 556, 245: 556,
  246: 556, 247: 584, 248: 611, 249: 556, 250: 556, 251: 556, 252: 556, 253: 500,
  254: 556, 255: 500,
};

const HELVETICA_BOLD_WIDTHS: Record<number, number> = {
32: 278, 33: 333, 34: 474, 35: 556, 36: 556, 37: 889, 38: 722, 39: 278,
  40: 333, 41: 333, 42: 389, 43: 584, 44: 278, 45: 333, 46: 278, 47: 278,
  48: 556, 49: 556, 50: 556, 51: 556, 52: 556, 53: 556, 54: 556, 55: 556,
  56: 556, 57: 556, 58: 333, 59: 333, 60: 584, 61: 584, 62: 584, 63: 611,
  64: 975, 65: 722, 66: 722, 67: 722, 68: 722, 69: 667, 70: 611, 71: 778,
  72: 722, 73: 278, 74: 556, 75: 722, 76: 611, 77: 833, 78: 722, 79: 778,
  80: 667, 81: 778, 82: 722, 83: 667, 84: 611, 85: 722, 86: 667, 87: 944,
  88: 667, 89: 667, 90: 611, 91: 333, 92: 278, 93: 333, 94: 584, 95: 556,
  96: 278, 97: 556, 98: 611, 99: 556, 100: 611, 101: 556, 102: 333, 103: 611,
  104: 611, 105: 278, 106: 278, 107: 556, 108: 278, 109: 889, 110: 611, 111: 611,
  112: 611, 113: 611, 114: 389, 115: 556, 116: 333, 117: 611, 118: 556, 119: 778,
  120: 556, 121: 556, 122: 500, 123: 389, 124: 280, 125: 389, 126: 584, 128: 556,
  130: 278, 131: 556, 132: 500, 133: 1000, 134: 556, 135: 556, 136: 333, 137: 1000,
  138: 667, 139: 333, 140: 1000, 142: 611, 145: 278, 146: 278, 147: 500, 148: 500,
  149: 350, 150: 556, 151: 1000, 152: 333, 153: 1000, 154: 556, 155: 333, 156: 944,
  158: 500, 159: 667, 160: 278, 161: 333, 162: 556, 163: 556, 164: 556, 165: 556,
  166: 280, 167: 556, 168: 333, 169: 737, 170: 370, 171: 556, 172: 584, 173: 333,
  174: 737, 175: 333, 176: 400, 177: 584, 178: 333, 179: 333, 180: 333, 181: 611,
  182: 556, 183: 278, 184: 333, 185: 333, 186: 365, 187: 556, 188: 834, 189: 834,
  190: 834, 191: 611, 192: 722, 193: 722, 194: 722, 195: 722, 196: 722, 197: 722,
  198: 1000, 199: 722, 200: 667, 201: 667, 202: 667, 203: 667, 204: 278, 205: 278,
  206: 278, 207: 278, 208: 722, 209: 722, 210: 778, 211: 778, 212: 778, 213: 778,
  214: 778, 215: 584, 216: 778, 217: 722, 218: 722, 219: 722, 220: 722, 221: 667,
  222: 667, 223: 611, 224: 556, 225: 556, 226: 556, 227: 556, 228: 556, 229: 556,
  230: 889, 231: 556, 232: 556, 233: 556, 234: 556, 235: 556, 236: 278, 237: 278,
  238: 278, 239: 278, 240: 611, 241: 611, 242: 611, 243: 611, 244: 611, 245: 611,
  246: 611, 247: 584, 248: 611, 249: 611, 250: 611, 251: 611, 252: 611, 253: 556,
  254: 611, 255: 556,
};

export type PdfFont = "regular" | "bold";

export type PdfRgb = readonly [number, number, number];

/* Characters whose WinAnsi byte differs from their Unicode code point. Used
   by the encoder AND, through it, by the width lookup, so what is measured is
   always what is written. */
const WINANSI_OVERRIDES: Record<string, number> = {
  "\u20AC": 0x80, "\u201A": 0x82, "\u0192": 0x83, "\u201E": 0x84,
  "\u2026": 0x85, "\u2020": 0x86, "\u2021": 0x87, "\u02C6": 0x88,
  "\u2030": 0x89, "\u0160": 0x8A, "\u2039": 0x8B, "\u0152": 0x8C,
  "\u017D": 0x8E, "\u2018": 0x91, "\u2019": 0x92, "\u201C": 0x93,
  "\u201D": 0x94, "\u2022": 0x95, "\u2013": 0x96, "\u2014": 0x97,
  "\u02DC": 0x98, "\u2122": 0x99, "\u0161": 0x9A, "\u203A": 0x9B,
  "\u0153": 0x9C, "\u017E": 0x9E, "\u0178": 0x9F,
};

/* The single source of truth for "which byte represents this character".
   Anything WinAnsi cannot represent becomes a question mark, which is at
   least a character whose width we know. */
export function winAnsiByte(character: string) {
  const override = WINANSI_OVERRIDES[character];

  if (override !== undefined) {
    return override;
  }

  const code = character.codePointAt(0) ?? 63;

  return code <= 0xFF ? code : 63;
}

function charWidth(byte: number, font: PdfFont) {
  const table = font === "bold" ? HELVETICA_BOLD_WIDTHS : HELVETICA_WIDTHS;

  return table[byte] ?? table[63] ?? 556;
}

export function measureText(text: string, size: number, font: PdfFont) {
  let total = 0;

  for (const character of text) {
    total += charWidth(winAnsiByte(character), font);
  }

  return (total * size) / 1000;
}

/** Greedy wrap on spaces. A single word longer than the column is broken. */
export function wrapText(text: string, size: number, font: PdfFont, maxWidth: number) {
  const lines: string[] = [];

  for (const paragraph of text.split("\n")) {
    let line = "";

    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;

      if (measureText(candidate, size, font) <= maxWidth || !line) {
        line = candidate;
        continue;
      }

      lines.push(line);
      line = word;
    }

    lines.push(line);
  }

  return lines;
}

function escapeForPdfString(text: string) {
  let out = "";

  for (const character of text) {
    const byte = winAnsiByte(character);

    if (byte === 0x28 || byte === 0x29 || byte === 0x5C) {
      out += `\\${String.fromCharCode(byte)}`;
      continue;
    }

    out += byte >= 32 && byte < 127
      ? String.fromCharCode(byte)
      : `\\${byte.toString(8).padStart(3, "0")}`;
  }

  return out;
}

function formatNumber(value: number) {
  return (Math.round(value * 100) / 100).toString();
}

type PageState = { operations: string[] };

export class PdfDocument {
  readonly height: number;
  readonly width: number;

  private readonly pages: PageState[] = [];
  private current: PageState | null = null;
  private readonly title: string;

  constructor({ height = 792, title, width = 612 }: { height?: number; title: string; width?: number }) {
    this.height = height;
    this.title = title;
    this.width = width;
  }

  get pageCount() {
    return this.pages.length;
  }

  addPage() {
    this.current = { operations: [] };
    this.pages.push(this.current);

    return this.pages.length;
  }

  private page() {
    if (!this.current) {
      throw new Error("Call addPage() before drawing.");
    }

    return this.current;
  }

  /** y is measured from the TOP of the page, which is how the layout reads. */
  text(value: string, { color = [0, 0, 0] as PdfRgb, font = "regular" as PdfFont, size, x, y }: {
    color?: PdfRgb; font?: PdfFont; size: number; x: number; y: number;
  }) {
    const [r, g, b] = color;

    this.page().operations.push(
      "BT",
      `/${font === "bold" ? "F2" : "F1"} ${formatNumber(size)} Tf`,
      `${formatNumber(r)} ${formatNumber(g)} ${formatNumber(b)} rg`,
      `1 0 0 1 ${formatNumber(x)} ${formatNumber(this.height - y)} Tm`,
      `(${escapeForPdfString(value)}) Tj`,
      "ET",
    );
  }

  rect({ color, height, width, x, y }: { color: PdfRgb; height: number; width: number; x: number; y: number }) {
    const [r, g, b] = color;

    this.page().operations.push(
      `${formatNumber(r)} ${formatNumber(g)} ${formatNumber(b)} rg`,
      `${formatNumber(x)} ${formatNumber(this.height - y - height)} ${formatNumber(width)} ${formatNumber(height)} re`,
      "f",
    );
  }

  line({ color, thickness = 0.6, x1, x2, y }: { color: PdfRgb; thickness?: number; x1: number; x2: number; y: number }) {
    this.rect({ color, height: thickness, width: x2 - x1, x: x1, y });
  }

  /**
   * Draw onto a page that already exists. Page numbering needs the total, and
   * the total is only known once every page has been laid out, so footers are
   * stamped in a second pass rather than guessed at.
   */
  setFooter(pageNumber: number, draw: (tools: {
    line: (options: { color: PdfRgb; thickness?: number; x1: number; x2: number; y: number }) => void;
    rect: (options: { color: PdfRgb; height: number; width: number; x: number; y: number }) => void;
    text: (value: string, options: { color?: PdfRgb; font?: PdfFont; size: number; x: number; y: number }) => void;
  }) => void) {
    const target = this.pages[pageNumber - 1];

    if (!target) {
      throw new Error(`Page ${pageNumber} does not exist.`);
    }

    const previous = this.current;

    this.current = target;

    try {
      draw({
        line: (options) => this.line(options),
        rect: (options) => this.rect(options),
        text: (value, options) => this.text(value, options),
      });
    } finally {
      this.current = previous;
    }
  }

  /** The finished file. */
  build() {
    const objects: string[] = [];
    const pageObjectNumbers: number[] = [];
    const contentObjectNumbers: number[] = [];

    /* 1 catalog, 2 pages, 3 font regular, 4 font bold, 5 info, then a
       content stream and a page object for each page. */
    const firstPageObject = 6;

    this.pages.forEach((_, index) => {
      contentObjectNumbers.push(firstPageObject + index * 2);
      pageObjectNumbers.push(firstPageObject + index * 2 + 1);
    });

    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[2] = `<< /Type /Pages /Count ${this.pages.length} /Kids [${pageObjectNumbers.map((n) => `${n} 0 R`).join(" ")}] >>`;
    objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
    objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
    objects[5] = `<< /Title (${escapeForPdfString(this.title)}) /Producer (${escapeForPdfString("Discipleship Operating System")}) >>`;

    this.pages.forEach((page, index) => {
      const stream = page.operations.join("\n");

      objects[contentObjectNumbers[index]] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
      objects[pageObjectNumbers[index]] = [
        "<< /Type /Page /Parent 2 0 R",
        `/MediaBox [0 0 ${formatNumber(this.width)} ${formatNumber(this.height)}]`,
        "/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >>",
        `/Contents ${contentObjectNumbers[index]} 0 R >>`,
      ].join(" ");
    });

    const encoder = new TextEncoder();
    const chunks: Uint8Array[] = [];
    const offsets: number[] = [];
    let length = 0;

    const push = (text: string) => {
      const bytes = encoder.encode(text);
      chunks.push(bytes);
      length += bytes.length;
    };

    push("%PDF-1.4\n");

    for (let number = 1; number < objects.length; number += 1) {
      offsets[number] = length;
      push(`${number} 0 obj\n${objects[number]}\nendobj\n`);
    }

    const xrefOffset = length;
    const count = objects.length;

    push(`xref\n0 ${count}\n`);
    push("0000000000 65535 f \n");

    for (let number = 1; number < count; number += 1) {
      push(`${offsets[number].toString().padStart(10, "0")} 00000 n \n`);
    }

    push(`trailer\n<< /Size ${count} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

    const output = new Uint8Array(length);
    let position = 0;

    for (const chunk of chunks) {
      output.set(chunk, position);
      position += chunk.length;
    }

    return output;
  }
}
