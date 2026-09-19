"use client";

/* The recipient's own assigned assessment, in the book study's visual system.
 *
 * No DOS account, no sign-in: the token is the whole of the access. The
 * step-by-step completion flow is deliberate and unchanged; only the
 * presentation moved onto the shared assessment components.
 *
 * Roles come from the assignment, so a couple whose wife was sent the link
 * sees her as Wife and her husband as Husband, and every answer is stored
 * against the role it was given under.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildAssessmentGroups,
  countAssessmentAnswers,
  getAssessmentAnswer,
  type AssessmentAnswerMap,
} from "@/src/lib/dos/assessment-scoring";
import {
  AssessmentDock,
  AssessmentFacts,
  AssessmentHeader,
  AssessmentPage,
  AssessmentQuestion,
  AssessmentScoreRow,
  AssessmentSection,
  AssessmentStepBand,
  AssessmentTopBar,
} from "@/src/components/dos/assessments/AssessmentUi";
import { DosSharedAssessmentReport } from "@/app/dos/resource/[token]/DosSharedAssessmentReport";
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

/* Exactly what the completed page renders, which is what the submit endpoint
   returns, which is what reopening the link builds. One shape, three doors. */
type CompletedReport = Parameters<typeof DosSharedAssessmentReport>[0]["shareLink"];

type SaveState = "error" | "idle" | "saved" | "saving";

const autoSaveDelayMs = 1200;

/* USA-280: the recipient form does not own the page scroll. Inside the
   installed-app layout, and inside any overlay, the thing that scrolls is an
   ancestor div with its own overflow, so window.scrollTo() moved nothing and
   Next left the reader at the bottom of the previous step. Find whatever is
   actually scrolling and move that. */
function nearestScrollableAncestor(element: HTMLElement | null) {
  let current = element?.parentElement ?? null;

  while (current) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;

    if ((overflowY === "auto" || overflowY === "scroll") && current.scrollHeight > current.clientHeight) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}

function scrollToTop() {
  window.scrollTo({ behavior: "smooth", top: 0 });
}

/* Put the new section's heading at the top of whatever is scrolling, then move
   focus to it so a screen reader and the keyboard both land on the new step
   rather than staying where the button was. */
