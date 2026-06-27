"use server";

import { revalidatePath } from "next/cache";
import { canEditAdminContent, getAdminAuthorization } from "@/src/lib/admin-auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type AssignmentType = "major_gift_inquiry" | "support_commitment";

function asString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}

function getAssignmentType(value: string): AssignmentType | null {
  return value === "major_gift_inquiry" || value === "support_commitment" ? value : null;
}

export async function assignFinanceSubmissionProfile(formData: FormData) {
  const authorization = await getAdminAuthorization();

  if (authorization.status !== "authorized" || !canEditAdminContent(authorization)) {
    return;
  }

  if (!isSupabaseAdminConfigured()) {
    return;
  }

  const submissionId = asString(formData.get("submissionId"));
  const assignmentType = getAssignmentType(asString(formData.get("assignmentType")));
  const missionaryProfileId = asString(formData.get("missionaryProfileId"));

  if (!assignmentType || !isUuid(submissionId) || (missionaryProfileId && !isUuid(missionaryProfileId))) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const tableName = assignmentType === "support_commitment"
    ? "support_commitments"
    : "major_gift_inquiries";

  if (!missionaryProfileId) {
    await supabase
      .from(tableName)
      .update({
        household_id: null,
        household_name: null,
        missionary_profile_id: null,
        profile_match_query: null,
        profile_match_source: "finance_admin",
        profile_match_status: "unassigned",
        profile_slug: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", submissionId);
  } else {
    const { data: profile, error } = await supabase
      .from("missionary_households")
      .select("id, display_name, public_display_name, slug, public_slug")
      .eq("id", missionaryProfileId)
      .maybeSingle();

    if (error || !profile) {
      return;
    }

    const profileRow = profile as {
      display_name: string;
      id: string;
      public_display_name: string | null;
      public_slug: string | null;
      slug: string;
    };

    await supabase
      .from(tableName)
      .update({
        household_id: profileRow.id,
        household_name: profileRow.public_display_name?.trim() || profileRow.display_name,
        missionary_profile_id: profileRow.id,
        profile_match_query: profileRow.public_display_name?.trim() || profileRow.display_name,
        profile_match_source: "finance_admin",
        profile_match_status: "manual",
        profile_slug: profileRow.public_slug?.trim() || profileRow.slug,
        updated_at: new Date().toISOString(),
      })
      .eq("id", submissionId);
  }

  revalidatePath("/admin/finance");
  revalidatePath("/admin/missionary-profiles");
  revalidatePath("/admin/organizations/usa-missionaries");
}
