import { buildCaseBrief, redactForExport, type PreparationSummary } from "./restoration-preparation";

/**
 * Minimal PDF writer for the redacted preparation summary (USA-187).
 *
 * Deliberately self-contained and dependency free: the export is an optional
 * convenience, so removing this file and its route leaves the secure
 * in-platform summary untouched. It emits Helvetica only, which every reader
 * has built in, so no font is embedded.
 *
 * Layout is two pass. The first pass measures every block and groups the ones
 * that must not be separated, the second paginates and draws, so a heading
 * never orphans at a page foot and a reviewer note never splits mid-box unless
 * it is genuinely taller than a page.
 */

const pageWidth = 612;
const pageHeight = 792;
const marginX = 64;
const contentWidth = pageWidth - marginX * 2;
const contentTop = 720;
const contentBottom = 84;
const headerBaseline = 756;
const headerRuleY = 748;
const footerRuleY = 64;
const footerBaseline = 50;

/** Greys and the USA Missionaries gold, kept restrained enough to print well. */
const ink = { b: 0.11, g: 0.11, r: 0.12 };
const body = { b: 0.24, g: 0.23, r: 0.22 };
const muted = { b: 0.46, g: 0.44, r: 0.42 };
const goldRule = { b: 0.31, g: 0.63, r: 0.76 };
const goldInk = { b: 0.14, g: 0.39, r: 0.49 };
const noteFill = { b: 0.965, g: 0.965, r: 0.97 };
const noteBorder = { b: 0.84, g: 0.85, r: 0.86 };
const hairline = { b: 0.86, g: 0.87, r: 0.88 };

// Adobe's standard Helvetica widths (units per 1000) for printable ASCII, so
// lines wrap where a reader will actually break them. Helvetica-Oblique shares
// the roman widths exactly.
const regularWidths = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const boldWidths = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];

type Font = "bold" | "oblique" | "regular";
type Color = { b: number; g: number; r: number };

/**
 * Curly quotes, dashes, and anything else outside printable ASCII are folded to
 * plain equivalents rather than embedding a Unicode font.
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

function charWidth(code: number, font: Font) {
  const table = font === "bold" ? boldWidths : regularWidths;
  const width = code >= 32 && code <= 126 ? table[code - 32] : undefined;

  return (width ?? 556) / 1000;
}

function measure(text: string, size: number, font: Font) {
  let total = 0;

  for (let index = 0; index < text.length; index += 1) {
    total += charWidth(text.charCodeAt(index), font) * size;
  }

  return total;
}

function wrap(text: string, size: number, font: Font, width: number) {
  const lines: string[] = [];

  for (const paragraph of toAscii(text).split("\n")) {
    let current = "";

    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = current ? `${current} ${word}` : word;

      if (measure(candidate, size, font) <= width || !current) {
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

/** Draw operations are positioned by their offset from the top of their group. */
type Op =
  | { type: "rect"; dy: number; x: number; w: number; h: number; fill?: Color; stroke?: Color; lineWidth?: number }
  | { type: "text"; dy: number; x: number; size: number; font: Font; color: Color; text: string };

/** A run of ops that must stay together on one page. */
type Group = {
  height: number;
  /** Pull the next group onto this page too, so a heading never orphans. */
  keepWithNext?: boolean;
  ops: Op[];
};

/** Usable vertical space on a page, once the running furniture is removed. */
const pageCapacity = contentTop - contentBottom;

/**
 * Splits pre-wrapped text so an unusually long note or answer can flow across
 * pages instead of overflowing one. Each chunk re-wraps to itself, because
 * every line already fits the target width.
 */
function chunkText(text: string, size: number, font: Font, width: number, maxLines: number) {
  const lines = wrap(text, size, font, width);
  const chunks: string[] = [];

  for (let index = 0; index < lines.length; index += maxLines) {
    chunks.push(lines.slice(index, index + maxLines).join("\n"));
  }

  return chunks.length > 0 ? chunks : [""];
}

