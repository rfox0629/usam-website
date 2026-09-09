import "server-only";

import { randomBytes } from "node:crypto";
import { assignBookingHost, type BookingHostBusyInterval, type BookingHostMember } from "@/src/lib/dos/booking-host";
import { matchBookingPerson, normalizeBookingEmail, type BookingPersonCandidate, type BookingPersonMatchCandidate } from "@/src/lib/dos/booking-person-match";
import { syncGoogleCalendarEvent } from "@/src/lib/dos/google-calendar";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import {
  createDefaultDosTableInvitation,
  dosTableInvitationDateKey,
  generateDosTableInvitationSlots,
  normalizeDosTableInvitationHostMode,
  normalizeDosTableInvitationKind,
  normalizeDosTableInvitationSettings,
  normalizeDosTableInvitationStatus,
  tableInvitationDuration,
  type DosTableInvitation,
  type DosTableInvitationBusyInterval,
  type DosTableInvitationKind,
  type DosTableInvitationSettings,
  type DosTableInvitationSlot,
} from "@/src/lib/dos/table-invitations";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;
type SupabaseQueryError = { message?: string } | null | undefined;

type InvitationRow = {
  audience: string | null;
  created_at: string | null;
  description: string | null;
  host_member_ids: string[] | null;
  host_mode: string | null;
  id: string;
  kind: string | null;
  public_enabled: boolean | null;
  settings: unknown;
  status: string | null;
  title: string | null;
  token: string;
  updated_at: string | null;
  workspace_id: string;
};

export type PublicDosTableInvitation = {
  invitation: DosTableInvitation;
  slots: DosTableInvitationSlot[];
  workspace: {
    displayName: string;
    id: string;
    slug: string;
  };
};

export type CreatePublicBookingInput = {
  email: string;
  name: string;
  notes?: string | null;
  /* USA-246: the client's request key; the same key on the same link is the same booking. */
  operationKey?: string | null;
  phone?: string | null;
  prayerRequest?: string | null;
  startAt: string;
  token: string;
};

function cleanText(value: string | null | undefined) {
  const text = value?.trim();

  return text ? text : null;
}

function isMissingModelError(error: SupabaseQueryError, modelName: string) {
  const message = error?.message?.toLowerCase() ?? "";

  return message.includes(modelName)
    && (message.includes("does not exist") || message.includes("schema cache") || message.includes("could not find") || message.includes("relation"));
}

function isMissingColumnError(error: SupabaseQueryError, columnNames: string[]) {
  const message = error?.message?.toLowerCase() ?? "";

  return columnNames.some((column) => message.includes(column.toLowerCase()))
    && (message.includes("column") || message.includes("schema cache") || message.includes("could not find"));
}

function workspaceScopeFilter(workspaceId: string) {
  return `workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`;
}

function mapInvitationRow(row: InvitationRow): DosTableInvitation {
  const kind = normalizeDosTableInvitationKind(row.kind);
  const defaults = createDefaultDosTableInvitation(kind);

  return {
    audience: cleanText(row.audience) ?? defaults.audience,
    createdAt: row.created_at,
    description: cleanText(row.description) ?? defaults.description,
    hostMemberIds: Array.isArray(row.host_member_ids) ? row.host_member_ids.filter(Boolean) : [],
    hostMode: normalizeDosTableInvitationHostMode(row.host_mode),
    id: row.id,
    kind,
    publicEnabled: row.public_enabled !== false,
    settings: normalizeDosTableInvitationSettings(row.settings),
    status: normalizeDosTableInvitationStatus(row.status),
    title: cleanText(row.title) ?? defaults.title,
    token: row.token,
    updatedAt: row.updated_at,
  };
}

