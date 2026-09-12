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
/* USA-272 -- My Record within People (founder, 2026-09-12).

   My Record left the More launcher and became the third People action. The
   assertions below replace the USA-220 / USA-226 panel contract (Walk /
   Growth / Purpose / Faithfulness), which described a screen that no longer
   exists. Everything about the stored record -- its migrations, its API
   route, its loader and every form -- is unchanged, and those assertions are
   kept verbatim further down. */

// 1. My Record is a People view, not a More app.
assert(!client.includes('value: "my_record"'), "USA-272: My Record is no longer a More app view.");
assert(!/type MoreAppView = [^;]*"my_record"/.test(client), "USA-272: my_record is gone from the MoreAppView union.");
assert(!client.includes('const desktopMyRecordNavItem'), "USA-272: the desktop sidebar no longer carries a My Record item.");
assert(!/label: "My Record",\n\s+onClick: \(\) => openMoreApp/.test(client), "USA-272: My Record is not an Apps launcher tile.");
assert(client.includes("function normalizeMoreAppView"), "DOS should normalize More app view state before rendering nested app shells.");
assert(client.includes("const activeMoreAppView = activeTab === \"more\" ? normalizeMoreAppView(moreAppView) : null;"), "DOS should derive the rendered More shell from the normalized active More view.");
assert(client.includes("moreAppView={activeMoreAppView}"), "Desktop navigation should receive the same normalized More view used by the content shell.");
assert(client.includes("key={`more-${activeMoreAppView ?? \"apps\"}`"), "More app shell should remount when switching nested More views.");
assert(client.includes("activeMoreAppView === \"settings\""), "Settings should render only when the normalized More view is settings.");
const moreShellSource = client.slice(client.indexOf("{activeTab === \"more\" ? ("), client.indexOf("{showMobileFloatingActions ? ("));
assert(moreShellSource.includes("activeMoreAppView === \"settings\""), "More shell should render Settings from activeMoreAppView.");
/* The existing slice runs to the floating actions, so it reaches past the
   More shell and over the People overlays. Assert on the routing condition,
   which only the More shell could ever have carried. */
assert(!moreShellSource.includes('activeMoreAppView === "my_record"'), "USA-272: the More shell no longer routes to My Record.");
assert(!moreShellSource.includes("moreAppView === \"settings\""), "More shell should not render Settings from raw More view state.");

// 2. It opens over the People list, so People stays selected and Back is a
//    return: nothing in the open path touches the search, the circle filter
//    or the app scroll container.
assert(client.includes('{activeTab === "people" && isMyRecordOpen && !selectedPerson ? ('), "USA-272: My Record mounts as a People overlay, beside the Person overlay.");
const openMyRecordSource = client.slice(client.indexOf("function openMyRecordTab(tab: MyRecordTab) {"), client.indexOf("function closeMyRecord()"));
assert(openMyRecordSource.includes('setActiveTab("people");') && openMyRecordSource.includes("setIsMyRecordOpen(true);"), "USA-272: opening My Record selects People and opens the view.");
["setPeopleQuery", "setPeopleCircleView", "setShowSecondaryFieldPeople", "scrollAppToTop"].forEach((reset) => {
  assert(!openMyRecordSource.includes(reset), `USA-272: opening My Record must not reset ${reset} -- Back has to restore search, filters and scroll.`);
});
assert(client.includes("function closeMyRecord()") && client.includes("onBack={() => (reportsReturn ? backToReports() : closeMyRecord())}"), "USA-272: Back closes the overlay and uncovers the list beneath it, or returns to Reports when that is where the record was opened from (USA-268).");
assert(client.includes("setIsMyRecordOpen(false);"), "USA-272: leaving People, opening a Person or opening a More app closes My Record.");

// 3. "Where was I" survives a save's router.refresh(), and a session that was
//    inside More > My Record is carried to the new home rather than dropped.
assert(client.includes("myRecordOpen: boolean;"), "USA-272: the persisted view records whether My Record was open.");
assert(client.includes('myRecordOpen: activeTab === "people" && isMyRecordOpen,'), "USA-272: My Record's open state is persisted with the rest of the view.");
assert(client.includes('if (parsed.moreAppView === "my_record") {') && client.includes('return { activeTab: "people", moreAppView: null, myRecordOpen: true };'), "USA-272: an old persisted More > My Record session migrates to People > My Record.");

