import { NextResponse } from "next/server";
import { requireDosWorkspaceRouteAccess } from "@/src/lib/dos/api-auth";
import { canWriteDosActivity, getDosAuthorization } from "@/src/lib/dos/auth";
import { syncGoogleCalendarSources } from "@/src/lib/dos/google-calendar";
import { resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const workspaceId = await resolveDosAppWorkspaceId(asString(url.searchParams.get("workspaceId")));

  if (!workspaceId) {
    return NextResponse.json({ error: "Missionary workspace not found." }, { status: 404 });
  }

  const authResult = await authorizeCalendarWrite(workspaceId);

  if ("response" in authResult) {
    return authResult.response;
  }

  const supabase = createSupabaseAdminClient();
  const syncResult = await syncGoogleCalendarSources(workspaceId, supabase).catch(() => ({ sources: [], status: "failed" as const }));
  const { data, error } = await supabase
    .from("calendar_sources")
    .select("id, external_calendar_id, name, access_role, is_primary, time_zone, selected_for_display, selected_for_import, selected_for_availability, last_synced_at")
    .eq("workspace_id", workspaceId)
    .eq("provider", "google")
    .order("is_primary", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Unable to load calendar sources." }, { status: 500 });
  }

  return NextResponse.json({
    message: syncResult.status === "needs_reconnect" ? "Reconnect Google Calendar to read events." : null,
    sources: (data ?? []).map((source) => ({
      accessRole: source.access_role,
      externalCalendarId: source.external_calendar_id,
      id: source.id,
      isPrimary: source.is_primary,
      lastSyncedAt: source.last_synced_at,
      name: source.name,
      selectedForAvailability: source.selected_for_availability,
      selectedForDisplay: source.selected_for_display,
      selectedForImport: source.selected_for_import,
      timeZone: source.time_zone,
    })),
    status: syncResult.status,
  });
}
