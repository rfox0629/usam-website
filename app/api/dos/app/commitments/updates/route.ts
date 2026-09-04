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

const commitmentSelect = "id, workspace_id, person_id, title, description, category, assigned_date, target_date, target_count, target_kind, status, completed_date, created_by_user_id, created_at, updated_at";
const updateSelect = "id, workspace_id, commitment_id, person_id, update_date, progress_note, progress_state, progress_amount, subject_person_id, subject_person_name, created_by_user_id, created_at";

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
  const rawSubjectPersonId = asString(firstDefined(payload.subjectPersonId, payload.subject_person_id));
  const subjectPersonId = isUuid(rawSubjectPersonId) ? rawSubjectPersonId : null;
  const subjectPersonName = subjectPersonId ? null : asString(firstDefined(payload.subjectPersonName, payload.subject_person_name)).trim() || null;

  if (!isUuid(commitmentId)) {
    return NextResponse.json({ error: "Commitment is required." }, { status: 400 });
  }

  /* An update earns its place by saying something. Naming who was discipled
     says plenty on its own -- "Philip, started Sep 3" is a complete fact --
     so a note is no longer required alongside it. What is still rejected is
     an update that says nothing at all. */
  /* An amount is what the leader typed, so it is validated rather than
     coerced: a zero or a negative is a mistake worth saying out loud, and
     silently turning it into 1 would record something nobody entered. */
  const rawAmount = firstDefined(payload.progressAmount, payload.progress_amount);
  const hasAmount = rawAmount !== undefined && rawAmount !== null && String(rawAmount).trim() !== "";
  const parsedAmount = hasAmount ? Number(String(rawAmount).trim()) : null;

  if (hasAmount && (!Number.isInteger(parsedAmount) || (parsedAmount as number) <= 0)) {
    return NextResponse.json({ error: "Progress must be a whole number greater than zero." }, { status: 400 });
  }

  if (!progressNote && !subjectPersonId && !subjectPersonName && !hasAmount) {
    return NextResponse.json({ error: "Add a progress note or name who this is about." }, { status: 400 });
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

  /* The Accountability owner is the person doing the discipling, never the
     person discipled. Selecting them would count John toward his own goal of
     discipling three men, so it is refused at the boundary rather than only
     hidden in the picker. */
  if (subjectPersonId && subjectPersonId === String(commitmentResult.data.person_id)) {
    return NextResponse.json({ error: "Choose someone other than the person this accountability belongs to." }, { status: 400 });
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
      /* Who this progress is about. A DOS Person is recorded by id; someone
         not in DOS is recorded by name alone -- no placeholder Person is ever
         created to hold a name, and the name can be linked to a real Person
         later by setting subject_person_id on this same row. */
      progress_amount: parsedAmount,
      subject_person_id: subjectPersonId,
      subject_person_name: subjectPersonName,
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

  /* A count target that reaches its number is finished, through the same
     completion the model already has: status completed with a completed_date.
     No second status system.

     Progress is allowed to pass the target. Reading four times against a goal
     of three really happened, and refusing or clamping it would discard a
     true fact to make a number tidy. It reads as "4 of 3", completed. */
  let reachedCountTarget = false;

  if (
    hasAmount
    && commitmentResult.data.target_kind === "count"
    && typeof commitmentResult.data.target_count === "number"
    && commitmentResult.data.status !== "completed"
  ) {
    const priorResult = await supabase
      .from("dos_commitment_updates")
      .select("progress_amount")
      .eq("commitment_id", commitmentId)
      .eq("workspace_id", workspaceResult.workspaceId);

    if (priorResult.error) {
      if (isMissingCommitmentsSchema(priorResult.error)) {
        return commitmentsSetupResponse();
      }

      return NextResponse.json({ error: priorResult.error.message }, { status: 500 });
    }

    const total = (priorResult.data ?? []).reduce((sum, row) => {
      const amount = row.progress_amount;

      return sum + (typeof amount === "number" && amount > 0 ? amount : 1);
    }, 0);

    reachedCountTarget = total >= commitmentResult.data.target_count;
  }

  const nextCommitmentResult = progressState === "completed" || reachedCountTarget
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
