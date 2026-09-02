"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOperationsAuthorization } from "@/src/lib/operations/auth";
import {
  archiveOperationsSubmission,
  deleteTestOperationsSubmission,
  operationsSubmissionStatuses,
  restoreOperationsSubmission,
  updateOperationsSubmissionReview,
  type OperationsSubmissionStatus,
} from "@/src/lib/operations/submissions";
import {
  generatePreparationSummary,
  savePreparationNote,
  savePreparationSummary,
} from "@/src/lib/operations/restoration-preparation-store";

function formValue(formData: FormData, name: string) {
  const value = formData.get(name);

  return typeof value === "string" ? value.trim() : "";
}

function statusValue(value: string): OperationsSubmissionStatus {
  return operationsSubmissionStatuses.includes(value as OperationsSubmissionStatus)
    ? value as OperationsSubmissionStatus
    : "new";
}

export async function updateSubmissionReviewAction(formData: FormData) {
  const id = formValue(formData, "id");
  const authorization = await getOperationsAuthorization();

  if (!id) {
    redirect("/operations/submissions?error=missing-submission");
  }

  const result = await updateOperationsSubmissionReview({
    assignedTo: formValue(formData, "assignedTo"),
    authorization,
    followUpState: formValue(formData, "followUpState"),
    id,
    internalNotes: formValue(formData, "internalNotes"),
    nextAction: formValue(formData, "nextAction"),
    reviewSummary: formValue(formData, "reviewSummary"),
    status: statusValue(formValue(formData, "status")),
  });

  revalidatePath("/operations");
  revalidatePath("/operations/submissions");
  revalidatePath(`/operations/submissions/${id}`);

  if (result.error) {
    redirect(`/operations/submissions/${id}?error=${encodeURIComponent(result.error)}`);
  }

  redirect(`/operations/submissions/${id}?saved=1`);
}

export async function archiveSubmissionAction(formData: FormData) {
  const id = formValue(formData, "id");
  const authorization = await getOperationsAuthorization();

  if (!id) {
    redirect("/operations/submissions?error=missing-submission");
  }

  const result = await archiveOperationsSubmission({ authorization, id });

  revalidatePath("/operations");
  revalidatePath("/operations/submissions");
  revalidatePath(`/operations/submissions/${id}`);

  if (result.error) {
    redirect(`/operations/submissions/${id}?error=${encodeURIComponent(result.error)}`);
  }

  redirect(`/operations/submissions/${id}?saved=1`);
}

export async function restoreSubmissionAction(formData: FormData) {
  const id = formValue(formData, "id");
  const authorization = await getOperationsAuthorization();

  if (!id) {
    redirect("/operations/submissions?error=missing-submission");
  }

  const result = await restoreOperationsSubmission({ authorization, id });

  revalidatePath("/operations");
  revalidatePath("/operations/submissions");
  revalidatePath(`/operations/submissions/${id}`);

  if (result.error) {
    redirect(`/operations/submissions/${id}?error=${encodeURIComponent(result.error)}`);
  }

  redirect(`/operations/submissions/${id}?saved=1`);
}

export async function deleteTestSubmissionAction(formData: FormData) {
  const id = formValue(formData, "id");
  const authorization = await getOperationsAuthorization();

  if (!id) {
    redirect("/operations/submissions?error=missing-submission");
  }

  const result = await deleteTestOperationsSubmission({ authorization, id });

  revalidatePath("/operations");
  revalidatePath("/operations/submissions");

  if (result.error) {
    redirect(`/operations/submissions/${id}?error=${encodeURIComponent(result.error)}`);
  }

  redirect("/operations/submissions?deleted=1");
}

/**
 * Preparation Summary actions (USA-187).
 *
 * Each one re-reads authorization on the server and defers the actual
 * permission check to the store, which reuses the case loader. A reviewer
 * without Restoration manage access cannot reach any of these by posting
 * directly.
 */
export async function generatePreparationSummaryAction(formData: FormData) {
  const id = formValue(formData, "id");
  const authorization = await getOperationsAuthorization();

  if (!id) {
    redirect("/operations/submissions?error=missing-submission");
  }

  const result = await generatePreparationSummary({ authorization, id });

  revalidatePath(`/operations/submissions/${id}`);
  redirect(result.error
    ? `/operations/submissions/${id}?view=summary&error=${encodeURIComponent(result.error)}`
    : `/operations/submissions/${id}?view=summary&generated=1`);
}

export async function savePreparationSummaryAction(formData: FormData) {
  const id = formValue(formData, "id");
  const authorization = await getOperationsAuthorization();

  if (!id) {
    redirect("/operations/submissions?error=missing-submission");
  }

  const result = await savePreparationSummary({ authorization, id });

  revalidatePath(`/operations/submissions/${id}`);
  redirect(result.error
    ? `/operations/submissions/${id}?view=summary&error=${encodeURIComponent(result.error)}`
    : `/operations/submissions/${id}?view=summary&saved=summary`);
}

export async function savePreparationNoteAction(formData: FormData) {
  const id = formValue(formData, "id");
  const sectionId = formValue(formData, "sectionId");
  const authorization = await getOperationsAuthorization();

  if (!id) {
    redirect("/operations/submissions?error=missing-submission");
  }

  const result = await savePreparationNote({
    authorization,
    id,
    sectionId,
    text: formValue(formData, "note"),
  });

  revalidatePath(`/operations/submissions/${id}`);
  redirect(result.error
    ? `/operations/submissions/${id}?view=summary&error=${encodeURIComponent(result.error)}`
    : `/operations/submissions/${id}?view=summary&saved=note#section-${sectionId}`);
}
