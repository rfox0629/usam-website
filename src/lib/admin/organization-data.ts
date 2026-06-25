import "server-only";

import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import {
  normalizeOrganizationType,
  type OrganizationApplicationContactItem,
  type OrganizationApplicationDetailItem,
  type OrganizationApplicationHouseholdMember,
  type OrganizationApprovedProfileSummary,
  type OrganizationApplicationPhotoSummary,
  type OrganizationApplicationReferenceItem,
  type OrganizationApplicationSummary,
  type OrganizationDetail,
  type OrganizationMemberSummary,
  type OrganizationSummary,
  type OrganizationWorkspaceSummary,
  type WorkspacePreviewData,
} from "@/src/lib/admin/organization-shared";
import { loadAdminWorkspaceIndex, type AdminWorkspaceIndexItem } from "@/src/lib/admin/workspace-index";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

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
  location?: string | null;
  public_visible?: boolean | null;
  show_fruit?: boolean | null;
  show_household?: boolean | null;
  show_prayer?: boolean | null;
  show_story?: boolean | null;
  show_support?: boolean | null;
  slug: string;
  usam_profile_status?: string | null;
  updated_at: string | null;
};

type OrganizationApprovedProfileRow = {
  created_at: string | null;
  display_name: string;
  id: string;
  location?: string | null;
  public_visible?: boolean | null;
  show_household?: boolean | null;
  slug: string;
  usam_profile_status?: string | null;
  updated_at: string | null;
};

type OrganizationSupportSettingsRow = {
  annual_goal: number | null;
  household_id: string;
  monthly_goal: number | null;
};

type OrganizationMembershipRow = {
  created_at?: string | null;
  organization_id: string;
  profile_id?: string | null;
  role?: string | null;
  status: string | null;
  updated_at?: string | null;
};

type OrganizationProfileRow = {
  created_at?: string | null;
  email: string | null;
  first_name: string | null;
  id: string;
  last_name: string | null;
  updated_at?: string | null;
};

type OrganizationApplicationRow = {
  admin_notes: string | null;
  applicant_email: string | null;
  applicant_name: string;
  applicant_phone: string | null;
  assigned_admin_email: string | null;
  calling_focus: string | null;
  contact_payload?: Record<string, unknown> | null;
  created_at: string | null;
  id: string;
  location: string | null;
  missionary_profile_id: string | null;
  monthly_budget: number | null;
  organization_id: string | null;
  prayer_needs: string | null;
  profile_photo_url: string | null;
  references_text: string | null;
  status: string;
  story_testimony: string | null;
  submitted_at: string | null;
  support_goal: number | null;
  updated_at: string | null;
  workspace_id: string | null;
};

