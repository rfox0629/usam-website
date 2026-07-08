import "server-only";

import { randomBytes } from "node:crypto";
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

export async function createPublicTableInvitationBooking(input: CreatePublicBookingInput) {
  const supabase = createSupabaseAdminClient();
  const loaded = await loadPublicInvitationByToken(supabase, input.token);

  if (loaded.status !== "ready") {
    return loaded;
  }

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
