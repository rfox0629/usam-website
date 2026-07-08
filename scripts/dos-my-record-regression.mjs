import { readFileSync } from "node:fs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const migration = readFileSync("supabase/migrations/20260704033834_dos_my_record.sql", "utf8");
const propheticWordsMigration = readFileSync("supabase/migrations/20260704171602_dos_my_record_prophetic_words.sql", "utf8");
const externalAssessmentsMigration = readFileSync("supabase/migrations/20260704172801_dos_my_record_external_assessment_results.sql", "utf8");
const assessmentLibraryMigration = readFileSync("supabase/migrations/20260706153343_dos_my_record_assessment_library_fields.sql", "utf8");
const learningMigration = readFileSync("supabase/migrations/20260706155318_dos_my_record_learning_books.sql", "utf8");
const mentorProfileFieldsMigration = readFileSync("supabase/migrations/20260707220719_dos_my_record_mentor_profile_fields.sql", "utf8");
const lifePlanMigration = readFileSync("supabase/migrations/20260708002057_dos_my_record_life_plan.sql", "utf8");
const route = readFileSync("app/api/dos/app/my-record/route.ts", "utf8");
const attachmentRoute = readFileSync("app/api/dos/app/my-record/attachments/route.ts", "utf8");
const learningAttachmentRoute = readFileSync("app/api/dos/app/my-record/learning/attachments/route.ts", "utf8");
const lifePlanAttachmentRoute = readFileSync("app/api/dos/app/my-record/life-plan/attachments/route.ts", "utf8");
const loader = readFileSync("src/lib/dos/missionary-app.ts", "utf8");
const client = readFileSync("app/dos/app/DosMvpAppClient.tsx", "utf8");
const catalog = readFileSync("src/lib/dos/resource-catalog.ts", "utf8");

[
  "dos_user_records",
  "dos_user_journal_entries",
  "dos_user_prayer_logs",
  "dos_user_mentor_relationships",
  "dos_user_mentor_meetings",
  "dos_user_assessment_results",
].forEach((tableName) => {
  assert(migration.includes(`public.${tableName}`), `Migration should create ${tableName}.`);
  assert(migration.includes(`alter table public.${tableName} enable row level security`), `${tableName} should enable RLS.`);
  assert(migration.includes(`revoke all on table public.${tableName} from anon`), `${tableName} should revoke anon access.`);
});

assert(migration.includes("user_id = (select auth.uid())"), "My Record RLS should be scoped to the current authenticated user.");
assert(migration.includes("do not count as ministry table meetings"), "Migration comments should document metrics isolation.");

assert(propheticWordsMigration.includes("public.dos_user_prophetic_words"), "V2 migration should create dos_user_prophetic_words.");
assert(propheticWordsMigration.includes("alter table public.dos_user_prophetic_words enable row level security"), "Prophetic words should enable RLS.");
assert(propheticWordsMigration.includes("revoke all on table public.dos_user_prophetic_words from anon"), "Prophetic words should revoke anon access.");
assert(propheticWordsMigration.includes("grant select, insert, update, delete on table public.dos_user_prophetic_words to authenticated"), "Prophetic words should grant explicit authenticated CRUD behind RLS.");
assert(propheticWordsMigration.includes("user_id = (select auth.uid())"), "Prophetic words RLS should be scoped to the current authenticated user.");
assert(propheticWordsMigration.includes("do not create Field activity, Tables, Fruit, Reports, public Profile data, admin profile metrics, or circle scoring data"), "Prophetic words comments should document metrics isolation.");

assert(externalAssessmentsMigration.includes("public.dos_user_external_assessment_results"), "V2 migration should create dos_user_external_assessment_results.");
assert(externalAssessmentsMigration.includes("alter table public.dos_user_external_assessment_results enable row level security"), "External assessment results should enable RLS.");
assert(externalAssessmentsMigration.includes("revoke all on table public.dos_user_external_assessment_results from anon"), "External assessment results should revoke anon access.");
assert(externalAssessmentsMigration.includes("grant select, insert, update, delete on table public.dos_user_external_assessment_results to authenticated"), "External assessment results should grant explicit authenticated CRUD behind RLS.");
assert(externalAssessmentsMigration.includes("user_id = (select auth.uid())"), "External assessment results RLS should be scoped to the current authenticated user.");
assert(externalAssessmentsMigration.includes("must not copy external assessment questions, scoring systems, or proprietary content"), "External assessment comments should document proprietary content boundaries.");
assert(externalAssessmentsMigration.includes("do not create Field activity, Tables, Fruit, Reports, public Profile data, admin profile metrics, or circle scoring data"), "External assessment comments should document metrics isolation.");

