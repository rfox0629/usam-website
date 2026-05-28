import { NextResponse } from "next/server";
import { requireDosWorkspaceRouteAccess } from "@/src/lib/dos/api-auth";
import { canWriteDosActivity, getDosAuthorization } from "@/src/lib/dos/auth";
import { recalculateCircleScores } from "@/src/lib/dos/circle-scoring";
import { resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function readPayload(request: Request) {
  try {
    return await request.json() as { workspaceId?: unknown };
  } catch {
    return {};
  }
}

async function authorizeWrite() {
  const authorization = await getDosAuthorization();

  if (authorization.status === "unauthenticated") {
    return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }

  if (authorization.status === "configuration_error") {
    return { response: NextResponse.json({ error: authorization.message }, { status: 500 }) };
  }

  if (authorization.status === "unauthorized" || !canWriteDosActivity(authorization)) {
    return { response: NextResponse.json({ error: "DOS write access required." }, { status: 403 }) };
  }

  return { authorization };
}

export async function POST(request: Request) {
  const authResult = await authorizeWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  const payload = await readPayload(request);
  const workspaceId = await resolveDosAppWorkspaceId(asString(payload.workspaceId));

  if (!workspaceId) {
    return NextResponse.json({ error: "Missionary workspace not found." }, { status: 404 });
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(authResult.authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  try {
    return NextResponse.json(await recalculateCircleScores(workspaceId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to recalculate circles." }, { status: 500 });
  }
}
