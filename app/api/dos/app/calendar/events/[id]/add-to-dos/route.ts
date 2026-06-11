import { NextResponse } from "next/server";
import { requireDosWorkspaceRouteAccess } from "@/src/lib/dos/api-auth";
import { canWriteDosActivity, getDosAuthorization } from "@/src/lib/dos/auth";
import { resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type AddToDosPayload = {
  workspaceId?: unknown;
};

type ExternalCalendarEventRow = {
  description: string | null;
  end_at: string | null;
  external_calendar_id: string;
  external_event_id: string;
  html_link: string | null;
  i_cal_uid: string | null;
  id: string;
  imported_dos_source_id: string | null;
  location: string | null;
  start_at: string | null;
  summary: string | null;
  timezone: string | null;
  workspace_id: string;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function readPayload(request: Request) {
  try {
    return await request.json() as AddToDosPayload;
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

function eventNotes(event: ExternalCalendarEventRow) {
  return [
    event.description,
    event.location ? `Location: ${event.location}` : null,
    event.html_link ? `Google Calendar: ${event.html_link}` : null,
    "Imported from Google Calendar.",
  ].filter(Boolean).join("\n\n");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const payload = await readPayload(request);
  const workspaceId = await resolveDosAppWorkspaceId(asString(payload?.workspaceId));

  if (!workspaceId || !isUuid(id)) {
    return NextResponse.json({ error: "Google Calendar event not found." }, { status: 404 });
  }

  const authResult = await authorizeCalendarWrite(workspaceId);

  if ("response" in authResult) {
    return authResult.response;
  }

  const supabase = createSupabaseAdminClient();
  const { data: eventData, error: eventError } = await supabase
    .from("external_calendar_events")
    .select("id, workspace_id, external_calendar_id, external_event_id, i_cal_uid, summary, description, location, html_link, start_at, end_at, timezone, imported_dos_source_id")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .eq("provider", "google")
    .is("deleted_at", null)
    .maybeSingle();

  if (eventError) {
    return NextResponse.json({ error: "Unable to load Google Calendar event." }, { status: 500 });
  }

  if (!eventData) {
    return NextResponse.json({ error: "Google Calendar event not found." }, { status: 404 });
  }

  const event = eventData as ExternalCalendarEventRow;

  if (event.imported_dos_source_id) {
    return NextResponse.json({
      meetingId: event.imported_dos_source_id,
      message: "Already added to DOS.",
      status: "already_added",
    });
  }

  const { data: existingLink } = await supabase
    .from("calendar_event_links")
    .select("source_id")
    .eq("workspace_id", workspaceId)
    .eq("provider", "google")
    .eq("calendar_id", event.external_calendar_id)
    .eq("external_event_id", event.external_event_id)
    .eq("source_type", "meeting")
    .maybeSingle();

  if (existingLink?.source_id) {
    await supabase
      .from("external_calendar_events")
      .update({
        imported_dos_source_id: existingLink.source_id,
        imported_dos_source_type: "meeting",
      })
      .eq("id", event.id);

    return NextResponse.json({
      meetingId: existingLink.source_id,
      message: "Already added to DOS.",
      status: "already_added",
    });
  }

  if (event.i_cal_uid) {
    const { data: matchingImport } = await supabase
      .from("external_calendar_events")
      .select("imported_dos_source_id")
      .eq("workspace_id", workspaceId)
      .eq("provider", "google")
      .eq("i_cal_uid", event.i_cal_uid)
      .not("imported_dos_source_id", "is", null)
      .limit(1)
      .maybeSingle();

    if (matchingImport?.imported_dos_source_id) {
      await supabase
        .from("external_calendar_events")
        .update({
          imported_dos_source_id: matchingImport.imported_dos_source_id,
          imported_dos_source_type: "meeting",
        })
        .eq("id", event.id);

      return NextResponse.json({
        meetingId: matchingImport.imported_dos_source_id,
        message: "Already added to DOS.",
        status: "already_added",
      });
    }
  }

  if (!event.start_at) {
    return NextResponse.json({ error: "Google Calendar event needs a start time before it can be added to DOS." }, { status: 400 });
  }

  const title = event.summary?.trim() || "Google Calendar event";
  const notes = eventNotes(event);
  const { data: meetingData, error: meetingError } = await supabase
    .from("missionary_tables")
    .insert({
      conversation_flow_key: "none",
      conversation_responses: {},
      field_person_ids: [],
      google_sync_enabled: true,
      household_id: workspaceId,
      meeting_status: "scheduled",
      notes: notes || null,
      participant_names: [title.slice(0, 120)],
      recommended_resources: [],
      scheduled_end_at: event.end_at,
      scheduled_start_at: event.start_at,
      source: "field",
      table_date: event.start_at.slice(0, 10),
      table_type: "other",
      timezone: event.timezone,
      workspace_id: workspaceId,
    })
    .select("id")
    .single();

  if (meetingError || !meetingData?.id) {
    return NextResponse.json({ error: "Unable to add Google Calendar event to DOS." }, { status: 500 });
  }

  const meetingId = String(meetingData.id);
  const syncedAt = new Date().toISOString();
  const { error: linkError } = await supabase
    .from("calendar_event_links")
    .upsert({
      calendar_id: event.external_calendar_id,
      external_event_id: event.external_event_id,
      last_error: null,
      last_synced_at: syncedAt,
      provider: "google",
      source_id: meetingId,
      source_type: "meeting",
      sync_status: "synced",
      workspace_id: workspaceId,
    }, {
      onConflict: "workspace_id,source_type,source_id,provider",
    });

  if (linkError) {
    await supabase
      .from("missionary_tables")
      .delete()
      .eq("id", meetingId)
      .eq("workspace_id", workspaceId);

    return NextResponse.json({ error: "Unable to link Google Calendar event to DOS." }, { status: 500 });
  }

  await supabase
    .from("external_calendar_events")
    .update({
      imported_dos_source_id: meetingId,
      imported_dos_source_type: "meeting",
    })
    .eq("id", event.id);

  return NextResponse.json({
    meetingId,
    ok: true,
    status: "added",
  });
}
