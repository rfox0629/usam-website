import { NextResponse } from "next/server";
import { requireDosWorkspaceRouteAccess } from "@/src/lib/dos/api-auth";
import { canWriteDosActivity, getDosAuthorization } from "@/src/lib/dos/auth";
import { recordCalendarSyncFailure, syncGoogleCalendarEvent, type CalendarSyncSourceType } from "@/src/lib/dos/google-calendar";
import { isMissingWorkspaceScopeColumn, resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type ReminderType = "anniversary" | "baptism" | "birthday" | "custom" | "follow_up" | "prayer" | "salvation";
type ReminderRecurrence = "monthly" | "none" | "weekly" | "yearly";

type ReminderPayload = {
  googleSyncEnabled?: unknown;
  google_sync_enabled?: unknown;
  id?: unknown;
  notes?: unknown;
  personId?: unknown;
  person_id?: unknown;
  recurrence?: unknown;
  reminderDate?: unknown;
  reminder_date?: unknown;
  reminderType?: unknown;
  reminder_type?: unknown;
  title?: unknown;
  workspaceId?: unknown;
  workspace_id?: unknown;
};

const importantDateTypes = new Set<ReminderType>(["anniversary", "baptism", "birthday", "salvation"]);

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function firstDefined(...values: unknown[]) {
  return values.find((value) => value !== undefined && value !== null);
}

function asNullableString(value: unknown) {
  const nextValue = asString(value);

  return nextValue ? nextValue : null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function asReminderType(value: unknown): ReminderType {
  const nextValue = asString(value);

  return ["anniversary", "baptism", "birthday", "custom", "follow_up", "prayer", "salvation"].includes(nextValue)
    ? nextValue as ReminderType
    : "custom";
}

function asRecurrence(value: unknown, reminderType: ReminderType): ReminderRecurrence {
  const nextValue = asString(value);

  if (importantDateTypes.has(reminderType) && (!nextValue || nextValue === "none")) {
    return "yearly";
  }

  if (nextValue === "monthly" || nextValue === "weekly" || nextValue === "yearly") {
    return nextValue;
  }

  return importantDateTypes.has(reminderType) ? "yearly" : "none";
}

function asReminderDate(value: unknown) {
  const nextValue = asString(value);

  if (!nextValue) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(nextValue)) {
    return `${nextValue}T12:00:00.000Z`;
  }

  const date = new Date(nextValue);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function addOneDay(value: string) {
  const date = new Date(value);

  date.setUTCDate(date.getUTCDate() + 1);

  return date.toISOString();
}

function sourceTypeForReminder(reminderType: ReminderType): CalendarSyncSourceType {
  return importantDateTypes.has(reminderType) ? "important_date" : "reminder";
}

function isMissingReminderSchema(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";

  return message.includes("relationship_reminders") || (message.includes("schema cache") && message.includes("reminder"));
}

function reminderSetupResponse() {
  return NextResponse.json({ error: "Reminders are not ready yet. Try again after setup is finished." }, { status: 500 });
}

function reminderTitle({
  personName,
  reminderType,
  title,
}: {
  personName: string;
  reminderType: ReminderType;
  title: string | null;
}) {
  switch (reminderType) {
    case "anniversary":
      return `Anniversary: ${personName}`;
    case "baptism":
      return `Baptism Anniversary: ${personName}`;
    case "birthday":
      return `Birthday: ${personName}`;
    case "salvation":
      return `Salvation Anniversary: ${personName}`;
    case "follow_up":
      return title ? `Follow Up: ${title}` : `Follow Up: ${personName}`;
    case "prayer":
      return title ? `Prayer: ${title}` : `Prayer Reminder: ${personName}`;
    case "custom":
    default:
      return title ? `Reminder: ${title}` : `Reminder: ${personName}`;
  }
}

async function readPayload(request: Request) {
  try {
    return await request.json() as ReminderPayload;
  } catch {
    return null;
  }
}

async function authorizeWrite() {
  const authorization = await getDosAuthorization();

  if (authorization.status === "unauthenticated") {
    return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }

  if (authorization.status === "configuration_error") {
    return { response: NextResponse.json({ error: authorization.message }, { status: 500 }) };
  }

  if (authorization.status === "unauthorized" || !canWriteDosActivity(authorization)) {
    return { response: NextResponse.json({ error: "DOS field app write access required." }, { status: 403 }) };
  }

  if (!isSupabaseAdminConfigured()) {
    return { response: NextResponse.json({ error: "Supabase admin environment variables are not configured." }, { status: 500 }) };
  }

  return { authorization };
}

async function loadWorkspacePerson({
  personId,
  supabase,
  workspaceId,
}: {
  personId: string;
  supabase: ReturnType<typeof createSupabaseAdminClient>;
  workspaceId: string;
}) {
  const scopedPersonResult = await supabase
    .from("missionary_field_people")
    .select("id, name")
    .eq("id", personId)
    .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
    .maybeSingle();
  // TODO: Remove the household_id-only fallback after all Supabase environments
  // have the Command Center workspace_id migration applied.
  const { data, error } = scopedPersonResult.error && isMissingWorkspaceScopeColumn(scopedPersonResult.error)
    ? await supabase
      .from("missionary_field_people")
      .select("id, name")
      .eq("id", personId)
      .eq("household_id", workspaceId)
      .maybeSingle()
    : scopedPersonResult;

  if (error) {
    throw new Error(error.message);
  }

  return data as { id: string; name: string } | null;
}

async function syncReminderCalendarEvent({
  googleSyncEnabled,
  notes,
  personName,
  recurrence,
  reminderDate,
  reminderId,
  reminderType,
  supabase,
  title,
  workspaceId,
}: {
  googleSyncEnabled: boolean;
  notes: string | null;
  personName: string;
  recurrence: ReminderRecurrence;
  reminderDate: string;
  reminderId: string;
  reminderType: ReminderType;
  supabase: ReturnType<typeof createSupabaseAdminClient>;
  title: string | null;
  workspaceId: string;
}) {
  if (!googleSyncEnabled) {
    return;
  }

  const sourceType = sourceTypeForReminder(reminderType);
  const isImportantDate = sourceType === "important_date";

  await syncGoogleCalendarEvent({
    allDay: true,
    description: [notes?.trim() ?? "", "Created from DOS."].filter(Boolean).join("\n\n"),
    endAt: addOneDay(reminderDate),
    recurrence,
    reminderMinutes: isImportantDate ? [10_080, 1_440] : [1_440],
    sourceId: reminderId,
    sourceType,
    startAt: reminderDate,
    title: reminderTitle({ personName, reminderType, title }),
    workspaceId,
  }, supabase).catch(async (calendarError) => {
    await recordCalendarSyncFailure({
      error: calendarError instanceof Error ? calendarError.message : "Unable to sync Google Calendar reminder.",
      sourceId: reminderId,
      sourceType,
      supabase,
      workspaceId,
    }).catch(() => undefined);
  });
}

export async function POST(request: Request) {
  const authResult = await authorizeWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  const payload = await readPayload(request);

  if (!payload) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const workspaceId = await resolveDosAppWorkspaceId(asString(firstDefined(payload.workspaceId, payload.workspace_id)));
  const personId = asString(firstDefined(payload.personId, payload.person_id));
  const reminderDate = asReminderDate(firstDefined(payload.reminderDate, payload.reminder_date));

  if (!workspaceId || !isUuid(personId) || !reminderDate) {
    return NextResponse.json({ error: "Person and date are required." }, { status: 400 });
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(authResult.authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  const supabase = createSupabaseAdminClient();
  let person: { id: string; name: string } | null = null;

  try {
    person = await loadWorkspacePerson({ personId, supabase, workspaceId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load person." }, { status: 500 });
  }

  if (!person) {
    return NextResponse.json({ error: "Person not found in this workspace." }, { status: 404 });
  }

  const reminderType = asReminderType(firstDefined(payload.reminderType, payload.reminder_type));
  const recurrence = asRecurrence(payload.recurrence, reminderType);
  const title = asNullableString(payload.title);
  const notes = asNullableString(payload.notes);
  const googleSyncEnabled = firstDefined(payload.googleSyncEnabled, payload.google_sync_enabled) === true;
  const { data, error } = await supabase
    .from("relationship_reminders")
    .insert({
      google_sync_enabled: googleSyncEnabled,
      notes,
      person_id: person.id,
      recurrence,
      reminder_date: reminderDate,
      reminder_type: reminderType,
      title,
      workspace_id: workspaceId,
    })
    .select("id")
    .single();

  if (error) {
    if (isMissingReminderSchema(error)) {
      return reminderSetupResponse();
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data?.id) {
    return NextResponse.json({ error: "Unable to create reminder." }, { status: 500 });
  }

  await syncReminderCalendarEvent({
    googleSyncEnabled,
    notes,
    personName: person.name,
    recurrence,
    reminderDate,
    reminderId: String(data.id),
    reminderType,
    supabase,
    title,
    workspaceId,
  });

  return NextResponse.json({ id: data.id, ok: true });
}

export async function PATCH(request: Request) {
  const authResult = await authorizeWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  const payload = await readPayload(request);

  if (!payload) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const workspaceId = await resolveDosAppWorkspaceId(asString(firstDefined(payload.workspaceId, payload.workspace_id)));
  const reminderId = asString(payload.id);
  const personId = asString(firstDefined(payload.personId, payload.person_id));
  const reminderDate = asReminderDate(firstDefined(payload.reminderDate, payload.reminder_date));

  if (!workspaceId || !isUuid(reminderId) || !isUuid(personId) || !reminderDate) {
    return NextResponse.json({ error: "Reminder, person, and date are required." }, { status: 400 });
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(authResult.authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  const supabase = createSupabaseAdminClient();
  let person: { id: string; name: string } | null = null;

  try {
    person = await loadWorkspacePerson({ personId, supabase, workspaceId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load person." }, { status: 500 });
  }

  if (!person) {
    return NextResponse.json({ error: "Person not found in this workspace." }, { status: 404 });
  }

  const reminderType = asReminderType(firstDefined(payload.reminderType, payload.reminder_type));
  const recurrence = asRecurrence(payload.recurrence, reminderType);
  const title = asNullableString(payload.title);
  const notes = asNullableString(payload.notes);
  const googleSyncEnabled = firstDefined(payload.googleSyncEnabled, payload.google_sync_enabled) === true;
  const { data, error } = await supabase
    .from("relationship_reminders")
    .update({
      google_sync_enabled: googleSyncEnabled,
      notes,
      person_id: person.id,
      recurrence,
      reminder_date: reminderDate,
      reminder_type: reminderType,
      title,
    })
    .eq("id", reminderId)
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .select("id")
    .single();

  if (error) {
    if (isMissingReminderSchema(error)) {
      return reminderSetupResponse();
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data?.id) {
    return NextResponse.json({ error: "Unable to update reminder." }, { status: 500 });
  }

  await syncReminderCalendarEvent({
    googleSyncEnabled,
    notes,
    personName: person.name,
    recurrence,
    reminderDate,
    reminderId: String(data.id),
    reminderType,
    supabase,
    title,
    workspaceId,
  });

  return NextResponse.json({ id: data.id, ok: true });
}

export async function DELETE(request: Request) {
  const authResult = await authorizeWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  const payload = await readPayload(request);

  if (!payload) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const workspaceId = await resolveDosAppWorkspaceId(asString(firstDefined(payload.workspaceId, payload.workspace_id)));
  const reminderId = asString(payload.id);

  if (!workspaceId || !isUuid(reminderId)) {
    return NextResponse.json({ error: "Reminder not found." }, { status: 404 });
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(authResult.authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  const { data, error } = await createSupabaseAdminClient()
    .from("relationship_reminders")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", reminderId)
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .select("id")
    .single();

  if (error) {
    if (isMissingReminderSchema(error)) {
      return reminderSetupResponse();
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data?.id) {
    return NextResponse.json({ error: "Unable to delete reminder." }, { status: 500 });
  }

  return NextResponse.json({ deleted: true, id: data.id, ok: true });
}
