import "server-only";

import {
  isUsamKitchenTableGospelWorkspace,
  normalizeConversationResponses,
  normalizeConversationFlowKey,
  normalizeRecommendedResources,
  type DosConversationFlowKey,
  type DosConversationResponses,
  type DosRecommendedResource,
} from "@/src/lib/dos/meeting-engine";
import { buildFallbackCircleDataFromActivity, loadCircleData, recalculateCircleScores, type DosCircleData } from "@/src/lib/dos/circle-scoring";
import { dosQuickReviewType } from "@/src/lib/dos/review-types";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;
type SupabaseQueryError = { message?: string } | null | undefined;

export const dosAppMeetingTypes = ["kitchen_table", "coffee", "phone", "zoom", "text", "prayer", "group", "discipleship", "other"] as const;
export const dosAppOutcomeTags = [
  "Gospel Conversation",
  "Prayer Received",
  "Salvation",
  "Re Dedication",
  "Baptism",
  "Joined Discipleship",
  "Church Visit",
  "Joined Church",
  "Shared Testimony",
  "Started Discipling Others",
  "Marketplace Ministry",
  "Prayer Request",
  "Freedom / Deliverance",
  "Repentance",
  "Ongoing Accountability",
] as const;
export const dosAppLegacyOutcomeTags = ["Healing", "Deliverance", "Church Connection", "Discipleship", "Prayer Answered", "Other"] as const;
export const dosAppFruitTypeOptions = dosAppOutcomeTags;

export type DosAppMeetingType = typeof dosAppMeetingTypes[number];
export type DosAppOutcomeTag = typeof dosAppOutcomeTags[number] | typeof dosAppLegacyOutcomeTags[number];
export type DosAppReviewStatus = "approved" | "not_sent" | "pending" | "private" | "submitted";

export type DosAppWorkspace = {
  displayName: string;
  id: string;
  isUsamWorkspace: boolean;
  profileImageUrl: string | null;
  publicProfileHref: string;
  shortMission: string | null;
  slug: string;
};

export type DosAppPerson = {
  church: string | null;
  email: string | null;
  engagementLevel: string | null;
  id: string;
  lastActivityAt: string | null;
  name: string;
  notes: string | null;
  phone: string;
  relationshipType: string | null;
  status: string;
  updatedAt: string | null;
};

export type DosAppMeeting = {
  conversationFlowKey: DosConversationFlowKey;
  conversationResponses: DosConversationResponses;
  date: string | null;
  fieldPersonIds: string[];
  id: string;
  notes: string | null;
  participantNames: string[];
  recommendedResources: DosRecommendedResource[];
  review: {
    sharePermission: string | null;
    status: DosAppReviewStatus;
    stoodOut: string | null;
    submittedAt: string | null;
    submittedName: string | null;
    token: string | null;
  };
  source: "connection" | "table";
  title: string;
  type: DosAppMeetingType;
  updatedAt: string | null;
};

export type DosAppLeaderReflection = {
  createdAt: string | null;
  followUpNeeded: boolean;
  id: string;
  meetingId: string;
  nextStep: string | null;
  observedFruit: string[];
  personId: string | null;
  prayerNeeds: string | null;
  privateNotes: string | null;
  spiritualOpenness: string | null;
  whatHappened: string | null;
};

export type DosAppParticipantReview = {
  comments: string | null;
  conversationHelpful: string | null;
  feltCaredFor: string | null;
  feltHeard: string | null;
  id: string;
  meetingId: string;
  personId: string | null;
  submittedAt: string | null;
  wouldMeetAgain: boolean | null;
};

export type DosAppParticipantTestimony = {
  decisionMade: string | null;
  id: string;
  meetingId: string;
  nextStep: string | null;
  permissionToShare: boolean;
  personId: string | null;
  publicDisplayName: string | null;
  story: string;
  submittedAt: string | null;
  whatChanged: string | null;
};

