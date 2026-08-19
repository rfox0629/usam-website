// Document access rules. No imports, so the regression can execute the
// authorization matrix directly rather than only reading the source.

type Grant = { module: string };
type Authorization = { grants?: Grant[]; role?: string; status: string };

function hasModule(authorization: Authorization, module: string) {
  return (authorization.grants ?? []).some((grant) => grant.module === module);
}

/**
 * Sensitivity is checked in addition to the documents module grant, never
 * instead of it. Entering Operations is not enough to read every document.
 */
export function canReadSensitivity(
  authorization: Authorization,
  sensitivity: string,
) {
  if (authorization.status !== "authorized") {
    return false;
  }

  if (!hasModule(authorization, "documents")) {
    return false;
  }

  if (sensitivity === "finance_restricted") {
    return hasModule(authorization, "finance");
  }

  if (sensitivity === "personnel_restricted") {
    return hasModule(authorization, "missionaries");
  }

  if (sensitivity === "case_restricted") {
    return hasModule(authorization, "submissions");
  }

  if (sensitivity === "system_restricted") {
    return authorization.role === "platform_owner";
  }

  return true;
}
