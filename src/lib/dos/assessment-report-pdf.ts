/**
 * The Marriage Assessment Results document, drawn rather than printed.
 *
 * This reads the SAME `AssessmentReportData` the on-screen report renders, so
 * a number can never differ between the screen and the file. Nothing here
 * recomputes a score; it lays out what it is given.
 *
 * What the browser's own print produced before this existed: five sparse
 * pages, "Workspace | DOS" and the discipler's personal workspace URL stamped
 * into a header and footer we do not control. None of that can reach these
 * bytes, because nothing outside this file writes them.
 *
 * Colour carries no meaning on its own. Blue marks the first participant and
 * green the second, but every figure is also labelled with that person's name
 * and printed as a number, so the document reads the same in grayscale and
 * neither colour suggests one spouse is doing better than the other.
 */

import { PdfDocument, measureText, wrapText, type PdfRgb } from "@/src/lib/pdf/pdf-document";
import type { AssessmentReportData } from "@/src/components/dos/assessments/AssessmentReport";

export const assessmentReportDocumentTitle = "Marriage Assessment Results";
export const assessmentReportFileName = `${assessmentReportDocumentTitle}.pdf`;

/* The DOS tokens, as PDF unit RGB. dos.blue and dos.green. */
const INK: PdfRgb = [0.043, 0.071, 0.125];
const BODY: PdfRgb = [0.239, 0.271, 0.329];
const QUIET: PdfRgb = [0.353, 0.392, 0.451];
const BLUE: PdfRgb = [0.133, 0.318, 0.909];
const GREEN: PdfRgb = [0.016, 0.471, 0.341];
const RULE: PdfRgb = [0.898, 0.910, 0.937];
const BAND: PdfRgb = [0.969, 0.973, 0.984];

const MARGIN = 54;
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const CONTENT = PAGE_WIDTH - MARGIN * 2;
const FOOTER_BASELINE = PAGE_HEIGHT - 32;
const CONTENT_BOTTOM = FOOTER_BASELINE - 22;

function formatReportDate(value: string | null) {
  if (!value) {
    return "Date not recorded";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Date not recorded";
  }

  return parsed.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}

type Flow = {
  doc: PdfDocument;
  y: number;
  page: number;
};

function startPage(flow: Flow, { first = false }: { first?: boolean } = {}) {
  flow.page = flow.doc.addPage();
  flow.doc.rect({ color: BLUE, height: first ? 5 : 2.5, width: PAGE_WIDTH, x: 0, y: 0 });
  flow.y = first ? 72 : 62;
}

function ensureRoom(flow: Flow, needed: number) {
  if (flow.y + needed <= CONTENT_BOTTOM) {
    return;
  }

  startPage(flow);
}

function sectionHeading(flow: Flow, heading: string) {
  ensureRoom(flow, 46);
  flow.doc.line({ color: RULE, x1: MARGIN, x2: MARGIN + CONTENT, y: flow.y });
  flow.y += 16;
  flow.doc.text(heading, { color: INK, font: "bold", size: 13.5, x: MARGIN, y: flow.y });
  flow.y += 18;
}

function paragraph(flow: Flow, text: string, { color = BODY, size = 10, width = CONTENT, x = MARGIN }: {
  color?: PdfRgb; size?: number; width?: number; x?: number;
} = {}) {
  const lines = wrapText(text, size, "regular", width);
  const lineHeight = size * 1.45;

  ensureRoom(flow, lines.length * lineHeight);

  for (const line of lines) {
    flow.doc.text(line, { color, size, x, y: flow.y });
    flow.y += lineHeight;
  }
}

/** One participant's own total, with the person's name doing the work. */
function scoreCard(flow: Flow, { accent, label, max, name, score, x, width }: {
  accent: PdfRgb; label: string; max: number; name: string; score: number; width: number; x: number;
}) {
  const top = flow.y;

  flow.doc.rect({ color: BAND, height: 58, width, x, y: top });
  flow.doc.rect({ color: accent, height: 58, width: 3, x, y: top });
  flow.doc.text(name, { color: INK, font: "bold", size: 10.5, x: x + 14, y: top + 18 });
  flow.doc.text(label, { color: QUIET, size: 9, x: x + 14, y: top + 32 });

  const figure = `${score}`;
  const suffix = ` of ${max}`;

  flow.doc.text(figure, { color: accent, font: "bold", size: 19, x: x + 14, y: top + 51 });
  flow.doc.text(suffix, {
    color: QUIET,
    size: 9.5,
    x: x + 14 + measureText(figure, 19, "bold") + 4,
    y: top + 51,
  });
}

const CATEGORY_NAME_WIDTH = 132;
const CATEGORY_COLUMN_WIDTH = 132;

