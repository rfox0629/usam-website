import { NextResponse } from "next/server";
import { requireDosWorkspaceRouteAccess } from "@/src/lib/dos/api-auth";
import { canWriteDosActivity, getDosAuthorization } from "@/src/lib/dos/auth";
import { resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

const categories = ["Family", "Ministry", "Support", "Health", "Travel", "Other"] as const;
const priorities = ["high", "low", "normal", "urgent"] as const;
const statuses = ["active", "answered", "archived"] as const;
const visibilities = ["group_leaders", "group_members", "organization", "private", "public_profile"] as const;
const requestSelect = "id, workspace_id, organization_id, household_id, related_household_id, related_missionary_profile_id, field_person_id, group_id, gathering_id, meeting_id, created_by_person_id, created_by_user_id, title, request, category, urgency, priority, status, visibility, source, person_tags, linked_person_ids, follow_up_at, answered_at, answer_testimony, created_at, updated_at";
const legacyRequestSelect = "id, workspace_id, household_id, related_household_id, field_person_id, title, request, category, urgency, status, visibility, source, answered_at, created_at, updated_at";

type PrayerRequestPayload = {
  answerTestimony?: unknown;
  answer_testimony?: unknown;
  answeredAt?: unknown;
  answered_at?: unknown;
  category?: unknown;
  createdByPersonId?: unknown;
  created_by_person_id?: unknown;
  fieldPersonId?: unknown;
  field_person_id?: unknown;
  followUpAt?: unknown;
  follow_up_at?: unknown;
  gatheringId?: unknown;
  gathering_id?: unknown;
  groupId?: unknown;
  group_id?: unknown;
  id?: unknown;
  linkedPersonIds?: unknown;
  linked_person_ids?: unknown;
  meetingId?: unknown;
  meeting_id?: unknown;
  organizationId?: unknown;
  organization_id?: unknown;
  operationId?: unknown;
  personTags?: unknown;
  person_tags?: unknown;
  priority?: unknown;
  request?: unknown;
  status?: unknown;
  title?: unknown;
  visibility?: unknown;
  workspaceId?: unknown;
  workspace_id?: unknown;
};

type PrayerRequestRow = {
  answer_testimony?: string | null;
  answered_at?: string | null;
  category: string | null;
  created_by_person_id?: string | null;
  created_by_user_id?: string | null;
  created_at: string;
  field_person_id?: string | null;
  follow_up_at?: string | null;
  gathering_id?: string | null;
  group_id?: string | null;
  id: string;
  linked_person_ids?: string[] | null;
  meeting_id?: string | null;
  organization_id?: string | null;
  person_tags?: string[] | null;
  priority?: string | null;
  request?: string | null;
  source?: string | null;
  status: string | null;
  title: string | null;
  updated_at: string | null;
  urgency?: string | null;
  visibility?: string | null;
  workspace_id?: string | null;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableString(value: unknown) {
  const text = asString(value);

  return text ? text : null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isUniqueViolation(error: { code?: string; message?: string } | null | undefined) {
  return error?.code === "23505" || /duplicate key|unique constraint/i.test(error?.message ?? "");
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(value.map((item) => asString(item)).filter(Boolean)));
}

function asUuidArray(value: unknown) {
  return asStringArray(value).filter(isUuid);
}

function asCategory(value: unknown) {
  const nextValue = asString(value);

  return categories.includes(nextValue as typeof categories[number]) ? nextValue : "Other";
}

function asVisibility(value: unknown) {
  const nextValue = asString(value);

  if (nextValue === "public") {
    return "public_profile";
  }

  if (nextValue === "team") {
    return "organization";
  }

  return visibilities.includes(nextValue as typeof visibilities[number]) ? nextValue : "private";
}

function asStatus(value: unknown) {
  const nextValue = asString(value);

  if (nextValue === "covered" || nextValue === "open") {
    return "active";
  }

  return statuses.includes(nextValue as typeof statuses[number]) ? nextValue : "active";
}

function asPriority(value: unknown) {
  const nextValue = asString(value);

  if (nextValue === "important") {
    return "high";
  }

  return priorities.includes(nextValue as typeof priorities[number]) ? nextValue : "normal";
}

function legacyVisibility(value: string) {
  if (value === "public_profile") {
    return "public";
  }

  if (value === "group_members" || value === "group_leaders" || value === "organization") {
    return "team";
  }

  return "private";
}

function prayerRequestScopeFilter(workspaceId: string) {
  return [
    `workspace_id.eq.${workspaceId}`,
    `household_id.eq.${workspaceId}`,
    `related_household_id.eq.${workspaceId}`,
    `related_missionary_profile_id.eq.${workspaceId}`,
  ].join(",");
}

function isMissingPrayerBridgeColumn(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";

  return ["answer_testimony", "created_by_person_id", "follow_up_at", "gathering_id", "group_id", "linked_person_ids", "meeting_id", "person_tags", "priority", "schema cache"].some((columnName) => message.includes(columnName));
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

async function validateFieldPerson(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  workspaceId: string,
  fieldPersonId: string,
) {
  if (!fieldPersonId) {
    return { ok: true as const };
  }

  if (!isUuid(fieldPersonId)) {
    return { response: NextResponse.json({ error: "Selected person is invalid." }, { status: 400 }) };
  }

  const { data: person, error: personError } = await supabase
    .from("missionary_field_people")
    .select("id")
    .eq("id", fieldPersonId)
    .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
    .maybeSingle();

  if (personError) {
    return { response: NextResponse.json({ error: personError.message }, { status: 500 }) };
  }

  if (!person) {
    return { response: NextResponse.json({ error: "Selected person does not belong to this workspace." }, { status: 400 }) };
  }

  return { ok: true as const };
}

async function validateGroup(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  workspaceId: string,
  groupId: string,
) {
  if (!groupId) {
    return { ok: true as const };
  }

  if (!isUuid(groupId)) {
    return { response: NextResponse.json({ error: "Selected group is invalid." }, { status: 400 }) };
  }

  const { data: group, error: groupError } = await supabase
    .from("dos_groups")
    .select("id")
    .eq("id", groupId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (groupError) {
    return { response: NextResponse.json({ error: groupError.message }, { status: 500 }) };
  }

  if (!group) {
    return { response: NextResponse.json({ error: "Selected group does not belong to this workspace." }, { status: 400 }) };
  }

  return { ok: true as const };
}

async function validateGathering(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  workspaceId: string,
  gatheringId: string,
  groupId: string,
) {
  if (!gatheringId) {
    return { ok: true as const };
  }

  if (!isUuid(gatheringId)) {
    return { response: NextResponse.json({ error: "Selected gathering is invalid." }, { status: 400 }) };
  }

  const { data: gathering, error: gatheringError } = await supabase
    .from("dos_group_gatherings")
    .select("id, group_id")
    .eq("id", gatheringId)
    .maybeSingle();

  if (gatheringError) {
    return { response: NextResponse.json({ error: gatheringError.message }, { status: 500 }) };
  }

  if (!gathering) {
    return { response: NextResponse.json({ error: "Selected gathering does not belong to this workspace." }, { status: 400 }) };
  }

  if (groupId && gathering.group_id !== groupId) {
    return { response: NextResponse.json({ error: "Selected gathering does not belong to the selected group." }, { status: 400 }) };
  }

  return validateGroup(supabase, workspaceId, gathering.group_id);
}

async function validateMeeting(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  workspaceId: string,
  meetingId: string,
) {
  if (!meetingId) {
    return { ok: true as const };
  }

  if (!isUuid(meetingId)) {
    return { response: NextResponse.json({ error: "Selected Table log is invalid." }, { status: 400 }) };
  }

  const { data: meeting, error: meetingError } = await supabase
    .from("missionary_tables")
    .select("id")
    .eq("id", meetingId)
    .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
    .maybeSingle();

  if (meetingError) {
    return { response: NextResponse.json({ error: meetingError.message }, { status: 500 }) };
  }

  if (!meeting) {
    return { response: NextResponse.json({ error: "Selected Table log does not belong to this workspace." }, { status: 400 }) };
  }

  return { ok: true as const };
}

function mapPrayerRequest(row: PrayerRequestRow, workspaceId: string) {
  const status = row.status === "answered" || row.status === "archived" ? row.status : "active";
  const priority = row.priority === "low" || row.priority === "high" || row.priority === "urgent"
    ? row.priority
    : row.urgency === "urgent"
      ? "urgent"
      : row.urgency === "important"
        ? "high"
        : "normal";
  const urgency = priority === "high" ? "important" : priority === "urgent" ? "urgent" : "normal";
  const visibility = row.visibility === "public_profile"
    ? "public_profile"
    : row.visibility === "group_members"
      ? "group_members"
      : row.visibility === "group_leaders"
        ? "group_leaders"
        : row.visibility === "organization" || row.visibility === "team"
          ? "organization"
          : row.visibility === "public"
            ? "public_profile"
            : "private";

  return {
    answerTestimony: row.answer_testimony ?? null,
    answeredAt: row.answered_at ?? null,
    category: row.category ?? "Other",
    createdByPersonId: row.created_by_person_id ?? null,
    createdByUserId: row.created_by_user_id ?? null,
    createdAt: row.created_at,
    fieldPersonId: row.field_person_id ?? null,
    followUpAt: row.follow_up_at ?? null,
    gatheringId: row.gathering_id ?? null,
    groupId: row.group_id ?? null,
    id: row.id,
    linkedPersonIds: Array.isArray(row.linked_person_ids) ? row.linked_person_ids.filter(Boolean) : [],
    meetingId: row.meeting_id ?? null,
    organizationId: row.organization_id ?? null,
    personTags: Array.isArray(row.person_tags) ? row.person_tags.map((tag) => tag.trim()).filter(Boolean) : [],
    priority,
    request: row.request ?? "",
    source: row.source ?? null,
    status,
    title: row.title ?? "Prayer request",
    updatedAt: row.updated_at ?? null,
    urgency,
    visibility,
    workspaceId: row.workspace_id ?? workspaceId,
  };
}

export async function POST(request: Request) {
  const authResult = await authorizeWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  let payload: PrayerRequestPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const workspaceId = await resolveDosAppWorkspaceId(asString(payload.workspaceId) || asString(payload.workspace_id));
  const title = asString(payload.title);
  const requestText = asString(payload.request);

  if (!workspaceId || !title || !requestText) {
    return NextResponse.json({ error: "Workspace, title, and request are required." }, { status: 400 });
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(authResult.authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  const supabase = createSupabaseAdminClient();
  const fieldPersonId = asString(payload.fieldPersonId) || asString(payload.field_person_id);
  const createdByPersonId = asString(payload.createdByPersonId) || asString(payload.created_by_person_id);
  const groupId = asString(payload.groupId) || asString(payload.group_id);
  const gatheringId = asString(payload.gatheringId) || asString(payload.gathering_id);
  const meetingId = asString(payload.meetingId) || asString(payload.meeting_id);
  const organizationId = asString(payload.organizationId) || asString(payload.organization_id);
  const operationId = asString(payload.operationId);
  const linkedPersonIds = asUuidArray(payload.linkedPersonIds ?? payload.linked_person_ids);

  if (operationId && !isUuid(operationId)) {
    return NextResponse.json({ error: "Prayer operation ID is invalid." }, { status: 400 });
  }

  if (organizationId && !isUuid(organizationId)) {
    return NextResponse.json({ error: "Selected organization is invalid." }, { status: 400 });
  }

  const personValidation = await validateFieldPerson(supabase, workspaceId, fieldPersonId);

  if ("response" in personValidation) {
    return personValidation.response;
  }

  const creatorValidation = await validateFieldPerson(supabase, workspaceId, createdByPersonId);

  if ("response" in creatorValidation) {
    return creatorValidation.response;
  }

  const groupValidation = await validateGroup(supabase, workspaceId, groupId);

  if ("response" in groupValidation) {
    return groupValidation.response;
  }

  const gatheringValidation = await validateGathering(supabase, workspaceId, gatheringId, groupId);

  if ("response" in gatheringValidation) {
    return gatheringValidation.response;
  }

  const meetingValidation = await validateMeeting(supabase, workspaceId, meetingId);

  if ("response" in meetingValidation) {
    return meetingValidation.response;
  }

  const priority = asPriority(payload.priority);

  const insertPayload = {
    category: asCategory(payload.category),
    confidentiality_level: "missionary_couple",
    created_by: authResult.authorization.userId ?? null,
    created_by_person_id: createdByPersonId || null,
    created_by_user_id: authResult.authorization.userId ?? null,
    description: requestText,
    field_person_id: fieldPersonId || null,
    follow_up_at: asNullableString(payload.followUpAt ?? payload.follow_up_at),
    gathering_id: gatheringId || null,
    group_id: groupId || null,
    household_id: workspaceId,
    linked_person_ids: linkedPersonIds,
    meeting_id: meetingId || null,
    organization_id: organizationId || null,
    person_tags: asStringArray(payload.personTags ?? payload.person_tags),
    priority,
    related_household_id: workspaceId,
    related_missionary_profile_id: workspaceId,
    request: requestText,
    source: groupId ? "dos_group" : meetingId ? "dos_table" : "dos",
    status: "active",
    title,
    urgency: priority === "urgent" ? "urgent" : priority === "high" ? "important" : "normal",
    visibility: asVisibility(payload.visibility),
    workspace_id: workspaceId,
    ...(operationId ? { id: operationId } : {}),
  };
  const existingMeetingPrayerResult = operationId
    ? await supabase
      .from("prayer_requests")
      .select("id")
      .eq("id", operationId)
      .or(prayerRequestScopeFilter(workspaceId))
      .maybeSingle()
    : meetingId
    ? await supabase
      .from("prayer_requests")
      .select("id")
      .or(prayerRequestScopeFilter(workspaceId))
      .eq("meeting_id", meetingId)
      .eq("source", "dos_table")
      .neq("status", "archived")
      .order("updated_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    : { data: null, error: null };

  if (existingMeetingPrayerResult.error && !isMissingPrayerBridgeColumn(existingMeetingPrayerResult.error)) {
    return NextResponse.json({ error: existingMeetingPrayerResult.error.message }, { status: 500 });
  }

  if (meetingId && existingMeetingPrayerResult.data?.id && !existingMeetingPrayerResult.error) {
    const updateResult = await supabase
      .from("prayer_requests")
      .update(insertPayload)
      .eq("id", existingMeetingPrayerResult.data.id)
      .or(prayerRequestScopeFilter(workspaceId))
      .select(requestSelect)
      .single();

    if (updateResult.error) {
      if (!isMissingPrayerBridgeColumn(updateResult.error)) {
        return NextResponse.json({ error: updateResult.error.message }, { status: 500 });
      }
    } else {
      return NextResponse.json({ prayerRequest: mapPrayerRequest(updateResult.data as PrayerRequestRow, workspaceId) });
    }
  }

  const insertResult = await supabase
    .from("prayer_requests")
    .insert(insertPayload)
    .select(requestSelect)
    .single();
  let data = insertResult.data as PrayerRequestRow | null;
  let error = insertResult.error;

  if (error && operationId && isUniqueViolation(error)) {
    const existingOperationResult = await supabase
      .from("prayer_requests")
      .select(requestSelect)
      .eq("id", operationId)
      .or(prayerRequestScopeFilter(workspaceId))
      .maybeSingle();

    if (!existingOperationResult.error && existingOperationResult.data) {
      data = existingOperationResult.data as PrayerRequestRow;
      error = null;
    }
  }

  if (error && isMissingPrayerBridgeColumn(error)) {
    const legacyInsertPayload = {
      category: insertPayload.category,
      confidentiality_level: insertPayload.confidentiality_level,
      created_by: insertPayload.created_by,
      description: insertPayload.description,
      field_person_id: insertPayload.field_person_id,
      household_id: insertPayload.household_id,
      related_household_id: insertPayload.related_household_id,
      related_missionary_profile_id: insertPayload.related_missionary_profile_id,
      request: insertPayload.request,
      source: insertPayload.source,
      status: insertPayload.status,
      title: insertPayload.title,
      urgency: insertPayload.urgency,
      visibility: legacyVisibility(insertPayload.visibility),
      workspace_id: insertPayload.workspace_id,
      ...(operationId ? { id: operationId } : {}),
    };
    let existingLegacyQuery = supabase
        .from("prayer_requests")
        .select(legacyRequestSelect)
        .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId},related_household_id.eq.${workspaceId}`)
        .eq("source", "dos_table")
        .eq("title", title)
        .eq("request", requestText)
        .eq("status", "active")
        .order("updated_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(1);

    existingLegacyQuery = fieldPersonId
      ? existingLegacyQuery.eq("field_person_id", fieldPersonId)
      : existingLegacyQuery.is("field_person_id", null);

    const existingLegacyResult = meetingId
      ? await existingLegacyQuery.maybeSingle()
      : { data: null, error: null };

    if (existingLegacyResult.error) {
      data = null;
      error = existingLegacyResult.error;
    } else if (existingLegacyResult.data?.id) {
      const legacyUpdateResult = await supabase
        .from("prayer_requests")
        .update(legacyInsertPayload)
        .eq("id", existingLegacyResult.data.id)
        .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId},related_household_id.eq.${workspaceId}`)
        .select(legacyRequestSelect)
        .single();

      data = legacyUpdateResult.data;
      error = legacyUpdateResult.error;
    } else {
      const legacyInsertResult = await supabase
        .from("prayer_requests")
        .insert(legacyInsertPayload)
        .select(legacyRequestSelect)
        .single();

      data = legacyInsertResult.data;
      error = legacyInsertResult.error;
    }
  }

  if (error && operationId && isUniqueViolation(error)) {
    const existingLegacyOperationResult = await supabase
      .from("prayer_requests")
      .select(legacyRequestSelect)
      .eq("id", operationId)
      .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId},related_household_id.eq.${workspaceId}`)
      .maybeSingle();

    if (!existingLegacyOperationResult.error && existingLegacyOperationResult.data) {
      data = existingLegacyOperationResult.data as PrayerRequestRow;
      error = null;
    }
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ prayerRequest: mapPrayerRequest(data as PrayerRequestRow, workspaceId) });
}

export async function PATCH(request: Request) {
  const authResult = await authorizeWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  let payload: PrayerRequestPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const workspaceId = await resolveDosAppWorkspaceId(asString(payload.workspaceId) || asString(payload.workspace_id));
  const id = asString(payload.id);

  if (!workspaceId || !isUuid(id)) {
    return NextResponse.json({ error: "Workspace and prayer request ID are required." }, { status: 400 });
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(authResult.authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  const supabase = createSupabaseAdminClient();
  const updatePayload: Record<string, unknown> = {};
  const legacyUpdatePayload: Record<string, unknown> = {};

  if (payload.title !== undefined) {
    const title = asString(payload.title);

    if (!title) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }

    updatePayload.title = title;
    legacyUpdatePayload.title = title;
  }

  if (payload.request !== undefined) {
    const requestText = asString(payload.request);

    if (!requestText) {
      return NextResponse.json({ error: "Request is required." }, { status: 400 });
    }

    updatePayload.request = requestText;
    updatePayload.description = requestText;
    legacyUpdatePayload.request = requestText;
  }

  if (payload.category !== undefined) {
    const category = asCategory(payload.category);

    updatePayload.category = category;
    legacyUpdatePayload.category = category;
  }

  if (payload.visibility !== undefined) {
    const visibility = asVisibility(payload.visibility);

    updatePayload.visibility = visibility;
    legacyUpdatePayload.visibility = legacyVisibility(visibility);
  }

  if (payload.status !== undefined) {
    const status = asStatus(payload.status);

    updatePayload.status = status;
    legacyUpdatePayload.status = status;

    if (status === "answered" && payload.answeredAt === undefined && payload.answered_at === undefined) {
      const answeredAt = new Date().toISOString();

      updatePayload.answered_at = answeredAt;
      legacyUpdatePayload.answered_at = answeredAt;
    }

    if (status !== "answered" && payload.answeredAt === undefined && payload.answered_at === undefined) {
      updatePayload.answered_at = null;
      updatePayload.answer_testimony = null;
      legacyUpdatePayload.answered_at = null;
    }
  }

  if (payload.answeredAt !== undefined || payload.answered_at !== undefined) {
    const answeredAt = asNullableString(payload.answeredAt ?? payload.answered_at);

    updatePayload.answered_at = answeredAt;
    legacyUpdatePayload.answered_at = answeredAt;
  }

  if (payload.answerTestimony !== undefined || payload.answer_testimony !== undefined) {
    updatePayload.answer_testimony = asNullableString(payload.answerTestimony ?? payload.answer_testimony);
  }

  if (payload.personTags !== undefined || payload.person_tags !== undefined) {
    updatePayload.person_tags = asStringArray(payload.personTags ?? payload.person_tags);
  }

  if (payload.linkedPersonIds !== undefined || payload.linked_person_ids !== undefined) {
    updatePayload.linked_person_ids = asUuidArray(payload.linkedPersonIds ?? payload.linked_person_ids);
  }

  if (payload.fieldPersonId !== undefined || payload.field_person_id !== undefined) {
    const fieldPersonId = asString(payload.fieldPersonId) || asString(payload.field_person_id);
    const personValidation = await validateFieldPerson(supabase, workspaceId, fieldPersonId);

    if ("response" in personValidation) {
      return personValidation.response;
    }

    updatePayload.field_person_id = fieldPersonId || null;
    legacyUpdatePayload.field_person_id = fieldPersonId || null;
  }

  if (payload.createdByPersonId !== undefined || payload.created_by_person_id !== undefined) {
    const createdByPersonId = asString(payload.createdByPersonId) || asString(payload.created_by_person_id);
    const personValidation = await validateFieldPerson(supabase, workspaceId, createdByPersonId);

    if ("response" in personValidation) {
      return personValidation.response;
    }

    updatePayload.created_by_person_id = createdByPersonId || null;
  }

  if (payload.groupId !== undefined || payload.group_id !== undefined) {
    const groupId = asString(payload.groupId) || asString(payload.group_id);
    const groupValidation = await validateGroup(supabase, workspaceId, groupId);

    if ("response" in groupValidation) {
      return groupValidation.response;
    }

    updatePayload.group_id = groupId || null;
    updatePayload.source = groupId ? "dos_group" : "dos";
  }

  if (payload.gatheringId !== undefined || payload.gathering_id !== undefined) {
    const gatheringId = asString(payload.gatheringId) || asString(payload.gathering_id);
    const groupId = typeof updatePayload.group_id === "string"
      ? updatePayload.group_id
      : asString(payload.groupId) || asString(payload.group_id);
    const gatheringValidation = await validateGathering(supabase, workspaceId, gatheringId, groupId);

    if ("response" in gatheringValidation) {
      return gatheringValidation.response;
    }

    updatePayload.gathering_id = gatheringId || null;
  }

  if (payload.meetingId !== undefined || payload.meeting_id !== undefined) {
    const meetingId = asString(payload.meetingId) || asString(payload.meeting_id);
    const meetingValidation = await validateMeeting(supabase, workspaceId, meetingId);

    if ("response" in meetingValidation) {
      return meetingValidation.response;
    }

    updatePayload.meeting_id = meetingId || null;
    updatePayload.source = meetingId ? "dos_table" : updatePayload.source ?? "dos";
  }

  if (payload.organizationId !== undefined || payload.organization_id !== undefined) {
    const organizationId = asString(payload.organizationId) || asString(payload.organization_id);

    if (organizationId && !isUuid(organizationId)) {
      return NextResponse.json({ error: "Selected organization is invalid." }, { status: 400 });
    }

    updatePayload.organization_id = organizationId || null;
  }

  if (payload.priority !== undefined) {
    const priority = asPriority(payload.priority);

    updatePayload.priority = priority;
    updatePayload.urgency = priority === "urgent" ? "urgent" : priority === "high" ? "important" : "normal";
    legacyUpdatePayload.urgency = updatePayload.urgency;
  }

  if (payload.followUpAt !== undefined || payload.follow_up_at !== undefined) {
    updatePayload.follow_up_at = asNullableString(payload.followUpAt ?? payload.follow_up_at);
  }

  if (!Object.keys(updatePayload).length) {
    return NextResponse.json({ error: "No prayer request changes provided." }, { status: 400 });
  }

  const updateResult = await supabase
    .from("prayer_requests")
    .update(updatePayload)
    .eq("id", id)
    .or(prayerRequestScopeFilter(workspaceId))
    .select(requestSelect)
    .single();
  const { data, error } = updateResult.error && isMissingPrayerBridgeColumn(updateResult.error)
    ? await supabase
      .from("prayer_requests")
      .update(legacyUpdatePayload)
      .eq("id", id)
      .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId},related_household_id.eq.${workspaceId}`)
      .select(legacyRequestSelect)
      .single()
    : updateResult;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ prayerRequest: mapPrayerRequest(data as PrayerRequestRow, workspaceId) });
}

export async function DELETE(request: Request) {
  const authResult = await authorizeWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  let payload: PrayerRequestPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const workspaceId = await resolveDosAppWorkspaceId(asString(payload.workspaceId) || asString(payload.workspace_id));
  const id = asString(payload.id);

  if (!workspaceId || !isUuid(id)) {
    return NextResponse.json({ error: "Workspace and prayer request ID are required." }, { status: 400 });
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(authResult.authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  const { data, error } = await createSupabaseAdminClient()
    .from("prayer_requests")
    .delete()
    .eq("id", id)
    .or(prayerRequestScopeFilter(workspaceId))
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Prayer request not found." }, { status: 404 });
  }

  return NextResponse.json({ deletedPrayerRequestId: data.id });
}
