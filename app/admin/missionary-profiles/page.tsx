import type { Metadata } from "next";
import {
  MissionaryProfilesAdminDashboard,
  type AdminEncounterStatus,
  type AdminEncounterSubmission,
  type AdminHousehold,
  type AdminProfile,
  type AdminSupportSettings,
  type AdminTeamMember,
} from "./MissionaryProfilesAdminDashboard";
import { AdminShell } from "../_components/AdminShell";
import { getAdminAuthorization } from "@/src/lib/admin-auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Missionary Profiles Admin | USA Missionaries",
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
const encounterStatuses = ["new", "reviewed", "published", "hidden", "archived"] as const satisfies readonly AdminEncounterStatus[];
const encounterSources = ["manual", "public_form", "dos"] as const;

type EncounterRow = {
  created_at: string;
  encounter_date: string | null;
  id: string;
  missionary_household_id: string | null;
  missionary_profile_id: string | null;
  original_testimony: string;
  permission_to_share: boolean | null;
  public_summary: string | null;
  source: string | null;
  status: AdminEncounterStatus | string | null;
  submitter_email: string | null;
  submitter_name: string | null;
  submitter_phone: string | null;
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

  if (encounterStatuses.includes(row.status as AdminEncounterStatus)) {
    return row.status as AdminEncounterStatus;
  }

  return "new";
}

function getEncounterRecordStatus(value: string | null): AdminEncounterStatus {
  return encounterStatuses.includes(value as AdminEncounterStatus) ? value as AdminEncounterStatus : "new";
}

function getEncounterRecordSource(value: string | null): AdminEncounterSubmission["source"] {
  return encounterSources.includes(value as AdminEncounterSubmission["source"]) ? value as AdminEncounterSubmission["source"] : "manual";
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

function isMissingFruitItemsTable(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";

  return message.includes("missionary_fruit_items");
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
  const encounterSubmissionsByHouseholdId = new Map<string, AdminEncounterSubmission[]>();
  const prayerPartnerCountByHouseholdId = new Map<string, number>();
  const publicFruitItemCountByHouseholdId = new Map<string, number>();
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

    const encountersResult = await supabase
      .from("missionary_encounters")
      .select("id, missionary_profile_id, missionary_household_id, submitter_name, submitter_email, submitter_phone, encounter_date, original_testimony, public_summary, permission_to_share, status, source, created_at, updated_at")
      .in("missionary_household_id", ids)
      .order("encounter_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (encountersResult.error && !isMissingEncountersTable(encountersResult.error)) {
      return { error: encountersResult.error.message, profiles: [] };
    }

    ((encountersResult.data ?? []) as EncounterRow[]).forEach((row) => {
      const matchingHouseholdId = row.missionary_household_id ?? row.missionary_profile_id;

      if (!matchingHouseholdId || !ids.includes(matchingHouseholdId)) {
        return;
      }

      const currentItems = encounterSubmissionsByHouseholdId.get(matchingHouseholdId) ?? [];

      currentItems.push({
        created_at: row.created_at,
        encounter_date: row.encounter_date,
        id: row.id,
        missionary_household_id: row.missionary_household_id,
        missionary_profile_id: row.missionary_profile_id,
        original_testimony: row.original_testimony,
        permission_to_share: row.permission_to_share === true,
        public_summary: row.public_summary,
        source: getEncounterRecordSource(row.source),
        status: getEncounterRecordStatus(row.status),
        submitter_email: row.submitter_email,
        submitter_name: row.submitter_name,
        submitter_phone: row.submitter_phone,
        updated_at: row.updated_at,
      });
      encounterSubmissionsByHouseholdId.set(matchingHouseholdId, currentItems);
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
      encounterSubmissions: encounterSubmissionsByHouseholdId.get(household.id) ?? [],
      prayerPartnerCount: prayerPartnerCountByHouseholdId.get(household.id) ?? 0,
      publicFruitItemCount: publicFruitItemCountByHouseholdId.get(household.id) ?? 0,
      support: supportByHouseholdId.get(household.id),
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
      description="Edit approved profile data and support settings stored in Supabase."
      title="Missionary Profiles"
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