// 4. The People action row, and the count as a badge on the list itself.
const peopleTabSource = client.slice(client.indexOf('{activeTab === "people" ? ('), client.indexOf('{activeTab === "meetings" ? ('));
assert(peopleTabSource.includes('onClick={() => openMyRecordTab("overview")}') && peopleTabSource.includes("<span>My Record</span>"), "USA-272: People's action row opens My Record.");
assert(peopleTabSource.indexOf("<span>My Record</span>") < peopleTabSource.indexOf("<span>Household</span>"), "USA-272: the action row reads My Record, Household, Manage circles.");
assert(peopleTabSource.indexOf("<span>Household</span>") < peopleTabSource.indexOf("<span>Manage circles</span>"), "USA-272: the action row reads My Record, Household, Manage circles.");
assert(!/\{visibleCirclePeople\.length\} \{visibleCirclePeople\.length === 1 \? "person" : "people"\}/.test(peopleTabSource), "USA-272: the standalone count line above the list is gone.");
assert((peopleTabSource.match(/count=\{peopleCircleView === "all" \? visibleCirclePeople\.length : null\}/g) ?? []).length === 2, "USA-272: both the mobile and desktop lists get the count, and only for All.");
assert(client.includes("function PeopleListCountBadge"), "USA-272: one shared badge for both list containers.");
const countBadgeSource = client.slice(client.indexOf("function PeopleListCountBadge"), client.indexOf("function FieldPeopleList("));
assert(countBadgeSource.includes("rounded-full") && countBadgeSource.includes("bg-dos-blue100"), "USA-272: the count is a small pale-blue circular badge.");
assert(countBadgeSource.includes('aria-label={`${count} ${count === 1 ? "person" : "people"}`}'), "USA-272: the badge still says what the number means to a screen reader.");

