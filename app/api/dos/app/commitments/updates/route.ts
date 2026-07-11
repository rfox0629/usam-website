import { NextResponse } from "next/server";
import {
  asDateKey,
  asString,
  authorizeDosCommitmentsWrite,
  commitmentsSetupResponse,
  firstDefined,
  isMissingCommitmentsSchema,
  isUuid,
  mapCommitmentRow,
  mapCommitmentUpdateRow,
  normalizeProgressState,
  readCommitmentsPayload,
  requireCommitmentsFeature,
  resolveAuthorizedCommitmentsWorkspace,
  todayDateKey,
} from "@/src/lib/dos/commitments-accountability-api";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

const commitmentSelect = "id, workspace_id, person_id, title, description, category, assigned_date, target_date, status, completed_date, created_by_user_id, created_at, updated_at";
const updateSelect = "id, workspace_id, commitment_id, person_id, update_date, progress_note, progress_state, created_by_user_id, created_at";

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

  const commitmentId = asString(firstDefined(payload.commitmentId, payload.commitment_id));
  const progressNote = asString(firstDefined(payload.progressNote, payload.progress_note, payload.note));

  if (!isUuid(commitmentId) || !progressNote) {
    return NextResponse.json({ error: "Commitment and progress note are required." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const feature = await requireCommitmentsFeature(supabase, workspaceResult.workspaceId);

  if ("response" in feature) {
    return feature.response;
  }

  const commitmentResult = await supabase
    .from("dos_person_commitments")
    .select(commitmentSelect)
    .eq("id", commitmentId)
    .eq("workspace_id", workspaceResult.workspaceId)
    .maybeSingle();

  if (commitmentResult.error) {
    if (isMissingCommitmentsSchema(commitmentResult.error)) {
      return commitmentsSetupResponse();
    }

    return NextResponse.json({ error: commitmentResult.error.message }, { status: 500 });
  }

  if (!commitmentResult.data) {
    return NextResponse.json({ error: "Commitment not found in this workspace." }, { status: 404 });
  }

  const progressState = normalizeProgressState(firstDefined(payload.progressState, payload.progress_state));
  const { data: updateRow, error: updateError } = await supabase
    .from("dos_commitment_updates")
    .insert({
      commitment_id: commitmentId,
      created_by_user_id: authResult.authorization.status === "authorized" ? authResult.authorization.userId : null,
      person_id: String(commitmentResult.data.person_id),
      progress_note: progressNote,
      progress_state: progressState,
      update_date: asDateKey(firstDefined(payload.date, payload.updateDate, payload.update_date)),
      workspace_id: workspaceResult.workspaceId,
    })
    .select(updateSelect)
    .single();

  if (updateError) {
    if (isMissingCommitmentsSchema(updateError)) {
      return commitmentsSetupResponse();
    }

    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const nextCommitmentResult = progressState === "completed"
    ? await supabase
      .from("dos_person_commitments")
      .update({ completed_date: todayDateKey(), status: "completed" })
      .eq("id", commitmentId)
      .eq("workspace_id", workspaceResult.workspaceId)
      .select(commitmentSelect)
      .single()
    : commitmentResult;

  if (nextCommitmentResult.error) {
    if (isMissingCommitmentsSchema(nextCommitmentResult.error)) {
      return commitmentsSetupResponse();
    }

    return NextResponse.json({ error: nextCommitmentResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    commitment: mapCommitmentRow(nextCommitmentResult.data as Record<string, unknown>, [updateRow as Record<string, unknown>]),
    ok: true,
    update: mapCommitmentUpdateRow(updateRow as Record<string, unknown>),
  });
}
