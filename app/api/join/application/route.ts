import { NextResponse } from "next/server";

import { sendAdminNewApplicationNotificationEmail, sendApplicantApplicationSubmittedEmail } from "@/src/lib/email/resend";
import { getConfiguredSiteUrl } from "@/src/lib/site-url";
import { applicantDisplayName, joinDisclosureIds } from "@/src/lib/join/application-steps";
import { isJoinDraftStorageConfigured, resolveResumeToken } from "@/src/lib/join/drafts";
import { requireJoinPreviewAccess } from "@/src/lib/join/request-access";
import { submitJoinApplication } from "@/src/lib/join/submit-application";

/**
 * USA-167: final submission of the USA Missionaries application.
 *
 * The draft is re-read from the server by its resume token rather than trusting
 * a body the browser sends. Submitting is the one irreversible step in the
 * flow, so what gets written is what was actually saved, not what a client
 * claims was saved.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await requireJoinPreviewAccess(request))) {
    return NextResponse.json({ error: "not_available" }, { status: 404 });
  }

  if (!isJoinDraftStorageConfigured()) {
    return NextResponse.json({ error: "draft_storage_unavailable" }, { status: 503 });
  }

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const resumeToken = typeof body.resumeToken === "string" ? body.resumeToken.trim() : "";

  if (!resumeToken) {
    return NextResponse.json({ error: "missing_resume_token" }, { status: 400 });
  }

  const lookup = await resolveResumeToken(resumeToken);

  if (lookup.status !== "ok") {
    // An already-submitted draft is not an error worth alarming anyone about,
    // it just means the button was pressed twice.
    const status = lookup.reason === "submitted" ? 409 : 404;

    return NextResponse.json({ error: lookup.reason }, { status });
  }

  const draft = lookup.record.draft;
  const missingDisclosures: string[] = joinDisclosureIds.filter((id) => draft.disclosures[id] !== true);
  const supportPath = draft.answers.supportPath;

  if (
    (supportPath === "yes" || supportPath === "unsure") &&
    draft.disclosures.excessSupportAgreement !== true
  ) {
    missingDisclosures.push("excessSupportAgreement");
  }

  if (missingDisclosures.length > 0) {
    return NextResponse.json({ error: "disclosures_required", missingDisclosures }, { status: 400 });
  }

  let result;

  try {
    result = await submitJoinApplication({ draft, resumeToken });
  } catch (error) {
    console.warn(`Join application submit failed: ${error instanceof Error ? error.message : "unknown error"}`);

    return NextResponse.json({ error: "submit_failed" }, { status: 500 });
  }

  const applicantName = applicantDisplayName(draft);
  const submittedAt = new Date().toISOString();
  const emailInput = {
    adminUrl: `${getConfiguredSiteUrl()}/operations/missionaries`,
    applicantEmail: draft.applicant.email.trim(),
    applicantName,
    applicationId: result.applicationId,
    location: [draft.answers.city ?? "", draft.answers.state ?? ""].filter(Boolean).join(", "),
    status: "pending_review",
    submittedAt,
  };

  // Email failure must not lose a submitted application, so these are reported
  // rather than thrown.
  const applicantEmail = await sendApplicantApplicationSubmittedEmail(emailInput);
  const adminEmail = await sendAdminNewApplicationNotificationEmail(emailInput);

  return NextResponse.json({
    applicationId: result.applicationId,
    adminEmailSent: adminEmail.sent,
    applicantEmailSent: applicantEmail.sent,
    submittedAt,
  });
}
