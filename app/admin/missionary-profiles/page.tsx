import type { Metadata } from "next";
import {
  MissionaryProfilesAdminDashboard,
  type AdminAssessmentFollowUpArea,
  type AdminConnectionLog,
  type AdminConnectionType,
  type AdminEncounterStatus,
  type AdminEncounterSubmission,
  type AdminEncounterSubmissionType,
  type AdminFieldPerson,
  type AdminFieldPersonStatus,
  type AdminFruitItem,
  type AdminFruitStatus,
  type AdminHousehold,
  type AdminInSeasonFocus,
  type AdminLibraryItem,
  type AdminMajorGiftInquiry,
  type AdminMajorGiftInquiryStatus,
  type AdminMissionaryTable,
  type AdminMovementStep,
  type AdminOutcomeTag,
  type AdminPrayerPartner,
  type AdminPrayerPartnerStatus,
  type AdminPrayerRequest,
  type AdminProfile,
  type AdminProfileAnalytics,
  type AdminReadiness,
  type AdminSupportCommitment,
  type AdminSupportCommitmentStatus,
  type AdminSupportSettings,
  type AdminTableType,
  type AdminTableReview,
  type AdminTeachingUsed,
  type AdminTeamMember,
} from "./MissionaryProfilesAdminDashboard";
import { AdminShell } from "../_components/AdminShell";
import { getAdminAuthorization } from "@/src/lib/admin-auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Missionary Workspace | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

const householdBaseSelect = "id, slug, display_name, location, profile_image_url, hero_image_url, short_mission, story, public_visible, sort_order, updated_at";
const householdFeatureColumns = [
  "show_household",
  "show_photos",
  "show_team",
  "show_story",
  "show_fruit",
  "show_support",
  "show_prayer",
  "fruit_from_field",
  "original_story",
  "public_story",
  "support_mode",
  "support_target_household_id",
  "support_target_fund",
  "support_public_label",
  "support_button_label",
  "support_explanation",
  "prayer_cta_label",
  "prayer_destination",
  "enable_prayer_team",
  "prayer_section_headline",
  "prayer_section_description",
  "primary_state",
  "serving_scope",
  "secondary_states",
  "region",
  "role_type",
  "custom_serving_label",
  "location_visibility",
].join(", ");
const encounterStatuses = ["raw", "reviewed", "approved", "hidden", "archived"] as const satisfies readonly AdminEncounterStatus[];
const encounterSources = ["manual", "public_form", "dos"] as const;
const encounterSubmissionTypes = ["quick_response", "full_testimony"] as const satisfies readonly AdminEncounterSubmissionType[];
const fieldPersonStatuses = ["new", "active", "follow_up", "discipleship", "paused", "archived"] as const satisfies readonly AdminFieldPersonStatus[];
const movementSteps = [
  "Continue meeting",
  "Begin discipleship",
  "Send follow up",
  "Invite to group",
  "Connect to church",
  "Connect to ministry",
  "Hand off",
  "Pray and wait",
  "Other",
] as const satisfies readonly AdminMovementStep[];
const teachingUsedOptions = ["Kitchen Table Gospel", "Are You Really a Disciple", "Commands of Jesus", "Other"] as const satisfies readonly AdminTeachingUsed[];
const readinessOptions = ["Not ready", "Curious", "Open", "Ready to follow", "Actively following"] as const satisfies readonly AdminReadiness[];
const assessmentFollowUpAreas = ["Repentance", "Baptism", "Scripture", "Prayer", "Community", "Obedience"] as const satisfies readonly AdminAssessmentFollowUpArea[];
const connectionTypes = ["Phone call", "Zoom", "Text", "Coffee", "Prayer", "Discipleship", "Other"] as const satisfies readonly AdminConnectionType[];
const fruitStatuses = ["draft", "approved", "private"] as const satisfies readonly AdminFruitStatus[];
const prayerRequestStatuses = ["open", "covered", "answered", "archived"] as const;
const prayerRequestUrgencies = ["normal", "important", "urgent"] as const;
const prayerRequestVisibilities = ["private", "team", "public"] as const;
const prayerPartnerStatuses = ["active", "archived", "declined", "inactive", "pending"] as const;
const outcomeTagOptions = [
  "Salvation",
  "Baptism",
  "Healing",
  "Deliverance",
  "Church Connection",
  "Discipleship",
  "Prayer Answered",
  "Other",
] as const satisfies readonly AdminOutcomeTag[];
const tableTypes = ["kitchen_table", "coffee", "phone", "zoom", "text", "prayer", "group", "discipleship", "other"] as const satisfies readonly AdminTableType[];

type EncounterRow = {
  created_at: string;
  do_not_publish?: boolean | null;
  encounter_date: string | null;
  id: string;
  internal_notes?: string | null;
  missionary_household_id: string | null;
  missionary_profile_id: string | null;
  original_testimony: string;
  outcome_tags?: string[] | null;
  permission_to_share: boolean | null;
  public_summary: string | null;
  source: string | null;
  status: AdminEncounterStatus | string | null;
  submission_type?: string | null;
  submitter_email: string | null;
  submitter_name: string | null;
  submitter_phone: string | null;
  table_id?: string | null;
  updated_at: string | null;
  workspace_id?: string | null;
};

type MissionaryTableRow = {
  created_at: string;
  field_person_ids?: string[] | null;
  household_id?: string | null;
  id: string;
  notes: string | null;
  participant_names?: string[] | null;
  source: string | null;
  table_date: string | null;
  table_type: string | null;
  updated_at: string | null;
  workspace_id?: string | null;
};

type FieldPersonRow = {
  church: string | null;
  created_at: string;
  created_by: string | null;
  email: string | null;
  engagement_level: string | null;
  household_id?: string | null;
  id: string;
  last_activity_at: string | null;
  name: string;
  notes: string | null;
  phone: string;
  relationship_type: string | null;
  source: string | null;
  status: string | null;
  updated_at: string | null;
  workspace_id?: string | null;
};

type ProfilePageViewRollupRow = {
  last_7_days: number | null;
  last_7_unique_visitors: number | null;
  last_30_days: number | null;
  last_30_unique_visitors: number | null;
  missionary_profile_id: string;
  total_views: number | null;
  unique_visitors: number | null;
};

type TableReviewRow = {
  assessment_notes: string | null;
  breakthroughs_or_concerns: string | null;
  created_at: string;
  follow_up_areas: string[] | null;
  follow_up_needed: string | null;
  household_id?: string | null;
  how_meeting_went: string | null;
  id: string;
  key_observations: string | null;
  movement_step: string | null;
  questions_covered: string | null;
  readiness: string | null;
  table_id: string;
  teaching_used: string | null;
  updated_at: string | null;
  workspace_id?: string | null;
};

type CommandFruitRow = {
  body: string;
  cc_status?: string | null;
  created_at: string;
  encounter_id?: string | null;
  field_person_id?: string | null;
  household_id?: string | null;
  id: string;
  internal_notes?: string | null;
  outcome_tags?: string[] | null;
  table_id?: string | null;
  testimony_date: string | null;
  updated_at: string | null;
  workspace_id?: string | null;
};

