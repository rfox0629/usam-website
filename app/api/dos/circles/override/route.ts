import { NextResponse } from "next/server";
import { canWriteDosActivity, getDosAuthorization } from "@/src/lib/dos/auth";
import { updateCircleOverride } from "@/src/lib/dos/circle-scoring";
import { resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";

const circles = ["three", "twelve", "seventy", "field"] as const;

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asCircle(value: unknown) {
  const nextValue = asString(value);

  return circles.includes(nextValue as typeof circles[number]) ? nextValue as typeof circles[number] : null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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
  const personId = asString(payload.personId);
  const circle = asCircle(payload.circle);
  const locked = payload.locked !== false;

  if (!workspaceId || !isUuid(personId) || !circle) {
    return NextResponse.json({ error: "Person and circle are required." }, { status: 400 });
  }

  try {
    return NextResponse.json(await updateCircleOverride({
      circle,
      createdBy: authResult.authorization.userId,
      locked,
      personId,
      reason: asString(payload.reason),
      workspaceId,
    }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update circle pin." }, { status: 500 });
  }
}
