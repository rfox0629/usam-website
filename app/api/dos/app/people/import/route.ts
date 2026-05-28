import { NextResponse } from "next/server";
import { requireDosWorkspaceRouteAccess } from "@/src/lib/dos/api-auth";
import { canWriteDosActivity, getDosAuthorization } from "@/src/lib/dos/auth";
import { isMissingWorkspaceScopeColumn, resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type PeopleImportPayload = {
  rows?: unknown;
  workspaceId?: unknown;
};

type PeopleImportRow = {
  church?: unknown;
  city?: unknown;
  email?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  name?: unknown;
  notes?: unknown;
  phone?: unknown;
  sourceRowNumber?: unknown;
  state?: unknown;
};

type ExistingPersonRow = {
  email: string | null;
  id: string;
  name: string | null;
  phone: string | null;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableString(value: unknown) {
  const nextValue = asString(value);

  return nextValue ? nextValue : null;
}

function normalizedEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizedName(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ").toLowerCase() ?? "";
}

function normalizedPhone(value: string | null | undefined) {
  return value?.replace(/\D/g, "") ?? "";
}

function duplicateKeys(person: Pick<ExistingPersonRow, "email" | "name" | "phone">) {
  return [
    normalizedPhone(person.phone) ? `phone:${normalizedPhone(person.phone)}` : "",
    normalizedEmail(person.email) ? `email:${normalizedEmail(person.email)}` : "",
    normalizedName(person.name) ? `name:${normalizedName(person.name)}` : "",
  ].filter(Boolean);
}

function parseImportRows(rows: unknown): PeopleImportRow[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.filter((row): row is PeopleImportRow => Boolean(row && typeof row === "object"));
}

function rowName(row: PeopleImportRow) {
  const firstName = asString(row.firstName);
  const lastName = asString(row.lastName);
  const fallbackName = asString(row.name);

  return [firstName, lastName].filter(Boolean).join(" ").trim() || fallbackName;
}

function rowNotes(row: PeopleImportRow) {
  const notes = asString(row.notes);
  const city = asString(row.city);
  const state = asString(row.state);
  const location = [city, state].filter(Boolean).join(", ");
  const detailLines = [
    notes,
    location ? `Location: ${location}` : "",
  ].filter(Boolean);

  return detailLines.length ? detailLines.join("\n") : null;
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

async function readPayload(request: Request) {
  try {
    return await request.json() as PeopleImportPayload;
  } catch {
    return null;
  }
}

async function loadExistingPeople(workspaceId: string) {
  const supabase = createSupabaseAdminClient();
  const scopedResult = await supabase
    .from("missionary_field_people")
    .select("id, name, phone, email")
    .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`);

  // TODO: Remove the household_id-only fallback after all Supabase environments
  // have the Command Center workspace_id migration applied.
  if (scopedResult.error && isMissingWorkspaceScopeColumn(scopedResult.error)) {
    return supabase
      .from("missionary_field_people")
      .select("id, name, phone, email")
      .eq("household_id", workspaceId);
  }

  return scopedResult;
}

function personRecordCandidates(record: Record<string, unknown>) {
  const { workspace_id: _workspaceId, ...legacyRecord } = record;

  // TODO: Remove the household_id-compatible candidate after all local and
  // remote environments are migrated to missionary_field_people.workspace_id.
  return [record, legacyRecord];
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

  if (!workspaceId) {
    return NextResponse.json({ error: "Missionary workspace not found." }, { status: 404 });
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(authResult.authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  const rows = parseImportRows(payload.rows).slice(0, 500);

  if (!rows.length) {
    return NextResponse.json({ error: "No CSV rows were provided." }, { status: 400 });
  }

  const existingResult = await loadExistingPeople(workspaceId);

  if (existingResult.error) {
    return NextResponse.json({ error: existingResult.error.message }, { status: 500 });
  }

  const duplicateKeySet = new Set<string>();

  ((existingResult.data ?? []) as ExistingPersonRow[]).forEach((person) => {
    duplicateKeys(person).forEach((key) => duplicateKeySet.add(key));
  });

  const records: Record<string, unknown>[] = [];
  let duplicateCount = 0;
  let invalidCount = 0;

  rows.forEach((row) => {
    const name = rowName(row);
    const phone = asString(row.phone);
    const email = asNullableString(row.email);

    if (!name) {
      invalidCount += 1;
      return;
    }

    const keys = duplicateKeys({ email, name, phone });

    if (keys.some((key) => duplicateKeySet.has(key))) {
      duplicateCount += 1;
      return;
    }

    keys.forEach((key) => duplicateKeySet.add(key));
    records.push({
      church: asNullableString(row.church),
      created_by: authResult.authorization.userId,
      email,
      household_id: workspaceId,
      name,
      notes: rowNotes(row),
      phone,
      source: "field",
      status: "new",
      workspace_id: workspaceId,
    });
  });

  if (!records.length) {
    return NextResponse.json({
      duplicateCount,
      importedCount: 0,
      invalidCount,
      skippedCount: duplicateCount + invalidCount,
    });
  }

  const supabase = createSupabaseAdminClient();
  let importResult: { data: Array<{ id: string }> | null; error: { message: string } | null } | null = null;

  for (const candidateRecords of personRecordCandidates(records[0]).map((_, index) => (
    records.map((record) => personRecordCandidates(record)[index])
  ))) {
    importResult = await supabase
      .from("missionary_field_people")
      .insert(candidateRecords)
      .select("id");

    if (!importResult.error || !isMissingWorkspaceScopeColumn(importResult.error)) {
      break;
    }
  }

  const { data, error } = importResult ?? { data: null, error: { message: "Unable to import contacts." } };

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const importedCount = data?.length ?? 0;

  return NextResponse.json({
    duplicateCount,
    importedCount,
    invalidCount,
    skippedCount: duplicateCount + invalidCount,
  });
}
