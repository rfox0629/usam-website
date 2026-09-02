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
  type JoinApplicationPhoto,
} from "@/src/lib/join/application-steps";
import { requireJoinPreviewAccess } from "@/src/lib/join/request-access";

/**
 * USA-167: saves an in-progress USA Missionaries application to the server and,
 * on request, emails the applicant the link back into it.
 *
 * This route is what makes a resume link mean anything. Before it existed the
 * draft lived only in the browser that typed it, so the link in the email had
 * nothing to reopen on a second device.
 */
export const dynamic = "force-dynamic";

const emailRequestIdPattern = /^[A-Za-z0-9_-]{16,128}$/;

function normalizeEmailRequestId(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const requestId = value.trim();

  return emailRequestIdPattern.test(requestId) ? requestId : "";
}

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

  const disclosures: Record<string, boolean> = {};

  if (record.disclosures && typeof record.disclosures === "object") {
    for (const [key, value] of Object.entries(record.disclosures as Record<string, unknown>)) {
      disclosures[key] = value === true;
    }
  }

  const photos = Array.isArray(record.photos)
    ? (record.photos as unknown[]).filter((photo): photo is JoinApplicationPhoto => {
      if (!photo || typeof photo !== "object") {
        return false;
      }

      const candidate = photo as Record<string, unknown>;

      // Only bucket-relative paths written by our own upload route are kept, so
      // a crafted draft body cannot point the application at arbitrary storage.
      return typeof candidate.path === "string"
        && candidate.path.startsWith("pending/")
        && !candidate.path.includes("..")
        && (candidate.kind === "family" || candidate.kind === "profile");
    })
    : [];

  return {
    answers,
    applicant: normalizeIdentity(record.applicant),
    applyingAsCouple: Boolean(record.applyingAsCouple),
    disclosures,
    photos,
    spouse: normalizeIdentity(record.spouse),
  };
}

export async function POST(request: Request) {
  // The draft API sits behind the same gate as the page. Otherwise the preview
  // key would protect the UI while leaving a writable endpoint open.
  if (!(await requireJoinPreviewAccess(request))) {
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
  const sendResumeEmail = payload.sendResumeEmail === true;
  const emailRequestId = normalizeEmailRequestId(payload.emailRequestId);
  const applicantName = applicantDisplayName(draft);
  const applicantEmail = draft.applicant.email || null;

  if (sendResumeEmail && !emailRequestId) {
    return NextResponse.json({ error: "missing_email_request_id" }, { status: 400 });
  }

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
  const shouldEmail = sendResumeEmail && Boolean(applicantEmail) && Boolean(token);
  let emailSent = false;

  if (shouldEmail && token && applicantEmail) {
    const email = await sendApplicationResumeEmail(applicantEmail, {
      applicantName,
      resumeUrl: buildResumeUrl(token),
    }, {
      // A retry for the same intentional action reaches Resend with the same
      // key, so the provider returns the original send instead of delivering
      // a second message. A later intentional action gets a new request ID.
      idempotencyKey: `join-resume-${emailRequestId}`,
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
