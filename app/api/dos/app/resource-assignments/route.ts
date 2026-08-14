import { NextResponse } from "next/server";
import {
  asNullableString,
  asString,
  authorizeDosCommitmentsWrite,
  firstDefined,
  isUuid,
  loadWorkspacePerson,
  mapCommitmentRow,
  readCommitmentsPayload,
  requireCommitmentsFeature,
  resolveAuthorizedCommitmentsWorkspace,
} from "@/src/lib/dos/commitments-accountability-api";
import {
  assignmentCommitmentTitle,
  assignmentDueDateFromPayload,
  assignmentStartDateFromPayload,
  firstAssignmentPayloadValue,
  isMissingResourceAssignmentsSchema,
  mapResourceAssignmentRow,
  normalizeResourceAssignmentContext,
  normalizeResourceAssignmentFollowUpCadence,
  normalizeResourceAssignmentSharingLevel,
  normalizeResourceAssignmentStatus,
  resourceAssignmentCommitmentStatusPatch,
  resourceAssignmentErrorResponse,
  resourceAssignmentSelect,
  resourceAssignmentStatusPatch,
  resolveAssignableDosResource,
  syncResourceAssignmentFollowUpSchedules,
} from "@/src/lib/dos/resource-assignments-api";
import { ensureGroupMemberAccessReady } from "@/src/lib/groups/member-access";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

const commitmentSelect = "id, workspace_id, person_id, title, description, category, assigned_date, target_date, status, completed_date, created_by_user_id, created_at, updated_at";

function payloadBoolean(value: unknown) {
  return value === true || value === "true" || value === "1";
}

async function createLinkedCommitment({
  assignedBy,
  dueDate,
  personalMessage,
  personId,
  resourceTitle,
  startDate,
  supabase,
  workspaceId,
}: {
  assignedBy: string | null;
  dueDate: string | null;
  personalMessage: string | null;
  personId: string;
  resourceTitle: string;
  startDate: string;
  supabase: ReturnType<typeof createSupabaseAdminClient>;
  workspaceId: string;
}) {
  return supabase
    .from("dos_person_commitments")
    .insert({
      assigned_date: startDate,
      category: "Spiritual Disciplines",
      created_by_user_id: assignedBy,
      description: personalMessage,
      person_id: personId,
      status: "active",
      target_date: dueDate,
      title: assignmentCommitmentTitle({ title: resourceTitle }),
      workspace_id: workspaceId,
    })
    .select(commitmentSelect)
    .single();
}