assert(assessmentLibraryMigration.includes("'dos-my-record-assessments'"), "Assessment library migration should create the private report storage bucket.");
assert(assessmentLibraryMigration.includes("public,\n  file_size_limit"), "Assessment library migration should explicitly configure storage bucket privacy and limits.");
assert(assessmentLibraryMigration.includes("false,\n  10485760"), "Assessment report bucket should be private and capped at 10 MB.");
assert(assessmentLibraryMigration.includes("add column if not exists short_summary text"), "Assessment library migration should add short user-authored summaries.");
assert(assessmentLibraryMigration.includes("add column if not exists status text not null default 'completed'"), "Assessment library migration should add assessment library status.");
assert(assessmentLibraryMigration.includes("add column if not exists share_eligible boolean not null default false"), "Assessment library migration should keep future sharing opt-in by default.");
assert(assessmentLibraryMigration.includes("add column if not exists attachment_bucket text"), "Assessment library migration should store private report bucket references.");
assert(assessmentLibraryMigration.includes("add column if not exists attachment_path text"), "Assessment library migration should store private report object paths.");
assert(assessmentLibraryMigration.includes("check (status in ('completed', 'not_started', 'draft'))"), "Assessment library status should be constrained.");
assert(assessmentLibraryMigration.includes("Do not store proprietary assessment explanation text here."), "Assessment library comments should document copyrighted text boundaries.");
assert(assessmentLibraryMigration.includes("must not copy external assessment questions, scoring systems, proprietary explanation tables, or copyrighted manuals"), "Assessment library table comment should document proprietary content boundaries.");
assert(assessmentLibraryMigration.includes("do not create Field activity, Tables, Fruit, Reports, public Profile data, admin profile metrics, or circle scoring data"), "Assessment library table comment should preserve metric isolation.");

assert(learningMigration.includes("'dos-my-record-learning'"), "Learning migration should create the private highlight image storage bucket.");
assert(learningMigration.includes("false,\n  10485760"), "Learning highlight image bucket should be private and capped at 10 MB.");
assert(learningMigration.includes("public.dos_user_learning_books"), "Learning migration should create dos_user_learning_books.");
assert(learningMigration.includes("public.dos_user_learning_chapter_notes"), "Learning migration should create dos_user_learning_chapter_notes.");
assert(learningMigration.includes("alter table public.dos_user_learning_books enable row level security"), "Learning books should enable RLS.");
assert(learningMigration.includes("alter table public.dos_user_learning_chapter_notes enable row level security"), "Learning chapter notes should enable RLS.");
assert(learningMigration.includes("revoke all on table public.dos_user_learning_books from anon"), "Learning books should revoke anon access.");
assert(learningMigration.includes("revoke all on table public.dos_user_learning_chapter_notes from anon"), "Learning chapter notes should revoke anon access.");
assert(learningMigration.includes("grant select, insert, update, delete on table public.dos_user_learning_books to authenticated"), "Learning books should grant explicit authenticated CRUD behind RLS.");
assert(learningMigration.includes("grant select, insert, update, delete on table public.dos_user_learning_chapter_notes to authenticated"), "Learning chapter notes should grant explicit authenticated CRUD behind RLS.");
assert(learningMigration.includes("user_id = (select auth.uid())"), "Learning RLS should be scoped to the current authenticated user.");
assert(learningMigration.includes("They do not create Field activity, Tables, Fruit, Reports, public Profile data, admin profile metrics, or circle scoring data"), "Learning comments should preserve metric isolation.");
assert(learningMigration.includes("Future mentor sharing must remain user-controlled"), "Learning comments should preserve future share compatibility language.");

assert(lifePlanMigration.includes("'dos-my-record-life-plans'"), "Life Plan migration should create the private PDF storage bucket.");
assert(lifePlanMigration.includes("false,\n  10485760"), "Life Plan PDF bucket should be private and capped at 10 MB.");
assert(lifePlanMigration.includes("array['application/pdf']::text[]"), "Life Plan PDF bucket should only allow PDFs.");
assert(lifePlanMigration.includes("public.dos_user_life_plans"), "Life Plan migration should create dos_user_life_plans.");
assert(lifePlanMigration.includes("constraint dos_user_life_plan_unique_record unique (record_id)"), "Life Plan should stay one living plan per My Record.");
assert(lifePlanMigration.includes("alter table public.dos_user_life_plans enable row level security"), "Life Plan should enable RLS.");
assert(lifePlanMigration.includes("revoke all on table public.dos_user_life_plans from anon"), "Life Plan should revoke anon access.");
assert(lifePlanMigration.includes("grant select, insert, update, delete on table public.dos_user_life_plans to authenticated"), "Life Plan should grant explicit authenticated CRUD behind RLS.");
assert(lifePlanMigration.includes("user_id = (select auth.uid())"), "Life Plan RLS should be scoped to the current authenticated user.");
assert(lifePlanMigration.includes("visibility text not null default 'private'"), "Life Plan should be private by default.");
assert(lifePlanMigration.includes("Future mentor sharing must remain user-controlled"), "Life Plan comments should preserve future share compatibility language.");
assert(lifePlanMigration.includes("does not create Field activity, Tables, Fruit, Reports, public Profile data, admin profile metrics, or circle scoring data"), "Life Plan comments should preserve metric isolation.");

[
  ".from(\"dos_user_records\")",
  ".from(\"dos_user_journal_entries\")",
  ".from(\"dos_user_prayer_logs\")",
  ".from(\"dos_user_mentor_relationships\")",
  ".from(\"dos_user_mentor_meetings\")",
  ".from(\"dos_user_assessment_results\")",
].forEach((needle) => {
  assert(route.includes(needle), `Route should write through ${needle}.`);
});

