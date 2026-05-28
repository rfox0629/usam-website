import { NextResponse } from "next/server";
import { requireDosWorkspaceRouteAccess } from "@/src/lib/dos/api-auth";
import { canWriteDosActivity, getDosAuthorization } from "@/src/lib/dos/auth";
import { updateCircleConfig } from "@/src/lib/dos/circle-scoring";
import { resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asWeight(value: unknown) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? Math.max(0, Math.min(100, Math.round(numberValue))) : undefined;
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

export async function PATCH(request: Request) {
  const authResult = await authorizeWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  let payload: Record<string, unknown>;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const workspaceId = await resolveDosAppWorkspaceId(asString(payload.workspaceId));

  if (!workspaceId) {
    return NextResponse.json({ error: "Missionary workspace not found." }, { status: 404 });
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(authResult.authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  try {
    const config = await updateCircleConfig(workspaceId, {
      discipleshipProgressWeight: asWeight(payload.discipleshipProgressWeight),
      fruitWeight: asWeight(payload.fruitWeight),
      meetingFrequencyWeight: asWeight(payload.meetingFrequencyWeight),
      momentumWeight: asWeight(payload.momentumWeight),
      multiplicationWeight: asWeight(payload.multiplicationWeight),
      timeInvestedWeight: asWeight(payload.timeInvestedWeight),
    });

    return NextResponse.json({ config, ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update config." }, { status: 500 });
  }
}
