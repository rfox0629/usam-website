import "server-only";

import { isAdminDosAuthorization, type DosAuthorization } from "@/src/lib/dos/auth";
import { resolveDosViewerPerson } from "@/src/lib/dos/household-member-people";
import type { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;
type SupabaseQueryError = { code?: string; message?: string } | null | undefined;

type AuthorizedDos = Extract<DosAuthorization, { status: "authorized" }>;

type ProfileRow = {
  email: string | null;
  first_name: string | null;
  id: string;
  last_name: string | null;
  owner_organization_id: string | null;
};

type IdentityLinkRow = {
  id: string;
  match_reasons: string[] | null;
  organization_id: string | null;
  person_id: string;
  profile_id: string | null;
  user_id: string;
  verification_method: string;
  verification_status: string;
  verified_at: string | null;
  workspace_id: string;
};

type PersonCandidateRow = {
  created_by: string | null;
  email: string | null;
  id: string;
  name: string | null;
  phone: string | null;
  status: string | null;
};

type CandidateMatch = PersonCandidateRow & {
  matchReasons: string[];
};

type GroupRoleRow = {
  id: string;
  role: string | null;
  status: string | null;
};

export type DosIdentityResolution =
  | {
      identity: IdentityLinkRow;
      status: "linked";
    }
  | {
      candidates: CandidateMatch[];
      message: string;
      status: "ambiguous";
    }
  | {
      message: string;
      status: "unavailable";
    };

export type DosGroupRoleAccess =
  | {
      group: {
        id: string;
        workspace_id: string;
      };
      identity: IdentityLinkRow | null;
      role: string | null;
      status: "allowed";
    }
  | {
      message: string;
      status: "forbidden" | "not_found" | "configuration_error";
    };

export type DosSharedWorkspaceAccess =
  | {
      groupIds: string[];
      status: "allowed";
      workspace: {
        displayName: string;
        id: string;
        slug: string;
      };
    }
  | {
      message: string;
      status: "forbidden" | "not_found" | "configuration_error";
    };

function cleanText(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function normalizeEmail(value: string | null | undefined) {
  const email = cleanText(value).toLowerCase();

  return email ? email : null;
}

function normalizePhone(value: string | null | undefined) {
  const digits = cleanText(value).replace(/\D/g, "");

  return digits.length >= 7 ? digits : null;
}

function nameKey(value: string | null | undefined) {
  return cleanText(value).toLowerCase();
}

function missingIdentityTable(error: SupabaseQueryError) {
  const message = error?.message?.toLowerCase() ?? "";

  return error?.code === "42P01"
    || error?.code === "PGRST205"
    || (message.includes("dos_identity_links") && (message.includes("does not exist") || message.includes("schema cache") || message.includes("could not find")));
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function profileDisplayName(profile: ProfileRow | null, authorization: AuthorizedDos, workspaceDisplayName?: string | null) {
  const profileName = cleanText([profile?.first_name, profile?.last_name].filter(Boolean).join(" "));
  const emailName = normalizeEmail(profile?.email ?? (authorization.access === "member" ? authorization.email : null))
    ?.split("@")[0]
    ?.split(/[._+-]+/)
    .map(cleanText)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return profileName || emailName || cleanText(workspaceDisplayName) || "DOS User";
}

async function loadProfile(supabase: SupabaseAdminClient, authorization: AuthorizedDos) {
  if (authorization.access !== "member") {
    return null;
  }

  const [userProfileResult, emailProfileResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, user_id, first_name, last_name, email, owner_organization_id")
      .eq("user_id", authorization.userId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("id, user_id, first_name, last_name, email, owner_organization_id")
      .ilike("email", authorization.email)
      .limit(1)
      .maybeSingle(),
  ]);

  if (userProfileResult.error) {
    return null;
  }

  if (userProfileResult.data) {
    return userProfileResult.data as ProfileRow;
  }

  return emailProfileResult.error ? null : emailProfileResult.data as ProfileRow | null;
}

async function loadVerifiedIdentityLink(
  supabase: SupabaseAdminClient,
  authorization: AuthorizedDos,
  workspaceId: string,
) {
  if (authorization.access !== "member") {
    return { error: null, identity: null };
  }

  const { data, error } = await supabase
    .from("dos_identity_links")
    .select("id, user_id, profile_id, person_id, workspace_id, organization_id, verification_status, verification_method, match_reasons, verified_at")
    .eq("user_id", authorization.userId)
    .eq("workspace_id", workspaceId)
    .eq("verification_status", "verified")
    .limit(1)
    .maybeSingle();

  return { error, identity: data as IdentityLinkRow | null };
}

async function loadCandidatePeople(supabase: SupabaseAdminClient, workspaceId: string) {
  const { data, error } = await supabase
    .from("missionary_field_people")
    .select("id, name, email, phone, status, created_by")
    .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
    .order("updated_at", { ascending: false });

  if (error) {
    return { error, people: [] as PersonCandidateRow[] };
  }

  return {
    error: null,
    people: ((data ?? []) as PersonCandidateRow[])
      .filter((person) => !["archived", "deleted"].includes(cleanText(person.status).toLowerCase())),
  };
}

function candidateMatches(
  people: PersonCandidateRow[],
  authorization: AuthorizedDos,
  profile: ProfileRow | null,
  workspaceDisplayName?: string | null,
) {
  if (authorization.access !== "member") {
    return [];
  }

  const userId = cleanText(authorization.userId);
  const email = normalizeEmail(profile?.email ?? authorization.email);
  const phone = normalizePhone(authorization.phone);
  const displayName = nameKey(profileDisplayName(profile, authorization, workspaceDisplayName));
  const matchesById = new Map<string, CandidateMatch>();
  const addMatch = (person: PersonCandidateRow, reason: string) => {
    const current = matchesById.get(person.id);

    if (current) {
      if (!current.matchReasons.includes(reason)) {
        current.matchReasons.push(reason);
      }
      return;
    }

    matchesById.set(person.id, {
      ...person,
      matchReasons: [reason],
    });
  };

  if (userId) {
    people
      .filter((person) => cleanText(person.created_by) === userId)
      .forEach((person) => addMatch(person, "created_by_user"));
  }

  if (email) {
    people
      .filter((person) => normalizeEmail(person.email) === email)
      .forEach((person) => addMatch(person, "email_exact"));
  }

  if (phone) {
    people
      .filter((person) => normalizePhone(person.phone) === phone)
      .forEach((person) => addMatch(person, "phone_exact"));
  }

  const strongMatches = Array.from(matchesById.values());

  if (strongMatches.length) {
    return strongMatches;
  }

  const nameMatches = displayName
    ? people.filter((person) => nameKey(person.name) === displayName)
    : [];

  return nameMatches.map((person) => ({
    ...person,
    matchReasons: ["name_exact"],
  }));
}

async function recordAmbiguousIdentityCandidates(
  supabase: SupabaseAdminClient,
  authorization: AuthorizedDos,
  workspaceId: string,
  profile: ProfileRow | null,
  candidates: CandidateMatch[],
) {
  if (authorization.access !== "member" || !candidates.length) {
    return;
  }

  await supabase
    .from("dos_identity_links")
    .upsert(candidates.map((candidate) => ({
      match_reasons: candidate.matchReasons,
      metadata: {
        candidateName: candidate.name,
        reason: "multiple_possible_people",
      },
      organization_id: profile?.owner_organization_id ?? null,
      person_id: candidate.id,
      profile_id: profile?.id ?? null,
      user_id: authorization.userId,
      verification_method: "ambiguous_match",
      verification_status: "ambiguous",
      workspace_id: workspaceId,
    })), { onConflict: "user_id,workspace_id,person_id" });
}

async function upsertVerifiedIdentityLink(
  supabase: SupabaseAdminClient,
  authorization: AuthorizedDos,
  workspaceId: string,
  profile: ProfileRow | null,
  personId: string,
  matchReasons: string[],
  verificationMethod: string,
) {
  if (authorization.access !== "member") {
    return { error: { message: "DOS member authorization required." }, identity: null };
  }

  const { data, error } = await supabase
    .from("dos_identity_links")
    .upsert({
      match_reasons: matchReasons,
      organization_id: profile?.owner_organization_id ?? null,
      person_id: personId,
      profile_id: profile?.id ?? null,
      user_id: authorization.userId,
      verification_method: verificationMethod,
      verification_status: "verified",
      verified_at: new Date().toISOString(),
      workspace_id: workspaceId,
    }, { onConflict: "user_id,workspace_id,person_id" })
    .select("id, user_id, profile_id, person_id, workspace_id, organization_id, verification_status, verification_method, match_reasons, verified_at")
    .single();

  return { error, identity: data as IdentityLinkRow | null };
}

export async function resolveDosIdentityForWorkspace(
  supabase: SupabaseAdminClient,
  authorization: AuthorizedDos,
  input: {
    workspaceDisplayName?: string | null;
    workspaceId: string;
  },
): Promise<DosIdentityResolution> {
  if (isAdminDosAuthorization(authorization)) {
    return { message: "DOS admins do not need a workspace person identity link.", status: "unavailable" };
  }

  const existingLinkResult = await loadVerifiedIdentityLink(supabase, authorization, input.workspaceId);

  if (existingLinkResult.identity) {
    return { identity: existingLinkResult.identity, status: "linked" };
  }

  if (missingIdentityTable(existingLinkResult.error)) {
    return { message: "DOS identity links migration has not been applied.", status: "unavailable" };
  }

  if (existingLinkResult.error) {
    return { message: existingLinkResult.error.message ?? "Unable to load DOS identity link.", status: "unavailable" };
  }

  const profile = await loadProfile(supabase, authorization);
  const peopleResult = await loadCandidatePeople(supabase, input.workspaceId);

  if (peopleResult.error) {
    return { message: peopleResult.error.message ?? "Unable to load Field people.", status: "unavailable" };
  }

  const matches = candidateMatches(peopleResult.people, authorization, profile, input.workspaceDisplayName);
  const onlyNameMatches = matches.length > 0
    && matches.every((match) => match.matchReasons.length === 1 && match.matchReasons[0] === "name_exact");

  if (matches.length > 1 || onlyNameMatches) {
    await recordAmbiguousIdentityCandidates(supabase, authorization, input.workspaceId, profile, matches);

    return {
      candidates: matches,
      message: onlyNameMatches
        ? "An existing person name matches this DOS user, but contact verification is required before shared leadership access is granted."
        : "Multiple existing people could match this DOS user. Manual verification is required before shared leadership access is granted.",
      status: "ambiguous",
    };
  }

  if (matches.length === 1) {
    const matchedPerson = matches[0];
    const linkResult = await upsertVerifiedIdentityLink(
      supabase,
      authorization,
      input.workspaceId,
      profile,
      matchedPerson.id,
      matchedPerson.matchReasons,
      matchedPerson.matchReasons.includes("created_by_user") ? "created_by_user" : "unique_contact_match",
    );

    if (linkResult.error || !linkResult.identity) {
      return { message: linkResult.error?.message ?? "Unable to verify DOS identity link.", status: "unavailable" };
    }

    return { identity: linkResult.identity, status: "linked" };
  }

  const viewerPerson = await resolveDosViewerPerson(supabase, {
    email: authorization.email,
    phone: authorization.phone,
    userId: authorization.userId,
    workspaceDisplayName: input.workspaceDisplayName,
    workspaceId: input.workspaceId,
  });

  if (viewerPerson.error || !viewerPerson.person?.id) {
    return { message: viewerPerson.error?.message ?? "Unable to create a DOS identity person.", status: "unavailable" };
  }

  const linkResult = await upsertVerifiedIdentityLink(
    supabase,
    authorization,
    input.workspaceId,
    profile,
    viewerPerson.person.id,
    viewerPerson.createdCount ? ["created_viewer_person"] : ["resolved_viewer_person"],
    viewerPerson.createdCount ? "created_viewer_person" : "resolved_viewer_person",
  );

  if (linkResult.error || !linkResult.identity) {
    return { message: linkResult.error?.message ?? "Unable to verify DOS identity link.", status: "unavailable" };
  }

  return { identity: linkResult.identity, status: "linked" };
}

export async function loadDosGroupRoleAccess(
  supabase: SupabaseAdminClient,
  authorization: AuthorizedDos,
  input: {
    allowedRoles: string[];
    groupId: string;
    workspaceDisplayName?: string | null;
    workspaceId: string;
  },
): Promise<DosGroupRoleAccess> {
  const groupResult = await supabase
    .from("dos_groups")
    .select("id, workspace_id")
    .eq("id", input.groupId)
    .eq("workspace_id", input.workspaceId)
    .eq("active", true)
    .maybeSingle();

  if (groupResult.error) {
    return { message: groupResult.error.message, status: "configuration_error" };
  }

  if (!groupResult.data) {
    return { message: "Group not found.", status: "not_found" };
  }

  if (isAdminDosAuthorization(authorization)) {
    return {
      group: groupResult.data as { id: string; workspace_id: string },
      identity: null,
      role: null,
      status: "allowed",
    };
  }

  const identity = await resolveDosIdentityForWorkspace(supabase, authorization, {
    workspaceDisplayName: input.workspaceDisplayName,
    workspaceId: input.workspaceId,
  });

  if (identity.status !== "linked") {
    return {
      message: identity.message,
      status: identity.status === "ambiguous" ? "forbidden" : "configuration_error",
    };
  }

  const roleResult = await supabase
    .from("dos_group_members")
    .select("id, role, status")
    .eq("group_id", input.groupId)
    .eq("person_id", identity.identity.person_id)
    .eq("status", "active")
    .in("role", input.allowedRoles)
    .limit(1)
    .maybeSingle();

  if (roleResult.error) {
    return { message: roleResult.error.message, status: "configuration_error" };
  }

  if (!roleResult.data) {
    return { message: "Group leader access required.", status: "forbidden" };
  }

  const role = roleResult.data as GroupRoleRow;

  return {
    group: groupResult.data as { id: string; workspace_id: string },
    identity: identity.identity,
    role: role.role,
    status: "allowed",
  };
}

export async function loadDosSharedWorkspaceAccess(
  supabase: SupabaseAdminClient,
  authorization: AuthorizedDos,
  input: {
    workspaceRef: string;
  },
): Promise<DosSharedWorkspaceAccess> {
  if (isAdminDosAuthorization(authorization)) {
    return { message: "Admins use normal DOS workspace authorization.", status: "forbidden" };
  }

  const workspaceQuery = supabase
    .from("missionary_households")
    .select("id, slug, display_name");
  const workspaceResult = isUuid(input.workspaceRef)
    ? await workspaceQuery.eq("id", input.workspaceRef).maybeSingle()
    : await workspaceQuery.eq("slug", input.workspaceRef).maybeSingle();

  if (workspaceResult.error) {
    return { message: workspaceResult.error.message, status: "configuration_error" };
  }

  if (!workspaceResult.data) {
    return { message: "Missionary workspace not found.", status: "not_found" };
  }

  const workspace = workspaceResult.data as { display_name: string; id: string; slug: string };
  const identity = await resolveDosIdentityForWorkspace(supabase, authorization, {
    workspaceDisplayName: workspace.display_name,
    workspaceId: workspace.id,
  });

  if (identity.status !== "linked") {
    return {
      message: identity.message,
      status: identity.status === "ambiguous" ? "forbidden" : "configuration_error",
    };
  }

  const memberResult = await supabase
    .from("dos_group_members")
    .select("group_id")
    .eq("person_id", identity.identity.person_id)
    .eq("status", "active")
    .in("role", ["leader", "co_leader", "helper", "member", "guest"]);

  if (memberResult.error) {
    return { message: memberResult.error.message, status: "configuration_error" };
  }

  const groupIds = Array.from(new Set((memberResult.data ?? []).map((row) => row.group_id).filter((groupId): groupId is string => Boolean(groupId))));

  if (!groupIds.length) {
    return { message: "Shared group access required.", status: "forbidden" };
  }

  const groupsResult = await supabase
    .from("dos_groups")
    .select("id")
    .eq("workspace_id", workspace.id)
    .eq("active", true)
    .in("id", groupIds);

  if (groupsResult.error) {
    return { message: groupsResult.error.message, status: "configuration_error" };
  }

  const accessibleGroupIds = Array.from(new Set((groupsResult.data ?? []).map((group) => group.id).filter((groupId): groupId is string => Boolean(groupId))));

  if (!accessibleGroupIds.length) {
    return { message: "Shared group access required.", status: "forbidden" };
  }

  return {
    groupIds: accessibleGroupIds,
    status: "allowed",
    workspace: {
      displayName: workspace.display_name,
      id: workspace.id,
      slug: workspace.slug,
    },
  };
}
