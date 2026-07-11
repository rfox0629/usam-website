import { NextResponse } from "next/server";
import {
  asDateKey,
  asNullableDateKey,
  asNullableInteger,
  asNullableString,
  asString,
  authorizeDosCommitmentsWrite,
  commitmentsSetupResponse,
  firstDefined,
  isMissingCommitmentsSchema,
  isUuid,
  loadWorkspacePerson,
  mapAccountabilityCheckInRow,
  mapAccountabilityScheduleRow,
  mapCommitmentRow,
  mapCommitmentUpdateRow,
  normalizeCommitmentCategory,
  normalizeProgressState,
  readCommitmentsPayload,
  requireCommitmentsFeature,
  resolveAuthorizedCommitmentsWorkspace,
  todayDateKey,
} from "@/src/lib/dos/commitments-accountability-api";
import { nextAccountabilityCheckInDate, type DosAccountabilityFrequency, type DosCommitmentProgressState } from "@/src/lib/dos/commitments-accountability";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

const checkInSelect = "id, workspace_id, schedule_id, person_id, check_in_date, duration_minutes, general_update, wins, struggles, prayer_needs, follow_up, created_by_user_id, created_at, updated_at";
const commitmentSelect = "id, workspace_id, person_id, title, description, category, assigned_date, target_date, status, completed_date, created_by_user_id, created_at, updated_at";
const scheduleSelect = "id, workspace_id, person_id, title, frequency, day_of_week, scheduled_time, start_date, next_check_in, status, created_by_user_id, created_at, updated_at";
const updateSelect = "id, workspace_id, commitment_id, person_id, update_date, progress_note, progress_state, created_by_user_id, created_at";

type CommitmentDiscussionPayload = {
  commitmentId: string;
  progressNote: string;
  progressState: DosCommitmentProgressState | null;
};

function commitmentDiscussionsFromPayload(value: unknown): CommitmentDiscussionPayload[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const discussions: Array<CommitmentDiscussionPayload | null> = value
    .map((item): CommitmentDiscussionPayload | null => {
      if (typeof item === "string") {
        return { commitmentId: item, progressNote: "", progressState: null };
      }

      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const commitmentId = asString(firstDefined(record.commitmentId, record.commitment_id, record.id));

      return {
        commitmentId,
        progressNote: asString(firstDefined(record.progressNote, record.progress_note, record.note)),
        progressState: normalizeProgressState(firstDefined(record.progressState, record.progress_state)),
      };
    });

  return discussions.filter((item): item is CommitmentDiscussionPayload => Boolean(item?.commitmentId && isUuid(item.commitmentId)));
}

