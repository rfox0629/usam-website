import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { password } = await request.json();
  const previewCode = process.env.USAM_SYSTEM_PREVIEW_CODE;

  if (typeof password !== "string" || !previewCode || password !== previewCode) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
