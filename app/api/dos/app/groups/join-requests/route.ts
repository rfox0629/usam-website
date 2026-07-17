import { NextResponse } from "next/server";
import { canWriteDosActivity, getDosAuthorization, type DosAuthorization } from "@/src/lib/dos/auth";
import { loadDosGroupRoleAccess } from "@/src/lib/dos/identity";
import { resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";
import { createGroupMemberAccessInvitation } from "@/src/lib/groups/member-access";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type JoinRequestPayload = {
  action?: unknown;
  createNewPerson?: unknown;
  groupId?: unknown;
  group_id?: unknown;
  personId?: unknown;
  person_id?: unknown;
  requestId?: unknown;
  request_id?: unknown;
  workspaceId?: unknown;
  workspace_id?: unknown;
};

type JoinRequestRow = {
  created_at: string;
  email: string;
  first_name: string;
  group_id: string | null;
  id: string;
  last_name: string;
  message: string | null;
  organization_id: string | null;
  phone: string | null;
  source_group_id: string | null;
  source_group_slug: string;
  source_path: string;
  source_type: string;
  status: string;
  submitted_at: string;
  updated_at: string | null;
  workspace_id: string | null;
};

type AuthorizedDos = Extract<DosAuthorization, { status: "authorized" }>;

type PersonRow = {
  email: string | null;
  id: string;
  name: string;
  phone: string | null;
};

type PersonMatch = PersonRow & {
  matchReasons: ("email" | "phone")[];
};

type MemberRow = {
  id: string;
  joined_at: string | null;
  notes: string | null;
  person_id: string;
  role: string | null;
  status: string | null;
};

const requestSelect = "id, workspace_id, organization_id, group_id, source_group_id, source_group_slug, source_type, source_path, first_name, last_name, email, phone, message, status, submitted_at, created_at, updated_at";

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

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string | null | undefined) {
  const digits = value?.replace(/\D/g, "") ?? "";

  return digits.length >= 7 ? digits : null;
}

function missingJoinRequestsTable(error: { code?: string; message?: string } | null | undefined) {
  if (!error) {
    return false;
  }

  const message = error.message ?? "";

  return error.code === "42P01"
    || error.code === "PGRST205"
    || (/dos_group_join_requests/i.test(message) && /does not exist|could not find/i.test(message));
}

function joinRequestName(row: JoinRequestRow) {
  return [row.first_name, row.last_name].map((part) => part.trim()).filter(Boolean).join(" ").trim();
}

function mapRequest(row: JoinRequestRow, possiblePersonMatches: PersonMatch[] = []) {
  return {
    createdAt: row.created_at,
    email: row.email,
    firstName: row.first_name,
    groupId: row.group_id,
    id: row.id,
    lastName: row.last_name,
    message: row.message,
    organizationId: row.organization_id,
    phone: row.phone,
    possiblePersonMatches: possiblePersonMatches.map((person) => ({
      email: person.email,
      id: person.id,
      matchReasons: person.matchReasons,
      name: person.name,
      phone: person.phone ?? "",
    })),
    sourceGroupId: row.source_group_id,
    sourceGroupSlug: row.source_group_slug,
    sourcePath: row.source_path,
    sourceType: row.source_type,
    status: row.status,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
    workspaceId: row.workspace_id,
  };
}

function memberStatus(row: MemberRow): "active" | "invited" | "removed" {
  return row.status === "invited" || row.status === "removed" ? row.status : "active";
}

function memberRole(row: MemberRow): "leader" | "co_leader" | "helper" | "member" | "guest" {
  return row.role === "leader" || row.role === "co_leader" || row.role === "helper" || row.role === "guest" ? row.role : "member";
}

async function authorizeDosGroupsRequest(): Promise<{ authorization: AuthorizedDos } | { response: NextResponse }> {
  const authorization = await getDosAuthorization();

  if (authorization.status === "unauthenticated") {
    return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }

  if (authorization.status === "configuration_error") {
    return { response: NextResponse.json({ error: authorization.message }, { status: 500 }) };
  }

  if (authorization.status === "unauthorized" || !canWriteDosActivity(authorization)) {
    return { response: NextResponse.json({ error: "DOS groups access required." }, { status: 403 }) };
  }

  if (!isSupabaseAdminConfigured()) {
    return { response: NextResponse.json({ error: "Supabase admin environment variables are not configured." }, { status: 500 }) };
  }

  return { authorization: authorization as AuthorizedDos };
}

