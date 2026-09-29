/* USA-273: retrying a Google Calendar sync must not mean resubmitting the
   meeting. This endpoint takes a meeting that is already saved and tries the
   calendar write again, on its own. It is idempotent twice over: the Google
   event id is derived from the meeting id, and the link row is upserted on
   (workspace, source type, source id, provider) -- so tapping Retry any number
   of times can only ever produce the one event. */
import { NextResponse } from "next/server";
import { requireDosWorkspaceRouteAccess } from "@/src/lib/dos/api-auth";
import { canWriteDosActivity, getDosAuthorization } from "@/src/lib/dos/auth";
import { dosCalendarSyncWarning } from "@/src/lib/dos/meeting-calendar-sync";
import { syncStoredMeetingCalendarEvent } from "@/src/lib/dos/meeting-calendar-stored";
import { resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

export const maxDuration = 60;

type CalendarEventSyncPayload = {
  meetingId?: unknown;
  workspaceId?: unknown;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function readPayload(request: Request) {
  try {
    return await request.json() as CalendarEventSyncPayload;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  /* Authenticate before touching anything workspace-shaped, so an anonymous
     caller cannot learn which workspace ids exist from 404 vs 401. */
  const authorization = await getDosAuthorization();

  if (authorization.status === "unauthenticated") {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (authorization.status === "configuration_error") {
    return NextResponse.json({ error: authorization.message }, { status: 500 });
  }

  if (authorization.status === "unauthorized" || !canWriteDosActivity(authorization)) {
    return NextResponse.json({ error: "DOS calendar access required." }, { status: 403 });
  }

  const payload = await readPayload(request);
  const meetingId = asString(payload?.meetingId);

  if (!meetingId) {
    return NextResponse.json({ error: "Meeting ID is required." }, { status: 400 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase admin environment variables are not configured." }, { status: 500 });
  }

  const workspaceId = await resolveDosAppWorkspaceId(asString(payload?.workspaceId));

  if (!workspaceId) {
    return NextResponse.json({ error: "Missionary workspace not found." }, { status: 404 });
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  const result = await syncStoredMeetingCalendarEvent({
    meetingId,
    supabase: createSupabaseAdminClient(),
    workspaceId,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.notFound ? 404 : 500 });
  }

  return NextResponse.json({
    calendarSync: result.state,
    calendarWarning: dosCalendarSyncWarning(result.state),
    meetingId,
    ok: result.state === "synced",
  });
}
