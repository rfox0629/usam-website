/* USA-282: one place that turns a completed assessment into everything the
 * report shows, on screen and on paper.
 *
 * Two things made this necessary.
 *
 * The arithmetic. A category percentage used to come from the ROUNDED average
 * of the two spouses, so it was rounded twice against one spouse's maximum
 * instead of once against the pair's. Every figure here is derived from the
 * saved answers, with the correct denominator, and rounded only for display.
 * Rebuilding from the answers also means a result stored before this release
 * displays correctly without anyone rewriting the stored row.
 *
 * The discussion priorities. They used to be three lines of superlatives. The
 * rules below are deterministic, documented, and normalized to percentages so
 * a twenty-point category and a thirty-point category can be compared at all.
 *
 * On thresholds: the numbers in DISCUSSION_RULES are display rules for
 * choosing what to talk about first. They are not clinical cutoffs and this
 * report is not a diagnosis of anything.
 */

import {
  buildAssessmentGroups,
  exactPairPercentage,
  getAssessmentAnswer,
  pairPercentage,
  scoreAssessmentCategory,
  scoreAssessmentParticipant,
  assessmentOverallScore,
  type AssessmentAnswerMap,
  type AssessmentCategoryScore,
  type AssessmentParticipantKey,
} from "@/src/lib/dos/assessment-scoring";
import { dosDisplayTimeZone } from "@/src/lib/dos/display-dates";
import type { DosAssessmentQuestion } from "@/src/lib/dos/resource-catalog";

export type AssessmentReportParticipant = {
  name: string;
  role: string;
};

export type AssessmentReportQuestion = {
  group?: string | null;
  id: string;
  note?: string | null;
  /* 1-based position in the assessment, so the PDF can say "Question 7" and
     the screen can anchor to the same row. */
  number: number;
  prompt: string;
  scores: Record<string, number | null | undefined>;
};

/* Who asked for the assessment, and the organization they actually belong to.
 *
 * `organization` is set only from a VERIFIED affiliation: a workspace whose
 * collective has an owning organization. The USAM display fallback that the
 * connections list uses is deliberately not accepted here, because a report
 * that says "USA Missionaries" under someone who is not with USA Missionaries
 * is worse than a report that says nothing. */
export type AssessmentReportSender = {
  name: string;
  organization: string | null;
};

export const assessmentDiscussionKinds = [
  "lowest_category",
  "hidden_low_answer",
  "difference",
  "strength",
] as const;

export type AssessmentDiscussionKind = typeof assessmentDiscussionKinds[number];

export type AssessmentDiscussionItem = {
  category: string;
  /* What to talk about, in one sentence. Never advice, never a verdict. */
  discussionPrompt: string;
  kind: AssessmentDiscussionKind;
  /* "Question 7", or null for a whole-category item. The PDF prints this; the
     screen turns it into a link to that row. */
  questionId: string | null;
  questionNumber: number | null;
  /* The figures this was chosen from, written out so nobody has to take the
     selection on trust. */
  scoreLine: string;
  title: string;
};

/* Every threshold in one place, so the rules can be read without reading the
   code that applies them. Percentages are of the possible score. */
export const DISCUSSION_RULES = {
  /* A category at or under this is called out as a low score in its own
     right, not merely the lowest present. */
  absoluteLowPercentage: 60,
  /* A single answer at or under this is worth naming even when its category
     reads well, which is the case an average hides. */
  hiddenLowAnswer: 4,
  /* Its category must be at least this healthy for the answer to count as
     hidden rather than simply part of a low category. */
  hiddenLowAnswerCategoryFloor: 70,
  /* Points apart, out of 10, before two answers are treated as a real
     difference rather than ordinary variation. */
  meaningfulDifference: 3,
  maxDifferences: 3,
  maxHiddenLowAnswers: 3,
  maxLowestCategories: 2,
  maxStrengths: 2,
  /* A category is only named as the lowest when it is below this figure AND
     below the highest category in the same assessment. Without both tests a
     couple who answered near the top everywhere would be told their strongest
     areas are their weakest, which is true only arithmetically. */
  lowestCategoryCeiling: 90,
  /* Both spouses must be at or above this in a category for it to be named a
     shared strength. Both, not the average: one high score carrying a middling
     one is not a strength they share. */
  sharedStrengthPercentage: 90,
} as const;

