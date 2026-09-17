"use client";

/* USA-280: the couple's own copy of their completed assessment.
 *
 * Same component the authenticated DOS view renders, so the discipler and the
 * couple read the same page. The only difference is this footnote, which tells
 * the couple how long their copy stays reachable and suggests keeping one. */

import { AssessmentReport, type AssessmentReportData } from "@/src/components/dos/assessments/AssessmentReport";
import type { AssessmentAnswerMap, AssessmentSummary } from "@/src/lib/dos/assessment-scoring";
import { getAssessmentAnswer } from "@/src/lib/dos/assessment-scoring";
import type { DosAssessmentQuestion } from "@/src/lib/dos/resource-catalog";

type CompletedShareLink = {
  completedAt: string | null;
  expiresAt: string | null;
  participants: Array<{ name: string; role: string }>;
  questions: readonly DosAssessmentQuestion[];
  report: AssessmentSummary;
  requestedByName: string;
  responses: AssessmentAnswerMap;
  title: string;
};

function formatExpiry(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}

export function DosSharedAssessmentReport({ shareLink }: { shareLink: CompletedShareLink }) {
  const roles = shareLink.participants.map((participant) => participant.role);
  const expiryLabel = formatExpiry(shareLink.expiresAt);

  const data: AssessmentReportData = {
    categories: shareLink.report.categoryScores,
    completedAt: shareLink.completedAt,
    maxScore: shareLink.report.participantScores[0]?.maxScore ?? 150,
    overallScore: shareLink.report.overallScore,
    participantScores: shareLink.report.participantScores.map((entry) => ({
      participant: entry.label,
      score: entry.score,
    })),
    participants: shareLink.participants,
    percentage: shareLink.report.percentage,
    questions: shareLink.questions.map((question) => ({
      group: question.group ?? null,
      id: question.id,
      note: question.note ?? null,
      prompt: question.prompt,
      scores: Object.fromEntries(roles.map((role) => [role, getAssessmentAnswer(shareLink.responses, question.id, role)])),
    })),
    title: shareLink.title,
  };

  return (
    <AssessmentReport
      data={data}
      footnote={(
        <div className="grid gap-2">
          <p>
            Both of you and {shareLink.requestedByName}, who asked for this assessment, can see these results. Nothing
            else in DOS is shared by this link.
          </p>
          <p>
            {expiryLabel
              ? `This link stays open until ${expiryLabel}, and can be turned off sooner by the person who sent it. Print or save a copy if you want to keep it.`
              : "The person who sent this can turn the link off at any time. Print or save a copy if you want to keep it."}
          </p>
        </div>
      )}
    />
  );
}