export async function loadTableInvitationsForWorkspace(
  supabase: SupabaseAdminClient,
  workspaceId: string,
) {
  const result = await supabase
    .from("dos_table_invitations")
    .select("id, workspace_id, token, kind, title, description, audience, status, host_mode, host_member_ids, settings, public_enabled, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .neq("status", "archived")
    .order("updated_at", { ascending: false });

  if (result.error && isMissingModelError(result.error, "dos_table_invitations")) {
    return { data: [] as DosTableInvitation[], error: null };
  }

  if (result.error) {
    return { data: [] as DosTableInvitation[], error: result.error };
  }

  return {
    data: ((result.data ?? []) as InvitationRow[]).map(mapInvitationRow),
    error: null,
  };
}

export function createInvitationToken() {
  return randomBytes(18).toString("base64url");
}

export async function loadInvitationForWorkspace(
  supabase: SupabaseAdminClient,
  workspaceId: string,
  invitationId: string,
) {
  const result = await supabase
    .from("dos_table_invitations")
    .select("id, workspace_id, token, kind, title, description, audience, status, host_mode, host_member_ids, settings, public_enabled, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .eq("id", invitationId)
    .maybeSingle();

  if (result.error) {
    return { data: null, error: result.error };
  }

  return {
    data: result.data ? mapInvitationRow(result.data as InvitationRow) : null,
    error: null,
  };
}

async function loadPublicInvitationByToken(supabase: SupabaseAdminClient, token: string) {
  const result = await supabase
    .from("dos_table_invitations")
    .select("id, workspace_id, token, kind, title, description, audience, status, host_mode, host_member_ids, settings, public_enabled, created_at, updated_at, missionary_households!inner(id, slug, display_name)")
    .eq("token", token)
    .eq("status", "active")
    .eq("public_enabled", true)
    .maybeSingle();

  if (result.error && isMissingModelError(result.error, "dos_table_invitations")) {
    return { status: "not_configured" as const };
  }

  if (result.error || !result.data) {
    return { status: "invalid" as const };
  }

  const row = result.data as InvitationRow & {
    missionary_households?: { display_name?: string | null; id?: string | null; slug?: string | null } | Array<{ display_name?: string | null; id?: string | null; slug?: string | null }>;
  };
  const workspaceRow = Array.isArray(row.missionary_households)
    ? row.missionary_households[0]
    : row.missionary_households;

  if (!workspaceRow?.id || !workspaceRow.slug || !workspaceRow.display_name) {
    return { status: "invalid" as const };
  }

  return {
    invitation: mapInvitationRow(row),
    status: "ready" as const,
    workspace: {
      displayName: workspaceRow.display_name,
      id: workspaceRow.id,
      slug: workspaceRow.slug,
    },
  };
}

async function loadGoogleBusyIntervals(
  supabase: SupabaseAdminClient,
  workspaceId: string,
  startAt: string,
  endAt: string,
): Promise<DosTableInvitationBusyInterval[]> {
  const sourcesResult = await supabase
    .from("calendar_sources")
    .select("id, external_calendar_id")
    .eq("workspace_id", workspaceId)
    .eq("provider", "google")
    .eq("is_active", true)
    .eq("selected_for_availability", true);

  if (sourcesResult.error || !sourcesResult.data?.length) {
    return [];
  }

  const sourceRows = sourcesResult.data as Array<{ external_calendar_id: string | null; id: string | null }>;
  const sourceIds = sourceRows.map((source) => source.id).filter((id): id is string => Boolean(id));
  const externalCalendarIds = sourceRows.map((source) => source.external_calendar_id).filter((id): id is string => Boolean(id));
  const result = await supabase
    .from("external_calendar_events")
    .select("calendar_source_id, external_calendar_id, start_at, end_at, deleted_at")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .lt("start_at", endAt)
    .gt("end_at", startAt)
    .order("start_at", { ascending: true });

  if (result.error) {
    return [];
  }

  return (result.data ?? []).flatMap((event): DosTableInvitationBusyInterval[] => {
    const row = event as { calendar_source_id: string | null; end_at: string | null; external_calendar_id: string | null; start_at: string | null };

    if (!row.start_at || !row.end_at) {
      return [];
    }

    if (row.calendar_source_id && sourceIds.includes(row.calendar_source_id)) {
      return [{ endAt: row.end_at, startAt: row.start_at }];
    }

    if (row.external_calendar_id && externalCalendarIds.includes(row.external_calendar_id)) {
      return [{ endAt: row.end_at, startAt: row.start_at }];
    }

    return [];
  });
}

async function loadDosMeetingBusyIntervals(
  supabase: SupabaseAdminClient,
  workspaceId: string,
  startAt: string,
  endAt: string,
): Promise<DosTableInvitationBusyInterval[]> {
  const scopedResult = await supabase
    .from("missionary_tables")
    .select("scheduled_start_at, scheduled_end_at")
    .or(workspaceScopeFilter(workspaceId))
    .eq("meeting_status", "scheduled")
    .lt("scheduled_start_at", endAt)
    .gt("scheduled_end_at", startAt);
  const result = scopedResult.error && isMissingColumnError(scopedResult.error, ["workspace_id"])
    ? await supabase
      .from("missionary_tables")
      .select("scheduled_start_at, scheduled_end_at")
      .eq("household_id", workspaceId)
      .eq("meeting_status", "scheduled")
      .lt("scheduled_start_at", endAt)
      .gt("scheduled_end_at", startAt)
    : scopedResult;

  if (result.error) {
    return [];
  }

  return (result.data ?? []).flatMap((meeting): DosTableInvitationBusyInterval[] => {
    const row = meeting as { scheduled_end_at: string | null; scheduled_start_at: string | null };

    return row.scheduled_start_at && row.scheduled_end_at
      ? [{ endAt: row.scheduled_end_at, startAt: row.scheduled_start_at }]
      : [];
  });
}

async function loadDosReminderBusyIntervals(
  supabase: SupabaseAdminClient,
  workspaceId: string,
  startAt: string,
  endAt: string,
  timezone: string,
): Promise<DosTableInvitationBusyInterval[]> {
  const startDate = dosTableInvitationDateKey(new Date(startAt), timezone);
  const endDate = dosTableInvitationDateKey(new Date(endAt), timezone);
  const result = await supabase
    .from("relationship_reminders")
    .select("reminder_date")
    .eq("workspace_id", workspaceId)
    .gte("reminder_date", startDate)
    .lte("reminder_date", endDate);
  const fallbackResult = result.error && isMissingColumnError(result.error, ["workspace_id"])
    ? await supabase
      .from("relationship_reminders")
      .select("reminder_date")
      .eq("household_id", workspaceId)
      .gte("reminder_date", startDate)
      .lte("reminder_date", endDate)
    : result;

  if (fallbackResult.error) {
    return [];
  }

  return (fallbackResult.data ?? []).flatMap((reminder): DosTableInvitationBusyInterval[] => {
    const date = (reminder as { reminder_date?: string | null }).reminder_date;

    return date ? [{
      endAt: new Date(`${date}T23:59:59.000Z`).toISOString(),
      startAt: new Date(`${date}T00:00:00.000Z`).toISOString(),
    }] : [];
  });
}

async function loadBusyIntervals(
  supabase: SupabaseAdminClient,
  workspaceId: string,
  settings: DosTableInvitationSettings,
) {
  const now = new Date();
  const end = new Date(now.getTime() + settings.bookingRules.bookingWindowDays * 24 * 60 * 60 * 1000);
  const [meetings, reminders, google] = await Promise.all([
    settings.calendarRules.blockDosMeetings ? loadDosMeetingBusyIntervals(supabase, workspaceId, now.toISOString(), end.toISOString()) : Promise.resolve([]),
    settings.calendarRules.blockDosReminders ? loadDosReminderBusyIntervals(supabase, workspaceId, now.toISOString(), end.toISOString(), settings.timezone) : Promise.resolve([]),
    loadGoogleBusyIntervals(supabase, workspaceId, now.toISOString(), end.toISOString()),
  ]);

  return [...meetings, ...reminders, ...google];
}

export async function loadPublicTableInvitation(token: string) {
  const supabase = createSupabaseAdminClient();
  const loaded = await loadPublicInvitationByToken(supabase, token);

  if (loaded.status !== "ready") {
    return loaded;
  }

  const busyIntervals = await loadBusyIntervals(supabase, loaded.workspace.id, loaded.invitation.settings);

  return {
    ...loaded,
    slots: generateDosTableInvitationSlots({
      busyIntervals,
      kind: loaded.invitation.kind,
      settings: loaded.invitation.settings,
    }),
  };
}

function meetingRecordCandidates(record: Record<string, unknown>) {
  const schedulingKeys = ["meeting_status", "scheduled_start_at", "scheduled_end_at", "timezone", "google_sync_enabled"];
  const recorderKeys = ["recorded_by_user_id", "recorded_by_display_name"];
  const { workspace_id: _workspaceId, ...legacyRecord } = record;
  const withoutRecorder = Object.fromEntries(Object.entries(record).filter(([key]) => !recorderKeys.includes(key)));
  const withoutScheduling = Object.fromEntries(Object.entries(record).filter(([key]) => !schedulingKeys.includes(key)));
  const legacyWithoutScheduling = Object.fromEntries(Object.entries(legacyRecord).filter(([key]) => !schedulingKeys.includes(key)));

  return [
    record,
    withoutRecorder,
    withoutScheduling,
    legacyRecord,
    legacyWithoutScheduling,
  ];
}

async function resolveOrCreatePublicPerson({
  email,
  name,
  phone,
  supabase,
  workspaceId,
}: {
  email: string;
  name: string;
  phone: string | null;
  supabase: SupabaseAdminClient;
  workspaceId: string;
}) {
  const scopedResult = await supabase
    .from("missionary_field_people")
    .select("id")
    .or(workspaceScopeFilter(workspaceId))
    .ilike("email", email)
    .limit(1);
  const existingResult = scopedResult.error && isMissingColumnError(scopedResult.error, ["workspace_id"])
    ? await supabase
      .from("missionary_field_people")
      .select("id")
      .eq("household_id", workspaceId)
      .ilike("email", email)
      .limit(1)
    : scopedResult;

  if (!existingResult.error && existingResult.data?.[0]?.id) {
    return String(existingResult.data[0].id);
  }

  const insertRecord = {
    email,
    household_id: workspaceId,
    last_activity_at: new Date().toISOString(),
    name,
    notes: null,
    phone,
    source: "field",
    status: "active",
    workspace_id: workspaceId,
  };
  const insertCandidates = [
    insertRecord,
    Object.fromEntries(Object.entries(insertRecord).filter(([key]) => key !== "workspace_id")),
  ];

  for (const candidate of insertCandidates) {
    const result = await supabase
      .from("missionary_field_people")
      .insert(candidate)
      .select("id")
      .single();

    if (!result.error && result.data?.id) {
      return String(result.data.id);
    }

    if (!isMissingColumnError(result.error, ["workspace_id"])) {
      throw new Error(result.error?.message ?? "Unable to create person.");
    }
  }

  throw new Error("Unable to create person.");
}

async function createScheduledTable({
  invitation,
  name,
  notes,
  personId,
  phone,
  prayerRequest,
  startAt,
  supabase,
  workspaceId,
}: {
  invitation: DosTableInvitation;
  name: string;
  notes: string | null;
  personId: string;
  phone: string | null;
  prayerRequest: string | null;
  startAt: string;
  supabase: SupabaseAdminClient;
  workspaceId: string;
}) {
  const start = new Date(startAt);
  const duration = tableInvitationDuration(invitation.settings, invitation.kind);
  const end = new Date(start.getTime() + duration * 60_000);
  const notesText = [notes, prayerRequest ? `Prayer request: ${prayerRequest}` : null, phone ? `Phone: ${phone}` : null]
    .filter(Boolean)
    .join("\n\n") || null;
  const record: Record<string, unknown> = {
    field_person_ids: [personId],
    google_sync_enabled: invitation.settings.calendarRules.createGoogleCalendarEvent,
    household_id: workspaceId,
    meeting_status: "scheduled",
    notes: notesText,
    participant_names: [name],
    recommended_resources: [],
    scheduled_end_at: end.toISOString(),
    scheduled_start_at: start.toISOString(),
    source: "field",
    table_date: dosTableInvitationDateKey(start, invitation.settings.timezone),
    table_type: invitation.kind,
    timezone: invitation.settings.timezone,
    workspace_id: workspaceId,
  };

  for (const candidate of meetingRecordCandidates(record)) {
    const result = await supabase
      .from("missionary_tables")
      .insert(candidate)
      .select("id")
      .single();

    if (!result.error && result.data?.id) {
      const tableId = String(result.data.id);
      let calendarEventSynced = false;

      if (invitation.settings.calendarRules.createGoogleCalendarEvent) {
        const syncResult = await syncGoogleCalendarEvent({
          description: notesText,
          endAt: end.toISOString(),
          reminderMinutes: [60],
          sourceId: tableId,
          sourceType: "meeting",
          startAt: start.toISOString(),
          timezone: invitation.settings.timezone,
          title: `Meeting with ${name}`,
          workspaceId,
        }, supabase).catch(() => ({ status: "failed" as const }));
        calendarEventSynced = syncResult.status === "synced";
      }

      return {
        calendarEventSynced,
        endAt: end.toISOString(),
        tableId,
      };
    }

    if (!isMissingColumnError(result.error, ["workspace_id", "meeting_status", "scheduled_start_at", "scheduled_end_at", "timezone", "google_sync_enabled", "recorded_by_user_id", "recorded_by_display_name"])) {
      throw new Error(result.error?.message ?? "Unable to create scheduled table.");
    }
  }

  throw new Error("Unable to create scheduled table.");
}


/* ---- USA-246 booking write path (founder-approved 2026-09-08) ------------
 *
 * Production keeps the legacy path until the founder enables this one. On
 * Vercel previews and locally the new path is on, so it can be exercised
 * before the switch is thrown. */
export function bookingWritePathV2Enabled() {
  const flag = process.env.DOS_BOOKING_WRITE_PATH_V2?.trim().toLowerCase();

  if (flag === "true") {
    return true;
  }

  if (flag === "false") {
    return false;
  }

  return process.env.VERCEL_ENV !== "production";
}

export type DosTableInvitationBookingPersonMatchStatus = "created" | "linked" | "resolved" | "review";

export type DosTableInvitationBooking = {
  calendarEventSynced: boolean;
  calendarSyncError: string | null;
  createdAt: string | null;
  endAt: string;
  hostMemberId: string | null;
  id: string;
  invitationId: string;
  personId: string | null;
  personMatchCandidates: BookingPersonMatchCandidate[];
  personMatchStatus: DosTableInvitationBookingPersonMatchStatus | null;
  prayerRequest: string | null;
  requesterEmail: string;
  requesterName: string;
  requesterNotes: string | null;
  requesterPhone: string | null;
  startAt: string;
  status: "booked" | "canceled" | "requested";
  tableId: string | null;
  timezone: string | null;
};

type BookingRow = {
  calendar_event_synced: boolean | null;
  calendar_sync_error?: string | null;
  created_at: string | null;
  end_at: string;
  field_person_id: string | null;
  host_member_id?: string | null;
  id: string;
  invitation_id: string;
  person_match_candidates?: unknown;
  person_match_status?: string | null;
  prayer_request: string | null;
  requester_email: string;
  requester_name: string;
  requester_notes: string | null;
  requester_phone: string | null;
  start_at: string;
  status: string | null;
  table_id: string | null;
  timezone: string | null;
};

const bookingSelectLegacy = "id, invitation_id, field_person_id, table_id, requester_name, requester_email, requester_phone, requester_notes, prayer_request, status, start_at, end_at, timezone, calendar_event_synced, created_at";
const bookingSelect = `${bookingSelectLegacy}, operation_key, host_member_id, host_user_id, person_match_status, person_match_candidates, calendar_sync_error`;
const bookingNewColumns = ["operation_key", "host_member_id", "host_user_id", "person_match_status", "person_match_candidates", "calendar_sync_error"];

function normalizeMatchCandidates(value: unknown): BookingPersonMatchCandidate[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item): BookingPersonMatchCandidate[] => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const row = item as Record<string, unknown>;
    const personId = typeof row.personId === "string" ? row.personId : null;

    if (!personId) {
      return [];
    }

    return [{
      name: typeof row.name === "string" ? row.name : "",
      personId,
      reasons: Array.isArray(row.reasons) ? row.reasons.filter((reason): reason is BookingPersonMatchCandidate["reasons"][number] => reason === "email_exact" || reason === "phone_exact" || reason === "name_exact") : [],
    }];
  });
}

