import { NextResponse } from "next/server";
import {
  asNullableString,
  asString,
  authorizeDosCommitmentsWrite,
  firstDefined,
  isUuid,
  loadWorkspacePerson,
  readCommitmentsPayload,
  requireCommitmentsFeature,
  resolveAuthorizedCommitmentsWorkspace,
} from "@/src/lib/dos/commitments-accountability-api";
import { getDosResourceBySlug } from "@/src/lib/dos/resource-catalog";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

const progressSelect = "id, workspace_id, resource_slug, session_id, person_id, assignment_id, completed_at, reflection, action_step, prayer_focus, created_by_user_id, created_at, updated_at";

type SupabaseQueryError = { message?: string } | null | undefined;

function isMissingGuidedResourceProgressSchema(error: SupabaseQueryError) {
  const message = error?.message?.toLowerCase() ?? "";

  return message.includes("dos_guided_resource_progress")
    || message.includes("guided resource")
    || (message.includes("schema cache") && message.includes("session_id"));
}

function guidedResourceProgressSetupResponse() {
  return NextResponse.json({ error: "Guided resource progress is not ready yet." }, { status: 500 });
}

function guidedResourceProgressErrorResponse(error: SupabaseQueryError) {
  if (isMissingGuidedResourceProgressSchema(error)) {
    return guidedResourceProgressSetupResponse();
  }

  return NextResponse.json({ error: error?.message ?? "Unable to save guided resource progress." }, { status: 500 });
}

function asLimitedText(value: unknown, maxLength: number) {
  const text = asNullableString(value);

  return text ? text.slice(0, maxLength) : null;
}

function mapGuidedResourceProgressRow(row: Record<string, unknown>) {
  return {
    actionStep: row.action_step ? String(row.action_step) : null,
    assignmentId: row.assignment_id ? String(row.assignment_id) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    createdAt: row.created_at ? String(row.created_at) : null,
    createdByUserId: row.created_by_user_id ? String(row.created_by_user_id) : null,
    id: String(row.id),
    personId: String(row.person_id),
    prayerFocus: row.prayer_focus ? String(row.prayer_focus) : null,
    reflection: row.reflection ? String(row.reflection) : null,
    resourceSlug: String(row.resource_slug),
    sessionId: String(row.session_id),
    updatedAt: row.updated_at ? String(row.updated_at) : null,
    workspaceId: String(row.workspace_id),
  };
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

  const resourceSlug = asString(firstDefined(payload.resourceSlug, payload.resource_slug));
  const resource = getDosResourceBySlug(resourceSlug);
  const guidedResource = resource?.content?.guidedResource ?? null;

  if (!resource || resource.type !== "guided_resource" || !guidedResource) {
    return NextResponse.json({ error: "Choose a guided Library resource." }, { status: 400 });
  }

  const sessionId = asString(firstDefined(payload.sessionId, payload.session_id));
  const session = guidedResource.sessions.find((item) => item.id === sessionId) ?? null;

  if (!session) {
    return NextResponse.json({ error: "Choose a valid guided resource session." }, { status: 400 });
  }

  const personId = asString(firstDefined(payload.personId, payload.person_id));

  if (!isUuid(personId)) {
    return NextResponse.json({ error: "Person is required." }, { status: 400 });
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

  const assignmentId = asString(firstDefined(payload.assignmentId, payload.assignment_id));
  let scopedAssignmentId: string | null = null;

  if (assignmentId) {
    if (!isUuid(assignmentId)) {
      return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
    }

    const assignmentResult = await supabase
      .from("dos_resource_assignments")
      .select("id")
      .eq("id", assignmentId)
      .eq("workspace_id", workspaceResult.workspaceId)
      .eq("person_id", person.id)
      .eq("resource_slug", resource.slug)
      .maybeSingle();

    if (assignmentResult.error) {
      return guidedResourceProgressErrorResponse(assignmentResult.error);
    }

    if (!assignmentResult.data) {
      return NextResponse.json({ error: "Assignment not found in this workspace." }, { status: 404 });
    }

    scopedAssignmentId = assignmentId;
  }

  const completedProvided = typeof payload.completed === "boolean";
  const createdByUserId = authResult.authorization.status === "authorized" ? authResult.authorization.userId : null;
  const existingResult = await supabase
    .from("dos_guided_resource_progress")
    .select(progressSelect)
    .eq("workspace_id", workspaceResult.workspaceId)
    .eq("person_id", person.id)
    .eq("resource_slug", resource.slug)
    .eq("session_id", session.id)
    .maybeSingle();

  if (existingResult.error) {
    return guidedResourceProgressErrorResponse(existingResult.error);
  }

  const progressPatch: Record<string, unknown> = {
    action_step: asLimitedText(firstDefined(payload.actionStep, payload.action_step), 2000),
    prayer_focus: asLimitedText(firstDefined(payload.prayerFocus, payload.prayer_focus), 2000),
    reflection: asLimitedText(payload.reflection, 6000),
  };

  if (scopedAssignmentId) {
    progressPatch.assignment_id = scopedAssignmentId;
  }

  if (completedProvided) {
    progressPatch.completed_at = payload.completed ? new Date().toISOString() : null;
  }

  const progressResult = existingResult.data
    ? await supabase
      .from("dos_guided_resource_progress")
      .update(progressPatch)
      .eq("id", String(existingResult.data.id))
      .eq("workspace_id", workspaceResult.workspaceId)
      .select(progressSelect)
      .single()
    : await supabase
      .from("dos_guided_resource_progress")
      .insert({
        ...progressPatch,
        assignment_id: scopedAssignmentId,
        completed_at: completedProvided ? progressPatch.completed_at : null,
        created_by_user_id: createdByUserId,
        person_id: person.id,
        resource_slug: resource.slug,
        session_id: session.id,
        workspace_id: workspaceResult.workspaceId,
      })
      .select(progressSelect)
      .single();

  if (progressResult.error) {
    return guidedResourceProgressErrorResponse(progressResult.error);
  }

  return NextResponse.json({
    ok: true,
    progress: mapGuidedResourceProgressRow(progressResult.data as Record<string, unknown>),
  });
}