type TextOptions = {
  color?: Color;
  font?: Font;
  gapAfter?: number;
  indent?: number;
  leading?: number;
  size?: number;
  width?: number;
};

/** Lays text into ops, returning the ops and the height they consume. */
function textBlock(text: string, dyStart: number, options: TextOptions = {}) {
  const size = options.size ?? 10.5;
  const font = options.font ?? "regular";
  const color = options.color ?? body;
  const indent = options.indent ?? 0;
  const leading = options.leading ?? size * 1.42;
  const width = (options.width ?? contentWidth) - indent;
  const ops: Op[] = [];
  let dy = dyStart;

  for (const line of wrap(text, size, font, width)) {
    dy += leading;
    ops.push({ color, dy, font, size, text: line, type: "text", x: marginX + indent });
  }

  return { dy: dy + (options.gapAfter ?? 0), ops };
}

function sectionHeadingGroup(title: string, provenance: string) {
  const ops: Op[] = [];
  const heading = textBlock(title, 0, { color: ink, font: "bold", leading: 16, size: 12.5 });
  ops.push(...heading.ops);

  // A gold hairline under every section title, so sections cannot run together.
  let dy = heading.dy + 6;
  ops.push({ dy, h: 1.1, lineWidth: 0, stroke: undefined, type: "rect", w: contentWidth, x: marginX, fill: goldRule });

  dy += 4;
  const note = textBlock(provenance, dy, { color: muted, font: "oblique", leading: 11, size: 8.5 });
  ops.push(...note.ops);

  return { height: note.dy + 6, keepWithNext: true, ops };
}

function itemGroups(label: string, value: string): Group[] {
  const single = itemGroup(label, value);

  if (single.height <= pageCapacity) {
    return [single];
  }

  const maxLines = Math.max(1, Math.floor((pageCapacity - 25) / 14.6));

  return chunkText(value, 10.5, "regular", contentWidth, maxLines).map((chunk, index) =>
    itemGroup(index === 0 ? label : `${label} (continued)`, chunk));
}

function itemGroup(label: string, value: string): Group {
  const ops: Op[] = [];
  const labelBlock = textBlock(label, 0, { color: muted, font: "bold", leading: 11, size: 8.5 });
  ops.push(...labelBlock.ops);

  const valueBlock = textBlock(value, labelBlock.dy + 1.5, { color: body, leading: 14.6, size: 10.5 });
  ops.push(...valueBlock.ops);

  return { height: valueBlock.dy + 9, ops };
}

const notePadding = 11;
const noteAccentWidth = 3;

/**
 * Reviewer notes get a shaded, bordered block with a gold spine and an explicit
 * label, so a reader can never mistake a reviewer's private thinking for
 * something the participant reported.
 */
function noteGroups(text: string): Group[] {
  const innerIndent = noteAccentWidth + notePadding;
  const innerWidth = contentWidth - innerIndent - notePadding;
  const single = noteGroup(text);

  if (single.height <= pageCapacity) {
    return [single];
  }

  // Leave room for the label, the padding, and the block's own trailing gap.
  const maxLines = Math.max(1, Math.floor((pageCapacity - notePadding * 2 - 25) / 14));

  return chunkText(text, 10, "regular", innerWidth, maxLines).map((chunk, index) =>
    noteGroup(chunk, index > 0));
}

function noteGroup(text: string, continued = false): Group {
  const innerIndent = noteAccentWidth + notePadding;
  const innerWidth = contentWidth - innerIndent - notePadding;
  const label = textBlock(continued ? "INTERNAL REVIEWER NOTE (CONTINUED)" : "INTERNAL REVIEWER NOTE", 0, {
    color: goldInk,
    font: "bold",
    indent: innerIndent,
    leading: 10,
    size: 7.5,
    width: contentWidth,
  });
  const noteBody = textBlock(text, label.dy + 3, {
    color: body,
    indent: innerIndent,
    leading: 14,
    size: 10,
    width: contentWidth,
  });
  // The last baseline needs its own descender space plus the padding, or the
  // text sits on the box edge.
  const boxHeight = noteBody.dy + notePadding + 9;

  return {
    height: boxHeight + 12,
    ops: [
      { dy: 0, fill: noteFill, h: boxHeight, stroke: noteBorder, lineWidth: 0.7, type: "rect", w: contentWidth, x: marginX },
      { dy: 0, fill: goldRule, h: boxHeight, type: "rect", w: noteAccentWidth, x: marginX },
      ...label.ops.map((op) => ({ ...op, dy: op.dy + notePadding - 2 })),
      ...noteBody.ops.map((op) => ({ ...op, dy: op.dy + notePadding - 2 })),
    ] as Op[],
  };
}