export type DosAppFruitEvent = {
  confidenceLevel: "observed" | "confirmed" | "verified";
  date: string | null;
  debugContext: Record<string, unknown>;
  description: string | null;
  fruitType: string;
  generatedBy: string | null;
  generationKey: string | null;
  id: string;
  meetingId: string | null;
  personId: string | null;
  sourceId: string | null;
  sourceType: "leader_reflection" | "participant_review" | "testimony" | "manual" | "system";
  title: string | null;
  visibility: "private" | "internal" | "public";
};

export type DosAppFruit = {
  fieldPersonId: string | null;
  id: string;
  outcomeTags: DosAppOutcomeTag[];
  permissionToShare: boolean;
  sourceApp: string | null;
  status: string;
  submittedByName: string | null;
  summary: string;
  tableId: string | null;
  testimonyDate: string | null;
  updatedAt: string | null;
};

export type DosAppData = {
  circles: DosCircleData | null;
  fruit: DosAppFruit[];
  fruitEvents: DosAppFruitEvent[];
  leaderReflections: DosAppLeaderReflection[];
  meetings: DosAppMeeting[];
  participantReviews: DosAppParticipantReview[];
  participantTestimonies: DosAppParticipantTestimony[];
  people: DosAppPerson[];
  stats: {
    approvedFruit: number;
    connectionsCount: number;
    fruitCount: number;
    meetingsCount: number;
    peopleCount: number;
  };
  workspace: DosAppWorkspace;
};

type LoadResult<T> =
  | { data: T; status: "ready" }
  | { message: string; status: "error" }
  | { status: "not_found" };

async function loadFreshCircleData(
  workspaceId: string,
  people: DosAppPerson[],
  meetings: DosAppMeeting[],
) {
  const fallbackData = buildFallbackCircleDataFromActivity({
    meetings: meetings.map((meeting) => ({
      date: meeting.date,
      fieldPersonIds: meeting.fieldPersonIds,
    })),
    people: people.map((person) => ({
      engagementLevel: person.engagementLevel,
      id: person.id,
      lastActivityAt: person.lastActivityAt,
      name: person.name,
      relationshipType: person.relationshipType,
      status: person.status,
    })),
    workspaceId,
  });
  const activeMeetingPersonIds = new Set(meetings.flatMap((meeting) => meeting.fieldPersonIds));

  try {
    const circleData = await loadCircleData(workspaceId);
    const hasActiveMeetingData = activeMeetingPersonIds.size > 0;
    const hasUsefulCircleData = circleData.metadata.peopleScored > 0 && circleData.my3.some((score) => activeMeetingPersonIds.has(score.person.id));

    if (!hasUsefulCircleData && hasActiveMeetingData) {
      return await recalculateCircleScores(workspaceId).catch(() => fallbackData);
    }

    return circleData.metadata.peopleScored > 0 ? circleData : fallbackData;
  } catch {
    return fallbackData;
  }
}

type HouseholdRow = {
  display_name: string;
  id: string;
  profile_image_url: string | null;
  short_mission: string | null;
  slug: string;
};

type FieldPersonRow = {
  church: string | null;
  email: string | null;
  engagement_level: string | null;
  id: string;
  last_activity_at: string | null;
  name: string;
  notes: string | null;
  phone: string;
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
  notes: string | null;
  participant_names: string[] | null;
  recommended_resources?: unknown;
  table_date: string | null;
  table_type: string | null;
  updated_at: string | null;
};

type ConnectionLogRow = {
  connection_date: string | null;
  created_at?: string | null;
  field_person_id: string | null;
  follow_up_needed: string | null;
  id: string;
  interaction_type: string | null;
  notes: string | null;
  updated_at: string | null;
};

type FruitRow = {
  body: string;
  cc_status: string | null;
  field_person_id: string | null;
  id: string;
  outcome_tags: string[] | null;
  permission_to_share?: boolean | null;
  source_app?: string | null;
  submitted_by_name?: string | null;
  table_id?: string | null;
  testimony_date: string | null;
  updated_at: string | null;
};

type ReviewLinkRow = {
  created_at: string | null;
  meeting_id: string;
  token: string;
  used_at: string | null;
};

type MeetingReviewRow = {
  created_at: string | null;
  meeting_id: string;
  share_permission: string | null;
  status: string | null;
  stood_out: string | null;
  submitted_name: string | null;
};

