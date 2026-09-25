"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  approveDosAccessRequest,
  declineDosAccessRequest,
  retryDosAccessProvisioning,
  retryDosWelcomeEmail,
  saveDosAccessRequestNotes,
  type DosAccessDecisionResult,
} from "@/src/lib/dos/access-requests";
import { getOperationsAuthorization } from "@/src/lib/operations/auth";

// Every action re-reads the reviewer's authorization on the server. The page
// hiding a button is presentation; these checks are the boundary.

function formValue(formData: FormData, name: string) {
  const value = formData.get(name);

  return typeof value === "string" ? value.trim() : "";
}

function finish(id: string, result: DosAccessDecisionResult): never {
  revalidatePath("/operations");
  revalidatePath("/operations/submissions");
  revalidatePath(`/operations/submissions/dos-access/${id}`);

  const query = result.error
    ? `error=${encodeURIComponent(result.error)}`
    : `saved=${encodeURIComponent(result.message ?? "Saved.")}`;

  redirect(`/operations/submissions/dos-access/${id}?${query}`);
}

function requireId(formData: FormData) {
  const id = formValue(formData, "id");

  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    redirect("/operations/submissions?error=missing-submission");
  }

  return id;
}

export async function approveDosAccessRequestAction(formData: FormData) {
  const id = requireId(formData);
  const authorization = await getOperationsAuthorization();

  finish(id, await approveDosAccessRequest({ authorization, id, note: formValue(formData, "note") }));
}

export async function declineDosAccessRequestAction(formData: FormData) {
  const id = requireId(formData);
  const authorization = await getOperationsAuthorization();

  if (formValue(formData, "confirm") !== "decline") {
    finish(id, { error: "Tick the confirmation box to decline this request." });
  }

  finish(id, await declineDosAccessRequest({ authorization, id, note: formValue(formData, "note") }));
}

export async function retryDosAccessProvisioningAction(formData: FormData) {
  const id = requireId(formData);
  const authorization = await getOperationsAuthorization();

  finish(id, await retryDosAccessProvisioning({ authorization, id }));
}

export async function retryDosWelcomeEmailAction(formData: FormData) {
  const id = requireId(formData);
  const authorization = await getOperationsAuthorization();

  finish(id, await retryDosWelcomeEmail({ authorization, id }));
}

export async function saveDosAccessRequestNotesAction(formData: FormData) {
  const id = requireId(formData);
  const authorization = await getOperationsAuthorization();

  finish(id, await saveDosAccessRequestNotes({ authorization, id, notes: formValue(formData, "notes") }));
}
