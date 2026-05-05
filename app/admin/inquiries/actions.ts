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

function asPayloadRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function payloadString(payload: Record<string, unknown>, key: string) {
  const value = payload[key];

  return typeof value === "string" ? value.trim() : "";
}

function payloadBoolean(payload: Record<string, unknown>, key: string, fallback = false) {
  const value = payload[key];

  return typeof value === "boolean" ? value : fallback;
}

function payloadStringArray(payload: Record<string, unknown>, key: string) {
  const value = payload[key];

  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

async function getAdminClient() {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("Supabase admin environment variables are not configured.");
  }

  return createSupabaseAdminClient();
}

function redirectToSubmission(submissionId: string, suffix = "saved=1") {
  redirect(`/admin/inquiries?submission=${submissionId}&${suffix}`);
}

export async function updateFormSubmission(formData: FormData) {
  const submissionId = getString(formData, "submission_id");

  if (!submissionId) {
    redirect("/admin/inquiries?error=missing");
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

  revalidatePath("/admin/inquiries");
  redirectToSubmission(submissionId);
}

export async function markFormSubmissionReviewed(formData: FormData) {
  const submissionId = getString(formData, "submission_id");

  if (!submissionId) {
    redirect("/admin/inquiries?error=missing");
  }

  const supabase = await getAdminClient();
  const { error } = await supabase
    .from("form_submissions")
    .update({ status: "reviewed" })
    .eq("id", submissionId);

  if (error) {
    redirectToSubmission(submissionId, `error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/inquiries");
  redirectToSubmission(submissionId);
}

export async function archiveFormSubmission(formData: FormData) {
  const submissionId = getString(formData, "submission_id");

  if (!submissionId) {
    redirect("/admin/inquiries?error=missing");
  }

  const supabase = await getAdminClient();
  const { error } = await supabase
    .from("form_submissions")
    .update({ status: "archived" })
    .eq("id", submissionId);

  if (error) {
    redirectToSubmission(submissionId, `error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/inquiries");
  redirectToSubmission(submissionId, "saved=archived");
}

export async function approvePrayerTeamApplication(formData: FormData) {
  const submissionId = getString(formData, "submission_id");

  if (!submissionId) {
    redirect("/admin/inquiries?error=missing");
  }

  const supabase = await getAdminClient();
  const { data, error } = await supabase
    .from("form_submissions")
    .select("id, first_name, last_name, email, phone, payload")
    .eq("id", submissionId)
    .maybeSingle();

  if (error || !data) {
    redirectToSubmission(submissionId, `error=${encodeURIComponent(error?.message ?? "Submission not found")}`);
  }

  const submission = data as {
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    payload: unknown;
    phone: string | null;
  };
  const payload = asPayloadRecord(submission.payload);
  const email = submission.email?.trim().toLowerCase();

  if (!email) {
    redirectToSubmission(submissionId, "error=missing-email");
  }

  const partnerRecord = {
    availability: payloadStringArray(payload, "availability"),
    church_affiliation: asNullableString(payloadString(payload, "church_affiliation")),
    city: asNullableString(payloadString(payload, "city")),
    email,
    email_alerts: payloadBoolean(payload, "email_alerts", true),
    first_name: submission.first_name,
    last_name: submission.last_name,
    name: [submission.first_name, submission.last_name].filter(Boolean).join(" ").trim() || email,
    permissions: {
      prayer_admin: false,
      receive_email_alerts: payloadBoolean(payload, "email_alerts", true),
      receive_sms_alerts: payloadBoolean(payload, "sms_alerts", false),
      view_confidential_requests: false,
      view_general_requests: true,
      view_kitchen_table_alerts: true,
      view_missionary_couple_requests: true,
    },
    phone: submission.phone,
    recruited_by: payloadString(payload, "referral_source") || "Prayer Team application",
    sms_alerts: payloadBoolean(payload, "sms_alerts", false),
    state: asNullableString(payloadString(payload, "state")),
    status: "active",
  };

  const existingResult = await supabase
    .from("prayer_partners")
    .select("id")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const writeResult = existingResult.data
    ? await supabase
      .from("prayer_partners")
      .update(partnerRecord)
      .eq("id", (existingResult.data as { id: string }).id)
    : await supabase
      .from("prayer_partners")
      .insert(partnerRecord);

  if (existingResult.error || writeResult.error) {
    redirectToSubmission(submissionId, `error=${encodeURIComponent(existingResult.error?.message ?? writeResult.error?.message ?? "Prayer partner could not be saved")}`);
  }

  const updateResult = await supabase
    .from("form_submissions")
    .update({ status: "converted" })
    .eq("id", submissionId);

  if (updateResult.error) {
    redirectToSubmission(submissionId, `error=${encodeURIComponent(updateResult.error.message)}`);
  }

  revalidatePath("/admin/inquiries");
  revalidatePath("/admin/prayer-team");
  redirectToSubmission(submissionId, "saved=converted");
}
