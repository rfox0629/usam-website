import "server-only";

import { canonicalCircleForRecalculation, type CanonicalCircleAssignment } from "@/src/lib/dos/circle-placement";
import { relationshipScoreFromEngagementLevel, relationshipScoreLabel } from "@/src/lib/dos/relationship-model";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;
type CircleAssignment = CanonicalCircleAssignment;
type AssignmentSource = "automatic" | "manual";

export type DosCircleConfig = {
  discipleshipProgressWeight: number;
  fruitWeight: number;
  id: string | null;
  isActive: boolean;
  meetingFrequencyWeight: number;
  momentumWeight: number;
  multiplicationWeight: number;
  timeInvestedWeight: number;
  workspaceId: string;
};

export type DosScoreExplanation = {
  negative_factors: string[];
  positive_factors: string[];
  summary: string;
};

export type DosRelationshipScore = {
  assignmentSource: AssignmentSource;
  breakdown: {
    discipleshipProgress: number;
    fruit: number;
    meetingFrequency: number;
    momentum: number;
    multiplication: number;
    timeInvested: number;
  };
  circle: CircleAssignment;
  confidenceScore: number;
  explanation: DosScoreExplanation;
  lastCalculatedAt: string | null;
  person: {
    engagementLevel: string | null;
    id: string;
    lastActivityAt: string | null;
    name: string;
    relationshipType: string | null;
    status: string | null;
  };
  totalScore: number;
};

export type DosCircleData = {
  config: DosCircleConfig;
  field: DosRelationshipScore[];
  fieldSummary: {
    activeThisMonth: number;
    multiplying: number;
    needFollowUp: number;
    newContacts: number;
    total: number;
  };
  metadata: {
    calculatedAt: string | null;
    lockedCount: number;
    peopleScored: number;
  };
  my12: DosRelationshipScore[];
  my120: DosRelationshipScore[];
  my3: DosRelationshipScore[];
  my70: DosRelationshipScore[];
};

export type DosCircleActivityPerson = {
  engagementLevel: string | null;
  id: string;
  lastActivityAt: string | null;
  name: string;
  relationshipType: string | null;
  status: string | null;
};

export type DosCircleActivityMeeting = {
  date: string | null;
  fieldPersonIds: string[];
};

type PersonRow = {
  engagement_level: string | null;
  id: string;
  last_activity_at: string | null;
  name: string;
  relationship_type: string | null;
  status: string | null;
  updated_at: string | null;
};

type MeetingRow = {
  conversation_flow_key?: string | null;
  conversation_responses?: unknown;
  created_at?: string | null;
  field_person_ids: string[] | null;
  id: string;
  table_date: string | null;
  table_type: string | null;
  updated_at: string | null;
};

type ReviewRow = {
  readiness?: string | null;
  table_id?: string | null;
  teaching_used?: string | null;
  updated_at?: string | null;
};

type ConnectionLogRow = {
  connection_date: string | null;
  duration_minutes: number | null;
  field_person_id: string | null;
  follow_up_needed: string | null;
  interaction_type: string | null;
  movement_step: string | null;
  updated_at: string | null;
};

type FruitRow = {
  cc_status: string | null;
  field_person_id: string | null;
  outcome_tags: string[] | null;
  table_id: string | null;
  testimony_date: string | null;
};

type QuickReviewRow = {
  conversation_helpful: string | null;
  created_at: string | null;
  felt_cared_for: string | null;
  felt_heard_response: string | null;
  meeting_id: string | null;
  outcome_tags: string[] | null;
  reviewer_person_id: string | null;
  status: string | null;
  wants_follow_up: string | null;
  would_meet_again_response: string | null;
};

type OverrideRow = {
  locked: boolean;
  manual_circle: CircleAssignment;
  person_id: string;
  reason: string | null;
};

type ScoreRow = {
  assignment_source?: AssignmentSource | null;
  circle_assignment: CircleAssignment;
  person_id: string;
  total_score: number;
};

const defaultConfig = {
  discipleshipProgressWeight: 25,
  fruitWeight: 20,
  meetingFrequencyWeight: 30,
  momentumWeight: 10,
  multiplicationWeight: 20,
  timeInvestedWeight: 15,
};

const inactivePersonStatuses = new Set(["archived", "deleted", "inactive", "paused"]);

function tableMissing(error: { message?: string } | null | undefined, tableName: string) {
  const message = error?.message?.toLowerCase() ?? "";

  return message.includes(tableName)
    && (message.includes("does not exist") || message.includes("schema cache") || message.includes("relation"));
}

