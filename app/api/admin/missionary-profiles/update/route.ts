import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { canEditAdminContent, getAdminAuthorization } from "@/src/lib/admin-auth";
import {
  normalizeLocationVisibility,
  normalizeMinistryRegion,
  normalizePrimaryState,
  normalizeRoleType,
  normalizeServingScope,
} from "@/src/lib/missionaries/location";
import { normalizeSupportRoutingMode } from "@/src/lib/missionaries/support-routing";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type UpdatePayload = {
  connectionLogs?: Array<{
    connection_date?: unknown;
    duration_minutes?: unknown;
    field_person_id?: unknown;
    follow_up_needed?: unknown;
    id?: unknown;
    interaction_type?: unknown;
    movement_step?: unknown;
    notes?: unknown;
  }>;
  // Encounters are raw CC intake. They may come from public forms now and from
  // Field (FD) later, but they are not rendered publicly until reviewed and
  // transformed into Fruit.
  encounterSubmissions?: Array<{
    do_not_publish?: unknown;
    encounter_date?: unknown;
    id?: unknown;
    internal_notes?: unknown;
    missionary_household_id?: unknown;
    missionary_profile_id?: unknown;
    original_testimony?: unknown;
    outcome_tags?: unknown;
    permission_to_share?: unknown;
    public_summary?: unknown;
    source?: unknown;
    status?: unknown;
    submission_type?: unknown;
    submitter_email?: unknown;
    submitter_name?: unknown;
    submitter_phone?: unknown;
    table_id?: unknown;
  }>;
  // Tables are CC meeting records. They connect daily ministry meetings to raw
  // Encounters now and future Field activity later.
  tables?: Array<{
    field_person_ids?: unknown;
    id?: unknown;
    notes?: unknown;
    participant_names?: unknown;
    source?: unknown;
    table_date?: unknown;
    table_type?: unknown;
  }>;
  tableReviews?: Array<{
    assessment_notes?: unknown;
    breakthroughs_or_concerns?: unknown;
    follow_up_areas?: unknown;
    follow_up_needed?: unknown;
    how_meeting_went?: unknown;
    id?: unknown;
    key_observations?: unknown;
    movement_step?: unknown;
    questions_covered?: unknown;
    readiness?: unknown;
    table_id?: unknown;
    teaching_used?: unknown;
  }>;
  fruitItems?: Array<{
    encounter_id?: unknown;
    field_person_id?: unknown;
    id?: unknown;
    internal_notes?: unknown;
    outcome_tags?: unknown;
    status?: unknown;
    summary?: unknown;
    table_id?: unknown;
    testimony_date?: unknown;
  }>;
  inSeasonFocus?: {
    active_people_note?: unknown;
    active_tables_note?: unknown;
    current_focus?: unknown;
    id?: unknown;
    prayer_emphasis?: unknown;
  };
  libraryItems?: Array<{
    category?: unknown;
    content_notes?: unknown;
    description?: unknown;
    id?: unknown;
    title?: unknown;
  }>;
  // Team is a PF public roster only. Do not store disciples, follow-up
  // relationships, or field relationship graph data here.
  teamMembers?: Array<{
    display_name?: unknown;
    dos_user_id?: unknown;
    id?: unknown;
    is_public?: unknown;
    public_number?: unknown;
    role_title?: unknown;
    short_description?: unknown;
    sort_order?: unknown;
    source?: unknown;
    status?: unknown;
  }>;
  household?: {
    display_name?: unknown;
    custom_serving_label?: unknown;
    enable_prayer_team?: unknown;
    fruit_from_field?: unknown;
    hero_image_url?: unknown;
    location?: unknown;
    original_story?: unknown;
    profile_image_url?: unknown;
    prayer_cta_label?: unknown;
    prayer_destination?: unknown;
    prayer_section_description?: unknown;
    prayer_section_headline?: unknown;
    public_story?: unknown;
    public_visible?: unknown;
    primary_state?: unknown;
    region?: unknown;
    role_type?: unknown;
    secondary_states?: unknown;
    serving_scope?: unknown;
    location_visibility?: unknown;
    show_fruit?: unknown;
    show_household?: unknown;
    show_photos?: unknown;
    show_team?: unknown;
    show_prayer?: unknown;
    show_story?: unknown;
    show_support?: unknown;
    short_mission?: unknown;
    slug?: unknown;
    sort_order?: unknown;
    story?: unknown;
    support_button_label?: unknown;
    support_explanation?: unknown;
    support_mode?: unknown;
    support_public_label?: unknown;
    support_target_fund?: unknown;
    support_target_household_id?: unknown;
  };
  householdId?: unknown;
  originalSlug?: unknown;
  workspace_id?: unknown;
  workspaceId?: unknown;
  support?: {
    annual_goal?: unknown;
    enable_major_gift_inquiry?: unknown;
    general_fund_percentage?: unknown;
    goal_basis?: unknown;
    major_gift_button_label?: unknown;
    major_gift_notify_email?: unknown;
    major_gift_public_description?: unknown;
    monthly_button_label?: unknown;
    monthly_committed?: unknown;
    monthly_giving_url?: unknown;
    monthly_goal?: unknown;
    monthly_received?: unknown;
    one_time_button_label?: unknown;
    one_time_giving_url?: unknown;
    show_support?: unknown;
  };
};

const encounterSources = ["manual", "public_form", "dos"] as const;
const encounterStatuses = ["raw", "reviewed", "approved", "hidden", "archived"] as const;
const encounterSubmissionTypes = ["quick_response", "full_testimony"] as const;
const outcomeTagOptions = [
  "Salvation",
  "Baptism",
  "Healing",
  "Deliverance",
  "Church Connection",
  "Discipleship",
  "Prayer Answered",
  "Other",
] as const;
const tableSources = ["command_center", "field"] as const;
const tableTypes = ["kitchen_table", "coffee", "phone", "zoom", "group", "other"] as const;
const movementSteps = ["Continue meeting", "Begin discipleship", "Send follow up", "Invite to group", "Connect to church", "Connect to ministry", "Hand off", "Pray and wait", "Other"] as const;
const teachingUsedOptions = ["Kitchen Table Gospel", "Are You Really a Disciple", "Commands of Jesus", "Other"] as const;
const readinessOptions = ["Not ready", "Curious", "Open", "Ready to follow", "Actively following"] as const;
const assessmentFollowUpAreas = ["Repentance", "Baptism", "Scripture", "Prayer", "Community", "Obedience"] as const;
const connectionTypes = ["Phone call", "Zoom", "Text", "Coffee", "Prayer", "Discipleship", "Other"] as const;
const fruitStatuses = ["draft", "approved", "private"] as const;
const teamMemberSources = ["website_admin", "dos", "public_form"] as const;
const teamMemberStatuses = ["active", "hidden", "archived"] as const;

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableString(value: unknown) {
  const nextValue = asString(value);

  return nextValue ? nextValue : null;
}

