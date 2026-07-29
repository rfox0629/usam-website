import "server-only";

import { NextResponse } from "next/server";
import { canEditAdminContent, getAdminAuthorization } from "@/src/lib/admin-auth";
import { getDosWorkspaceAccess, type DosAuthorization } from "@/src/lib/dos/auth";
import { decideDosPortalProvisioningAuthorization } from "@/src/lib/dos/portal-provisioning-auth-policy";
import { isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

export async function requireDosWorkspaceRouteAccess(
  authorization: DosAuthorization,
  workspaceRef: string | null | undefined,
) {
  const workspaceAccess = await getDosWorkspaceAccess(authorization, workspaceRef);

  if (workspaceAccess.status === "allowed") {
    return { workspaceAccess };
  }

  if (workspaceAccess.status === "configuration_error") {
    return {
      response: NextResponse.json({ error: workspaceAccess.message }, { status: 500 }),
    };
  }

  if (workspaceAccess.status === "not_found") {
    return {
      response: NextResponse.json({ error: "Missionary workspace not found." }, { status: 404 }),
    };
  }

  return {
    response: NextResponse.json({ error: "You do not have access to this DOS workspace." }, { status: 403 }),
  };
}

export async function requireDosPortalProvisioningAuthorization() {
  const authorization = await getAdminAuthorization();
  // USA-117 compatibility boundary: this closes the anonymous service-role
  // vulnerability with the current authenticated admin/editor operator model.
  // It is global by design for this stage and must be replaced by Workspace V2
  // tenant membership + capability checks when those primitives exist.
  const decision = decideDosPortalProvisioningAuthorization({
    authorization,
    hasOperatorAccess: canEditAdminContent(authorization),
    isServiceRoleConfigured: isSupabaseAdminConfigured,
  });

  if (decision.status === "rejected") {
    return {
      response: NextResponse.json({ error: decision.error }, { status: decision.httpStatus }),
    };
  }

  return { authorization };
}
