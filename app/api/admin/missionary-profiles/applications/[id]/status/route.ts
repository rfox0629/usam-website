import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { canEditAdminContent, getAdminAuthorization } from "@/src/lib/admin-auth";
import { updateUsamApplicationWorkflow, type UsamApplicationAdminAction } from "@/src/lib/dos/usam-application";
import {
  sendApplicationApprovedEmail,
  sendApplicationDeclinedEmail,
  sendApplicationMoreInformationRequestedEmail,
} from "@/src/lib/email/resend";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type StatusPayload = {
  action?: unknown;
  adminNotes?: unknown;
  assignedAdminEmail?: unknown;
};

const workflowActions = ["approve", "archive", "decline", "hide", "publish", "reject", "request_more_info", "review"] as const satisfies readonly UsamApplicationAdminAction[];

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asAction(value: unknown): UsamApplicationAdminAction | null {
  const action = asString(value);

  return workflowActions.includes(action as UsamApplicationAdminAction) ? action as UsamApplicationAdminAction : null;
}

async function readPayload(request: Request) {
  try {
    return await request.json() as StatusPayload;
  } catch {
    return null;
  }
}

function routeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to update USA Missionaries application.";
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("usam_missionary_applications")
    || lowerMessage.includes("schema cache")
    || lowerMessage.includes("could not find")
  ) {
    return "USA Missionaries application workflow is not ready yet. Apply the latest database migration.";
  }

  return message;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
  const action = asAction(payload?.action);
  const { id } = await params;

  if (!payload || !action) {
    return NextResponse.json({ error: "Choose a valid application action." }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const result = await updateUsamApplicationWorkflow({
      action,
      adminEmail: authorization.email,
      adminNotes: asString(payload.adminNotes),
      applicationId: id,
      assignedAdminEmail: asString(payload.assignedAdminEmail),
      supabase,
    });
    const emailInput = result.applicantEmail
      ? {
        adminNote: asString(payload.adminNotes),
        applicantEmail: result.applicantEmail,
        applicantName: result.applicantName ?? "Applicant",
        applicationId: result.applicationId,
        location: result.location ?? undefined,
        status: result.status,
        submittedAt: result.submittedAt ?? new Date().toISOString(),
      }
      : null;
    const emailResult = action === "approve" && emailInput
      ? await sendApplicationApprovedEmail(emailInput)
      : action === "request_more_info" && emailInput
        ? await sendApplicationMoreInformationRequestedEmail(emailInput)
        : (action === "decline" || action === "reject") && emailInput
          ? await sendApplicationDeclinedEmail(emailInput)
          : null;

    revalidatePath("/admin/missionary-profiles");
    revalidatePath("/admin/organizations");
    revalidatePath("/admin/organizations/usam");
    revalidatePath("/admin/organizations/usa-missionaries");

    return NextResponse.json({
      applicationId: result.applicationId,
      emailSent: emailResult?.sent ?? false,
      emailStatus: emailResult,
      ok: true,
      status: result.status,
    });
  } catch (error) {
    return NextResponse.json({ error: routeErrorMessage(error) }, { status: 500 });
  }
}
