"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminAuthorization, hasPrayerAdminAccess } from "@/src/lib/admin-auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

const visibilityOptions = ["public", "team", "private"] as const;
const statusOptions = ["open", "covered", "answered", "archived"] as const;
const submissionStatuses = ["new", "reviewed", "follow_up", "converted", "archived"] as const;
const urgencyOptions = ["normal", "important", "urgent"] as const;
const confidentialityOptions = ["general", "missionary_couple", "kitchen_table", "confidential"] as const;

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function asNullableString(value: string) {
  return value ? value : null;
}

function getVisibility(value: string) {
  return visibilityOptions.includes(value as typeof visibilityOptions[number])
    ? value as typeof visibilityOptions[number]
    : "team";
}

function getStatus(value: string) {
  return statusOptions.includes(value as typeof statusOptions[number])
    ? value as typeof statusOptions[number]
    : "open";
}

function getSubmissionStatus(value: string) {
  return submissionStatuses.includes(value as typeof submissionStatuses[number])
    ? value as typeof submissionStatuses[number]
    : "new";
}

function getUrgency(value: string) {
  return urgencyOptions.includes(value as typeof urgencyOptions[number])
    ? value as typeof urgencyOptions[number]
    : "normal";
}

function getConfidentialityLevel(value: string) {
  return confidentialityOptions.includes(value as typeof confidentialityOptions[number])
    ? value as typeof confidentialityOptions[number]
    : "general";
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

async function getPrayerAdminClient() {
  const authorization = await getAdminAuthorization();

  if (!hasPrayerAdminAccess(authorization)) {
    throw new Error("Prayer Team admin access is required.");
  }

  if (!isSupabaseAdminConfigured()) {
    throw new Error("Supabase admin environment variables are not configured.");
  }

  return createSupabaseAdminClient();
}

function redirectToPrayerSubmission(submissionId: string, suffix = "saved=1") {
  redirect(`/admin/prayer-team?tab=applications&submission=${submissionId}&${suffix}`);
}

export async function createPrayerRequest(formData: FormData) {
  const supabase = await getPrayerAdminClient();
  const householdId = getString(formData, "household_id");
  const title = getString(formData, "title");
  const description = getString(formData, "description");

  if (!title || !description) {
    redirect("/admin/prayer-team?tab=requests&error=missing");
  }

  const normalizedHouseholdId = asNullableString(householdId);

  const { error } = await supabase
    .from("prayer_requests")
    .insert({
      category: asNullableString(getString(formData, "category")),
      confidentiality_level: getConfidentialityLevel(getString(formData, "confidentiality_level")),
      description,
      household_id: normalizedHouseholdId,
      related_household_id: normalizedHouseholdId,
      request: description,
      status: "open",
      title,
      urgency: getUrgency(getString(formData, "urgency")),
      visibility: getVisibility(getString(formData, "visibility")),
    });

  // TODO: Future email/SMS/DOS integration can fan out approved prayer alerts
  // when kitchen table meetings are scheduled or missionary couples submit needs.
  if (error) {
    redirect(`/admin/prayer-team?tab=requests&error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/prayer-team");
  redirect("/admin/prayer-team?tab=requests&saved=created");
}

export async function updatePrayerRequest(formData: FormData) {
  const supabase = await getPrayerAdminClient();
  const requestId = getString(formData, "request_id");
  const title = getString(formData, "title");
  const description = getString(formData, "description");

  if (!requestId || !title || !description) {
    redirect("/admin/prayer-team?tab=requests&error=missing");
  }

  const normalizedHouseholdId = asNullableString(getString(formData, "household_id"));

  const { error } = await supabase
    .from("prayer_requests")
    .update({
      category: asNullableString(getString(formData, "category")),
      confidentiality_level: getConfidentialityLevel(getString(formData, "confidentiality_level")),
      description,
      household_id: normalizedHouseholdId,
      related_household_id: normalizedHouseholdId,
      request: description,
      status: getStatus(getString(formData, "status")),
      title,
      urgency: getUrgency(getString(formData, "urgency")),
      visibility: getVisibility(getString(formData, "visibility")),
    })
    .eq("id", requestId);

  if (error) {
    redirect(`/admin/prayer-team?tab=requests&request=${requestId}&error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/prayer-team");
  redirect(`/admin/prayer-team?tab=requests&request=${requestId}&saved=updated`);
}

export async function archivePrayerRequest(formData: FormData) {
  const supabase = await getPrayerAdminClient();
  const requestId = getString(formData, "request_id");

  if (!requestId) {
    redirect("/admin/prayer-team?tab=requests&error=missing");
  }

  const { error } = await supabase
    .from("prayer_requests")
    .update({ status: "archived" })
    .eq("id", requestId);

  if (error) {
    redirect(`/admin/prayer-team?tab=requests&request=${requestId}&error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/prayer-team");
  redirect("/admin/prayer-team?tab=requests&saved=archived");
}

export async function updatePrayerSubmission(formData: FormData) {
  const supabase = await getPrayerAdminClient();
  const submissionId = getString(formData, "submission_id");

  if (!submissionId) {
    redirect("/admin/prayer-team?tab=applications&error=missing");
  }

  const { error } = await supabase
    .from("form_submissions")
    .update({
      assigned_to: asNullableString(getString(formData, "assigned_to")),
      internal_notes: asNullableString(getString(formData, "internal_notes")),
      status: getSubmissionStatus(getString(formData, "status")),
    })
    .eq("id", submissionId);

  if (error) {
    redirectToPrayerSubmission(submissionId, `error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/prayer-team");
  redirectToPrayerSubmission(submissionId);
}

export async function markPrayerSubmissionReviewed(formData: FormData) {
  const supabase = await getPrayerAdminClient();
  const submissionId = getString(formData, "submission_id");

  if (!submissionId) {
    redirect("/admin/prayer-team?tab=applications&error=missing");
  }

  const { error } = await supabase
    .from("form_submissions")
    .update({ status: "reviewed" })
    .eq("id", submissionId);

  if (error) {
    redirectToPrayerSubmission(submissionId, `error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/prayer-team");
  redirectToPrayerSubmission(submissionId, "saved=reviewed");
}

export async function archivePrayerSubmission(formData: FormData) {
  const supabase = await getPrayerAdminClient();
  const submissionId = getString(formData, "submission_id");

  if (!submissionId) {
    redirect("/admin/prayer-team?tab=applications&error=missing");
  }

  const { error } = await supabase
    .from("form_submissions")
    .update({ status: "archived" })
    .eq("id", submissionId);

  if (error) {
    redirectToPrayerSubmission(submissionId, `error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/prayer-team");
  redirectToPrayerSubmission(submissionId, "saved=archived");
}

export async function approvePrayerTeamApplication(formData: FormData) {
  const supabase = await getPrayerAdminClient();
  const submissionId = getString(formData, "submission_id");

  if (!submissionId) {
    redirect("/admin/prayer-team?tab=applications&error=missing");
  }

  const { data, error } = await supabase
    .from("form_submissions")
    .select("id, first_name, last_name, email, phone, payload")
    .eq("id", submissionId)
    .maybeSingle();

  if (error || !data) {
    redirectToPrayerSubmission(submissionId, `error=${encodeURIComponent(error?.message ?? "Submission not found")}`);
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
    redirectToPrayerSubmission(submissionId, "error=missing-email");
  }

  const recruitedByHouseholdName = payloadString(payload, "recruited_by_household_name");
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
    recruited_by: recruitedByHouseholdName || payloadString(payload, "referral_source") || "Prayer Team application",
    recruited_by_household_id: asNullableString(payloadString(payload, "recruited_by_household_id")),
    recruited_by_household_name: asNullableString(recruitedByHouseholdName),
    recruited_by_household_number: asNullableString(payloadString(payload, "recruited_by_household_number")),
    recruited_by_profile_slug: asNullableString(payloadString(payload, "recruited_by_profile_slug")),
    sms_alerts: payloadBoolean(payload, "sms_alerts", false),
    source: "prayer_team_application",
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
    redirectToPrayerSubmission(submissionId, `error=${encodeURIComponent(existingResult.error?.message ?? writeResult.error?.message ?? "Prayer partner could not be saved")}`);
  }

  const updateResult = await supabase
    .from("form_submissions")
    .update({ status: "converted" })
    .eq("id", submissionId);

  if (updateResult.error) {
    redirectToPrayerSubmission(submissionId, `error=${encodeURIComponent(updateResult.error.message)}`);
  }

  revalidatePath("/admin/prayer-team");
  redirectToPrayerSubmission(submissionId, "saved=converted");
}
