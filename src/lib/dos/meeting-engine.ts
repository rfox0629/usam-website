import { getDosGuideResourceByTitle, type DosGuideResource } from "@/src/lib/dos/guide-resources";

export const dosConversationFlows = ["none", "kitchen_table_gospel", "four_questions"] as const;

export type DosConversationFlowKey = typeof dosConversationFlows[number];
export type DosImplementedConversationFlowKey = Exclude<DosConversationFlowKey, "none">;
export type DosConversationAnswer = "no" | "unsure" | "yes";
export type DosConversationQuestionKind = "multi_select" | "notes" | "rating" | "text" | "yes_no" | "yes_no_unsure";
export type DosConversationResponseValue = number | string | string[];
export type DosConversationResponses = Partial<Record<string, DosConversationResponseValue>>;
export type DosKitchenTableAnswer = DosConversationAnswer;
export type DosKitchenTableQuestionKind = Extract<DosConversationQuestionKind, "rating" | "yes_no" | "yes_no_unsure">;
export type DosKitchenTableQuestionId =
  | "attendChurchOften"
  | "baptized"
  | "believeJesus"
  | "bibleDaily"
  | "disciplingAnyone"
  | "honorSabbath"
  | "prayFastOften"
  | "preachGoodNews"
  | "relationshipWithJesus"
  | "spiritualGifts"
  | "tithe";

export type DosKitchenTableResponses = Partial<Record<Exclude<DosKitchenTableQuestionId, "relationshipWithJesus">, DosKitchenTableAnswer>> & {
  relationshipWithJesus?: number;
};

type DosKitchenTableNonRatingQuestionId = Exclude<DosKitchenTableQuestionId, "relationshipWithJesus">;

export type DosConversationQuestion = {
  /* Shown in meeting detail instead of `label` (e.g. for an "Add …" form title). */
  detailLabel?: string;
  /* Collapsed-row status when nothing is selected; defaults to "None selected". */
  emptyLabel?: string;
  helper?: string;
  /* Kept for saved records: still normalized and rendered in detail, never
     offered in the form or the Library. */
  historicalOnly?: boolean;
  id: string;
  kind: DosConversationQuestionKind;
  label: string;
  options?: readonly {
    label: string;
    value: string;
  }[];
  placeholder?: string;
  prompt?: string;
  scale?: {
    highLabel?: string;
    lowLabel?: string;
    max: number;
    min: number;
  };
  scriptureRefs?: readonly string[];
  visibleWhen?: {
    equals: DosConversationResponseValue;
    questionId: string;
  };
};

export type DosConversationSection = {
  description?: string;
  historicalOnly?: boolean;
  id: string;
  questions: readonly DosConversationQuestion[];
  title: string;
};

export type DosConversationFollowUpAction = {
  id: string;
  label: string;
};

export type DosConversationFlowDefinition = {
  category: "Conversation Flow";
  closingPrompt?: string;
  description: string;
  followUpActions?: readonly DosConversationFollowUpAction[];
  gatedTo?: "usam";
  gospelInvitation?: string;
  id: DosImplementedConversationFlowKey;
  /* Discussion-guide presentation. A flow with `offeredForNewCapture` renders
     as one collapsed optional row in Log Meeting titled `rowTitle`, with
     `rowDescription` beneath it and a status line. Flows without it (Four
     Questions) stay historical-only: readable and editable, never offered. */
  offeredForNewCapture?: boolean;
  rowDescription?: string;
  rowTitle?: string;
  sections: readonly DosConversationSection[];
  slug: string;
  title: string;
};

export type DosRecommendedResource = {
  href?: string;
  id: string;
  reason?: string;
  status: "queued";
  title: string;
  type: "flag" | "resource";
};

/* Conversational order of a Kitchen Table conversation (PCO reference,
   founder review 2026-09-07). The gift groups are inserted directly after
   "Do you have any spiritual gifts?" when the flow is assembled below. */
