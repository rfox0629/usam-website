/* USA-281: render the Marriage Assessment PDF and report how it paginates.
 *
 * The screenshot audit found page 1 holding only four category rows, page 2
 * holding one category and then most of a blank sheet, and page 3 holding all
 * fifteen questions. This builds the document from synthetic fixtures and
 * prints what actually landed on each page, so pagination is measured rather
 * than eyeballed.
 *
 * Fixtures only. No real assessment, answer or link is read.
 *
 * Usage: node --experimental-loader ./scripts/ts-loader.mjs \
 *          scripts/dos-assessment-report-pdf-render.mjs [outDir]
 */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { buildAssessmentReportData } from "../src/lib/dos/assessment-report-data.ts";
import { buildAssessmentReportPdf, assessmentReportDocumentTitle } from "../src/lib/dos/assessment-report-pdf.ts";
import { getDosResourceBySlug } from "../src/lib/dos/resource-catalog.ts";

const outDir = process.argv[2] ?? null;

const resource = getDosResourceBySlug("marriage-assessment");
assert.ok(resource?.content?.assessment, "the marriage assessment resource is available");
const questions = resource.content.assessment.questions;
const maxScore = questions.length * 10;

/* The photographed example: fifteen questions, both spouses high, wife first.
   The exact answers from the founder's screenshots, so the page counts below
   describe the document he was looking at. */
const photographed = {
  answers: Object.fromEntries(questions.map((question, index) => {
    const score = [10, 10, 9, 8, 8, 10, 10, 9, 9, 10, 10, 9, 8, 9, 9][index] ?? 9;

    return [question.id, { Husband: score, Wife: score }];
  })),
  label: "photographed",
  participants: [
    { name: "Brooke Fox", role: "Wife" },
    { name: "Ryan Fox", role: "Husband" },
  ],
  requestedBy: { name: "Ryan Fox", organization: null },
};

/* A harder case the brief asks for: long accented names, unequal scores, and
   enough spread to produce more discussion items. */
const stressed = {
  answers: Object.fromEntries(questions.map((question, index) => [
    question.id,
    { Husband: [10, 4, 9, 3, 8, 10, 6, 9, 2, 10, 7, 9, 5, 9, 8][index] ?? 7, Wife: [6, 9, 5, 9, 4, 10, 9, 3, 8, 10, 3, 9, 9, 4, 9][index] ?? 6 },
  ])),
  label: "long-names-unequal",
  participants: [
    { name: "Marie-Élise Ngoyi-Mwamba", role: "Wife" },
    { name: "Jean-Christophe Ngoyi-Mwamba", role: "Husband" },
  ],
  requestedBy: { name: "Jean-Christophe Ngoyi-Mwamba", organization: "USA Missionaries" },
};

/* Both at the ceiling, which is the case that used to be told its strongest
   area was its weakest. */
const maxed = {
  answers: Object.fromEntries(questions.map((question) => [question.id, { Husband: 10, Wife: 10 }])),
  label: "max-scores",
  participants: [
    { name: "Ada Fox", role: "Wife" },
    { name: "Bo Fox", role: "Husband" },
  ],
  requestedBy: { name: "Bo Fox", organization: null },
};

let failures = 0;

function check(label, condition, detail = "") {
  console.log(`${condition ? "PASS" : "FAIL"}  ${label}${detail ? ` :: ${detail}` : ""}`);
  if (!condition) failures += 1;
}

for (const fixture of [photographed, stressed, maxed]) {
  const data = buildAssessmentReportData({
    answers: fixture.answers,
    completedAt: "2026-09-17T15:00:00.000Z",
    maxScore,
    participants: fixture.participants,
    questions,
    requestedBy: fixture.requestedBy,
    title: assessmentReportDocumentTitle,
  });

  const bytes = buildAssessmentReportPdf(data);
  const text = Buffer.from(bytes).toString("latin1");
  /* Page objects, in document order. Each page's content stream holds the
     text drawn on it, so what landed where is read from the bytes. */
  const pageCount = (text.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  const streams = [...text.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map((match) => match[1]);
  /* Every literal string drawn, per stream, so a page can be searched for the
     words that should be on it. */
  const pageText = streams.map((stream) => [...stream.matchAll(/\((?:[^()\\]|\\.)*\)/g)].map((piece) => piece[0].slice(1, -1)).join(" "));

  console.log(`\n--- ${fixture.label}: ${pageCount} pages, ${data.discussion.length} discussion items`);
  pageText.forEach((content, index) => {
    console.log(`    page ${index + 1}: ${content.replace(/\s+/g, " ").slice(0, 110)}`);
  });

  const categoryNames = data.categories.map((category) => category.name);
  const pageWithCategories = pageText.findIndex((content) => categoryNames.every((name) => content.includes(name)));

  check(`${fixture.label}: every category row is on one page`, pageWithCategories >= 0, pageWithCategories >= 0 ? `page ${pageWithCategories + 1}` : "split across pages");

  /* No page may be nearly empty. The footer is on every page, so a page whose
     only other content is a line or two is the stranded-category defect. */
  const sparse = pageText
    .map((content, index) => ({ content, index }))
    .filter(({ content }) => content.replace(/\s+/g, "").length < 260);

  check(
    `${fixture.label}: no page is left nearly empty`,
    sparse.length === 0,
    sparse.map(({ index }) => `page ${index + 1}`).join(", ") || "none",
  );

  /* Every question and both answers survive, whatever the pagination. */
  const allText = pageText.join(" ");

  for (const question of data.questions) {
    const head = question.prompt.slice(0, 18);

    if (!allText.includes(head)) {
      check(`${fixture.label}: question ${question.number} is present`, false, head);
    }
  }

  check(`${fixture.label}: all ${data.questions.length} questions are present`, data.questions.every((question) => allText.includes(question.prompt.slice(0, 18))));
  check(`${fixture.label}: both participants are named`, fixture.participants.every((participant) => {
    const asciiRun = participant.name.split(/[^A-Za-z]+/).filter((piece) => piece.length >= 4)[0] ?? participant.name;

    return allText.includes(asciiRun);
  }));
  check(`${fixture.label}: the footer names DOS`, allText.includes("Powered by Discipleship Operating System"));
  check(`${fixture.label}: no workspace URL or slug reaches the document`, !/https?:\/\/|\/dos\//.test(allText));

  if (fixture.label === "photographed") {
    check("photographed: the normal-length report is two pages", pageCount === 2, `${pageCount} pages`);
  }

  if (outDir) {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(`${outDir}/${fixture.label}.pdf`, Buffer.from(bytes));
  }
}

console.log(failures ? `\nFAILURES: ${failures}` : "\ndos-assessment-report-pdf-render: ok");
process.exit(failures ? 1 : 0);
