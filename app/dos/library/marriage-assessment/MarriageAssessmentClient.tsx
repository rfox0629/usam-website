"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, ChevronRight, Eye, Heart, Pencil, RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { DosAssessmentQuestion } from "@/src/lib/dos/resource-catalog";
import {
  assessmentHealthRange,
  assessmentOverallScore,
  assessmentPercentage,
  buildAssessmentAnswerPayload,
  buildAssessmentGroups,
  countAssessmentAnswers,
  getAssessmentAnswer,
  scoreAssessmentCategory,
  scoreAssessmentParticipant,
  type AssessmentAnswerMap,
} from "@/src/lib/dos/assessment-scoring";
import {
  AssessmentCategoryBreakdown,
  AssessmentProgressBar,
  AssessmentResultMeter,
  AssessmentScorePicker,
} from "@/src/components/dos/assessments/AssessmentPrimitives";

type Participant = string;

type SaveContext = {
  personId: string;
  profileHref: string;
  workspaceId: string;
};

type SaveState = {
  error?: string;
  resultId: string | null;
  status: "error" | "idle" | "saved" | "saving";
};

const fallbackParticipants = ["Husband", "Wife"] as const;

function scrollToTop() {
  window.scrollTo({ behavior: "smooth", top: 0 });
}

export function MarriageAssessmentClient({
  description,
  maxScore,
  participants: providedParticipants,
  questions,
  saveContext,
}: {
  description: string;
  maxScore: number;
  participants: readonly string[];
  questions: readonly DosAssessmentQuestion[];
  saveContext?: SaveContext;
}) {
  const searchParams = useSearchParams();
  const backToLibrary = searchParams.get("from") === "dos-library";
  /* USA-278: the Library's secondary action. A preview walks the real
     questions and shows the real result screen, but it is not an assignment:
     no link is created, no contact is touched, nothing is saved. */
  const isPreview = searchParams.get("mode") === "preview" && !saveContext;
  const libraryHref = "/dos/app?view=library";
  const participants = providedParticipants.length ? providedParticipants : fallbackParticipants;
  const groups = useMemo(() => buildAssessmentGroups(questions), [questions]);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [answers, setAnswers] = useState<AssessmentAnswerMap>({});
  const [showResults, setShowResults] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>({ resultId: null, status: "idle" });

  const activeGroup = groups[activeGroupIndex] ?? groups[0];
  const answeredCount = countAssessmentAnswers(answers, questions, participants);
  const requiredCount = questions.length * participants.length;
  const currentGroupAnsweredCount = activeGroup ? countAssessmentAnswers(answers, activeGroup.questions, participants) : 0;
  const currentGroupRequiredCount = activeGroup ? activeGroup.questions.length * participants.length : 0;
  const completionPercentage = assessmentPercentage(answeredCount, requiredCount);
  const canContinue = currentGroupAnsweredCount === currentGroupRequiredCount;
  const isLastGroup = activeGroupIndex === groups.length - 1;

  const participantScores = participants.map((participant) => scoreAssessmentParticipant(answers, questions, participant, maxScore));
  // The uploaded/reference files available to this environment did not include official Marriage Assessment scoring rules.
  // Keep the fallback simple: each spouse has a 0-150 score, and the relationship total is their rounded average until source scoring is confirmed.
  const totalScore = assessmentOverallScore(participantScores);
  const totalPercentage = assessmentPercentage(totalScore, maxScore);
  const range = assessmentHealthRange(totalScore);
  const categoryScores = groups.map((group) => scoreAssessmentCategory(answers, group, participants));

  function updateAnswer(questionId: string, participant: Participant, score: number) {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: {
        ...currentAnswers[questionId],
        [participant]: score,
      },
    }));
  }

  function goBack() {
    setActiveGroupIndex((currentIndex) => Math.max(currentIndex - 1, 0));
    scrollToTop();
  }

  async function saveResult(resultId: string | null) {
    if (!saveContext) {
      return;
    }

    setSaveState({ resultId, status: "saving" });

    try {
      const response = await fetch("/api/dos/app/assessment-results", {
        body: JSON.stringify({
          answers: buildAssessmentAnswerPayload(answers, questions, participants),
          assessmentTitle: "Marriage Assessment",
          assessmentType: "marriage-assessment",
          categoryScores,
          maxScore,
          overallScore: totalScore,
          percentage: totalPercentage,
          personId: saveContext.personId,
          resultId,
          source: "self",
          workspaceId: saveContext.workspaceId,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = await response.json().catch(() => ({})) as { error?: string; id?: string };

      if (!response.ok || !result.id) {
        throw new Error(result.error ?? "Unable to save assessment.");
      }

      setSaveState({ resultId: result.id, status: "saved" });
    } catch (error) {
      setSaveState({
        error: error instanceof Error ? error.message : "Unable to save assessment.",
        resultId,
        status: "error",
      });
    }
  }

  function goNext() {
    if (!canContinue) {
      return;
    }

    if (isLastGroup) {
      setShowResults(true);
      void saveResult(saveState.resultId);
      scrollToTop();
      return;
    }

    setActiveGroupIndex((currentIndex) => Math.min(currentIndex + 1, groups.length - 1));
    scrollToTop();
  }

  function editAnswers() {
    setShowResults(false);
    setActiveGroupIndex(0);
    scrollToTop();
  }

  function retake() {
    setAnswers({});
    setActiveGroupIndex(0);
    setSaveState({ resultId: null, status: "idle" });
    setShowResults(false);
    scrollToTop();
  }

  if (showResults) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-[#F8FBFF] px-4 py-5 text-[#0F172A] md:px-6 md:py-8">
        <div className="mx-auto grid w-full max-w-3xl gap-4">
          <header className="rounded-[28px] border border-[#DCEBFF] bg-white p-5 shadow-[0_24px_70px_rgba(37,99,235,0.08)] md:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-[#EBF2FF] text-[#2563EB]">
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2563EB]">DOS Library</p>
                <h1 className="mt-1 text-2xl font-black leading-tight tracking-tight text-[#0F172A]">Marriage Results</h1>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <p className="text-[42px] font-black leading-none tracking-tight text-[#0F172A]">
                  {totalScore}
                  <span className="text-lg text-[#94A3B8]">/{maxScore}</span>
                </p>
                <p className="mt-2 text-sm font-semibold text-[#64748B]">{totalPercentage}% total health score</p>
              </div>
              <span className={`inline-flex w-fit rounded-full border px-3 py-1.5 text-xs font-black ${range.pillClassName}`}>
                {range.label}
              </span>
            </div>
            <p className="mt-4 text-sm font-semibold leading-6 text-[#475569]">{range.detail}</p>
            {saveContext ? (
              <div className="mt-4 rounded-[20px] border border-[#DCEBFF] bg-[#F8FBFF] px-3 py-3 text-sm font-bold leading-6 text-[#1D4ED8]">
                {saveState.status === "saving" ? "Saving to profile..." : null}
                {saveState.status === "saved" ? "Saved to profile." : null}
                {saveState.status === "error" ? `Results shown here. ${saveState.error ?? "Unable to save to profile."}` : null}
                {saveState.status === "idle" ? "Ready to save to profile." : null}
              </div>
            ) : (
              <div className="mt-4 rounded-[20px] border border-[#DCEBFF] bg-[#F8FBFF] px-3 py-3 text-sm font-bold leading-6 text-[#64748B]">
                {isPreview
                  ? "Preview only. Standalone result. Not saved to a profile."
                  : "Standalone result. Not saved to a profile."}
              </div>
            )}
          </header>

          <section className="grid gap-3 md:grid-cols-2">
            {participantScores.map((participant) => (
              <AssessmentResultMeter key={participant.label} label={participant.label} maxScore={participant.maxScore} score={participant.score} />
            ))}
          </section>

          <AssessmentCategoryBreakdown categories={categoryScores} />

          <div className="grid gap-2 rounded-[24px] border border-[#DCEBFF] bg-white p-3 shadow-[0_18px_48px_rgba(37,99,235,0.06)] sm:grid-cols-2">
            <button
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#BFDBFE] bg-white px-4 text-sm font-black text-[#1D4ED8] transition-colors hover:bg-[#EBF2FF]"
              onClick={editAnswers}
              type="button"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
              Edit Answers
            </button>
            <button
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#2563EB] px-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(37,99,235,0.20)] transition-colors hover:bg-[#1D4ED8]"
              onClick={retake}
              type="button"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
              Retake
            </button>
            {saveContext ? (
              <Link
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#DCEBFF] bg-[#F8FBFF] px-4 text-sm font-black text-[#1D4ED8] transition-colors hover:bg-[#EBF2FF] sm:col-span-2"
                href={saveContext.profileHref}
              >
                Back to Profile
              </Link>
            ) : backToLibrary ? (
              <Link
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#DCEBFF] bg-[#F8FBFF] px-4 text-sm font-black text-[#1D4ED8] transition-colors hover:bg-[#EBF2FF] sm:col-span-2"
                href={libraryHref}
              >
                Back to Library
              </Link>
            ) : null}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F8FBFF] px-4 pb-24 pt-5 text-[#0F172A] md:px-6 md:pb-10 md:pt-8">
      <div className="mx-auto grid w-full max-w-3xl gap-4">
        <div className="flex items-center justify-between gap-3">
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#DCEBFF] bg-white px-3 text-xs font-black text-[#2563EB] shadow-[0_8px_18px_rgba(37,99,235,0.06)] transition-colors hover:bg-[#EBF2FF]"
            href={backToLibrary ? libraryHref : "/dos"}
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.9} />
            {backToLibrary ? "Library" : "DOS"}
          </Link>
          <span className="rounded-full border border-[#DCEBFF] bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#1D4ED8]">
            {answeredCount}/{requiredCount}
          </span>
        </div>

        <header className="rounded-[28px] border border-[#DCEBFF] bg-white p-5 shadow-[0_24px_70px_rgba(37,99,235,0.08)] md:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] bg-[#EBF2FF] text-[#2563EB]">
              <Heart className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2563EB]">DOS Library</p>
              <h1 className="mt-1 text-2xl font-black leading-tight tracking-tight text-[#0F172A]">Marriage Assessment</h1>
            </div>
          </div>
          <p className="mt-4 text-sm font-semibold leading-6 text-[#475569]">{description}</p>
          {/* USA-278: a preview is for the leader's own eyes. Saying so up
              front is the difference between "I am looking at this" and "I
              have started something for someone". */}
          {isPreview ? (
            <div className="mt-4 flex items-start gap-2.5 rounded-[20px] border border-[#DCEBFF] bg-[#F8FBFF] px-3.5 py-3">
              <Eye className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" aria-hidden="true" strokeWidth={1.9} />
              <p className="text-xs font-semibold leading-5 text-[#475569]">
                Preview. Nothing is saved, nobody is assigned this, and no link is created. Use <span className="font-black text-[#1D4ED8]">Send assessment</span> in the Library when you are ready.
              </p>
            </div>
          ) : null}
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-3 text-xs font-black text-[#64748B]">
              <span>Progress</span>
              <span>{completionPercentage}%</span>
            </div>
            <AssessmentProgressBar percentageValue={completionPercentage} />
          </div>
        </header>

        {activeGroup ? (
          <section className="rounded-[28px] border border-[#DCEBFF] bg-white p-4 shadow-[0_18px_48px_rgba(37,99,235,0.06)] md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2563EB]">
                  Step {activeGroupIndex + 1} of {groups.length}
                </p>
                <h2 className="mt-1 text-xl font-black leading-tight text-[#0F172A]">{activeGroup.name}</h2>
              </div>
              <span className="rounded-full bg-[#EBF2FF] px-3 py-1 text-[10px] font-black text-[#1D4ED8]">
                {currentGroupAnsweredCount}/{currentGroupRequiredCount}
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
                      {question.note ? <p className="mt-1 text-xs font-semibold leading-5 text-[#64748B]">{question.note}</p> : null}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3">
                    {participants.map((participant) => (
                      <AssessmentScorePicker
                        key={`${question.id}-${participant}`}
                        onChange={(score) => updateAnswer(question.id, participant, score)}
                        participant={participant}
                        question={question}
                        value={getAssessmentAnswer(answers, question.id, participant)}
                      />
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#DCEBFF] bg-white/95 px-4 py-3 shadow-[0_-18px_40px_rgba(37,99,235,0.10)] backdrop-blur md:sticky md:mx-auto md:mt-4 md:max-w-3xl md:rounded-[24px] md:border md:shadow-[0_18px_48px_rgba(37,99,235,0.06)]">
        <div className="mx-auto grid max-w-3xl grid-cols-[auto_1fr] gap-2">
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
    </main>
  );
}
