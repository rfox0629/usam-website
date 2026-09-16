"use client";

/* USA-278: the recipient's assigned assessment.
 *
 * No DOS account, no sign-in: the token is the whole of the access, and it
 * reaches this one assignment. Here "Start assessment" is the right words --
 * this is the couple's own assessment, not a library item they are browsing.
 *
 * This first release is the joint model the assessment already used: one
 * link, both spouses answering together, each answer labelled with whose it
 * is. The page says so before anyone starts, and says who will see the
 * answers, so nobody mistakes it for a private individual questionnaire.
 */

import { CheckCircle2, ChevronRight, Heart, Loader2, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  assessmentPercentage,
  buildAssessmentGroups,
  countAssessmentAnswers,
  getAssessmentAnswer,
  type AssessmentAnswerMap,
} from "@/src/lib/dos/assessment-scoring";
import { AssessmentProgressBar, AssessmentScorePicker } from "@/src/components/dos/assessments/AssessmentPrimitives";
import type { DosAssessmentQuestion } from "@/src/lib/dos/resource-catalog";

type ShareLink = {
  assessment: {
    maxScore: number;
    participants: readonly string[];
    questions: readonly DosAssessmentQuestion[];
  };
  description: string;
  participants: Array<{ name: string; role: string }>;
  requestedByName: string;
  responses: AssessmentAnswerMap;
  title: string;
  token: string;
  typeLabel: string;
};

type SaveState = "error" | "idle" | "saved" | "saving";

const autoSaveDelayMs = 1200;

function scrollToTop() {
  window.scrollTo({ behavior: "smooth", top: 0 });
}

