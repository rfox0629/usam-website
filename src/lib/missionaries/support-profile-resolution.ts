import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

type HouseholdRow = {
  display_name: string;
  id: string;
  public_display_name?: string | null;
  public_slug?: string | null;
  public_slug_aliases?: string[] | null;
  show_household?: boolean | null;
  slug: string;
};

type TeamMemberRow = {
  display_name: string;
  household_id: string;
  is_public: boolean | null;
  status: string | null;
};

export type SupportProfileResolution = {
  householdName: string | null;
  id: string | null;
  matchQuery: string | null;
  matchSource: string | null;
  matchStatus: "matched" | "needs_review" | "unassigned";
  slug: string | null;
};

export type SupportProfileResolutionInput = {
  householdId?: string | null;
  missionaryName?: string | null;
  profileSlug?: string | null;
};

function normalizeMatchValue(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\bfamily\b/g, "")
    .replace(/\bhousehold\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function publicDisplayName(household: HouseholdRow) {
  return household.public_display_name?.trim() || household.display_name;
}

function publicSlug(household: HouseholdRow) {
  return household.public_slug?.trim() || household.slug;
}

function isVisibleHousehold(household: HouseholdRow | null | undefined): household is HouseholdRow {
  if (!household) {
    return false;
  }

  return household.show_household !== false;
}

function resolutionFromHousehold(
  household: HouseholdRow,
  matchSource: string,
  matchQuery: string | null,
): SupportProfileResolution {
  return {
    householdName: publicDisplayName(household),
    id: household.id,
    matchQuery,
    matchSource,
    matchStatus: "matched",
    slug: publicSlug(household),
  };
}

function unassignedResolution(matchQuery: string | null): SupportProfileResolution {
  return {
    householdName: null,
    id: null,
    matchQuery,
    matchSource: matchQuery ? "submitted_name" : null,
    matchStatus: matchQuery ? "needs_review" : "unassigned",
    slug: null,
  };
}

async function maybeSingle<T>(query: unknown): Promise<{ data: T | null; error: { message?: string } | null }> {
  const result = await (query as { maybeSingle: () => Promise<{ data: T | null; error: { message?: string } | null }> }).maybeSingle();

  return result;
}

async function selectHouseholds(supabase: SupabaseClient) {
  const result = await supabase
    .from("missionary_households")
    .select("id, display_name, public_display_name, slug, public_slug, public_slug_aliases, show_household")
    .eq("public_visible", true)
    .order("sort_order", { ascending: true });

  if (result.error) {
    return [];
  }

  return (result.data ?? []).filter(isVisibleHousehold);
}

export async function resolveSupportMissionaryProfile(
  supabase: SupabaseClient,
  input: SupportProfileResolutionInput,
): Promise<SupportProfileResolution> {
  const householdId = input.householdId?.trim() || null;
  const profileSlug = input.profileSlug?.trim() || null;
  const missionaryName = input.missionaryName?.trim() || null;
  const matchQuery = householdId ?? profileSlug ?? missionaryName;

  if (householdId) {
    const { data, error } = await maybeSingle<HouseholdRow>(
      supabase
        .from("missionary_households")
        .select("id, display_name, public_display_name, slug, public_slug, public_slug_aliases, show_household")
        .eq("id", householdId)
        .eq("public_visible", true),
    );

    if (!error && isVisibleHousehold(data)) {
      return resolutionFromHousehold(data, "public_profile_id", householdId);
    }
  }

  if (profileSlug) {
    const households = await selectHouseholds(supabase);
    const normalizedSlug = normalizeMatchValue(profileSlug);
    const slugMatch = households.find((household) => {
      const aliases = [
        household.slug,
        household.public_slug,
        ...(household.public_slug_aliases ?? []),
      ];

      return aliases.some((alias) => normalizeMatchValue(alias) === normalizedSlug);
    });

    if (slugMatch) {
      return resolutionFromHousehold(slugMatch, "public_slug", profileSlug);
    }
  }

  if (missionaryName) {
    const households = await selectHouseholds(supabase);
    const normalizedName = normalizeMatchValue(missionaryName);
    const directMatch = households.find((household) => {
      const values = [
        household.display_name,
        household.public_display_name,
        household.slug,
        household.public_slug,
        ...(household.public_slug_aliases ?? []),
      ];

      return values.some((value) => normalizeMatchValue(value) === normalizedName);
    });

    if (directMatch) {
      return resolutionFromHousehold(directMatch, "public_name", missionaryName);
    }

    const teamResult = await supabase
      .from("missionary_team_members")
      .select("household_id, display_name, is_public, status")
      .eq("status", "active");

    if (!teamResult.error) {
      const teamMatch = (teamResult.data ?? []).find((member) => (
        member.is_public !== false && normalizeMatchValue(member.display_name) === normalizedName
      ));
      const household = teamMatch
        ? households.find((candidate) => candidate.id === teamMatch.household_id)
        : null;

      if (household) {
        return resolutionFromHousehold(household, "team_member_name", missionaryName);
      }
    }
  }

  return unassignedResolution(missionaryName ?? profileSlug ?? null);
}
