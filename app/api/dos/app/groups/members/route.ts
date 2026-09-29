import { NextResponse } from "next/server";
import { canWriteDosActivity, getDosAuthorization } from "@/src/lib/dos/auth";
import { loadDosGroupRoleAccess } from "@/src/lib/dos/identity";
import { resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";
import { createGroupMemberAccessInvitation } from "@/src/lib/groups/member-access";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import { decideGroupMemberPerson, normalizeEmailForMatch, normalizePhoneForMatch } from "@/src/lib/dos/group-member-match";

type GroupMemberPayload = {
  action?: unknown;
  confirmAddToGroup?: unknown;
  confirmNearDuplicate?: unknown;
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

/* ilike treats % and _ as wildcards; a name or email is matched literally. */
function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
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

function firstForwardedHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() ?? "";
}

function requestOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  const forwardedHost = firstForwardedHeaderValue(request.headers.get("x-forwarded-host"));
  const forwardedProtocol = firstForwardedHeaderValue(request.headers.get("x-forwarded-proto"));
  const host = forwardedHost || request.headers.get("host") || requestUrl.host;
  const protocol = forwardedProtocol || requestUrl.protocol.replace(/:$/, "");

  return `${protocol}://${host}`;
}

function shouldUseRequestOriginForMemberAccess(origin: URL) {
  const hostname = origin.hostname.toLowerCase();

  return hostname === "localhost"
    || hostname === "127.0.0.1"
    || hostname.endsWith(".localhost")
    || hostname.endsWith(".vercel.app")
    || process.env.VERCEL_ENV === "preview";
}

