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
  type AdminMissionaryTable,
  type AdminMovementStep,
  type AdminOutcomeTag,
  type AdminProfile,
  type AdminReadiness,
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
  title: "Missionary Workspaces | USA Missionaries",
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
const tableTypes = ["kitchen_table", "coffee", "phone", "zoom", "group", "other"] as const satisfies readonly AdminTableType[];

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
};

type MissionaryTableRow = {
  created_at: string;
  field_person_ids?: string[] | null;
  household_id: string;
  id: string;
  notes: string | null;
  participant_names?: string[] | null;
  source: string | null;
  table_date: string | null;
  table_type: string | null;
  updated_at: string | null;
};

type FieldPersonRow = {
  church: string | null;
  created_at: string;
  created_by: string | null;
  email: string | null;
  engagement_level: string | null;
  household_id: string;
  id: string;
  last_activity_at: string | null;
  name: string;
  notes: string | null;
  phone: string;
  relationship_type: string | null;
  source: string | null;
  status: string | null;
  updated_at: string | null;
};

type TableReviewRow = {
  assessment_notes: string | null;
  breakthroughs_or_concerns: string | null;
  created_at: string;
  follow_up_areas: string[] | null;
  follow_up_needed: string | null;
  household_id: string;
  how_meeting_went: string | null;
  id: string;
  key_observations: string | null;
  movement_step: string | null;
  questions_covered: string | null;
  readiness: string | null;
  table_id: string;
  teaching_used: string | null;
  updated_at: string | null;
};

type CommandFruitRow = {
  body: string;
  cc_status?: string | null;
  created_at: string;
  encounter_id?: string | null;
  field_person_id?: string | null;
  household_id: string;
  id: string;
  internal_notes?: string | null;
  outcome_tags?: string[] | null;
  table_id?: string | null;
  testimony_date: string | null;
  updated_at: string | null;
};

type ConnectionLogRow = {
  connection_date: string;
  created_at: string;
  duration_minutes: number | null;
  field_person_id: string | null;
  follow_up_needed: string | null;
  household_id: string;
  id: string;
  interaction_type: string | null;
  movement_step: string | null;
  notes: string | null;
  updated_at: string | null;
};

type LibraryItemRow = {
  category: string | null;
  content_notes: string | null;
  created_at: string;
  description: string | null;
  household_id: string;
  id: string;
  title: string;
  updated_at: string | null;
};

