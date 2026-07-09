import "server-only";

export const PARTNERS_ACCESS_COOKIE_NAME = "usam_partners_access";
const PARTNERS_ACCESS_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const TOKEN_CONTEXT = "usam-partners-access";

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

export function isPartnersAccessConfigured() {
  return Boolean(process.env.PARTNERS_ACCESS_KEY?.trim());
}

export function isValidPartnersAccessCode(input: string) {
  const key = process.env.PARTNERS_ACCESS_KEY;

  if (!key?.trim()) {
    return false;
  }

  return normalizeCode(input) === normalizeCode(key);
}

// Deterministic from the current env var value, so rotating PARTNERS_ACCESS_KEY
// automatically invalidates any previously issued cookies.
export async function createPartnersAccessToken() {
  const key = process.env.PARTNERS_ACCESS_KEY;

  if (!key?.trim()) {
    return null;
  }

  return sha256Hex(`${TOKEN_CONTEXT}:${normalizeCode(key)}`);
}

export async function isPartnersAccessTokenValid(token: string | undefined | null) {
  if (!token) {
    return false;
  }

  const expected = await createPartnersAccessToken();

  return Boolean(expected) && token === expected;
}

export function partnersAccessCookieOptions() {
  return {
    httpOnly: true as const,
    maxAge: PARTNERS_ACCESS_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}
