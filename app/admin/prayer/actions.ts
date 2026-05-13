"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminAuthorization, hasPrayerAdminAccess } from "@/src/lib/admin-auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

const visibilityOptions = ["public", "team", "private"] as const;
const statusOptions = ["open", "covered", "answered", "archived"] as const;
const submissionStatuses = ["new", "reviewed", "needs_follow_up", "converted", "archived"] as const;
const urgencyOptions = ["normal", "important", "urgent"] as const;
const confidentialityOptions = ["general", "missionary_couple", "kitchen_table", "confidential"] as const;
const partnerStatuses = ["active", "inactive", "pending", "declined"] as const;
const partnerPermissions = [
  "view_general_requests",
  "view_missionary_couple_requests",
  "view_kitchen_table_alerts",
  "view_confidential_requests",
  "receive_email_alerts",
  "receive_sms_alerts",
  "prayer_admin",
] as const;

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
  if (value === "follow_up") {
    return "needs_follow_up";
  }

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

function getPartnerStatus(value: string) {
  return partnerStatuses.includes(value as typeof partnerStatuses[number])
    ? value as typeof partnerStatuses[number]
    : "active";
}

function getPartnerIds(formData: FormData) {
  return formData
    .getAll("partner_ids")
    .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
    .map((value) => value.trim());
}

function getPermissionRecord(formData: FormData) {
  const selectedPermissions = new Set(
    formData
      .getAll("permissions")
      .filter((value): value is string => typeof value === "string")
  );

  return Object.fromEntries(
    partnerPermissions.map((permission) => [permission, selectedPermissions.has(permission)])
  );
}

function getAssignedCoverage(formData: FormData) {
  const value = getString(formData, "assigned_coverage");

  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);

    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    throw new Error("Assigned coverage must be valid JSON.");
  }
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
  return (await getPrayerAdminContext()).supabase;
}

async function getPrayerAdminContext() {
  const authorization = await getAdminAuthorization();

  if (authorization.status !== "authorized" || !hasPrayerAdminAccess(authorization)) {
    throw new Error("Prayer Team admin access is required.");
  }

  if (!isSupabaseAdminConfigured()) {
    throw new Error("Supabase admin environment variables are not configured.");
  }

  return {
    authorization,
    supabase: createSupabaseAdminClient(),
  };
}

function redirectToPrayerSubmission(submissionId: string, suffix = "saved=1") {
  redirect(`/admin/prayer-team?tab=applications&submission=${submissionId}&${suffix}`);
}

function redirectToPrayerRequest(requestId: string, suffix = "saved=1") {
  redirect(`/admin/prayer-team?tab=requests&request=${requestId}&${suffix}`);
}

function redirectToPrayerPartner(partnerId: string, suffix = "saved=1") {
  redirect(`/admin/prayer-team?tab=partners&partner=${partnerId}&${suffix}`);
}

function redirectToPrayerApplication(partnerId: string, suffix = "saved=1") {
  redirect(`/admin/prayer-team?tab=applications&partner=${partnerId}&${suffix}`);
}

function prayerPartnerDisplayName(partner: {
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
}) {
  return partner.name
    || [partner.first_name, partner.last_name].filter(Boolean).join(" ").trim()
    || partner.email
    || "Prayer Partner";
}