assert(route.includes(".from(\"dos_user_prophetic_words\")"), "Route should support private prophetic word storage.");
assert(route.includes("My Record V2 is not enabled for this workspace."), "Route should reject prophetic word writes when V2 is disabled.");
assert(route.includes("isDosMyRecordV2Enabled"), "Route should enforce the Ryan-only V2 feature flag server-side.");
assert(route.includes(".from(\"dos_user_external_assessment_results\")"), "Route should support private external assessment result storage.");
assert(route.includes("kind === \"external_assessment_result\""), "Route should support the external assessment action.");
assert(route.includes("assessmentName"), "Route should require manual external assessment names.");
assert(route.includes("asOptionalHttpUrl"), "Route should validate external assessment links.");
assert(route.includes("asAssessmentAttachment"), "Route should validate private assessment report attachment references.");
assert(route.includes("attachment_bucket"), "Route should persist private assessment report bucket references.");
assert(route.includes("attachment_path"), "Route should persist private assessment report object paths.");
assert(route.includes("short_summary"), "Route should persist user-authored assessment summaries.");
assert(route.includes("share_eligible"), "Route should persist future sharing eligibility without sharing by default.");
assert(route.includes("status: asExternalAssessmentStatus"), "Route should validate manual assessment status.");
assert(route.includes("expectedPrefix = `workspaces/${workspaceId}/users/${userId}/assessments/`;"), "Route should scope uploaded report paths to the current user and workspace.");
assert(route.includes(".from(\"dos_user_learning_books\")"), "Route should support private Learning book storage.");
assert(route.includes(".from(\"dos_user_learning_chapter_notes\")"), "Route should support private Learning chapter note storage.");
assert(route.includes("kind === \"learning_book\""), "Route should support the learning book action.");
assert(route.includes("kind === \"learning_chapter_note\""), "Route should support the learning chapter note action.");
assert(route.includes("kind === \"journal\" || kind === \"encounter\""), "Route should support the unified Time With God encounter action without a new table.");
assert(route.includes("encounter: { table: \"dos_user_journal_entries\""), "Encounter deletes should safely target the existing private journal table.");
assert(route.includes("asLearningHighlightImage"), "Route should validate private learning highlight image references.");
assert(route.includes("expectedPrefix = `workspaces/${workspaceId}/users/${userId}/learning/`;"), "Route should scope learning highlight images to the current user and workspace.");
assert(route.includes("My Record V2 is not enabled for this workspace."), "Route should reject Learning writes when V2 is disabled.");
assert(route.includes(".from(\"dos_user_life_plans\")"), "Route should support private Life Plan storage.");
assert(route.includes("kind === \"life_plan\""), "Route should support the Life Plan action.");
assert(route.includes("asLifePlanAttachment"), "Route should validate private Life Plan PDF references.");
assert(route.includes("expectedPrefix = `workspaces/${workspaceId}/users/${userId}/life-plan/`;"), "Route should scope Life Plan PDFs to the current user and workspace.");
assert(route.includes("top_priorities: asLifePlanTopPriorities"), "Route should persist structured Life Plan priorities.");
assert(route.includes("review_history: asLifePlanReviewHistory"), "Route should persist Life Plan review history.");
assert(route.includes(".upsert({") && route.includes("onConflict: \"record_id\""), "Life Plan saves should upsert one living plan per My Record.");
assert(route.includes("life_plan: { table: \"dos_user_life_plans\", v2Only: true }"), "Life Plan deletes should be V2-only and private.");
assert(route.includes("myRecordDatabaseErrorResponse(lifePlanId.id ? \"Life Plan update\" : \"Life Plan upsert\""), "Life Plan database failures should return and log the real backend error.");

assert(attachmentRoute.includes("assessmentReportBucket = \"dos-my-record-assessments\""), "Attachment route should upload to the private assessment report bucket.");
assert(attachmentRoute.includes("isDosMyRecordV2Enabled"), "Attachment route should enforce the Ryan-only V2 feature flag server-side.");
assert(attachmentRoute.includes("requireDosWorkspaceRouteAccess"), "Attachment route should require workspace access.");
assert(attachmentRoute.includes("maxReportSize = 10 * 1024 * 1024"), "Attachment route should cap report uploads at 10 MB.");
assert(attachmentRoute.includes("application/pdf") && attachmentRoute.includes("image/jpeg") && attachmentRoute.includes("image/png") && attachmentRoute.includes("image/webp"), "Attachment route should only allow PDF and image reports.");
assert(attachmentRoute.includes("workspaces/${workspace.id}/users/${authorization.userId}/assessments/"), "Attachment route should scope report paths by workspace and user.");
assert(learningAttachmentRoute.includes("learningBucket = \"dos-my-record-learning\""), "Learning attachment route should upload to the private learning bucket.");
assert(learningAttachmentRoute.includes("isDosMyRecordV2Enabled"), "Learning attachment route should enforce the Ryan-only V2 feature flag server-side.");
assert(learningAttachmentRoute.includes("requireDosWorkspaceRouteAccess"), "Learning attachment route should require workspace access.");
assert(learningAttachmentRoute.includes("maxImageSize = 10 * 1024 * 1024"), "Learning attachment route should cap highlight images at 10 MB.");
assert(learningAttachmentRoute.includes("image/jpeg") && learningAttachmentRoute.includes("image/png") && learningAttachmentRoute.includes("image/webp"), "Learning attachment route should only allow image uploads.");
assert(learningAttachmentRoute.includes("workspaces/${workspace.id}/users/${authorization.userId}/learning/"), "Learning attachment route should scope highlight images by workspace and user.");
assert(lifePlanAttachmentRoute.includes("lifePlanBucket = \"dos-my-record-life-plans\""), "Life Plan attachment route should upload to the private Life Plan bucket.");
assert(lifePlanAttachmentRoute.includes("isDosMyRecordV2Enabled"), "Life Plan attachment route should enforce the Ryan-only V2 feature flag server-side.");
assert(lifePlanAttachmentRoute.includes("requireDosWorkspaceRouteAccess"), "Life Plan attachment route should require workspace access.");
assert(lifePlanAttachmentRoute.includes("maxPdfSize = 10 * 1024 * 1024"), "Life Plan attachment route should cap PDFs at 10 MB.");
assert(lifePlanAttachmentRoute.includes("file.type !== \"application/pdf\""), "Life Plan attachment route should only allow PDF uploads.");
assert(lifePlanAttachmentRoute.includes("workspaces/${workspace.id}/users/${authorization.userId}/life-plan/"), "Life Plan attachment route should scope PDFs by workspace and user.");