function monthName(index: number) {
  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][index];
}

/** Fixed format, so the export does not vary with the server's locale. */
function formatPdfDate(iso: string) {
  const date = new Date(iso);

  return `${monthName(date.getUTCMonth())} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

export const preparationPdfFooter =
  "For authorized preparation use only. Store securely and destroy when no longer needed.";

const confidentialityLabel = "CONFIDENTIAL - REDACTED PREPARATION SUMMARY";

export function preparationPdfFilename(caseReference: string) {
  return `restoration-${caseReference}-preparation-summary.pdf`;
}

type PlacedOp = Op & { absY: number };

function paginate(groups: Group[]) {
  const pages: PlacedOp[][] = [];
  let current: PlacedOp[] = [];
  let cursor = contentTop;

  const place = (group: Group, top: number) => {
    for (const op of group.ops) {
      current.push({ ...op, absY: top - op.dy });
    }
  };

  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index];
    const next = groups[index + 1];
    const needed = group.keepWithNext && next ? group.height + next.height : group.height;

    if (cursor - needed < contentBottom && current.length > 0) {
      pages.push(current);
      current = [];
      cursor = contentTop;
    }

    place(group, cursor);
    cursor -= group.height;
  }

  pages.push(current);

  return pages;
}

function serializePage(ops: PlacedOp[], caseReference: string, generated: string, page: number, total: number) {
  // Page one carries the full title block, so the running header would only
  // repeat it. Every later page needs it.
  const showRunningHeader = page > 1;
  const parts: string[] = [];
  const setFill = (color: Color) => parts.push(`${color.r.toFixed(3)} ${color.g.toFixed(3)} ${color.b.toFixed(3)} rg`);
  const setStroke = (color: Color) => parts.push(`${color.r.toFixed(3)} ${color.g.toFixed(3)} ${color.b.toFixed(3)} RG`);
  const fontName = (font: Font) => (font === "bold" ? "/F2" : font === "oblique" ? "/F3" : "/F1");

  const drawText = (text: string, x: number, y: number, size: number, font: Font, color: Color) => {
    setFill(color);
    parts.push("BT", `${fontName(font)} ${size} Tf`, `1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm`, `(${escapePdfText(text)}) Tj`, "ET");
  };

  const rightAlign = (text: string, size: number, font: Font) =>
    pageWidth - marginX - measure(text, size, font);

  if (showRunningHeader) {
    drawText(confidentialityLabel, marginX, headerBaseline, 7.5, "bold", muted);
    const caseLabel = `Case ${caseReference}`;
    drawText(caseLabel, rightAlign(caseLabel, 7.5, "bold"), headerBaseline, 7.5, "bold", muted);
    setFill(hairline);
    parts.push(`${marginX} ${headerRuleY} ${contentWidth} 0.6 re f`);
  }

  for (const op of ops) {
    if (op.type === "rect") {
      if (op.fill) {
        setFill(op.fill);
        parts.push(`${op.x.toFixed(2)} ${(op.absY - op.h).toFixed(2)} ${op.w.toFixed(2)} ${op.h.toFixed(2)} re f`);
      }

      if (op.stroke) {
        setStroke(op.stroke);
        parts.push(`${(op.lineWidth ?? 0.7).toFixed(2)} w`);
        parts.push(`${op.x.toFixed(2)} ${(op.absY - op.h).toFixed(2)} ${op.w.toFixed(2)} ${op.h.toFixed(2)} re S`);
      }

      continue;
    }

    drawText(op.text, op.x, op.absY, op.size, op.font, op.color);
  }

  setFill(hairline);
  parts.push(`${marginX} ${footerRuleY} ${contentWidth} 0.6 re f`);
  drawText(preparationPdfFooter, marginX, footerBaseline, 7.5, "regular", muted);
  const pageLabel = `Generated ${generated}    Page ${page} of ${total}`;
  drawText(pageLabel, rightAlign(pageLabel, 7.5, "regular"), footerBaseline, 7.5, "regular", muted);

  return parts.join("\n");
}

function buildPdf(pages: PlacedOp[][], caseReference: string, generated: string) {
  const objects: string[] = [];
  const pageIds = pages.map((_, index) => 6 + index * 2);

  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[1] = `<< /Type /Pages /Count ${pages.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`;
  objects[2] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>";

  pages.forEach((ops, index) => {
    const pageId = pageIds[index];
    const stream = serializePage(ops, caseReference, generated, index + 1, pages.length);

    objects[pageId - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${pageId + 1} 0 R >>`;
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

export function renderPreparationPdf(summary: PreparationSummary, { includeNotes }: { includeNotes: boolean }) {
  const redacted = redactForExport(summary, { includeNotes });
  const generated = formatPdfDate(summary.generatedAt);
  const groups: Group[] = [];

  // Title block, page one only.
  const title = textBlock(confidentialityLabel, 0, { color: ink, font: "bold", leading: 19, size: 15 });
  const titleOps = [...title.ops];
  let dy = title.dy + 8;
  titleOps.push({ dy, fill: goldRule, h: 2, type: "rect", w: contentWidth, x: marginX });
  dy += 6;
  const meta = textBlock(`Case ${redacted.caseReference}`, dy, {
    color: ink,
    font: "bold",
    leading: 14,
    size: 11,
  });
  titleOps.push(...meta.ops);
  const dateLine = textBlock(`Generated ${generated}`, meta.dy + 1, {
    color: muted,
    leading: 11,
    size: 9,
  });
  titleOps.push(...dateLine.ops);
  const disclosure = textBlock(
    includeNotes
      ? "Includes internal reviewer notes at the reviewer's request."
      : "Internal reviewer notes are excluded from this export.",
    dateLine.dy + 1,
    { color: muted, font: "oblique", leading: 11, size: 8.5 },
  );
  titleOps.push(...disclosure.ops);
  groups.push({ height: disclosure.dy + 22, ops: titleOps });

  // The brief leads, so a reader is not pages deep before reaching what needs
  // attention first. Every line repeats below in its own section.
  const brief = buildCaseBrief(redacted.sections);

  if (brief.length > 0) {
    groups.push(sectionHeadingGroup("Case Brief", "Drawn from the sections that follow. Nothing here is new."));

    for (const entry of brief) {
      groups.push(...itemGroups(entry.label, entry.value));
    }

    groups.push({ height: 10, ops: [] });
  }

  for (const section of redacted.sections) {
    groups.push(sectionHeadingGroup(section.title, section.provenance));

    for (const item of section.items) {
      groups.push(...itemGroups(item.label, item.value));
    }

    // Pull the closing item along with whatever follows it in this section, so
    // a reviewer note never opens a page detached from its section.
    const trailing = section.withheld > 0 || section.note;

    if (trailing && groups.length > 0) {
      groups[groups.length - 1].keepWithNext = true;
    }

    if (section.withheld > 0) {
      const withheld = textBlock(
        `${section.withheld} identifying detail${section.withheld === 1 ? "" : "s"} withheld from this export.`,
        0,
        { color: muted, font: "oblique", leading: 11, size: 8.5 },
      );
      groups.push({ height: withheld.dy + 8, keepWithNext: Boolean(section.note), ops: withheld.ops });
    }

    if (section.note) {
      groups.push(...noteGroups(section.note));
    }

    groups.push({ height: 14, ops: [] });
  }

  return buildPdf(paginate(groups), redacted.caseReference, generated);
}
