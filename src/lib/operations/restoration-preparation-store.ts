import "server-only";

import { randomBytes } from "node:crypto";

import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import { canAccessOperationsWorkflow, type OperationsAuthorization } from "./auth";
import {
  createPreparationSummary,
  generateCaseReference,
  preparationSectionIds,
  readPreparationSummary,
  type PreparationSectionId,
  type PreparationSummary,
} from "./restoration-preparation";
import { loadOperationsSubmissionDetail, type OperationsSubmissionDetail } from "./submissions";

/**
 * Storage for the Preparation Summary.
 *
 * Reuses the existing submission row rather than introducing a parallel
 * Restoration database, so the case keeps exactly one authorization boundary.
 * The summary lives under `payload.operations_preparation`, a sibling of the
 * existing `operations_review` metadata, and never touches `payload.values`,
 * which holds the participant's own answers.
 */

const preparationPayloadKey = "operations_preparation";

type Loaded = {
  error?: string;
  submission: OperationsSubmissionDetail | null;
  summary: PreparationSummary | null;
  unauthorized?: boolean;
};

/**
 * Every preparation path goes through here. It reuses the case loader, so an
 * unauthorized reviewer is refused before any summary content is assembled.
 */
export async function loadPreparationContext({
  authorization,
  id,
  requireManage = false,
}: {
  authorization: OperationsAuthorization;
  id: string;
  requireManage?: boolean;
}): Promise<Loaded> {
  if (authorization.status !== "authorized") {
    return { submission: null, summary: null, unauthorized: true };
  }

  const { error, submission, unauthorized } = await loadOperationsSubmissionDetail({ authorization, id });

  if (unauthorized || !submission) {
    return { error, submission: null, summary: null, unauthorized: unauthorized ?? false };
  }

  if (submission.workflow !== "restoration") {
    return { submission: null, summary: null, unauthorized: true };
  }

  if (!canAccessOperationsWorkflow(authorization, "restoration", requireManage ? "manage" : "view")) {
    return { submission: null, summary: null, unauthorized: true };
  }

  if (requireManage && !submission.canManage) {
    return { submission: null, summary: null, unauthorized: true };
  }

  return { error, submission, summary: readPreparationSummary(submission.payload) };
}

function participantValues(submission: OperationsSubmissionDetail): Record<string, unknown> {
  const values = (submission.payload as { values?: unknown }).values;

  return values && typeof values === "object" && !Array.isArray(values)
    ? values as Record<string, unknown>
    : {};
}

async function persist(id: string, payload: Record<string, unknown>, summary: PreparationSummary) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("form_submissions")
    .update({ payload: { ...payload, [preparationPayloadKey]: summary } })
    .eq("id", id);

  return error ? { error: error.message } : { error: null };
}

export async function generatePreparationSummary({
  authorization,
  id,
}: {
  authorization: OperationsAuthorization;
  id: string;
}) {
  const context = await loadPreparationContext({ authorization, id, requireManage: true });

  if (context.unauthorized || !context.submission || authorization.status !== "authorized") {
    return { error: "You are not authorized to prepare this case." };
  }

  if (!isSupabaseAdminConfigured()) {
    return { error: "Supabase admin environment variables are not configured." };
  }

  const existing = context.summary;
  const summary = createPreparationSummary({
    // Regenerating keeps the reference, so the case keeps one identity.
    caseReference: existing?.caseReference ?? generateCaseReference(randomBytes(5)),
    generatedBy: authorization.email,
    now: new Date().toISOString(),
    values: participantValues(context.submission),
  });

  // Reviewer notes survive regeneration; they are the reviewer's own work.
  summary.notes = existing?.notes ?? {};

  return persist(id, context.submission.payload, summary);
}

export async function savePreparationSummary({
  authorization,
  id,
  narratives,
}: {
  authorization: OperationsAuthorization;
  id: string;
  narratives: Partial<Record<PreparationSectionId, string>>;
}) {
  const context = await loadPreparationContext({ authorization, id, requireManage: true });

  if (context.unauthorized || !context.submission || authorization.status !== "authorized") {
    return { error: "You are not authorized to prepare this case." };
  }

  if (!context.summary) {
    return { error: "Generate the preparation summary before saving it." };
  }

  const now = new Date().toISOString();
  const summary: PreparationSummary = {
    ...context.summary,
    savedAt: now,
    savedBy: authorization.email,
    sections: context.summary.sections.map((section) => ({
      ...section,
      narrative: (narratives[section.id] ?? section.narrative ?? "").trim(),
    })),
    status: "saved",
  };

  return persist(id, context.submission.payload, summary);
}

export async function savePreparationNote({
  authorization,
  id,
  sectionId,
  text,
}: {
  authorization: OperationsAuthorization;
  id: string;
  sectionId: string;
  text: string;
}) {
  const context = await loadPreparationContext({ authorization, id, requireManage: true });

  if (context.unauthorized || !context.submission || authorization.status !== "authorized") {
    return { error: "You are not authorized to prepare this case." };
  }

  if (!context.summary) {
    return { error: "Generate the preparation summary before adding notes." };
  }

  if (!preparationSectionIds.includes(sectionId as PreparationSectionId)) {
    return { error: "Unknown summary section." };
  }

  const trimmed = text.trim();
  const notes = { ...context.summary.notes };

  if (trimmed) {
    notes[sectionId as PreparationSectionId] = {
      author: authorization.email,
      text: trimmed,
      updatedAt: new Date().toISOString(),
    };
  } else {
    delete notes[sectionId as PreparationSectionId];
  }

  return persist(id, context.submission.payload, { ...context.summary, notes });
}
