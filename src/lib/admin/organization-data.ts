import "server-only";

import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import {
  normalizeOrganizationType,
  type OrganizationDetail,
  type OrganizationSummary,
  type OrganizationWorkspaceSummary,
  type WorkspacePreviewData,
} from "@/src/lib/admin/organization-shared";

type OrganizationRow = {
  branding_mode: string | null;
  created_at: string;
  id: string;
  name: string;
  slug: string;
  type: string;
  updated_at: string | null;
};

type CollectiveRow = {
  created_at: string;
  id: string;
  name: string;
  owner_organization_id: string;
  slug: string;
  type: string;
  updated_at: string | null;
};

type HouseholdRow = {
  created_at?: string | null;
  display_name: string;
  enable_prayer_team?: boolean | null;
  id: string;
  public_visible?: boolean | null;
  show_fruit?: boolean | null;
  show_household?: boolean | null;
  show_prayer?: boolean | null;
  show_story?: boolean | null;
  show_support?: boolean | null;
  slug: string;
  updated_at: string | null;
};

type OrganizationMembershipRow = {
  organization_id: string;
  status: string | null;
};

type WorkspaceScopedRow = {
  created_at?: string | null;
  household_id?: string | null;
  id: string;
  related_household_id?: string | null;
  table_date?: string | null;
  updated_at?: string | null;
  workspace_id?: string | null;
};

type WorkspacePreviewPersonRow = {
  church: string | null;
  created_at: string | null;
  email: string | null;
  id: string;
  last_activity_at?: string | null;
  name: string;
  notes: string | null;
  phone: string | null;
  relationship_type: string | null;
  status: string | null;
  updated_at: string | null;
};

type WorkspacePreviewMeetingRow = {
  conversation_flow_key?: string | null;
  created_at: string | null;
  field_person_ids?: string[] | null;
  id: string;
  notes: string | null;
  participant_names: string[] | null;
  table_date: string | null;
  table_type: string | null;
  updated_at: string | null;
};

type WorkspacePreviewTableReviewRow = {
  follow_up_needed: string | null;
  movement_step: string | null;
  table_id: string;
};

type WorkspacePreviewPrayerRequestRow = {
  created_at: string | null;
  field_person_id?: string | null;
  id: string;
  request: string | null;
  status: string | null;
  title: string | null;
  updated_at: string | null;
  urgency?: string | null;
  visibility?: string | null;
};

type WorkspacePreviewPrayerPartnerRow = {
  approved_at?: string | null;
  created_at: string | null;
  date_joined: string | null;
  email: string | null;
  first_name: string | null;
  id: string;
  last_name: string | null;
  name: string | null;
  source: string | null;
  status: string | null;
  updated_at: string | null;
};

const householdBaseSelect = "id, slug, display_name, public_visible, updated_at, created_at";
const householdFeatureSelect = `${householdBaseSelect}, show_household, show_prayer, show_support, show_fruit, show_story, enable_prayer_team`;

function isUsamOrganization(organization: Pick<OrganizationRow, "branding_mode" | "slug">) {
  return organization.branding_mode === "usam" || organization.slug === "usa-missionaries";
}

function isMissingColumnError(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";

  return message.includes("could not find") || message.includes("schema cache");
}

function latestDate(values: Array<string | null | undefined>) {
  const timestamps = values
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));

  if (timestamps.length === 0) {
    return null;
  }

  return new Date(Math.max(...timestamps)).toISOString();
}

function rowWorkspaceId(row: WorkspaceScopedRow) {
  return row.workspace_id ?? row.household_id ?? row.related_household_id ?? null;
}

function activityTimestamp(row: WorkspaceScopedRow) {
  return row.updated_at ?? row.table_date ?? row.created_at ?? null;
}

function firstNameFromWorkspace(displayName: string) {
  const primaryName = displayName.split(/[&,+]/)[0]?.trim() ?? "";
  const firstName = primaryName.split(/\s+/)[0]?.trim();

  return firstName || "Someone";
}

