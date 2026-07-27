import { NextResponse } from "next/server";
import { getAdminAuthorization } from "@/src/lib/admin-auth";
import { loadBackupControlCenterData } from "@/src/lib/operations-center/backup-agent";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStoreHeaders = {
  "Cache-Control": "private, no-store",
};

export async function GET() {
  const authorization = await getAdminAuthorization();

  if (authorization.status === "unauthenticated") {
    return NextResponse.json({ error: "Authentication required." }, { headers: noStoreHeaders, status: 401 });
  }

  if (authorization.status === "configuration_error") {
    return NextResponse.json({ error: authorization.message }, { headers: noStoreHeaders, status: 500 });
  }

  if (authorization.status === "unauthorized") {
    return NextResponse.json({ error: "Admin access required." }, { headers: noStoreHeaders, status: 403 });
  }

  return NextResponse.json(
    {
      access: "admin_backup_read_only",
      data: await loadBackupControlCenterData(),
    },
    { headers: noStoreHeaders },
  );
}
