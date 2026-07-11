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
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

const commitmentSelect = "id, workspace_id, person_id, title, description, category, assigned_date, target_date, status, completed_date, created_by_user_id, created_at, updated_at";

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

  const { data, error } = await supabase
    .from("dos_person_commitments")
    .insert({
      assigned_date: todayDateKey(),
      category: normalizeCommitmentCategory(payload.category),
      created_by_user_id: authResult.authorization.status === "authorized" ? authResult.authorization.userId : null,
      description: asNullableString(payload.description),
      person_id: person.id,
      status: "active",
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
    .select("id, status")
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