export const dosKitchenTableQuestions = [
  { id: "believeJesus", kind: "yes_no", label: "Do you believe in Jesus?" },
  { id: "baptized", kind: "yes_no", label: "Have you been baptized?" },
  { id: "disciplingAnyone", kind: "yes_no", label: "Are you discipling anyone?" },
  { id: "tithe", kind: "yes_no", label: "Do you tithe?" },
  { id: "honorSabbath", kind: "yes_no", label: "Do you honor the Sabbath?" },
  { id: "prayFastOften", kind: "yes_no_unsure", label: "Do you pray daily and fast often?" },
  { id: "preachGoodNews", kind: "yes_no", label: "Do you preach the Good News?" },
  { id: "attendChurchOften", kind: "yes_no", label: "Do you attend church often?" },
  { id: "spiritualGifts", kind: "yes_no_unsure", label: "Do you have any spiritual gifts?" },
  { id: "bibleDaily", kind: "yes_no", label: "Do you read your Bible daily?" },
  {
    id: "relationshipWithJesus",
    kind: "rating",
    label: "Rate your relationship with Jesus",
    scale: { highLabel: "Hot", lowLabel: "Cold", max: 10, min: 1 },
  },
] as const satisfies ReadonlyArray<DosConversationQuestion & {
  id: DosKitchenTableQuestionId;
  kind: DosKitchenTableQuestionKind;
}>;

export const dosKitchenTableCoreQuestionCount = dosKitchenTableQuestions.length;

/* Spiritual-gift taxonomy (founder review, USA-238, 2026-09-07). Labels follow
   the approved reference; values are stable snake_case storage keys and are
   never renamed — "Distinguishing/Discernment of Spirits" keeps the original
   `discerning_of_spirits` key so any saved selection still reads. Production
   held no saved gift values when the labels were settled, so no mapping was
   needed beyond keeping the keys. */
const manifestationGiftOptions = [
  { label: "Word of Wisdom", value: "word_of_wisdom" },
  { label: "Word of Knowledge", value: "word_of_knowledge" },
  { label: "Faith", value: "faith" },
  { label: "Gifts of Healing", value: "gifts_of_healing" },
  { label: "Working of Miracles", value: "working_of_miracles" },
  { label: "Prophecy", value: "prophecy" },
  { label: "Distinguishing/Discernment of Spirits", value: "discerning_of_spirits" },
  { label: "Various Kinds of Tongues", value: "various_kinds_of_tongues" },
  { label: "Interpretation of Tongues", value: "interpretation_of_tongues" },
  { label: "Exploring / Unsure", value: "exploring_unsure" },
] as const;

const serviceGiftOptions = [
  { label: "Prophecy", value: "prophecy" },
  { label: "Serving (Ministry/Helps)", value: "serving" },
  { label: "Teaching", value: "teaching" },
  { label: "Encouragement (Exhortation)", value: "encouragement" },
  { label: "Giving", value: "giving" },
  { label: "Leadership", value: "leadership" },
  { label: "Mercy", value: "mercy" },
] as const;

const fivefoldGiftOptions = [
  { label: "Apostle", value: "apostle" },
  { label: "Prophet", value: "prophet" },
  { label: "Evangelist", value: "evangelist" },
  { label: "Pastor (Shepherd)", value: "pastor" },
  { label: "Teacher", value: "teacher" },
] as const;

const connectionOutcomeOptions = [
  { label: "Connected to Church Partner", value: "connected_to_church_partner" },
  { label: "Connected to Ministry Partner", value: "connected_to_ministry_partner" },
] as const;

const faithCommitmentOutcomeOptions = [
  { label: "First Time Decision for Christ", value: "first_time_decision_for_christ" },
  { label: "Rededication", value: "rededication" },
  { label: "Baptism in Holy Spirit", value: "baptism_in_holy_spirit" },
  { label: "Committed to Fasting", value: "committed_to_fasting" },
  { label: "Committed to Tithe", value: "committed_to_tithe" },
  { label: "Desire to be Baptized", value: "desire_to_be_baptized" },
  { label: "Desire to Join Discipleship Group", value: "desire_to_join_discipleship_group" },
] as const;

