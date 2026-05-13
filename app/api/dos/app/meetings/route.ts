import { NextResponse } from "next/server";
import { canWriteDosActivity, getDosAuthorization } from "@/src/lib/dos/auth";
import {
  buildMeetingRecommendations,
  isUsamKitchenTableGospelWorkspace,
  normalizeConversationFlowKey,
  normalizeKitchenTableResponses,
  type DosConversationFlowKey,
  type DosKitchenTableResponses,
} from "@/src/lib/dos/meeting-engine";
import { dosAppMeetingTypes, isMissingWorkspaceScopeColumn, resolveDosAppWorkspace, type DosAppMeetingType } from "@/src/lib/dos/missionary-app";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type MeetingPayload = {
  conversationFlowKey?: unknown;
  conversationResponses?: unknown;
  fieldPersonIds?: unknown;
  id?: unknown;
  notes?: unknown;
  tableDate?: unknown;
  tableType?: unknown;
  workspaceId?: unknown;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : [];
}

function asDateString(value: unknown) {
  const nextValue = asString(value);

  return /^\d{4}-\d{2}-\d{2}$/.test(nextValue) ? nextValue : new Date().toISOString().slice(0, 10);
}

function asMeetingType(value: unknown): DosAppMeetingType {
  const nextValue = asString(value);

  return dosAppMeetingTypes.includes(nextValue as DosAppMeetingType) ? nextValue as DosAppMeetingType : "kitchen_table";
}

async function readPayload(request: Request) {
  try {
    return await request.json() as MeetingPayload;
  } catch {
    return null;
  }
}