function memberAccessUrlForRequest(accessUrl: string, request: Request) {
  try {
    const origin = new URL(requestOrigin(request));
    const url = new URL(accessUrl);

    if (shouldUseRequestOriginForMemberAccess(origin)) {
      url.protocol = origin.protocol;
      url.host = origin.host;
    }

    return url.toString();
  } catch {
    return accessUrl;
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

  /* USA-283: gather everyone this new person could be -- by email, by phone
     and by exact name -- and let one tested rule decide. A shared email or
     phone no longer links a differently named person silently. */
  const name = asString(payload.name);
  const email = normalizeEmailForMatch(asString(payload.email));
  const phone = normalizePhoneForMatch(asString(payload.phone));
  const candidates = new Map<string, PersonRow & { status?: string | null }>();
  const workspaceScope = `workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`;
  const lookups = [];

  if (email) {
    lookups.push(supabase
      .from("missionary_field_people")
      .select("id, name, phone, email, status")
      .or(workspaceScope)
      .ilike("email", escapeLikePattern(email))
      .limit(10));
  }

  if (phone) {
    const rawPhone = asString(payload.phone);
    const phoneValues = Array.from(new Set([phone, `1${phone}`, rawPhone].filter(Boolean)));

    lookups.push(supabase
      .from("missionary_field_people")
      .select("id, name, phone, email, status")
      .or(workspaceScope)
      .in("phone", phoneValues)
      .limit(10));
  }

  if (name) {
    /* Exact, case-insensitive name lookup across the whole workspace. It used
       to scan only the 25 most recently updated people. */
    lookups.push(supabase
      .from("missionary_field_people")
      .select("id, name, phone, email, status")
      .or(workspaceScope)
      .ilike("name", escapeLikePattern(name.replace(/\s+/g, " ")))
      .limit(10));
  }

  for (const result of await Promise.all(lookups)) {
    if (result.error) {
      return { response: NextResponse.json({ error: result.error.message }, { status: 500 }) };
    }

    (result.data ?? []).forEach((row) => candidates.set(row.id, row as PersonRow & { status?: string | null }));
  }

  const decision = decideGroupMemberPerson({
    confirmNearDuplicate: asString(payload.confirmNearDuplicate) === "true" || payload.confirmNearDuplicate === true,
    email: email ?? "",
    name,
    phone: phone ?? "",
  }, Array.from(candidates.values()));

  if (decision.kind === "link") {
    return { person: decision.person as PersonRow };
  }

  if (decision.kind === "review") {
    const match = decision.person;

    return {
      response: NextResponse.json(
        {
          error: decision.reason === "shared_contact"
            ? `${match.name} already uses that ${email && normalizeEmailForMatch(match.email) === email ? "email" : "phone number"}. Choose them, or confirm this is someone else.`
            : `A person named "${match.name}" already exists in this workspace.`,
          nearDuplicate: { email: match.email, id: match.id, name: match.name, phone: match.phone, reason: decision.reason },
        },
        { status: 409 },
      ),
    };
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

/* Shared Leadership: give an existing Person a leadership role in this
   group, or take it back to member. This is a role change on the one
   membership row (group_id, person_id is unique), never a second membership.
   Someone not yet in the group is added in the same write, but only when the
   leader has confirmed that on screen (confirmAddToGroup). The primary leader
   is changed in Edit Group, not here. Nothing is sent to anyone. */
const leadershipRoles = ["co_leader", "helper", "member"] as const;
type LeadershipRole = typeof leadershipRoles[number];

async function setLeadershipRole(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  workspaceId: string,
  groupId: string,
  payload: GroupMemberPayload,
) {
  const role = asString(payload.role) as LeadershipRole;

  if (!leadershipRoles.includes(role)) {
    return NextResponse.json({ error: "Choose Co-leader or Helper." }, { status: 400 });
  }

  const personId = asString(payload.personId) || asString(payload.person_id);

  if (!isUuid(personId)) {
    return NextResponse.json({ error: "Choose a person from People." }, { status: 400 });
  }

  const personResult = await resolveExistingPerson(supabase, workspaceId, { personId });

  if ("response" in personResult) {
    return personResult.response;
  }

  const person = personResult.person as PersonRow;
  const [groupResult, existingMemberResult] = await Promise.all([
    supabase.from("dos_groups").select("id, leader_person_id").eq("id", groupId).maybeSingle(),
    supabase
      .from("dos_group_members")
      .select("id, person_id, role, status, joined_at, notes")
      .eq("group_id", groupId)
      .eq("person_id", person.id)
      .maybeSingle(),
  ]);

  if (groupResult.error || existingMemberResult.error) {
    return NextResponse.json({ error: (groupResult.error ?? existingMemberResult.error)?.message }, { status: 500 });
  }

  const existing = existingMemberResult.data as MemberRow | null;

  if (existing?.role === "leader" || groupResult.data?.leader_person_id === person.id) {
    return NextResponse.json({ error: `${person.name} is the primary leader. Change the primary leader in Edit Group.` }, { status: 409 });
  }

  const inGroup = Boolean(existing && existing.status === "active");

  if (!inGroup && role === "member") {
    return NextResponse.json({ error: `${person.name} is not a leader in this group.` }, { status: 409 });
  }

  if (!inGroup && payload.confirmAddToGroup !== true) {
    return NextResponse.json({
      error: `${person.name} is not an active member of this group yet. Confirm adding them too.`,
      needsMembership: true,
    }, { status: 409 });
  }

  if (existing && inGroup && memberRole(existing) === role) {
    return NextResponse.json({
      addedToGroup: false,
      member: { id: existing.id, personId: existing.person_id, personName: person.name, role, status: "active" },
      ok: true,
      unchanged: true,
    });
  }

  const writeResult = existing
    ? await supabase
      .from("dos_group_members")
      .update({ role, status: "active", updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select("id, person_id, role, status, joined_at, notes")
      .single()
    : await supabase
      .from("dos_group_members")
      .insert({ group_id: groupId, joined_at: new Date().toISOString(), person_id: person.id, role, status: "active" })
      .select("id, person_id, role, status, joined_at, notes")
      .single();

  if (writeResult.error) {
    /* Another device added them a moment ago: ask again rather than guess. */
    const conflict = writeResult.error.code === "23505";

    return NextResponse.json(
      { error: conflict ? `${person.name} was just added to this group. Try again.` : writeResult.error.message },
      { status: conflict ? 409 : 500 },
    );
  }

  const member = writeResult.data as MemberRow;

  return NextResponse.json({
    addedToGroup: !inGroup,
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
    person: { email: person.email, id: person.id, name: person.name, phone: person.phone ?? "" },
    unchanged: false,
  });
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

  if (action === "set_leadership_role") {
    return setLeadershipRole(supabase, workspaceId, groupId, payload);
  }

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
        accessUrl: memberAccessUrlForRequest(invitationResult.invitation.accessUrl, request),
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
  /* Adding someone who is already in the group changes nothing: it used to
     rewrite their role, so re-adding a co-leader as a member demoted them.
     Role changes go through set_leadership_role. A removed membership is
     restored with the chosen role and status. */
  const currentMembership = existingMemberResult.data && existingMemberResult.data.status !== "removed"
    ? existingMemberResult.data as MemberRow
    : null;
  const writeResult = currentMembership
    ? { data: currentMembership, error: null }
    : existingMemberResult.data
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

  /* USA-283: two taps (or two devices) racing to add the same person meet
     the (group_id, person_id) unique constraint. The loser reports the
     membership that won instead of an error. */
  let raceWinner: MemberRow | null = null;

  if (writeResult.error && writeResult.error.code === "23505" && !existingMemberResult.data) {
    const winner = await supabase
      .from("dos_group_members")
      .select("id, person_id, role, status, joined_at, notes")
      .eq("group_id", groupId)
      .eq("person_id", person.id)
      .maybeSingle();

    raceWinner = (winner.data as MemberRow | null) ?? null;
  }

  if (writeResult.error && !raceWinner) {
    return NextResponse.json({ error: writeResult.error.message }, { status: 500 });
  }

  const member = raceWinner ?? writeResult.data as MemberRow;

  return NextResponse.json({
    alreadyMember: Boolean(raceWinner) || Boolean(existingMemberResult.data && existingMemberResult.data.status !== "removed"),
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
