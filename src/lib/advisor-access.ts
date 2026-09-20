import "server-only";

export const ADVISOR_ACCESS_COOKIE_NAME = "usam_advisor_access";
export const ADVISOR_ACCESS_PATH = "/advisor";

// Three days. Long enough to read ahead, sleep on it, and return during the
// meeting without re-entering the code; short enough that a forgotten session
// on a shared machine expires on its own. Rotating ADVISOR_ACCESS_KEY revokes
// every issued session immediately, whatever its remaining lifetime.
const ADVISOR_ACCESS_MAX_AGE_SECONDS = 60 * 60 * 24 * 3;
const TOKEN_CONTEXT = "usam-advisor-access";

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// Length-independent comparison so a wrong code cannot be narrowed down by
// timing. Both sides are hashed first, so the inputs are always equal length.
function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) {
    return false;
  }

  let mismatch = 0;

  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return mismatch === 0;
}

export function isAdvisorAccessConfigured() {
  return Boolean(process.env.ADVISOR_ACCESS_KEY?.trim());
}

// Deliberately case-sensitive, unlike the board/vision gates: the advisor code
// is handed over verbatim, and an exact match keeps the accepted input set as
// small as possible. Only surrounding whitespace is forgiven.
export async function isValidAdvisorAccessCode(input: string) {
  const key = process.env.ADVISOR_ACCESS_KEY;

  if (!key?.trim()) {
    return false;
  }

  const [submitted, expected] = await Promise.all([
    sha256Hex(input.trim()),
    sha256Hex(key.trim()),
  ]);

  return timingSafeEqual(submitted, expected);
}

// Deterministic from the current env var value, so rotating ADVISOR_ACCESS_KEY
// (e.g. after the meeting) automatically invalidates any previously issued
// cookies. The cookie never carries the code itself.
export async function createAdvisorAccessToken() {
  const key = process.env.ADVISOR_ACCESS_KEY;

  if (!key?.trim()) {
    return null;
  }

  return sha256Hex(`${TOKEN_CONTEXT}:${key.trim()}`);
}

export async function isAdvisorAccessTokenValid(token: string | undefined | null) {
  if (!token) {
    return false;
  }

  const expected = await createAdvisorAccessToken();

  return Boolean(expected) && timingSafeEqual(token, expected as string);
}

export function advisorAccessCookieOptions() {
  return {
    httpOnly: true as const,
    maxAge: ADVISOR_ACCESS_MAX_AGE_SECONDS,
    // Scoped to the briefing itself: the cookie is never sent with requests for
    // the rest of the public site.
    path: ADVISOR_ACCESS_PATH,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}
