import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(source, text, message) {
  assert(source.includes(text), message);
}

const catalog = read("src/lib/dos/resource-catalog.ts");
const app = read("app/dos/app/DosMvpAppClient.tsx");
const loader = read("src/lib/dos/missionary-app.ts");
const apiRoute = read("app/api/dos/app/guided-resource-progress/route.ts");
const migration = read("supabase/migrations/20260713160238_dos_guided_resource_progress.sql");
const preview = read("app/dos/app/preview/page.tsx");
const sharedGroupRoute = read("app/dos/[collectiveSlug]/page.tsx");

assertIncludes(catalog, "\"guided_resource\"", "Catalog must define the guided_resource resource type.");
assertIncludes(catalog, "type DosGuidedResourceSession", "Catalog must define ordered guided resource sessions.");
assertIncludes(catalog, "type DosResourceAccessLink", "Catalog must support multiple purchase/access links.");
assertIncludes(catalog, "assignmentTargets?: readonly DosResourceAssignmentTarget[]", "Catalog must expose supported assignment target types.");
assertIncludes(catalog, "title: \"Marks of Discipleship\"", "Marks of Discipleship seed resource is missing.");
assertIncludes(catalog, "author: \"A.W. Tozer\"", "Marks of Discipleship must include the author.");
assertIncludes(catalog, "assignmentTargets: [\"individual\", \"group\", \"organization\"]", "Guided resource seed must declare individual, group, and organization assignment support.");
assertIncludes(catalog, "format: \"book\"", "Marks of Discipleship must be seeded as a book guided resource.");
assertIncludes(catalog, "leaderGuideNote", "Guided resources must include leader-created guide space.");
assert((catalog.match(/id: "week-[1-6]"/g) ?? []).length === 6, "Marks of Discipleship must seed six weekly placeholder sessions.");
assertIncludes(catalog, "Read the leader-selected", "Seed sessions must use placeholder reading assignments.");
assertIncludes(catalog, "https://www.moodypublishers.com/discipleship", "Seed resource must include the publisher access link.");
assertIncludes(catalog, "https://www.amazon.com/Discipleship-Truly-Means-Christian-Collected-Insights/dp/1600668046", "Seed resource must include a retailer purchase link.");
assertIncludes(catalog, "coverImage", "Guided resources must support a cover image.");

assertIncludes(migration, "create table if not exists public.dos_guided_resource_progress", "Migration must create guided resource progress table.");
assertIncludes(migration, "unique (workspace_id, person_id, resource_slug, session_id)", "Progress must be unique by person/resource/session.");
assertIncludes(migration, "alter table public.dos_guided_resource_progress enable row level security", "Progress table must enable RLS.");
assertIncludes(migration, "grant select, insert, update on table public.dos_guided_resource_progress to authenticated", "Progress table must grant authenticated read/write access.");
assertIncludes(migration, "public.can_access_dos_workspace(workspace_id, array['admin', 'editor', 'viewer'])", "Progress read policy must use DOS workspace access.");
assertIncludes(migration, "public.can_access_dos_workspace(workspace_id, array['admin', 'editor'])", "Progress write policy must use DOS editor access.");
assertIncludes(migration, "catalog_resource_slug", "Migration must make group resources catalog-aware.");
assertIncludes(migration, "'guided_resource'", "Group resources must allow guided_resource as a resource type.");

assertIncludes(loader, "export type DosAppGuidedResourceProgress", "DOS loader must expose guided progress type.");
assertIncludes(loader, "guidedResourceProgress: DosAppGuidedResourceProgress[]", "DOS app data must include guided resource progress.");
assertIncludes(loader, "loadGuidedResourceProgressForWorkspace", "DOS loader must fetch guided resource progress.");
assertIncludes(loader, "dos_guided_resource_progress", "DOS loader must query the guided resource progress table.");
assertIncludes(loader, "guidedResourceProgress,", "DOS loader must return guided progress in the app payload.");
assertIncludes(loader, "catalogResourceSlug", "Group resource data must expose catalog resource slugs.");

assertIncludes(apiRoute, "getDosResourceBySlug(resourceSlug)", "Progress API must resolve the resource from the catalog.");
assertIncludes(apiRoute, "resource.type !== \"guided_resource\"", "Progress API must only accept guided resources.");
assertIncludes(apiRoute, "guidedResource.sessions.find", "Progress API must validate session ids against the catalog.");
assertIncludes(apiRoute, "loadWorkspacePerson", "Progress API must scope progress to a workspace person.");
assertIncludes(apiRoute, "requireCommitmentsFeature", "Progress API must reuse the existing commitments/assignment feature gate.");
assertIncludes(apiRoute, ".from(\"dos_guided_resource_progress\")", "Progress API must persist to guided resource progress.");
assertIncludes(apiRoute, "completed_at", "Progress API must save completion timestamps.");

assertIncludes(app, "function GuidedResourceDetailSheet", "DOS app must render a guided resource detail sheet.");
assertIncludes(app, "GUIDED RESOURCE", "Guided resource UI must show a visible resource-type badge.");
assertIncludes(app, "FEATURED", "Guided resource UI must show featured badge when configured.");
assertIncludes(app, "Purchase Book", "Guided resource UI must expose purchase links.");
assertIncludes(app, "Mark Session Complete", "Guided resource UI must allow session completion.");
assertIncludes(app, "Save Reflection", "Guided resource UI must save reflections to My Record progress.");
assertIncludes(app, "/api/dos/app/guided-resource-progress", "Guided resource UI must call the progress API.");
assertIncludes(app, "data.guidedResourceProgress", "Guided resource UI must read progress from DOS data.");
assertIncludes(app, "onOpenGuidedResource", "Assigned resource cards must open guided resources in-app.");
assertIncludes(app, "progressPersonId={myRecordPerson?.id ?? null}", "Library card progress should use the DOS user's My Record person when available.");

assertIncludes(preview, "guidedResourceProgress: []", "Preview DOS data must include guidedResourceProgress.");
assertIncludes(sharedGroupRoute, "guidedResourceProgress: []", "Shared group scoped DOS data must include guidedResourceProgress.");

console.log("DOS guided resources regression checks passed.");