export function DosSharedAssessmentForm({ shareLink }: { shareLink: ShareLink }) {
  const { assessment, participants, requestedByName, title, token } = shareLink;
  const questions = assessment.questions;
  const roles = useMemo(() => participants.map((participant) => participant.role), [participants]);
  const nameByRole = useMemo(
    () => Object.fromEntries(participants.map((participant) => [participant.role, participant.name])) as Record<string, string>,
    [participants],
  );
  const groups = useMemo(() => buildAssessmentGroups(questions), [questions]);
  const hasSavedProgress = Object.keys(shareLink.responses).length > 0;

  const [answers, setAnswers] = useState<AssessmentAnswerMap>(shareLink.responses);
  const [stage, setStage] = useState<"complete" | "intro" | "questions">("intro");
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const answeredCount = countAssessmentAnswers(answers, questions, roles);
  const requiredCount = questions.length * roles.length;
  const completionPercentage = assessmentPercentage(answeredCount, requiredCount);
  const activeGroup = groups[activeGroupIndex] ?? groups[0];
  const currentGroupAnsweredCount = activeGroup ? countAssessmentAnswers(answers, activeGroup.questions, roles) : 0;
  const currentGroupRequiredCount = activeGroup ? activeGroup.questions.length * roles.length : 0;
  const canContinue = currentGroupAnsweredCount === currentGroupRequiredCount;
  const isLastGroup = activeGroupIndex === groups.length - 1;
  const participantLine = participants.map((participant) => `${participant.name} (${participant.role})`).join(" · ");

  /* Progress is kept on the server, not in this browser, so the couple can
     stop on a phone and pick the same link up later on a laptop. */
  const persistProgress = useCallback(async (nextAnswers: AssessmentAnswerMap) => {
    setSaveState("saving");

    try {
      const response = await fetch(`/api/dos/resource-links/${encodeURIComponent(token)}`, {
        body: JSON.stringify({ intent: "save", responses: nextAnswers }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Unable to save progress.");
      }

      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, [token]);

  useEffect(() => () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }
  }, []);

  function updateAnswer(questionId: string, role: string, score: number) {
    setAnswers((currentAnswers) => {
      const nextAnswers = {
        ...currentAnswers,
        [questionId]: { ...currentAnswers[questionId], [role]: score },
      };

      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }

      saveTimer.current = setTimeout(() => {
        void persistProgress(nextAnswers);
      }, autoSaveDelayMs);

      return nextAnswers;
    });
  }

  function goBack() {
    setActiveGroupIndex((currentIndex) => Math.max(currentIndex - 1, 0));
    scrollToTop();
  }

  async function submit() {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/dos/resource-links/${encodeURIComponent(token)}`, {
        body: JSON.stringify({ intent: "submit", responses: answers }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = await response.json().catch(() => ({})) as { error?: string; ok?: boolean };

      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? "Unable to submit this assessment.");
      }

      setStage("complete");
      scrollToTop();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to submit this assessment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function goNext() {
    if (!canContinue) {
      return;
    }

    if (isLastGroup) {
      void submit();
      return;
    }

    setActiveGroupIndex((currentIndex) => Math.min(currentIndex + 1, groups.length - 1));
    scrollToTop();
  }

  if (stage === "complete") {
    return (
      <main className="min-h-screen overflow-x-hidden bg-[#F8FBFF] px-4 py-8 text-[#0F172A] md:px-6">
        <section className="mx-auto grid w-full max-w-xl gap-4">
          <div className="rounded-[28px] border border-[#DCEBFF] bg-white p-5 shadow-[0_24px_70px_rgba(37,99,235,0.08)] md:p-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-[#EBF2FF] text-[#2563EB]">
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" strokeWidth={1.9} />
            </span>
            <h1 className="mt-4 text-2xl font-black leading-tight tracking-tight text-[#0F172A]">Assessment complete</h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-[#475569]">
              Thank you, {participants.map((participant) => participant.name).join(" and ")}. Your answers were sent to {requestedByName}, who asked for this assessment.
            </p>
            <p className="mt-3 text-sm leading-6 text-[#64748B]">
              This link is finished. You can close this page — nothing else is needed.
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (stage === "intro") {
    return (
      <main className="min-h-screen overflow-x-hidden bg-[#F8FBFF] px-4 py-8 text-[#0F172A] md:px-6">
        <section className="mx-auto grid w-full max-w-xl gap-4">
          <header className="rounded-[28px] border border-[#DCEBFF] bg-white p-5 shadow-[0_24px_70px_rgba(37,99,235,0.08)] md:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] bg-[#EBF2FF] text-[#2563EB]">
                <Heart className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2563EB]">{shareLink.typeLabel}</p>
                <h1 className="mt-1 text-2xl font-black leading-tight tracking-tight text-[#0F172A]">{title}</h1>
              </div>
            </div>
            <p className="mt-4 text-sm font-semibold leading-6 text-[#475569]">{shareLink.description}</p>

            <div className="mt-5 grid gap-2 rounded-[20px] border border-[#DCEBFF] bg-[#F8FBFF] px-3.5 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#64748B]">Requested by</p>
              <p className="text-sm font-black text-[#0F172A]">{requestedByName}</p>
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#64748B]">For</p>
              <p className="flex items-center gap-2 text-sm font-black text-[#0F172A]">
                <Users className="h-4 w-4 shrink-0 text-[#2563EB]" aria-hidden="true" strokeWidth={1.9} />
                {participantLine}
              </p>
            </div>
          </header>

          <section className="rounded-[24px] border border-[#DCEBFF] bg-white p-4 shadow-[0_18px_48px_rgba(37,99,235,0.06)] md:p-5">
            <h2 className="text-base font-black text-[#0F172A]">How this works</h2>
            <ul className="mt-3 grid gap-2.5">
              {[
                `Sit down together and go through ${questions.length} questions. Each question is answered twice — once by each of you, on a 0 to 10 scale.`,
                "Answer for yourself. Never guess how your spouse would answer.",
                "Your progress saves as you go, so you can stop and come back to this same link.",
              ].map((line) => (
                <li className="flex gap-2.5 text-sm font-medium leading-6 text-[#475569]" key={line}>
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2563EB]" aria-hidden="true" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            {/* Said plainly before anyone starts: this is a joint session, not
                a confidential individual questionnaire. */}
            <div className="mt-4 rounded-[18px] border border-[#DCEBFF] bg-[#F8FBFF] px-3.5 py-3">
              <p className="text-xs font-black uppercase tracking-[0.13em] text-[#64748B]">Who sees this</p>
              <p className="mt-1.5 text-sm leading-6 text-[#475569]">
                You are completing this together, so both of your responses are visible in this session to whoever is at the screen, and both will be shared with {requestedByName}, who asked for the assessment. This is not a private individual questionnaire.
              </p>
            </div>
          </section>

          <button
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#2563EB] px-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(37,99,235,0.20)] transition-colors hover:bg-[#1D4ED8]"
            onClick={() => { setStage("questions"); scrollToTop(); }}
            type="button"
          >
            {hasSavedProgress ? "Resume assessment" : "Start assessment"}
            <ChevronRight className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
          </button>
          {hasSavedProgress ? (
            <p className="text-center text-xs font-semibold text-[#64748B]">
              {answeredCount} of {requiredCount} answers saved so far.
            </p>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F8FBFF] px-4 pb-28 pt-5 text-[#0F172A] md:px-6 md:pb-10 md:pt-8">
      <div className="mx-auto grid w-full max-w-3xl gap-4">
        <header className="rounded-[28px] border border-[#DCEBFF] bg-white p-5 shadow-[0_24px_70px_rgba(37,99,235,0.08)] md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2563EB]">{shareLink.typeLabel}</p>
              <h1 className="mt-1 text-2xl font-black leading-tight tracking-tight text-[#0F172A]">{title}</h1>
              <p className="mt-1.5 text-xs font-semibold text-[#64748B]">{participantLine}</p>
            </div>
            <span className="shrink-0 rounded-full border border-[#DCEBFF] bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#1D4ED8]">
              {answeredCount}/{requiredCount}
            </span>
          </div>
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-3 text-xs font-black text-[#64748B]">
              <span>Progress</span>
              <span>{completionPercentage}%</span>
            </div>
            <AssessmentProgressBar percentageValue={completionPercentage} />
            <p className="mt-2 text-[11px] font-semibold text-[#94A3B8]">
              {saveState === "saving" ? "Saving…" : null}
              {saveState === "saved" ? "Progress saved. You can close this and come back to the same link." : null}
              {saveState === "error" ? "Could not save just now — your answers stay on screen and will save again as you go." : null}
              {saveState === "idle" ? "Your progress saves automatically." : null}
            </p>
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
                    {roles.map((role) => (
                      <AssessmentScorePicker
                        displayName={nameByRole[role]}
                        key={`${question.id}-${role}`}
                        onChange={(score) => updateAnswer(question.id, role, score)}
                        participant={role}
                        question={question}
                        value={getAssessmentAnswer(answers, question.id, role)}
                      />
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {errorMessage ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{errorMessage}</p>
        ) : null}
      </div>

      {/* Sits above the content rather than over it: the last question stays
          readable on a small phone because the page reserves the bar's height. */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#DCEBFF] bg-white/95 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] shadow-[0_-18px_40px_rgba(37,99,235,0.10)] backdrop-blur md:sticky md:mx-auto md:mt-4 md:max-w-3xl md:rounded-[24px] md:border md:pb-3 md:shadow-[0_18px_48px_rgba(37,99,235,0.06)]">
        <div className="mx-auto grid max-w-3xl grid-cols-[auto_1fr] gap-2">
          <button
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCEBFF] bg-white px-4 text-sm font-black text-[#1D4ED8] transition-colors hover:bg-[#EBF2FF] disabled:cursor-not-allowed disabled:text-[#94A3B8]"
            disabled={activeGroupIndex === 0 || isSubmitting}
            onClick={goBack}
            type="button"
          >
            Back
          </button>
          <button
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#2563EB] px-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(37,99,235,0.20)] transition-colors hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:bg-[#BFDBFE] disabled:shadow-none"
            disabled={!canContinue || isSubmitting}
            onClick={goNext}
            type="button"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" strokeWidth={1.9} /> : null}
            {isLastGroup ? (isSubmitting ? "Sending…" : "Finish and send") : "Next"}
            {isLastGroup || isSubmitting ? null : <ChevronRight className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />}
          </button>
        </div>
      </div>
    </main>
  );
}