function mapBookingRow(row: BookingRow): DosTableInvitationBooking {
  const matchStatus = row.person_match_status;

  return {
    calendarEventSynced: row.calendar_event_synced === true,
    calendarSyncError: row.calendar_sync_error ?? null,
    createdAt: row.created_at,
    endAt: row.end_at,
    hostMemberId: row.host_member_id ?? null,
    id: row.id,
    invitationId: row.invitation_id,
    personId: row.field_person_id,
    personMatchCandidates: normalizeMatchCandidates(row.person_match_candidates),
    personMatchStatus: matchStatus === "created" || matchStatus === "linked" || matchStatus === "resolved" || matchStatus === "review" ? matchStatus : null,
    prayerRequest: row.prayer_request,
    requesterEmail: row.requester_email,
    requesterName: row.requester_name,
    requesterNotes: row.requester_notes,
    requesterPhone: row.requester_phone,
    startAt: row.start_at,
    status: row.status === "canceled" || row.status === "requested" ? row.status : "booked",
    tableId: row.table_id,
    timezone: row.timezone,
  };
}

/* Bookings the DOS app shows: everything still live from the last 90 days
   onward, plus anything flagged for Person review regardless of date. */
export async function loadTableInvitationBookingsForWorkspace(
  supabase: SupabaseAdminClient,
  workspaceId: string,
) {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const result = await supabase
    .from("dos_table_invitation_bookings")
    .select(bookingSelect)
    .eq("workspace_id", workspaceId)
    .eq("status", "booked")
    .or(`start_at.gte.${since},person_match_status.eq.review`)
    .order("start_at", { ascending: true });
  const fallback = result.error && isMissingColumnError(result.error, bookingNewColumns)
    ? await supabase
      .from("dos_table_invitation_bookings")
      .select(bookingSelectLegacy)
      .eq("workspace_id", workspaceId)
      .eq("status", "booked")
      .gte("start_at", since)
      .order("start_at", { ascending: true })
    : result;

  if (fallback.error && isMissingModelError(fallback.error, "dos_table_invitation_bookings")) {
    return { data: [] as DosTableInvitationBooking[], error: null };
  }

  if (fallback.error) {
    return { data: [] as DosTableInvitationBooking[], error: fallback.error };
  }

  return { data: ((fallback.data ?? []) as unknown as BookingRow[]).map(mapBookingRow), error: null };
}

