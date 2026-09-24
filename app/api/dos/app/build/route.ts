import { NextResponse } from "next/server";
import { dosAppBuildId } from "@/src/lib/dos/app-build";

/* The build the server is on right now. Never cached: a stale answer here
   would defeat the whole point. No authentication and no data -- it returns
   one opaque deployment id, which is already public in every asset URL. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export function GET() {
  return NextResponse.json(
    { buildId: dosAppBuildId() },
    { headers: { "cache-control": "no-store, max-age=0" } },
  );
}
