"use client";

/* USA-279: the assessment surfaces, drawn in the book study's visual system.
 *
 * The Journey (see GuidedJourneyUi.tsx) is the established DOS reading
 * treatment: a white page, one centred column, hairline rules instead of
 * nested cards, and bands that carry emphasis rather than tinted panels
 * stacked on a blue background. These components reuse that vocabulary so an
 * assessment reads as the same product as a book study.
 *
 * Token family, matched to GuidedJourneyUi:
 *   ink #0F172A · body #475569 · muted #64748B · faint #94A3B8
 *   hair #EAF2FF · hair-2 #DCEBFF · band #F8FBFF · warm #EBF2FF
 *   DOS blue #2563EB to #1D4ED8
 *
 * Presentational only. Persistence, scoring and assignment logic stay with
 * the calling surface.
 */

import type { ReactNode } from "react";
import type { DosAssessmentQuestion } from "@/src/lib/dos/resource-catalog";
import { assessmentScoreValues, type AssessmentCategoryScore } from "@/src/lib/dos/assessment-scoring";

/* One centred reading column on white, the same measure the Journey uses. */
export function AssessmentPage({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-white text-[#0F172A]">
      <div className="mx-auto w-full max-w-[700px] pb-16">{children}</div>
    </main>
  );
}

/* The strip that carries identity and the way back, as GuidedJourneyCompactNav
   does for a book study. */
export function AssessmentTopBar({
  backLabel,
  onBack,
  backHref,
  meta,
  title,
}: {
  backLabel: string;
  onBack?: () => void;
  backHref?: string;
  meta?: string;
  title: string;
}) {
  const label = `Back to ${backLabel}`;

  return (
    <div className="flex items-center gap-3 border-b border-[#EAF2FF] bg-white px-5 py-3 sm:px-6">
      {onBack || backHref ? (
        <BackControl ariaLabel={label} href={backHref} onClick={onBack} />
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold tracking-[-0.012em] text-[#0F172A]">{title}</p>
        {meta ? <p className="mt-px text-[11.5px] font-semibold text-[#64748B]">{meta}</p> : null}
      </div>
    </div>
  );
}

function BackControl({
  ariaLabel,
  href,
  onClick,
}: {
  ariaLabel: string;
  href?: string;
  onClick?: () => void;
}) {
  const className = "grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-[#F1F5F9] text-[#64748B]";
  const glyph = <span aria-hidden="true" className="text-sm leading-none">‹</span>;

  if (onClick) {
    return (
      <button aria-label={ariaLabel} className={className} onClick={onClick} type="button">{glyph}</button>
    );
  }

  return <a aria-label={ariaLabel} className={className} href={href}>{glyph}</a>;
}

export function AssessmentHeader({
  actions,
  description,
  eyebrow,
  title,
}: {
  actions?: ReactNode;
  description?: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="px-5 pb-6 pt-7 sm:px-6" aria-label="Resource">
      <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#1D4ED8]">{eyebrow}</p>
      <h1 className="mt-4 text-[27px] font-bold leading-[1.08] tracking-[-0.032em] text-[#0F172A]">{title}</h1>
      {description ? <p className="mt-[18px] text-[15.5px] leading-[1.62] text-[#475569]">{description}</p> : null}
      {actions ? <div className="mt-5 flex flex-wrap gap-[10px]">{actions}</div> : null}
    </section>
  );
}

export function AssessmentPrimaryButton({
  children,
  disabled = false,
  href,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  disabled?: boolean;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  const className = "inline-flex min-h-[46px] flex-1 basis-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[11px] bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-3 text-[14.5px] font-semibold text-white disabled:bg-[#94A3B8] disabled:bg-none";

  return href
    ? <a className={className} href={href}>{children}</a>
    : <button className={className} disabled={disabled} onClick={onClick} type={type}>{children}</button>;
}

export function AssessmentSecondaryButton({
  children,
  disabled = false,
  href,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  href?: string;
  onClick?: () => void;
}) {
  const className = "inline-flex min-h-[46px] flex-1 basis-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[11px] border border-[#DCEBFF] bg-white px-3 text-[14.5px] font-semibold text-[#0F172A] disabled:text-[#94A3B8]";

  return href
    ? <a className={className} href={href}>{children}</a>
    : <button className={className} disabled={disabled} onClick={onClick} type="button">{children}</button>;
}

/* A short list of plain facts about the resource. Replaces the stack of
   introduction cards the old detail page carried. */
export function AssessmentFacts({ items }: { items: readonly string[] }) {
  return (
    <section className="border-y border-[#EAF2FF] bg-[#F8FBFF] px-5 py-5 sm:px-6" aria-label="How this works">
      <ul className="grid gap-2.5">
        {items.map((item) => (
          <li className="flex gap-2.5 text-[14.5px] leading-[1.55] text-[#475569]" key={item}>
            <span aria-hidden="true" className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-[#1D4ED8]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AssessmentNotice({ children }: { children: ReactNode }) {
  return (
    <p className="border-b border-[#DCEBFF] bg-[#EBF2FF] px-5 py-3 text-[13px] font-semibold text-[#1D4ED8] sm:px-6">
      {children}
    </p>
  );
}

export function AssessmentSection({
  children,
  label,
  title,
}: {
  children: ReactNode;
  label?: string;
  title?: string;
}) {
  return (
    <section className="px-5 pt-[26px] sm:px-6" aria-label={title ?? label ?? "Section"}>
      {label ? <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#94A3B8]">{label}</p> : null}
      {title ? <h2 className="mt-2 text-[25px] font-bold leading-[1.16] tracking-[-0.03em] text-[#0F172A]">{title}</h2> : null}
      {children}
    </section>
  );
}

/* A group of questions, introduced by a hairline heading rather than a card. */
export function AssessmentGroupHeading({ name }: { name: string }) {
  return (
    <p className="mt-[30px] border-b border-[#EAF2FF] px-5 pb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-[#1D4ED8] sm:px-6">
      {name}
    </p>
  );
}

/* One question and its two scoring rows, separated by hairlines. No nested
   card, no tinted panel. */
export function AssessmentQuestion({
  children,
  index,
  note,
  prompt,
}: {
  children: ReactNode;
  index: number;
  note?: string | null;
  prompt: string;
}) {
  return (
    <article className="border-b border-[#EAF2FF] px-5 py-[22px] sm:px-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#94A3B8]">Question {index}</p>
      <h3 className="mt-2 text-[19px] font-semibold leading-[1.35] tracking-[-0.018em] text-[#0F172A]">{prompt}</h3>
      {note ? <p className="mt-2 text-[13.5px] leading-[1.5] text-[#64748B]">{note}</p> : null}
      <div className="mt-4 grid gap-4">{children}</div>
    </article>
  );
}

/* One spouse's answer. The name leads because that is what the couple
   recognises; the role follows because that is what the answer is stored as. */
export function AssessmentScoreRow({
  displayName,
  onChange,
  participant,
  question,
  readOnly = false,
  value,
}: {
  displayName?: string;
  onChange?: (value: number) => void;
  participant: string;
  question: DosAssessmentQuestion;
  readOnly?: boolean;
  value: number | undefined;
}) {
  const prompt = question.participantPrompts?.[participant] ?? question.prompt;
  const groupName = `${question.id}-${participant}`;
  const heading = displayName?.trim() ? `${displayName.trim()} (${participant})` : participant;

  return (
    <fieldset className="min-w-0">
      <legend className="text-[15px] font-bold tracking-[-0.012em] text-[#0F172A]">{heading}</legend>
      <p className="mt-1 text-[13.5px] leading-[1.5] text-[#64748B]">{prompt}</p>
      <div className="mt-2.5 grid grid-cols-6 gap-1.5 sm:grid-cols-11" role="radiogroup">
        {assessmentScoreValues.map((score) => {
          const active = value === score;

          return (
            <label
              className={`flex min-h-[38px] items-center justify-center rounded-[9px] border text-[13px] font-semibold transition-colors ${
                readOnly ? "cursor-default" : "cursor-pointer"
              } ${
                active
                  ? "border-[#1D4ED8] bg-[#1D4ED8] text-white"
                  : "border-[#DCEBFF] bg-white text-[#475569] hover:border-[#BFDBFE] hover:bg-[#F8FBFF]"
              }`}
              key={score}
            >
              <input
                checked={active}
                className="sr-only"
                name={groupName}
                onChange={() => onChange?.(score)}
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

/* Step position for the recipient's questionnaire. The preview has no steps,
   so it never renders this. */
export function AssessmentStepBand({
  answeredCount,
  requiredCount,
  stepIndex,
  stepName,
  stepTotal,
}: {
  answeredCount: number;
  requiredCount: number;
  stepIndex: number;
  stepName: string;
  stepTotal: number;
}) {
  const percentage = requiredCount > 0 ? Math.max(2, Math.round((answeredCount / requiredCount) * 100)) : 0;

  return (
    <section className="border-y border-[#EAF2FF] bg-[#F8FBFF] px-5 py-4 sm:px-6" aria-label="Assessment progress">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#0F172A]">
          {stepName}
        </p>
        <p className="text-[12.5px] font-bold tabular-nums text-[#64748B]">
          Step {stepIndex} of {stepTotal}
        </p>
      </div>
      <div className="mt-[11px] h-1 overflow-hidden rounded-full bg-[#E2E8F0]">
        <div className="h-full rounded-full bg-[#1D4ED8] transition-[width] duration-300" style={{ width: `${percentage}%` }} />
      </div>
      <p className="mt-[9px] text-[12px] font-semibold text-[#64748B]">
        {answeredCount} of {requiredCount} answers given
      </p>
    </section>
  );
}

/* Actions at the natural end of the page, never pinned over the content. */
export function AssessmentDock({
  onPrimary,
  onSecondary,
  primaryDisabled = false,
  primaryLabel,
  secondaryDisabled = false,
  secondaryLabel,
}: {
  onPrimary: () => void;
  onSecondary?: () => void;
  primaryDisabled?: boolean;
  primaryLabel: string;
  secondaryDisabled?: boolean;
  secondaryLabel?: string;
}) {
  return (
    <div className="mt-[34px] flex flex-col-reverse gap-3 px-5 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
      {secondaryLabel && onSecondary ? (
        <button
          className="min-h-[44px] text-[13.5px] font-semibold text-[#64748B] disabled:text-[#94A3B8]"
          disabled={secondaryDisabled}
          onClick={onSecondary}
          type="button"
        >
          {secondaryLabel}
        </button>
      ) : null}
      <button
        className="inline-flex min-h-[50px] w-full items-center justify-center rounded-[14px] bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-[34px] text-[15.5px] font-bold text-white disabled:bg-[#94A3B8] disabled:bg-none sm:w-auto"
        disabled={primaryDisabled}
        onClick={onPrimary}
        type="button"
      >
        {primaryLabel}
      </button>
    </div>
  );
}

export function AssessmentScoreSummary({
  maxScore,
  percentage,
  rangeLabel,
  score,
  subtitle,
}: {
  maxScore: number;
  percentage: number;
  rangeLabel?: string;
  score: number;
  subtitle?: string;
}) {
  return (
    <section className="border-y border-[#EAF2FF] bg-[#F8FBFF] px-5 py-6 sm:px-6" aria-label="Result">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-[34px] font-bold leading-none tracking-[-0.03em] text-[#0F172A]">
          {score}
          <span className="text-[19px] font-semibold text-[#94A3B8]">/{maxScore}</span>
        </p>
        {rangeLabel ? (
          <span className="rounded-full bg-[#EBF2FF] px-[9px] py-[5px] text-[10.5px] font-bold uppercase tracking-[0.11em] text-[#1D4ED8]">
            {rangeLabel}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-[13.5px] font-semibold text-[#64748B]">{percentage}% overall</p>
      {subtitle ? <p className="mt-3 text-[14.5px] leading-[1.55] text-[#475569]">{subtitle}</p> : null}
    </section>
  );
}

export function AssessmentParticipantScores({
  scores,
}: {
  scores: ReadonlyArray<{ label: string; maxScore: number; score: number }>;
}) {
  return (
    <section className="px-5 pt-[26px] sm:px-6" aria-label="Each person">
      <div className="grid gap-3 sm:grid-cols-2">
        {scores.map((entry) => (
          <div className="rounded-[18px] border border-[#DCEBFF] bg-white p-[15px]" key={entry.label}>
            <p className="text-[15px] font-bold tracking-[-0.012em] text-[#0F172A]">{entry.label}</p>
            <p className="mt-1 text-[13.5px] font-semibold text-[#64748B]">
              {entry.score} of {entry.maxScore}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AssessmentCategoryTable({
  categories,
  firstLabel,
  secondLabel,
}: {
  categories: readonly AssessmentCategoryScore[];
  firstLabel: string;
  secondLabel: string;
}) {
  return (
    <section className="px-5 pt-[30px] sm:px-6" aria-label="By category">
      <h2 className="text-[17px] font-bold tracking-[-0.015em] text-[#0F172A]">By category</h2>
      <div className="mt-3 border-t border-[#EAF2FF]">
        {categories.map((category) => (
          <div className="border-b border-[#EAF2FF] py-3" key={category.name}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[14.5px] font-semibold text-[#0F172A]">{category.name}</p>
              <p className="text-[12.5px] font-bold tabular-nums text-[#64748B]">{category.percentage}%</p>
            </div>
            <p className="mt-1 text-[12.5px] font-semibold text-[#64748B]">
              {firstLabel} {category.husbandScore} of {category.maxScore} · {secondLabel} {category.wifeScore} of {category.maxScore}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
