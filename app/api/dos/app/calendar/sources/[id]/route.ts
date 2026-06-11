import { NextResponse } from "next/server";
import { requireDosWorkspaceRouteAccess } from "@/src/lib/dos/api-auth";
import { canWriteDosActivity, getDosAuthorization } from "@/src/lib/dos/auth";
import { resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type CalendarSourcePayload = {
  selectedForAvailability?: unknown;
  selectedForDisplay?: unknown;
  selectedForImport?: unknown;
  workspaceId?: unknown;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function readPayload(request: Request) {
  try {
    return await request.json() as CalendarSourcePayload;
  } catch {
    return null;
  }
}

async function authorizeCalendarWrite(workspaceId: string) {
  const authorization = await getDosAuthorization();

  if (authorization.status === "unauthenticated") {
    return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }

  if (authorization.status === "configuration_error") {
    return { response: NextResponse.json({ error: authorization.message }, { status: 500 }) };
  }

  if (authorization.status === "unauthorized" || !canWriteDosActivity(authorization)) {
    return { response: NextResponse.json({ error: "DOS calendar access required." }, { status: 403 }) };
  }

  if (!isSupabaseAdminConfigured()) {
    return { response: NextResponse.json({ error: "Supabase admin environment variables are not configured." }, { status: 500 }) };
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess;
  }

  return { authorization };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const payload = await readPayload(request);
  const workspaceId = await resolveDosAppWorkspaceId(asString(payload?.workspaceId));

  if (!workspaceId || !isUuid(id)) {
    return NextResponse.json({ error: "Calendar source not found." }, { status: 404 });
  }

  const authResult = await authorizeCalendarWrite(workspaceId);

  if ("response" in authResult) {
    return authResult.response;
  }

  const update: Record<string, boolean> = {};

  if (typeof payload?.selectedForDisplay === "boolean") {
    update.selected_for_display = payload.selectedForDisplay;
  }

  if (typeof payload?.selectedForImport === "boolean") {
    update.selected_for_import = payload.selectedForImport;
  }

  if (typeof payload?.selectedForAvailability === "boolean") {
    update.selected_for_availability = payload.selectedForAvailability;
  }

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: "No calendar source changes provided." }, { status: 400 });
  }

  const { data, error } = await createSupabaseAdminClient()
    .from("calendar_sources")
    .update(update)
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .eq("provider", "google")
    .select("id")
    .single();

  if (error || !data?.id) {
    return NextResponse.json({ error: "Unable to update calendar source." }, { status: error ? 500 : 404 });
  }

  return NextResponse.json({ id: data.id, ok: true });
}
