"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminAuthorization, hasAdminRole } from "@/src/lib/admin-auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

const statuses = ["new", "reviewed", "needs_follow_up", "contacted", "converted", "archived"] as const;
const priorities = ["normal", "important", "high"] as const;

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function asNullableString(value: string) {
  return value ? value : null;
}

function getStatus(value: string) {
  if (value === "follow_up") {
    return "needs_follow_up";
  }

  return statuses.includes(value as typeof statuses[number])
    ? value as typeof statuses[number]
    : "new";
}

function getPriority(value: string) {
  if (value === "urgent") {
    return "high";
  }

  if (value === "low") {
    return "normal";
  }

  return priorities.includes(value as typeof priorities[number])
    ? value as typeof priorities[number]
    : "normal";
}

async function getAdminClient() {
  const authorization = await getAdminAuthorization();

  if (!hasAdminRole(authorization, ["admin"])) {
    throw new Error("Admin access is required.");
  }

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
    .update({ priority: "important", status: "needs_follow_up" })
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

export async function markSupportSubmissionPersonalFollowUp(formData: FormData) {
  const submissionId = getString(formData, "submission_id");

  if (!submissionId) {
    redirect("/admin/support-team?error=missing");
  }

  const supabase = await getAdminClient();
  // TODO: Trigger future CRM task creation and private notification for major gift follow-up.
  const { error } = await supabase
    .from("form_submissions")
    .update({ priority: "high", status: "needs_follow_up" })
    .eq("id", submissionId);

  if (error) {
    redirectToSubmission(submissionId, `error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/support-team");
  redirectToSubmission(submissionId, "saved=personal-follow-up");
}

export async function createGivingFollowUp(formData: FormData) {
  const submissionId = getString(formData, "submission_id");

  if (!submissionId) {
    redirect("/admin/support-team?error=missing");
  }

  const supabase = await getAdminClient();
  // TODO: Create a future donor follow-up workflow once notification and CRM tooling is connected.
  const { error } = await supabase
    .from("form_submissions")
    .update({ priority: "important", status: "needs_follow_up" })
    .eq("id", submissionId);

  if (error) {
    redirectToSubmission(submissionId, `error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/support-team");
  redirectToSubmission(submissionId, "saved=giving-follow-up");
}

export async function approveFieldReportAccessRequest(formData: FormData) {
  const submissionId = getString(formData, "submission_id");

  if (!submissionId) {
    redirect("/admin/support-team?error=missing");
  }

  const supabase = await getAdminClient();
  // TODO: Provision field report access and notify the requester when access controls are ready.
  const { error } = await supabase
    .from("form_submissions")
    .update({ priority: "normal", status: "converted" })
    .eq("id", submissionId);

  if (error) {
    redirectToSubmission(submissionId, `error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/support-team");
  redirectToSubmission(submissionId, "saved=access-approved");
}

export async function markSystemWaitlistContacted(formData: FormData) {
  const submissionId = getString(formData, "submission_id");

  if (!submissionId) {
    redirect("/admin/support-team?error=missing");
  }

  const supabase = await getAdminClient();
  // TODO: Sync contacted waitlist records to future product launch notification workflows.
  const { error } = await supabase
    .from("form_submissions")
    .update({ status: "contacted" })
    .eq("id", submissionId);

  if (error) {
    redirectToSubmission(submissionId, `error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/support-team");
  redirectToSubmission(submissionId, "saved=waitlist-contacted");
}
