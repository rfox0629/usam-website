"use server";

import { revalidatePath } from "next/cache";
import { isFinancePermissionsWriteEnabled, requireFinanceCapability } from "@/src/lib/finance-auth";
import { resolveUsamOrganizationId } from "@/src/lib/finance-ops/db";
import { financeRoles, type FinanceRole } from "@/src/lib/finance-ops/roles";
import {
  disableFinanceTeamMember,
  inviteFinanceTeamMember,
  reenableFinanceTeamMember,
  updateFinanceTeamMemberRole,
} from "@/src/lib/finance-ops/team";

async function requireTeamManagementAccess() {
  const access = await requireFinanceCapability("manage_finance_team");

  if (!isFinancePermissionsWriteEnabled()) {
    throw new Error(
      "Finance Team management is unavailable in this preview: the finance_team_members migration has not been applied to any database yet. See supabase/migrations/20260715090000_finance_team_permissions_foundation.sql.",
    );
  }

  return access;
}

export async function inviteFinanceTeamMemberAction(email: string, financeRole: FinanceRole) {
  const access = await requireTeamManagementAccess();

  if (!financeRoles.includes(financeRole)) {
    throw new Error("Invalid Finance role.");
  }

  // finance_owner via admin_users doesn't carry an organizationId the way a
  // finance_team_members row does -- resolve USAM directly, matching every
  // other single-tenant lookup in this codebase.
  const organizationId = await resolveUsamOrganizationId();

  if (!organizationId) {
    throw new Error("Could not resolve the organization for this invitation.");
  }

  await inviteFinanceTeamMember({ email, financeRole, invitedBy: access.email, organizationId });
  revalidatePath("/ncc/finance");
}

export async function updateFinanceTeamMemberRoleAction(id: string, financeRole: FinanceRole) {
  await requireTeamManagementAccess();

  if (!financeRoles.includes(financeRole)) {
    throw new Error("Invalid Finance role.");
  }

  await updateFinanceTeamMemberRole(id, financeRole);
  revalidatePath("/ncc/finance");
}

export async function disableFinanceTeamMemberAction(id: string) {
  await requireTeamManagementAccess();
  await disableFinanceTeamMember(id);
  revalidatePath("/ncc/finance");
}

export async function reenableFinanceTeamMemberAction(id: string) {
  await requireTeamManagementAccess();
  await reenableFinanceTeamMember(id);
  revalidatePath("/ncc/finance");
}
