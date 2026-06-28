import type { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;
type SupabaseQueryError = { message?: string } | null | undefined;

type HouseholdMemberRelationship = "child" | "spouse";

type ExistingPersonRow = {
  children_names?: string | null;
  church?: string | null;
  discipleship_stage?: string | null;
  engagement_level?: string | null;
  household_id?: string | null;
  household_notes?: string | null;
  id: string;
  name: string | null;
  phone?: string | null;
  relationship_context?: string | null;
  relationship_type?: string | null;
  role_in_my_life?: string | null;
  spouse_name?: string | null;
  status?: string | null;
  workspace_id?: string | null;
};

type HouseholdMemberPersonInput = {
  anchorName: string;
  anchorPersonId: string;
  childrenNames?: string | null;
  church?: string | null;
  createdBy?: string | null;
  engagementLevel?: string | null;
  householdNotes?: string | null;
  spouseName?: string | null;
  workspaceId: string;
};

type HouseholdMemberCandidate = {
  name: string;
  relationship: HouseholdMemberRelationship;
};

type HouseholdMemberSyncResult = {
  createdCount: number;
  error: SupabaseQueryError;
  updatedCount: number;
};

const relationshipModelKeys = ["relationship_context", "role_in_my_life", "discipleship_stage"];
const householdMvpKeys = ["spouse_name", "children_names", "household_notes"];

function cleanText(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function nameKey(value: string | null | undefined) {
  return cleanText(value).toLowerCase();
}

function isMissingColumnError(error: SupabaseQueryError, columns: string[]) {
  const message = error?.message?.toLowerCase() ?? "";

  return columns.some((column) => message.includes(column));
}

function omitKeys(record: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(Object.entries(record).filter(([key]) => !keys.includes(key)));
}

function personRecordCandidates(record: Record<string, unknown>) {
  const noRelationshipModel = omitKeys(record, relationshipModelKeys);
  const noHouseholdMvp = omitKeys(record, householdMvpKeys);
  const noWorkspaceScope = omitKeys(record, ["workspace_id"]);

  return [
    record,
    noRelationshipModel,
    noHouseholdMvp,
    omitKeys(noRelationshipModel, householdMvpKeys),
    noWorkspaceScope,
    omitKeys(noWorkspaceScope, relationshipModelKeys),
    omitKeys(noWorkspaceScope, householdMvpKeys),
    omitKeys(omitKeys(noWorkspaceScope, relationshipModelKeys), householdMvpKeys),
  ];
}

function isRecoverablePersonSchemaError(error: SupabaseQueryError) {
  return isMissingColumnError(error, ["workspace_id", ...relationshipModelKeys, ...householdMvpKeys]);
}

function parseChildrenNames(value: string | null | undefined) {
  return (value ?? "")
    .split(/[,;\n]+/)
    .map(cleanText)
    .filter(Boolean);
}

export function householdMemberPersonCandidates(input: {
  anchorName: string;
  childrenNames?: string | null;
  spouseName?: string | null;
}) {
  const anchorKey = nameKey(input.anchorName);
  const candidates: HouseholdMemberCandidate[] = [
    cleanText(input.spouseName) ? { name: cleanText(input.spouseName), relationship: "spouse" } : null,
    ...parseChildrenNames(input.childrenNames).map((name) => ({ name, relationship: "child" as const })),
  ].filter((candidate): candidate is HouseholdMemberCandidate => Boolean(candidate?.name));
  const seen = new Set<string>();

  return candidates.filter((candidate) => {
    const key = nameKey(candidate.name);

    if (!key || key === anchorKey || seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
}

async function loadExistingPeople(supabase: SupabaseAdminClient, workspaceId: string) {
  const select = "id, name, phone, church, status, relationship_type, relationship_context, role_in_my_life, discipleship_stage, engagement_level, spouse_name, children_names, household_notes, household_id, workspace_id";
  const fallbackSelect = "id, name, phone, church, status, relationship_type, engagement_level, spouse_name, children_names, household_notes, household_id, workspace_id";
  const scopedResult = await supabase
    .from("missionary_field_people")
    .select(select)
    .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`);

  if (!scopedResult.error) {
    return scopedResult;
  }

  if (isMissingColumnError(scopedResult.error, relationshipModelKeys)) {
    const fallbackResult = await supabase
      .from("missionary_field_people")
      .select(fallbackSelect)
      .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`);

    if (!fallbackResult.error) {
      return fallbackResult;
    }
  }

  if (isMissingColumnError(scopedResult.error, ["workspace_id"])) {
    return supabase
      .from("missionary_field_people")
      .select(fallbackSelect)
      .eq("household_id", workspaceId);
  }

  return scopedResult;
}

function householdNoteFor(input: HouseholdMemberPersonInput, candidate: HouseholdMemberCandidate) {
  const relationshipLabel = candidate.relationship === "spouse" ? "Spouse" : "Child";
  const relationshipNote = `${relationshipLabel} in ${input.anchorName}'s household.`;
  const existingNotes = cleanText(input.householdNotes);

  return [relationshipNote, existingNotes].filter(Boolean).join("\n");
}

function buildHouseholdMemberInsert(input: HouseholdMemberPersonInput, candidate: HouseholdMemberCandidate) {
  return {
    children_names: candidate.relationship === "spouse" ? cleanText(input.childrenNames) || null : null,
    church: cleanText(input.church) || null,
    created_by: input.createdBy ?? null,
    discipleship_stage: "not_started",
    engagement_level: cleanText(input.engagementLevel) || "0",
    household_id: input.workspaceId,
    household_notes: householdNoteFor(input, candidate),
    name: candidate.name,
    phone: null,
    relationship_context: "family",
    relationship_type: "new",
    role_in_my_life: "not_active",
    source: "field",
    spouse_name: candidate.relationship === "spouse" ? input.anchorName : null,
    status: "new",
    workspace_id: input.workspaceId,
  };
}

function buildExistingPersonUpdate(existing: ExistingPersonRow, input: HouseholdMemberPersonInput, candidate: HouseholdMemberCandidate) {
  const update: Record<string, unknown> = {};

  if (!cleanText(existing.relationship_context)) {
    update.relationship_context = "family";
  }

  if (!cleanText(existing.relationship_type)) {
    update.relationship_type = "new";
  }

  if (!cleanText(existing.role_in_my_life)) {
    update.role_in_my_life = "not_active";
  }

  if (!cleanText(existing.discipleship_stage)) {
    update.discipleship_stage = "not_started";
  }

  if (!cleanText(existing.engagement_level)) {
    update.engagement_level = cleanText(input.engagementLevel) || "0";
  }

  if (!cleanText(existing.household_notes)) {
    update.household_notes = householdNoteFor(input, candidate);
  }

  if (candidate.relationship === "spouse" && !cleanText(existing.spouse_name)) {
    update.spouse_name = input.anchorName;
  }

  if (candidate.relationship === "spouse" && cleanText(input.childrenNames) && !cleanText(existing.children_names)) {
    update.children_names = cleanText(input.childrenNames);
  }

  if (!cleanText(existing.church) && cleanText(input.church)) {
    update.church = cleanText(input.church);
  }

  return update;
}

async function insertHouseholdMemberPerson(
  supabase: SupabaseAdminClient,
  record: Record<string, unknown>,
) {
  let insertResult: { data: { id: string } | null; error: SupabaseQueryError } | null = null;

  for (const candidate of personRecordCandidates(record)) {
    insertResult = await supabase
      .from("missionary_field_people")
      .insert(candidate)
      .select("id")
      .single();

    if (!insertResult.error || !isRecoverablePersonSchemaError(insertResult.error)) {
      break;
    }
  }

  return insertResult ?? { data: null, error: { message: "Unable to create household member person." } };
}

async function updateHouseholdMemberPerson(
  supabase: SupabaseAdminClient,
  workspaceId: string,
  personId: string,
  record: Record<string, unknown>,
) {
  let updateResult: { data: { id: string } | null; error: SupabaseQueryError } | null = null;

  for (const candidate of personRecordCandidates(record)) {
    updateResult = await supabase
      .from("missionary_field_people")
      .update(candidate)
      .eq("id", personId)
      .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
      .select("id")
      .single();

    if (!updateResult.error || !isRecoverablePersonSchemaError(updateResult.error)) {
      break;
    }
  }

  if (updateResult?.error && isMissingColumnError(updateResult.error, ["workspace_id"])) {
    for (const candidate of personRecordCandidates(record)) {
      updateResult = await supabase
        .from("missionary_field_people")
        .update(candidate)
        .eq("id", personId)
        .eq("household_id", workspaceId)
        .select("id")
        .single();

      if (!updateResult.error || !isRecoverablePersonSchemaError(updateResult.error)) {
        break;
      }
    }
  }

  return updateResult ?? { data: null, error: { message: "Unable to update household member person." } };
}

export async function syncHouseholdMembersAsPeople(
  supabase: SupabaseAdminClient,
  input: HouseholdMemberPersonInput,
): Promise<HouseholdMemberSyncResult> {
  const candidates = householdMemberPersonCandidates(input);

  if (!candidates.length) {
    return { createdCount: 0, error: null, updatedCount: 0 };
  }

  const existingResult = await loadExistingPeople(supabase, input.workspaceId);

  if (existingResult.error) {
    return { createdCount: 0, error: existingResult.error, updatedCount: 0 };
  }

  const existingByName = new Map<string, ExistingPersonRow>();

  ((existingResult.data ?? []) as ExistingPersonRow[]).forEach((person) => {
    const key = nameKey(person.name);

    if (key && !existingByName.has(key)) {
      existingByName.set(key, person);
    }
  });

  let createdCount = 0;
  let updatedCount = 0;

  for (const candidate of candidates) {
    const key = nameKey(candidate.name);
    const existingPerson = existingByName.get(key);

    if (existingPerson?.id === input.anchorPersonId) {
      continue;
    }

    if (existingPerson) {
      const update = buildExistingPersonUpdate(existingPerson, input, candidate);

      if (Object.keys(update).length) {
        const updateResult = await updateHouseholdMemberPerson(supabase, input.workspaceId, existingPerson.id, update);

        if (updateResult.error) {
          return { createdCount, error: updateResult.error, updatedCount };
        }

        updatedCount += 1;
        existingByName.set(key, { ...existingPerson, ...update });
      }

      continue;
    }

    const insertRecord = buildHouseholdMemberInsert(input, candidate);
    const insertResult = await insertHouseholdMemberPerson(supabase, insertRecord);

    if (insertResult.error || !insertResult.data?.id) {
      return { createdCount, error: insertResult.error, updatedCount };
    }

    createdCount += 1;
    existingByName.set(key, {
      ...insertRecord,
      id: insertResult.data.id,
      name: candidate.name,
    } as ExistingPersonRow);
  }

  return { createdCount, error: null, updatedCount };
}
