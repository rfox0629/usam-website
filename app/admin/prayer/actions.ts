"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminAuthorization, hasPrayerAdminAccess } from "@/src/lib/admin-auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

const visibilityOptions = ["public", "team", "private"] as const;
const statusOptions = ["active", "archived"] as const;

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
    : "active";
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
    redirect("/admin/prayer?tab=requests&error=missing");
  }

  const { error } = await supabase
    .from("prayer_requests")
    .insert({
      category: asNullableString(getString(formData, "category")),
      description,
      household_id: asNullableString(householdId),
      status: "active",
      title,
      visibility: getVisibility(getString(formData, "visibility")),
    });

  if (error) {
    redirect(`/admin/prayer?tab=requests&error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/prayer");
  redirect("/admin/prayer?tab=requests&saved=created");
}

export async function updatePrayerRequest(formData: FormData) {
  const supabase = await getPrayerAdminClient();
  const requestId = getString(formData, "request_id");
  const title = getString(formData, "title");
  const description = getString(formData, "description");

  if (!requestId || !title || !description) {
    redirect("/admin/prayer?tab=requests&error=missing");
  }

  const { error } = await supabase
    .from("prayer_requests")
    .update({
      category: asNullableString(getString(formData, "category")),
      description,
      household_id: asNullableString(getString(formData, "household_id")),
      status: getStatus(getString(formData, "status")),
      title,
      visibility: getVisibility(getString(formData, "visibility")),
    })
    .eq("id", requestId);

  if (error) {
    redirect(`/admin/prayer?tab=requests&request=${requestId}&error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/prayer");
  redirect(`/admin/prayer?tab=requests&request=${requestId}&saved=updated`);
}

export async function archivePrayerRequest(formData: FormData) {
  const supabase = await getPrayerAdminClient();
  const requestId = getString(formData, "request_id");

  if (!requestId) {
    redirect("/admin/prayer?tab=requests&error=missing");
  }

  const { error } = await supabase
    .from("prayer_requests")
    .update({ status: "archived" })
    .eq("id", requestId);

  if (error) {
    redirect(`/admin/prayer?tab=requests&request=${requestId}&error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/prayer");
  redirect("/admin/prayer?tab=requests&saved=archived");
}
