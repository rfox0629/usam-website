import { NextResponse } from "next/server";
import { requireDosWorkspaceRouteAccess } from "@/src/lib/dos/api-auth";
import { getDosAuthorization } from "@/src/lib/dos/auth";
import { isGoogleCalendarConfigured } from "@/src/lib/dos/google-calendar";
import { resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

export async function GET(request: Request) {
  const authorization = await getDosAuthorization();

  if (authorization.status !== "authorized") {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const url = new URL(request.url);
  const workspaceId = await resolveDosAppWorkspaceId(url.searchParams.get("workspaceId") ?? "");

  if (!workspaceId) {
    return NextResponse.json({ error: "Missionary workspace not found." }, { status: 404 });
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase admin environment variables are not configured." }, { status: 500 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("connected_calendars")
    .select("google_account_email, calendar_id, connected_at")
    .eq("workspace_id", workspaceId)
    .eq("provider", "google")
    .is("disconnected_at", null)
    .order("connected_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    const message = error.message.toLowerCase();

    if (!message.includes("connected_calendars") && !message.includes("schema cache")) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const { data: syncLinks } = await supabase
    .from("calendar_event_links")
    .select("last_synced_at")
    .eq("workspace_id", workspaceId)
    .eq("provider", "google")
    .not("last_synced_at", "is", null)
    .order("last_synced_at", { ascending: false })
    .limit(1);

  return NextResponse.json({
    calendarId: data?.calendar_id ?? null,
    connected: Boolean(data),
    connectedAt: data?.connected_at ?? null,
    googleAccountEmail: data?.google_account_email ?? null,
    googleConfigured: isGoogleCalendarConfigured(),
    lastSyncedAt: syncLinks?.[0]?.last_synced_at ?? null,
  });
}
