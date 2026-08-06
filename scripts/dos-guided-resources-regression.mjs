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
assertIncludes(catalog, "title: \"Discipleship\"", "Discipleship (Tozer) seed resource is missing.");
assertIncludes(catalog, "author: \"A.W. Tozer\"", "Discipleship (Tozer) must include the author.");
assertIncludes(catalog, "assignmentTargets: [\"individual\", \"group\", \"organization\"]", "Guided resource seed must declare individual, group, and organization assignment support.");
assertIncludes(catalog, "format: \"book\"", "Discipleship (Tozer) must be seeded as a book guided resource.");
assertIncludes(catalog, "leaderGuideNote", "Guided resources must include leader-created guide space.");
assertIncludes(catalog, "whyChosen", "Guided journeys must explain why the resource was chosen.");
assertIncludes(catalog, "pathwayTags", "Guided journeys must keep future Pathways metadata extensible.");
assertIncludes(catalog, "type DosGuidedResourceMemoryVerse", "Guided journeys must support weekly memory verse metadata.");
assert((catalog.match(/id: "week-[1-6]"/g) ?? []).length === 6, "Discipleship (Tozer) must seed six weekly companion sessions.");
assert((catalog.match(/assignment: "Pages /g) ?? []).length === 6, "Marks sessions must use page-reference reading assignments only.");
assert((catalog.match(/memoryVerse: \{/g) ?? []).length === 6, "Marks sessions must include weekly memory verse sections.");
assert((catalog.match(/multiply: "/g) ?? []).length === 6, "Marks sessions must include Multiply prompts.");
assert(!catalog.includes("Read the leader-selected"), "Marks sessions must no longer use placeholder reading assignments.");
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
assertIncludes(apiRoute, ".from(\"dos_user_learning_books\")", "Progress API must sync guided journeys to My Record Learning books.");
assertIncludes(apiRoute, ".from(\"dos_user_learning_chapter_notes\")", "Progress API must sync guided journey reflections to My Record Learning notes.");
assertIncludes(apiRoute, "syncGuidedResourceToMyRecordLearning", "Progress API must automatically save reflections to My Record Learning.");
assertIncludes(apiRoute, "completed_at", "Progress API must save completion timestamps.");

assertIncludes(app, "function GuidedResourceDetailSheet", "DOS app must render a guided resource detail sheet.");
assertIncludes(app, "GUIDED JOURNEY", "Guided resource UI must show the finalized Guided Journey badge.");
assertIncludes(app, "FEATURED", "Guided resource UI must show featured badge when configured.");
assertIncludes(app, "Why We Chose This Resource", "Guided Journey UI must show why the resource was chosen.");
assertIncludes(app, "Weekly Memory Verse", "Guided Journey UI must show weekly memory verse content.");
assertIncludes(app, "Search the Scriptures", "Guided Journey UI must show Scripture search prompts.");
assertIncludes(app, "Discuss Together", "Guided Journey UI must show discussion prompts.");
assertIncludes(app, "Reflect Personally", "Guided Journey UI must show reflection prompts.");
assertIncludes(app, "Walk It Out", "Guided Journey UI must show obedience prompts.");
assertIncludes(app, "Multiply", "Guided Journey UI must show multiplication prompts.");
assertIncludes(app, "Commissioning", "Completed Guided Journeys must render a commissioning page.");
assertIncludes(app, "Review My Notes", "Commissioning page must link to My Record notes.");
assertIncludes(app, "Start Next Resource", "Commissioning page must link back to the Library.");
assertIncludes(app, "Purchase Book", "Guided resource UI must expose purchase links.");
assertIncludes(app, "Mark Session Complete", "Guided resource UI must allow session completion.");
assertIncludes(app, "Save Reflection", "Guided resource UI must save reflections to My Record progress.");
assertIncludes(app, "Saved reflections also sync to My Record - Learning.", "Guided Journey UI must communicate My Record Learning sync.");
assertIncludes(app, "/api/dos/app/guided-resource-progress", "Guided resource UI must call the progress API.");
assertIncludes(app, "data.guidedResourceProgress", "Guided resource UI must read progress from DOS data.");
assertIncludes(app, "onOpenGuidedResource", "Assigned resource cards must open guided resources in-app.");
assertIncludes(app, "progressPersonId={myRecordPerson?.id ?? null}", "Library card progress should use the DOS user's My Record person when available.");

assertIncludes(preview, "guidedResourceProgress:", "Preview DOS data must include guidedResourceProgress.");
assertIncludes(sharedGroupRoute, "guidedResourceProgress: []", "Shared group scoped DOS data must include guidedResourceProgress.");

console.log("DOS guided resources regression checks passed.");
