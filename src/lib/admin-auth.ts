import "server-only";

import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/src/lib/supabase/server";

type AdminUserRow = {
  email: string;
  prayer_permissions?: unknown;
  role: string;
};

export type AdminAuthorization =
  | {
      email: string;
      prayerPermissions: string[];
      role: string;
      status: "authorized";
      userId: string;
    }
  | {
      status: "unauthenticated";
    }
  | {
      email: string;
      status: "unauthorized";
    }
  | {
      message: string;
      status: "configuration_error";
    };

function isMissingPrayerPermissionsColumn(error: { message?: string } | null) {
  return Boolean(error?.message?.includes("admin_users.prayer_permissions"));
}

function toPrayerPermissions(value: unknown) {
  return Array.isArray(value)
    ? value.filter((permission): permission is string => typeof permission === "string")
    : [];
}

export async function getAdminAuthorization(): Promise<AdminAuthorization> {
  if (!isSupabaseServerConfigured()) {
    return {
      message: "Supabase Auth environment variables are not configured.",
      status: "configuration_error",
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return { status: "unauthenticated" };
  }

  const email = user.email.trim().toLowerCase();

  // RLS on admin_users only exposes the row matching the authenticated user's
  // Supabase Auth email, so no credential or role decision lives in code.
  const { data: adminUserWithPermissions, error: adminPermissionsError } = await supabase
    .from("admin_users")
    .select("email, role, prayer_permissions")
    .maybeSingle();
  const { data: adminUser, error: adminError } = isMissingPrayerPermissionsColumn(adminPermissionsError)
    ? await supabase
      .from("admin_users")
      .select("email, role")
      .maybeSingle()
    : { data: adminUserWithPermissions, error: adminPermissionsError };

  if (adminError) {
    return {
      message: adminError.message,
      status: "configuration_error",
    };
  }

  if (!adminUser) {
    return {
      email,
      status: "unauthorized",
    };
  }

  return {
    email,
    prayerPermissions: toPrayerPermissions((adminUser as AdminUserRow).prayer_permissions),
    role: (adminUser as AdminUserRow).role,
    status: "authorized",
    userId: user.id,
  };
}

export function hasPrayerAdminAccess(authorization: AdminAuthorization) {
  if (authorization.status !== "authorized") {
    return false;
  }

  if (authorization.role === "admin") {
    return true;
  }

  return authorization.prayerPermissions.some((permission) => (
    permission === "admin_prayer_manager"
    || permission === "view_confidential_requests"
    || permission === "view_general_requests"
  ));
}
