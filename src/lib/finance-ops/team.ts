import "server-only";

import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import type { FinanceRole } from "./roles";

export type FinanceTeamMember = {
  acceptedAt: string | null;
  disabledAt: string | null;
  email: string;
  financeRole: FinanceRole;
  id: string;
  invitedAt: string;
  invitedBy: string;
  lastAccessAt: string | null;
  organizationId: string;
};

type FinanceTeamMemberRow = {
  accepted_at: string | null;
  disabled_at: string | null;
  email: string;
  finance_role: FinanceRole;
  id: string;
  invited_at: string;
  invited_by: string;
  last_access_at: string | null;
  organization_id: string;
};

function mapRow(row: FinanceTeamMemberRow): FinanceTeamMember {
  return {
    acceptedAt: row.accepted_at,
    disabledAt: row.disabled_at,
    email: row.email,
    financeRole: row.finance_role,
    id: row.id,
    invitedAt: row.invited_at,
    invitedBy: row.invited_by,
    lastAccessAt: row.last_access_at,
    organizationId: row.organization_id,
  };
}

function isMissingTable(error: { message?: string } | null | undefined) {
  return Boolean(error?.message?.includes("finance_team_members"));
}

export async function listFinanceTeamMembers(organizationId: string): Promise<FinanceTeamMember[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("finance_team_members")
    .select("id, organization_id, email, finance_role, invited_by, invited_at, accepted_at, disabled_at, last_access_at")
    .eq("organization_id", organizationId)
    .order("invited_at", { ascending: false });

  if (error || !data) {
    if (error && !isMissingTable(error)) {
      console.error("Failed to list finance team members:", error.message);
    }

    return [];
  }

  return (data as FinanceTeamMemberRow[]).map(mapRow);
}

export async function inviteFinanceTeamMember(input: {
  email: string;
  financeRole: FinanceRole;
  invitedBy: string;
  organizationId: string;
}): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("finance_team_members").insert({
    email: input.email.trim().toLowerCase(),
    finance_role: input.financeRole,
    invited_by: input.invitedBy,
    organization_id: input.organizationId,
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("This email already has Finance access for this organization.");
    }

    throw new Error(`Could not invite finance team member: ${error.message}`);
  }
}

export async function updateFinanceTeamMemberRole(id: string, financeRole: FinanceRole): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("finance_team_members").update({ finance_role: financeRole }).eq("id", id);

  if (error) {
    throw new Error(`Could not update role: ${error.message}`);
  }
}

export async function disableFinanceTeamMember(id: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("finance_team_members").update({ disabled_at: new Date().toISOString() }).eq("id", id);

  if (error) {
    throw new Error(`Could not disable finance team member: ${error.message}`);
  }
}

export async function reenableFinanceTeamMember(id: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("finance_team_members").update({ disabled_at: null }).eq("id", id);

  if (error) {
    throw new Error(`Could not re-enable finance team member: ${error.message}`);
  }
}
