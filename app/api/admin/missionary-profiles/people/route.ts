import { NextResponse } from "next/server";
import { canEditAdminContent, getAdminAuthorization } from "@/src/lib/admin-auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

const fieldPersonStatuses = ["new", "active", "follow_up", "discipleship", "paused", "archived"] as const;
const personSelect = "id, workspace_id, household_id, name, phone, email, church, notes, status, relationship_type, engagement_level, source, created_by, last_activity_at, created_at, updated_at";
const legacyPersonSelect = "id, household_id, name, phone, email, church, notes, status, relationship_type, engagement_level, source, created_by, last_activity_at, created_at, updated_at";

type FieldPersonPayload = {
  church?: unknown;
  email?: unknown;
  engagement_level?: unknown;
  household_id?: unknown;
  householdId?: unknown;
  id?: unknown;
  name?: unknown;
  notes?: unknown;
  phone?: unknown;
  relationship_type?: unknown;
  status?: unknown;
  workspace_id?: unknown;
  workspaceId?: unknown;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableString(value: unknown) {
  const nextValue = asString(value);

  return nextValue ? nextValue : null;
}

function asFieldPersonStatus(value: unknown) {
  return fieldPersonStatuses.includes(value as typeof fieldPersonStatuses[number])
    ? value as typeof fieldPersonStatuses[number]
    : "new";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function fieldPeopleErrorMessage(error: { code?: string; message?: string }) {
  const message = error.message ?? "Unable to save person.";
  const lowerMessage = message.toLowerCase();

  if (error.code === "PGRST205" || (lowerMessage.includes("missionary_field_people") && lowerMessage.includes("schema cache"))) {
    return "People are not available for this workspace yet.";
  }

  if (isMissingWorkspaceScopeColumn(error)) {
    return "People workspace setup is still syncing. Please try again.";
  }

  return message;
}

function isMissingWorkspaceScopeColumn(error: { message?: string } | null | undefined) {
  return Boolean(error?.message?.includes("workspace_id"));
}

function withWorkspaceId<T extends { household_id?: string | null; workspace_id?: string | null }>(person: T | null, workspaceId: string) {
  return person
    ? {
      ...person,
      household_id: person.household_id ?? workspaceId,
      workspace_id: person.workspace_id ?? person.household_id ?? workspaceId,
    }
    : null;
}

async function authorizePeopleWrite() {
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
    return await request.json() as FieldPersonPayload;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const authResult = await authorizePeopleWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  const payload = await readPayload(request);

  if (!payload) {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const workspaceId = asString(payload.workspaceId) || asString(payload.workspace_id) || asString(payload.householdId) || asString(payload.household_id);
  const name = asString(payload.name);
  const phone = asString(payload.phone);

  if (!isUuid(workspaceId) || !name || !phone) {
    return NextResponse.json({ error: "Name and phone are required." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const insertPayload = {
    church: asNullableString(payload.church),
    created_by: authResult.authorization.userId,
    email: asNullableString(payload.email),
    engagement_level: asNullableString(payload.engagement_level),
    household_id: workspaceId,
    name,
    notes: asNullableString(payload.notes),
    phone,
    relationship_type: asNullableString(payload.relationship_type),
    source: "command_center",
    status: asFieldPersonStatus(payload.status),
    workspace_id: workspaceId,
  };
  const insertResult = await supabase
    .from("missionary_field_people")
    .insert(insertPayload)
    .select(personSelect)
    .single();
  // TODO: Remove the household_id-only fallback after all Supabase environments
  // have the Command Center workspace_id migration applied.
  const { workspace_id: _workspaceId, ...legacyInsertPayload } = insertPayload;
  const { data, error } = insertResult.error && isMissingWorkspaceScopeColumn(insertResult.error)
    ? await supabase
      .from("missionary_field_people")
      .insert(legacyInsertPayload)
      .select(legacyPersonSelect)
      .single()
    : insertResult;

  if (error) {
    const errorMessage = fieldPeopleErrorMessage(error);

    console.error("[People API] Failed to insert missionary_field_people:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }

  return NextResponse.json({ person: withWorkspaceId(data, workspaceId) });
}

export async function PATCH(request: Request) {
  const authResult = await authorizePeopleWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  const payload = await readPayload(request);

  if (!payload) {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const id = asString(payload.id);
  const workspaceId = asString(payload.workspaceId) || asString(payload.workspace_id) || asString(payload.householdId) || asString(payload.household_id);
  const name = asString(payload.name);
  const phone = asString(payload.phone);

  if (!isUuid(id) || !isUuid(workspaceId) || !name || !phone) {
    return NextResponse.json({ error: "Name and phone are required." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const updatePayload = {
    church: asNullableString(payload.church),
    email: asNullableString(payload.email),
    engagement_level: asNullableString(payload.engagement_level),
    name,
    notes: asNullableString(payload.notes),
    phone,
    relationship_type: asNullableString(payload.relationship_type),
    status: asFieldPersonStatus(payload.status),
  };
  const updateResult = await supabase
    .from("missionary_field_people")
    .update(updatePayload)
    .eq("id", id)
    .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
    .select(personSelect)
    .single();
  // TODO: Remove the household_id-only fallback after all Supabase environments
  // have the Command Center workspace_id migration applied.
  const { data, error } = updateResult.error && isMissingWorkspaceScopeColumn(updateResult.error)
    ? await supabase
      .from("missionary_field_people")
      .update(updatePayload)
      .eq("id", id)
      .eq("household_id", workspaceId)
      .select(legacyPersonSelect)
      .single()
    : updateResult;

  if (error) {
    const errorMessage = fieldPeopleErrorMessage(error);

    console.error("[People API] Failed to update missionary_field_people:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }

  return NextResponse.json({ person: withWorkspaceId(data, workspaceId) });
}
