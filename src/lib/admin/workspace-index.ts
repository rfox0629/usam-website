import "server-only";

import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/src/lib/supabase/admin";

export type AdminWorkspaceStatus = "active" | "setup";
export type AdminWorkspaceType = "Church" | "Independent" | "Partner Organization" | "USA Missionaries";

export type AdminWorkspaceActivityItem = {
  detail: string;
  id: string;
  timestamp: string | null;
  title: string;
  type: "application" | "contact" | "fruit" | "meeting" | "prayer" | "profile";
};

export type AdminWorkspaceConnection = {
  assignedAdmin: string | null;
  label: string;
  role: string | null;
  status: string | null;
  type: AdminWorkspaceType;
};

export type AdminWorkspaceIndexItem = {
  activitySummary: string;
  circleHealth: {
    my3: number;
    my12: number;
    my70: number;
    my120: number;
  };
  currentStreak: number | null;
  displayName: string;
  email: string | null;
  householdId: string | null;
  householdName: string | null;
  householdSlug: string | null;
  id: string;
  isDemoData: boolean;
  lastActiveAt: string | null;
  location: string | null;
  metrics: {
    applications: number;
    followUps: number;
    fruitReviews: number;
    meetings: number;
    people: number;
    prayerRequests: number;
    profileViews: number;
  };
  organizationConnections: AdminWorkspaceConnection[];
  organizationId: string | null;
  organizationName: string | null;
  recentActivity: AdminWorkspaceActivityItem[];
  region: string | null;
  slug: string | null;
  state: string | null;
  status: AdminWorkspaceStatus;
  userName: string | null;
  workspaceName: string;
  workspaceType: AdminWorkspaceType;
  workspaceTypeReason: string;
};

export type AdminWorkspaceIndexData = {
  error?: string;
  stats: {
    churchWorkspaces: number;
    independent: number;
    partnerOrganizations: number;
    totalWorkspaces: number;
    usamMissionaries: number;
  };
  organizations: Array<{
    id: string;
    name: string;
    type: AdminWorkspaceType;
  }>;
  workspaces: AdminWorkspaceIndexItem[];
};

type SupabaseErrorLike = {
  code?: string | null;
  details?: string | null;
  hint?: string | null;
  message?: string | null;
};

type HouseholdRow = {
  created_at: string | null;
  display_name: string | null;
  hero_image_url?: string | null;
  id: string;
  location?: string | null;
  primary_state?: string | null;
  profile_image_url?: string | null;
  public_story?: string | null;
  public_visible?: boolean | null;
  region?: string | null;
  role_type?: string | null;
  short_mission?: string | null;
  show_household?: boolean | null;
  slug: string | null;
  updated_at: string | null;
  usam_application_id?: string | null;
  usam_application_status?: string | null;
  usam_assigned_admin_email?: string | null;
  usam_profile_status?: string | null;
};

type WorkspaceScopedRow = {
  created_at?: string | null;
  household_id?: string | null;
  id: string;
  missionary_profile_id?: string | null;
  profile_id?: string | null;
  related_household_id?: string | null;
  table_date?: string | null;
  updated_at?: string | null;
  workspace_id?: string | null;
};

type PersonRow = WorkspaceScopedRow & {
  last_activity_at?: string | null;
  name?: string | null;
  status?: string | null;
};

type MeetingRow = WorkspaceScopedRow & {
  participant_names?: string[] | null;
  table_type?: string | null;
};

type PrayerRow = WorkspaceScopedRow & {
  request?: string | null;
  status?: string | null;
  title?: string | null;
};

type FruitRow = WorkspaceScopedRow & {
  body?: string | null;
  cc_status?: string | null;
  source_app?: string | null;
  title?: string | null;
};

type ReviewRow = WorkspaceScopedRow & {
  follow_up_needed?: string | null;
  movement_step?: string | null;
  table_id?: string | null;
};