function asNullableDateString(value: unknown) {
  const nextValue = asString(value);

  return /^\d{4}-\d{2}-\d{2}$/.test(nextValue) ? nextValue : null;
}

function asPublicRosterNumber(value: unknown) {
  const nextValue = asString(value).replace(/^#/, "");

  if (!nextValue) {
    return null;
  }

  return /^\d{1,4}$/.test(nextValue)
    ? nextValue.padStart(4, "0")
    : nextValue;
}

function publicRosterNumberToInteger(value: unknown) {
  const rosterNumber = asPublicRosterNumber(value);

  if (!rosterNumber || !/^\d{4}$/.test(rosterNumber)) {
    return null;
  }

  const parsedValue = Number.parseInt(rosterNumber, 10);

  return Number.isFinite(parsedValue) && parsedValue > 1 ? parsedValue : null;
}

function formatPublicRosterNumber(value: number) {
  return String(value).padStart(4, "0");
}

function asNumber(value: unknown) {
  const nextValue = typeof value === "number" ? value : Number(asString(value));

  return Number.isFinite(nextValue) ? nextValue : 0;
}

function asBooleanDefaultTrue(value: unknown) {
  return value !== false;
}

function asPublicProfileVisibility(showHousehold: unknown, legacyPublicVisible: unknown) {
  if (typeof showHousehold === "boolean") {
    return showHousehold;
  }

  if (typeof legacyPublicVisible === "boolean") {
    return legacyPublicVisible;
  }

  return true;
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asSupportMode(value: unknown) {
  return normalizeSupportRoutingMode(typeof value === "string" ? value : null);
}

function asEncounterStatus(value: unknown) {
  if (value === "new") {
    return "raw";
  }

  if (value === "published") {
    return "approved";
  }

  return encounterStatuses.includes(value as typeof encounterStatuses[number])
    ? value as typeof encounterStatuses[number]
    : "raw";
}

function asEncounterSource(value: unknown) {
  return encounterSources.includes(value as typeof encounterSources[number])
    ? value as typeof encounterSources[number]
    : "manual";
}

function asEncounterSubmissionType(value: unknown) {
  return encounterSubmissionTypes.includes(value as typeof encounterSubmissionTypes[number])
    ? value as typeof encounterSubmissionTypes[number]
    : "full_testimony";
}

function asOutcomeTags(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is typeof outcomeTagOptions[number] => outcomeTagOptions.includes(item as typeof outcomeTagOptions[number]))
    : [];
}

function asTableSource(value: unknown) {
  return tableSources.includes(value as typeof tableSources[number])
    ? value as typeof tableSources[number]
    : "command_center";
}

function asTableType(value: unknown) {
  return tableTypes.includes(value as typeof tableTypes[number])
    ? value as typeof tableTypes[number]
    : "kitchen_table";
}

function asNullableUuid(value: unknown) {
  const nextValue = asString(value);

  return isExistingUuid(nextValue) ? nextValue : null;
}

function asMovementStep(value: unknown) {
  return movementSteps.includes(value as typeof movementSteps[number])
    ? value as typeof movementSteps[number]
    : null;
}

function asTeachingUsed(value: unknown) {
  return teachingUsedOptions.includes(value as typeof teachingUsedOptions[number])
    ? value as typeof teachingUsedOptions[number]
    : null;
}

function asReadiness(value: unknown) {
  return readinessOptions.includes(value as typeof readinessOptions[number])
    ? value as typeof readinessOptions[number]
    : null;
}

function asAssessmentFollowUpAreas(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is typeof assessmentFollowUpAreas[number] => assessmentFollowUpAreas.includes(item as typeof assessmentFollowUpAreas[number]))
    : [];
}

function asConnectionType(value: unknown) {
  return connectionTypes.includes(value as typeof connectionTypes[number])
    ? value as typeof connectionTypes[number]
    : "Phone call";
}

function asFruitStatus(value: unknown) {
  return fruitStatuses.includes(value as typeof fruitStatuses[number])
    ? value as typeof fruitStatuses[number]
    : "draft";
}

function asNullableDurationMinutes(value: unknown) {
  if (value === null || value === undefined || asString(value) === "") {
    return null;
  }

  const nextValue = typeof value === "number" ? value : Number(asString(value));

  return Number.isFinite(nextValue) && nextValue >= 0 ? Math.round(nextValue) : null;
}

function asTeamMemberSource(value: unknown) {
  return teamMemberSources.includes(value as typeof teamMemberSources[number])
    ? value as typeof teamMemberSources[number]
    : "website_admin";
}

function asTeamMemberStatus(value: unknown) {
  return teamMemberStatuses.includes(value as typeof teamMemberStatuses[number])
    ? value as typeof teamMemberStatuses[number]
    : "active";
}

function isExistingUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function hasMissingFeatureColumnsError(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";

  return [
    "show_household",
    "show_story",
    "show_fruit",
    "show_support",
    "show_photos",
    "show_team",
    "show_prayer",
    "primary_state",
    "serving_scope",
    "secondary_states",
    "region",
    "role_type",
    "custom_serving_label",
    "location_visibility",
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
  ].some((columnName) => message.includes(columnName));
}

function hasMissingStoryVersionColumnsError(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";

  return ["original_story", "public_story"].some((columnName) => message.includes(columnName));
}

function hasMissingTeamMembersTableError(error: { code?: string; message?: string } | null | undefined) {
  const code = error?.code ?? "";
  const message = error?.message ?? "";
  const missingRelation = code === "42P01"
    || code === "PGRST205"
    || message.toLowerCase().includes("schema cache")
    || message.toLowerCase().includes("does not exist")
    || message.toLowerCase().includes("could not find the table");

  return missingRelation && message.includes("missionary_team_members");
}

function hasMissingEncountersTableError(error: { code?: string; message?: string } | null | undefined) {
  const code = error?.code ?? "";
  const message = error?.message ?? "";
  const missingRelation = code === "42P01"
    || code === "PGRST205"
    || message.toLowerCase().includes("schema cache")
    || message.toLowerCase().includes("does not exist")
    || message.toLowerCase().includes("could not find the table");

  return missingRelation && message.includes("missionary_encounters");
}

function hasMissingTablesTableError(error: { code?: string; message?: string } | null | undefined) {
  const code = error?.code ?? "";
  const message = error?.message ?? "";
  const missingRelation = code === "42P01"
    || code === "PGRST205"
    || message.toLowerCase().includes("schema cache")
    || message.toLowerCase().includes("does not exist")
    || message.toLowerCase().includes("could not find the table");

  return missingRelation && message.includes("missionary_tables");
}

