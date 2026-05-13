import "server-only";

import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;
type SupabaseQueryError = { message?: string } | null | undefined;

export const dosAppMeetingTypes = ["kitchen_table", "coffee", "phone", "zoom", "text", "prayer", "group", "discipleship", "other"] as const;
export const dosAppOutcomeTags = [
  "Salvation",
  "Baptism",
  "Healing",
  "Deliverance",
  "Church Connection",
  "Discipleship",
  "Prayer Answered",
  "Other",
] as const;

export type DosAppMeetingType = typeof dosAppMeetingTypes[number];
export type DosAppOutcomeTag = typeof dosAppOutcomeTags[number];

export type DosAppWorkspace = {
  displayName: string;
  id: string;
  profileImageUrl: string | null;
  publicProfileHref: string;
  shortMission: string | null;
  slug: string;
};

export type DosAppPerson = {
  church: string | null;
  email: string | null;
  engagementLevel: string | null;
  id: string;
  lastActivityAt: string | null;
  name: string;
  notes: string | null;
  phone: string;
  relationshipType: string | null;
  status: string;
  updatedAt: string | null;
};

export type DosAppMeeting = {
  date: string | null;
  fieldPersonIds: string[];
  id: string;
  notes: string | null;
  participantNames: string[];
  source: "connection" | "table";
  title: string;
  type: DosAppMeetingType;
  updatedAt: string | null;
};

export type DosAppFruit = {
  fieldPersonId: string | null;
  id: string;
  outcomeTags: DosAppOutcomeTag[];
  status: string;
  summary: string;
  testimonyDate: string | null;
  updatedAt: string | null;
};

export type DosAppData = {
  fruit: DosAppFruit[];
  meetings: DosAppMeeting[];
  people: DosAppPerson[];
  stats: {
    approvedFruit: number;
    connectionsCount: number;
    fruitCount: number;
    meetingsCount: number;
    peopleCount: number;
  };
  workspace: DosAppWorkspace;
};

type LoadResult<T> =
  | { data: T; status: "ready" }
  | { message: string; status: "error" }
  | { status: "not_found" };

type HouseholdRow = {
  display_name: string;
  id: string;
  profile_image_url: string | null;
  short_mission: string | null;
  slug: string;
};

type FieldPersonRow = {
  church: string | null;
  email: string | null;
  engagement_level: string | null;
  id: string;
  last_activity_at: string | null;
  name: string;
  notes: string | null;
  phone: string;
  relationship_type: string | null;
  status: string | null;
  updated_at: string | null;
};

type MeetingRow = {
  created_at?: string | null;
  field_person_ids: string[] | null;
  id: string;
  notes: string | null;
  participant_names: string[] | null;
  table_date: string | null;
  table_type: string | null;
  updated_at: string | null;
};

type ConnectionLogRow = {
  connection_date: string | null;
  created_at?: string | null;
  field_person_id: string | null;
  follow_up_needed: string | null;
  id: string;
  interaction_type: string | null;
  notes: string | null;
  updated_at: string | null;
};

type FruitRow = {
  body: string;
  cc_status: string | null;
  field_person_id: string | null;
  id: string;
  outcome_tags: string[] | null;
  testimony_date: string | null;
  updated_at: string | null;
};

function mapMeetingType(value: string | null): DosAppMeetingType {
  return dosAppMeetingTypes.includes(value as DosAppMeetingType) ? value as DosAppMeetingType : "other";
}

function mapConnectionType(value: string | null): DosAppMeetingType {
  const normalized = value?.toLowerCase() ?? "";

  if (normalized.includes("coffee")) {
    return "coffee";
  }

  if (normalized.includes("phone")) {
    return "phone";
  }

  if (normalized.includes("zoom")) {
    return "zoom";
  }

  if (normalized.includes("text")) {
    return "text";
  }

  if (normalized.includes("prayer")) {
    return "prayer";
  }

  if (normalized.includes("disciple")) {
    return "discipleship";
  }

  return "other";
}

function mapOutcomeTags(value: string[] | null | undefined): DosAppOutcomeTag[] {
  return Array.isArray(value)
    ? value.filter((tag): tag is DosAppOutcomeTag => dosAppOutcomeTags.includes(tag as DosAppOutcomeTag))
    : [];
}

function workspaceScopeFilter(workspaceId: string) {
  return `workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`;
}

export function isMissingWorkspaceScopeColumn(error: SupabaseQueryError) {
  return Boolean(error?.message?.includes("workspace_id"));
}

function isMissingWorkflowTable(error: SupabaseQueryError, tableName: string) {
  const message = error?.message?.toLowerCase() ?? "";

  return message.includes(tableName)
    && (message.includes("does not exist")
      || message.includes("relation")
      || message.includes("schema cache")
      || message.includes("could not find"));
}

