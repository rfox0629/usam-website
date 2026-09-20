"use client";

/* USA-280: one Marriage Assessment report, two places that show it.
 *
 * The authenticated DOS view and the recipient's completed link render this
 * same component, so a couple and their discipler read exactly the same page.
 * It is a page, not a sheet: the old bottom sheet could not scroll to the
 * later answers, which is the defect that prompted this.
 *
 * What it will not do:
 *   - invent a scoring rule. Every figure here is one the shipped assessment
 *     already computed, relabelled honestly.
 *   - interpret. Higher and lower areas are named as what the couple said,
 *     never as a diagnosis of the marriage.
 *   - reorder or reword a question.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { assessmentScoreValues } from "@/src/lib/dos/assessment-scoring";
import { formatAssessmentReportDate, type AssessmentDiscussionItem, type AssessmentReportData } from "@/src/lib/dos/assessment-report-data";
import { assessmentReportDocumentTitle, assessmentReportFileName, buildAssessmentReportPdf } from "@/src/lib/dos/assessment-report-pdf";

export type { AssessmentReportData } from "@/src/lib/dos/assessment-report-data";

const ink = "text-[#0F172A]";
const body = "text-[#1E3A5F]";
const quiet = "text-[#334E68]";

function answerAnchorId(questionId: string) {
  return `assessment-answer-${questionId}`;
}

/* What kind of thing this is, said plainly. "Lowest here" is deliberately
   relative: it is the lowest in THIS assessment, which is not the same claim
   as a low score. */
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

