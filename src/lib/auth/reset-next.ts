/**
 * Set when a DOS user asks for a password reset, so that after the reset the
 * sign-in page returns them to DOS instead of the admin login. The recovery
 * email's redirect URL stays exactly as before (/update-password), so the
 * Supabase redirect allow-list is unaffected.
 */
export const RESET_NEXT_COOKIE_NAME = "usam_reset_next";

export function isDosNextPath(path: string) {
  return path === "/dos" || path.startsWith("/dos/");
}

/*
 * USA-289: where a DOS user lands after signing in. Only a real DOS page is
 * accepted; the sign-in, request, and retired signup routes are not
 * destinations, so a stale bookmark can never send someone back into setup.
 * Everything else becomes /dos, which opens the person's workspace.
 */
const notDosDestinations = new Set(["/dos/sign-in", "/dos/signin", "/dos/login", "/dos/signup", "/dos/sign-up", "/dos/register", "/dos/setup", "/dos/onboarding"]);

export function safeDosNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || !isDosNextPath(value)) {
    return "/dos";
  }

  const path = value.split(/[?#]/)[0].replace(/\/+$/, "") || "/dos";

  return notDosDestinations.has(path.toLowerCase()) ? "/dos" : value;
}

/** The DOS sign-in page, with a validated destination. */
export function dosSignInHref(next?: string | null, extra: Record<string, string> = {}) {
  const query = new URLSearchParams();
  const destination = safeDosNextPath(next);

  if (destination !== "/dos") {
    query.set("next", destination);
  }

  Object.entries(extra).forEach(([key, value]) => query.set(key, value));
  const suffix = query.toString();

  return `/dos/sign-in${suffix ? `?${suffix}` : ""}`;
}
