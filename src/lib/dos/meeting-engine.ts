import { getDosGuideResourceByTitle, type DosGuideResource } from "@/src/lib/dos/guide-resources";

export const dosConversationFlows = ["none", "kitchen_table_gospel", "four_questions"] as const;

export type DosConversationFlowKey = typeof dosConversationFlows[number];
export type DosImplementedConversationFlowKey = Exclude<DosConversationFlowKey, "none">;
export type DosConversationAnswer = "no" | "unsure" | "yes";
export type DosConversationQuestionKind = "notes" | "rating" | "text" | "yes_no" | "yes_no_unsure";
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
  helper?: string;
  id: string;
  kind: DosConversationQuestionKind;
  label: string;
  placeholder?: string;
  prompt?: string;
  scale?: {
    highLabel?: string;
    lowLabel?: string;
    max: number;
    min: number;
  };
  scriptureRefs?: readonly string[];
};

export type DosConversationSection = {
  description?: string;
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

export const dosKitchenTableQuestions = [
  { id: "believeJesus", kind: "yes_no", label: "Do you believe in Jesus?" },
  { id: "baptized", kind: "yes_no", label: "Have you been baptized?" },
  { id: "bibleDaily", kind: "yes_no", label: "Do you read your Bible daily?" },
  { id: "spiritualGifts", kind: "yes_no_unsure", label: "Do you have any spiritual gifts?" },
  { id: "disciplingAnyone", kind: "yes_no", label: "Are you discipling anyone?" },
  { id: "attendChurchOften", kind: "yes_no", label: "Do you attend church often?" },
  { id: "preachGoodNews", kind: "yes_no", label: "Do you preach the Good News?" },
  { id: "tithe", kind: "yes_no", label: "Do you tithe?" },
  { id: "honorSabbath", kind: "yes_no", label: "Do you honor the Sabbath?" },
  { id: "prayFastOften", kind: "yes_no_unsure", label: "Do you pray daily and fast often?" },
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

export const dosConversationFlowDefinitions = [
  {
    category: "Conversation Flow",
    description: "A guided Gospel conversation for live ministry moments.",
    gatedTo: "usam",
    id: "kitchen_table_gospel",
    sections: [
      {
        id: "commands-of-jesus",
        questions: dosKitchenTableQuestions,
        title: "Guided Questions",
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
    if (question.kind === "rating") {
      const rating = normalizeRating(source[question.id]);

      if (rating) {
        responses[question.id] = rating;
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

export function isUsamKitchenTableGospelWorkspace(workspace: { publicProfileHref?: string | null; slug?: string | null }) {
  // TODO: Replace this Missionary Workspace route heuristic with an explicit
  // organization/workspace feature flag when DOS supports non-USAM tenants.
  return Boolean(workspace.publicProfileHref?.startsWith("/missionaries/"));
}
