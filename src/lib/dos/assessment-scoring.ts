/* USA-278: the Marriage Assessment scoring that the Library preview, the
 * recipient's assigned assessment and the server-side submission all share.
 *
 * Nothing here is new. These are the rules that already shipped in
 * `app/dos/library/marriage-assessment/MarriageAssessmentClient.tsx`, moved
 * to one module so a joint completion through a public link and a preview in
 * the Library produce the same numbers, and so the server can recompute a
 * submitted score instead of trusting the browser's arithmetic.
 */

import type { DosAssessmentQuestion } from "@/src/lib/dos/resource-catalog";

export type AssessmentParticipantKey = string;

export type AssessmentGroup = {
  name: string;
  questions: readonly DosAssessmentQuestion[];
};

export type AssessmentAnswerMap = Record<string, Record<AssessmentParticipantKey, number | undefined>>;

export type AssessmentParticipantScore = {
  label: AssessmentParticipantKey;
  maxScore: number;
  score: number;
};

export type AssessmentCategoryScore = {
  husbandScore: number;
  maxScore: number;
  name: string;
  percentage: number;
  score: number;
  wifeScore: number;
};

export type AssessmentHealthRange = {
  detail: string;
  label: string;
  minScore: number;
  pillClassName: string;
};

export const assessmentScoreValues = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export const assessmentDefaultGroupName = "Marriage Health";

