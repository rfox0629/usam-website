import { NextResponse } from "next/server";
import { requireDosWorkspaceRouteAccess } from "@/src/lib/dos/api-auth";
import { canWriteDosActivity, getDosAuthorization } from "@/src/lib/dos/auth";
import { resolveDosAppWorkspace } from "@/src/lib/dos/missionary-app";
import { submitUsamApplication } from "@/src/lib/dos/usam-application";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type ApplyPayload = {
  applicantEmail?: unknown;
  applicantName?: unknown;
  applicantPhone?: unknown;
  callingFocus?: unknown;
  location?: unknown;
  monthlyBudget?: unknown;
  prayerNeeds?: unknown;
  profilePhotoUrl?: unknown;
  referencesText?: unknown;
  storyTestimony?: unknown;
  supportGoal?: unknown;
  workspaceId?: unknown;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/[$,]/g, "").trim();

  if (!normalized) {
    return null;
  }

  const number = Number(normalized);

  return Number.isFinite(number) ? number : null;
}

async function readPayload(request: Request) {
  try {
    return await request.json() as ApplyPayload;
  } catch {
    return null;
  }
}

function applyErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to submit USA Missionaries application.";
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("usam_missionary_applications")
    || lowerMessage.includes("usam_application")
    || lowerMessage.includes("schema cache")
    || lowerMessage.includes("could not find")
    || lowerMessage.includes("not ready")
  ) {
    return "USA Missionaries applications are not ready yet. Please apply the latest database migration.";
  }

  return message;
}

export async function POST(request: Request) {
  const authorization = await getDosAuthorization();

  if (authorization.status === "unauthenticated") {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (authorization.status === "configuration_error") {
    return NextResponse.json({ error: authorization.message }, { status: 500 });
  }

  if (authorization.status === "unauthorized" || !canWriteDosActivity(authorization)) {
    return NextResponse.json({ error: "DOS workspace access required." }, { status: 403 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase admin environment variables are not configured." }, { status: 500 });
  }

  const payload = await readPayload(request);

  if (!payload) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const workspaceRef = asString(payload.workspaceId);
  const workspace = await resolveDosAppWorkspace(workspaceRef);

  if (!workspace) {
    return NextResponse.json({ error: "DOS workspace not found." }, { status: 404 });
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(authorization, workspace.id);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  const applicantName = asString(payload.applicantName);
  const applicantEmail = asString(payload.applicantEmail).toLowerCase() || authorization.email;
  const storyTestimony = asString(payload.storyTestimony);
  const callingFocus = asString(payload.callingFocus);

  if (!applicantName || !applicantEmail || !storyTestimony || !callingFocus) {
    return NextResponse.json({ error: "Name, email, story, and calling focus are required." }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const result = await submitUsamApplication({
      authorization,
      payload: {
        applicantEmail,
        applicantName,
        applicantPhone: asString(payload.applicantPhone),
        callingFocus,
        location: asString(payload.location),
        monthlyBudget: asNullableNumber(payload.monthlyBudget),
        prayerNeeds: asString(payload.prayerNeeds),
        profilePhotoUrl: asString(payload.profilePhotoUrl),
        referencesText: asString(payload.referencesText),
        storyTestimony,
        supportGoal: asNullableNumber(payload.supportGoal),
        workspaceId: workspace.id,
      },
      supabase,
    });

    return NextResponse.json({
      applicationId: result.applicationId,
      ok: true,
      status: "pending_review",
      submittedAt: result.submittedAt,
    });
  } catch (error) {
    return NextResponse.json({ error: applyErrorMessage(error) }, { status: 500 });
  }
}
