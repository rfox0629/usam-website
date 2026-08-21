"use client";

import { CheckCircle2, ChevronRight, Pencil, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import type { DosAssessmentQuestion } from "@/src/lib/dos/resource-catalog";

/**
 * PROTOTYPE ONLY.
 *
 * This is the existing Marriage Assessment UI (score picker, grouped steps,
 * results, category breakdown) lifted out of
 * app/dos/library/marriage-assessment/MarriageAssessmentClient.tsx with its own
 * page chrome removed, so the shared Resource shell owns the header and Back.
 *
 * Nothing about the assessment interaction itself was redesigned. The only
 * change is that it no longer renders its own "DOS Library / Marriage
 * Assessment" header or its own "<- DOS" link.
 */

type Participant = string;

type AssessmentGroup = { name: string; questions: readonly DosAssessmentQuestion[] };

type AnswerMap = Record<string, Record<Participant, number | undefined>>;

const scoreValues = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

const healthRanges = [
  { detail: "Strength is visible. Keep tending what is working.", label: "Strong", minScore: 135, pillClassName: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { detail: "Healthy patterns are present with a few places to revisit.", label: "Healthy", minScore: 120, pillClassName: "border-sky-200 bg-sky-50 text-sky-700" },
  { detail: "There is growth to name and steady next steps to take.", label: "Growing", minScore: 90, pillClassName: "border-blue-200 bg-blue-50 text-blue-700" },
  { detail: "Several areas need patient attention and support.", label: "Strained", minScore: 60, pillClassName: "border-amber-200 bg-amber-50 text-amber-700" },
  { detail: "Move slowly, seek care, and focus on repair.", label: "Needs Care", minScore: 0, pillClassName: "border-rose-200 bg-rose-50 text-rose-700" },
] as const;

function buildGroups(questions: readonly DosAssessmentQuestion[]) {
  return questions.reduce<AssessmentGroup[]>((groups, question) => {
    const name = question.group ?? "Marriage Health";
    const existingGroup = groups.find((group) => group.name === name);

    if (existingGroup) {
      existingGroup.questions = [...existingGroup.questions, question];
      return groups;
    }

    return [...groups, { name, questions: [question] }];
  }, []);
}

function getAnswer(answers: AnswerMap, questionId: string, participant: Participant) {
  return answers[questionId]?.[participant];
}

function countAnswered(answers: AnswerMap, questions: readonly DosAssessmentQuestion[], participants: readonly Participant[]) {
  return questions.reduce((total, question) => total
    + participants.filter((participant) => typeof getAnswer(answers, question.id, participant) === "number").length, 0);
}

function percentage(score: number, maxScore: number) {
  return maxScore <= 0 ? 0 : Math.round((score / maxScore) * 100);
}

function getRange(score: number) {
  return healthRanges.find((range) => score >= range.minScore) ?? healthRanges[healthRanges.length - 1];
}

function ProgressBar({ percentageValue }: { percentageValue: number }) {
  return (
    <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-[#DCEBFF]">
      <div className="h-full rounded-full bg-[#2563EB] transition-all duration-300" style={{ width: `${percentageValue}%` }} />
    </div>
  );
}

function ScorePicker({
  onChange,
  participant,
  question,
  value,
}: {
  onChange: (value: number) => void;
  participant: Participant;
  question: DosAssessmentQuestion;
  value: number | undefined;
}) {
  const prompt = question.participantPrompts?.[participant] ?? question.prompt;

  return (
    <fieldset className="rounded-[18px] border border-[#DCEBFF] bg-[#F8FBFF] p-3">
      <legend className="px-1 text-xs font-black text-[#0F172A]">{participant}</legend>
      <p className="mt-1 text-xs font-semibold leading-5 text-[#475569]">{prompt}</p>
      <div className="mt-3 grid grid-cols-6 gap-1.5" role="radiogroup">
        {scoreValues.map((score) => {
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
                name={`${question.id}-${participant}`}
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

export function PreviewAssessment({
  description,
  maxScore,
  onScrollTop,
  participants,
  questions,
}: {
  description: string;
  maxScore: number;
  onScrollTop: () => void;
  participants: readonly string[];
  questions: readonly DosAssessmentQuestion[];
}) {
  const groups = useMemo(() => buildGroups(questions), [questions]);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [showResults, setShowResults] = useState(false);

  const activeGroup = groups[activeGroupIndex] ?? groups[0];
  const answeredCount = countAnswered(answers, questions, participants);
  const requiredCount = questions.length * participants.length;
  const groupAnswered = activeGroup ? countAnswered(answers, activeGroup.questions, participants) : 0;
  const groupRequired = activeGroup ? activeGroup.questions.length * participants.length : 0;
  const completionPercentage = percentage(answeredCount, requiredCount);
  const canContinue = groupAnswered === groupRequired;
  const isLastGroup = activeGroupIndex === groups.length - 1;

  const participantScores = participants.map((participant) => ({
    label: participant,
    score: questions.reduce((total, question) => total + (getAnswer(answers, question.id, participant) ?? 0), 0),
  }));
  const totalScore = Math.round(
    participantScores.reduce((total, participant) => total + participant.score, 0) / Math.max(participants.length, 1),
  );
  const range = getRange(totalScore);

  const categoryScores = groups.map((group) => {
    const groupMax = group.questions.length * 10;
    const perParticipant = participants.map((participant) => ({
      label: participant,
      score: group.questions.reduce((total, question) => total + (getAnswer(answers, question.id, participant) ?? 0), 0),
    }));
    const score = Math.round(perParticipant.reduce((total, item) => total + item.score, 0) / Math.max(participants.length, 1));

    return { max: groupMax, name: group.name, perParticipant, percentage: percentage(score, groupMax), score };
  });

  function updateAnswer(questionId: string, participant: Participant, score: number) {
    setAnswers((previous) => ({ ...previous, [questionId]: { ...previous[questionId], [participant]: score } }));
  }

  function goNext() {
    if (isLastGroup) {
      setShowResults(true);
      onScrollTop();
      return;
    }

    setActiveGroupIndex((index) => Math.min(index + 1, groups.length - 1));
    onScrollTop();
  }

  function goBack() {
    setActiveGroupIndex((index) => Math.max(index - 1, 0));
    onScrollTop();
  }

  if (showResults) {
    return (
      <div className="grid gap-3">
        <header className="rounded-[24px] border border-[#DCEBFF] bg-white p-4 shadow-[0_18px_48px_rgba(37,99,235,0.06)]">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-[#EBF2FF] text-[#2563EB]">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />
            </span>
            <h2 className="text-xl font-black leading-tight text-[#0F172A]">Marriage Results</h2>
          </div>
          <div className="mt-4 flex items-end justify-between gap-3">
            <p className="text-[42px] font-black leading-none tracking-tight text-[#0F172A]">
              {totalScore}
              <span className="text-lg text-[#94A3B8]">/{maxScore}</span>
            </p>
            <span className={`inline-flex w-fit rounded-full border px-3 py-1.5 text-xs font-black ${range.pillClassName}`}>
              {range.label}
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold text-[#64748B]">{percentage(totalScore, maxScore)}% total health score</p>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#475569]">{range.detail}</p>
        </header>

        <section className="grid gap-3">
          {participantScores.map((participant) => (
            <article className="rounded-[20px] border border-[#EAF2FF] bg-white p-4" key={participant.label}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-[#0F172A]">{participant.label}</p>
                <p className="text-xs font-black text-[#1D4ED8]">{participant.score}/{maxScore}</p>
              </div>
              <div className="mt-3">
                <ProgressBar percentageValue={percentage(participant.score, maxScore)} />
              </div>
            </article>
          ))}
        </section>

        <section className="rounded-[24px] border border-[#DCEBFF] bg-white p-4 shadow-[0_18px_48px_rgba(37,99,235,0.06)]">
          <h2 className="text-base font-black text-[#0F172A]">Category Breakdown</h2>
          <div className="mt-4 grid gap-3">
            {categoryScores.map((category) => (
              <article className="rounded-[18px] border border-[#EAF2FF] bg-[#F8FBFF] p-3" key={category.name}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-[#0F172A]">{category.name}</h3>
                    <p className="mt-1 text-xs font-semibold text-[#64748B]">{category.score}/{category.max} average</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#EBF2FF] px-2.5 py-1 text-[10px] font-black text-[#1D4ED8]">
                    {category.percentage}%
                  </span>
                </div>
                <div className="mt-3">
                  <ProgressBar percentageValue={category.percentage} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-bold text-[#64748B]">
                  {category.perParticipant.map((item) => (
                    <span key={item.label}>{item.label} {item.score}/{category.max}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="grid gap-2 rounded-[24px] border border-[#DCEBFF] bg-white p-3 shadow-[0_18px_48px_rgba(37,99,235,0.06)]">
          <button
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#BFDBFE] bg-white px-4 text-sm font-black text-[#1D4ED8] transition-colors hover:bg-[#EBF2FF]"
            onClick={() => { setShowResults(false); onScrollTop(); }}
            type="button"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
            Edit Answers
          </button>
          <button
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#2563EB] px-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(37,99,235,0.20)] transition-colors hover:bg-[#1D4ED8]"
            onClick={() => { setAnswers({}); setActiveGroupIndex(0); setShowResults(false); onScrollTop(); }}
            type="button"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
            Retake
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <section className="rounded-[24px] border border-[#DCEBFF] bg-white p-4 shadow-[0_18px_48px_rgba(37,99,235,0.06)]">
        <p className="text-sm font-semibold leading-6 text-[#475569]">{description}</p>
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-black text-[#64748B]">
            <span>Progress</span>
            <span>{answeredCount}/{requiredCount} · {completionPercentage}%</span>
          </div>
          <ProgressBar percentageValue={completionPercentage} />
        </div>
      </section>

      {activeGroup ? (
        <section className="rounded-[24px] border border-[#DCEBFF] bg-white p-4 shadow-[0_18px_48px_rgba(37,99,235,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2563EB]">
                Step {activeGroupIndex + 1} of {groups.length}
              </p>
              <h2 className="mt-1 text-xl font-black leading-tight text-[#0F172A]">{activeGroup.name}</h2>
            </div>
            <span className="rounded-full bg-[#EBF2FF] px-3 py-1 text-[10px] font-black text-[#1D4ED8]">
              {groupAnswered}/{groupRequired}
            </span>
          </div>

          <div className="mt-4 grid gap-4">
            {activeGroup.questions.map((question, questionIndex) => (
              <article className="rounded-[22px] border border-[#EAF2FF] bg-white p-3.5" key={question.id}>
                <div className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-xs font-black text-[#1D4ED8]">
                    {questionIndex + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-black leading-6 text-[#0F172A]">{question.prompt}</h3>
                  </div>
                </div>
                <div className="mt-3 grid gap-3">
                  {participants.map((participant) => (
                    <ScorePicker
                      key={`${question.id}-${participant}`}
                      onChange={(score) => updateAnswer(question.id, participant, score)}
                      participant={participant}
                      question={question}
                      value={getAnswer(answers, question.id, participant)}
                    />
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid grid-cols-[auto_1fr] gap-2">
        <button
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCEBFF] bg-white px-4 text-sm font-black text-[#1D4ED8] transition-colors hover:bg-[#EBF2FF] disabled:cursor-not-allowed disabled:text-[#94A3B8]"
          disabled={activeGroupIndex === 0}
          onClick={goBack}
          type="button"
        >
          Back
        </button>
        <button
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#2563EB] px-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(37,99,235,0.20)] transition-colors hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:bg-[#BFDBFE] disabled:shadow-none"
          disabled={!canContinue}
          onClick={goNext}
          type="button"
        >
          {isLastGroup ? "View Results" : "Next"}
          <ChevronRight className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
        </button>
      </div>
    </div>
  );
}
