import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "This legacy DOS prototype endpoint has been retired. Relationship logging belongs in the active DOS app flow.",
    },
    { status: 410 },
  );
}
