/* USA-282: the Marriage Assessment report, its arithmetic and its document.
 *
 * Three halves, in the shape the rest of the DOS suite uses. First the
 * arithmetic, run for real against the scoring code, including the three
 * figures that were reported wrong. Then the selection rules behind "Worth
 * talking about". Then the generated PDF, built here and read back out of its
 * own bytes, plus the contract checks over the files that produce it.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  exactPairPercentage,
  pairPercentage,
  scoreAssessmentCategory,
} from "../src/lib/dos/assessment-scoring.ts";
import {
  DISCUSSION_RULES,
  buildAssessmentReportData,
  formatAssessmentReportDate,
} from "../src/lib/dos/assessment-report-data.ts";
import {
  assessmentReportDocumentTitle,
  assessmentReportFileName,
  buildAssessmentReportPdf,
} from "../src/lib/dos/assessment-report-pdf.ts";
import { measureText, winAnsiByte } from "../src/lib/pdf/pdf-document.ts";
import { dosResourceCatalog } from "../src/lib/dos/resource-catalog.ts";

const marriage = dosResourceCatalog.find((entry) => entry.slug === "marriage-assessment");
const questions = marriage.content.assessment.questions;
const maxScore = marriage.content.assessment.maxScore;

function answersFor(pairs, firstRole = "Husband", secondRole = "Wife") {
  const answers = {};

  questions.forEach((question, index) => {
    answers[question.id] = { [firstRole]: pairs[index][0], [secondRole]: pairs[index][1] };
  });

  return answers;
}

function reportFor(pairs, {
  participants = [{ name: "Daniel Okonkwo", role: "Husband" }, { name: "Grace Okonkwo", role: "Wife" }],
  requestedBy = { name: "Ryan Fox", organization: "USA Missionaries" },
} = {}) {
  return buildAssessmentReportData({
    answers: answersFor(pairs, participants[0].role, participants[1].role),
    completedAt: "2026-09-14T18:22:00.000Z",
    maxScore,
    participants,
    questions,
    requestedBy,
    title: "Marriage Assessment",
  });
}

/* 1. The arithmetic, including the three figures that were reported wrong.
      Each was the rounded AVERAGE turned into a percentage of ONE person's
      maximum. The percentage is the couple's combined score over the couple's
      combined maximum, rounded once, for display only. */
const reported = [
  { name: "Connection", first: 22, second: 17, max: 30, wasShown: 67, shouldBe: 65 },
  { name: "Family & Community", first: 27, second: 28, max: 30, wasShown: 93, shouldBe: 92 },
  { name: "Affection & Intimacy", first: 19, second: 18, max: 20, wasShown: 95, shouldBe: 93 },
];

for (const entry of reported) {
  const combined = entry.first + entry.second;

  assert.equal(
    pairPercentage(combined, entry.max, 2),
    entry.shouldBe,
    `${entry.name} should read ${entry.shouldBe}%, not ${entry.wasShown}%`,
  );
  /* And the old, wrong way must no longer be what any of them produces. */
  const oldWay = Math.round((Math.round(combined / 2) / entry.max) * 100);
  assert.equal(oldWay, entry.wasShown, `${entry.name}: the reported figure came from the old double rounding`);
  assert.notEqual(pairPercentage(combined, entry.max, 2), oldWay, `${entry.name} still double rounds`);
}

assert.equal(pairPercentage(0, 30, 2), 0);
assert.equal(pairPercentage(60, 30, 2), 100);
assert.equal(pairPercentage(5, 0, 2), 0, "a zero maximum cannot divide");
assert.ok(Math.abs(exactPairPercentage(39, 30, 2) - 65) < 1e-9, "the unrounded figure is kept for ordering");

/* The category scorer itself, not only the helper. */
const connection = scoreAssessmentCategory(
  { "respect-love": { Husband: 8, Wife: 6 }, "connect-with-god": { Husband: 7, Wife: 6 }, "time-together": { Husband: 7, Wife: 5 } },
  { name: "Connection", questions: questions.slice(0, 3) },
  ["Husband", "Wife"],
);
assert.equal(connection.combinedScore, 39);
assert.equal(connection.combinedMaxScore, 60);
assert.equal(connection.percentage, 65);
assert.equal(connection.score, 20, "the rounded average is still reported as the average");

/* 2. Every category on a built report agrees with its own figures, and the
      overall percentage is the same arithmetic over the whole assessment. */
const unequal = reportFor([
  [8, 5], [7, 4], [6, 3], [9, 6], [8, 5], [7, 4], [10, 7], [9, 6], [8, 5], [7, 3], [9, 8], [10, 9], [8, 4], [7, 6], [9, 5],
]);

for (const category of unequal.categories) {
  assert.equal(
    category.percentage,
    Math.round((category.combinedScore / category.combinedMaxScore) * 100),
    `${category.name}: the percentage must be its own combined score over its own maximum`,
  );
  assert.equal(category.combinedScore, (category.husbandScore ?? 0) + (category.wifeScore ?? 0));
}

