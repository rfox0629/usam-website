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
const assignmentContextMigration = read("supabase/migrations/20260807151800_dos_journey_assignment_context.sql");
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
assertIncludes(catalog, "chapterQuestion?: string", "Guided journeys must support a single canonical chapter question.");
assert(!catalog.includes("DosGuidedResourceMemoryVerse"), "Catalog must no longer define standalone memory verse metadata (removed per USA-162).");
assert((catalog.match(/id: "week-\d+"/g) ?? []).length === 12, "Discipleship (Tozer) must seed twelve weekly companion sessions covering all thirteen book chapters (USA-162 revision).");
assert(!catalog.includes('id: "week-13"'), "Discipleship (Tozer) must not seed a thirteenth week - chapters 12 and 13 share week 12.");
assert((catalog.match(/assignment: "Chapter \d+"/g) ?? []).length === 13, "Every one of the thirteen book chapters must have its own chapter-numbered reading assignment (no fabricated page ranges).");
assertIncludes(catalog, 'assignment: "Chapters 12-13"', "Week 12 must clearly summarize that it carries two chapters.");
assert((catalog.match(/chapterQuestion: "/g) ?? []).length === 13, "Every one of the thirteen book chapters must include exactly one chapter-specific question.");
assert(!catalog.includes("memoryVerse"), "Marks sessions must no longer include memory verse sections (removed per USA-162).");
assert((catalog.match(/multiply: "/g) ?? []).length === 12, "Marks sessions must include one Multiply prompt per week.");
assert(!catalog.includes("Read the leader-selected"), "Marks sessions must no longer use placeholder reading assignments.");
assertIncludes(catalog, "type DosGuidedResourceSessionChapter", "Catalog must define a chapter sub-type for weeks that carry more than one book chapter.");
assertIncludes(catalog, "chapters?: readonly DosGuidedResourceSessionChapter[]", "Guided resource sessions must support an optional multi-chapter breakdown.");
assertIncludes(catalog, "estimatedDuration: \"12 Weeks\"", "Discipleship (Tozer) must be seeded as a twelve-week Journey (USA-162 revision).");
assert(!catalog.includes("estimatedDuration: \"6 Weeks\""), "Discipleship (Tozer) must not ship the obsolete six-week duration.");
assert(!catalog.includes("difficulty: \"intermediate\""), "Discipleship (Tozer) must not show a difficulty stat.");
[
  "Marks of Discipleship",
  "True and False Disciples",
  '\\"Accepting\\" Christ',
  "To All Who Received Him",
  "Obedience Is Not an Option",
  "You Cannot Face Two Directions",
  "Crucified with Christ",
  "Take Up Your Cross",
  "Loving Righteousness, Hating Evil",
  "Be Holy!",
  "The Importance of Deeds",
  "Preparing for Heaven",
  "Go and Tell",
].forEach((chapterTitle) => {
  assertIncludes(catalog, chapterTitle, `Discipleship (Tozer) must use the real book chapter title "${chapterTitle}" (USA-162 revision).`);
});
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
assertIncludes(assignmentContextMigration, "drop policy if exists \"DOS users can read guided resource progress\"", "Privacy migration must replace broad guided progress read policy.");
assertIncludes(assignmentContextMigration, "drop policy if exists \"DOS editors can manage guided resource progress\"", "Privacy migration must replace broad guided progress write policy.");
assertIncludes(assignmentContextMigration, "private_dos.current_dos_identity_person_ids(workspace_id)", "Guided progress RLS must be tied to verified participant identity.");

assertIncludes(loader, "export type DosAppGuidedResourceProgress", "DOS loader must expose guided progress type.");
assertIncludes(loader, "guidedResourceProgress: DosAppGuidedResourceProgress[]", "DOS app data must include guided resource progress.");
assertIncludes(loader, "loadGuidedResourceProgressForWorkspace", "DOS loader must fetch guided resource progress.");
assertIncludes(loader, "dos_guided_resource_progress", "DOS loader must query the guided resource progress table.");
assertIncludes(loader, "guidedResourceProgress,", "DOS loader must return guided progress in the app payload.");
assertIncludes(loader, "catalogResourceSlug", "Group resource data must expose catalog resource slugs.");

assertIncludes(apiRoute, "getDosResourceBySlug(resourceSlug)", "Progress API must resolve the resource from the catalog.");
assertIncludes(apiRoute, "resource.type !== \"guided_resource\" && resource.type !== \"reading_plan\"", "Progress API must accept guided resources and reading plans (both use session-based progress).");
assertIncludes(apiRoute, "guidedResource.sessions.find", "Progress API must validate session ids against the catalog.");
assertIncludes(apiRoute, "loadWorkspacePerson", "Progress API must scope progress to a workspace person.");
assertIncludes(apiRoute, "requireCommitmentsFeature", "Progress API must reuse the existing commitments/assignment feature gate.");
assertIncludes(apiRoute, "canWritePrivateGuidedProgress", "Progress API must enforce private participant ownership before saving.");
assertIncludes(apiRoute, "Only ${person.name}'s linked participant identity can save private journey progress.", "Progress API must reject leader edits of participant-private fields.");
assertIncludes(apiRoute, ".from(\"dos_identity_links\")", "Progress API must recognize future account-claim identity links.");
assertIncludes(apiRoute, ".from(\"dos_guided_resource_progress\")", "Progress API must persist to guided resource progress.");
assertIncludes(apiRoute, ".from(\"dos_user_learning_books\")", "Progress API must sync guided journeys to My Record Learning books.");
assertIncludes(apiRoute, ".from(\"dos_user_learning_chapter_notes\")", "Progress API must sync guided journey reflections to My Record Learning notes.");
assertIncludes(apiRoute, "syncGuidedResourceToMyRecordLearning", "Progress API must automatically save reflections to My Record Learning.");
assertIncludes(apiRoute, "completed_at", "Progress API must save completion timestamps.");

assertIncludes(app, "function GuidedResourceDetailSheet", "DOS app must render a guided resource detail sheet.");
assertIncludes(app, "GUIDED JOURNEY", "Guided resource UI must show the finalized Guided Journey badge.");
assertIncludes(app, "FEATURED", "Guided resource UI must show featured badge when configured.");
assertIncludes(app, "Why We Recommend This", "Guided Journey UI must show a short recommendation for the resource.");
assert(!app.includes("Memory Verse"), "Guided Journey UI must not show a Memory Verse block (removed per USA-162).");
assertIncludes(app, "Chapter Question", "Guided Journey UI must show the single canonical chapter question.");
assertIncludes(app, "Scripture", "Guided Journey UI must show Scripture references.");
assert(!app.includes("Discuss Together"), "Guided Journey UI must not show the old multi-question discussion list (removed per USA-162).");
assert(!app.includes('isReadingPlan ? "Days" : "Sessions"'), "Guided Journey UI must not show a redundant Sessions/Days stat alongside Duration (removed per USA-162).");
assert(!app.includes("Difficulty"), "Guided Journey UI must not show a Difficulty/Intermediate badge.");
assertIncludes(app, "function guidedResourceSessionHeading", "Guided Journey accordion must render the actual chapter title as the primary heading, separate from the Week label (USA-162 revision).");
assertIncludes(app, "resourceSessionUnitLabel(resource).toUpperCase()} {session.order}", "Guided Journey accordion rows must show a small secondary WEEK/DAY label above the chapter title (USA-162 revision).");
assertIncludes(app, "session.chapters?.length", "Guided Journey accordion must render a compact per-chapter subsection for weeks that carry more than one book chapter (e.g. Week 12).");
assertIncludes(app, "selectedSession.chapters?.length", "Guided Journey detail panel must render each chapter's own question and Scripture for multi-chapter weeks.");
assert(!/<select\b/i.test(app.slice(app.indexOf("function GuidedResourceDetailSheet"), app.indexOf("function LeaderJourneyProgressSheet"))), "Guided Journey accordion must not use a native select/dropdown for week navigation.");

assertIncludes(app, "Your Reflection", "Guided Journey UI must separate group discussion from personal reflection.");
assertIncludes(app, "What stood out?", "Guided Journey UI must use the canonical first reflection prompt.");
assertIncludes(app, "What is the main thing you learned or noticed?", "Guided Journey UI must show the helper prompt for What stood out?.");
assertIncludes(app, "What will you do with it?", "Guided Journey UI must use the canonical second reflection prompt.");
assertIncludes(app, "How does this apply to your life or what is one next step?", "Guided Journey UI must show the helper prompt for What will you do with it?.");
assertIncludes(app, "helper=\"What do you want to pray or ask God about?\" label=\"Prayer\"", "Guided Journey UI must use the canonical Prayer reflection prompt with its helper copy.");
assertIncludes(app, "selectedSession.chapterQuestion", "Guided Journey UI must render the single canonical chapter question.");
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

// USA-161: assigned Discipleship (and every other guided resource) must always have a
// working Open/Continue action from a Person profile - never a dead "#" link.
assert(
  !app.includes('const href = isInAppJourney ? "#" : resource?.path ?? "#";'),
  "ResourceAssignmentCard must not fall back to a dead href=\"#\" link when a resource cannot be resolved.",
);
assertIncludes(app, "Unavailable", "ResourceAssignmentCard must show an explicit unavailable state instead of a dead link when the assignment's resource cannot be resolved.");
assertIncludes(app, ') : resource ? (\n          <a className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#2563EB] px-3 text-xs font-black text-white" href={resource.path}>Read Online</a>', "ResourceAssignmentCard's Read Online fallback must only render for a resolved resource.");

const catalogResourceRowSource = app.slice(app.indexOf("function CatalogResourceRow("), app.indexOf("function dosLibraryResourceHref("));

assert(
  !catalogResourceRowSource.includes('onClick={() => onOpenGuidedResource?.(resource)}'),
  "Guided resource card Continue/Open action must not render as a silently-dead button when no onOpenGuidedResource handler is supplied (e.g. inside an assign-journey resource picker).",
);
assertIncludes(catalogResourceRowSource, "{onOpenGuidedResource ? (", "Guided resource card must only render the Continue/Open action when a working handler is supplied.");

console.log("DOS guided resources regression checks passed.");