[
  ".from(\"missionary_tables\")",
  ".from(\"fruit_events\")",
  ".from(\"missionary_fruit_items\")",
  "recalculateCircleScores",
].forEach((forbidden) => {
  assert(!route.includes(forbidden), `My Record route must not write to or recalculate ministry metrics via ${forbidden}.`);
});

assert(loader.includes("includeExternalAssessments: features.myRecordV2Enabled"), "Loader should only load external assessment results when V2 is enabled.");
assert(loader.includes("includePropheticWords: features.myRecordV2Enabled"), "Loader should only load prophetic words when V2 is enabled.");
assert(loader.includes("includeLearning: features.myRecordV2Enabled"), "Loader should only load Learning books when V2 is enabled.");
assert(loader.includes("includeLifePlan: features.myRecordV2Enabled"), "Loader should only load Life Plan when V2 is enabled.");
assert(loader.includes("myRecord,"), "DosAppData should include myRecord.");
assert(loader.includes("assessmentResults"), "DosAppData My Record should include personal assessment results.");
assert(loader.includes("externalAssessmentResults"), "DosAppData My Record should include private external assessment results.");
assert(loader.includes("learningBooks"), "DosAppData My Record should include private Learning books.");
assert(loader.includes("lifePlan"), "DosAppData My Record should include the private Life Plan.");
assert(loader.includes("short_summary, status, share_eligible"), "Loader should read assessment library summary, status, and sharing fields.");
assert(loader.includes("createSignedUrl(result.attachment_path, 60 * 60)"), "Loader should create short-lived signed links for private report attachments.");
assert(loader.includes("createSignedUrl(note.highlight_image_path, 60 * 60)"), "Loader should create short-lived signed links for private Learning highlight images.");
assert(loader.includes("createSignedUrl(lifePlanRow.attachment_path, 60 * 60)"), "Loader should create short-lived signed links for private Life Plan PDFs.");
assert(loader.includes(".from(\"dos_user_life_plans\")"), "Loader should read private Life Plan data.");
assert(loader.includes("mapMyRecordLifePlanPriorities"), "Loader should normalize Life Plan priorities safely.");
assert(loader.includes("mapMyRecordLifePlanReviewHistory"), "Loader should normalize Life Plan review history safely.");
assert(loader.includes("myRecordV2Enabled: isDosMyRecordV2Enabled"), "Loader should calculate the Ryan-only My Record V2 flag server-side.");
assert(loader.includes("dosMyRecordV2WorkspaceSlugs"), "Feature flag should use private workspace identifiers.");
assert(loader.includes("dosMyRecordV2UserEmails"), "Feature flag should have an email fallback.");
assert(loader.includes("const isRyanWorkspace = dosMyRecordV2WorkspaceSlugs.has(normalizedSlug);"), "Feature flag should identify Ryan's workspace explicitly.");
assert(loader.includes("const isRyanUser = dosMyRecordV2UserEmails.has(normalizedEmail);"), "Feature flag should identify Ryan's user explicitly.");
assert(loader.includes("return isRyanUser && isRyanWorkspace;"), "V2 should require Ryan's user and Ryan's workspace so other users stay on legacy My Record.");
assert(loader.includes("meetingsCount: meetings.filter"), "Existing meeting metrics should remain based on meetings.");
assert(loader.includes("fruitCount: fruit.length"), "Existing fruit metrics should remain based on fruit.");
assert(!loader.includes("meetingsCount: myRecord"), "My Record must not affect meeting metrics.");
assert(!loader.includes("fruitCount: myRecord"), "My Record must not affect fruit metrics.");
assert(!loader.includes("loadFreshCircleData(workspace.id, people, myRecord"), "My Record must not feed circle scoring.");
assert(!loader.includes("loadFreshCircleData(workspace.id, people, meetings.filter((meeting) => meeting.meetingStatus === \"logged\"), myRecord"), "Prophetic words must not feed circle scoring.");

