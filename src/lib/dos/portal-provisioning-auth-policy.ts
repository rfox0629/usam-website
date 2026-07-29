import type { AdminAuthorization } from "@/src/lib/admin-auth";

export type DosPortalProvisioningAuthorizationDecision =
  | {
      status: "allowed";
    }
  | {
      error: string;
      httpStatus: 401 | 403 | 500;
      status: "rejected";
    };

type DosPortalProvisioningAuthorizationInput = {
  authorization: AdminAuthorization;
  hasOperatorAccess: boolean;
  isServiceRoleConfigured: () => boolean;
};

export function decideDosPortalProvisioningAuthorization({
  authorization,
  hasOperatorAccess,
  isServiceRoleConfigured,
}: DosPortalProvisioningAuthorizationInput): DosPortalProvisioningAuthorizationDecision {
  if (authorization.status === "unauthenticated") {
    return {
      error: "Authentication required.",
      httpStatus: 401,
      status: "rejected",
    };
  }

  if (authorization.status === "configuration_error") {
    return {
      error: "Unable to verify access.",
      httpStatus: 500,
      status: "rejected",
    };
  }

  if (authorization.status === "unauthorized" || !hasOperatorAccess) {
    return {
      error: "Access denied.",
      httpStatus: 403,
      status: "rejected",
    };
  }

  if (!isServiceRoleConfigured()) {
    return {
      error: "Provisioning is not available.",
      httpStatus: 500,
      status: "rejected",
    };
  }

  return { status: "allowed" };
}