function categoryColumns() {
  const firstX = MARGIN + CATEGORY_NAME_WIDTH;

  return { combinedRight: MARGIN + CONTENT, firstX, secondX: firstX + CATEGORY_COLUMN_WIDTH };
}

function categoryHeader(flow: Flow, firstName: string, secondName: string) {
  const { combinedRight, firstX, secondX } = categoryColumns();

  ensureRoom(flow, 22);
  flow.doc.text("Category", { color: QUIET, size: 8, x: MARGIN, y: flow.y });
  flow.doc.text(firstName, { color: BLUE, font: "bold", size: 8, x: firstX, y: flow.y });
  flow.doc.text(secondName, { color: GREEN, font: "bold", size: 8, x: secondX, y: flow.y });
  flow.doc.text("Together", {
    color: QUIET, size: 8,
    x: combinedRight - measureText("Together", 8, "regular"), y: flow.y,
  });
  flow.y += 8;
  flow.doc.line({ color: RULE, thickness: 0.4, x1: MARGIN, x2: MARGIN + CONTENT, y: flow.y });
  flow.y += 14;
}

function categoryRow(flow: Flow, { combined, firstValue, max, name, secondValue }: {
  combined: string; firstValue: number; max: number; name: string; secondValue: number;
}) {
  const { combinedRight, firstX, secondX } = categoryColumns();

  ensureRoom(flow, 24);

  for (const line of wrapText(name, 9.5, "bold", CATEGORY_NAME_WIDTH - 10)) {
    flow.doc.text(line, { color: INK, font: "bold", size: 9.5, x: MARGIN, y: flow.y });
    flow.y += 12;
  }

  const rowY = flow.y - 12;

  flow.doc.text(`${firstValue} of ${max}`, { color: BLUE, size: 9.5, x: firstX, y: rowY });
  flow.doc.text(`${secondValue} of ${max}`, { color: GREEN, size: 9.5, x: secondX, y: rowY });
  flow.doc.text(combined, {
    color: BODY, font: "bold", size: 9.5,
    x: combinedRight - measureText(combined, 9.5, "bold"), y: rowY,
  });
  flow.y += 6;
  flow.doc.line({ color: RULE, thickness: 0.4, x1: MARGIN, x2: MARGIN + CONTENT, y: flow.y });
  flow.y += 12;
}