export async function createPrayerRequest(formData: FormData) {
  const supabase = await getPrayerAdminClient();
  const householdId = getString(formData, "related_household_id") || getString(formData, "household_id");
  const title = getString(formData, "title");
  const request = getString(formData, "request") || getString(formData, "description");

  if (!title || !request) {
    redirect("/admin/prayer-team?tab=requests&error=missing");
  }

  const normalizedHouseholdId = asNullableString(householdId);
  const partnerIds = getPartnerIds(formData);

  const { error } = await supabase
    .from("prayer_requests")
    .insert({
      category: asNullableString(getString(formData, "category")),
      confidentiality_level: getConfidentialityLevel(getString(formData, "confidentiality_level")),
      assigned_partner_ids: partnerIds.length > 0 ? partnerIds : null,
      description: request,
      household_id: normalizedHouseholdId,
      prayer_notes: asNullableString(getString(formData, "prayer_notes")),
      related_region: asNullableString(getString(formData, "related_region")),
      related_household_id: normalizedHouseholdId,
      related_state: asNullableString(getString(formData, "related_state")),
      request,
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
  const request = getString(formData, "request") || getString(formData, "description");

  if (!requestId || !title || !request) {
    redirect("/admin/prayer-team?tab=requests&error=missing");
  }

  const normalizedHouseholdId = asNullableString(getString(formData, "related_household_id") || getString(formData, "household_id"));

  const { error } = await supabase
    .from("prayer_requests")
    .update({
      category: asNullableString(getString(formData, "category")),
      confidentiality_level: getConfidentialityLevel(getString(formData, "confidentiality_level")),
      description: request,
      household_id: normalizedHouseholdId,
      prayer_notes: asNullableString(getString(formData, "prayer_notes")),
      related_region: asNullableString(getString(formData, "related_region")),
      related_household_id: normalizedHouseholdId,
      related_state: asNullableString(getString(formData, "related_state")),
      request,
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

export async function assignPrayerRequestPartners(formData: FormData) {
  const supabase = await getPrayerAdminClient();
  const requestId = getString(formData, "request_id");

  if (!requestId) {
    redirect("/admin/prayer-team?tab=requests&error=missing");
  }

  const { error } = await supabase
    .from("prayer_requests")
    .update({
      assigned_partner_ids: getPartnerIds(formData),
      prayer_notes: asNullableString(getString(formData, "prayer_notes")),
    })
    .eq("id", requestId);

  if (error) {
    redirectToPrayerRequest(requestId, `error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/prayer-team");
  redirectToPrayerRequest(requestId, "saved=assigned");
}

export async function markPrayerRequestPrayed(formData: FormData) {
  const supabase = await getPrayerAdminClient();
  const requestId = getString(formData, "request_id");

  if (!requestId) {
    redirect("/admin/prayer-team?tab=requests&error=missing");
  }

  const { data, error: readError } = await supabase
    .from("prayer_requests")
    .select("prayed_count")
    .eq("id", requestId)
    .maybeSingle();

  if (readError || !data) {
    redirectToPrayerRequest(requestId, `error=${encodeURIComponent(readError?.message ?? "Prayer request not found")}`);
  }

  const prayedCount = typeof (data as { prayed_count?: unknown }).prayed_count === "number"
    ? (data as { prayed_count: number }).prayed_count
    : 0;

  const { error } = await supabase
    .from("prayer_requests")
    .update({
      last_prayed_at: new Date().toISOString(),
      prayed_count: prayedCount + 1,
    })
    .eq("id", requestId);

  if (error) {
    redirectToPrayerRequest(requestId, `error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/prayer-team");
  redirectToPrayerRequest(requestId, "saved=prayed");
}

export async function markPrayerRequestCovered(formData: FormData) {
  const supabase = await getPrayerAdminClient();
  const requestId = getString(formData, "request_id");

  if (!requestId) {
    redirect("/admin/prayer-team?tab=requests&error=missing");
  }

  const { error } = await supabase
    .from("prayer_requests")
    .update({
      last_prayed_at: new Date().toISOString(),
      status: "covered",
    })
    .eq("id", requestId);

  if (error) {
    redirectToPrayerRequest(requestId, `error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/prayer-team");
  redirectToPrayerRequest(requestId, "saved=covered");
}

export async function markPrayerRequestAnswered(formData: FormData) {
  const supabase = await getPrayerAdminClient();
  const requestId = getString(formData, "request_id");

  if (!requestId) {
    redirect("/admin/prayer-team?tab=requests&error=missing");
  }

  const { error } = await supabase
    .from("prayer_requests")
    .update({
      answered_at: new Date().toISOString(),
      status: "answered",
    })
    .eq("id", requestId);

  if (error) {
    redirectToPrayerRequest(requestId, `error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/prayer-team");
  redirectToPrayerRequest(requestId, "saved=answered");
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
  redirectToPrayerRequest(requestId, "saved=archived");
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

export async function markPrayerSubmissionNeedsFollowUp(formData: FormData) {
  const supabase = await getPrayerAdminClient();
  const submissionId = getString(formData, "submission_id");

  if (!submissionId) {
    redirect("/admin/prayer-team?tab=applications&error=missing");
  }

  const { error } = await supabase
    .from("form_submissions")
    .update({ status: "needs_follow_up" })
    .eq("id", submissionId);

  if (error) {
    redirectToPrayerSubmission(submissionId, `error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/prayer-team");
  redirectToPrayerSubmission(submissionId, "saved=needs-follow-up");
}

export async function declinePrayerTeamApplication(formData: FormData) {
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
  redirectToPrayerSubmission(submissionId, "saved=declined");
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
    assigned_coverage: {},
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

export async function approvePrayerPartnerApplication(formData: FormData) {
  const { authorization, supabase } = await getPrayerAdminContext();
  const partnerId = getString(formData, "partner_id");

  if (!partnerId) {
    redirect("/admin/prayer-team?tab=applications&error=missing");
  }

  const { data, error } = await supabase
    .from("prayer_partners")
    .select("id, first_name, last_name, name, email, phone, recruited_by_household_id, workspace_id, missionary_profile_id, recruited_by_profile_slug, status")
    .eq("id", partnerId)
    .maybeSingle();

  if (error || !data) {
    redirectToPrayerApplication(partnerId, `error=${encodeURIComponent(error?.message ?? "Application not found")}`);
  }

  const partner = data as {
    email: string | null;
    first_name: string | null;
    id: string;
    last_name: string | null;
    missionary_profile_id: string | null;
    name: string | null;
    phone: string | null;
    recruited_by_household_id: string | null;
    recruited_by_profile_slug: string | null;
    status: string | null;
    workspace_id: string | null;
  };
  const householdId = partner.recruited_by_household_id ?? partner.workspace_id ?? partner.missionary_profile_id;
  const displayName = prayerPartnerDisplayName(partner);

  const updateResult = await supabase
    .from("prayer_partners")
    .update({
      approved_at: new Date().toISOString(),
      approved_by: authorization.email,
      status: "active",
    })
    .eq("id", partnerId);

  if (updateResult.error) {
    redirectToPrayerApplication(partnerId, `error=${encodeURIComponent(updateResult.error.message)}`);
  }

  if (householdId) {
    const existingMemberResult = await supabase
      .from("missionary_team_members")
      .select("id")
      .eq("household_id", householdId)
      .eq("role_title", "Prayer Partner")
      .ilike("display_name", displayName)
      .limit(1)
      .maybeSingle();

    const memberPayload = {
      display_name: displayName,
      household_id: householdId,
      is_public: false,
      role_title: "Prayer Partner",
      short_description: "Approved prayer team partner.",
      sort_order: 999,
      source: "public_form",
      status: "active",
    };
    const memberResult = existingMemberResult.data
      ? await supabase
        .from("missionary_team_members")
        .update(memberPayload)
        .eq("id", (existingMemberResult.data as { id: string }).id)
      : await supabase
        .from("missionary_team_members")
        .insert(memberPayload);

    if (existingMemberResult.error || memberResult.error) {
      redirectToPrayerApplication(partnerId, `error=${encodeURIComponent(existingMemberResult.error?.message ?? memberResult.error?.message ?? "Team member mirror could not be saved")}`);
    }
  }

  revalidatePath("/admin/prayer-team");
  revalidatePath("/admin/missionary-profiles");
  redirect(`/admin/prayer-team?tab=partners&partner=${partnerId}&saved=approved`);
}

export async function declinePrayerPartnerApplication(formData: FormData) {
  const supabase = await getPrayerAdminClient();
  const partnerId = getString(formData, "partner_id");

  if (!partnerId) {
    redirect("/admin/prayer-team?tab=applications&error=missing");
  }

  const { data, error: readError } = await supabase
    .from("prayer_partners")
    .select("id, first_name, last_name, name, email, recruited_by_household_id, workspace_id, missionary_profile_id")
    .eq("id", partnerId)
    .maybeSingle();

  if (readError || !data) {
    redirectToPrayerApplication(partnerId, `error=${encodeURIComponent(readError?.message ?? "Application not found")}`);
  }

  const partner = data as {
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    missionary_profile_id: string | null;
    name: string | null;
    recruited_by_household_id: string | null;
    workspace_id: string | null;
  };
  const householdId = partner.recruited_by_household_id ?? partner.workspace_id ?? partner.missionary_profile_id;
  const displayName = prayerPartnerDisplayName(partner);
  const { error } = await supabase
    .from("prayer_partners")
    .update({ status: "declined" })
    .eq("id", partnerId);

  if (error) {
    redirectToPrayerApplication(partnerId, `error=${encodeURIComponent(error.message)}`);
  }

  if (householdId) {
    const memberResult = await supabase
      .from("missionary_team_members")
      .update({
        is_public: false,
        status: "declined",
      })
      .eq("household_id", householdId)
      .eq("role_title", "Prayer Partner")
      .ilike("display_name", displayName);

    if (memberResult.error) {
      redirectToPrayerApplication(partnerId, `error=${encodeURIComponent(memberResult.error.message)}`);
    }
  }

  revalidatePath("/admin/prayer-team");
  revalidatePath("/admin/missionary-profiles");
  redirectToPrayerApplication(partnerId, "saved=declined");
}

export async function updatePrayerPartner(formData: FormData) {
  const supabase = await getPrayerAdminClient();
  const partnerId = getString(formData, "partner_id");

  if (!partnerId) {
    redirect("/admin/prayer-team?tab=partners&error=missing");
  }

  let assignedCoverage: Record<string, unknown> = {};

  try {
    assignedCoverage = getAssignedCoverage(formData);
  } catch (error) {
    redirectToPrayerPartner(partnerId, `error=${encodeURIComponent(error instanceof Error ? error.message : "Invalid coverage JSON")}`);
  }

  const { error } = await supabase
    .from("prayer_partners")
    .update({
      assigned_coverage: assignedCoverage,
      email_alerts: getString(formData, "email_alerts") === "on",
      internal_notes: asNullableString(getString(formData, "internal_notes")),
      permissions: getPermissionRecord(formData),
      sms_alerts: getString(formData, "sms_alerts") === "on",
      status: getPartnerStatus(getString(formData, "status")),
    })
    .eq("id", partnerId);

  if (error) {
    redirectToPrayerPartner(partnerId, `error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/prayer-team");
  redirectToPrayerPartner(partnerId);
}

export async function deactivatePrayerPartner(formData: FormData) {
  const supabase = await getPrayerAdminClient();
  const partnerId = getString(formData, "partner_id");

  if (!partnerId) {
    redirect("/admin/prayer-team?tab=partners&error=missing");
  }

  const { error } = await supabase
    .from("prayer_partners")
    .update({ status: "inactive" })
    .eq("id", partnerId);

  if (error) {
    redirectToPrayerPartner(partnerId, `error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/prayer-team");
  redirectToPrayerPartner(partnerId, "saved=deactivated");
}
