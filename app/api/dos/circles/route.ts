import { NextResponse } from "next/server";
import { getDosAuthorization } from "@/src/lib/dos/auth";
import { loadCircleData, recalculateCircleScores } from "@/src/lib/dos/circle-scoring";
import { resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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

export async function GET(request: Request) {
  const authResult = await authorizeRead();

  if ("response" in authResult) {
    return authResult.response;
  }

  const url = new URL(request.url);
  const workspaceId = await resolveDosAppWorkspaceId(asString(url.searchParams.get("workspaceId")));

  if (!workspaceId) {
    return NextResponse.json({ error: "Missionary workspace not found." }, { status: 404 });
  }

  try {
    const cachedOnly = url.searchParams.get("cached") === "1";
    const data = cachedOnly ? await loadCircleData(workspaceId) : await recalculateCircleScores(workspaceId).catch(() => loadCircleData(workspaceId));

    if (!cachedOnly && data.metadata.peopleScored === 0 && data.fieldSummary.total > 0) {
      return NextResponse.json(await recalculateCircleScores(workspaceId).catch(() => data));
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load circles." }, { status: 500 });
  }
}
