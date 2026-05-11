import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "This legacy DOS prototype endpoint has been retired. Use the active /api/dos/app/meetings route.",
    },
    { status: 410 },
  );
}
