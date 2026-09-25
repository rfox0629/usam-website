"use server";

import { redirect } from "next/navigation";
import { sendDosWelcomeEmailTest } from "@/src/lib/dos/access-requests";
import { getOperationsAuthorization } from "@/src/lib/operations/auth";

// Sends the redesigned welcome email to the signed-in reviewer only. The
// store re-checks authorization; nothing here reaches an applicant.
export async function sendDosWelcomeEmailTestAction(formData: FormData) {
  const authorization = await getOperationsAuthorization();
  const requestId = typeof formData.get("request") === "string" ? String(formData.get("request")).trim() : "";
  const variant = formData.get("variant") === "new" ? "new" : "existing";
  const result = await sendDosWelcomeEmailTest({ authorization, requestId: requestId || null, variant });
  const query = new URLSearchParams();

  if (requestId) {
    query.set("request", requestId);
  }

  query.set("variant", variant);
  query.set(result.error ? "error" : "saved", result.error ?? result.message ?? "Sent.");
  redirect(`/operations/submissions/dos-access/welcome-email?${query.toString()}`);
}
