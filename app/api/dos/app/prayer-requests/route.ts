import { NextResponse } from "next/server";
import { requireDosWorkspaceRouteAccess } from "@/src/lib/dos/api-auth";
import { canWriteDosActivity, getDosAuthorization } from "@/src/lib/dos/auth";
import { resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

const categories = ["Family", "Ministry", "Support", "Health", "Travel", "Other"] as const;
const statuses = ["answered", "archived", "covered", "open"] as const;
const visibilities = ["private", "team", "public"] as const;
const requestSelect = "id, workspace_id, household_id, related_household_id, related_missionary_profile_id, field_person_id, title, request, category, urgency, status, visibility, source, person_tags, linked_person_ids, answered_at, answer_testimony, created_at, updated_at";
const legacyRequestSelect = "id, workspace_id, household_id, related_household_id, field_person_id, title, request, category, urgency, status, visibility, source, answered_at, created_at, updated_at";

type PrayerRequestPayload = {
  answerTestimony?: unknown;
  answer_testimony?: unknown;
  answeredAt?: unknown;
  answered_at?: unknown;
  category?: unknown;
  fieldPersonId?: unknown;
  field_person_id?: unknown;
  id?: unknown;
  linkedPersonIds?: unknown;
  linked_person_ids?: unknown;
  personTags?: unknown;
  person_tags?: unknown;
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
  created_at: string;
  field_person_id?: string | null;
  id: string;
  linked_person_ids?: string[] | null;
  person_tags?: string[] | null;
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

  return visibilities.includes(nextValue as typeof visibilities[number]) ? nextValue : "private";
}

function asStatus(value: unknown) {
  const nextValue = asString(value);

  return statuses.includes(nextValue as typeof statuses[number]) ? nextValue : "open";
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

  return ["answer_testimony", "linked_person_ids", "person_tags", "schema cache"].some((columnName) => message.includes(columnName));
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

function mapPrayerRequest(row: PrayerRequestRow, workspaceId: string) {
  const status = row.status === "answered" || row.status === "archived" || row.status === "covered"
    ? row.status
    : "open";
  const urgency = row.urgency === "important" || row.urgency === "urgent" ? row.urgency : "normal";
  const visibility = row.visibility === "public" || row.visibility === "team" ? row.visibility : "private";

  return {
    answerTestimony: row.answer_testimony ?? null,
    answeredAt: row.answered_at ?? null,
    category: row.category ?? "Other",
    createdAt: row.created_at,
    fieldPersonId: row.field_person_id ?? null,
    id: row.id,
    linkedPersonIds: Array.isArray(row.linked_person_ids) ? row.linked_person_ids.filter(Boolean) : [],
    personTags: Array.isArray(row.person_tags) ? row.person_tags.map((tag) => tag.trim()).filter(Boolean) : [],
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
  const linkedPersonIds = asUuidArray(payload.linkedPersonIds ?? payload.linked_person_ids);
  const personValidation = await validateFieldPerson(supabase, workspaceId, fieldPersonId);

  if ("response" in personValidation) {
    return personValidation.response;
  }

  const insertPayload = {
    category: asCategory(payload.category),
    confidentiality_level: "missionary_couple",
    created_by: authResult.authorization.userId ?? null,
    description: requestText,
    field_person_id: fieldPersonId || null,
    household_id: workspaceId,
    linked_person_ids: linkedPersonIds,
    person_tags: asStringArray(payload.personTags ?? payload.person_tags),
    related_household_id: workspaceId,
    related_missionary_profile_id: workspaceId,
    request: requestText,
    source: "dos",
    status: "open",
    title,
    urgency: "normal",
    visibility: asVisibility(payload.visibility),
    workspace_id: workspaceId,
  };
  const insertResult = await supabase
    .from("prayer_requests")
    .insert(insertPayload)
    .select(requestSelect)
    .single();
  const { data, error } = insertResult.error && isMissingPrayerBridgeColumn(insertResult.error)
    ? await supabase
      .from("prayer_requests")
      .insert({
        category: insertPayload.category,
        confidentiality_level: insertPayload.confidentiality_level,
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
        visibility: insertPayload.visibility,
        workspace_id: insertPayload.workspace_id,
      })
      .select(legacyRequestSelect)
      .single()
    : insertResult;

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
    legacyUpdatePayload.visibility = visibility;
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
