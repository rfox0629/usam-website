import { NextResponse } from "next/server";
import {
  asDateKey,
  asNullableDateKey,
  asNullableString,
  asOptionalWeekday,
  asString,
  authorizeDosCommitmentsWrite,
  commitmentsSetupResponse,
  firstDefined,
  isMissingCommitmentsSchema,
  isUuid,
  loadWorkspacePerson,
  mapAccountabilityScheduleRow,
  normalizeAccountabilityFrequency,
  normalizeScheduleStatus,
  readCommitmentsPayload,
  requireCommitmentsFeature,
  resolveAuthorizedCommitmentsWorkspace,
} from "@/src/lib/dos/commitments-accountability-api";
import { firstScheduleDateOnOrAfter, type DosAccountabilityFrequency } from "@/src/lib/dos/commitments-accountability";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

const scheduleSelect = "id, workspace_id, person_id, title, frequency, day_of_week, scheduled_time, start_date, next_check_in, status, created_by_user_id, created_at, updated_at";

function dateKeyDayOfWeek(value: string) {
  return new Date(`${value}T12:00:00.000Z`).getUTCDay();
}

function asNullableTime(value: unknown) {
  const nextValue = asString(value);

  return /^\d{2}:\d{2}$/.test(nextValue) ? nextValue : null;
}

function initialNextCheckIn({
  dayOfWeek,
  frequency,
  startDate,
}: {
  dayOfWeek: number | null;
  frequency: DosAccountabilityFrequency;
  startDate: string;
}) {
  if (frequency === "weekly" || frequency === "every_two_weeks") {
    return firstScheduleDateOnOrAfter(startDate, dayOfWeek ?? dateKeyDayOfWeek(startDate));
  }

  return startDate;
}