function hasMissingWorkflowTableError(error: { code?: string; message?: string } | null | undefined, tableName: string) {
  const code = error?.code ?? "";
  const message = error?.message ?? "";
  const missingRelation = code === "42P01"
    || code === "PGRST205"
    || message.toLowerCase().includes("schema cache")
    || message.toLowerCase().includes("does not exist")
    || message.toLowerCase().includes("could not find the table");

  return missingRelation && message.includes(tableName);
}

function hasMissingEncounterPipelineColumnsError(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";

  return ["table_id", "outcome_tags", "internal_notes", "do_not_publish", "submission_type", "workspace_id"].some((columnName) => message.includes(columnName));
}

function hasMissingTablePipelineColumnsError(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";

  return ["participant_names", "field_person_ids", "workspace_id"].some((columnName) => message.includes(columnName));
}

function hasLegacyEncounterStatusConstraintError(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";

  return message.includes("missionary_encounters_status_check");
}

function hasMissingFruitItemsTableError(error: { code?: string; message?: string } | null | undefined) {
  const code = error?.code ?? "";
  const message = error?.message ?? "";
  const missingRelation = code === "42P01"
    || code === "PGRST205"
    || message.toLowerCase().includes("schema cache")
    || message.toLowerCase().includes("does not exist")
    || message.toLowerCase().includes("could not find the table");

  return missingRelation && message.includes("missionary_fruit_items");
}

function hasMissingFruitEncounterColumnError(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";

  return message.includes("encounter_id");
}

function hasMissingFruitWorkflowColumnsError(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";

  return ["cc_status", "table_id", "field_person_id", "internal_notes", "outcome_tags", "workspace_id"].some((columnName) => message.includes(columnName));
}

