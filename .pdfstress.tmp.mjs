import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { writeFileSync } from "node:fs";
register("./scripts/ts-loader.mjs", pathToFileURL("./"));

const { getDosResourceBySlug } = await import("@/src/lib/dos/resource-catalog");
const { summarizeAssessment, getAssessmentAnswer } = await import("@/src/lib/dos/assessment-scoring");
const { buildAssessmentReportPdf } = await import("@/src/lib/dos/assessment-report-pdf");

const resource = getDosResourceBySlug("marriage-assessment");
const questions = resource.content.assessment.questions;
const roles = ["Wife", "Husband"];

/* Deliberately hostile: long names, accents, an apostrophe, a hyphenated
   surname. These are real names people have. */
const names = {
  Husband: "Jean-Christophe Ngoyi-Mwamba",
  Wife: "María José Fernández-O'Sullivan",
};

const answers = {};
questions.forEach((question, index) => {
  answers[question.id] = { Wife: 7 + (index % 4), Husband: 6 + ((index + 2) % 5) };
});

const summary = summarizeAssessment({ answers, maxScore: 150, participants: roles, questions });
const data = {
  categories: summary.categoryScores,
  completedAt: "2026-09-17T16:33:56.424Z",
  maxScore: 150,
  overallScore: summary.overallScore,
  participantScores: summary.participantScores.map((e) => ({ participant: e.label, score: e.score })),
  participants: roles.map((role) => ({ name: names[role], role })),
  percentage: summary.percentage,
  questions: questions.map((q) => ({
    group: q.group ?? null, id: q.id, note: q.note ?? null, prompt: q.prompt,
    scores: Object.fromEntries(roles.map((role) => [role, getAssessmentAnswer(answers, q.id, role)])),
  })),
  title: resource.title,
};

writeFileSync(process.argv[2], buildAssessmentReportPdf(data));

/* The screen's own numbers, to compare against the extracted PDF text. */
writeFileSync(process.argv[3], JSON.stringify({
  categories: summary.categoryScores.map((c) => ({ h: c.husbandScore, max: c.maxScore, name: c.name, pct: c.percentage, w: c.wifeScore })),
  names,
  overall: summary.overallScore,
  participantScores: summary.participantScores.map((e) => ({ role: e.label, score: e.score })),
  percentage: summary.percentage,
  prompts: questions.map((q) => q.prompt),
  notes: questions.map((q) => q.note ?? null),
  answers: questions.map((q) => ({ h: answers[q.id].Husband, w: answers[q.id].Wife })),
}, null, 1));
console.log("generated");