const healingOutcomeOptions = [
  { label: "Deliverance", value: "deliverance" },
  { label: "Inner Healing", value: "inner_healing" },
  { label: "Addiction Freedom", value: "addiction_freedom" },
  { label: "Emotional Healing", value: "emotional_healing" },
  { label: "Physical Healing", value: "physical_healing" },
  { label: "Restoration", value: "restoration" },
  { label: "Financial Breakthrough", value: "financial_breakthrough" },
  { label: "Forgiveness Breakthrough", value: "forgiveness_breakthrough" },
  { label: "Identity in Christ Breakthrough", value: "identity_in_christ_breakthrough" },
] as const;

const relationshipOutcomeOptions = [
  { label: "Marriage Reconciliation", value: "marriage_reconciliation" },
  { label: "Relationship Restored", value: "relationship_restored" },
  { label: "Relationship Connection", value: "relationship_connection" },
] as const;

const ministryMomentOutcomeOptions = [
  { label: "Prayer Ministry Took Place", value: "prayer_ministry_took_place" },
  { label: "Communion", value: "communion" },
  { label: "Washing of Feet", value: "washing_of_feet" },
  { label: "Deliverance Prayer", value: "deliverance_prayer" },
  { label: "Prophetic Prayer", value: "prophetic_prayer" },
  { label: "Healing Prayer", value: "healing_prayer" },
] as const;

/* Significant outcomes (founder review 2026-09-07): one flat optional list of
   concrete results or next steps from this conversation. The five earlier
   outcome groups above are historical-only — saved values keep normalizing
   and rendering, the form no longer offers them, and granular activities
   (communion, foot washing, prayer types) belong in Meeting Notes. Outcomes
   are meeting responses only; they never touch the leader's separate
   assessment records. */
const significantOutcomeOptions = [
  { label: "Decision for Christ", value: "decision_for_christ" },
  { label: "Rededication", value: "rededication" },
  { label: "Baptism next step", value: "baptism_next_step" },
  { label: "Baptism in the Holy Spirit", value: "baptism_in_holy_spirit" },
  { label: "Connected to a church or ministry", value: "connected_to_church_or_ministry" },
  { label: "Discipleship next step", value: "discipleship_next_step" },
  { label: "Healing or breakthrough", value: "healing_or_breakthrough" },
  { label: "Relationship restored", value: "relationship_restored" },
  { label: "Other significant outcome", value: "other_significant_outcome" },
] as const;

const kitchenTableSpiritualGiftsIndex = dosKitchenTableQuestions.findIndex((question) => question.id === "spiritualGifts");

const kitchenTableGiftQuestions = [
  {
    id: "manifestationGifts",
    kind: "multi_select",
    label: "Manifestation Gifts",
    options: manifestationGiftOptions,
    scriptureRefs: ["1 Corinthians 12:7-11"],
    visibleWhen: { equals: "yes", questionId: "spiritualGifts" },
  },
  {
    id: "serviceGifts",
    kind: "multi_select",
    label: "Motivational / Service Gifts",
    options: serviceGiftOptions,
    scriptureRefs: ["Romans 12:6-8"],
    visibleWhen: { equals: "yes", questionId: "spiritualGifts" },
  },
  {
    id: "fivefoldGifts",
    kind: "multi_select",
    label: "Fivefold Ministry Gifts",
    options: fivefoldGiftOptions,
    scriptureRefs: ["Ephesians 4:11"],
    visibleWhen: { equals: "yes", questionId: "spiritualGifts" },
  },
] as const satisfies readonly DosConversationQuestion[];

const kitchenTableSignificantOutcomesQuestion = {
  detailLabel: "Significant outcomes",
  emptyLabel: "Optional",
  id: "significantOutcomes",
  kind: "multi_select",
  label: "Add significant outcomes",
  options: significantOutcomeOptions,
} as const satisfies DosConversationQuestion;

