import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function exists(path) {
  return existsSync(new URL(`../${path}`, import.meta.url));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(source, needle, message) {
  assert(source.includes(needle), message);
}

const migration = read("supabase/migrations/20260717143757_dos_public_groups_member_portal_foundation.sql");
const publicSiteHelper = read("src/lib/groups/public-site.ts");
const publicDirectory = read("app/groups/page.tsx");
const canonicalCommunityDirectory = read("app/community/page.tsx");
const publicGroupPage = read("app/groups/[slug]/page.tsx");
const canonicalCommunityPage = read("app/community/[slug]/page.tsx");
const publicActions = read("app/groups/actions.ts");
const groupCreateRoute = read("app/api/dos/app/groups/route.ts");
const architectureDoc = read("docs/dos-public-groups-member-portal-architecture.md");

assert(exists("src/lib/groups/public-site.ts"), "Public site resolver helper must exist.");
assert(exists("app/community/page.tsx"), "Canonical public Community directory route must exist.");
assert(exists("app/community/[slug]/page.tsx"), "Canonical public Community detail route must exist.");
assertIncludes(migration, "create table if not exists public.public_sites", "Migration must add public_sites.");
assertIncludes(migration, "organization_id uuid references public.organizations", "Public sites must reuse organizations.");
assertIncludes(migration, "personal_ministry_entity_id uuid", "Public sites must leave room for future personal ministry ownership.");
assertIncludes(migration, "hostname text not null", "Public sites must resolve by hostname.");
assertIncludes(migration, "base_path text not null default '/groups'", "Public sites must resolve by base path.");
assertIncludes(migration, "add column if not exists public_site_id", "Groups must carry public_site_id.");
assertIncludes(migration, "add column if not exists public_status", "Groups must carry public_status.");
assertIncludes(migration, "dos_groups_public_site_slug_unique", "Published slugs must be unique per public site.");
assertIncludes(migration, "'usamissionaries.org'", "Migration must seed the USA Missionaries public site.");
assertIncludes(migration, "public_status = case", "Migration must preserve existing active public URLs.");
assertIncludes(migration, "Full URLs are resolved from hostname, base_path, and group slug", "Migration must document URL composition.");

assertIncludes(publicSiteHelper, "resolvePublicSiteForHost", "Helper must resolve public sites by host.");
assertIncludes(publicSiteHelper, "requestHostname", "Helper must normalize request hostnames.");
assertIncludes(publicSiteHelper, "allowLegacyGlobalGroups", "Helper must support pre-migration legacy fallback.");
assertIncludes(publicSiteHelper, 'canonicalPublicCommunityBasePath = "/community"', "Helper must expose the canonical Community base path.");
assertIncludes(publicSiteHelper, 'legacyPublicGroupsBasePath = "/groups"', "Helper must preserve the legacy Groups base path for compatibility and lookup.");
assertIncludes(publicSiteHelper, "publicGroupsDirectoryPath", "Helper must generate canonical public Community directory paths.");
assertIncludes(publicSiteHelper, "resolveDefaultPublicSiteForWorkspace", "Group creation must be able to inherit a default public site.");

assertIncludes(publicDirectory, "resolvePublicSiteForHost", "Public directory must resolve the current public site.");
assertIncludes(publicDirectory, ".eq(\"public_site_id\", site.id)", "Public directory must scope groups to the public site.");
assertIncludes(publicDirectory, ".eq(\"public_status\", \"published\")", "Public directory must show only published groups after migration.");
assertIncludes(publicDirectory, "Community | ${site.displayName}", "Public directory metadata must use canonical Community copy.");
assertIncludes(publicDirectory, "publicGroupsDirectoryPath(site)", "Public directory metadata must point at the canonical Community route.");
assertIncludes(canonicalCommunityDirectory, "../groups/page", "Canonical Community directory should reuse the compatibility implementation.");
assertIncludes(publicGroupPage, "resolvePublicSiteForHost", "Public group page must resolve the current public site.");
assertIncludes(publicGroupPage, ".eq(\"public_site_id\", site.id)", "Public group page must scope slug lookup to the public site.");
assertIncludes(publicGroupPage, "siteName", "Public group page data must carry organization/public-site display name.");
assertIncludes(publicGroupPage, "publicGroupPath(group.slug", "Public group page metadata must point at the canonical Community route.");
assertIncludes(canonicalCommunityPage, "../../groups/[slug]/page", "Canonical Community detail should reuse the compatibility implementation.");
assertIncludes(publicActions, "requestHostname", "Join requests must use request hostname.");
assertIncludes(publicActions, "public_site_id", "Join requests must store public_site_id when available.");
assertIncludes(publicActions, "publicGroupPath(slug)", "Join requests must redirect to the canonical Community route.");
assertIncludes(publicActions, "legacyPublicGroupsBasePath", "Join requests must keep accepting legacy /groups source paths.");
assertIncludes(groupCreateRoute, "resolveDefaultPublicSiteForWorkspace", "New group flow must inherit organization/public site.");
assertIncludes(groupCreateRoute, "public_status", "New groups must write publishing state when migration is present.");

assertIncludes(architectureDoc, "Canonical public route: `/community/[slug]`.", "Architecture doc must describe the canonical Community route.");
assertIncludes(architectureDoc, "Legacy `/groups` URLs remain compatibility routes", "Architecture doc must preserve legacy URL compatibility.");

console.log("dos-public-sites-regression: all checks passed.");
