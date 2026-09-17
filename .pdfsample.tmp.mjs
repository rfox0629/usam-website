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
const names = { Husband: "Ryan Fox", Wife: "Brooke Fox" };

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
  participantScores: summary.participantScores.map((entry) => ({ participant: entry.label, score: entry.score })),
  participants: roles.map((role) => ({ name: names[role], role })),
  percentage: summary.percentage,
  questions: questions.map((question) => ({
    group: question.group ?? null,
    id: question.id,
    note: question.note ?? null,
    prompt: question.prompt,
    scores: Object.fromEntries(roles.map((role) => [role, getAssessmentAnswer(answers, question.id, role)])),
  })),
  title: resource.title,
};

writeFileSync(process.argv[2], buildAssessmentReportPdf(data));
console.log(JSON.stringify({
  overall: summary.overallScore,
  percentage: summary.percentage,
  participantScores: summary.participantScores.map((e) => `${e.label}=${e.score}`),
}));