export type AssessmentReportData = {
  categories: readonly AssessmentCategoryScore[];
  completedAt: string | null;
  discussion: readonly AssessmentDiscussionItem[];
  maxScore: number;
  overallScore: number;
  participantScores: ReadonlyArray<{ participant: string; score: number }>;
  participants: readonly AssessmentReportParticipant[];
  percentage: number;
  questions: readonly AssessmentReportQuestion[];
  requestedBy: AssessmentReportSender | null;
  title: string;
};

function scorePair(question: AssessmentReportQuestion, participants: readonly AssessmentReportParticipant[]) {
  return participants.map((participant) => ({
    name: participant.name,
    role: participant.role,
    score: question.scores[participant.role] ?? null,
  }));
}

/* Category figures in the order the two of them are listed everywhere else.
   A wife-first assessment must not flip back to husband-first halfway down the
   page, so nothing here assumes which role comes first. */
function categoryScoreLine(
  category: AssessmentCategoryScore,
  participants: readonly AssessmentReportParticipant[],
) {
  return participants
    .map((participant) => {
      const score = participant.role === "Wife" ? category.wifeScore : category.husbandScore;

      return `${participant.name} ${score} of ${category.maxScore}`;
    })
    .join(", ");
}

function answerLine(question: AssessmentReportQuestion, participants: readonly AssessmentReportParticipant[]) {
  return scorePair(question, participants)
    .map((entry) => `${entry.name} ${entry.score ?? 0} of 10`)
    .join(", ");
}

/* One date, formatted one way, for the screen, the PDF and the couple's own
   copy. It reads the instant in the DOS display time zone, which is the zone
   every other DOS screen reads dates in, so the "Completed Sep 18" on the
   person record and the "Completed September 18, 2026" on the report are the
   same day. Fixing the zone also keeps the server and the browser in
   agreement: formatting in the reader's own zone made the two disagree and
   broke hydration. */
export function formatAssessmentReportDate(value: string | null) {
  if (!value) {
    return "Date not recorded";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Date not recorded";
  }

  return parsed.toLocaleDateString("en-US", {
    day: "numeric", month: "long", timeZone: dosDisplayTimeZone, year: "numeric",
  });
}

/* The ordering below is the whole of the selection. Nothing is sampled,
   nothing is random, and a given set of answers always produces the same
   list in the same order. */
