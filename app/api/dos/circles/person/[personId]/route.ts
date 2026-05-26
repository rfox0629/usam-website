import { NextResponse } from "next/server";
import { getDosAuthorization } from "@/src/lib/dos/auth";
import { loadPersonRelationshipIntelligence } from "@/src/lib/dos/circle-scoring";
import { resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function authorizeRead() {
  const authorization = await getDosAuthorization();

  if (authorization.status === "unauthenticated") {
    return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }

  if (authorization.status === "configuration_error") {
    return { response: NextResponse.json({ error: authorization.message }, { status: 500 }) };
  }

  if (authorization.status === "unauthorized") {
    return { response: NextResponse.json({ error: "DOS access required." }, { status: 403 }) };
  }

  return { authorization };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ personId: string }> },
) {
  const authResult = await authorizeRead();

  if ("response" in authResult) {
    return authResult.response;
  }

  const { personId } = await params;
  const url = new URL(request.url);
  const workspaceId = await resolveDosAppWorkspaceId(asString(url.searchParams.get("workspaceId")));

  if (!workspaceId || !isUuid(personId)) {
    return NextResponse.json({ error: "Person not found." }, { status: 404 });
  }

  try {
    const data = await loadPersonRelationshipIntelligence(workspaceId, personId);

    if (!data) {
      return NextResponse.json({ error: "Person not found." }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load relationship intelligence." }, { status: 500 });
  }
}
