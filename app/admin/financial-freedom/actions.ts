"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminAuthorization, hasAdminRole } from "@/src/lib/admin-auth";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/src/lib/supabase/server";

const statusValues = ["new", "reviewed", "follow_up", "closed"] as const;
const majorGiftStatusValues = ["new", "reviewed", "contacted", "closed", "archived"] as const;

function getString(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function isValidStatus(value: string): value is (typeof statusValues)[number] {
  return statusValues.includes(value as (typeof statusValues)[number]);
}

function isValidMajorGiftStatus(value: string): value is (typeof majorGiftStatusValues)[number] {
  return majorGiftStatusValues.includes(value as (typeof majorGiftStatusValues)[number]);
}

export async function updateFinancialFreedomInquiryStatus(formData: FormData) {
  const authorization = await getAdminAuthorization();
  const inquiryId = getString(formData, "inquiryId");
  const status = getString(formData, "status");

  if (authorization.status === "unauthenticated") {
    redirect("/login?next=/admin/financial-freedom");
  }

  if (authorization.status !== "authorized" || !hasAdminRole(authorization, ["admin"])) {
    redirect("/");
  }

  if (!inquiryId || !isValidStatus(status)) {
    redirect("/admin/financial-freedom?error=invalid");
  }

  if (!isSupabaseServerConfigured()) {
    redirect(`/admin/financial-freedom?inquiry=${encodeURIComponent(inquiryId)}&error=config`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("financial_freedom_inquiries")
    .update({ status })
    .eq("id", inquiryId)
    .select("id")
    .single();

  if (error) {
    redirect(`/admin/financial-freedom?inquiry=${encodeURIComponent(inquiryId)}&error=status`);
  }

  revalidatePath("/admin/financial-freedom");
  redirect(`/admin/financial-freedom?inquiry=${encodeURIComponent(inquiryId)}&saved=1`);
}

export async function updateMajorGiftInquiryStatus(formData: FormData) {
  const authorization = await getAdminAuthorization();
  const inquiryId = getString(formData, "inquiryId");
  const status = getString(formData, "status");

  if (authorization.status === "unauthenticated") {
    redirect("/login?next=/admin/financial-freedom");
  }

  if (authorization.status !== "authorized" || !hasAdminRole(authorization, ["admin"])) {
    redirect("/");
  }

  if (!inquiryId || !isValidMajorGiftStatus(status)) {
    redirect("/admin/financial-freedom?type=major-gift&error=invalid");
  }

  if (!isSupabaseServerConfigured()) {
    redirect(`/admin/financial-freedom?type=major-gift&majorGift=${encodeURIComponent(inquiryId)}&error=config`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("major_gift_inquiries")
    .update({ status })
    .eq("id", inquiryId)
    .select("id")
    .single();

  if (error) {
    redirect(`/admin/financial-freedom?type=major-gift&majorGift=${encodeURIComponent(inquiryId)}&error=status`);
  }

  revalidatePath("/admin/financial-freedom");
  redirect(`/admin/financial-freedom?type=major-gift&majorGift=${encodeURIComponent(inquiryId)}&saved=1`);
}
