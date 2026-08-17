/**
 * Client-safe public Group path helpers.
 *
 * These are pure string functions with no Supabase, no headers, and no secrets.
 * They live outside `public-site.ts` because that module is `server-only`:
 * USA-170 renders the shared member Group Home inside the DOS leader app so the
 * leader preview and the participant's real secure link are one component, and
 * that component needs the group path on the client too. `public-site.ts`
 * re-exports both names, so existing server callers are unaffected.
 */

export const defaultPublicGroupsBasePath = "/groups";

export function publicGroupPath(slug: string, site: { basePath: string } | null = null) {
  const basePath = site?.basePath || defaultPublicGroupsBasePath;

  return `${basePath.replace(/\/+$/, "")}/${slug}`;
}
