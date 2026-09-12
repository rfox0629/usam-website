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
const workspaceRoute = readFileSync("app/dos/[collectiveSlug]/page.tsx", "utf8");
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
assert(route.includes(".from(\"dos_user_life_plans\")"), "Route should support private Life Plan storage.");
assert(route.includes("kind === \"life_plan\""), "Route should support the Life Plan action.");
assert(route.includes("asLifePlanAttachment"), "Route should validate private Life Plan PDF references.");
assert(route.includes("expectedPrefix = `workspaces/${workspaceId}/users/${userId}/life-plan/`;"), "Route should scope Life Plan PDFs to the current user and workspace.");
assert(route.includes("top_priorities: asLifePlanTopPriorities"), "Route should persist structured Life Plan priorities.");
assert(route.includes("review_history: asLifePlanReviewHistory"), "Route should persist Life Plan review history.");
assert(route.includes(".upsert({") && route.includes("onConflict: \"record_id\""), "Life Plan saves should upsert one living plan per My Record.");
assert(route.includes("life_plan: { table: \"dos_user_life_plans\" }"), "Life Plan deletes should remain private and workspace/user scoped.");
assert(route.includes("myRecordDatabaseErrorResponse(lifePlanId.id ? \"Life Plan update\" : \"Life Plan upsert\""), "Life Plan database failures should return and log the real backend error.");

assert(attachmentRoute.includes("assessmentReportBucket = \"dos-my-record-assessments\""), "Attachment route should upload to the private assessment report bucket.");
assert(attachmentRoute.includes("requireDosWorkspaceRouteAccess"), "Attachment route should require workspace access.");
assert(attachmentRoute.includes("maxReportSize = 10 * 1024 * 1024"), "Attachment route should cap report uploads at 10 MB.");
assert(attachmentRoute.includes("application/pdf") && attachmentRoute.includes("image/jpeg") && attachmentRoute.includes("image/png") && attachmentRoute.includes("image/webp"), "Attachment route should only allow PDF and image reports.");
assert(attachmentRoute.includes("workspaces/${workspace.id}/users/${authorization.userId}/assessments/"), "Attachment route should scope report paths by workspace and user.");
assert(learningAttachmentRoute.includes("learningBucket = \"dos-my-record-learning\""), "Learning attachment route should upload to the private learning bucket.");
assert(learningAttachmentRoute.includes("requireDosWorkspaceRouteAccess"), "Learning attachment route should require workspace access.");
assert(learningAttachmentRoute.includes("maxImageSize = 10 * 1024 * 1024"), "Learning attachment route should cap highlight images at 10 MB.");
assert(learningAttachmentRoute.includes("image/jpeg") && learningAttachmentRoute.includes("image/png") && learningAttachmentRoute.includes("image/webp"), "Learning attachment route should only allow image uploads.");
assert(learningAttachmentRoute.includes("workspaces/${workspace.id}/users/${authorization.userId}/learning/"), "Learning attachment route should scope highlight images by workspace and user.");
assert(lifePlanAttachmentRoute.includes("lifePlanBucket = \"dos-my-record-life-plans\""), "Life Plan attachment route should upload to the private Life Plan bucket.");
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

[
  route,
  attachmentRoute,
  learningAttachmentRoute,
  lifePlanAttachmentRoute,
  loader,
  client,
].forEach((source) => {
  assert(!source.includes("myRecordV2Enabled"), "My Record V2 must be canonical and must not be feature-gated.");
  assert(!source.includes("isDosMyRecordV2Enabled"), "My Record V2 must not use the retired Ryan-only helper.");
  assert(!source.includes("dosMyRecordV2"), "My Record V2 must not keep retired Ryan-only workspace/email allow lists.");
  assert(!source.includes("My Record V2 is not enabled for this workspace."), "My Record V2 APIs must not reject non-Ryan workspaces.");
});
assert(!client.includes("const myRecordLegacyTabs"), "Legacy My Record tabs must not be retained as an alternate renderer.");
assert(!client.includes("const myRecordV2Tabs"), "V2 should be the canonical My Record tab list, not a gated alternate.");
assert(!route.includes("v2Only"), "V2-only delete gates must be removed from the canonical My Record API.");
assert(loader.includes("loadMyRecordForWorkspace(supabase, workspace.id, viewer),"), "Ryan, Dirk, and generic workspaces should use the same My Record loader path.");
assert(loader.includes(".from(\"dos_user_external_assessment_results\")"), "Loader should load external assessment results for every authenticated DOS workspace.");
assert(loader.includes(".from(\"dos_user_prophetic_words\")"), "Loader should load prophetic words for every authenticated DOS workspace.");
assert(loader.includes(".from(\"dos_user_learning_books\")"), "Loader should load Learning books for every authenticated DOS workspace.");
assert(loader.includes(".from(\"dos_user_life_plans\")"), "Loader should load Life Plan for every authenticated DOS workspace.");
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
assert(loader.includes(".select(\"id, slug, display_name, public_slug\")"), "Workspace resolution should keep canonical workspace identity available.");
assert(workspaceRoute.includes("\"fox-family\": \"ryan-fox\""), "DOS route should normalize the Fox Family alias to Ryan's canonical route.");
assert(workspaceRoute.includes("\"bond-family\": \"dirk-bond\""), "DOS route should normalize the Bond Family alias to Dirk's canonical route.");
assert(workspaceRoute.includes("const activeWorkspace = resolvedWorkspace ?? (workspaceAccess.status === \"allowed\" ? workspaceAccess.workspace : null);") && workspaceRoute.includes("id: activeWorkspace.id") && workspaceRoute.includes("slug: activeWorkspace.slug"), "DOS route should load data from the authorized resolved workspace for Ryan, Dirk, and generic slugs.");
assert(loader.includes("meetingsCount: meetings.filter((meeting) => meeting.meetingStatus === \"logged\").length + accountabilityCheckInRows.length"), "Meeting metrics should include saved accountability check-ins.");
assert(loader.includes("fruitCount: fruit.length"), "Existing fruit metrics should remain based on fruit.");
assert(!loader.includes("meetingsCount: myRecord"), "My Record must not affect meeting metrics.");
assert(!loader.includes("fruitCount: myRecord"), "My Record must not affect fruit metrics.");
assert(!loader.includes("loadFreshCircleData(workspace.id, people, myRecord"), "My Record must not feed circle scoring.");
assert(!loader.includes("loadFreshCircleData(workspace.id, people, meetings.filter((meeting) => meeting.meetingStatus === \"logged\"), myRecord"), "Prophetic words must not feed circle scoring.");