type LeaderReflectionRow = {
  created_at: string | null;
  follow_up_needed: boolean | null;
  id: string;
  meeting_id: string;
  next_step: string | null;
  observed_fruit: unknown;
  person_id: string | null;
  prayer_needs: string | null;
  private_notes: string | null;
  spiritual_openness: string | null;
  what_happened: string | null;
};

type ParticipantReviewRow = {
  comments: string | null;
  conversation_helpful: string | null;
  felt_cared_for: string | null;
  felt_heard: string | null;
  id: string;
  meeting_id: string;
  person_id: string | null;
  submitted_at: string | null;
  would_meet_again: boolean | null;
};

type ParticipantTestimonyRow = {
  decision_made: string | null;
  id: string;
  meeting_id: string;
  next_step: string | null;
  permission_to_share: boolean | null;
  person_id: string | null;
  public_display_name: string | null;
  story: string;
  submitted_at: string | null;
  what_changed: string | null;
};

type FruitEventRow = {
  confidence_level: string | null;
  debug_context?: unknown;
  description: string | null;
  fruit_type: string;
  generated_by?: string | null;
  generation_key?: string | null;
  id: string;
  meeting_id: string | null;
  occurred_at: string | null;
  person_id: string | null;
  source_id?: string | null;
  source_type: string | null;
  title: string | null;
  visibility: string | null;
};

function mapMeetingType(value: string | null): DosAppMeetingType {
  return dosAppMeetingTypes.includes(value as DosAppMeetingType) ? value as DosAppMeetingType : "other";
}

function mapConnectionType(value: string | null): DosAppMeetingType {
  const normalized = value?.toLowerCase() ?? "";

  if (normalized.includes("coffee")) {
    return "coffee";
  }

  if (normalized.includes("phone")) {
    return "phone";
  }

  if (normalized.includes("zoom")) {
    return "zoom";
  }

  if (normalized.includes("text")) {
    return "text";
  }

  if (normalized.includes("prayer")) {
    return "prayer";
  }

  if (normalized.includes("disciple")) {
    return "discipleship";
  }

  return "other";
}

function mapOutcomeTags(value: string[] | null | undefined): DosAppOutcomeTag[] {
  const validTags = [...dosAppOutcomeTags, ...dosAppLegacyOutcomeTags] as readonly string[];

  return Array.isArray(value)
    ? value.filter((tag): tag is DosAppOutcomeTag => validTags.includes(tag))
    : [];
}