assert(catalog.includes("getDosAssessmentResources"), "DOS Library catalog should expose assessment resources for My Record.");
assert(client.includes("getDosAssessmentResources()"), "Client should list assessments from the DOS Library catalog.");
assert(client.includes("label: \"My Record\""), "Client should expose My Record in DOS navigation/apps.");
assert(client.includes("function normalizeMoreAppView"), "DOS should normalize More app view state before rendering nested app shells.");
assert(client.includes("const activeMoreAppView = activeTab === \"more\" ? normalizeMoreAppView(moreAppView) : null;"), "DOS should derive the rendered More shell from the normalized active More view.");
assert(client.includes("moreAppView={activeMoreAppView}"), "Desktop navigation should receive the same normalized More view used by the content shell.");
assert(client.includes("key={`more-${activeMoreAppView ?? \"apps\"}`"), "More app shell should remount when switching nested More views.");
assert(client.includes("activeMoreAppView === \"settings\""), "Settings should render only when the normalized More view is settings.");
assert(client.includes("activeMoreAppView === \"my_record\""), "My Record should render only when the normalized More view is my_record.");
const moreShellSource = client.slice(client.indexOf("{activeTab === \"more\" ? ("), client.indexOf("{showMobileFloatingActions ? ("));
assert(moreShellSource.includes("activeMoreAppView === \"settings\""), "More shell should render Settings from activeMoreAppView.");
assert(moreShellSource.includes("activeMoreAppView === \"my_record\""), "More shell should render My Record from activeMoreAppView.");
assert(!moreShellSource.includes("moreAppView === \"settings\""), "More shell should not render Settings from raw More view state.");
assert(!moreShellSource.includes("moreAppView === \"my_record\""), "More shell should not render My Record from raw More view state.");
assert(client.includes("function normalizeMyRecordTab"), "My Record tabs should normalize invalid/stale subtabs.");
assert(client.includes("const activeMyRecordTab = normalizeMyRecordTab(tab, myRecordV2Enabled);"), "Invalid My Record subtabs should fall back to Overview inside My Record.");
assert(client.includes("if (tab !== activeMyRecordTab)"), "My Record should update stale parent tab state after falling back to Overview.");
assert(client.includes("{ label: \"Assessments\", value: \"assessments\" }"), "My Record should expose the Assessments tab.");
assert(client.includes("const myRecordLegacyTabs"), "Client should preserve the existing My Record tab list for non-V2 users.");
assert(client.includes("const myRecordV2Tabs"), "Client should define the Ryan-only V2 internal tab list.");
const v2TabsSource = client.slice(client.indexOf("const myRecordV2Tabs"), client.indexOf("const prayerRequestViewTabs"));
assert(v2TabsSource.includes("{ label: \"Overview\", value: \"overview\" }"), "V2 should keep Overview as the first My Record tab.");
assert(v2TabsSource.includes("{ label: \"Walk\", value: \"walk_with_god\" }"), "V2 should expose Walk as a primary tab.");
assert(v2TabsSource.includes("{ label: \"Growth\", value: \"growth\" }"), "V2 should expose Growth as a primary tab.");
assert(v2TabsSource.includes("{ label: \"Calling\", value: \"calling\" }"), "V2 should expose Calling as a primary tab.");
assert(v2TabsSource.includes("{ label: \"Legacy\", value: \"legacy\" }"), "V2 should expose Legacy as a primary tab.");
assert(!v2TabsSource.includes("{ label: \"Scripture\", value: \"scripture\" }"), "V2 should not expose Scripture as a top-level My Record tab.");
assert(!v2TabsSource.includes("{ label: \"Learning\", value: \"learning\" }"), "V2 should not expose Learning as a top-level My Record tab.");
assert(!v2TabsSource.includes("{ label: \"Prophetic Words\", value: \"prophetic_words\" }"), "V2 should not expose Prophetic Words as a top-level My Record tab.");
assert(client.includes("Today's Alignment"), "V2 should include the Ryan-only dashboard experiment.");
assert(client.includes("myRecordV2Enabled ? data.myRecord.propheticWords.length : 0"), "Prophetic words should only affect private My Record activity count when V2 is enabled.");
assert(client.includes("Time With God"), "Client should expose Time With God as the unified Walk entry concept.");
assert(client.includes("Prayer Encounter"), "Client should support explicit prayer-only encounters without rendering an empty Prayer card.");
assert(client.includes("Reflection"), "Client should keep reflection language inside the unified Encounter model.");
assert(client.includes("Add Mentor"), "Client should expose Add Mentor as a distinct mentor relationship action.");
assert(client.includes("Log Mentor Meeting"), "Client should expose Log Mentor Meeting quick action.");
assert(client.includes("Take Assessment"), "Client should expose Take Assessment quick action.");
assert(client.includes("MyRecordSheetFrame"), "V2 should use drawers/sheets for My Record editing.");
assert(client.includes("MyRecordContextualFloatingActions"), "V2 should expose contextual My Record floating actions.");
assert(client.includes("activeMoreAppView === \"my_record\" && !myRecordV2Enabled"), "Outer DOS FAB should not render over the My Record V2 contextual FAB.");
assert(client.includes("const suppressGlobalFabForMyRecordV2 = activeTab === \"more\" && activeMoreAppView === \"my_record\" && myRecordV2Enabled;"), "My Record V2 should explicitly suppress the global app FAB.");
assert(client.includes("&& !suppressGlobalFabForMyRecordV2"), "Global floating action visibility should honor the My Record V2 FAB suppression guard.");
assert(client.includes("isOpen ? <X className=\"h-6 w-6\""), "My Record V2 FAB should render one explicit close button when open.");
assert(client.includes("Share Settings"), "My Record overview should expose Share Settings from the header.");
assert(client.includes("My Record is private."), "Share Settings should preserve the private-by-default sharing language.");
assert(client.includes("myRecordFutureSharingRoles.map"), "Share Settings should preserve future sharing roles.");
assert(client.includes("Today at a Glance"), "V2 overview should include the compact daily KPI cards.");
assert(client.includes("type MyRecordRecordKind"), "V2 activity rows should classify records with one shared display kind.");
assert(client.includes("function MyRecordCompactRecordCard"), "V2 should use one compact activity card pattern across record types.");
assert(client.includes("badge: myRecordRecordVisual(kind).label"), "Timeline items should carry the compact card badge label.");
assert(client.includes("kind={item.kind}") && client.includes("typeLabel={item.badge}"), "Overview and timeline activity should render through the compact card kind and badge.");
assert(client.includes("Word(s) of the Year"), "V2 Calling should show the Word(s) of the Year card.");
assert(client.includes("Discipline") && client.includes("Assignment"), "V2 should show Ryan's current words.");
assert(client.includes("מוּסָר") && client.includes("שְׁלִיחוּת"), "V2 should render Hebrew word details.");
assert(client.includes("God's Faithfulness"), "V2 Legacy should include God's Faithfulness.");
assert(client.includes("kind: \"prophetic_word\""), "Client should save prophetic words through the private My Record API.");
assert(client.includes("type MyRecordEncounter"), "V2 Walk should normalize legacy journal and prayer rows into one Encounter view model.");
assert(client.includes("function buildMyRecordEncounters"), "V2 Walk should build a unified Encounter list for display.");
assert(client.includes("payloadKind=\"encounter\""), "The V2 Encounter drawer should save through the encounter action.");
assert(client.includes("id: `encounter-journal-${entry.id}`"), "Journal-shaped Time With God records should appear as one encounter timeline item.");
assert(client.includes("id: `encounter-prayer-${log.id}`"), "Legacy prayer logs should render safely as prayer encounters.");
const encounterTitleSource = client.slice(client.indexOf("function myRecordEncounterTitleForEntry"), client.indexOf("function buildMyRecordEncounters"));
assert(!encounterTitleSource.includes("return entry.biblePassage"), "Scripture references should stay secondary metadata instead of becoming the Encounter title.");
assert(client.includes("function myRecordEncounterMeta"), "Encounter cards should expose Scripture and duration as secondary metadata.");
assert(client.includes("function MyRecordWalkWithGodPanel"), "V2 should group Time With God, filters, history, and timeline under Walk.");
const walkPanelSource = client.slice(client.indexOf("function MyRecordWalkWithGodPanel"), client.indexOf("function MyRecordGrowthPanel"));
assert(walkPanelSource.includes("Today's Encounter"), "Walk should show today's or latest encounter first.");
assert(walkPanelSource.includes("Encounter History"), "Walk should show encounter history instead of fragmented cards.");
assert(walkPanelSource.includes("Master Timeline"), "Walk should expose the master timeline.");
assert(walkPanelSource.includes("MyRecordCompactRecordCard"), "Walk should render compact cards instead of long inline preview cards.");
assert(walkPanelSource.includes("myRecordEncounterFilters"), "Walk should include Scripture, Prayer, Journal, and Highlights filters.");
assert(!walkPanelSource.includes("title=\"Quiet Time\""), "Walk should not render a separate Quiet Time summary card.");
assert(!walkPanelSource.includes("title=\"Journal\""), "Walk should not render a duplicate Journal summary card for the same encounter.");
assert(!walkPanelSource.includes("title=\"Prayer\""), "Walk should not render an empty Prayer summary card when no prayer-only encounter exists.");
assert(!walkPanelSource.includes("latestPrayer"), "Walk should not drive an empty Prayer card from latestPrayer.");
assert(client.includes("function MyRecordGrowthPanel"), "V2 should group Assessments, Learning, and Mentors under Growth.");
const growthPanelSource = client.slice(client.indexOf("function MyRecordGrowthPanel"), client.indexOf("function MyRecordCallingPanel"));
assert(growthPanelSource.indexOf("title=\"Mentors\"") < growthPanelSource.indexOf("title=\"Assessments\""), "Growth should show Mentors before Assessments.");
assert(growthPanelSource.indexOf("title=\"Assessments\"") < growthPanelSource.indexOf("title=\"Learning\""), "Growth should show Assessments before Learning.");
assert(growthPanelSource.includes("+ Add Mentor") && growthPanelSource.includes("Log Meeting"), "Growth mentor section should expose Add Mentor and Log Meeting actions.");
assert(growthPanelSource.includes("MyRecordMentorCard"), "Growth should render dedicated mentor relationship cards.");
assert(client.includes("| { kind: \"mentor_meeting\"; meeting?: DosAppUserMentorMeeting | null; mentor?: DosAppUserMentorRelationship | null; mode: MyRecordSheetMode }"), "Mentor meeting sheets should carry optional selected mentor context.");
assert(client.includes("onLogMeeting={() => onOpenSheet({ kind: \"mentor_meeting\", mentor, mode: \"new\" })}"), "Logging a meeting from a mentor card should preselect that mentor.");
assert(client.includes("const defaultMeetingMentor = meeting?.relationshipId"), "Mentor meeting form should resolve the saved mentor for new and edit flows.");
assert(client.includes("defaultValue={defaultRelationshipId}"), "Mentor meeting form should submit the selected saved mentor relationship.");
assert(client.includes("defaultValue={defaultFieldPersonId}"), "Mentor meeting form should keep the linked Field contact aligned with the saved mentor.");
assert(client.includes("No mentors saved yet. Add a mentor first or enter a manual name."), "Mentor meeting drawer should explain the empty saved mentor state.");
assert(client.includes("Meeting Rhythm") && client.includes("2x/week"), "Add Mentor should capture frequent mentor meeting rhythm.");
assert(client.includes("mentorEmail") && client.includes("mentorPhone") && client.includes("meetingRhythm"), "Add Mentor should submit mentor contact and rhythm fields.");
assert(loader.includes("mentor_email") && loader.includes("mentor_phone") && loader.includes("meeting_rhythm"), "Loader should hydrate mentor contact and rhythm fields.");
assert(route.includes("mentor_email") && route.includes("mentor_phone") && route.includes("meeting_rhythm"), "My Record route should persist mentor contact and rhythm fields.");
assert(route.includes("selectedRelationshipId = asString(payload.relationshipId)"), "Mentor meeting API should read the saved mentor relationship from the payload.");
assert(route.includes("Mentor meeting requires a saved mentor or manual mentor name."), "Mentor meeting API should return a clear validation error when no mentor is provided.");
assert(route.includes(".from(\"dos_user_mentor_meetings\")") && route.includes(".insert({") && route.includes(".update(mentorMeetingPayload)"), "Mentor meeting API should support create and edit saves.");
assert(route.includes(".select(\"id\")") && loader.includes(".from(\"dos_user_mentor_meetings\")") && loader.includes("relationship_id"), "Saved mentor meetings should reload from the private My Record loader.");
assert(route.includes("myRecordDatabaseErrorResponse(mentorMeetingId.id ? \"mentor meeting update\" : \"mentor meeting insert\""), "Mentor meeting database failures should return and log the real backend error.");
assert(client.includes("[My Record] Save request") && client.includes("[My Record] Save response") && client.includes("[My Record] Save failed"), "Client should log My Record request payloads, responses, statuses, and caught save exceptions.");
assert(route.includes("[My Record API] Request payload") && route.includes("[My Record API] Unexpected server error") && route.includes("[My Record API] Database error"), "API should log My Record payloads, caught exceptions, and database errors.");
assert(mentorProfileFieldsMigration.includes("add column if not exists mentor_email"), "Mentor profile migration should add mentor_email.");
assert(mentorProfileFieldsMigration.includes("add column if not exists mentor_phone"), "Mentor profile migration should add mentor_phone.");
assert(mentorProfileFieldsMigration.includes("add column if not exists meeting_rhythm"), "Mentor profile migration should add meeting_rhythm.");
assert(mentorProfileFieldsMigration.includes("Not public profile, Field, Table, Fruit, or circle metric data"), "Mentor profile fields should stay isolated from public and metrics data.");
assert(client.includes("function MyRecordCallingPanel"), "V2 should group Words, Prophetic Words, and Vision Timeline under Calling.");
const callingPanelSource = client.slice(client.indexOf("function MyRecordCallingPanel"), client.indexOf("function MyRecordLegacyPanel"));
assert(callingPanelSource.includes("MyRecordLifePlanCard"), "Calling should render the Life Plan summary card.");
assert(callingPanelSource.indexOf("title=\"Prophetic Words\"") < callingPanelSource.indexOf("MyRecordLifePlanCard"), "Life Plan should appear below Prophetic Words in Calling.");
assert(client.includes("function MyRecordLifePlanCard"), "Client should include a compact Life Plan summary card.");
assert(client.includes("Use this with mentors to review focus, obedience, priorities, and drift."), "Life Plan should include the mentor/accountability note.");
assert(client.includes("I am not called to pursue every opportunity. I am called to faithfully steward the vision God has entrusted to me."), "Life Plan should seed Ryan's calling statement from the supplied source text.");
assert(client.includes("Does this help us train, equip, multiply, or accelerate disciple-makers?"), "Life Plan should seed Ryan's decision filters.");
assert(client.includes("Create Systems that Multiply the Church"), "Life Plan should seed Ryan's Top 10 priorities.");
assert(client.includes("Protect the Culture and Calling"), "Life Plan should render the tenth priority.");
assert(client.includes("What I Want To Be Remembered For"), "Life Plan should render legacy / obituary notes fields.");
assert(client.includes("What I Want Jesus To Say"), "Life Plan should render the Jesus legacy note field.");
assert(client.includes("| { kind: \"life_plan\"; mode: MyRecordSheetMode; plan?: DosAppUserLifePlan | null }"), "Life Plan should use the existing drawer/sheet state.");
assert(client.includes("kind: \"life_plan\", mode: \"view\""), "Life Plan View should open in a drawer/sheet.");
assert(client.includes("kind: \"life_plan\", mode: \"edit\""), "Life Plan Edit and Review should open in a drawer/sheet.");
assert(client.includes("kind: \"life_plan\""), "Client should save Life Plan through the private My Record API.");
assert(client.includes("Upload PDF") || client.includes("Original PDF"), "Life Plan should expose a private PDF upload area.");
assert(client.includes("Parse PDF into Life Plan - Coming Soon"), "Life Plan PDF parsing should remain a Coming Soon CTA.");
assert(client.includes("Private by default. Eligible for future Share Settings only when the user explicitly shares it."), "Life Plan should preserve private/default share language.");
assert(client.includes("id: `life-plan-${record.lifePlan.id}`"), "Saved Life Plans should appear in the private My Record timeline.");
assert(client.includes("function MyRecordLegacyPanel"), "V2 should group God's Faithfulness, Family & Impact, and Year in Review under Legacy.");
assert(client.includes("Timeline"), "Walk should include the unified My Record timeline.");
assert(client.includes("Vision Timeline"), "Calling should reserve Vision Timeline for future work.");
assert(client.includes("Year in Review"), "Legacy should reserve Year in Review for future work.");
assert(client.includes("Family & Impact"), "Legacy should include the private family and impact summary.");
assert(!client.includes("label: \"Abide\""), "Abide should not be added as a left-nav or app-catalog item.");
assert(!client.includes("label: \"Prophetic Words\", type: \"moreApp\""), "Prophetic Words must not be added to the left nav.");
assert(client.includes("MyRecordReportPanel"), "My Record should include the personal reporting framework.");
const reportPanelOccurrences = client.match(/<MyRecordReportPanel fruit=\{fruit\} meetings=\{meetings\} people=\{people\} record=\{record\} \/>/g)?.length ?? 0;
assert(reportPanelOccurrences === 1, "V2 overview should remove the report panel while preserving the reporting framework outside the mockup view.");
assert(client.includes("Assessment Library"), "V2 Assessments should render as a clean assessment library.");
assert(client.includes("MCode"), "V2 Assessments should include Ryan's MCode result card.");
assert(client.includes("Establish") && client.includes("Realize The Vision") && client.includes("Persuade"), "MCode seed should include Ryan's top motivations.");
assert(client.includes("Orchestrator") && client.includes("Driver") && client.includes("Optimizer"), "MCode seed should include Ryan's strongest dimensions.");
assert(client.includes("Gregoric Mind Styles"), "V2 Assessments should include Ryan's Gregoric Mind Styles result card.");
assert(client.includes("Concrete Random"), "Gregoric detail should use Ryan's Concrete Random label.");
assert(!client.includes("Gregorc Mind Styles"), "UI should use Gregoric spelling, not Gregorc.");
assert(client.includes("Add External Result"), "V2 Assessments should expose Add External Result.");
assert(client.includes("myRecordExternalAssessmentCategories"), "V2 Assessments should list external assessment categories.");
assert(client.includes("Personality & Wiring"), "V2 Assessments should include Personality & Wiring grouping.");
assert(client.includes("Leadership"), "V2 Assessments should include Leadership grouping.");
assert(client.includes("CliftonStrengths / StrengthsFinder"), "External assessment examples should include CliftonStrengths / StrengthsFinder.");
assert(client.includes("kind: \"external_assessment_result\""), "Client should save external results through the private My Record API.");
assert(client.includes("Upload Original Report"), "Assessment library should support optional original report uploads.");
assert(client.includes("View Original Report"), "Assessment detail should link to uploaded original reports when present.");
assert(client.includes("Short Summary"), "Assessment form should capture a mentor-friendly short summary.");
assert(client.includes("Eligible for future Share Settings"), "Assessment form should capture future share eligibility without sharing now.");
assert(client.includes("Do not copy questions, scoring systems, proprietary explanation tables, or copyrighted manuals."), "External assessment UI should prevent proprietary content copying.");
assert(client.includes("myRecordV2Enabled ? data.myRecord.externalAssessmentResults.length : 0"), "External assessment results should only affect private My Record activity count when V2 is enabled.");
assert(client.includes("Learning / Book Notes"), "V2 should include the Learning / Book Notes UI.");
assert(client.includes("Upload Highlight Image"), "Learning should support optional chapter highlight image uploads.");
assert(client.includes("Generate Summary from Highlights"), "Learning should expose the future AI summary placeholder CTA.");
assert(client.includes("Coming Soon"), "Learning AI summary CTA should be marked Coming Soon.");
assert(client.includes("Eligible for future mentor sharing"), "Learning should be future share-compatible while private by default.");
assert(client.includes("Books Read"), "Learning should show a books read count.");
assert(client.includes("kind: \"learning_book\""), "Client should save Learning books through the private My Record API.");
assert(client.includes("kind: \"learning_chapter_note\""), "Client should save Learning chapter notes through the private My Record API.");
assert(client.includes("myRecordV2Enabled ? data.myRecord.learningBooks.reduce"), "Learning data should only affect private My Record activity count when V2 is enabled.");
assert(!client.includes("propheticWords.filter((word) => isMyRecordDateInRange"), "Prophetic words should not be added to reports in this pass.");
assert(!client.includes("label: \"External Assessments\", type: \"moreApp\""), "External assessments must not be added to the left nav.");
assert(!client.includes("label: \"Learning\", type: \"moreApp\""), "Learning must not be added to the left nav.");
assert(!client.includes("label: \"Life Plan\", type: \"moreApp\""), "Life Plan must not be added to the left nav.");
assert(client.includes("Future: Permission-based My Record sharing"), "Future sharing permissions TODO should stay explicit.");
assert(client.includes("Future: PDF exports and shareable report links"), "Future report export TODO should stay explicit.");
assert(client.includes("Future: Smart prompts and check-in drafts based on Field records, prior meetings, reminders, and accountability cadence."), "Future AI/check-in TODO should stay explicit.");

console.log("DOS My Record regression checks passed.");