function formatMeetingContext(value: string | null) {
  if (!value) {
    return "Meeting";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatParticipantNames(names: string[] | null) {
  const cleanNames = (names ?? []).map((name) => name.trim()).filter(Boolean);

  if (cleanNames.length === 0) {
    return "the field";
  }

  if (cleanNames.length === 1) {
    return cleanNames[0];
  }

  if (cleanNames.length === 2) {
    return `${cleanNames[0]} + ${cleanNames[1]}`;
  }

  return `${cleanNames[0]} + ${cleanNames.length - 1} others`;
}

function formatPrayerActivity(status: string | null) {
  if (status === "covered") {
    return "Shared with prayer team";
  }

  if (status === "answered") {
    return "Prayer answered";
  }

  if (status === "archived") {
    return "Prayer request archived";
  }

  return "Prayer request submitted";
}

function formatPrayerPartnerActivity(status: string | null) {
  if (status === "active") {
    return "Partner approved";
  }

  if (status === "declined") {
    return "Prayer partner declined";
  }

  if (status === "inactive" || status === "archived") {
    return "Prayer partner paused";
  }

  return "Waiting for review";
}

function prayerPartnerName(partner: WorkspacePreviewPrayerPartnerRow) {
  return partner.name?.trim()
    || [partner.first_name, partner.last_name].filter(Boolean).join(" ").trim()
    || partner.email?.trim()
    || "Prayer partner";
}

function getOrganizationWorkspaces(
  organization: OrganizationRow,
  collectives: CollectiveRow[],
  households: HouseholdRow[],
  activityByWorkspaceId: Map<string, string | null>,
): OrganizationWorkspaceSummary[] {
  const orgCollectives = collectives.filter((collective) => collective.owner_organization_id === organization.id);
  const allCollectiveSlugs = new Set(collectives.map((collective) => collective.slug));
  const collectiveSlugs = new Set(orgCollectives.map((collective) => collective.slug));
  const activeHouseholds = households.filter((household) => (
    household.slug === organization.slug
    || collectiveSlugs.has(household.slug)
    || (isUsamOrganization(organization) && !allCollectiveSlugs.has(household.slug))
  ));
  const activeHouseholdSlugs = new Set(activeHouseholds.map((household) => household.slug));
  const activeWorkspaces = activeHouseholds.map((household) => ({
    id: household.id,
    kind: "workspace" as const,
    lastActivityAt: latestDate([activityByWorkspaceId.get(household.id), household.updated_at, household.created_at]),
    name: household.display_name,
    previewHref: `/admin/workspaces/${household.id}/preview?viewAs=workspace_user`,
    slug: household.slug,
    sourceLabel: "Missionary Workspace",
    status: "active" as const,
  }));
  const foundationWorkspaces = orgCollectives
    .filter((collective) => !activeHouseholdSlugs.has(collective.slug))
    .map((collective) => ({
      id: collective.id,
      kind: "foundation" as const,
      lastActivityAt: latestDate([collective.updated_at, collective.created_at]),
      name: collective.name,
      previewHref: null,
      slug: collective.slug,
      sourceLabel: "Foundation workspace",
      status: "setup" as const,
    }));

  return [...activeWorkspaces, ...foundationWorkspaces].sort((a, b) => {
    const aTime = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
    const bTime = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;

    return bTime - aTime || a.name.localeCompare(b.name);
  });
}

async function loadHouseholds() {
  const supabase = createSupabaseAdminClient();
  const result = await supabase
    .from("missionary_households")
    .select(householdFeatureSelect)
    .order("updated_at", { ascending: false });
  const fallbackResult = result.error && isMissingColumnError(result.error)
    ? await supabase
      .from("missionary_households")
      .select(householdBaseSelect)
      .order("updated_at", { ascending: false })
    : result;

  if (fallbackResult.error) {
    throw new Error(fallbackResult.error.message);
  }

  return (fallbackResult.data ?? []) as HouseholdRow[];
}

async function loadWorkspaceActivity(householdIds: string[]) {
  const activityByWorkspaceId = new Map<string, string | null>();

  if (householdIds.length === 0) {
    return activityByWorkspaceId;
  }

  const supabase = createSupabaseAdminClient();
  const [peopleResult, meetingsResult, prayerResult, fruitResult] = await Promise.all([
    supabase.from("missionary_field_people").select("id, workspace_id, household_id, last_activity_at, updated_at, created_at").in("workspace_id", householdIds),
    supabase.from("missionary_tables").select("id, workspace_id, household_id, table_date, updated_at, created_at").in("workspace_id", householdIds),
    supabase.from("prayer_requests").select("id, workspace_id, household_id, related_household_id, updated_at, created_at").or(householdIds.map((id) => `workspace_id.eq.${id},household_id.eq.${id},related_household_id.eq.${id}`).join(",")),
    supabase.from("missionary_fruit_items").select("id, workspace_id, household_id, updated_at, created_at").in("workspace_id", householdIds),
  ]);
  const rows = [
    ...(peopleResult.error ? [] : ((peopleResult.data ?? []) as Array<WorkspaceScopedRow & { last_activity_at?: string | null }>).map((row) => ({ ...row, updated_at: row.last_activity_at ?? row.updated_at }))),
    ...(meetingsResult.error ? [] : (meetingsResult.data ?? []) as WorkspaceScopedRow[]),
    ...(prayerResult.error ? [] : (prayerResult.data ?? []) as WorkspaceScopedRow[]),
    ...(fruitResult.error ? [] : (fruitResult.data ?? []) as WorkspaceScopedRow[]),
  ];

  rows.forEach((row) => {
    const workspaceId = rowWorkspaceId(row);

    if (!workspaceId) {
      return;
    }

    activityByWorkspaceId.set(
      workspaceId,
      latestDate([activityByWorkspaceId.get(workspaceId), activityTimestamp(row)]),
    );
  });

  return activityByWorkspaceId;
}

export async function loadOrganizationsOverview(): Promise<{ error?: string; organizations: OrganizationSummary[] }> {
  if (!isSupabaseAdminConfigured()) {
    return {
      error: "Supabase admin environment variables are not configured.",
      organizations: [],
    };
  }

  try {
    const supabase = createSupabaseAdminClient();
    const [organizationsResult, collectivesResult, membershipsResult] = await Promise.all([
      supabase.from("organizations").select("id, name, slug, type, branding_mode, created_at, updated_at").order("name", { ascending: true }),
      supabase.from("collectives").select("id, owner_organization_id, name, slug, type, created_at, updated_at").order("name", { ascending: true }),
      supabase.from("organization_memberships").select("organization_id, status"),
    ]);

    if (organizationsResult.error) {
      return { error: organizationsResult.error.message, organizations: [] };
    }

    const households = await loadHouseholds();
    const activityByWorkspaceId = await loadWorkspaceActivity(households.map((household) => household.id));
    const collectives = (collectivesResult.error ? [] : collectivesResult.data ?? []) as CollectiveRow[];
    const memberships = (membershipsResult.error ? [] : membershipsResult.data ?? []) as OrganizationMembershipRow[];

    return {
      organizations: ((organizationsResult.data ?? []) as OrganizationRow[]).map((organization) => {
        const workspaces = getOrganizationWorkspaces(organization, collectives, households, activityByWorkspaceId);
        const memberCount = memberships.filter((membership) => (
          membership.organization_id === organization.id && membership.status !== "inactive"
        )).length;

        return {
          brandingMode: organization.branding_mode ?? "default",
          createdAt: organization.created_at,
          id: organization.id,
          lastActivityAt: latestDate([organization.updated_at, ...workspaces.map((workspace) => workspace.lastActivityAt)]),
          memberCount,
          name: organization.name,
          slug: organization.slug,
          status: workspaces.length > 0 || memberCount > 0 ? "active" : "setup",
          type: normalizeOrganizationType(organization.type),
          workspaceCount: workspaces.length,
        };
      }),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to load organizations.",
      organizations: [],
    };
  }
}

export async function loadOrganizationDetail(organizationId: string): Promise<{ error?: string; organization: OrganizationDetail | null }> {
  if (!isSupabaseAdminConfigured()) {
    return {
      error: "Supabase admin environment variables are not configured.",
      organization: null,
    };
  }

  try {
    const supabase = createSupabaseAdminClient();
    const [organizationResult, collectivesResult, membershipsResult] = await Promise.all([
      supabase.from("organizations").select("id, name, slug, type, branding_mode, created_at, updated_at").eq("id", organizationId).maybeSingle(),
      supabase.from("collectives").select("id, owner_organization_id, name, slug, type, created_at, updated_at").eq("owner_organization_id", organizationId),
      supabase.from("organization_memberships").select("organization_id, status").eq("organization_id", organizationId),
    ]);

    if (organizationResult.error) {
      return { error: organizationResult.error.message, organization: null };
    }

    if (!organizationResult.data) {
      return { organization: null };
    }

    const households = await loadHouseholds();
    const activityByWorkspaceId = await loadWorkspaceActivity(households.map((household) => household.id));
    const organization = organizationResult.data as OrganizationRow;
    const workspaces = getOrganizationWorkspaces(
      organization,
      (collectivesResult.error ? [] : collectivesResult.data ?? []) as CollectiveRow[],
      households,
      activityByWorkspaceId,
    );
    const memberCount = ((membershipsResult.error ? [] : membershipsResult.data ?? []) as OrganizationMembershipRow[])
      .filter((membership) => membership.status !== "inactive")
      .length;

    return {
      organization: {
        brandingMode: organization.branding_mode ?? "default",
        createdAt: organization.created_at,
        id: organization.id,
        lastActivityAt: latestDate([organization.updated_at, ...workspaces.map((workspace) => workspace.lastActivityAt)]),
        memberCount,
        name: organization.name,
        slug: organization.slug,
        status: workspaces.length > 0 || memberCount > 0 ? "active" : "setup",
        type: normalizeOrganizationType(organization.type),
        workspaceCount: workspaces.length,
        workspaces,
      },
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to load organization.",
      organization: null,
    };
  }
}

export async function loadWorkspacePreviewData(workspaceId: string): Promise<{ error?: string; preview: WorkspacePreviewData | null }> {
  if (!isSupabaseAdminConfigured()) {
    return {
      error: "Supabase admin environment variables are not configured.",
      preview: null,
    };
  }

  try {
    const supabase = createSupabaseAdminClient();
    const recentMeetingSince = new Date();
    recentMeetingSince.setDate(recentMeetingSince.getDate() - 7);
    const recentMeetingSinceDate = recentMeetingSince.toISOString().slice(0, 10);
    const householdResult = await supabase
      .from("missionary_households")
      .select(householdFeatureSelect)
      .eq("id", workspaceId)
      .maybeSingle();
    const fallbackHouseholdResult = householdResult.error && isMissingColumnError(householdResult.error)
      ? await supabase
        .from("missionary_households")
        .select(householdBaseSelect)
        .eq("id", workspaceId)
        .maybeSingle()
      : householdResult;

    if (fallbackHouseholdResult.error) {
      return { error: fallbackHouseholdResult.error.message, preview: null };
    }

    if (!fallbackHouseholdResult.data) {
      return { preview: null };
    }

    const household = fallbackHouseholdResult.data as HouseholdRow;
    const prayerRequestScopeFilter = `workspace_id.eq.${workspaceId},household_id.eq.${workspaceId},related_household_id.eq.${workspaceId}`;
    const prayerPartnerScopeFilter = `workspace_id.eq.${workspaceId},recruited_by_household_id.eq.${workspaceId},missionary_profile_id.eq.${workspaceId},missionary_profile_slug.eq.${household.slug},recruited_by_profile_slug.eq.${household.slug}`;
    const [
      peopleResult,
      peopleCountResult,
      meetingsResult,
      meetingsCountResult,
      prayerResult,
      prayerCountResult,
      prayerPartnersResult,
      activePrayerPartnersCountResult,
      pendingPrayerPartnersCountResult,
      pendingPrayerRequestsCountResult,
      fruitResult,
      fruitCountResult,
      teamCountResult,
      teamMembersResult,
      activePeopleCountResult,
      peopleFollowUpCountResult,
      reviewFollowUpCountResult,
      connectionFollowUpCountResult,
      recentMeetingsCountResult,
      reviewMovementStepCountResult,
      connectionMovementStepCountResult,
      collectiveResult,
      tableReviewsResult,
    ] = await Promise.all([
      supabase
        .from("missionary_field_people")
        .select("id, name, phone, email, church, notes, status, relationship_type, updated_at, created_at, last_activity_at")
        .eq("workspace_id", workspaceId)
        .order("last_activity_at", { ascending: false, nullsFirst: false })
        .order("updated_at", { ascending: false })
        .limit(80),
      supabase
        .from("missionary_field_people")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId),
      supabase
        .from("missionary_tables")
        .select("id, table_type, table_date, participant_names, field_person_ids, notes, conversation_flow_key, updated_at, created_at")
        .eq("workspace_id", workspaceId)
        .order("table_date", { ascending: false, nullsFirst: false })
        .limit(40),
      supabase
        .from("missionary_tables")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId),
      supabase
        .from("prayer_requests")
        .select("id, field_person_id, title, request, status, visibility, urgency, updated_at, created_at")
        .or(prayerRequestScopeFilter)
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("prayer_requests")
        .select("id", { count: "exact", head: true })
        .or(prayerRequestScopeFilter),
      supabase
        .from("prayer_partners")
        .select("id, first_name, last_name, name, email, source, status, approved_at, date_joined, updated_at, created_at")
        .or(prayerPartnerScopeFilter)
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("prayer_partners")
        .select("id", { count: "exact", head: true })
        .or(prayerPartnerScopeFilter)
        .eq("status", "active"),
      supabase
        .from("prayer_partners")
        .select("id", { count: "exact", head: true })
        .or(prayerPartnerScopeFilter)
        .eq("status", "pending"),
      supabase
        .from("prayer_requests")
        .select("id", { count: "exact", head: true })
        .or(prayerRequestScopeFilter)
        .in("status", ["open", "active"]),
      supabase
        .from("missionary_fruit_items")
        .select("id, title, body, cc_status, source_app, updated_at, created_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("missionary_fruit_items")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId),
      supabase
        .from("missionary_team_members")
        .select("id", { count: "exact", head: true })
        .eq("household_id", workspaceId),
      supabase
        .from("missionary_team_members")
        .select("id, display_name, role_title")
        .eq("household_id", workspaceId)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .limit(6),
      supabase
        .from("missionary_field_people")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .in("status", ["active", "follow_up", "discipleship"]),
      supabase
        .from("missionary_field_people")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("status", "follow_up"),
      supabase
        .from("missionary_table_reviews")
        .select("id", { count: "exact", head: true })
        .eq("household_id", workspaceId)
        .not("follow_up_needed", "is", null)
        .neq("follow_up_needed", ""),
      supabase
        .from("missionary_connection_logs")
        .select("id", { count: "exact", head: true })
        .eq("household_id", workspaceId)
        .not("follow_up_needed", "is", null)
        .neq("follow_up_needed", ""),
      supabase
        .from("missionary_tables")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .gte("table_date", recentMeetingSinceDate),
      supabase
        .from("missionary_table_reviews")
        .select("id", { count: "exact", head: true })
        .eq("household_id", workspaceId)
        .not("movement_step", "is", null)
        .neq("movement_step", ""),
      supabase
        .from("missionary_connection_logs")
        .select("id", { count: "exact", head: true })
        .eq("household_id", workspaceId)
        .not("movement_step", "is", null)
        .neq("movement_step", ""),
      supabase
        .from("collectives")
        .select("owner_organization_id")
        .eq("slug", household.slug)
        .maybeSingle(),
      supabase
        .from("missionary_table_reviews")
        .select("table_id, movement_step, follow_up_needed")
        .eq("workspace_id", workspaceId)
        .limit(80),
    ]);
    const organizationResult = !collectiveResult.error && collectiveResult.data?.owner_organization_id
      ? await supabase
        .from("organizations")
        .select("name, slug, branding_mode")
        .eq("id", collectiveResult.data.owner_organization_id)
        .maybeSingle()
      : await supabase
        .from("organizations")
        .select("name, slug, branding_mode")
        .eq("branding_mode", "usam")
        .maybeSingle();
    const organization = organizationResult.data as Pick<OrganizationRow, "branding_mode" | "name" | "slug"> | null;
    const isUsamWorkspace = organization ? isUsamOrganization(organization) : false;
    const people = peopleResult.error ? [] : (peopleResult.data ?? []) as WorkspacePreviewPersonRow[];
    const meetings = meetingsResult.error ? [] : (meetingsResult.data ?? []) as WorkspacePreviewMeetingRow[];
    const prayers = prayerResult.error ? [] : (prayerResult.data ?? []) as WorkspacePreviewPrayerRequestRow[];
    const prayerPartners = prayerPartnersResult.error ? [] : (prayerPartnersResult.data ?? []) as WorkspacePreviewPrayerPartnerRow[];
    const fruit = fruitResult.error ? [] : (fruitResult.data ?? []) as Array<{ body: string | null; cc_status: string | null; created_at: string | null; id: string; source_app: string | null; title: string | null; updated_at: string | null }>;
    const tableReviews = tableReviewsResult.error ? [] : (tableReviewsResult.data ?? []) as WorkspacePreviewTableReviewRow[];
    const reviewByTableId = new Map(tableReviews.map((review) => [review.table_id, review]));
    const meetingCountByPersonId = new Map<string, number>();
    const lastMeetingAtByPersonId = new Map<string, string | null>();

    meetings.forEach((meeting) => {
      (meeting.field_person_ids ?? []).forEach((personId) => {
        meetingCountByPersonId.set(personId, (meetingCountByPersonId.get(personId) ?? 0) + 1);
        lastMeetingAtByPersonId.set(
          personId,
          latestDate([lastMeetingAtByPersonId.get(personId), meeting.table_date, meeting.updated_at, meeting.created_at]),
        );
      });
    });

    const fieldMeetings = meetings.map((meeting) => {
      const review = reviewByTableId.get(meeting.id);

      return {
        conversationFlow: meeting.conversation_flow_key ?? null,
        date: meeting.table_date ?? meeting.updated_at ?? meeting.created_at,
        followUpNeeded: review?.follow_up_needed ?? null,
        id: meeting.id,
        movementStep: review?.movement_step ?? null,
        notes: meeting.notes,
        participantNames: (meeting.participant_names ?? []).filter(Boolean),
        personIds: meeting.field_person_ids ?? [],
        type: meeting.table_type,
      };
    });
    const fieldPeople = people.map((person) => ({
      church: person.church,
      email: person.email,
      id: person.id,
      lastActivityAt: latestDate([person.last_activity_at, lastMeetingAtByPersonId.get(person.id), person.updated_at, person.created_at]),
      lastMeetingAt: lastMeetingAtByPersonId.get(person.id) ?? null,
      meetingCount: meetingCountByPersonId.get(person.id) ?? 0,
      name: person.name,
      notes: person.notes,
      phone: person.phone,
      relationshipType: person.relationship_type,
      status: person.status,
    }));
    const personNameById = new Map(fieldPeople.map((person) => [person.id, person.name]));
    const prayerRequests = prayers.map((prayer) => ({
      createdAt: prayer.created_at,
      id: prayer.id,
      personId: prayer.field_person_id ?? null,
      personName: prayer.field_person_id ? personNameById.get(prayer.field_person_id) ?? null : null,
      status: prayer.status ?? "open",
      summary: prayer.request?.trim() || "Prayer request submitted.",
      title: prayer.title?.trim() || "Prayer request",
      updatedAt: prayer.updated_at,
      urgency: prayer.urgency ?? null,
      visibility: prayer.visibility ?? null,
    }));
    const prayerPartnerItems = prayerPartners.map((partner) => ({
      email: partner.email,
      id: partner.id,
      name: prayerPartnerName(partner),
      source: partner.source,
      status: partner.status ?? "pending",
      timestamp: partner.status === "active"
        ? latestDate([partner.approved_at, partner.updated_at, partner.date_joined, partner.created_at])
        : latestDate([partner.updated_at, partner.created_at, partner.date_joined]),
    }));
    const prayerActivity = [
      ...prayerRequests.map((request) => ({
        detail: request.summary,
        id: `prayer-request-${request.id}`,
        label: request.personName ?? "Prayer request",
        timestamp: request.updatedAt ?? request.createdAt,
        title: formatPrayerActivity(request.status),
      })),
      ...prayerPartnerItems.map((partner) => ({
        detail: partner.email ?? "Prayer team member",
        id: `prayer-partner-${partner.id}`,
        label: partner.name,
        timestamp: partner.timestamp,
        title: formatPrayerPartnerActivity(partner.status),
      })),
    ]
      .filter((item) => item.timestamp)
      .sort((a, b) => new Date(b.timestamp ?? "").getTime() - new Date(a.timestamp ?? "").getTime())
      .slice(0, 8);
    const teamMembers = teamMembersResult.error
      ? []
      : ((teamMembersResult.data ?? []) as Array<{ display_name: string | null; id: string; role_title: string | null }>)
        .map((member, index) => ({
          id: member.id,
          name: member.display_name?.trim() || `Member ${index + 1}`,
          role: member.role_title?.trim() || null,
        }));
    const followUpCount = (peopleFollowUpCountResult.error ? 0 : peopleFollowUpCountResult.count ?? 0)
      + (reviewFollowUpCountResult.error ? 0 : reviewFollowUpCountResult.count ?? 0)
      + (connectionFollowUpCountResult.error ? 0 : connectionFollowUpCountResult.count ?? 0);
    const readyForNextStepCount = (reviewMovementStepCountResult.error ? 0 : reviewMovementStepCountResult.count ?? 0)
      + (connectionMovementStepCountResult.error ? 0 : connectionMovementStepCountResult.count ?? 0);
    const fieldPeopleCount = peopleCountResult.error ? people.length : peopleCountResult.count ?? 0;
    const activePeopleCount = activePeopleCountResult.error ? Math.min(fieldPeopleCount, people.length) : activePeopleCountResult.count ?? 0;
    const workspaceFirstName = firstNameFromWorkspace(household.display_name);
    const activity = [
      ...meetings.map((meeting) => ({
        detail: meeting.notes || "Meeting logged",
        href: `/admin/missionary-profiles?tab=meetings&profile=${household.slug}`,
        id: `meeting-${meeting.id}`,
        label: "Meeting",
        timestamp: meeting.table_date ?? meeting.updated_at ?? meeting.created_at,
        title: `${formatMeetingContext(meeting.table_type)} logged with ${formatParticipantNames(meeting.participant_names)}`,
      })),
      ...prayers.map((prayer) => ({
        detail: prayer.title || prayer.request || "Prayer request",
        href: "/admin/prayer-team",
        id: `prayer-${prayer.id}`,
        label: "Prayer",
        timestamp: prayer.updated_at ?? prayer.created_at,
        title: formatPrayerActivity(prayer.status),
      })),
      ...fruit.map((item) => ({
        detail: item.body || item.source_app || "Fruit item",
        href: `/admin/missionary-profiles?tab=fruit&profile=${household.slug}`,
        id: `fruit-${item.id}`,
        label: item.cc_status === "pending_review" ? "Review" : "Fruit",
        timestamp: item.updated_at ?? item.created_at,
        title: item.source_app === "dos_quick_review" || item.cc_status === "pending_review" ? "Quick Review submitted" : item.title || "Fruit added",
      })),
      ...people.map((person) => ({
        detail: "Person added to the field",
        href: `/admin/missionary-profiles?tab=people&profile=${household.slug}`,
        id: `person-${person.id}`,
        label: "Person",
        timestamp: person.last_activity_at ?? person.updated_at ?? person.created_at,
        title: `${workspaceFirstName} added ${person.name} to the field`,
      })),
    ]
      .filter((item) => item.timestamp)
      .sort((a, b) => new Date(b.timestamp ?? "").getTime() - new Date(a.timestamp ?? "").getTime())
      .slice(0, 8);

    return {
      preview: {
        activity,
        counts: {
          fieldPeople: fieldPeopleCount,
          fruit: fruitCountResult.error ? fruit.length : fruitCountResult.count ?? 0,
          followUps: followUpCount,
          meetings: meetingsCountResult.error ? meetings.length : meetingsCountResult.count ?? 0,
          members: teamCountResult.error ? teamMembers.length : teamCountResult.count ?? 0,
          prayerRequests: prayerCountResult.error ? prayers.length : prayerCountResult.count ?? 0,
          readyForNextStep: readyForNextStepCount,
          recentMeetings: recentMeetingsCountResult.error ? meetings.length : recentMeetingsCountResult.count ?? 0,
        },
        features: {
          dosEnabled: true,
          prayerEnabled: household.show_prayer !== false && household.enable_prayer_team !== false,
          publicProfileEnabled: isUsamWorkspace && household.public_visible !== false && household.show_household !== false,
          publishingEnabled: isUsamWorkspace && (household.show_fruit !== false || household.show_story !== false),
          supportEnabled: isUsamWorkspace && household.show_support === true,
        },
        field: {
          meetings: fieldMeetings,
          people: fieldPeople,
        },
        members: teamMembers,
        missionFocus: {
          my3: Math.min(followUpCount, 3),
          my12: Math.min(activePeopleCount, 12),
          my70: fieldPeopleCount,
        },
        organizationName: organization?.name ?? "USA Missionaries",
        prayer: {
          activity: prayerActivity,
          partners: prayerPartnerItems,
          requests: prayerRequests,
          stats: {
            activePartners: activePrayerPartnersCountResult.error ? prayerPartnerItems.filter((partner) => partner.status === "active").length : activePrayerPartnersCountResult.count ?? 0,
            pendingApplications: pendingPrayerPartnersCountResult.error ? prayerPartnerItems.filter((partner) => partner.status === "pending").length : pendingPrayerPartnersCountResult.count ?? 0,
            pendingRequests: pendingPrayerRequestsCountResult.error ? prayerRequests.filter((request) => request.status === "open" || request.status === "active").length : pendingPrayerRequestsCountResult.count ?? 0,
            recentActivity: prayerActivity.length,
          },
          teamEnabled: household.show_prayer !== false && household.enable_prayer_team !== false,
        },
        workspace: {
          displayName: household.display_name,
          id: household.id,
          slug: household.slug,
        },
      },
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to load workspace preview.",
      preview: null,
    };
  }
}

export async function loadWorkspacePreviewDataBySlug(slug: string): Promise<{ error?: string; preview: WorkspacePreviewData | null }> {
  if (!isSupabaseAdminConfigured()) {
    return {
      error: "Supabase admin environment variables are not configured.",
      preview: null,
    };
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("missionary_households")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      return { error: error.message, preview: null };
    }

    if (!data) {
      return { preview: null };
    }

    return loadWorkspacePreviewData(data.id);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to load workspace.",
      preview: null,
    };
  }
}
