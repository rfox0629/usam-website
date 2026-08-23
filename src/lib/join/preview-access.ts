import "server-only";

/**
 * USA-167: keeps /join off the public internet during founder review.
 *
 * The founder direction is that /join must not be public and the Fox link must
 * not go out until the flow is verified. Rather than relying on nobody guessing
 * the URL, the whole application surface sits behind JOIN_PREVIEW_ACCESS_KEY.
 *
 * Same shape as the vision and partners gates so there is one pattern in the
 * codebase, with one deliberate difference: when the key is not configured the
 * gate is OPEN. That matters because /join is a public URL in the long run, and
 * a misconfigured environment must not lock real applicants out of an
 * application they were invited to complete. Protection is switched on by
 * setting the key, which is what preview and production do during review.
 */
export const JOIN_PREVIEW_COOKIE_NAME = "usam_join_preview_access";
const JOIN_PREVIEW_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const TOKEN_CONTEXT = "usam-join-preview-access";

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

export function isJoinPreviewGateEnabled() {
  return Boolean(process.env.JOIN_PREVIEW_ACCESS_KEY?.trim());
}

export function isValidJoinPreviewCode(input: string) {
  const key = process.env.JOIN_PREVIEW_ACCESS_KEY;

  if (!key?.trim()) {
    return false;
  }

  return normalizeCode(input) === normalizeCode(key);
}

/**
 * Derived from the current key, so rotating JOIN_PREVIEW_ACCESS_KEY invalidates
 * every cookie already issued.
 */
export async function createJoinPreviewToken() {
  const key = process.env.JOIN_PREVIEW_ACCESS_KEY;

  if (!key?.trim()) {
    return null;
  }

  return sha256Hex(`${TOKEN_CONTEXT}:${normalizeCode(key)}`);
}

export async function isJoinPreviewTokenValid(token: string | undefined | null) {
  if (!isJoinPreviewGateEnabled()) {
    return true;
  }

  if (!token) {
    return false;
  }

  const expected = await createJoinPreviewToken();

  return Boolean(expected) && token === expected;
}

export function joinPreviewCookieOptions() {
  return {
    httpOnly: true as const,
    maxAge: JOIN_PREVIEW_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}
