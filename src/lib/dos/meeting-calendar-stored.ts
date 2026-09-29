import "server-only";

import { syncDosMeetingCalendarEvent } from "@/src/lib/dos/google-calendar";
import type { DosCalendarSyncState } from "@/src/lib/dos/meeting-calendar-sync";
import { isMissingWorkspaceScopeColumn } from "@/src/lib/dos/missionary-app";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

type StoredMeetingRow = {
  notes: string | null;
  participant_names: string[] | null;
  scheduled_end_at: string | null;
  scheduled_start_at: string | null;
  table_type: string | null;
  timezone: string | null;
};

const storedMeetingColumns = "notes, participant_names, scheduled_start_at, scheduled_end_at, table_type, timezone";

/* The meeting must belong to the caller's workspace. The household_id fallback
   mirrors the meetings route: some deployments predate workspace_id. */
async function loadStoredMeeting(supabase: SupabaseAdminClient, workspaceId: string, meetingId: string) {
  const scoped = await supabase
    .from("missionary_tables")
    .select(storedMeetingColumns)
    .eq("id", meetingId)
    .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
    .maybeSingle();

  if (!scoped.error) {
    return { data: scoped.data as StoredMeetingRow | null, error: null };
  }

  if (!isMissingWorkspaceScopeColumn(scoped.error)) {
    return { data: null, error: scoped.error };
  }

  const legacy = await supabase
    .from("missionary_tables")
    .select(storedMeetingColumns)
    .eq("id", meetingId)
    .eq("household_id", workspaceId)
    .maybeSingle();

  return { data: legacy.data as StoredMeetingRow | null, error: legacy.error };
}

/* USA-273: sync a meeting to Google from the row as saved, never from a request
   payload. The retry endpoint and a replayed schedule (same idempotency key,
   possibly with edited form values) both use this, so the Google event always
   matches the meeting DOS actually stored. */
export async function syncStoredMeetingCalendarEvent({
  meetingId,
  supabase = createSupabaseAdminClient(),
  workspaceId,
}: {
  meetingId: string;
  supabase?: SupabaseAdminClient;
  workspaceId: string;
}): Promise<{ state: DosCalendarSyncState } | { error: string; notFound?: boolean }> {
  const meeting = await loadStoredMeeting(supabase, workspaceId, meetingId);

  if (meeting.error) {
    return { error: meeting.error.message };
  }

  if (!meeting.data) {
    return { error: "Meeting not found.", notFound: true };
  }

  const state = await syncDosMeetingCalendarEvent({
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

  return { state };
}