function isUuid(value: string | null | undefined) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

async function loadBookingHostMembers(supabase: SupabaseAdminClient, workspaceId: string): Promise<BookingHostMember[]> {
  const result = await supabase
    .from("missionary_team_members")
    .select("id, display_name, dos_user_id, relationship_to_workspace, sort_order, status")
    .eq("household_id", workspaceId);

  if (result.error) {
    return [];
  }

  return (result.data ?? []).map((row) => {
    const member = row as { display_name: string | null; dos_user_id: string | null; id: string; relationship_to_workspace: string | null; sort_order: number | null; status: string | null };

    return {
      displayName: member.display_name ?? "",
      dosUserId: member.dos_user_id ?? null,
      id: String(member.id),
      relationship: member.relationship_to_workspace ?? null,
      sortOrder: typeof member.sort_order === "number" ? member.sort_order : 0,
      status: member.status ?? "active",
    };
  });
}

/* Scheduled meetings that belong to a specific host (booking-created meetings
   carry the host as created_by). Used only to pick a free host on a team link. */
async function loadHostBusyIntervals(supabase: SupabaseAdminClient, workspaceId: string, slot: DosTableInvitationSlot): Promise<BookingHostBusyInterval[]> {
  const result = await supabase
    .from("missionary_tables")
    .select("created_by, scheduled_start_at, scheduled_end_at")
    .or(workspaceScopeFilter(workspaceId))
    .eq("meeting_status", "scheduled")
    .not("created_by", "is", null)
    .lt("scheduled_start_at", slot.endAt)
    .gt("scheduled_end_at", slot.startAt);

  if (result.error) {
    return [];
  }

  return (result.data ?? []).flatMap((row): BookingHostBusyInterval[] => {
    const meeting = row as { created_by: string | null; scheduled_end_at: string | null; scheduled_start_at: string | null };

    return meeting.scheduled_start_at && meeting.scheduled_end_at
      ? [{ endAt: meeting.scheduled_end_at, hostUserId: meeting.created_by, startAt: meeting.scheduled_start_at }]
      : [];
  });
}

