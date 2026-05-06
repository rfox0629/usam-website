"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminAuthorization } from "@/src/lib/admin-auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

const accessCodeTypes = ["system", "team", "preview"] as const;

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function isChecked(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function redirectToSettings(search: string) {
  redirect(`/admin/settings?${search}`);
}

export async function updateSystemAccessCodes(formData: FormData) {
  const authorization = await getAdminAuthorization();

  if (authorization.status !== "authorized") {
    redirectToSettings("error=unauthorized");
  }

  if (!isSupabaseAdminConfigured()) {
    redirectToSettings("error=supabase");
  }

  const rows = accessCodeTypes.map((type) => ({
    active: isChecked(formData, `${type}_active`),
    code: getString(formData, `${type}_code`),
    type,
  }));
  const missingCode = rows.find((row) => !row.code);

  if (missingCode) {
    redirectToSettings(`error=${missingCode.type}-missing`);
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("system_access_codes")
    .upsert(rows, { onConflict: "type" });

  if (error) {
    redirectToSettings(`error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/settings");
  redirectToSettings("saved=access-codes");
}