async function requireGroupRequestAccess(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  authorization: AuthorizedDos,
  workspaceId: string,
  groupId: string,
) {
  const groupAccess = await loadDosGroupRoleAccess(supabase, authorization, {
    allowedRoles: ["leader", "co_leader"],
    groupId,
    workspaceId,
  });

  if (groupAccess.status === "allowed") {
    return { group: groupAccess.group };
  }

  if (groupAccess.status === "not_found") {
    return { response: NextResponse.json({ error: groupAccess.message }, { status: 404 }) };
  }

  return {
    response: NextResponse.json(
      { error: groupAccess.message },
      { status: groupAccess.status === "forbidden" ? 403 : 500 },
    ),
  };
}

async function findPossiblePersonMatches(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  workspaceId: string,
  joinRequest: JoinRequestRow,
): Promise<{ people: PersonMatch[] } | { response: NextResponse }> {
  const email = normalizeEmail(joinRequest.email);
  const phone = normalizePhone(joinRequest.phone);
  const peopleById = new Map<string, PersonMatch>();

  if (email) {
    const { data, error } = await supabase
      .from("missionary_field_people")
      .select("id, name, phone, email")
      .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
      .ilike("email", email)
      .order("updated_at", { ascending: false })
      .limit(10);

    if (error) {
      return { response: NextResponse.json({ error: error.message }, { status: 500 }) };
    }

    ((data ?? []) as PersonRow[]).forEach((person) => {
      peopleById.set(person.id, {
        ...person,
        matchReasons: ["email"],
      });
    });
  }

  if (phone) {
    const phoneValues = Array.from(new Set([phone, joinRequest.phone].filter(Boolean) as string[]));
    const { data, error } = await supabase
      .from("missionary_field_people")
      .select("id, name, phone, email")
      .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
      .in("phone", phoneValues)
      .order("updated_at", { ascending: false })
      .limit(10);

    if (error) {
      return { response: NextResponse.json({ error: error.message }, { status: 500 }) };
    }

    ((data ?? []) as PersonRow[]).forEach((person) => {
      const existing = peopleById.get(person.id);

      if (existing) {
        if (!existing.matchReasons.includes("phone")) {
          existing.matchReasons.push("phone");
        }
        return;
      }

      peopleById.set(person.id, {
        ...person,
        matchReasons: ["phone"],
      });
    });
  }

  return { people: Array.from(peopleById.values()) };
}

async function createPersonFromJoinRequest(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  authorization: AuthorizedDos,
  workspaceId: string,
  joinRequest: JoinRequestRow,
) {
  const name = joinRequestName(joinRequest);

  if (!name) {
    return { response: NextResponse.json({ error: "Join request name is missing." }, { status: 400 }) };
  }

  const { data, error } = await supabase
    .from("missionary_field_people")
    .insert({
      created_by: authorization.userId,
      email: normalizeEmail(joinRequest.email),
      field_visibility: "primary",
      household_id: workspaceId,
      name,
      notes: asNullableString(joinRequest.message),
      phone: normalizePhone(joinRequest.phone) ?? "",
      relationship_context: "other",
      relationship_type: "new",
      role_in_my_life: "not_active",
      source: "field",
      status: "new",
      workspace_id: workspaceId,
    })
    .select("id, name, phone, email")
    .single();

  if (error) {
    return { response: NextResponse.json({ error: error.message }, { status: 500 }) };
  }

  return { person: data as PersonRow };
}

