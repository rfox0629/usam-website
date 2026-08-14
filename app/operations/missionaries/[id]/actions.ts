"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOperationsAuthorization } from "@/src/lib/operations/auth";
import { updateOperationsOnboardingReview } from "@/src/lib/operations/onboarding";

function formValue(formData: FormData, name: string) {
  const value = formData.get(name);

  return typeof value === "string" ? value.trim() : "";
}

export async function updateMissionaryReviewAction(formData: FormData) {
  const id = formValue(formData, "id");
  const authorization = await getOperationsAuthorization();

  if (!id) {
    redirect("/operations/missionaries?error=missing-application");
  }

  const result = await updateOperationsOnboardingReview({
    adminNotes: formValue(formData, "adminNotes"),
    assignedTo: formValue(formData, "assignedTo"),
    authorization,
    decisionState: formValue(formData, "decisionState"),
    dosSetupState: formValue(formData, "dosSetupState"),
    followUpState: formValue(formData, "followUpState"),
    id,
    interviewState: formValue(formData, "interviewState"),
    onboardingStatus: formValue(formData, "onboardingStatus"),
    profileReadiness: formValue(formData, "profileReadiness"),
    status: formValue(formData, "status"),
    supportReadiness: formValue(formData, "supportReadiness"),
  });

  revalidatePath("/operations");
  revalidatePath("/operations/missionaries");
  revalidatePath(`/operations/missionaries/${id}`);

  if (result.error) {
    redirect(`/operations/missionaries/${id}?error=${encodeURIComponent(result.error)}`);
  }

  redirect(`/operations/missionaries/${id}?saved=1`);
}
