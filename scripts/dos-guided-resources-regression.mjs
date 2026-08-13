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

function assertNotIncludes(source, text, message) {
  assert(!source.includes(text), message);
}

function between(source, startNeedle, endNeedle, label) {
  const start = source.indexOf(startNeedle);
  assert(start >= 0, `${label}: missing start marker ${startNeedle}`);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  assert(end > start, `${label}: missing end marker ${endNeedle}`);

  return source.slice(start, end);
}

const catalog = read("src/lib/dos/resource-catalog.ts");
const app = read("app/dos/app/DosMvpAppClient.tsx");
const sharedJourneyUi = read("src/components/dos/GuidedJourneyUi.tsx");
const loader = read("src/lib/dos/missionary-app.ts");
const apiRoute = read("app/api/dos/app/guided-resource-progress/route.ts");
const migration = read("supabase/migrations/20260713160238_dos_guided_resource_progress.sql");
const assignmentContextMigration = read("supabase/migrations/20260807151800_dos_journey_assignment_context.sql");
const preview = read("app/dos/app/preview/page.tsx");
const sharedGroupRoute = read("app/dos/[collectiveSlug]/page.tsx");
const discipleshipCatalog = between(
  catalog,
  'href: "https://www.moodypublishers.com/discipleship"',
  'id: "discipleship-following-jesus-next-steps"',
  "Discipleship catalog section",
);
const guidedResourceDetailSheet = between(
  app,
  "function GuidedResourceDetailSheet",
  "function LeaderJourneyProgressSheet",
  "Guided resource detail sheet",
);

function weekSource(weekNumber) {
  const startNeedle = `id: "week-${weekNumber}"`;
  const start = discipleshipCatalog.indexOf(startNeedle);
  assert(start >= 0, `Discipleship must include ${startNeedle}.`);
  const next = discipleshipCatalog.indexOf(`id: "week-${weekNumber + 1}"`, start + startNeedle.length);

  return next > start ? discipleshipCatalog.slice(start, next) : discipleshipCatalog.slice(start);
}