function hasMissingSupportLinkColumnsError(error: { message?: string } | null | undefined) {
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

export async function POST(request: Request) {
  const authorization = await getAdminAuthorization();

  if (authorization.status === "unauthenticated") {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (authorization.status === "configuration_error") {
    return NextResponse.json({ error: authorization.message }, { status: 500 });
  }

  if (authorization.status === "unauthorized" || !canEditAdminContent(authorization)) {
    return NextResponse.json({ error: "Editor access required." }, { status: 403 });
  }

  // Master-admin-first workflow for now: admin and editor roles can edit the
  // full missionary workspace record. Future role layers can distinguish
  // master_admin, admin, reviewer, missionary_user, prayer_team, and
  // support_team, but intake submissions should still land in admin review
  // before anything publishes.
  let payload: UpdatePayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase admin environment variables are not configured." }, { status: 500 });
  }

  const householdId = asString(payload.householdId);
  const workspaceId = asString(payload.workspaceId) || asString(payload.workspace_id) || householdId;
  const household = payload.household ?? {};
  const support = payload.support ?? {};
  const displayName = asString(household.display_name);
  const slug = asString(household.slug);
  const originalSlug = asString(payload.originalSlug);

  if (!isExistingUuid(householdId) || !isExistingUuid(workspaceId) || !displayName || !slug) {
    return NextResponse.json({ error: "Missionary workspace ID, display name, and slug are required." }, { status: 400 });
  }

  // Public forms capture submissions in Supabase.
  // Admin reviews manually, then approved public profile data is updated here.
  // Accounting remains the financial source of truth.
  // Field (FD) can later create Encounters and display Fruit summaries through
  // lightweight endpoints; this Command Center route stays focused on review
  // and Profile publishing.
  const supabase = createSupabaseAdminClient();
  const timestamp = new Date().toISOString();
  const supportMode = asSupportMode(household.support_mode);
  const showSupport = supportMode !== "hidden" && asBooleanDefaultTrue(household.show_support);
  const supportTargetFund = ["general_fund", "state_leader", "regional_leader", "national_leadership"].includes(supportMode)
    ? supportMode
    : null;
  const primaryState = normalizePrimaryState(asString(household.primary_state) || asString(household.location));
  const servingScope = normalizeServingScope(asString(household.serving_scope));
  const ministryRegion = normalizeMinistryRegion(asString(household.region));
  const roleType = normalizeRoleType(asString(household.role_type));
  const locationVisibility = normalizeLocationVisibility(asString(household.location_visibility));
  const showHousehold = asPublicProfileVisibility(household.show_household, household.public_visible);
  const publicStory = asNullableString(household.public_story) ?? asNullableString(household.story);
  const originalStory = asNullableString(household.original_story);

  const householdUpdate = {
    custom_serving_label: asNullableString(household.custom_serving_label),
    display_name: displayName,
    enable_prayer_team: asBooleanDefaultTrue(household.enable_prayer_team),
    fruit_from_field: asNullableString(household.fruit_from_field),
    hero_image_url: asNullableString(household.hero_image_url),
    location: primaryState,
    location_visibility: locationVisibility,
    original_story: originalStory,
    prayer_cta_label: asNullableString(household.prayer_cta_label),
    prayer_destination: asNullableString(household.prayer_destination),
    prayer_section_description: asNullableString(household.prayer_section_description),
    prayer_section_headline: asNullableString(household.prayer_section_headline),
    primary_state: primaryState,
    profile_image_url: asNullableString(household.profile_image_url),
    public_story: publicStory,
    public_visible: showHousehold,
    region: ministryRegion,
    role_type: roleType,
    secondary_states: asStringArray(household.secondary_states),
    serving_scope: servingScope,
    show_fruit: asBooleanDefaultTrue(household.show_fruit),
    show_household: showHousehold,
    show_photos: asBooleanDefaultTrue(household.show_photos),
    show_team: asBooleanDefaultTrue(household.show_team),
    show_prayer: asBooleanDefaultTrue(household.show_prayer),
    show_story: asBooleanDefaultTrue(household.show_story),
    show_support: showSupport,
    short_mission: asNullableString(household.short_mission),
    slug,
    sort_order: asNumber(household.sort_order),
    story: publicStory,
    support_button_label: asNullableString(household.support_button_label),
    support_explanation: asNullableString(household.support_explanation),
    support_mode: supportMode,
    support_public_label: asNullableString(household.support_public_label),
    support_target_fund: supportTargetFund,
    support_target_household_id: supportMode === "household_nomination" ? asNullableString(household.support_target_household_id) : null,
    updated_at: timestamp,
  };
  const householdBaseUpdate = {
    display_name: householdUpdate.display_name,
    hero_image_url: householdUpdate.hero_image_url,
    location: householdUpdate.location,
    profile_image_url: householdUpdate.profile_image_url,
    public_visible: householdUpdate.public_visible,
    short_mission: householdUpdate.short_mission,
    slug,
    sort_order: householdUpdate.sort_order,
    story: householdUpdate.story,
    updated_at: timestamp,
  };
  const householdStoryUpdate = {
    original_story: originalStory,
    public_story: publicStory,
    story: publicStory,
    updated_at: timestamp,
  };

  let savedFeatureFields = true;
  let { error: householdError } = await supabase
    .from("missionary_households")
    .update(householdUpdate)
    .eq("id", householdId);

  if (householdError && hasMissingStoryVersionColumnsError(householdError)) {
    return NextResponse.json({
      error: "Original Story and Refined Public Story were not saved because the missionary story version columns are missing. Apply the missionary story versions migration to the connected Supabase project.",
    }, { status: 500 });
  }

  if (householdError && hasMissingFeatureColumnsError(householdError)) {
    savedFeatureFields = false;
    const fallbackResult = await supabase
      .from("missionary_households")
      .update(householdBaseUpdate)
      .eq("id", householdId);

    householdError = fallbackResult.error;

    if (!householdError) {
      const storyResult = await supabase
        .from("missionary_households")
        .update(householdStoryUpdate)
        .eq("id", householdId);

      if (storyResult.error) {
        if (hasMissingStoryVersionColumnsError(storyResult.error)) {
          return NextResponse.json({
            error: "Original Story and Refined Public Story were not saved because the missionary story version columns are missing. Apply the missionary story versions migration to the connected Supabase project.",
          }, { status: 500 });
        }

        householdError = storyResult.error;
      }
    }
  }

  if (householdError) {
    return NextResponse.json({ error: householdError.message }, { status: 500 });
  }

  const supportUpdate = {
    annual_goal: asNumber(support.annual_goal),
    enable_major_gift_inquiry: support.enable_major_gift_inquiry !== false,
    general_fund_percentage: asNumber(support.general_fund_percentage),
    goal_basis: asNullableString(support.goal_basis),
    household_id: householdId,
    major_gift_button_label: asString(support.major_gift_button_label) || "Contact About Major Gift",
    major_gift_notify_email: asString(support.major_gift_notify_email) || "ryan@usamissionaries.org",
    major_gift_public_description: asNullableString(support.major_gift_public_description),
    monthly_button_label: asString(support.monthly_button_label) || "Support Monthly",
    monthly_committed: asNumber(support.monthly_committed),
    monthly_giving_url: asNullableString(support.monthly_giving_url),
    monthly_goal: asNumber(support.monthly_goal),
    monthly_received: asNumber(support.monthly_received),
    one_time_button_label: asString(support.one_time_button_label) || "Give One Time",
    one_time_giving_url: asNullableString(support.one_time_giving_url),
    show_support: showSupport,
    updated_at: timestamp,
  };
  const supportBaseUpdate = {
    annual_goal: supportUpdate.annual_goal,
    general_fund_percentage: supportUpdate.general_fund_percentage,
    goal_basis: supportUpdate.goal_basis,
    household_id: householdId,
    monthly_committed: supportUpdate.monthly_committed,
    monthly_goal: supportUpdate.monthly_goal,
    monthly_received: supportUpdate.monthly_received,
    show_support: showSupport,
    updated_at: timestamp,
  };
  let savedSupportLinkFields = true;
  let { error: supportError } = await supabase
    .from("missionary_support_settings")
    .upsert(
      supportUpdate,
      {
        onConflict: "household_id",
      },
    );

  if (supportError && hasMissingSupportLinkColumnsError(supportError)) {
    savedSupportLinkFields = false;
    const fallbackResult = await supabase
      .from("missionary_support_settings")
      .upsert(supportBaseUpdate, { onConflict: "household_id" });

    supportError = fallbackResult.error;
  }

  if (supportError) {
    return NextResponse.json({ error: supportError.message }, { status: 500 });
  }

  let savedTables = true;
  const tableIdMap = new Map<string, string>();

  if (Array.isArray(payload.tables)) {
    const sanitizedTables = payload.tables
      .map((table) => {
        const id = asString(table.id);
        const tableDate = asNullableDateString(table.table_date) ?? timestamp.slice(0, 10);

        return {
          id,
          record: {
            field_person_ids: asStringArray(table.field_person_ids),
            household_id: householdId,
            notes: asNullableString(table.notes),
            participant_names: asStringArray(table.participant_names),
            source: asTableSource(table.source),
            table_date: tableDate,
            table_type: asTableType(table.table_type),
            updated_at: timestamp,
            workspace_id: workspaceId,
          },
        };
      });
    const existingTables = sanitizedTables
      .filter((table) => isExistingUuid(table.id))
      .map((table) => ({ ...table.record, id: table.id }));
    const newTables = sanitizedTables
      .filter((table) => !isExistingUuid(table.id));

    existingTables.forEach((table) => {
      tableIdMap.set(table.id, table.id);
    });

    if (existingTables.length > 0) {
      const { error: tableUpdateError } = await supabase
        .from("missionary_tables")
        .upsert(existingTables, { onConflict: "id" });

      if (tableUpdateError) {
        if (hasMissingTablesTableError(tableUpdateError) || hasMissingTablePipelineColumnsError(tableUpdateError)) {
          savedTables = false;
        } else {
          return NextResponse.json({ error: tableUpdateError.message }, { status: 500 });
        }
      }
    }

    if (newTables.length > 0 && savedTables) {
      const { data: insertedTables, error: tableInsertError } = await supabase
        .from("missionary_tables")
        .insert(newTables.map((table) => table.record))
        .select("id");

      if (tableInsertError) {
        if (hasMissingTablesTableError(tableInsertError) || hasMissingTablePipelineColumnsError(tableInsertError)) {
          savedTables = false;
        } else {
          return NextResponse.json({ error: tableInsertError.message }, { status: 500 });
        }
      } else {
        (insertedTables ?? []).forEach((insertedTable, index) => {
          const temporaryId = newTables[index]?.id;

          if (temporaryId && insertedTable.id) {
            tableIdMap.set(temporaryId, insertedTable.id);
          }
        });
      }
    }
  }

  let savedEncounterSubmissions = true;
  let syncedFruitItems = true;
  const encounterIdMap = new Map<string, string>();

  if (Array.isArray(payload.encounterSubmissions)) {
    const sanitizedEncounterSubmissions = payload.encounterSubmissions
      .map((submission) => {
        const originalTestimony = asString(submission.original_testimony);

        if (!originalTestimony) {
          return null;
        }

        const status = asEncounterStatus(submission.status);
        const submittedTableId = asNullableString(submission.table_id);
        const mappedTableId = submittedTableId
          ? tableIdMap.get(submittedTableId) ?? (isExistingUuid(submittedTableId) ? submittedTableId : null)
          : null;
        const doNotPublish = submission.do_not_publish === true;

        return {
          id: asString(submission.id),
          record: {
            do_not_publish: doNotPublish,
            encounter_date: asNullableDateString(submission.encounter_date),
            internal_notes: asNullableString(submission.internal_notes),
            missionary_household_id: householdId,
            missionary_profile_id: householdId,
            original_testimony: originalTestimony,
            outcome_tags: asOutcomeTags(submission.outcome_tags),
            permission_to_share: !doNotPublish && (status === "approved" || submission.permission_to_share === true),
            public_summary: asNullableString(submission.public_summary),
            source: asEncounterSource(submission.source),
            status,
            submission_type: asEncounterSubmissionType(submission.submission_type),
            submitter_email: asNullableString(submission.submitter_email),
            submitter_name: asNullableString(submission.submitter_name),
            submitter_phone: asNullableString(submission.submitter_phone),
            table_id: mappedTableId,
            updated_at: timestamp,
            workspace_id: workspaceId,
          },
        };
      })
      .filter((submission): submission is NonNullable<typeof submission> => Boolean(submission));
    const existingEncounterSubmissions = sanitizedEncounterSubmissions
      .filter((submission) => isExistingUuid(submission.id))
      .map((submission) => ({ ...submission.record, id: submission.id }));
    const newEncounterSubmissions = sanitizedEncounterSubmissions
      .filter((submission) => !isExistingUuid(submission.id));
    const savedEncounterRecords: Array<{
      id: string;
      record: typeof sanitizedEncounterSubmissions[number]["record"];
    }> = [];

    if (existingEncounterSubmissions.length > 0) {
      const { error: encounterUpdateError } = await supabase
        .from("missionary_encounters")
        .upsert(existingEncounterSubmissions, { onConflict: "id" });

      if (encounterUpdateError) {
        if (
          hasMissingEncountersTableError(encounterUpdateError)
          || hasMissingEncounterPipelineColumnsError(encounterUpdateError)
          || hasLegacyEncounterStatusConstraintError(encounterUpdateError)
        ) {
          savedEncounterSubmissions = false;
        } else {
          return NextResponse.json({ error: encounterUpdateError.message }, { status: 500 });
        }
      } else {
        existingEncounterSubmissions.forEach((submission) => {
          encounterIdMap.set(submission.id, submission.id);
          savedEncounterRecords.push({ id: submission.id, record: submission });
        });
      }
    }

    if (newEncounterSubmissions.length > 0 && savedEncounterSubmissions) {
      const { data: insertedEncounters, error: encounterInsertError } = await supabase
        .from("missionary_encounters")
        .insert(newEncounterSubmissions.map((submission) => submission.record))
        .select("id");

      if (encounterInsertError) {
        if (
          hasMissingEncountersTableError(encounterInsertError)
          || hasMissingEncounterPipelineColumnsError(encounterInsertError)
          || hasLegacyEncounterStatusConstraintError(encounterInsertError)
        ) {
          savedEncounterSubmissions = false;
        } else {
          return NextResponse.json({ error: encounterInsertError.message }, { status: 500 });
        }
      } else {
        (insertedEncounters ?? []).forEach((insertedEncounter, index) => {
          const temporaryId = newEncounterSubmissions[index]?.id;
          const record = newEncounterSubmissions[index]?.record;

          if (insertedEncounter.id && record) {
            if (temporaryId) {
              encounterIdMap.set(temporaryId, insertedEncounter.id);
            }
            savedEncounterRecords.push({ id: insertedEncounter.id, record });
          }
        });
      }
    }

    if (savedEncounterSubmissions && savedEncounterRecords.length > 0) {
      const approvedFruitRecords = savedEncounterRecords.filter(({ record }) => (
        record.status === "approved" && Boolean(record.public_summary) && record.do_not_publish !== true
      ));
      const hiddenFruitEncounterIds = savedEncounterRecords
        .filter(({ record }) => record.status !== "approved" || record.do_not_publish === true)
        .map(({ id }) => id);

      if (hiddenFruitEncounterIds.length > 0) {
        const { error: hideFruitError } = await supabase
          .from("missionary_fruit_items")
          .update({
            missionary_public_approved: false,
            permission_to_share: false,
            status: "hidden",
            updated_at: timestamp,
            visibility: "private",
          })
          .eq("workspace_id", workspaceId)
          .eq("source", "website_admin")
          .eq("source_app", "command_center")
          .in("source_external_id", hiddenFruitEncounterIds);

        if (hideFruitError) {
          if (hasMissingFruitItemsTableError(hideFruitError)) {
            syncedFruitItems = false;
          } else {
            return NextResponse.json({ error: hideFruitError.message }, { status: 500 });
          }
        }
      }

      for (const { id: encounterId, record } of approvedFruitRecords) {
        const category = record.outcome_tags.length > 0 ? record.outcome_tags.join(", ") : "Other";
        const summary = record.public_summary ?? "";
        const title = record.outcome_tags[0] ?? "Field Fruit";
        const fruitRecord = {
          body: summary,
          category,
          cc_status: "approved",
          encounter_id: encounterId,
          household_id: householdId,
          internal_notes: record.internal_notes,
          is_featured: false,
          missionary_public_approved: true,
          outcome_tags: record.outcome_tags,
          permission_to_share: true,
          sort_order: 0,
          source: "website_admin",
          source_app: "command_center",
          source_external_id: encounterId,
          status: "published",
          submitted_by_name: record.submitter_name,
          table_id: record.table_id,
          testimony_date: record.encounter_date,
          title,
          updated_at: timestamp,
          visibility: "public",
          workspace_id: workspaceId,
        };
        const { data: existingFruitItem, error: existingFruitError } = await supabase
          .from("missionary_fruit_items")
          .select("id")
          .eq("source", "website_admin")
          .eq("source_app", "command_center")
          .eq("source_external_id", encounterId)
          .maybeSingle();

        if (existingFruitError) {
          if (hasMissingFruitItemsTableError(existingFruitError)) {
            syncedFruitItems = false;
            break;
          }

          return NextResponse.json({ error: existingFruitError.message }, { status: 500 });
        }

        const fruitWriteResult = existingFruitItem?.id
          ? await supabase
            .from("missionary_fruit_items")
            .update(fruitRecord)
            .eq("id", existingFruitItem.id)
          : await supabase
            .from("missionary_fruit_items")
            .insert(fruitRecord);

        if (fruitWriteResult.error) {
          if (
            hasMissingFruitItemsTableError(fruitWriteResult.error)
            || hasMissingFruitEncounterColumnError(fruitWriteResult.error)
            || hasMissingFruitWorkflowColumnsError(fruitWriteResult.error)
          ) {
            syncedFruitItems = false;
            break;
          }

          return NextResponse.json({ error: fruitWriteResult.error.message }, { status: 500 });
        }
      }
    }
  }

  let savedTableReviews = true;

  if (Array.isArray(payload.tableReviews)) {
    const reviewRecords = payload.tableReviews
      .map((review) => {
        const submittedTableId = asString(review.table_id);
        const tableId = tableIdMap.get(submittedTableId) ?? (isExistingUuid(submittedTableId) ? submittedTableId : null);

        if (!tableId) {
          return null;
        }

        return {
          assessment_notes: asNullableString(review.assessment_notes),
          breakthroughs_or_concerns: asNullableString(review.breakthroughs_or_concerns),
          follow_up_areas: asAssessmentFollowUpAreas(review.follow_up_areas),
          follow_up_needed: asNullableString(review.follow_up_needed),
          household_id: householdId,
          how_meeting_went: asNullableString(review.how_meeting_went),
          key_observations: asNullableString(review.key_observations),
          movement_step: asMovementStep(review.movement_step),
          questions_covered: asNullableString(review.questions_covered),
          readiness: asReadiness(review.readiness),
          table_id: tableId,
          teaching_used: asTeachingUsed(review.teaching_used),
          updated_at: timestamp,
          workspace_id: workspaceId,
        };
      })
      .filter((review): review is NonNullable<typeof review> => Boolean(review));

    if (reviewRecords.length > 0) {
      const { error: reviewError } = await supabase
        .from("missionary_table_reviews")
        .upsert(reviewRecords, { onConflict: "table_id" });

      if (reviewError) {
        if (hasMissingWorkflowTableError(reviewError, "missionary_table_reviews")) {
          savedTableReviews = false;
        } else {
          return NextResponse.json({ error: reviewError.message }, { status: 500 });
        }
      }
    }
  }

  let savedCommandFruitItems = true;

  if (Array.isArray(payload.fruitItems)) {
    const sanitizedFruitItems = payload.fruitItems
      .map((fruit) => {
        const summary = asString(fruit.summary);

        if (!summary) {
          return null;
        }

        const submittedTableId = asString(fruit.table_id);
        const submittedEncounterId = asString(fruit.encounter_id);
        const tableId = tableIdMap.get(submittedTableId) ?? asNullableUuid(submittedTableId);
        const encounterId = encounterIdMap.get(submittedEncounterId) ?? asNullableUuid(submittedEncounterId);
        const outcomeTags = asOutcomeTags(fruit.outcome_tags);
        const ccStatus = asFruitStatus(fruit.status);
        const category = outcomeTags.length > 0 ? outcomeTags.join(", ") : "Other";

        return {
          id: asString(fruit.id),
          record: {
            body: summary,
            category,
            cc_status: ccStatus,
            encounter_id: encounterId,
            field_person_id: asNullableUuid(fruit.field_person_id),
            household_id: householdId,
            internal_notes: asNullableString(fruit.internal_notes),
            outcome_tags: outcomeTags,
            source: "website_admin",
            source_app: "command_center",
            table_id: tableId,
            testimony_date: asNullableDateString(fruit.testimony_date) ?? timestamp.slice(0, 10),
            title: outcomeTags[0] ?? "Field Fruit",
            updated_at: timestamp,
            workspace_id: workspaceId,
          },
        };
      })
      .filter((fruit): fruit is NonNullable<typeof fruit> => Boolean(fruit));
    const existingFruitItems = sanitizedFruitItems
      .filter((fruit) => isExistingUuid(fruit.id))
      .map((fruit) => ({
        ...fruit.record,
        ...(fruit.record.cc_status === "private" || fruit.record.cc_status === "draft"
          ? {
            missionary_public_approved: false,
            permission_to_share: false,
            status: fruit.record.cc_status === "private" ? "hidden" : "draft",
            visibility: "private",
          }
          : {}),
        id: fruit.id,
      }));
    const newFruitItems = sanitizedFruitItems
      .filter((fruit) => !isExistingUuid(fruit.id))
      .map((fruit) => ({
        ...fruit.record,
        missionary_public_approved: false,
        permission_to_share: false,
        status: "draft",
        visibility: "private",
      }));

    if (existingFruitItems.length > 0) {
      const { error: fruitUpdateError } = await supabase
        .from("missionary_fruit_items")
        .upsert(existingFruitItems, { onConflict: "id" });

      if (fruitUpdateError) {
        if (hasMissingFruitItemsTableError(fruitUpdateError) || hasMissingFruitWorkflowColumnsError(fruitUpdateError)) {
          savedCommandFruitItems = false;
        } else {
          return NextResponse.json({ error: fruitUpdateError.message }, { status: 500 });
        }
      }
    }

    if (newFruitItems.length > 0 && savedCommandFruitItems) {
      const fruitItemsToInsert: typeof newFruitItems = [];

      for (const fruitRecord of newFruitItems) {
        if (!fruitRecord.encounter_id) {
          fruitItemsToInsert.push(fruitRecord);
          continue;
        }

        const { data: existingFruitItem, error: existingFruitError } = await supabase
          .from("missionary_fruit_items")
          .select("id")
          .eq("encounter_id", fruitRecord.encounter_id)
          .maybeSingle();

        if (existingFruitError) {
          if (hasMissingFruitItemsTableError(existingFruitError) || hasMissingFruitWorkflowColumnsError(existingFruitError)) {
            savedCommandFruitItems = false;
            break;
          }

          return NextResponse.json({ error: existingFruitError.message }, { status: 500 });
        }

        if (existingFruitItem?.id) {
          const { error: fruitUpdateError } = await supabase
            .from("missionary_fruit_items")
            .update(fruitRecord)
            .eq("id", existingFruitItem.id);

          if (fruitUpdateError) {
            if (hasMissingFruitItemsTableError(fruitUpdateError) || hasMissingFruitWorkflowColumnsError(fruitUpdateError)) {
              savedCommandFruitItems = false;
              break;
            }

            return NextResponse.json({ error: fruitUpdateError.message }, { status: 500 });
          }
        } else {
          fruitItemsToInsert.push(fruitRecord);
        }
      }

      if (savedCommandFruitItems && fruitItemsToInsert.length > 0) {
        const { error: fruitInsertError } = await supabase
          .from("missionary_fruit_items")
          .insert(fruitItemsToInsert);

        if (fruitInsertError) {
          if (hasMissingFruitItemsTableError(fruitInsertError) || hasMissingFruitWorkflowColumnsError(fruitInsertError)) {
            savedCommandFruitItems = false;
          } else {
            return NextResponse.json({ error: fruitInsertError.message }, { status: 500 });
          }
        }
      }
    }
  }

  let savedConnectionLogs = true;

  if (Array.isArray(payload.connectionLogs)) {
    const sanitizedConnectionLogs = payload.connectionLogs.map((connection) => ({
      id: asString(connection.id),
      record: {
        connection_date: asNullableDateString(connection.connection_date) ?? timestamp.slice(0, 10),
        duration_minutes: asNullableDurationMinutes(connection.duration_minutes),
        field_person_id: asNullableUuid(connection.field_person_id),
        follow_up_needed: asNullableString(connection.follow_up_needed),
        household_id: householdId,
        interaction_type: asConnectionType(connection.interaction_type),
        movement_step: asMovementStep(connection.movement_step),
        notes: asNullableString(connection.notes),
        updated_at: timestamp,
        workspace_id: workspaceId,
      },
    }));
    const existingConnectionLogs = sanitizedConnectionLogs
      .filter((connection) => isExistingUuid(connection.id))
      .map((connection) => ({ ...connection.record, id: connection.id }));
    const newConnectionLogs = sanitizedConnectionLogs
      .filter((connection) => !isExistingUuid(connection.id))
      .map((connection) => connection.record);

    if (existingConnectionLogs.length > 0) {
      const { error: connectionUpdateError } = await supabase
        .from("missionary_connection_logs")
        .upsert(existingConnectionLogs, { onConflict: "id" });

      if (connectionUpdateError) {
        if (hasMissingWorkflowTableError(connectionUpdateError, "missionary_connection_logs")) {
          savedConnectionLogs = false;
        } else {
          return NextResponse.json({ error: connectionUpdateError.message }, { status: 500 });
        }
      }
    }

    if (newConnectionLogs.length > 0 && savedConnectionLogs) {
      const { error: connectionInsertError } = await supabase
        .from("missionary_connection_logs")
        .insert(newConnectionLogs);

      if (connectionInsertError) {
        if (hasMissingWorkflowTableError(connectionInsertError, "missionary_connection_logs")) {
          savedConnectionLogs = false;
        } else {
          return NextResponse.json({ error: connectionInsertError.message }, { status: 500 });
        }
      }
    }
  }

  let savedLibraryItems = true;

  if (Array.isArray(payload.libraryItems)) {
    const sanitizedLibraryItems = payload.libraryItems
      .map((item) => {
        const title = asString(item.title);

        if (!title) {
          return null;
        }

        return {
          id: asString(item.id),
          record: {
            category: asNullableString(item.category),
            content_notes: asNullableString(item.content_notes),
            description: asNullableString(item.description),
            household_id: householdId,
            title,
            updated_at: timestamp,
            workspace_id: workspaceId,
          },
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
    const existingLibraryItems = sanitizedLibraryItems
      .filter((item) => isExistingUuid(item.id))
      .map((item) => ({ ...item.record, id: item.id }));
    const newLibraryItems = sanitizedLibraryItems
      .filter((item) => !isExistingUuid(item.id))
      .map((item) => item.record);

    if (existingLibraryItems.length > 0) {
      const { error: libraryUpdateError } = await supabase
        .from("missionary_library_items")
        .upsert(existingLibraryItems, { onConflict: "id" });

      if (libraryUpdateError) {
        if (hasMissingWorkflowTableError(libraryUpdateError, "missionary_library_items")) {
          savedLibraryItems = false;
        } else {
          return NextResponse.json({ error: libraryUpdateError.message }, { status: 500 });
        }
      }
    }

    if (newLibraryItems.length > 0 && savedLibraryItems) {
      const { error: libraryInsertError } = await supabase
        .from("missionary_library_items")
        .upsert(newLibraryItems, { onConflict: "household_id,title" });

      if (libraryInsertError) {
        if (hasMissingWorkflowTableError(libraryInsertError, "missionary_library_items")) {
          savedLibraryItems = false;
        } else {
          return NextResponse.json({ error: libraryInsertError.message }, { status: 500 });
        }
      }
    }
  }

  let savedInSeasonFocus = true;

  if (payload.inSeasonFocus) {
    const { error: inSeasonError } = await supabase
      .from("missionary_in_season_focus")
      .upsert({
        active_people_note: asNullableString(payload.inSeasonFocus.active_people_note),
        active_tables_note: asNullableString(payload.inSeasonFocus.active_tables_note),
        current_focus: asNullableString(payload.inSeasonFocus.current_focus),
        household_id: householdId,
        prayer_emphasis: asNullableString(payload.inSeasonFocus.prayer_emphasis),
        updated_at: timestamp,
        workspace_id: workspaceId,
      }, { onConflict: "household_id" });

    if (inSeasonError) {
      if (hasMissingWorkflowTableError(inSeasonError, "missionary_in_season_focus")) {
        savedInSeasonFocus = false;
      } else {
        return NextResponse.json({ error: inSeasonError.message }, { status: 500 });
      }
    }
  }

  let savedTeamMembers = true;

  if (Array.isArray(payload.teamMembers)) {
    const sanitizedTeamMembers = payload.teamMembers
      .map((member) => {
        const displayName = asString(member.display_name);
        const publicNumber = asPublicRosterNumber(member.public_number);

        if (!displayName) {
          return null;
        }

        return {
          id: asString(member.id),
          record: {
            display_name: displayName,
            dos_user_id: asNullableString(member.dos_user_id),
            household_id: householdId,
            is_public: member.is_public !== false,
            public_number: publicNumber,
            role_title: asNullableString(member.role_title),
            short_description: asNullableString(member.short_description),
            sort_order: asNumber(member.sort_order),
            source: asTeamMemberSource(member.source),
            status: asTeamMemberStatus(member.status),
          },
        };
      })
      .filter((member): member is NonNullable<typeof member> => Boolean(member));

    const membersMissingPublicNumbers = sanitizedTeamMembers.filter((member) => !member.record.public_number);

    if (membersMissingPublicNumbers.length > 0) {
      const { data: publicNumberRows, error: publicNumberLoadError } = await supabase
        .from("missionary_team_members")
        .select("public_number");

      if (publicNumberLoadError && !hasMissingTeamMembersTableError(publicNumberLoadError)) {
        return NextResponse.json({ error: publicNumberLoadError.message }, { status: 500 });
      }

      if (!publicNumberLoadError) {
        const existingPublicNumberValues = (publicNumberRows ?? [])
          .map((row) => publicRosterNumberToInteger(row.public_number))
          .filter((value): value is number => typeof value === "number");
        const submittedPublicNumberValues = sanitizedTeamMembers
          .map((member) => publicRosterNumberToInteger(member.record.public_number))
          .filter((value): value is number => typeof value === "number");
        const highestRosterNumber = Math.max(1, ...existingPublicNumberValues, ...submittedPublicNumberValues);
        let nextRosterNumber = Math.max(2, highestRosterNumber + 1);

        for (const member of membersMissingPublicNumbers) {
          member.record.public_number = formatPublicRosterNumber(nextRosterNumber);
          nextRosterNumber += 1;
        }
      }
    }

    const invalidPublicNumber = sanitizedTeamMembers.find((member) => (
      member.record.public_number !== null && !/^\d{4}$/.test(member.record.public_number)
    ));

    if (invalidPublicNumber) {
      return NextResponse.json({
        error: `Public number for ${invalidPublicNumber.record.display_name} must be 4 digits, like 0009.`,
      }, { status: 400 });
    }

    const reservedPublicNumber = sanitizedTeamMembers.find((member) => member.record.public_number === "0001");

    if (reservedPublicNumber) {
      return NextResponse.json({
        error: "Public number 0001 is reserved and cannot be assigned to a team member.",
      }, { status: 400 });
    }

    const seenPublicNumbers = new Map<string, string>();

    for (const member of sanitizedTeamMembers) {
      const publicNumber = member.record.public_number;

      if (!publicNumber) {
        continue;
      }

      const existingName = seenPublicNumbers.get(publicNumber);

      if (existingName) {
        return NextResponse.json({
          error: `Public number ${publicNumber} is duplicated by ${existingName} and ${member.record.display_name}.`,
        }, { status: 400 });
      }

      seenPublicNumbers.set(publicNumber, member.record.display_name);
    }

    const publicNumbers = Array.from(seenPublicNumbers.keys());

    if (publicNumbers.length > 0) {
      const { data: existingNumberRows, error: existingNumberError } = await supabase
        .from("missionary_team_members")
        .select("id, display_name, public_number")
        .in("public_number", publicNumbers);

      if (existingNumberError && !hasMissingTeamMembersTableError(existingNumberError)) {
        return NextResponse.json({ error: existingNumberError.message }, { status: 500 });
      }

      const submittedIds = new Set(sanitizedTeamMembers.map((member) => member.id).filter(isExistingUuid));
      const conflictingRow = (existingNumberRows ?? []).find((row) => (
        row.public_number && !submittedIds.has(row.id)
      ));

      if (conflictingRow) {
        return NextResponse.json({
          error: `Public number ${conflictingRow.public_number} is already used by ${conflictingRow.display_name}.`,
        }, { status: 400 });
      }
    }

    const existingTeamMembers = sanitizedTeamMembers
      .filter((member) => isExistingUuid(member.id))
      .map((member) => ({ ...member.record, id: member.id }));
    const newTeamMembers = sanitizedTeamMembers
      .filter((member) => !isExistingUuid(member.id) && member.record.status !== "archived")
      .map((member) => member.record);

    if (existingTeamMembers.length > 0) {
      const { error: teamUpdateError } = await supabase
        .from("missionary_team_members")
        .upsert(existingTeamMembers, { onConflict: "id" });

      if (teamUpdateError) {
        if (hasMissingTeamMembersTableError(teamUpdateError)) {
          savedTeamMembers = false;
        } else {
          return NextResponse.json({ error: teamUpdateError.message }, { status: 500 });
        }
      }
    }

    if (newTeamMembers.length > 0 && savedTeamMembers) {
      const { error: teamInsertError } = await supabase
        .from("missionary_team_members")
        .insert(newTeamMembers);

      if (teamInsertError) {
        if (hasMissingTeamMembersTableError(teamInsertError)) {
          savedTeamMembers = false;
        } else {
          return NextResponse.json({ error: teamInsertError.message }, { status: 500 });
        }
      }
    }
  }

  revalidatePath("/missionaries");
  revalidatePath(`/missionaries/${slug}`);

  if (originalSlug && originalSlug !== slug) {
    revalidatePath(`/missionaries/${originalSlug}`);
  }

  if (!savedTeamMembers) {
    return NextResponse.json({
      error: "Team members were not saved because the missionary_team_members table is missing. Apply the missionary team members migration to the connected Supabase project.",
    }, { status: 500 });
  }

  if (!savedTables) {
    return NextResponse.json({
      error: "Tables were not saved because the missionary_tables table is missing. Apply the Tables, Encounters, and Fruit pipeline migration to the connected Supabase project.",
    }, { status: 500 });
  }

  if (!savedEncounterSubmissions) {
    return NextResponse.json({
      error: "Encounters were not saved because the Tables, Encounters, and Fruit pipeline columns are missing. Apply the latest missionary pipeline migration to the connected Supabase project.",
    }, { status: 500 });
  }

  if (!savedTableReviews) {
    return NextResponse.json({
      error: "Table reviews were not saved because the missionary_table_reviews table is missing. Apply the latest Command Center workflow migration to the connected Supabase project.",
    }, { status: 500 });
  }

  if (!syncedFruitItems) {
    return NextResponse.json({
      error: "Approved Fruit was not published because the missionary_fruit_items pipeline columns are missing. Apply the latest missionary pipeline migration to the connected Supabase project.",
    }, { status: 500 });
  }

  if (!savedCommandFruitItems) {
    return NextResponse.json({
      error: "Fruit summaries were not saved because the Command Center Fruit columns are missing. Apply the latest Command Center workflow migration to the connected Supabase project.",
    }, { status: 500 });
  }

  if (!savedConnectionLogs) {
    return NextResponse.json({
      error: "Connection logs were not saved because the missionary_connection_logs table is missing. Apply the latest Command Center workflow migration to the connected Supabase project.",
    }, { status: 500 });
  }

  if (!savedLibraryItems) {
    return NextResponse.json({
      error: "Library items were not saved because the missionary_library_items table is missing. Apply the latest Command Center workflow migration to the connected Supabase project.",
    }, { status: 500 });
  }

  if (!savedInSeasonFocus) {
    return NextResponse.json({
      error: "In Season focus was not saved because the missionary_in_season_focus table is missing. Apply the latest Command Center workflow migration to the connected Supabase project.",
    }, { status: 500 });
  }

  return NextResponse.json({
    message: [
      "Missionary workspace saved.",
      savedFeatureFields ? "" : "Apply the profile features migration before feature controls can persist.",
      savedSupportLinkFields ? "" : "Apply the support major gift migration before giving links and major gift settings can persist.",
    ].filter(Boolean).join(" "),
    slug,
  });
}
