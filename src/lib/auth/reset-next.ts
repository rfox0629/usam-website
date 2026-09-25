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
