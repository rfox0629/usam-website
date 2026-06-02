import { NextResponse } from "next/server";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import { slugify, type AdminOrganizationType } from "@/src/lib/admin/organization-shared";
import { submitUsamApplicationForSetup, type UsamApplicationSubmitPayload } from "@/src/lib/dos/usam-application";

type DosPortalPayload = {
  city?: unknown;
  email?: unknown;
  firstName?: unknown;
  firstThreePeople?: unknown;
  lastName?: unknown;
  organizationRole?: unknown;
  organizationName?: unknown;
  people?: unknown;
  phone?: unknown;
  roleCalling?: unknown;
  setupType?: unknown;
  spouseEmail?: unknown;
  spouseName?: unknown;
  spousePhone?: unknown;
  state?: unknown;
  teamStatus?: unknown;
  usamApplication?: unknown;
  workspaceName?: unknown;
};

type SetupPersonPayload = {
  address?: unknown;
  email?: unknown;
  name?: unknown;
  phone?: unknown;
  relationshipType?: unknown;
};

type SetupType = "church" | "ministry_team" | "personal" | "usa_missionaries";
type SetupUsamApplicationPayload = {
  callingFocus?: unknown;
  location?: unknown;
  monthlyBudget?: unknown;
  prayerNeeds?: unknown;
  profilePhotoUrl?: unknown;
  referencesText?: unknown;
  storyTestimony?: unknown;
  supportGoal?: unknown;
};

const setupTypes = ["church", "ministry_team", "personal", "usa_missionaries"] as const;

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableString(value: unknown) {
  const text = asString(value);

  return text ? text : null;
}

function asNullableNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/[$,]/g, "").trim();

  if (!normalized) {
    return null;
  }

  const number = Number(normalized);

  return Number.isFinite(number) ? number : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function asSetupType(value: unknown): SetupType {
  return setupTypes.includes(value as SetupType) ? value as SetupType : "personal";
}

function organizationTypeFor(setupType: SetupType): AdminOrganizationType {
  if (setupType === "church") {
    return "church";
  }

  if (setupType === "personal") {
    return "other";
  }

  return "ministry";
}

function brandingModeFor(setupType: SetupType) {
  if (setupType === "usa_missionaries") {
    return "usam";
  }

  if (setupType === "church") {
    return "affiliate";
  }

  return "default";
}

function collectiveTypeFor(setupType: SetupType) {
  if (setupType === "personal") {
    return "family";
  }

  if (setupType === "church" || setupType === "ministry_team") {
    return "ministry_team";
  }

  return "team";
}

function roleLabel(value: string) {
  return {
    church_leader: "Church Leader",
    disciple_maker: "Disciple Maker",
    ministry_partner: "Ministry Partner",
    prayer_partner: "Prayer Partner",
    usa_missionary: "USA Missionary",
  }[value] ?? "Disciple Maker";
}

function personalWorkspaceName(firstName: string, lastName: string) {
  return [firstName, lastName].filter(Boolean).join(" ").trim();
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");

  return digits.length >= 7 ? digits : "";
}

function appWorkspaceHref(slug: string) {
  return `/dos/app?workspace=${encodeURIComponent(slug)}`;
}

function setupApplicationPayload({
  applicantEmail,
  applicantName,
  applicantPhone,
  fallbackLocation,
  rawApplication,
  workspaceId,
}: {
  applicantEmail: string;
  applicantName: string;
  applicantPhone: string;
  fallbackLocation: string;
  rawApplication: unknown;
  workspaceId: string;
}): UsamApplicationSubmitPayload | null {
  const application = asRecord(rawApplication) as SetupUsamApplicationPayload | null;

  if (!application) {
    return null;
  }

  const storyTestimony = asString(application.storyTestimony);
  const callingFocus = asString(application.callingFocus);

  if (!storyTestimony || !callingFocus) {
    return null;
  }

  return {
    applicantEmail,
    applicantName,
    applicantPhone,
    callingFocus,
    location: asString(application.location) || fallbackLocation,
    monthlyBudget: asNullableNumber(application.monthlyBudget),
    prayerNeeds: asString(application.prayerNeeds),
    profilePhotoUrl: asString(application.profilePhotoUrl),
    referencesText: asString(application.referencesText),
    storyTestimony,
    supportGoal: asNullableNumber(application.supportGoal),
    workspaceId,
  };
}

