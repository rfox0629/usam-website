import { NextResponse } from "next/server";
import { canEditAdminContent, getAdminAuthorization } from "@/src/lib/admin-auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import { slugify, type AdminOrganizationType } from "@/src/lib/admin/organization-shared";

const organizationFormTypes = ["usa_missionaries", "church", "ministry", "partner", "other"] as const;

type OrganizationFormType = typeof organizationFormTypes[number];

type AddOrganizationPayload = {
  defaultWorkspaceName?: unknown;
  dosEnabled?: unknown;
  name?: unknown;
  prayerEnabled?: unknown;
  primaryContactEmail?: unknown;
  primaryContactName?: unknown;
  publicProfilesEnabled?: unknown;
  publishingEnabled?: unknown;
  type?: unknown;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asBoolean(value: unknown) {
  return value === true;
}

function asOrganizationFormType(value: unknown): OrganizationFormType {
  return organizationFormTypes.includes(value as OrganizationFormType)
    ? value as OrganizationFormType
    : "ministry";
}

function dbOrganizationType(value: OrganizationFormType): AdminOrganizationType {
  return value === "usa_missionaries" ? "ministry" : value;
}

function brandingMode(value: OrganizationFormType) {
  if (value === "usa_missionaries") {
    return "usam";
  }

  if (value === "church" || value === "partner") {
    return "affiliate";
  }

  return "default";
}

function splitContactName(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
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

async function cleanupCreatedResources({
  collectiveId,
  householdId,
  organizationId,
  profileIds,
}: {
  collectiveId?: string;
  householdId?: string;
  organizationId?: string;
  profileIds?: string[];
}) {
  const supabase = createSupabaseAdminClient();

  if (organizationId) {
    await supabase
      .from("organization_memberships")
      .delete()
      .eq("organization_id", organizationId);
  }

  if (profileIds?.length) {
    await supabase
      .from("profiles")
      .delete()
      .in("id", profileIds);
  }

  if (collectiveId) {
    await supabase
      .from("collectives")
      .delete()
      .eq("id", collectiveId);
  } else if (organizationId) {
    await supabase
      .from("collectives")
      .delete()
      .eq("owner_organization_id", organizationId);
  }

  if (householdId) {
    await supabase
      .from("missionary_households")
      .delete()
      .eq("id", householdId);
  }

  if (organizationId) {
    await supabase
      .from("organizations")
      .delete()
      .eq("id", organizationId);
  }
}

async function authorizeOrganizationWrite() {
  const authorization = await getAdminAuthorization();

  if (authorization.status === "unauthenticated") {
    return {
      response: NextResponse.json({ error: "Authentication required." }, { status: 401 }),
    };
  }

  if (authorization.status === "configuration_error") {
    return {
      response: NextResponse.json({ error: authorization.message }, { status: 500 }),
    };
  }

  if (authorization.status === "unauthorized" || !canEditAdminContent(authorization)) {
    return {
      response: NextResponse.json({ error: "Editor access required." }, { status: 403 }),
    };
  }

  if (!isSupabaseAdminConfigured()) {
    return {
      response: NextResponse.json({ error: "Supabase admin environment variables are not configured." }, { status: 500 }),
    };
  }

  return { authorization };
}

async function readPayload(request: Request) {
  try {
    return await request.json() as AddOrganizationPayload;
  } catch {
    return null;
  }
}

function isMissingFeatureColumn(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";

  return message.includes("schema cache") || message.includes("could not find");
}

export async function POST(request: Request) {
  const authResult = await authorizeOrganizationWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  const payload = await readPayload(request);

  if (!payload) {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const name = asString(payload.name);
  const defaultWorkspaceName = asString(payload.defaultWorkspaceName);
  const primaryContactName = asString(payload.primaryContactName);
  const primaryContactEmail = asString(payload.primaryContactEmail).toLowerCase();
  const formType = asOrganizationFormType(payload.type);
  const publicProfilesEnabled = asBoolean(payload.publicProfilesEnabled);
  const prayerEnabled = asBoolean(payload.prayerEnabled);
  const publishingEnabled = asBoolean(payload.publishingEnabled);

  if (!name || !defaultWorkspaceName) {
    return NextResponse.json({ error: "Organization name and default workspace name are required." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const organizationSlug = await uniqueSlug("organizations", name);
  const workspaceSlug = await uniqueSlug("missionary_households", defaultWorkspaceName);
  const collectiveSlug = await uniqueSlug("collectives", workspaceSlug);
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .insert({
      branding_mode: brandingMode(formType),
      name,
      slug: organizationSlug,
      type: dbOrganizationType(formType),
    })
    .select("id, name, slug")
    .single();

  if (organizationError || !organization) {
    return NextResponse.json({ error: organizationError?.message ?? "Unable to create organization." }, { status: 500 });
  }

  const createdProfileIds: string[] = [];
  let collectiveId = "";
  let householdId = "";

  if (primaryContactName || primaryContactEmail) {
    const contactName = splitContactName(primaryContactName || primaryContactEmail);
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .insert({
        email: primaryContactEmail || null,
        first_name: contactName.firstName || "Primary",
        last_name: contactName.lastName,
        owner_organization_id: organization.id,
      })
      .select("id")
      .single();

    if (profileError || !profile) {
      await cleanupCreatedResources({ organizationId: organization.id });

      return NextResponse.json({ error: profileError?.message ?? "Organization was not created because the primary contact could not be saved." }, { status: 500 });
    }

    createdProfileIds.push(profile.id);

    const membershipResult = await supabase
      .from("organization_memberships")
      .insert({
        organization_id: organization.id,
        profile_id: profile.id,
        role: "leader",
        status: "active",
      });

    if (membershipResult.error) {
      await cleanupCreatedResources({ organizationId: organization.id, profileIds: createdProfileIds });

      return NextResponse.json({ error: membershipResult.error.message }, { status: 500 });
    }
  }

  const { data: collective, error: collectiveError } = await supabase
    .from("collectives")
    .insert({
      name: defaultWorkspaceName,
      owner_organization_id: organization.id,
      slug: collectiveSlug,
      type: formType === "church" ? "ministry_team" : "team",
    })
    .select("id")
    .single();

  if (collectiveError || !collective) {
    await cleanupCreatedResources({ organizationId: organization.id, profileIds: createdProfileIds });

    return NextResponse.json({ error: collectiveError?.message ?? "Organization was not created because the workspace record could not be saved." }, { status: 500 });
  }

  collectiveId = collective.id;

  const householdPayload = {
    display_name: defaultWorkspaceName,
    enable_prayer_team: prayerEnabled,
    public_visible: publicProfilesEnabled,
    short_mission: `${defaultWorkspaceName} workspace.`,
    show_fruit: publishingEnabled,
    show_household: publicProfilesEnabled,
    show_photos: publishingEnabled,
    show_prayer: prayerEnabled,
    show_story: publishingEnabled,
    show_support: formType === "usa_missionaries" && publicProfilesEnabled,
    show_team: publishingEnabled,
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
        display_name: defaultWorkspaceName,
        public_visible: publicProfilesEnabled,
        short_mission: `${defaultWorkspaceName} workspace.`,
        slug: workspaceSlug,
      })
      .select("id, slug, display_name")
      .single()
    : { data: household, error: householdError };

  if (fallbackHouseholdResult.error || !fallbackHouseholdResult.data) {
    await cleanupCreatedResources({
      collectiveId,
      organizationId: organization.id,
      profileIds: createdProfileIds,
    });

    return NextResponse.json({ error: fallbackHouseholdResult.error?.message ?? "Organization was created, but the workspace could not be created." }, { status: 500 });
  }

  householdId = fallbackHouseholdResult.data.id;

  return NextResponse.json({
    organization,
    temporaryCompatibility: {
      note: "Created an organizations row and a DOS-compatible missionary_households workspace until the generic workspace bridge is added.",
      workspaceId: householdId,
    },
  }, { status: 201 });
}
