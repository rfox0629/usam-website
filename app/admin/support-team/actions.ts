"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

const statuses = ["new", "reviewed", "follow_up", "converted", "archived"] as const;
const priorities = ["low", "normal", "high", "urgent"] as const;

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function asNullableString(value: string) {
  return value ? value : null;
}

function getStatus(value: string) {
  return statuses.includes(value as typeof statuses[number])
    ? value as typeof statuses[number]
    : "new";
}

function getPriority(value: string) {
  return priorities.includes(value as typeof priorities[number])
    ? value as typeof priorities[number]
    : "normal";
}

async function getAdminClient() {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("Supabase admin environment variables are not configured.");
  }

  return createSupabaseAdminClient();
}

function redirectToSubmission(submissionId: string, suffix = "saved=1") {
  redirect(`/admin/support-team?submission=${submissionId}&${suffix}`);
}

export async function updateSupportSubmission(formData: FormData) {
  const submissionId = getString(formData, "submission_id");

  if (!submissionId) {
    redirect("/admin/support-team?error=missing");
  }

  const supabase = await getAdminClient();
  const { error } = await supabase
    .from("form_submissions")
    .update({
      assigned_to: asNullableString(getString(formData, "assigned_to")),
      internal_notes: asNullableString(getString(formData, "internal_notes")),
      priority: getPriority(getString(formData, "priority")),
      status: getStatus(getString(formData, "status")),
    })
    .eq("id", submissionId);

  if (error) {
    redirectToSubmission(submissionId, `error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/support-team");
  redirectToSubmission(submissionId);
}

export async function markSupportSubmissionReviewed(formData: FormData) {
  const submissionId = getString(formData, "submission_id");

  if (!submissionId) {
    redirect("/admin/support-team?error=missing");
  }

  const supabase = await getAdminClient();
  const { error } = await supabase
    .from("form_submissions")
    .update({ status: "reviewed" })
    .eq("id", submissionId);

  if (error) {
    redirectToSubmission(submissionId, `error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/support-team");
  redirectToSubmission(submissionId, "saved=reviewed");
}

export async function markSupportSubmissionFollowUp(formData: FormData) {
  const submissionId = getString(formData, "submission_id");

  if (!submissionId) {
    redirect("/admin/support-team?error=missing");
  }

  const supabase = await getAdminClient();
  const { error } = await supabase
    .from("form_submissions")
    .update({ priority: "high", status: "follow_up" })
    .eq("id", submissionId);

  if (error) {
    redirectToSubmission(submissionId, `error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/support-team");
  redirectToSubmission(submissionId, "saved=follow-up");
}

export async function archiveSupportSubmission(formData: FormData) {
  const submissionId = getString(formData, "submission_id");

  if (!submissionId) {
    redirect("/admin/support-team?error=missing");
  }

  const supabase = await getAdminClient();
  const { error } = await supabase
    .from("form_submissions")
    .update({ status: "archived" })
    .eq("id", submissionId);

  if (error) {
    redirectToSubmission(submissionId, `error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/support-team");
  redirectToSubmission(submissionId, "saved=archived");
}
