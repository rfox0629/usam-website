"use client";

/* USA-278: the assessment controls shared by the Library preview and by the
 * assigned assessment a couple completes through their link. One set of
 * controls means the recipient sees the same questions, the same 0-10 scale
 * and the same result breakdown the leader previewed.
 *
 * Each spouse's picker is labelled with their own name, so it is always clear
 * whose answer is being entered. No answer is ever prefilled or inferred.
 */

import type { DosAssessmentQuestion } from "@/src/lib/dos/resource-catalog";
import { assessmentPercentage, assessmentScoreValues, type AssessmentCategoryScore } from "@/src/lib/dos/assessment-scoring";

export function AssessmentProgressBar({ percentageValue }: { percentageValue: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-[#DCEBFF]" aria-hidden="true">
      <div className="h-full rounded-full bg-[#2563EB] transition-all duration-300" style={{ width: `${percentageValue}%` }} />
    </div>
  );
}

export function AssessmentScorePicker({
  displayName,
  onChange,
  participant,
  question,
  value,
}: {
  displayName?: string;
  onChange: (value: number) => void;
  participant: string;
  question: DosAssessmentQuestion;
  value: number | undefined;
}) {
  const prompt = question.participantPrompts?.[participant] ?? question.prompt;
  const groupName = `${question.id}-${participant}`;
  /* The name leads and the role follows, because "Brooke" is what the couple
     recognises and "Wife" is what the stored answer is attributed to. */
  const legend = displayName?.trim() ? `${displayName.trim()} (${participant})` : participant;

  return (
    <fieldset className="rounded-[18px] border border-[#DCEBFF] bg-[#F8FBFF] p-3">
      <legend className="px-1 text-xs font-black text-[#0F172A]">{legend}</legend>
      <p className="mt-1 text-xs font-semibold leading-5 text-[#475569]">{prompt}</p>
      <div className="mt-3 grid grid-cols-6 gap-1.5 sm:grid-cols-11" role="radiogroup">
        {assessmentScoreValues.map((score) => {
          const active = value === score;

          return (
            <label
              className={`flex min-h-9 cursor-pointer items-center justify-center rounded-xl border text-xs font-black transition-colors ${
                active
                  ? "border-[#2563EB] bg-[#2563EB] text-white shadow-[0_8px_18px_rgba(37,99,235,0.22)]"
                  : "border-[#DCEBFF] bg-white text-[#475569] hover:border-[#BFDBFE] hover:bg-[#EBF2FF]"
              }`}
              key={score}
            >
              <input
                checked={active}
                className="sr-only"
                name={groupName}
                onChange={() => onChange(score)}
                type="radio"
                value={score}
              />
              {score}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function AssessmentResultMeter({
  label,
  maxScore,
  score,
}: {
  label: string;
  maxScore: number;
  score: number;
}) {
  const valuePercentage = assessmentPercentage(score, maxScore);

  return (
    <article className="rounded-[20px] border border-[#EAF2FF] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black text-[#0F172A]">{label}</p>
        <p className="text-xs font-black text-[#1D4ED8]">
          {score}/{maxScore}
        </p>
      </div>
      <div className="mt-3">
        <AssessmentProgressBar percentageValue={valuePercentage} />
      </div>
      <p className="mt-2 text-xs font-bold text-[#64748B]">{valuePercentage}%</p>
    </article>
  );
}

export function AssessmentCategoryBreakdown({
  categories,
  participantLabels,
}: {
  categories: readonly AssessmentCategoryScore[];
  participantLabels?: readonly [string, string];
}) {
  const [firstLabel, secondLabel] = participantLabels ?? ["Husband", "Wife"];

  return (
    <section className="rounded-[24px] border border-[#DCEBFF] bg-white p-4 shadow-[0_18px_48px_rgba(37,99,235,0.06)]">
      <h2 className="text-base font-black text-[#0F172A]">Category Breakdown</h2>
      <div className="mt-4 grid gap-3">
        {categories.map((category) => (
          <article className="rounded-[18px] border border-[#EAF2FF] bg-[#F8FBFF] p-3" key={category.name}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-black text-[#0F172A]">{category.name}</h3>
                <p className="mt-1 text-xs font-semibold text-[#64748B]">
                  {category.score}/{category.maxScore} average
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-[#EBF2FF] px-2.5 py-1 text-[10px] font-black text-[#1D4ED8]">
                {category.percentage}%
              </span>
            </div>
            <div className="mt-3">
              <AssessmentProgressBar percentageValue={category.percentage} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-bold text-[#64748B]">
              <span>{firstLabel} {category.husbandScore}/{category.maxScore}</span>
              <span>{secondLabel} {category.wifeScore}/{category.maxScore}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
