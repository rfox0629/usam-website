import { NextResponse } from "next/server";
import { getAdminAuthorization, hasAdminRole } from "@/src/lib/admin-auth";
import { executeBackupAgentAction } from "@/src/lib/operations-center/backup-agent";
import { isBackupActionId } from "@/src/lib/operations-center/backups";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStoreHeaders = {
  "Cache-Control": "private, no-store",
};

type BackupActionPayload = {
  actionId?: unknown;
};

function requestHasIntentHeader(request: Request) {
  return request.headers.get("x-usam-operations-intent") === "backups";
}

function requestIsSameOrigin(request: Request) {
  const origin = request.headers.get("origin");

  if (!origin) {
    return true;
  }

  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const authorization = await getAdminAuthorization();

  if (authorization.status === "unauthenticated") {
    return NextResponse.json({ error: "Authentication required." }, { headers: noStoreHeaders, status: 401 });
  }

  if (authorization.status === "configuration_error") {
    return NextResponse.json({ error: authorization.message }, { headers: noStoreHeaders, status: 500 });
  }

  if (authorization.status === "unauthorized" || !hasAdminRole(authorization, ["admin"])) {
    return NextResponse.json({ error: "Admin access required." }, { headers: noStoreHeaders, status: 403 });
  }

  if (!requestHasIntentHeader(request) || !requestIsSameOrigin(request)) {
    return NextResponse.json({ error: "Backup action intent is required." }, { headers: noStoreHeaders, status: 403 });
  }

  let payload: BackupActionPayload;

  try {
    payload = await request.json() as BackupActionPayload;
  } catch {
    return NextResponse.json({ error: "Invalid backup action payload." }, { headers: noStoreHeaders, status: 400 });
  }

  if (!isBackupActionId(payload.actionId)) {
    return NextResponse.json({ error: "Unknown backup action." }, { headers: noStoreHeaders, status: 400 });
  }

  const result = await executeBackupAgentAction(payload.actionId);

  return NextResponse.json(result, { headers: noStoreHeaders, status: result.status });
}