async function readPayload(request: Request) {
  try {
    return await request.json() as DosPortalPayload;
  } catch {
    return null;
  }
}

async function uniqueSlug(
  tableName: "collectives" | "missionary_households" | "organizations",
  baseValue: string,
  columnName = "slug",
) {
  const supabase = createSupabaseAdminClient();
  const base = slugify(baseValue);

  for (let index = 0; index < 24; index += 1) {
    const candidate = index === 0 ? base : `${base}-${index + 1}`;
    const { data, error } = await supabase
      .from(tableName)
      .select("id")
      .eq(columnName, candidate)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return candidate;
    }
  }

  return `${base}-${Date.now()}`;
}

async function findOrCreateOrganization({
  organizationName,
  setupType,
}: {
  organizationName: string;
  setupType: SetupType;
}) {
  const supabase = createSupabaseAdminClient();

  if (setupType === "usa_missionaries") {
    const { data: existing, error } = await supabase
      .from("organizations")
      .select("id, name, slug")
      .or("branding_mode.eq.usam,slug.eq.usa-missionaries")
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (existing) {
      return { organization: existing, wasCreated: false };
    }
  } else {
    const existingSlug = slugify(organizationName);
    const { data: existing, error } = await supabase
      .from("organizations")
      .select("id, name, slug")
      .eq("slug", existingSlug)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (existing) {
      return { organization: existing, wasCreated: false };
    }
  }

  const name = setupType === "usa_missionaries" ? "USA Missionaries" : organizationName;
  const slug = await uniqueSlug("organizations", name);
  const { data, error } = await supabase
    .from("organizations")
    .insert({
      branding_mode: brandingModeFor(setupType),
      name,
      slug,
      type: organizationTypeFor(setupType),
    })
    .select("id, name, slug")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create organization.");
  }

  return { organization: data, wasCreated: true };
}

async function cleanupCreatedResources({
  collectiveId,
  householdId,
  organizationId,
  profileId,
}: {
  collectiveId?: string;
  householdId?: string;
  organizationId?: string;
  profileId?: string;
}) {
  const supabase = createSupabaseAdminClient();

  if (collectiveId && profileId) {
    await supabase.from("collective_memberships").delete().eq("collective_id", collectiveId).eq("profile_id", profileId);
  }

  if (organizationId && profileId) {
    await supabase.from("organization_memberships").delete().eq("organization_id", organizationId).eq("profile_id", profileId);
  }

  if (profileId) {
    await supabase.from("profiles").delete().eq("id", profileId);
  }

  if (householdId) {
    await supabase.from("missionary_team_members").delete().eq("household_id", householdId);
    await supabase.from("missionary_households").delete().eq("id", householdId);
  }

  if (collectiveId) {
    await supabase.from("collectives").delete().eq("id", collectiveId);
  }

  if (organizationId) {
    await supabase.from("organizations").delete().eq("id", organizationId);
  }
}

function isMissingFeatureColumn(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";

  return message.includes("schema cache") || message.includes("could not find");
}

function setupPeopleFromPayload(payload: DosPortalPayload) {
  const rawPeople = Array.isArray(payload.firstThreePeople)
    ? payload.firstThreePeople
    : Array.isArray(payload.people)
      ? payload.people
      : [];

  return rawPeople
    .map((rawPerson): SetupPersonPayload => rawPerson && typeof rawPerson === "object" ? rawPerson as SetupPersonPayload : {})
    .map((person) => ({
      address: asString(person.address),
      email: asString(person.email).toLowerCase(),
      name: asString(person.name),
      phone: asString(person.phone),
      relationshipType: asString(person.relationshipType),
    }))
    .filter((person) => person.name);
}