async function updateLinkedCommitment({
  assignmentStatus,
  commitmentId,
  dueDate,
  personalMessage,
  resourceTitle,
  startDate,
  supabase,
  workspaceId,
}: {
  assignmentStatus?: ReturnType<typeof normalizeResourceAssignmentStatus>;
  commitmentId: string;
  dueDate?: string | null;
  personalMessage?: string | null;
  resourceTitle: string;
  startDate?: string;
  supabase: ReturnType<typeof createSupabaseAdminClient>;
  workspaceId: string;
}) {
  const updates: Record<string, unknown> = {
    title: assignmentCommitmentTitle({ title: resourceTitle }),
  };

  if (dueDate !== undefined) {
    updates.target_date = dueDate;
  }

  if (personalMessage !== undefined) {
    updates.description = personalMessage;
  }

  if (startDate !== undefined) {
    updates.assigned_date = startDate;
  }

  if (assignmentStatus) {
    Object.assign(updates, resourceAssignmentCommitmentStatusPatch(assignmentStatus));
  }

  return supabase
    .from("dos_person_commitments")
    .update(updates)
    .eq("id", commitmentId)
    .eq("workspace_id", workspaceId)
    .select(commitmentSelect)
    .single();
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

  const resource = resolveAssignableDosResource(firstAssignmentPayloadValue(payload, "resourceSlug", "resource_slug"));

  if (!resource) {
    return NextResponse.json({ error: "Choose an assignable Library resource." }, { status: 400 });
  }

  const personId = asString(firstAssignmentPayloadValue(payload, "personId", "person_id"));

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

  const startDate = assignmentStartDateFromPayload(firstAssignmentPayloadValue(payload, "startDate", "start_date"));
  const dueDate = assignmentDueDateFromPayload(firstAssignmentPayloadValue(payload, "dueDate", "due_date"), resource, startDate);

  if (dueDate && dueDate < startDate) {
    return NextResponse.json({ error: "Due date must be on or after the start date." }, { status: 400 });
  }

  const personalMessage = asNullableString(firstAssignmentPayloadValue(payload, "personalMessage", "personal_message"));
  const followUpCadence = normalizeResourceAssignmentFollowUpCadence(
    firstAssignmentPayloadValue(payload, "followUpCadence", "follow_up_cadence"),
    resource.assignmentDefaults?.followUpCadence ?? "midpoint_and_completion",
  );
  const requestedSourceGroupId = asString(firstAssignmentPayloadValue(payload, "sourceGroupId", "source_group_id"));
  const requestedAssignmentContext = normalizeResourceAssignmentContext(
    firstAssignmentPayloadValue(payload, "assignmentContext", "assignment_context"),
    requestedSourceGroupId ? "group" : "person",
  );
  const sourceGroupId = requestedSourceGroupId || null;
  const assignmentContext = sourceGroupId ? "group" : requestedAssignmentContext;
  const sharingLevel = normalizeResourceAssignmentSharingLevel(firstAssignmentPayloadValue(payload, "sharingLevel", "sharing_level"));
  const assignedBy = authResult.authorization.status === "authorized" ? authResult.authorization.userId : null;
  const reuseExisting = payloadBoolean(firstDefined(payload.reuseExisting, payload.reuse_existing));
  let sourceGroupMemberId: string | null = null;

  if (assignmentContext === "group" && !sourceGroupId) {
    return NextResponse.json({ error: "Group context is required for a group assignment." }, { status: 400 });
  }

  if (sourceGroupId) {
    if (!isUuid(sourceGroupId)) {
      return NextResponse.json({ error: "Group not found." }, { status: 404 });
    }

    const groupResult = await supabase
      .from("dos_groups")
      .select("id")
      .eq("id", sourceGroupId)
      .eq("workspace_id", workspaceResult.workspaceId)
      .eq("active", true)
      .maybeSingle();

    if (groupResult.error) {
      return resourceAssignmentErrorResponse(groupResult.error);
    }

    if (!groupResult.data) {
      return NextResponse.json({ error: "Group not found in this workspace." }, { status: 404 });
    }

    const membershipResult = await supabase
      .from("dos_group_members")
      .select("id")
      .eq("group_id", sourceGroupId)
      .eq("person_id", person.id)
      .eq("status", "active")
      .maybeSingle();

    if (membershipResult.error) {
      return resourceAssignmentErrorResponse(membershipResult.error);
    }

    if (!membershipResult.data) {
      return NextResponse.json({ error: `${person.name} is not an active member of this group.` }, { status: 400 });
    }

    sourceGroupMemberId = String(membershipResult.data.id);
  }

  const existingResult = await supabase
    .from("dos_resource_assignments")
    .select(resourceAssignmentSelect)
    .eq("workspace_id", workspaceResult.workspaceId)
    .eq("person_id", person.id)
    .eq("resource_slug", resource.slug)
    .in("status", ["not_started", "in_progress", "paused"])
    .maybeSingle();

  if (existingResult.error) {
    return resourceAssignmentErrorResponse(existingResult.error);
  }

  if (existingResult.data && !reuseExisting) {
    return NextResponse.json({
      assignment: mapResourceAssignmentRow(existingResult.data as Record<string, unknown>),
      duplicate: true,
      error: `${person.name} already has an active assignment for ${resource.title}.`,
      ok: false,
      person: { id: person.id, name: person.name },
      resource: { slug: resource.slug, title: resource.title },
    }, { status: 409 });
  }

  let linkedCommitmentId = existingResult.data?.linked_commitment_id ? String(existingResult.data.linked_commitment_id) : null;
  let commitmentRow: Record<string, unknown> | null = null;

  if (!linkedCommitmentId) {
    const commitmentResult = await createLinkedCommitment({
      assignedBy,
      dueDate,
      personalMessage,
      personId: person.id,
      resourceTitle: resource.title,
      startDate,
      supabase,
      workspaceId: workspaceResult.workspaceId,
    });

    if (commitmentResult.error) {
      return resourceAssignmentErrorResponse(commitmentResult.error);
    }

    commitmentRow = commitmentResult.data as Record<string, unknown>;
    linkedCommitmentId = String(commitmentRow.id);
  } else {
    const commitmentResult = await updateLinkedCommitment({
      commitmentId: linkedCommitmentId,
      dueDate,
      personalMessage,
      resourceTitle: resource.title,
      startDate,
      supabase,
      workspaceId: workspaceResult.workspaceId,
    });

    if (commitmentResult.error && !isMissingResourceAssignmentsSchema(commitmentResult.error)) {
      return resourceAssignmentErrorResponse(commitmentResult.error);
    }

    commitmentRow = commitmentResult.data as Record<string, unknown> | null;
  }

  const assignmentPayload = {
    assignment_context: assignmentContext,
    assigned_by_user_id: assignedBy,
    due_date: dueDate,
    follow_up_cadence: followUpCadence,
    linked_commitment_id: linkedCommitmentId,
    person_id: person.id,
    personal_message: personalMessage,
    resource_slug: resource.slug,
    sharing_level: sharingLevel,
    source_group_id: sourceGroupId,
    start_date: startDate,
    status: existingResult.data?.status === "paused" ? "in_progress" : existingResult.data?.status ?? "not_started",
    workspace_id: workspaceResult.workspaceId,
  };
  const assignmentResult = existingResult.data
    ? await supabase
      .from("dos_resource_assignments")
      .update({
        assignment_context: assignmentPayload.assignment_context,
        due_date: assignmentPayload.due_date,
        follow_up_cadence: assignmentPayload.follow_up_cadence,
        linked_commitment_id: assignmentPayload.linked_commitment_id,
        paused_at: null,
        personal_message: assignmentPayload.personal_message,
        sharing_level: assignmentPayload.sharing_level,
        source_group_id: assignmentPayload.source_group_id,
        start_date: assignmentPayload.start_date,
        status: assignmentPayload.status,
      })
      .eq("id", String(existingResult.data.id))
      .eq("workspace_id", workspaceResult.workspaceId)
      .select(resourceAssignmentSelect)
      .single()
    : await supabase
      .from("dos_resource_assignments")
      .insert(assignmentPayload)
      .select(resourceAssignmentSelect)
      .single();

  if (assignmentResult.error) {
    return resourceAssignmentErrorResponse(assignmentResult.error);
  }

  const scheduleSyncResult = await syncResourceAssignmentFollowUpSchedules({
    assignedBy,
    assignment: assignmentResult.data as Record<string, unknown>,
    resource,
    supabase,
    workspaceId: workspaceResult.workspaceId,
  });

  if (scheduleSyncResult.error) {
    return resourceAssignmentErrorResponse(scheduleSyncResult.error);
  }

  let memberAccessWarning: string | null = null;

  if (sourceGroupId && sourceGroupMemberId) {
    const memberAccessResult = await ensureGroupMemberAccessReady(supabase, {
      createdByUserId: assignedBy,
      groupId: sourceGroupId,
      memberId: sourceGroupMemberId,
      personId: person.id,
      source: "leader_assignment",
    });

    if (memberAccessResult.error || memberAccessResult.missingSchema || !memberAccessResult.access) {
      memberAccessWarning = memberAccessResult.error
        ?? (memberAccessResult.missingSchema ? "Member access schema is not configured." : "Member access could not be prepared.");
      console.warn("[Resource Assignment] Unable to prepare scoped member access", {
        groupId: sourceGroupId,
        memberId: sourceGroupMemberId,
        personId: person.id,
        warning: memberAccessWarning,
      });
    }
  }

  return NextResponse.json({
    assignment: mapResourceAssignmentRow(assignmentResult.data as Record<string, unknown>),
    commitment: commitmentRow ? mapCommitmentRow(commitmentRow) : null,
    memberAccess: sourceGroupId
      ? {
        status: memberAccessWarning ? "needs_attention" : "ready",
        warning: memberAccessWarning,
      }
      : null,
    ok: true,
  });
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

  const assignmentId = asString(payload.id);

  if (!isUuid(assignmentId)) {
    return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  }

  const supabase = createSupabaseAdminClient();
  const feature = await requireCommitmentsFeature(supabase, workspaceResult.workspaceId);

  if ("response" in feature) {
    return feature.response;
  }

  const existingResult = await supabase
    .from("dos_resource_assignments")
    .select(resourceAssignmentSelect)
    .eq("id", assignmentId)
    .eq("workspace_id", workspaceResult.workspaceId)
    .maybeSingle();

  if (existingResult.error) {
    return resourceAssignmentErrorResponse(existingResult.error);
  }

  if (!existingResult.data) {
    return NextResponse.json({ error: "Assignment not found in this workspace." }, { status: 404 });
  }

  const existing = existingResult.data as Record<string, unknown>;
  const resource = resolveAssignableDosResource(existing.resource_slug);

  if (!resource) {
    return NextResponse.json({ error: "Assigned Library resource is not available." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  const nextStatus = payload.status !== undefined ? normalizeResourceAssignmentStatus(payload.status, normalizeResourceAssignmentStatus(existing.status)) : null;

  if (payload.startDate !== undefined || payload.start_date !== undefined) {
    updates.start_date = assignmentStartDateFromPayload(firstAssignmentPayloadValue(payload, "startDate", "start_date"));
  }

  if (payload.dueDate !== undefined || payload.due_date !== undefined) {
    updates.due_date = assignmentDueDateFromPayload(
      firstAssignmentPayloadValue(payload, "dueDate", "due_date"),
      resource,
      String(updates.start_date ?? existing.start_date),
    );
  }

  if (updates.due_date && String(updates.due_date) < String(updates.start_date ?? existing.start_date)) {
    return NextResponse.json({ error: "Due date must be on or after the start date." }, { status: 400 });
  }

  if (payload.personalMessage !== undefined || payload.personal_message !== undefined) {
    updates.personal_message = asNullableString(firstAssignmentPayloadValue(payload, "personalMessage", "personal_message"));
  }

  if (payload.followUpCadence !== undefined || payload.follow_up_cadence !== undefined) {
    updates.follow_up_cadence = normalizeResourceAssignmentFollowUpCadence(firstAssignmentPayloadValue(payload, "followUpCadence", "follow_up_cadence"));
  }

  if (payload.assignmentContext !== undefined || payload.assignment_context !== undefined) {
    updates.assignment_context = normalizeResourceAssignmentContext(firstAssignmentPayloadValue(payload, "assignmentContext", "assignment_context"));
  }

  if (payload.sourceGroupId !== undefined || payload.source_group_id !== undefined) {
    const nextSourceGroupId = asString(firstAssignmentPayloadValue(payload, "sourceGroupId", "source_group_id"));

    if (nextSourceGroupId && !isUuid(nextSourceGroupId)) {
      return NextResponse.json({ error: "Group not found." }, { status: 404 });
    }

    updates.source_group_id = nextSourceGroupId || null;
  }

  if (payload.sharingLevel !== undefined || payload.sharing_level !== undefined) {
    updates.sharing_level = normalizeResourceAssignmentSharingLevel(firstAssignmentPayloadValue(payload, "sharingLevel", "sharing_level"));
  }

  if (nextStatus) {
    Object.assign(updates, resourceAssignmentStatusPatch(nextStatus));
  }

  if (updates.assignment_context === "group" && !updates.source_group_id && !existing.source_group_id) {
    return NextResponse.json({ error: "Group context is required for a group assignment." }, { status: 400 });
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "No assignment changes provided." }, { status: 400 });
  }

  const assignmentResult = await supabase
    .from("dos_resource_assignments")
    .update(updates)
    .eq("id", assignmentId)
    .eq("workspace_id", workspaceResult.workspaceId)
    .select(resourceAssignmentSelect)
    .single();

  if (assignmentResult.error) {
    return resourceAssignmentErrorResponse(assignmentResult.error);
  }

  const linkedCommitmentId = existing.linked_commitment_id ? String(existing.linked_commitment_id) : null;
  let commitmentRow: Record<string, unknown> | null = null;

  if (linkedCommitmentId) {
    const commitmentResult = await updateLinkedCommitment({
      assignmentStatus: nextStatus ?? undefined,
      commitmentId: linkedCommitmentId,
      dueDate: updates.due_date !== undefined ? String(updates.due_date) : undefined,
      personalMessage: updates.personal_message !== undefined ? updates.personal_message as string | null : undefined,
      resourceTitle: resource.title,
      startDate: updates.start_date !== undefined ? String(updates.start_date) : undefined,
      supabase,
      workspaceId: workspaceResult.workspaceId,
    });

    if (commitmentResult.error && !isMissingResourceAssignmentsSchema(commitmentResult.error)) {
      return resourceAssignmentErrorResponse(commitmentResult.error);
    }

    commitmentRow = commitmentResult.data as Record<string, unknown> | null;
  }

  const scheduleSyncResult = await syncResourceAssignmentFollowUpSchedules({
    assignedBy: authResult.authorization.status === "authorized" ? authResult.authorization.userId : null,
    assignment: assignmentResult.data as Record<string, unknown>,
    resource,
    supabase,
    workspaceId: workspaceResult.workspaceId,
  });

  if (scheduleSyncResult.error) {
    return resourceAssignmentErrorResponse(scheduleSyncResult.error);
  }

  return NextResponse.json({
    assignment: mapResourceAssignmentRow(assignmentResult.data as Record<string, unknown>),
    commitment: commitmentRow ? mapCommitmentRow(commitmentRow) : null,
    ok: true,
  });
}
