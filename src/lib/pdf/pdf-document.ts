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

/* Helvetica advance widths, 1/1000 em, WinAnsi code points the report can
   produce. Taken from the Adobe Core 14 AFM metrics. */
const HELVETICA_WIDTHS: Record<number, number> = {
  32: 278, 33: 278, 34: 355, 35: 556, 36: 556, 37: 889, 38: 667, 39: 191,
  40: 333, 41: 333, 42: 389, 43: 584, 44: 278, 45: 333, 46: 278, 47: 278,
  48: 556, 49: 556, 50: 556, 51: 556, 52: 556, 53: 556, 54: 556, 55: 556,
  56: 556, 57: 556, 58: 278, 59: 278, 60: 584, 61: 584, 62: 584, 63: 556,
  64: 1015, 65: 667, 66: 667, 67: 722, 68: 722, 69: 667, 70: 611, 71: 778,
  72: 722, 73: 278, 74: 500, 75: 667, 76: 556, 77: 833, 78: 722, 79: 778,
  80: 667, 81: 778, 82: 722, 83: 667, 84: 611, 85: 722, 86: 667, 87: 944,
  88: 667, 89: 667, 90: 611, 91: 278, 92: 278, 93: 278, 94: 469, 95: 556,
  96: 333, 97: 556, 98: 556, 99: 500, 100: 556, 101: 556, 102: 278, 103: 556,
  104: 556, 105: 222, 106: 222, 107: 500, 108: 222, 109: 833, 110: 556,
  111: 556, 112: 556, 113: 556, 114: 333, 115: 500, 116: 278, 117: 556,
  118: 500, 119: 722, 120: 500, 121: 500, 122: 500, 123: 334, 124: 260,
  125: 334, 126: 584, 149: 350, 183: 278, 233: 556, 8217: 191,
};

const HELVETICA_BOLD_WIDTHS: Record<number, number> = {
  32: 278, 33: 333, 34: 474, 35: 556, 36: 556, 37: 889, 38: 722, 39: 238,
  40: 333, 41: 333, 42: 389, 43: 584, 44: 278, 45: 333, 46: 278, 47: 278,
  48: 556, 49: 556, 50: 556, 51: 556, 52: 556, 53: 556, 54: 556, 55: 556,
  56: 556, 57: 556, 58: 333, 59: 333, 60: 584, 61: 584, 62: 584, 63: 611,
  64: 975, 65: 722, 66: 722, 67: 722, 68: 722, 69: 667, 70: 611, 71: 778,
  72: 722, 73: 278, 74: 556, 75: 722, 76: 611, 77: 833, 78: 722, 79: 778,
  80: 667, 81: 778, 82: 722, 83: 667, 84: 611, 85: 722, 86: 667, 87: 944,
  88: 667, 89: 667, 90: 611, 91: 333, 92: 278, 93: 333, 94: 584, 95: 556,
  96: 333, 97: 556, 98: 611, 99: 556, 100: 611, 101: 556, 102: 333, 103: 611,
  104: 611, 105: 278, 106: 278, 107: 556, 108: 278, 109: 889, 110: 611,
  111: 611, 112: 611, 113: 611, 114: 389, 115: 556, 116: 333, 117: 611,
  118: 556, 119: 778, 120: 556, 121: 556, 122: 500, 123: 389, 124: 280,
  125: 389, 126: 584, 149: 350, 183: 278, 233: 556, 8217: 238,
};

export type PdfFont = "regular" | "bold";

export type PdfRgb = readonly [number, number, number];

/* The few non-ASCII characters the report can contain, mapped to their WinAnsi
   byte. Everything else outside Latin-1 becomes a question mark rather than
   corrupting the stream. */
const WINANSI_OVERRIDES: Record<string, number> = {
  "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94,
  "•": 0x95, "–": 0x96, "—": 0x97, "·": 0xB7,
};

function charWidth(code: number, font: PdfFont) {
  const table = font === "bold" ? HELVETICA_BOLD_WIDTHS : HELVETICA_WIDTHS;

  return table[code] ?? table[63] ?? 556;
}

export function measureText(text: string, size: number, font: PdfFont) {
  let total = 0;

  for (const character of text) {
    total += charWidth(character.codePointAt(0) ?? 63, font);
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
    const override = WINANSI_OVERRIDES[character];
    const code = override ?? character.codePointAt(0) ?? 63;
    const byte = code <= 0xFF ? code : 63;

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
