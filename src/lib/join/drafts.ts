import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import { getConfiguredSiteUrl } from "@/src/lib/site-url";
import {
  emptyJoinApplicationDraft,
  isJoinApplicationStepId,
  type JoinApplicationDraft,
  type JoinApplicationStepId,
} from "@/src/lib/join/application-steps";

/**
 * USA-167: server-side application drafts and the resume links that reopen them.
 *
 * The defect this exists to fix: /join used to save drafts only to localStorage,
 * so the resume link in an email could never restore anything on a second
 * device. The token below is the whole point. It is generated once, mailed once,
 * and resolved server-side on every click.
 *
 * Only the sha256 of the token is stored. A database leak therefore does not
 * hand out working resume links, and we can still look a draft up in one
 * indexed query.
 */

const DRAFTS_TABLE = "usam_application_drafts";
const RESUME_TOKEN_BYTES = 32;

export type JoinDraftRecord = {
  applicantEmail: string | null;
  applicantName: string | null;
  currentStep: JoinApplicationStepId;
  draft: JoinApplicationDraft;
  expiresAt: string;
  id: string;
  status: "abandoned" | "draft" | "submitted";
};

export function isJoinDraftStorageConfigured() {
  return isSupabaseAdminConfigured();
}

export function createResumeToken() {
  // base64url so the token survives being pasted into a URL and an email client
  // without escaping.
  return randomBytes(RESUME_TOKEN_BYTES).toString("base64url");
}

export function hashResumeToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * The canonical URL that goes in the resume email.
 *
 * There is exactly one builder for this, and it is used by the email template
 * and asserted by the release gate. The Aug 21 and Aug 23 failures were a
 * resume link that resolved somewhere other than the application, so the path
 * is not assembled ad hoc anywhere else.
 */
export function buildResumeUrl(token: string, baseUrl = getConfiguredSiteUrl()) {
  const origin = baseUrl.replace(/\/+$/, "");

  return `${origin}/join?resume=${encodeURIComponent(token)}`;
}

function parseDraft(value: unknown): JoinApplicationDraft {
  const empty = emptyJoinApplicationDraft();

  if (!value || typeof value !== "object") {
    return empty;
  }

  const record = value as Partial<JoinApplicationDraft>;

  return {
    answers: record.answers && typeof record.answers === "object" ? record.answers as Record<string, string> : empty.answers,
    applicant: { ...empty.applicant, ...(record.applicant ?? {}) },
    applyingAsCouple: Boolean(record.applyingAsCouple),
    disclosures:
      record.disclosures && typeof record.disclosures === "object"
        ? record.disclosures as Record<string, boolean>
        : empty.disclosures,
    photos: Array.isArray(record.photos) ? record.photos : empty.photos,
    spouse: { ...empty.spouse, ...(record.spouse ?? {}) },
  };
}

type DraftRow = {
  applicant_email: string | null;
  applicant_name: string | null;
  current_step: string;
  draft: unknown;
  expires_at: string;
  id: string;
  status: string;
};

function toRecord(row: DraftRow): JoinDraftRecord {
  return {
    applicantEmail: row.applicant_email,
    applicantName: row.applicant_name,
    currentStep: isJoinApplicationStepId(row.current_step) ? row.current_step : "start",
    draft: parseDraft(row.draft),
    expiresAt: row.expires_at,
    id: row.id,
    status: row.status === "submitted" || row.status === "abandoned" ? row.status : "draft",
  };
}

const rowColumns = "id, applicant_email, applicant_name, current_step, draft, expires_at, status";

export type ResumeLookup =
  | { reason: "expired" | "not_found" | "storage_unavailable" | "submitted"; record: null; status: "unavailable" }
  | { reason: null; record: JoinDraftRecord; status: "ok" };

/**
 * Resolves a raw resume token from a /join?resume=<token> click.
 *
 * Every failure is distinguishable, because "your link expired" and "we could
 * not find that application" are different things to tell an applicant, and
 * silently rendering the blank first screen is exactly the behaviour that made
 * the original defect invisible.
 */
export async function resolveResumeToken(token: string): Promise<ResumeLookup> {
  if (!isJoinDraftStorageConfigured()) {
    return { reason: "storage_unavailable", record: null, status: "unavailable" };
  }

  const trimmed = token.trim();

  if (!trimmed) {
    return { reason: "not_found", record: null, status: "unavailable" };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from(DRAFTS_TABLE)
    .select(rowColumns)
    .eq("resume_token_hash", hashResumeToken(trimmed))
    .maybeSingle();

  if (error || !data) {
    return { reason: "not_found", record: null, status: "unavailable" };
  }

  const record = toRecord(data as DraftRow);

  if (record.status === "submitted") {
    return { reason: "submitted", record: null, status: "unavailable" };
  }

  if (new Date(record.expiresAt).getTime() < Date.now()) {
    return { reason: "expired", record: null, status: "unavailable" };
  }

  await supabase
    .from(DRAFTS_TABLE)
    .update({ last_resumed_at: new Date().toISOString() })
    .eq("id", record.id);

  return { reason: null, record, status: "ok" };
}

export type SaveDraftInput = {
  applicantEmail?: string | null;
  applicantName?: string | null;
  currentStep: JoinApplicationStepId;
  draft: JoinApplicationDraft;
  /** Omit to create a new draft and mint a token. */
  resumeToken?: string | null;
};

export type SaveDraftResult = {
  created: boolean;
  id: string;
  /** Returned only when a token is minted, since it is never stored in the clear. */
  resumeToken: string | null;
  resumeUrl: string | null;
};

export async function saveJoinDraft(input: SaveDraftInput): Promise<SaveDraftResult> {
  if (!isJoinDraftStorageConfigured()) {
    throw new Error("Draft storage is not configured.");
  }

  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const payload = {
    applicant_email: input.applicantEmail?.trim() || null,
    applicant_name: input.applicantName?.trim() || null,
    current_step: input.currentStep,
    draft: input.draft as unknown as Record<string, unknown>,
    updated_at: now,
  };

  if (input.resumeToken) {
    const { data, error } = await supabase
      .from(DRAFTS_TABLE)
      .update(payload)
      .eq("resume_token_hash", hashResumeToken(input.resumeToken))
      .eq("status", "draft")
      .select("id")
      .maybeSingle();

    if (!error && data) {
      return { created: false, id: (data as { id: string }).id, resumeToken: null, resumeUrl: null };
    }

    // Falls through to create when the token no longer matches a live draft, so
    // an applicant with a stale token never loses what they are typing.
  }

  const token = createResumeToken();
  const { data, error } = await supabase
    .from(DRAFTS_TABLE)
    .insert({ ...payload, resume_token_hash: hashResumeToken(token), status: "draft" })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Could not save the application draft: ${error?.message ?? "unknown error"}`);
  }

  return {
    created: true,
    id: (data as { id: string }).id,
    resumeToken: token,
    resumeUrl: buildResumeUrl(token),
  };
}

/**
 * Called after the canonical application row is written, so the draft records
 * what it became instead of being deleted and so its resume link stops working.
 */
export async function markJoinDraftSubmitted(resumeToken: string, applicationId: string) {
  if (!isJoinDraftStorageConfigured()) {
    return;
  }

  const supabase = createSupabaseAdminClient();

  await supabase
    .from(DRAFTS_TABLE)
    .update({
      status: "submitted",
      submitted_application_id: applicationId,
      updated_at: new Date().toISOString(),
    })
    .eq("resume_token_hash", hashResumeToken(resumeToken));
}