async function loadBookingPeople(supabase: SupabaseAdminClient, workspaceId: string): Promise<BookingPersonCandidate[]> {
  const scoped = await supabase
    .from("missionary_field_people")
    .select("id, name, email, phone, status")
    .or(workspaceScopeFilter(workspaceId));
  const result = scoped.error && isMissingColumnError(scoped.error, ["workspace_id"])
    ? await supabase
      .from("missionary_field_people")
      .select("id, name, email, phone, status")
      .eq("household_id", workspaceId)
    : scoped;

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data ?? [])
    .filter((row) => String((row as { status?: string | null }).status ?? "active") !== "archived")
    .map((row) => {
      const person = row as { email: string | null; id: string; name: string | null; phone: string | null };

      return { email: person.email, id: String(person.id), name: person.name ?? "", phone: person.phone };
    });
}

function bookingRpcErrorCode(message: string | null | undefined) {
  const text = (message ?? "").toLowerCase();

  for (const code of ["already_booked", "invitation_unavailable", "slot_unavailable", "limit_reached", "invalid_input"]) {
    if (text.includes(code)) {
      return code;
    }
  }

  return null;
}

type BookingRpcResult = {
  booking_id: string;
  person_id: string | null;
  status: "already_booked" | "booked";
  table_id: string | null;
};