export function buildAssessmentReportPdf(data: AssessmentReportData) {
  const doc = new PdfDocument({ height: PAGE_HEIGHT, title: assessmentReportDocumentTitle, width: PAGE_WIDTH });
  const flow: Flow = { doc, page: 0, y: 0 };

  const participants = data.participants;
  const first = participants[0];
  const second = participants[1];
  const nameForRole = (role: string) => participants.find((entry) => entry.role === role)?.name ?? role;
  const scoreForRole = (role: string) => data.participantScores.find((entry) => entry.participant === role)?.score ?? 0;

  startPage(flow, { first: true });

  doc.text(assessmentReportDocumentTitle, { color: INK, font: "bold", size: 21, x: MARGIN, y: flow.y });
  flow.y += 22;

  const header = participants.map((entry) => `${entry.name} (${entry.role})`).join(" and ");
  paragraph(flow, header, { color: BODY, size: 10.5 });
  paragraph(flow, `Completed ${formatReportDate(data.completedAt)}`, { color: QUIET, size: 9.5 });
  flow.y += 12;

  /* Scores. Each person's own total first, then the couple figure, labelled
     as the average it actually is. */
  sectionHeading(flow, "Scores");

  const cardWidth = (CONTENT - 14) / 2;

  ensureRoom(flow, 76);

  if (first) {
    scoreCard(flow, {
      accent: BLUE, label: first.role, max: data.maxScore, name: first.name,
      score: scoreForRole(first.role), width: cardWidth, x: MARGIN,
    });
  }

  if (second) {
    scoreCard(flow, {
      accent: GREEN, label: second.role, max: data.maxScore, name: second.name,
      score: scoreForRole(second.role), width: cardWidth, x: MARGIN + cardWidth + 14,
    });
  }

  flow.y += 70;

  const average = `${data.overallScore} of ${data.maxScore}`;

  doc.text("Both answers together", { color: INK, font: "bold", size: 10.5, x: MARGIN, y: flow.y });
  doc.text(`${average}   ${data.percentage}%`, {
    color: INK, font: "bold", size: 10.5,
    x: MARGIN + CONTENT - measureText(`${average}   ${data.percentage}%`, 10.5, "bold"),
    y: flow.y,
  });
  flow.y += 16;

  paragraph(
    flow,
    `Each of you answers fifteen questions on a 0 to 10 scale, so each of you has a score out of ${data.maxScore}. `
    + "The figure above is the average of your two scores. It is a summary of what you each said on one day, "
    + "not a measure of your marriage.",
    { color: QUIET, size: 9 },
  );
  flow.y += 6;

  /* By category. */
  sectionHeading(flow, "By category");

  const firstRole = first?.role ?? "";
  const secondRole = second?.role ?? "";

  categoryHeader(flow, nameForRole(firstRole), nameForRole(secondRole));

  for (const category of data.categories) {
    const firstValue = firstRole === "Wife" ? category.wifeScore ?? 0 : category.husbandScore ?? 0;
    const secondValue = secondRole === "Wife" ? category.wifeScore ?? 0 : category.husbandScore ?? 0;

    categoryRow(flow, {
      combined: `${category.percentage}%`,
      firstValue,
      max: category.maxScore,
      name: category.name,
      secondValue,
    });
  }

  /* Worth talking about. Arithmetic only, never a verdict. */
  const ranked = [...data.categories].sort((a, b) => b.percentage - a.percentage);
  const gaps = data.categories
    .map((category) => ({
      difference: Math.abs((category.husbandScore ?? 0) - (category.wifeScore ?? 0)),
      name: category.name,
    }))
    .filter((entry) => entry.difference > 0)
    .sort((a, b) => b.difference - a.difference);

  sectionHeading(flow, "Worth talking about");
  paragraph(flow, `You both scored these highest: ${ranked.slice(0, 2).map((entry) => entry.name).join(", ")}.`);
  paragraph(flow, `You both scored these lowest: ${[...ranked].reverse().slice(0, 2).map((entry) => entry.name).join(", ")}.`);
  paragraph(
    flow,
    gaps.length
      ? `Where your answers differed most: ${gaps.slice(0, 3).map((entry) => `${entry.name} (${entry.difference} points apart)`).join(", ")}.`
      : "You answered every category the same.",
  );

  /* Every answer, in full. */
  sectionHeading(flow, "Every answer");

  data.questions.forEach((question, index) => {
    const eyebrow = [`Question ${index + 1}`, question.group].filter(Boolean).join("  ·  ");
    const promptLines = wrapText(question.prompt, 10, "bold", CONTENT);
    const noteLines = question.note ? wrapText(question.note, 8.5, "regular", CONTENT) : [];
    const blockHeight = 11 + promptLines.length * 13 + noteLines.length * 11 + 24;

    ensureRoom(flow, blockHeight);

    flow.doc.text(eyebrow, { color: QUIET, size: 8, x: MARGIN, y: flow.y });
    flow.y += 11;

    for (const line of promptLines) {
      flow.doc.text(line, { color: INK, font: "bold", size: 10, x: MARGIN, y: flow.y });
      flow.y += 13;
    }

    for (const line of noteLines) {
      flow.doc.text(line, { color: QUIET, size: 8.5, x: MARGIN, y: flow.y });
      flow.y += 11;
    }

    const firstScore = firstRole ? question.scores?.[firstRole] : undefined;
    const secondScore = secondRole ? question.scores?.[secondRole] : undefined;
    const firstText = `${nameForRole(firstRole)}  ${typeof firstScore === "number" ? `${firstScore} of 10` : "not answered"}`;
    const secondText = `${nameForRole(secondRole)}  ${typeof secondScore === "number" ? `${secondScore} of 10` : "not answered"}`;

    flow.y += 2;
    flow.doc.text(firstText, { color: BLUE, font: "bold", size: 9.5, x: MARGIN, y: flow.y });
    flow.doc.text(secondText, {
      color: GREEN, font: "bold", size: 9.5,
      x: MARGIN + Math.max(measureText(firstText, 9.5, "bold") + 28, CONTENT / 2),
      y: flow.y,
    });
    flow.y += 11;

    if (index < data.questions.length - 1) {
      flow.doc.line({ color: RULE, thickness: 0.4, x1: MARGIN, x2: MARGIN + CONTENT, y: flow.y });
      flow.y += 9;
    }
  });

  /* Footers last, so the page count is known. */
  const total = doc.pageCount;

  for (let page = 1; page <= total; page += 1) {
    doc.setFooter(page, ({ text, line }) => {
      line({ color: RULE, thickness: 0.4, x1: MARGIN, x2: MARGIN + CONTENT, y: FOOTER_BASELINE - 12 });
      text(assessmentReportDocumentTitle, { color: QUIET, size: 8, x: MARGIN, y: FOOTER_BASELINE });
      const label = `Page ${page} of ${total}`;
      text(label, { color: QUIET, size: 8, x: MARGIN + CONTENT - measureText(label, 8, "regular"), y: FOOTER_BASELINE });
    });
  }

  return doc.build();
}