export function buildAssessmentDiscussionItems({
  categories,
  participants,
  questions,
}: {
  categories: readonly AssessmentCategoryScore[];
  participants: readonly AssessmentReportParticipant[];
  questions: readonly AssessmentReportQuestion[];
}): AssessmentDiscussionItem[] {
  const items: AssessmentDiscussionItem[] = [];
  const categoryByName = new Map(categories.map((category) => [category.name, category]));
  const categoryOrder = new Map(categories.map((category, index) => [category.name, index]));

  /* 1. The lowest categories in THIS assessment. Relative by construction, so
        the wording says so; a category that is also low in its own right
        picks up the extra sentence rather than a second entry. */
  const ranked = [...categories].sort((first, second) => (
    first.exactPercentage - second.exactPercentage
    || (categoryOrder.get(first.name) ?? 0) - (categoryOrder.get(second.name) ?? 0)
  ));

  /* There is only a lowest worth naming when the categories actually differ
     and the low one is not itself high. Otherwise this section would open by
     calling a 100% category the place with the most room. */
  const highestExact = categories.reduce((highest, category) => Math.max(highest, category.exactPercentage), 0);
  const lowest = ranked.filter((category) => (
    category.exactPercentage < highestExact
    && category.percentage < DISCUSSION_RULES.lowestCategoryCeiling
  ));

  for (const category of lowest.slice(0, DISCUSSION_RULES.maxLowestCategories)) {
    const isAbsoluteLow = category.percentage <= DISCUSSION_RULES.absoluteLowPercentage;

    items.push({
      category: category.name,
      discussionPrompt: isAbsoluteLow
        ? `This is the lowest area in this assessment and it is at or below ${DISCUSSION_RULES.absoluteLowPercentage}% of the possible score. Start here, and take it slowly.`
        : "This is the lowest area in this assessment. That does not make it a problem, only the place with the most room.",
      kind: "lowest_category",
      questionId: null,
      questionNumber: null,
      scoreLine: `${category.combinedScore} of ${category.combinedMaxScore} together, ${category.percentage}%. ${categoryScoreLine(category, participants)}.`,
      title: category.name,
    });
  }

  /* 2. A low answer inside a category that otherwise reads well. This is the
        one an average hides, which is the reason for naming it separately. */
  const hiddenLows = questions
    .flatMap((question) => {
      const category = categoryByName.get(question.group ?? "");

      if (!category || category.percentage < DISCUSSION_RULES.hiddenLowAnswerCategoryFloor) {
        return [];
      }

      return scorePair(question, participants)
        .filter((entry) => typeof entry.score === "number" && entry.score <= DISCUSSION_RULES.hiddenLowAnswer)
        .map((entry) => ({ category, entry, question }));
    })
    .sort((first, second) => (
      (first.entry.score ?? 0) - (second.entry.score ?? 0)
      || first.question.number - second.question.number
    ))
    .slice(0, DISCUSSION_RULES.maxHiddenLowAnswers);

  /* A question is named once. When the same answer is both a hidden low and a
     wide gap, the gap is added to this card rather than printed again below,
     because two cards about one question read as two problems. */
  const namedQuestions = new Set<string>();

  for (const { category, entry, question } of hiddenLows) {
    namedQuestions.add(question.id);

    const scores = scorePair(question, participants).map((pair) => pair.score ?? 0);
    const gap = scores.length >= 2 ? Math.abs(scores[0] - scores[1]) : 0;
    const gapSentence = gap >= DISCUSSION_RULES.meaningfulDifference
      ? ` The two of you are ${gap} points apart on it as well.`
      : "";

    items.push({
      category: category.name,
      discussionPrompt: `${category.name} reads well overall at ${category.percentage}%, so this answer does not show up in the category figure. Ask about this one on its own.${gapSentence}`,
      kind: "hidden_low_answer",
      questionId: question.id,
      questionNumber: question.number,
      scoreLine: `${entry.name} answered ${entry.score} of 10. ${answerLine(question, participants)}.`,
      title: question.prompt,
    });
  }

  /* 3. Where the two of them saw it differently. Ordered by how far apart
        they were, because that is the measure being used. */
  const differences = questions
    .map((question) => {
      const scores = scorePair(question, participants).map((entry) => entry.score ?? 0);
      const gap = scores.length >= 2 ? Math.abs(scores[0] - scores[1]) : 0;

      return { gap, question };
    })
    .filter((entry) => entry.gap >= DISCUSSION_RULES.meaningfulDifference && !namedQuestions.has(entry.question.id))
    .sort((first, second) => second.gap - first.gap || first.question.number - second.question.number)
    .slice(0, DISCUSSION_RULES.maxDifferences);

  for (const { gap, question } of differences) {
    items.push({
      category: question.group ?? "",
      discussionPrompt: `You are ${gap} points apart here. Neither answer is the correct one; the gap is the thing worth understanding.`,
      kind: "difference",
      questionId: question.id,
      questionNumber: question.number,
      scoreLine: `${answerLine(question, participants)}.`,
      title: question.prompt,
    });
  }

  /* 4. What they already share. Both spouses high, not one carrying the
        other, so it is genuinely shared ground to build on. */
  const strengths = categories
    .filter((category) => {
      const husband = exactPairPercentage(category.husbandScore, category.maxScore, 1);
      const wife = exactPairPercentage(category.wifeScore, category.maxScore, 1);

      return husband >= DISCUSSION_RULES.sharedStrengthPercentage && wife >= DISCUSSION_RULES.sharedStrengthPercentage;
    })
    .sort((first, second) => (
      second.exactPercentage - first.exactPercentage
      || (categoryOrder.get(first.name) ?? 0) - (categoryOrder.get(second.name) ?? 0)
    ))
    .slice(0, DISCUSSION_RULES.maxStrengths);

  /* USA-281: two strengths used to carry the same sentence word for word, so
     the second card read as a copy of the first and the reader learned nothing
     from it. The reason is stated once; a second strength says what is
     different about it, which is that there is more than one.

     The SELECTION is untouched: the same categories qualify, by the same
     shared-strength rule, in the same order. Only the wording of the second
     card changes, and it is chosen by position, so it is deterministic. */
  strengths.forEach((category, index) => {
    items.push({
      category: category.name,
      discussionPrompt: index === 0
        ? "You both scored this highly. Name what is working here out loud, because it is what the harder areas get built on."
        : "You both scored this highly too. Two strong areas is something to say out loud together.",
      kind: "strength",
      questionId: null,
      questionNumber: null,
      scoreLine: `${categoryScoreLine(category, participants)}. Together ${category.percentage}%.`,
      title: category.name,
    });
  });

  return items;
}

