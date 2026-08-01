import { NextResponse } from "next/server";
import { getAdminAuthorization } from "@/src/lib/admin-auth";
import { loadOperationsCenterData } from "@/src/lib/operations-center/operations-center";

export const dynamic = "force-dynamic";

const headers = {
  "Cache-Control": "private, no-store",
};

export async function GET() {
  const authorization = await getAdminAuthorization();

  if (authorization.status === "unauthenticated") {
    return NextResponse.json({ error: "Authentication required." }, { headers, status: 401 });
  }

  if (authorization.status === "unauthorized") {
    return NextResponse.json({ error: "Admin access required." }, { headers, status: 403 });
  }

  if (authorization.status === "configuration_error") {
    return NextResponse.json({ error: authorization.message }, { headers, status: 500 });
  }

  return NextResponse.json(await loadOperationsCenterData(), { headers });
}
