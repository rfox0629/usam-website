import type { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;
type SupabaseQueryError = { message?: string } | null | undefined;

type HouseholdMemberRelationship = "child" | "spouse";

type ExistingPersonRow = {
  children_names?: string | null;
  church?: string | null;
  created_by?: string | null;
  discipleship_stage?: string | null;
  engagement_level?: string | null;
  email?: string | null;
  field_visibility?: string | null;
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

type HouseholdTeamMemberRow = {
  display_name: string | null;
  id: string;
  relationship_to_workspace?: string | null;
  role_title?: string | null;
  status?: string | null;
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

type DosViewerPersonInput = {
  email?: string | null;
  phone?: string | null;
  userId?: string | null;
  workspaceDisplayName?: string | null;
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

type ViewerProfileRow = {
  email: string | null;
  first_name: string | null;
  last_name: string | null;
};

const relationshipModelKeys = ["relationship_context", "role_in_my_life", "discipleship_stage"];
const householdMvpKeys = ["spouse_name", "children_names", "household_notes"];
const fieldVisibilityKeys = ["field_visibility"];

function cleanText(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function nameKey(value: string | null | undefined) {
  return cleanText(value).toLowerCase();
}

function normalizeEmail(value: string | null | undefined) {
  const email = cleanText(value).toLowerCase();

  return email ? email : null;
}

function normalizePhone(value: string | null | undefined) {
  const digits = cleanText(value).replace(/\D/g, "");

  return digits.length >= 7 ? digits : null;
}

function isMissingColumnError(error: SupabaseQueryError, columns: string[]) {
  const message = error?.message?.toLowerCase() ?? "";

  return columns.some((column) => message.includes(column));
}

function isMissingTableError(error: SupabaseQueryError, tableName: string) {
  const message = error?.message?.toLowerCase() ?? "";

  return message.includes(tableName)
    && (message.includes("does not exist") || message.includes("relation") || message.includes("schema cache"));
}

function omitKeys(record: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(Object.entries(record).filter(([key]) => !keys.includes(key)));
}

function personRecordCandidates(record: Record<string, unknown>) {
  const noRelationshipModel = omitKeys(record, relationshipModelKeys);
  const noHouseholdMvp = omitKeys(record, householdMvpKeys);
  const noFieldVisibility = omitKeys(record, fieldVisibilityKeys);
  const noWorkspaceScope = omitKeys(record, ["workspace_id"]);

  return [
    record,
    noFieldVisibility,
    noRelationshipModel,
    omitKeys(noRelationshipModel, fieldVisibilityKeys),
    noHouseholdMvp,
    omitKeys(noHouseholdMvp, fieldVisibilityKeys),
    omitKeys(noRelationshipModel, householdMvpKeys),
    omitKeys(omitKeys(noRelationshipModel, householdMvpKeys), fieldVisibilityKeys),
    noWorkspaceScope,
    omitKeys(noWorkspaceScope, fieldVisibilityKeys),
    omitKeys(noWorkspaceScope, relationshipModelKeys),
    omitKeys(omitKeys(noWorkspaceScope, relationshipModelKeys), fieldVisibilityKeys),
    omitKeys(noWorkspaceScope, householdMvpKeys),
    omitKeys(omitKeys(noWorkspaceScope, householdMvpKeys), fieldVisibilityKeys),
    omitKeys(omitKeys(noWorkspaceScope, relationshipModelKeys), householdMvpKeys),
    omitKeys(omitKeys(omitKeys(noWorkspaceScope, relationshipModelKeys), householdMvpKeys), fieldVisibilityKeys),
  ];
}

function isRecoverablePersonSchemaError(error: SupabaseQueryError) {
  return isMissingColumnError(error, ["workspace_id", ...relationshipModelKeys, ...householdMvpKeys, ...fieldVisibilityKeys]);
}

function parseChildrenNames(value: string | null | undefined) {
  return (value ?? "")
    .split(/[,;\n]+/)
    .map(cleanText)
    .filter(Boolean);
}

function isWorkspaceHouseholdPersonName(value: string | null | undefined) {
  const key = nameKey(value);

  return Boolean(key && key !== "god" && key !== "new team member" && key !== "unnamed team member");
}

function isActiveHouseholdTeamMember(row: HouseholdTeamMemberRow) {
  const status = cleanText(row.status).toLowerCase();

  return isWorkspaceHouseholdPersonName(row.display_name)
    && !["archived", "declined", "inactive"].includes(status);
}

function householdTeamMemberNote(row: HouseholdTeamMemberRow) {
  const relationship = cleanText(row.relationship_to_workspace);
  const roleTitle = cleanText(row.role_title);
  const details = [
    relationship ? `Relationship: ${relationship}.` : "",
    roleTitle ? `Role: ${roleTitle}.` : "",
  ].filter(Boolean);

  return ["Household roster member in this workspace.", ...details].join("\n");
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
  const select = "id, name, phone, email, church, status, relationship_type, relationship_context, role_in_my_life, discipleship_stage, engagement_level, field_visibility, spouse_name, children_names, household_notes, household_id, workspace_id, created_by";
  const fallbackSelect = "id, name, phone, email, church, status, relationship_type, engagement_level, field_visibility, spouse_name, children_names, household_notes, household_id, workspace_id, created_by";
  const legacyFallbackSelect = "id, name, phone, email, church, status, relationship_type, engagement_level, spouse_name, children_names, household_notes, household_id, workspace_id, created_by";
  const scopedResult = await supabase
    .from("missionary_field_people")
    .select(select)
    .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`);

  if (!scopedResult.error) {
    return scopedResult;
  }

  if (isMissingColumnError(scopedResult.error, [...relationshipModelKeys, ...fieldVisibilityKeys])) {
    const fallbackResult = await supabase
      .from("missionary_field_people")
      .select(fallbackSelect)
      .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`);

    if (!fallbackResult.error) {
      return fallbackResult;
    }

    if (isMissingColumnError(fallbackResult.error, fieldVisibilityKeys)) {
      const legacyFallbackResult = await supabase
        .from("missionary_field_people")
        .select(legacyFallbackSelect)
        .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`);

      if (!legacyFallbackResult.error) {
        return legacyFallbackResult;
      }
    }
  }

  if (isMissingColumnError(scopedResult.error, ["workspace_id"])) {
    return supabase
      .from("missionary_field_people")
      .select(legacyFallbackSelect)
      .eq("household_id", workspaceId);
  }

  return scopedResult;
}

async function loadHouseholdTeamMembers(supabase: SupabaseAdminClient, workspaceId: string) {
  const fullSelect = "id, display_name, role_title, relationship_to_workspace, status";
  const compatibleSelect = "id, display_name, role_title, status";
  const result = await supabase
    .from("missionary_team_members")
    .select(fullSelect)
    .eq("household_id", workspaceId);

  if (!result.error) {
    return result;
  }

  if (isMissingColumnError(result.error, ["relationship_to_workspace"])) {
    const compatibleResult = await supabase
      .from("missionary_team_members")
      .select(compatibleSelect)
      .eq("household_id", workspaceId);

    if (!compatibleResult.error) {
      return compatibleResult;
    }
  }

  if (isMissingTableError(result.error, "missionary_team_members")) {
    return { data: [], error: null };
  }

  return result;
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
    field_visibility: "secondary",
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

function buildHouseholdTeamMemberInsert(workspaceId: string, member: HouseholdTeamMemberRow, createdBy?: string | null) {
  return {
    church: null,
    created_by: createdBy ?? null,
    discipleship_stage: "not_started",
    engagement_level: "0",
    field_visibility: "secondary",
    household_id: workspaceId,
    household_notes: householdTeamMemberNote(member),
    name: cleanText(member.display_name),
    phone: null,
    relationship_context: "family",
    relationship_type: "new",
    role_in_my_life: "not_active",
    source: "field",
    status: "new",
    workspace_id: workspaceId,
  };
}

function viewerEmailName(value: string | null | undefined) {
  const email = normalizeEmail(value);
  const localPart = email?.split("@")[0] ?? "";
  const words = localPart
    .split(/[._+-]+/)
    .map(cleanText)
    .filter(Boolean);

  return words.length
    ? words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")
    : "";
}

function viewerDisplayName(input: DosViewerPersonInput, profile: ViewerProfileRow | null) {
  const profileName = cleanText([profile?.first_name, profile?.last_name].filter(Boolean).join(" "));

  return profileName
    || viewerEmailName(profile?.email ?? input.email)
    || cleanText(input.workspaceDisplayName)
    || "DOS User";
}

function buildDosViewerPersonInsert(input: DosViewerPersonInput, profile: ViewerProfileRow | null) {
  return {
    church: null,
    created_by: input.userId ?? null,
    discipleship_stage: "not_started",
    email: normalizeEmail(profile?.email ?? input.email),
    engagement_level: "0",
    field_visibility: "secondary",
    household_id: input.workspaceId,
    household_notes: "Default DOS user person for workspace ownership, group leadership, attendance, and prayer context.",
    name: viewerDisplayName(input, profile),
    phone: cleanText(input.phone) || null,
    relationship_context: "family",
    relationship_type: "new",
    role_in_my_life: "not_active",
    source: "field",
    status: "active",
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

  if (!cleanText(existing.field_visibility)) {
    update.field_visibility = "secondary";
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

function buildExistingHouseholdTeamMemberUpdate(existing: ExistingPersonRow, member: HouseholdTeamMemberRow) {
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
    update.engagement_level = "0";
  }

  if (!cleanText(existing.field_visibility)) {
    update.field_visibility = "secondary";
  }

  if (!cleanText(existing.household_notes)) {
    update.household_notes = householdTeamMemberNote(member);
  }

  if (["archived", "deleted"].includes(cleanText(existing.status).toLowerCase())) {
    update.status = "active";
  }

  return update;
}

function buildExistingDosViewerPersonUpdate(existing: ExistingPersonRow, input: DosViewerPersonInput, profile: ViewerProfileRow | null) {
  const update: Record<string, unknown> = {};
  const email = normalizeEmail(profile?.email ?? input.email);
  const phone = cleanText(input.phone);

  if (!cleanText(existing.created_by) && input.userId) {
    update.created_by = input.userId;
  }

  if (!normalizeEmail(existing.email) && email) {
    update.email = email;
  }

  if (!cleanText(existing.phone) && phone) {
    update.phone = phone;
  }

  if (!cleanText(existing.workspace_id)) {
    update.workspace_id = input.workspaceId;
  }

  if (!cleanText(existing.household_id)) {
    update.household_id = input.workspaceId;
  }

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
    update.engagement_level = "0";
  }

  if (!cleanText(existing.field_visibility)) {
    update.field_visibility = "secondary";
  }

  if (!cleanText(existing.household_notes)) {
    update.household_notes = "Default DOS user person for workspace ownership, group leadership, attendance, and prayer context.";
  }

  if (["archived", "deleted"].includes(cleanText(existing.status).toLowerCase())) {
    update.status = "active";
  }

  return update;
}

async function loadViewerProfile(supabase: SupabaseAdminClient, input: DosViewerPersonInput) {
  const queries = [
    input.userId
      ? supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("user_id", input.userId)
        .limit(1)
        .maybeSingle()
      : null,
    input.email
      ? supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .ilike("email", input.email)
        .limit(1)
        .maybeSingle()
      : null,
  ].filter((query): query is NonNullable<typeof query> => Boolean(query));

  for (const query of queries) {
    const result = await query;

    if (result.error) {
      const message = result.error.message.toLowerCase();

      if (message.includes("profiles") && (message.includes("does not exist") || message.includes("schema cache"))) {
        return { data: null, error: null };
      }

      return { data: null, error: result.error };
    }

    if (result.data) {
      return { data: result.data as ViewerProfileRow, error: null };
    }
  }

  return { data: null, error: null };
}

function findExistingDosViewerPerson(rows: ExistingPersonRow[], input: DosViewerPersonInput, profile: ViewerProfileRow | null) {
  const userId = cleanText(input.userId);
  const email = normalizeEmail(profile?.email ?? input.email);
  const phone = normalizePhone(input.phone);
  const displayName = nameKey(viewerDisplayName(input, profile));
  const activeRows = rows.filter((row) => !["archived", "deleted"].includes(cleanText(row.status).toLowerCase()));

  if (userId) {
    const match = activeRows.find((row) => cleanText(row.created_by) === userId);

    if (match) {
      return match;
    }
  }

  if (email) {
    const match = activeRows.find((row) => normalizeEmail(row.email) === email);

    if (match) {
      return match;
    }
  }

  if (phone) {
    const match = activeRows.find((row) => normalizePhone(row.phone) === phone);

    if (match) {
      return match;
    }
  }

  if (displayName) {
    const matches = activeRows.filter((row) => nameKey(row.name) === displayName);

    if (matches.length === 1) {
      return matches[0];
    }
  }

  return null;
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

export async function ensureDosViewerPerson(
  supabase: SupabaseAdminClient,
  input: DosViewerPersonInput,
): Promise<HouseholdMemberSyncResult> {
  if (!cleanText(input.userId) && !normalizeEmail(input.email) && !normalizePhone(input.phone)) {
    return { createdCount: 0, error: null, updatedCount: 0 };
  }

  const [existingResult, profileResult] = await Promise.all([
    loadExistingPeople(supabase, input.workspaceId),
    loadViewerProfile(supabase, input),
  ]);

  if (existingResult.error) {
    return { createdCount: 0, error: existingResult.error, updatedCount: 0 };
  }

  if (profileResult.error) {
    return { createdCount: 0, error: profileResult.error, updatedCount: 0 };
  }

  const existingPerson = findExistingDosViewerPerson((existingResult.data ?? []) as ExistingPersonRow[], input, profileResult.data);

  if (existingPerson) {
    const update = buildExistingDosViewerPersonUpdate(existingPerson, input, profileResult.data);

    if (!Object.keys(update).length) {
      return { createdCount: 0, error: null, updatedCount: 0 };
    }

    const updateResult = await updateHouseholdMemberPerson(supabase, input.workspaceId, existingPerson.id, update);

    if (updateResult.error) {
      return { createdCount: 0, error: updateResult.error, updatedCount: 0 };
    }

    return { createdCount: 0, error: null, updatedCount: 1 };
  }

  const insertRecord = buildDosViewerPersonInsert(input, profileResult.data);
  const insertResult = await insertHouseholdMemberPerson(supabase, insertRecord);

  if (insertResult.error || !insertResult.data?.id) {
    return { createdCount: 0, error: insertResult.error, updatedCount: 0 };
  }

  return { createdCount: 1, error: null, updatedCount: 0 };
}

export async function syncHouseholdTeamMembersAsPeople(
  supabase: SupabaseAdminClient,
  input: {
    createdBy?: string | null;
    workspaceId: string;
  },
): Promise<HouseholdMemberSyncResult> {
  const [existingResult, teamMemberResult] = await Promise.all([
    loadExistingPeople(supabase, input.workspaceId),
    loadHouseholdTeamMembers(supabase, input.workspaceId),
  ]);

  if (existingResult.error) {
    return { createdCount: 0, error: existingResult.error, updatedCount: 0 };
  }

  if (teamMemberResult.error) {
    return { createdCount: 0, error: teamMemberResult.error, updatedCount: 0 };
  }

  const existingByName = new Map<string, ExistingPersonRow>();

  ((existingResult.data ?? []) as ExistingPersonRow[]).forEach((person) => {
    const key = nameKey(person.name);

    if (key && !existingByName.has(key)) {
      existingByName.set(key, person);
    }
  });

  const teamMembersByName = new Map<string, HouseholdTeamMemberRow>();

  ((teamMemberResult.data ?? []) as HouseholdTeamMemberRow[])
    .filter(isActiveHouseholdTeamMember)
    .forEach((member) => {
      const key = nameKey(member.display_name);

      if (key && !teamMembersByName.has(key)) {
        teamMembersByName.set(key, member);
      }
    });

  let createdCount = 0;
  let updatedCount = 0;

  for (const [key, member] of Array.from(teamMembersByName.entries())) {
    const existingPerson = existingByName.get(key);

    if (existingPerson) {
      const update = buildExistingHouseholdTeamMemberUpdate(existingPerson, member);

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

    const insertRecord = buildHouseholdTeamMemberInsert(input.workspaceId, member, input.createdBy);
    const insertResult = await insertHouseholdMemberPerson(supabase, insertRecord);

    if (insertResult.error || !insertResult.data?.id) {
      return { createdCount, error: insertResult.error, updatedCount };
    }

    createdCount += 1;
    existingByName.set(key, {
      ...insertRecord,
      id: insertResult.data.id,
      name: cleanText(member.display_name),
    } as ExistingPersonRow);
  }

  return { createdCount, error: null, updatedCount };
}
