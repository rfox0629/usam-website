import "server-only";

export const BOARD_BRIEFING_ACCESS_COOKIE_NAME = "usam_board_briefing_access";
const BOARD_BRIEFING_ACCESS_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const TOKEN_CONTEXT = "usam-board-briefing-access";

function normalizeCode(code: string) {
  return code.trim().toLowerCase();
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function isBoardBriefingAccessConfigured() {
  return Boolean(process.env.BOARD_BRIEFING_ACCESS_KEY?.trim());
}

export function isValidBoardBriefingAccessCode(input: string) {
  const key = process.env.BOARD_BRIEFING_ACCESS_KEY;

  if (!key?.trim()) {
    return false;
  }

  return normalizeCode(input) === normalizeCode(key);
}

// Deterministic from the current env var value, so rotating BOARD_BRIEFING_ACCESS_KEY
// (e.g. after the meeting) automatically invalidates any previously issued cookies.
export async function createBoardBriefingAccessToken() {
  const key = process.env.BOARD_BRIEFING_ACCESS_KEY;

  if (!key?.trim()) {
    return null;
  }

  return sha256Hex(`${TOKEN_CONTEXT}:${normalizeCode(key)}`);
}

export async function isBoardBriefingAccessTokenValid(token: string | undefined | null) {
  if (!token) {
    return false;
  }

  const expected = await createBoardBriefingAccessToken();

  return Boolean(expected) && token === expected;
}

export function boardBriefingAccessCookieOptions() {
  return {
    httpOnly: true as const,
    maxAge: BOARD_BRIEFING_ACCESS_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}
