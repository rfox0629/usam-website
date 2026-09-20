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
import { formatAssessmentReportDate, type AssessmentDiscussionItem, type AssessmentReportData } from "@/src/lib/dos/assessment-report-data";

export const assessmentReportDocumentTitle = "Marriage Assessment Results";
export const assessmentReportFileName = `${assessmentReportDocumentTitle}.pdf`;

/* The DOS tokens, as PDF unit RGB. dos.blue and dos.green. */
const INK: PdfRgb = [0.043, 0.071, 0.125];
const BODY: PdfRgb = [0.239, 0.271, 0.329];
const QUIET: PdfRgb = [0.353, 0.392, 0.451];
const BLUE: PdfRgb = [0.133, 0.318, 0.909];
const GREEN: PdfRgb = [0.016, 0.471, 0.341];
const RULE: PdfRgb = [0.898, 0.910, 0.937];

const MARGIN = 54;
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const CONTENT = PAGE_WIDTH - MARGIN * 2;
const FOOTER_BASELINE = PAGE_HEIGHT - 32;
const CONTENT_BOTTOM = FOOTER_BASELINE - 22;

/* The same four labels the screen prints, so a reader moving between the page
   and the file meets the same words. */
function discussionLabel(item: AssessmentDiscussionItem) {
  if (item.kind === "strength") {
    return "You both scored this highly";
  }

  if (item.kind === "difference") {
    return "You saw this differently";
  }

  if (item.kind === "hidden_low_answer") {
    return "A low answer inside a strong area";
  }

  return "Lowest in this assessment";
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

/* USA-282: a section that runs past the page reprints its own heading, so a
   reader who turns over never meets a column of numbers with no title. The
   heading is repeated verbatim with "(continued)" appended, which is the
   convention a printed report is read with. */
function ensureRoom(flow: Flow, needed: number, continuationHeading?: string) {
  if (flow.y + needed <= CONTENT_BOTTOM) {
    return;
  }

  startPage(flow);

  if (continuationHeading) {
    flow.doc.text(`${continuationHeading} (continued)`, { color: INK, font: "bold", size: 13.5, x: MARGIN, y: flow.y });
    flow.y += 18;
  }
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

/* A white card: a hairline border and a coloured edge, no fill. The page is
   the surface, which is what keeps a printed copy from laying down bands of
   grey ink behind the numbers a reader is trying to read. */
function card(flow: Flow, { accent, height, width, x, y }: {
  accent: PdfRgb; height: number; width: number; x: number; y: number;
}) {
  flow.doc.rect({ color: RULE, height: 0.5, width, x, y });
  flow.doc.rect({ color: RULE, height: 0.5, width, x, y: y + height });
  flow.doc.rect({ color: RULE, height, width: 0.5, x: x + width, y });
  flow.doc.rect({ color: accent, height, width: 2.5, x, y });
}

/** One participant's own total, with the person's name doing the work. */
function scoreCard(flow: Flow, { accent, label, max, name, score, x, width }: {
  accent: PdfRgb; label: string; max: number; name: string; score: number; width: number; x: number;
}) {
  const top = flow.y;

  card(flow, { accent, height: 58, width, x, y: top });
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

/* A name is whatever the couple entered. "Jean-Christophe Ngoyi-Mwamba" does
   not fit a table column, so column headings wrap inside their own width
   rather than running into the next column. Two lines is enough for the names
   people actually have; a third is truncated rather than allowed to collide. */
function fitLines(value: string, size: number, font: "bold" | "regular", width: number, maxLines: number) {
  const lines = wrapText(value, size, font, width);

  if (lines.length <= maxLines) {
    return lines;
  }

  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];

  while (last.length > 1 && measureText(`${last}...`, size, font) > width) {
    last = last.slice(0, -1);
  }

  kept[maxLines - 1] = `${last}...`;

  return kept;
}

function categoryHeader(flow: Flow, firstName: string, secondName: string) {
  const { combinedRight, firstX, secondX } = categoryColumns();
  const gutter = 10;
  const firstLines = fitLines(firstName, 8, "bold", CATEGORY_COLUMN_WIDTH - gutter, 2);
  const secondLines = fitLines(secondName, 8, "bold", CATEGORY_COLUMN_WIDTH - gutter, 2);
  const rows = Math.max(firstLines.length, secondLines.length);

  ensureRoom(flow, 14 + rows * 10);

  const top = flow.y;

  flow.doc.text("Category", { color: QUIET, size: 8, x: MARGIN, y: top });
  firstLines.forEach((line, index) => {
    flow.doc.text(line, { color: BLUE, font: "bold", size: 8, x: firstX, y: top + index * 10 });
  });
  secondLines.forEach((line, index) => {
    flow.doc.text(line, { color: GREEN, font: "bold", size: 8, x: secondX, y: top + index * 10 });
  });
  flow.doc.text("Together", {
    color: QUIET, size: 8,
    x: combinedRight - measureText("Together", 8, "regular"), y: top,
  });

  flow.y = top + (rows - 1) * 10 + 8;
  flow.doc.line({ color: RULE, thickness: 0.4, x1: MARGIN, x2: MARGIN + CONTENT, y: flow.y });
  flow.y += 14;
}

function categoryRow(flow: Flow, { combined, firstValue, max, name, onBreak, secondValue }: {
  combined: string; firstValue: number; max: number; name: string; onBreak?: () => void; secondValue: number;
}) {
  const { combinedRight, firstX, secondX } = categoryColumns();

  /* A table that runs over reprints its heading AND its column names, so the
     second page is not four unlabelled columns of numbers. */
  if (flow.y + 24 > CONTENT_BOTTOM) {
    startPage(flow);
    onBreak?.();
  }

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
  paragraph(flow, `Completed ${formatAssessmentReportDate(data.completedAt)}`, { color: QUIET, size: 9.5 });

  /* The sender, and the organization only when the affiliation is verified.
     A report must not print an organization's name under someone who is not
     part of it, so there is no default and no hard-coded ministry here. */
  if (data.requestedBy?.name) {
    const affiliation = data.requestedBy.organization
      ? `Requested by ${data.requestedBy.name}, ${data.requestedBy.organization}`
      : `Requested by ${data.requestedBy.name}`;

    paragraph(flow, affiliation, { color: QUIET, size: 9.5 });
  }

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

  flow.y += 80;

  const average = `${data.overallScore} of ${data.maxScore}`;

  doc.text("Average score", { color: INK, font: "bold", size: 10.5, x: MARGIN, y: flow.y });
  doc.text(`${average}   ${data.percentage}%`, {
    color: INK, font: "bold", size: 10.5,
    x: MARGIN + CONTENT - measureText(`${average}   ${data.percentage}%`, 10.5, "bold"),
    y: flow.y,
  });
  flow.y += 16;

  /* USA-281: one line, not a paragraph. The long version restated the
     arithmetic the two cards above had already shown and cost the first page
     roughly five lines, which is most of the room the fifth category row
     needed. The honesty the long version carried is kept: it still says this
     is an average of what was said on one date, and not a diagnosis. */
  paragraph(
    flow,
    "Average of your two scores. This reflects your answers on this date, not a diagnosis.",
    { color: QUIET, size: 9 },
  );
  flow.y += 6;

  /* Worth talking about, chosen by the documented rules in
     assessment-report-data.ts. Each entry names its category, prints the
     figures it was chosen from and points at the question by number, which is
     how a reader checks it on paper where there is nothing to click. */
  sectionHeading(flow, "Worth talking about");

  if (data.discussion.length) {
    for (const item of data.discussion) {
      const label = discussionLabel(item);
      const titleLines = wrapText(item.title, 10.5, "bold", CONTENT - 16);
      const scoreLines = wrapText(item.scoreLine, 9, "regular", CONTENT - 16);
      const promptLines = wrapText(item.discussionPrompt, 9.5, "regular", CONTENT - 16);
      const reference = item.questionNumber ? `See question ${item.questionNumber}` : "";
      /* How far the cursor travels while the card is written, and how far the
         last of those lines advanced. The card is drawn from the two, so the
         border sits clear of the descenders instead of through them. */
      const written = 12 + titleLines.length * 13 + scoreLines.length * 11 + promptLines.length * 12
        + (reference ? 12 : 0);
      const lastAdvance = reference ? 12 : promptLines.length ? 12 : scoreLines.length ? 11 : 13;
      const height = written - lastAdvance + 22;

      ensureRoom(flow, height + 8, "Worth talking about");

      const top = flow.y - 11;
      const accent = item.kind === "strength" ? GREEN : BLUE;

      card(flow, { accent, height, width: CONTENT, x: MARGIN, y: top });
      flow.doc.text(label.toUpperCase(), { color: accent, font: "bold", size: 7.5, x: MARGIN + 14, y: flow.y });
      flow.y += 12;

      for (const line of titleLines) {
        flow.doc.text(line, { color: INK, font: "bold", size: 10.5, x: MARGIN + 14, y: flow.y });
        flow.y += 13;
      }

      for (const line of scoreLines) {
        flow.doc.text(line, { color: BODY, font: "bold", size: 9, x: MARGIN + 14, y: flow.y });
        flow.y += 11;
      }

      for (const line of promptLines) {
        flow.doc.text(line, { color: BODY, size: 9.5, x: MARGIN + 14, y: flow.y });
        flow.y += 12;
      }

      if (reference) {
        flow.doc.text(reference, { color: QUIET, font: "bold", size: 8.5, x: MARGIN + 14, y: flow.y });
        flow.y += 12;
      }

      flow.y += 30 - lastAdvance;
    }
  } else {
    paragraph(flow, "Not enough answers yet to pick anything out.");
  }

  /* USA-281: the WHOLE table is measured before any of it is placed.
   *
   * Reserving only the heading and two rows is what stranded Affection &
   * Intimacy alone on page 2 with the rest of the sheet blank: four rows fit,
   * the fifth broke, and the answers then started a fresh page behind it. A
   * table that cannot fit entire starts on the next page as one block, so a
   * reader never turns a page for one line.
   *
   * The height is computed from the same wrapping the rows actually use, so a
   * long category name is counted, not guessed at. */
  const categoryTableHeight = (() => {
    const firstLines = fitLines(nameForRole(first?.role ?? ""), 8, "bold", CATEGORY_COLUMN_WIDTH - 10, 2);
    const secondLines = fitLines(nameForRole(second?.role ?? ""), 8, "bold", CATEGORY_COLUMN_WIDTH - 10, 2);
    const headerHeight = 14 + Math.max(firstLines.length, secondLines.length) * 10;
    const rowsHeight = data.categories.reduce(
      (total, category) => total + wrapText(category.name, 9.5, "bold", CATEGORY_NAME_WIDTH - 10).length * 12 + 18,
      0,
    );

    /* sectionHeading's own advance, the column names, then every row. */
    return 30 + headerHeight + rowsHeight;
  })();

  ensureRoom(flow, categoryTableHeight);
  sectionHeading(flow, "By category");

  const firstRole = first?.role ?? "";
  const secondRole = second?.role ?? "";

  categoryHeader(flow, nameForRole(firstRole), nameForRole(secondRole));

  for (const category of data.categories) {
    const firstValue = firstRole === "Wife" ? category.wifeScore ?? 0 : category.husbandScore ?? 0;
    const secondValue = secondRole === "Wife" ? category.wifeScore ?? 0 : category.husbandScore ?? 0;

    categoryRow(flow, {
      combined: `${category.combinedScore}/${category.combinedMaxScore}  ${category.percentage}%`,
      firstValue,
      max: category.maxScore,
      name: category.name,
      onBreak: () => {
        flow.doc.text("By category (continued)", { color: INK, font: "bold", size: 13.5, x: MARGIN, y: flow.y });
        flow.y += 18;
        categoryHeader(flow, nameForRole(firstRole), nameForRole(secondRole));
      },
      secondValue,
    });
  }

  /* Every answer, in full, starting on a fresh page. The overview is a page
     someone reads; the answers are a reference they look things up in, and
     running the two together is what made the old file feel like a dump. */
  startPage(flow);
  flow.doc.text("Every answer", { color: INK, font: "bold", size: 13.5, x: MARGIN, y: flow.y });
  flow.y += 20;

  /* USA-281: the document groups the answers the way the screen does, so a
     reader moving between the two is looking at the same structure. The
     category is stated once as a heading instead of being repeated on every
     question's eyebrow, and a heading is never left at the foot of a page
     without at least the first question under it.

     Order, wording, numbering and both answers are untouched. */
  let currentGroup: string | null = null;

  data.questions.forEach((question, index) => {
    const groupName = question.group?.trim() || "Other questions";
    /* USA-281: the number rides on the prompt rather than taking a line of its
       own above it, which is what the screen does too. Fifteen questions each
       spending a line on "Question 7" is most of the difference between the
       answers fitting one page and running onto a second. */
    const promptLines = wrapText(`${question.number}. ${question.prompt}`, 10, "bold", CONTENT);
    const noteLines = question.note ? wrapText(question.note, 8.5, "regular", CONTENT) : [];

    const firstScore = firstRole ? question.scores?.[firstRole] : undefined;
    const secondScore = secondRole ? question.scores?.[secondRole] : undefined;
    const firstText = `${nameForRole(firstRole)}  ${typeof firstScore === "number" ? `${firstScore} of 10` : "not answered"}`;
    const secondText = `${nameForRole(secondRole)}  ${typeof secondScore === "number" ? `${secondScore} of 10` : "not answered"}`;

    /* Side by side when both fit, stacked when a name is long. Neither
       arrangement is allowed to overlap the other. */
    const firstWidth = measureText(firstText, 9.5, "bold");
    const secondWidth = measureText(secondText, 9.5, "bold");
    const secondX = Math.max(firstWidth + 28, CONTENT / 2);
    const sideBySide = secondX + secondWidth <= CONTENT;

    /* The block is the eyebrow, the prompt, any note, BOTH answers and the
       rule under them. Reserving exactly that keeps a question with what the
       couple said about it without ending a page early on space it never
       needed. */
    const blockHeight = promptLines.length * 13 + noteLines.length * 10
      + 1 + (sideBySide ? 10 : 21) + 6;

    if (groupName !== currentGroup) {
      /* The heading travels with the first question under it. */
      ensureRoom(flow, blockHeight + 20, "Every answer");
      flow.y += currentGroup === null ? 0 : 6;
      flow.doc.text(groupName.toUpperCase(), { color: BLUE, font: "bold", size: 8, x: MARGIN, y: flow.y });
      flow.y += 13;
      currentGroup = groupName;
    } else {
      ensureRoom(flow, blockHeight, "Every answer");
    }

    for (const line of promptLines) {
      flow.doc.text(line, { color: INK, font: "bold", size: 10, x: MARGIN, y: flow.y });
      flow.y += 13;
    }

    for (const line of noteLines) {
      flow.doc.text(line, { color: QUIET, size: 8.5, x: MARGIN, y: flow.y });
      flow.y += 10;
    }

    flow.y += 1;

    flow.doc.text(firstText, { color: BLUE, font: "bold", size: 9.5, x: MARGIN, y: flow.y });

    if (sideBySide) {
      flow.doc.text(secondText, { color: GREEN, font: "bold", size: 9.5, x: MARGIN + secondX, y: flow.y });
      flow.y += 10;
    } else {
      flow.y += 11;
      flow.doc.text(secondText, { color: GREEN, font: "bold", size: 9.5, x: MARGIN, y: flow.y });
      flow.y += 10;
    }

    if (index < data.questions.length - 1) {
      flow.doc.line({ color: RULE, thickness: 0.4, x1: MARGIN, x2: MARGIN + CONTENT, y: flow.y });
      flow.y += 6;
    }
  });

  /* Footers last, so the page count is known. */
  const total = doc.pageCount;

  for (let page = 1; page <= total; page += 1) {
    doc.setFooter(page, ({ text, line }) => {
      line({ color: RULE, thickness: 0.4, x1: MARGIN, x2: MARGIN + CONTENT, y: FOOTER_BASELINE - 12 });
      text(assessmentReportDocumentTitle, { color: QUIET, size: 8, x: MARGIN, y: FOOTER_BASELINE });
      /* Provenance, quietly. No workspace slug, no personal URL, no token:
         the reader is told which product made the file and nothing that
         identifies the account it came from. */
      const provenance = "Powered by Discipleship Operating System";
      text(provenance, {
        color: QUIET, size: 7.5,
        x: MARGIN + (CONTENT - measureText(provenance, 7.5, "regular")) / 2,
        y: FOOTER_BASELINE,
      });
      const label = `Page ${page} of ${total}`;
      text(label, { color: QUIET, size: 8, x: MARGIN + CONTENT - measureText(label, 8, "regular"), y: FOOTER_BASELINE });
    });
  }

  return doc.build();
}