type ConnectionLogRow = {
  connection_date: string;
  created_at: string;
  duration_minutes: number | null;
  field_person_id: string | null;
  follow_up_needed: string | null;
  household_id?: string | null;
  id: string;
  interaction_type: string | null;
  movement_step: string | null;
  notes: string | null;
  updated_at: string | null;
  workspace_id?: string | null;
};

type LibraryItemRow = {
  category: string | null;
  content_notes: string | null;
  created_at: string;
  description: string | null;
  household_id?: string | null;
  id: string;
  title: string;
  updated_at: string | null;
  workspace_id?: string | null;
};

type InSeasonFocusRow = {
  active_people_note: string | null;
  active_tables_note: string | null;
  current_focus: string | null;
  household_id?: string | null;
  id: string;
  prayer_emphasis: string | null;
  updated_at: string | null;
  workspace_id?: string | null;
};

type PrayerRequestRow = {
  category: string | null;
  created_at: string;
  field_person_id?: string | null;
  household_id: string | null;
  id: string;
  related_household_id?: string | null;
  request?: string | null;
  status: string | null;
  title: string;
  updated_at: string | null;
  urgency?: string | null;
  visibility?: string | null;
};

type PublicFruitItemRow = {
  household_id: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function payloadString(payload: Record<string, unknown>, key: string) {
  const value = payload[key];

  return typeof value === "string" ? value.trim() : "";
}

function payloadBoolean(payload: Record<string, unknown>, key: string) {
  return payload[key] === true;
}

function getOperationalWorkspaceId(row: { household_id?: string | null; workspace_id?: string | null }) {
  return row.workspace_id ?? row.household_id ?? null;
}

function getEncounterWorkspaceId(row: { missionary_household_id?: string | null; missionary_profile_id?: string | null; workspace_id?: string | null }) {
  return row.workspace_id ?? row.missionary_household_id ?? row.missionary_profile_id ?? null;
}

function getEncounterStatus(row: { status: string | null }, payload: Record<string, unknown>): AdminEncounterStatus {
  const status = payloadString(payload, "profile_encounter_status") || payloadString(payload, "encounter_status");

  if (encounterStatuses.includes(status as AdminEncounterStatus)) {
    return status as AdminEncounterStatus;
  }

  if (status === "new") {
    return "raw";
  }

  if (status === "published") {
    return "approved";
  }

  if (encounterStatuses.includes(row.status as AdminEncounterStatus)) {
    return row.status as AdminEncounterStatus;
  }

  if (row.status === "new") {
    return "raw";
  }

  if (row.status === "published") {
    return "approved";
  }

  return "raw";
}

function getEncounterRecordStatus(value: string | null): AdminEncounterStatus {
  if (value === "new") {
    return "raw";
  }

  if (value === "published") {
    return "approved";
  }

  return encounterStatuses.includes(value as AdminEncounterStatus) ? value as AdminEncounterStatus : "raw";
}

function getEncounterRecordSource(value: string | null): AdminEncounterSubmission["source"] {
  return encounterSources.includes(value as AdminEncounterSubmission["source"]) ? value as AdminEncounterSubmission["source"] : "manual";
}

function getEncounterSubmissionType(value: string | null | undefined): AdminEncounterSubmissionType {
  return encounterSubmissionTypes.includes(value as AdminEncounterSubmissionType) ? value as AdminEncounterSubmissionType : "full_testimony";
}

function getOutcomeTags(value: string[] | null | undefined): AdminOutcomeTag[] {
  return Array.isArray(value)
    ? value.filter((tag): tag is AdminOutcomeTag => outcomeTagOptions.includes(tag as AdminOutcomeTag))
    : [];
}

function getTableType(value: string | null): AdminTableType {
  return tableTypes.includes(value as AdminTableType) ? value as AdminTableType : "kitchen_table";
}

function getTableSource(value: string | null): AdminMissionaryTable["source"] {
  return value === "field" ? "field" : "command_center";
}

function getFieldPersonStatus(value: string | null): AdminFieldPersonStatus {
  return fieldPersonStatuses.includes(value as AdminFieldPersonStatus) ? value as AdminFieldPersonStatus : "new";
}

function getFieldPersonSource(value: string | null): AdminFieldPerson["source"] {
  return value === "field" ? "field" : "command_center";
}

function getTableParticipantNames(value: string[] | null | undefined) {
  return Array.isArray(value)
    ? value.filter((name): name is string => typeof name === "string" && Boolean(name.trim())).map((name) => name.trim())
    : [];
}

function getTableFieldPersonIds(value: string[] | null | undefined) {
  return Array.isArray(value)
    ? value.filter((id): id is string => typeof id === "string" && Boolean(id.trim())).map((id) => id.trim())
    : [];
}

function getMovementStep(value: string | null): AdminMovementStep | null {
  return movementSteps.includes(value as AdminMovementStep) ? value as AdminMovementStep : null;
}

function getTeachingUsed(value: string | null): AdminTeachingUsed | null {
  return teachingUsedOptions.includes(value as AdminTeachingUsed) ? value as AdminTeachingUsed : null;
}

function getReadiness(value: string | null): AdminReadiness | null {
  return readinessOptions.includes(value as AdminReadiness) ? value as AdminReadiness : null;
}

function getAssessmentFollowUpAreas(value: string[] | null | undefined): AdminAssessmentFollowUpArea[] {
  return Array.isArray(value)
    ? value.filter((area): area is AdminAssessmentFollowUpArea => assessmentFollowUpAreas.includes(area as AdminAssessmentFollowUpArea))
    : [];
}

function getConnectionType(value: string | null): AdminConnectionType {
  return connectionTypes.includes(value as AdminConnectionType) ? value as AdminConnectionType : "Phone call";
}

function getFruitStatus(value: string | null | undefined): AdminFruitStatus {
  return fruitStatuses.includes(value as AdminFruitStatus) ? value as AdminFruitStatus : "draft";
}

function getPrayerRequestStatus(value: string | null | undefined): AdminPrayerRequest["status"] {
  return prayerRequestStatuses.includes(value as AdminPrayerRequest["status"]) ? value as AdminPrayerRequest["status"] : "open";
}

function getPrayerRequestUrgency(value: string | null | undefined): AdminPrayerRequest["urgency"] {
  return prayerRequestUrgencies.includes(value as AdminPrayerRequest["urgency"]) ? value as AdminPrayerRequest["urgency"] : "normal";
}

function getPrayerRequestVisibility(value: string | null | undefined): AdminPrayerRequest["visibility"] {
  return prayerRequestVisibilities.includes(value as AdminPrayerRequest["visibility"]) ? value as AdminPrayerRequest["visibility"] : "private";
}

function getPrayerPartnerStatus(value: string | null | undefined): AdminPrayerPartnerStatus {
  return prayerPartnerStatuses.includes(value as AdminPrayerPartnerStatus) ? value as AdminPrayerPartnerStatus : "pending";
}

function getPermissionToShare(payload: Record<string, unknown>) {
  return payloadBoolean(payload, "permission_to_share")
    || payloadString(payload, "permission_to_share").toLowerCase() === "true"
    || payloadString(payload, "permission").toLowerCase().startsWith("yes");
}

function getSubmitterName(row: { first_name?: string | null; last_name?: string | null }, payload: Record<string, unknown>) {
  const payloadName = payloadString(payload, "submitter_name");
  const fullName = [row.first_name, row.last_name].filter(Boolean).join(" ").trim();

  return payloadName || fullName || "Unknown";
}

function getReviewText(row: { message?: string | null }, payload: Record<string, unknown>) {
  return payloadString(payload, "review_text")
    || payloadString(payload, "testimony_text")
    || payloadString(payload, "testimony")
    || payloadString(payload, "review")
    || row.message
    || "";
}

function hasMissingFeatureColumnsError(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";

  return [
    "show_household",
    "show_photos",
    "show_team",
    "show_story",
    "show_fruit",
    "show_support",
    "show_prayer",
    "fruit_from_field",
    "original_story",
    "public_story",
    "support_mode",
    "support_target_household_id",
    "support_target_fund",
    "support_public_label",
    "support_button_label",
    "support_explanation",
    "prayer_cta_label",
    "prayer_destination",
    "enable_prayer_team",
    "prayer_section_headline",
    "prayer_section_description",
    "primary_state",
    "serving_scope",
    "secondary_states",
    "region",
    "role_type",
    "custom_serving_label",
    "location_visibility",
  ].some((columnName) => message.includes(columnName));
}

function hasMissingStoryVersionColumnsError(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";

  return ["original_story", "public_story"].some((columnName) => message.includes(columnName));
}

function isMissingPrayerTeamTable(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";

  return message.includes("prayer_partners") || message.includes("prayer_requests");
}

function isMissingFormSubmissionsTable(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";

  return message.includes("form_submissions");
}

function isMissingProfileAnalyticsTable(error: { code?: string; message?: string } | null | undefined) {
  const code = error?.code ?? "";
  const message = error?.message?.toLowerCase() ?? "";
  const missingRelation = code === "42P01"
    || code === "PGRST205"
    || message.includes("schema cache")
    || message.includes("does not exist")
    || message.includes("could not find the table");

  return missingRelation && (
    message.includes("missionary_profile_page_views")
    || message.includes("missionary_profile_view_rollups")
  );
}

function isMissingEncountersTable(error: { code?: string; message?: string } | null | undefined) {
  const code = error?.code ?? "";
  const message = error?.message ?? "";
  const missingRelation = code === "42P01"
    || code === "PGRST205"
    || message.toLowerCase().includes("schema cache")
    || message.toLowerCase().includes("does not exist")
    || message.toLowerCase().includes("could not find the table");

  return missingRelation && message.includes("missionary_encounters");
}

function isMissingTablesTable(error: { code?: string; message?: string } | null | undefined) {
  const code = error?.code ?? "";
  const message = error?.message ?? "";
  const missingRelation = code === "42P01"
    || code === "PGRST205"
    || message.toLowerCase().includes("schema cache")
    || message.toLowerCase().includes("does not exist")
    || message.toLowerCase().includes("could not find the table");

  return missingRelation && message.includes("missionary_tables");
}

function isMissingFieldPeopleTable(error: { code?: string; message?: string } | null | undefined) {
  const code = error?.code ?? "";
  const message = error?.message ?? "";
  const missingRelation = code === "42P01"
    || code === "PGRST205"
    || message.toLowerCase().includes("schema cache")
    || message.toLowerCase().includes("does not exist")
    || message.toLowerCase().includes("could not find the table");

  return missingRelation && message.includes("missionary_field_people");
}

function isMissingWorkflowTable(error: { code?: string; message?: string } | null | undefined, tableName: string) {
  const code = error?.code ?? "";
  const message = error?.message ?? "";
  const missingRelation = code === "42P01"
    || code === "PGRST205"
    || message.toLowerCase().includes("schema cache")
    || message.toLowerCase().includes("does not exist")
    || message.toLowerCase().includes("could not find the table");

  return missingRelation && message.includes(tableName);
}

function isMissingWorkspaceScopeColumn(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";

  return message.includes("workspace_id");
}

function isMissingEncounterPipelineColumns(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";

  return ["table_id", "outcome_tags", "internal_notes", "do_not_publish", "submission_type", "workspace_id"].some((columnName) => message.includes(columnName));
}

function isMissingTablePipelineColumns(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";

  return ["participant_names", "field_person_ids", "workspace_id"].some((columnName) => message.includes(columnName));
}

function isMissingFruitItemsTable(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";

  return message.includes("missionary_fruit_items");
}

function isMissingFruitWorkflowColumns(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";

  return ["cc_status", "table_id", "field_person_id", "internal_notes", "outcome_tags", "workspace_id"].some((columnName) => message.includes(columnName));
}

function isMissingTeamMembersTable(error: { code?: string; message?: string } | null | undefined) {
  const code = error?.code ?? "";
  const message = error?.message ?? "";
  const missingRelation = code === "42P01"
    || code === "PGRST205"
    || message.toLowerCase().includes("schema cache")
    || message.toLowerCase().includes("does not exist")
    || message.toLowerCase().includes("could not find the table");

  return missingRelation && message.includes("missionary_team_members");
}

function isMissingSupportLinkColumns(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";

  return [
    "monthly_giving_url",
    "one_time_giving_url",
    "monthly_button_label",
    "one_time_button_label",
    "major_gift_button_label",
    "enable_monthly_partnership",
    "enable_one_time_gift",
    "enable_major_gift_inquiry",
    "monthly_support_description",
    "one_time_support_description",
    "major_gift_notify_email",
    "major_gift_public_description",
    "flyer_headline",
    "flyer_support_appeal",
    "flyer_prayer_ask",
    "flyer_note",
  ].some((columnName) => message.includes(columnName));
}

function isMissingSupportCommitmentsTable(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";

  return message.includes("support_commitments")
    || message.toLowerCase().includes("could not find the table");
}

function isMissingSupportCommitmentWorkflowColumns(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";

  return ["submitted_at", "completed_at", "admin_notes"].some((columnName) => message.includes(columnName));
}

function isMissingMajorGiftInquiriesTable(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";

  return message.includes("major_gift_inquiries")
    || message.toLowerCase().includes("could not find the table");
}

function getSupportCommitmentStatus(value: string | null | undefined): AdminSupportCommitmentStatus {
  switch (value) {
    case "active":
    case "cancelled":
    case "incomplete":
    case "needs_follow_up":
    case "pending_giving_setup":
      return value;
    case "reconciled":
      return "active";
    case "closed":
      return "incomplete";
    case "archived":
      return "cancelled";
    case "reviewed":
      return "needs_follow_up";
    case "new":
    default:
      return "pending_giving_setup";
  }
}

function getMajorGiftInquiryStatus(value: string | null | undefined): AdminMajorGiftInquiryStatus {
  switch (value) {
    case "archived":
    case "closed":
    case "contacted":
    case "needs_follow_up":
    case "new":
      return value;
    case "reviewed":
      return "needs_follow_up";
    default:
      return "new";
  }
}

async function getAdminProfiles(): Promise<{ error?: string; profiles: AdminProfile[] }> {
  if (!isSupabaseAdminConfigured()) {
    return {
      error: "Supabase admin environment variables are not configured yet.",
      profiles: [],
    };
  }

  const supabase = createSupabaseAdminClient();
  const householdResult = await supabase
    .from("missionary_households")
    .select(`${householdBaseSelect}, ${householdFeatureColumns}` as string)
    .order("sort_order", { ascending: true });
  let households = householdResult.data as AdminHousehold[] | null;
  let error = householdResult.error;
  let hasPublishingFeatureColumns = true;
  let hasStoryVersionColumns = true;

  if (error && hasMissingFeatureColumnsError(error)) {
    hasPublishingFeatureColumns = false;
    hasStoryVersionColumns = !hasMissingStoryVersionColumnsError(error);
    const fallbackResult = await supabase
      .from("missionary_households")
      .select(householdBaseSelect)
      .order("sort_order", { ascending: true });

    households = fallbackResult.data as AdminHousehold[] | null;
    error = fallbackResult.error;
  }

  if (error) {
    return { error: error.message, profiles: [] };
  }

  const ids = (households ?? []).map((household) => household.id);
  const supportByHouseholdId = new Map<string, AdminSupportSettings>();
  const activePrayerRequestCountByHouseholdId = new Map<string, number>();
  const connectionLogsByHouseholdId = new Map<string, AdminConnectionLog[]>();
  const encounterSubmissionsByHouseholdId = new Map<string, AdminEncounterSubmission[]>();
  const fieldPeopleByHouseholdId = new Map<string, AdminFieldPerson[]>();
  const fruitItemsByHouseholdId = new Map<string, AdminFruitItem[]>();
  const inSeasonByHouseholdId = new Map<string, AdminInSeasonFocus>();
  const libraryItemsByHouseholdId = new Map<string, AdminLibraryItem[]>();
  const majorGiftInquiriesByHouseholdId = new Map<string, AdminMajorGiftInquiry[]>();
  const prayerPartnerCountByHouseholdId = new Map<string, number>();
  const prayerPartnersByHouseholdId = new Map<string, AdminPrayerPartner[]>();
  const prayerRequestsByHouseholdId = new Map<string, AdminPrayerRequest[]>();
  const profileAnalyticsByHouseholdId = new Map<string, AdminProfileAnalytics>();
  const publicFruitItemCountByHouseholdId = new Map<string, number>();
  const supportCommitmentsByHouseholdId = new Map<string, AdminSupportCommitment[]>();
  const tableReviewsByHouseholdId = new Map<string, AdminTableReview[]>();
  const tablesByHouseholdId = new Map<string, AdminMissionaryTable[]>();
  const teamMembersByHouseholdId = new Map<string, AdminTeamMember[]>();

  if (ids.length > 0) {
    const supportResult = await supabase
      .from("missionary_support_settings")
      .select("household_id, show_support, annual_goal, monthly_goal, monthly_committed, monthly_received, general_fund_percentage, goal_basis, monthly_giving_url, one_time_giving_url, monthly_button_label, one_time_button_label, major_gift_button_label, enable_monthly_partnership, enable_one_time_gift, enable_major_gift_inquiry, monthly_support_description, one_time_support_description, major_gift_notify_email, major_gift_public_description, flyer_headline, flyer_support_appeal, flyer_prayer_ask, flyer_note")
      .in("household_id", ids);
    const fallbackSupportResult = supportResult.error && isMissingSupportLinkColumns(supportResult.error)
      ? await supabase
        .from("missionary_support_settings")
        .select("household_id, show_support, annual_goal, monthly_goal, monthly_committed, monthly_received, general_fund_percentage, goal_basis")
        .in("household_id", ids)
      : supportResult;
    const supportSettings = fallbackSupportResult.data;
    const supportError = fallbackSupportResult.error;

    if (supportError) {
      return { error: supportError.message, profiles: [] };
    }

    (supportSettings ?? []).forEach((support) => {
      supportByHouseholdId.set(support.household_id, support as AdminSupportSettings);
    });

    const supportCommitmentsResult = await supabase
      .from("support_commitments")
      .select("id, household_id, first_name, last_name, email, phone, gift_type, selected_amount, other_amount, allocation_preference, message, redirect_giving_url, status, submitted_at, completed_at, admin_notes, created_at, updated_at")
      .in("household_id", ids)
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    const fallbackSupportCommitmentsResult = supportCommitmentsResult.error && isMissingSupportCommitmentWorkflowColumns(supportCommitmentsResult.error)
      ? await supabase
        .from("support_commitments")
        .select("id, household_id, first_name, last_name, email, phone, gift_type, selected_amount, other_amount, allocation_preference, message, redirect_giving_url, status, created_at, updated_at")
        .in("household_id", ids)
        .order("created_at", { ascending: false })
      : supportCommitmentsResult;

    if (fallbackSupportCommitmentsResult.error && !isMissingSupportCommitmentsTable(fallbackSupportCommitmentsResult.error)) {
      return { error: fallbackSupportCommitmentsResult.error.message, profiles: [] };
    }

    ((fallbackSupportCommitmentsResult.data ?? []) as Array<Partial<AdminSupportCommitment> & { status: string | null }>).forEach((commitment) => {
      if (!commitment.household_id || !ids.includes(commitment.household_id)) {
        return;
      }

      const currentCommitments = supportCommitmentsByHouseholdId.get(commitment.household_id) ?? [];

      currentCommitments.push({
        admin_notes: commitment.admin_notes ?? null,
        allocation_preference: commitment.allocation_preference ?? null,
        completed_at: commitment.completed_at ?? null,
        created_at: commitment.created_at ?? "",
        email: commitment.email ?? "",
        first_name: commitment.first_name ?? "",
        gift_type: commitment.gift_type === "one_time" ? "one_time" : "monthly",
        household_id: commitment.household_id,
        id: commitment.id ?? "",
        last_name: commitment.last_name ?? "",
        message: commitment.message ?? null,
        other_amount: commitment.other_amount ?? null,
        phone: commitment.phone ?? null,
        redirect_giving_url: commitment.redirect_giving_url ?? null,
        selected_amount: commitment.selected_amount ?? null,
        ...commitment,
        submitted_at: commitment.submitted_at ?? commitment.created_at ?? null,
        status: getSupportCommitmentStatus(commitment.status),
        updated_at: commitment.updated_at ?? null,
      });
      supportCommitmentsByHouseholdId.set(commitment.household_id, currentCommitments);
    });

    const majorGiftInquiriesResult = await supabase
      .from("major_gift_inquiries")
      .select("id, household_id, household_name, profile_slug, first_name, last_name, email, phone, donation_types, projected_amount_range, intended_for, message, best_time_to_contact, status, created_at, updated_at")
      .in("household_id", ids)
      .order("created_at", { ascending: false });

    if (majorGiftInquiriesResult.error && !isMissingMajorGiftInquiriesTable(majorGiftInquiriesResult.error)) {
      return { error: majorGiftInquiriesResult.error.message, profiles: [] };
    }

    ((majorGiftInquiriesResult.data ?? []) as Array<Partial<AdminMajorGiftInquiry> & { status: string | null }>).forEach((inquiry) => {
      if (!inquiry.household_id || !ids.includes(inquiry.household_id)) {
        return;
      }

      const currentInquiries = majorGiftInquiriesByHouseholdId.get(inquiry.household_id) ?? [];

      currentInquiries.push({
        best_time_to_contact: inquiry.best_time_to_contact ?? null,
        created_at: inquiry.created_at ?? "",
        donation_types: inquiry.donation_types ?? null,
        email: inquiry.email ?? "",
        first_name: inquiry.first_name ?? "",
        household_id: inquiry.household_id,
        household_name: inquiry.household_name ?? null,
        id: inquiry.id ?? "",
        intended_for: inquiry.intended_for ?? null,
        last_name: inquiry.last_name ?? "",
        message: inquiry.message ?? null,
        phone: inquiry.phone ?? null,
        profile_slug: inquiry.profile_slug ?? null,
        projected_amount_range: inquiry.projected_amount_range ?? null,
        status: getMajorGiftInquiryStatus(inquiry.status),
        updated_at: inquiry.updated_at ?? null,
      });
      majorGiftInquiriesByHouseholdId.set(inquiry.household_id, currentInquiries);
    });

    const [prayerPartnersResult, prayerRequestsResult] = await Promise.all([
      supabase
        .from("prayer_partners")
        .select("id, first_name, last_name, name, email, phone, recruited_by_household_id, recruited_by_profile_slug, workspace_id, missionary_profile_id, source, status, date_joined, created_at, updated_at")
        .or(ids.map((id) => `recruited_by_household_id.eq.${id},workspace_id.eq.${id},missionary_profile_id.eq.${id}`).join(",")),
      supabase
        .from("prayer_requests")
        .select("household_id, status")
        .in("household_id", ids),
    ]);

    if (prayerPartnersResult.error && !isMissingPrayerTeamTable(prayerPartnersResult.error)) {
      return { error: prayerPartnersResult.error.message, profiles: [] };
    }

    if (prayerRequestsResult.error && !isMissingPrayerTeamTable(prayerRequestsResult.error)) {
      return { error: prayerRequestsResult.error.message, profiles: [] };
    }

    (prayerPartnersResult.data ?? []).forEach((partner) => {
      const partnerHouseholdId = partner.recruited_by_household_id ?? partner.workspace_id ?? partner.missionary_profile_id;

      if (!partnerHouseholdId) {
        return;
      }

      const status = getPrayerPartnerStatus(partner.status);
      const currentPartners = prayerPartnersByHouseholdId.get(partnerHouseholdId) ?? [];

      currentPartners.push({
        created_at: partner.created_at ?? "",
        date_joined: partner.date_joined ?? null,
        email: partner.email ?? null,
        first_name: partner.first_name ?? null,
        id: partner.id ?? "",
        last_name: partner.last_name ?? null,
        name: partner.name ?? null,
        phone: partner.phone ?? null,
        recruited_by_household_id: partnerHouseholdId,
        recruited_by_profile_slug: partner.recruited_by_profile_slug ?? null,
        source: partner.source ?? null,
        status,
        updated_at: partner.updated_at ?? null,
      });
      prayerPartnersByHouseholdId.set(partnerHouseholdId, currentPartners);

      if (status === "active") {
        prayerPartnerCountByHouseholdId.set(
          partnerHouseholdId,
          (prayerPartnerCountByHouseholdId.get(partnerHouseholdId) ?? 0) + 1,
        );
      }
    });

    (prayerRequestsResult.data ?? []).forEach((request) => {
      if ((request.status !== "active" && request.status !== "open") || !request.household_id) {
        return;
      }

      activePrayerRequestCountByHouseholdId.set(
        request.household_id,
        (activePrayerRequestCountByHouseholdId.get(request.household_id) ?? 0) + 1,
      );
    });

    const workspacePrayerRequestsResult = await supabase
      .from("prayer_requests")
      .select("id, household_id, related_household_id, field_person_id, title, request, category, urgency, status, visibility, created_at, updated_at")
      .or(ids.map((id) => `household_id.eq.${id},related_household_id.eq.${id}`).join(","))
      .order("created_at", { ascending: false });
    const fallbackWorkspacePrayerRequestsResult = workspacePrayerRequestsResult.error?.message?.includes("field_person_id")
      ? await supabase
        .from("prayer_requests")
        .select("id, household_id, related_household_id, title, request, category, urgency, status, visibility, created_at, updated_at")
        .or(ids.map((id) => `household_id.eq.${id},related_household_id.eq.${id}`).join(","))
        .order("created_at", { ascending: false })
      : workspacePrayerRequestsResult;

    if (fallbackWorkspacePrayerRequestsResult.error && !isMissingPrayerTeamTable(fallbackWorkspacePrayerRequestsResult.error)) {
      return { error: fallbackWorkspacePrayerRequestsResult.error.message, profiles: [] };
    }

    ((fallbackWorkspacePrayerRequestsResult.data ?? []) as PrayerRequestRow[]).forEach((request) => {
      const workspaceId = request.household_id && ids.includes(request.household_id)
        ? request.household_id
        : request.related_household_id && ids.includes(request.related_household_id)
          ? request.related_household_id
          : null;

      if (!workspaceId) {
        return;
      }

      const currentRequests = prayerRequestsByHouseholdId.get(workspaceId) ?? [];

      currentRequests.push({
        category: request.category,
        created_at: request.created_at,
        field_person_id: request.field_person_id ?? null,
        household_id: request.household_id ?? workspaceId,
        id: request.id,
        request: request.request ?? "",
        status: getPrayerRequestStatus(request.status),
        title: request.title,
        updated_at: request.updated_at,
        urgency: getPrayerRequestUrgency(request.urgency),
        visibility: getPrayerRequestVisibility(request.visibility),
        workspace_id: workspaceId,
      });
      prayerRequestsByHouseholdId.set(workspaceId, currentRequests);
    });

    const tablesResult = await supabase
      .from("missionary_tables")
      .select("id, workspace_id, household_id, table_date, table_type, field_person_ids, participant_names, notes, source, created_at, updated_at")
      .in("workspace_id", ids)
      .order("table_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    const fallbackTablesResult = tablesResult.error && isMissingTablePipelineColumns(tablesResult.error)
      ? await supabase
        .from("missionary_tables")
        .select("id, household_id, table_date, table_type, participant_names, notes, source, created_at, updated_at")
        .in("household_id", ids)
        .order("table_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
      : tablesResult;

    if (fallbackTablesResult.error && !isMissingTablesTable(fallbackTablesResult.error)) {
      return { error: fallbackTablesResult.error.message, profiles: [] };
    }

    ((fallbackTablesResult.data ?? []) as MissionaryTableRow[]).forEach((table) => {
      const workspaceId = getOperationalWorkspaceId(table);

      if (!workspaceId || !ids.includes(workspaceId)) {
        return;
      }

      const currentTables = tablesByHouseholdId.get(workspaceId) ?? [];

      currentTables.push({
        created_at: table.created_at,
        field_person_ids: getTableFieldPersonIds(table.field_person_ids),
        household_id: table.household_id ?? workspaceId,
        id: table.id,
        notes: table.notes,
        participant_names: getTableParticipantNames(table.participant_names),
        source: getTableSource(table.source),
        table_date: table.table_date ?? table.created_at.slice(0, 10),
        table_type: getTableType(table.table_type),
        updated_at: table.updated_at,
        workspace_id: workspaceId,
      });
      tablesByHouseholdId.set(workspaceId, currentTables);
    });

    const fieldPeopleResult = await supabase
      .from("missionary_field_people")
      .select("id, workspace_id, household_id, name, phone, email, church, notes, status, relationship_type, engagement_level, source, created_by, last_activity_at, created_at, updated_at")
      .in("workspace_id", ids)
      .order("last_activity_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false })
      .order("name", { ascending: true });
    // TODO: Remove the household_id-only fallback after all Supabase environments
    // have the Command Center workspace_id migration applied.
    const fallbackFieldPeopleResult = fieldPeopleResult.error && isMissingWorkspaceScopeColumn(fieldPeopleResult.error)
      ? await supabase
        .from("missionary_field_people")
        .select("id, household_id, name, phone, email, church, notes, status, relationship_type, engagement_level, source, created_by, last_activity_at, created_at, updated_at")
        .in("household_id", ids)
        .order("last_activity_at", { ascending: false, nullsFirst: false })
        .order("updated_at", { ascending: false })
        .order("name", { ascending: true })
      : fieldPeopleResult;

    if (fallbackFieldPeopleResult.error && !isMissingFieldPeopleTable(fallbackFieldPeopleResult.error)) {
      return { error: fallbackFieldPeopleResult.error.message, profiles: [] };
    }

    ((fallbackFieldPeopleResult.data ?? []) as FieldPersonRow[]).forEach((person) => {
      const workspaceId = getOperationalWorkspaceId(person);

      if (!workspaceId || !ids.includes(workspaceId)) {
        return;
      }

      const currentPeople = fieldPeopleByHouseholdId.get(workspaceId) ?? [];

      currentPeople.push({
        church: person.church,
        created_at: person.created_at,
        created_by: person.created_by,
        email: person.email,
        engagement_level: person.engagement_level,
        household_id: person.household_id ?? workspaceId,
        id: person.id,
        last_activity_at: person.last_activity_at,
        name: person.name,
        notes: person.notes,
        phone: person.phone,
        relationship_type: person.relationship_type,
        source: getFieldPersonSource(person.source),
        status: getFieldPersonStatus(person.status),
        updated_at: person.updated_at,
        workspace_id: workspaceId,
      });
      fieldPeopleByHouseholdId.set(workspaceId, currentPeople);
    });

    // Intake workflow placeholder: missionaries will eventually submit profile
    // details through public forms. Those raw submissions should appear here for
    // master_admin/admin/reviewer review, then a human updates and publishes the
    // profile. missionary_user submissions should not directly edit public fields.
    const encountersResult = await supabase
      .from("missionary_encounters")
      .select("id, workspace_id, missionary_profile_id, missionary_household_id, table_id, submitter_name, submitter_email, submitter_phone, encounter_date, original_testimony, public_summary, internal_notes, do_not_publish, submission_type, outcome_tags, permission_to_share, status, source, created_at, updated_at")
      .in("workspace_id", ids)
      .order("encounter_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    const fallbackEncountersResult = encountersResult.error && isMissingEncounterPipelineColumns(encountersResult.error)
      ? await supabase
        .from("missionary_encounters")
        .select("id, missionary_profile_id, missionary_household_id, submitter_name, submitter_email, submitter_phone, encounter_date, original_testimony, public_summary, permission_to_share, status, source, created_at, updated_at")
        .in("missionary_household_id", ids)
        .order("encounter_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
      : encountersResult;

    if (fallbackEncountersResult.error && !isMissingEncountersTable(fallbackEncountersResult.error)) {
      return { error: fallbackEncountersResult.error.message, profiles: [] };
    }

    ((fallbackEncountersResult.data ?? []) as EncounterRow[]).forEach((row) => {
      const workspaceId = getEncounterWorkspaceId(row);

      if (!workspaceId || !ids.includes(workspaceId)) {
        return;
      }

      const currentItems = encounterSubmissionsByHouseholdId.get(workspaceId) ?? [];

      currentItems.push({
        created_at: row.created_at,
        do_not_publish: row.do_not_publish === true,
        encounter_date: row.encounter_date,
        id: row.id,
        internal_notes: row.internal_notes ?? "",
        missionary_household_id: row.missionary_household_id,
        missionary_profile_id: row.missionary_profile_id,
        original_testimony: row.original_testimony,
        outcome_tags: getOutcomeTags(row.outcome_tags),
        permission_to_share: row.permission_to_share === true,
        public_summary: row.public_summary,
        source: getEncounterRecordSource(row.source),
        status: getEncounterRecordStatus(row.status),
        submission_type: getEncounterSubmissionType(row.submission_type),
        submitter_email: row.submitter_email,
        submitter_name: row.submitter_name,
        submitter_phone: row.submitter_phone,
        table_id: row.table_id ?? null,
        updated_at: row.updated_at,
        workspace_id: workspaceId,
      });
      encounterSubmissionsByHouseholdId.set(workspaceId, currentItems);
    });

    const tableReviewsResult = await supabase
      .from("missionary_table_reviews")
      .select("id, workspace_id, household_id, table_id, how_meeting_went, key_observations, breakthroughs_or_concerns, follow_up_needed, movement_step, teaching_used, questions_covered, assessment_notes, readiness, follow_up_areas, created_at, updated_at")
      .in("workspace_id", ids)
      .order("updated_at", { ascending: false });
    const fallbackTableReviewsResult = tableReviewsResult.error && isMissingWorkspaceScopeColumn(tableReviewsResult.error)
      ? await supabase
        .from("missionary_table_reviews")
        .select("id, household_id, table_id, how_meeting_went, key_observations, breakthroughs_or_concerns, follow_up_needed, movement_step, teaching_used, questions_covered, assessment_notes, readiness, follow_up_areas, created_at, updated_at")
        .in("household_id", ids)
        .order("updated_at", { ascending: false })
      : tableReviewsResult;

    if (fallbackTableReviewsResult.error && !isMissingWorkflowTable(fallbackTableReviewsResult.error, "missionary_table_reviews")) {
      return { error: fallbackTableReviewsResult.error.message, profiles: [] };
    }

    ((fallbackTableReviewsResult.data ?? []) as TableReviewRow[]).forEach((review) => {
      const workspaceId = getOperationalWorkspaceId(review);

      if (!workspaceId || !ids.includes(workspaceId)) {
        return;
      }

      const currentReviews = tableReviewsByHouseholdId.get(workspaceId) ?? [];

      currentReviews.push({
        assessment_notes: review.assessment_notes,
        breakthroughs_or_concerns: review.breakthroughs_or_concerns,
        created_at: review.created_at,
        follow_up_areas: getAssessmentFollowUpAreas(review.follow_up_areas),
        follow_up_needed: review.follow_up_needed,
        household_id: review.household_id ?? workspaceId,
        how_meeting_went: review.how_meeting_went,
        id: review.id,
        key_observations: review.key_observations,
        movement_step: getMovementStep(review.movement_step),
        questions_covered: review.questions_covered,
        readiness: getReadiness(review.readiness),
        table_id: review.table_id,
        teaching_used: getTeachingUsed(review.teaching_used),
        updated_at: review.updated_at,
        workspace_id: workspaceId,
      });
      tableReviewsByHouseholdId.set(workspaceId, currentReviews);
    });

    const fruitItemsResult = await supabase
      .from("missionary_fruit_items")
      .select("id, workspace_id, household_id, table_id, encounter_id, field_person_id, body, internal_notes, outcome_tags, cc_status, testimony_date, created_at, updated_at")
      .in("workspace_id", ids)
      .in("source_app", ["command_center", "dos_quick_review"])
      .order("testimony_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    const fallbackFruitItemsResult = fruitItemsResult.error && isMissingFruitWorkflowColumns(fruitItemsResult.error)
      ? await supabase
        .from("missionary_fruit_items")
        .select("id, household_id, table_id, encounter_id, field_person_id, body, internal_notes, outcome_tags, cc_status, testimony_date, created_at, updated_at")
        .in("household_id", ids)
        .in("source_app", ["command_center", "dos_quick_review"])
        .order("testimony_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
      : fruitItemsResult;

    if (fallbackFruitItemsResult.error && !isMissingFruitItemsTable(fallbackFruitItemsResult.error) && !isMissingFruitWorkflowColumns(fallbackFruitItemsResult.error)) {
      return { error: fallbackFruitItemsResult.error.message, profiles: [] };
    }

    ((fallbackFruitItemsResult.data ?? []) as CommandFruitRow[]).forEach((fruit) => {
      const workspaceId = getOperationalWorkspaceId(fruit);

      if (!workspaceId || !ids.includes(workspaceId)) {
        return;
      }

      const currentFruit = fruitItemsByHouseholdId.get(workspaceId) ?? [];

      currentFruit.push({
        created_at: fruit.created_at,
        encounter_id: fruit.encounter_id ?? null,
        field_person_id: fruit.field_person_id ?? null,
        household_id: fruit.household_id ?? workspaceId,
        id: fruit.id,
        internal_notes: fruit.internal_notes ?? "",
        outcome_tags: getOutcomeTags(fruit.outcome_tags),
        status: getFruitStatus(fruit.cc_status),
        summary: fruit.body,
        table_id: fruit.table_id ?? null,
        testimony_date: fruit.testimony_date,
        updated_at: fruit.updated_at,
        workspace_id: workspaceId,
      });
      fruitItemsByHouseholdId.set(workspaceId, currentFruit);
    });

    const connectionLogsResult = await supabase
      .from("missionary_connection_logs")
      .select("id, workspace_id, household_id, field_person_id, connection_date, duration_minutes, interaction_type, notes, movement_step, follow_up_needed, created_at, updated_at")
      .in("workspace_id", ids)
      .order("connection_date", { ascending: false })
      .order("created_at", { ascending: false });
    const fallbackConnectionLogsResult = connectionLogsResult.error && isMissingWorkspaceScopeColumn(connectionLogsResult.error)
      ? await supabase
        .from("missionary_connection_logs")
        .select("id, household_id, field_person_id, connection_date, duration_minutes, interaction_type, notes, movement_step, follow_up_needed, created_at, updated_at")
        .in("household_id", ids)
        .order("connection_date", { ascending: false })
        .order("created_at", { ascending: false })
      : connectionLogsResult;

    if (fallbackConnectionLogsResult.error && !isMissingWorkflowTable(fallbackConnectionLogsResult.error, "missionary_connection_logs")) {
      return { error: fallbackConnectionLogsResult.error.message, profiles: [] };
    }

    ((fallbackConnectionLogsResult.data ?? []) as ConnectionLogRow[]).forEach((connection) => {
      const workspaceId = getOperationalWorkspaceId(connection);

      if (!workspaceId || !ids.includes(workspaceId)) {
        return;
      }

      const currentConnections = connectionLogsByHouseholdId.get(workspaceId) ?? [];

      currentConnections.push({
        connection_date: connection.connection_date,
        created_at: connection.created_at,
        duration_minutes: connection.duration_minutes,
        field_person_id: connection.field_person_id,
        follow_up_needed: connection.follow_up_needed,
        household_id: connection.household_id ?? workspaceId,
        id: connection.id,
        interaction_type: getConnectionType(connection.interaction_type),
        movement_step: getMovementStep(connection.movement_step),
        notes: connection.notes,
        updated_at: connection.updated_at,
        workspace_id: workspaceId,
      });
      connectionLogsByHouseholdId.set(workspaceId, currentConnections);
    });

    const libraryItemsResult = await supabase
      .from("missionary_library_items")
      .select("id, workspace_id, household_id, title, category, description, content_notes, created_at, updated_at")
      .in("workspace_id", ids)
      .order("title", { ascending: true });
    const fallbackLibraryItemsResult = libraryItemsResult.error && isMissingWorkspaceScopeColumn(libraryItemsResult.error)
      ? await supabase
        .from("missionary_library_items")
        .select("id, household_id, title, category, description, content_notes, created_at, updated_at")
        .in("household_id", ids)
        .order("title", { ascending: true })
      : libraryItemsResult;

    if (fallbackLibraryItemsResult.error && !isMissingWorkflowTable(fallbackLibraryItemsResult.error, "missionary_library_items")) {
      return { error: fallbackLibraryItemsResult.error.message, profiles: [] };
    }

    ((fallbackLibraryItemsResult.data ?? []) as LibraryItemRow[]).forEach((item) => {
      const workspaceId = getOperationalWorkspaceId(item);

      if (!workspaceId || !ids.includes(workspaceId)) {
        return;
      }

      const currentItems = libraryItemsByHouseholdId.get(workspaceId) ?? [];

      currentItems.push({
        ...item,
        household_id: item.household_id ?? workspaceId,
        workspace_id: workspaceId,
      });
      libraryItemsByHouseholdId.set(workspaceId, currentItems);
    });

    const profileAnalyticsResult = await supabase
      .from("missionary_profile_view_rollups")
      .select("missionary_profile_id, total_views, unique_visitors, last_7_days, last_7_unique_visitors, last_30_days, last_30_unique_visitors")
      .in("missionary_profile_id", ids);

    if (profileAnalyticsResult.error && !isMissingProfileAnalyticsTable(profileAnalyticsResult.error)) {
      return { error: profileAnalyticsResult.error.message, profiles: [] };
    }

    if (!profileAnalyticsResult.error) {
      ids.forEach((id) => {
        profileAnalyticsByHouseholdId.set(id, {
          last7Days: 0,
          last7UniqueVisitors: 0,
          last30Days: 0,
          last30UniqueVisitors: 0,
          totalViews: 0,
          trackingAvailable: true,
          uniqueVisitors: 0,
        });
      });
    }

    ((profileAnalyticsResult.data ?? []) as ProfilePageViewRollupRow[]).forEach((rollup) => {
      if (!rollup.missionary_profile_id || !ids.includes(rollup.missionary_profile_id)) {
        return;
      }

      profileAnalyticsByHouseholdId.set(rollup.missionary_profile_id, {
        last7Days: rollup.last_7_days ?? 0,
        last7UniqueVisitors: rollup.last_7_unique_visitors ?? 0,
        last30Days: rollup.last_30_days ?? 0,
        last30UniqueVisitors: rollup.last_30_unique_visitors ?? 0,
        totalViews: rollup.total_views ?? 0,
        trackingAvailable: true,
        uniqueVisitors: rollup.unique_visitors ?? 0,
      });
    });

    const inSeasonResult = await supabase
      .from("missionary_in_season_focus")
      .select("id, workspace_id, household_id, current_focus, prayer_emphasis, active_people_note, active_tables_note, updated_at")
      .in("workspace_id", ids);
    const fallbackInSeasonResult = inSeasonResult.error && isMissingWorkspaceScopeColumn(inSeasonResult.error)
      ? await supabase
        .from("missionary_in_season_focus")
        .select("id, household_id, current_focus, prayer_emphasis, active_people_note, active_tables_note, updated_at")
        .in("household_id", ids)
      : inSeasonResult;

    if (fallbackInSeasonResult.error && !isMissingWorkflowTable(fallbackInSeasonResult.error, "missionary_in_season_focus")) {
      return { error: fallbackInSeasonResult.error.message, profiles: [] };
    }

    ((fallbackInSeasonResult.data ?? []) as InSeasonFocusRow[]).forEach((focus) => {
      const workspaceId = getOperationalWorkspaceId(focus);

      if (!workspaceId || !ids.includes(workspaceId)) {
        return;
      }

      inSeasonByHouseholdId.set(workspaceId, {
        ...focus,
        household_id: focus.household_id ?? workspaceId,
        workspace_id: workspaceId,
      });
    });

    const publicFruitItemsResult = await supabase
      .from("missionary_fruit_items")
      .select("household_id")
      .in("household_id", ids)
      .eq("status", "published")
      .eq("visibility", "public")
      .eq("permission_to_share", true)
      .eq("missionary_public_approved", true);

    if (publicFruitItemsResult.error && !isMissingFruitItemsTable(publicFruitItemsResult.error)) {
      return { error: publicFruitItemsResult.error.message, profiles: [] };
    }

    ((publicFruitItemsResult.data ?? []) as PublicFruitItemRow[]).forEach((item) => {
      if (!item.household_id) {
        return;
      }

      publicFruitItemCountByHouseholdId.set(
        item.household_id,
        (publicFruitItemCountByHouseholdId.get(item.household_id) ?? 0) + 1,
      );
    });

    const teamMembersResult = await supabase
      .from("missionary_team_members")
      .select("id, household_id, display_name, public_number, role_title, short_description, sort_order, is_public, dos_user_id, source, status, created_at, updated_at")
      .in("household_id", ids)
      .order("sort_order", { ascending: true })
      .order("public_number", { ascending: true })
      .order("display_name", { ascending: true });

    if (teamMembersResult.error && !isMissingTeamMembersTable(teamMembersResult.error)) {
      return { error: teamMembersResult.error.message, profiles: [] };
    }

    ((teamMembersResult.data ?? []) as AdminTeamMember[]).forEach((member) => {
      const currentMembers = teamMembersByHouseholdId.get(member.household_id) ?? [];

      currentMembers.push(member);
      teamMembersByHouseholdId.set(member.household_id, currentMembers);
    });
  }

  return {
    profiles: (households ?? []).map((household) => ({
      ...(household as AdminHousehold),
      activePrayerRequestCount: activePrayerRequestCountByHouseholdId.get(household.id) ?? 0,
      connectionLogs: connectionLogsByHouseholdId.get(household.id) ?? [],
      encounterSubmissions: encounterSubmissionsByHouseholdId.get(household.id) ?? [],
      fieldPeople: fieldPeopleByHouseholdId.get(household.id) ?? [],
      fruitItems: fruitItemsByHouseholdId.get(household.id) ?? [],
      inSeasonFocus: inSeasonByHouseholdId.get(household.id),
      libraryItems: libraryItemsByHouseholdId.get(household.id) ?? [],
      majorGiftInquiries: majorGiftInquiriesByHouseholdId.get(household.id) ?? [],
      prayerPartnerCount: prayerPartnerCountByHouseholdId.get(household.id) ?? 0,
      prayerPartners: prayerPartnersByHouseholdId.get(household.id) ?? [],
      prayerRequests: prayerRequestsByHouseholdId.get(household.id) ?? [],
      profileAnalytics: profileAnalyticsByHouseholdId.get(household.id) ?? {
        last7Days: 0,
        last7UniqueVisitors: 0,
        last30Days: 0,
        last30UniqueVisitors: 0,
        totalViews: 0,
        trackingAvailable: false,
        uniqueVisitors: 0,
      },
      publicFruitItemCount: publicFruitItemCountByHouseholdId.get(household.id) ?? 0,
      support: supportByHouseholdId.get(household.id),
      supportCommitments: supportCommitmentsByHouseholdId.get(household.id) ?? [],
      schemaStatus: {
        hasPublishingFeatureColumns,
        hasStoryVersionColumns,
      },
      tables: tablesByHouseholdId.get(household.id) ?? [],
      tableReviews: tableReviewsByHouseholdId.get(household.id) ?? [],
      teamMembers: teamMembersByHouseholdId.get(household.id) ?? [],
    })),
  };
}

export default async function MissionaryProfilesAdminPage() {
  const authorization = await getAdminAuthorization();

  if (authorization.status !== "authorized") {
    return null;
  }

  const { error: loadError, profiles } = await getAdminProfiles();

  return (
    <AdminShell
      active="missionary-profiles"
      title="Missionary Workspace"
    >
      {loadError ? (
        <p className="mb-6 border border-red-500/30 bg-red-950/20 p-4 text-sm text-red-200">
          {loadError}
        </p>
      ) : null}
      <MissionaryProfilesAdminDashboard initialProfiles={profiles} />
    </AdminShell>
  );
}
