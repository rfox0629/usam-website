import "server-only";

export const VISION_ACCESS_COOKIE_NAME = "usam_vision_access";
const VISION_ACCESS_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const TOKEN_CONTEXT = "usam-vision-access";

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

export function isVisionAccessConfigured() {
  return Boolean(process.env.VISION_ACCESS_KEY?.trim());
}

export function isValidVisionAccessCode(input: string) {
  const key = process.env.VISION_ACCESS_KEY;

  if (!key?.trim()) {
    return false;
  }

  return normalizeCode(input) === normalizeCode(key);
}

// Deterministic from the current env var value, so rotating VISION_ACCESS_KEY
// (e.g. after the meeting) automatically invalidates any previously issued cookies.
export async function createVisionAccessToken() {
  const key = process.env.VISION_ACCESS_KEY;

  if (!key?.trim()) {
    return null;
  }

  return sha256Hex(`${TOKEN_CONTEXT}:${normalizeCode(key)}`);
}

export async function isVisionAccessTokenValid(token: string | undefined | null) {
  if (!token) {
    return false;
  }

  const expected = await createVisionAccessToken();

  return Boolean(expected) && token === expected;
}

export function visionAccessCookieOptions() {
  return {
    httpOnly: true as const,
    maxAge: VISION_ACCESS_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}
