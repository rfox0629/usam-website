import { getDosGuideResourceByTitle, type DosGuideResource } from "@/src/lib/dos/guide-resources";

export const dosConversationFlows = ["none", "kitchen_table_gospel"] as const;

export type DosConversationFlowKey = typeof dosConversationFlows[number];
export type DosKitchenTableAnswer = "no" | "unsure" | "yes";
export type DosKitchenTableQuestionKind = "rating" | "yes_no" | "yes_no_unsure";
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
  { id: "relationshipWithJesus", kind: "rating", label: "Rate your relationship with Jesus" },
] as const satisfies ReadonlyArray<{
  id: DosKitchenTableQuestionId;
  kind: DosKitchenTableQuestionKind;
  label: string;
}>;

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

function normalizeAnswer(value: unknown): DosKitchenTableAnswer | undefined {
  return value === "yes" || value === "no" || value === "unsure" ? value : undefined;
}

function normalizeRating(value: unknown) {
  const rating = typeof value === "number" ? value : Number(value);

  return Number.isInteger(rating) && rating >= 1 && rating <= 10 ? rating : undefined;
}

function queuedResource(title: string, reason: string): DosRecommendedResource {
  const resource: DosGuideResource | null = getDosGuideResourceByTitle(title);

  return {
    href: resource?.href,
    id: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    reason,
    status: "queued",
    title,
    type: "resource",
  };
}

export function normalizeConversationFlowKey(value: unknown, allowKitchenTableGospel = true): DosConversationFlowKey {
  if (value === "kitchen_table_gospel" && allowKitchenTableGospel) {
    return "kitchen_table_gospel";
  }

  return "none";
}

export function normalizeKitchenTableResponses(value: unknown): DosKitchenTableResponses {
  if (!value || typeof value !== "object") {
    return {};
  }

  const source = value as Record<string, unknown>;
  const responses: DosKitchenTableResponses = {};

  dosKitchenTableQuestions.forEach((question) => {
    if (question.kind === "rating") {
      const rating = normalizeRating(source[question.id]);

      if (rating) {
        responses.relationshipWithJesus = rating;
      }

      return;
    }

    const answer = normalizeAnswer(source[question.id]);

    if (answer) {
      responses[question.id] = answer;
    }
  });

  return responses;
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

  const temperature = relationshipWithJesusTemperature(responses.relationshipWithJesus);

  if (temperature) {
    recommendations.push({
      id: `relationship-with-jesus-${temperature.toLowerCase()}`,
      reason: "Relationship with Jesus rating",
      status: "queued",
      title: `${temperature}: Relationship with Jesus`,
      type: "flag",
    });
  }

  return recommendations;
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
      : title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

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

  return normalized;
}

export function buildMeetingRecommendations(flowKey: DosConversationFlowKey, responses: DosKitchenTableResponses) {
  return flowKey === "kitchen_table_gospel" ? buildKitchenTableRecommendations(responses) : [];
}

export function isUsamKitchenTableGospelWorkspace(workspace: { publicProfileHref?: string | null; slug?: string | null }) {
  // TODO: Replace this Missionary Workspace route heuristic with an explicit
  // organization/workspace feature flag when DOS supports non-USAM tenants.
  return Boolean(workspace.publicProfileHref?.startsWith("/missionaries/"));
}