const discipleshipWeekMap = [
  { assignment: "Chapter 1", chapters: [[1, "Marks of Discipleship"]], week: 1 },
  { assignment: "Chapters 2-3", chapters: [[2, "True and False Disciples"], [3, '\\"Accepting\\" Christ']], week: 2 },
  { assignment: "Chapters 4-5", chapters: [[4, "To All Who Received Him"], [5, "Obedience Is Not an Option"]], week: 3 },
  { assignment: "Chapters 6-7", chapters: [[6, "You Cannot Face Two Directions"], [7, "Crucified with Christ"]], week: 4 },
  { assignment: "Chapters 8-9", chapters: [[8, "Take Up Your Cross"], [9, "Loving Righteousness, Hating Evil"]], week: 5 },
  { assignment: "Chapters 10-11", chapters: [[10, "Be Holy!"], [11, "The Importance of Deeds"]], week: 6 },
  { assignment: "Chapters 12-13", chapters: [[12, "Preparing for Heaven"], [13, "Go and Tell"]], week: 7 },
];

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
assert((discipleshipCatalog.match(/id: "week-\d+"/g) ?? []).length === 7, "Discipleship (Tozer) must seed seven weekly companion sessions covering all thirteen book chapters (final USA-162 spec).");
assertNotIncludes(discipleshipCatalog, 'id: "week-8"', "Discipleship (Tozer) must not ship the obsolete eight-plus week model.");
assertNotIncludes(discipleshipCatalog, 'id: "week-12"', "Discipleship (Tozer) must not ship the mistaken twelve-week model.");
assert((discipleshipCatalog.match(/chapters: \[/g) ?? []).length === 7, "Each Discipleship week must render chapter subsections, including single-chapter Week 1.");
assert((discipleshipCatalog.match(/chapterQuestion: "/g) ?? []).length === 13, "Every one of the thirteen book chapters must include exactly one chapter-specific question.");
assert((discipleshipCatalog.match(/personalReflection: "/g) ?? []).length === 7, "Discipleship must keep one shared reflection set per week.");
assert((discipleshipCatalog.match(/prayerFocus: "/g) ?? []).length === 7, "Discipleship must keep one shared prayer field per week.");
assert((discipleshipCatalog.match(/multiply: "/g) ?? []).length === 7, "Discipleship must include one Multiply prompt per week.");
assertNotIncludes(discipleshipCatalog, "memoryVerse", "Marks sessions must no longer include memory verse sections (removed per USA-162).");
assertNotIncludes(discipleshipCatalog, "Read the leader-selected", "Marks sessions must no longer use placeholder reading assignments.");
assertIncludes(catalog, "type DosGuidedResourceSessionChapter", "Catalog must define a chapter sub-type for weeks that carry more than one book chapter.");
assertIncludes(catalog, "chapters?: readonly DosGuidedResourceSessionChapter[]", "Guided resource sessions must support an optional multi-chapter breakdown.");
assertIncludes(discipleshipCatalog, "estimatedDuration: \"7 Weeks\"", "Discipleship (Tozer) must be seeded as a seven-week Journey (final USA-162 spec).");
assertNotIncludes(discipleshipCatalog, "estimatedDuration: \"6 Weeks\"", "Discipleship (Tozer) must not ship the obsolete six-week duration.");
assertNotIncludes(discipleshipCatalog, "estimatedDuration: \"12 Weeks\"", "Discipleship (Tozer) must not ship the mistaken twelve-week duration.");
assertNotIncludes(discipleshipCatalog, "difficulty: \"intermediate\"", "Discipleship (Tozer) must not show a difficulty stat.");
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
  assertIncludes(discipleshipCatalog, chapterTitle, `Discipleship (Tozer) must use the real book chapter title "${chapterTitle}" (USA-162 revision).`);
});
discipleshipWeekMap.forEach(({ assignment, chapters, week }) => {
  const source = weekSource(week);

  assertIncludes(source, `order: ${week}`, `Week ${week} must keep its weekly order.`);
  assertIncludes(source, `assignment: "${assignment}"`, `Week ${week} must summarize the correct chapter assignment.`);
  assert((source.match(/chapterQuestion: "/g) ?? []).length === chapters.length, `Week ${week} must have exactly one chapter question per assigned chapter.`);
  assert((source.match(/personalReflection: "/g) ?? []).length === 1, `Week ${week} must have exactly one shared What stood out reflection set.`);
  assert((source.match(/prayerFocus: "/g) ?? []).length === 1, `Week ${week} must have exactly one shared Prayer field.`);

  chapters.forEach(([chapterNumber, chapterTitle]) => {
    assertIncludes(source, `assignment: "Chapter ${chapterNumber}"`, `Week ${week} must include Chapter ${chapterNumber}.`);
    assertIncludes(source, `order: ${chapterNumber}`, `Chapter ${chapterNumber} must keep its chapter number.`);
    assertIncludes(source, `title: "${chapterTitle}"`, `Chapter ${chapterNumber} must use the verified title "${chapterTitle}".`);
  });
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
assertIncludes(app, "eyebrow={`${libraryResourceKindLabel(resource)}", "Resource page eyebrow must use the reader-facing Book Study / Reading Plan wording.");
assertIncludes(app, "isFeatured={Boolean(resource.featured)}", "Guided resource UI must pass the featured state to the canonical resource header.");
assertIncludes(sharedJourneyUi, "Featured", "Canonical resource header must render the Featured chip.");
assertIncludes(app, "resourceSummary = guidedResource?.whyChosen ?? resource.description", "Guided Journey UI must show one compact resource recommendation/description.");
assertNotIncludes(guidedResourceDetailSheet, "Why We Recommend This", "Guided Journey resource card must not reintroduce the old recommendation section heading.");
assert(!app.includes("Memory Verse"), "Guided Journey UI must not show a Memory Verse block (removed per USA-162).");
assertIncludes(sharedJourneyUi, "function JourneyQuestionBand", "Guided Journey UI must show the canonical warm full-width question band.");
assertIncludes(sharedJourneyUi, "function guidedJourneyQuestionLabel", "Question band must use the canonical This Week's / Today's Question label.");
assertIncludes(sharedJourneyUi, "Chapter ${chapter.order} · Question", "Multi-chapter weeks must label each chapter question separately.");
assertIncludes(sharedJourneyUi, "function JourneyScripture", "Guided Journey UI must show Scripture as tappable hairline rows after the question.");
assert(!app.includes("Discuss Together"), "Guided Journey UI must not show the old multi-question discussion list (removed per USA-162).");
assert(!app.includes('isReadingPlan ? "Days" : "Sessions"'), "Guided Journey UI must not show a redundant Sessions/Days stat alongside Duration (removed per USA-162).");
assert(!app.includes("Difficulty"), "Guided Journey UI must not show a Difficulty/Intermediate badge.");
assertIncludes(sharedJourneyUi, "function guidedJourneySessionHeading", "Guided Journey selector must derive actual chapter titles from session titles.");
assertIncludes(sharedJourneyUi, "function guidedJourneySessionChapterRange", "Guided Journey selector must show compact chapter ranges.");
assertIncludes(sharedJourneyUi, "function guidedJourneySessionSelectorTitle", "Guided Journey selector must show compact chapter titles.");
assertIncludes(sharedJourneyUi, "function guidedJourneyChapterHeading", "Guided Journey open panel must render chapter number before chapter title.");
assertIncludes(app, "GuidedJourneyProgress", "Guided Journey UI must use the shared Journey progress presentation.");
assertIncludes(app, "GuidedJourneySessionSelector", "Guided Journey UI must use the shared custom selector presentation.");
assertIncludes(app, "GuidedJourneyChapterContent", "Guided Journey UI must use the shared chapter/question/scripture presentation.");
assertIncludes(app, "isSessionSelectorOpen", "Guided Journey V2 must use one custom selector instead of seven open accordion cards.");
assertIncludes(sharedJourneyUi, 'aria-label={`${unitLabel} selector`}', "Guided Journey selector must be a custom accessible control, not a native select.");
assertIncludes(sharedJourneyUi, "Completed", "Guided Journey selector must expose completed state.");
assertIncludes(sharedJourneyUi, "Current", "Guided Journey selector must expose current state.");
assertIncludes(sharedJourneyUi, "Upcoming", "Guided Journey selector must expose upcoming state.");
assertIncludes(sharedJourneyUi, "guidedJourneySessionChapterRange(session, unitLabel)", "Guided Journey expanded selector must show the compact chapter assignment.");
assertIncludes(app, "setIsSessionSelectorOpen(false)", "Selecting a week/day must close the custom selector.");
assertIncludes(sharedJourneyUi, "const chapters = session.chapters ?? []", "Guided Journey selector must render compact per-chapter titles, including two-chapter weeks in the final seven-week model.");
assertIncludes(sharedJourneyUi, "chapters.map((chapter)", "Guided Journey detail panel must render each chapter's own question and Scripture for multi-chapter weeks.");
assertIncludes(sharedJourneyUi, "kicker={`Chapter ${chapter.order}`}", "Guided Journey reading layout must render the chapter number as an editorial kicker above the title.");
assert(sharedJourneyUi.indexOf("chapter.chapterQuestion") < sharedJourneyUi.indexOf("references={chapter.keyScriptures"), "Supporting Scripture must render after the chapter-specific question.");
assert(!/<select\b/i.test(guidedResourceDetailSheet), "Guided Journey accordion must not use a native select/dropdown for week navigation.");
assert(!guidedResourceDetailSheet.includes("Reading: {selectedSession.assignment}"), "Guided Journey V2 must not keep the redundant Reading metadata line in the open panel.");

assertIncludes(app, "What stood out?", "Guided Journey UI must use the canonical first reflection prompt.");
assertIncludes(sharedJourneyUi, "What stood out to you as you considered this question and chapter?", "Single-chapter Guided Journey helper must connect the first response to the chapter question.");
assertIncludes(sharedJourneyUi, "Looking across both chapters and questions, what stood out most?", "Two-chapter Guided Journey helper must connect the first response to both chapter questions.");
assertIncludes(app, "What will you do with it?", "Guided Journey UI must use the canonical second reflection prompt.");
assertIncludes(sharedJourneyUi, "What is one response or next step you want to take?", "Single-chapter Guided Journey action helper must match the canonical mockup.");
assertIncludes(sharedJourneyUi, "What is one response or next step you want to take this week?", "Two-chapter Guided Journey action helper must stay weekly.");
assertIncludes(app, 'label="Prayer"', "Guided Journey UI must keep the canonical Prayer response field.");
assertIncludes(sharedJourneyUi, "What do you want to pray or ask God about?", "Prayer field must carry the canonical mockup helper copy.");
assertIncludes(sharedJourneyUi, "Your Journey", "Guided Journey progress must move into the Journey area outside the resource card.");
assert(guidedResourceDetailSheet.indexOf("GuidedJourneyProgress") > guidedResourceDetailSheet.indexOf("GuidedJourneyResourceHeader"), "Your Journey band must render after the resource section, never inside it.");
assertIncludes(guidedResourceDetailSheet, "resource.estimatedDuration ? ` · ${resource.estimatedDuration}` : \"\"", "Guided Journey duration must live in the resource eyebrow.");
assertNotIncludes(guidedResourceDetailSheet, "Optional Leader Notes", "Guided Journey open-week UI must not show Optional Leader Notes.");
assertNotIncludes(guidedResourceDetailSheet, "Your Reflection", "Guided Journey open-week UI must not show the extra reflection section heading.");
assertNotIncludes(guidedResourceDetailSheet, "Saved reflections also sync to My Record - Learning.", "Guided Journey open-week UI must not show the My Record sync helper chrome.");
assertIncludes(sharedJourneyUi, "session.chapterQuestion", "Guided Journey UI must render the single canonical chapter question.");
assertIncludes(app, "Commissioning", "Completed Guided Journeys must render a commissioning page.");
assertIncludes(app, "Review Notes", "Commissioning page must link to My Record notes.");
assertIncludes(app, "Start Next Resource", "Commissioning page must link back to the Library.");
assertIncludes(app, "Purchase Book", "Guided resource UI must expose purchase links.");
assertIncludes(app, 'const unitNoun = isReadingPlan ? "Day" : "Week"', "Guided resource UI must allow weekly completion for book studies and daily completion for reading plans.");
assertNotIncludes(guidedResourceDetailSheet, "Mark Session Complete", "Guided resource UI must not use obsolete Session completion language.");
assertIncludes(app, "Save and finish later", "Guided resource UI must let participants save without completing.");
assertIncludes(app, "/api/dos/app/guided-resource-progress", "Guided resource UI must call the progress API.");
assertIncludes(app, "data.guidedResourceProgress", "Guided resource UI must read progress from DOS data.");
assertIncludes(app, "onOpenGuidedResource", "Assigned resource cards must open guided resources in-app.");
// Library rows deliberately carry no progress state (USA-163); the row-level
// progress plumbing stays available for the assign pickers and assignment
// cards that still use it.
assertIncludes(app, "personId: progressPersonId, resource", "Guided resource card progress must still resolve against a person when supplied.");

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

// --- Canonical mockup conformance (journey-canonical-mockup_1.html) ---
assertIncludes(sharedJourneyUi, "function GuidedJourneyResourceHeader", "Journey must use the open light resource section, not an enclosing card.");
assertNotIncludes(sharedJourneyUi, "rounded-[20px] border border-[#D6E4F7]", "Canonical Journey must not reintroduce the old enclosing resource card.");
assertIncludes(sharedJourneyUi, "Your Journey", "Journey must render the tinted Your Journey band.");
assertIncludes(sharedJourneyUi, "function guidedJourneyBandCaption", "Your Journey band must show Start with Week 1 / remaining / completed captions.");
assertIncludes(sharedJourneyUi, "Start with ${unitLabel} 1", "Your Journey band must prompt Start with Week 1 before any unit is complete.");
assertIncludes(sharedJourneyUi, "function GuidedJourneyCompactNav", "Returning participants must get the compact sticky resource nav.");
assertIncludes(app, "hasStarted ? compactNav : null", "Resource chrome must recede once the participant is actively progressing.");
assertIncludes(app, "alwaysExpanded", "Desktop rail must render the week selector expanded, per the mockup.");

// --- USA-163 focused revision ---
// The way back sits above the Journey content, not inside the Journey's own nav.
assertIncludes(app, "<LibraryResourceBackButton onClick={onBack} />", "'Library' back control must sit above the Journey content.");
assert(
  !sharedJourneyUi.includes("backLabel"),
  "The Journey nav strip must not carry its own back control now that 'Library' sits above the Journey content.",
);

// Scripture rows are real targets that open the in-app KJV quick view, and a
// row is only interactive when there is actually text behind it.
assertIncludes(app, "canOpenScripture={hasDosJourneyScripture}", "Scripture rows must only be tappable when the reference has text.");
assertIncludes(app, "onOpenScripture={openScriptureQuickView}", "Scripture rows must open the existing DOS scripture quick view.");
assertIncludes(sharedJourneyUi, "const isOpenable", "Scripture rows must not render a dead chevron affordance.");

// The completion action lives at the natural end of the week, not pinned.
assert(
  !sharedJourneyUi.includes("stickyBottomClassName"),
  "Completion action must sit at the natural end of the week rather than in a pinned dock.",
);
assert(
  !app.includes("stickyDock"),
  "Journey must not reintroduce a sticky completion dock.",
);
assertIncludes(sharedJourneyUi, "function GuidedJourneyDock", "Journey must provide the canonical completion dock.");
assertIncludes(app, 'secondaryLabel="Save and finish later"', "Completion dock must offer Save and finish later.");
assertIncludes(app, "Complete ${unitNoun} ${selectedSession.order}", "Completion dock primary action must name the unit being completed.");
assertIncludes(sharedJourneyUi, "function GuidedJourneyLayout", "Desktop must use the two-column rail + reading column architecture.");
assertIncludes(sharedJourneyUi, "min-[900px]:grid-cols-[352px_minmax(0,1fr)]", "Desktop rail must be a fixed left column above the 900px breakpoint.");
assertIncludes(sharedJourneyUi, "min-[900px]:max-w-[700px]", "Desktop reading column must keep a book-like measure.");
assertIncludes(app, "GuidedJourneyResponses", "Journey must use the shared response presentation.");
assertIncludes(sharedJourneyUi, "chapters this {unitLabel.toLowerCase()}", "Multi-chapter weeks must announce the chapter count.");
assert(!app.includes("YOUR REFLECTION"), "Canonical Journey must not reintroduce a YOUR REFLECTION heading.");
assert(!app.includes("Leader Notes"), "Canonical Journey must not reintroduce optional leader notes in the participant view.");
assertIncludes(app, "What stood out?", "Journey must keep the three canonical saved response fields.");
assertIncludes(app, "What will you do with it?", "Journey must keep the three canonical saved response fields.");
assertIncludes(app, "guidedJourneyPrayerHelper()", "Journey must keep the canonical prayer helper copy.");
console.log("Canonical mockup conformance checks passed.");

// --- Library simplification (USA-163) ---
// Book studies and reading plans are plain, whole-row-tappable Library entries
// that match the Commands of Jesus pattern. Every action and every piece of
// progress state belongs to the full Resource page.
assertIncludes(
  app,
  "isGuidedResource(resource) && !onClick && !onOpenResource",
  "Library rows must render as plain tappable entries, never the inline action card.",
);
assertIncludes(app, "function libraryResourceKindLabel", "Library must have a reader-facing kind label.");
assertIncludes(app, '"Reading Plan" : "Book Study"', "Library must label resources Reading Plan / Book Study.");
assert(
  !app.includes('"Guided Reading Plan" : "Guided Journey"'),
  "Library and Resource page must not use internal 'Guided Journey' wording.",
);
assert(
  !catalog.includes("Guided Journey"),
  "Library resource copy must not use internal 'Guided Journey' wording.",
);

const libraryDiscipleshipSection = between(
  app,
  '<LibrarySection title="Discipleship">',
  "</LibrarySection>",
  "Library Discipleship section",
);
assertIncludes(libraryDiscipleshipSection, "onOpenResource={openLibraryResource}", "Library Discipleship rows must open the full Resource page.");
for (const forbidden of ["onAssign", "onOpenGuidedResource", "onReviewGuidedResource", "progressPersonId", "resourceAssignments"]) {
  assert(
    !libraryDiscipleshipSection.includes(forbidden),
    `Library Discipleship rows must not carry ${forbidden} — actions and progress live on the Resource page.`,
  );
}

// Assigning still reaches the full myself / person / group picker, just from
// the Resource page instead of the Library row.
assertIncludes(app, "onAssign={openAssignTargetPicker}", "Resource page must keep the full assign target picker.");
console.log("Library simplification checks passed.");