/* The Google event is deliberately spare: the link title and the guest's
   name. Phone, notes and prayer requests stay on the booking in DOS. */
async function syncBookingCalendarEvent({
  hostUserId,
  invitation,
  name,
  slot,
  supabase,
  tableId,
  workspaceId,
}: {
  hostUserId: string | null;
  invitation: DosTableInvitation;
  name: string;
  slot: DosTableInvitationSlot;
  supabase: SupabaseAdminClient;
  tableId: string;
  workspaceId: string;
}) {
  if (!hostUserId) {
    return { error: "The assigned host has no linked DOS account, so no calendar is connected for this booking.", synced: false };
  }

  try {
    const result = await syncGoogleCalendarEvent({
      description: "Booked through your DOS scheduling link. Details are in DOS.",
      endAt: slot.endAt,
      reminderMinutes: [60],
      sourceId: tableId,
      sourceType: "meeting",
      startAt: slot.startAt,
      timezone: invitation.settings.timezone,
      title: `${invitation.title} with ${name}`,
      userId: hostUserId,
      workspaceId,
    }, supabase);

    if (result.status === "synced") {
      return { error: null, synced: true };
    }

    return { error: result.status === "not_connected" ? "Google Calendar is not connected for the assigned host." : "Calendar sync was skipped.", synced: false };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Google Calendar sync failed.", synced: false };
  }
}

