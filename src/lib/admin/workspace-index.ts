import "server-only";

import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/src/lib/supabase/admin";

export type AdminWorkspaceStatus = "active" | "setup";

export type AdminWorkspaceIndexItem = {
  id: string;
  slug: string | null;
  workspaceName: string;
  userName: string | null;
  email: string | null;
  organizationId: string | null;
  organizationName: string | null;
  householdName: string | null;
  peopleCount: number;
  meetingsCount: number;
  lastActiveAt: string | null;
  status: AdminWorkspaceStatus;
  previewHref: string;
};

export type AdminWorkspaceIndexData = {
  error?: string;
  stats: {
    totalWorkspaces: number;
    activeWorkspaces: number;
    organizationConnected: number;
    independentUsers: number;
  };
  organizations: Array<{
    id: string;
    name: string;
  }>;
  workspaces: AdminWorkspaceIndexItem[];
};

type SupabaseErrorLike = {
  message?: string | null;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
};

type HouseholdRow = {
  id: string;
  slug: string | null;
  display_name: string | null;
  updated_at: string | null;
  created_at: string | null;
};

type WorkspaceScopedRow = {
  id: string;
  workspace_id?: string | null;
  household_id?: string | null;
  last_activity_at?: string | null;
  table_date?: string | null;
  updated_at: string | null;
  created_at: string | null;
};

type TeamMemberRow = {
  id: string;
  household_id: string | null;
  display_name: string | null;
  dos_user_id?: string | null;
  status?: string | null;
  updated_at: string | null;
  created_at: string | null;
};

type OrganizationRow = {
  id: string;
  name: string | null;
  slug: string | null;
};

type CollectiveRow = {
  id: string;
  owner_organization_id: string | null;
  slug: string | null;
  name: string | null;
};

type ProfileRow = {
  email: string | null;
  primary_collective_id: string | null;
};

const emptyWorkspaceIndex: AdminWorkspaceIndexData = {
  stats: {
    totalWorkspaces: 0,
    activeWorkspaces: 0,
    organizationConnected: 0,
    independentUsers: 0,
  },
  organizations: [],
  workspaces: [],
};

function isMissingColumnError(error: SupabaseErrorLike | null | undefined) {
  const text = [error?.message, error?.details, error?.hint, error?.code]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    text.includes("column") &&
    (text.includes("does not exist") ||
      text.includes("schema cache") ||
      text.includes("not found"))
  );
}

function latestIso(values: Array<string | null | undefined>) {
  const latest = values
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => b - a)[0];

  return latest ? new Date(latest).toISOString() : null;
}

function normalizeEmail(value: string | null | undefined) {
  const text = value?.trim().toLowerCase();
  return text && text.includes("@") ? text : null;
}

function displayText(value: string | null | undefined, fallback: string) {
  const text = value?.trim();
  return text && text.length > 0 ? text : fallback;
}

function groupByWorkspace<T extends { workspace_id?: string | null; household_id?: string | null }>(
  rows: T[],
) {
  return rows.reduce<Map<string, T[]>>((map, row) => {
    const key = row.workspace_id ?? row.household_id;

    if (!key) {
      return map;
    }

    const current = map.get(key) ?? [];
    current.push(row);
    map.set(key, current);

    return map;
  }, new Map<string, T[]>());
}

function groupTeamMembers(rows: TeamMemberRow[]) {
  return rows.reduce<Map<string, TeamMemberRow[]>>((map, row) => {
    if (!row.household_id) {
      return map;
    }

    const current = map.get(row.household_id) ?? [];
    current.push(row);
    map.set(row.household_id, current);

    return map;
  }, new Map<string, TeamMemberRow[]>());
}

async function loadWorkspaceScopedRows(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  tableName: "missionary_field_people" | "missionary_tables",
  workspaceIds: string[],
) {
  const dateField =
    tableName === "missionary_field_people" ? "last_activity_at" : "table_date";
  const selectColumns = `id, workspace_id, household_id, ${dateField}, updated_at, created_at`;

  const byWorkspace = await supabase
    .from(tableName)
    .select(selectColumns)
    .in("workspace_id", workspaceIds);

  if (!byWorkspace.error) {
    return ((byWorkspace.data ?? []) as unknown) as WorkspaceScopedRow[];
  }

  if (!isMissingColumnError(byWorkspace.error)) {
    return [];
  }

  const byHousehold = await supabase
    .from(tableName)
    .select(`id, household_id, ${dateField}, updated_at, created_at`)
    .in("household_id", workspaceIds);

  return ((byHousehold.data ?? []) as unknown) as WorkspaceScopedRow[];
}

async function loadTeamMembers(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  workspaceIds: string[],
) {
  const withEmail = await supabase
    .from("missionary_team_members")
    .select("id, household_id, display_name, dos_user_id, status, updated_at, created_at")
    .in("household_id", workspaceIds);

  if (!withEmail.error) {
    return (withEmail.data ?? []) as TeamMemberRow[];
  }

  if (!isMissingColumnError(withEmail.error)) {
    return [];
  }

  const fallback = await supabase
    .from("missionary_team_members")
    .select("id, household_id, display_name, status, updated_at, created_at")
    .in("household_id", workspaceIds);

  return (fallback.data ?? []) as TeamMemberRow[];
}

