import { NextResponse } from "next/server";
import { requireDosWorkspaceRouteAccess } from "@/src/lib/dos/api-auth";
import { canWriteDosActivity, getDosAuthorization } from "@/src/lib/dos/auth";
import { recalculateCircleScores } from "@/src/lib/dos/circle-scoring";
import { inferFruitEventsFromEngagement } from "@/src/lib/dos/fruit-intelligence";
import { isMissingWorkspaceScopeColumn, resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";
import { joinPersonNotesValue } from "@/src/lib/dos/person-notes";
import { relationshipModelFromFields, relationshipModelSummary, relationshipScoreFromEngagementLevel, relationshipScoreLabel } from "@/src/lib/dos/relationship-model";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type PersonPayload = {
  birthday?: unknown;
  childrenNames?: unknown;
  children_names?: unknown;
  church?: unknown;
  city?: unknown;
  email?: unknown;
  engagementScore?: unknown;
  homeAddress?: unknown;
  home_address?: unknown;
  householdNotes?: unknown;
  household_notes?: unknown;
  id?: unknown;
  name?: unknown;
  notes?: unknown;
  occupation?: unknown;
  phone?: unknown;
  discipleshipStage?: unknown;
  relationshipContext?: unknown;
  relationshipType?: unknown;
  roleInMyLife?: unknown;
  spouseName?: unknown;
  spouse_name?: unknown;
  state?: unknown;
  workspaceId?: unknown;
  zip?: unknown;
};

const householdMvpKeys = ["spouse_name", "children_names", "household_notes"];

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableString(value: unknown) {
  const nextValue = asString(value);

  return nextValue ? nextValue : null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isMissingRelationshipModelColumn(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";

  return ["relationship_context", "role_in_my_life", "discipleship_stage"].some((column) => message.includes(column));
}

function isMissingHouseholdMvpColumn(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";

  return householdMvpKeys.some((column) => message.includes(column));
}

function isRecoverablePersonSchemaError(error: { message?: string } | null | undefined) {
  return isMissingWorkspaceScopeColumn(error) || isMissingRelationshipModelColumn(error) || isMissingHouseholdMvpColumn(error);
}

function omitKeys(record: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(Object.entries(record).filter(([key]) => !keys.includes(key)));
}

function personRecordCandidates(record: Record<string, unknown>) {
  const relationshipKeys = ["relationship_context", "role_in_my_life", "discipleship_stage"];
  const noRelationshipModel = omitKeys(record, relationshipKeys);
  const noHouseholdMvp = omitKeys(record, householdMvpKeys);
  const noWorkspaceScope = omitKeys(record, ["workspace_id"]);

  return [
    record,
    noHouseholdMvp,
    noRelationshipModel,
    omitKeys(noRelationshipModel, householdMvpKeys),
    noWorkspaceScope,
    omitKeys(noWorkspaceScope, householdMvpKeys),
    omitKeys(noWorkspaceScope, relationshipKeys),
    omitKeys(omitKeys(noWorkspaceScope, relationshipKeys), householdMvpKeys),
  ];
}

function relationshipFieldsFromPayload(payload: PersonPayload, includeDefaultScore = false) {
  const model = relationshipModelFromFields({
    discipleshipStage: asString(payload.discipleshipStage),
    relationshipContext: asString(payload.relationshipContext),
    relationshipType: asString(payload.relationshipType),
    roleInMyLife: asString(payload.roleInMyLife),
  });
  const fields: Record<string, string> = {
    discipleship_stage: model.discipleshipStage,
    relationship_context: model.relationshipContext,
    relationship_type: relationshipModelSummary(model),
    role_in_my_life: model.roleInMyLife,
  };

  if (includeDefaultScore || payload.engagementScore !== undefined) {
    fields.engagement_level = relationshipScoreLabel(relationshipScoreFromEngagementLevel(payload.engagementScore));
  }

  return fields;
}

function buildPersonNotes(payload: PersonPayload) {
  const notes = asString(payload.notes);
  const homeAddress = asString(payload.homeAddress) || asString(payload.home_address);
  const city = asString(payload.city);
  const state = asString(payload.state);
  const zip = asString(payload.zip);
  const occupation = asString(payload.occupation);
  const birthday = asString(payload.birthday);
  const cityStateZip = [city, [state, zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const address = [homeAddress, cityStateZip].filter(Boolean).join(", ");
  const detailLines = [
    address ? `Home address: ${address}` : "",
    occupation ? `Occupation: ${occupation}` : "",
    birthday ? `Birthday: ${birthday}` : "",
  ].filter(Boolean);

  // TODO: Move address, occupation, and birthday into structured
  // missionary_field_people columns after the DOS MVP profile fields migrate.
  return joinPersonNotesValue(notes, detailLines.join("\n"));
}

async function readPayload(request: Request) {
  try {
    return await request.json() as PersonPayload;
  } catch {
    return null;
  }
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

  const workspaceId = await resolveDosAppWorkspaceId(asString(payload.workspaceId));
  const name = asString(payload.name);
  const phone = asString(payload.phone);

  if (!workspaceId || !name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(authResult.authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  const supabase = createSupabaseAdminClient();
  const personInsert: Record<string, unknown> = {
    children_names: asNullableString(payload.childrenNames) || asNullableString(payload.children_names),
    church: asNullableString(payload.church),
    created_by: authResult.authorization.userId,
    email: asNullableString(payload.email),
    household_id: workspaceId,
    household_notes: asNullableString(payload.householdNotes) || asNullableString(payload.household_notes),
    name,
    notes: buildPersonNotes(payload),
    phone,
    ...relationshipFieldsFromPayload(payload, true),
    source: "field",
    spouse_name: asNullableString(payload.spouseName) || asNullableString(payload.spouse_name),
    status: "new",
    workspace_id: workspaceId,
  };
  let insertResult: { data: { id: unknown } | null; error: { message: string } | null } | null = null;

  for (const candidate of personRecordCandidates(personInsert)) {
    insertResult = await supabase
      .from("missionary_field_people")
      .insert(candidate)
      .select("id")
      .single();

    if (!insertResult.error || !isRecoverablePersonSchemaError(insertResult.error)) {
      break;
    }
  }

  const { data, error } = insertResult ?? { data: null, error: { message: "Unable to create person." } };

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Unable to create person." }, { status: 500 });
  }

  await inferFruitEventsFromEngagement({
    leaderId: authResult.authorization.userId,
    personId: String(data.id),
    workspaceId,
  }, supabase).catch((fruitError) => {
    console.warn("[Fruit Intelligence] Unable to infer engagement fruit after person create", fruitError);
  });

  await recalculateCircleScores(workspaceId).catch((scoreError) => {
    console.warn("[DOS circles] Unable to recalculate after person create", scoreError);
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

  const workspaceId = await resolveDosAppWorkspaceId(asString(payload.workspaceId));
  const id = asString(payload.id);

  const name = asString(payload.name);
  const phone = asString(payload.phone);

  if (!workspaceId || !isUuid(id) || !name || !phone) {
    return NextResponse.json({ error: "Name and phone are required." }, { status: 400 });
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(authResult.authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  const supabase = createSupabaseAdminClient();
  const personUpdate: Record<string, unknown> = {
    children_names: asNullableString(payload.childrenNames) || asNullableString(payload.children_names),
    church: asNullableString(payload.church),
    email: asNullableString(payload.email),
    household_notes: asNullableString(payload.householdNotes) || asNullableString(payload.household_notes),
    name,
    notes: buildPersonNotes(payload),
    phone,
    ...relationshipFieldsFromPayload(payload),
    spouse_name: asNullableString(payload.spouseName) || asNullableString(payload.spouse_name),
  };
  let updateResult: { data: { id: unknown } | null; error: { message: string } | null } | null = null;

  for (const candidate of personRecordCandidates(personUpdate)) {
    updateResult = await supabase
      .from("missionary_field_people")
      .update(candidate)
      .eq("id", id)
      .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
      .select("id")
      .single();

    if (!updateResult.error || !isRecoverablePersonSchemaError(updateResult.error)) {
      break;
    }
  }

  if (updateResult?.error && isMissingWorkspaceScopeColumn(updateResult.error)) {
    for (const candidate of personRecordCandidates(personUpdate)) {
      updateResult = await supabase
        .from("missionary_field_people")
        .update(candidate)
        .eq("id", id)
        .eq("household_id", workspaceId)
        .select("id")
        .single();

      if (!updateResult.error || !isRecoverablePersonSchemaError(updateResult.error)) {
        break;
      }
    }
  }

  const { data, error } = updateResult ?? { data: null, error: { message: "Unable to update person." } };

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Unable to update person." }, { status: 500 });
  }

  await inferFruitEventsFromEngagement({
    leaderId: authResult.authorization.userId,
    personId: String(data.id),
    workspaceId,
  }, supabase).catch((fruitError) => {
    console.warn("[Fruit Intelligence] Unable to infer engagement fruit after person update", fruitError);
  });

  await recalculateCircleScores(workspaceId).catch((scoreError) => {
    console.warn("[DOS circles] Unable to recalculate after person update", scoreError);
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

  const workspaceId = await resolveDosAppWorkspaceId(asString(payload.workspaceId));
  const id = asString(payload.id);

  if (!workspaceId || !isUuid(id)) {
    return NextResponse.json({ error: "Person not found." }, { status: 404 });
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(authResult.authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  const supabase = createSupabaseAdminClient();
  const archiveUpdate = {
    status: "archived",
    updated_at: new Date().toISOString(),
  };
  const scopedResult = await supabase
    .from("missionary_field_people")
    .update(archiveUpdate)
    .eq("id", id)
    .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
    .select("id")
    .single();
  const { data, error } = scopedResult.error && isMissingWorkspaceScopeColumn(scopedResult.error)
    ? await supabase
      .from("missionary_field_people")
      .update(archiveUpdate)
      .eq("id", id)
      .eq("household_id", workspaceId)
      .select("id")
      .single()
    : scopedResult;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Unable to delete person." }, { status: 500 });
  }

  await recalculateCircleScores(workspaceId).catch((scoreError) => {
    console.warn("[DOS circles] Unable to recalculate after person archive", scoreError);
  });

  return NextResponse.json({ id: data.id, archived: true, ok: true });
}