function workspaceScopeFilter(workspaceId: string) {
  return `workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`;
}

function dayDiff(value: string | null | undefined) {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  const normalized = value.includes("T") ? value : `${value}T12:00:00`;
  const timestamp = new Date(normalized).getTime();

  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
}

function isWithinDays(value: string | null | undefined, days: number) {
  return dayDiff(value) <= days;
}

function latestDate(...values: Array<string | null | undefined>) {
  return values
    .filter((value): value is string => Boolean(value))
    .sort((first, second) => new Date(second.includes("T") ? second : `${second}T12:00:00`).getTime() - new Date(first.includes("T") ? first : `${first}T12:00:00`).getTime())[0] ?? null;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
}

function engagementComponentScore(value: number) {
  return value > 0 ? clampScore(value * 28) : 0;
}

function circleLabel(circle: CircleAssignment) {
  return {
    field: "Field",
    my_120: "My 120",
    seventy: "My 70",
    three: "My 3",
    twelve: "My 12",
  }[circle];
}

function weightedTotal(scores: DosRelationshipScore["breakdown"], config: DosCircleConfig) {
  const weights = [
    config.meetingFrequencyWeight,
    config.timeInvestedWeight,
    config.discipleshipProgressWeight,
    config.fruitWeight,
    config.momentumWeight,
    config.multiplicationWeight,
  ];
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const weighted = (
    scores.meetingFrequency * config.meetingFrequencyWeight
    + scores.timeInvested * config.timeInvestedWeight
    + scores.discipleshipProgress * config.discipleshipProgressWeight
    + scores.fruit * config.fruitWeight
    + scores.momentum * config.momentumWeight
    + scores.multiplication * config.multiplicationWeight
  ) / totalWeight;

  return clampScore(weighted);
}

function isCircleAssignment(value: unknown): value is CircleAssignment {
  return value === "field" || value === "my_120" || value === "seventy" || value === "three" || value === "twelve";
}

function normalizedCircle(value: unknown): CircleAssignment {
  return isCircleAssignment(value) ? value : "field";
}

function isInactivePerson(person: { status?: string | null }) {
  const status = person.status?.trim().toLowerCase();

  return status ? inactivePersonStatuses.has(status) : false;
}

function hasMeaningfulPositiveScore(breakdown?: DosRelationshipScore["breakdown"]) {
  if (!breakdown) {
    return true;
  }

  return breakdown.meetingFrequency > 0
    || breakdown.timeInvested > 0
    || breakdown.discipleshipProgress > 0
    || breakdown.fruit > 0
    || breakdown.multiplication > 0;
}

function personEngagementLevel(person: { engagement_level?: string | null; engagementLevel?: string | null }) {
  return person.engagement_level ?? person.engagementLevel ?? null;
}

function quickReviewAnswerScore(value: string | null | undefined) {
  if (value === "yes") {
    return 1;
  }

  if (value === "somewhat") {
    return 0.5;
  }

  return 0;
}

function quickReviewPositiveSignals(review: QuickReviewRow) {
  return quickReviewAnswerScore(review.felt_heard_response)
    + quickReviewAnswerScore(review.felt_cared_for)
    + quickReviewAnswerScore(review.conversation_helpful)
    + quickReviewAnswerScore(review.would_meet_again_response);
}

function quickReviewRequestedFollowUp(review: QuickReviewRow) {
  const tags = review.outcome_tags ?? [];

  return tags.includes("Follow Up Requested")
    || review.wants_follow_up === "yes"
    || review.wants_follow_up === "maybe"
    || review.would_meet_again_response === "yes"
    || review.would_meet_again_response === "somewhat";
}

function quickReviewGrowthSignals(review: QuickReviewRow) {
  const tags = review.outcome_tags ?? [];

  return Number(tags.includes("Discipling"))
    + Number(tags.includes("New Believers"))
    + Number(tags.includes("Reconciliation"));
}

function isAutomaticCircleEligible(
  person: { engagement_level?: string | null; engagementLevel?: string | null; status?: string | null },
  totalScore: number,
  breakdown?: DosRelationshipScore["breakdown"],
) {
  if (isInactivePerson(person)) {
    return false;
  }

  if (totalScore > 0 && hasMeaningfulPositiveScore(breakdown)) {
    return true;
  }

  return relationshipScoreFromEngagementLevel(personEngagementLevel(person)) >= 0;
}

