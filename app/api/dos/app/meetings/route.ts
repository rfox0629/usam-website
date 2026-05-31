import { NextResponse } from "next/server";
import { requireDosWorkspaceRouteAccess } from "@/src/lib/dos/api-auth";
import { canWriteDosActivity, getDosAuthorization } from "@/src/lib/dos/auth";
import { recalculateCircleScores } from "@/src/lib/dos/circle-scoring";
import { inferFruitEventsFromEngagement } from "@/src/lib/dos/fruit-intelligence";
import {
  buildMeetingRecommendations,
  getConversationFlowDefinition,
  isUsamKitchenTableGospelWorkspace,
  normalizeConversationResponses,
  normalizeConversationFlowKey,
  type DosConversationFlowKey,
  type DosConversationResponses,
} from "@/src/lib/dos/meeting-engine";
import { dosAppMeetingTypes, isMissingWorkspaceScopeColumn, resolveDosAppWorkspace, type DosAppMeetingType } from "@/src/lib/dos/missionary-app";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type MeetingPayload = {
  conversationFlowKey?: unknown;
  conversationResponses?: unknown;
  fieldPersonIds?: unknown;
  id?: unknown;
  notes?: unknown;
  notesOnly?: unknown;
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

function meetingEngineData(payload: MeetingPayload, allowGatedConversationFlows: boolean): {
  conversationFlowKey: DosConversationFlowKey;
  conversationResponses: DosConversationResponses;
} {
  const requestedFlow = normalizeConversationFlowKey(payload.conversationFlowKey, allowGatedConversationFlows);
  const conversationResponses = normalizeConversationResponses(requestedFlow, payload.conversationResponses);

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

function unavailableConversationFlowResponse(value: unknown, allowGatedConversationFlows: boolean) {
  if (typeof value !== "string" || value === "none") {
    return null;
  }

  const requestedFlow = getConversationFlowDefinition(value as DosConversationFlowKey);

  if (normalizeConversationFlowKey(value, allowGatedConversationFlows) !== "none") {
    return null;
  }

  const flowName = requestedFlow?.title ?? "Conversation flow";

  return NextResponse.json({ error: `${flowName} is not available for this workspace.` }, { status: 403 });
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
  const workspaceAccess = await requireDosWorkspaceRouteAccess(authResult.authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  const allowGatedConversationFlows = isUsamKitchenTableGospelWorkspace({ publicProfileHref: `/missionaries/${workspace.slug}`, slug: workspace.slug });

  const unavailableFlowResponse = unavailableConversationFlowResponse(payload.conversationFlowKey, allowGatedConversationFlows);

  if (unavailableFlowResponse) {
    return unavailableFlowResponse;
  }

  const { conversationFlowKey, conversationResponses } = meetingEngineData(payload, allowGatedConversationFlows);

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

  await recalculateCircleScores(workspaceId).catch((scoreError) => {
    console.warn("[DOS circles] Unable to recalculate after meeting create", scoreError);
  });

  await Promise.all(validPersonIds.map((personId) => inferFruitEventsFromEngagement({
    leaderId: authResult.authorization.userId,
    personId,
    workspaceId,
  }, supabase))).catch((fruitError) => {
    console.warn("[Fruit Intelligence] Unable to infer engagement fruit after meeting create", fruitError);
  });

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
  const workspaceAccess = await requireDosWorkspaceRouteAccess(authResult.authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  const supabase = createSupabaseAdminClient();

  if (payload.notesOnly === true) {
    const notesOnlyUpdate = {
      notes: asString(payload.notes) || null,
    };
    const notesOnlyResult = await supabase
      .from("missionary_tables")
      .update(notesOnlyUpdate)
      .eq("id", id)
      .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
      .select("id")
      .single();
    // TODO: Remove the household_id-only fallback after all Supabase environments
    // have the Command Center workspace_id migration applied.
    const { data, error } = notesOnlyResult.error && isMissingWorkspaceScopeColumn(notesOnlyResult.error)
      ? await supabase
        .from("missionary_tables")
        .update(notesOnlyUpdate)
        .eq("id", id)
        .eq("household_id", workspaceId)
        .select("id")
        .single()
      : notesOnlyResult;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id, ok: true });
  }

  const allowGatedConversationFlows = isUsamKitchenTableGospelWorkspace({ publicProfileHref: `/missionaries/${workspace.slug}`, slug: workspace.slug });
  const unavailableFlowResponse = unavailableConversationFlowResponse(payload.conversationFlowKey, allowGatedConversationFlows);

  if (unavailableFlowResponse) {
    return unavailableFlowResponse;
  }

  const { conversationFlowKey, conversationResponses } = meetingEngineData(payload, allowGatedConversationFlows);
  const fieldPersonIds = asStringArray(payload.fieldPersonIds);
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

  await recalculateCircleScores(workspaceId).catch((scoreError) => {
    console.warn("[DOS circles] Unable to recalculate after meeting update", scoreError);
  });

  await Promise.all(validPersonIds.map((personId) => inferFruitEventsFromEngagement({
    leaderId: authResult.authorization.userId,
    personId,
    workspaceId,
  }, supabase))).catch((fruitError) => {
    console.warn("[Fruit Intelligence] Unable to infer engagement fruit after meeting update", fruitError);
  });

  return NextResponse.json({ id: data.id, ok: true });
}

export async function DELETE(request: Request) {
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
  const workspaceAccess = await requireDosWorkspaceRouteAccess(authResult.authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  const supabase = createSupabaseAdminClient();
  const scopedResult = await supabase
    .from("missionary_tables")
    .delete()
    .eq("id", id)
    .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
    .select("id")
    .single();
  const { data, error } = scopedResult.error && isMissingWorkspaceScopeColumn(scopedResult.error)
    ? await supabase
      .from("missionary_tables")
      .delete()
      .eq("id", id)
      .eq("household_id", workspaceId)
      .select("id")
      .single()
    : scopedResult;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Unable to delete meeting." }, { status: 500 });
  }

  await recalculateCircleScores(workspaceId).catch((scoreError) => {
    console.warn("[DOS circles] Unable to recalculate after meeting delete", scoreError);
  });

  return NextResponse.json({ id: data.id, deleted: true, ok: true });
}
