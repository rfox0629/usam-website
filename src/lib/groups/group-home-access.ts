import "server-only";

import { getDosAuthorization } from "@/src/lib/dos/auth";
import { loadDosGroupRoleAccess } from "@/src/lib/dos/identity";
import type { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

type GroupWorkspaceRow = {
  active: boolean | null;
  id: string;
  workspace_id: string;
};

type WorkspaceRow = {
  display_name: string | null;
  id: string;
  slug: string;
};

type GroupLeaderRow = {
  person_id: string | null;
  role: string | null;
  status: string | null;
};

type PersonNameRow = {
  id: string;
  name: string | null;
};

export async function loadPublicGroupLeaderNames(
  supabase: SupabaseAdminClient,
  groupId: string,
) {
  const memberResult = await supabase
    .from("dos_group_members")
    .select("person_id, role, status")
    .eq("group_id", groupId)
    .eq("status", "active")
    .in("role", ["leader", "co_leader"])
    .limit(4);

  if (memberResult.error) {
    return [];
  }

  const personIds = Array.from(new Set(
    ((memberResult.data ?? []) as GroupLeaderRow[])
      .map((member) => member.person_id)
      .filter((personId): personId is string => Boolean(personId)),
  ));

  if (!personIds.length) {
    return [];
  }

  const peopleResult = await supabase
    .from("missionary_field_people")
    .select("id, name")
    .in("id", personIds);

  if (peopleResult.error) {
    return [];
  }

  const peopleById = new Map(((peopleResult.data ?? []) as PersonNameRow[]).map((person) => [person.id, person.name?.trim() ?? ""]));

  return personIds
    .map((personId) => peopleById.get(personId) ?? "")
    .filter(Boolean);
}

export async function loadManageGroupHref(
  supabase: SupabaseAdminClient,
  groupId: string,
) {
  const authorization = await getDosAuthorization();

  if (authorization.status !== "authorized") {
    return null;
  }

  const groupResult = await supabase
    .from("dos_groups")
    .select("id, workspace_id, active")
    .eq("id", groupId)
    .eq("active", true)
    .maybeSingle();

  if (groupResult.error || !groupResult.data) {
    return null;
  }

  const group = groupResult.data as GroupWorkspaceRow;
  const workspaceResult = await supabase
    .from("missionary_households")
    .select("id, slug, display_name")
    .eq("id", group.workspace_id)
    .maybeSingle();

  if (workspaceResult.error || !workspaceResult.data) {
    return null;
  }

  const workspace = workspaceResult.data as WorkspaceRow;
  const accessResult = await loadDosGroupRoleAccess(supabase, authorization, {
    allowedRoles: ["leader", "co_leader"],
    groupId,
    workspaceDisplayName: workspace.display_name,
    workspaceId: workspace.id,
  });

  if (accessResult.status !== "allowed") {
    return null;
  }

  return `/dos/${encodeURIComponent(workspace.slug)}?view=groups&openGroup=${encodeURIComponent(groupId)}`;
}