function sortCircleScores(first: DosRelationshipScore, second: DosRelationshipScore) {
  const sourceDifference = Number(second.assignmentSource === "manual") - Number(first.assignmentSource === "manual");

  if (sourceDifference !== 0) {
    return sourceDifference;
  }

  return second.totalScore - first.totalScore || first.person.name.localeCompare(second.person.name);
}

function emptyCircleConfig(workspaceId: string): DosCircleConfig {
  return {
    ...defaultConfig,
    id: null,
    isActive: true,
    workspaceId,
  };
}

export function buildFallbackCircleDataFromActivity({
  meetings,
  people,
  workspaceId,
}: {
  meetings: DosCircleActivityMeeting[];
  people: DosCircleActivityPerson[];
  workspaceId: string;
}): DosCircleData {
  const scores = people
    .map((person) => {
      const personMeetings = meetings.filter((meeting) => meeting.fieldPersonIds.includes(person.id));
      const recentMeetings = personMeetings.filter((meeting) => isWithinDays(meeting.date, 30));
      const latestMeeting = latestDate(person.lastActivityAt, ...personMeetings.map((meeting) => meeting.date));
      const breakdown = {
        discipleshipProgress: clampScore(personMeetings.length * 12),
        fruit: 0,
        meetingFrequency: clampScore(recentMeetings.length * 25 || personMeetings.length * 15),
        momentum: clampScore(dayDiff(latestMeeting) <= 7 ? 100 : dayDiff(latestMeeting) <= 30 ? 45 : 0),
        multiplication: 0,
        timeInvested: clampScore(personMeetings.length * 12),
      };
      const totalScore = clampScore(Math.max(
        weightedTotal(breakdown, emptyCircleConfig(workspaceId)),
        personMeetings.length ? 20 + personMeetings.length * 12 : 0,
      ));

      return {
        assignmentSource: "automatic" as const,
        breakdown,
        circle: "field" as CircleAssignment,
        confidenceScore: personMeetings.length ? clampScore(55 + personMeetings.length * 8) : 0,
        explanation: {
          negative_factors: personMeetings.length ? [] : ["No logged discipleship activity yet"],
          positive_factors: personMeetings.length ? [`${personMeetings.length} logged ${personMeetings.length === 1 ? "meeting" : "meetings"}`] : [],
          summary: personMeetings.length
            ? "Activity metrics calculated from visible meetings. Circle placement requires your confirmation."
            : "No activity metric is available yet. Circle placement requires your confirmation.",
        },
        lastCalculatedAt: null,
        person,
        totalScore,
      } satisfies DosRelationshipScore;
    })
    .sort((first, second) => second.totalScore - first.totalScore);

  const activeScores = scores.filter((score) => isAutomaticCircleEligible(score.person, score.totalScore, score.breakdown));
  const field = scores.filter((score) => score.circle === "field");

  return {
    config: emptyCircleConfig(workspaceId),
    field,
    fieldSummary: {
      activeThisMonth: scores.filter((score) => isWithinDays(score.person.lastActivityAt, 30) || score.breakdown.meetingFrequency > 0).length,
      multiplying: scores.filter((score) => score.breakdown.multiplication > 0 || score.breakdown.fruit >= 50).length,
      needFollowUp: scores.filter((score) => dayDiff(score.person.lastActivityAt) > 10).length,
      newContacts: people.filter((person) => person.status === "new").length,
      total: people.length,
    },
    metadata: {
      calculatedAt: null,
      lockedCount: 0,
      peopleScored: activeScores.length,
    },
    my12: scores.filter((score) => score.circle === "twelve"),
    my120: scores.filter((score) => score.circle === "my_120"),
    my3: scores.filter((score) => score.circle === "three"),
    my70: scores.filter((score) => score.circle === "seventy"),
  };
}

function normalizeConfig(row: Record<string, unknown> | null | undefined, workspaceId: string): DosCircleConfig {
  return {
    discipleshipProgressWeight: Number(row?.discipleship_progress_weight ?? defaultConfig.discipleshipProgressWeight),
    fruitWeight: Number(row?.fruit_weight ?? defaultConfig.fruitWeight),
    id: typeof row?.id === "string" ? row.id : null,
    isActive: row?.is_active !== false,
    meetingFrequencyWeight: Number(row?.meeting_frequency_weight ?? defaultConfig.meetingFrequencyWeight),
    momentumWeight: Number(row?.momentum_weight ?? defaultConfig.momentumWeight),
    multiplicationWeight: Number(row?.multiplication_weight ?? defaultConfig.multiplicationWeight),
    timeInvestedWeight: Number(row?.time_invested_weight ?? defaultConfig.timeInvestedWeight),
    workspaceId,
  };
}

