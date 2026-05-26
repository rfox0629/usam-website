import { NextResponse } from "next/server";
import { canWriteDosActivity, getDosAuthorization } from "@/src/lib/dos/auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type FruitEventPayload = {
  confidenceLevel?: unknown;
  description?: unknown;
  status?: unknown;
  title?: unknown;
  visibility?: unknown;
  workspaceId?: unknown;
};

const confidenceLevels = new Set(["observed", "confirmed", "verified"]);
const statuses = new Set(["draft", "submitted", "reviewed", "approved", "hidden"]);
const visibilities = new Set(["private", "internal", "public"]);

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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

async function eventBelongsToWorkspace(eventId: string, workspaceId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: event, error } = await supabase
    .from("fruit_events")
    .select("id, meeting_id, person_id")
    .eq("id", eventId)
    .maybeSingle();

  if (error || !event) {
    return { error: error?.message ?? "Fruit not found.", ok: false as const, supabase };
  }

  if (event.meeting_id) {
    const { data: meeting } = await supabase
      .from("missionary_tables")
      .select("id")
      .eq("id", event.meeting_id)
      .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
      .maybeSingle();

    if (meeting) {
      return { ok: true as const, supabase };
    }
  }

  if (event.person_id) {
    const { data: person } = await supabase
      .from("missionary_field_people")
      .select("id")
      .eq("id", event.person_id)
      .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
      .maybeSingle();

    if (person) {
      return { ok: true as const, supabase };
    }
  }

  return { error: "Fruit not found.", ok: false as const, supabase };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const authResult = await authorizeWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  const { eventId } = await params;
  let payload: FruitEventPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const workspaceId = asString(payload.workspaceId);

  if (!isUuid(eventId) || !isUuid(workspaceId)) {
    return NextResponse.json({ error: "Fruit not found." }, { status: 404 });
  }

  const ownership = await eventBelongsToWorkspace(eventId, workspaceId);

  if (!ownership.ok) {
    return NextResponse.json({ error: ownership.error }, { status: 404 });
  }

  const update: Record<string, unknown> = {};
  const title = asString(payload.title);
  const description = asString(payload.description);
  const confidenceLevel = asString(payload.confidenceLevel);
  const status = asString(payload.status);
  const visibility = asString(payload.visibility);

  if (title) {
    update.title = title.slice(0, 160);
  }

  if (typeof payload.description === "string") {
    update.description = description || null;
  }

  if (confidenceLevels.has(confidenceLevel)) {
    update.confidence_level = confidenceLevel;
  }

  if (statuses.has(status)) {
    update.status = status;
  }

  if (visibilities.has(visibility)) {
    update.visibility = visibility;
  }

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { data, error } = await ownership.supabase
    .from("fruit_events")
    .update(update)
    .eq("id", eventId)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const authResult = await authorizeWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  const { eventId } = await params;
  const workspaceId = new URL(request.url).searchParams.get("workspaceId") ?? "";

  if (!isUuid(eventId) || !isUuid(workspaceId)) {
    return NextResponse.json({ error: "Fruit not found." }, { status: 404 });
  }

  const ownership = await eventBelongsToWorkspace(eventId, workspaceId);

  if (!ownership.ok) {
    return NextResponse.json({ error: ownership.error }, { status: 404 });
  }

  const { error } = await ownership.supabase
    .from("fruit_events")
    .delete()
    .eq("id", eventId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