/* The one builder. Everything that renders a completed assessment goes
   through here, so the screen, the authenticated view and the PDF cannot
   disagree about a number. */
export function buildAssessmentReportData({
  answers,
  completedAt,
  maxScore,
  participants,
  questions,
  requestedBy,
  title,
}: {
  answers: AssessmentAnswerMap;
  completedAt: string | null;
  maxScore: number;
  participants: readonly AssessmentReportParticipant[];
  questions: readonly DosAssessmentQuestion[];
  requestedBy: AssessmentReportSender | null;
  title: string;
}): AssessmentReportData {
  const roles: readonly AssessmentParticipantKey[] = participants.map((participant) => participant.role);
  const groups = buildAssessmentGroups(questions);
  const categories = groups.map((group) => scoreAssessmentCategory(answers, group, roles));
  const participantScores = roles.map((role) => scoreAssessmentParticipant(answers, questions, role, maxScore));
  const reportQuestions: AssessmentReportQuestion[] = questions.map((question, index) => ({
    group: question.group ?? null,
    id: question.id,
    note: question.note ?? null,
    number: index + 1,
    prompt: question.prompt,
    scores: Object.fromEntries(roles.map((role) => [role, getAssessmentAnswer(answers, question.id, role)])),
  }));

  return {
    categories,
    completedAt,
    discussion: buildAssessmentDiscussionItems({ categories, participants, questions: reportQuestions }),
    maxScore,
    overallScore: assessmentOverallScore(participantScores),
    participantScores: participantScores.map((entry) => ({ participant: entry.label, score: entry.score })),
    participants,
    percentage: pairPercentage(
      participantScores.reduce((total, entry) => total + entry.score, 0),
      maxScore,
      participantScores.length,
    ),
    questions: reportQuestions,
    requestedBy,
    title,
  };
}

/* A stored dos_assessment_results row keeps the answers it was built from, so
   a report is rebuilt from those rather than from the figures written beside
   them. That is what lets a row stored before the arithmetic fix display the
   corrected percentages with no migration and no rewrite. */
export function answersFromStoredResult(
  stored: unknown,
  questions: readonly DosAssessmentQuestion[],
  roles: readonly AssessmentParticipantKey[],
): AssessmentAnswerMap {
  const payload = stored as { questions?: Array<{ id?: unknown; scores?: Record<string, unknown> }> } | null | undefined;

  if (!payload || !Array.isArray(payload.questions)) {
    return {};
  }

  const questionIds = new Set(questions.map((question) => question.id));
  const roleKeys = new Set(roles);
  const answers: AssessmentAnswerMap = {};

  for (const entry of payload.questions) {
    const id = typeof entry?.id === "string" ? entry.id : null;

    if (!id || !questionIds.has(id) || !entry.scores) {
      continue;
    }

    for (const [role, score] of Object.entries(entry.scores)) {
      if (!roleKeys.has(role) || typeof score !== "number" || !Number.isInteger(score) || score < 0 || score > 10) {
        continue;
      }

      answers[id] = { ...answers[id], [role]: score };
    }
  }

  return answers;
}

/* USA-281: what may be printed as the sender's affiliation on a report.
 *
 * A personal workspace owns an `organizations` row named after itself, so a
 * Marriage Assessment read "Requested by Ryan Fox, Ryan Fox DOS". That is a
 * workspace display name, not a membership, and a report that prints it states
 * an affiliation nobody verified.
 *
 * Two tests, both of which must pass before a name is printed:
 *
 *   1. the organization is really this workspace's owner, not the USAM display
 *      fallback every unowned workspace resolves to (USA-238);
 *   2. its name is independent of the workspace's own name. "Ryan Fox DOS"
 *      under "Ryan Fox" is the workspace wearing a second hat.
 *
 * When neither holds the line is omitted. It is never filled with USAM, or
 * with the workspace name, for a user whose affiliation is not recorded. */
export function verifiedSenderAffiliation(
  organization: { inferred: boolean; name: string } | null,
  workspaceDisplayName: string,
) {
  if (!organization || organization.inferred || !organization.name.trim()) {
    return null;
  }

  /* Compared with the workspace's own suffix removed, because the personal
     organization is the workspace name plus "DOS". */
  const normalize = (value: string) => value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s+dos$/, "");

  const organizationName = normalize(organization.name);
  const workspaceName = normalize(workspaceDisplayName);

  if (!workspaceName) {
    return organization.name;
  }

  return organizationName === workspaceName ? null : organization.name;
}
