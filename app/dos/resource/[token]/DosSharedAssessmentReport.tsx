"use client";

/* USA-280: the couple's own copy of their completed assessment.
 *
 * Same component the authenticated DOS view renders, so the discipler and the
 * couple read the same page. The only difference is this footnote, which tells
 * the couple how long their copy stays reachable and suggests keeping one. */

import { AssessmentReport } from "@/src/components/dos/assessments/AssessmentReport";
import { buildAssessmentReportData } from "@/src/lib/dos/assessment-report-data";
import type { AssessmentAnswerMap, AssessmentSummary } from "@/src/lib/dos/assessment-scoring";
import type { DosAssessmentQuestion } from "@/src/lib/dos/resource-catalog";

type CompletedShareLink = {
  completedAt: string | null;
  expiresAt: string | null;
  participants: Array<{ name: string; role: string }>;
  questions: readonly DosAssessmentQuestion[];
  report: AssessmentSummary;
  requestedByName: string;
  /* The sender's verified organization, or null. Never a display fallback:
     a report must not put an organization's name under someone who is not
     part of it. */
  requestedByOrganization: string | null;
  responses: AssessmentAnswerMap;
  title: string;
};

/* Fixed to UTC for the same reason the completion date is: this page is
   rendered on the server before the browser sees it, and a locale-dependent
   date made the two disagree. */
function formatExpiry(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleDateString("en-US", {
    day: "numeric", month: "long", timeZone: "UTC", year: "numeric",
  });
}

export function DosSharedAssessmentReport({ shareLink }: { shareLink: CompletedShareLink }) {
  const expiryLabel = formatExpiry(shareLink.expiresAt);

  /* Built from the saved answers, by the one builder every surface uses, so
     this page cannot disagree with the discipler's view or the PDF. */
  const data = buildAssessmentReportData({
    answers: shareLink.responses,
    completedAt: shareLink.completedAt,
    maxScore: shareLink.report.participantScores[0]?.maxScore ?? 150,
    participants: shareLink.participants,
    questions: shareLink.questions,
    requestedBy: { name: shareLink.requestedByName, organization: shareLink.requestedByOrganization },
    title: shareLink.title,
  });

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