function revealSection(target: HTMLElement | null) {
  if (!target) {
    scrollToTop();
    return;
  }

  const container = nearestScrollableAncestor(target);

  if (container) {
    const top = target.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;

    container.scrollTo({ behavior: "smooth", top: Math.max(0, top) });
  } else {
    scrollToTop();
  }

  target.focus({ preventScroll: true });
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
  const [completedReport, setCompletedReport] = useState<CompletedReport | null>(null);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const sectionHeadingRef = useRef<HTMLDivElement>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const answeredCount = countAssessmentAnswers(answers, questions, roles);
  const requiredCount = questions.length * roles.length;
  const activeGroup = groups[activeGroupIndex] ?? groups[0];
  const currentGroupAnsweredCount = activeGroup ? countAssessmentAnswers(answers, activeGroup.questions, roles) : 0;
  const currentGroupRequiredCount = activeGroup ? activeGroup.questions.length * roles.length : 0;
  const canContinue = currentGroupAnsweredCount === currentGroupRequiredCount;
  const isLastGroup = activeGroupIndex === groups.length - 1;
  /* Depends on the step and the stage only. An autosave or a score selection
     re-renders this component constantly and must never move the reader. */
  useEffect(() => {
    if (stage !== "questions") {
      return;
    }

    revealSection(sectionHeadingRef.current);
  }, [activeGroupIndex, stage]);
  const participantLine = participants.map((participant) => `${participant.name} (${participant.role})`).join(" and ");

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
      const result = await response.json().catch(() => ({})) as {
        error?: string;
        ok?: boolean;
        report?: CompletedReport | null;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? "Unable to submit this assessment.");
      }

      /* USA-282: the results come back with the submission, so this is where
         the couple read them. No refresh, no reopening the link, no account. */
      setCompletedReport(result.report ?? null);
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
  }

  if (stage === "complete") {
    /* The report itself, the same one reopening the link shows. */
    if (completedReport) {
      return <DosSharedAssessmentReport shareLink={completedReport} />;
    }

    /* Only if the submission succeeded but the report could not be read back,
       which the reopen path recovers from. The answers are saved either way,
       so this says so rather than implying they were lost. */
    return (
      <AssessmentPage>
        <AssessmentTopBar backLabel="" meta="Complete" title={title} />
        <AssessmentHeader eyebrow="Assessment" title="Answers received" />
        <AssessmentSection>
          <p className="text-[15.5px] leading-[1.62] text-[#475569]">
            Thank you, {participants.map((participant) => participant.name).join(" and ")}. Your answers are saved and went to {requestedByName}, who asked for this assessment.
          </p>
          <p className="mt-3 text-[14.5px] leading-[1.55] text-[#334E68]">
            Your results did not load just now. Open this same link again to read them.
          </p>
        </AssessmentSection>
      </AssessmentPage>
    );
  }

  if (stage === "intro") {
    return (
      <AssessmentPage>
        <AssessmentTopBar backLabel="" meta={`From ${requestedByName}`} title={title} />
        <AssessmentHeader description={shareLink.description} eyebrow={shareLink.typeLabel} title={title} />
        <AssessmentFacts
          items={[
            `For ${participantLine}.`,
            `${questions.length} questions, answered together. Each of you gives your own score from 0 to 10.`,
            "Answer for yourself. Never guess how your spouse would answer.",
            "Your progress saves as you go, so you can stop and come back to this same link.",
            `Both sets of answers are visible on this screen and both go to ${requestedByName}. This is not a private individual questionnaire.`,
          ]}
        />
        <AssessmentDock
          onPrimary={() => { setStage("questions"); scrollToTop(); }}
          primaryLabel={hasSavedProgress ? "Resume assessment" : "Start assessment"}
        />
        {hasSavedProgress ? (
          <p className="px-5 pt-3 text-[13px] font-semibold text-[#334E68] sm:px-6">
            {answeredCount} of {requiredCount} answers saved so far.
          </p>
        ) : null}
      </AssessmentPage>
    );
  }

  return (
    <AssessmentPage>
      <AssessmentTopBar
        backLabel=""
        meta={participantLine}
        title={title}
      />
      {activeGroup ? (
        <>
          <div aria-label={`${activeGroup.name}, step ${activeGroupIndex + 1} of ${groups.length}`} ref={sectionHeadingRef} tabIndex={-1}>
            <AssessmentStepBand
              answeredCount={answeredCount}
              requiredCount={requiredCount}
              stepIndex={activeGroupIndex + 1}
              stepName={activeGroup.name}
              stepTotal={groups.length}
            />
          </div>
          <p className="px-5 pt-3 text-[12px] font-semibold text-[#334E68] sm:px-6">
            {saveState === "saving" ? "Saving..." : null}
            {saveState === "saved" ? "Progress saved. You can close this and come back to the same link." : null}
            {saveState === "error" ? "Could not save just now. Your answers stay on screen and will save again as you go." : null}
            {saveState === "idle" ? "Your progress saves automatically." : null}
          </p>
          {activeGroup.questions.map((question) => (
            <AssessmentQuestion
              index={questions.indexOf(question) + 1}
              key={question.id}
              note={question.note}
              prompt={question.prompt}
            >
              {roles.map((role) => (
                <AssessmentScoreRow
                  displayName={nameByRole[role]}
                  key={`${question.id}-${role}`}
                  onChange={(score) => updateAnswer(question.id, role, score)}
                  participant={role}
                  question={question}
                  value={getAssessmentAnswer(answers, question.id, role)}
                />
              ))}
            </AssessmentQuestion>
          ))}
          {errorMessage ? (
            <p className="px-5 pt-4 text-[13.5px] font-semibold text-[#B91C1C] sm:px-6">{errorMessage}</p>
          ) : null}
          <AssessmentDock
            onPrimary={goNext}
            onSecondary={activeGroupIndex === 0 ? undefined : () => {
              setActiveGroupIndex((currentIndex) => Math.max(currentIndex - 1, 0));
            }}
            primaryDisabled={!canContinue || isSubmitting}
            primaryLabel={isLastGroup ? (isSubmitting ? "Sending..." : "Finish and send") : "Next"}
            secondaryDisabled={isSubmitting}
            secondaryLabel={activeGroupIndex === 0 ? undefined : "Previous"}
          />
        </>
      ) : null}
    </AssessmentPage>
  );
}