export async function POST(request: Request) {
  const authResult = await authorizeDosCommitmentsWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  const payload = await readCommitmentsPayload(request);

  if (!payload) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const workspaceResult = await resolveAuthorizedCommitmentsWorkspace(
    authResult.authorization,
    firstDefined(payload.workspaceId, payload.workspace_id),
  );

  if ("response" in workspaceResult) {
    return workspaceResult.response;
  }

  const personId = asString(firstDefined(payload.personId, payload.person_id));
  const title = asString(payload.title);

  if (!isUuid(personId) || !title) {
    return NextResponse.json({ error: "Person and check-in title are required." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const feature = await requireCommitmentsFeature(supabase, workspaceResult.workspaceId);

  if ("response" in feature) {
    return feature.response;
  }

  let person: { id: string; name: string } | null = null;

  try {
    person = await loadWorkspacePerson({ personId, supabase, workspaceId: workspaceResult.workspaceId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load person." }, { status: 500 });
  }

  if (!person) {
    return NextResponse.json({ error: "Person not found in this workspace." }, { status: 404 });
  }

  const frequency = normalizeAccountabilityFrequency(payload.frequency);
  const startDate = asDateKey(firstDefined(payload.startDate, payload.start_date));
  const dayOfWeek = frequency === "weekly" || frequency === "every_two_weeks"
    ? asOptionalWeekday(firstDefined(payload.dayOfWeek, payload.day_of_week)) ?? dateKeyDayOfWeek(startDate)
    : asOptionalWeekday(firstDefined(payload.dayOfWeek, payload.day_of_week));
  const nextCheckIn = asNullableDateKey(firstDefined(payload.nextCheckIn, payload.next_check_in))
    ?? initialNextCheckIn({ dayOfWeek, frequency, startDate });
  const { data, error } = await supabase
    .from("dos_accountability_schedules")
    .insert({
      created_by_user_id: authResult.authorization.status === "authorized" ? authResult.authorization.userId : null,
      day_of_week: dayOfWeek,
      frequency,
      next_check_in: nextCheckIn,
      person_id: person.id,
      scheduled_time: asNullableTime(firstDefined(payload.time, payload.scheduledTime, payload.scheduled_time)),
      start_date: startDate,
      status: normalizeScheduleStatus(payload.status),
      title,
      workspace_id: workspaceResult.workspaceId,
    })
    .select(scheduleSelect)
    .single();

  if (error) {
    if (isMissingCommitmentsSchema(error)) {
      return commitmentsSetupResponse();
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, schedule: mapAccountabilityScheduleRow(data as Record<string, unknown>) });
}

export async function PATCH(request: Request) {
  const authResult = await authorizeDosCommitmentsWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  const payload = await readCommitmentsPayload(request);

  if (!payload) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const workspaceResult = await resolveAuthorizedCommitmentsWorkspace(
    authResult.authorization,
    firstDefined(payload.workspaceId, payload.workspace_id),
  );

  if ("response" in workspaceResult) {
    return workspaceResult.response;
  }

  const scheduleId = asString(payload.id);

  if (!isUuid(scheduleId)) {
    return NextResponse.json({ error: "Schedule not found." }, { status: 404 });
  }

  const supabase = createSupabaseAdminClient();
  const feature = await requireCommitmentsFeature(supabase, workspaceResult.workspaceId);

  if ("response" in feature) {
    return feature.response;
  }

  const existingResult = await supabase
    .from("dos_accountability_schedules")
    .select(scheduleSelect)
    .eq("id", scheduleId)
    .eq("workspace_id", workspaceResult.workspaceId)
    .maybeSingle();

  if (existingResult.error) {
    if (isMissingCommitmentsSchema(existingResult.error)) {
      return commitmentsSetupResponse();
    }

    return NextResponse.json({ error: existingResult.error.message }, { status: 500 });
  }

  if (!existingResult.data) {
    return NextResponse.json({ error: "Schedule not found in this workspace." }, { status: 404 });
  }

  const existing = existingResult.data as Record<string, unknown>;
  const updates: Record<string, unknown> = {};

  if (payload.title !== undefined) {
    const title = asString(payload.title);

    if (!title) {
      return NextResponse.json({ error: "Check-in title is required." }, { status: 400 });
    }

    updates.title = title;
  }

  if (payload.frequency !== undefined) {
    updates.frequency = normalizeAccountabilityFrequency(payload.frequency);
  }

  if (payload.dayOfWeek !== undefined || payload.day_of_week !== undefined) {
    updates.day_of_week = asOptionalWeekday(firstDefined(payload.dayOfWeek, payload.day_of_week));
  }

  if (payload.scheduledTime !== undefined || payload.scheduled_time !== undefined || payload.time !== undefined) {
    updates.scheduled_time = asNullableTime(firstDefined(payload.time, payload.scheduledTime, payload.scheduled_time));
  }

  if (payload.startDate !== undefined || payload.start_date !== undefined) {
    updates.start_date = asDateKey(firstDefined(payload.startDate, payload.start_date));
  }

  if (payload.status !== undefined) {
    updates.status = normalizeScheduleStatus(payload.status);
  }

  if (payload.nextCheckIn !== undefined || payload.next_check_in !== undefined) {
    updates.next_check_in = asNullableDateKey(firstDefined(payload.nextCheckIn, payload.next_check_in));
  } else if (updates.frequency !== undefined || updates.day_of_week !== undefined || updates.start_date !== undefined) {
    const frequency = normalizeAccountabilityFrequency(updates.frequency ?? existing.frequency);
    const startDate = asDateKey(updates.start_date ?? existing.start_date);
    const dayOfWeek = frequency === "weekly" || frequency === "every_two_weeks"
      ? (typeof updates.day_of_week === "number" ? updates.day_of_week : typeof existing.day_of_week === "number" ? existing.day_of_week : dateKeyDayOfWeek(startDate))
      : (typeof updates.day_of_week === "number" ? updates.day_of_week : typeof existing.day_of_week === "number" ? existing.day_of_week : null);

    updates.day_of_week = dayOfWeek;
    updates.next_check_in = initialNextCheckIn({ dayOfWeek, frequency, startDate });
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "No schedule changes provided." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("dos_accountability_schedules")
    .update(updates)
    .eq("id", scheduleId)
    .eq("workspace_id", workspaceResult.workspaceId)
    .select(scheduleSelect)
    .single();

  if (error) {
    if (isMissingCommitmentsSchema(error)) {
      return commitmentsSetupResponse();
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, schedule: mapAccountabilityScheduleRow(data as Record<string, unknown>) });
}
