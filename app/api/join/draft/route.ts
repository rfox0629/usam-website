import { NextResponse } from "next/server";

import { sendApplicationResumeEmail } from "@/src/lib/email/resend";
import {
  buildResumeUrl,
  isJoinDraftStorageConfigured,
  saveJoinDraft,
} from "@/src/lib/join/drafts";
import {
  applicantDisplayName,
  emptyJoinApplicationDraft,
  isJoinApplicationStepId,
  type JoinApplicationDraft,
} from "@/src/lib/join/application-steps";
import { isJoinPreviewTokenValid, JOIN_PREVIEW_COOKIE_NAME } from "@/src/lib/join/preview-access";

/**
 * USA-167: saves an in-progress USA Missionaries application to the server and,
 * on request, emails the applicant the link back into it.
 *
 * This route is what makes a resume link mean anything. Before it existed the
 * draft lived only in the browser that typed it, so the link in the email had
 * nothing to reopen on a second device.
 */
export const dynamic = "force-dynamic";

function normalizeIdentity(value: unknown) {
  const empty = emptyJoinApplicationDraft().applicant;

  if (!value || typeof value !== "object") {
    return empty;
  }

  const record = value as Record<string, unknown>;
  const asString = (key: string) => (typeof record[key] === "string" ? (record[key] as string).trim() : "");

  return {
    email: asString("email"),
    firstName: asString("firstName"),
    lastName: asString("lastName"),
    phone: asString("phone"),
  };
}

function normalizeDraft(value: unknown): JoinApplicationDraft {
  const empty = emptyJoinApplicationDraft();

  if (!value || typeof value !== "object") {
    return empty;
  }

  const record = value as Record<string, unknown>;
  const answers: Record<string, string> = {};

  if (record.answers && typeof record.answers === "object") {
    for (const [key, answer] of Object.entries(record.answers as Record<string, unknown>)) {
      if (typeof answer === "string") {
        answers[key] = answer;
      }
    }
  }

  return {
    answers,
    applicant: normalizeIdentity(record.applicant),
    applyingAsCouple: Boolean(record.applyingAsCouple),
    spouse: normalizeIdentity(record.spouse),
  };
}

export async function POST(request: Request) {
  // The draft API sits behind the same gate as the page. Otherwise the preview
  // key would protect the UI while leaving a writable endpoint open.
  const previewCookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${JOIN_PREVIEW_COOKIE_NAME}=`))
    ?.split("=")[1];

  if (!(await isJoinPreviewTokenValid(previewCookie))) {
    return NextResponse.json({ error: "not_available" }, { status: 404 });
  }

  if (!isJoinDraftStorageConfigured()) {
    return NextResponse.json({ error: "draft_storage_unavailable" }, { status: 503 });
  }

  let payload: Record<string, unknown>;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const currentStep = isJoinApplicationStepId(payload.currentStep) ? payload.currentStep : "start";
  const draft = normalizeDraft(payload.draft);
  const resumeToken = typeof payload.resumeToken === "string" ? payload.resumeToken : null;
  const applicantName = applicantDisplayName(draft);
  const applicantEmail = draft.applicant.email || null;

  let result;

  try {
    result = await saveJoinDraft({
      applicantEmail,
      applicantName: applicantName || null,
      currentStep,
      draft,
      resumeToken,
    });
  } catch (error) {
    console.warn(`Join draft save failed: ${error instanceof Error ? error.message : "unknown error"}`);

    return NextResponse.json({ error: "draft_save_failed" }, { status: 500 });
  }

  // A minted token is returned once, on creation, so the browser can keep
  // saving into the same draft. It is never stored in the clear server-side.
  const token = result.resumeToken ?? resumeToken;
  const shouldEmail = payload.sendResumeEmail === true && Boolean(applicantEmail) && Boolean(token);
  let emailSent = false;

  if (shouldEmail && token && applicantEmail) {
    const email = await sendApplicationResumeEmail(applicantEmail, {
      applicantName,
      resumeUrl: buildResumeUrl(token),
    });

    emailSent = email.sent;
  }

  return NextResponse.json({
    created: result.created,
    emailSent,
    id: result.id,
    // Only ever handed back to the browser that is filling the form in.
    resumeToken: result.resumeToken,
    savedAt: new Date().toISOString(),
  });
}