export async function loadAdminWorkspaceIndex(): Promise<AdminWorkspaceIndexData> {
  if (!isSupabaseAdminConfigured()) {
    return {
      ...emptyWorkspaceIndex,
      error: "Supabase admin credentials are not configured.",
    };
  }

  const supabase = createSupabaseAdminClient();

  const householdsResult = await supabase
    .from("missionary_households")
    .select("id, slug, display_name, updated_at, created_at")
    .order("updated_at", { ascending: false, nullsFirst: false });

  if (householdsResult.error) {
    return {
      ...emptyWorkspaceIndex,
      error: "Unable to load DOS workspaces.",
    };
  }

  const households = (householdsResult.data ?? []) as HouseholdRow[];
  const workspaceIds = households.map((household) => household.id);

  if (workspaceIds.length === 0) {
    return emptyWorkspaceIndex;
  }

  const [
    peopleRows,
    meetingRows,
    teamMembers,
    organizationsResult,
    collectivesResult,
    profilesResult,
  ] = await Promise.all([
    loadWorkspaceScopedRows(supabase, "missionary_field_people", workspaceIds),
    loadWorkspaceScopedRows(supabase, "missionary_tables", workspaceIds),
    loadTeamMembers(supabase, workspaceIds),
    supabase.from("organizations").select("id, name, slug").order("name"),
    supabase.from("collectives").select("id, owner_organization_id, slug, name"),
    supabase.from("profiles").select("email, primary_collective_id"),
  ]);

  const organizations = ((organizationsResult.data ?? []) as OrganizationRow[]).filter(
    (organization) => organization.id && organization.name,
  );
  const collectives = (collectivesResult.data ?? []) as CollectiveRow[];
  const profiles = (profilesResult.data ?? []) as ProfileRow[];

  const peopleByWorkspace = groupByWorkspace(peopleRows);
  const meetingsByWorkspace = groupByWorkspace(meetingRows);
  const teamByHousehold = groupTeamMembers(teamMembers);
  const organizationById = new Map(
    organizations.map((organization) => [organization.id, organization]),
  );
  const collectiveBySlug = new Map(
    collectives
      .filter((collective) => collective.slug)
      .map((collective) => [collective.slug as string, collective]),
  );
  const collectiveById = new Map(
    collectives.map((collective) => [collective.id, collective]),
  );
  const profileByEmail = new Map(
    profiles
      .map((profile) => [normalizeEmail(profile.email), profile] as const)
      .filter(([email]) => Boolean(email)),
  );

  const workspaces = households.map<AdminWorkspaceIndexItem>((household) => {
    const people = peopleByWorkspace.get(household.id) ?? [];
    const meetings = meetingsByWorkspace.get(household.id) ?? [];
    const team = teamByHousehold.get(household.id) ?? [];
    const email = team.map((member) => normalizeEmail(member.dos_user_id)).find(Boolean) ?? null;
    const profile = email ? profileByEmail.get(email) : null;
    const slugCollective = household.slug ? collectiveBySlug.get(household.slug) : null;
    const profileCollective = profile?.primary_collective_id
      ? collectiveById.get(profile.primary_collective_id)
      : null;
    const collective = slugCollective ?? profileCollective ?? null;
    const organization = collective?.owner_organization_id
      ? organizationById.get(collective.owner_organization_id)
      : null;
    const userName =
      team
        .map((member) => member.display_name?.trim())
        .filter((value): value is string => Boolean(value))
        .join(" + ") || null;
    const workspaceName = displayText(
      household.display_name,
      household.slug ?? "Untitled workspace",
    );
    const lastActiveAt = latestIso([
      household.updated_at,
      household.created_at,
      ...team.flatMap((member) => [member.updated_at, member.created_at]),
      ...people.flatMap((person) => [
        person.last_activity_at,
        person.updated_at,
        person.created_at,
      ]),
      ...meetings.flatMap((meeting) => [
        meeting.table_date,
        meeting.updated_at,
        meeting.created_at,
      ]),
    ]);
    const status: AdminWorkspaceStatus =
      people.length > 0 || meetings.length > 0 ? "active" : "setup";

    return {
      id: household.id,
      slug: household.slug,
      workspaceName,
      userName,
      email,
      organizationId: organization?.id ?? null,
      organizationName: organization?.name ?? null,
      householdName: workspaceName,
      peopleCount: people.length,
      meetingsCount: meetings.length,
      lastActiveAt,
      status,
      previewHref: `/admin/workspaces/${household.id}/preview`,
    };
  });

  const organizationConnected = workspaces.filter((workspace) =>
    Boolean(workspace.organizationId),
  ).length;
  const activeWorkspaces = workspaces.filter(
    (workspace) => workspace.status === "active",
  ).length;

  return {
    stats: {
      totalWorkspaces: workspaces.length,
      activeWorkspaces,
      organizationConnected,
      independentUsers: workspaces.length - organizationConnected,
    },
    organizations: organizations.map((organization) => ({
      id: organization.id,
      name: organization.name ?? "Untitled organization",
    })),
    workspaces,
  };
}