async function acceptJoinRequest(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  authorization: AuthorizedDos,
  workspaceId: string,
  groupId: string,
  joinRequest: JoinRequestRow,
  options: { createNewPerson: boolean; selectedPersonId: string },
) {
  let personResult: { person: PersonRow } | { response: NextResponse };

  if (options.selectedPersonId) {
    if (!isUuid(options.selectedPersonId)) {
      return { response: NextResponse.json({ error: "Selected person is invalid." }, { status: 400 }) };
    }

    const selectedPersonResult = await supabase
      .from("missionary_field_people")
      .select("id, name, phone, email")
      .eq("id", options.selectedPersonId)
      .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
      .maybeSingle();

    if (selectedPersonResult.error) {
      return { response: NextResponse.json({ error: selectedPersonResult.error.message }, { status: 500 }) };
    }

    if (!selectedPersonResult.data) {
      return { response: NextResponse.json({ error: "Selected person was not found in this workspace." }, { status: 404 }) };
    }

    personResult = { person: selectedPersonResult.data as PersonRow };
  } else if (options.createNewPerson) {
    personResult = await createPersonFromJoinRequest(supabase, authorization, workspaceId, joinRequest);
  } else {
    const possibleMatches = await findPossiblePersonMatches(supabase, workspaceId, joinRequest);

    if ("response" in possibleMatches) {
      return possibleMatches;
    }

    if (possibleMatches.people.length > 1) {
      return { response: NextResponse.json({
        error: "Multiple possible people match this request. Choose one person or create a new person.",
        possiblePersonMatches: mapRequest(joinRequest, possibleMatches.people).possiblePersonMatches,
      }, { status: 409 }) };
    }

    personResult = possibleMatches.people[0]
      ? { person: possibleMatches.people[0] }
      : await createPersonFromJoinRequest(supabase, authorization, workspaceId, joinRequest);
  }

  if ("response" in personResult) {
    return personResult;
  }

  const person = personResult.person;
  const existingMemberResult = await supabase
    .from("dos_group_members")
    .select("id, person_id, role, status, joined_at, notes")
    .eq("group_id", groupId)
    .eq("person_id", person.id)
    .maybeSingle();

  if (existingMemberResult.error) {
    return { response: NextResponse.json({ error: existingMemberResult.error.message }, { status: 500 }) };
  }

  const joinedAt = new Date().toISOString();
  const notes = [
    "Added from public group request.",
    joinRequest.message ? `Request message: ${joinRequest.message}` : null,
  ].filter(Boolean).join("\n");
  const existingRole = existingMemberResult.data?.role;
  const nextRole = existingRole === "leader" || existingRole === "co_leader" || existingRole === "helper" ? existingRole : "member";
  const writeResult = existingMemberResult.data
    ? await supabase
      .from("dos_group_members")
      .update({
        joined_at: existingMemberResult.data.joined_at ?? joinedAt,
        notes: existingMemberResult.data.notes ?? notes,
        role: nextRole,
        status: "active",
      })
      .eq("id", existingMemberResult.data.id)
      .select("id, person_id, role, status, joined_at, notes")
      .single()
    : await supabase
      .from("dos_group_members")
      .insert({
        group_id: groupId,
        joined_at: joinedAt,
        notes,
        person_id: person.id,
        role: "member",
        status: "active",
      })
      .select("id, person_id, role, status, joined_at, notes")
      .single();

  if (writeResult.error) {
    return { response: NextResponse.json({ error: writeResult.error.message }, { status: 500 }) };
  }

  const member = writeResult.data as MemberRow;
  const memberAccessResult = await createGroupMemberAccessInvitation(supabase, {
    createdByUserId: authorization.userId,
    email: joinRequest.email,
    groupId,
    memberId: member.id,
    personId: person.id,
    phone: joinRequest.phone,
  });

  return {
    alreadyMember: Boolean(existingMemberResult.data && existingMemberResult.data.status !== "removed"),
    member: {
      id: member.id,
      joinedAt: member.joined_at,
      notes: member.notes,
      personId: member.person_id,
      personName: person.name,
      role: memberRole(member),
      status: memberStatus(member),
    },
    person: {
      email: person.email,
      id: person.id,
      name: person.name,
      phone: person.phone ?? "",
    },
    memberAccess: memberAccessResult.invitation
      ? {
        accessUrl: memberAccessResult.invitation.accessUrl,
        expiresAt: memberAccessResult.invitation.expiresAt,
        status: "invited",
      }
      : {
        error: memberAccessResult.error ?? (memberAccessResult.missingSchema ? "Member access migration has not been applied." : "Member access invitation was not created."),
        status: "not_invited",
      },
  };
}

