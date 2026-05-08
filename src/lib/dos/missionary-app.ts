import "server-only";

import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

export const dosAppMeetingTypes = ["kitchen_table", "coffee", "phone", "zoom", "group", "other"] as const;
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
  engagementLevel: string | null;
  id: string;
  lastActivityAt: string | null;
  name: string;
  phone: string;
  relationshipType: string | null;
  status: string;
  updatedAt: string | null;
};

export type DosAppMeeting = {
  date: string;
  fieldPersonIds: string[];
  id: string;
  notes: string | null;
  participantNames: string[];
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
  engagement_level: string | null;
  id: string;
  last_activity_at: string | null;
  name: string;
  phone: string;
  relationship_type: string | null;
  status: string | null;
  updated_at: string | null;
};

type MeetingRow = {
  field_person_ids: string[] | null;
  id: string;
  notes: string | null;
  participant_names: string[] | null;
  table_date: string | null;
  table_type: string | null;
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

function mapOutcomeTags(value: string[] | null | undefined): DosAppOutcomeTag[] {
  return Array.isArray(value)
    ? value.filter((tag): tag is DosAppOutcomeTag => dosAppOutcomeTags.includes(tag as DosAppOutcomeTag))
    : [];
}

function workspaceScopeFilter(workspaceId: string) {
  return `workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`;
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
  const [peopleResult, meetingsResult, fruitResult] = await Promise.all([
    supabase
      .from("missionary_field_people")
      .select("id, name, phone, status, relationship_type, engagement_level, last_activity_at, updated_at")
      .or(workspaceScopeFilter(workspace.id))
      .order("last_activity_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false }),
    supabase
      .from("missionary_tables")
      .select("id, table_type, table_date, notes, participant_names, field_person_ids, updated_at")
      .or(workspaceScopeFilter(workspace.id))
      .order("table_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("missionary_fruit_items")
      .select("id, body, outcome_tags, cc_status, field_person_id, testimony_date, updated_at")
      .or(workspaceScopeFilter(workspace.id))
      .order("testimony_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
  ]);

  if (peopleResult.error || meetingsResult.error || fruitResult.error) {
    return {
      message: peopleResult.error?.message ?? meetingsResult.error?.message ?? fruitResult.error?.message ?? "Unable to load DOS app data.",
      status: "error",
    };
  }

  const people = ((peopleResult.data ?? []) as FieldPersonRow[]).map((person) => ({
    engagementLevel: person.engagement_level,
    id: person.id,
    lastActivityAt: person.last_activity_at,
    name: person.name,
    phone: person.phone,
    relationshipType: person.relationship_type,
    status: person.status ?? "new",
    updatedAt: person.updated_at,
  }));
  const meetings = ((meetingsResult.data ?? []) as MeetingRow[]).map((meeting) => ({
    date: meeting.table_date ?? "",
    fieldPersonIds: meeting.field_person_ids ?? [],
    id: meeting.id,
    notes: meeting.notes,
    participantNames: meeting.participant_names ?? [],
    type: mapMeetingType(meeting.table_type),
    updatedAt: meeting.updated_at,
  }));
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
