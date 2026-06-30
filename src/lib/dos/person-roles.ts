import "server-only";

import type { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;
type SupabaseQueryError = { code?: string; message?: string } | null | undefined;

export type WorkspacePersonRole = "field_contact" | "household_member" | "mentor" | "prayer_partner" | "support_partner";
export type WorkspacePersonRoleStatus = "active" | "archived" | "declined" | "inactive" | "invited" | "pending";

type PersonMatchRow = {
  email?: string | null;
  field_visibility?: string | null;
  id: string;
  name?: string | null;
  phone?: string | null;
  status?: string | null;
  updated_at?: string | null;
};

export type ResolveWorkspacePersonForRoleInput = {
  createdBy?: string | null;
  email?: string | null;
  name?: string | null;
  phone?: string | null;
  role: WorkspacePersonRole;
  roleSource?: string | null;
  workspaceId: string;
};

export type ResolveWorkspacePersonForRoleResult = {
  created: boolean;
  matchMethod: "created" | "email" | "name" | "phone";
  personId: string;
};

export type UpsertWorkspacePersonRoleInput = {
  fieldPersonId: string;
  metadata?: Record<string, unknown>;
  role: WorkspacePersonRole;
  roleRecordId?: string | null;
  roleRecordTable?: string | null;
  source?: string | null;
  status: WorkspacePersonRoleStatus;
  workspaceId: string;
};

function cleanText(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function normalizeEmail(value: string | null | undefined) {
  const email = cleanText(value).toLowerCase();

  return email ? email : null;
}

function normalizeName(value: string | null | undefined) {
  const name = cleanText(value).toLowerCase();

  return name ? name : null;
}

function normalizePhone(value: string | null | undefined) {
  const digits = cleanText(value).replace(/\D/g, "");

  return digits.length >= 7 ? digits : null;
}

function isInactivePerson(row: PersonMatchRow) {
  return ["archived", "deleted"].includes((row.status ?? "").toLowerCase());
}

function isMissingSchemaError(error: SupabaseQueryError, names: string[]) {
  const message = error?.message?.toLowerCase() ?? "";

  return error?.code === "42P01"
    || error?.code === "42703"
    || error?.code === "PGRST205"
    || message.includes("schema cache")
    || names.some((name) => message.includes(name.toLowerCase()))
    || message.includes("does not exist");
}

function omitKeys(record: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(Object.entries(record).filter(([key]) => !keys.includes(key)));
}

function personRecordCandidates(record: Record<string, unknown>) {
  const relationshipKeys = ["relationship_context", "role_in_my_life", "discipleship_stage"];
  const fieldVisibilityKeys = ["field_visibility"];
  const workspaceKeys = ["workspace_id"];

  return [
    record,
    omitKeys(record, fieldVisibilityKeys),
    omitKeys(record, relationshipKeys),
    omitKeys(omitKeys(record, relationshipKeys), fieldVisibilityKeys),
    omitKeys(record, workspaceKeys),
    omitKeys(omitKeys(record, workspaceKeys), fieldVisibilityKeys),
    omitKeys(omitKeys(record, workspaceKeys), relationshipKeys),
    omitKeys(omitKeys(omitKeys(record, workspaceKeys), relationshipKeys), fieldVisibilityKeys),
  ];
}

function isRecoverablePersonInsertError(error: SupabaseQueryError) {
  return isMissingSchemaError(error, ["workspace_id", "field_visibility", "relationship_context", "role_in_my_life", "discipleship_stage"]);
}

async function loadWorkspacePeople(supabase: SupabaseAdminClient, workspaceId: string) {
  const select = "id, name, email, phone, status, field_visibility, updated_at";
  const fallbackSelect = "id, name, email, phone, status, updated_at";
  const scopedResult = await supabase
    .from("missionary_field_people")
    .select(select)
    .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
    .limit(1000);

  if (!scopedResult.error) {
    return scopedResult;
  }

  if (isMissingSchemaError(scopedResult.error, ["field_visibility"])) {
    const fallbackResult = await supabase
      .from("missionary_field_people")
      .select(fallbackSelect)
      .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
      .limit(1000);

    if (!fallbackResult.error) {
      return fallbackResult;
    }
  }

  if (isMissingSchemaError(scopedResult.error, ["workspace_id"])) {
    return supabase
      .from("missionary_field_people")
      .select(fallbackSelect)
      .eq("household_id", workspaceId)
      .limit(1000);
  }

  return scopedResult;
}

function findExistingPerson(rows: PersonMatchRow[], input: ResolveWorkspacePersonForRoleInput) {
  const activeRows = rows.filter((row) => !isInactivePerson(row));
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  const name = normalizeName(input.name);

  if (email) {
    const match = activeRows.find((row) => normalizeEmail(row.email) === email);

    if (match) {
      return { match, matchMethod: "email" as const };
    }
  }

  if (phone) {
    const match = activeRows.find((row) => normalizePhone(row.phone) === phone);

    if (match) {
      return { match, matchMethod: "phone" as const };
    }
  }

  if (!email && !phone && name) {
    const matches = activeRows.filter((row) => normalizeName(row.name) === name);

    if (matches.length === 1) {
      return { match: matches[0], matchMethod: "name" as const };
    }
  }

  return null;
}

function hiddenPrayerPersonNotes(role: WorkspacePersonRole) {
  return role === "prayer_partner"
    ? "Prayer-only contact. Hidden from Field list by default."
    : "Role-only contact. Hidden from Field list by default.";
}

async function createHiddenWorkspacePerson(
  supabase: SupabaseAdminClient,
  input: ResolveWorkspacePersonForRoleInput,
) {
  const displayName = cleanText(input.name) || normalizeEmail(input.email) || cleanText(input.phone) || "Prayer Partner";
  const insertRecord: Record<string, unknown> = {
    created_by: input.createdBy ?? null,
    discipleship_stage: "not_started",
    email: normalizeEmail(input.email),
    engagement_level: "0",
    field_visibility: "hidden",
    household_id: input.workspaceId,
    household_notes: hiddenPrayerPersonNotes(input.role),
    name: displayName,
    phone: cleanText(input.phone) || null,
    relationship_context: "community",
    relationship_type: "new",
    role_in_my_life: "not_active",
    source: "field",
    status: "new",
    workspace_id: input.workspaceId,
  };
  let insertResult: { data: { id: string } | null; error: SupabaseQueryError } | null = null;

  for (const candidate of personRecordCandidates(insertRecord)) {
    insertResult = await supabase
      .from("missionary_field_people")
      .insert(candidate)
      .select("id")
      .single();

    if (!insertResult.error || !isRecoverablePersonInsertError(insertResult.error)) {
      break;
    }
  }

  if (insertResult?.error || !insertResult?.data?.id) {
    throw new Error(insertResult?.error?.message ?? "Unable to create linked person.");
  }

  return insertResult.data.id;
}

export async function resolveOrCreateWorkspacePersonForRole(
  supabase: SupabaseAdminClient,
  input: ResolveWorkspacePersonForRoleInput,
): Promise<ResolveWorkspacePersonForRoleResult> {
  const peopleResult = await loadWorkspacePeople(supabase, input.workspaceId);

  if (peopleResult.error) {
    throw new Error(peopleResult.error.message);
  }

  const matchResult = findExistingPerson((peopleResult.data ?? []) as PersonMatchRow[], input);

  if (matchResult) {
    return {
      created: false,
      matchMethod: matchResult.matchMethod,
      personId: matchResult.match.id,
    };
  }

  const personId = await createHiddenWorkspacePerson(supabase, input);

  return {
    created: true,
    matchMethod: "created",
    personId,
  };
}

export async function upsertWorkspacePersonRole(
  supabase: SupabaseAdminClient,
  input: UpsertWorkspacePersonRoleInput,
) {
  const roleRecord = {
    field_person_id: input.fieldPersonId,
    metadata: input.metadata ?? {},
    role: input.role,
    role_record_id: input.roleRecordId ?? null,
    role_record_table: input.roleRecordTable ?? null,
    source: input.source ?? "system",
    status: input.status,
    workspace_id: input.workspaceId,
  };

  if (input.roleRecordTable && input.roleRecordId) {
    const existingResult = await supabase
      .from("person_roles")
      .select("id")
      .eq("role_record_table", input.roleRecordTable)
      .eq("role_record_id", input.roleRecordId)
      .limit(1)
      .maybeSingle();

    if (existingResult.error) {
      return { error: existingResult.error };
    }

    if (existingResult.data?.id) {
      return supabase
        .from("person_roles")
        .update(roleRecord)
        .eq("id", existingResult.data.id);
    }
  }

  const insertResult = await supabase
    .from("person_roles")
    .insert(roleRecord);

  if (
    insertResult.error
    && isMissingSchemaError(insertResult.error, ["person_roles", "role_record_table", "role_record_id"])
  ) {
    return { error: insertResult.error };
  }

  return insertResult;
}
