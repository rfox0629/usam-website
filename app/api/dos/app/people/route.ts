import { NextResponse } from "next/server";
import { canWriteDosActivity, getDosAuthorization } from "@/src/lib/dos/auth";
import { isMissingWorkspaceScopeColumn, resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type PersonPayload = {
  name?: unknown;
  phone?: unknown;
  relationshipType?: unknown;
  workspaceId?: unknown;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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

export async function POST(request: Request) {
  const authResult = await authorizeWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  let payload: PersonPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const workspaceId = await resolveDosAppWorkspaceId(asString(payload.workspaceId));
  const name = asString(payload.name);
  const phone = asString(payload.phone);

  if (!workspaceId || !name || !phone) {
    return NextResponse.json({ error: "Name and phone are required." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const personInsert: Record<string, unknown> = {
    created_by: authResult.authorization.userId,
    household_id: workspaceId,
    name,
    phone,
    relationship_type: asString(payload.relationshipType) || null,
    source: "field",
    status: "new",
    workspace_id: workspaceId,
  };
  const insertResult = await supabase
    .from("missionary_field_people")
    .insert(personInsert)
    .select("id")
    .single();
  // TODO: Remove the household_id-only fallback after all Supabase environments
  // have the Command Center workspace_id migration applied.
  const { workspace_id: _workspaceId, ...legacyPersonInsert } = personInsert;
  const { data, error } = insertResult.error && isMissingWorkspaceScopeColumn(insertResult.error)
    ? await supabase
      .from("missionary_field_people")
      .insert(legacyPersonInsert)
      .select("id")
      .single()
    : insertResult;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, ok: true });
}