type ConnectionLogRow = WorkspaceScopedRow & {
  connection_date?: string | null;
  follow_up_needed?: string | null;
  interaction_type?: string | null;
  movement_step?: string | null;
};

type ProfileViewRow = {
  created_at?: string | null;
  household_id?: string | null;
  id: string;
  missionary_profile_id?: string | null;
  profile_id?: string | null;
  workspace_id?: string | null;
};

type TeamMemberRow = {
  created_at: string | null;
  display_name: string | null;
  dos_user_id?: string | null;
  household_id: string | null;
  id: string;
  role_title?: string | null;
  sort_order?: number | null;
  source?: string | null;
  status?: string | null;
  updated_at: string | null;
};

type OrganizationRow = {
  branding_mode: string | null;
  id: string;
  name: string | null;
  slug: string | null;
  type: string | null;
};

type CollectiveRow = {
  id: string;
  name: string | null;
  owner_organization_id: string | null;
  slug: string | null;
};

type ProfileRow = {
  email: string | null;
  primary_collective_id: string | null;
};

type ApplicationRow = {
  assigned_admin_email: string | null;
  created_at: string | null;
  id: string;
  missionary_profile_id: string | null;
  organization_id: string | null;
  reviewed_at: string | null;
  status: string | null;
  submitted_at: string | null;
  updated_at: string | null;
  workspace_id: string | null;
};

type ScoreRow = {
  circle_assignment: string | null;
  id: string;
  person_id: string | null;
  workspace_id: string | null;
};

const emptyWorkspaceIndex: AdminWorkspaceIndexData = {
  stats: {
    churchWorkspaces: 0,
    independent: 0,
    partnerOrganizations: 0,
    totalWorkspaces: 0,
    usamMissionaries: 0,
  },
  organizations: [],
  workspaces: [],
};

const householdExtendedSelect = [
  "id",
  "slug",
  "display_name",
  "location",
  "primary_state",
  "region",
  "role_type",
  "short_mission",
  "profile_image_url",
  "hero_image_url",
  "public_story",
  "public_visible",
  "show_household",
  "usam_application_id",
  "usam_application_status",
  "usam_assigned_admin_email",
  "usam_profile_status",
  "updated_at",
  "created_at",
].join(", ");
const householdFallbackSelect = "id, slug, display_name, updated_at, created_at";

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

function isMissingTableError(error: SupabaseErrorLike | null | undefined, tableName: string) {
  const text = [error?.message, error?.details, error?.hint, error?.code]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    text.includes(tableName.toLowerCase()) &&
    (text.includes("does not exist") || text.includes("schema cache") || text.includes("relation"))
  );
}

function latestIso(values: Array<string | null | undefined>) {
  const latest = values
    .filter((value): value is string => Boolean(value))
    .map((value) => {
      const normalized = value.includes("T") ? value : `${value}T12:00:00`;

      return new Date(normalized).getTime();
    })
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => b - a)[0];

  return latest ? new Date(latest).toISOString() : null;
}

