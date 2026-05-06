import "server-only";

import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/src/lib/supabase/server";

export const adminRoles = ["admin", "editor", "viewer"] as const;

export type AdminRole = typeof adminRoles[number];

type AdminUserRow = {
  email: string;
  is_active?: boolean;
  prayer_permissions?: unknown;
  role?: string | null;
};

export type AdminAuthorization =
  | {
      email: string;
      isActive: boolean;
      prayerPermissions: string[];
      role: AdminRole;
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

function isMissingIsActiveColumn(error: { message?: string } | null) {
  return Boolean(error?.message?.includes("admin_users.is_active"));
}

export function normalizeAdminRole(role: string | null | undefined): AdminRole {
  return adminRoles.includes(role as AdminRole) ? role as AdminRole : "viewer";
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
    .select("email, role, is_active, prayer_permissions")
    .maybeSingle();
  const { data: adminUserWithoutPermissions, error: adminWithoutPermissionsError } = isMissingPrayerPermissionsColumn(adminPermissionsError)
    ? await supabase
      .from("admin_users")
      .select("email, role, is_active")
      .maybeSingle()
    : { data: adminUserWithPermissions, error: adminPermissionsError };
  const { data: adminUser, error: adminError } = isMissingIsActiveColumn(adminWithoutPermissionsError)
    ? await supabase
      .from("admin_users")
      .select("email, role")
      .maybeSingle()
    : { data: adminUserWithoutPermissions, error: adminWithoutPermissionsError };

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

  if ((adminUser as AdminUserRow).is_active === false) {
    return {
      email,
      status: "unauthorized",
    };
  }

  return {
    email,
    isActive: (adminUser as AdminUserRow).is_active !== false,
    prayerPermissions: toPrayerPermissions((adminUser as AdminUserRow).prayer_permissions),
    role: normalizeAdminRole((adminUser as AdminUserRow).role),
    status: "authorized",
    userId: user.id,
  };
}

export function hasAdminRole(
  authorization: AdminAuthorization,
  roles: readonly AdminRole[],
): authorization is Extract<AdminAuthorization, { status: "authorized" }> {
  return authorization.status === "authorized" && roles.includes(authorization.role);
}

export function canManageAdminSettings(
  authorization: AdminAuthorization,
): authorization is Extract<AdminAuthorization, { status: "authorized" }> & { role: "admin" } {
  return hasAdminRole(authorization, ["admin"]);
}

export function canEditAdminContent(
  authorization: AdminAuthorization,
): authorization is Extract<AdminAuthorization, { status: "authorized" }> & { role: "admin" | "editor" } {
  return hasAdminRole(authorization, ["admin", "editor"]);
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
