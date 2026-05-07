import { NextResponse } from "next/server";
import { canEditAdminContent, getAdminAuthorization } from "@/src/lib/admin-auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

const personSelect = "id, workspace_id, household_id, name, phone, email, church, notes, status, relationship_type, engagement_level, source, created_by, last_activity_at, updated_at, created_at";

type CsvPersonRow = {
  church?: unknown;
  email?: unknown;
  name?: unknown;
  phone?: unknown;
  sourceRowNumber?: unknown;
};

type ImportPayload = {
  householdId?: unknown;
  rows?: unknown;
  workspaceId?: unknown;
};

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

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function fieldPeopleImportErrorMessage(error: { code?: string; message?: string }) {
  const message = error.message ?? "Unable to import CSV.";
  const lowerMessage = message.toLowerCase();

  if (error.code === "PGRST205" || (lowerMessage.includes("missionary_field_people") && lowerMessage.includes("schema cache"))) {
    return "People table is missing. Apply the missionary_field_people migration.";
  }

  if (lowerMessage.includes("workspace_id") && lowerMessage.includes("schema cache")) {
    return "People workspace scope is missing. Apply the Command Center workspace_id migration.";
  }

  return message;
}

async function authorizeImport() {
  const authorization = await getAdminAuthorization();

  if (authorization.status === "unauthenticated") {
    return {
      response: NextResponse.json({ error: "Authentication required." }, { status: 401 }),
    };
  }

  if (authorization.status === "configuration_error") {
    return {
      response: NextResponse.json({ error: authorization.message }, { status: 500 }),
    };
  }

  if (authorization.status === "unauthorized" || !canEditAdminContent(authorization)) {
    return {
      response: NextResponse.json({ error: "Editor access required." }, { status: 403 }),
    };
  }

  if (!isSupabaseAdminConfigured()) {
    return {
      response: NextResponse.json({ error: "Supabase admin environment variables are not configured." }, { status: 500 }),
    };
  }

  return { authorization };
}

async function readPayload(request: Request) {
  try {
    return await request.json() as ImportPayload;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const authResult = await authorizeImport();

  if ("response" in authResult) {
    return authResult.response;
  }

  const payload = await readPayload(request);
  const workspaceId = asString(payload?.workspaceId) || asString(payload?.householdId);
  const rows = Array.isArray(payload?.rows) ? payload.rows as CsvPersonRow[] : [];

  if (!isUuid(workspaceId)) {
    return NextResponse.json({ error: "A valid missionary workspace is required." }, { status: 400 });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "No CSV rows were provided." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: existingPeople, error: existingError } = await supabase
    .from("missionary_field_people")
    .select("phone")
    .eq("workspace_id", workspaceId);

  if (existingError) {
    return NextResponse.json({ error: fieldPeopleImportErrorMessage(existingError) }, { status: 500 });
  }

  const existingPhones = new Set((existingPeople ?? []).map((person) => normalizePhone(person.phone ?? "")).filter(Boolean));
  const rowsToInsert: Array<{
    church: string | null;
    created_by: string;
    email: string | null;
    household_id: string;
    name: string;
    phone: string;
    source: "command_center";
    status: "new";
    workspace_id: string;
  }> = [];
  let skippedCount = 0;

  rows.forEach((row) => {
    const name = asString(row.name);
    const phone = asString(row.phone);
    const phoneKey = normalizePhone(phone);

    if (!name || !phone || !phoneKey || existingPhones.has(phoneKey)) {
      skippedCount += 1;
      return;
    }

    existingPhones.add(phoneKey);
    rowsToInsert.push({
      church: asNullableString(row.church),
      created_by: authResult.authorization.userId,
      email: asNullableString(row.email),
      household_id: workspaceId,
      name,
      phone,
      source: "command_center",
      status: "new",
      workspace_id: workspaceId,
    });
  });

  if (rowsToInsert.length === 0) {
    return NextResponse.json({
      importedCount: 0,
      people: [],
      skippedCount,
    });
  }

  const { data, error } = await supabase
    .from("missionary_field_people")
    .insert(rowsToInsert)
    .select(personSelect);

  if (error) {
    return NextResponse.json({ error: fieldPeopleImportErrorMessage(error) }, { status: 500 });
  }

  return NextResponse.json({
    importedCount: data?.length ?? 0,
    people: data ?? [],
    skippedCount,
  });
}
