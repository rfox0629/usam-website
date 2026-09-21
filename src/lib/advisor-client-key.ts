import "server-only";

/**
 * Derives the throttling key for a request.
 *
 * The raw address is hashed and truncated before it is used, so the limiter
 * never holds. and could never surface. a full client IP. The hash is only
 * ever a map key in memory; it is not persisted and not logged.
 */

const UNKNOWN_CLIENT_KEY = "unknown";

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function readClientAddress(request: Request) {
  // On Vercel x-forwarded-for is always set; its first entry is the client.
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();

    if (first) {
      return first;
    }
  }

  return request.headers.get("x-real-ip")?.trim() || null;
}

export async function getAdvisorClientKey(request: Request) {
  const address = readClientAddress(request);

  if (!address) {
    // Every unidentifiable request shares one bucket. On Vercel this should
    // not happen; if it does, the shared bucket throttles them collectively
    // rather than letting them through unmetered.
    return UNKNOWN_CLIENT_KEY;
  }

  return (await sha256Hex(address)).slice(0, 32);
}
