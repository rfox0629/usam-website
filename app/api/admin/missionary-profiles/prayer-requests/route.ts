import { NextResponse } from "next/server";
import { canEditAdminContent, getAdminAuthorization } from "@/src/lib/admin-auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

const requestSelect = "id, household_id, related_household_id, field_person_id, title, request, category, urgency, status, visibility, created_at, updated_at";
const statuses = ["open", "covered", "answered", "archived"] as const;
const urgencies = ["normal", "important", "urgent"] as const;
const visibilities = ["private", "team", "public"] as const;

type PrayerPayload = {
  category?: unknown;
  fieldPersonId?: unknown;
  field_person_id?: unknown;
  householdId?: unknown;
  household_id?: unknown;
  id?: unknown;
  request?: unknown;
  status?: unknown;
  title?: unknown;
  urgency?: unknown;
  visibility?: unknown;
  workspaceId?: unknown;
  workspace_id?: unknown;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableString(value: unknown) {
  const nextValue = asString(value);

  return nextValue ? nextValue : null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}

function asStatus(value: unknown) {
  return statuses.includes(value as typeof statuses[number]) ? value as typeof statuses[number] : "open";
}

function asUrgency(value: unknown) {
  return urgencies.includes(value as typeof urgencies[number]) ? value as typeof urgencies[number] : "normal";
}

function asVisibility(value: unknown) {
  return visibilities.includes(value as typeof visibilities[number]) ? value as typeof visibilities[number] : "private";
}

async function authorizePrayerWrite() {
  const authorization = await getAdminAuthorization();

  if (authorization.status === "unauthenticated") {
    return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }

  if (authorization.status === "configuration_error") {
    return { response: NextResponse.json({ error: authorization.message }, { status: 500 }) };
  }

  if (authorization.status === "unauthorized" || !canEditAdminContent(authorization)) {
    return { response: NextResponse.json({ error: "Editor access required." }, { status: 403 }) };
  }

  if (!isSupabaseAdminConfigured()) {
    return { response: NextResponse.json({ error: "Supabase admin environment variables are not configured." }, { status: 500 }) };
  }

  return { authorization };
}

async function readPayload(request: Request) {
  try {
    return await request.json() as PrayerPayload;
  } catch {
    return null;
  }
}

function prayerErrorMessage(error: { code?: string; message?: string }) {
  const message = error.message ?? "Unable to save prayer request.";
  const lowerMessage = message.toLowerCase();

  if (error.code === "PGRST205" || lowerMessage.includes("schema cache")) {
    return "Prayer request fields are missing. Apply the Missionary Workspace MVP migration.";
  }

  return message;
}

export async function POST(request: Request) {
  const authResult = await authorizePrayerWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  const payload = await readPayload(request);

  if (!payload) {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const workspaceId = asString(payload.workspaceId) || asString(payload.workspace_id) || asString(payload.householdId) || asString(payload.household_id);
  const fieldPersonId = asString(payload.fieldPersonId) || asString(payload.field_person_id);
  const title = asString(payload.title);
  const requestText = asString(payload.request);

  if (!isUuid(workspaceId) || !title || !requestText) {
    return NextResponse.json({ error: "Workspace, title, and request are required." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  if (fieldPersonId) {
    const { data: person, error: personError } = await supabase
      .from("missionary_field_people")
      .select("id")
      .eq("id", fieldPersonId)
      .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
      .maybeSingle();

    if (personError) {
      return NextResponse.json({ error: prayerErrorMessage(personError) }, { status: 500 });
    }

    if (!person) {
      return NextResponse.json({ error: "Selected person does not belong to this workspace." }, { status: 400 });
    }
  }

  const { data, error } = await supabase
    .from("prayer_requests")
    .insert({
      category: asNullableString(payload.category),
      confidentiality_level: "missionary_couple",
      description: requestText,
      field_person_id: fieldPersonId || null,
      household_id: workspaceId,
      related_household_id: workspaceId,
      request: requestText,
      source: "missionary_workspace",
      status: "open",
      title,
      urgency: asUrgency(payload.urgency),
      visibility: asVisibility(payload.visibility),
    })
    .select(requestSelect)
    .single();

  if (error) {
    console.error("[Prayer Requests API] Failed to insert prayer request:", error);
    return NextResponse.json({ error: prayerErrorMessage(error) }, { status: 500 });
  }

  return NextResponse.json({ prayerRequest: { ...data, workspace_id: workspaceId } });
}

export async function PATCH(request: Request) {
  const authResult = await authorizePrayerWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  const payload = await readPayload(request);

  if (!payload) {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const id = asString(payload.id);
  const workspaceId = asString(payload.workspaceId) || asString(payload.workspace_id) || asString(payload.householdId) || asString(payload.household_id);

  if (!isUuid(id) || !isUuid(workspaceId)) {
    return NextResponse.json({ error: "Workspace and prayer request ID are required." }, { status: 400 });
  }

  const { data, error } = await createSupabaseAdminClient()
    .from("prayer_requests")
    .update({ status: asStatus(payload.status) })
    .eq("id", id)
    .or(`household_id.eq.${workspaceId},related_household_id.eq.${workspaceId}`)
    .select(requestSelect)
    .single();

  if (error) {
    console.error("[Prayer Requests API] Failed to update prayer request:", error);
    return NextResponse.json({ error: prayerErrorMessage(error) }, { status: 500 });
  }

  return NextResponse.json({ prayerRequest: { ...data, workspace_id: workspaceId } });
}