export const dosConversationFlowDefinitions = [
  {
    category: "Conversation Flow",
    description: "A guided Gospel conversation for live ministry moments.",
    gatedTo: "usam",
    id: "kitchen_table_gospel",
    offeredForNewCapture: true,
    rowDescription: "Questions, spiritual gifts, and ministry outcomes",
    rowTitle: "Kitchen Table Gospel Responses",
    sections: [
      {
        id: "commands-of-jesus",
        /* Conversational order: the three gift groups sit directly under
           "Do you have any spiritual gifts?" and render only while it is Yes;
           "Add significant outcomes" is one optional collapsed row after the
           relationship rating. */
        questions: [
          ...dosKitchenTableQuestions.slice(0, kitchenTableSpiritualGiftsIndex + 1),
          ...kitchenTableGiftQuestions,
          ...dosKitchenTableQuestions.slice(kitchenTableSpiritualGiftsIndex + 1),
          kitchenTableSignificantOutcomesQuestion,
        ],
        title: "Kitchen Table Questions",
      },
      {
        /* Historical only (pre-review outcome groups). Kept so saved meetings
           keep their values through edits and still render them in detail. */
        historicalOnly: true,
        id: "outcomes",
        questions: [
          { historicalOnly: true, id: "connectionOutcomes", kind: "multi_select", label: "Discipleship & Church Connection", options: connectionOutcomeOptions },
          { historicalOnly: true, id: "faithCommitmentOutcomes", kind: "multi_select", label: "Faith Commitments", options: faithCommitmentOutcomeOptions },
          { historicalOnly: true, id: "healingOutcomes", kind: "multi_select", label: "Healing & Breakthrough", options: healingOutcomeOptions },
          { historicalOnly: true, id: "relationshipOutcomes", kind: "multi_select", label: "Relationship Restoration", options: relationshipOutcomeOptions },
          { historicalOnly: true, id: "ministryMomentOutcomes", kind: "multi_select", label: "Ministry Moments", options: ministryMomentOutcomeOptions },
        ],
        title: "Outcomes",
      },
    ],
    slug: "kitchen-table-gospel",
    title: "Kitchen Table Gospel",
  },
  {
    category: "Conversation Flow",
    closingPrompt: "Which of these four questions is hardest to answer honestly right now?",
    description: "Breakthrough and surrender conversation focused on honesty, help, and obedience.",
    followUpActions: [
      { id: "schedule_another_conversation", label: "Schedule another conversation" },
      { id: "wants_discipleship", label: "Wants discipleship" },
      { id: "wants_accountability", label: "Wants accountability" },
      { id: "wants_prayer", label: "Wants prayer" },
      { id: "wants_church_connection", label: "Wants church connection" },
      { id: "needs_follow_up", label: "Needs follow-up" },
      { id: "wants_gospel_conversation", label: "Wants Gospel conversation" },
    ],
    gospelInvitation: "Stop hiding. Stop striving alone. Receive help. Obey His voice. Follow Jesus.",
    gatedTo: "usam",
    id: "four_questions",
    sections: [
      {
        description: "Truth, help, willingness, and obedience.",
        id: "progression",
        questions: [
          {
            id: "recognizes_problem",
            kind: "yes_no_unsure",
            label: "Do you recognize that there is a real problem or struggle in your life?",
            prompt: "What struggle, wound, sin, or pattern has been minimized or covered?",
            scriptureRefs: ["Psalm 51:3", "Proverbs 28:13", "1 John 1:8"],
          },
          {
            id: "needs_outside_help",
            kind: "yes_no_unsure",
            label: "Do you believe you need help outside of yourself to overcome this?",
            prompt: "Where are you still trusting yourself more than God?",
            scriptureRefs: ["John 15:5", "Romans 7:18", "Proverbs 3:5"],
          },
          {
            id: "willing_to_receive_help",
            kind: "yes_no_unsure",
            label: "Are you willing to seek out and receive that help?",
            prompt: "Who or what has God already placed in your life that you have been resisting?",
            scriptureRefs: ["Matthew 7:7", "Proverbs 12:15", "James 1:21"],
          },
          {
            id: "willing_to_follow_through",
            kind: "yes_no_unsure",
            label: "Are you willing to follow through and do what is asked of you to change?",
            prompt: "What act of obedience has God already shown you?",
            scriptureRefs: ["James 1:22", "Luke 6:46", "Matthew 7:24"],
          },
        ],
        title: "Four Questions",
      },
      {
        id: "notes",
        questions: [
          {
            id: "response_notes",
            kind: "notes",
            label: "Response notes",
            placeholder: "What did they say or notice?",
          },
          {
            id: "conversation_notes",
            kind: "notes",
            label: "Conversation notes",
            placeholder: "Important context, Scripture, or turning points.",
          },
          {
            id: "follow_up_notes",
            kind: "notes",
            label: "Follow-up notes",
            placeholder: "Next conversation, prayer, accountability, or church connection.",
          },
        ],
        title: "Notes",
      },
    ],
    slug: "four-questions",
    title: "Four Questions",
  },
] as const satisfies readonly DosConversationFlowDefinition[];

