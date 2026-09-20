import { NextResponse } from "next/server";
import {
  ADVISOR_ACCESS_COOKIE_NAME,
  advisorAccessCookieOptions,
  createAdvisorAccessToken,
  isAdvisorAccessConfigured,
  isValidAdvisorAccessCode,
} from "@/src/lib/advisor-access";

type AccessRequestBody = {
  accessCode?: unknown;
};

export async function POST(request: Request) {
  if (!isAdvisorAccessConfigured()) {
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

  if (!(await isValidAdvisorAccessCode(accessCode))) {
    return NextResponse.json({ error: "That access code wasn't recognized." }, { status: 401 });
  }

  const token = await createAdvisorAccessToken();

  if (!token) {
    return NextResponse.json({ error: "Access is not configured yet." }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true });

  response.cookies.set(ADVISOR_ACCESS_COOKIE_NAME, token, advisorAccessCookieOptions());

  return response;
}