function mapObservedFruit(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function mapConfidenceLevel(value: string | null): DosAppFruitEvent["confidenceLevel"] {
  return value === "confirmed" || value === "verified" ? value : "observed";
}

function mapFruitSourceType(value: string | null): DosAppFruitEvent["sourceType"] {
  return value === "leader_reflection" || value === "participant_review" || value === "testimony" || value === "system"
    ? value
    : "manual";
}

function mapVisibility(value: string | null): DosAppFruitEvent["visibility"] {
  return value === "internal" || value === "public" ? value : "private";
}

function mapDebugContext(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function mapReviewStatus(value: string | null | undefined): DosAppReviewStatus {
  if (value === "approved") {
    return "approved";
  }

  if (value === "private" || value === "archived") {
    return "private";
  }

  return "submitted";
}

function emptyReviewSummary(): DosAppMeeting["review"] {
  return {
    sharePermission: null,
    status: "not_sent",
    stoodOut: null,
    submittedAt: null,
    submittedName: null,
    token: null,
  };
}

function meetingReviewSummary(
  meetingId: string,
  reviewLinkByMeetingId: Map<string, ReviewLinkRow>,
  meetingReviewByMeetingId: Map<string, MeetingReviewRow>,
): DosAppMeeting["review"] {
  const review = meetingReviewByMeetingId.get(meetingId);
  const link = reviewLinkByMeetingId.get(meetingId);

  if (review) {
    return {
      sharePermission: review.share_permission,
      status: mapReviewStatus(review.status),
      stoodOut: review.stood_out,
      submittedAt: review.created_at,
      submittedName: review.submitted_name,
      token: null,
    };
  }

  if (link && !link.used_at) {
    return {
      ...emptyReviewSummary(),
      status: "pending",
      token: link.token,
    };
  }

  return emptyReviewSummary();
}

function workspaceScopeFilter(workspaceId: string) {
  return `workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`;
}

export function isMissingWorkspaceScopeColumn(error: SupabaseQueryError) {
  return Boolean(error?.message?.includes("workspace_id"));
}

function isMissingWorkflowTable(error: SupabaseQueryError, tableName: string) {
  const message = error?.message?.toLowerCase() ?? "";

  return message.includes(tableName)
    && (message.includes("does not exist")
      || message.includes("relation")
      || message.includes("schema cache")
      || message.includes("could not find"));
}

function activityDateValue(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  const normalizedValue = value.includes("T") ? value : `${value}T12:00:00`;
  const timestamp = new Date(normalizedValue).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function latestActivityDate(...values: Array<string | null | undefined>) {
  return values
    .filter((value): value is string => Boolean(value))
    .sort((first, second) => activityDateValue(second) - activityDateValue(first))[0] ?? null;
}

async function loadPeopleForWorkspace(supabase: SupabaseAdminClient, workspaceId: string) {
  const scopedResult = await supabase
    .from("missionary_field_people")
    .select("id, name, phone, email, church, notes, status, relationship_type, engagement_level, last_activity_at, updated_at")
    .or(workspaceScopeFilter(workspaceId))
    .order("last_activity_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false });

  // TODO: Remove the household_id-only fallback after all Supabase environments
  // have the Command Center workspace_id migration applied.
  return scopedResult.error && isMissingWorkspaceScopeColumn(scopedResult.error)
    ? supabase
      .from("missionary_field_people")
      .select("id, name, phone, email, church, notes, status, relationship_type, engagement_level, last_activity_at, updated_at")
      .eq("household_id", workspaceId)
      .order("last_activity_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false })
    : scopedResult;
}

async function loadMeetingsForWorkspace(supabase: SupabaseAdminClient, workspaceId: string) {
  const scopedResult = await supabase
    .from("missionary_tables")
    .select("id, table_type, table_date, notes, participant_names, field_person_ids, conversation_flow_key, conversation_responses, recommended_resources, created_at, updated_at")
    .or(workspaceScopeFilter(workspaceId))
    .order("table_date", { ascending: false })
    .order("created_at", { ascending: false });

  return scopedResult.error && isMissingWorkspaceScopeColumn(scopedResult.error)
    ? supabase
      .from("missionary_tables")
      .select("id, table_type, table_date, notes, participant_names, field_person_ids, conversation_flow_key, conversation_responses, recommended_resources, created_at, updated_at")
      .eq("household_id", workspaceId)
      .order("table_date", { ascending: false })
      .order("created_at", { ascending: false })
    : scopedResult;
}

async function loadConnectionLogsForWorkspace(supabase: SupabaseAdminClient, workspaceId: string) {
  const scopedResult = await supabase
    .from("missionary_connection_logs")
    .select("id, field_person_id, connection_date, interaction_type, notes, follow_up_needed, created_at, updated_at")
    .or(workspaceScopeFilter(workspaceId))
    .order("connection_date", { ascending: false })
    .order("created_at", { ascending: false });

  const result = scopedResult.error && isMissingWorkspaceScopeColumn(scopedResult.error)
    ? await supabase
      .from("missionary_connection_logs")
      .select("id, field_person_id, connection_date, interaction_type, notes, follow_up_needed, created_at, updated_at")
      .eq("household_id", workspaceId)
      .order("connection_date", { ascending: false })
      .order("created_at", { ascending: false })
    : scopedResult;

  return result.error && isMissingWorkflowTable(result.error, "missionary_connection_logs")
    ? { data: [], error: null }
    : result;
}

async function loadFruitForWorkspace(supabase: SupabaseAdminClient, workspaceId: string) {
  const scopedResult = await supabase
    .from("missionary_fruit_items")
    .select("id, body, outcome_tags, cc_status, field_person_id, permission_to_share, source_app, submitted_by_name, table_id, testimony_date, updated_at")
    .or(workspaceScopeFilter(workspaceId))
    .order("testimony_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  return scopedResult.error && isMissingWorkspaceScopeColumn(scopedResult.error)
    ? supabase
      .from("missionary_fruit_items")
      .select("id, body, outcome_tags, cc_status, field_person_id, permission_to_share, source_app, submitted_by_name, table_id, testimony_date, updated_at")
      .eq("household_id", workspaceId)
      .order("testimony_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
    : scopedResult;
}

async function loadReviewLinksForWorkspace(supabase: SupabaseAdminClient, workspaceId: string) {
  const result = await supabase
    .from("dos_review_links")
    .select("meeting_id, token, used_at, created_at")
    .eq("workspace_id", workspaceId)
    .eq("review_type", dosQuickReviewType)
    .order("created_at", { ascending: false });

  return result.error && isMissingWorkflowTable(result.error, "dos_review_links")
    ? { data: [], error: null }
    : result;
}

async function loadMeetingReviewsForWorkspace(supabase: SupabaseAdminClient, workspaceId: string) {
  const result = await supabase
    .from("dos_meeting_reviews")
    .select("meeting_id, share_permission, status, stood_out, submitted_name, created_at")
    .eq("workspace_id", workspaceId)
    .eq("review_type", dosQuickReviewType)
    .order("created_at", { ascending: false });

  return result.error && isMissingWorkflowTable(result.error, "dos_meeting_reviews")
    ? { data: [], error: null }
    : result;
}

async function loadReviewsFruitFoundationForWorkspace(supabase: SupabaseAdminClient, workspaceId: string) {
  const [{ data: scopedMeetings }, { data: scopedPeople }] = await Promise.all([
    loadMeetingsForWorkspace(supabase, workspaceId),
    loadPeopleForWorkspace(supabase, workspaceId),
  ]);
  const meetingIds = ((scopedMeetings ?? []) as MeetingRow[]).map((meeting) => meeting.id);
  const personIds = ((scopedPeople ?? []) as FieldPersonRow[]).map((person) => person.id);

  if (!meetingIds.length && !personIds.length) {
    return {
      error: null,
      fruitEvents: [],
      leaderReflections: [],
      participantReviews: [],
      participantTestimonies: [],
    };
  }

  const [leaderReflectionsResult, participantReviewsResult, participantTestimoniesResult, fruitEventsByMeetingResult, fruitEventsByPersonResult] = await Promise.all([
    meetingIds.length
      ? supabase
        .from("meeting_reflections")
        .select("id, meeting_id, person_id, spiritual_openness, what_happened, prayer_needs, follow_up_needed, next_step, observed_fruit, private_notes, created_at")
        .in("meeting_id", meetingIds)
        .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    meetingIds.length
      ? supabase
        .from("participant_reviews")
        .select("id, meeting_id, person_id, felt_cared_for, felt_heard, conversation_helpful, would_meet_again, comments, submitted_at")
        .in("meeting_id", meetingIds)
        .order("submitted_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    meetingIds.length
      ? supabase
        .from("participant_testimonies")
        .select("id, meeting_id, person_id, story, what_changed, decision_made, next_step, permission_to_share, public_display_name, submitted_at")
        .in("meeting_id", meetingIds)
        .order("submitted_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    meetingIds.length
      ? supabase
        .from("fruit_events")
        .select("id, meeting_id, person_id, source_type, source_id, fruit_type, confidence_level, title, description, occurred_at, visibility, generation_key, generated_by, debug_context")
        .in("meeting_id", meetingIds)
        .order("occurred_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    personIds.length
      ? supabase
        .from("fruit_events")
        .select("id, meeting_id, person_id, source_type, source_id, fruit_type, confidence_level, title, description, occurred_at, visibility, generation_key, generated_by, debug_context")
        .in("person_id", personIds)
        .order("occurred_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  const missingTableError = [
    leaderReflectionsResult.error,
    participantReviewsResult.error,
    participantTestimoniesResult.error,
    fruitEventsByMeetingResult.error,
    fruitEventsByPersonResult.error,
  ].find((error) => (
    isMissingWorkflowTable(error, "meeting_reflections")
    || isMissingWorkflowTable(error, "participant_reviews")
    || isMissingWorkflowTable(error, "participant_testimonies")
    || isMissingWorkflowTable(error, "fruit_events")
  ));

  if (missingTableError) {
    return {
      error: null,
      fruitEvents: [],
      leaderReflections: [],
      participantReviews: [],
      participantTestimonies: [],
    };
  }

  return {
    error: leaderReflectionsResult.error ?? participantReviewsResult.error ?? participantTestimoniesResult.error ?? fruitEventsByMeetingResult.error ?? fruitEventsByPersonResult.error,
    fruitEvents: Array.from(
      new Map(
        ([...(fruitEventsByMeetingResult.data ?? []), ...(fruitEventsByPersonResult.data ?? [])] as FruitEventRow[])
          .map((event) => [event.id, event]),
      ).values(),
    ),
    leaderReflections: (leaderReflectionsResult.data ?? []) as LeaderReflectionRow[],
    participantReviews: (participantReviewsResult.data ?? []) as ParticipantReviewRow[],
    participantTestimonies: (participantTestimoniesResult.data ?? []) as ParticipantTestimonyRow[],
  };
}

async function loadWorkspace(workspaceSlug?: string | null): Promise<LoadResult<HouseholdRow>> {
  if (!isSupabaseAdminConfigured()) {
    return {
      message: "Supabase admin environment variables are not configured.",
      status: "error",
    };
  }

  const supabase = createSupabaseAdminClient();
  const baseSelect = "id, slug, display_name, short_mission, profile_image_url";
  const query = supabase.from("missionary_households").select(baseSelect);
  const { data, error } = workspaceSlug
    ? await query.eq("slug", workspaceSlug).maybeSingle()
    : await query.order("sort_order", { ascending: true }).order("updated_at", { ascending: false }).limit(1).maybeSingle();

  if (error) {
    return {
      message: error.message,
      status: "error",
    };
  }

  if (!data) {
    return { status: "not_found" };
  }

  return {
    data: data as HouseholdRow,
    status: "ready",
  };
}

export async function loadDosAppData(workspaceSlug?: string | null): Promise<LoadResult<DosAppData>> {
  const workspaceResult = await loadWorkspace(workspaceSlug);

  if (workspaceResult.status !== "ready") {
    return workspaceResult;
  }

  const workspace = workspaceResult.data;
  const supabase = createSupabaseAdminClient();
  const [peopleResult, meetingsResult, connectionLogsResult, fruitResult, reviewLinksResult, meetingReviewsResult, reviewsFruitResult] = await Promise.all([
    loadPeopleForWorkspace(supabase, workspace.id),
    loadMeetingsForWorkspace(supabase, workspace.id),
    loadConnectionLogsForWorkspace(supabase, workspace.id),
    loadFruitForWorkspace(supabase, workspace.id),
    loadReviewLinksForWorkspace(supabase, workspace.id),
    loadMeetingReviewsForWorkspace(supabase, workspace.id),
    loadReviewsFruitFoundationForWorkspace(supabase, workspace.id),
  ]);

  if (peopleResult.error || meetingsResult.error || connectionLogsResult.error || fruitResult.error || reviewLinksResult.error || meetingReviewsResult.error || reviewsFruitResult.error) {
    return {
      message: peopleResult.error?.message
        ?? meetingsResult.error?.message
        ?? connectionLogsResult.error?.message
        ?? fruitResult.error?.message
        ?? reviewLinksResult.error?.message
        ?? meetingReviewsResult.error?.message
        ?? reviewsFruitResult.error?.message
        ?? "Unable to load DOS app data.",
      status: "error",
    };
  }

  const meetingRows = (meetingsResult.data ?? []) as MeetingRow[];
  const connectionRows = (connectionLogsResult.data ?? []) as ConnectionLogRow[];
  const reviewLinkRows = (reviewLinksResult.data ?? []) as ReviewLinkRow[];
  const meetingReviewRows = (meetingReviewsResult.data ?? []) as MeetingReviewRow[];
  const reviewLinkByMeetingId = new Map<string, ReviewLinkRow>();
  const meetingReviewByMeetingId = new Map<string, MeetingReviewRow>();
  const latestActivityByPersonId = new Map<string, string>();

  reviewLinkRows.forEach((link) => {
    if (!reviewLinkByMeetingId.has(link.meeting_id)) {
      reviewLinkByMeetingId.set(link.meeting_id, link);
    }
  });

  meetingReviewRows.forEach((review) => {
    if (!meetingReviewByMeetingId.has(review.meeting_id)) {
      meetingReviewByMeetingId.set(review.meeting_id, review);
    }
  });

  meetingRows.forEach((meeting) => {
    const activityDate = latestActivityDate(meeting.table_date, meeting.updated_at, meeting.created_at);

    meeting.field_person_ids?.forEach((personId) => {
      const currentDate = latestActivityByPersonId.get(personId);
      const latestDate = latestActivityDate(activityDate, currentDate);

      if (latestDate) {
        latestActivityByPersonId.set(personId, latestDate);
      }
    });
  });

  connectionRows.forEach((connection) => {
    if (!connection.field_person_id) {
      return;
    }

    const activityDate = latestActivityDate(connection.connection_date, connection.updated_at, connection.created_at);
    const currentDate = latestActivityByPersonId.get(connection.field_person_id);
    const latestDate = latestActivityDate(activityDate, currentDate);

    if (latestDate) {
      latestActivityByPersonId.set(connection.field_person_id, latestDate);
    }
  });

  const people = ((peopleResult.data ?? []) as FieldPersonRow[]).map((person) => ({
    church: person.church,
    email: person.email,
    engagementLevel: person.engagement_level,
    id: person.id,
    lastActivityAt: latestActivityDate(person.last_activity_at, latestActivityByPersonId.get(person.id)),
    name: person.name,
    notes: person.notes,
    phone: person.phone,
    relationshipType: person.relationship_type,
    status: person.status ?? "new",
    updatedAt: person.updated_at,
  })).sort((first, second) => activityDateValue(second.lastActivityAt ?? second.updatedAt) - activityDateValue(first.lastActivityAt ?? first.updatedAt));
  const peopleById = new Map(people.map((person) => [person.id, person.name]));
  const meetings = [
    ...meetingRows.map((meeting) => {
      const conversationFlowKey = normalizeConversationFlowKey(meeting.conversation_flow_key);

      return {
        date: latestActivityDate(meeting.table_date, meeting.updated_at, meeting.created_at),
        conversationFlowKey,
        conversationResponses: normalizeConversationResponses(conversationFlowKey, meeting.conversation_responses),
        fieldPersonIds: meeting.field_person_ids ?? [],
        id: meeting.id,
        notes: meeting.notes,
        participantNames: meeting.participant_names ?? [],
        recommendedResources: normalizeRecommendedResources(meeting.recommended_resources),
        review: meetingReviewSummary(meeting.id, reviewLinkByMeetingId, meetingReviewByMeetingId),
        source: "table" as const,
        title: "Meeting",
        type: mapMeetingType(meeting.table_type),
        updatedAt: meeting.updated_at,
      };
    }),
    ...connectionRows.map((connection) => ({
      date: latestActivityDate(connection.connection_date, connection.updated_at, connection.created_at),
      conversationFlowKey: "none" as const,
      conversationResponses: {},
      fieldPersonIds: connection.field_person_id ? [connection.field_person_id] : [],
      id: `connection-${connection.id}`,
      notes: connection.notes,
      participantNames: connection.field_person_id && peopleById.has(connection.field_person_id)
        ? [peopleById.get(connection.field_person_id) as string]
        : [],
      recommendedResources: [],
      review: emptyReviewSummary(),
      source: "connection" as const,
      title: connection.interaction_type ?? "Connection",
      type: mapConnectionType(connection.interaction_type),
      updatedAt: connection.updated_at,
    })),
  ].sort((first, second) => activityDateValue(second.date ?? second.updatedAt) - activityDateValue(first.date ?? first.updatedAt));
  const fruit = ((fruitResult.data ?? []) as FruitRow[]).map((item) => ({
    fieldPersonId: item.field_person_id,
    id: item.id,
    outcomeTags: mapOutcomeTags(item.outcome_tags),
    permissionToShare: item.permission_to_share === true,
    sourceApp: item.source_app ?? null,
    status: item.cc_status ?? "draft",
    submittedByName: item.submitted_by_name ?? null,
    summary: item.body,
    tableId: item.table_id ?? null,
    testimonyDate: item.testimony_date,
    updatedAt: item.updated_at,
  }));
  const leaderReflections = reviewsFruitResult.leaderReflections.map((reflection) => ({
    createdAt: reflection.created_at,
    followUpNeeded: reflection.follow_up_needed === true,
    id: reflection.id,
    meetingId: reflection.meeting_id,
    nextStep: reflection.next_step,
    observedFruit: mapObservedFruit(reflection.observed_fruit),
    personId: reflection.person_id,
    prayerNeeds: reflection.prayer_needs,
    privateNotes: reflection.private_notes,
    spiritualOpenness: reflection.spiritual_openness,
    whatHappened: reflection.what_happened,
  }));
  const participantReviews = reviewsFruitResult.participantReviews.map((review) => ({
    comments: review.comments,
    conversationHelpful: review.conversation_helpful,
    feltCaredFor: review.felt_cared_for,
    feltHeard: review.felt_heard,
    id: review.id,
    meetingId: review.meeting_id,
    personId: review.person_id,
    submittedAt: review.submitted_at,
    wouldMeetAgain: review.would_meet_again,
  }));
  const participantTestimonies = reviewsFruitResult.participantTestimonies.map((testimony) => ({
    decisionMade: testimony.decision_made,
    id: testimony.id,
    meetingId: testimony.meeting_id,
    nextStep: testimony.next_step,
    permissionToShare: testimony.permission_to_share === true,
    personId: testimony.person_id,
    publicDisplayName: testimony.public_display_name,
    story: testimony.story,
    submittedAt: testimony.submitted_at,
    whatChanged: testimony.what_changed,
  }));
  const fruitEvents = reviewsFruitResult.fruitEvents.map((fruitEvent) => ({
    confidenceLevel: mapConfidenceLevel(fruitEvent.confidence_level),
    date: fruitEvent.occurred_at,
    debugContext: mapDebugContext(fruitEvent.debug_context),
    description: fruitEvent.description,
    fruitType: fruitEvent.fruit_type,
    generatedBy: fruitEvent.generated_by ?? null,
    generationKey: fruitEvent.generation_key ?? null,
    id: fruitEvent.id,
    meetingId: fruitEvent.meeting_id,
    personId: fruitEvent.person_id,
    sourceId: fruitEvent.source_id ?? null,
    sourceType: mapFruitSourceType(fruitEvent.source_type),
    title: fruitEvent.title,
    visibility: mapVisibility(fruitEvent.visibility),
  })).sort((first, second) => activityDateValue(second.date) - activityDateValue(first.date));

  return {
    data: {
      circles: await loadFreshCircleData(workspace.id, people, meetings),
      fruit,
      fruitEvents,
      leaderReflections,
      meetings,
      participantReviews,
      participantTestimonies,
      people,
      stats: {
        approvedFruit: fruit.filter((item) => item.status === "approved").length,
        connectionsCount: connectionRows.length,
        fruitCount: fruit.length,
        meetingsCount: meetings.length,
        peopleCount: people.length,
      },
      workspace: {
        displayName: workspace.display_name,
        id: workspace.id,
        isUsamWorkspace: isUsamKitchenTableGospelWorkspace({ publicProfileHref: `/missionaries/${workspace.slug}`, slug: workspace.slug }),
        profileImageUrl: workspace.profile_image_url,
        publicProfileHref: `/missionaries/${workspace.slug}`,
        shortMission: workspace.short_mission,
        slug: workspace.slug,
      },
    },
    status: "ready",
  };
}

export async function resolveDosAppWorkspaceId(workspaceId: string) {
  const workspace = await resolveDosAppWorkspace(workspaceId);

  return workspace?.id ?? null;
}

export async function resolveDosAppWorkspace(workspaceId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("missionary_households")
    .select("id, slug, display_name")
    .eq("id", workspaceId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as Pick<HouseholdRow, "display_name" | "id" | "slug">;
}
