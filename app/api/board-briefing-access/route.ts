import { NextResponse } from "next/server";
import {
  BOARD_BRIEFING_ACCESS_COOKIE_NAME,
  boardBriefingAccessCookieOptions,
  createBoardBriefingAccessToken,
  isBoardBriefingAccessConfigured,
  isValidBoardBriefingAccessCode,
} from "@/src/lib/board-briefing-access";

type AccessRequestBody = {
  accessCode?: unknown;
};

export async function POST(request: Request) {
  if (!isBoardBriefingAccessConfigured()) {
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

  if (!isValidBoardBriefingAccessCode(accessCode)) {
    return NextResponse.json({ error: "That access code wasn't recognized." }, { status: 401 });
  }

  const token = await createBoardBriefingAccessToken();

  if (!token) {
    return NextResponse.json({ error: "Access is not configured yet." }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true });

  response.cookies.set(BOARD_BRIEFING_ACCESS_COOKIE_NAME, token, boardBriefingAccessCookieOptions());

  return response;
}
