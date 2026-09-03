import { NextResponse } from "next/server";
import {
  asNullableDateKey,
  asNullableString,
  asString,
  authorizeDosCommitmentsWrite,
  commitmentsSetupResponse,
  firstDefined,
  isMissingCommitmentsSchema,
  isUuid,
  loadWorkspacePerson,
  mapCommitmentRow,
  normalizeCommitmentCategory,
  normalizeCommitmentStatus,
  readCommitmentsPayload,
  requireCommitmentsFeature,
  resolveAuthorizedCommitmentsWorkspace,
  todayDateKey,
} from "@/src/lib/dos/commitments-accountability-api";
import { commitmentConfirmedSubjectCount } from "@/src/lib/dos/accountability-presentation";
import { isDosCommitmentTargetKind } from "@/src/lib/dos/commitments-accountability";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

const commitmentSelect = "id, workspace_id, person_id, title, description, category, assigned_date, target_date, target_count, target_kind, status, completed_date, created_by_user_id, created_at, updated_at";

/* What the number counts, chosen by the user and never inferred from the
   title. Anything unrecognised is dropped rather than guessed at, which
   leaves the Accountability non-measurable instead of wrongly asking who is
   being discipled. */
function asOptionalTargetKind(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";

  return isDosCommitmentTargetKind(raw) ? raw : null;
}

function asOptionalPositiveInteger(value: unknown) {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
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
    return NextResponse.json({ error: "Person and commitment title are required." }, { status: 400 });
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

  const targetCount = asOptionalPositiveInteger(firstDefined(payload.targetCount, payload.target_count));
  const { data, error } = await supabase
    .from("dos_person_commitments")
    .insert({
      assigned_date: todayDateKey(),
      category: normalizeCommitmentCategory(payload.category),
      created_by_user_id: authResult.authorization.status === "authorized" ? authResult.authorization.userId : null,
      description: asNullableString(payload.description),
      person_id: person.id,
      status: "active",
      /* Optional measurable goal, e.g. 3 for "Begin discipling 3 men".
         Omitted or invalid means the commitment is simply not measurable,
         which is the norm and keeps simple goals simple. */
      target_count: targetCount,
      /* A kind without a number counts nothing, so it is not stored. */
      target_kind: targetCount === null ? null : asOptionalTargetKind(firstDefined(payload.targetKind, payload.target_kind)),
      target_date: asNullableDateKey(firstDefined(payload.targetDate, payload.target_date)),
      title,
      workspace_id: workspaceResult.workspaceId,
    })
    .select(commitmentSelect)
    .single();

  if (error) {
    if (isMissingCommitmentsSchema(error)) {
      return commitmentsSetupResponse();
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ commitment: mapCommitmentRow(data as Record<string, unknown>), ok: true });
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

  const commitmentId = asString(payload.id);

  if (!isUuid(commitmentId)) {
    return NextResponse.json({ error: "Commitment not found." }, { status: 404 });
  }

  const supabase = createSupabaseAdminClient();
  const feature = await requireCommitmentsFeature(supabase, workspaceResult.workspaceId);

  if ("response" in feature) {
    return feature.response;
  }

  const existingResult = await supabase
    .from("dos_person_commitments")
    .select("id, status, target_count, target_kind")
    .eq("id", commitmentId)
    .eq("workspace_id", workspaceResult.workspaceId)
    .maybeSingle();

  if (existingResult.error) {
    if (isMissingCommitmentsSchema(existingResult.error)) {
      return commitmentsSetupResponse();
    }

    return NextResponse.json({ error: existingResult.error.message }, { status: 500 });
  }

  if (!existingResult.data) {
    return NextResponse.json({ error: "Commitment not found in this workspace." }, { status: 404 });
  }

  const nextStatus = payload.status !== undefined ? normalizeCommitmentStatus(payload.status) : null;
  const updates: Record<string, unknown> = {};

  if (payload.title !== undefined) {
    const nextTitle = asString(payload.title);

    if (!nextTitle) {
      return NextResponse.json({ error: "Commitment title is required." }, { status: 400 });
    }

    updates.title = nextTitle;
  }

  if (payload.description !== undefined) {
    updates.description = asNullableString(payload.description);
  }

  if (payload.category !== undefined) {
    updates.category = normalizeCommitmentCategory(payload.category);
  }

  if (payload.targetDate !== undefined || payload.target_date !== undefined) {
    updates.target_date = asNullableDateKey(firstDefined(payload.targetDate, payload.target_date));
  }

  /* Editing the goal must never reinterpret or strand the progress already
     recorded against it, so both target fields are validated against what is
     actually stored rather than trusted from the form. */
  const existingKind = typeof existingResult.data.target_kind === "string" ? existingResult.data.target_kind : null;
  let confirmedSubjects = 0;

  if (existingKind === "people") {
    const subjectsResult = await supabase
      .from("dos_commitment_updates")
      .select("subject_person_id, subject_person_name")
      .eq("commitment_id", commitmentId)
      .eq("workspace_id", workspaceResult.workspaceId);

    if (subjectsResult.error) {
      if (isMissingCommitmentsSchema(subjectsResult.error)) {
        return commitmentsSetupResponse();
      }

      return NextResponse.json({ error: subjectsResult.error.message }, { status: 500 });
    }

    confirmedSubjects = commitmentConfirmedSubjectCount((subjectsResult.data ?? []).map((row) => ({
      subjectPersonId: row.subject_person_id as string | null,
      subjectPersonName: row.subject_person_name as string | null,
    })));
  }

  if (payload.targetKind !== undefined || payload.target_kind !== undefined) {
    const nextKind = asOptionalTargetKind(firstDefined(payload.targetKind, payload.target_kind));

    if (existingKind === "people" && nextKind !== "people" && confirmedSubjects > 0) {
      return NextResponse.json({
        error: `${confirmedSubjects} ${confirmedSubjects === 1 ? "person is" : "people are"} already confirmed. Keep counting people, or start a new Accountability.`,
      }, { status: 400 });
    }

    updates.target_kind = nextKind;
  }

  if (payload.targetCount !== undefined || payload.target_count !== undefined) {
    const nextCount = asOptionalPositiveInteger(firstDefined(payload.targetCount, payload.target_count));

    if (nextCount !== null && confirmedSubjects > nextCount) {
      return NextResponse.json({
        error: `${confirmedSubjects} ${confirmedSubjects === 1 ? "person is" : "people are"} already confirmed. Choose a target of ${confirmedSubjects} or more.`,
      }, { status: 400 });
    }

    if (nextCount === null && confirmedSubjects > 0) {
      return NextResponse.json({
        error: `${confirmedSubjects} ${confirmedSubjects === 1 ? "person is" : "people are"} already confirmed, so this goal still needs a number.`,
      }, { status: 400 });
    }

    updates.target_count = nextCount;
    /* A goal that stops being measurable stops counting anything. */
    if (nextCount === null) {
      updates.target_kind = null;
    }
  }

  if (nextStatus) {
    updates.status = nextStatus;
    updates.completed_date = nextStatus === "completed" ? todayDateKey() : null;
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "No commitment changes provided." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("dos_person_commitments")
    .update(updates)
    .eq("id", commitmentId)
    .eq("workspace_id", workspaceResult.workspaceId)
    .select(commitmentSelect)
    .single();

  if (error) {
    if (isMissingCommitmentsSchema(error)) {
      return commitmentsSetupResponse();
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ commitment: mapCommitmentRow(data as Record<string, unknown>), ok: true });
}