/* Discussion guides are the conversation flows offered for new meeting
   capture. Log Meeting renders one collapsed optional row per guide and no
   chooser; a second guide is a new definition here, not a schema change, and
   only then would a picker be warranted. */
export const dosDiscussionGuides: readonly DosConversationFlowDefinition[] = (dosConversationFlowDefinitions as readonly DosConversationFlowDefinition[])
  .filter((flow) => flow.offeredForNewCapture === true);

const resourceRecommendationRules: ReadonlyArray<{
  id: DosKitchenTableNonRatingQuestionId;
  matches: ReadonlyArray<DosKitchenTableAnswer>;
  title: string;
}> = [
  { id: "baptized", matches: ["no"], title: "Baptism" },
  { id: "bibleDaily", matches: ["no"], title: "Daily Bible Reading" },
  { id: "spiritualGifts", matches: ["no", "unsure"], title: "Spiritual Gifts" },
  { id: "disciplingAnyone", matches: ["no"], title: "Discipleship" },
  { id: "attendChurchOften", matches: ["no"], title: "Attending Church" },
  { id: "preachGoodNews", matches: ["no"], title: "Evangelism" },
  { id: "tithe", matches: ["no"], title: "Biblical Giving" },
  { id: "honorSabbath", matches: ["no"], title: "Sabbath" },
  { id: "prayFastOften", matches: ["no", "unsure"], title: "Prayer and Fasting" },
];

function normalizeAnswer(value: unknown): DosConversationAnswer | undefined {
  return value === "yes" || value === "no" || value === "unsure" ? value : undefined;
}

function normalizeRating(value: unknown) {
  const rating = typeof value === "number" ? value : Number(value);

  return Number.isInteger(rating) && rating >= 1 && rating <= 10 ? rating : undefined;
}

