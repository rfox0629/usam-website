"use client";

/* The Marriage Assessment page, in the book study's visual system.
 *
 * Three modes share this route:
 *   preview      (?mode=preview)  every question on one scrollable page, so a
 *                                 leader can read the whole thing without
 *                                 answering anything. Nothing is saved.
 *   assigned     (?person&workspace) the existing self-serve run that saves a
 *                                 result to that person's profile.
 *   standalone   (neither)        the existing run that saves nowhere.
 *
 * The recipient's own assigned assessment is a different surface
 * (app/dos/resource/[token]) and keeps its step-by-step flow.
 */

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  AssessmentCategoryTable,
  AssessmentDock,
  AssessmentGroupHeading,
  AssessmentHeader,
  AssessmentNotice,
  AssessmentPage,
  AssessmentParticipantScores,
  AssessmentQuestion,
  AssessmentScoreRow,
  AssessmentScoreSummary,
  AssessmentStepBand,
  AssessmentTopBar,
} from "@/src/components/dos/assessments/AssessmentUi";

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

/* Back from a preview lands on the assessment's own detail screen, not the
   Library root and not a fresh questionnaire. The DOS app restores its own
   workspace, so the resource deep link is all this needs; it is also the
   sensible fallback when the page is opened directly. */
const assessmentDetailHref = "/dos/app?view=library&resource=marriage-assessment";

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
  const isPreview = searchParams.get("mode") === "preview" && !saveContext;
  const participants = providedParticipants.length ? providedParticipants : fallbackParticipants;
  const groups = useMemo(() => buildAssessmentGroups(questions), [questions]);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [answers, setAnswers] = useState<AssessmentAnswerMap>({});
  const [showResults, setShowResults] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>({ resultId: null, status: "idle" });

  function updateAnswer(questionId: string, participant: string, score: number) {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: { ...currentAnswers[questionId], [participant]: score },
    }));
  }

  /* ---- Preview -------------------------------------------------------- *
     Every question, in its existing sections, on one page. No steps, no
     progress bar, no answered count: a leader is reading, not completing.
     The controls stay usable so the recipient experience is legible, and
     what they touch lives only in this component's state. */
  if (isPreview) {
    return (
      <AssessmentPage>
        <AssessmentTopBar
          backHref={assessmentDetailHref}
          backLabel="Marriage Assessment"
          meta="Preview"
          title="Marriage Assessment"
        />
        <AssessmentNotice>Preview only. Answers are not saved.</AssessmentNotice>
        <AssessmentHeader description={description} eyebrow="Assessment" title="Marriage Assessment" />

        {groups.map((group) => (
          <div key={group.name}>
            <AssessmentGroupHeading name={group.name} />
            {group.questions.map((question) => (
              <AssessmentQuestion
                index={questions.indexOf(question) + 1}
                key={question.id}
                note={question.note}
                prompt={question.prompt}
              >
                {participants.map((participant) => (
                  <AssessmentScoreRow
                    key={`${question.id}-${participant}`}
                    onChange={(score) => updateAnswer(question.id, participant, score)}
                    participant={participant}
                    question={question}
                    value={getAssessmentAnswer(answers, question.id, participant)}
                  />
                ))}
              </AssessmentQuestion>
            ))}
          </div>
        ))}

        <div className="px-5 pt-[26px] sm:px-6">
          <a
            className="inline-flex min-h-[46px] items-center justify-center rounded-[11px] border border-[#DCEBFF] bg-white px-4 text-[14.5px] font-semibold text-[#0F172A]"
            href={assessmentDetailHref}
          >
            Back to Marriage Assessment
          </a>
        </div>
      </AssessmentPage>
    );
  }

  const activeGroup = groups[activeGroupIndex] ?? groups[0];
  const answeredCount = countAssessmentAnswers(answers, questions, participants);
  const requiredCount = questions.length * participants.length;
  const currentGroupAnsweredCount = activeGroup ? countAssessmentAnswers(answers, activeGroup.questions, participants) : 0;
  const currentGroupRequiredCount = activeGroup ? activeGroup.questions.length * participants.length : 0;
  const canContinue = currentGroupAnsweredCount === currentGroupRequiredCount;
  const isLastGroup = activeGroupIndex === groups.length - 1;
  const participantScores = participants.map((participant) => scoreAssessmentParticipant(answers, questions, participant, maxScore));
  const totalScore = assessmentOverallScore(participantScores);
  const totalPercentage = assessmentPercentage(totalScore, maxScore);
  const range = assessmentHealthRange(totalScore);
  const categoryScores = groups.map((group) => scoreAssessmentCategory(answers, group, participants));

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
        headers: { "Content-Type": "application/json" },
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

  if (showResults) {
    return (
      <AssessmentPage>
        <AssessmentTopBar backHref={assessmentDetailHref} backLabel="Marriage Assessment" meta="Results" title="Marriage Assessment" />
        <AssessmentHeader eyebrow="Assessment" title="Marriage results" />
        <AssessmentScoreSummary
          maxScore={maxScore}
          percentage={totalPercentage}
          rangeLabel={range.label}
          score={totalScore}
          subtitle={range.detail}
        />
        <div className="px-5 pt-[22px] sm:px-6">
          <p className="text-[13.5px] font-semibold text-[#334E68]">
            {saveContext
              ? {
                error: `Results shown here. ${saveState.error ?? "Unable to save to profile."}`,
                idle: "Ready to save to profile.",
                saved: "Saved to profile.",
                saving: "Saving to profile...",
              }[saveState.status]
              : "Standalone result. Not saved to a profile."}
          </p>
        </div>
        <AssessmentParticipantScores scores={participantScores} />
        <AssessmentCategoryTable
          categories={categoryScores}
          firstLabel={participants[0] ?? "Husband"}
          secondLabel={participants[1] ?? "Wife"}
        />
        <AssessmentDock
          onPrimary={() => {
            setAnswers({});
            setActiveGroupIndex(0);
            setSaveState({ resultId: null, status: "idle" });
            setShowResults(false);
            scrollToTop();
          }}
          onSecondary={() => {
            setShowResults(false);
            setActiveGroupIndex(0);
            scrollToTop();
          }}
          primaryLabel="Start again"
          secondaryLabel="Edit answers"
        />
        {saveContext ? (
          <div className="px-5 pt-5 sm:px-6">
            <a className="text-[13.5px] font-semibold text-[#1D4ED8]" href={saveContext.profileHref}>Back to profile</a>
          </div>
        ) : null}
      </AssessmentPage>
    );
  }

  return (
    <AssessmentPage>
      <AssessmentTopBar backHref={assessmentDetailHref} backLabel="Marriage Assessment" title="Marriage Assessment" />
      <AssessmentHeader description={description} eyebrow="Assessment" title="Marriage Assessment" />
      {activeGroup ? (
        <>
          <AssessmentStepBand
            answeredCount={answeredCount}
            requiredCount={requiredCount}
            stepIndex={activeGroupIndex + 1}
            stepName={activeGroup.name}
            stepTotal={groups.length}
          />
          {activeGroup.questions.map((question) => (
            <AssessmentQuestion
              index={questions.indexOf(question) + 1}
              key={question.id}
              note={question.note}
              prompt={question.prompt}
            >
              {participants.map((participant) => (
                <AssessmentScoreRow
                  key={`${question.id}-${participant}`}
                  onChange={(score) => updateAnswer(question.id, participant, score)}
                  participant={participant}
                  question={question}
                  value={getAssessmentAnswer(answers, question.id, participant)}
                />
              ))}
            </AssessmentQuestion>
          ))}
          <AssessmentDock
            onPrimary={goNext}
            onSecondary={activeGroupIndex === 0 ? undefined : () => {
              setActiveGroupIndex((currentIndex) => Math.max(currentIndex - 1, 0));
              scrollToTop();
            }}
            primaryDisabled={!canContinue}
            primaryLabel={isLastGroup ? "View results" : "Next"}
            secondaryLabel={activeGroupIndex === 0 ? undefined : "Previous"}
          />
        </>
      ) : null}
    </AssessmentPage>
  );
}
