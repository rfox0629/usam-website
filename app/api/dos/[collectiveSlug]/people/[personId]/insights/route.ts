import { NextResponse } from "next/server";

export async function PATCH() {
  return NextResponse.json(
    {
      error: "This legacy DOS prototype endpoint has been retired. Person updates belong in the active DOS app flow.",
    },
    { status: 410 },
  );
}
