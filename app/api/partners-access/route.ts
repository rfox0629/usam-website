import { NextResponse } from "next/server";
import {
  PARTNERS_ACCESS_COOKIE_NAME,
  createPartnersAccessToken,
  isPartnersAccessConfigured,
  isValidPartnersAccessCode,
  partnersAccessCookieOptions,
} from "@/src/lib/partners-access";

type AccessRequestBody = {
  accessCode?: unknown;
};

export async function POST(request: Request) {
  if (!isPartnersAccessConfigured()) {
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

  if (!isValidPartnersAccessCode(accessCode)) {
    return NextResponse.json({ error: "That access code wasn't recognized." }, { status: 401 });
  }

  const token = await createPartnersAccessToken();

  if (!token) {
    return NextResponse.json({ error: "Access is not configured yet." }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true });

  response.cookies.set(PARTNERS_ACCESS_COOKIE_NAME, token, partnersAccessCookieOptions());

  return response;
}
