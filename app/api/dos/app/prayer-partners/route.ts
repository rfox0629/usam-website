import { NextResponse } from "next/server";
import { requireDosWorkspaceRouteAccess } from "@/src/lib/dos/api-auth";
import { canWriteDosActivity, getDosAuthorization } from "@/src/lib/dos/auth";
import { resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";
import { resolveOrCreateWorkspacePersonForRole, upsertWorkspacePersonRole, type WorkspacePersonRoleStatus } from "@/src/lib/dos/person-roles";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

const statuses = ["active", "archived", "declined", "inactive", "pending"] as const;
const partnerSelect = "id, field_person_id, name, first_name, last_name, email, phone, city, state, region, how_heard, source, status, internal_notes, date_joined, approved_at, created_at, updated_at";

type PrayerPartnerPayload = {
  email?: unknown;
  id?: unknown;
  name?: unknown;
  notes?: unknown;
  phone?: unknown;
  relationship?: unknown;
  status?: unknown;
  workspaceId?: unknown;
  workspace_id?: unknown;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableString(value: unknown) {
  const text = asString(value);

  return text ? text : null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function asStatus(value: unknown) {
  const status = asString(value).toLowerCase();

  return statuses.includes(status as typeof statuses[number]) ? status : "pending";
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
  return status === "active"
    || status === "archived"
    || status === "declined"
    || status === "inactive"
    || status === "pending"
    ? status
    : "pending";
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
  region?: string | null;
  source?: string | null;
  state?: string | null;
  status?: string | null;
  updated_at?: string | null;
}) {
  const name = row.name?.trim()
    || [row.first_name, row.last_name].map((value) => value?.trim()).filter(Boolean).join(" ")
    || row.email
    || "Prayer Partner";

  return {
    city: row.city ?? null,
    email: row.email ?? null,
    fieldPersonId: row.field_person_id ?? null,
    howHeard: row.how_heard ?? null,
    id: row.id,
    joinedAt: row.date_joined ?? row.created_at ?? null,
    name,
    notes: row.internal_notes ?? null,
    phone: row.phone ?? null,
    region: row.region ?? null,
    source: row.source ?? "public_profile",
    state: row.state ?? null,
    status: row.status ?? "pending",
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
      role: "prayer_partner",
      roleSource: "dos",
      workspaceId,
    });

    linkedPersonId = linkedPerson.personId;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to link prayer partner to a person." }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("prayer_partners")
    .insert({
      ...approvalPatch(status, authResult.authorization.email),
      email,
      field_person_id: linkedPersonId,
      first_name: firstName || null,
      how_heard: asNullableString(payload.relationship),
      internal_notes: asNullableString(payload.notes),
      last_name: lastName || null,
      missionary_profile_id: workspaceId,
      name,
      phone: asNullableString(payload.phone),
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

  return NextResponse.json({ prayerPartner: mapPrayerPartner(data) });
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
  const status = asStatus(payload.status);

  if (!workspaceId || !isUuid(id)) {
    return NextResponse.json({ error: "Workspace and prayer partner ID are required." }, { status: 400 });
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(authResult.authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  const supabase = createSupabaseAdminClient();
  const patch: Record<string, null | string> = {
    ...approvalPatch(status, authResult.authorization.email),
    status,
  };

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

  if (payload.relationship !== undefined) {
    patch.how_heard = asNullableString(payload.relationship);
  }

  if (payload.notes !== undefined) {
    patch.internal_notes = asNullableString(payload.notes);
  }

  if (payload.name !== undefined || payload.email !== undefined || payload.phone !== undefined) {
    const existingPartnerResult = await supabase
      .from("prayer_partners")
      .select("id, name, email, phone, field_person_id")
      .eq("id", id)
      .or(`recruited_by_household_id.eq.${workspaceId},workspace_id.eq.${workspaceId},missionary_profile_id.eq.${workspaceId}`)
      .maybeSingle();

    if (existingPartnerResult.error || !existingPartnerResult.data) {
      return NextResponse.json({ error: existingPartnerResult.error?.message ?? "Prayer partner not found." }, { status: existingPartnerResult.error ? 500 : 404 });
    }

    const existingPartner = existingPartnerResult.data as {
      email?: string | null;
      name?: string | null;
      phone?: string | null;
    };

    try {
      const linkedPerson = await resolveOrCreateWorkspacePersonForRole(supabase, {
        createdBy: authResult.authorization.userId,
        email: typeof patch.email === "string" ? patch.email : existingPartner.email,
        name: typeof patch.name === "string" ? patch.name : existingPartner.name,
        phone: typeof patch.phone === "string" ? patch.phone : existingPartner.phone,
        role: "prayer_partner",
        roleSource: "dos",
        workspaceId,
      });

      patch.field_person_id = linkedPerson.personId;
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to link prayer partner to a person." }, { status: 500 });
    }
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

  return NextResponse.json({ prayerPartner: mapPrayerPartner(data) });
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