type OrganizationTeamMemberRow = {
  created_at: string | null;
  display_name: string;
  dos_user_id?: string | null;
  household_id: string;
  id: string;
  invite_email?: string | null;
  relationship_to_workspace?: string | null;
  role_title: string | null;
  source: string | null;
  status: string | null;
  updated_at: string | null;
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
const usamOrganizationWorkspacesHref = "/admin/organizations/usa-missionaries?tab=workspaces";

function workspaceIntelligenceHref(workspaceId: string | null | undefined) {
  const normalizedId = workspaceId?.trim();

  return normalizedId ? `/admin/workspaces/${encodeURIComponent(normalizedId)}/preview` : null;
}

function isUsamOrganization(organization: Pick<OrganizationRow, "branding_mode" | "slug">) {
  return organization.branding_mode === "usam" || organization.slug === "usa-missionaries";
}

function isParentOrganization(organization: OrganizationRow) {
  return isUsamOrganization(organization);
}

function isMissingColumnError(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";

  return message.includes("could not find") || message.includes("schema cache");
}

function isMissingTableError(error: { message?: string } | null | undefined, tableName: string) {
  const message = error?.message?.toLowerCase() ?? "";

  return message.includes(tableName.toLowerCase())
    && (message.includes("does not exist") || message.includes("could not find") || message.includes("schema cache"));
}

function isPendingApplication(status: string | null | undefined) {
  return status === "application_submitted" || status === "pending_review";
}

function isApprovedApplication(status: string | null | undefined) {
  return status === "approved" || status === "active";
}

function cleanStatus(value: string | null | undefined) {
  return value?.trim() || "Unknown";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

function compactDetail(label: string, value: unknown): OrganizationApplicationDetailItem | null {
  const cleanValue = typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : asString(value);

  return cleanValue ? { label, value: cleanValue } : null;
}

function fullNameFromRecord(record: Record<string, unknown>, fallback = "") {
  return [
    asString(record.firstName),
    asString(record.lastName),
  ].filter(Boolean).join(" ").trim()
    || asString(record.name)
    || asString(record.displayName)
    || fallback;
}

function moneyDetail(label: string, value: unknown) {
  const amount = typeof value === "number" && Number.isFinite(value)
    ? value
    : Number(asString(value).replace(/[$,]/g, ""));

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return {
    label,
    value: new Intl.NumberFormat("en-US", {
      currency: "USD",
      maximumFractionDigits: 0,
      style: "currency",
    }).format(amount),
  };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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
    activitySummary: "Activity available in workspace intelligence",
    householdName: household.display_name,
    id: household.id,
    kind: "workspace" as const,
    lastActivityAt: latestDate([activityByWorkspaceId.get(household.id), household.updated_at, household.created_at]),
    name: household.display_name,
    ownerName: firstNameFromWorkspace(household.display_name),
    slug: household.slug,
    sourceLabel: "DOS Workspace",
    status: "active" as const,
    viewHref: workspaceIntelligenceHref(household.id) ?? usamOrganizationWorkspacesHref,
  }));
  const foundationWorkspaces = orgCollectives
    .filter((collective) => !activeHouseholdSlugs.has(collective.slug))
    .map((collective) => ({
      activitySummary: "Foundation workspace setup",
      householdName: null,
      id: collective.id,
      kind: "foundation" as const,
      lastActivityAt: latestDate([collective.updated_at, collective.created_at]),
      name: collective.name,
      ownerName: null,
      slug: collective.slug,
      sourceLabel: "Foundation workspace",
      status: "setup" as const,
      viewHref: null,
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

async function loadOrganizationApplications(organizationIds: string[]) {
  if (organizationIds.length === 0) {
    return [] as OrganizationApplicationRow[];
  }

  const supabase = createSupabaseAdminClient();
  const result = await supabase
    .from("usam_missionary_applications")
    .select("id, organization_id, workspace_id, missionary_profile_id, applicant_name, applicant_email, applicant_phone, location, calling_focus, story_testimony, monthly_budget, support_goal, prayer_needs, references_text, status, assigned_admin_email, admin_notes, profile_photo_url, contact_payload, submitted_at, created_at, updated_at")
    .in("organization_id", organizationIds)
    .order("submitted_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (result.error) {
    if (isMissingTableError(result.error, "usam_missionary_applications") || isMissingColumnError(result.error)) {
      return [];
    }

    throw new Error(result.error.message);
  }

  return (result.data ?? []) as OrganizationApplicationRow[];
}

async function loadOrganizationMembershipRows(organizationIds: string[]) {
  if (organizationIds.length === 0) {
    return [] as OrganizationMembershipRow[];
  }

  const supabase = createSupabaseAdminClient();
  const result = await supabase
    .from("organization_memberships")
    .select("organization_id, profile_id, role, status, created_at, updated_at")
    .in("organization_id", organizationIds);

  if (result.error) {
    if (isMissingTableError(result.error, "organization_memberships") || isMissingColumnError(result.error)) {
      return [];
    }

    throw new Error(result.error.message);
  }

  return (result.data ?? []) as OrganizationMembershipRow[];
}

async function loadOrganizationProfiles(profileIds: string[]) {
  const uniqueProfileIds = Array.from(new Set(profileIds.filter(Boolean)));

  if (uniqueProfileIds.length === 0) {
    return [] as OrganizationProfileRow[];
  }

  const supabase = createSupabaseAdminClient();
  const result = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, created_at, updated_at")
    .in("id", uniqueProfileIds);

  if (result.error) {
    if (isMissingTableError(result.error, "profiles") || isMissingColumnError(result.error)) {
      return [];
    }

    throw new Error(result.error.message);
  }

  return (result.data ?? []) as OrganizationProfileRow[];
}

async function loadOrganizationTeamMembers(workspaceIds: string[]) {
  const uniqueWorkspaceIds = Array.from(new Set(workspaceIds.filter(Boolean)));

  if (uniqueWorkspaceIds.length === 0) {
    return [] as OrganizationTeamMemberRow[];
  }

  const supabase = createSupabaseAdminClient();
  const result = await supabase
    .from("missionary_team_members")
    .select("id, household_id, display_name, role_title, dos_user_id, source, status, updated_at, created_at, invite_email, relationship_to_workspace")
    .in("household_id", uniqueWorkspaceIds)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("display_name", { ascending: true });
  const fallbackResult = result.error && isMissingColumnError(result.error)
    ? await supabase
      .from("missionary_team_members")
      .select("id, household_id, display_name, role_title, dos_user_id, source, status, updated_at, created_at")
      .in("household_id", uniqueWorkspaceIds)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("display_name", { ascending: true })
    : result;

  if (fallbackResult.error) {
    if (isMissingTableError(fallbackResult.error, "missionary_team_members") || isMissingColumnError(fallbackResult.error)) {
      return [];
    }

    throw new Error(fallbackResult.error.message);
  }

  return (fallbackResult.data ?? []) as OrganizationTeamMemberRow[];
}

async function loadOrganizationSupportSettings(workspaceIds: string[]) {
  const uniqueWorkspaceIds = Array.from(new Set(workspaceIds.filter(Boolean)));

  if (uniqueWorkspaceIds.length === 0) {
    return [] as OrganizationSupportSettingsRow[];
  }

  const supabase = createSupabaseAdminClient();
  const result = await supabase
    .from("missionary_support_settings")
    .select("household_id, annual_goal, monthly_goal")
    .in("household_id", uniqueWorkspaceIds);

  if (result.error) {
    if (isMissingTableError(result.error, "missionary_support_settings") || isMissingColumnError(result.error)) {
      return [];
    }

    throw new Error(result.error.message);
  }

  return (result.data ?? []) as OrganizationSupportSettingsRow[];
}

async function loadApprovedProfileRows(workspaceIds: string[]) {
  const uniqueWorkspaceIds = Array.from(new Set(workspaceIds.filter(Boolean)));

  if (uniqueWorkspaceIds.length === 0) {
    return [] as OrganizationApprovedProfileRow[];
  }

  const supabase = createSupabaseAdminClient();
  const result = await supabase
    .from("missionary_households")
    .select("id, slug, display_name, location, public_visible, show_household, usam_profile_status, updated_at, created_at")
    .in("id", uniqueWorkspaceIds)
    .order("updated_at", { ascending: false, nullsFirst: false });
  const fallbackResult = result.error && isMissingColumnError(result.error)
    ? await supabase
      .from("missionary_households")
      .select("id, slug, display_name, public_visible, updated_at, created_at")
      .in("id", uniqueWorkspaceIds)
      .order("updated_at", { ascending: false, nullsFirst: false })
    : result;

  if (fallbackResult.error) {
    if (isMissingTableError(fallbackResult.error, "missionary_households") || isMissingColumnError(fallbackResult.error)) {
      return [];
    }

    throw new Error(fallbackResult.error.message);
  }

  return (fallbackResult.data ?? []) as OrganizationApprovedProfileRow[];
}

function organizationWorkspacesFromIndex(
  organization: OrganizationRow,
  workspaces: AdminWorkspaceIndexItem[],
) {
  return workspaces.filter((workspace) => (
    isUsamOrganization(organization)
      ? workspace.workspaceType === "USA Missionaries"
        || workspace.organizationId === organization.id
        || workspace.organizationName === organization.name
      : workspace.organizationId === organization.id
  ));
}

function workspaceSummaryFromIndex(workspace: AdminWorkspaceIndexItem): OrganizationWorkspaceSummary {
  return {
    activitySummary: workspace.activitySummary,
    householdName: workspace.householdName,
    id: workspace.id,
    kind: "workspace",
    lastActivityAt: workspace.lastActiveAt,
    name: workspace.workspaceName,
    ownerName: workspace.userName,
    slug: workspace.slug ?? workspace.id,
    sourceLabel: workspace.workspaceType,
    status: workspace.status,
    viewHref: workspaceIntelligenceHref(workspace.id) ?? usamOrganizationWorkspacesHref,
  };
}

function applicationHasPhotos(application: OrganizationApplicationRow) {
  if (application.profile_photo_url?.trim()) {
    return true;
  }

  const photos = asRecord(asRecord(application.contact_payload).photos_json);
  const profileUpload = asRecord(photos.profilePhotoUpload);
  const familyUpload = asRecord(photos.familyPhotoUpload);

  return Boolean(
    asString(photos.profilePhotoName)
    || asString(photos.familyPhotoName)
    || asString(profileUpload.path)
    || asString(familyUpload.path),
  );
}

function fileNameFromUrl(value: string) {
  try {
    const pathname = new URL(value).pathname;
    const fileName = pathname.split("/").filter(Boolean).pop();

    return fileName ? decodeURIComponent(fileName) : "Submitted photo";
  } catch {
    const fileName = value.split("/").filter(Boolean).pop();

    return fileName || "Submitted photo";
  }
}

function photoFromUploadMetadata(
  value: unknown,
  expectedKind: "family" | "profile",
  fallbackName: string,
): OrganizationApplicationPhotoSummary | null {
  const record = asRecord(value);
  const bucket = asString(record.bucket);
  const contentType = asString(record.contentType);
  const fileName = asString(record.fileName) || fallbackName;
  const kind = asString(record.kind);
  const path = asString(record.path);
  const size = asNumber(record.size);
  const uploadedAt = asString(record.uploadedAt);

  if (!bucket || kind !== expectedKind || !path) {
    return null;
  }

  return {
    contentType: contentType || null,
    fileName,
    id: `${expectedKind}:${path}`,
    kind: expectedKind === "family" ? "Family" : "Profile",
    path,
    size,
    status: "Submitted",
    thumbnailUrl: null,
    uploadedAt: uploadedAt || null,
  };
}

function namedPhotoPlaceholder(
  kind: "family" | "profile",
  fileName: string,
): OrganizationApplicationPhotoSummary | null {
  const cleanFileName = fileName.trim();

  if (!cleanFileName) {
    return null;
  }

  return {
    contentType: null,
    fileName: cleanFileName,
    id: `${kind}:named:${cleanFileName}`,
    kind: kind === "family" ? "Family" : "Profile",
    path: null,
    size: null,
    status: "Submitted",
    thumbnailUrl: null,
    uploadedAt: null,
  };
}

async function signedPhotoUrl(
  supabase: SupabaseAdminClient,
  bucket: string,
  path: string,
) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);

  if (error) {
    return null;
  }

  return data?.signedUrl ?? null;
}

async function applicationPhotoSummaries(
  supabase: SupabaseAdminClient,
  application: OrganizationApplicationRow,
): Promise<OrganizationApplicationPhotoSummary[]> {
  const contactPayload = asRecord(application.contact_payload);
  const photosJson = asRecord(contactPayload.photos_json);
  const photos: OrganizationApplicationPhotoSummary[] = [];
  const profileUpload = photoFromUploadMetadata(
    photosJson.profilePhotoUpload,
    "profile",
    asString(photosJson.profilePhotoName) || "Profile photo",
  ) ?? namedPhotoPlaceholder("profile", asString(photosJson.profilePhotoName));
  const familyUpload = photoFromUploadMetadata(
    photosJson.familyPhotoUpload,
    "family",
    asString(photosJson.familyPhotoName) || "Family photo",
  ) ?? namedPhotoPlaceholder("family", asString(photosJson.familyPhotoName));

  if (profileUpload) {
    photos.push(profileUpload);
  }

  if (familyUpload) {
    photos.push(familyUpload);
  }

  if (application.profile_photo_url?.trim()) {
    photos.unshift({
      contentType: null,
      fileName: fileNameFromUrl(application.profile_photo_url),
      id: "profile-photo-url",
      kind: "Profile",
      path: null,
      size: null,
      status: "Submitted",
      thumbnailUrl: application.profile_photo_url,
      uploadedAt: null,
    });
  }

  const signedPhotos = await Promise.all(photos.map(async (photo) => {
    const uploadKind = photo.id.split(":")[0];
    const uploadRecord = uploadKind === "profile"
      ? asRecord(photosJson.profilePhotoUpload)
      : uploadKind === "family"
        ? asRecord(photosJson.familyPhotoUpload)
        : {};
    const bucket = asString(uploadRecord.bucket);

    if (!bucket || !photo.path || photo.thumbnailUrl) {
      return photo;
    }

    return {
      ...photo,
      thumbnailUrl: await signedPhotoUrl(supabase, bucket, photo.path),
    };
  }));
  const seen = new Set<string>();

  return signedPhotos.filter((photo) => {
    const key = photo.path ?? photo.thumbnailUrl ?? photo.id;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
}

function applicationHouseholdDetails(application: OrganizationApplicationRow): OrganizationApplicationDetailItem[] {
  const household = asRecord(asRecord(application.contact_payload).household_json);

  return [
    compactDetail("Street", household.addressLine1),
    compactDetail("Address 2", household.addressLine2),
    compactDetail("City", household.city),
    compactDetail("State", household.state),
    compactDetail("Zip", household.zip),
    compactDetail("Country", household.country),
    compactDetail("Spouse", [asString(household.spouseFirstName), asString(household.spouseLastName)].filter(Boolean).join(" ") || household.spouseName),
    compactDetail("Spouse Email", household.spouseEmail),
    compactDetail("Spouse Phone", household.spousePhone),
  ].filter((item): item is OrganizationApplicationDetailItem => Boolean(item));
}

function applicationHouseholdMembers(application: OrganizationApplicationRow): OrganizationApplicationHouseholdMember[] {
  const household = asRecord(asRecord(application.contact_payload).household_json);

  return asArray(household.familyMembers)
    .map((member) => ({
      age: asString(member.age) || null,
      name: fullNameFromRecord(member, "Household member"),
      relationship: asString(member.relationship) || null,
      status: asString(member.dependentStatus) || null,
    }))
    .filter((member) => member.name !== "Household member" || member.relationship || member.age || member.status);
}

function applicationStoryAnswers(application: OrganizationApplicationRow): OrganizationApplicationDetailItem[] {
  const story = asRecord(asRecord(application.contact_payload).story_json);
  const answers = asRecord(story.answers);

  return [
    compactDetail("How they came to know Jesus", answers.jesus),
    compactDetail("What God has been teaching them", answers.recentTeaching),
    compactDetail("Why USA Missionaries", answers.whyUsam),
    compactDetail("Who they hope to impact", answers.impact),
    compactDetail("What God is calling them toward", answers.callingToward),
    compactDetail("Accepted draft", story.acceptedDraft),
  ].filter((item): item is OrganizationApplicationDetailItem => Boolean(item));
}

function applicationPrayerPartners(application: OrganizationApplicationRow): OrganizationApplicationContactItem[] {
  const prayer = asRecord(asRecord(application.contact_payload).prayer_json);

  return asArray(prayer.partners)
    .map((partner) => ({
      email: asString(partner.email) || null,
      name: fullNameFromRecord(partner, "Prayer partner"),
      phone: asString(partner.phone) || null,
      relationship: asString(partner.relationship) || null,
    }))
    .filter((partner) => partner.name !== "Prayer partner" || partner.email || partner.phone || partner.relationship);
}

function applicationPrayerRequests(application: OrganizationApplicationRow) {
  const prayer = asRecord(asRecord(application.contact_payload).prayer_json);
  const structuredRequests = asArray(prayer.requests).map((request) => asString(request.text)).filter(Boolean);
  const legacyRequests = asString(application.prayer_needs)
    .split(/\n+/)
    .map((request) => request.trim())
    .filter(Boolean);

  return structuredRequests.length ? structuredRequests : legacyRequests;
}

function applicationReferences(application: OrganizationApplicationRow): OrganizationApplicationReferenceItem[] {
  const references = asArray(asRecord(application.contact_payload).references_json);

  if (references.length === 0 && application.references_text?.trim()) {
    return application.references_text
      .split(/\n+/)
      .map((line) => ({
        description: line.trim(),
        email: null,
        name: "Reference",
        organization: null,
        phone: null,
        relationship: null,
      }))
      .filter((reference) => reference.description);
  }

  return references
    .map((reference) => ({
      description: asString(reference.description) || null,
      email: asString(reference.email) || null,
      name: fullNameFromRecord(reference, "Reference"),
      organization: asString(reference.churchOrganization) || asString(reference.organization) || null,
      phone: asString(reference.phone) || null,
      relationship: asString(reference.relationship) || null,
    }))
    .filter((reference) => reference.name !== "Reference" || reference.email || reference.phone || reference.relationship || reference.description);
}

function applicationSupportDetails(application: OrganizationApplicationRow): OrganizationApplicationDetailItem[] {
  const support = asRecord(asRecord(application.contact_payload).support_json);
  const budget = asRecord(support.budget);
  const budgetDetails = Object.entries(budget)
    .map(([key, value]) => moneyDetail(key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()), value))
    .filter((item): item is OrganizationApplicationDetailItem => Boolean(item));

  return [
    compactDetail("Support Needed", support.supportNeed),
    compactDetail("Giving Preference", support.donationLinkPreference),
    moneyDetail("Monthly Budget", application.monthly_budget),
    moneyDetail("Support Goal", application.support_goal),
    moneyDetail("Committed Support", support.committedSupport),
    moneyDetail("Other Monthly Income", support.otherMonthlyIncome),
    ...budgetDetails,
  ].filter((item): item is OrganizationApplicationDetailItem => Boolean(item));
}

async function applicationSummary(supabase: SupabaseAdminClient, application: OrganizationApplicationRow): Promise<OrganizationApplicationSummary> {
  const photos = await applicationPhotoSummaries(supabase, application);

  return {
    adminNotes: application.admin_notes,
    applicantEmail: application.applicant_email,
    applicantName: application.applicant_name || "Unnamed applicant",
    applicantPhone: application.applicant_phone,
    assignedAdmin: application.assigned_admin_email,
    callingFocus: application.calling_focus,
    householdDetails: applicationHouseholdDetails(application),
    householdMembers: applicationHouseholdMembers(application),
    hasPhotos: photos.length > 0 || applicationHasPhotos(application),
    id: application.id,
    location: application.location,
    monthlyBudget: application.monthly_budget,
    photos,
    prayerPartners: applicationPrayerPartners(application),
    prayerRequests: applicationPrayerRequests(application),
    prayerNeeds: application.prayer_needs,
    references: applicationReferences(application),
    referencesText: application.references_text,
    status: application.status,
    storyAnswers: applicationStoryAnswers(application),
    storyTestimony: application.story_testimony,
    supportDetails: applicationSupportDetails(application),
    submittedAt: application.submitted_at ?? application.created_at,
    supportGoal: application.support_goal,
  };
}

function profileVisibility(profile: OrganizationApprovedProfileRow): OrganizationApprovedProfileSummary["visibility"] {
  if (profile.usam_profile_status === "archived") {
    return "Archived";
  }

  if (profile.public_visible === false || profile.show_household === false || profile.usam_profile_status === "hidden") {
    return "Hidden";
  }

  if (profile.public_visible === true || profile.usam_profile_status === "published" || profile.usam_profile_status === "approved") {
    return "Live";
  }

  return "Draft";
}

function approvedProfileSummaries({
  applications,
  profiles,
  supportSettings,
}: {
  applications: OrganizationApplicationRow[];
  profiles: OrganizationApprovedProfileRow[];
  supportSettings: OrganizationSupportSettingsRow[];
}): OrganizationApprovedProfileSummary[] {
  const approvedWorkspaceIds = new Set(
    applications
      .filter((application) => isApprovedApplication(application.status))
      .map((application) => application.workspace_id ?? application.missionary_profile_id)
      .filter((id): id is string => Boolean(id)),
  );
  const applicationByWorkspaceId = new Map(
    applications
      .filter((application) => application.workspace_id)
      .map((application) => [application.workspace_id as string, application]),
  );
  const supportByHouseholdId = new Map(supportSettings.map((support) => [support.household_id, support]));

  return profiles
    .filter((profile) => profile.usam_profile_status !== "archived")
    .filter((profile) => approvedWorkspaceIds.has(profile.id) || profile.public_visible === true || profile.usam_profile_status === "approved" || profile.usam_profile_status === "published")
    .map((profile) => {
      const support = supportByHouseholdId.get(profile.id);
      const application = applicationByWorkspaceId.get(profile.id);

      return {
        applicationId: application?.id ?? null,
        id: profile.id,
        lastUpdated: profile.updated_at ?? profile.created_at,
        location: profile.location ?? null,
        publicName: profile.display_name,
        publicUrl: `/missionaries/${profile.slug}`,
        slug: profile.slug,
        supportGoal: support?.monthly_goal ?? support?.annual_goal ?? application?.support_goal ?? null,
        visibility: profileVisibility(profile),
      };
    })
    .sort((first, second) => {
      const firstTime = first.lastUpdated ? new Date(first.lastUpdated).getTime() : 0;
      const secondTime = second.lastUpdated ? new Date(second.lastUpdated).getTime() : 0;

      return secondTime - firstTime || first.publicName.localeCompare(second.publicName);
    });
}

function profileDisplayName(profile: OrganizationProfileRow) {
  return [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim()
    || profile.email
    || "Organization member";
}

function isOrganizationTeamMember(member: OrganizationTeamMemberRow) {
  const role = member.role_title?.toLowerCase() ?? "";
  const hasAccessSignal = Boolean(member.invite_email?.trim() || member.dos_user_id?.trim());

  return hasAccessSignal && member.source !== "public_form" && !role.includes("prayer partner");
}

function memberSummaries({
  applications,
  membershipRows,
  profiles,
  teamMembers,
  workspaces,
}: {
  applications: OrganizationApplicationRow[];
  membershipRows: OrganizationMembershipRow[];
  profiles: OrganizationProfileRow[];
  teamMembers: OrganizationTeamMemberRow[];
  workspaces: OrganizationWorkspaceSummary[];
}): OrganizationMemberSummary[] {
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const workspaceById = new Map(workspaces.map((workspace) => [workspace.id, workspace]));
  const applicationByWorkspaceId = new Map(
    applications
      .filter((application) => application.workspace_id)
      .map((application) => [application.workspace_id as string, application]),
  );
  const members = new Map<string, OrganizationMemberSummary>();

  membershipRows.forEach((membership) => {
    if (!membership.profile_id || membership.status === "inactive") {
      return;
    }

    const profile = profileById.get(membership.profile_id);
    const key = `profile:${membership.profile_id}`;

    members.set(key, {
      email: profile?.email ?? null,
      id: key,
      lastActiveAt: latestDate([membership.updated_at, profile?.updated_at, membership.created_at, profile?.created_at]),
      name: profile ? profileDisplayName(profile) : "Organization member",
      role: membership.role ?? "member",
      status: membership.status,
      workspaceId: null,
      workspaceName: null,
    });
  });

  teamMembers.filter(isOrganizationTeamMember).forEach((member) => {
    const workspace = workspaceById.get(member.household_id);
    const application = applicationByWorkspaceId.get(member.household_id);
    const email = member.invite_email?.trim() || (member.dos_user_id?.includes("@") ? member.dos_user_id : null) || application?.applicant_email || null;
    const key = email ? `email:${email.toLowerCase()}` : `member:${member.id}`;

    if (members.has(key)) {
      return;
    }

    members.set(key, {
      email,
      id: key,
      lastActiveAt: latestDate([member.updated_at, member.created_at, application?.updated_at, application?.submitted_at]),
      name: member.display_name,
      role: member.role_title || member.relationship_to_workspace || "Member",
      status: member.status,
      workspaceId: member.household_id,
      workspaceName: workspace?.name ?? null,
    });
  });

  return Array.from(members.values()).sort((first, second) => {
    const firstTime = first.lastActiveAt ? new Date(first.lastActiveAt).getTime() : 0;
    const secondTime = second.lastActiveAt ? new Date(second.lastActiveAt).getTime() : 0;

    return secondTime - firstTime || first.name.localeCompare(second.name);
  });
}

function applicationsForOrganization(
  organization: OrganizationRow,
  applications: OrganizationApplicationRow[],
  workspaces: OrganizationWorkspaceSummary[],
) {
  const workspaceIds = new Set(workspaces.map((workspace) => workspace.id));

  return applications.filter((application) => (
    application.organization_id === organization.id
    || Boolean(application.workspace_id && workspaceIds.has(application.workspace_id))
    || Boolean(application.missionary_profile_id && workspaceIds.has(application.missionary_profile_id))
  ));
}

function summaryForOrganization({
  applications,
  approvedProfileCount,
  memberCount,
  organization,
  workspaces,
}: {
  applications: OrganizationApplicationRow[];
  approvedProfileCount: number;
  memberCount: number;
  organization: OrganizationRow;
  workspaces: OrganizationWorkspaceSummary[];
}): OrganizationSummary {
  return {
    applicationCount: applications.length,
    approvedProfileCount,
    brandingMode: organization.branding_mode ?? "default",
    createdAt: organization.created_at,
    id: organization.id,
    lastActivityAt: latestDate([
      organization.updated_at,
      ...workspaces.map((workspace) => workspace.lastActivityAt),
      ...applications.map((application) => latestDate([application.updated_at, application.submitted_at, application.created_at])),
    ]),
    memberCount,
    name: organization.name,
    pendingApplicationCount: applications.filter((application) => isPendingApplication(application.status)).length,
    slug: organization.slug,
    status: workspaces.length > 0 || memberCount > 0 || applications.length > 0 || approvedProfileCount > 0 ? "active" : "setup",
    type: normalizeOrganizationType(organization.type),
    updatedAt: organization.updated_at,
    workspaceCount: workspaces.length,
  };
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
    const organizationsResult = await supabase
      .from("organizations")
      .select("id, name, slug, type, branding_mode, created_at, updated_at")
      .order("name", { ascending: true });

    if (organizationsResult.error) {
      return { error: organizationsResult.error.message, organizations: [] };
    }

    const organizations = ((organizationsResult.data ?? []) as OrganizationRow[]).filter(isParentOrganization);
    const organizationIds = organizations.map((organization) => organization.id);
    const [workspaceIndex, applications, membershipRows] = await Promise.all([
      loadAdminWorkspaceIndex(),
      loadOrganizationApplications(organizationIds),
      loadOrganizationMembershipRows(organizationIds),
    ]);
    const workspacesByOrganizationId = new Map<string, OrganizationWorkspaceSummary[]>();

    organizations.forEach((organization) => {
      workspacesByOrganizationId.set(
        organization.id,
        organizationWorkspacesFromIndex(organization, workspaceIndex.workspaces).map(workspaceSummaryFromIndex),
      );
    });

    const workspaceIds = Array.from(new Set(
      Array.from(workspacesByOrganizationId.values())
        .flat()
        .map((workspace) => workspace.id),
    ));
    const profileIds = membershipRows
      .map((membership) => membership.profile_id)
      .filter((profileId): profileId is string => Boolean(profileId));
    const [teamMembers, profiles, approvedProfileRows, supportSettings] = await Promise.all([
      loadOrganizationTeamMembers(workspaceIds),
      loadOrganizationProfiles(profileIds),
      loadApprovedProfileRows(workspaceIds),
      loadOrganizationSupportSettings(workspaceIds),
    ]);

    return {
      organizations: organizations.map((organization) => {
        const workspaces = workspacesByOrganizationId.get(organization.id) ?? [];
        const organizationApplications = applicationsForOrganization(organization, applications, workspaces);
        const approvedProfiles = approvedProfileSummaries({
          applications: organizationApplications,
          profiles: approvedProfileRows.filter((profile) => workspaces.some((workspace) => workspace.id === profile.id)),
          supportSettings,
        });
        const organizationMembers = memberSummaries({
          applications: organizationApplications,
          membershipRows: membershipRows.filter((membership) => membership.organization_id === organization.id),
          profiles,
          teamMembers: teamMembers.filter((member) => workspaces.some((workspace) => workspace.id === member.household_id)),
          workspaces,
        });

        return summaryForOrganization({
          applications: organizationApplications,
          approvedProfileCount: approvedProfiles.length,
          memberCount: organizationMembers.length,
          organization,
          workspaces,
        });
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
    const organizationQuery = supabase
      .from("organizations")
      .select("id, name, slug, type, branding_mode, created_at, updated_at");
    const organizationResult = isUuid(organizationId)
      ? await organizationQuery.eq("id", organizationId).maybeSingle()
      : await organizationQuery.eq("slug", organizationId).maybeSingle();

    if (organizationResult.error) {
      return { error: organizationResult.error.message, organization: null };
    }

    if (!organizationResult.data) {
      return { organization: null };
    }

    const organization = organizationResult.data as OrganizationRow;
    const [workspaceIndex, applications, membershipRows] = await Promise.all([
      loadAdminWorkspaceIndex(),
      loadOrganizationApplications([organization.id]),
      loadOrganizationMembershipRows([organization.id]),
    ]);
    const workspaces = organizationWorkspacesFromIndex(organization, workspaceIndex.workspaces).map(workspaceSummaryFromIndex);
    const organizationApplications = applicationsForOrganization(organization, applications, workspaces);
    const profileIds = membershipRows
      .map((membership) => membership.profile_id)
      .filter((profileId): profileId is string => Boolean(profileId));
    const [teamMembers, profiles, approvedProfileRows, supportSettings] = await Promise.all([
      loadOrganizationTeamMembers(workspaces.map((workspace) => workspace.id)),
      loadOrganizationProfiles(profileIds),
      loadApprovedProfileRows(workspaces.map((workspace) => workspace.id)),
      loadOrganizationSupportSettings(workspaces.map((workspace) => workspace.id)),
    ]);
    const approvedProfiles = approvedProfileSummaries({
      applications: organizationApplications,
      profiles: approvedProfileRows,
      supportSettings,
    });
    const applicationSummaries = await Promise.all(organizationApplications.map((application) => applicationSummary(supabase, application)));
    const members = memberSummaries({
      applications: organizationApplications,
      membershipRows: membershipRows.filter((membership) => membership.organization_id === organization.id),
      profiles,
      teamMembers,
      workspaces,
    });
    const summary = summaryForOrganization({
      applications: organizationApplications,
      approvedProfileCount: approvedProfiles.length,
      memberCount: members.length,
      organization,
      workspaces,
    });

    return {
      organization: {
        ...summary,
        approvedProfiles,
        applications: applicationSummaries,
        members,
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

export async function loadPrimaryUsamOrganizationDetail(): Promise<{ error?: string; organization: OrganizationDetail | null }> {
  if (!isSupabaseAdminConfigured()) {
    return {
      error: "Supabase admin environment variables are not configured.",
      organization: null,
    };
  }

  try {
    const supabase = createSupabaseAdminClient();
    const result = await supabase
      .from("organizations")
      .select("id")
      .or("slug.eq.usa-missionaries,branding_mode.eq.usam")
      .limit(1)
      .maybeSingle();

    if (result.error) {
      return { error: result.error.message, organization: null };
    }

    if (!result.data?.id) {
      return { organization: null };
    }

    return loadOrganizationDetail(String(result.data.id));
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to load USA Missionaries.",
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
