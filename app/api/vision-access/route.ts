import { NextResponse } from "next/server";
import {
  VISION_ACCESS_COOKIE_NAME,
  visionAccessCookieOptions,
  createVisionAccessToken,
  isVisionAccessConfigured,
  isValidVisionAccessCode,
} from "@/src/lib/vision-access";

type AccessRequestBody = {
  accessCode?: unknown;
};

export async function POST(request: Request) {
  if (!isVisionAccessConfigured()) {
    return NextResponse.json({ error: "Access is not configured yet." }, { status: 500 });
  }

  let body: AccessRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const accessCode = typeof body.accessCode === "string" ? body.accessCode.trim() : "";

  if (!accessCode) {
    return NextResponse.json({ error: "Please enter your access code." }, { status: 400 });
  }

  if (!isValidVisionAccessCode(accessCode)) {
    return NextResponse.json({ error: "That access code wasn't recognized." }, { status: 401 });
  }

  const token = await createVisionAccessToken();

  if (!token) {
    return NextResponse.json({ error: "Access is not configured yet." }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true });

  response.cookies.set(VISION_ACCESS_COOKIE_NAME, token, visionAccessCookieOptions());

  return response;
}
