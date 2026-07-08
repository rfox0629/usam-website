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
import {
  normalizeRelationshipType,
  relationshipModelCounts,
  relationshipModelFromFields,
  type DiscipleshipStageValue,
  type DosRelationshipModelCounts,
  type RelationshipContextValue,
  type RoleInMyLifeValue,
} from "@/src/lib/dos/relationship-model";
import { dosExperienceReviewTypes } from "@/src/lib/dos/review-types";
import { googleCalendarReconnectMessage, isGoogleCalendarConfigured, type GoogleCalendarConnectionHealthStatus } from "@/src/lib/dos/google-calendar";
import { loadUsamApplicationForWorkspace, type DosUsamOrganizationApplication } from "@/src/lib/dos/usam-application";
import { loadTableInvitationsForWorkspace } from "@/src/lib/dos/table-invitation-data";
import type { DosTableInvitation } from "@/src/lib/dos/table-invitations";
import type { DosAuthorizedUser } from "@/src/lib/dos/auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;
type SupabaseQueryError = { message?: string } | null | undefined;

function cleanOptionalText(value: string | null | undefined) {
  const text = value?.trim();

  return text ? text : null;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function normalizedPhone(value: string | null | undefined) {
  const digits = value?.replace(/\D/g, "") ?? "";

  return digits.length >= 7 ? digits : null;
}

function isMissingColumnError(error: SupabaseQueryError) {
  const message = error?.message?.toLowerCase() ?? "";

  return message.includes("column") && message.includes("does not exist");
}

export const dosAppMeetingTypes = ["kitchen_table", "coffee", "phone", "zoom", "text", "prayer", "group", "discipleship", "other"] as const;
export const dosAppOutcomeTags = [
  "Reconciliation",
  "New Believers",
  "Marriage Restoration",
  "Baptized",
  "Discipling",
  "Started Discipling Others",
  "Answered Prayer",
  "Felt encouraged",
  "Gospel Conversation",
  "Prayer Received",
  "Church Connection",
  "Testimony Shared",
  "Joined Discipleship",
  "Bible Study Started",
  "Prayer Request",
  "Church Visit",
  "Serving",
  "Disciple Maker",
  "Salvation",
  "Re Dedication",
  "Rededication",
  "Baptism",
  "Joined Church",
  "Shared Testimony",
  "New Believer",
  "Marketplace Ministry",
  "Freedom / Deliverance",
  "Repentance",
  "Ongoing Accountability",
] as const;
export const dosAppLegacyOutcomeTags = ["Healing", "Deliverance", "Church Connection", "Discipleship", "Prayer Answered", "Other"] as const;
export const dosAppFruitTypeOptions = dosAppOutcomeTags;

export type DosAppMeetingType = typeof dosAppMeetingTypes[number];
export type DosAppOutcomeTag = typeof dosAppOutcomeTags[number] | typeof dosAppLegacyOutcomeTags[number];
export type DosAppFieldVisibility = "hidden" | "primary" | "secondary";
export type DosAppReviewStatus = "approved" | "not_sent" | "pending" | "private" | "submitted";
export type DosMinistryEventRole = "ministry_team" | "participant" | "recorder" | "supporting_attendee";
export type DosSupportingAttendeeSubRole = "child_present" | "contributor" | "learning" | "observer" | "support";

export type DosAppWorkspace = {
  displayName: string;
  greetingName?: string | null;
  id: string;
  isPreview?: boolean;
  isUsamWorkspace: boolean;
  organizationName?: string | null;
  profileImageUrl: string | null;
  publicProfileHref: string;
  shortMission: string | null;
  showPrayerTeamCount: boolean;
  slug: string;
  stateName?: string | null;
  userEmail?: string | null;
  userFullName?: string | null;
  userPhone?: string | null;
};

export type DosAppHouseholdMember = {
  displayName: string;
  id: string;
  inviteEmail: string | null;
  isPublic: boolean;
  linked: boolean;
  relationship: string | null;
  roleTitle: string | null;
  status: string;
};

export type DosAppPerson = {
  childrenNames?: string | null;
  church: string | null;
  createdAt: string | null;
  discipleshipStage: DiscipleshipStageValue;
  rawDiscipleshipStage?: string | null;
  email: string | null;
  engagementLevel: string | null;
  fieldVisibility: DosAppFieldVisibility;
  householdNotes?: string | null;
  id: string;
  lastActivityAt: string | null;
  name: string;
  notes: string | null;
  phone: string;
  relationshipContext: RelationshipContextValue;
  relationshipType: string | null;
  roleInMyLife: RoleInMyLifeValue;
  spouseName?: string | null;
  status: string;
  updatedAt: string | null;
};

export type DosAppMinistryEventPerson = {
  displayName: string;
  fieldPersonId: string | null;
  id: string;
  role: DosMinistryEventRole;
  supportingSubRole: DosSupportingAttendeeSubRole | null;
  teamMemberId: string | null;
  userId: string | null;
};

export type DosAppMeeting = {
  conversationFlowKey: DosConversationFlowKey;
  conversationResponses: DosConversationResponses;
  date: string | null;
  fieldPersonIds: string[];
  followUpNeeded?: boolean | string | null;
  googleSyncEnabled: boolean;
  googleSyncStatus?: "failed" | "pending" | "synced" | null;
  id: string;
  meetingStatus: "canceled" | "logged" | "scheduled";
  ministryEventId: string | null;
  ministryTeam: DosAppMinistryEventPerson[];
  movementStep?: string | null;
  notes: string | null;
  participantNames: string[];
  participants: DosAppMinistryEventPerson[];
  recommendedResources: DosRecommendedResource[];
  recorder: DosAppMinistryEventPerson | null;
  review: {
    sharePermission: string | null;
    status: DosAppReviewStatus;
    stoodOut: string | null;
    submittedAt: string | null;
    submittedName: string | null;
    token: string | null;
  };
  source: "connection" | "table";
  scheduledEndAt: string | null;
  scheduledStartAt: string | null;
  supportingAttendees: DosAppMinistryEventPerson[];
  timezone: string | null;
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
  outcomeTags: string[];
  personId: string | null;
  status: "draft" | "submitted" | "reviewed" | "approved" | "hidden";
  submittedAt: string | null;
  wouldMeetAgain: boolean | null;
  wouldMeetAgainResponse: string | null;
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
  status: "draft" | "submitted" | "reviewed" | "approved" | "hidden";
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
  status: "draft" | "submitted" | "reviewed" | "approved" | "hidden";
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

export type DosAppAssessmentCategoryScore = {
  husbandScore?: number | null;
  maxScore: number;
  name: string;
  percentage: number;
  score: number;
  wifeScore?: number | null;
};

export type DosAppAssessmentResult = {
  answers: Record<string, unknown>;
  assessmentTitle: string;
  assessmentType: string;
  categoryScores: DosAppAssessmentCategoryScore[];
  completedAt: string | null;
  completedByEmail: string | null;
  completedByName: string | null;
  id: string;
  maxScore: number;
  overallScore: number;
  percentage: number;
  personId: string | null;
  secondaryPersonId: string | null;
  source: "missionary" | "self" | "sent_link";
  workspaceId: string;
};

export type DosAppPrayerLog = {
  createdAt: string | null;
  fieldPersonId: string | null;
  id: string;
  note: string | null;
  prayedAt: string | null;
  prayedByUserId: string | null;
  prayerRequestId: string | null;
  workspaceId: string;
};

export type DosAppPrayerPartner = {
  city: string | null;
  email: string | null;
  fieldPersonId: string | null;
  howHeard: string | null;
  id: string;
  joinedAt: string | null;
  name: string;
  notes: string | null;
  phone: string | null;
  prayerTeam: string;
  region: string | null;
  relationshipContext: RelationshipContextValue;
  source: string;
  state: string | null;
  status: string;
  updatedAt: string | null;
};

export type DosAppPrayerRequest = {
  answerTestimony: string | null;
  answeredAt: string | null;
  category: string | null;
  createdAt: string;
  fieldPersonId: string | null;
  id: string;
  linkedPersonIds: string[];
  personTags: string[];
  request: string;
  source: string | null;
  status: "answered" | "archived" | "covered" | "open";
  title: string;
  updatedAt: string | null;
  urgency: "important" | "normal" | "urgent";
  visibility: "private" | "public" | "team";
  workspaceId: string;
};

export type DosAppCalendarConnection = {
  calendarId: string | null;
  connected: boolean;
  connectedAt: string | null;
  googleAccountEmail: string | null;
  googleConfigured: boolean;
  lastSyncedAt: string | null;
  status?: GoogleCalendarConnectionHealthStatus;
  statusMessage?: string | null;
};

export type DosAppOrganizationConnection = {
  id: string;
  name: string;
  profileStatus?: string | null;
  publicProfileHref?: string | null;
  publicProfileLive?: boolean;
  slug: string | null;
  status: string;
  type: "church" | "independent" | "ministry" | "other" | "usam";
};

export type DosAppExternalCalendarEvent = {
  allDay: boolean;
  calendarSourceId: string | null;
  description: string | null;
  endAt: string | null;
  externalCalendarId: string;
  externalEventId: string;
  htmlLink: string | null;
  iCalUid: string | null;
  id: string;
  importedMeetingId: string | null;
  location: string | null;
  sourceName: string | null;
  startAt: string | null;
  timezone: string | null;
  title: string;
};

export type DosAppRelationshipReminder = {
  googleSyncEnabled: boolean;
  googleSyncStatus?: "failed" | "pending" | "synced" | null;
  id: string;
  notes: string | null;
  personId: string;
  recurrence: "monthly" | "none" | "weekly" | "yearly";
  reminderDate: string;
  reminderType: "anniversary" | "baptism" | "birthday" | "custom" | "follow_up" | "prayer" | "salvation";
  title: string | null;
  updatedAt: string | null;
};

export type DosAppData = {
  assessmentResults: DosAppAssessmentResult[];
  calendarConnection: DosAppCalendarConnection;
  circles: DosCircleData | null;
  externalCalendarEvents: DosAppExternalCalendarEvent[];
  fruit: DosAppFruit[];
  fruitEvents: DosAppFruitEvent[];
  householdMembers: DosAppHouseholdMember[];
  leaderReflections: DosAppLeaderReflection[];
  meetings: DosAppMeeting[];
  organizations: DosAppOrganizationConnection[];
  participantReviews: DosAppParticipantReview[];
  participantTestimonies: DosAppParticipantTestimony[];
  people: DosAppPerson[];
  prayerLogs: DosAppPrayerLog[];
  prayerPartners: DosAppPrayerPartner[];
  prayerRequests: DosAppPrayerRequest[];
  reminders: DosAppRelationshipReminder[];
  tableInvitations: DosTableInvitation[];
  usamApplication: DosUsamOrganizationApplication;
  stats: {
    approvedFruit: number;
    connectionsCount: number;
    fruitCount: number;
    meetingsCount: number;
    peopleCount: number;
    relationshipStewardship: DosRelationshipModelCounts;
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
  location?: string | null;
  primary_state?: string | null;
  profile_image_url: string | null;
  public_slug?: string | null;
  public_visible?: boolean | null;
  show_household?: boolean | null;
  show_prayer_team_count?: boolean | null;
  short_mission: string | null;
  slug: string;
  usam_application_id?: string | null;
  usam_application_reviewed_at?: string | null;
  usam_application_status?: string | null;
  usam_application_submitted_at?: string | null;
  usam_assigned_admin_email?: string | null;
  usam_profile_status?: string | null;
};

type HouseholdMemberRow = {
  display_name: string;
  dos_user_id?: string | null;
  id: string;
  invite_email?: string | null;
  is_public?: boolean | null;
  relationship_to_workspace?: string | null;
  role_title: string | null;
  status: string | null;
};

type FieldPersonRow = {
  children_names?: string | null;
  church: string | null;
  created_at: string | null;
  discipleship_stage?: string | null;
  email: string | null;
  engagement_level: string | null;
  field_visibility?: string | null;
  household_notes?: string | null;
  id: string;
  last_activity_at: string | null;
  name: string;
  notes: string | null;
  phone: string;
  relationship_context?: string | null;
  relationship_type: string | null;
  role_in_my_life?: string | null;
  spouse_name?: string | null;
  status: string | null;
  updated_at: string | null;
};

type MeetingRow = {
  conversation_flow_key?: string | null;
  conversation_responses?: unknown;
  created_at?: string | null;
  field_person_ids: string[] | null;
  google_sync_enabled?: boolean | null;
  id: string;
  meeting_status?: string | null;
  ministry_event_id?: string | null;
  notes: string | null;
  participant_names: string[] | null;
  recommended_resources?: unknown;
  recorded_by_display_name?: string | null;
  recorded_by_user_id?: string | null;
  scheduled_end_at?: string | null;
  scheduled_start_at?: string | null;
  table_date: string | null;
  table_type: string | null;
  timezone?: string | null;
  updated_at: string | null;
};

type MinistryEventPersonRow = {
  display_name: string | null;
  field_person_id: string | null;
  id: string;
  ministry_event_id: string;
  role: string;
  supporting_sub_role: string | null;
  team_member_id: string | null;
  user_id: string | null;
};

type MinistryEventSourceRow = {
  id: string;
  source_id: string | null;
  source_table: string | null;
};

type MinistryEventViewerIdentity = {
  fieldPersonIds: string[];
  teamMemberIds: string[];
  userIds: string[];
};

type ConnectionLogRow = {
  connection_date: string | null;
  created_at?: string | null;
  field_person_id: string | null;
  follow_up_needed: boolean | string | null;
  id: string;
  interaction_type: string | null;
  movement_step?: string | null;
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

type AssessmentResultRow = {
  answers: unknown;
  assessment_title: string;
  assessment_type: string;
  category_scores: unknown;
  completed_at: string | null;
  completed_by_email: string | null;
  completed_by_name: string | null;
  id: string;
  max_score: number;
  overall_score: number;
  percentage: number;
  person_id: string | null;
  secondary_person_id: string | null;
  source: string | null;
  workspace_id: string;
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

type PrayerLogRow = {
  created_at: string | null;
  field_person_id: string | null;
  id: string;
  note: string | null;
  prayed_at: string | null;
  prayed_by_user_id: string | null;
  prayer_request_id: string | null;
  workspace_id: string;
};

type PrayerPartnerRow = {
  approved_at?: string | null;
  city: string | null;
  created_at: string | null;
  date_joined: string | null;
  email: string | null;
  field_person_id?: string | null;
  first_name: string | null;
  how_heard: string | null;
  id: string;
  internal_notes: string | null;
  last_name: string | null;
  name: string | null;
  phone: string | null;
  prayer_team?: string | null;
  region: string | null;
  source: string | null;
  state: string | null;
  status: string | null;
  updated_at: string | null;
};

type PrayerRequestRow = {
  answer_testimony?: string | null;
  answered_at?: string | null;
  category: string | null;
  created_at: string;
  field_person_id?: string | null;
  household_id?: string | null;
  id: string;
  linked_person_ids?: string[] | null;
  person_tags?: string[] | null;
  related_household_id?: string | null;
  related_missionary_profile_id?: string | null;
  request?: string | null;
  source?: string | null;
  status: string | null;
  title: string | null;
  updated_at: string | null;
  urgency?: string | null;
  visibility?: string | null;
  workspace_id?: string | null;
};

type CalendarConnectionRow = {
  calendar_id: string | null;
  connected_at: string | null;
  google_account_email: string | null;
};

type CalendarEventLinkRow = {
  last_synced_at: string | null;
  source_id: string;
  source_type: string;
  sync_status: string | null;
};

type CalendarWorkspaceSyncStateRow = {
  last_error: string | null;
};

type RelationshipReminderRow = {
  google_sync_enabled: boolean | null;
  id: string;
  notes: string | null;
  person_id: string;
  recurrence: string | null;
  reminder_date: string;
  reminder_type: string | null;
  title: string | null;
  updated_at: string | null;
};

type ExternalCalendarEventRow = {
  all_day: boolean | null;
  calendar_source_id: string | null;
  calendar_sources?: { name?: string | null } | Array<{ name?: string | null }> | null;
  description: string | null;
  end_at: string | null;
  external_calendar_id: string;
  external_event_id: string;
  html_link: string | null;
  i_cal_uid: string | null;
  id: string;
  imported_dos_source_id: string | null;
  location: string | null;
  start_at: string | null;
  summary: string | null;
  timezone: string | null;
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
  outcome_tags?: string[] | null;
  person_id: string | null;
  status?: string | null;
  submitted_at: string | null;
  would_meet_again: boolean | null;
  would_meet_again_response?: string | null;
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
  status?: string | null;
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
  status?: string | null;
  title: string | null;
  visibility: string | null;
};

const meetingSelect = "id, ministry_event_id, recorded_by_display_name, recorded_by_user_id, table_type, table_date, notes, participant_names, field_person_ids, conversation_flow_key, conversation_responses, recommended_resources, meeting_status, scheduled_start_at, scheduled_end_at, timezone, google_sync_enabled, created_at, updated_at";
const meetingSchedulingSelect = "id, table_type, table_date, notes, participant_names, field_person_ids, conversation_flow_key, conversation_responses, recommended_resources, meeting_status, scheduled_start_at, scheduled_end_at, timezone, google_sync_enabled, created_at, updated_at";
const legacyMeetingSelect = "id, table_type, table_date, notes, participant_names, field_person_ids, conversation_flow_key, conversation_responses, recommended_resources, created_at, updated_at";

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

function mapFieldVisibility(value: string | null | undefined): DosAppFieldVisibility {
  return value === "secondary" || value === "hidden" ? value : "primary";
}

function mapMeetingStatus(value: string | null | undefined): DosAppMeeting["meetingStatus"] {
  return value === "scheduled" || value === "canceled" ? value : "logged";
}

function mapMinistryEventRole(value: string | null | undefined): DosMinistryEventRole | null {
  return value === "ministry_team" || value === "participant" || value === "recorder" || value === "supporting_attendee"
    ? value
    : null;
}

function mapSupportingSubRole(value: string | null | undefined): DosSupportingAttendeeSubRole | null {
  return value === "child_present" || value === "contributor" || value === "learning" || value === "observer" || value === "support"
    ? value
    : null;
}

function mapCalendarSyncStatus(value: string | null | undefined): "failed" | "pending" | "synced" | null {
  return value === "failed" || value === "pending" || value === "synced" ? value : null;
}

function mapReminderType(value: string | null | undefined): DosAppRelationshipReminder["reminderType"] {
  return ["anniversary", "baptism", "birthday", "custom", "follow_up", "prayer", "salvation"].includes(value ?? "")
    ? value as DosAppRelationshipReminder["reminderType"]
    : "custom";
}

function mapReminderRecurrence(value: string | null | undefined): DosAppRelationshipReminder["recurrence"] {
  return value === "yearly" || value === "monthly" || value === "weekly" ? value : "none";
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

function mapModerationStatus(value: string | null | undefined): "draft" | "submitted" | "reviewed" | "approved" | "hidden" {
  return value === "draft" || value === "reviewed" || value === "approved" || value === "hidden" ? value : "submitted";
}

function mapDebugContext(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function mapAssessmentSource(value: string | null): DosAppAssessmentResult["source"] {
  return value === "missionary" || value === "sent_link" ? value : "self";
}

function mapAssessmentCategoryScores(value: unknown): DosAppAssessmentCategoryScore[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const scores: DosAppAssessmentCategoryScore[] = [];

  value.forEach((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return;
    }

    const record = item as Record<string, unknown>;
    const name = typeof record.name === "string" && record.name.trim() ? record.name.trim() : null;
    const score = typeof record.score === "number" ? record.score : null;
    const maxScore = typeof record.maxScore === "number" ? record.maxScore : typeof record.max_score === "number" ? record.max_score : null;
    const scorePercentage = typeof record.percentage === "number" ? record.percentage : null;

    if (!name || score === null || maxScore === null || scorePercentage === null) {
      return;
    }

    scores.push({
      husbandScore: typeof record.husbandScore === "number" ? record.husbandScore : null,
      maxScore,
      name,
      percentage: scorePercentage,
      score,
      wifeScore: typeof record.wifeScore === "number" ? record.wifeScore : null,
    });
  });

  return scores;
}

function mapPrayerRequestStatus(value: string | null | undefined): DosAppPrayerRequest["status"] {
  if (value === "answered" || value === "archived" || value === "covered") {
    return value;
  }

  return "open";
}

function mapPrayerRequestUrgency(value: string | null | undefined): DosAppPrayerRequest["urgency"] {
  if (value === "important" || value === "urgent") {
    return value;
  }

  return "normal";
}

function mapPrayerRequestVisibility(value: string | null | undefined): DosAppPrayerRequest["visibility"] {
  if (value === "public" || value === "team") {
    return value;
  }

  return "private";
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

function prayerPartnerScopeFilter(workspaceId: string, workspaceSlug: string) {
  return [
    `workspace_id.eq.${workspaceId}`,
    `recruited_by_household_id.eq.${workspaceId}`,
    `missionary_profile_id.eq.${workspaceId}`,
    `missionary_profile_slug.eq.${workspaceSlug}`,
    `recruited_by_profile_slug.eq.${workspaceSlug}`,
  ].join(",");
}

function prayerRequestScopeFilter(workspaceId: string) {
  return [
    `workspace_id.eq.${workspaceId}`,
    `household_id.eq.${workspaceId}`,
    `related_household_id.eq.${workspaceId}`,
    `related_missionary_profile_id.eq.${workspaceId}`,
  ].join(",");
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

function isMissingMinistryEventModel(error: SupabaseQueryError) {
  const message = error?.message?.toLowerCase() ?? "";

  return [
    "ministry_events",
    "ministry_event_people",
    "ministry_event_id",
    "recorded_by_user_id",
    "recorded_by_display_name",
  ].some((term) => message.includes(term))
    && (
      message.includes("does not exist")
      || message.includes("schema cache")
      || message.includes("could not find")
      || message.includes("column")
      || message.includes("relation")
    );
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

function isMissingIdentityColumn(error: SupabaseQueryError, columnNames: string[]) {
  const message = error?.message?.toLowerCase() ?? "";

  return columnNames.some((columnName) => message.includes(columnName))
    && (message.includes("schema cache")
      || message.includes("could not find")
      || message.includes("column")
      || message.includes("does not exist"));
}

function activeIdentityIds(rows: Array<{ id: string | null; status?: string | null }>) {
  return uniqueStrings(rows
    .filter((row) => row.id && !["inactive", "archived", "deleted"].includes((row.status ?? "").toLowerCase()))
    .map((row) => row.id));
}

async function loadViewerTeamMemberIds(
  supabase: SupabaseAdminClient,
  viewer: DosAuthorizedUser,
) {
  const rows: Array<{ id: string | null; status?: string | null }> = [];
  const appendRows = (nextRows: Array<{ id: string | null; status?: string | null }> | null | undefined) => {
    rows.push(...(nextRows ?? []));
  };
  const directValues = uniqueStrings([viewer.userId, viewer.email]);

  if (directValues.length) {
    const directResult = await supabase
      .from("missionary_team_members")
      .select("id, status")
      .in("dos_user_id", directValues);

    if (directResult.error) {
      if (!isMissingIdentityColumn(directResult.error, ["dos_user_id"])) {
        return { data: [] as string[], error: directResult.error };
      }
    } else {
      appendRows(directResult.data as Array<{ id: string | null; status?: string | null }>);
    }
  }

  if (viewer.email) {
    const inviteEmailResult = await supabase
      .from("missionary_team_members")
      .select("id, status")
      .ilike("invite_email", viewer.email);

    if (inviteEmailResult.error) {
      if (!isMissingIdentityColumn(inviteEmailResult.error, ["invite_email"])) {
        return { data: [] as string[], error: inviteEmailResult.error };
      }
    } else {
      appendRows(inviteEmailResult.data as Array<{ id: string | null; status?: string | null }>);
    }
  }

  const phone = "phone" in viewer ? normalizedPhone(viewer.phone) : null;

  if (phone) {
    const invitePhoneResult = await supabase
      .from("missionary_team_members")
      .select("id, status")
      .eq("invite_phone_normalized", phone);

    if (invitePhoneResult.error) {
      if (!isMissingIdentityColumn(invitePhoneResult.error, ["invite_phone_normalized", "invite_phone"])) {
        return { data: [] as string[], error: invitePhoneResult.error };
      }
    } else {
      appendRows(invitePhoneResult.data as Array<{ id: string | null; status?: string | null }>);
    }
  }

  return { data: activeIdentityIds(rows), error: null };
}

async function loadViewerFieldPersonIds(
  supabase: SupabaseAdminClient,
  viewer: DosAuthorizedUser,
) {
  const rows: Array<{ id: string | null; status?: string | null }> = [];
  const appendRows = (nextRows: Array<{ id: string | null; status?: string | null }> | null | undefined) => {
    rows.push(...(nextRows ?? []));
  };

  if (viewer.email) {
    const emailResult = await supabase
      .from("missionary_field_people")
      .select("id, status")
      .ilike("email", viewer.email)
      .limit(200);

    if (emailResult.error) {
      if (!isMissingIdentityColumn(emailResult.error, ["email"])) {
        return { data: [] as string[], error: emailResult.error };
      }
    } else {
      appendRows(emailResult.data as Array<{ id: string | null; status?: string | null }>);
    }
  }

  const rawPhone = "phone" in viewer ? cleanOptionalText(viewer.phone) : null;
  const phoneValues = uniqueStrings([rawPhone, normalizedPhone(rawPhone)]);

  if (phoneValues.length) {
    const phoneResult = await supabase
      .from("missionary_field_people")
      .select("id, status")
      .in("phone", phoneValues)
      .limit(200);

    if (phoneResult.error) {
      if (!isMissingIdentityColumn(phoneResult.error, ["phone"])) {
        return { data: [] as string[], error: phoneResult.error };
      }
    } else {
      appendRows(phoneResult.data as Array<{ id: string | null; status?: string | null }>);
    }
  }

  return { data: activeIdentityIds(rows), error: null };
}

async function loadMinistryEventViewerIdentity(
  supabase: SupabaseAdminClient,
  viewer?: DosAuthorizedUser | null,
) {
  if (!viewer) {
    return {
      data: { fieldPersonIds: [], teamMemberIds: [], userIds: [] } satisfies MinistryEventViewerIdentity,
      error: null,
    };
  }

  const [teamMemberResult, fieldPersonResult] = await Promise.all([
    loadViewerTeamMemberIds(supabase, viewer),
    loadViewerFieldPersonIds(supabase, viewer),
  ]);

  return {
    data: {
      fieldPersonIds: fieldPersonResult.data,
      teamMemberIds: teamMemberResult.data,
      userIds: uniqueStrings([viewer.userId]),
    } satisfies MinistryEventViewerIdentity,
    error: teamMemberResult.error ?? fieldPersonResult.error,
  };
}

function ministryEventPersonIdentityFilter(identity: MinistryEventViewerIdentity) {
  return [
    ...identity.userIds.map((userId) => `user_id.eq.${userId}`),
    identity.teamMemberIds.length ? `team_member_id.in.(${identity.teamMemberIds.join(",")})` : "",
    identity.fieldPersonIds.length ? `field_person_id.in.(${identity.fieldPersonIds.join(",")})` : "",
  ].filter(Boolean).join(",");
}

async function loadRoleVisibleMinistryEventIds(
  supabase: SupabaseAdminClient,
  identity: MinistryEventViewerIdentity,
) {
  const identityFilter = ministryEventPersonIdentityFilter(identity);

  if (!identityFilter) {
    return { data: [] as string[], error: null };
  }

  const result = await supabase
    .from("ministry_event_people")
    .select("ministry_event_id")
    .in("role", ["ministry_team", "participant", "supporting_attendee"])
    .or(identityFilter)
    .limit(1000);

  if (result.error) {
    return isMissingMinistryEventModel(result.error)
      ? { data: [] as string[], error: null }
      : { data: [] as string[], error: result.error };
  }

  return {
    data: uniqueStrings(((result.data ?? []) as Array<{ ministry_event_id: string | null }>).map((row) => row.ministry_event_id)),
    error: null,
  };
}

async function loadMinistryEventSourceRows(supabase: SupabaseAdminClient, eventIds: string[]) {
  if (!eventIds.length) {
    return { data: [] as MinistryEventSourceRow[], error: null };
  }

  const result = await supabase
    .from("ministry_events")
    .select("id, source_table, source_id")
    .in("id", eventIds)
    .eq("source_table", "missionary_tables");

  return result.error && isMissingMinistryEventModel(result.error)
    ? { data: [] as MinistryEventSourceRow[], error: null }
    : result;
}

function meetingVisibilityKey(meeting: { id: string; ministry_event_id?: string | null }) {
  return meeting.ministry_event_id ? `event:${meeting.ministry_event_id}` : `table:${meeting.id}`;
}

export function mergeDosMeetingRowsForVisibility<T extends { id: string; ministry_event_id?: string | null }>(
  workspaceRows: T[],
  roleVisibleRows: T[],
) {
  const rowsByKey = new Map<string, T>();

  [...workspaceRows, ...roleVisibleRows].forEach((row) => {
    const key = meetingVisibilityKey(row);

    if (!rowsByKey.has(key)) {
      rowsByKey.set(key, row);
    }
  });

  return Array.from(rowsByKey.values());
}

function sortMeetingRows(rows: MeetingRow[]) {
  return rows.sort((first, second) => {
    const firstDate = latestActivityDate(first.table_date, first.updated_at, first.created_at);
    const secondDate = latestActivityDate(second.table_date, second.updated_at, second.created_at);

    return activityDateValue(secondDate) - activityDateValue(firstDate);
  });
}

async function loadPeopleForWorkspace(supabase: SupabaseAdminClient, workspaceId: string) {
  const personSelect = "id, name, phone, email, church, notes, status, relationship_type, relationship_context, role_in_my_life, discipleship_stage, engagement_level, field_visibility, spouse_name, children_names, household_notes, last_activity_at, created_at, updated_at";
  const relationshipCompatiblePersonSelect = "id, name, phone, email, church, notes, status, relationship_type, engagement_level, field_visibility, spouse_name, children_names, household_notes, last_activity_at, created_at, updated_at";
  const householdCompatiblePersonSelect = "id, name, phone, email, church, notes, status, relationship_type, relationship_context, role_in_my_life, discipleship_stage, engagement_level, field_visibility, last_activity_at, created_at, updated_at";
  const legacyPersonSelect = "id, name, phone, email, church, notes, status, relationship_type, engagement_level, last_activity_at, created_at, updated_at";
  const scopedResult = await supabase
    .from("missionary_field_people")
    .select(personSelect)
    .or(workspaceScopeFilter(workspaceId))
    .order("last_activity_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false });

  if (scopedResult.error && isMissingColumnError(scopedResult.error) && !isMissingWorkspaceScopeColumn(scopedResult.error)) {
    const relationshipCompatibleResult = await supabase
      .from("missionary_field_people")
      .select(relationshipCompatiblePersonSelect)
      .or(workspaceScopeFilter(workspaceId))
      .order("last_activity_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false });

    if (!relationshipCompatibleResult.error) {
      return relationshipCompatibleResult;
    }

    const householdCompatibleResult = await supabase
      .from("missionary_field_people")
      .select(householdCompatiblePersonSelect)
      .or(workspaceScopeFilter(workspaceId))
      .order("last_activity_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false });

    if (!householdCompatibleResult.error) {
      return householdCompatibleResult;
    }

    const legacyScopedResult = await supabase
      .from("missionary_field_people")
      .select(legacyPersonSelect)
      .or(workspaceScopeFilter(workspaceId))
      .order("last_activity_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false });

    if (!legacyScopedResult.error) {
      return legacyScopedResult;
    }
  }

  // TODO: Remove the household_id-only fallback after all Supabase environments
  // have the Command Center workspace_id migration applied.
  if (scopedResult.error && (isMissingWorkspaceScopeColumn(scopedResult.error) || isMissingColumnError(scopedResult.error))) {
    return supabase
      .from("missionary_field_people")
      .select(legacyPersonSelect)
      .eq("household_id", workspaceId)
      .order("last_activity_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false });
  }

  return scopedResult;
}

async function loadWorkspaceScopedMeetingsForWorkspace(supabase: SupabaseAdminClient, workspaceId: string) {
  const scopedResult = await supabase
    .from("missionary_tables")
    .select(meetingSelect)
    .or(workspaceScopeFilter(workspaceId))
    .order("table_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (scopedResult.error && isMissingColumnError(scopedResult.error) && !isMissingWorkspaceScopeColumn(scopedResult.error)) {
    const schedulingCompatibleResult = await supabase
      .from("missionary_tables")
      .select(meetingSchedulingSelect)
      .or(workspaceScopeFilter(workspaceId))
      .order("table_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (!schedulingCompatibleResult.error || !isMissingColumnError(schedulingCompatibleResult.error)) {
      return schedulingCompatibleResult;
    }

    return supabase
      .from("missionary_tables")
      .select(legacyMeetingSelect)
      .or(workspaceScopeFilter(workspaceId))
      .order("table_date", { ascending: false })
      .order("created_at", { ascending: false });
  }

  if (scopedResult.error && isMissingMinistryEventModel(scopedResult.error)) {
    const legacyScopedResult = await supabase
      .from("missionary_tables")
      .select(meetingSchedulingSelect)
      .eq("workspace_id", workspaceId)
      .order("table_date", { ascending: false })
      .order("created_at", { ascending: false });

    const schedulingCompatibleResult = legacyScopedResult.error && isMissingWorkspaceScopeColumn(legacyScopedResult.error)
      ? await supabase
        .from("missionary_tables")
        .select(meetingSchedulingSelect)
        .eq("household_id", workspaceId)
        .order("table_date", { ascending: false })
        .order("created_at", { ascending: false })
      : legacyScopedResult;

    if (!schedulingCompatibleResult.error || !isMissingColumnError(schedulingCompatibleResult.error)) {
      return schedulingCompatibleResult;
    }

    const legacySchedulingResult = await supabase
      .from("missionary_tables")
      .select(legacyMeetingSelect)
      .eq("workspace_id", workspaceId)
      .order("table_date", { ascending: false })
      .order("created_at", { ascending: false });

    return legacySchedulingResult.error && isMissingWorkspaceScopeColumn(legacySchedulingResult.error)
      ? supabase
        .from("missionary_tables")
        .select(legacyMeetingSelect)
        .eq("household_id", workspaceId)
        .order("table_date", { ascending: false })
        .order("created_at", { ascending: false })
      : legacySchedulingResult;
  }

  if (scopedResult.error && isMissingWorkspaceScopeColumn(scopedResult.error)) {
    if (isMissingColumnError(scopedResult.error)) {
      return supabase
        .from("missionary_tables")
        .select(legacyMeetingSelect)
        .eq("household_id", workspaceId)
        .order("table_date", { ascending: false })
        .order("created_at", { ascending: false });
    }

    return supabase
      .from("missionary_tables")
      .select(meetingSelect)
      .eq("household_id", workspaceId)
      .order("table_date", { ascending: false })
      .order("created_at", { ascending: false });
  }

  return scopedResult;
}

async function loadRoleVisibleMeetingsForViewer(
  supabase: SupabaseAdminClient,
  viewer?: DosAuthorizedUser | null,
) {
  const identityResult = await loadMinistryEventViewerIdentity(supabase, viewer);

  if (identityResult.error) {
    return { data: [] as MeetingRow[], error: identityResult.error };
  }

  const eventIdsResult = await loadRoleVisibleMinistryEventIds(supabase, identityResult.data);

  if (eventIdsResult.error) {
    return { data: [] as MeetingRow[], error: eventIdsResult.error };
  }

  const sourceRowsResult = await loadMinistryEventSourceRows(supabase, eventIdsResult.data);

  if (sourceRowsResult.error) {
    return { data: [] as MeetingRow[], error: sourceRowsResult.error };
  }

  const tableIds = uniqueStrings(((sourceRowsResult.data ?? []) as MinistryEventSourceRow[]).map((row) => row.source_id));

  if (!tableIds.length) {
    return { data: [] as MeetingRow[], error: null };
  }

  const result = await supabase
    .from("missionary_tables")
    .select(meetingSelect)
    .in("id", tableIds)
    .order("table_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (result.error && isMissingColumnError(result.error)) {
    const schedulingCompatibleResult = await supabase
      .from("missionary_tables")
      .select(meetingSchedulingSelect)
      .in("id", tableIds)
      .order("table_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (!schedulingCompatibleResult.error || !isMissingColumnError(schedulingCompatibleResult.error)) {
      return schedulingCompatibleResult;
    }

    return supabase
      .from("missionary_tables")
      .select(legacyMeetingSelect)
      .in("id", tableIds)
      .order("table_date", { ascending: false })
      .order("created_at", { ascending: false });
  }

  return result;
}

async function loadMeetingsForWorkspace(
  supabase: SupabaseAdminClient,
  workspaceId: string,
  viewer?: DosAuthorizedUser | null,
) {
  const workspaceResult = await loadWorkspaceScopedMeetingsForWorkspace(supabase, workspaceId);

  if (workspaceResult.error) {
    return workspaceResult;
  }

  const roleVisibleResult = await loadRoleVisibleMeetingsForViewer(supabase, viewer);

  if (roleVisibleResult.error) {
    return roleVisibleResult;
  }

  return {
    data: sortMeetingRows(mergeDosMeetingRowsForVisibility(
      (workspaceResult.data ?? []) as MeetingRow[],
      (roleVisibleResult.data ?? []) as MeetingRow[],
    )),
    error: null,
  };
}

async function loadMinistryEventPeopleForMeetings(
  supabase: SupabaseAdminClient,
  meetingRows: MeetingRow[],
) {
  const eventIds = Array.from(new Set(meetingRows.map((meeting) => meeting.ministry_event_id).filter((id): id is string => Boolean(id))));

  if (!eventIds.length) {
    return { data: [] as MinistryEventPersonRow[], error: null };
  }

  const result = await supabase
    .from("ministry_event_people")
    .select("id, ministry_event_id, role, supporting_sub_role, field_person_id, team_member_id, user_id, display_name")
    .in("ministry_event_id", eventIds);

  return result.error && isMissingMinistryEventModel(result.error)
    ? { data: [] as MinistryEventPersonRow[], error: null }
    : result;
}

async function loadConnectionLogsForWorkspace(supabase: SupabaseAdminClient, workspaceId: string) {
  const connectionSelect = "id, field_person_id, connection_date, interaction_type, notes, follow_up_needed, movement_step, created_at, updated_at";
  const legacyConnectionSelect = "id, field_person_id, connection_date, interaction_type, notes, follow_up_needed, created_at, updated_at";
  const scopedResult = await supabase
    .from("missionary_connection_logs")
    .select(connectionSelect)
    .or(workspaceScopeFilter(workspaceId))
    .order("connection_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (scopedResult.error && isMissingColumnError(scopedResult.error) && !isMissingWorkspaceScopeColumn(scopedResult.error)) {
    const legacyScopedResult = await supabase
      .from("missionary_connection_logs")
      .select(legacyConnectionSelect)
      .or(workspaceScopeFilter(workspaceId))
      .order("connection_date", { ascending: false })
      .order("created_at", { ascending: false });

    return legacyScopedResult.error && isMissingWorkspaceScopeColumn(legacyScopedResult.error)
      ? supabase
        .from("missionary_connection_logs")
        .select(legacyConnectionSelect)
        .eq("household_id", workspaceId)
        .order("connection_date", { ascending: false })
        .order("created_at", { ascending: false })
      : legacyScopedResult;
  }

  const result = scopedResult.error && isMissingWorkspaceScopeColumn(scopedResult.error)
    ? await supabase
      .from("missionary_connection_logs")
      .select(connectionSelect)
      .eq("household_id", workspaceId)
      .order("connection_date", { ascending: false })
      .order("created_at", { ascending: false })
    : scopedResult;

  if (result.error && isMissingColumnError(result.error)) {
    return supabase
      .from("missionary_connection_logs")
      .select(legacyConnectionSelect)
      .eq("household_id", workspaceId)
      .order("connection_date", { ascending: false })
      .order("created_at", { ascending: false });
  }

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

async function loadAssessmentResultsForWorkspace(supabase: SupabaseAdminClient, workspaceId: string) {
  const result = await supabase
    .from("dos_assessment_results")
    .select("id, workspace_id, person_id, secondary_person_id, assessment_type, assessment_title, completed_at, completed_by_name, completed_by_email, overall_score, max_score, percentage, category_scores, answers, source")
    .eq("workspace_id", workspaceId)
    .order("completed_at", { ascending: false });

  return result.error && isMissingWorkflowTable(result.error, "dos_assessment_results")
    ? { data: [] as AssessmentResultRow[], error: null }
    : result;
}

async function loadReviewLinksForWorkspace(supabase: SupabaseAdminClient, workspaceId: string) {
  const result = await supabase
    .from("dos_review_links")
    .select("meeting_id, token, used_at, created_at")
    .eq("workspace_id", workspaceId)
    .in("review_type", [...dosExperienceReviewTypes])
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
    .in("review_type", [...dosExperienceReviewTypes])
    .order("created_at", { ascending: false });

  return result.error && isMissingWorkflowTable(result.error, "dos_meeting_reviews")
    ? { data: [], error: null }
    : result;
}

async function loadPrayerLogsForWorkspace(supabase: SupabaseAdminClient, workspaceId: string) {
  const result = await supabase
    .from("prayer_logs")
    .select("id, workspace_id, prayer_request_id, field_person_id, prayed_at, note, prayed_by_user_id, created_at")
    .eq("workspace_id", workspaceId)
    .order("prayed_at", { ascending: false });

  return result.error && isMissingWorkflowTable(result.error, "prayer_logs")
    ? { data: [], error: null }
    : result;
}

async function loadPrayerPartnersForWorkspace(supabase: SupabaseAdminClient, workspace: Pick<HouseholdRow, "id" | "slug">) {
  const result = await supabase
    .from("prayer_partners")
    .select("id, field_person_id, name, first_name, last_name, email, phone, city, state, region, how_heard, prayer_team, source, status, internal_notes, date_joined, approved_at, created_at, updated_at")
    .or(prayerPartnerScopeFilter(workspace.id, workspace.slug))
    .order("created_at", { ascending: false })
    .limit(80);
  const fallbackResult = result.error && isMissingColumnError(result.error)
    ? await supabase
      .from("prayer_partners")
      .select("id, name, first_name, last_name, email, phone, city, state, region, how_heard, source, status, internal_notes, date_joined, approved_at, created_at, updated_at")
      .or(prayerPartnerScopeFilter(workspace.id, workspace.slug))
      .order("created_at", { ascending: false })
      .limit(80)
    : result;

  return fallbackResult.error && isMissingWorkflowTable(fallbackResult.error, "prayer_partners")
    ? { data: [], error: null }
    : fallbackResult;
}

async function loadPrayerRequestsForWorkspace(supabase: SupabaseAdminClient, workspaceId: string) {
  const result = await supabase
    .from("prayer_requests")
    .select("id, workspace_id, household_id, related_household_id, related_missionary_profile_id, field_person_id, title, request, category, urgency, status, visibility, source, person_tags, linked_person_ids, answered_at, answer_testimony, created_at, updated_at")
    .or(prayerRequestScopeFilter(workspaceId))
    .order("created_at", { ascending: false })
    .limit(80);
  const fallbackResult = result.error && isMissingColumnError(result.error)
    ? await supabase
      .from("prayer_requests")
      .select("id, workspace_id, household_id, related_household_id, field_person_id, title, request, category, urgency, status, visibility, source, answered_at, created_at, updated_at")
      .or(workspaceScopeFilter(workspaceId))
      .order("created_at", { ascending: false })
      .limit(80)
    : result;

  return fallbackResult.error && isMissingWorkflowTable(fallbackResult.error, "prayer_requests")
    ? { data: [], error: null }
    : fallbackResult;
}

async function loadCalendarConnectionForWorkspace(supabase: SupabaseAdminClient, workspaceId: string) {
  const result = await supabase
    .from("connected_calendars")
    .select("google_account_email, calendar_id, connected_at")
    .eq("workspace_id", workspaceId)
    .eq("provider", "google")
    .is("disconnected_at", null)
    .order("connected_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (result.error && isMissingWorkflowTable(result.error, "connected_calendars")) {
    return { data: null, error: null };
  }

  return result;
}

async function loadCalendarEventLinksForWorkspace(supabase: SupabaseAdminClient, workspaceId: string) {
  const result = await supabase
    .from("calendar_event_links")
    .select("source_type, source_id, sync_status, last_synced_at")
    .eq("workspace_id", workspaceId)
    .eq("provider", "google")
    .in("source_type", ["meeting", "reminder", "important_date"]);

  return result.error && isMissingWorkflowTable(result.error, "calendar_event_links")
    ? { data: [], error: null }
    : result;
}

async function loadCalendarWorkspaceSyncStateForWorkspace(supabase: SupabaseAdminClient, workspaceId: string) {
  const result = await supabase
    .from("calendar_sync_cursors")
    .select("last_error")
    .eq("workspace_id", workspaceId)
    .eq("provider", "google")
    .is("calendar_source_id", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return result.error && isMissingWorkflowTable(result.error, "calendar_sync_cursors")
    ? { data: null, error: null }
    : result;
}

function isGoogleCalendarReconnectState(error: string | null | undefined) {
  const normalized = error?.toLowerCase() ?? "";

  return normalized.includes("permission")
    || normalized.includes("scope")
    || normalized.includes("reconnect");
}

async function loadRelationshipRemindersForWorkspace(supabase: SupabaseAdminClient, workspaceId: string) {
  const result = await supabase
    .from("relationship_reminders")
    .select("id, person_id, reminder_type, title, reminder_date, recurrence, notes, google_sync_enabled, updated_at")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .order("reminder_date", { ascending: true });

  return result.error && isMissingWorkflowTable(result.error, "relationship_reminders")
    ? { data: [], error: null }
    : result;
}

async function loadExternalCalendarEventsForWorkspace(supabase: SupabaseAdminClient, workspaceId: string) {
  const start = new Date();
  start.setDate(start.getDate() - 30);
  const end = new Date();
  end.setDate(end.getDate() + 180);
  const result = await supabase
    .from("external_calendar_events")
    .select("id, calendar_source_id, external_calendar_id, external_event_id, i_cal_uid, summary, description, location, html_link, start_at, end_at, all_day, timezone, imported_dos_source_id, calendar_sources(name)")
    .eq("workspace_id", workspaceId)
    .eq("provider", "google")
    .is("deleted_at", null)
    .gte("start_at", start.toISOString())
    .lte("start_at", end.toISOString())
    .order("start_at", { ascending: true });

  return result.error && isMissingWorkflowTable(result.error, "external_calendar_events")
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
        .select("id, meeting_id, person_id, felt_cared_for, felt_heard, conversation_helpful, would_meet_again, would_meet_again_response, outcome_tags, comments, status, submitted_at")
        .in("meeting_id", meetingIds)
        .order("submitted_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    meetingIds.length
      ? supabase
        .from("participant_testimonies")
        .select("id, meeting_id, person_id, story, what_changed, decision_made, next_step, permission_to_share, public_display_name, status, submitted_at")
        .in("meeting_id", meetingIds)
        .order("submitted_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    meetingIds.length
      ? supabase
        .from("fruit_events")
        .select("id, meeting_id, person_id, source_type, source_id, fruit_type, confidence_level, title, description, occurred_at, visibility, status, generation_key, generated_by, debug_context")
        .in("meeting_id", meetingIds)
        .order("occurred_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    personIds.length
      ? supabase
        .from("fruit_events")
        .select("id, meeting_id, person_id, source_type, source_id, fruit_type, confidence_level, title, description, occurred_at, visibility, status, generation_key, generated_by, debug_context")
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
  const baseSelect = "id, slug, display_name, short_mission, profile_image_url, location";
  const identitySelect = `${baseSelect}, public_slug, primary_state, public_visible, show_household, show_prayer_team_count, usam_application_id, usam_application_status, usam_profile_status, usam_application_submitted_at, usam_application_reviewed_at, usam_assigned_admin_email`;
  const runQuery = async (selectColumns: string) => {
    const query = supabase.from("missionary_households").select(selectColumns);

    return workspaceSlug
      ? await query.eq("slug", workspaceSlug).maybeSingle()
      : await query.order("sort_order", { ascending: true }).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  };
  const result = await runQuery(identitySelect);
  const { data, error } = result.error && isMissingColumnError(result.error)
    ? await runQuery(baseSelect)
    : result;

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
    data: data as unknown as HouseholdRow,
    status: "ready",
  };
}

async function loadOrganizationForWorkspace(supabase: SupabaseAdminClient, workspaceSlug: string) {
  const collectiveResult = await supabase
    .from("collectives")
    .select("owner_organization_id")
    .eq("slug", workspaceSlug)
    .maybeSingle();

  if (!collectiveResult.error && collectiveResult.data?.owner_organization_id) {
    const organizationResult = await supabase
      .from("organizations")
      .select("branding_mode, name, slug")
      .eq("id", collectiveResult.data.owner_organization_id)
      .maybeSingle();

    const organizationName = cleanOptionalText(organizationResult.error ? null : organizationResult.data?.name);

    if (organizationName) {
      return {
        brandingMode: organizationResult.data?.branding_mode ?? null,
        name: organizationName,
        slug: organizationResult.data?.slug ?? null,
      };
    }
  }

  const usamOrganizationResult = await supabase
    .from("organizations")
    .select("name")
    .eq("branding_mode", "usam")
    .maybeSingle();

  const fallbackName = cleanOptionalText(usamOrganizationResult.error ? null : usamOrganizationResult.data?.name);

  return fallbackName
    ? {
      brandingMode: "usam",
      name: fallbackName,
      slug: "usa-missionaries",
    }
    : null;
}

function organizationTypeFromBranding(organization: Awaited<ReturnType<typeof loadOrganizationForWorkspace>>): DosAppOrganizationConnection["type"] {
  if (!organization) {
    return "other";
  }

  if (organization.brandingMode === "usam" || organization.slug === "usa-missionaries") {
    return "usam";
  }

  return organization.brandingMode === "affiliate" ? "church" : "ministry";
}

function publicProfileHrefForWorkspace(workspace: Pick<HouseholdRow, "public_slug" | "slug">) {
  return `/missionaries/${workspace.public_slug?.trim() || workspace.slug}`;
}

function buildOrganizationConnections({
  organization,
  usamApplication,
  workspace,
}: {
  organization: Awaited<ReturnType<typeof loadOrganizationForWorkspace>>;
  usamApplication: DosUsamOrganizationApplication;
  workspace: HouseholdRow;
}): DosAppOrganizationConnection[] {
  const connections = new Map<string, DosAppOrganizationConnection>();
  const addConnection = (connection: DosAppOrganizationConnection) => {
    connections.set(connection.slug ?? connection.id, connection);
  };

  addConnection({
    id: "independent",
    name: "Independent DOS",
    profileStatus: null,
    publicProfileHref: null,
    publicProfileLive: false,
    slug: null,
    status: "active",
    type: "independent",
  });

  addConnection({
    id: usamApplication.organizationId ?? "usa-missionaries",
    name: usamApplication.organizationName,
    profileStatus: usamApplication.profileStatus,
    publicProfileHref: usamApplication.publicProfileHref,
    publicProfileLive: usamApplication.publicProfileLive,
    slug: "usa-missionaries",
    status: usamApplication.status,
    type: "usam",
  });

  if (organization?.name && organization.slug !== "usa-missionaries" && organization.brandingMode !== "usam") {
    addConnection({
      id: organization.slug ?? organization.name,
      name: organization.name,
      profileStatus: null,
      publicProfileHref: null,
      publicProfileLive: false,
      slug: organization.slug,
      status: "active",
      type: organizationTypeFromBranding(organization),
    });
  }

  if (workspace.public_visible === true && usamApplication.status === "not_connected") {
    addConnection({
      id: "usa-missionaries",
      name: usamApplication.organizationName,
      profileStatus: usamApplication.profileStatus,
      publicProfileHref: usamApplication.publicProfileHref,
      publicProfileLive: usamApplication.publicProfileLive,
      slug: "usa-missionaries",
      status: "active",
      type: "usam",
    });
  }

  return Array.from(connections.values());
}

async function loadHouseholdMembersForWorkspace(supabase: SupabaseAdminClient, workspaceId: string) {
  const result = await supabase
    .from("missionary_team_members")
    .select("id, display_name, role_title, relationship_to_workspace, invite_email, dos_user_id, is_public, status")
    .eq("household_id", workspaceId)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("display_name", { ascending: true });
  const fallbackResult = result.error && isMissingColumnError(result.error)
    ? await supabase
      .from("missionary_team_members")
      .select("id, display_name, role_title, dos_user_id, is_public, status")
      .eq("household_id", workspaceId)
      .order("display_name", { ascending: true })
    : result;

  if (fallbackResult.error) {
    return { data: [], error: null };
  }

  return fallbackResult;
}

export async function loadDosAppData(
  workspaceSlug?: string | null,
  viewer?: DosAuthorizedUser | null,
): Promise<LoadResult<DosAppData>> {
  const workspaceResult = await loadWorkspace(workspaceSlug);

  if (workspaceResult.status !== "ready") {
    return workspaceResult;
  }

  const workspace = workspaceResult.data;
  const supabase = createSupabaseAdminClient();
  const [peopleResult, meetingsResult, connectionLogsResult, fruitResult, assessmentResultsResult, reviewLinksResult, meetingReviewsResult, prayerLogsResult, prayerPartnersResult, prayerRequestsResult, calendarConnectionResult, calendarEventLinksResult, calendarWorkspaceSyncStateResult, remindersResult, externalCalendarEventsResult, reviewsFruitResult, householdMembersResult, tableInvitationsResult, organization, usamApplication] = await Promise.all([
    loadPeopleForWorkspace(supabase, workspace.id),
    loadMeetingsForWorkspace(supabase, workspace.id, viewer),
    loadConnectionLogsForWorkspace(supabase, workspace.id),
    loadFruitForWorkspace(supabase, workspace.id),
    loadAssessmentResultsForWorkspace(supabase, workspace.id),
    loadReviewLinksForWorkspace(supabase, workspace.id),
    loadMeetingReviewsForWorkspace(supabase, workspace.id),
    loadPrayerLogsForWorkspace(supabase, workspace.id),
    loadPrayerPartnersForWorkspace(supabase, workspace),
    loadPrayerRequestsForWorkspace(supabase, workspace.id),
    loadCalendarConnectionForWorkspace(supabase, workspace.id),
    loadCalendarEventLinksForWorkspace(supabase, workspace.id),
    loadCalendarWorkspaceSyncStateForWorkspace(supabase, workspace.id),
    loadRelationshipRemindersForWorkspace(supabase, workspace.id),
    loadExternalCalendarEventsForWorkspace(supabase, workspace.id),
    loadReviewsFruitFoundationForWorkspace(supabase, workspace.id),
    loadHouseholdMembersForWorkspace(supabase, workspace.id),
    loadTableInvitationsForWorkspace(supabase, workspace.id),
    loadOrganizationForWorkspace(supabase, workspace.slug),
    loadUsamApplicationForWorkspace(supabase, workspace),
  ]);

  if (peopleResult.error || meetingsResult.error || connectionLogsResult.error || fruitResult.error || assessmentResultsResult.error || reviewLinksResult.error || meetingReviewsResult.error || prayerLogsResult.error || prayerPartnersResult.error || prayerRequestsResult.error || calendarConnectionResult.error || calendarEventLinksResult.error || calendarWorkspaceSyncStateResult.error || remindersResult.error || externalCalendarEventsResult.error || reviewsFruitResult.error || tableInvitationsResult.error) {
    return {
      message: peopleResult.error?.message
        ?? meetingsResult.error?.message
        ?? connectionLogsResult.error?.message
        ?? fruitResult.error?.message
        ?? assessmentResultsResult.error?.message
        ?? reviewLinksResult.error?.message
        ?? meetingReviewsResult.error?.message
        ?? prayerLogsResult.error?.message
        ?? prayerPartnersResult.error?.message
        ?? prayerRequestsResult.error?.message
        ?? calendarConnectionResult.error?.message
        ?? calendarEventLinksResult.error?.message
        ?? calendarWorkspaceSyncStateResult.error?.message
        ?? remindersResult.error?.message
        ?? externalCalendarEventsResult.error?.message
        ?? reviewsFruitResult.error?.message
        ?? tableInvitationsResult.error?.message
        ?? "Unable to load DOS app data.",
      status: "error",
    };
  }

  const meetingRows = (meetingsResult.data ?? []) as MeetingRow[];
  const ministryEventPeopleResult = await loadMinistryEventPeopleForMeetings(supabase, meetingRows);

  if (ministryEventPeopleResult.error) {
    return {
      message: ministryEventPeopleResult.error.message ?? "Unable to load ministry event people.",
      status: "error",
    };
  }

  const ministryEventPeopleRows = (ministryEventPeopleResult.data ?? []) as MinistryEventPersonRow[];
  const connectionRows = (connectionLogsResult.data ?? []) as ConnectionLogRow[];
  const assessmentResultRows = (assessmentResultsResult.data ?? []) as AssessmentResultRow[];
  const reviewLinkRows = (reviewLinksResult.data ?? []) as ReviewLinkRow[];
  const meetingReviewRows = (meetingReviewsResult.data ?? []) as MeetingReviewRow[];
  const prayerLogRows = (prayerLogsResult.data ?? []) as PrayerLogRow[];
  const prayerPartnerRows = (prayerPartnersResult.data ?? []) as PrayerPartnerRow[];
  const prayerRequestRows = (prayerRequestsResult.data ?? []) as PrayerRequestRow[];
  const householdMemberRows = (householdMembersResult.data ?? []) as HouseholdMemberRow[];
  const tableInvitations = tableInvitationsResult.data ?? [];
  const calendarConnectionRow = calendarConnectionResult.data as CalendarConnectionRow | null;
  const calendarEventLinkRows = (calendarEventLinksResult.data ?? []) as CalendarEventLinkRow[];
  const calendarWorkspaceSyncStateRow = calendarWorkspaceSyncStateResult.data as CalendarWorkspaceSyncStateRow | null;
  const reminderRows = (remindersResult.data ?? []) as RelationshipReminderRow[];
  const externalCalendarEventRows = (externalCalendarEventsResult.data ?? []) as ExternalCalendarEventRow[];
  const rawPeopleById = new Map(((peopleResult.data ?? []) as FieldPersonRow[]).map((person) => [person.id, person]));
  const householdMemberById = new Map(householdMemberRows.map((member) => [member.id, member]));
  const ministryPeopleByEventId = new Map<string, MinistryEventPersonRow[]>();
  const reviewLinkByMeetingId = new Map<string, ReviewLinkRow>();
  const meetingReviewByMeetingId = new Map<string, MeetingReviewRow>();
  const calendarSyncStatusBySource = new Map<string, "failed" | "pending" | "synced" | null>();
  const latestActivityByPersonId = new Map<string, string>();

  ministryEventPeopleRows.forEach((eventPerson) => {
    const rows = ministryPeopleByEventId.get(eventPerson.ministry_event_id) ?? [];

    rows.push(eventPerson);
    ministryPeopleByEventId.set(eventPerson.ministry_event_id, rows);
  });

  const eventPeopleForMeeting = (meeting: MeetingRow) => (
    meeting.ministry_event_id ? ministryPeopleByEventId.get(meeting.ministry_event_id) ?? [] : []
  );
  const participantIdsForMeeting = (meeting: MeetingRow) => {
    const roleRows = eventPeopleForMeeting(meeting).filter((eventPerson) => eventPerson.role === "participant" && eventPerson.field_person_id);

    return roleRows.length
      ? roleRows.map((eventPerson) => eventPerson.field_person_id as string)
      : meeting.field_person_ids ?? [];
  };
  const mapEventPerson = (eventPerson: MinistryEventPersonRow): DosAppMinistryEventPerson | null => {
    const role = mapMinistryEventRole(eventPerson.role);

    if (!role) {
      return null;
    }

    const personName = eventPerson.field_person_id ? rawPeopleById.get(eventPerson.field_person_id)?.name : null;
    const teamMemberName = eventPerson.team_member_id ? householdMemberById.get(eventPerson.team_member_id)?.display_name : null;
    const displayName = cleanOptionalText(eventPerson.display_name)
      ?? cleanOptionalText(personName)
      ?? cleanOptionalText(teamMemberName)
      ?? "Unknown";

    return {
      displayName,
      fieldPersonId: eventPerson.field_person_id,
      id: eventPerson.id,
      role,
      supportingSubRole: role === "supporting_attendee" ? mapSupportingSubRole(eventPerson.supporting_sub_role) : null,
      teamMemberId: eventPerson.team_member_id,
      userId: eventPerson.user_id,
    };
  };

  calendarEventLinkRows.forEach((link) => {
    calendarSyncStatusBySource.set(`${link.source_type}:${link.source_id}`, mapCalendarSyncStatus(link.sync_status));
  });

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
    if (mapMeetingStatus(meeting.meeting_status) !== "logged") {
      return;
    }

    const activityDate = latestActivityDate(meeting.table_date, meeting.updated_at, meeting.created_at);

    participantIdsForMeeting(meeting).forEach((personId) => {
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

  reviewsFruitResult.participantReviews.forEach((review) => {
    if (!review.person_id) {
      return;
    }

    const activityDate = latestActivityDate(review.submitted_at);
    const currentDate = latestActivityByPersonId.get(review.person_id);
    const latestDate = latestActivityDate(activityDate, currentDate);

    if (latestDate) {
      latestActivityByPersonId.set(review.person_id, latestDate);
    }
  });

  const people = ((peopleResult.data ?? []) as FieldPersonRow[]).map((person) => {
    const relationshipModel = relationshipModelFromFields({
      discipleshipStage: person.discipleship_stage,
      engagementLevel: person.engagement_level,
      relationshipContext: person.relationship_context,
      relationshipType: person.relationship_type,
      roleInMyLife: person.role_in_my_life,
      status: person.status,
    });

    return {
      childrenNames: person.children_names ?? null,
      church: person.church,
      createdAt: person.created_at,
      discipleshipStage: relationshipModel.discipleshipStage,
      email: person.email,
      engagementLevel: person.engagement_level,
      fieldVisibility: mapFieldVisibility(person.field_visibility),
      householdNotes: person.household_notes ?? null,
      id: person.id,
      lastActivityAt: latestActivityDate(person.last_activity_at, latestActivityByPersonId.get(person.id)),
      name: person.name,
      notes: person.notes,
      phone: person.phone,
      rawDiscipleshipStage: person.discipleship_stage,
      relationshipContext: relationshipModel.relationshipContext,
      relationshipType: person.relationship_type,
      roleInMyLife: relationshipModel.roleInMyLife,
      spouseName: person.spouse_name ?? null,
      status: person.status ?? "new",
      updatedAt: person.updated_at,
    };
  }).filter((person) => !["archived", "deleted"].includes((person.status ?? "").toLowerCase()))
    .sort((first, second) => activityDateValue(second.lastActivityAt ?? second.updatedAt) - activityDateValue(first.lastActivityAt ?? first.updatedAt));
  const peopleById = new Map(people.map((person) => [person.id, person.name]));
  const meetings = [
    ...meetingRows.map((meeting) => {
      const conversationFlowKey = normalizeConversationFlowKey(meeting.conversation_flow_key);
      const meetingStatus = mapMeetingStatus(meeting.meeting_status);
      const eventPeople = eventPeopleForMeeting(meeting).map(mapEventPerson).filter((eventPerson): eventPerson is DosAppMinistryEventPerson => Boolean(eventPerson));
      const roleParticipants = eventPeople.filter((eventPerson) => eventPerson.role === "participant");
      const roleParticipantIds = roleParticipants.map((eventPerson) => eventPerson.fieldPersonId).filter((personId): personId is string => Boolean(personId));
      const participantIds = roleParticipantIds.length ? roleParticipantIds : meeting.field_person_ids ?? [];
      const participantNames = roleParticipants.length
        ? roleParticipants.map((eventPerson) => eventPerson.displayName)
        : meeting.participant_names ?? [];
      const recorder = eventPeople.find((eventPerson) => eventPerson.role === "recorder") ?? (
        meeting.recorded_by_display_name || meeting.recorded_by_user_id
          ? {
            displayName: meeting.recorded_by_display_name ?? "Recorder",
            fieldPersonId: null,
            id: `recorder-${meeting.id}`,
            role: "recorder" as const,
            supportingSubRole: null,
            teamMemberId: null,
            userId: meeting.recorded_by_user_id ?? null,
          }
          : null
      );

      return {
        date: latestActivityDate(meeting.scheduled_start_at, meeting.table_date, meeting.updated_at, meeting.created_at),
        conversationFlowKey,
        conversationResponses: normalizeConversationResponses(conversationFlowKey, meeting.conversation_responses),
        fieldPersonIds: participantIds,
        googleSyncEnabled: meeting.google_sync_enabled === true,
        googleSyncStatus: calendarSyncStatusBySource.get(`meeting:${meeting.id}`) ?? null,
        id: meeting.id,
        meetingStatus,
        ministryEventId: meeting.ministry_event_id ?? null,
        ministryTeam: eventPeople.filter((eventPerson) => eventPerson.role === "ministry_team"),
        notes: meeting.notes,
        participantNames,
        participants: roleParticipants,
        recommendedResources: normalizeRecommendedResources(meeting.recommended_resources),
        recorder,
        review: meetingReviewSummary(meeting.id, reviewLinkByMeetingId, meetingReviewByMeetingId),
        source: "table" as const,
        scheduledEndAt: meeting.scheduled_end_at ?? null,
        scheduledStartAt: meeting.scheduled_start_at ?? null,
        supportingAttendees: eventPeople.filter((eventPerson) => eventPerson.role === "supporting_attendee"),
        timezone: meeting.timezone ?? null,
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
      followUpNeeded: connection.follow_up_needed,
      googleSyncEnabled: false,
      googleSyncStatus: null,
      id: `connection-${connection.id}`,
      meetingStatus: "logged" as const,
      ministryEventId: null,
      ministryTeam: [],
      movementStep: connection.movement_step ?? null,
      notes: connection.notes,
      participantNames: connection.field_person_id && peopleById.has(connection.field_person_id)
        ? [peopleById.get(connection.field_person_id) as string]
        : [],
      participants: [],
      recommendedResources: [],
      recorder: null,
      review: emptyReviewSummary(),
      scheduledEndAt: null,
      scheduledStartAt: null,
      source: "connection" as const,
      supportingAttendees: [],
      timezone: null,
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
  const assessmentResults = assessmentResultRows.map((result) => ({
    answers: mapDebugContext(result.answers),
    assessmentTitle: result.assessment_title,
    assessmentType: result.assessment_type,
    categoryScores: mapAssessmentCategoryScores(result.category_scores),
    completedAt: result.completed_at,
    completedByEmail: result.completed_by_email,
    completedByName: result.completed_by_name,
    id: result.id,
    maxScore: result.max_score,
    overallScore: result.overall_score,
    percentage: result.percentage,
    personId: result.person_id,
    secondaryPersonId: result.secondary_person_id,
    source: mapAssessmentSource(result.source),
    workspaceId: result.workspace_id,
  })).sort((first, second) => activityDateValue(second.completedAt) - activityDateValue(first.completedAt));
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
    outcomeTags: Array.isArray(review.outcome_tags) ? review.outcome_tags.filter((tag): tag is string => typeof tag === "string" && Boolean(tag.trim())) : [],
    personId: review.person_id,
    status: mapModerationStatus(review.status),
    submittedAt: review.submitted_at,
    wouldMeetAgain: review.would_meet_again,
    wouldMeetAgainResponse: review.would_meet_again_response ?? null,
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
    status: mapModerationStatus(testimony.status),
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
    status: mapModerationStatus(fruitEvent.status),
    title: fruitEvent.title,
    visibility: mapVisibility(fruitEvent.visibility),
  })).sort((first, second) => activityDateValue(second.date) - activityDateValue(first.date));
  const prayerLogs = prayerLogRows.map((log) => ({
    createdAt: log.created_at,
    fieldPersonId: log.field_person_id,
    id: log.id,
    note: log.note,
    prayedAt: log.prayed_at,
    prayedByUserId: log.prayed_by_user_id,
    prayerRequestId: log.prayer_request_id,
    workspaceId: log.workspace_id,
  }));
  const prayerPartners = prayerPartnerRows.map((partner) => {
    const linkedPerson = partner.field_person_id ? rawPeopleById.get(partner.field_person_id) ?? null : null;
    const composedName = cleanOptionalText(linkedPerson?.name)
      ?? cleanOptionalText(partner.name)
      ?? cleanOptionalText([partner.first_name, partner.last_name].filter(Boolean).join(" "))
      ?? linkedPerson?.email
      ?? partner.email
      ?? "Prayer Partner";
    const linkedRelationshipModel = relationshipModelFromFields({
      relationshipContext: linkedPerson?.relationship_context,
      relationshipType: linkedPerson?.relationship_type,
      roleInMyLife: linkedPerson?.role_in_my_life,
      status: linkedPerson?.status,
    });

    return {
      city: partner.city,
      email: linkedPerson?.email ?? partner.email,
      fieldPersonId: partner.field_person_id ?? null,
      howHeard: partner.how_heard,
      id: partner.id,
      joinedAt: partner.date_joined ?? partner.created_at,
      name: composedName,
      notes: partner.internal_notes,
      phone: linkedPerson?.phone ?? partner.phone,
      prayerTeam: partner.prayer_team ?? "household_family",
      region: partner.region,
      relationshipContext: linkedRelationshipModel.relationshipContext,
      source: partner.source ?? "public_profile",
      state: partner.state,
      status: partner.status === "inactive" ? "paused" : partner.status ?? "pending",
      updatedAt: partner.updated_at,
    };
  });
  const prayerRequests = prayerRequestRows.map((request) => {
    const workspaceId = request.workspace_id ?? request.household_id ?? request.related_household_id ?? request.related_missionary_profile_id ?? workspace.id;
    const requestText = cleanOptionalText(request.request) ?? "";
    const title = cleanOptionalText(request.title) ?? (requestText.slice(0, 80) || "Prayer request");

    return {
      answerTestimony: cleanOptionalText(request.answer_testimony),
      answeredAt: request.answered_at ?? null,
      category: cleanOptionalText(request.category),
      createdAt: request.created_at,
      fieldPersonId: request.field_person_id ?? null,
      id: request.id,
      linkedPersonIds: Array.isArray(request.linked_person_ids) ? request.linked_person_ids.filter(Boolean) : [],
      personTags: Array.isArray(request.person_tags) ? request.person_tags.map((tag) => tag.trim()).filter(Boolean) : [],
      request: requestText,
      source: request.source ?? null,
      status: mapPrayerRequestStatus(request.status),
      title,
      updatedAt: request.updated_at,
      urgency: mapPrayerRequestUrgency(request.urgency),
      visibility: mapPrayerRequestVisibility(request.visibility),
      workspaceId,
    };
  });
  const householdMembers = householdMemberRows
    .filter((member) => !["archived", "inactive"].includes((member.status ?? "").toLowerCase()))
    .map((member) => ({
      displayName: member.display_name,
      id: member.id,
      inviteEmail: cleanOptionalText(member.invite_email ?? null),
      isPublic: member.is_public === true,
      linked: Boolean(member.dos_user_id?.trim()),
      relationship: cleanOptionalText(member.relationship_to_workspace ?? null),
      roleTitle: cleanOptionalText(member.role_title),
      status: member.status ?? "active",
    }));
  const reminders = reminderRows.map((reminder) => ({
    googleSyncEnabled: reminder.google_sync_enabled === true,
    googleSyncStatus: calendarSyncStatusBySource.get(`reminder:${reminder.id}`)
      ?? calendarSyncStatusBySource.get(`important_date:${reminder.id}`)
      ?? null,
    id: reminder.id,
    notes: reminder.notes,
    personId: reminder.person_id,
    recurrence: mapReminderRecurrence(reminder.recurrence),
    reminderDate: reminder.reminder_date,
    reminderType: mapReminderType(reminder.reminder_type),
    title: reminder.title,
    updatedAt: reminder.updated_at,
  })).sort((first, second) => activityDateValue(first.reminderDate) - activityDateValue(second.reminderDate));
  const calendarNeedsReconnect = Boolean(calendarConnectionRow && isGoogleCalendarReconnectState(calendarWorkspaceSyncStateRow?.last_error));
  const calendarConnectionStatus: GoogleCalendarConnectionHealthStatus = calendarConnectionRow
    ? calendarNeedsReconnect
      ? "needs_reconnect"
      : "connected"
    : "not_connected";
  const calendarConnection = {
    calendarId: calendarConnectionRow?.calendar_id ?? null,
    connected: Boolean(calendarConnectionRow),
    connectedAt: calendarConnectionRow?.connected_at ?? null,
    googleAccountEmail: calendarConnectionRow?.google_account_email ?? null,
    googleConfigured: isGoogleCalendarConfigured(),
    lastSyncedAt: calendarEventLinkRows
      .map((link) => link.last_synced_at)
      .filter((value): value is string => Boolean(value))
      .sort((first, second) => activityDateValue(second) - activityDateValue(first))[0] ?? null,
    status: calendarConnectionStatus,
    statusMessage: calendarNeedsReconnect ? googleCalendarReconnectMessage : null,
  };
  const externalCalendarEvents = externalCalendarEventRows.map((event) => {
    const sourceName = Array.isArray(event.calendar_sources)
      ? event.calendar_sources[0]?.name ?? null
      : event.calendar_sources?.name ?? null;

    return {
      allDay: event.all_day === true,
      calendarSourceId: event.calendar_source_id,
      description: event.description,
      endAt: event.end_at,
      externalCalendarId: event.external_calendar_id,
      externalEventId: event.external_event_id,
      htmlLink: event.html_link,
      iCalUid: event.i_cal_uid,
      id: event.id,
      importedMeetingId: event.imported_dos_source_id,
      location: event.location,
      sourceName,
      startAt: event.start_at,
      timezone: event.timezone,
      title: event.summary?.trim() || "Google Calendar event",
    };
  }).sort((first, second) => activityDateValue(first.startAt) - activityDateValue(second.startAt));

  return {
    data: {
      assessmentResults,
      calendarConnection,
      circles: await loadFreshCircleData(workspace.id, people, meetings.filter((meeting) => meeting.meetingStatus === "logged")),
      externalCalendarEvents,
      fruit,
      fruitEvents,
      householdMembers,
      leaderReflections,
      meetings,
      organizations: buildOrganizationConnections({ organization, usamApplication, workspace }),
      participantReviews,
      participantTestimonies,
      people,
      prayerLogs,
      prayerPartners,
      prayerRequests,
      reminders,
      tableInvitations,
      usamApplication,
      stats: {
        approvedFruit: fruit.filter((item) => item.status === "approved").length,
        connectionsCount: connectionRows.length,
        fruitCount: fruit.length,
        meetingsCount: meetings.filter((meeting) => meeting.meetingStatus === "logged").length,
        peopleCount: people.length,
        relationshipStewardship: relationshipModelCounts(people.map((person) => ({
          discipleshipStage: person.discipleshipStage,
          relationshipContext: person.relationshipContext,
          relationshipType: normalizeRelationshipType(person.relationshipType, person.roleInMyLife, person.status),
          roleInMyLife: person.roleInMyLife,
        }))),
      },
      workspace: {
        displayName: workspace.display_name,
        greetingName: null,
        id: workspace.id,
        isUsamWorkspace: usamApplication.status === "approved" || usamApplication.status === "active" || usamApplication.publicProfileLive || organization?.brandingMode === "usam" || organization?.slug === "usa-missionaries" || isUsamKitchenTableGospelWorkspace({ publicProfileHref: organization?.brandingMode === "usam" ? publicProfileHrefForWorkspace(workspace) : null, slug: workspace.slug }),
        organizationName: organization?.name ?? null,
        profileImageUrl: workspace.profile_image_url,
        publicProfileHref: publicProfileHrefForWorkspace(workspace),
        shortMission: workspace.short_mission,
        showPrayerTeamCount: workspace.show_prayer_team_count !== false,
        slug: workspace.slug,
        stateName: cleanOptionalText(workspace.primary_state ?? workspace.location),
        userEmail: null,
        userFullName: null,
        userPhone: null,
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
  const query = supabase
    .from("missionary_households")
    .select("id, slug, display_name");
  const { data, error } = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(workspaceId)
    ? await query.eq("id", workspaceId).maybeSingle()
    : await query.eq("slug", workspaceId).maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as Pick<HouseholdRow, "display_name" | "id" | "slug">;
}
