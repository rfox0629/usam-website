import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getAdminAuthorization } from "@/src/lib/admin-auth";
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
  encounterSubmissions?: Array<{
    encounter_date?: unknown;
    id?: unknown;
    missionary_household_id?: unknown;
    missionary_profile_id?: unknown;
    original_testimony?: unknown;
    permission_to_share?: unknown;
    public_summary?: unknown;
    source?: unknown;
    status?: unknown;
    submitter_email?: unknown;
    submitter_name?: unknown;
    submitter_phone?: unknown;
  }>;
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
const encounterStatuses = ["new", "reviewed", "published", "hidden", "archived"] as const;
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
  return encounterStatuses.includes(value as typeof encounterStatuses[number])
    ? value as typeof encounterStatuses[number]
    : "new";
}

function asEncounterSource(value: unknown) {
  return encounterSources.includes(value as typeof encounterSources[number])
    ? value as typeof encounterSources[number]
    : "manual";
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

  if (authorization.status === "unauthorized") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  if (authorization.status === "configuration_error") {
    return NextResponse.json({ error: authorization.message }, { status: 500 });
  }

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
  const household = payload.household ?? {};
  const support = payload.support ?? {};
  const displayName = asString(household.display_name);
  const slug = asString(household.slug);
  const originalSlug = asString(payload.originalSlug);

  if (!householdId || !displayName || !slug) {
    return NextResponse.json({ error: "Household ID, display name, and slug are required." }, { status: 400 });
  }

  // Public forms capture submissions in Supabase.
  // Admin reviews manually, then approved public profile data is updated here.
  // Accounting remains the financial source of truth.
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

  const householdUpdate = {
    custom_serving_label: asNullableString(household.custom_serving_label),
    display_name: displayName,
    enable_prayer_team: asBooleanDefaultTrue(household.enable_prayer_team),
    fruit_from_field: asNullableString(household.fruit_from_field),
    hero_image_url: asNullableString(household.hero_image_url),
    location: primaryState,
    location_visibility: locationVisibility,
    original_story: asNullableString(household.original_story),
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

  let savedFeatureFields = true;
  let { error: householdError } = await supabase
    .from("missionary_households")
    .update(householdUpdate)
    .eq("id", householdId);

  if (householdError && hasMissingFeatureColumnsError(householdError)) {
    savedFeatureFields = false;
    const fallbackResult = await supabase
      .from("missionary_households")
      .update(householdBaseUpdate)
      .eq("id", householdId);

    householdError = fallbackResult.error;
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

  let savedEncounterSubmissions = true;

  if (Array.isArray(payload.encounterSubmissions)) {
    const sanitizedEncounterSubmissions = payload.encounterSubmissions
      .map((submission) => {
        const originalTestimony = asString(submission.original_testimony);

        if (!originalTestimony) {
          return null;
        }

        return {
          id: asString(submission.id),
          record: {
            encounter_date: asNullableDateString(submission.encounter_date),
            missionary_household_id: householdId,
            missionary_profile_id: householdId,
            original_testimony: originalTestimony,
            permission_to_share: submission.permission_to_share === true,
            public_summary: asNullableString(submission.public_summary),
            source: asEncounterSource(submission.source),
            status: asEncounterStatus(submission.status),
            submitter_email: asNullableString(submission.submitter_email),
            submitter_name: asNullableString(submission.submitter_name),
            submitter_phone: asNullableString(submission.submitter_phone),
            updated_at: timestamp,
          },
        };
      })
      .filter((submission): submission is NonNullable<typeof submission> => Boolean(submission));
    const existingEncounterSubmissions = sanitizedEncounterSubmissions
      .filter((submission) => isExistingUuid(submission.id))
      .map((submission) => ({ ...submission.record, id: submission.id }));
    const newEncounterSubmissions = sanitizedEncounterSubmissions
      .filter((submission) => !isExistingUuid(submission.id))
      .map((submission) => submission.record);

    if (existingEncounterSubmissions.length > 0) {
      const { error: encounterUpdateError } = await supabase
        .from("missionary_encounters")
        .upsert(existingEncounterSubmissions, { onConflict: "id" });

      if (encounterUpdateError) {
        if (hasMissingEncountersTableError(encounterUpdateError)) {
          savedEncounterSubmissions = false;
        } else {
          return NextResponse.json({ error: encounterUpdateError.message }, { status: 500 });
        }
      }
    }

    if (newEncounterSubmissions.length > 0 && savedEncounterSubmissions) {
      const { error: encounterInsertError } = await supabase
        .from("missionary_encounters")
        .insert(newEncounterSubmissions);

      if (encounterInsertError) {
        if (hasMissingEncountersTableError(encounterInsertError)) {
          savedEncounterSubmissions = false;
        } else {
          return NextResponse.json({ error: encounterInsertError.message }, { status: 500 });
        }
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

  if (!savedEncounterSubmissions) {
    return NextResponse.json({
      error: "Encounters were not saved because the missionary_encounters table is missing. Apply the missionary encounters migration to the connected Supabase project.",
    }, { status: 500 });
  }

  return NextResponse.json({
    message: [
      "Missionary profile saved.",
      savedFeatureFields ? "" : "Apply the profile features migration before feature controls can persist.",
      savedSupportLinkFields ? "" : "Apply the support major gift migration before giving links and major gift settings can persist.",
    ].filter(Boolean).join(" "),
    slug,
  });
}
