import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { canEditAdminContent, getAdminAuthorization } from "@/src/lib/admin-auth";
import { findOrCreateUsamOrganization, type UsamApplicationStatus, type UsamProfileStatus } from "@/src/lib/dos/usam-application";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type AttachPayload = {
  workspaceId?: unknown;
};

type HouseholdRow = {
  display_name: string | null;
  id: string;
  location: string | null;
  original_story?: string | null;
  profile_image_url: string | null;
  public_story?: string | null;
  public_visible: boolean | null;
  short_mission: string | null;
  show_household?: boolean | null;
  slug: string;
  story: string | null;
  support_explanation?: string | null;
  support_target_fund?: string | null;
  support_target_household_id?: string | null;
  usam_application_id?: string | null;
  usam_application_reviewed_at?: string | null;
  usam_application_status?: UsamApplicationStatus | string | null;
  usam_application_submitted_at?: string | null;
  usam_assigned_admin_email?: string | null;
  usam_profile_status?: UsamProfileStatus | string | null;
};

const applicationSelect = "id, workspace_id, missionary_profile_id, profile_id, applicant_name, applicant_email, applicant_phone, location, story_testimony, profile_photo_url, calling_focus, monthly_budget, support_goal, prayer_needs, references_text, status, assigned_admin_email, admin_notes, submitted_at, reviewed_at, created_at, updated_at";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function readPayload(request: Request) {
  try {
    return await request.json() as AttachPayload;
  } catch {
    return null;
  }
}

function cleanText(value: string | null | undefined) {
  const text = value?.trim();

  return text ? text : null;
}

function isWorkflowSchemaError(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";

  return message.includes("usam_missionary_applications")
    || message.includes("usam_application_id")
    || message.includes("usam_application_status")
    || message.includes("usam_profile_status")
    || message.includes("schema cache")
    || message.includes("could not find")
    || message.includes("does not exist");
}

function routeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to attach USA Missionaries profile workflow.";

  if (isWorkflowSchemaError({ message })) {
    return "USA Missionaries application workflow is not ready yet. Apply the latest database migration.";
  }

  return message;
}

function isPublicProfileLive(household: HouseholdRow) {
  return household.public_visible === true && household.show_household !== false;
}

function statusForExistingWorkspace(household: HouseholdRow): UsamApplicationStatus {
  if (isPublicProfileLive(household)) {
    return "active";
  }

  if (household.usam_application_status === "approved" || household.usam_application_status === "pending_review") {
    return household.usam_application_status;
  }

  return "application_started";
}

function profileStatusForExistingWorkspace(household: HouseholdRow): UsamProfileStatus {
  if (isPublicProfileLive(household)) {
    return "published";
  }

  switch (household.usam_profile_status) {
    case "approved":
    case "archived":
    case "hidden":
    case "published":
    case "under_review":
      return household.usam_profile_status;
    default:
      return "draft";
  }
}