function activityDateValue(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  const normalizedValue = value.includes("T") ? value : `${value}T12:00:00`;
  const timestamp = new Date(normalizedValue).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function latestActivityDate(...values: Array<string | null | undefined>) {
  return values
    .filter((value): value is string => Boolean(value))
    .sort((first, second) => activityDateValue(second) - activityDateValue(first))[0] ?? null;
}

async function loadPeopleForWorkspace(supabase: SupabaseAdminClient, workspaceId: string) {
  const scopedResult = await supabase
    .from("missionary_field_people")
    .select("id, name, phone, email, church, notes, status, relationship_type, engagement_level, last_activity_at, updated_at")
    .or(workspaceScopeFilter(workspaceId))
    .order("last_activity_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false });

  // TODO: Remove the household_id-only fallback after all Supabase environments
  // have the Command Center workspace_id migration applied.
  return scopedResult.error && isMissingWorkspaceScopeColumn(scopedResult.error)
    ? supabase
      .from("missionary_field_people")
      .select("id, name, phone, email, church, notes, status, relationship_type, engagement_level, last_activity_at, updated_at")
      .eq("household_id", workspaceId)
      .order("last_activity_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false })
    : scopedResult;
}

async function loadMeetingsForWorkspace(supabase: SupabaseAdminClient, workspaceId: string) {
  const scopedResult = await supabase
    .from("missionary_tables")
    .select("id, table_type, table_date, notes, participant_names, field_person_ids, created_at, updated_at")
    .or(workspaceScopeFilter(workspaceId))
    .order("table_date", { ascending: false })
    .order("created_at", { ascending: false });

  return scopedResult.error && isMissingWorkspaceScopeColumn(scopedResult.error)
    ? supabase
      .from("missionary_tables")
      .select("id, table_type, table_date, notes, participant_names, field_person_ids, created_at, updated_at")
      .eq("household_id", workspaceId)
      .order("table_date", { ascending: false })
      .order("created_at", { ascending: false })
    : scopedResult;
}

async function loadConnectionLogsForWorkspace(supabase: SupabaseAdminClient, workspaceId: string) {
  const scopedResult = await supabase
    .from("missionary_connection_logs")
    .select("id, field_person_id, connection_date, interaction_type, notes, follow_up_needed, created_at, updated_at")
    .or(workspaceScopeFilter(workspaceId))
    .order("connection_date", { ascending: false })
    .order("created_at", { ascending: false });

  const result = scopedResult.error && isMissingWorkspaceScopeColumn(scopedResult.error)
    ? await supabase
      .from("missionary_connection_logs")
      .select("id, field_person_id, connection_date, interaction_type, notes, follow_up_needed, created_at, updated_at")
      .eq("household_id", workspaceId)
      .order("connection_date", { ascending: false })
      .order("created_at", { ascending: false })
    : scopedResult;

  return result.error && isMissingWorkflowTable(result.error, "missionary_connection_logs")
    ? { data: [], error: null }
    : result;
}

async function loadFruitForWorkspace(supabase: SupabaseAdminClient, workspaceId: string) {
  const scopedResult = await supabase
    .from("missionary_fruit_items")
    .select("id, body, outcome_tags, cc_status, field_person_id, testimony_date, updated_at")
    .or(workspaceScopeFilter(workspaceId))
    .order("testimony_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  return scopedResult.error && isMissingWorkspaceScopeColumn(scopedResult.error)
    ? supabase
      .from("missionary_fruit_items")
      .select("id, body, outcome_tags, cc_status, field_person_id, testimony_date, updated_at")
      .eq("household_id", workspaceId)
      .order("testimony_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
    : scopedResult;
}

async function loadWorkspace(workspaceSlug?: string | null): Promise<LoadResult<HouseholdRow>> {
  if (!isSupabaseAdminConfigured()) {
    return {
      message: "Supabase admin environment variables are not configured.",
      status: "error",
    };
  }

  const supabase = createSupabaseAdminClient();
  const baseSelect = "id, slug, display_name, short_mission, profile_image_url";
  const query = supabase.from("missionary_households").select(baseSelect);
  const { data, error } = workspaceSlug
    ? await query.eq("slug", workspaceSlug).maybeSingle()
    : await query.order("sort_order", { ascending: true }).order("updated_at", { ascending: false }).limit(1).maybeSingle();

  if (error) {
    return {
      message: error.message,
      status: "error",
    };
  }

  if (!data) {
    return { status: "not_found" };
  }

  return {
    data: data as HouseholdRow,
    status: "ready",
  };
}

export async function loadDosAppData(workspaceSlug?: string | null): Promise<LoadResult<DosAppData>> {
  const workspaceResult = await loadWorkspace(workspaceSlug);

  if (workspaceResult.status !== "ready") {
    return workspaceResult;
  }

  const workspace = workspaceResult.data;
  const supabase = createSupabaseAdminClient();
  const [peopleResult, meetingsResult, connectionLogsResult, fruitResult] = await Promise.all([
    loadPeopleForWorkspace(supabase, workspace.id),
    loadMeetingsForWorkspace(supabase, workspace.id),
    loadConnectionLogsForWorkspace(supabase, workspace.id),
    loadFruitForWorkspace(supabase, workspace.id),
  ]);

  if (peopleResult.error || meetingsResult.error || connectionLogsResult.error || fruitResult.error) {
    return {
      message: peopleResult.error?.message
        ?? meetingsResult.error?.message
        ?? connectionLogsResult.error?.message
        ?? fruitResult.error?.message
        ?? "Unable to load DOS app data.",
      status: "error",
    };
  }

  const meetingRows = (meetingsResult.data ?? []) as MeetingRow[];
  const connectionRows = (connectionLogsResult.data ?? []) as ConnectionLogRow[];
  const latestActivityByPersonId = new Map<string, string>();

  meetingRows.forEach((meeting) => {
    const activityDate = latestActivityDate(meeting.table_date, meeting.updated_at, meeting.created_at);

    meeting.field_person_ids?.forEach((personId) => {
      const currentDate = latestActivityByPersonId.get(personId);
      const latestDate = latestActivityDate(activityDate, currentDate);

      if (latestDate) {
        latestActivityByPersonId.set(personId, latestDate);
      }
    });
  });

  connectionRows.forEach((connection) => {
    if (!connection.field_person_id) {
      return;
    }

    const activityDate = latestActivityDate(connection.connection_date, connection.updated_at, connection.created_at);
    const currentDate = latestActivityByPersonId.get(connection.field_person_id);
    const latestDate = latestActivityDate(activityDate, currentDate);

    if (latestDate) {
      latestActivityByPersonId.set(connection.field_person_id, latestDate);
    }
  });

  const people = ((peopleResult.data ?? []) as FieldPersonRow[]).map((person) => ({
    church: person.church,
    email: person.email,
    engagementLevel: person.engagement_level,
    id: person.id,
    lastActivityAt: latestActivityDate(person.last_activity_at, latestActivityByPersonId.get(person.id)),
    name: person.name,
    notes: person.notes,
    phone: person.phone,
    relationshipType: person.relationship_type,
    status: person.status ?? "new",
    updatedAt: person.updated_at,
  })).sort((first, second) => activityDateValue(second.lastActivityAt ?? second.updatedAt) - activityDateValue(first.lastActivityAt ?? first.updatedAt));
  const peopleById = new Map(people.map((person) => [person.id, person.name]));
  const meetings = [
    ...meetingRows.map((meeting) => ({
      date: latestActivityDate(meeting.table_date, meeting.updated_at, meeting.created_at),
      fieldPersonIds: meeting.field_person_ids ?? [],
      id: meeting.id,
      notes: meeting.notes,
      participantNames: meeting.participant_names ?? [],
      source: "table" as const,
      title: "Meeting",
      type: mapMeetingType(meeting.table_type),
      updatedAt: meeting.updated_at,
    })),
    ...connectionRows.map((connection) => ({
      date: latestActivityDate(connection.connection_date, connection.updated_at, connection.created_at),
      fieldPersonIds: connection.field_person_id ? [connection.field_person_id] : [],
      id: `connection-${connection.id}`,
      notes: connection.notes,
      participantNames: connection.field_person_id && peopleById.has(connection.field_person_id)
        ? [peopleById.get(connection.field_person_id) as string]
        : [],
      source: "connection" as const,
      title: connection.interaction_type ?? "Connection",
      type: mapConnectionType(connection.interaction_type),
      updatedAt: connection.updated_at,
    })),
  ].sort((first, second) => activityDateValue(second.date ?? second.updatedAt) - activityDateValue(first.date ?? first.updatedAt));
  const fruit = ((fruitResult.data ?? []) as FruitRow[]).map((item) => ({
    fieldPersonId: item.field_person_id,
    id: item.id,
    outcomeTags: mapOutcomeTags(item.outcome_tags),
    status: item.cc_status ?? "draft",
    summary: item.body,
    testimonyDate: item.testimony_date,
    updatedAt: item.updated_at,
  }));

  return {
    data: {
      fruit,
      meetings,
      people,
      stats: {
        approvedFruit: fruit.filter((item) => item.status === "approved").length,
        connectionsCount: connectionRows.length,
        fruitCount: fruit.length,
        meetingsCount: meetings.length,
        peopleCount: people.length,
      },
      workspace: {
        displayName: workspace.display_name,
        id: workspace.id,
        profileImageUrl: workspace.profile_image_url,
        publicProfileHref: `/missionaries/${workspace.slug}`,
        shortMission: workspace.short_mission,
        slug: workspace.slug,
      },
    },
    status: "ready",
  };
}

export async function resolveDosAppWorkspaceId(workspaceId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("missionary_households")
    .select("id")
    .eq("id", workspaceId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.id as string;
}