async function loadWorkspaceById(householdId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("missionary_households")
    .select("id, slug, display_name")
    .eq("id", householdId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function findExistingWorkspaceForIdentity({
  email,
  phone,
}: {
  email: string;
  phone: string;
}) {
  const supabase = createSupabaseAdminClient();
  const normalized = normalizePhone(phone);
  const teamRows: Array<{ household_id: string | null; id: string; status: string | null }> = [];
  const appendRows = (rows: Array<{ household_id: string | null; id: string; status: string | null }> | null | undefined) => {
    teamRows.push(...(rows ?? []));
  };

  if (email) {
    const directResult = await supabase
      .from("missionary_team_members")
      .select("id, household_id, status")
      .ilike("dos_user_id", email)
      .limit(1);

    if (!directResult.error) {
      appendRows(directResult.data);
    }

    const inviteEmailResult = await supabase
      .from("missionary_team_members")
      .select("id, household_id, status")
      .ilike("invite_email", email)
      .limit(1);

    if (!inviteEmailResult.error || !isMissingFeatureColumn(inviteEmailResult.error)) {
      if (inviteEmailResult.error) {
        throw new Error(inviteEmailResult.error.message);
      }

      appendRows(inviteEmailResult.data);
    }
  }

  if (normalized) {
    const invitePhoneResult = await supabase
      .from("missionary_team_members")
      .select("id, household_id, status")
      .eq("invite_phone_normalized", normalized)
      .limit(1);

    if (!invitePhoneResult.error || !isMissingFeatureColumn(invitePhoneResult.error)) {
      if (invitePhoneResult.error) {
        throw new Error(invitePhoneResult.error.message);
      }

      appendRows(invitePhoneResult.data);
    }
  }

  const existingTeamMember = teamRows.find((member) => (
    member.household_id
    && member.status !== "inactive"
    && member.status !== "archived"
  ));

  if (!existingTeamMember?.household_id) {
    return null;
  }

  await supabase
    .from("missionary_team_members")
    .update({
      account_linked_at: new Date().toISOString(),
      dos_user_id: email,
      status: "active",
    })
    .eq("id", existingTeamMember.id);

  const workspace = await loadWorkspaceById(existingTeamMember.household_id);

  return workspace ?? null;
}

function teamMemberRecordCandidates(record: Record<string, unknown>) {
  const withoutInviteMetadata = Object.fromEntries(
    Object.entries(record).filter(([key]) => !["account_linked_at", "invite_email", "invite_phone", "invite_phone_normalized", "relationship_to_workspace"].includes(key)),
  );

  return [record, withoutInviteMetadata];
}

async function insertTeamMember(record: Record<string, unknown>) {
  const supabase = createSupabaseAdminClient();
  let result: { error: { message: string } | null } | null = null;

  for (const candidate of teamMemberRecordCandidates(record)) {
    result = await supabase
      .from("missionary_team_members")
      .insert(candidate);

    if (!result.error || !isMissingFeatureColumn(result.error)) {
      break;
    }
  }

  if (result?.error) {
    throw new Error(result.error.message);
  }
}

async function findExistingFieldPerson({
  email,
  name,
  phone,
  workspaceId,
}: {
  email: string;
  name: string;
  phone: string;
  workspaceId: string;
}) {
  const supabase = createSupabaseAdminClient();
  const queryBy = async (column: "email" | "name" | "phone", value: string, caseInsensitive = false) => {
    if (!value) {
      return null;
    }

    const scopedQuery = supabase
      .from("missionary_field_people")
      .select("id")
      .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
      .limit(1);
    const result = caseInsensitive
      ? await scopedQuery.ilike(column, value)
      : await scopedQuery.eq(column, value);

    if (result.error && isMissingFeatureColumn(result.error)) {
      const legacyQuery = supabase
        .from("missionary_field_people")
        .select("id")
        .eq("household_id", workspaceId)
        .limit(1);
      const legacyResult = caseInsensitive
        ? await legacyQuery.ilike(column, value)
        : await legacyQuery.eq(column, value);

      if (legacyResult.error) {
        throw new Error(legacyResult.error.message);
      }

      return legacyResult.data?.[0] ?? null;
    }

    if (result.error) {
      throw new Error(result.error.message);
    }

    return result.data?.[0] ?? null;
  };

  return await queryBy("email", email, true)
    ?? await queryBy("phone", phone)
    ?? await queryBy("name", name, true);
}

function fieldPersonRecordCandidates(record: Record<string, unknown>) {
  const { workspace_id: _workspaceId, ...legacyRecord } = record;

  return [record, legacyRecord];
}

async function insertSetupPeople({
  people,
  workspaceId,
}: {
  people: Array<{ address: string; email: string; name: string; phone: string; relationshipType: string }>;
  workspaceId: string;
}) {
  const supabase = createSupabaseAdminClient();

  for (const person of people) {
    const existingPerson = await findExistingFieldPerson({
      email: person.email,
      name: person.name,
      phone: person.phone,
      workspaceId,
    });

    if (existingPerson) {
      continue;
    }

    const notes = person.address ? `Address: ${person.address}` : "";
    const record = {
      email: asNullableString(person.email),
      household_id: workspaceId,
      name: person.name,
      notes: notes || null,
      phone: person.phone,
      relationship_type: person.relationshipType || null,
      source: "field",
      status: "new",
      workspace_id: workspaceId,
    };
    let insertResult: { error: { message: string } | null } | null = null;

    for (const candidate of fieldPersonRecordCandidates(record)) {
      insertResult = await supabase
        .from("missionary_field_people")
        .insert(candidate);

      if (!insertResult.error || !isMissingFeatureColumn(insertResult.error)) {
        break;
      }
    }

    if (insertResult?.error) {
      throw new Error(insertResult.error.message);
    }
  }
}

export async function POST(request: Request) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase admin environment variables are not configured." }, { status: 500 });
  }

  const payload = await readPayload(request);

  if (!payload) {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const setupType = asSetupType(payload.setupType);
  const firstName = asString(payload.firstName);
  const lastName = asString(payload.lastName);
  const email = asString(payload.email).toLowerCase();
  const phone = asString(payload.phone);
  const city = asString(payload.city);
  const state = asString(payload.state).toUpperCase().slice(0, 2);
  const roleCalling = asString(payload.roleCalling) || "disciple_maker";
  const organizationRole = asString(payload.organizationRole);
  const spouseEmail = asString(payload.spouseEmail).toLowerCase();
  const spouseName = asString(payload.spouseName);
  const spousePhone = asString(payload.spousePhone);
  const teamStatus = asString(payload.teamStatus) === "married_team" ? "married_team" : "individual";
  const providedOrganizationName = asString(payload.organizationName);
  const setupPeople = setupPeopleFromPayload(payload);
  const personName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const workspaceName = personalWorkspaceName(firstName, lastName);
  const organizationName = setupType === "usa_missionaries"
    ? "USA Missionaries"
    : setupType === "personal"
      ? `${personName} DOS`
      : providedOrganizationName;

  if (!firstName || !lastName || !email) {
    return NextResponse.json({ error: "First name, last name, and email are required." }, { status: 400 });
  }

  if ((setupType === "church" || setupType === "ministry_team") && !providedOrganizationName) {
    return NextResponse.json({ error: "Organization or church name is required for this setup type." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  let collectiveId = "";
  let createdOrganizationId = "";
  let householdId = "";
  let profileId = "";

  try {
    const existingWorkspace = await findExistingWorkspaceForIdentity({ email, phone });

    if (existingWorkspace) {
      return NextResponse.json({
        existingWorkspace: true,
        temporaryCompatibility: {
          note: "Found an existing DOS workspace from household membership metadata.",
          workspaceId: existingWorkspace.id,
        },
        workspaceHref: appWorkspaceHref(existingWorkspace.slug),
        workspaceSlug: existingWorkspace.slug,
      }, { status: 200 });
    }

    const { organization, wasCreated } = await findOrCreateOrganization({ organizationName, setupType });

    if (wasCreated) {
      createdOrganizationId = organization.id;
    }
    const workspaceSlug = await uniqueSlug("missionary_households", personName);
    const collectiveSlug = await uniqueSlug("collectives", workspaceSlug);
    const { data: collective, error: collectiveError } = await supabase
      .from("collectives")
      .insert({
        name: workspaceName,
        owner_organization_id: organization.id,
        slug: collectiveSlug,
        type: collectiveTypeFor(setupType),
      })
      .select("id")
      .single();

    if (collectiveError || !collective) {
      throw new Error(collectiveError?.message ?? "Unable to create workspace record.");
    }

    collectiveId = collective.id;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .insert({
        email,
        first_name: firstName,
        last_name: lastName,
        owner_organization_id: organization.id,
        phone: phone || null,
        primary_collective_id: collectiveId,
      })
      .select("id")
      .single();

    if (profileError || !profile) {
      throw new Error(profileError?.message ?? "Unable to create profile.");
    }

    profileId = profile.id;

    const membershipResult = await supabase
      .from("organization_memberships")
      .insert({
        organization_id: organization.id,
        profile_id: profileId,
        role: setupType === "personal" ? "owner" : "leader",
        status: "pending",
      });

    if (membershipResult.error) {
      throw new Error(membershipResult.error.message);
    }

    const collectiveMembershipResult = await supabase
      .from("collective_memberships")
      .insert({
        collective_id: collectiveId,
        profile_id: profileId,
        role: setupType === "personal" ? "owner" : "leader",
        status: "pending",
      });

    if (collectiveMembershipResult.error) {
      throw new Error(collectiveMembershipResult.error.message);
    }

    const location = [city, state].filter(Boolean).join(", ");
    const householdPayload = {
      display_name: workspaceName,
      enable_prayer_team: true,
      location: location || null,
      public_visible: false,
      short_mission: `${workspaceName} DOS workspace.`,
      show_fruit: false,
      show_household: false,
      show_photos: false,
      show_prayer: true,
      show_story: false,
      show_support: false,
      show_team: false,
      slug: workspaceSlug,
    };
    const { data: household, error: householdError } = await supabase
      .from("missionary_households")
      .insert(householdPayload)
      .select("id, slug, display_name")
      .single();
    const fallbackHouseholdResult = householdError && isMissingFeatureColumn(householdError)
      ? await supabase
        .from("missionary_households")
        .insert({
          display_name: workspaceName,
          location: location || null,
          public_visible: false,
          short_mission: `${workspaceName} DOS workspace.`,
          slug: workspaceSlug,
        })
        .select("id, slug, display_name")
        .single()
      : { data: household, error: householdError };

    if (fallbackHouseholdResult.error || !fallbackHouseholdResult.data) {
      throw new Error(fallbackHouseholdResult.error?.message ?? "Unable to create DOS-compatible workspace.");
    }

    householdId = fallbackHouseholdResult.data.id;

    const teamMemberPayload = {
      account_linked_at: new Date().toISOString(),
      display_name: personName,
      dos_user_id: email,
      household_id: householdId,
      invite_email: email || null,
      invite_phone: phone || null,
      invite_phone_normalized: normalizePhone(phone) || null,
      is_public: false,
      relationship_to_workspace: "owner",
      role_title: organizationRole || roleLabel(roleCalling),
      source: "dos",
      status: "active",
    };

    await insertTeamMember(teamMemberPayload);

    if (teamStatus === "married_team" && spouseName) {
      const spouseTeamMemberPayload = {
        display_name: spouseName,
        dos_user_id: spouseEmail || null,
        household_id: householdId,
        invite_email: spouseEmail || null,
        invite_phone: spousePhone || null,
        invite_phone_normalized: normalizePhone(spousePhone) || null,
        is_public: false,
        relationship_to_workspace: "spouse",
        role_title: "Team Member",
        source: "dos",
        status: "pending",
      };

      await insertTeamMember(spouseTeamMemberPayload);
    }

    if (setupPeople.length) {
      await insertSetupPeople({
        people: setupPeople,
        workspaceId: householdId,
      });
    }

    const applicationPayload = setupApplicationPayload({
      applicantEmail: email,
      applicantName: personName,
      applicantPhone: phone,
      fallbackLocation: location,
      rawApplication: payload.usamApplication,
      workspaceId: householdId,
    });
    let applicationId: string | null = null;

    if (applicationPayload) {
      const applicationResult = await submitUsamApplicationForSetup({
        payload: applicationPayload,
        profileId,
        supabase,
      });

      applicationId = applicationResult.applicationId;
    }

    return NextResponse.json({
      applicationId,
      applicationSubmitted: Boolean(applicationId),
      organizationId: organization.id,
      profileId,
      temporaryCompatibility: {
        note: "Created a personal DOS workspace using the current missionary_households compatibility layer. Household/team rollups remain linked through non-public team member metadata until a dedicated rollup relation is added.",
        workspaceId: householdId,
      },
      workspaceHref: appWorkspaceHref(fallbackHouseholdResult.data.slug),
      workspaceSlug: fallbackHouseholdResult.data.slug,
    }, { status: 201 });
  } catch (error) {
    await cleanupCreatedResources({ collectiveId, householdId, organizationId: createdOrganizationId, profileId });

    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unable to create DOS workspace.",
    }, { status: 500 });
  }
}
