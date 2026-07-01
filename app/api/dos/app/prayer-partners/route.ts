import { NextResponse } from "next/server";
import { requireDosWorkspaceRouteAccess } from "@/src/lib/dos/api-auth";
import { canWriteDosActivity, getDosAuthorization } from "@/src/lib/dos/auth";
import { resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";
import { resolveOrCreateWorkspacePersonForRole, upsertWorkspacePersonRole, type WorkspacePersonRoleStatus } from "@/src/lib/dos/person-roles";
import { relationshipContextLabel, relationshipContextOptions, type RelationshipContextValue } from "@/src/lib/dos/relationship-model";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

const statuses = ["active", "archived", "declined", "inactive", "paused", "pending"] as const;
const howJoinedValues = ["invited_by_me", "public_profile", "friend_referral", "church_ministry", "social_media", "website", "other"] as const;
const partnerSelect = "id, field_person_id, name, first_name, last_name, email, phone, city, state, region, how_heard, prayer_team, source, status, internal_notes, date_joined, approved_at, created_at, updated_at";

type PrayerPartnerPayload = {
  email?: unknown;
  howHeard?: unknown;
  how_heard?: unknown;
  id?: unknown;
  name?: unknown;
  notes?: unknown;
  phone?: unknown;
  prayerTeam?: unknown;
  prayer_team?: unknown;
  relationship?: unknown;
  relationshipContext?: unknown;
  relationship_context?: unknown;
  status?: unknown;
  workspaceId?: unknown;
  workspace_id?: unknown;
};

type LinkedPersonRow = {
  email?: string | null;
  id: string;
  name?: string | null;
  phone?: string | null;
  relationship_context?: string | null;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableString(value: unknown) {
  const text = asString(value);

  return text ? text : null;
}

function isMissingColumn(error: { message?: string } | null | undefined, columnName: string) {
  const message = error?.message?.toLowerCase() ?? "";

  return message.includes("column") && message.includes(columnName.toLowerCase()) && message.includes("does not exist");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function asStatus(value: unknown, fallback: typeof statuses[number] = "pending") {
  const status = asString(value).toLowerCase();

  if (status === "inactive") {
    return "paused";
  }

  return statuses.includes(status as typeof statuses[number]) ? status : fallback;
}

function splitName(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  const firstName = parts.shift() ?? "";
  const lastName = parts.join(" ");

  return { firstName, lastName };
}

function approvalPatch(status: string, approvedBy: string | null | undefined) {
  return status === "active"
    ? {
      approved_at: new Date().toISOString(),
      approved_by: approvedBy ?? null,
    }
    : {
      approved_at: null,
      approved_by: null,
    };
}

function personRoleStatusForPrayerPartner(status: string | null | undefined): WorkspacePersonRoleStatus {
  if (status === "inactive") {
    return "paused";
  }

  return status === "active"
    || status === "archived"
    || status === "declined"
    || status === "paused"
    || status === "pending"
    ? status
    : "pending";
}

function normalizeHowJoined(value: unknown, fallback: typeof howJoinedValues[number] = "invited_by_me"): typeof howJoinedValues[number] {
  const normalized = asString(value).toLowerCase().replace(/[\s-]+/g, "_");

  if (howJoinedValues.includes(normalized as typeof howJoinedValues[number])) {
    return normalized as typeof howJoinedValues[number];
  }

  if (["invited_by_household", "invited_by_this_household", "invited_by_us", "invited_by_me"].includes(normalized)) {
    return "invited_by_me";
  }

  if (["friend", "from_a_friend", "friend_referral"].includes(normalized)) {
    return "friend_referral";
  }

  if (["church_ministry_partner", "church_or_ministry_partner", "church_/_ministry", "church_/_ministry_partner", "church/ministry"].includes(normalized)) {
    return "church_ministry";
  }

  if (["joined_from_public_profile", "public_profile", "public_signup"].includes(normalized)) {
    return "public_profile";
  }

  return fallback;
}

function normalizePrayerTeam(value: unknown) {
  const text = asString(value);

  return text === "household_family" || text.startsWith("member:")
    ? text
    : "household_family";
}

function normalizeRelationshipContextValue(value: unknown): RelationshipContextValue {
  const normalized = asString(value).toLowerCase().replace(/[\s-]+/g, "_");

  if (normalized === "church_/_ministry_partner" || normalized === "church_ministry_partner") {
    return "ministry_partner";
  }

  const option = relationshipContextOptions.find((item) => item.value === normalized);

  return option?.value ?? "other";
}

function relationshipContextFromPayload(payload: PrayerPartnerPayload): RelationshipContextValue {
  const explicitContext = asString(payload.relationshipContext) || asString(payload.relationship_context);

  if (explicitContext) {
    return normalizeRelationshipContextValue(explicitContext);
  }

  return normalizeRelationshipContextValue(payload.relationship);
}

async function authorizeWrite() {
  const authorization = await getDosAuthorization();

  if (authorization.status === "unauthenticated") {
    return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }

  if (authorization.status === "configuration_error") {
    return { response: NextResponse.json({ error: authorization.message }, { status: 500 }) };
  }

  if (authorization.status === "unauthorized" || !canWriteDosActivity(authorization)) {
    return { response: NextResponse.json({ error: "DOS field app write access required." }, { status: 403 }) };
  }

  if (!isSupabaseAdminConfigured()) {
    return { response: NextResponse.json({ error: "Supabase admin environment variables are not configured." }, { status: 500 }) };
  }

  return { authorization };
}

async function loadLinkedPerson(supabase: ReturnType<typeof createSupabaseAdminClient>, personId: string | null | undefined) {
  if (!personId) {
    return null;
  }

  const result = await supabase
    .from("missionary_field_people")
    .select("id, name, email, phone, relationship_context")
    .eq("id", personId)
    .maybeSingle();

  if (!result.error) {
    return result.data as LinkedPersonRow | null;
  }

  if (isMissingColumn(result.error, "relationship_context")) {
    const fallbackResult = await supabase
      .from("missionary_field_people")
      .select("id, name, email, phone")
      .eq("id", personId)
      .maybeSingle();

    if (!fallbackResult.error) {
      return fallbackResult.data as LinkedPersonRow | null;
    }
  }

  return null;
}

async function updateLinkedPerson(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  personId: string,
  patch: {
    email?: string | null;
    name?: string | null;
    phone?: string | null;
    relationshipContext?: RelationshipContextValue;
  },
) {
  const personPatch: Record<string, string | null> = {};

  if (patch.name !== undefined) {
    personPatch.name = patch.name;
  }

  if (patch.email !== undefined) {
    personPatch.email = patch.email;
  }

  if (patch.phone !== undefined) {
    personPatch.phone = patch.phone;
  }

  if (patch.relationshipContext !== undefined) {
    personPatch.relationship_context = patch.relationshipContext;
  }

  if (Object.keys(personPatch).length === 0) {
    return await loadLinkedPerson(supabase, personId);
  }

  const result = await supabase
    .from("missionary_field_people")
    .update(personPatch)
    .eq("id", personId)
    .select("id, name, email, phone, relationship_context")
    .maybeSingle();

  if (!result.error) {
    return result.data as LinkedPersonRow | null;
  }

  if (isMissingColumn(result.error, "relationship_context") && "relationship_context" in personPatch) {
    const fallbackPatch = { ...personPatch };

    delete fallbackPatch.relationship_context;

    const fallbackResult = await supabase
      .from("missionary_field_people")
      .update(fallbackPatch)
      .eq("id", personId)
      .select("id, name, email, phone")
      .maybeSingle();

    if (!fallbackResult.error) {
      return fallbackResult.data as LinkedPersonRow | null;
    }
  }

  throw new Error(result.error.message);
}

function mapPrayerPartner(row: {
  city?: string | null;
  created_at?: string | null;
  date_joined?: string | null;
  email?: string | null;
  field_person_id?: string | null;
  first_name?: string | null;
  how_heard?: string | null;
  id: string;
  internal_notes?: string | null;
  last_name?: string | null;
  name?: string | null;
  phone?: string | null;
  prayer_team?: string | null;
  region?: string | null;
  source?: string | null;
  state?: string | null;
  status?: string | null;
  updated_at?: string | null;
}, linkedPerson?: LinkedPersonRow | null) {
  const relationshipContext = normalizeRelationshipContextValue(linkedPerson?.relationship_context);
  const name = linkedPerson?.name?.trim()
    || row.name?.trim()
    || [row.first_name, row.last_name].map((value) => value?.trim()).filter(Boolean).join(" ")
    || linkedPerson?.email
    || row.email
    || "Prayer Partner";

  return {
    city: row.city ?? null,
    email: linkedPerson?.email ?? row.email ?? null,
    fieldPersonId: row.field_person_id ?? null,
    howHeard: normalizeHowJoined(row.how_heard, row.source === "public_profile" ? "public_profile" : "other"),
    id: row.id,
    joinedAt: row.date_joined ?? row.created_at ?? null,
    name,
    notes: row.internal_notes ?? null,
    phone: linkedPerson?.phone ?? row.phone ?? null,
    prayerTeam: normalizePrayerTeam(row.prayer_team),
    region: row.region ?? null,
    relationshipContext,
    relationshipContextLabel: relationshipContextLabel(relationshipContext),
    source: row.source ?? "public_profile",
    state: row.state ?? null,
    status: asStatus(row.status, "pending"),
    updatedAt: row.updated_at ?? null,
  };
}

export async function POST(request: Request) {
  const authResult = await authorizeWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  let payload: PrayerPartnerPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const workspaceId = await resolveDosAppWorkspaceId(asString(payload.workspaceId) || asString(payload.workspace_id));
  const name = asString(payload.name);
  const email = asString(payload.email).toLowerCase();
  const status = asStatus(payload.status);
  const howHeard = normalizeHowJoined(payload.howHeard ?? payload.how_heard, "invited_by_me");
  const prayerTeam = normalizePrayerTeam(payload.prayerTeam ?? payload.prayer_team);
  const relationshipContext = relationshipContextFromPayload(payload);

  if (!workspaceId || !name || !email) {
    return NextResponse.json({ error: "Workspace, name, and email are required." }, { status: 400 });
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(authResult.authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  const { firstName, lastName } = splitName(name);
  const supabase = createSupabaseAdminClient();
  let linkedPersonId: string;

  try {
    const linkedPerson = await resolveOrCreateWorkspacePersonForRole(supabase, {
      createdBy: authResult.authorization.userId,
      email,
      name,
      phone: asNullableString(payload.phone),
      relationshipContext,
      role: "prayer_partner",
      roleSource: "dos",
      workspaceId,
    });

    linkedPersonId = linkedPerson.personId;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to link prayer partner to a person." }, { status: 500 });
  }

  let linkedPerson: LinkedPersonRow | null = null;

  try {
    linkedPerson = await updateLinkedPerson(supabase, linkedPersonId, {
      email,
      name,
      phone: asNullableString(payload.phone),
      relationshipContext,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update the linked person." }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("prayer_partners")
    .insert({
      ...approvalPatch(status, authResult.authorization.email),
      email,
      field_person_id: linkedPersonId,
      first_name: firstName || null,
      how_heard: howHeard,
      internal_notes: asNullableString(payload.notes),
      last_name: lastName || null,
      missionary_profile_id: workspaceId,
      name,
      phone: asNullableString(payload.phone),
      prayer_team: prayerTeam,
      recruited_by: "DOS",
      recruited_by_household_id: workspaceId,
      source: "dos",
      status,
      workspace_id: workspaceId,
    })
    .select(partnerSelect)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const roleWriteResult = await upsertWorkspacePersonRole(supabase, {
    fieldPersonId: linkedPersonId,
    metadata: {
      how_joined: howHeard,
      prayer_team: prayerTeam,
      source: "dos",
    },
    role: "prayer_partner",
    roleRecordId: data.id,
    roleRecordTable: "prayer_partners",
    source: "dos",
    status: personRoleStatusForPrayerPartner(data.status),
    workspaceId,
  });

  if (roleWriteResult.error) {
    console.error("[DOS Prayer Partners API] Failed to save person role:", roleWriteResult.error);
  }

  return NextResponse.json({ prayerPartner: mapPrayerPartner(data, linkedPerson) });
}

export async function PATCH(request: Request) {
  const authResult = await authorizeWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  let payload: PrayerPartnerPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const workspaceId = await resolveDosAppWorkspaceId(asString(payload.workspaceId) || asString(payload.workspace_id));
  const id = asString(payload.id);

  if (!workspaceId || !isUuid(id)) {
    return NextResponse.json({ error: "Workspace and prayer partner ID are required." }, { status: 400 });
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(authResult.authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  const supabase = createSupabaseAdminClient();
  const existingPartnerResult = await supabase
    .from("prayer_partners")
    .select("id, name, email, phone, field_person_id, how_heard, prayer_team, status, source")
    .eq("id", id)
    .or(`recruited_by_household_id.eq.${workspaceId},workspace_id.eq.${workspaceId},missionary_profile_id.eq.${workspaceId}`)
    .maybeSingle();

  if (existingPartnerResult.error || !existingPartnerResult.data) {
    return NextResponse.json({ error: existingPartnerResult.error?.message ?? "Prayer partner not found." }, { status: existingPartnerResult.error ? 500 : 404 });
  }

  const existingPartner = existingPartnerResult.data as {
    email?: string | null;
    field_person_id?: string | null;
    how_heard?: string | null;
    name?: string | null;
    phone?: string | null;
    prayer_team?: string | null;
    source?: string | null;
    status?: string | null;
  };
  const status = payload.status !== undefined
    ? asStatus(payload.status)
    : asStatus(existingPartner.status, "pending");
  const patch: Record<string, null | string> = {
    ...approvalPatch(status, authResult.authorization.email),
    status,
  };
  const explicitRelationshipContext = payload.relationshipContext !== undefined || payload.relationship_context !== undefined;
  const legacyRelationship = asString(payload.relationship);
  const legacyRelationshipContext = legacyRelationship
    ? normalizeRelationshipContextValue(legacyRelationship)
    : null;
  const shouldUseLegacyRelationshipAsContext = Boolean(
    legacyRelationship
    && legacyRelationshipContext
    && legacyRelationshipContext !== "other",
  );
  const relationshipContext = explicitRelationshipContext || shouldUseLegacyRelationshipAsContext
    ? relationshipContextFromPayload(payload)
    : undefined;
  const hasHowHeard = payload.howHeard !== undefined || payload.how_heard !== undefined;

  if (payload.name !== undefined) {
    const name = asString(payload.name);

    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    const { firstName, lastName } = splitName(name);

    patch.first_name = firstName || null;
    patch.last_name = lastName || null;
    patch.name = name;
  }

  if (payload.email !== undefined) {
    const email = asString(payload.email).toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    patch.email = email;
  }

  if (payload.phone !== undefined) {
    patch.phone = asNullableString(payload.phone);
  }

  if (hasHowHeard) {
    patch.how_heard = normalizeHowJoined(payload.howHeard ?? payload.how_heard, "other");
  } else if (payload.relationship !== undefined && !shouldUseLegacyRelationshipAsContext) {
    patch.how_heard = normalizeHowJoined(payload.relationship, "other");
  }

  if (payload.prayerTeam !== undefined || payload.prayer_team !== undefined) {
    patch.prayer_team = normalizePrayerTeam(payload.prayerTeam ?? payload.prayer_team);
  }

  if (payload.notes !== undefined) {
    patch.internal_notes = asNullableString(payload.notes);
  }

  let linkedPersonId = existingPartner.field_person_id ?? null;
  let linkedPerson: LinkedPersonRow | null = null;
  const shouldTouchLinkedPerson = !linkedPersonId
    || payload.name !== undefined
    || payload.email !== undefined
    || payload.phone !== undefined
    || relationshipContext !== undefined;

  if (shouldTouchLinkedPerson) {
    try {
      const resolvedPerson = await resolveOrCreateWorkspacePersonForRole(supabase, {
        createdBy: authResult.authorization.userId,
        email: typeof patch.email === "string" ? patch.email : existingPartner.email,
        name: typeof patch.name === "string" ? patch.name : existingPartner.name,
        phone: typeof patch.phone === "string" ? patch.phone : existingPartner.phone,
        relationshipContext,
        role: "prayer_partner",
        roleSource: "dos",
        workspaceId,
      });

      linkedPersonId = resolvedPerson.personId;
      patch.field_person_id = resolvedPerson.personId;
      linkedPerson = await updateLinkedPerson(supabase, resolvedPerson.personId, {
        email: payload.email !== undefined ? patch.email : undefined,
        name: payload.name !== undefined ? patch.name : undefined,
        phone: payload.phone !== undefined ? patch.phone : undefined,
        relationshipContext,
      });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to link prayer partner to a person." }, { status: 500 });
    }
  } else {
    linkedPerson = await loadLinkedPerson(supabase, linkedPersonId);
  }

  const { data, error } = await supabase
    .from("prayer_partners")
    .update(patch)
    .eq("id", id)
    .or(`recruited_by_household_id.eq.${workspaceId},workspace_id.eq.${workspaceId},missionary_profile_id.eq.${workspaceId}`)
    .select(partnerSelect)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (data.field_person_id) {
    const roleWriteResult = await upsertWorkspacePersonRole(supabase, {
      fieldPersonId: data.field_person_id,
      metadata: {
        how_joined: data.how_heard,
        prayer_team: data.prayer_team ?? "household_family",
        source: data.source ?? "dos",
      },
      role: "prayer_partner",
      roleRecordId: data.id,
      roleRecordTable: "prayer_partners",
      source: data.source ?? "dos",
      status: personRoleStatusForPrayerPartner(data.status),
      workspaceId,
    });

    if (roleWriteResult.error) {
      console.error("[DOS Prayer Partners API] Failed to save person role:", roleWriteResult.error);
    }
  }

  return NextResponse.json({ prayerPartner: mapPrayerPartner(data, linkedPerson) });
}

export async function DELETE(request: Request) {
  const authResult = await authorizeWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  let payload: PrayerPartnerPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const workspaceId = await resolveDosAppWorkspaceId(asString(payload.workspaceId) || asString(payload.workspace_id));
  const id = asString(payload.id);

  if (!workspaceId || !isUuid(id)) {
    return NextResponse.json({ error: "Workspace and prayer partner ID are required." }, { status: 400 });
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(authResult.authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  const supabase = createSupabaseAdminClient();
  const roleDeleteResult = await supabase
    .from("person_roles")
    .delete()
    .eq("role_record_table", "prayer_partners")
    .eq("role_record_id", id);

  if (roleDeleteResult.error) {
    console.error("[DOS Prayer Partners API] Failed to delete person role:", roleDeleteResult.error);
  }

  const { data, error } = await supabase
    .from("prayer_partners")
    .delete()
    .eq("id", id)
    .or(`recruited_by_household_id.eq.${workspaceId},workspace_id.eq.${workspaceId},missionary_profile_id.eq.${workspaceId}`)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Prayer partner not found." }, { status: 404 });
  }

  return NextResponse.json({ deletedPrayerPartnerId: data.id });
}
