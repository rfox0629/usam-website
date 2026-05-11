import { NextResponse } from "next/server";
import { canWriteDosActivity, getDosAuthorization } from "@/src/lib/dos/auth";
import { dosAppMeetingTypes, isMissingWorkspaceScopeColumn, resolveDosAppWorkspaceId, type DosAppMeetingType } from "@/src/lib/dos/missionary-app";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type MeetingPayload = {
  fieldPersonIds?: unknown;
  notes?: unknown;
  tableDate?: unknown;
  tableType?: unknown;
  workspaceId?: unknown;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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

  let payload: MeetingPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const workspaceId = await resolveDosAppWorkspaceId(asString(payload.workspaceId));

  if (!workspaceId) {
    return NextResponse.json({ error: "Missionary workspace not found." }, { status: 404 });
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

  if (peopleError) {
    return NextResponse.json({ error: peopleError.message }, { status: 500 });
  }

  const validPeople = (peopleData ?? []) as Array<{ id: string; name: string }>;
  const validPersonIds = validPeople.map((person) => person.id);
  const participantNames = validPeople.map((person) => person.name);
  const meetingInsert: Record<string, unknown> = {
    field_person_ids: validPersonIds,
    household_id: workspaceId,
    notes: asString(payload.notes) || null,
    participant_names: participantNames,
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
