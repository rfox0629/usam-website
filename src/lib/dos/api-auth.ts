import "server-only";

import { NextResponse } from "next/server";
import { canEditAdminContent, getAdminAuthorization } from "@/src/lib/admin-auth";
import { getDosWorkspaceAccess, type DosAuthorization } from "@/src/lib/dos/auth";
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

  if (authorization.status === "unauthenticated") {
    return {
      response: NextResponse.json({ error: "Authentication required." }, { status: 401 }),
    };
  }

  if (authorization.status === "configuration_error") {
    return {
      response: NextResponse.json({ error: "Unable to verify access." }, { status: 500 }),
    };
  }

  if (authorization.status === "unauthorized" || !canEditAdminContent(authorization)) {
    return {
      response: NextResponse.json({ error: "Access denied." }, { status: 403 }),
    };
  }

  if (!isSupabaseAdminConfigured()) {
    return {
      response: NextResponse.json({ error: "Provisioning is not available." }, { status: 500 }),
    };
  }

  return { authorization };
}
