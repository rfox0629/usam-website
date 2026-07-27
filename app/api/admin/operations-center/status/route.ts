import { NextResponse } from "next/server";
import { getAdminAuthorization } from "@/src/lib/admin-auth";
import { loadWorkforceSnapshot, operationsCenterRoute } from "@/src/lib/ai-workforce/operations-center";

export const dynamic = "force-dynamic";

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

  const snapshot = await loadWorkforceSnapshot();

  return NextResponse.json(
    {
      access: "admin_read_only",
      route: operationsCenterRoute,
      snapshot,
    },
    { headers: noStoreHeaders },
  );
}
