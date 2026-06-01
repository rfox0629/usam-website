import { NextResponse } from "next/server";
import { requireDosWorkspaceRouteAccess } from "@/src/lib/dos/api-auth";
import { getDosAuthorization } from "@/src/lib/dos/auth";
import { resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asIsoDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function authorizeCalendarRead(workspaceId: string) {
  const authorization = await getDosAuthorization();

  if (authorization.status === "unauthenticated") {
    return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }

  if (authorization.status === "configuration_error") {
    return { response: NextResponse.json({ error: authorization.message }, { status: 500 }) };
  }

  if (authorization.status === "unauthorized") {
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
  const startAt = asIsoDate(url.searchParams.get("start"));
  const endAt = asIsoDate(url.searchParams.get("end"));

  if (!workspaceId) {
    return NextResponse.json({ error: "Missionary workspace not found." }, { status: 404 });
  }

  const authResult = await authorizeCalendarRead(workspaceId);

  if ("response" in authResult) {
    return authResult.response;
  }

  let query = createSupabaseAdminClient()
    .from("external_calendar_events")
    .select("id, calendar_source_id, external_calendar_id, external_event_id, i_cal_uid, summary, description, location, html_link, start_at, end_at, all_day, timezone, imported_dos_source_id, calendar_sources(name)")
    .eq("workspace_id", workspaceId)
    .eq("provider", "google")
    .is("deleted_at", null)
    .order("start_at", { ascending: true });

  if (startAt) {
    query = query.gte("start_at", startAt);
  }

  if (endAt) {
    query = query.lte("start_at", endAt);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Unable to load Google Calendar events." }, { status: 500 });
  }

  return NextResponse.json({
    events: (data ?? []).map((event) => {
      const source = event.calendar_sources as { name?: string | null } | Array<{ name?: string | null }> | null;

      return {
        allDay: event.all_day,
        calendarSourceId: event.calendar_source_id,
        description: event.description,
        endAt: event.end_at,
        externalCalendarId: event.external_calendar_id,
        externalEventId: event.external_event_id,
        htmlLink: event.html_link,
        iCalUid: event.i_cal_uid,
        id: event.id,
        importedMeetingId: event.imported_dos_source_id,
        location: event.location,
        sourceName: Array.isArray(source) ? source[0]?.name ?? null : source?.name ?? null,
        startAt: event.start_at,
        timezone: event.timezone,
        title: event.summary ?? "Google Calendar event",
      };
    }),
    ok: true,
  });
}