export async function GET(request: Request): Promise<NextResponse> {
  const authResult = await authorizeDosGroupsRequest();

  if ("response" in authResult) {
    return authResult.response;
  }

  const url = new URL(request.url);
  const workspaceId = await resolveDosAppWorkspaceId(url.searchParams.get("workspaceId") ?? url.searchParams.get("workspace_id") ?? "");
  const groupId = url.searchParams.get("groupId") ?? url.searchParams.get("group_id") ?? "";

  if (!workspaceId || !isUuid(groupId)) {
    return NextResponse.json({ error: "Group not found." }, { status: 404 });
  }

  const supabase = createSupabaseAdminClient();
  const accessResult = await requireGroupRequestAccess(supabase, authResult.authorization, workspaceId, groupId);

  if ("response" in accessResult) {
    return accessResult.response as NextResponse;
  }

  const { data, error } = await supabase
    .from("dos_group_join_requests")
    .select(requestSelect)
    .eq("workspace_id", workspaceId)
    .eq("group_id", groupId)
    .in("status", ["pending", "reviewed"])
    .order("submitted_at", { ascending: false })
    .limit(50);

  if (error) {
    return missingJoinRequestsTable(error)
      ? NextResponse.json({ requests: [], ok: true, warning: "Join requests are not configured yet." })
      : NextResponse.json({ error: error.message }, { status: 500 });
  }

  const requestRows = (data ?? []) as JoinRequestRow[];
  const requests = await Promise.all(requestRows.map(async (row) => {
    const matches = await findPossiblePersonMatches(supabase, workspaceId, row);

    if ("response" in matches) {
      return mapRequest(row);
    }

    return mapRequest(row, matches.people);
  }));

  return NextResponse.json({
    ok: true,
    requests,
  });
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const authResult = await authorizeDosGroupsRequest();

  if ("response" in authResult) {
    return authResult.response;
  }

  let payload: JoinRequestPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const workspaceId = await resolveDosAppWorkspaceId(asString(payload.workspaceId) || asString(payload.workspace_id));
  const groupId = asString(payload.groupId) || asString(payload.group_id);
  const requestId = asString(payload.requestId) || asString(payload.request_id);
  const action = asString(payload.action);
  const selectedPersonId = asString(payload.personId) || asString(payload.person_id);
  const createNewPerson = payload.createNewPerson === true;

  if (!workspaceId || !isUuid(groupId) || !isUuid(requestId)) {
    return NextResponse.json({ error: "Join request not found." }, { status: 404 });
  }

  if (!["accept", "decline", "review"].includes(action)) {
    return NextResponse.json({ error: "Unsupported join request action." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const accessResult = await requireGroupRequestAccess(supabase, authResult.authorization, workspaceId, groupId);

  if ("response" in accessResult) {
    return accessResult.response as NextResponse;
  }

  const requestResult = await supabase
    .from("dos_group_join_requests")
    .select(requestSelect)
    .eq("id", requestId)
    .eq("workspace_id", workspaceId)
    .eq("group_id", groupId)
    .maybeSingle();

  if (requestResult.error) {
    return missingJoinRequestsTable(requestResult.error)
      ? NextResponse.json({ error: "Join requests are not configured yet." }, { status: 500 })
      : NextResponse.json({ error: requestResult.error.message }, { status: 500 });
  }

  if (!requestResult.data) {
    return NextResponse.json({ error: "Join request not found." }, { status: 404 });
  }

  const joinRequest = requestResult.data as JoinRequestRow;

  if (!["pending", "reviewed"].includes(joinRequest.status)) {
    return NextResponse.json({ error: "This join request has already been closed." }, { status: 409 });
  }

  const acceptedResult = action === "accept"
    ? await acceptJoinRequest(supabase, authResult.authorization, workspaceId, groupId, joinRequest, {
      createNewPerson,
      selectedPersonId,
    })
    : {};

  if ("response" in acceptedResult) {
    return acceptedResult.response as NextResponse;
  }

  const nextStatus = action === "accept" ? "accepted" : action === "decline" ? "declined" : "reviewed";
  const updateResult = await supabase
    .from("dos_group_join_requests")
    .update({ status: nextStatus })
    .eq("id", joinRequest.id)
    .select(requestSelect)
    .single();

  if (updateResult.error) {
    return NextResponse.json({ error: updateResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    ...acceptedResult,
    ok: true,
    request: mapRequest(updateResult.data as JoinRequestRow),
  });
}
