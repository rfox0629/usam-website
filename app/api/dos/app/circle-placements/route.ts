import { NextResponse } from "next/server";
import { requireDosWorkspaceRouteAccess } from "@/src/lib/dos/api-auth";
import { canWriteDosActivity, getDosAuthorization } from "@/src/lib/dos/auth";
import {
  confirmCirclePlacements,
  loadConfirmedPlacements,
  reviewedNotPlaced,
  type PlacementChangeRequest,
} from "@/src/lib/dos/circle-placement-store";
import { circleTiers } from "@/src/lib/dos/circle-tiers";
import { resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";
import { isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

/* USA-247. Confirmed circle placement.
   Authorization is the same gate every other DOS app route uses: an authorized
   operator, a workspace they have been granted, and write capability for a
   change. The transaction re-checks that every named person belongs to that
   workspace, so a forged person id cannot cross a tenant boundary even if this
   route were wrong. */

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const targets = new Set<string>([...circleTiers, reviewedNotPlaced, "not_reviewed"]);

function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

export async function GET(request: Request) {
  const authorization = await getDosAuthorization();
  const url = new URL(request.url);
  const access = await requireDosWorkspaceRouteAccess(authorization, url.searchParams.get("workspace"));

  if ("response" in access) {
    return access.response;
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase admin environment variables are not configured." }, { status: 500 });
  }

  const workspaceId = await resolveDosAppWorkspaceId(access.workspaceAccess.workspace.id);

  if (!workspaceId) {
    return NextResponse.json({ error: "Missionary workspace not found." }, { status: 404 });
  }

  try {
    return NextResponse.json({ placements: await loadConfirmedPlacements(workspaceId) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load confirmed circle placements." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const authorization = await getDosAuthorization();
  let payload: { changes?: unknown; operationKey?: unknown; reason?: unknown; workspaceId?: unknown };

  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "That request could not be read. Nothing was saved." }, { status: 400 });
  }

  const access = await requireDosWorkspaceRouteAccess(
    authorization,
    typeof payload.workspaceId === "string" ? payload.workspaceId : null,
  );

  if ("response" in access) {
    return access.response;
  }

  if (!canWriteDosActivity(authorization)) {
    return NextResponse.json({ error: "You do not have permission to change circles." }, { status: 403 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase admin environment variables are not configured." }, { status: 500 });
  }

  const operationKey = typeof payload.operationKey === "string" ? payload.operationKey.trim() : "";

  if (operationKey.length < 8 || operationKey.length > 128) {
    return NextResponse.json({ error: "That save is missing its request key. Nothing was saved." }, { status: 400 });
  }

  if (!Array.isArray(payload.changes) || payload.changes.length === 0) {
    return NextResponse.json({ error: "There is nothing to save." }, { status: 400 });
  }

  const changes: PlacementChangeRequest[] = [];

  for (const entry of payload.changes) {
    if (!entry || typeof entry !== "object") {
      return NextResponse.json({ error: "That is not a change DOS recognises. Nothing was saved." }, { status: 400 });
    }

    const change = entry as { personId?: unknown; to?: unknown };

    if (!isUuid(change.personId) || typeof change.to !== "string" || !targets.has(change.to)) {
      return NextResponse.json({ error: "That is not a change DOS recognises. Nothing was saved." }, { status: 400 });
    }

    changes.push({ personId: change.personId, to: change.to as PlacementChangeRequest["to"] });
  }

  const workspaceId = await resolveDosAppWorkspaceId(access.workspaceAccess.workspace.id);

  if (!workspaceId) {
    return NextResponse.json({ error: "Missionary workspace not found." }, { status: 404 });
  }

  try {
    const result = await confirmCirclePlacements({
      changes,
      confirmedByEmail: authorization.status === "authorized" ? authorization.email ?? null : null,
      confirmedById: null,
      operationKey,
      reason: typeof payload.reason === "string" ? payload.reason : null,
      workspaceId,
    });

    if (result.status === "rejected") {
      /* The surface keeps the operator's proposed changes on screen, so the
         refusal has to explain itself rather than just failing. 409 marks a
         rule the caller can resolve and retry. */
      return NextResponse.json(
        { code: result.code, conflicts: result.conflicts, error: result.message },
        { status: result.code === "over_capacity" ? 409 : 400 },
      );
    }

    return NextResponse.json({
      appliedCount: result.appliedCount,
      batchId: result.batchId,
      placements: await loadConfirmedPlacements(workspaceId),
      status: result.status,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Your changes could not be saved. Nothing was changed." },
      { status: 500 },
    );
  }
}