const totals = unequal.participantScores.reduce((sum, entry) => sum + entry.score, 0);
assert.equal(unequal.percentage, Math.round((totals / (maxScore * 2)) * 100));
assert.equal(unequal.overallScore, Math.round(totals / 2), "the overall score is the average of the two");

/* 3. The discussion rules. Deterministic, documented, and never a diagnosis. */
const rulesSource = readFileSync(new URL("../src/lib/dos/assessment-report-data.ts", import.meta.url), "utf8");
assert.ok(
  /not clinical cutoffs/i.test(rulesSource) && /not a diagnosis/i.test(rulesSource),
  "the thresholds must say in the file that they are display rules, not clinical cutoffs",
);
assert.equal(typeof DISCUSSION_RULES.absoluteLowPercentage, "number");
assert.equal(typeof DISCUSSION_RULES.lowestCategoryCeiling, "number");

/* The same answers always produce the same list, in the same order. */
const again = reportFor([
  [8, 5], [7, 4], [6, 3], [9, 6], [8, 5], [7, 4], [10, 7], [9, 6], [8, 5], [7, 3], [9, 8], [10, 9], [8, 4], [7, 6], [9, 5],
]);
assert.deepEqual(
  again.discussion.map((item) => `${item.kind}:${item.title}`),
  unequal.discussion.map((item) => `${item.kind}:${item.title}`),
  "the selection must be deterministic",
);

/* No question is named twice. */
const named = unequal.discussion.map((item) => item.questionId).filter(Boolean);
assert.equal(new Set(named).size, named.length, "a question may appear in at most one discussion item");

/* A relative low is not an absolute one, and a perfect assessment has no
   "lowest area" at all. */
const perfect = reportFor(Array.from({ length: 15 }, () => [10, 10]));
assert.equal(
  perfect.discussion.filter((item) => item.kind === "lowest_category").length,
  0,
  "nothing scored 100% may be called the place with the most room",
);
assert.ok(
  perfect.discussion.every((item) => item.kind === "strength"),
  "a perfect assessment has strengths and nothing else",
);

const low = reportFor([
  [3, 2], [2, 3], [4, 1], [3, 3], [2, 2], [1, 4], [5, 3], [4, 4], [3, 2], [2, 1], [4, 3], [3, 4], [2, 2], [3, 1], [4, 3],
]);
const lowest = low.discussion.filter((item) => item.kind === "lowest_category");
assert.ok(lowest.length > 0, "a low assessment names its lowest areas");
assert.ok(
  lowest.every((item) => /at or below \d+% of the possible score/.test(item.discussionPrompt)),
  "a category that is low in its own right says so, beyond being merely the lowest present",
);
assert.equal(
  low.discussion.filter((item) => item.kind === "strength").length,
  0,
  "nothing in a low assessment may be called a shared strength",
);

/* A strength needs BOTH spouses high, not one carrying the other. */
const carried = reportFor([
  [10, 4], [10, 4], [10, 4], [10, 10], [10, 10], [10, 10], [10, 10], [10, 10], [10, 10], [10, 10], [10, 10], [10, 10], [10, 10], [10, 10], [10, 10],
]);
assert.ok(
  carried.discussion.every((item) => item.kind !== "strength" || item.category !== "Connection"),
  "one high score carrying a low one is not a shared strength",
);

/* Figures follow the order the couple is listed in, whoever is first. */
const wifeFirst = reportFor(
  [[9, 2], [10, 9], [8, 8], [6, 9], [7, 7], [10, 3], [9, 9], [5, 6], [8, 7], [10, 10], [4, 9], [7, 8], [9, 6], [8, 8], [6, 7]],
  {
    participants: [
      { name: "Mar\u00eda Jos\u00e9 Fern\u00e1ndez-O\u2019Sullivan", role: "Wife" },
      { name: "Jean-Christophe Ngoyi-Mwamba", role: "Husband" },
    ],
  },
);

for (const item of wifeFirst.discussion) {
  /* A hidden low answer opens by naming whoever gave it, so the pair listing
     is the part after that first sentence. Everywhere else the whole line is
     the listing. */
  const listing = item.kind === "hidden_low_answer"
    ? item.scoreLine.slice(item.scoreLine.indexOf(". ") + 1)
    : item.scoreLine;
  const first = listing.indexOf("Mar\u00eda");
  const second = listing.indexOf("Jean-Christophe");

  if (first >= 0 && second >= 0) {
    assert.ok(first < second, `a wife-first assessment must not flip to husband-first: ${listing.trim()}`);
  }
}

assert.ok(
  wifeFirst.discussion.some((item) => item.kind === "hidden_low_answer"),
  "this fixture is meant to exercise the hidden low answer wording",
);

/* 4. One date, read the way every other DOS screen reads dates, and the same
      answer whoever is looking. */
