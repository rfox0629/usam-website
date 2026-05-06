"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminRoles, canManageAdminSettings, getAdminAuthorization, normalizeAdminRole } from "@/src/lib/admin-auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

const accessCodeTypes = ["system", "team", "preview"] as const;

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function isChecked(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function redirectToSettings(search: string): never {
  redirect(`/admin/settings?${search}`);
}

async function getSettingsAdminClient() {
  const authorization = await getAdminAuthorization();

  if (!canManageAdminSettings(authorization)) {
    redirectToSettings("error=unauthorized");
  }

  if (!isSupabaseAdminConfigured()) {
    redirectToSettings("error=supabase");
  }

  return {
    authorization,
    supabase: createSupabaseAdminClient(),
  };
}

export async function updateSystemAccessCodes(formData: FormData) {
  const { supabase } = await getSettingsAdminClient();
  const rows = accessCodeTypes.map((type) => ({
    active: isChecked(formData, `${type}_active`),
    code: getString(formData, `${type}_code`),
    code_type: type,
    type,
    updated_at: new Date().toISOString(),
  }));
  const missingCode = rows.find((row) => !row.code);

  if (missingCode) {
    redirectToSettings(`error=${missingCode.code_type}-missing`);
  }

  const { error } = await supabase
    .from("system_access_codes")
    .upsert(rows, { onConflict: "code_type" });

  if (error) {
    redirectToSettings(`error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/settings");
  redirectToSettings("saved=access-codes");
}

export async function addAdminUser(formData: FormData) {
  const { supabase } = await getSettingsAdminClient();
  const email = getString(formData, "email").toLowerCase();
  const role = normalizeAdminRole(getString(formData, "role"));

  if (!email || !email.includes("@")) {
    redirectToSettings("error=admin-email");
  }

  if (!adminRoles.includes(role)) {
    redirectToSettings("error=admin-role");
  }

  const { error } = await supabase
    .from("admin_users")
    .upsert({
      email,
      is_active: true,
      role,
    }, { onConflict: "email" });

  if (error) {
    redirectToSettings(`error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/settings");
  redirectToSettings("saved=admin-user");
}

export async function updateAdminUser(formData: FormData) {
  const { authorization, supabase } = await getSettingsAdminClient();
  const userId = getString(formData, "admin_user_id");
  const role = normalizeAdminRole(getString(formData, "role"));
  const isActive = isChecked(formData, "is_active");

  if (!userId) {
    redirectToSettings("error=admin-user-missing");
  }

  const { data: targetUser, error: targetError } = await supabase
    .from("admin_users")
    .select("id, email")
    .eq("id", userId)
    .maybeSingle();

  if (targetError) {
    redirectToSettings(`error=${encodeURIComponent(targetError.message)}`);
  }

  if (!targetUser) {
    redirectToSettings("error=admin-user-missing");
  }

  if (targetUser.email?.toLowerCase() === authorization.email.toLowerCase() && (!isActive || role !== "admin")) {
    redirectToSettings("error=self-admin");
  }

  const { error } = await supabase
    .from("admin_users")
    .update({
      is_active: isActive,
      role,
    })
    .eq("id", userId);

  if (error) {
    redirectToSettings(`error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/settings");
  redirectToSettings("saved=admin-user");
}

export async function removeAdminUser(formData: FormData) {
  const { authorization, supabase } = await getSettingsAdminClient();
  const userId = getString(formData, "admin_user_id");

  if (!userId) {
    redirectToSettings("error=admin-user-missing");
  }

  const { data: targetUser, error: targetError } = await supabase
    .from("admin_users")
    .select("id, email")
    .eq("id", userId)
    .maybeSingle();

  if (targetError) {
    redirectToSettings(`error=${encodeURIComponent(targetError.message)}`);
  }

  if (!targetUser) {
    redirectToSettings("error=admin-user-missing");
  }

  if (targetUser.email?.toLowerCase() === authorization.email.toLowerCase()) {
    redirectToSettings("error=self-remove");
  }

  const { error } = await supabase
    .from("admin_users")
    .delete()
    .eq("id", userId);

  if (error) {
    redirectToSettings(`error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/settings");
  redirectToSettings("saved=admin-user");
}