function meetingEngineData(payload: MeetingPayload, allowKitchenTableGospel: boolean): {
  conversationFlowKey: DosConversationFlowKey;
  conversationResponses: DosKitchenTableResponses;
} {
  const requestedFlow = normalizeConversationFlowKey(payload.conversationFlowKey, allowKitchenTableGospel);
  const conversationResponses = requestedFlow === "kitchen_table_gospel"
    ? normalizeKitchenTableResponses(payload.conversationResponses)
    : {};

  return {
    conversationFlowKey: requestedFlow,
    conversationResponses,
  };
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

export async function POST(request: Request) {
  const authResult = await authorizeWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  const payload = await readPayload(request);

  if (!payload) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const workspace = await resolveDosAppWorkspace(asString(payload.workspaceId));

  if (!workspace) {
    return NextResponse.json({ error: "Missionary workspace not found." }, { status: 404 });
  }

  const workspaceId = workspace.id;
  const allowKitchenTableGospel = isUsamKitchenTableGospelWorkspace({ publicProfileHref: `/missionaries/${workspace.slug}`, slug: workspace.slug });
  const { conversationFlowKey, conversationResponses } = meetingEngineData(payload, allowKitchenTableGospel);

  if (payload.conversationFlowKey === "kitchen_table_gospel" && !allowKitchenTableGospel) {
    return NextResponse.json({ error: "Kitchen Table Gospel is not available for this workspace." }, { status: 403 });
  }

  const fieldPersonIds = asStringArray(payload.fieldPersonIds);
  const supabase = createSupabaseAdminClient();
  const scopedPeopleResult = fieldPersonIds.length
    ? await supabase
      .from("missionary_field_people")
      .select("id, name")
      .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
      .in("id", fieldPersonIds)
    : { data: [], error: null };
  const { data: peopleData, error: peopleError } = scopedPeopleResult.error && isMissingWorkspaceScopeColumn(scopedPeopleResult.error)
    ? await supabase
      .from("missionary_field_people")
      .select("id, name")
      .eq("household_id", workspaceId)
      .in("id", fieldPersonIds)
    : scopedPeopleResult;
  // TODO: Remove the household_id-only fallback after all Supabase environments
  // have the Command Center workspace_id migration applied.

  if (peopleError) {
    return NextResponse.json({ error: peopleError.message }, { status: 500 });
  }

  const validPeople = (peopleData ?? []) as Array<{ id: string; name: string }>;
  const validPersonIds = validPeople.map((person) => person.id);
  const participantNames = validPeople.map((person) => person.name);
  const recommendedResources = buildMeetingRecommendations(conversationFlowKey, conversationResponses);
  const meetingInsert: Record<string, unknown> = {
    conversation_flow_key: conversationFlowKey,
    conversation_responses: conversationResponses,
    field_person_ids: validPersonIds,
    household_id: workspaceId,
    notes: asString(payload.notes) || null,
    participant_names: participantNames,
    recommended_resources: recommendedResources,
    source: "field",
    table_date: asDateString(payload.tableDate),
    table_type: asMeetingType(payload.tableType),
    workspace_id: workspaceId,
  };
  const insertResult = await supabase
    .from("missionary_tables")
    .insert(meetingInsert)
    .select("id")
    .single();
  // TODO: Remove the household_id-only insert fallback after all Supabase
  // environments have the Command Center workspace_id migration applied.
  const { workspace_id: _workspaceId, ...legacyMeetingInsert } = meetingInsert;
  const { data, error } = insertResult.error && isMissingWorkspaceScopeColumn(insertResult.error)
    ? await supabase
      .from("missionary_tables")
      .insert(legacyMeetingInsert)
      .select("id")
      .single()
    : insertResult;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (validPersonIds.length) {
    await supabase
      .from("missionary_field_people")
      .update({ last_activity_at: new Date().toISOString() })
      .in("id", validPersonIds);
  }

  return NextResponse.json({ id: data.id, ok: true });
}

export async function PATCH(request: Request) {
  const authResult = await authorizeWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  const payload = await readPayload(request);

  if (!payload) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const workspace = await resolveDosAppWorkspace(asString(payload.workspaceId));
  const id = asString(payload.id);

  if (!workspace || !isUuid(id)) {
    return NextResponse.json({ error: "Missionary meeting not found." }, { status: 404 });
  }

  const workspaceId = workspace.id;
  const allowKitchenTableGospel = isUsamKitchenTableGospelWorkspace({ publicProfileHref: `/missionaries/${workspace.slug}`, slug: workspace.slug });

  if (payload.conversationFlowKey === "kitchen_table_gospel" && !allowKitchenTableGospel) {
    return NextResponse.json({ error: "Kitchen Table Gospel is not available for this workspace." }, { status: 403 });
  }

  const { conversationFlowKey, conversationResponses } = meetingEngineData(payload, allowKitchenTableGospel);
  const fieldPersonIds = asStringArray(payload.fieldPersonIds);
  const supabase = createSupabaseAdminClient();
  const scopedPeopleResult = fieldPersonIds.length
    ? await supabase
      .from("missionary_field_people")
      .select("id, name")
      .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
      .in("id", fieldPersonIds)
    : { data: [], error: null };
  // TODO: Remove the household_id-only fallback after all Supabase environments
  // have the Command Center workspace_id migration applied.
  const { data: peopleData, error: peopleError } = scopedPeopleResult.error && isMissingWorkspaceScopeColumn(scopedPeopleResult.error)
    ? await supabase
      .from("missionary_field_people")
      .select("id, name")
      .eq("household_id", workspaceId)
      .in("id", fieldPersonIds)
    : scopedPeopleResult;

  if (peopleError) {
    return NextResponse.json({ error: peopleError.message }, { status: 500 });
  }

  const validPeople = (peopleData ?? []) as Array<{ id: string; name: string }>;
  const validPersonIds = validPeople.map((person) => person.id);
  const participantNames = validPeople.map((person) => person.name);
  const meetingUpdate: Record<string, unknown> = {
    conversation_flow_key: conversationFlowKey,
    conversation_responses: conversationResponses,
    field_person_ids: validPersonIds,
    notes: asString(payload.notes) || null,
    participant_names: participantNames,
    recommended_resources: buildMeetingRecommendations(conversationFlowKey, conversationResponses),
    table_date: asDateString(payload.tableDate),
    table_type: asMeetingType(payload.tableType),
  };
  const updateResult = await supabase
    .from("missionary_tables")
    .update(meetingUpdate)
    .eq("id", id)
    .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
    .select("id")
    .single();
  // TODO: Remove the household_id-only fallback after all Supabase environments
  // have the Command Center workspace_id migration applied.
  const { data, error } = updateResult.error && isMissingWorkspaceScopeColumn(updateResult.error)
    ? await supabase
      .from("missionary_tables")
      .update(meetingUpdate)
      .eq("id", id)
      .eq("household_id", workspaceId)
      .select("id")
      .single()
    : updateResult;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (validPersonIds.length) {
    await supabase
      .from("missionary_field_people")
      .update({ last_activity_at: new Date().toISOString() })
      .in("id", validPersonIds);
  }

  return NextResponse.json({ id: data.id, ok: true });
}
