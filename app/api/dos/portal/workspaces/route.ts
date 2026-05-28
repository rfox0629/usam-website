import { NextResponse } from "next/server";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import { slugify, type AdminOrganizationType } from "@/src/lib/admin/organization-shared";

type DosPortalPayload = {
  city?: unknown;
  email?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  organizationName?: unknown;
  phone?: unknown;
  roleCalling?: unknown;
  setupType?: unknown;
  state?: unknown;
  workspaceName?: unknown;
};

type SetupType = "church" | "ministry_team" | "personal" | "usa_missionaries";

const setupTypes = ["church", "ministry_team", "personal", "usa_missionaries"] as const;

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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
  const workspaceName = asString(payload.workspaceName);
  const providedOrganizationName = asString(payload.organizationName);
  const personName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const organizationName = setupType === "usa_missionaries"
    ? "USA Missionaries"
    : setupType === "personal"
      ? `${personName || workspaceName} DOS`
      : providedOrganizationName;

  if (!firstName || !lastName || !email || !workspaceName) {
    return NextResponse.json({ error: "First name, last name, email, and workspace name are required." }, { status: 400 });
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
    const { organization, wasCreated } = await findOrCreateOrganization({ organizationName, setupType });

    if (wasCreated) {
      createdOrganizationId = organization.id;
    }
    const workspaceSlug = await uniqueSlug("missionary_households", workspaceName);
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

    await supabase
      .from("collective_memberships")
      .insert({
        collective_id: collectiveId,
        profile_id: profileId,
        role: setupType === "personal" ? "owner" : "leader",
        status: "pending",
      });

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

    await supabase
      .from("missionary_team_members")
      .insert({
        display_name: personName,
        household_id: householdId,
        is_public: false,
        role_title: roleLabel(roleCalling),
        source: "dos",
        status: "active",
      });

    return NextResponse.json({
      organizationId: organization.id,
      profileId,
      temporaryCompatibility: {
        note: "Created a DOS workspace using the current missionary_households compatibility layer.",
        workspaceId: householdId,
      },
      workspaceHref: `/dos/workspaces/${fallbackHouseholdResult.data.slug}`,
      workspaceSlug: fallbackHouseholdResult.data.slug,
    }, { status: 201 });
  } catch (error) {
    await cleanupCreatedResources({ collectiveId, householdId, organizationId: createdOrganizationId, profileId });

    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unable to create DOS workspace.",
    }, { status: 500 });
  }
}
