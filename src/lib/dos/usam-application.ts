import "server-only";

import type { DosAuthorization } from "@/src/lib/dos/auth";
import type { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;
type SupabaseError = { message?: string } | null | undefined;

export const usamApplicationStatuses = [
  "independent",
  "not_connected",
  "application_started",
  "application_submitted",
  "pending_review",
  "approved",
  "active",
  "rejected",
  "archived",
] as const;

export type UsamApplicationStatus = typeof usamApplicationStatuses[number];
export type UsamProfileStatus = "approved" | "archived" | "draft" | "hidden" | "published" | "under_review";

export type DosUsamOrganizationApplication = {
  applicationId: string | null;
  appliedAt: string | null;
  assignedAdminEmail: string | null;
  organizationId: string | null;
  organizationName: string;
  profileStatus: UsamProfileStatus;
  publicProfileHref: string;
  publicProfileLive: boolean;
  reviewedAt: string | null;
  status: UsamApplicationStatus;
};

type UsamApplicationRow = {
  applicant_email: string | null;
  applicant_name: string | null;
  applicant_phone: string | null;
  assigned_admin_email: string | null;
  id: string;
  missionary_profile_id: string | null;
  organization_id: string | null;
  profile_id: string | null;
  reviewed_at: string | null;
  status: string | null;
  submitted_at: string | null;
  workspace_id: string;
};

type HouseholdApplicationRow = {
  id: string;
  public_visible?: boolean | null;
  show_household?: boolean | null;
  slug: string;
  usam_application_id?: string | null;
  usam_application_reviewed_at?: string | null;
  usam_application_status?: string | null;
  usam_application_submitted_at?: string | null;
  usam_assigned_admin_email?: string | null;
  usam_profile_status?: string | null;
};

type OrganizationRow = {
  branding_mode: string | null;
  id: string;
  name: string;
  slug: string;
};

export type UsamApplicationSubmitPayload = {
  applicantEmail: string;
  applicantName: string;
  applicantPhone: string;
  callingFocus: string;
  contactPayload?: Record<string, unknown>;
  location: string;
  monthlyBudget: number | null;
  prayerNeeds: string;
  profilePhotoUrl: string;
  referencesText: string;
  storyTestimony: string;
  supportGoal: number | null;
  workspaceId: string;
};
type WriteUsamApplicationInput = {
  applicantUserId: string | null;
  payload: UsamApplicationSubmitPayload;
  profileId: string;
  supabase: SupabaseAdminClient;
};

export type UsamApplicationAdminAction = "approve" | "archive" | "hide" | "publish" | "reject" | "review";

function cleanText(value: string | null | undefined) {
  const text = value?.trim();

  return text ? text : null;
}

function isMissingWorkflowError(error: SupabaseError) {
  const message = error?.message?.toLowerCase() ?? "";

  return message.includes("usam_missionary_applications")
    || message.includes("usam_application_id")
    || message.includes("usam_application_status")
    || message.includes("usam_profile_status")
    || message.includes("schema cache")
    || message.includes("could not find");
}

function normalizeStatus(value: string | null | undefined): UsamApplicationStatus {
  return usamApplicationStatuses.includes(value as UsamApplicationStatus)
    ? value as UsamApplicationStatus
    : "not_connected";
}

function normalizeProfileStatus(value: string | null | undefined): UsamProfileStatus {
  switch (value) {
    case "approved":
    case "archived":
    case "hidden":
    case "published":
    case "under_review":
      return value;
    case "draft":
    default:
      return "draft";
  }
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const firstName = parts.shift() ?? "DOS";
  const lastName = parts.join(" ");

  return { firstName, lastName };
}

function publicProfileLive(workspace: HouseholdApplicationRow) {
  return workspace.public_visible === true && workspace.show_household !== false;
}

function statusFromWorkspace(workspace: HouseholdApplicationRow): UsamApplicationStatus {
  const status = normalizeStatus(workspace.usam_application_status);

  if (status === "not_connected" && publicProfileLive(workspace)) {
    return "active";
  }

  return status;
}

async function loadUsamOrganization(supabase: SupabaseAdminClient) {
  const slugResult = await supabase
    .from("organizations")
    .select("id, name, slug, branding_mode")
    .eq("slug", "usa-missionaries")
    .maybeSingle();

  if (!slugResult.error && slugResult.data) {
    return slugResult.data as OrganizationRow;
  }

  const brandingResult = await supabase
    .from("organizations")
    .select("id, name, slug, branding_mode")
    .eq("branding_mode", "usam")
    .limit(1)
    .maybeSingle();

  if (!brandingResult.error && brandingResult.data) {
    return brandingResult.data as OrganizationRow;
  }

  return null;
}

export async function findOrCreateUsamOrganization(supabase: SupabaseAdminClient) {
  const existing = await loadUsamOrganization(supabase);

  if (existing) {
    return existing;
  }

  const insertResult = await supabase
    .from("organizations")
    .insert({
      branding_mode: "usam",
      name: "USA Missionaries",
      slug: "usa-missionaries",
      type: "ministry",
    })
    .select("id, name, slug, branding_mode")
    .single();

  if (insertResult.error || !insertResult.data) {
    throw new Error(insertResult.error?.message ?? "Unable to create USA Missionaries organization.");
  }

  return insertResult.data as OrganizationRow;
}

export async function loadUsamApplicationForWorkspace(
  supabase: SupabaseAdminClient,
  workspace: HouseholdApplicationRow,
): Promise<DosUsamOrganizationApplication> {
  const organization = await loadUsamOrganization(supabase).catch(() => null);
  const applicationResult = await supabase
    .from("usam_missionary_applications")
    .select("id, workspace_id, organization_id, profile_id, missionary_profile_id, applicant_name, applicant_email, applicant_phone, status, assigned_admin_email, submitted_at, reviewed_at")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const application = applicationResult.error && isMissingWorkflowError(applicationResult.error)
    ? null
    : applicationResult.data as UsamApplicationRow | null;
  const status = application
    ? normalizeStatus(application.status)
    : statusFromWorkspace(workspace);
  const inferredProfileStatus = publicProfileLive(workspace)
    ? "published"
    : normalizeProfileStatus(workspace.usam_profile_status);

  return {
    applicationId: application?.id ?? workspace.usam_application_id ?? null,
    appliedAt: application?.submitted_at ?? workspace.usam_application_submitted_at ?? null,
    assignedAdminEmail: application?.assigned_admin_email ?? workspace.usam_assigned_admin_email ?? null,
    organizationId: application?.organization_id ?? organization?.id ?? null,
    organizationName: organization?.name ?? "USA Missionaries",
    profileStatus: inferredProfileStatus,
    publicProfileHref: `/missionaries/${workspace.slug}`,
    publicProfileLive: publicProfileLive(workspace),
    reviewedAt: application?.reviewed_at ?? workspace.usam_application_reviewed_at ?? null,
    status,
  };
}

async function findOrCreateApplicantProfile({
  authorization,
  email,
  name,
  organizationId,
  phone,
  supabase,
}: {
  authorization: Extract<DosAuthorization, { status: "authorized" }>;
  email: string;
  name: string;
  organizationId: string;
  phone: string | null;
  supabase: SupabaseAdminClient;
}) {
  const userProfileResult = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", authorization.userId)
    .maybeSingle();

  if (!userProfileResult.error && userProfileResult.data?.id) {
    return String(userProfileResult.data.id);
  }

  if (email) {
    const emailProfileResult = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    if (!emailProfileResult.error && emailProfileResult.data?.id) {
      return String(emailProfileResult.data.id);
    }
  }

  const { firstName, lastName } = splitName(name);
  const insertResult = await supabase
    .from("profiles")
    .insert({
      email: email || null,
      first_name: firstName,
      last_name: lastName,
      owner_organization_id: organizationId,
      phone,
      user_id: authorization.userId,
    })
    .select("id")
    .single();

  if (!insertResult.error && insertResult.data?.id) {
    return String(insertResult.data.id);
  }

  const retryResult = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", authorization.userId)
    .maybeSingle();

  if (!retryResult.error && retryResult.data?.id) {
    return String(retryResult.data.id);
  }

  throw new Error(insertResult.error?.message ?? "Unable to connect your DOS account to an application profile.");
}

async function upsertOrganizationMembership({
  organizationId,
  profileId,
  status,
  supabase,
}: {
  organizationId: string;
  profileId: string;
  status: UsamApplicationStatus;
  supabase: SupabaseAdminClient;
}) {
  const existingResult = await supabase
    .from("organization_memberships")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (!existingResult.error && existingResult.data?.id) {
    const updateResult = await supabase
      .from("organization_memberships")
      .update({ role: "member", status })
      .eq("id", existingResult.data.id);

    if (updateResult.error) {
      throw new Error(updateResult.error.message);
    }

    return;
  }

  const insertResult = await supabase
    .from("organization_memberships")
    .insert({
      organization_id: organizationId,
      profile_id: profileId,
      role: "member",
      status,
    });

  if (insertResult.error) {
    throw new Error(insertResult.error.message);
  }
}

export async function submitUsamApplication({
  authorization,
  payload,
  supabase,
}: {
  authorization: Extract<DosAuthorization, { status: "authorized" }>;
  payload: UsamApplicationSubmitPayload;
  supabase: SupabaseAdminClient;
}) {
  const organization = await findOrCreateUsamOrganization(supabase);
  const profileId = await findOrCreateApplicantProfile({
    authorization,
    email: payload.applicantEmail,
    name: payload.applicantName,
    organizationId: organization.id,
    phone: cleanText(payload.applicantPhone),
    supabase,
  });

  return writeUsamApplication({
    applicantUserId: authorization.userId,
    payload,
    profileId,
    supabase,
  });
}

export async function submitUsamApplicationForSetup({
  applicantUserId = null,
  payload,
  profileId,
  supabase,
}: {
  applicantUserId?: string | null;
  payload: UsamApplicationSubmitPayload;
  profileId: string;
  supabase: SupabaseAdminClient;
}) {
  return writeUsamApplication({
    applicantUserId,
    payload,
    profileId,
    supabase,
  });
}

async function writeUsamApplication({
  applicantUserId,
  payload,
  profileId,
  supabase,
}: WriteUsamApplicationInput) {
  const organization = await findOrCreateUsamOrganization(supabase);
  const existingResult = await supabase
    .from("usam_missionary_applications")
    .select("id")
    .eq("workspace_id", payload.workspaceId)
    .eq("organization_id", organization.id)
    .not("status", "in", "(rejected,archived)")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingResult.error && isMissingWorkflowError(existingResult.error)) {
    throw new Error("USA Missionaries applications are not ready yet. Please apply the latest database migration.");
  }

  if (existingResult.error) {
    throw new Error(existingResult.error.message);
  }

  const submittedAt = new Date().toISOString();
  const applicationRecord = {
    applicant_email: cleanText(payload.applicantEmail),
    applicant_name: payload.applicantName,
    applicant_phone: cleanText(payload.applicantPhone),
    applicant_user_id: applicantUserId,
    calling_focus: cleanText(payload.callingFocus),
    contact_payload: {
      ...(payload.contactPayload ?? {}),
      email: cleanText(payload.applicantEmail),
      phone: cleanText(payload.applicantPhone),
    },
    location: cleanText(payload.location),
    missionary_profile_id: payload.workspaceId,
    monthly_budget: payload.monthlyBudget,
    organization_id: organization.id,
    prayer_needs: cleanText(payload.prayerNeeds),
    profile_id: profileId,
    profile_photo_url: cleanText(payload.profilePhotoUrl),
    references_text: cleanText(payload.referencesText),
    status: "pending_review" as const,
    story_testimony: cleanText(payload.storyTestimony),
    submitted_at: submittedAt,
    support_goal: payload.supportGoal,
    workspace_id: payload.workspaceId,
  };
  const writeResult = existingResult.data?.id
    ? await supabase
      .from("usam_missionary_applications")
      .update(applicationRecord)
      .eq("id", existingResult.data.id)
      .select("id")
      .single()
    : await supabase
      .from("usam_missionary_applications")
      .insert(applicationRecord)
      .select("id")
      .single();

  if (writeResult.error || !writeResult.data?.id) {
    throw new Error(writeResult.error?.message ?? "Unable to submit USA Missionaries application.");
  }

  await upsertOrganizationMembership({
    organizationId: organization.id,
    profileId,
    status: "pending_review",
    supabase,
  });

  const monthlyGoal = payload.supportGoal ?? payload.monthlyBudget ?? null;
  const householdUpdate = {
    display_name: payload.applicantName,
    location: cleanText(payload.location),
    original_story: cleanText(payload.storyTestimony),
    profile_image_url: cleanText(payload.profilePhotoUrl),
    public_visible: false,
    short_mission: cleanText(payload.callingFocus),
    show_household: false,
    show_photos: false,
    show_prayer: true,
    show_story: false,
    show_support: false,
    show_team: false,
    support_explanation: cleanText(payload.prayerNeeds),
    usam_application_id: writeResult.data.id,
    usam_application_status: "pending_review",
    usam_application_submitted_at: submittedAt,
    usam_assigned_admin_email: null,
    usam_profile_status: "under_review",
  };
  const householdResult = await supabase
    .from("missionary_households")
    .update(householdUpdate)
    .eq("id", payload.workspaceId);

  if (householdResult.error) {
    throw new Error(householdResult.error.message);
  }

  if (monthlyGoal !== null) {
    const supportResult = await supabase
      .from("missionary_support_settings")
      .upsert({
        annual_goal: Math.round(monthlyGoal * 12),
        household_id: payload.workspaceId,
        monthly_goal: Math.round(monthlyGoal),
        show_support: false,
      }, { onConflict: "household_id" });

    if (supportResult.error) {
      throw new Error(supportResult.error.message);
    }
  }

  return {
    applicationId: String(writeResult.data.id),
    organizationId: organization.id,
    submittedAt,
  };
}