assert(catalog.includes("getDosAssessmentResources"), "DOS Library catalog should expose assessment resources for My Record.");
assert(client.includes("getDosAssessmentResources()"), "Client should list assessments from the DOS Library catalog.");
/* USA-272 (founder, 2026-09-11): My Record moved into People. It is reached
   from the People action row, not from the Apps grid, the More launcher or the
   desktop sidebar. These replace the USA-220 nav/app-tile assertions. */
assert(client.includes("<span>My Record</span>"), "USA-272: People exposes My Record in its action row.");
assert(client.includes("onClick={openMyRecord}"), "USA-272: the People action row opens My Record.");
assert(!client.includes("label: \"My Record\","), "USA-272: My Record is no longer an Apps-grid or sidebar item.");
assert(!client.includes("desktopMyRecordNavItem"), "USA-272: the desktop sidebar no longer carries a My Record entry.");
assert(!/dosMobileMoreLauncherAppLabels = \["My Record"/.test(client), "USA-272: My Record left the mobile More launcher.");
assert(client.includes("function openMyRecord()"), "USA-272: My Record has one opener that lands inside People.");
assert(client.includes("setActiveTab(\"people\");") && client.includes("setIsMyRecordOpen(true);"), "USA-272: opening My Record keeps People the active tab, so the bottom nav stays on People.");
assert(client.includes("function normalizeMoreAppView"), "DOS should normalize More app view state before rendering nested app shells.");
assert(client.includes("const activeMoreAppView = activeTab === \"more\" ? normalizeMoreAppView(moreAppView) : null;"), "DOS should derive the rendered More shell from the normalized active More view.");
assert(client.includes("moreAppView={activeMoreAppView}"), "Desktop navigation should receive the same normalized More view used by the content shell.");
assert(client.includes("key={`more-${activeMoreAppView ?? \"apps\"}`"), "More app shell should remount when switching nested More views.");
assert(client.includes("activeMoreAppView === \"settings\""), "Settings should render only when the normalized More view is settings.");
assert(!client.includes("activeMoreAppView === \"my_record\""), "USA-272: the More shell no longer renders My Record.");
assert(client.includes("{isMyRecordOpen ? (\n          <MyRecordWorkspace"), "USA-272: My Record renders inside People, beside the Person record overlay.");
const moreShellSource = client.slice(client.indexOf("{activeTab === \"more\" ? ("), client.indexOf("{showMobileFloatingActions ? ("));
assert(moreShellSource.includes("activeMoreAppView === \"settings\""), "More shell should render Settings from activeMoreAppView.");
assert(!moreShellSource.includes("moreAppView === \"settings\""), "More shell should not render Settings from raw More view state.");
assert(!moreShellSource.includes("moreAppView === \"my_record\""), "More shell should not render My Record from raw More view state.");
/* USA-272: an old deep link or a session saved while My Record was a More app
   must resolve to the new destination rather than to an empty More view. */
assert(client.includes("if (nextView === \"my_record\") {\n      openMyRecord();"), "USA-272: any caller still asking More for My Record is redirected to People.");
assert(client.includes("restored.myRecordOpen === true || restoredMoreApp === \"my_record\""), "USA-272: a saved More/my_record session restores into People.");
assert(client.includes("myRecordOpen: activeTab === \"people\" && isMyRecordOpen"), "USA-272: the persisted view remembers My Record as a People destination.");
assert(client.includes("function normalizeMyRecordTab"), "My Record tabs should normalize invalid/stale subtabs.");
assert(client.includes("const activeMyRecordTab = normalizeMyRecordTab(tab);"), "Invalid My Record subtabs should fall back inside My Record.");
/* USA-272: a retired tab resolves to the view that now holds its content
   instead of silently dropping the reader on Overview. */
assert(client.includes("const myRecordLegacyTabDestinations"), "USA-272: retired tabs map to their new destination.");
[["walk_with_god", "timeline"], ["journal", "timeline"], ["scripture", "timeline"], ["growth", "overview"], ["mentors", "my_life"], ["prayer", "overview"], ["calling", "my_life"], ["legacy", "my_life"], ["assessments", "my_life"], ["learning", "my_life"], ["prophetic_words", "my_life"]].forEach(([from, to]) => {
  assert(new RegExp(`${from}: "${to}"`).test(client), `USA-272: the retired ${from} tab should resolve to ${to}.`);
});
assert(client.includes("if (tab !== activeMyRecordTab)"), "My Record should update stale parent tab state after falling back to Overview.");
const canonicalTabsSource = client.slice(client.indexOf("const myRecordTabs"), client.indexOf("function normalizeMyRecordTab"));
/* USA-272 (founder, 2026-09-11): three views, matching the Person record, so
   someone who knows a People record already knows this one. These replace the
   USA-220 five-tab assertions. */
assert(canonicalTabsSource.includes('{ label: "Overview", value: "overview" }'), "USA-272: Overview is the first view.");
assert(canonicalTabsSource.includes('{ label: "Timeline", value: "timeline" }'), "USA-272: Timeline is the second view.");
assert(canonicalTabsSource.includes('{ label: "My Life", value: "my_life" }'), "USA-272: My Life is the third view.");
assert((canonicalTabsSource.match(/value: "/g) ?? []).length === 3, "USA-272: exactly three views -- no horizontally scrolling rail.");
["Walk", "Growth", "Purpose", "Faithfulness", "Journal", "Prayer", "People Discipling Me", "Assessments", "Scripture", "Learning", "Prophetic Words"].forEach((label) => {
  assert(!canonicalTabsSource.includes(`label: "${label}"`), `USA-272: ${label} must not be a top-level My Record view.`);
});
/* USA-257: Today's Alignment left Home; My Record remains its own destination. */
assert(!client.includes("Today's Alignment"), "Home no longer renders Today's Alignment (USA-257).");
/* USA-272: the Apps-grid tile that showed a private activity count went with
   the tile. These record types now feed no surfaced count at all, which is a
   stronger form of the USA-220 guarantee they replace. */
assert(!client.includes("myRecordActivityCount"), "USA-272: no surfaced count is derived from private My Record data.");
assert(!client.includes("+ data.myRecord.propheticWords.length"), "USA-272: prophetic words feed no surfaced count.");
assert(client.includes("Time With God"), "Client should expose Time With God as the unified Walk entry concept.");
assert(client.includes("Prayer Encounter"), "Client should support explicit prayer-only encounters without rendering an empty Prayer card.");
assert(client.includes("Reflection"), "Client should keep reflection language inside the unified Encounter model.");
assert(client.includes("Add Person Discipling Me"), "Client should expose the person discipling me as a distinct relationship action.");
assert(client.includes("Log Discipleship Meeting"), "Client should expose the discipleship meeting quick action.");
assert(client.includes("Take Assessment"), "Client should expose Take Assessment quick action.");
assert(client.includes("MyRecordSheetFrame"), "V2 should use drawers/sheets for My Record editing.");
assert(client.includes("MyRecordContextualFloatingActions"), "V2 should expose contextual My Record floating actions.");
assert(client.includes("const suppressGlobalFabForMyRecord = isMyRecordOpen;"), "USA-272: My Record suppresses the global app FAB wherever it is reached from.");
assert(client.includes("&& !suppressGlobalFabForMyRecord"), "Global floating action visibility should honor the My Record FAB suppression guard.");
assert(client.includes("isOpen ? <X className=\"h-6 w-6\""), "My Record V2 FAB should render one explicit close button when open.");
assert(client.includes("right-[max(1rem,calc((100vw-430px)/2+1rem))]"), "My Record FAB should use a shell-aware viewport inset on mobile.");
/* USA-265 (founder, 2026-09-10): the header's white "Private" chip opened a
   panel promising sharing roles that do not exist, and read as an unexplained
   box at the top of My Record. It is removed, as Learning's future-sharing
   promise was (USA-260). My Record stays private; real sharing arrives with
   its own control. This replaces the USA-220 assertion that the chip exists. */
assert(!client.includes("myRecordFutureSharingRoles") && !client.includes("isShareSettingsOpen"), "USA-265: no header panel promises sharing that does not exist.");
const myRecordWorkspaceSource = client.slice(client.indexOf("function MyRecordWorkspace"), client.indexOf("function GrowthMilestoneRow"));
/* USA-220 (DOS UI refresh, canonical spec §5.8, Linear "Pilot — My Record")
   retired the daily KPI cards: the Overview is Current + Recent entries with
   one View all. The earlier assertion that the Overview includes the KPI
   cards is replaced, deliberately, by the assertions below. */
assert(!myRecordWorkspaceSource.includes("Today at a Glance"), "USA-220: the Overview no longer carries the daily KPI cards.");
/* USA-272: Overview is the paired meeting cards then three short current-state
   summaries, on the People record's own sectioned surface. It is not a second
   timeline and not a dashboard. These replace the USA-220 Current/Recent
   assertions. */
const myRecordOverviewSource = client.slice(client.indexOf("function MyRecordOverviewPanel"), client.indexOf("/* USA-272 Timeline"));
assert(myRecordOverviewSource.includes('<span className={eyebrowClass}>Last meeting</span>') && myRecordOverviewSource.includes('<span className={eyebrowClass}>Upcoming meeting</span>'), "USA-272: Overview leads with the paired Last / Upcoming meeting cards.");
assert(myRecordOverviewSource.includes('title="Time with God"'), "USA-272: Overview carries a compact Time with God summary.");
assert(myRecordOverviewSource.includes('title="What I\'m working on"'), "USA-272: Overview carries What I'm working on.");
assert(myRecordOverviewSource.includes('title="Personal Prayer"'), "USA-272: Overview carries Personal Prayer.");
assert(myRecordOverviewSource.includes('onClick={onLogTimeWithGod}>+ Log'), "USA-272: Time with God offers a direct + Log.");
/* The founder's first correction: no mentor roster on Overview. */
assert(!myRecordOverviewSource.includes("People discipling me") && !myRecordOverviewSource.includes("People Discipling Me"), "USA-272: Overview carries no People discipling me roster.");
assert(!myRecordOverviewSource.includes("mentorRelationships"), "USA-272: Overview does not render the mentor relationship list.");
/* The relationships themselves, and the ability to manage them, are retained.
   Creation alone is not retention: a relationship that can be created but
   never reopened is an inaccessible collection, so the reachable view-mode
   entry point is asserted explicitly. */
assert(client.includes('label: "Add Person Discipling Me"'), "USA-272: the discipling relationship can still be created.");
assert(client.includes('onOpen={() => onOpenSheet({ kind: "mentor_relationship", mentor, mode: "view" })}'), "USA-272: a saved discipling relationship can be reopened from My Life.");
assert(client.includes('mentor_relationship", mentor, mode: "edit"') && client.includes('onDelete("mentor_relationship", mentor.id)'), "USA-272: the reopened relationship can still be edited and deleted.");
assert(/mentors: "my_life"/.test(client), "USA-272: an old mentors link resolves to where the relationships are managed.");
/* Overview's meeting pair reads personal discipleship meetings -- someone
   investing in the account holder -- and never reinterprets outgoing meetings
   as incoming investment. */
assert(client.includes("const lastMentorMeeting = record.mentorMeetings"), "USA-272: Last meeting comes from the record's own discipleship meetings.");
assert(!myRecordOverviewSource.includes("meetings.filter"), "USA-272: Overview does not treat outgoing meetings as incoming investment.");
assert(client.includes("meeting.followUpDate as string) >= today"), "USA-272: Upcoming is a real saved follow-up date, never an inferred appointment.");
assert(myRecordWorkspaceSource.includes("currentItems") && myRecordWorkspaceSource.includes('assignment.status !== "completed"') && myRecordWorkspaceSource.includes('item.status === "draft"'), "USA-272: What I'm working on shows only what production already treats as active; no new aggregate.");
/* Every existing per-assignment control survives the move onto Overview. */
["Continue", "Start", "Complete", "Check-In", "Edit Dates"].forEach((label) => {
  assert(myRecordWorkspaceSource.includes(`label: "${label}"`), `USA-272: the ${label} action is preserved on What I'm working on.`);
});
/* USA-272: the record uses the Person record's own shell -- Segmented views,
   centred initials and name, back on the left and Edit on the right. */
assert(myRecordWorkspaceSource.includes("<Segmented") && !myRecordWorkspaceSource.includes("<PillRail"), "USA-272: three fixed views use the canonical Segmented control, not a scrolling rail.");
assert(!client.includes("function MyRecordTabBar"), "USA-220: the bespoke tab bar is gone.");
assert(myRecordWorkspaceSource.includes("dosPersonAtmosphereClassName"), "USA-272: My Record carries the same page atmosphere as a Person record.");
assert(myRecordWorkspaceSource.includes("{initials(recordDisplayName)}") && myRecordWorkspaceSource.includes(">My Record</p>"), "USA-272: the header centres initials and name, labelled My Record.");
assert(myRecordWorkspaceSource.includes("<ArrowLeft") && myRecordWorkspaceSource.includes(">\n              Edit\n            </button>"), "USA-272: back sits left and Edit right, as on a Person record.");
assert(!/<PageHeader\s+action=/.test(myRecordWorkspaceSource), "USA-265: the My Record header carries no chip beside the title.");
/* The shared surface: one white sectioned container, blue eyebrows, hairline
   rules and aligned actions -- the same classes the People Overview uses. */
assert(client.includes('function MyRecordSurface') && client.includes('rounded-2xl border border-dos-hairline bg-white px-4 pb-1 pt-4'), "USA-272: My Record uses the People Overview container.");
assert(client.includes('function MyRecordSection') && client.includes('className="border-b border-dos-rule py-3 last:border-b-0"'), "USA-272: sections are hairline-separated groups, not separated cards.");
assert(client.includes("function MyRecordSectionRow") && client.includes("<PersonRecordRow onOpen={onOpen}>"), "USA-272: rows reuse the Person record's own row.");
assert(!myRecordWorkspaceSource.includes("<TabHero"), "My Record overview should use a compact page header instead of the large TabHero card.");
assert(!myRecordWorkspaceSource.includes("SectionHeading title=\"Quick Actions\""), "My Record overview should not render a visible Quick Actions section.");
const myRecordFabSource = client.slice(client.indexOf("const myRecordFabItems"), client.indexOf("// TODO: Future: Permission-based My Record sharing"));
assert(myRecordFabSource.includes('label: "Time With God"'), "My Record FAB should keep one unified Time With God action.");
assert(myRecordFabSource.includes('label: "Add Person Discipling Me"'), "USA-272: My Life owns creation of a person discipling me; the roster left Overview, the relationship did not.");
assert(myRecordFabSource.includes('label: "Log Discipleship Meeting"'), "My Record FAB should label the relationship meeting as a discipleship meeting.");
assert(myRecordFabSource.includes('label: "Add Assessment"'), "My Record FAB should label manual assessment-result entry as Add Assessment.");
assert(myRecordFabSource.includes('label: "Add Book"'), "USA-272: My Life labels private book creation as Add Book.");
assert(myRecordFabSource.includes('label: "Add Prophetic Word"'), "USA-272: My Life owns prophetic word creation.");
assert(myRecordFabSource.includes("label: \"Record God's Faithfulness\""), "USA-272: My Life keeps one broad faithfulness creation action.");
assert(!myRecordFabSource.includes('label: "Prayer Encounter"'), "My Record FAB should not duplicate Time With God with Prayer Encounter.");
assert(!myRecordFabSource.includes('label: "Reflection"'), "My Record FAB should not duplicate Time With God with Reflection.");
assert(!myRecordFabSource.includes("label: \"Prophetic Word\","), "My Record FAB should use Add Prophetic Word, not a noun-only label.");
assert(!myRecordFabSource.includes("label: \"God's Faithfulness\","), "My Record FAB should use Record God's Faithfulness, not a noun-only label.");
assert(!myRecordFabSource.includes('label: "Answered Prayer"'), "Faithfulness FAB should not duplicate the same encounter form with Answered Prayer.");
assert(!myRecordFabSource.includes('label: "Family Milestone"'), "Faithfulness FAB should not include family placeholders.");
assert(!myRecordFabSource.includes('label: "Ministry Story"'), "Faithfulness FAB should not include ministry story placeholders.");
assert(!myRecordFabSource.includes('label: "Course"'), "My Record FAB should not show disabled Course placeholders.");
assert(!myRecordFabSource.includes('label: "Podcast"'), "My Record FAB should not show disabled Podcast placeholders.");
assert(client.includes("type MyRecordRecordKind"), "V2 activity rows should classify records with one shared display kind.");
assert(client.includes("function MyRecordCompactRecordCard"), "V2 should use one compact activity card pattern across record types.");
assert(client.includes("items-center gap-2.5 rounded-[16px]") && client.includes("px-3 py-2.5"), "V2 activity cards should stay tight activity rows, not oversized cards.");
assert(client.includes("layout icon | content | date/chevron") || client.includes("self-start pt-0.5"), "V2 activity cards should keep the icon, content, date/chevron row layout.");
assert(client.includes("badge: myRecordRecordVisual(kind).label"), "Timeline items should carry the compact card badge label.");
assert(client.includes("kind={item.kind}") && client.includes("typeLabel={item.badge}"), "Overview and timeline activity should render through the compact card kind and badge.");
/* The two layout assertions for the KPI cards (2-by-2 grid, compact padding)
   were retired with the cards in USA-220. */
const myRecordVisualSource = client.slice(client.indexOf("function myRecordRecordVisual"), client.indexOf("function MyRecordCompactRecordCard"));
["red-", "violet-", "orange-", "indigo-", "teal-"].forEach((accent) => {
  assert(!myRecordVisualSource.includes(accent), `My Record record visuals should not use ${accent} accent classes.`);
});
assert(client.includes("Word(s) of the Year"), "V2 Purpose should show the Word(s) of the Year card.");
assert(client.includes("Discipline") && client.includes("Assignment"), "V2 should show Ryan's current words.");
assert(client.includes("מוּסָר") && client.includes("שְׁלִיחוּת"), "V2 should render Hebrew word details.");
assert(client.includes("God's Faithfulness"), "V2 Faithfulness should include God's Faithfulness.");
assert(client.includes("kind: \"prophetic_word\""), "Client should save prophetic words through the private My Record API.");
assert(client.includes("type MyRecordEncounter"), "V2 Walk should normalize legacy journal and prayer rows into one Encounter view model.");
assert(client.includes("function buildMyRecordEncounters"), "V2 Walk should build a unified Encounter list for display.");
assert(client.includes("payloadKind=\"encounter\""), "The V2 Encounter drawer should save through the encounter action.");
assert(client.includes("id: `encounter-journal-${entry.id}`"), "Journal-shaped Time With God records should appear as one encounter timeline item.");
assert(client.includes("id: `encounter-prayer-${log.id}`"), "Legacy prayer logs should render safely as prayer encounters.");
const encounterTitleSource = client.slice(client.indexOf("function myRecordEncounterTitleForEntry"), client.indexOf("function buildMyRecordEncounters"));
assert(!encounterTitleSource.includes("return entry.biblePassage"), "Scripture references should stay secondary metadata instead of becoming the Encounter title.");
assert(client.includes("function myRecordEncounterMeta"), "Encounter cards should expose Scripture and duration as secondary metadata.");
/* USA-272: Walk became the Timeline view -- one dated history across every
   personal record type, with search and filters. Each row opens the saved
   record itself; nothing is copied to populate the timeline, and no historical
   event is invented for a record that keeps no change history. These replace
   the USA-220 Walk-panel assertions. */
assert(client.includes("function MyRecordTimelinePanel"), "USA-272: My Record has a Timeline view.");
const timelinePanelSource = client.slice(client.indexOf("function MyRecordTimelinePanel"), client.indexOf("/* USA-272 My Life"));
assert(timelinePanelSource.includes('<SearchField label="Search my record"'), "USA-272: the Timeline is searchable.");
assert(timelinePanelSource.includes("myRecordTimelineFilters"), "USA-272: the Timeline offers useful filters.");
assert(timelinePanelSource.includes("onOpenItem(item)"), "USA-272: a Timeline row opens the saved record itself.");
assert(timelinePanelSource.includes("toLocaleDateString(\"en-US\", { month: \"long\", year: \"numeric\" })"), "USA-272: the Timeline groups by month, as the Person record's does.");
assert(timelinePanelSource.includes("items.filter") && !timelinePanelSource.includes(".map((item) => ({ ...item"), "USA-272: the Timeline filters saved records; it never copies them.");
const timelineFilterSource = client.slice(client.indexOf("const myRecordTimelineFilters"), client.indexOf("function MyRecordTimelinePanel"));
["Time with God", "Discipleship", "Prayer", "Prophetic", "Learning", "Faithfulness"].forEach((label) => {
  assert(timelineFilterSource.includes(`label: "${label}"`), `USA-272: the Timeline should filter by ${label}.`);
});
assert(timelineFilterSource.indexOf('label: "All"') < timelineFilterSource.indexOf('label: "Time with God"'), "USA-272: Timeline filters keep All first.");
/* The unified builder still carries every source type into one history. */
const timelineBuilderSource = client.slice(client.indexOf("function buildMyRecordTimeline"), client.indexOf("function myRecordMentorMeetingsForRelationship"));
["encounterItems", "mentorItems", "assessmentItems", "externalAssessmentItems", "propheticWordItems", "learningBookItems", "learningChapterItems", "lifePlanItems"].forEach((source) => {
  assert(timelineBuilderSource.includes(source), `USA-272: the Timeline should include ${source}.`);
});
assert(client.includes("myRecordEncounterFilters"), "USA-220: the encounter filter model is preserved.");
/* USA-272: Growth's contents were rehoused -- assigned resources onto
   Overview's "What I'm working on", assessments and learning onto My Life,
   and the People discipling me roster removed from the daily surface. These
   replace the USA-220 Growth-panel assertions. */
assert(!client.includes("function MyRecordGrowthPanel"), "USA-272: the Growth tab is retired.");
const myLifePanelSource = client.slice(client.indexOf("function MyRecordMyLifePanel"), client.indexOf("function MyRecordSheetContent"));
assert(myLifePanelSource.indexOf('title="Purpose"') < myLifePanelSource.indexOf('title="Prophetic Words"'), "USA-272: My Life leads with Purpose.");
assert(myLifePanelSource.indexOf('title="Prophetic Words"') < myLifePanelSource.indexOf("title=\"God's Faithfulness\""), "USA-272: Prophetic Words precedes God's Faithfulness.");
assert(myLifePanelSource.indexOf("title=\"God's Faithfulness\"") < myLifePanelSource.indexOf('title="Assessments"'), "USA-272: God's Faithfulness precedes Assessments.");
assert(myLifePanelSource.indexOf('title="Assessments"') < myLifePanelSource.indexOf('title="Learning"'), "USA-272: Assessments precedes Learning.");
assert(myLifePanelSource.includes('title="People Discipling Me"'), "USA-272: My Life carries the retained People Discipling Me management section.");
/* My Life is who this person is before God -- never a contact or relationship
   form, and never a speculative placeholder. */
["Phone", "Email", "Address", "Birthday", "Relationship Type", "Circle"].forEach((label) => {
  assert(!myLifePanelSource.includes(`title="${label}"`), `USA-272: My Life must not carry the ${label} contact/relationship section.`);
});
assert(!myLifePanelSource.includes("Coming Soon") && !myLifePanelSource.includes("Mission Direction") && !myLifePanelSource.includes("Year in Review"), "USA-272: the speculative Coming Soon placeholders are gone from the daily experience.");
assert(myLifePanelSource.includes("God's Faithfulness"), "USA-272: God's Faithfulness keeps its full label.");
/* Purpose keeps the word(s) of the year, the calling and the Life Plan with
   its filters, priorities, reminder and saved privacy setting. */
assert(myLifePanelSource.includes("myRecordDefaultWordsOfYear") && myLifePanelSource.includes("myRecordWordsOfYearScripture"), "USA-272: Purpose keeps the Word(s) of the Year.");
assert(myLifePanelSource.includes('lifePlan.decisionFilters.length') && myLifePanelSource.includes('lifePlan.topPriorities.length') && myLifePanelSource.includes('lifePlan.visibility === "private"'), "USA-272: Purpose shows the Life Plan's filters, priorities and saved privacy setting.");
assert(myLifePanelSource.includes('name="current_season_focus"'), "USA-272: the record's own saved focus note stays editable.");
assert(!myLifePanelSource.includes("Add External Result") && !myLifePanelSource.includes("+ New"), "USA-272: creation is not duplicated with ad-hoc section buttons.");
assert(client.includes("<MyRecordActionButton onClick={() => onOpenSheet({ kind: \"mentor_meeting\", mentor, mode: \"new\" })} tone=\"blue\">Log Meeting</MyRecordActionButton>"), "USA-272: the relationship detail still exposes Log Meeting, so no management capability was lost with the roster.");
assert(client.includes("| { kind: \"mentor_meeting\"; meeting?: DosAppUserMentorMeeting | null; mentor?: DosAppUserMentorRelationship | null; mode: MyRecordSheetMode }"), "Mentor meeting sheets should carry optional selected mentor context.");
/* USA-265 (founder, 2026-09-10): Log Discipleship Meeting was cumbersome. It
   asks who discipled you once (shown, not asked, when the meeting or the
   relationship already says), links the Person through the relationship rather
   than a separate Field Contact, uses Log Meeting's date and duration
   controls, and keeps one Notes field while preserving text saved in the
   earlier separate fields. These replace the saved-mentor / Field Contact
   assertions. */
const mentorMeetingFormSource = client
  .slice(client.indexOf("function MyRecordMentorMeetingForm("), client.indexOf("function MyRecordPropheticWordForm("))
  .replace(/\/\*[\s\S]*?\*\//g, "");
assert(mentorMeetingFormSource.includes("const fixedMentor = meeting?.relationshipId"), "USA-265: a meeting's or relationship's person is shown, not asked again.");
assert(mentorMeetingFormSource.includes("value: `relationship:${candidate.id}`") && mentorMeetingFormSource.includes("value: `person:${person.id}`") && mentorMeetingFormSource.includes('person.roleInMyLife === "mentoring_me"'), "USA-265: one who-discipled-you choice covers saved relationships and People marked as discipling me.");
assert(!mentorMeetingFormSource.includes("Field Contact") && !mentorMeetingFormSource.includes('name="field_person_id"'), "USA-265: no separate Field Contact.");
assert(mentorMeetingFormSource.includes('options={who ? whoOptions : [{ label: "Choose who discipled you", value: "" }, ...whoOptions]}') && mentorMeetingFormSource.includes("disabled={isSubmitting || (!fixedMentor && !who)}"), "USA-265: an unchosen person reads as a placeholder, never as the first person, and cannot be submitted.");
assert(mentorMeetingFormSource.includes("<MeetingDurationSelector") && mentorMeetingFormSource.includes('<DosDateInput ariaLabel="Date"'), "USA-265: date and duration match Log Meeting.");
assert((mentorMeetingFormSource.match(/<VoiceTextarea/g) ?? []).length === 2 && mentorMeetingFormSource.includes('name="notes"') && mentorMeetingFormSource.includes("legacyFields.map"), "USA-265: one Notes field; earlier separate-field text renders only when it exists, so saving keeps it.");
assert(client.includes("Meeting Rhythm") && client.includes("2x/week"), "The discipling relationship should capture frequent meeting rhythm.");
assert(client.includes("mentorEmail") && client.includes("mentorPhone") && client.includes("meetingRhythm"), "Add Mentor should submit mentor contact and rhythm fields.");
assert(loader.includes("mentor_email") && loader.includes("mentor_phone") && loader.includes("meeting_rhythm"), "Loader should hydrate mentor contact and rhythm fields.");
assert(route.includes("mentor_email") && route.includes("mentor_phone") && route.includes("meeting_rhythm"), "My Record route should persist mentor contact and rhythm fields.");
assert(route.includes("selectedRelationshipId = asString(payload.relationshipId)"), "Mentor meeting API should read the saved mentor relationship from the payload.");
assert(route.includes("A discipleship meeting requires a saved person or a name."), "Discipleship meeting API should return a clear validation error when no person is provided.");
assert(route.includes(".from(\"dos_user_mentor_meetings\")") && route.includes(".insert({") && route.includes(".update(mentorMeetingPayload)"), "Mentor meeting API should support create and edit saves.");
assert(route.includes(".select(\"id\")") && loader.includes(".from(\"dos_user_mentor_meetings\")") && loader.includes("relationship_id"), "Saved mentor meetings should reload from the private My Record loader.");
assert(route.includes("myRecordDatabaseErrorResponse(mentorMeetingId.id ? \"mentor meeting update\" : \"mentor meeting insert\""), "Mentor meeting database failures should return and log the real backend error.");
assert(client.includes("[My Record] Save request") && client.includes("[My Record] Save response") && client.includes("[My Record] Save failed"), "Client should log My Record request payloads, responses, statuses, and caught save exceptions.");
assert(route.includes("[My Record API] Request payload") && route.includes("[My Record API] Unexpected server error") && route.includes("[My Record API] Database error"), "API should log My Record payloads, caught exceptions, and database errors.");
assert(mentorProfileFieldsMigration.includes("add column if not exists mentor_email"), "Mentor profile migration should add mentor_email.");
assert(mentorProfileFieldsMigration.includes("add column if not exists mentor_phone"), "Mentor profile migration should add mentor_phone.");
assert(mentorProfileFieldsMigration.includes("add column if not exists meeting_rhythm"), "Mentor profile migration should add meeting_rhythm.");
assert(mentorProfileFieldsMigration.includes("Not public profile, Field, Table, Fruit, or circle metric data"), "Mentor profile fields should stay isolated from public and metrics data.");
/* USA-272: Purpose became a section of My Life. The Word(s) of the Year block
   and the Life Plan summary are asserted on My Life above; what remains here
   is that the underlying records and their editors are untouched. */
assert(!client.includes("function MyRecordCallingPanel"), "USA-272: the Purpose tab is retired.");
assert(client.includes("Word(s) of the year"), "USA-272: My Life still shows the Word(s) of the Year.");
assert(client.includes("function MyRecordLifePlanCard"), "Client should include a compact Life Plan summary card.");
assert(client.includes("typeLabel=\"Private\""), "Life Plan should render as a compact private preview row.");
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
/* USA-272: Faithfulness became a section of My Life, and the "Year in Review"
   Coming Soon card was removed from the daily experience with the founder's
   direction on speculative features. */
assert(!client.includes("function MyRecordLegacyPanel"), "USA-272: the Faithfulness tab is retired.");
/* Checked against the rendered source, so the comment recording why these
   were removed does not itself trip the assertion. */
const clientJsx = client.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
assert(!clientJsx.includes("Year in Review"), "USA-272: the Year in Review placeholder is gone.");
assert(!clientJsx.includes("Vision Timeline"), "USA-272: the Mission Direction / Vision Timeline placeholder is gone.");
assert(!clientJsx.includes('typeLabel="Coming Soon"'), "USA-272: no Coming Soon card is rendered in the daily My Record experience.");
["Family & Impact", "Ministry Meetings", "Fruit Observed", "People Ministered To"].forEach((label) => {
  assert(!myLifePanelSource.includes(label), `USA-272: God's Faithfulness must not carry the ${label} performance metric.`);
});
assert(myLifePanelSource.includes("Record answered prayers, blessings, provision and moments worth remembering."), "USA-272: the faithfulness empty state stays descriptive.");
assert(client.includes("kind: \"timeline\""), "Underlying My Record timeline drawer should remain available outside the Walk tab UI.");
assert(!client.includes("Family & Impact"), "Family & Impact should be removed from the Faithfulness tab UI.");
assert(!client.includes("label: \"Abide\""), "Abide should not be added as a left-nav or app-catalog item.");
assert(!client.includes("label: \"Prophetic Words\", type: \"moreApp\""), "Prophetic Words must not be added to the left nav.");
assert(client.includes("MyRecordReportPanel"), "My Record should include the personal reporting framework.");
const reportPanelOccurrences = client.match(/<MyRecordReportPanel fruit=\{fruit\} meetings=\{meetings\} people=\{people\} record=\{record\} \/>/g)?.length ?? 0;
assert(reportPanelOccurrences === 0, "Canonical My Record should remove the old inline report panel while preserving the reporting framework code.");
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
assert(!client.includes("+ data.myRecord.externalAssessmentResults.length"), "USA-272: external assessment results feed no surfaced count.");
assert(client.includes("Learning / Book Notes"), "V2 should include the Learning / Book Notes UI.");
assert(client.includes("Upload Highlight Image"), "Learning should support optional chapter highlight image uploads.");
assert(client.includes("Generate Summary from Highlights"), "Learning should expose the future AI summary placeholder CTA.");
assert(client.includes("Coming Soon"), "Learning AI summary CTA should be marked Coming Soon.");
/* Founder decision (USA-260 review): the non-functional "future sharing"
   checkbox and its promise are gone. Book notes are private until a real
   explicit-sharing feature exists; the stored value is carried through. */
assert(!client.includes("Eligible for future sharing"), "Learning must not promise a sharing feature that does not exist.");
assert(client.includes("Book notes are private."), "Learning states plainly that book notes are private.");
assert(client.includes("shareEligible: book?.shareEligible ?? false"), "A stored share flag is preserved, never rewritten by the form.");
assert(client.includes("Books Read"), "Learning should show a books read count.");
assert(client.includes("kind: \"learning_book\""), "Client should save Learning books through the private My Record API.");
assert(client.includes("kind: \"learning_chapter_note\""), "Client should save Learning chapter notes through the private My Record API.");
assert(!client.includes("+ data.myRecord.learningBooks.reduce"), "USA-272: learning data feeds no surfaced count.");
/* USA-272: My Record is not a person -- it never reaches the People count or
   circle membership. */
assert(client.includes("const peopleCountBadgeValue = peopleCircleView === \"all\" ? visibleCirclePeople.length : null;"), "USA-272: the People count is the list's own length, shown on All only.");
assert(client.includes("function PeopleCountBadge"), "USA-272: the count is a badge inside the names-list container.");
assert(client.includes('role="status"') && client.includes("in this list`"), "USA-272: the count is informational and labelled, not a button.");
assert(!client.includes("{visibleCirclePeople.length} {visibleCirclePeople.length === 1 ? \"person\" : \"people\"}"), "USA-272: the separate count line above the list is gone.");
assert(!client.includes("propheticWords.filter((word) => isMyRecordDateInRange"), "Prophetic words should not be added to reports in this pass.");
assert(!client.includes("label: \"External Assessments\", type: \"moreApp\""), "External assessments must not be added to the left nav.");
assert(!client.includes("label: \"Learning\", type: \"moreApp\""), "Learning must not be added to the left nav.");
assert(!client.includes("label: \"Life Plan\", type: \"moreApp\""), "Life Plan must not be added to the left nav.");
assert(client.includes("Future: Permission-based My Record sharing"), "Future sharing permissions TODO should stay explicit.");
assert(client.includes("Future: PDF exports and shareable report links"), "Future report export TODO should stay explicit.");
assert(client.includes("Future: Smart prompts and check-in drafts based on Field records, prior meetings, reminders, and accountability cadence."), "Future AI/check-in TODO should stay explicit.");

console.log("DOS My Record regression checks passed.");