async function loadSchedule({
  scheduleId,
  supabase,
  workspaceId,
}: {
  scheduleId: string;
  supabase: ReturnType<typeof createSupabaseAdminClient>;
  workspaceId: string;
}) {
  const { data, error } = await supabase
    .from("dos_accountability_schedules")
    .select(scheduleSelect)
    .eq("id", scheduleId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as Record<string, unknown> | null;
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

  const generalUpdate = asString(firstDefined(payload.generalUpdate, payload.general_update));

  if (!generalUpdate) {
    return NextResponse.json({ error: "General update is required." }, { status: 400 });
  }

  const scheduleId = asString(firstDefined(payload.scheduleId, payload.schedule_id));
  const requestedPersonId = asString(firstDefined(payload.personId, payload.person_id));
  const supabase = createSupabaseAdminClient();
  const feature = await requireCommitmentsFeature(supabase, workspaceResult.workspaceId);

  if ("response" in feature) {
    return feature.response;
  }

  let schedule: Record<string, unknown> | null = null;

  if (scheduleId) {
    if (!isUuid(scheduleId)) {
      return NextResponse.json({ error: "Check-in schedule not found." }, { status: 404 });
    }

    try {
      schedule = await loadSchedule({ scheduleId, supabase, workspaceId: workspaceResult.workspaceId });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load schedule." }, { status: 500 });
    }

    if (!schedule) {
      return NextResponse.json({ error: "Check-in schedule not found in this workspace." }, { status: 404 });
    }
  }

  const personId = schedule ? String(schedule.person_id) : requestedPersonId;

  if (!isUuid(personId)) {
    return NextResponse.json({ error: "Person is required." }, { status: 400 });
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

  const checkInDate = asDateKey(firstDefined(payload.date, payload.checkInDate, payload.check_in_date));
  const { data: checkInRow, error: checkInError } = await supabase
    .from("dos_accountability_check_ins")
    .insert({
      check_in_date: checkInDate,
      created_by_user_id: authResult.authorization.status === "authorized" ? authResult.authorization.userId : null,
      duration_minutes: asNullableInteger(firstDefined(payload.duration, payload.durationMinutes, payload.duration_minutes)),
      follow_up: asNullableString(firstDefined(payload.followUp, payload.follow_up)),
      general_update: generalUpdate,
      person_id: person.id,
      prayer_needs: asNullableString(firstDefined(payload.prayerNeeds, payload.prayer_needs)),
      schedule_id: schedule ? String(schedule.id) : null,
      struggles: asNullableString(payload.struggles),
      wins: asNullableString(payload.wins),
      workspace_id: workspaceResult.workspaceId,
    })
    .select(checkInSelect)
    .single();

  if (checkInError) {
    if (isMissingCommitmentsSchema(checkInError)) {
      return commitmentsSetupResponse();
    }

    return NextResponse.json({ error: checkInError.message }, { status: 500 });
  }

  const discussionDrafts = commitmentDiscussionsFromPayload(payload.commitments);
  const discussedCommitmentIds = Array.from(new Set(discussionDrafts.map((item) => item.commitmentId)));
  const existingCommitmentsResult = discussedCommitmentIds.length
    ? await supabase
      .from("dos_person_commitments")
      .select(commitmentSelect)
      .eq("workspace_id", workspaceResult.workspaceId)
      .eq("person_id", person.id)
      .in("id", discussedCommitmentIds)
    : { data: [], error: null };

  if (existingCommitmentsResult.error) {
    if (isMissingCommitmentsSchema(existingCommitmentsResult.error)) {
      return commitmentsSetupResponse();
    }

    return NextResponse.json({ error: existingCommitmentsResult.error.message }, { status: 500 });
  }

  const existingCommitmentRows = (existingCommitmentsResult.data ?? []) as Array<Record<string, unknown>>;
  const existingCommitmentById = new Map(existingCommitmentRows.map((commitment) => [String(commitment.id), commitment]));
  const createdUpdates: Array<Record<string, unknown>> = [];
  const linkRows: Array<Record<string, unknown>> = [];

  for (const discussion of discussionDrafts) {
    const commitment = existingCommitmentById.get(discussion.commitmentId);

    if (!commitment) {
      continue;
    }

    let updateId: string | null = null;

    if (discussion.progressNote) {
      const { data: updateRow, error: updateError } = await supabase
        .from("dos_commitment_updates")
        .insert({
          commitment_id: discussion.commitmentId,
          created_by_user_id: authResult.authorization.status === "authorized" ? authResult.authorization.userId : null,
          person_id: person.id,
          progress_note: discussion.progressNote,
          progress_state: discussion.progressState,
          update_date: checkInDate,
          workspace_id: workspaceResult.workspaceId,
        })
        .select(updateSelect)
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      updateId = String(updateRow.id);
      createdUpdates.push(updateRow as Record<string, unknown>);

      if (discussion.progressState === "completed") {
        await supabase
          .from("dos_person_commitments")
          .update({ completed_date: todayDateKey(), status: "completed" })
          .eq("id", discussion.commitmentId)
          .eq("workspace_id", workspaceResult.workspaceId);
      }
    }

    linkRows.push({
      check_in_id: String(checkInRow.id),
      commitment_id: discussion.commitmentId,
      progress_update_id: updateId,
      workspace_id: workspaceResult.workspaceId,
    });
  }

  const newCommitmentPayload = payload.newCommitment && typeof payload.newCommitment === "object"
    ? payload.newCommitment as Record<string, unknown>
    : null;
  const newCommitmentTitle = newCommitmentPayload ? asString(newCommitmentPayload.title) : "";
  let newCommitmentRow: Record<string, unknown> | null = null;

  if (newCommitmentTitle) {
    const { data: createdCommitment, error: commitmentError } = await supabase
      .from("dos_person_commitments")
      .insert({
        assigned_date: todayDateKey(),
        category: normalizeCommitmentCategory(newCommitmentPayload?.category),
        created_by_user_id: authResult.authorization.status === "authorized" ? authResult.authorization.userId : null,
        description: asNullableString(newCommitmentPayload?.description),
        person_id: person.id,
        status: "active",
        target_date: asNullableDateKey(firstDefined(newCommitmentPayload?.targetDate, newCommitmentPayload?.target_date)),
        title: newCommitmentTitle,
        workspace_id: workspaceResult.workspaceId,
      })
      .select(commitmentSelect)
      .single();

    if (commitmentError) {
      if (isMissingCommitmentsSchema(commitmentError)) {
        return commitmentsSetupResponse();
      }

      return NextResponse.json({ error: commitmentError.message }, { status: 500 });
    }

    newCommitmentRow = createdCommitment as Record<string, unknown>;

    linkRows.push({
      check_in_id: String(checkInRow.id),
      commitment_id: String(newCommitmentRow.id),
      progress_update_id: null,
      workspace_id: workspaceResult.workspaceId,
    });
  }

  if (linkRows.length) {
    const { error: linkError } = await supabase
      .from("dos_accountability_check_in_commitments")
      .insert(linkRows);

    if (linkError) {
      if (isMissingCommitmentsSchema(linkError)) {
        return commitmentsSetupResponse();
      }

      return NextResponse.json({ error: linkError.message }, { status: 500 });
    }
  }

  let nextSchedule: Record<string, unknown> | null = schedule;

  if (schedule) {
    const nextCheckIn = nextAccountabilityCheckInDate(
      checkInDate,
      String(schedule.frequency) as DosAccountabilityFrequency,
      typeof schedule.day_of_week === "number" ? schedule.day_of_week : null,
    );
    const schedulePatch = nextCheckIn
      ? { next_check_in: nextCheckIn }
      : { next_check_in: checkInDate, status: "paused" };
    const { data: updatedSchedule, error: scheduleError } = await supabase
      .from("dos_accountability_schedules")
      .update(schedulePatch)
      .eq("id", String(schedule.id))
      .eq("workspace_id", workspaceResult.workspaceId)
      .select(scheduleSelect)
      .single();

    if (scheduleError) {
      if (isMissingCommitmentsSchema(scheduleError)) {
        return commitmentsSetupResponse();
      }

      return NextResponse.json({ error: scheduleError.message }, { status: 500 });
    }

    nextSchedule = updatedSchedule as Record<string, unknown>;
  }

  return NextResponse.json({
    checkIn: mapAccountabilityCheckInRow(checkInRow as Record<string, unknown>),
    commitments: [
      ...existingCommitmentRows.map((commitment) => mapCommitmentRow(commitment)),
      ...(newCommitmentRow ? [mapCommitmentRow(newCommitmentRow)] : []),
    ],
    links: linkRows.map((row) => ({
      checkInId: String(row.check_in_id),
      commitmentId: String(row.commitment_id),
      progressUpdateId: row.progress_update_id ? String(row.progress_update_id) : null,
      workspaceId: String(row.workspace_id),
    })),
    ok: true,
    schedule: nextSchedule ? mapAccountabilityScheduleRow(nextSchedule) : null,
    updates: createdUpdates.map(mapCommitmentUpdateRow),
  });
}
