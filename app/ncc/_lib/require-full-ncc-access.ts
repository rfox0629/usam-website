import "server-only";

import { redirect } from "next/navigation";
import { getAdminAuthorization } from "@/src/lib/admin-auth";

/**
 * Every /ncc page outside app/ncc/finance/** must call this. The outer
 * /ncc/layout.tsx lets Finance-only sessions (accountants, bookkeepers,
 * treasurers with no admin_users row) through the front door so
 * /ncc/finance/** works for them -- this is what keeps them out of every
 * other department. Real server-side enforcement per page, not navigation
 * hiding: a finance-only session hitting this page directly gets redirected
 * before any of the page's own data loads.
 */
export async function requireFullNccAccess() {
  const authorization = await getAdminAuthorization();

  if (authorization.status !== "authorized") {
    redirect("/ncc/finance");
  }

  return authorization;
}
