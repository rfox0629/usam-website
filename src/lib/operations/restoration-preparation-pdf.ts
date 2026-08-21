import { redactForExport, type PreparationSummary } from "./restoration-preparation";

/**
 * Minimal PDF writer for the redacted preparation summary (USA-187).
 *
 * Deliberately self-contained and dependency free: the export is an optional
 * convenience, so removing this file and its route leaves the secure in-platform
 * summary untouched. It emits Helvetica text only, which every PDF reader has
 * built in, so no font needs to be embedded.
 */

const pageWidth = 612;
const pageHeight = 792;
const margin = 72;
const textWidth = pageWidth - margin * 2;
const bottomLimit = margin + 36;

// Adobe's standard Helvetica widths (units per 1000) for printable ASCII, so
// lines wrap where a reader will actually break them.
const regularWidths = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const boldWidths = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];

/**
 * Curly quotes, dashes, and anything else outside printable ASCII are folded to
 * their plain equivalents rather than embedding a Unicode font.
 */
function toAscii(value: string) {
  return value
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/…/g, "...")
    .replace(/ /g, " ")
    .replace(/[^\x20-\x7E\n]/g, "");
}

function charWidth(code: number, bold: boolean) {
  const table = bold ? boldWidths : regularWidths;
  const width = code >= 32 && code <= 126 ? table[code - 32] : undefined;

  return (width ?? 556) / 1000;
}

function measure(text: string, size: number, bold: boolean) {
  let total = 0;

  for (let index = 0; index < text.length; index += 1) {
    total += charWidth(text.charCodeAt(index), bold) * size;
  }

  return total;
}

function wrap(text: string, size: number, bold: boolean, width: number) {
  const lines: string[] = [];

  for (const paragraph of toAscii(text).split("\n")) {
    let current = "";

    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = current ? `${current} ${word}` : word;

      if (measure(candidate, size, bold) <= width || !current) {
        current = candidate;
        continue;
      }

      lines.push(current);
      current = word;
    }

    lines.push(current);
  }

  return lines;
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

type Line = { bold: boolean; gap: number; indent: number; size: number; text: string };

class Layout {
  readonly pages: Line[][] = [];
  private current: Line[] = [];
  private cursor = pageHeight - margin;

  write(text: string, { bold = false, gap = 4, indent = 0, size = 10 } = {}) {
    for (const line of wrap(text, size, bold, textWidth - indent)) {
      const advance = size * 1.35;

      if (this.cursor - advance < bottomLimit) {
        this.pages.push(this.current);
        this.current = [];
        this.cursor = pageHeight - margin;
      }

      this.current.push({ bold, gap: 0, indent, size, text: line });
      this.cursor -= advance;
    }

    this.cursor -= gap;

    if (this.current.length > 0) {
      this.current[this.current.length - 1].gap = gap;
    }
  }

  finish() {
    if (this.current.length > 0) {
      this.pages.push(this.current);
    }

    return this.pages;
  }
}

function contentStream(lines: Line[], footer: string, pageLabel: string) {
  const parts = ["BT", `1 0 0 1 ${margin} ${pageHeight - margin} Tm`];
  let previousSize = 0;

  for (const line of lines) {
    const font = line.bold ? "/F2" : "/F1";
    parts.push(`${font} ${line.size} Tf`);
    parts.push(`${line.size * 1.35} TL`);
    parts.push("T*");

    if (line.indent) {
      parts.push(`${line.indent} 0 Td`);
    }

    parts.push(`(${escapePdfText(line.text)}) Tj`);

    if (line.indent) {
      parts.push(`${-line.indent} 0 Td`);
    }

    if (line.gap) {
      parts.push(`0 ${-line.gap} Td`);
    }

    previousSize = line.size;
  }

  parts.push("ET");
  // Footer sits in page space, independent of where the body text ended.
  parts.push("BT", "/F1 8 Tf", `1 0 0 1 ${margin} ${margin - 18} Tm`, `(${escapePdfText(toAscii(footer))}) Tj`, "ET");
  parts.push("BT", "/F1 8 Tf", `1 0 0 1 ${pageWidth - margin - 60} ${margin - 18} Tm`, `(${escapePdfText(pageLabel)}) Tj`, "ET");

  void previousSize;

  return parts.join("\n");
}

function buildPdf(pages: Line[][], footer: string) {
  const objects: string[] = [];
  const pageCount = Math.max(pages.length, 1);
  // 1 catalog, 2 pages, 3 + 4 fonts, then a page and content object per page.
  const pageIds = pages.map((_, index) => 5 + index * 2);

  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[1] = `<< /Type /Pages /Count ${pageCount} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`;
  objects[2] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";

  pages.forEach((lines, index) => {
    const pageId = pageIds[index];
    const stream = contentStream(lines, footer, `Page ${index + 1} of ${pageCount}`);

    objects[pageId - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageId + 1} 0 R >>`;
    objects[pageId] = `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`;
  });

  // No author, title, or subject: PDF metadata must not carry case identity.
  const infoId = objects.length + 1;
  objects[infoId - 1] = "<< /Producer (USA Missionaries Operations) >>";

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];

  objects.forEach((body, index) => {
    offsets[index] = Buffer.byteLength(pdf, "latin1");
    pdf += `${index + 1} 0 obj\n${body ?? "<< >>"}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

  for (let index = 0; index < objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1");
}

export const preparationPdfFooter =
  "For authorized preparation use only. Store securely and destroy when no longer needed.";

export function preparationPdfFilename(caseReference: string) {
  return `restoration-${caseReference}-preparation-summary.pdf`;
}

export function renderPreparationPdf(summary: PreparationSummary, { includeNotes }: { includeNotes: boolean }) {
  const redacted = redactForExport(summary, { includeNotes });
  const layout = new Layout();

  layout.write("CONFIDENTIAL - REDACTED PREPARATION SUMMARY", { bold: true, gap: 8, size: 13 });
  layout.write(`Case reference: ${redacted.caseReference}`, { size: 10 });
  layout.write(`Generated: ${new Date(summary.generatedAt).toUTCString()}`, { gap: 6, size: 10 });
  layout.write(
    includeNotes
      ? "Includes internal reviewer notes at the reviewer's request."
      : "Internal reviewer notes are excluded from this export.",
    { gap: 14, size: 9 },
  );

  for (const section of redacted.sections) {
    layout.write(section.title, { bold: true, gap: 3, size: 11 });

    if (section.narrative) {
      layout.write(section.narrative, { gap: 6, size: 10 });
    }

    for (const item of section.items) {
      layout.write(item.label, { bold: true, gap: 1, indent: 14, size: 9 });
      layout.write(item.value, { gap: 5, indent: 14, size: 10 });
    }

    if (section.withheld > 0) {
      layout.write(
        `${section.withheld} identifying detail${section.withheld === 1 ? "" : "s"} withheld from this export.`,
        { gap: 5, indent: 14, size: 9 },
      );
    }

    if (section.note) {
      layout.write("Internal reviewer note", { bold: true, gap: 1, indent: 14, size: 9 });
      layout.write(section.note, { gap: 6, indent: 14, size: 10 });
    }

    layout.write("", { gap: 6, size: 6 });
  }

  return buildPdf(layout.finish(), preparationPdfFooter);
}