export const assessmentHealthRanges = [
  {
    detail: "Strength is visible. Keep tending what is working.",
    label: "Strong",
    minScore: 135,
    pillClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  {
    detail: "Healthy patterns are present with a few places to revisit.",
    label: "Healthy",
    minScore: 120,
    pillClassName: "border-sky-200 bg-sky-50 text-sky-700",
  },
  {
    detail: "There is growth to name and steady next steps to take.",
    label: "Growing",
    minScore: 90,
    pillClassName: "border-blue-200 bg-blue-50 text-blue-700",
  },
  {
    detail: "Several areas need patient attention and support.",
    label: "Strained",
    minScore: 60,
    pillClassName: "border-amber-200 bg-amber-50 text-amber-700",
  },
  {
    detail: "Move slowly, seek care, and focus on repair.",
    label: "Needs Care",
    minScore: 0,
    pillClassName: "border-rose-200 bg-rose-50 text-rose-700",
  },
] as const satisfies readonly AssessmentHealthRange[];

export function buildAssessmentGroups(questions: readonly DosAssessmentQuestion[]) {
  return questions.reduce<AssessmentGroup[]>((groups, question) => {
    const name = question.group ?? assessmentDefaultGroupName;
    const existingGroup = groups.find((group) => group.name === name);

    if (existingGroup) {
      existingGroup.questions = [...existingGroup.questions, question];
      return groups;
    }

    return [...groups, { name, questions: [question] }];
  }, []);
}

export function getAssessmentAnswer(answers: AssessmentAnswerMap, questionId: string, participant: AssessmentParticipantKey) {
  return answers[questionId]?.[participant];
}

export function countAssessmentAnswers(
  answers: AssessmentAnswerMap,
  questions: readonly DosAssessmentQuestion[],
  participants: readonly AssessmentParticipantKey[],
) {
  return questions.reduce((total, question) => {
    return total + participants.filter((participant) => typeof getAssessmentAnswer(answers, question.id, participant) === "number").length;
  }, 0);
}

export function assessmentHealthRange(score: number) {
  return assessmentHealthRanges.find((range) => score >= range.minScore) ?? assessmentHealthRanges[assessmentHealthRanges.length - 1];
}

export function assessmentPercentage(score: number, maxScore: number) {
  if (maxScore <= 0) {
    return 0;
  }

  return Math.round((score / maxScore) * 100);
}

export function scoreAssessmentParticipant(
  answers: AssessmentAnswerMap,
  questions: readonly DosAssessmentQuestion[],
  participant: AssessmentParticipantKey,
  maxScore: number,
): AssessmentParticipantScore {
  const score = questions.reduce((total, question) => total + (getAssessmentAnswer(answers, question.id, participant) ?? 0), 0);

  return { label: participant, maxScore, score };
}

/* USA-279: `husbandScore` and `wifeScore` are looked up by ROLE, never by
   position in the participants array. The person a leader picks first can be
   either spouse, so a wife-first assignment arrives here as
   ["Wife", "Husband"]; reading index 0 as the husband would file her answers
   under his name. The stored field names are unchanged so results written
   before this release keep their meaning. A resource whose roles are not
   Husband/Wife (Friendship, when it is made sendable) falls back to
   participant order, which is all a generic pair has. */
export function scoreAssessmentCategory(
  answers: AssessmentAnswerMap,
  group: AssessmentGroup,
  participants: readonly AssessmentParticipantKey[],
): AssessmentCategoryScore {
  const maxScore = group.questions.length * 10;
  const groupTotalFor = (participant: AssessmentParticipantKey | undefined) => (
    participant === undefined
      ? 0
      : group.questions.reduce((total, question) => total + (getAssessmentAnswer(answers, question.id, participant) ?? 0), 0)
  );
  const husbandRole = participants.includes("Husband") ? "Husband" : participants[0];
  const wifeRole = participants.includes("Wife") ? "Wife" : participants[1];
  const participantTotal = participants.reduce((total, participant) => total + groupTotalFor(participant), 0);
  const score = Math.round(participantTotal / Math.max(participants.length, 1));

  return {
    husbandScore: groupTotalFor(husbandRole),
    maxScore,
    name: group.name,
    percentage: assessmentPercentage(score, maxScore),
    score,
    wifeScore: groupTotalFor(wifeRole),
  };
}

/* The relationship total: each spouse has their own 0-150 score, and the
   relationship figure is their rounded average. This is the rule the shipped
   Library assessment already used; no new scoring is introduced here. */
export function assessmentOverallScore(participantScores: readonly AssessmentParticipantScore[]) {
  return Math.round(
    participantScores.reduce((total, participant) => total + participant.score, 0) / Math.max(participantScores.length, 1),
  );
}

/* The stored answer payload. Each spouse's score is kept under their own role
   key so a completed assessment never loses who said what. */
export function buildAssessmentAnswerPayload(
  answers: AssessmentAnswerMap,
  questions: readonly DosAssessmentQuestion[],
  participants: readonly AssessmentParticipantKey[],
  participantNames?: Readonly<Record<string, string>>,
) {
  return {
    participantNames: participantNames ?? {},
    participants,
    questions: questions.map((question) => ({
      group: question.group ?? assessmentDefaultGroupName,
      id: question.id,
      note: question.note ?? null,
      participantPrompts: question.participantPrompts ?? {},
      prompt: question.prompt,
      scores: Object.fromEntries(participants.map((participant) => [participant, getAssessmentAnswer(answers, question.id, participant) ?? null])),
    })),
  };
}

/* Accepts a stored / posted responses object and keeps only well-formed
   scores: a known question, a known participant role, an integer 0-10.
   Everything else is dropped rather than coerced. */
export function normalizeAssessmentAnswers(
  value: unknown,
  questions: readonly DosAssessmentQuestion[],
  participants: readonly AssessmentParticipantKey[],
): AssessmentAnswerMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const questionIds = new Set(questions.map((question) => question.id));
  const participantKeys = new Set(participants);
  const source = value as Record<string, unknown>;
  const answers: AssessmentAnswerMap = {};

  Object.entries(source).forEach(([questionId, participantScores]) => {
    if (!questionIds.has(questionId) || !participantScores || typeof participantScores !== "object" || Array.isArray(participantScores)) {
      return;
    }

    Object.entries(participantScores as Record<string, unknown>).forEach(([participant, score]) => {
      if (!participantKeys.has(participant) || typeof score !== "number" || !Number.isInteger(score) || score < 0 || score > 10) {
        return;
      }

      answers[questionId] = { ...answers[questionId], [participant]: score };
    });
  });

  return answers;
}

export function isAssessmentComplete(
  answers: AssessmentAnswerMap,
  questions: readonly DosAssessmentQuestion[],
  participants: readonly AssessmentParticipantKey[],
) {
  return countAssessmentAnswers(answers, questions, participants) === questions.length * participants.length;
}

/* One place that turns a complete answer map into everything a result row
   needs. The server calls this on submit so the stored score is computed from
   the stored answers, not from whatever the browser posted. */
export type AssessmentSummary = ReturnType<typeof summarizeAssessment>;

export function summarizeAssessment({
  answers,
  maxScore,
  participants,
  questions,
}: {
  answers: AssessmentAnswerMap;
  maxScore: number;
  participants: readonly AssessmentParticipantKey[];
  questions: readonly DosAssessmentQuestion[];
}) {
  const groups = buildAssessmentGroups(questions);
  const participantScores = participants.map((participant) => scoreAssessmentParticipant(answers, questions, participant, maxScore));
  const overallScore = assessmentOverallScore(participantScores);

  return {
    categoryScores: groups.map((group) => scoreAssessmentCategory(answers, group, participants)),
    groups,
    overallScore,
    participantScores,
    percentage: assessmentPercentage(overallScore, maxScore),
    range: assessmentHealthRange(overallScore),
  };
}