async function loadApplicationById(supabase: SupabaseAdminClient, applicationId: string) {
  const { data, error } = await supabase
    .from("usam_missionary_applications")
    .select("id, workspace_id, organization_id, profile_id, missionary_profile_id, applicant_name, applicant_email, applicant_phone, status, assigned_admin_email, submitted_at, reviewed_at")
    .eq("id", applicationId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "USA Missionaries application not found.");
  }

  return data as UsamApplicationRow;
}

export async function updateUsamApplicationWorkflow({
  action,
  adminEmail,
  applicationId,
  adminNotes,
  assignedAdminEmail,
  supabase,
}: {
  action: UsamApplicationAdminAction;
  adminEmail: string;
  applicationId: string;
  adminNotes?: string | null;
  assignedAdminEmail?: string | null;
  supabase: SupabaseAdminClient;
}) {
  const application = await loadApplicationById(supabase, applicationId);
  const now = new Date().toISOString();
  const nextApplicationStatus: UsamApplicationStatus = action === "approve"
    ? "approved"
    : action === "publish"
      ? "active"
      : action === "reject"
        ? "rejected"
        : action === "archive"
          ? "archived"
          : normalizeStatus(application.status);
  const nextProfileStatus: UsamProfileStatus = action === "approve"
    ? "approved"
    : action === "publish"
      ? "published"
      : action === "hide"
        ? "hidden"
        : action === "archive"
          ? "archived"
          : action === "reject"
            ? "hidden"
            : "under_review";
  const applicationUpdate: Record<string, unknown> = {
    assigned_admin_email: cleanText(assignedAdminEmail) ?? application.assigned_admin_email ?? adminEmail,
    reviewed_at: action === "review" ? application.reviewed_at : now,
  };

  if (adminNotes !== undefined) {
    applicationUpdate.admin_notes = cleanText(adminNotes);
  }

  if (action !== "hide" && action !== "review") {
    applicationUpdate.status = nextApplicationStatus;
  }

  const updateResult = await supabase
    .from("usam_missionary_applications")
    .update(applicationUpdate)
    .eq("id", application.id)
    .select("id")
    .single();

  if (updateResult.error) {
    throw new Error(updateResult.error.message);
  }

  if (application.organization_id && application.profile_id && action !== "review" && action !== "hide") {
    await upsertOrganizationMembership({
      organizationId: application.organization_id,
      profileId: application.profile_id,
      status: nextApplicationStatus,
      supabase,
    });
  }

  const publicVisible = action === "publish"
    ? true
    : action === "hide" || action === "reject" || action === "archive"
      ? false
      : undefined;
  const householdUpdate: Record<string, unknown> = {
    usam_application_reviewed_at: action === "review" ? application.reviewed_at : now,
    usam_application_status: action === "hide" || action === "review" ? normalizeStatus(application.status) : nextApplicationStatus,
    usam_assigned_admin_email: cleanText(assignedAdminEmail) ?? application.assigned_admin_email ?? adminEmail,
    usam_profile_status: nextProfileStatus,
  };

  if (publicVisible !== undefined) {
    householdUpdate.public_visible = publicVisible;
    householdUpdate.show_household = publicVisible;
  }

  if (action === "publish") {
    householdUpdate.show_photos = true;
    householdUpdate.show_prayer = true;
    householdUpdate.show_story = true;
    householdUpdate.show_support = true;
    householdUpdate.show_team = true;
  }

  const householdResult = await supabase
    .from("missionary_households")
    .update(householdUpdate)
    .eq("id", application.missionary_profile_id ?? application.workspace_id);

  if (householdResult.error) {
    throw new Error(householdResult.error.message);
  }

  return {
    applicationId: application.id,
    status: nextApplicationStatus,
  };
}