function normalizeTextResponse(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function resourceId(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function queuedResource(title: string, reason: string): DosRecommendedResource {
  const resource: DosGuideResource | null = getDosGuideResourceByTitle(title);

  return {
    href: resource?.href,
    id: resourceId(title),
    reason,
    status: "queued",
    title,
    type: "resource",
  };
}

function queuedFlag(title: string, reason: string): DosRecommendedResource {
  return {
    id: resourceId(title),
    reason,
    status: "queued",
    title,
    type: "flag",
  };
}

function uniqueRecommendations(recommendations: DosRecommendedResource[]) {
  const seen = new Set<string>();

  return recommendations.filter((recommendation) => {
    if (seen.has(recommendation.id)) {
      return false;
    }

    seen.add(recommendation.id);

    return true;
  });
}

export function getConversationFlowDefinition(flowKey: DosConversationFlowKey): DosConversationFlowDefinition | null {
  return dosConversationFlowDefinitions.find((flow) => flow.id === flowKey) ?? null;
}

export function isConversationFlowAvailable(flowKey: DosConversationFlowKey, allowGatedFlows = true) {
  const flow = getConversationFlowDefinition(flowKey);

  return flowKey === "none" || Boolean(flow && (allowGatedFlows || !flow.gatedTo));
}

/* True when a request names a flow that only USAM workspaces may store, so
   the meetings API knows it must read workspace organization state before
   deciding. "none", nothing, and unknown keys never need that lookup (an
   unknown key is refused by normalization regardless). */
export function conversationFlowRequiresGate(value: unknown): boolean {
  if (typeof value !== "string" || value === "none") {
    return false;
  }

  return Boolean(getConversationFlowDefinition(value as DosConversationFlowKey)?.gatedTo);
}

export function normalizeConversationFlowKey(value: unknown, allowGatedFlows = true): DosConversationFlowKey {
  if (typeof value !== "string" || value === "none") {
    return "none";
  }

  const flow = getConversationFlowDefinition(value as DosConversationFlowKey);

  if (flow && isConversationFlowAvailable(flow.id, allowGatedFlows)) {
    return flow.id;
  }

  return "none";
}

export function normalizeConversationResponses(flowKey: DosConversationFlowKey, value: unknown): DosConversationResponses {
  const flow = getConversationFlowDefinition(flowKey);

  if (!flow || !value || typeof value !== "object") {
    return {};
  }

  const source = value as Record<string, unknown>;
  const responses: DosConversationResponses = {};

  flow.sections.flatMap((section) => section.questions).forEach((question) => {
    if (!conversationQuestionIsVisible(question, source)) {
      return;
    }

    if (question.kind === "rating") {
      const rating = normalizeRating(source[question.id]);

      if (rating) {
        responses[question.id] = rating;
      }

      return;
    }

    if (question.kind === "multi_select") {
      const validValues = new Set(question.options?.map((option) => option.value) ?? []);
      const rawSelection = source[question.id];
      const selectedValues = Array.isArray(rawSelection)
        ? rawSelection.filter((item): item is string => typeof item === "string" && validValues.has(item))
        : [];

      if (selectedValues.length) {
        responses[question.id] = Array.from(new Set(selectedValues));
      }

      return;
    }

    if (question.kind === "yes_no" || question.kind === "yes_no_unsure") {
      const answer = normalizeAnswer(source[question.id]);

      if (answer && (question.kind === "yes_no_unsure" || answer !== "unsure")) {
        responses[question.id] = answer;
      }

      return;
    }

    const text = normalizeTextResponse(source[question.id]);

    if (text) {
      responses[question.id] = text;
    }
  });

  if (flow.followUpActions?.length) {
    const validActionIds = new Set(flow.followUpActions.map((action) => action.id));
    const selectedActions = Array.isArray(source.followUpActions)
      ? source.followUpActions.filter((action): action is string => typeof action === "string" && validActionIds.has(action))
      : [];

    if (selectedActions.length) {
      responses.followUpActions = Array.from(new Set(selectedActions));
    }
  }

  return responses;
}

export function conversationQuestionIsVisible(
  question: DosConversationQuestion,
  responses: Record<string, unknown> | DosConversationResponses,
) {
  return !question.visibleWhen || responses[question.visibleWhen.questionId] === question.visibleWhen.equals;
}

export function normalizeKitchenTableResponses(value: unknown): DosKitchenTableResponses {
  return normalizeConversationResponses("kitchen_table_gospel", value) as DosKitchenTableResponses;
}

export function relationshipWithJesusTemperature(rating: number | undefined) {
  if (!rating) {
    return null;
  }

  if (rating <= 3) {
    return "Cold";
  }

  if (rating <= 7) {
    return "Lukewarm";
  }

  return "Hot";
}

export function buildKitchenTableRecommendations(responses: DosKitchenTableResponses): DosRecommendedResource[] {
  const recommendations: DosRecommendedResource[] = [];

  resourceRecommendationRules.forEach((rule) => {
    const answer = responses[rule.id];

    if (answer && rule.matches.includes(answer)) {
      recommendations.push(queuedResource(rule.title, "Kitchen Table Gospel follow-up"));
    }
  });

  return uniqueRecommendations(recommendations);
}

function conversationAnswer(responses: DosConversationResponses, id: string) {
  return normalizeAnswer(responses[id]);
}

function selectedFollowUpActions(responses: DosConversationResponses) {
  return Array.isArray(responses.followUpActions)
    ? responses.followUpActions.filter((action): action is string => typeof action === "string")
    : [];
}

export function buildFourQuestionsRecommendations(responses: DosConversationResponses): DosRecommendedResource[] {
  const recommendations: DosRecommendedResource[] = [];
  const reason = "Four Questions follow-up";

  if (["no", "unsure"].includes(conversationAnswer(responses, "recognizes_problem") ?? "")) {
    recommendations.push(queuedFlag("Continue honest conversation", reason));
  }

  if (["no", "unsure"].includes(conversationAnswer(responses, "needs_outside_help") ?? "")) {
    recommendations.push(queuedFlag("Gospel conversation follow-up", reason));
  }

  if (["no", "unsure"].includes(conversationAnswer(responses, "willing_to_receive_help") ?? "")) {
    recommendations.push(queuedFlag("Schedule another conversation", reason));
  }

  if (["no", "unsure"].includes(conversationAnswer(responses, "willing_to_follow_through") ?? "")) {
    recommendations.push(queuedFlag("Accountability follow-up", reason));
  }

  selectedFollowUpActions(responses).forEach((action) => {
    if (action === "wants_discipleship") {
      recommendations.push(queuedResource("Discipleship", reason));
    }

    if (action === "wants_prayer") {
      recommendations.push(queuedResource("Prayer and Fasting", reason));
    }

    if (action === "wants_church_connection") {
      recommendations.push(queuedResource("Attending Church", reason));
    }

    if (action === "wants_gospel_conversation") {
      recommendations.push(queuedResource("Evangelism", reason));
    }

    if (action === "schedule_another_conversation" || action === "needs_follow_up") {
      recommendations.push(queuedFlag("Schedule follow-up", reason));
    }

    if (action === "wants_accountability") {
      recommendations.push(queuedFlag("Accountability follow-up", reason));
    }
  });

  return uniqueRecommendations(recommendations);
}

export function normalizeRecommendedResources(value: unknown): DosRecommendedResource[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: DosRecommendedResource[] = [];

  value.forEach((item) => {
    if (!item || typeof item !== "object") {
      return;
    }

    const source = item as Partial<DosRecommendedResource>;
    const title = typeof source.title === "string" ? source.title.trim() : "";
    const id = typeof source.id === "string" && source.id.trim()
      ? source.id.trim()
      : resourceId(title);

    if (!title || !id) {
      return;
    }

    normalized.push({
      href: typeof source.href === "string" ? source.href : undefined,
      id,
      reason: typeof source.reason === "string" ? source.reason : undefined,
      status: "queued",
      title,
      type: source.type === "flag" ? "flag" : "resource",
    });
  });

  return uniqueRecommendations(normalized);
}

export function buildMeetingRecommendations(flowKey: DosConversationFlowKey, responses: DosConversationResponses) {
  if (flowKey === "kitchen_table_gospel") {
    return buildKitchenTableRecommendations(responses as DosKitchenTableResponses);
  }

  if (flowKey === "four_questions") {
    return buildFourQuestionsRecommendations(responses);
  }

  return [];
}

/* The public-profile-route heuristic that lived here was retired in USA-238:
   whether a workspace is USAM is decided in src/lib/dos/usam-workspace.ts
   from application, profile and owning-organization state. */