// 5. Three views, with every retired section name folded onto one of them so
//    a saved tab, a deep link or a launch action still lands somewhere real.
assert(client.includes("function normalizeMyRecordTab"), "My Record tabs should normalize invalid/stale subtabs.");
assert(client.includes("const activeMyRecordTab = normalizeMyRecordTab(tab);"), "Invalid My Record subtabs should fall back to Overview inside My Record.");
assert(client.includes("if (tab !== activeMyRecordTab)"), "My Record should update stale parent tab state after falling back to Overview.");
const canonicalTabsSource = client.slice(client.indexOf("const myRecordTabs"), client.indexOf("function normalizeMyRecordTab"));
assert(canonicalTabsSource.includes('{ label: "Overview", value: "overview" }'), "USA-272: Overview is the first view.");
assert(canonicalTabsSource.includes('{ label: "Timeline", value: "timeline" }'), "USA-272: Timeline is the second view.");
assert(canonicalTabsSource.includes('{ label: "My Life", value: "my_life" }'), "USA-272: My Life is the third view.");
assert((canonicalTabsSource.match(/label: "/g) ?? []).length === 3, "USA-272: there are exactly three views.");
const aliasSource = client.slice(client.indexOf("const myRecordTabAliases"), client.indexOf("function normalizeMyRecordTab"));
["walk_with_god", "growth", "calling", "legacy", "journal", "prayer", "scripture", "mentors", "assessments", "learning", "prophetic_words"].forEach((retired) => {
  assert(new RegExp(`\\b${retired}: "(overview|my_life|timeline)"`).test(aliasSource), `USA-272: the retired ${retired} section must resolve to one of the three views.`);
});

// 6. My Record is built from the Person page's own composition.
const myRecordWorkspaceSource = client.slice(client.indexOf("function MyRecordWorkspace"), client.indexOf("function GrowthMilestoneRow"));
assert(myRecordWorkspaceSource.includes("dosPersonAtmosphereClassName") && myRecordWorkspaceSource.includes("absolute inset-0 overflow-y-auto px-4 pt-7"), "USA-272: My Record uses the Person overlay shell.");
assert(myRecordWorkspaceSource.includes("<Segmented") && !myRecordWorkspaceSource.includes("<PillRail"), "USA-272: three fixed views use the canonical Segmented control, as Person does.");
assert(myRecordWorkspaceSource.includes('className="mx-auto w-full max-w-[600px] pb-1 lg:mx-0 lg:max-w-[936px]"'), "USA-272: the rail mirrors Person's content geometry.");
assert(myRecordWorkspaceSource.includes('<article aria-label="My Record" className="mx-auto w-full max-w-[600px] lg:mx-0 lg:max-w-[936px]">'), "USA-272: the content column matches Person's.");
assert(myRecordWorkspaceSource.includes("{initials(recordDisplayName)}") && myRecordWorkspaceSource.includes('text-[25px] font-bold leading-[1.1] tracking-[-0.02em] text-dos-primary'), "USA-272: the identity header is Person's -- 52px avatar, 25px name, centred.");
assert(!myRecordWorkspaceSource.includes("<PageHeader"), "USA-272: the ← More page header is gone; the Person control row replaces it.");
assert(!myRecordWorkspaceSource.includes("<TabHero"), "My Record should not use the large TabHero card.");

// 7. Overview: the meeting pair first, then Time with God, current
//    commitments and personal prayer. No roster of people discipling me.
assert(client.includes("function MyRecordMeetingCards"), "USA-272: Overview leads with the Last / Upcoming meeting pair.");
const meetingCardsSource = client.slice(client.indexOf("function MyRecordMeetingCards"), client.indexOf("function MyRecordOverviewPanel"));
assert(meetingCardsSource.includes(">Last meeting<") && meetingCardsSource.includes(">Upcoming meeting<"), "USA-272: the pair is Last meeting and Upcoming meeting.");
assert(meetingCardsSource.includes("myRecordNextFollowUp(record)") && !meetingCardsSource.includes("new Date("), "USA-272: the upcoming meeting is a real saved follow-up date, never generated.");
const overviewPanelSource = client.slice(client.indexOf("function MyRecordOverviewPanel"), client.indexOf("type MyRecordTimelineFilter"));
assert(overviewPanelSource.indexOf("<MyRecordMeetingCards") < overviewPanelSource.indexOf("<MyRecordSurface>"), "USA-272: the meeting pair comes before the sectioned surface.");
["Time with God", "Current commitments", "Personal prayer"].forEach((label) => {
  assert(overviewPanelSource.includes(`label="${label}"`), `USA-272: Overview includes the ${label} section.`);
});
assert(!overviewPanelSource.includes("People Discipling Me") && !overviewPanelSource.includes("mentorRelationships"), "USA-272: Overview carries no roster of the people discipling me.");
assert(overviewPanelSource.includes("commitmentsEnabled") && overviewPanelSource.includes('commitment.status === "active"'), "USA-272: current commitments read my own canonical Accountability commitments, and only when the capability is on.");
assert(overviewPanelSource.includes('assignment.status !== "completed"') && overviewPanelSource.includes("draftAssessments"), "USA-272: current commitments still show what production treats as active (D10): open journeys and draft assessments.");
["Continue", "Start", "Check-in", "Pause", "Complete", "Edit dates"].forEach((action) => {
  assert(overviewPanelSource.includes(`>${action}</PDButton>`) || overviewPanelSource.includes(`{assignment.status === "paused" ? "Resume" : "${action}"}`), `USA-272: a journey keeps its ${action} action from the retired Growth panel.`);
});

// 8. Timeline: searchable, filtered, chronological.
const timelinePanelSource = client.slice(client.indexOf("function MyRecordTimelinePanel"), client.indexOf("function MyRecordMyLifePanel"));
assert(timelinePanelSource.includes("<SearchField") && timelinePanelSource.includes("<PillRail"), "USA-272: Timeline is searchable and filtered.");
assert(timelinePanelSource.includes("toLocaleDateString(\"en-US\", { month: \"long\", year: \"numeric\" })"), "USA-272: Timeline groups by month, as Person's Timeline does.");
assert(timelinePanelSource.includes("myRecordTimelineFilterOf(item.kind) !== filter"), "USA-272: the filter reads the record kind, so every kind is reachable.");
const timelineFiltersSource = client.slice(client.indexOf("const myRecordTimelineFilters"), client.indexOf("function myRecordTimelineFilterOf"));
assert(timelineFiltersSource.indexOf('{ label: "All", value: "all" }') === timelineFiltersSource.indexOf('{ label: "'), "USA-272: All is the first Timeline filter.");

// 9. My Life: one continuous sectioned container.
const myLifePanelSource = client.slice(client.indexOf("function MyRecordMyLifePanel"), client.indexOf("function MyRecordWorkspace"));
assert((myLifePanelSource.match(/<MyRecordSurface>/g) ?? []).length === 1, "USA-272: My Life is one continuous container, not a stack of cards.");
["Purpose", "Prophetic Words", "God's Faithfulness", "Assessments", "Learning"].forEach((label) => {
  assert(myLifePanelSource.includes(`label="${label}"`), `USA-272: My Life includes the ${label} section.`);
});
const myLifeOrder = ["Purpose", "Prophetic Words", "God's Faithfulness", "Assessments", "Learning"].map((label) => myLifePanelSource.indexOf(`label="${label}"`));
assert(myLifeOrder.every((position, index) => index === 0 || position > myLifeOrder[index - 1]), "USA-272: My Life reads Purpose, Prophetic Words, God's Faithfulness, Assessments, Learning.");
const surfaceSectionSource = client.slice(client.indexOf("function MyRecordSurfaceSection"), client.indexOf("function MyRecordSectionAction"));
assert(surfaceSectionSource.includes("border-b border-dos-rule py-3 last:border-b-0"), "USA-272: sections are hairline-separated inside the one container, as on a Person.");
assert(client.includes("function MyRecordSectionRow") && client.slice(client.indexOf("function MyRecordSectionRow"), client.indexOf("function MyRecordSectionEmpty")).includes("<PersonRecordRow"), "USA-272: rows are the Person record row, not a second row style.");

// 10. The retired panels are gone rather than left unreachable.
["MyRecordWalkWithGodPanel", "MyRecordGrowthPanel", "MyRecordCallingPanel", "MyRecordLegacyPanel"].forEach((panel) => {
  assert(!client.includes(panel), `USA-272: the retired ${panel} is removed, not left unreachable.`);
});

// 11. Unchanged behaviour that USA-272 must not disturb.
assert(client.includes("Time With God"), "Client should expose Time With God as the unified Walk entry concept.");
assert(client.includes("Prayer Encounter"), "Client should support explicit prayer-only encounters without rendering an empty Prayer card.");
assert(client.includes("Add Person Discipling Me"), "Client should expose the person discipling me as a distinct relationship action.");
assert(client.includes("Log Discipleship Meeting"), "Client should expose the discipleship meeting quick action.");
assert(client.includes("Take Assessment"), "Client should expose Take Assessment quick action.");
assert(client.includes("MyRecordSheetFrame"), "My Record editing stays in drawers/sheets.");
assert(client.includes("MyRecordContextualFloatingActions"), "My Record keeps its contextual floating actions.");
assert(client.includes("const suppressGlobalFabForMyRecord = activeTab === \"people\" && isMyRecordOpen;"), "USA-272: My Record still suppresses the global app FAB, now from its People view.");
assert(client.includes("&& !suppressGlobalFabForMyRecord"), "Global floating action visibility should honor the My Record FAB suppression guard.");
assert(client.includes("isOpen ? <X className=\"h-6 w-6\""), "My Record FAB should render one explicit close button when open.");
assert(client.includes("right-[max(1rem,calc((100vw-430px)/2+1rem))]"), "My Record FAB should use a shell-aware viewport inset on mobile.");
assert(!client.includes("myRecordFutureSharingRoles") && !client.includes("isShareSettingsOpen"), "USA-265: no header panel promises sharing that does not exist.");
assert(!client.includes("Today's Alignment"), "Home no longer renders Today's Alignment (USA-257).");
const myRecordFabSource = client.slice(client.indexOf("const myRecordFabItems"), client.indexOf("// TODO: Future: Permission-based My Record sharing"));
assert(myRecordFabSource.includes('label: "Time With God"'), "My Record FAB should keep one unified Time With God action.");
assert(myRecordFabSource.includes('label: "Add Person Discipling Me"'), "My Life FAB should own creation of a person discipling me.");
assert(myRecordFabSource.includes('label: "Log Discipleship Meeting"'), "My Record FAB should label the relationship meeting as a discipleship meeting.");
assert(myRecordFabSource.includes('label: "Add Assessment"'), "My Record FAB should label manual assessment-result entry as Add Assessment.");
assert(myRecordFabSource.includes('label: "Add Book"'), "My Life FAB should label private book creation as Add Book.");
assert(myRecordFabSource.includes('label: "Add Prophetic Word"'), "My Life FAB should own prophetic word creation.");
assert(myRecordFabSource.includes("label: \"Record God's Faithfulness\""), "My Life FAB should use one broad creation action.");
["Prayer Encounter", "Reflection", "Prophetic Word\"", "Answered Prayer", "Family Milestone", "Ministry Story", "Course", "Podcast"].forEach((label) => {
  assert(!myRecordFabSource.includes(`label: "${label}`) || label === "Prophetic Word\"", `My Record FAB should not offer ${label}.`);
});
assert(client.includes("type MyRecordRecordKind"), "Activity rows should classify records with one shared display kind.");
assert(client.includes("function MyRecordCompactRecordCard"), "The compact activity card pattern is still used by the record sheets.");
assert(client.includes("badge: myRecordRecordVisual(kind).label"), "Timeline items should carry the compact card badge label.");
const myRecordVisualSource = client.slice(client.indexOf("function myRecordRecordVisual"), client.indexOf("function MyRecordCompactRecordCard"));
["red-", "violet-", "orange-", "indigo-", "teal-"].forEach((accent) => {
  assert(!myRecordVisualSource.includes(accent), `My Record record visuals should not use ${accent} accent classes.`);
});
assert(client.includes("God's Faithfulness"), "My Life should include God's Faithfulness.");
assert(client.includes("kind: \"prophetic_word\""), "Client should save prophetic words through the private My Record API.");
assert(client.includes("type MyRecordEncounter"), "Legacy journal and prayer rows stay normalized into one Encounter view model.");
assert(client.includes("function buildMyRecordEncounters"), "The unified Encounter list is still built for display.");
assert(client.includes("payloadKind=\"encounter\""), "The Encounter drawer should save through the encounter action.");
assert(client.includes("id: `encounter-journal-${entry.id}`"), "Journal-shaped Time With God records should appear as one encounter timeline item.");
assert(client.includes("id: `encounter-prayer-${log.id}`"), "Legacy prayer logs should render safely as prayer encounters.");
const encounterTitleSource = client.slice(client.indexOf("function myRecordEncounterTitleForEntry"), client.indexOf("function buildMyRecordEncounters"));
assert(!encounterTitleSource.includes("return entry.biblePassage"), "Scripture references should stay secondary metadata instead of becoming the Encounter title.");
assert(client.includes("function myRecordEncounterMeta"), "Encounter cards should expose Scripture and duration as secondary metadata.");

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
/* USA-272: the Purpose, Faithfulness, Assessments and Learning panels are
   gone; their content is in My Life, and their records still open the same
   sheets. What follows pins the content and the record contract, not the
   retired panels.

   Two deliberate removals, both of promises rather than capability, and both
   following the USA-260 / USA-265 precedent: the "Mission Direction",
   "Vision Timeline" and "Year in Review" Coming Soon placeholders announced
   features that do not exist, so they do not reappear in My Life. Everything
   a user had actually recorded is still rendered and still editable. */
assert(client.includes("Word(s) of the Year"), "USA-272: Word(s) of the Year is real content, so it moves into My Life's Purpose section.");
assert(client.includes("Discipline") && client.includes("Assignment"), "Word(s) of the Year keeps Ryan's current words.");
assert(client.includes("מוּסָר") && client.includes("שְׁלִיחוּת"), "Word(s) of the Year keeps its Hebrew detail.");
["Mission Direction", "Vision Timeline", "Year in Review"].forEach((placeholder) => {
  assert(!client.includes(placeholder), `USA-272: the ${placeholder} Coming Soon placeholder announced a feature that does not exist and is not carried forward.`);
});

// Life Plan: unchanged record, unchanged forms, now reached from My Life.
assert(client.includes("I am not called to pursue every opportunity. I am called to faithfully steward the vision God has entrusted to me."), "Life Plan should seed Ryan's calling statement from the supplied source text.");
assert(client.includes("Does this help us train, equip, multiply, or accelerate disciple-makers?"), "Life Plan should seed Ryan's decision filters.");
assert(client.includes("Create Systems that Multiply the Church"), "Life Plan should seed Ryan's Top 10 priorities.");
assert(client.includes("Protect the Culture and Calling"), "Life Plan should render the tenth priority.");
assert(client.includes("What I Want To Be Remembered For"), "Life Plan should render legacy / obituary notes fields.");
assert(client.includes("What I Want Jesus To Say"), "Life Plan should render the Jesus legacy note field.");
assert(client.includes("| { kind: \"life_plan\"; mode: MyRecordSheetMode; plan?: DosAppUserLifePlan | null }"), "Life Plan should use the existing drawer/sheet state.");
assert(client.includes("kind: \"life_plan\", mode: \"view\""), "Life Plan View should open in a drawer/sheet.");
assert(client.includes("Upload PDF") || client.includes("Original PDF"), "Life Plan should expose a private PDF upload area.");
assert(client.includes("Parse PDF into Life Plan - Coming Soon"), "Life Plan PDF parsing should remain a Coming Soon CTA.");
assert(client.includes("Private by default. Eligible for future Share Settings only when the user explicitly shares it."), "Life Plan should preserve private/default share language.");
assert(client.includes("id: `life-plan-${record.lifePlan.id}`"), "Saved Life Plans should appear in the private My Record timeline.");

assert(client.includes("kind: \"timeline\""), "The My Record timeline drawer stays available from Overview's View all.");
assert(!client.includes("label: \"Abide\""), "Abide should not be added as a left-nav or app-catalog item.");
assert(!client.includes("label: \"Prophetic Words\", type: \"moreApp\""), "Prophetic Words must not be added to the left nav.");
assert(client.includes("MyRecordReportPanel"), "My Record should include the personal reporting framework.");
const reportPanelOccurrences = client.match(/<MyRecordReportPanel fruit=\{fruit\} meetings=\{meetings\} people=\{people\} record=\{record\} \/>/g)?.length ?? 0;
assert(reportPanelOccurrences === 0, "Canonical My Record should remove the old inline report panel while preserving the reporting framework code.");

// Assessments: the seeded library, the external-result form and the record
// contract are unchanged; the section is now inside My Life.
assert(client.includes("MCode"), "Assessments should include Ryan's MCode result.");
assert(client.includes("Establish") && client.includes("Realize The Vision") && client.includes("Persuade"), "MCode seed should include Ryan's top motivations.");
assert(client.includes("Orchestrator") && client.includes("Driver") && client.includes("Optimizer"), "MCode seed should include Ryan's strongest dimensions.");
assert(client.includes("Gregoric Mind Styles"), "Assessments should include Ryan's Gregoric Mind Styles result.");
assert(client.includes("Concrete Random"), "Gregoric detail should use Ryan's Concrete Random label.");
assert(!client.includes("Gregorc Mind Styles"), "UI should use Gregoric spelling, not Gregorc.");
assert(client.includes("myRecordExternalAssessmentCategories"), "External assessment categories should still be listed.");
assert(client.includes("Personality & Wiring"), "Assessments should include Personality & Wiring grouping.");
assert(client.includes("Leadership"), "Assessments should include Leadership grouping.");
assert(client.includes("CliftonStrengths / StrengthsFinder"), "External assessment examples should include CliftonStrengths / StrengthsFinder.");
assert(client.includes("kind: \"external_assessment_result\""), "Client should save external results through the private My Record API.");
assert(client.includes("Upload Original Report"), "Assessment form should support optional original report uploads.");
assert(client.includes("View Original Report"), "Assessment detail should link to uploaded original reports when present.");
assert(client.includes("Short Summary"), "Assessment form should capture a mentor-friendly short summary.");
assert(client.includes("Eligible for future Share Settings"), "Assessment form should capture future share eligibility without sharing now.");
assert(client.includes("Do not copy questions, scoring systems, proprietary explanation tables, or copyrighted manuals."), "External assessment UI should prevent proprietary content copying.");
assert(client.includes("function MyRecordAssessmentDetailPanel"), "The assessment detail surface is unchanged and still reached from My Life.");

// Learning: the book and chapter-note forms and their record contract.
assert(client.includes("Upload Highlight Image"), "Learning should support optional chapter highlight image uploads.");
assert(!client.includes("Eligible for future sharing"), "Learning must not promise a sharing feature that does not exist.");
assert(client.includes("Book notes are private."), "Learning states plainly that book notes are private.");
assert(client.includes("shareEligible: book?.shareEligible ?? false"), "A stored share flag is preserved, never rewritten by the form.");
assert(client.includes("kind: \"learning_book\""), "Client should save Learning books through the private My Record API.");
assert(client.includes("kind: \"learning_chapter_note\""), "Client should save Learning chapter notes through the private My Record API.");
assert(!client.includes("propheticWords.filter((word) => isMyRecordDateInRange"), "Prophetic words should not be added to reports in this pass.");
assert(!client.includes("label: \"External Assessments\", type: \"moreApp\""), "External assessments must not be added to the left nav.");
assert(!client.includes("label: \"Learning\", type: \"moreApp\""), "Learning must not be added to the left nav.");
assert(!client.includes("label: \"Life Plan\", type: \"moreApp\""), "Life Plan must not be added to the left nav.");
assert(client.includes("Future: Permission-based My Record sharing"), "Future sharing permissions TODO should stay explicit.");
assert(client.includes("Future: PDF exports and shareable report links"), "Future report export TODO should stay explicit.");

assert(client.includes("Future: Smart prompts and check-in drafts based on Field records, prior meetings, reminders, and accountability cadence."), "Future AI/check-in TODO should stay explicit.");

console.log("DOS My Record regression checks passed.");