type InSeasonFocusRow = {
  active_people_note: string | null;
  active_tables_note: string | null;
  current_focus: string | null;
  household_id: string;
  id: string;
  prayer_emphasis: string | null;
  updated_at: string | null;
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

function isMissingPrayerTeamTable(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";

  return message.includes("prayer_partners") || message.includes("prayer_requests");
}

function isMissingFormSubmissionsTable(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";

  return message.includes("form_submissions");
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

function isMissingEncounterPipelineColumns(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";

  return ["table_id", "outcome_tags", "internal_notes", "do_not_publish", "submission_type"].some((columnName) => message.includes(columnName));
}

function isMissingTablePipelineColumns(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";

  return ["participant_names", "field_person_ids"].some((columnName) => message.includes(columnName));
}

function isMissingFruitItemsTable(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";

  return message.includes("missionary_fruit_items");
}

function isMissingFruitWorkflowColumns(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";

  return ["cc_status", "table_id", "field_person_id", "internal_notes", "outcome_tags"].some((columnName) => message.includes(columnName));
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
    "enable_major_gift_inquiry",
    "major_gift_notify_email",
    "major_gift_public_description",
  ].some((columnName) => message.includes(columnName));
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

  if (error && hasMissingFeatureColumnsError(error)) {
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
  const prayerPartnerCountByHouseholdId = new Map<string, number>();
  const publicFruitItemCountByHouseholdId = new Map<string, number>();
  const tableReviewsByHouseholdId = new Map<string, AdminTableReview[]>();
  const tablesByHouseholdId = new Map<string, AdminMissionaryTable[]>();
  const teamMembersByHouseholdId = new Map<string, AdminTeamMember[]>();

  if (ids.length > 0) {
    const supportResult = await supabase
      .from("missionary_support_settings")
      .select("household_id, show_support, annual_goal, monthly_goal, monthly_committed, monthly_received, general_fund_percentage, goal_basis, monthly_giving_url, one_time_giving_url, monthly_button_label, one_time_button_label, major_gift_button_label, enable_major_gift_inquiry, major_gift_notify_email, major_gift_public_description")
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

    const [prayerPartnersResult, prayerRequestsResult] = await Promise.all([
      supabase
        .from("prayer_partners")
        .select("recruited_by_household_id, status")
        .in("recruited_by_household_id", ids),
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
      if (partner.status !== "active" || !partner.recruited_by_household_id) {
        return;
      }

      prayerPartnerCountByHouseholdId.set(
        partner.recruited_by_household_id,
        (prayerPartnerCountByHouseholdId.get(partner.recruited_by_household_id) ?? 0) + 1,
      );
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

    const tablesResult = await supabase
      .from("missionary_tables")
      .select("id, household_id, table_date, table_type, field_person_ids, participant_names, notes, source, created_at, updated_at")
      .in("household_id", ids)
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
      if (!table.household_id || !ids.includes(table.household_id)) {
        return;
      }

      const currentTables = tablesByHouseholdId.get(table.household_id) ?? [];

      currentTables.push({
        created_at: table.created_at,
        field_person_ids: getTableFieldPersonIds(table.field_person_ids),
        household_id: table.household_id,
        id: table.id,
        notes: table.notes,
        participant_names: getTableParticipantNames(table.participant_names),
        source: getTableSource(table.source),
        table_date: table.table_date ?? table.created_at.slice(0, 10),
        table_type: getTableType(table.table_type),
        updated_at: table.updated_at,
      });
      tablesByHouseholdId.set(table.household_id, currentTables);
    });

    const fieldPeopleResult = await supabase
      .from("missionary_field_people")
      .select("id, household_id, name, phone, email, church, notes, status, relationship_type, engagement_level, source, created_by, last_activity_at, created_at, updated_at")
      .in("household_id", ids)
      .order("last_activity_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false })
      .order("name", { ascending: true });

    if (fieldPeopleResult.error && !isMissingFieldPeopleTable(fieldPeopleResult.error)) {
      return { error: fieldPeopleResult.error.message, profiles: [] };
    }

    ((fieldPeopleResult.data ?? []) as FieldPersonRow[]).forEach((person) => {
      if (!person.household_id || !ids.includes(person.household_id)) {
        return;
      }

      const currentPeople = fieldPeopleByHouseholdId.get(person.household_id) ?? [];

      currentPeople.push({
        church: person.church,
        created_at: person.created_at,
        created_by: person.created_by,
        email: person.email,
        engagement_level: person.engagement_level,
        household_id: person.household_id,
        id: person.id,
        last_activity_at: person.last_activity_at,
        name: person.name,
        notes: person.notes,
        phone: person.phone,
        relationship_type: person.relationship_type,
        source: getFieldPersonSource(person.source),
        status: getFieldPersonStatus(person.status),
        updated_at: person.updated_at,
      });
      fieldPeopleByHouseholdId.set(person.household_id, currentPeople);
    });

    // Intake workflow placeholder: missionaries will eventually submit profile
    // details through public forms. Those raw submissions should appear here for
    // master_admin/admin/reviewer review, then a human updates and publishes the
    // profile. missionary_user submissions should not directly edit public fields.
    const encountersResult = await supabase
      .from("missionary_encounters")
      .select("id, missionary_profile_id, missionary_household_id, table_id, submitter_name, submitter_email, submitter_phone, encounter_date, original_testimony, public_summary, internal_notes, do_not_publish, submission_type, outcome_tags, permission_to_share, status, source, created_at, updated_at")
      .in("missionary_household_id", ids)
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
      const matchingHouseholdId = row.missionary_household_id ?? row.missionary_profile_id;

      if (!matchingHouseholdId || !ids.includes(matchingHouseholdId)) {
        return;
      }

      const currentItems = encounterSubmissionsByHouseholdId.get(matchingHouseholdId) ?? [];

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
      });
      encounterSubmissionsByHouseholdId.set(matchingHouseholdId, currentItems);
    });

    const tableReviewsResult = await supabase
      .from("missionary_table_reviews")
      .select("id, household_id, table_id, how_meeting_went, key_observations, breakthroughs_or_concerns, follow_up_needed, movement_step, teaching_used, questions_covered, assessment_notes, readiness, follow_up_areas, created_at, updated_at")
      .in("household_id", ids)
      .order("updated_at", { ascending: false });

    if (tableReviewsResult.error && !isMissingWorkflowTable(tableReviewsResult.error, "missionary_table_reviews")) {
      return { error: tableReviewsResult.error.message, profiles: [] };
    }

    ((tableReviewsResult.data ?? []) as TableReviewRow[]).forEach((review) => {
      const currentReviews = tableReviewsByHouseholdId.get(review.household_id) ?? [];

      currentReviews.push({
        assessment_notes: review.assessment_notes,
        breakthroughs_or_concerns: review.breakthroughs_or_concerns,
        created_at: review.created_at,
        follow_up_areas: getAssessmentFollowUpAreas(review.follow_up_areas),
        follow_up_needed: review.follow_up_needed,
        household_id: review.household_id,
        how_meeting_went: review.how_meeting_went,
        id: review.id,
        key_observations: review.key_observations,
        movement_step: getMovementStep(review.movement_step),
        questions_covered: review.questions_covered,
        readiness: getReadiness(review.readiness),
        table_id: review.table_id,
        teaching_used: getTeachingUsed(review.teaching_used),
        updated_at: review.updated_at,
      });
      tableReviewsByHouseholdId.set(review.household_id, currentReviews);
    });

    const fruitItemsResult = await supabase
      .from("missionary_fruit_items")
      .select("id, household_id, table_id, encounter_id, field_person_id, body, internal_notes, outcome_tags, cc_status, testimony_date, created_at, updated_at")
      .in("household_id", ids)
      .eq("source_app", "command_center")
      .order("testimony_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (fruitItemsResult.error && !isMissingFruitItemsTable(fruitItemsResult.error) && !isMissingFruitWorkflowColumns(fruitItemsResult.error)) {
      return { error: fruitItemsResult.error.message, profiles: [] };
    }

    ((fruitItemsResult.data ?? []) as CommandFruitRow[]).forEach((fruit) => {
      const currentFruit = fruitItemsByHouseholdId.get(fruit.household_id) ?? [];

      currentFruit.push({
        created_at: fruit.created_at,
        encounter_id: fruit.encounter_id ?? null,
        field_person_id: fruit.field_person_id ?? null,
        household_id: fruit.household_id,
        id: fruit.id,
        internal_notes: fruit.internal_notes ?? "",
        outcome_tags: getOutcomeTags(fruit.outcome_tags),
        status: getFruitStatus(fruit.cc_status),
        summary: fruit.body,
        table_id: fruit.table_id ?? null,
        testimony_date: fruit.testimony_date,
        updated_at: fruit.updated_at,
      });
      fruitItemsByHouseholdId.set(fruit.household_id, currentFruit);
    });

    const connectionLogsResult = await supabase
      .from("missionary_connection_logs")
      .select("id, household_id, field_person_id, connection_date, duration_minutes, interaction_type, notes, movement_step, follow_up_needed, created_at, updated_at")
      .in("household_id", ids)
      .order("connection_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (connectionLogsResult.error && !isMissingWorkflowTable(connectionLogsResult.error, "missionary_connection_logs")) {
      return { error: connectionLogsResult.error.message, profiles: [] };
    }

    ((connectionLogsResult.data ?? []) as ConnectionLogRow[]).forEach((connection) => {
      const currentConnections = connectionLogsByHouseholdId.get(connection.household_id) ?? [];

      currentConnections.push({
        connection_date: connection.connection_date,
        created_at: connection.created_at,
        duration_minutes: connection.duration_minutes,
        field_person_id: connection.field_person_id,
        follow_up_needed: connection.follow_up_needed,
        household_id: connection.household_id,
        id: connection.id,
        interaction_type: getConnectionType(connection.interaction_type),
        movement_step: getMovementStep(connection.movement_step),
        notes: connection.notes,
        updated_at: connection.updated_at,
      });
      connectionLogsByHouseholdId.set(connection.household_id, currentConnections);
    });

    const libraryItemsResult = await supabase
      .from("missionary_library_items")
      .select("id, household_id, title, category, description, content_notes, created_at, updated_at")
      .in("household_id", ids)
      .order("title", { ascending: true });

    if (libraryItemsResult.error && !isMissingWorkflowTable(libraryItemsResult.error, "missionary_library_items")) {
      return { error: libraryItemsResult.error.message, profiles: [] };
    }

    ((libraryItemsResult.data ?? []) as LibraryItemRow[]).forEach((item) => {
      const currentItems = libraryItemsByHouseholdId.get(item.household_id) ?? [];

      currentItems.push(item);
      libraryItemsByHouseholdId.set(item.household_id, currentItems);
    });

    const inSeasonResult = await supabase
      .from("missionary_in_season_focus")
      .select("id, household_id, current_focus, prayer_emphasis, active_people_note, active_tables_note, updated_at")
      .in("household_id", ids);

    if (inSeasonResult.error && !isMissingWorkflowTable(inSeasonResult.error, "missionary_in_season_focus")) {
      return { error: inSeasonResult.error.message, profiles: [] };
    }

    ((inSeasonResult.data ?? []) as InSeasonFocusRow[]).forEach((focus) => {
      inSeasonByHouseholdId.set(focus.household_id, focus);
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
      prayerPartnerCount: prayerPartnerCountByHouseholdId.get(household.id) ?? 0,
      publicFruitItemCount: publicFruitItemCountByHouseholdId.get(household.id) ?? 0,
      support: supportByHouseholdId.get(household.id),
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
      description="Manage missionary operations, public profile content, support, prayer, and ministry activity."
      title="Missionary Workspaces"
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
