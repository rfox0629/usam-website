import "server-only";

import {
  canEditAdminContent,
  getAdminAuthorization,
  type AdminAuthorization,
} from "@/src/lib/admin-auth";

export type DosAuthorization = AdminAuthorization;

// DOS currently uses the same authenticated internal allowlist as Command
// Center, but DOS route code should depend on this field-app boundary instead
// of importing admin UI or admin route authorization directly.
export async function getDosAuthorization(): Promise<DosAuthorization> {
  return getAdminAuthorization();
}

export function canWriteDosActivity(authorization: DosAuthorization) {
  return canEditAdminContent(authorization);
}
