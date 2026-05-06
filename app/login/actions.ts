"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/src/lib/supabase/server";

function getString(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function safeNextPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/admin/dashboard";
}

function isMissingIsActiveColumn(error: { message?: string } | null) {
  return Boolean(error?.message?.includes("admin_users.is_active"));
}

export async function signInAdmin(formData: FormData) {
  const email = getString(formData, "email").toLowerCase();
  const password = getString(formData, "password");
  const nextPath = safeNextPath(getString(formData, "next") || "/admin/dashboard");

  if (!email || !password) {
    redirect(`/login?error=missing&next=${encodeURIComponent(nextPath)}`);
  }

  if (!isSupabaseServerConfigured()) {
    redirect(`/login?error=config&next=${encodeURIComponent(nextPath)}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=invalid&next=${encodeURIComponent(nextPath)}`);
  }

  const { data: adminUserWithActive, error: adminUserWithActiveError } = await supabase
    .from("admin_users")
    .select("email, role, is_active")
    .maybeSingle();
  const { data: adminUser, error: adminUserError } = isMissingIsActiveColumn(adminUserWithActiveError)
    ? await supabase
      .from("admin_users")
      .select("email, role")
      .maybeSingle()
    : { data: adminUserWithActive, error: adminUserWithActiveError };

  if (adminUserError) {
    await supabase.auth.signOut();
    redirect(`/login?error=admin-check&next=${encodeURIComponent(nextPath)}`);
  }

  if (!adminUser) {
    await supabase.auth.signOut();
    redirect(`/login?error=not-admin&next=${encodeURIComponent(nextPath)}`);
  }

  if ((adminUser as { is_active?: boolean }).is_active === false) {
    await supabase.auth.signOut();
    redirect(`/login?error=inactive&next=${encodeURIComponent(nextPath)}`);
  }

  redirect(nextPath);
}

export async function signOutAdmin() {
  if (isSupabaseServerConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }

  redirect("/login?next=/admin/dashboard");
}
