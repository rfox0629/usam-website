import { NextResponse } from "next/server";
import { canEditAdminContent, getAdminAuthorization } from "@/src/lib/admin-auth";
import { dosAppOutcomeTags, isMissingWorkspaceScopeColumn, resolveDosAppWorkspaceId, type DosAppOutcomeTag } from "@/src/lib/dos/missionary-app";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type FruitPayload = {
  fieldPersonId?: unknown;
  outcomeTags?: unknown;
  summary?: unknown;
  testimonyDate?: unknown;
  workspaceId?: unknown;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asDateString(value: unknown) {
  const nextValue = asString(value);

  return /^\d{4}-\d{2}-\d{2}$/.test(nextValue) ? nextValue : new Date().toISOString().slice(0, 10);
}

function asOutcomeTags(value: unknown): DosAppOutcomeTag[] {
  return Array.isArray(value)
    ? value.filter((item): item is DosAppOutcomeTag => dosAppOutcomeTags.includes(item as DosAppOutcomeTag))
    : [];
}

async function authorizeWrite() {
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

export async function POST(request: Request) {
  const authResult = await authorizeWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  let payload: FruitPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const workspaceId = await resolveDosAppWorkspaceId(asString(payload.workspaceId));
  const summary = asString(payload.summary);

  if (!workspaceId || !summary) {
    return NextResponse.json({ error: "Summary is required." }, { status: 400 });
  }

  const fieldPersonId = asString(payload.fieldPersonId);
  const supabase = createSupabaseAdminClient();
  const fruitInsert: Record<string, unknown> = {
    body: summary,
    cc_status: "draft",
    field_person_id: fieldPersonId || null,
    household_id: workspaceId,
    missionary_public_approved: false,
    outcome_tags: asOutcomeTags(payload.outcomeTags),
    permission_to_share: false,
    source: "dos",
    source_app: "dos_mvp",
    status: "draft",
    testimony_date: asDateString(payload.testimonyDate),
    visibility: "private",
    workspace_id: workspaceId,
  };
  const insertResult = await supabase
    .from("missionary_fruit_items")
    .insert(fruitInsert)
    .select("id")
    .single();
  const { workspace_id: _workspaceId, ...legacyFruitInsert } = fruitInsert;
  const { data, error } = insertResult.error && isMissingWorkspaceScopeColumn(insertResult.error)
    ? await supabase
      .from("missionary_fruit_items")
      .insert(legacyFruitInsert)
      .select("id")
      .single()
    : insertResult;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, ok: true });
}
