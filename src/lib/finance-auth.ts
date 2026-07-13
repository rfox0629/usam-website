import "server-only";

import { getAdminAuthorization } from "@/src/lib/admin-auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/src/lib/supabase/server";
import { hasFinanceCapability, type FinanceCapability, type FinanceRole } from "./finance-ops/roles";

export function isFinancePermissionsWriteEnabled() {
  return process.env.FINANCE_PERMISSIONS_MIGRATION_APPLIED === "true";
}

export type FinanceTeamAuthorization =
  | { email: string; organizationId: string; role: FinanceRole; status: "authorized" }
  | { email: string; status: "unauthorized" }
  | { message: string; status: "configuration_error" }
  | { status: "unauthenticated" };

type FinanceTeamMemberRow = {
  accepted_at: string | null;
  disabled_at: string | null;
  finance_role: FinanceRole;
  organization_id: string;
};

async function recordFinanceAccess(email: string) {
  try {
    const supabase = createSupabaseAdminClient();
    await supabase
      .from("finance_team_members")
      .update({ last_access_at: new Date().toISOString() })
      .eq("email", email)
      .is("disabled_at", null);
  } catch {
    // best-effort only -- never blocks the read path that got here
  }
}

/**
 * Resolves Finance access purely from finance_team_members, using the
 * session-bound (cookie/anon-key) client so the read is actually enforced by
 * the "Finance team members can read their own row" RLS policy, not just
 * checked in application code. Independent of admin_users entirely -- this
 * is the path that lets an external accountant/bookkeeper/treasurer use
 * Finance without any admin_users row.
 */
export async function getFinanceTeamAuthorization(): Promise<FinanceTeamAuthorization> {
  if (!isSupabaseServerConfigured()) {
    return { message: "Supabase Auth environment variables are not configured.", status: "configuration_error" };
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

  // RLS scopes this to the caller's own, non-disabled row -- no email/org
  // filter needs to be applied in the query itself. Assumes one finance
  // membership per person for now, matching this codebase's single-tenant
  // present (see docs/ncc-architecture.md §11) -- revisit .maybeSingle() if
  // a second organization is ever onboarded.
  const { data, error } = await supabase
    .from("finance_team_members")
    .select("organization_id, finance_role, disabled_at, accepted_at")
    .maybeSingle();

  if (error || !data) {
    return { email, status: "unauthorized" };
  }

  const row = data as FinanceTeamMemberRow;

  if (row.disabled_at) {
    return { email, status: "unauthorized" };
  }

  void recordFinanceAccess(email);

  return {
    email,
    organizationId: row.organization_id,
    role: row.finance_role,
    status: "authorized",
  };
}

export type FinanceAccess =
  | { authorized: true; email: string; role: FinanceRole; source: "admin_users" | "finance_team_members" }
  | { authorized: false; message?: string; reason: "configuration_error" | "unauthenticated" | "unauthorized" };

/**
 * The single entry point every Finance page/action should call. Existing
 * admin_users staff (Ryan, other NCC admins/editors) get Finance access
 * mapped from their existing global role -- no separate onboarding, no
 * regression. Everyone else (external accountants, bookkeepers, treasurers)
 * gets access purely from finance_team_members, with zero admin_users row
 * and therefore zero broader /admin or /ncc access. Global admin roles are
 * one path in, not the only one -- finance_team_members is what makes
 * Finance-only access possible at all.
 */
export async function resolveFinanceAccess(): Promise<FinanceAccess> {
  const adminAuthorization = await getAdminAuthorization();

  if (adminAuthorization.status === "configuration_error") {
    return { authorized: false, message: adminAuthorization.message, reason: "configuration_error" };
  }

  if (adminAuthorization.status === "authorized") {
    const role: FinanceRole =
      adminAuthorization.role === "admin" ? "finance_owner" : adminAuthorization.role === "editor" ? "accountant" : "treasurer_readonly";

    return { authorized: true, email: adminAuthorization.email, role, source: "admin_users" };
  }

  const financeAuthorization = await getFinanceTeamAuthorization();

  if (financeAuthorization.status === "authorized") {
    return { authorized: true, email: financeAuthorization.email, role: financeAuthorization.role, source: "finance_team_members" };
  }

  if (financeAuthorization.status === "configuration_error") {
    return { authorized: false, message: financeAuthorization.message, reason: "configuration_error" };
  }

  if (adminAuthorization.status === "unauthenticated" && financeAuthorization.status === "unauthenticated") {
    return { authorized: false, reason: "unauthenticated" };
  }

  return { authorized: false, reason: "unauthorized" };
}

export async function requireFinanceCapability(capability: FinanceCapability): Promise<Extract<FinanceAccess, { authorized: true }>> {
  const access = await resolveFinanceAccess();

  if (!access.authorized) {
    throw new Error("Finance access is required.");
  }

  if (!hasFinanceCapability(access.role, capability)) {
    throw new Error(`This action requires a capability the ${access.role.replace(/_/g, " ")} role does not have.`);
  }

  return access;
}

/**
 * Used by pages (not actions) that only need to know "can this session see
 * the Finance department at all" without requiring a specific capability --
 * e.g. to decide what to render, not to gate a write.
 */
export async function requireAnyFinanceAccess(): Promise<Extract<FinanceAccess, { authorized: true }>> {
  const access = await resolveFinanceAccess();

  if (!access.authorized) {
    throw new Error("Finance access is required.");
  }

  return access;
}
