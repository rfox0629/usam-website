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
const route = readFileSync("app/api/dos/app/my-record/route.ts", "utf8");
const attachmentRoute = readFileSync("app/api/dos/app/my-record/attachments/route.ts", "utf8");
const learningAttachmentRoute = readFileSync("app/api/dos/app/my-record/learning/attachments/route.ts", "utf8");
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
assert(route.includes("asLearningHighlightImage"), "Route should validate private learning highlight image references.");
assert(route.includes("expectedPrefix = `workspaces/${workspaceId}/users/${userId}/learning/`;"), "Route should scope learning highlight images to the current user and workspace.");
assert(route.includes("My Record V2 is not enabled for this workspace."), "Route should reject Learning writes when V2 is disabled.");

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
assert(loader.includes("myRecord,"), "DosAppData should include myRecord.");
assert(loader.includes("assessmentResults"), "DosAppData My Record should include personal assessment results.");
assert(loader.includes("externalAssessmentResults"), "DosAppData My Record should include private external assessment results.");
assert(loader.includes("learningBooks"), "DosAppData My Record should include private Learning books.");
assert(loader.includes("short_summary, status, share_eligible"), "Loader should read assessment library summary, status, and sharing fields.");
assert(loader.includes("createSignedUrl(result.attachment_path, 60 * 60)"), "Loader should create short-lived signed links for private report attachments.");
assert(loader.includes("createSignedUrl(note.highlight_image_path, 60 * 60)"), "Loader should create short-lived signed links for private Learning highlight images.");
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
assert(client.includes("Start Quiet Time"), "Client should expose Start Quiet Time quick action.");
assert(client.includes("Log Prayer Time"), "Client should expose Log Prayer Time quick action.");
assert(client.includes("Add Journal Entry"), "Client should expose Add Journal Entry quick action.");
assert(client.includes("Log Mentor Meeting"), "Client should expose Log Mentor Meeting quick action.");
assert(client.includes("Take Assessment"), "Client should expose Take Assessment quick action.");
assert(client.includes("MyRecordSheetFrame"), "V2 should use drawers/sheets for My Record editing.");
assert(client.includes("MyRecordContextualFloatingActions"), "V2 should expose contextual My Record floating actions.");
assert(client.includes("Share Settings"), "My Record overview should expose Share Settings from the header.");
assert(client.includes("My Record is private."), "Share Settings should preserve the private-by-default sharing language.");
assert(client.includes("myRecordFutureSharingRoles.map"), "Share Settings should preserve future sharing roles.");
assert(client.includes("Today at a Glance"), "V2 overview should include the compact daily KPI cards.");
assert(client.includes("Word(s) of the Year"), "V2 Calling should show the Word(s) of the Year card.");
assert(client.includes("Discipline") && client.includes("Assignment"), "V2 should show Ryan's current words.");
assert(client.includes("מוּסָר") && client.includes("שְׁלִיחוּת"), "V2 should render Hebrew word details.");
assert(client.includes("God's Faithfulness"), "V2 Legacy should include God's Faithfulness.");
assert(client.includes("kind: \"prophetic_word\""), "Client should save prophetic words through the private My Record API.");
assert(client.includes("function MyRecordWalkWithGodPanel"), "V2 should group Journal, Prayer, Quiet Time, Scripture, and Timeline under Walk.");
assert(client.includes("function MyRecordGrowthPanel"), "V2 should group Assessments, Learning, and Mentors under Growth.");
assert(client.includes("function MyRecordCallingPanel"), "V2 should group Words, Prophetic Words, and Vision Timeline under Calling.");
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
assert(client.includes("Future: Permission-based My Record sharing"), "Future sharing permissions TODO should stay explicit.");
assert(client.includes("Future: PDF exports and shareable report links"), "Future report export TODO should stay explicit.");
assert(client.includes("Future: Smart prompts and check-in drafts based on Field records, prior meetings, reminders, and accountability cadence."), "Future AI/check-in TODO should stay explicit.");

console.log("DOS My Record regression checks passed.");
