import "server-only";

import { NextResponse } from "next/server";
import { getDosWorkspaceAccess, type DosAuthorization } from "@/src/lib/dos/auth";

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
