/* USA-273: retrying a Google Calendar sync must not mean resubmitting the
   meeting. This endpoint takes a meeting that is already saved and tries the
   calendar write again, on its own. It is idempotent twice over: the Google
   event id is derived from the meeting id, and the link row is upserted on
   (workspace, source type, source id, provider) -- so tapping Retry any number
   of times can only ever produce the one event. */
import { NextResponse } from "next/server";
import { requireDosWorkspaceRouteAccess } from "@/src/lib/dos/api-auth";
import { canWriteDosActivity, getDosAuthorization } from "@/src/lib/dos/auth";
import { syncDosMeetingCalendarEvent } from "@/src/lib/dos/google-calendar";
import { dosCalendarSyncWarning } from "@/src/lib/dos/meeting-calendar-sync";
import { isMissingWorkspaceScopeColumn, resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

export const maxDuration = 60;

type CalendarEventSyncPayload = {
  meetingId?: unknown;
  workspaceId?: unknown;
};

type MeetingRow = {
  notes: string | null;
  participant_names: string[] | null;
  scheduled_end_at: string | null;
  scheduled_start_at: string | null;
  table_type: string | null;
  timezone: string | null;
};

const meetingColumns = "notes, participant_names, scheduled_start_at, scheduled_end_at, table_type, timezone";

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

/* The meeting must belong to the caller's workspace. The household_id fallback
   mirrors the meetings route: some deployments predate workspace_id. */
async function loadScopedMeeting(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  workspaceId: string,
  meetingId: string,
) {
  const scoped = await supabase
    .from("missionary_tables")
    .select(meetingColumns)
    .eq("id", meetingId)
    .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
    .maybeSingle();

  if (!scoped.error) {
    return { data: scoped.data as MeetingRow | null, error: null };
  }

  if (!isMissingWorkspaceScopeColumn(scoped.error)) {
    return { data: null, error: scoped.error };
  }

  const legacy = await supabase
    .from("missionary_tables")
    .select(meetingColumns)
    .eq("id", meetingId)
    .eq("household_id", workspaceId)
    .maybeSingle();

  return { data: legacy.data as MeetingRow | null, error: legacy.error };
}

export async function POST(request: Request) {
  const payload = await readPayload(request);
  const meetingId = asString(payload?.meetingId);

  if (!meetingId) {
    return NextResponse.json({ error: "Meeting ID is required." }, { status: 400 });
  }

  const workspaceId = await resolveDosAppWorkspaceId(asString(payload?.workspaceId));

  if (!workspaceId) {
    return NextResponse.json({ error: "Missionary workspace not found." }, { status: 404 });
  }

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

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase admin environment variables are not configured." }, { status: 500 });
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  const supabase = createSupabaseAdminClient();
  const meeting = await loadScopedMeeting(supabase, workspaceId, meetingId);

  if (meeting.error) {
    return NextResponse.json({ error: meeting.error.message }, { status: 500 });
  }

  if (!meeting.data) {
    return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
  }

  const calendarSync = await syncDosMeetingCalendarEvent({
    meetingId,
    notes: meeting.data.notes ?? null,
    participantNames: Array.isArray(meeting.data.participant_names) ? meeting.data.participant_names : [],
    scheduledEndAt: meeting.data.scheduled_end_at ?? null,
    scheduledStartAt: meeting.data.scheduled_start_at ?? null,
    supabase,
    tableType: meeting.data.table_type ?? "meeting",
    timezone: meeting.data.timezone ?? null,
    workspaceId,
  });

  return NextResponse.json({
    calendarSync,
    calendarWarning: dosCalendarSyncWarning(calendarSync),
    meetingId,
    ok: calendarSync === "synced",
  });
}