function normalizeText(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function normalizeKey(value: string | null | undefined) {
  return normalizeText(value).toLowerCase();
}

function normalizeEmail(value: string | null | undefined) {
  const text = normalizeKey(value);

  return text && text.includes("@") ? text : null;
}

function displayText(value: string | null | undefined, fallback: string) {
  const text = normalizeText(value);

  return text.length > 0 ? text : fallback;
}

function scopedRowWorkspaceId(row: WorkspaceScopedRow) {
  return row.workspace_id ?? row.household_id ?? row.related_household_id ?? row.missionary_profile_id ?? row.profile_id ?? null;
}

function rowTimestamp(row: WorkspaceScopedRow) {
  return row.updated_at ?? row.table_date ?? row.created_at ?? null;
}

function groupByWorkspace<T extends WorkspaceScopedRow>(rows: T[]) {
  return rows.reduce<Map<string, T[]>>((map, row) => {
    const key = scopedRowWorkspaceId(row);

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

function mapById<T extends { id: string }>(rows: T[]) {
  return new Map(rows.map((row) => [row.id, row]));
}

function isUsamOrganization(organization: Pick<OrganizationRow, "branding_mode" | "slug"> | null | undefined) {
  return organization?.branding_mode === "usam" || organization?.slug === "usa-missionaries";
}

function organizationWorkspaceType(organization: OrganizationRow | null | undefined): AdminWorkspaceType {
  if (!organization) {
    return "Independent";
  }

  if (isUsamOrganization(organization)) {
    return "USA Missionaries";
  }

  if (organization.type === "church") {
    return "Church";
  }

  return "Partner Organization";
}

function statusLabel(value: string | null | undefined) {
  const status = normalizeText(value);

  if (!status) {
    return null;
  }

  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function workspaceLocation(household: HouseholdRow, linkedHousehold: HouseholdRow) {
  return normalizeText(linkedHousehold.location) || normalizeText(household.location) || null;
}

function workspaceState(household: HouseholdRow, linkedHousehold: HouseholdRow) {
  return normalizeText(linkedHousehold.primary_state) || normalizeText(household.primary_state) || null;
}

function workspaceRegion(household: HouseholdRow, linkedHousehold: HouseholdRow) {
  return normalizeText(linkedHousehold.region) || normalizeText(household.region) || null;
}

function currentStreakDays(meetings: MeetingRow[]) {
  const dates = Array.from(new Set(meetings
    .map((meeting) => meeting.table_date)
    .filter((value): value is string => Boolean(value))
    .map((value) => value.slice(0, 10))))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  if (dates.length === 0) {
    return null;
  }

  let streak = 0;
  let cursor = new Date();
  cursor.setHours(12, 0, 0, 0);

  for (const date of dates) {
    const current = new Date(`${date}T12:00:00`);
    const diffDays = Math.round((cursor.getTime() - current.getTime()) / 86_400_000);

    if (streak === 0 && diffDays > 7) {
      break;
    }

    if (diffDays <= 7) {
      streak += 1;
      cursor = current;
      continue;
    }

    break;
  }

  return streak;
}

function circleCounts(scores: ScoreRow[], peopleCount: number) {
  const direct = scores.reduce(
    (counts, score) => {
      switch (score.circle_assignment) {
        case "three":
          counts.my3 += 1;
          break;
        case "twelve":
          counts.my12 += 1;
          break;
        case "seventy":
          counts.my70 += 1;
          break;
        case "my_120":
          counts.my120 += 1;
          break;
        default:
          break;
      }

      return counts;
    },
    { my3: 0, my12: 0, my70: 0, my120: 0 },
  );

  if (scores.length > 0) {
    return {
      my3: Math.min(3, direct.my3),
      my12: Math.min(12, direct.my3 + direct.my12),
      my70: Math.min(70, direct.my3 + direct.my12 + direct.my70),
      my120: Math.min(120, direct.my3 + direct.my12 + direct.my70 + direct.my120),
    };
  }

  return {
    my3: Math.min(3, peopleCount),
    my12: Math.min(12, peopleCount),
    my70: Math.min(70, peopleCount),
    my120: Math.min(120, peopleCount),
  };
}

function isDemoWorkspace(household: HouseholdRow, team: TeamMemberRow[]) {
  const text = [
    household.display_name,
    household.slug,
    ...team.map((member) => member.display_name),
    ...team.map((member) => member.source),
  ].map(normalizeKey).join(" ");

  return (
    /\b(demo|sample|seed|test)\b/.test(text) ||
    text.includes("john doe") ||
    normalizeKey(household.display_name) === "test"
  );
}

function compactHouseholdName(name: string, isDemoData: boolean) {
  const normalized = displayText(name, "Untitled workspace");
  const plusSeparatedNames = normalized
    .split(/\s+\+\s+|\s*,\s*/)
    .map((part) => part.trim())
    .filter(Boolean);

  const compactName = plusSeparatedNames.length > 2
    ? plusSeparatedNames.slice(0, 2).join(" & ")
    : normalized;

  if (!isDemoData) {
    return compactName;
  }

  const withoutDemoSuffix = compactName
    .replace(/\s+(household\s+)?demo$/i, "")
    .replace(/\s+test$/i, "")
    .trim();
  const baseName = withoutDemoSuffix || compactName;

  return `${baseName} Household Demo`;
}

function workspaceDisplayName({
  isDemoData,
  userName,
  workspaceName,
}: {
  isDemoData: boolean;
  userName: string | null;
  workspaceName: string;
}) {
  if (isDemoData) {
    return compactHouseholdName(workspaceName, true);
  }

  const candidate = userName ?? workspaceName;

  if (candidate.includes(" + ") || candidate.length > 44) {
    return compactHouseholdName(workspaceName, false);
  }

  return candidate;
}

function primaryUserName(workspaceName: string, team: TeamMemberRow[]) {
  const activeTeam = team.filter((member) => member.status !== "archived" && member.status !== "inactive");

  if (activeTeam.length > 1 && /(?:&|\band\b)/i.test(workspaceName)) {
    return workspaceName;
  }

  const missionary = activeTeam.find((member) => {
    const role = normalizeKey(member.role_title);

    return role.includes("missionary") || role.includes("disciple maker") || role.includes("owner");
  });

  return missionary?.display_name?.trim()
    || activeTeam.find((member) => member.display_name?.trim())?.display_name?.trim()
    || workspaceName;
}

function activityTitle(type: AdminWorkspaceActivityItem["type"], fallback: string) {
  return {
    application: fallback || "Application activity",
    contact: fallback || "Contact added",
    fruit: fallback || "Fruit submitted",
    meeting: fallback || "Meeting logged",
    prayer: fallback || "Prayer request created",
    profile: fallback || "Profile updated",
  }[type];
}

async function safeSelect<T>(
  promise: PromiseLike<{ data: unknown; error: SupabaseErrorLike | null }>,
  tableName: string,
) {
  const result = await promise;

  if (!result.error) {
    return (result.data ?? []) as T[];
  }

  if (isMissingTableError(result.error, tableName) || isMissingColumnError(result.error)) {
    return [];
  }

  return [];
}

async function loadScopedRows<T extends WorkspaceScopedRow>(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  tableName: string,
  selectColumns: string,
  workspaceIds: string[],
  fields: Array<"household_id" | "missionary_profile_id" | "profile_id" | "related_household_id" | "workspace_id"> = ["workspace_id", "household_id"],
) {
  if (workspaceIds.length === 0) {
    return [];
  }

  const filter = fields
    .flatMap((field) => workspaceIds.map((id) => `${field}.eq.${id}`))
    .join(",");

  return safeSelect<T>(
    supabase
      .from(tableName)
      .select(selectColumns)
      .or(filter),
    tableName,
  );
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
    .select(householdExtendedSelect)
    .order("updated_at", { ascending: false, nullsFirst: false });
  const fallbackHouseholdsResult = householdsResult.error && isMissingColumnError(householdsResult.error)
    ? await supabase
      .from("missionary_households")
      .select(householdFallbackSelect)
      .order("updated_at", { ascending: false, nullsFirst: false })
    : householdsResult;

  if (fallbackHouseholdsResult.error) {
    return {
      ...emptyWorkspaceIndex,
      error: "Unable to load DOS workspaces.",
    };
  }

  const households = (fallbackHouseholdsResult.data ?? []) as HouseholdRow[];
  const workspaceIds = households.map((household) => household.id);

  if (workspaceIds.length === 0) {
    return emptyWorkspaceIndex;
  }

  const [
    peopleRows,
    meetingRows,
    prayerRows,
    fruitRows,
    reviewRows,
    connectionRows,
    scoreRows,
    profileViewRows,
    teamMembers,
    organizationsResult,
    collectivesResult,
    profilesResult,
    applicationsResult,
  ] = await Promise.all([
    loadScopedRows<PersonRow>(
      supabase,
      "missionary_field_people",
      "id, workspace_id, household_id, name, status, last_activity_at, updated_at, created_at",
      workspaceIds,
    ),
    loadScopedRows<MeetingRow>(
      supabase,
      "missionary_tables",
      "id, workspace_id, household_id, table_type, table_date, participant_names, updated_at, created_at",
      workspaceIds,
    ),
    loadScopedRows<PrayerRow>(
      supabase,
      "prayer_requests",
      "id, workspace_id, household_id, related_household_id, title, request, status, updated_at, created_at",
      workspaceIds,
      ["workspace_id", "household_id", "related_household_id"],
    ),
    loadScopedRows<FruitRow>(
      supabase,
      "missionary_fruit_items",
      "id, workspace_id, household_id, title, body, source_app, cc_status, updated_at, created_at",
      workspaceIds,
    ),
    loadScopedRows<ReviewRow>(
      supabase,
      "missionary_table_reviews",
      "id, workspace_id, household_id, table_id, follow_up_needed, movement_step, updated_at, created_at",
      workspaceIds,
    ),
    loadScopedRows<ConnectionLogRow>(
      supabase,
      "missionary_connection_logs",
      "id, workspace_id, household_id, field_person_id, interaction_type, connection_date, follow_up_needed, movement_step, updated_at, created_at",
      workspaceIds,
    ),
    safeSelect<ScoreRow>(
      supabase
        .from("dos_relationship_scores")
        .select("id, workspace_id, person_id, circle_assignment")
        .in("workspace_id", workspaceIds),
      "dos_relationship_scores",
    ),
    loadScopedRows<ProfileViewRow>(
      supabase,
      "missionary_profile_views",
      "id, workspace_id, household_id, missionary_profile_id, profile_id, created_at",
      workspaceIds,
      ["workspace_id", "household_id", "missionary_profile_id", "profile_id"],
    ),
    safeSelect<TeamMemberRow>(
      supabase
        .from("missionary_team_members")
        .select("id, household_id, display_name, role_title, dos_user_id, status, source, sort_order, updated_at, created_at")
        .in("household_id", workspaceIds),
      "missionary_team_members",
    ),
    supabase.from("organizations").select("id, name, slug, type, branding_mode").order("name"),
    supabase.from("collectives").select("id, owner_organization_id, slug, name"),
    supabase.from("profiles").select("email, primary_collective_id"),
    safeSelect<ApplicationRow>(
      supabase
        .from("usam_missionary_applications")
        .select("id, workspace_id, missionary_profile_id, organization_id, status, assigned_admin_email, submitted_at, reviewed_at, updated_at, created_at")
        .or(workspaceIds.flatMap((id) => [`workspace_id.eq.${id}`, `missionary_profile_id.eq.${id}`]).join(",")),
      "usam_missionary_applications",
    ),
  ]);

  const organizations = ((organizationsResult.data ?? []) as OrganizationRow[]).filter(
    (organization) => organization.id && organization.name,
  );
  const collectives = (collectivesResult.data ?? []) as CollectiveRow[];
  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const householdsById = mapById(households);
  const peopleByWorkspace = groupByWorkspace(peopleRows);
  const meetingsByWorkspace = groupByWorkspace(meetingRows);
  const prayersByWorkspace = groupByWorkspace(prayerRows);
  const fruitByWorkspace = groupByWorkspace(fruitRows);
  const reviewsByWorkspace = groupByWorkspace(reviewRows);
  const connectionsByWorkspace = groupByWorkspace(connectionRows);
  const scoresByWorkspace = groupByWorkspace(scoreRows as Array<ScoreRow & WorkspaceScopedRow>);
  const profileViewsByWorkspace = groupByWorkspace(profileViewRows as Array<ProfileViewRow & WorkspaceScopedRow>);
  const teamByHousehold = groupTeamMembers(teamMembers);
  const organizationById = new Map(organizations.map((organization) => [organization.id, organization]));
  const collectiveBySlug = new Map(
    collectives
      .filter((collective) => collective.slug)
      .map((collective) => [collective.slug as string, collective]),
  );
  const collectiveById = new Map(collectives.map((collective) => [collective.id, collective]));
  const profileByEmail = new Map(
    profiles
      .map((profile) => [normalizeEmail(profile.email), profile] as const)
      .filter(([email]) => Boolean(email)),
  );
  const applicationsByWorkspace = new Map<string, ApplicationRow[]>();
  const applicationsByProfile = new Map<string, ApplicationRow[]>();

  applicationsResult.forEach((application) => {
    if (application.workspace_id) {
      const current = applicationsByWorkspace.get(application.workspace_id) ?? [];
      current.push(application);
      applicationsByWorkspace.set(application.workspace_id, current);
    }

    if (application.missionary_profile_id) {
      const current = applicationsByProfile.get(application.missionary_profile_id) ?? [];
      current.push(application);
      applicationsByProfile.set(application.missionary_profile_id, current);
    }
  });

  const usamNameBridge = new Map<string, { application: ApplicationRow; household: HouseholdRow; organization: OrganizationRow | null }>();

  applicationsResult.forEach((application) => {
    if (!application.missionary_profile_id || application.status === "archived" || application.status === "declined" || application.status === "rejected") {
      return;
    }

    const organization = application.organization_id ? organizationById.get(application.organization_id) ?? null : null;

    if (!isUsamOrganization(organization)) {
      return;
    }

    const household = householdsById.get(application.missionary_profile_id);

    if (!household) {
      return;
    }

    (teamByHousehold.get(household.id) ?? []).forEach((member) => {
      const memberName = normalizeKey(member.display_name);

      if (memberName) {
        usamNameBridge.set(memberName, { application, household, organization });
      }
    });
  });

  const workspaces = households.map<AdminWorkspaceIndexItem>((household) => {
    const people = peopleByWorkspace.get(household.id) ?? [];
    const meetings = meetingsByWorkspace.get(household.id) ?? [];
    const prayers = prayersByWorkspace.get(household.id) ?? [];
    const fruit = fruitByWorkspace.get(household.id) ?? [];
    const reviews = reviewsByWorkspace.get(household.id) ?? [];
    const connections = connectionsByWorkspace.get(household.id) ?? [];
    const scores = scoresByWorkspace.get(household.id) ?? [];
    const profileViews = profileViewsByWorkspace.get(household.id) ?? [];
    const team = teamByHousehold.get(household.id) ?? [];
    const email = team.map((member) => normalizeEmail(member.dos_user_id)).find(Boolean) ?? null;
    const profile = email ? profileByEmail.get(email) : null;
    const slugCollective = household.slug ? collectiveBySlug.get(household.slug) : null;
    const profileCollective = profile?.primary_collective_id
      ? collectiveById.get(profile.primary_collective_id)
      : null;
    const collective = slugCollective ?? profileCollective ?? null;
    const collectiveOrganization = collective?.owner_organization_id
      ? organizationById.get(collective.owner_organization_id)
      : null;
    const directApplication = [
      ...(applicationsByWorkspace.get(household.id) ?? []),
      ...(applicationsByProfile.get(household.id) ?? []),
    ].filter((application, index, array) => array.findIndex((item) => item.id === application.id) === index)[0] ?? null;
    const workspaceName = displayText(household.display_name, household.slug ?? "Untitled workspace");
    const userName = primaryUserName(workspaceName, team);
    const bridge = usamNameBridge.get(normalizeKey(userName)) ?? usamNameBridge.get(normalizeKey(workspaceName)) ?? null;
    const bridgedApplication = bridge?.application ?? null;
    const application = bridgedApplication ?? directApplication;
    const organization = bridge?.organization
      ?? (application?.organization_id ? organizationById.get(application.organization_id) ?? null : null)
      ?? collectiveOrganization
      ?? null;
    const linkedHousehold = bridge?.household
      ?? (application?.missionary_profile_id ? householdsById.get(application.missionary_profile_id) ?? null : null)
      ?? household;
    const workspaceType = organizationWorkspaceType(organization);
    const applicationCount = [
      ...(applicationsByWorkspace.get(household.id) ?? []),
      ...(linkedHousehold.id !== household.id ? applicationsByProfile.get(linkedHousehold.id) ?? [] : []),
    ].filter((applicationRow, index, array) => array.findIndex((item) => item.id === applicationRow.id) === index).length;
    const followUps = people.filter((person) => person.status === "follow_up").length
      + reviews.filter((review) => Boolean(review.follow_up_needed?.trim())).length
      + connections.filter((connection) => Boolean(connection.follow_up_needed?.trim())).length;
    const fruitReviews = fruit.filter((item) => item.cc_status === "pending_review" || item.source_app === "dos_quick_review").length;
    const circleHealth = circleCounts(scores, people.length);
    const lastActiveAt = latestIso([
      household.updated_at,
      household.created_at,
      linkedHousehold.updated_at,
      linkedHousehold.created_at,
      application?.updated_at,
      application?.submitted_at,
      application?.reviewed_at,
      ...team.flatMap((member) => [member.updated_at, member.created_at]),
      ...people.flatMap((person) => [person.last_activity_at, person.updated_at, person.created_at]),
      ...meetings.flatMap((meeting) => [meeting.table_date, meeting.updated_at, meeting.created_at]),
      ...prayers.flatMap((prayer) => [prayer.updated_at, prayer.created_at]),
      ...fruit.flatMap((item) => [item.updated_at, item.created_at]),
      ...reviews.flatMap((review) => [review.updated_at, review.created_at]),
      ...connections.flatMap((connection) => [connection.connection_date, connection.updated_at, connection.created_at]),
    ]);
    const recentActivity = [
      ...meetings.map((meeting) => ({
        detail: meeting.participant_names?.filter(Boolean).join(", ") || "Meeting logged",
        id: `meeting-${meeting.id}`,
        timestamp: latestIso([meeting.table_date, meeting.updated_at, meeting.created_at]),
        title: activityTitle("meeting", `${statusLabel(meeting.table_type) ?? "Meeting"} logged`),
        type: "meeting" as const,
      })),
      ...people.map((person) => ({
        detail: person.status ? statusLabel(person.status) ?? "Contact" : "Contact added",
        id: `contact-${person.id}`,
        timestamp: latestIso([person.last_activity_at, person.updated_at, person.created_at]),
        title: activityTitle("contact", person.name ? `${person.name} added` : "Contact added"),
        type: "contact" as const,
      })),
      ...prayers.map((prayer) => ({
        detail: prayer.request ?? prayer.title ?? "Prayer request",
        id: `prayer-${prayer.id}`,
        timestamp: latestIso([prayer.updated_at, prayer.created_at]),
        title: activityTitle("prayer", prayer.title ?? "Prayer request created"),
        type: "prayer" as const,
      })),
      ...fruit.map((item) => ({
        detail: item.body ?? item.source_app ?? "Fruit review",
        id: `fruit-${item.id}`,
        timestamp: latestIso([item.updated_at, item.created_at]),
        title: activityTitle("fruit", item.title ?? (item.cc_status === "pending_review" ? "Fruit review submitted" : "Fruit submitted")),
        type: "fruit" as const,
      })),
      ...(application ? [{
        detail: `${statusLabel(application.status) ?? "Application"}${organization?.name ? ` · ${organization.name}` : ""}`,
        id: `application-${application.id}`,
        timestamp: latestIso([application.reviewed_at, application.submitted_at, application.updated_at, application.created_at]),
        title: activityTitle("application", application.status === "active" || application.status === "approved" ? "Application approved" : "Application submitted"),
        type: "application" as const,
      }] : []),
      ...(linkedHousehold.updated_at ? [{
        detail: linkedHousehold.display_name ?? "Profile",
        id: `profile-${linkedHousehold.id}`,
        timestamp: linkedHousehold.updated_at,
        title: activityTitle("profile", "Profile updated"),
        type: "profile" as const,
      }] : []),
    ]
      .filter((item) => Boolean(item.timestamp))
      .sort((a, b) => new Date(b.timestamp ?? "").getTime() - new Date(a.timestamp ?? "").getTime())
      .slice(0, 8);
    const metrics = {
      applications: applicationCount,
      followUps,
      fruitReviews,
      meetings: meetings.length,
      people: people.length,
      prayerRequests: prayers.length,
      profileViews: profileViews.length,
    };
    const activitySummary = [
      `${people.length} people`,
      `${meetings.length} meetings`,
      `${followUps} follow-ups`,
      `${fruitReviews} fruit reviews`,
    ].join(" · ");
    const status: AdminWorkspaceStatus = people.length > 0 || meetings.length > 0 || prayers.length > 0 || fruit.length > 0
      ? "active"
      : "setup";
    const primaryConnection: AdminWorkspaceConnection = {
      assignedAdmin: application?.assigned_admin_email ?? linkedHousehold.usam_assigned_admin_email ?? household.usam_assigned_admin_email ?? null,
      label: organization?.name ?? "Independent",
      role: workspaceType === "USA Missionaries"
        ? statusLabel(linkedHousehold.role_type) ?? "Missionary"
        : collective?.name ?? null,
      status: statusLabel(application?.status ?? linkedHousehold.usam_application_status ?? household.usam_application_status),
      type: workspaceType,
    };
    const isDemoData = isDemoWorkspace(household, team);
    const householdName = compactHouseholdName(displayText(linkedHousehold.display_name, workspaceName), isDemoData);
    const displayName = workspaceDisplayName({ isDemoData, userName, workspaceName });

    return {
      activitySummary,
      circleHealth,
      currentStreak: currentStreakDays(meetings),
      displayName,
      email,
      householdId: linkedHousehold.id,
      householdName,
      householdSlug: linkedHousehold.slug,
      id: household.id,
      isDemoData,
      lastActiveAt,
      location: workspaceLocation(household, linkedHousehold),
      metrics,
      organizationConnections: [primaryConnection],
      organizationId: organization?.id ?? null,
      organizationName: organization?.name ?? null,
      recentActivity,
      region: workspaceRegion(household, linkedHousehold),
      slug: household.slug,
      state: workspaceState(household, linkedHousehold),
      status,
      userName,
      workspaceName,
      workspaceType,
      workspaceTypeReason: workspaceType === "Independent"
        ? "No organization metadata is connected to this workspace yet."
        : bridge
          ? "Rolled up through the approved USA Missionaries household profile."
          : "Connected through organization metadata.",
    };
  });

  const stats = {
    churchWorkspaces: workspaces.filter((workspace) => workspace.workspaceType === "Church").length,
    independent: workspaces.filter((workspace) => workspace.workspaceType === "Independent").length,
    partnerOrganizations: workspaces.filter((workspace) => workspace.workspaceType === "Partner Organization").length,
    totalWorkspaces: workspaces.length,
    usamMissionaries: workspaces.filter((workspace) => workspace.workspaceType === "USA Missionaries").length,
  };

  return {
    stats,
    organizations: organizations.map((organization) => ({
      id: organization.id,
      name: organization.name ?? "Untitled organization",
      type: organizationWorkspaceType(organization),
    })),
    workspaces: workspaces.sort((a, b) => {
      const aTime = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
      const bTime = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;

      return bTime - aTime || a.workspaceName.localeCompare(b.workspaceName);
    }),
  };
}
