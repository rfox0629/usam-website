import "server-only";

/**
 * Single-tenant today, on purpose. USA Missionaries is the only row in
 * `organizations` that anything real resolves against (see
 * docs/ncc-architecture.md §10-11). This function is the extension point for
 * future integrated ministries (e.g. MOR) and strategic partner orgs: a real
 * implementation would resolve the current user's active organization
 * membership instead of hardcoding one row. No switcher UI or cross-org
 * logic is built yet — this exists so the shell and its data queries have
 * exactly one place to change when a second tenant is onboarded.
 */
export type CurrentOrganization = {
  id: string | null;
  name: string;
  slug: string;
};

export function getCurrentOrganization(): CurrentOrganization {
  return {
    id: null,
    name: "USA Missionaries",
    slug: "usa-missionaries",
  };
}