async function safeSelect<T>(promise: PromiseLike<{ data: unknown; error: { message?: string } | null }>, tableName: string): Promise<T[]> {
  const result = await promise;

  if (result.error) {
    if (tableMissing(result.error, tableName) || result.error.message?.includes("workspace_id")) {
      return [];
    }

    throw new Error(result.error.message ?? `Unable to load ${tableName}.`);
  }

  return (result.data ?? []) as T[];
}

export async function getActiveCircleConfig(workspaceId: string, supabase = createSupabaseAdminClient()) {
  const { data, error } = await supabase
    .from("dos_circle_scoring_configs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .maybeSingle();

  if (error && !tableMissing(error, "dos_circle_scoring_configs")) {
    throw new Error(error.message);
  }

  return normalizeConfig(data as Record<string, unknown> | null, workspaceId);
}

export async function loadCircleData(workspaceId: string): Promise<DosCircleData> {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("Supabase admin environment variables are not configured.");
  }

  const supabase = createSupabaseAdminClient();
  const [config, people, scores, overrides] = await Promise.all([
    getActiveCircleConfig(workspaceId, supabase),
    safeSelect<PersonRow>(
      supabase
        .from("missionary_field_people")
        .select("id, name, status, relationship_type, engagement_level, last_activity_at, updated_at")
        .or(workspaceScopeFilter(workspaceId)),
      "missionary_field_people",
    ),
    safeSelect<Record<string, unknown>>(
      supabase
        .from("dos_relationship_scores")
        .select("person_id, total_score, meeting_frequency_score, time_invested_score, discipleship_progress_score, fruit_score, momentum_score, multiplication_score, circle_assignment, assignment_source, confidence_score, score_explanation, last_calculated_at")
        .eq("workspace_id", workspaceId)
        .order("total_score", { ascending: false }),
      "dos_relationship_scores",
    ),
    safeSelect<OverrideRow>(
      supabase
        .from("dos_circle_overrides")
        .select("person_id, manual_circle, locked, reason")
        .eq("workspace_id", workspaceId),
      "dos_circle_overrides",
    ),
  ]);

  const peopleById = new Map(people.map((person) => [person.id, person]));
  const lockedOverrideByPersonId = new Map(overrides.filter((override) => override.locked).map((override) => [override.person_id, override]));
  const mappedScores = scores
    .map((score) => {
      const person = peopleById.get(String(score.person_id));

      if (!person) {
        return null;
      }

      const explanation = score.score_explanation as Partial<DosScoreExplanation> | null;
      const lockedOverride = lockedOverrideByPersonId.get(person.id);
      const totalScore = Number(score.total_score ?? 0);
      const breakdown = {
        discipleshipProgress: Number(score.discipleship_progress_score ?? 0),
        fruit: Number(score.fruit_score ?? 0),
        meetingFrequency: Number(score.meeting_frequency_score ?? 0),
        momentum: Number(score.momentum_score ?? 0),
        multiplication: Number(score.multiplication_score ?? 0),
        timeInvested: Number(score.time_invested_score ?? 0),
      };
      const placement = canonicalCircleForRecalculation({
        existingCircle: normalizedCircle(score.circle_assignment),
        lockedOverrideCircle: lockedOverride ? normalizedCircle(lockedOverride.manual_circle) : null,
      });
      const circle = placement.circle;

      return {
        assignmentSource: placement.assignmentSource,
        breakdown,
        circle,
        confidenceScore: Number(score.confidence_score ?? 0),
        explanation: {
          negative_factors: Array.isArray(explanation?.negative_factors) ? explanation.negative_factors : [],
          positive_factors: Array.isArray(explanation?.positive_factors) ? explanation.positive_factors : [],
          summary: lockedOverride
            ? `Pinned to ${circleLabel(circle)} for workspace stewardship.${lockedOverride.reason ? ` ${lockedOverride.reason}` : ""}`
            : typeof explanation?.summary === "string" && explanation.summary.trim()
              ? explanation.summary
              : "Activity metrics are ready. Circle placement changes only after your confirmation.",
        },
        lastCalculatedAt: typeof score.last_calculated_at === "string" ? score.last_calculated_at : null,
        person: {
          engagementLevel: person.engagement_level,
          id: person.id,
          lastActivityAt: person.last_activity_at ?? person.updated_at,
          name: person.name,
          relationshipType: person.relationship_type,
          status: person.status,
        },
        totalScore,
      } satisfies DosRelationshipScore;
    })
    .filter((score): score is DosRelationshipScore => Boolean(score));

  const missingScores = people
    .filter((person) => !mappedScores.some((score) => score.person.id === person.id))
    .map((person) => {
      const lockedOverride = lockedOverrideByPersonId.get(person.id);
      const circle = lockedOverride ? normalizedCircle(lockedOverride.manual_circle) : "field";

      return {
        assignmentSource: lockedOverride ? "manual" as const : "automatic" as const,
        breakdown: {
          discipleshipProgress: 0,
          fruit: 0,
          meetingFrequency: 0,
          momentum: 0,
          multiplication: 0,
          timeInvested: 0,
        },
        circle,
        confidenceScore: 0,
        explanation: {
          negative_factors: lockedOverride ? [] : ["No discipleship activity has been scored yet"],
          positive_factors: [],
          summary: lockedOverride
            ? `Pinned to ${circleLabel(circle)} for workspace stewardship.${lockedOverride.reason ? ` ${lockedOverride.reason}` : ""}`
            : "In Field until more activity is logged.",
        },
        lastCalculatedAt: null,
        person: {
          engagementLevel: person.engagement_level,
          id: person.id,
          lastActivityAt: person.last_activity_at ?? person.updated_at,
          name: person.name,
          relationshipType: person.relationship_type,
          status: person.status,
        },
        totalScore: 0,
      } satisfies DosRelationshipScore;
    });

  const allScores = [...mappedScores, ...missingScores].sort(sortCircleScores);
  const my3 = allScores.filter((score) => score.circle === "three").sort(sortCircleScores);
  const my12 = allScores.filter((score) => score.circle === "twelve").sort(sortCircleScores);
  const my70 = allScores.filter((score) => score.circle === "seventy").sort(sortCircleScores);
  const my120 = allScores.filter((score) => score.circle === "my_120").sort(sortCircleScores);
  const field = allScores.filter((score) => score.circle === "field").sort(sortCircleScores);

  return {
    config,
    field,
    fieldSummary: {
      activeThisMonth: allScores.filter((score) => isWithinDays(score.person.lastActivityAt, 30)).length,
      multiplying: allScores.filter((score) => score.breakdown.multiplication > 0 || score.breakdown.fruit >= 50).length,
      needFollowUp: allScores.filter((score) => dayDiff(score.person.lastActivityAt) > 10).length,
      newContacts: people.filter((person) => person.status === "new").length,
      total: people.length,
    },
    metadata: {
      calculatedAt: allScores.find((score) => score.lastCalculatedAt)?.lastCalculatedAt ?? null,
      lockedCount: overrides.filter((override) => override.locked).length,
      peopleScored: mappedScores.length,
    },
    my12,
    my120,
    my3,
    my70,
  };
}

