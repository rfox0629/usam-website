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

import { useCallback, type ReactNode } from "react";
import { assessmentScoreValues, type AssessmentCategoryScore } from "@/src/lib/dos/assessment-scoring";

export type AssessmentReportParticipant = {
  name: string;
  role: string;
};

export type AssessmentReportQuestion = {
  group?: string | null;
  id: string;
  note?: string | null;
  prompt: string;
  scores: Record<string, number | null | undefined>;
};

export type AssessmentReportData = {
  categories: readonly AssessmentCategoryScore[];
  completedAt: string | null;
  /* Each participant's own total, on the same scale as maxScore. */
  participantScores: ReadonlyArray<{ participant: string; score: number }>;
  participants: readonly AssessmentReportParticipant[];
  maxScore: number;
  overallScore: number;
  percentage: number;
  questions: readonly AssessmentReportQuestion[];
  title: string;
};

const ink = "text-[#0F172A]";
const body = "text-[#1E3A5F]";
const quiet = "text-[#334E68]";

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
  const handlePrint = useCallback(() => {
    if (typeof window !== "undefined") {
      window.print();
    }
  }, []);

  const roles = data.participants.map((participant) => participant.role);
  const nameForRole = (role: string) => data.participants.find((participant) => participant.role === role)?.name ?? role;
  const scoreForRole = (role: string) => data.participantScores.find((entry) => entry.participant === role)?.score ?? 0;

  /* Differences are arithmetic, not judgement: the gap between what each
     spouse said in a category, largest first. */
  const gaps = data.categories
    .map((category) => ({
      difference: Math.abs((category.husbandScore ?? 0) - (category.wifeScore ?? 0)),
      name: category.name,
    }))
    .filter((entry) => entry.difference > 0)
    .sort((first, second) => second.difference - first.difference);

  const ranked = [...data.categories].sort((first, second) => second.percentage - first.percentage);
  const higher = ranked.slice(0, 2);
  const lower = [...ranked].reverse().slice(0, 2);

  return (
    <main className="assessment-report min-h-screen bg-white">
      <style>{`
        @media print {
          .assessment-report-hide-on-print { display: none !important; }
          .assessment-report { background: #fff; }
          .assessment-report-section { break-inside: avoid; page-break-inside: avoid; }
          .assessment-report-answer { break-inside: avoid; page-break-inside: avoid; }
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
          <button
            className="min-h-[44px] rounded-[11px] border border-[#DCEBFF] px-4 text-[14.5px] font-semibold text-[#1D4ED8]"
            onClick={handlePrint}
            type="button"
          >
            Print or save as PDF
          </button>
        </div>

        <header className="px-5 pb-6 pt-6 sm:px-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#1D4ED8]">Assessment</p>
          <h1 className={`mt-2 text-[27px] font-bold leading-[1.08] tracking-[-0.032em] ${ink}`}>{data.title}</h1>
          <p className={`mt-3 text-[15.5px] leading-[1.62] ${body}`}>
            {data.participants.map((participant) => `${participant.name} (${participant.role})`).join(" and ")}
          </p>
          <p className={`mt-1 text-[14px] ${quiet}`}>Completed {formatReportDate(data.completedAt)}</p>
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
            <p className={`text-[13.5px] font-semibold ${quiet}`}>Both answers together</p>
            <p className={`mt-1 text-[24px] font-bold tabular-nums ${ink}`}>
              {data.overallScore}<span className={`text-[16px] font-semibold ${quiet}`}> of {data.maxScore}</span>
              <span className={`ml-2 text-[16px] font-semibold ${quiet}`}>{data.percentage}%</span>
            </p>
            <p className={`mt-2 text-[13.5px] leading-[1.5] ${quiet}`}>
              Each of you answers fifteen questions on a 0 to 10 scale, so each of you has a score out of {data.maxScore}.
              The figure above is the average of your two scores. It is a summary of what you each said on one day, not a
              measure of your marriage.
            </p>
          </div>
        </ReportSection>

        {comparison ? (
          <ReportSection heading="Compared with last time">
            <p className={`text-[14.5px] leading-[1.6] ${quiet}`}>
              You last answered these questions on {formatReportDate(comparison.completedAt)}. This is the change in what
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

        <ReportSection heading="By category">
          <div className="grid gap-5">
            {data.categories.map((category) => (
              <div key={category.name}>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className={`text-[15.5px] font-semibold ${ink}`}>{category.name}</h3>
                  <span className={`text-[13.5px] font-semibold tabular-nums ${quiet}`}>{category.percentage}%</span>
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

        <ReportSection heading="Worth talking about">
          <div className="grid gap-4">
            <div>
              <p className={`text-[13.5px] font-semibold ${quiet}`}>You both scored these highest</p>
              <p className={`mt-1 text-[15.5px] leading-[1.6] ${body}`}>
                {higher.map((entry) => entry.name).join(", ") || "Not enough answers to compare."}
              </p>
            </div>
            <div>
              <p className={`text-[13.5px] font-semibold ${quiet}`}>You both scored these lowest</p>
              <p className={`mt-1 text-[15.5px] leading-[1.6] ${body}`}>
                {lower.map((entry) => entry.name).join(", ") || "Not enough answers to compare."}
              </p>
            </div>
            <div>
              <p className={`text-[13.5px] font-semibold ${quiet}`}>Where your answers differed most</p>
              {gaps.length ? (
                <ul className={`mt-1 grid gap-1 text-[15.5px] leading-[1.6] ${body}`}>
                  {gaps.slice(0, 3).map((entry) => (
                    <li key={entry.name}>
                      {entry.name}: {entry.difference} point{entry.difference === 1 ? "" : "s"} apart
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={`mt-1 text-[15.5px] leading-[1.6] ${body}`}>You answered every category the same.</p>
              )}
            </div>
          </div>
        </ReportSection>

        <ReportSection heading="Every answer">
          <div className="grid gap-5">
            {data.questions.map((question, index) => (
              <div className="assessment-report-answer" key={question.id}>
                <p className={`text-[11px] font-bold uppercase tracking-[0.15em] ${quiet}`}>
                  Question {index + 1}{question.group ? ` · ${question.group}` : ""}
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