assert.equal(formatAssessmentReportDate("2026-09-19T03:37:43.909Z"), "September 18, 2026");
assert.equal(formatAssessmentReportDate(null), "Date not recorded");
assert.equal(formatAssessmentReportDate("not a date"), "Date not recorded");

/* 5. The document. Built here, then read back out of its own bytes. */
assert.equal(assessmentReportDocumentTitle, "Marriage Assessment Results");
assert.equal(assessmentReportFileName, "Marriage Assessment Results.pdf");

const bytes = buildAssessmentReportPdf(wifeFirst);
const pdf = Buffer.from(bytes).toString("latin1");

assert.ok(pdf.startsWith("%PDF-"), "the bytes must be a PDF");
assert.ok(pdf.includes("/Title (Marriage Assessment Results)"), "the document carries its own title");
assert.ok(
  /Powered by Discipleship Operating System/.test(pdf),
  "the footer says which product made the file",
);

/* Nothing that identifies the account may reach the file. */
for (const forbidden of ["ryan-fox", "/dos/", "http://", "https://", "supabase", "workspace", "Workspace"]) {
  assert.ok(!pdf.includes(forbidden), `the document must not contain ${forbidden}`);
}

const pageCount = (pdf.match(/\/Type \/Page[^s]/g) ?? []).length;
assert.ok(pageCount >= 2, `the report is more than one page, got ${pageCount}`);

/* 6. Text measurement. The width tables are keyed by the byte the writer
      actually emits, so a curly quote or an accent is measured as itself and
      not as a question mark. */
assert.equal(winAnsiByte("\u2019"), 0x92, "a right single quote is WinAnsi 0x92");
assert.equal(winAnsiByte("\u2014"), 0x97, "an em dash is WinAnsi 0x97");
assert.equal(winAnsiByte("\u00e9"), 0xE9);
assert.equal(winAnsiByte("\u4e2d"), 63, "anything outside WinAnsi falls back to a question mark");

const plain = measureText("Maria Jose Fernandez-O'Sullivan", 11, "regular");
const accented = measureText("Mar\u00eda Jos\u00e9 Fern\u00e1ndez-O\u2019Sullivan", 11, "regular");
assert.ok(accented > 0 && Math.abs(accented - plain) < 2, `accented text must measure like its plain form: ${plain} vs ${accented}`);
assert.notEqual(
  measureText("\u2019", 11, "regular"),
  measureText("?", 11, "regular"),
  "a curly quote must not be measured as a question mark",
);

/* 7. The file-level contracts. */
const form = readFileSync(new URL("../app/dos/resource/[token]/DosSharedAssessmentForm.tsx", import.meta.url), "utf8");
assert.ok(
  /setCompletedReport\(result\.report/.test(form),
  "Finish and send must keep the report it was handed, rather than leaving the couple on a dead end",
);
assert.ok(
  /<DosSharedAssessmentReport shareLink=\{completedReport\} \/>/.test(form),
  "the completed stage renders the report itself",
);

const shareLinks = readFileSync(new URL("../src/lib/dos/resource-share-links.ts", import.meta.url), "utf8");
assert.ok(
  /report: await completedReportForToken\(token\)/.test(shareLinks),
  "submitting must return the completed report through the same guarded loader",
);
assert.ok(
  /loadVerifiedSenderOrganization/.test(shareLinks),
  "the sender's organization comes from a verified affiliation",
);
/* The name may be explained in a comment, but it must never be a value any
   report can fall back to, so the comments come out before the test. */
const withoutComments = (source) => source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

for (const [label, source] of [
  ["the share link loader", shareLinks],
  ["the report document", readFileSync(new URL("../src/lib/dos/assessment-report-pdf.ts", import.meta.url), "utf8")],
  ["the report component", readFileSync(new URL("../src/components/dos/assessments/AssessmentReport.tsx", import.meta.url), "utf8")],
  ["the report data", rulesSource],
]) {
  assert.ok(
    !/["'`][^"'`\n]*USA Missionaries/.test(withoutComments(source)),
    `${label} must not carry a hard-coded ministry name that a report could fall back to`,
  );
}

const reportComponent = readFileSync(new URL("../src/components/dos/assessments/AssessmentReport.tsx", import.meta.url), "utf8");
assert.ok(
  !/\(p, li, dd\) \{ color: inherit/.test(reportComponent),
  "the report must not inherit the site's page colour, which painted it pale grey on white",
);
assert.ok(
  /:where\(\.assessment-report\) :where\(p, li, dd\)/.test(reportComponent),
  "the report's own body colour must be set at a specificity its elements can override",
);

for (const [label, source] of [
  ["the report component", reportComponent],
  ["the report data", rulesSource],
  ["the report document", readFileSync(new URL("../src/lib/dos/assessment-report-pdf.ts", import.meta.url), "utf8")],
]) {
  assert.ok(!source.includes("\u2014"), `${label} must not use em dashes`);
}

console.log("dos-assessment-report-regression: ok");
