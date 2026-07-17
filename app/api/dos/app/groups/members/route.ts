import { NextResponse } from "next/server";
import { canWriteDosActivity, getDosAuthorization } from "@/src/lib/dos/auth";
import { loadDosGroupRoleAccess } from "@/src/lib/dos/identity";
import { resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";
import { createGroupMemberAccessInvitation } from "@/src/lib/groups/member-access";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type GroupMemberPayload = {
  action?: unknown;
  email?: unknown;
  groupId?: unknown;
  group_id?: unknown;
  memberId?: unknown;
  member_id?: unknown;
  name?: unknown;
  notes?: unknown;
  personId?: unknown;
  person_id?: unknown;
  phone?: unknown;
  role?: unknown;
  status?: unknown;
  workspaceId?: unknown;
  workspace_id?: unknown;
};

type PersonRow = {
  email: string | null;
  id: string;
  name: string;
  phone: string | null;
};

type MemberRow = {
  id: string;
  joined_at: string | null;
  notes: string | null;
  person_id: string;
  role: string | null;
  status: string | null;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableString(value: unknown) {
  const text = asString(value);

  return text ? text : null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizePhone(value: string | null | undefined) {
  const digits = value?.replace(/\D/g, "") ?? "";

  return digits.length >= 7 ? digits : null;
}

function asMemberStatus(value: unknown) {
  return asString(value) === "invited" ? "invited" : "active";
}

function asMemberRole(value: unknown) {
  const role = asString(value);

  return role === "leader" || role === "co_leader" || role === "helper" || role === "guest" ? role : "member";
}

function memberStatus(row: MemberRow): "active" | "invited" | "removed" {
  return row.status === "invited" || row.status === "removed" ? row.status : "active";
}

function memberRole(row: MemberRow): "leader" | "co_leader" | "helper" | "member" | "guest" {
  return row.role === "leader" || row.role === "co_leader" || row.role === "helper" || row.role === "guest" ? row.role : "member";
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

async function resolveExistingPerson(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  workspaceId: string,
  payload: GroupMemberPayload,
) {
  const personId = asString(payload.personId) || asString(payload.person_id);

  if (personId) {
    if (!isUuid(personId)) {
      return { response: NextResponse.json({ error: "Selected person is invalid." }, { status: 400 }) };
    }

    const { data, error } = await supabase
      .from("missionary_field_people")
      .select("id, name, phone, email")
      .eq("id", personId)
      .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
      .maybeSingle();

    if (error) {
      return { response: NextResponse.json({ error: error.message }, { status: 500 }) };
    }

    if (!data) {
      return { response: NextResponse.json({ error: "Selected person was not found in this workspace." }, { status: 404 }) };
    }

    return { person: data as PersonRow };
  }

  const phone = normalizePhone(asString(payload.phone));
  const email = asString(payload.email).toLowerCase();

  if (email) {
    const { data, error } = await supabase
      .from("missionary_field_people")
      .select("id, name, phone, email")
      .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
      .ilike("email", email)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { response: NextResponse.json({ error: error.message }, { status: 500 }) };
    }

    if (data) {
      return { person: data as PersonRow };
    }
  }

  if (phone) {
    const rawPhone = asString(payload.phone);
    const phoneValues = Array.from(new Set([phone, rawPhone].filter(Boolean)));
    const { data, error } = await supabase
      .from("missionary_field_people")
      .select("id, name, phone, email")
      .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
      .in("phone", phoneValues)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { response: NextResponse.json({ error: error.message }, { status: 500 }) };
    }

    if (data) {
      return { person: data as PersonRow };
    }
  }

  return { person: null };
}

async function createPerson(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  workspaceId: string,
  userId: string,
  payload: GroupMemberPayload,
) {
  const name = asString(payload.name);

  if (!name) {
    return { response: NextResponse.json({ error: "Name is required." }, { status: 400 }) };
  }

  const personRecord = {
    created_by: userId,
    email: asNullableString(payload.email),
    field_visibility: "primary",
    household_id: workspaceId,
    name,
    notes: null,
    phone: normalizePhone(asString(payload.phone)) ?? "",
    relationship_context: "other",
    relationship_type: "new",
    role_in_my_life: "not_active",
    source: "field",
    status: "new",
    workspace_id: workspaceId,
  };
  const { data, error } = await supabase
    .from("missionary_field_people")
    .insert(personRecord)
    .select("id, name, phone, email")
    .single();

  if (error) {
    return { response: NextResponse.json({ error: error.message }, { status: 500 }) };
  }

  return { person: data as PersonRow };
}

export async function POST(request: Request) {
  const authResult = await authorizeWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  let payload: GroupMemberPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const workspaceId = await resolveDosAppWorkspaceId(asString(payload.workspaceId) || asString(payload.workspace_id));
  const groupId = asString(payload.groupId) || asString(payload.group_id);

  if (!workspaceId || !isUuid(groupId)) {
    return NextResponse.json({ error: "Group not found." }, { status: 404 });
  }

  const supabase = createSupabaseAdminClient();
  const groupAccess = await loadDosGroupRoleAccess(supabase, authResult.authorization, {
    allowedRoles: ["leader", "co_leader"],
    groupId,
    workspaceId,
  });

  if (groupAccess.status !== "allowed") {
    return NextResponse.json(
      { error: groupAccess.message },
      { status: groupAccess.status === "not_found" ? 404 : groupAccess.status === "forbidden" ? 403 : 500 },
    );
  }

  const action = asString(payload.action);

  if (action === "send_member_access") {
    const personId = asString(payload.personId) || asString(payload.person_id);
    const memberId = asString(payload.memberId) || asString(payload.member_id);

    if (!isUuid(personId)) {
      return NextResponse.json({ error: "Group member not found." }, { status: 404 });
    }

    let memberQuery = supabase
      .from("dos_group_members")
      .select("id, person_id, role, status, joined_at, notes")
      .eq("group_id", groupId)
      .eq("person_id", personId);

    if (isUuid(memberId)) {
      memberQuery = memberQuery.eq("id", memberId);
    }

    const memberResult = await memberQuery.maybeSingle();

    if (memberResult.error) {
      return NextResponse.json({ error: memberResult.error.message }, { status: 500 });
    }

    if (!memberResult.data || memberResult.data.status !== "active") {
      return NextResponse.json({ error: "Active group membership is required before member access can be invited." }, { status: 409 });
    }

    const invitationResult = await createGroupMemberAccessInvitation(supabase, {
      createdByUserId: authResult.authorization.userId,
      email: asNullableString(payload.email),
      groupId,
      memberId: memberResult.data.id,
      personId,
      phone: asNullableString(payload.phone),
    });

    if (invitationResult.error || invitationResult.missingSchema || !invitationResult.invitation) {
      return NextResponse.json({
        error: invitationResult.error ?? "Member access is not configured yet.",
      }, { status: invitationResult.missingSchema ? 501 : 400 });
    }

    return NextResponse.json({
      memberAccess: {
        accessUrl: invitationResult.invitation.accessUrl,
        expiresAt: invitationResult.invitation.expiresAt,
        status: "invited",
      },
      ok: true,
    });
  }

  const existingPersonResult = await resolveExistingPerson(supabase, workspaceId, payload);

  if ("response" in existingPersonResult) {
    return existingPersonResult.response;
  }

  const personResult = existingPersonResult.person
    ? { person: existingPersonResult.person }
    : await createPerson(supabase, workspaceId, authResult.authorization.userId, payload);

  if ("response" in personResult) {
    return personResult.response;
  }

  const person = personResult.person;
  const existingMemberResult = await supabase
    .from("dos_group_members")
    .select("id, person_id, role, status, joined_at, notes")
    .eq("group_id", groupId)
    .eq("person_id", person.id)
    .maybeSingle();

  if (existingMemberResult.error) {
    return NextResponse.json({ error: existingMemberResult.error.message }, { status: 500 });
  }

  const status = asMemberStatus(payload.status);
  const role = asMemberRole(payload.role);
  const notes = asNullableString(payload.notes);
  const membershipRecord = {
    group_id: groupId,
    joined_at: new Date().toISOString(),
    notes,
    person_id: person.id,
    role,
    status,
  };
  const writeResult = existingMemberResult.data
    ? await supabase
      .from("dos_group_members")
      .update({
        joined_at: existingMemberResult.data.joined_at ?? membershipRecord.joined_at,
        notes: notes ?? existingMemberResult.data.notes,
        role: existingMemberResult.data.role === "leader" ? "leader" : role,
        status: existingMemberResult.data.role === "leader" ? "active" : status,
      })
      .eq("id", existingMemberResult.data.id)
      .select("id, person_id, role, status, joined_at, notes")
      .single()
    : await supabase
      .from("dos_group_members")
      .insert(membershipRecord)
      .select("id, person_id, role, status, joined_at, notes")
      .single();

  if (writeResult.error) {
    return NextResponse.json({ error: writeResult.error.message }, { status: 500 });
  }

  const member = writeResult.data as MemberRow;

  return NextResponse.json({
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
    ok: true,
    person: {
      email: person.email,
      id: person.id,
      name: person.name,
      phone: person.phone ?? "",
    },
  });
}

export async function DELETE(request: Request) {
  const authResult = await authorizeWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  let payload: GroupMemberPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const workspaceId = await resolveDosAppWorkspaceId(asString(payload.workspaceId) || asString(payload.workspace_id));
  const groupId = asString(payload.groupId) || asString(payload.group_id);
  const memberId = asString(payload.memberId) || asString(payload.member_id);
  const personId = asString(payload.personId) || asString(payload.person_id);

  if (!workspaceId || !isUuid(groupId) || (!isUuid(memberId) && !isUuid(personId))) {
    return NextResponse.json({ error: "Group member not found." }, { status: 404 });
  }

  const supabase = createSupabaseAdminClient();
  const groupAccess = await loadDosGroupRoleAccess(supabase, authResult.authorization, {
    allowedRoles: ["leader", "co_leader"],
    groupId,
    workspaceId,
  });

  if (groupAccess.status !== "allowed") {
    return NextResponse.json(
      { error: groupAccess.message },
      { status: groupAccess.status === "not_found" ? 404 : groupAccess.status === "forbidden" ? 403 : 500 },
    );
  }

  const groupResult = await supabase
    .from("dos_groups")
    .select("id, leader_person_id")
    .eq("id", groupId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (groupResult.error) {
    return NextResponse.json({ error: groupResult.error.message }, { status: 500 });
  }

  if (!groupResult.data) {
    return NextResponse.json({ error: "Group not found." }, { status: 404 });
  }

  let memberQuery = supabase
    .from("dos_group_members")
    .select("id, person_id, role, status, joined_at, notes")
    .eq("group_id", groupId);

  memberQuery = isUuid(memberId)
    ? memberQuery.eq("id", memberId)
    : memberQuery.eq("person_id", personId);

  const memberResult = await memberQuery.maybeSingle();

  if (memberResult.error) {
    return NextResponse.json({ error: memberResult.error.message }, { status: 500 });
  }

  if (!memberResult.data) {
    return NextResponse.json({ error: "Group member not found." }, { status: 404 });
  }

  const member = memberResult.data as MemberRow;

  if (member.role === "leader" || groupResult.data.leader_person_id === member.person_id) {
    return NextResponse.json({ error: "Change the group leader before removing this member." }, { status: 409 });
  }

  const personResult = await supabase
    .from("missionary_field_people")
    .select("name")
    .eq("id", member.person_id)
    .maybeSingle();

  if (personResult.error) {
    return NextResponse.json({ error: personResult.error.message }, { status: 500 });
  }

  const removeResult = await supabase
    .from("dos_group_members")
    .update({
      status: "removed",
    })
    .eq("id", member.id)
    .select("id, person_id, role, status, joined_at, notes")
    .single();

  if (removeResult.error) {
    return NextResponse.json({ error: removeResult.error.message }, { status: 500 });
  }

  const removedMember = removeResult.data as MemberRow;

  return NextResponse.json({
    member: {
      id: removedMember.id,
      joinedAt: removedMember.joined_at,
      notes: removedMember.notes,
      personId: removedMember.person_id,
      personName: personResult.data?.name ?? "Member",
      role: memberRole(removedMember),
      status: memberStatus(removedMember),
    },
    ok: true,
  });
}
