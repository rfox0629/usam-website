import { NextResponse } from "next/server";
import {
  asDateKey,
  asNullableString,
  asString,
  authorizeDosCommitmentsWrite,
  firstDefined,
  isUuid,
  mapAccountabilityCheckInRow,
  mapCommitmentUpdateRow,
  readCommitmentsPayload,
  requireCommitmentsFeature,
  resolveAuthorizedCommitmentsWorkspace,
} from "@/src/lib/dos/commitments-accountability-api";
import { type DosCommitmentProgressState } from "@/src/lib/dos/commitments-accountability";
import {
  mapResourceAssignmentRow,
  normalizeResourceAssignmentStatus,
  pauseResourceAssignmentFollowUpSchedules,
  resourceAssignmentCommitmentStatusPatch,
  resourceAssignmentErrorResponse,
  resourceAssignmentSelect,
  resourceAssignmentStatusPatch,
} from "@/src/lib/dos/resource-assignments-api";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

const checkInSelect = "id, workspace_id, schedule_id, person_id, check_in_date, duration_minutes, general_update, wins, struggles, prayer_needs, follow_up, created_by_user_id, created_at, updated_at";
const updateSelect = "id, workspace_id, commitment_id, person_id, update_date, progress_note, progress_state, created_by_user_id, created_at";

function progressStateForAssignmentStatus(value: string): DosCommitmentProgressState | null {
  switch (value) {
    case "completed":
      return "completed";
    case "paused":
      return "struggling";
    case "in_progress":
      return "in_progress";
    case "not_started":
      return "not_started";
    case "going_well":
      return "going_well";
    case "needs_encouragement":
      return "struggling";
    default:
      return null;
  }
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

  const assignmentId = asString(firstDefined(payload.assignmentId, payload.assignment_id));
  const generalUpdate = asString(firstDefined(payload.generalUpdate, payload.general_update, payload.note));

  if (!isUuid(assignmentId) || !generalUpdate) {
    return NextResponse.json({ error: "Assignment and check-in note are required." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const feature = await requireCommitmentsFeature(supabase, workspaceResult.workspaceId);

  if ("response" in feature) {
    return feature.response;
  }

  const assignmentResult = await supabase
    .from("dos_resource_assignments")
    .select(resourceAssignmentSelect)
    .eq("id", assignmentId)
    .eq("workspace_id", workspaceResult.workspaceId)
    .maybeSingle();

  if (assignmentResult.error) {
    return resourceAssignmentErrorResponse(assignmentResult.error);
  }

  if (!assignmentResult.data) {
    return NextResponse.json({ error: "Assignment not found in this workspace." }, { status: 404 });
  }

  const assignment = assignmentResult.data as Record<string, unknown>;
  const checkInDate = asDateKey(firstDefined(payload.date, payload.checkInDate, payload.check_in_date));
  const nextFollowUpDate = asString(firstDefined(payload.nextFollowUpDate, payload.next_follow_up_date));
  const followUp = asNullableString(firstDefined(payload.followUp, payload.follow_up))
    ?? (nextFollowUpDate ? `Next follow-up: ${nextFollowUpDate}` : null);
  const createdByUserId = authResult.authorization.status === "authorized" ? authResult.authorization.userId : null;
  const { data: checkInRow, error: checkInError } = await supabase
    .from("dos_accountability_check_ins")
    .insert({
      check_in_date: checkInDate,
      created_by_user_id: createdByUserId,
      follow_up: followUp,
      general_update: generalUpdate,
      person_id: String(assignment.person_id),
      workspace_id: workspaceResult.workspaceId,
    })
    .select(checkInSelect)
    .single();

  if (checkInError) {
    return resourceAssignmentErrorResponse(checkInError);
  }

  const statusUpdateValue = asString(firstDefined(payload.statusUpdate, payload.status_update, payload.status));
  const nextAssignmentStatus = ["completed", "paused", "in_progress", "not_started"].includes(statusUpdateValue)
    ? normalizeResourceAssignmentStatus(statusUpdateValue)
    : null;
  const progressState = progressStateForAssignmentStatus(statusUpdateValue);
  const linkedCommitmentId = assignment.linked_commitment_id ? String(assignment.linked_commitment_id) : null;
  let updateRow: Record<string, unknown> | null = null;

  if (linkedCommitmentId) {
    const { data, error } = await supabase
      .from("dos_commitment_updates")
      .insert({
        commitment_id: linkedCommitmentId,
        created_by_user_id: createdByUserId,
        person_id: String(assignment.person_id),
        progress_note: generalUpdate,
        progress_state: progressState,
        update_date: checkInDate,
        workspace_id: workspaceResult.workspaceId,
      })
      .select(updateSelect)
      .single();

    if (error) {
      return resourceAssignmentErrorResponse(error);
    }

    updateRow = data as Record<string, unknown>;

    const linkError = (await supabase
      .from("dos_accountability_check_in_commitments")
      .insert({
        check_in_id: String(checkInRow.id),
        commitment_id: linkedCommitmentId,
        progress_update_id: String(updateRow.id),
        workspace_id: workspaceResult.workspaceId,
      })).error;

    if (linkError) {
      return resourceAssignmentErrorResponse(linkError);
    }

    if (nextAssignmentStatus) {
      const commitmentStatusError = (await supabase
        .from("dos_person_commitments")
        .update(resourceAssignmentCommitmentStatusPatch(nextAssignmentStatus))
        .eq("id", linkedCommitmentId)
        .eq("workspace_id", workspaceResult.workspaceId)).error;

      if (commitmentStatusError) {
        return resourceAssignmentErrorResponse(commitmentStatusError);
      }
    }
  }

  const nextAssignmentResult = nextAssignmentStatus
    ? await supabase
      .from("dos_resource_assignments")
      .update(resourceAssignmentStatusPatch(nextAssignmentStatus))
      .eq("id", assignmentId)
      .eq("workspace_id", workspaceResult.workspaceId)
      .select(resourceAssignmentSelect)
      .single()
    : assignmentResult;

  if (nextAssignmentResult.error) {
    return resourceAssignmentErrorResponse(nextAssignmentResult.error);
  }

  const followUpPauseResult = await pauseResourceAssignmentFollowUpSchedules({
    assignmentId,
    checkInDate,
    includeFuture: nextAssignmentStatus === "completed" || nextAssignmentStatus === "paused",
    personId: String(assignment.person_id),
    supabase,
    workspaceId: workspaceResult.workspaceId,
  });

  if (followUpPauseResult.error) {
    return resourceAssignmentErrorResponse(followUpPauseResult.error);
  }

  return NextResponse.json({
    assignment: mapResourceAssignmentRow(nextAssignmentResult.data as Record<string, unknown>),
    checkIn: mapAccountabilityCheckInRow(checkInRow as Record<string, unknown>),
    ok: true,
    update: updateRow ? mapCommitmentUpdateRow(updateRow) : null,
  });
}