export async function POST(request: Request) {
  const authorization = await getAdminAuthorization();

  if (authorization.status === "unauthenticated") {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (authorization.status === "configuration_error") {
    return NextResponse.json({ error: authorization.message }, { status: 500 });
  }

  if (authorization.status === "unauthorized" || !canEditAdminContent(authorization)) {
    return NextResponse.json({ error: "Admin editor access required." }, { status: 403 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase admin environment variables are not configured." }, { status: 500 });
  }

  const payload = await readPayload(request);
  const workspaceId = asString(payload?.workspaceId);

  if (!payload || !workspaceId) {
    return NextResponse.json({ error: "Choose a workspace to attach." }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const organization = await findOrCreateUsamOrganization(supabase);
    const householdResult = await supabase
      .from("missionary_households")
      .select("id, slug, display_name, location, profile_image_url, short_mission, story, public_visible, show_household, original_story, public_story, support_explanation, support_target_household_id, support_target_fund, usam_application_id, usam_application_status, usam_profile_status, usam_application_submitted_at, usam_application_reviewed_at, usam_assigned_admin_email")
      .eq("id", workspaceId)
      .maybeSingle();

    if (householdResult.error && isWorkflowSchemaError(householdResult.error)) {
      return NextResponse.json({ error: routeErrorMessage(householdResult.error) }, { status: 409 });
    }

    if (householdResult.error) {
      throw new Error(householdResult.error.message);
    }

    if (!householdResult.data) {
      return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    }

    const household = householdResult.data as HouseholdRow;
    const now = new Date().toISOString();
    const status = statusForExistingWorkspace(household);
    const profileStatus = profileStatusForExistingWorkspace(household);
    const submittedAt = household.usam_application_submitted_at ?? now;
    const reviewedAt = status === "active" || status === "approved"
      ? household.usam_application_reviewed_at ?? now
      : household.usam_application_reviewed_at ?? null;
    const existingResult = await supabase
      .from("usam_missionary_applications")
      .select(applicationSelect)
      .eq("workspace_id", workspaceId)
      .eq("organization_id", organization.id)
      .not("status", "in", "(rejected,declined,archived)")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingResult.error && isWorkflowSchemaError(existingResult.error)) {
      return NextResponse.json({ error: routeErrorMessage(existingResult.error) }, { status: 409 });
    }

    if (existingResult.error) {
      throw new Error(existingResult.error.message);
    }

    const applicationSeed = {
      applicant_name: cleanText(household.display_name) ?? "USA Missionaries Applicant",
      calling_focus: cleanText(household.short_mission),
      location: cleanText(household.location),
      missionary_profile_id: household.id,
      organization_id: organization.id,
      prayer_needs: cleanText(household.support_explanation),
      profile_photo_url: cleanText(household.profile_image_url),
      status,
      story_testimony: cleanText(household.original_story ?? household.public_story ?? household.story),
      submitted_at: submittedAt,
      reviewed_at: reviewedAt,
      workspace_id: household.id,
    };

    // Future applicants should attach to an existing DOS workspace through
    // workspace_id/missionary_profile_id before creating any separate public
    // profile record. That keeps household, people, meetings, prayer, support,
    // and publishing data anchored to one missionary_households row.
    const applicationResult = existingResult.data?.id
      ? await supabase
        .from("usam_missionary_applications")
        .update({
          ...applicationSeed,
          assigned_admin_email: existingResult.data.assigned_admin_email ?? household.usam_assigned_admin_email ?? authorization.email,
        })
        .eq("id", existingResult.data.id)
        .select(applicationSelect)
        .single()
      : await supabase
        .from("usam_missionary_applications")
        .insert({
          ...applicationSeed,
          assigned_admin_email: household.usam_assigned_admin_email ?? authorization.email,
        })
        .select(applicationSelect)
        .single();

    if (applicationResult.error || !applicationResult.data?.id) {
      throw new Error(applicationResult.error?.message ?? "Unable to create USA Missionaries profile workflow.");
    }

    const application = applicationResult.data;
    const householdUpdateResult = await supabase
      .from("missionary_households")
      .update({
        usam_application_id: application.id,
        usam_application_reviewed_at: reviewedAt,
        usam_application_status: application.status,
        usam_application_submitted_at: submittedAt,
        usam_assigned_admin_email: application.assigned_admin_email ?? household.usam_assigned_admin_email ?? authorization.email,
        usam_profile_status: profileStatus,
      })
      .eq("id", household.id);

    if (householdUpdateResult.error) {
      throw new Error(householdUpdateResult.error.message);
    }

    revalidatePath("/admin/missionary-profiles");

    return NextResponse.json({
      application,
      applicationId: application.id,
      ok: true,
      profileStatus,
      status: application.status,
    });
  } catch (error) {
    return NextResponse.json({ error: routeErrorMessage(error) }, { status: 500 });
  }
}
