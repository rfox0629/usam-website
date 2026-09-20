import { NextResponse } from "next/server";
import {
  ADVISOR_ACCESS_COOKIE_NAME,
  advisorAccessCookieOptions,
  createAdvisorAccessToken,
  isAdvisorAccessConfigured,
  isValidAdvisorAccessCode,
} from "@/src/lib/advisor-access";
import { getAdvisorClientKey } from "@/src/lib/advisor-client-key";
import {
  clearAdvisorFailedAttempts,
  getAdvisorRateLimitState,
  recordAdvisorFailedAttempt,
} from "@/src/lib/advisor-rate-limit";

type AccessRequestBody = {
  accessCode?: unknown;
};

export async function POST(request: Request) {
  if (!isAdvisorAccessConfigured()) {
    return NextResponse.json({ error: "Access is not configured yet." }, { status: 500 });
  }

  const clientKey = await getAdvisorClientKey(request);
  const rateLimit = getAdvisorRateLimitState(clientKey);

  // Checked before the body is read, so a locked-out client cannot keep
  // submitting guesses to be evaluated.
  if (rateLimit.limited) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      {
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        status: 429,
      },
    );
  }

  let body: AccessRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const accessCode = typeof body.accessCode === "string" ? body.accessCode.trim() : "";

  // A malformed or empty submission is not a guess, so it is not counted
  // against the attempt budget.
  if (!accessCode) {
    return NextResponse.json({ error: "Please enter your access code." }, { status: 400 });
  }

  if (!(await isValidAdvisorAccessCode(accessCode))) {
    recordAdvisorFailedAttempt(clientKey);

    return NextResponse.json({ error: "That access code wasn't recognized." }, { status: 401 });
  }

  const token = await createAdvisorAccessToken();

  if (!token) {
    return NextResponse.json({ error: "Access is not configured yet." }, { status: 500 });
  }

  // Authenticated: this client starts clean again.
  clearAdvisorFailedAttempts(clientKey);

  const response = NextResponse.json({ ok: true });

  response.cookies.set(ADVISOR_ACCESS_COOKIE_NAME, token, advisorAccessCookieOptions());

  return response;
}
