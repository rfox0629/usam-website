import { NextResponse } from "next/server";

import {
  createJoinPreviewToken,
  isJoinPreviewGateEnabled,
  isValidJoinPreviewCode,
  JOIN_PREVIEW_COOKIE_NAME,
  joinPreviewCookieOptions,
} from "@/src/lib/join/preview-access";

/**
 * USA-167: exchanges JOIN_PREVIEW_ACCESS_KEY for the cookie that opens /join
 * during founder review.
 */
type AccessRequestBody = {
  accessCode?: unknown;
};

export async function POST(request: Request) {
  if (!isJoinPreviewGateEnabled()) {
    // Nothing to unlock: without the key the application is already open.
    return NextResponse.json({ ok: true });
  }

  let body: AccessRequestBody;

  try {
    body = (await request.json()) as AccessRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const accessCode = typeof body.accessCode === "string" ? body.accessCode.trim() : "";

  if (!accessCode) {
    return NextResponse.json({ error: "Please enter your access code." }, { status: 400 });
  }

  if (!isValidJoinPreviewCode(accessCode)) {
    return NextResponse.json({ error: "That access code was not recognized." }, { status: 401 });
  }

  const token = await createJoinPreviewToken();

  if (!token) {
    return NextResponse.json({ error: "Access is not configured yet." }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true });

  response.cookies.set(JOIN_PREVIEW_COOKIE_NAME, token, joinPreviewCookieOptions());

  return response;
}
