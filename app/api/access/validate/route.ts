import { NextResponse } from "next/server";
import {
  USAM_ACCESS_COOKIE_NAME,
  accessCookieOptions,
  createAccessToken,
  isValidAccessCode,
} from "@/src/lib/access";

type AccessRequestBody = {
  accessCode?: unknown;
  email?: unknown;
  firstName?: unknown;
  flow?: unknown;
  lastName?: unknown;
  sourcePage?: unknown;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  let body: AccessRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const flow = asString(body.flow);
  const source = flow === "team" ? "team" : flow === "system" ? "system" : null;
  const accessCode = asString(body.accessCode);
  const firstName = asString(body.firstName);
  const lastName = asString(body.lastName);
  const email = asString(body.email).toLowerCase();

  if (!source) {
    return NextResponse.json({ error: "Invalid access flow." }, { status: 400 });
  }

  if (!accessCode) {
    return NextResponse.json({ error: "Please enter your access code." }, { status: 400 });
  }

  if (source === "team" && (!firstName || !lastName || !email || !isEmail(email))) {
    return NextResponse.json({ error: "Please complete the required fields." }, { status: 400 });
  }

  if (!isValidAccessCode(accessCode, source)) {
    return NextResponse.json({ error: "This access code was not recognized." }, { status: 401 });
  }

  const token = createAccessToken({
    email: email || null,
    name: [firstName, lastName].filter(Boolean).join(" "),
    source,
  });

  if (!token) {
    return NextResponse.json({ error: "Access is not configured yet." }, { status: 500 });
  }

  const response = NextResponse.json({
    ok: true,
    redirectTo: source === "team" ? "/missionaries" : "/system/preview",
  });

  response.cookies.set(USAM_ACCESS_COOKIE_NAME, token, accessCookieOptions());

  return response;
}
