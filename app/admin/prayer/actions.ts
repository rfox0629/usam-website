"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminAuthorization, hasPrayerAdminAccess } from "@/src/lib/admin-auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

const visibilityOptions = ["public", "team", "private"] as const;
const statusOptions = ["open", "covered", "answered", "archived"] as const;
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