function ReportSection({ children, heading }: { children: ReactNode; heading: string }) {
  return (
    <section className="assessment-report-section border-t border-[#EAF2FF] px-5 pb-7 pt-7 sm:px-6">
      <h2 className={`text-[19px] font-bold leading-[1.25] tracking-[-0.018em] ${ink}`}>{heading}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/* A restrained comparison: one bar per spouse, same scale, no colour coding
   that implies a verdict. */
function ComparisonBar({ label, max, value }: { label: string; max: number; value: number }) {
  const width = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div className="mt-2 first:mt-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className={`text-[13.5px] font-semibold ${body}`}>{label}</span>
        <span className={`text-[13.5px] font-semibold tabular-nums ${ink}`}>{value} of {max}</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#EAF2FF]">
        <div className="h-full rounded-full bg-[#2563EB]" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export type AssessmentReportComparison = {
  completedAt: string | null;
  /* Each participant's own earlier total, keyed by ROLE. Matching by role
     rather than by position is what keeps a wife-first reassessment lined up
     with a husband-first original. */
  participantScores: ReadonlyArray<{ participant: string; score: number }>;
};

export function AssessmentReport({
  comparison,
  data,
  footnote,
  onBack,
  backLabel = "Back",
}: {
  backLabel?: string;
  /* The previous completed assessment for the same two people, when one
     exists and used the same questions and scale. */
  comparison?: AssessmentReportComparison | null;
  data: AssessmentReportData;
  /* Where the report came from decides what else the reader needs to know,
     for example how long a shared link stays open. */
  footnote?: ReactNode;
  onBack?: () => void;
}) {
  /* USA-281: the document is generated, not printed.
   *
   * window.print() hands the page to the browser's own print pipeline, which
   * stamps a header and footer onto every sheet: the document title, the page
   * URL, the date. A DOS report printed that way carried "Workspace | DOS" and
   * the discipler's personal workspace URL. No CSS removes that reliably,
   * @page margins are honoured differently by each browser, and telling people
   * to untick "Headers and footers" is not a fix.
   *
   * So both actions below build the PDF from the same data this screen is
   * rendering and hand the reader that file. Download saves it under a real
   * name; Print sends the generated file to the print dialog through a hidden
   * frame, so what is printed is the document, not the web page around it. */
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => () => {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }, [objectUrl]);

  const buildPdfUrl = useCallback(() => {
    const bytes = buildAssessmentReportPdf(data);
    const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    setObjectUrl((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }

      return url;
    });

    return url;
  }, [data]);

  const handleDownload = useCallback(() => {
    try {
      const url = buildPdfUrl();
      const link = document.createElement("a");

      link.download = assessmentReportFileName;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setPdfError(null);
    } catch {
      setPdfError("The report could not be prepared for download. Use Print instead.");
    }
  }, [buildPdfUrl]);

  const handlePrint = useCallback(() => {
    try {
      const url = buildPdfUrl();
      const frame = frameRef.current;

      if (!frame) {
        window.open(url, "_blank", "noopener");
        return;
      }

      frame.src = url;
      frame.onload = () => {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
      };
      setPdfError(null);
    } catch {
      /* A browser that refuses the generated file still gets the page, which
         the print stylesheet has already reduced to the report alone. */
      window.print();
    }
  }, [buildPdfUrl]);

  const roles = data.participants.map((participant) => participant.role);
  const nameForRole = (role: string) => data.participants.find((participant) => participant.role === role)?.name ?? role;
  const scoreForRole = (role: string) => data.participantScores.find((entry) => entry.participant === role)?.score ?? 0;

  return (
    <main className="assessment-report min-h-screen bg-white">
      <style>{`
        /* The site's own default paints every <p> pale grey for a black page.
           This replaces it with the report's own body colour, at the same zero
           specificity, so it wins on order alone and any element that sets its
           own colour still wins over both. An earlier version of this rule set
           the colour to inherit from a class selector, which outranked the
           element colours and left the report pale grey on white. */
        :where(.assessment-report) :where(p, li, dd) { color: #1E3A5F; }

        @media print {
          .assessment-report-hide-on-print { display: none !important; }
          .assessment-report { background: #fff; }
          .assessment-report-section { break-inside: avoid; page-break-inside: avoid; }
          .assessment-report-answer { break-inside: avoid; page-break-inside: avoid; }

          /* The report opens over the DOS app as a fixed sheet. A fixed
             element cannot paginate, so printing it gave one clipped page with
             the app behind it. On paper the sheet becomes an ordinary
             document, and the app it covers is not printed at all. */
          html:has(.assessment-report), body:has(.assessment-report) {
            background: #fff !important;
            height: auto !important;
            overflow: visible !important;
          }

          body:has(> .assessment-report-sheet) > *:not(.assessment-report-sheet) { display: none !important; }

          .assessment-report-sheet {
            position: static !important;
            height: auto !important;
            overflow: visible !important;
          }

          @page { margin: 14mm; }
        }
      `}</style>

      <div className="mx-auto w-full max-w-[760px] pb-16">
        <div className="assessment-report-hide-on-print flex items-center justify-between gap-3 px-5 pt-5 sm:px-6">
          {onBack ? (
            <button
              className={`min-h-[44px] rounded-[11px] px-3 text-[14.5px] font-semibold ${body}`}
              onClick={onBack}
              type="button"
            >
              {backLabel}
            </button>
          ) : <span />}
          <span className="flex shrink-0 items-center gap-2">
            <button
              className="min-h-[44px] rounded-[11px] border border-[#DCEBFF] px-4 text-[14.5px] font-semibold text-[#1D4ED8]"
              onClick={handlePrint}
              type="button"
            >
              Print
            </button>
            <button
              className="min-h-[44px] rounded-[11px] bg-[#2251E8] px-4 text-[14.5px] font-semibold text-white"
              onClick={handleDownload}
              type="button"
            >
              Download PDF
            </button>
          </span>
        </div>
        {pdfError ? (
          <p className={`assessment-report-hide-on-print px-5 pt-2 text-[13.5px] sm:px-6 ${body}`} role="status">{pdfError}</p>
        ) : null}
        <iframe aria-hidden="true" className="hidden" ref={frameRef} title="" />

        <header className="px-5 pb-6 pt-6 sm:px-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#1D4ED8]">Assessment</p>
          {/* The document and the screen carry the same name, so a saved file
              and the page it came from are recognisably one thing. */}
          <h1 className={`mt-2 text-[27px] font-bold leading-[1.08] tracking-[-0.032em] ${ink}`}>{assessmentReportDocumentTitle}</h1>
          <p className={`mt-3 text-[17px] font-semibold leading-[1.45] ${ink}`}>
            {data.participants.map((participant) => `${participant.name} (${participant.role})`).join(" and ")}
          </p>
          <p className={`mt-1 text-[14px] ${quiet}`}>Completed {formatAssessmentReportDate(data.completedAt)}</p>
          {data.requestedBy?.name ? (
            /* The organization appears only when the affiliation is verified,
               so a report never puts an organization's name under someone who
               is not part of it. */
            <p className={`mt-3 text-[14px] ${quiet}`}>
              Requested by <span className={`font-semibold ${body}`}>{data.requestedBy.name}</span>
              {data.requestedBy.organization ? <span>, {data.requestedBy.organization}</span> : null}
            </p>
          ) : null}
        </header>

        <ReportSection heading="Scores">
          <div className="grid gap-3 sm:grid-cols-2">
            {roles.map((role) => (
              <div className="rounded-[12px] border border-[#EAF2FF] px-4 py-3" key={role}>
                <p className={`text-[13.5px] font-semibold ${quiet}`}>{nameForRole(role)} ({role})</p>
                <p className={`mt-1 text-[24px] font-bold tabular-nums ${ink}`}>
                  {scoreForRole(role)}<span className={`text-[16px] font-semibold ${quiet}`}> of {data.maxScore}</span>
                </p>
              </div>
            ))}
          </div>

          {/* The headline figure is an average, and says so. It is not a sum,
              and it is not a verdict. */}
          <div className="mt-3 rounded-[12px] border border-[#EAF2FF] px-4 py-3">
            <p className={`text-[13.5px] font-semibold ${quiet}`}>Average score</p>
            <p className={`mt-1 text-[24px] font-bold tabular-nums ${ink}`}>
              {data.overallScore}<span className={`text-[16px] font-semibold ${quiet}`}> of {data.maxScore}</span>
              {/* A real space, not only a margin: copied text and a screen
                  reader both run the two figures together without it. */}
              {" "}
              <span className={`ml-1 text-[16px] font-semibold ${quiet}`}>{data.percentage}%</span>
            </p>
            <p className={`mt-2 text-[13.5px] leading-[1.5] ${quiet}`}>
              Each of you answers {data.questions.length} questions on a 0 to 10 scale, so each of you has a score out of {data.maxScore}.
              The average above is your two scores added together and halved. The percentage is your two scores as a share
              of everything you could both have scored. It summarises what you each said on one day. It is not a measure
              of your marriage and it is not a diagnosis.
            </p>
          </div>
        </ReportSection>

        {comparison ? (
          <ReportSection heading="Compared with last time">
            <p className={`text-[14.5px] leading-[1.6] ${quiet}`}>
              You last answered these questions on {formatAssessmentReportDate(comparison.completedAt)}. This is the change in what
              each of you reported, nothing more. It is not evidence that the marriage improved or declined.
            </p>
            <div className="mt-3 grid gap-2">
              {roles.map((role) => {
                const previous = comparison.participantScores.find((entry) => entry.participant === role)?.score;
                const current = scoreForRole(role);
                const delta = typeof previous === "number" ? current - previous : null;

                return (
                  <p className={`text-[15.5px] ${body}`} key={role}>
                    <span className="font-semibold">{nameForRole(role)}</span>{" "}
                    {typeof previous === "number" ? (
                      <span className="tabular-nums">
                        {previous} to {current} of {data.maxScore}
                        {delta === null || delta === 0 ? " (no change)" : ` (${delta > 0 ? "+" : ""}${delta})`}
                      </span>
                    ) : (
                      <span>no earlier score to compare</span>
                    )}
                  </p>
                );
              })}
            </div>
          </ReportSection>
        ) : null}

        {/* USA-282: the priorities are chosen by documented rules in
            assessment-report-data.ts, not by superlatives. Each one names its
            category, shows the figures it was chosen from, and links to the
            answer it came from so the reader can check it. */}
        <ReportSection heading="Worth talking about">
          {data.discussion.length ? (
            <ol className="grid gap-3">
              {data.discussion.map((item) => (
                <li
                  className={`assessment-report-answer rounded-[14px] border px-4 py-3.5 ${
                    item.kind === "strength" ? "border-[#C9E9D8] bg-[#F4FBF7]" : "border-[#DCEBFF] bg-[#F7FAFF]"
                  }`}
                  key={`${item.kind}-${item.questionId ?? item.category}-${item.title}`}
                >
                  <p className={`text-[11px] font-bold uppercase tracking-[0.13em] ${
                    item.kind === "strength" ? "text-[#047857]" : "text-[#1D4ED8]"
                  }`}>
                    {discussionLabel(item)}
                  </p>
                  <p className={`mt-1.5 text-[16px] font-bold leading-[1.3] ${ink}`}>{item.title}</p>
                  <p className={`mt-1 text-[14px] font-semibold tabular-nums ${body}`}>{item.scoreLine}</p>
                  <p className={`mt-1.5 text-[14.5px] leading-[1.55] ${body}`}>{item.discussionPrompt}</p>
                  {item.questionId ? (
                    <a
                      className="assessment-report-hide-on-print mt-2 inline-block text-[13.5px] font-semibold text-[#1D4ED8] underline"
                      href={`#${answerAnchorId(item.questionId)}`}
                    >
                      See question {item.questionNumber}
                    </a>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className={`text-[15.5px] leading-[1.6] ${body}`}>
              Not enough answers yet to pick anything out.
            </p>
          )}
        </ReportSection>

        <ReportSection heading="By category">
          <div className="grid gap-5">
            {data.categories.map((category) => (
              <div key={category.name}>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className={`text-[15.5px] font-semibold ${ink}`}>{category.name}</h3>
                  <span className={`text-[13.5px] font-semibold tabular-nums ${quiet}`}>
                    {category.combinedScore} of {category.combinedMaxScore} together, {category.percentage}%
                  </span>
                </div>
                <div className="mt-2">
                  {roles.map((role) => (
                    <ComparisonBar
                      key={role}
                      label={nameForRole(role)}
                      max={category.maxScore}
                      value={role === "Wife" ? (category.wifeScore ?? 0) : (category.husbandScore ?? 0)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ReportSection>

        <ReportSection heading="Every answer">
          <div className="grid gap-5">
            {data.questions.map((question) => (
              <div className="assessment-report-answer scroll-mt-6" id={answerAnchorId(question.id)} key={question.id}>
                <p className={`text-[11px] font-bold uppercase tracking-[0.15em] ${quiet}`}>
                  Question {question.number}{question.group ? ` · ${question.group}` : ""}
                </p>
                <p className={`mt-1 text-[15.5px] font-semibold leading-[1.45] ${ink}`}>{question.prompt}</p>
                {question.note ? <p className={`mt-1 text-[13.5px] leading-[1.5] ${quiet}`}>{question.note}</p> : null}
                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
                  {roles.map((role) => {
                    const value = question.scores?.[role];

                    return (
                      <p className={`text-[14.5px] ${body}`} key={role}>
                        <span className="font-semibold">{nameForRole(role)}</span>{" "}
                        <span className="tabular-nums">
                          {typeof value === "number" ? `${value} of ${assessmentScoreValues[assessmentScoreValues.length - 1]}` : "not answered"}
                        </span>
                      </p>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ReportSection>

        {footnote ? (
          <ReportSection heading="About this report">
            <div className={`text-[14.5px] leading-[1.6] ${body}`}>{footnote}</div>
          </ReportSection>
        ) : null}
      </div>
    </main>
  );
}