export async function recalculateCircleScores(workspaceId: string): Promise<DosCircleData> {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("Supabase admin environment variables are not configured.");
  }

  const supabase = createSupabaseAdminClient();
  const [config, people, meetings, reviews, connections, fruit, quickReviews, overrides, existingScores] = await Promise.all([
    getActiveCircleConfig(workspaceId, supabase),
    safeSelect<PersonRow>(
      supabase
        .from("missionary_field_people")
        .select("id, name, status, relationship_type, engagement_level, last_activity_at, updated_at")
        .or(workspaceScopeFilter(workspaceId)),
      "missionary_field_people",
    ),
    safeSelect<MeetingRow>(
      supabase
        .from("missionary_tables")
        .select("id, table_date, table_type, field_person_ids, conversation_flow_key, conversation_responses, created_at, updated_at")
        .or(workspaceScopeFilter(workspaceId)),
      "missionary_tables",
    ),
    safeSelect<ReviewRow>(
      supabase
        .from("missionary_table_reviews")
        .select("table_id, teaching_used, readiness, updated_at")
        .or(workspaceScopeFilter(workspaceId)),
      "missionary_table_reviews",
    ),
    safeSelect<ConnectionLogRow>(
      supabase
        .from("missionary_connection_logs")
        .select("field_person_id, connection_date, duration_minutes, interaction_type, movement_step, follow_up_needed, updated_at")
        .or(workspaceScopeFilter(workspaceId)),
      "missionary_connection_logs",
    ),
    safeSelect<FruitRow>(
      supabase
        .from("missionary_fruit_items")
        .select("field_person_id, table_id, cc_status, outcome_tags, testimony_date")
        .or(workspaceScopeFilter(workspaceId)),
      "missionary_fruit_items",
    ),
    safeSelect<QuickReviewRow>(
      supabase
        .from("dos_meeting_reviews")
        .select("meeting_id, reviewer_person_id, status, created_at, felt_cared_for, felt_heard_response, conversation_helpful, would_meet_again_response, wants_follow_up, outcome_tags")
        .eq("workspace_id", workspaceId),
      "dos_meeting_reviews",
    ),
    safeSelect<OverrideRow>(
      supabase
        .from("dos_circle_overrides")
        .select("person_id, manual_circle, locked, reason")
        .eq("workspace_id", workspaceId),
      "dos_circle_overrides",
    ),
    safeSelect<ScoreRow>(
      supabase
        .from("dos_relationship_scores")
        .select("person_id, total_score, circle_assignment, assignment_source")
        .eq("workspace_id", workspaceId),
      "dos_relationship_scores",
    ),
  ]);

  const reviewByTableId = new Map(reviews.map((review) => [review.table_id, review]));
  const approvedFruit = fruit.filter((item) => item.cc_status === "approved");
  const existingByPersonId = new Map(existingScores.map((score) => [score.person_id, score]));
  const overrideByPersonId = new Map(overrides.filter((override) => override.locked).map((override) => [override.person_id, override]));

  const computed = people.map((person) => {
    const personMeetings = meetings.filter((meeting) => meeting.field_person_ids?.includes(person.id));
    const personConnections = connections.filter((connection) => connection.field_person_id === person.id);
    const personFruit = approvedFruit.filter((item) => item.field_person_id === person.id || (item.table_id && personMeetings.some((meeting) => meeting.id === item.table_id)));
    const personReviews = personMeetings
      .map((meeting) => reviewByTableId.get(meeting.id))
      .filter((review): review is ReviewRow => Boolean(review));
    const personQuickReviews = quickReviews
      .filter((review) => review.status !== "archived")
      .filter((review) => review.reviewer_person_id === person.id || (review.meeting_id && personMeetings.some((meeting) => meeting.id === review.meeting_id)));
    const positiveQuickReviewSignals = personQuickReviews.reduce((sum, review) => sum + quickReviewPositiveSignals(review), 0);
    const quickReviewGrowthSignalCount = personQuickReviews.reduce((sum, review) => sum + quickReviewGrowthSignals(review), 0);
    const quickReviewFollowUpRequested = personQuickReviews.some(quickReviewRequestedFollowUp);
    const quickReviewRelationshipScore = personQuickReviews.length
      ? personQuickReviews.length * 14 + positiveQuickReviewSignals * 8 + quickReviewGrowthSignalCount * 12
      : 0;
    const allActivityDates = [
      person.last_activity_at,
      person.updated_at,
      ...personMeetings.map((meeting) => latestDate(meeting.table_date, meeting.updated_at, meeting.created_at)),
      ...personConnections.map((connection) => latestDate(connection.connection_date, connection.updated_at)),
      ...personFruit.map((item) => item.testimony_date),
      ...personQuickReviews.map((review) => review.created_at),
    ];
    const recentMeetings = personMeetings.filter((meeting) => isWithinDays(latestDate(meeting.table_date, meeting.updated_at, meeting.created_at), 30));
    const recentConnections = personConnections.filter((connection) => isWithinDays(latestDate(connection.connection_date, connection.updated_at), 30));
    const totalMinutes = personConnections.reduce((sum, connection) => sum + (connection.duration_minutes ?? 30), 0) + personMeetings.length * 60;
    const completedFlows = personMeetings.filter((meeting) => meeting.conversation_flow_key && meeting.conversation_flow_key !== "none").length;
    const readinessScore = Math.max(...personReviews.map((review) => {
      switch (review.readiness) {
        case "Actively following": return 100;
        case "Ready to follow": return 82;
        case "Open": return 62;
        case "Curious": return 42;
        default: return 15;
      }
    }), 0);
    const engagementScore = relationshipScoreFromEngagementLevel(person.engagement_level);
    const engagementContribution = engagementComponentScore(engagementScore);
    const multiplicationSignals = [
      person.relationship_type?.toLowerCase().includes("mentor") ? 1 : 0,
      person.engagement_level?.toLowerCase().includes("multip") ? 1 : 0,
      personConnections.filter((connection) => connection.movement_step === "Begin discipleship").length,
      personFruit.filter((item) => item.outcome_tags?.includes("Discipleship")).length,
    ].reduce((sum, signal) => sum + signal, 0);
    const followUpNeeded = personConnections.some((connection) => Boolean(connection.follow_up_needed?.trim()));
    const daysSinceLastActivity = dayDiff(latestDate(...allActivityDates));
    const breakdown = {
      discipleshipProgress: clampScore(Math.max(readinessScore, completedFlows * 30, personReviews.length * 25, quickReviewRelationshipScore, engagementContribution)),
      fruit: clampScore(personFruit.length * 50),
      meetingFrequency: clampScore(recentMeetings.length * 25 + recentConnections.length * 15),
      momentum: clampScore(daysSinceLastActivity <= 7 ? 100 : daysSinceLastActivity <= 14 ? 70 : daysSinceLastActivity <= 30 ? 35 : 0),
      multiplication: clampScore(multiplicationSignals * 35),
      timeInvested: clampScore(totalMinutes / 6),
    };
    const totalScore = weightedTotal(breakdown, config);
    const positiveFactors = [
      recentMeetings.length ? `${recentMeetings.length} meetings in the last 30 days` : "",
      recentConnections.length ? `${recentConnections.length} connection logs in the last 30 days` : "",
      completedFlows ? `Completed ${completedFlows} discipleship ${completedFlows === 1 ? "flow" : "flows"}` : "",
      personFruit.length ? `${personFruit.length} approved fruit ${personFruit.length === 1 ? "review" : "reviews"}` : "",
      personQuickReviews.length ? `${personQuickReviews.length} Quick ${personQuickReviews.length === 1 ? "Review" : "Reviews"} received` : "",
      positiveQuickReviewSignals ? "Recipient feedback shows relationship health" : "",
      engagementScore > 0 ? `Engagement marked ${relationshipScoreLabel(engagementScore)}` : "",
      multiplicationSignals ? "Shows multiplication or discipling activity" : "",
    ].filter(Boolean);
    const negativeFactors = [
      daysSinceLastActivity > 10 ? "No recent follow up in the last 10 days" : "",
      followUpNeeded ? "Follow up is still open" : "",
      quickReviewFollowUpRequested ? "Recipient requested follow up" : "",
      engagementScore < 0 ? `Engagement marked ${relationshipScoreLabel(engagementScore)}` : "",
      !personMeetings.length && !personConnections.length ? "No logged discipleship activity yet" : "",
    ].filter(Boolean);

    return {
      person,
      record: {
        assignment_source: "automatic" as AssignmentSource,
        circle_assignment: "field" as CircleAssignment,
        confidence_score: clampScore(45 + Math.min(35, (personMeetings.length + personConnections.length + personFruit.length + personQuickReviews.length) * 8) + (latestDate(...allActivityDates) ? 10 : 0)),
        discipleship_progress_score: breakdown.discipleshipProgress,
        fruit_score: breakdown.fruit,
        last_calculated_at: new Date().toISOString(),
        meeting_frequency_score: breakdown.meetingFrequency,
        momentum_score: breakdown.momentum,
        multiplication_score: breakdown.multiplication,
        person_id: person.id,
        score_explanation: {
          negative_factors: negativeFactors,
          positive_factors: positiveFactors,
          summary: "",
        },
        time_invested_score: breakdown.timeInvested,
        total_score: totalScore,
        workspace_id: workspaceId,
      },
    };
  }).sort((first, second) => second.record.total_score - first.record.total_score);

  computed.forEach((item) => {
    const manualOverride = overrideByPersonId.get(item.person.id);
    const existing = existingByPersonId.get(item.person.id);
    const breakdown = {
      discipleshipProgress: item.record.discipleship_progress_score,
      fruit: item.record.fruit_score,
      meetingFrequency: item.record.meeting_frequency_score,
      momentum: item.record.momentum_score,
      multiplication: item.record.multiplication_score,
      timeInvested: item.record.time_invested_score,
    };
    const placement = canonicalCircleForRecalculation({
      existingCircle: existing ? normalizedCircle(existing.circle_assignment) : null,
      lockedOverrideCircle: manualOverride ? normalizedCircle(manualOverride.manual_circle) : null,
    });
    const circle = placement.circle;

    item.record.circle_assignment = circle;
    item.record.assignment_source = placement.assignmentSource;
    item.record.score_explanation.summary = manualOverride
      ? `Pinned to ${circleLabel(circle)} for workspace stewardship.${manualOverride.reason ? ` ${manualOverride.reason}` : ""}`
      : `${circleLabel(circle)} is unchanged. Activity metrics may recommend a move, but only your confirmation changes placement.`;
  });

  const scoreRows = computed.map((item) => item.record);
  const { error: upsertError } = scoreRows.length
    ? await supabase
      .from("dos_relationship_scores")
      .upsert(scoreRows, { onConflict: "workspace_id,person_id" })
    : { error: null };

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  const historyRows = computed
    .map((item) => {
      const existing = existingByPersonId.get(item.person.id);
      const scoreChanged = !existing || Math.abs(Number(existing.total_score ?? 0) - item.record.total_score) >= 1;
      const circleChanged = existing?.circle_assignment !== item.record.circle_assignment;

      if (!scoreChanged && !circleChanged) {
        return null;
      }

      return {
        movement_reason: item.record.score_explanation,
        new_circle: item.record.circle_assignment,
        new_score: item.record.total_score,
        person_id: item.person.id,
        previous_circle: existing?.circle_assignment ?? null,
        previous_score: existing?.total_score ?? null,
        workspace_id: workspaceId,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  if (historyRows.length) {
    const { error: historyError } = await supabase
      .from("dos_relationship_score_history")
      .insert(historyRows);

    if (historyError && !tableMissing(historyError, "dos_relationship_score_history")) {
      throw new Error(historyError.message);
    }
  }

  return loadCircleData(workspaceId);
}

export async function loadPersonRelationshipIntelligence(workspaceId: string, personId: string) {
  const supabase = createSupabaseAdminClient();
  let [circleData, history] = await Promise.all([
    loadCircleData(workspaceId),
    safeSelect<Record<string, unknown>>(
      supabase
        .from("dos_relationship_score_history")
        .select("previous_score, new_score, previous_circle, new_circle, movement_reason, calculated_at")
        .eq("workspace_id", workspaceId)
        .eq("person_id", personId)
        .order("calculated_at", { ascending: false })
        .limit(8),
      "dos_relationship_score_history",
    ),
  ]);
  let allScores = [...circleData.my3, ...circleData.my12, ...circleData.my70, ...circleData.my120, ...circleData.field];
  let score = allScores.find((item) => item.person.id === personId);

  if (!score || score.totalScore === 0) {
    circleData = await recalculateCircleScores(workspaceId).catch(() => circleData);
    allScores = [...circleData.my3, ...circleData.my12, ...circleData.my70, ...circleData.my120, ...circleData.field];
    score = allScores.find((item) => item.person.id === personId);
  }

  if (!score) {
    return null;
  }

  return {
    history: history.map((item) => ({
      calculatedAt: item.calculated_at,
      movementReason: item.movement_reason,
      newCircle: item.new_circle,
      newScore: Number(item.new_score ?? 0),
      previousCircle: item.previous_circle,
      previousScore: item.previous_score === null ? null : Number(item.previous_score ?? 0),
    })),
    score,
  };
}

export async function updateCircleConfig(workspaceId: string, values: Partial<Omit<DosCircleConfig, "id" | "isActive" | "workspaceId">>) {
  const supabase = createSupabaseAdminClient();
  const payload = {
    discipleship_progress_weight: values.discipleshipProgressWeight,
    fruit_weight: values.fruitWeight,
    meeting_frequency_weight: values.meetingFrequencyWeight,
    momentum_weight: values.momentumWeight,
    multiplication_weight: values.multiplicationWeight,
    time_invested_weight: values.timeInvestedWeight,
    workspace_id: workspaceId,
  };
  const { error } = await supabase
    .from("dos_circle_scoring_configs")
    .upsert(payload, { onConflict: "workspace_id" });

  if (error) {
    throw new Error(error.message);
  }

  return getActiveCircleConfig(workspaceId, supabase);
}

export async function updateCircleOverride({
  circle,
  createdBy,
  locked,
  personId,
  reason,
  workspaceId,
}: {
  circle: CircleAssignment;
  createdBy: string;
  locked: boolean;
  personId: string;
  reason?: string | null;
  workspaceId: string;
}) {
  const supabase = createSupabaseAdminClient();

  if (!locked) {
    const { error } = await supabase
      .from("dos_circle_overrides")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("person_id", personId);

    if (error) {
      throw new Error(error.message);
    }

    return recalculateCircleScores(workspaceId);
  }

  const { error } = await supabase
    .from("dos_circle_overrides")
    .upsert({
      created_by: createdBy,
      locked: true,
      manual_circle: circle,
      person_id: personId,
      reason: reason?.trim() || null,
      workspace_id: workspaceId,
    }, { onConflict: "workspace_id,person_id" });

  if (error) {
    throw new Error(error.message);
  }

  return recalculateCircleScores(workspaceId);
}
