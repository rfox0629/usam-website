import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function fail(message) {
  console.error(`DOS prayer UI regression failed: ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function assertIncludes(source, needle, message) {
  assert(source.includes(needle), message);
}

function assertNotIncludes(source, needle, message) {
  assert(!source.includes(needle), message);
}

function sliceBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);

  assert(startIndex >= 0, `Missing slice start: ${start}`);
  assert(endIndex > startIndex, `Missing slice end: ${end}`);

  return source.slice(startIndex, endIndex);
}

const client = read("app/dos/app/DosMvpAppClient.tsx");
const preview = read("app/dos/app/preview/page.tsx");
const prayerPartnerRoute = read("app/api/dos/app/prayer-partners/route.ts");
const prayerRoute = read("app/api/dos/app/prayer-requests/route.ts");
const profilePrayerLoader = read("src/lib/missionaries/prayer.ts");

const prayerTabs = sliceBetween(client, "const prayerWorkspaceTabs", "const prayerRequestFilterOptions");
assertIncludes(client, 'type PrayerWorkspaceTab = "answered" | "prayer_team" | "prayers"', "Prayer workspace must use the Prayers, Prayer Team, Answered tab model.");
assertIncludes(prayerTabs, '{ label: "Prayers", value: "prayers" }', "Prayer primary tabs must include Prayers.");
assertIncludes(prayerTabs, '{ label: "Prayer Team", value: "prayer_team" }', "Prayer primary tabs must include Prayer Team.");
assertIncludes(prayerTabs, '{ label: "Answered", value: "answered" }', "Prayer primary tabs must include Answered.");
['{ label: "Pray", value: "pray" }', '{ label: "People", value: "people" }', "Pray Today", "Group Prayers", "Person Prayers", "Answered Recently"].forEach((label) => {
  assertNotIncludes(prayerTabs, label, `Old primary prayer tab ${label} must not return.`);
});

const prayerFilters = sliceBetween(client, "const prayerRequestFilterOptions", "const myRecordTabs");
["High Priority", "Needs Follow-Up", "Group", "Public", "Private"].forEach((label) => {
  assertIncludes(prayerFilters, `label: "${label}"`, `Prayer filter ${label} must remain available when backed by data.`);
});

assertIncludes(client, "function PrayerRequestFilterControl", "Prayer filters must render behind a single compact Filter control.");
assertIncludes(client, "action={<PrayerRequestFilterControl", "Prayer filter control must sit in the request section header.");
assertNotIncludes(client, "PrayerRequestFilterPills", "Prayer must not render a persistent secondary filter chip row.");
assertIncludes(client, "sortPrayerRequestsForPray", "Pray tab must keep an intentional active-request sort.");
assertIncludes(client, "isPrayerRequestFollowUpDue(request)", "Needs Follow-Up must be based on due follow-up data.");

const prayerListSurface = sliceBetween(client, "function PrayerRequestFilterControl", "function AddPrayerPartnerSheet");
assertIncludes(prayerListSurface, "DesktopPrayerRequestRow", "Desktop Prayers must use a Field-style request row.");
assertIncludes(prayerListSurface, "DesktopPrayerPartnerRow", "Prayer Team must use compact partner rows.");
assertIncludes(prayerListSurface, "prayerRequestColumnContext", "Prayer rows must expose clear request context.");
assertNotIncludes(prayerListSurface, "PrayerLinkedPersonListRow", "Prayer Team must not include people merely linked to requests.");
assertNotIncludes(client, "prayerLinkedPersonRowsFromRequests", "Prayer Team must not derive rows from active prayer requests.");
assertIncludes(client, "High priority", "High priority must remain available as subtle text.");
assertIncludes(client, "Follow-up overdue", "Overdue follow-up state must remain visible in rows.");
assertIncludes(client, "Public", "Public visibility must remain identifiable in request rows.");
["PrayerRequestBadge", "amber", "yellow", "orange", "purple", "rose"].forEach((needle) => {
  assertNotIncludes(prayerListSurface, needle, `Prayer list surface must not use ${needle} styling or badge walls.`);
});

assertIncludes(client, 'columns={["Request", "Context", "Priority", "Follow-Up", "Visibility", "Status"]}', "Desktop Prayers must expose the approved column headings.");
assertIncludes(client, 'columns={["Prayer", "Context", "Answered Date", "Testimony", "Visibility"]}', "Answered tab must expose the approved archive headings.");
assertIncludes(client, 'columns={["Name", "Status", "Last Activity", "Relationship"]}', "Prayer Team must expose partner-list headings.");

const previewPrayerPartners = sliceBetween(preview, "prayerPartners: [", "prayerRequests,");
assertIncludes(previewPrayerPartners, 'name: "Brooke Fox"', "Brooke demo inclusion must come from an actual prayer partner record.");
assertNotIncludes(previewPrayerPartners, "Tim Tran", "Tim must not appear in Prayer Team without a prayer partner record.");
assertIncludes(preview, 'id: "demo-prayer-2three2-tim"', "Tim remains visible as prayer request context.");
assertIncludes(preview, 'linkedPersonIds: ["demo-person-tim-tran"]', "Tim request context must remain linked to the request, not Prayer Team.");

const mobilePrayerRender = sliceBetween(client, 'activeMoreAppView === "prayer"', 'activeMoreAppView === "fruit"');
assertIncludes(mobilePrayerRender, 'label: "Add Prayer Request"', "Prayer floating action menu must keep Add Prayer Request.");
assertIncludes(mobilePrayerRender, 'label: "Add Prayer Partner"', "Prayer floating action menu must keep Add Prayer Partner.");
assertNotIncludes(mobilePrayerRender, 'label: "Log Prayer"', "Prayer floating action menu must not reintroduce extra Log Prayer action.");

const prayerMobileSearch = sliceBetween(client, 'ariaLabel="Search prayer"', "<MobilePrayerWorkspace");
assertIncludes(prayerMobileSearch, "alwaysVisible", "Mobile Prayer search must stay visible.");
assertIncludes(prayerMobileSearch, 'placeholder="Search prayers"', "Mobile Prayer search must use the approved compact placeholder.");

const requestSheet = sliceBetween(client, "function AddPrayerRequestSheet", "function PrayerRequestDetailSheet");
assertIncludes(requestSheet, "PrayerRequestPersonPicker", "Add Prayer Request must support searching existing people.");
assertIncludes(requestSheet, "PrayerRequestGroupSelectField", "Add Prayer Request must support group context.");
assertIncludes(requestSheet, "followUpAt", "Add Prayer Request must preserve follow-up date input.");
assertIncludes(requestSheet, "priority", "Add Prayer Request must preserve priority input.");

const requestDetailSheet = sliceBetween(client, "function PrayerRequestDetailSheet", "function PrayerPartnerDetailSheet");
assertIncludes(requestDetailSheet, "PrayerRequestPersonPicker", "Prayer request detail must display and edit linked people.");
assertIncludes(requestDetailSheet, "onOpenPerson", "Prayer request detail must expose linked person navigation when available.");
assertIncludes(requestDetailSheet, "PrayerRequestGroupSelectField", "Prayer request detail must display and edit group context.");
assertIncludes(requestDetailSheet, "if (!isEditing)", "Prayer row click must open read-only detail before edit mode.");
assertIncludes(requestDetailSheet, 'title="Edit Prayer Request"', "Prayer edit form must stay behind explicit Edit.");
assertIncludes(requestDetailSheet, "Private Prayer Notes", "Prayer detail must clearly identify private prayer notes.");
assertIncludes(requestDetailSheet, "Log Prayer / Add Prayer Note", "Prayer detail must preserve private note logging.");
assertIncludes(requestDetailSheet, "Mark Answered", "Prayer request detail must preserve mark answered.");
assertIncludes(requestDetailSheet, "Archive", "Prayer request detail must preserve archive.");
assertIncludes(requestDetailSheet, "Delete", "Prayer request detail must preserve cleanup actions.");

assertIncludes(client, '{ label: "Prayer Team", value: "organization" }', "Prayer visibility must present organization scope as Prayer Team.");
assertIncludes(client, '{ label: "Public Profile", value: "public_profile" }', "Prayer visibility must keep the public profile publishing option.");
assertIncludes(prayerRoute, "linkedPersonIds", "Prayer API must accept linked people.");
assertIncludes(prayerRoute, "groupId", "Prayer API must accept group context.");
assertIncludes(prayerRoute, "followUpAt", "Prayer API must accept follow-up dates.");
assertIncludes(prayerRoute, "answerTestimony", "Prayer API must accept answer testimony.");
assertIncludes(prayerPartnerRoute, "This person is already on your prayer team. Open their record instead?", "Prayer partner API must keep the duplicate-friendly message.");
assertIncludes(prayerPartnerRoute, "findMatchingPrayerPartner", "Prayer partner API must keep centralized duplicate matching.");
assertIncludes(prayerPartnerRoute, "row.field_person_id === fieldPersonId", "Prayer partner API must dedupe linked field people.");
assertIncludes(prayerPartnerRoute, "normalizeEmail(row.email) === emailKey", "Prayer partner API must dedupe email matches.");
assertIncludes(prayerPartnerRoute, "normalizePhoneDigits(row.phone) === phoneKey", "Prayer partner API must dedupe phone matches.");
assertIncludes(prayerPartnerRoute, "resolveOrCreateWorkspacePersonForRole", "Prayer partner API must preserve the person-linking path.");

assertIncludes(profilePrayerLoader, "publicProfilePrayerVisibilities", "Public profile prayer loader must use explicit public visibility allowlist.");
assertNotIncludes(profilePrayerLoader, "prayer_logs", "Public profile prayer loader must not expose private prayer-log notes.");

console.log("DOS prayer UI regression passed.");
