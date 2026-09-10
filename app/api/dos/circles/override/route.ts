import { NextResponse } from "next/server";

/* USA-247. Retired.
 *
 * This route was the old way to confirm a circle: it upserted a single row in
 * dos_circle_overrides, overwriting whatever was there, and "unlocking" someone
 * DELETED the row outright. Neither is acceptable under the approved contract,
 * which requires effective-dated history, a reviewed-but-not-placed state, and
 * cumulative capacity enforced inside one transaction.
 *
 * Confirmed placement now lives in dos_circle_placements and is written only by
 * POST /api/dos/app/circle-placements, which calls dos_confirm_circle_placements.
 *
 * The route is kept as an explicit refusal rather than deleted so that any stale
 * client, bookmark or retry fails loudly and visibly instead of quietly writing
 * to a table nothing reads. It cannot revive machine placement because it no
 * longer writes anything at all.
 */

const retired = {
  error: "Circle placement moved. Use Manage circles, which records who confirmed the placement and when, and keeps the previous one.",
  movedTo: "/api/dos/app/circle-placements",
};

export async function PATCH() {
  return NextResponse.json(retired, { status: 410 });
}

export async function POST() {
  return NextResponse.json(retired, { status: 410 });
}

export async function DELETE() {
  return NextResponse.json(retired, { status: 410 });
}