async function createPublicTableInvitationBookingV2(
  supabase: SupabaseAdminClient,
  loaded: Extract<Awaited<ReturnType<typeof loadPublicInvitationByToken>>, { status: "ready" }>,
  input: CreatePublicBookingInput,
) {
  const startAt = cleanText(input.startAt);
  const name = cleanText(input.name);
  const email = normalizeBookingEmail(input.email);
  const phone = cleanText(input.phone);
  const operationKey = cleanText(input.operationKey);
  const workspaceId = loaded.workspace.id;
  const { invitation } = loaded;
  const { settings } = invitation;

  if (!startAt || !name || !email) {
    return { message: "Name, email, and time are required.", status: "invalid_input" as const };
  }

  if (!operationKey || operationKey.length < 8 || operationKey.length > 128) {
    return { message: "This booking request is missing its request key. Reload the page and try again.", status: "invalid_input" as const };
  }

  /* A retry for a booking that already went through must succeed even
     though the slot is now (correctly) unavailable, so the key is checked
     before availability. */
  const existing = await supabase
    .from("dos_table_invitation_bookings")
    .select(bookingSelect)
    .eq("invitation_id", invitation.id)
    .eq("operation_key", operationKey)
    .maybeSingle();

  if (!existing.error && existing.data) {
    const booking = mapBookingRow(existing.data as unknown as BookingRow);
    const slot: DosTableInvitationSlot = {
      dateLabel: formatBookingSlotDate(booking.startAt, settings.timezone),
      endAt: booking.endAt,
      id: booking.startAt,
      startAt: booking.startAt,
      timeLabel: formatBookingSlotTime(booking.startAt, settings.timezone),
    };

    return {
      alreadyBooked: true,
      bookingId: booking.id,
      invitation,
      personMatchStatus: booking.personMatchStatus,
      slot,
      status: "booked" as const,
      tableId: booking.tableId,
      workspace: loaded.workspace,
    };
  }

  const busyIntervals = await loadBusyIntervals(supabase, workspaceId, settings);
  const slots = generateDosTableInvitationSlots({ busyIntervals, kind: invitation.kind, settings });
  const requestedStart = new Date(startAt);
  const selectedSlot = Number.isNaN(requestedStart.getTime()) ? undefined : slots.find((slot) => slot.startAt === requestedStart.toISOString());

  if (!selectedSlot) {
    return { message: "That time is no longer available.", status: "unavailable" as const };
  }

  const [members, people, hostBusy] = await Promise.all([
    loadBookingHostMembers(supabase, workspaceId),
    loadBookingPeople(supabase, workspaceId),
    loadHostBusyIntervals(supabase, workspaceId, selectedSlot),
  ]);
  const host = assignBookingHost({
    busy: hostBusy,
    hostMemberIds: invitation.hostMemberIds,
    hostMode: invitation.hostMode,
    members,
    slot: selectedSlot,
  });
  const hostUserId = host.member && isUuid(host.member.dosUserId) ? host.member.dosUserId : null;
  const personMatch = matchBookingPerson({ email, name, phone }, people);
  const rpc = await supabase.rpc("dos_create_table_booking", {
    p_input: {
      block_dos_meetings: settings.calendarRules.blockDosMeetings,
      buffer_minutes: settings.bookingRules.bufferMinutes,
      create_meeting: settings.calendarRules.createDosMeeting,
      create_person: personMatch.status === "create",
      end_at: selectedSlot.endAt,
      host_member_id: host.member?.id ?? null,
      host_user_id: hostUserId,
      invitation_id: invitation.id,
      max_per_day: settings.bookingRules.maxPerDay,
      max_per_week: settings.bookingRules.maxPerWeek,
      meeting: {
        google_sync_enabled: settings.calendarRules.createGoogleCalendarEvent,
        notes: cleanText(input.notes),
        table_type: invitation.kind,
      },
      operation_key: operationKey,
      person_id: personMatch.status === "linked" ? personMatch.personId : null,
      person_match_candidates: personMatch.candidates,
      person_match_status: personMatch.status === "create" ? "created" : personMatch.status,
      requester: {
        email,
        name,
        notes: cleanText(input.notes),
        phone,
        prayer_request: cleanText(input.prayerRequest),
      },
      start_at: selectedSlot.startAt,
      timezone: settings.timezone,
      workspace_id: workspaceId,
    },
  });

  if (rpc.error) {
    const code = bookingRpcErrorCode(rpc.error.message);

    if (code === "invitation_unavailable") {
      return { status: "invalid" as const };
    }

    if (code === "slot_unavailable") {
      return { message: "That time is no longer available.", status: "unavailable" as const };
    }

    if (code === "limit_reached") {
      return { message: "That day is fully booked. Choose another time.", status: "unavailable" as const };
    }

    if (code === "invalid_input") {
      return { message: "Name, email, and time are required.", status: "invalid_input" as const };
    }

    throw new Error(rpc.error.message);
  }

  const result = rpc.data as BookingRpcResult;
  let calendarEventSynced = false;

  if (result.table_id && settings.calendarRules.createGoogleCalendarEvent) {
    const outcome = await syncBookingCalendarEvent({
      hostUserId,
      invitation,
      name,
      slot: selectedSlot,
      supabase,
      tableId: result.table_id,
      workspaceId,
    });

    calendarEventSynced = outcome.synced;
    await supabase
      .from("dos_table_invitation_bookings")
      .update({ calendar_event_synced: outcome.synced, calendar_sync_error: outcome.error })
      .eq("id", result.booking_id);
  }

  return {
    alreadyBooked: result.status === "already_booked",
    bookingId: result.booking_id,
    calendarEventSynced,
    hostMemberId: host.member?.id ?? null,
    invitation,
    personMatchStatus: personMatch.status === "create" ? "created" as const : personMatch.status,
    slot: selectedSlot,
    status: "booked" as const,
    tableId: result.table_id,
    workspace: loaded.workspace,
  };
}

function formatBookingSlotDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", timeZone: timezone, weekday: "short" }).format(new Date(value));
}

function formatBookingSlotTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: timezone }).format(new Date(value));
}

export async function createPublicTableInvitationBooking(input: CreatePublicBookingInput) {
  const supabase = createSupabaseAdminClient();
  const loaded = await loadPublicInvitationByToken(supabase, input.token);

  if (loaded.status !== "ready") {
    return loaded;
  }

  if (bookingWritePathV2Enabled()) {
    return createPublicTableInvitationBookingV2(supabase, loaded, input);
  }

  /* Legacy path (production until the founder enables the new one). */

  const startAt = cleanText(input.startAt);
  const name = cleanText(input.name);
  const email = cleanText(input.email)?.toLowerCase() ?? null;

  if (!startAt || !name || !email || !email.includes("@")) {
    return { message: "Name, email, and time are required.", status: "invalid_input" as const };
  }

  const busyIntervals = await loadBusyIntervals(supabase, loaded.workspace.id, loaded.invitation.settings);
  const slots = generateDosTableInvitationSlots({
    busyIntervals,
    kind: loaded.invitation.kind,
    settings: loaded.invitation.settings,
  });
  const selectedSlot = slots.find((slot) => slot.startAt === new Date(startAt).toISOString());

  if (!selectedSlot) {
    return { message: "That time is no longer available.", status: "unavailable" as const };
  }

  const personId = await resolveOrCreatePublicPerson({
    email,
    name,
    phone: cleanText(input.phone),
    supabase,
    workspaceId: loaded.workspace.id,
  });
  const scheduledTable = loaded.invitation.settings.calendarRules.createDosMeeting
    ? await createScheduledTable({
      invitation: loaded.invitation,
      name,
      notes: cleanText(input.notes),
      personId,
      phone: cleanText(input.phone),
      prayerRequest: cleanText(input.prayerRequest),
      startAt: selectedSlot.startAt,
      supabase,
      workspaceId: loaded.workspace.id,
    })
    : {
      calendarEventSynced: false,
      endAt: selectedSlot.endAt,
      tableId: null,
    };
  const bookingResult = await supabase
    .from("dos_table_invitation_bookings")
    .insert({
      calendar_event_synced: scheduledTable.calendarEventSynced,
      end_at: scheduledTable.endAt,
      field_person_id: personId,
      invitation_id: loaded.invitation.id,
      prayer_request: cleanText(input.prayerRequest),
      requester_email: email,
      requester_name: name,
      requester_notes: cleanText(input.notes),
      requester_phone: cleanText(input.phone),
      start_at: selectedSlot.startAt,
      status: "booked",
      table_id: scheduledTable.tableId,
      timezone: loaded.invitation.settings.timezone,
      workspace_id: loaded.workspace.id,
    })
    .select("id")
    .single();

  if (bookingResult.error) {
    throw new Error(bookingResult.error.message);
  }

  return {
    bookingId: String(bookingResult.data.id),
    invitation: loaded.invitation,
    slot: selectedSlot,
    status: "booked" as const,
    tableId: scheduledTable.tableId,
    workspace: loaded.workspace,
  };
}
