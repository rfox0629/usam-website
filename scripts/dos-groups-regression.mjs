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

function assertNotIncludes(source, needle, message) {
  assert(!source.includes(needle), message);
}

const appClient = read("app/dos/app/DosMvpAppClient.tsx");
const preview = read("app/dos/app/preview/page.tsx");
const missionaryApp = read("src/lib/dos/missionary-app.ts");
const householdMemberPeople = read("src/lib/dos/household-member-people.ts");
const dosIdentity = read("src/lib/dos/identity.ts");
const groupSeeds = read("src/lib/dos/group-seeds.ts");
const groupsConfig = read("src/lib/dos/groups.ts");
const groupsV2RolloutDocs = read("docs/dos-groups-v2-rollout.md");
const migration = read("supabase/migrations/20260707034007_dos_private_groups.sql");
const groupsV2Migration = read("supabase/migrations/20260712235050_dos_groups_simplification_shared_leadership.sql");
const identityMigration = read("supabase/migrations/20260713022111_dos_identity_shared_leadership.sql");
const realWorkspaceSeedMigration = read("supabase/migrations/20260707171021_seed_ryan_dos_groups.sql");
const prayerMigration = read("supabase/migrations/20260707132434_dos_unified_prayer_context.sql");
const joinRequestsMigration = read("supabase/migrations/20260709160043_dos_group_join_requests.sql");
const prayerRoute = read("app/api/dos/app/prayer-requests/route.ts");
const groupMembersRoute = read("app/api/dos/app/groups/members/route.ts");
const groupCreateRoute = read("app/api/dos/app/groups/route.ts");
const groupJoinRequestsRoute = read("app/api/dos/app/groups/join-requests/route.ts");
const groupPendingRequestsRoute = read("app/api/dos/app/groups/pending-requests/route.ts");
const groupSettingsRoute = read("app/api/dos/app/groups/settings/route.ts");
const publicGroupActions = read("app/groups/actions.ts");
const publicGroupsDirectoryPage = read("app/groups/page.tsx");
const publicGroupPage = read("app/groups/[slug]/page.tsx");
const publicGroupPageTemplate = read("app/groups/PublicGroupPageTemplate.tsx");
const dosWorkspaceRoute = read("app/dos/[collectiveSlug]/page.tsx");
const dosAppCompatibilityRoute = read("app/dos/app/page.tsx");
const publicSingleGroupRoute = `${publicGroupPage}\n${publicGroupPageTemplate}`;
const groupDetailV2Source = appClient.slice(
  appClient.indexOf("function GroupDetailWorkspaceV2"),
  appClient.indexOf("function GroupOverviewTabV2"),
);
const groupOverviewV2Source = appClient.slice(
  appClient.indexOf("function GroupOverviewTabV2"),
  appClient.indexOf("function GroupOverviewNextGatheringCard"),
);
const groupGatheringsTabSource = appClient.slice(
  appClient.indexOf("function GroupGatheringsTab"),
  appClient.indexOf("function GroupAttendanceTab"),
);
const groupWorkflowBannerSource = appClient.slice(
  appClient.indexOf("function GroupGatheringWorkflowBanner"),
  appClient.indexOf("function GroupRouteBuilderPlaceholder"),
);
const validUuidFinalSegments = "[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const groupsV2BetaWorkspaceFixtures = [
  { alias: "fox-family", initiallyEnabled: true, label: "Ryan", slug: "ryan-fox" },
  { alias: "bond-family", initiallyEnabled: false, label: "Dirk", slug: "dirk-bond" },
];

for (const table of [
  "dos_groups",
  "dos_group_members",
  "dos_group_gatherings",
  "dos_group_attendance",
  "dos_group_resources",
]) {
  assertIncludes(
    migration,
    `create table if not exists public.${table}`,
    `Migration must create ${table}.`,
  );
  assertIncludes(
    migration,
    `alter table public.${table} enable row level security`,
    `Migration must enable RLS for ${table}.`,
  );
  assertIncludes(
    migration,
    `grant select, insert, update, delete on table public.${table} to authenticated`,
    `Migration must grant authenticated CRUD for ${table}.`,
  );
  assertIncludes(
    migration,
    `revoke all on table public.${table} from anon`,
    `Migration must keep anon access off ${table}.`,
  );
}

assert(
  !migration.includes("create table if not exists public.dos_group_prayer_requests"),
  "Groups migration must not create a parallel group prayer table.",
);

assertIncludes(
  migration,
  "linked_table_event_id uuid references public.missionary_tables(id)",
  "Group gatherings must be wired for future Table log links.",
);
assertIncludes(migration, "'2three2'", "Migration must seed the 2three2 group.");
assertIncludes(migration, "'2 Timothy 2:22'", "Migration must seed the verse anchor.");
assertIncludes(migration, "'Run. Pray. Pursue.'", "Migration must seed the group tagline.");
assertIncludes(
  migration,
  "ryan_leader_person_id",
  "Migration must resolve an existing Ryan person before assigning leadership.",
);
assertIncludes(
  migration,
  "public.missionary_field_people",
  "Group membership must link to existing Field person records.",
);
assertIncludes(realWorkspaceSeedMigration, "on conflict (workspace_id, slug)", "Ryan workspace seed must upsert groups idempotently.");
assertIncludes(realWorkspaceSeedMigration, "where slug in ('ryan-fox', 'ryan-brooke-fox')", "Ryan workspace seed must target the real DOS workspace slugs.");
assertIncludes(realWorkspaceSeedMigration, "public_slug = 'fox-family'", "Ryan workspace seed must tolerate the Fox public profile slug.");
assertIncludes(realWorkspaceSeedMigration, "'2three2'", "Ryan workspace seed must include 2three2.");
assertIncludes(realWorkspaceSeedMigration, "'tuesday-mens-group'", "Ryan workspace seed must include Tuesday Men's Group.");
assertIncludes(realWorkspaceSeedMigration, "'wednesday-mens-group'", "Ryan workspace seed must include Wednesday Men's Group.");
assertIncludes(realWorkspaceSeedMigration, "'private'", "Ryan workspace seed must keep groups private.");
assertIncludes(realWorkspaceSeedMigration, "ryan_leader_person_id", "Ryan workspace seed must resolve an existing Ryan person before assigning leadership.");
assertIncludes(realWorkspaceSeedMigration, "on conflict (group_id, person_id)", "Ryan workspace seed must not duplicate leader membership rows.");

assertIncludes(missionaryApp, "export type DosAppGroup", "DOS data model must export group data.");
assertIncludes(missionaryApp, "groups: DosAppGroup[]", "DOS app data must include groups.");
assertIncludes(missionaryApp, "ensureRyanDosWorkspaceGroups", "Real DOS workspace loader must run the Ryan groups seed path.");
assertIncludes(missionaryApp, "ensureDosViewerPerson", "DOS app data loader must prepare the signed-in user as a shared Field person.");
assertIncludes(missionaryApp, "resolveDosIdentityForWorkspace", "DOS app data loader must verify the signed-in user against the canonical DOS identity link.");
assertIncludes(householdMemberPeople, "export async function ensureDosViewerPerson", "DOS signed-in users must have a default shared Person upsert path.");
assertIncludes(householdMemberPeople, "export async function resolveDosViewerPerson", "DOS signed-in user person resolution must return the canonical Field person id for identity linking.");
assertIncludes(householdMemberPeople, "Default DOS user person", "Default DOS user person records must be traceable without creating separate Group people.");
assertIncludes(householdMemberPeople, "findExistingDosViewerPerson", "Default DOS user person creation must reuse existing people before inserting.");
assertIncludes(
  missionaryApp,
  "type DosAppWorkspaceRef",
  "DOS app data loader must accept the resolved active workspace identity.",
);
assertIncludes(
  missionaryApp,
  'query.eq("id", workspaceId)',
  "DOS app data loader must prefer the authorized workspace_id over slug fallback.",
);
assertIncludes(
  missionaryApp,
  "logEmptyGroupsLoad(workspace)",
  "Groups loader must log the resolved workspace when no groups load.",
);

assertIncludes(
  identityMigration,
  "create table if not exists public.dos_identity_links",
  "Identity migration must add the canonical auth user to Field person link table.",
);
assertIncludes(
  identityMigration,
  "verification_status in ('candidate', 'ambiguous', 'verified', 'rejected', 'revoked', 'inactive')",
  "Identity links must preserve inactive/revoked/ambiguous candidates instead of merging unsafely.",
);
assertIncludes(
  identityMigration,
  "dos_identity_links_verified_user_workspace_unique",
  "Each authenticated user must have at most one verified person per workspace.",
);
assertIncludes(
  identityMigration,
  "dos_identity_links_verified_person_unique",
  "Each Field person must resolve to at most one verified authenticated user.",
);
assertIncludes(
  identityMigration,
  "alter table public.dos_identity_links enable row level security",
  "Identity links must use RLS.",
);
assertIncludes(
  identityMigration,
  "grant select on table public.dos_identity_links to authenticated",
  "Authenticated users may read only their own identity links through RLS.",
);
assertIncludes(
  identityMigration,
  "private_dos.current_dos_identity_person_ids",
  "Database authorization must expose a verified identity-person resolver.",
);
assertIncludes(
  identityMigration,
  "private_dos.can_view_dos_group",
  "Database authorization must include group view checks based on verified identity.",
);
assertIncludes(
  identityMigration,
  "private_dos.can_manage_dos_group",
  "Database authorization must include group management checks based on verified identity.",
);
assert(
  !/create or replace function public\.(current_dos_identity_person_ids|can_view_dos_group|can_manage_dos_group)[\s\S]*?security definer/i.test(identityMigration),
  "Security definer group/identity helper functions must not live in the exposed public schema.",
);
assert(
  !groupsV2Migration.includes("create or replace function public.can_manage_dos_group"),
  "Groups V2 migration must not create a broad public workspace-level can_manage_dos_group helper.",
);
assertIncludes(
  identityMigration,
  "Workspace membership alone does not grant shared group management.",
  "Group management must not rely on broad workspace assumptions.",
);
assertIncludes(
  dosIdentity,
  "resolveDosIdentityForWorkspace",
  "Server identity helper must resolve authenticated DOS users to verified Field people.",
);
assertIncludes(
  dosIdentity,
  "recordAmbiguousIdentityCandidates",
  "Server identity helper must persist ambiguous candidates for manual verification.",
);
assertIncludes(
  dosIdentity,
  "onlyNameMatches",
  "Server identity helper must not auto-verify existing people using name-only matches.",
);
assertIncludes(
  dosIdentity,
  "loadDosGroupRoleAccess",
  "Server group auth helper must authorize by verified identity plus active group role.",
);
assertIncludes(
  dosIdentity,
  "loadDosSharedWorkspaceAccess",
  "Server identity helper must support filtered shared group workspace access without broad workspace membership.",
);
assertIncludes(
  missionaryApp,
  "workspaceId: workspace.id",
  "Empty groups debug logging must include the resolved workspace_id.",
);
assertIncludes(
  missionaryApp,
  "workspaceSlug: workspace.slug",
  "Empty groups debug logging must include the resolved workspace slug.",
);
assertIncludes(
  missionaryApp,
  "async function loadGroupsForWorkspace",
  "DOS loader must load groups for the active workspace.",
);
for (const table of [
  "dos_groups",
  "dos_group_members",
  "dos_group_gatherings",
  "dos_group_attendance",
  "dos_group_resources",
]) {
  assertIncludes(missionaryApp, `.from("${table}")`, `DOS loader must query ${table}.`);
}
assert(
  !missionaryApp.includes('.from("dos_group_prayer_requests")'),
  "DOS loader must source group prayers from prayer_requests, not dos_group_prayer_requests.",
);
assertIncludes(
  missionaryApp,
  'isMissingWorkflowTable(groupsResult.error, "dos_groups")',
  "Groups loader must preserve compatibility before migrations land.",
);
assertIncludes(
  missionaryApp,
  "linkedTableEventId",
  "DOS group gatherings must expose future Table log linkage.",
);
assertIncludes(groupSeeds, "export const ryanDosGroupSeeds", "Ryan DOS group seeds must live outside preview fixtures.");
assertIncludes(groupSeeds, "ensureRyanDosWorkspaceGroups", "Ryan DOS group seeds must expose a real workspace bootstrap helper.");
assertIncludes(groupSeeds, 'workspace.slug', "Ryan DOS group seed helper must inspect the real workspace slug.");
assertIncludes(groupSeeds, '"ryan-fox"', "Ryan DOS group seed helper must target /dos/ryan-fox.");
assertIncludes(groupSeeds, '"tuesday-mens-group"', "Ryan DOS group seed helper must include Tuesday Men's Group.");
assertIncludes(groupSeeds, '"wednesday-mens-group"', "Ryan DOS group seed helper must include Wednesday Men's Group.");
assertIncludes(groupSeeds, 'onConflict: "workspace_id,slug"', "Ryan DOS group seed helper must upsert by workspace and slug.");
assertIncludes(groupSeeds, "ignoreDuplicates: true", "Ryan DOS group seed helper must not overwrite edited group settings on reload.");
assertIncludes(groupSeeds, "missingSeeds", "Ryan DOS group seed helper must only insert missing bootstrap groups.");
assertIncludes(groupSeeds, 'onConflict: "group_id,person_id"', "Ryan DOS group seed helper must upsert leader membership.");
assertIncludes(groupSeeds, 'visibility: "private"', "Ryan DOS group seed helper must keep default visibility private.");
assertIncludes(
  dosWorkspaceRoute,
  "id: activeWorkspace.id",
  "/dos/[slug] must pass the resolved active workspace_id into DOS data loading.",
);
assertIncludes(
  dosWorkspaceRoute,
  "slug: activeWorkspace.slug",
  "/dos/[slug] must also pass the canonical resolved workspace slug into DOS data loading.",
);
assertIncludes(
  dosWorkspaceRoute,
  "loadDosAppData({",
  "/dos/ryan-fox must load DOS data from the resolved workspace object.",
);
assertIncludes(
  dosWorkspaceRoute,
  "loadDosSharedWorkspaceAccess",
  "/dos/[slug] must allow verified shared group members through a filtered access path.",
);
assertIncludes(
  dosWorkspaceRoute,
  "filterDosAppDataForSharedGroups",
  "Shared group route access must filter the DOS payload before rendering.",
);
assert(
  !dosWorkspaceRoute.includes("return {\n    ...data,"),
  "Shared group route access must explicitly rebuild DosAppData instead of spreading the private workspace payload.",
);
assertIncludes(
  dosWorkspaceRoute,
  "notes: null",
  "Shared group route access must strip private person notes from the filtered payload.",
);
assertIncludes(
  dosWorkspaceRoute,
  "myRecord: emptySharedGroupMyRecord(data.workspace.id)",
  "Shared group route access must not expose My Record data.",
);
assertIncludes(
  dosWorkspaceRoute,
  "organizations: []",
  "Shared group route access must not expose workspace organization records.",
);
assertIncludes(
  dosWorkspaceRoute,
  "usamApplication: emptySharedGroupUsamApplication(data.usamApplication)",
  "Shared group route access must not expose private USAM application metadata.",
);
assertIncludes(
  dosWorkspaceRoute,
  "group.prayerRequests.filter(isSharedGroupPrayerRequest)",
  "Shared group route access must hide private group prayer requests.",
);
assertIncludes(
  dosAppCompatibilityRoute,
  'const workspaceAccess = await getDosWorkspaceAccess(authorization, params.workspace)',
  "/dos/app?workspace=ryan-fox must resolve workspace access before canonical route loading.",
);
assertIncludes(
  dosAppCompatibilityRoute,
  "redirect(cleanWorkspacePath(workspaceAccess.workspace.slug, params))",
  "/dos/app?workspace=ryan-fox must normalize to the same canonical workspace route.",
);
assertIncludes(
  dosAppCompatibilityRoute,
  '"ryan-brooke-fox": "ryan-fox"',
  "Legacy Ryan workspace aliases must normalize to /dos/ryan-fox.",
);
assertIncludes(
  dosAppCompatibilityRoute,
  '"fox-family": "ryan-fox"',
  "Public Fox profile slug must normalize to /dos/ryan-fox.",
);

assertIncludes(appClient, '"groups"', "Groups must be available as a DOS app view.");
assertIncludes(appClient, 'label: "My Record"', "My Record must remain a separate desktop navigation item.");
assertIncludes(appClient, 'label: "Community"', "Community must appear under More as its own item.");
assertIncludes(appClient, 'const dosDesktopMoreLauncherAppLabels = ["Community", "Fruit", "Library", "Reports", "Stewardship", "Testimony Practice"] as const', "Community must remain registered in the desktop DOS Apps/More launcher manifest.");
assertIncludes(appClient, 'const dosMobileMoreLauncherAppLabels = ["My Record", "Field", "Prayer", "Community", "Fruit", "Library", "Reports", "Stewardship", "Testimony Practice"] as const', "Mobile More must include My Record, Field, Prayer, and the extended DOS app launcher items.");
assertIncludes(appClient, "dosDesktopMoreLauncherAppLabelSet.has(item.label)", "Desktop Apps launcher must filter through the desktop manifest instead of an ad hoc label list.");
assertIncludes(appClient, "dosMobileMoreLauncherAppLabelSet.has(item.label)", "Mobile Apps launcher must filter through the mobile manifest instead of an ad hoc label list.");
assertIncludes(appClient, 'data-dos-app-card={item.label}', "Apps launcher cards must expose a stable marker for production verification.");
assertIncludes(appClient, 'label: "Community"', "Community launcher card must be registered with the Community label.");
assertIncludes(appClient, 'onClick: () => openMoreApp("groups")', "Groups launcher card must open the Groups workspace.");
assertIncludes(appClient, 'const groupsLauncherCard = desktopAppCatalogItems.find((item) => item.label === "Community")', "Desktop launcher must explicitly verify the Community card registration.");
assertIncludes(appClient, 'const mobileGroupsLauncherCard = mobileAppCatalogItems.find((item) => item.label === "Community")', "Mobile launcher must explicitly verify the Community card registration.");
assert(
  !appClient.includes("Groups - My Record"),
  "Groups and My Record must not be combined into one navigation item.",
);
assertIncludes(appClient, "function GroupsWorkspace", "Groups list workspace must render.");
assertIncludes(appClient, "function GroupDetailWorkspace", "Groups detail workspace must render.");
assertIncludes(appClient, "function GroupsWorkspaceV2", "Groups V2 list workspace must render behind the feature flag.");
assertIncludes(appClient, "function GroupDetailWorkspaceV2", "Groups V2 detail workspace must render behind the feature flag.");
assertIncludes(appClient, "isSimplifiedV2", "Groups V2 must be gated instead of replacing legacy immediately.");
assertIncludes(appClient, "data.featureFlags.groupsSimplifiedV2 === true", "Groups V2 must be driven by the workspace feature flag.");
assertIncludes(missionaryApp, "groupsSimplifiedV2: featureFlagRows.some((flag) => flag.flag_key === dosGroupsSimplifiedFeatureFlag && flag.enabled === true)", "Groups V2 must be derived from feature-flag rows, not user-specific workspace code.");
assertIncludes(appClient, "groupV2DetailTabs", "Groups V2 must use its own simplified tab set.");
for (const tab of ["Overview", "People", "Gatherings", "Settings"]) {
  assertIncludes(appClient, `label: "${tab}"`, `Groups V2 must include ${tab} tab.`);
}
assertIncludes(appClient, "normalizeGroupV2Tab", "Invalid V2 group tabs must normalize safely.");
assertIncludes(groupDetailV2Source, "nextUpcomingGroupGathering(group)", "Groups V2 detail must use true upcoming gatherings instead of a past fallback.");
assertIncludes(groupDetailV2Source, "meetingActionLabel", "Groups V2 detail header must choose Start Meeting or Log Meeting from current gathering state.");
assertIncludes(groupDetailV2Source, 'label={meetingActionLabel}', "Groups V2 detail header must keep the meeting action primary.");
assertIncludes(groupDetailV2Source, 'label="Add Person"', "Groups V2 detail header must keep Add Person as a primary action.");
assertIncludes(groupDetailV2Source, 'label="More"', "Groups V2 detail header must collapse secondary actions into More.");
assertIncludes(groupDetailV2Source, 'label: "Edit Community"', "Groups V2 More menu must include Edit Community.");
assertIncludes(groupDetailV2Source, 'label: "Schedule"', "Groups V2 More menu must include Schedule.");
assertIncludes(groupDetailV2Source, 'label: "Copy Link"', "Groups V2 More menu must include Copy Link.");
assertIncludes(groupDetailV2Source, 'label: "Public Page"', "Groups V2 More menu must include Public Page.");
assertIncludes(groupDetailV2Source, 'label: "Archive"', "Groups V2 More menu must include authorized archive access.");
assertIncludes(groupDetailV2Source, "<GroupDetailTabBar", "Groups V2 tabs must render immediately after the compact group header.");
assertNotIncludes(groupDetailV2Source, "isRouteBuilderEligibleGroup(group) ? <GroupRouteBuilderPlaceholder", "Groups V2 must not render Route Builder as a standalone section above tabs.");
assertNotIncludes(groupDetailV2Source, 'tone={group.visibility === "private" ? "green" : "blue"}', "Groups V2 detail header must not show the old Workspace visibility badge.");
assertIncludes(groupOverviewV2Source, 'title="Status"', "Groups V2 Overview must be status-focused.");
assertIncludes(groupOverviewV2Source, "GroupOverviewNextGatheringCard", "Groups V2 Overview must include Next Gathering status.");
assertIncludes(groupOverviewV2Source, 'label="Members"', "Groups V2 Overview must include actual member count status.");
assertIncludes(groupOverviewV2Source, 'label="Pending Requests"', "Groups V2 Overview must include pending request status.");
assertIncludes(groupOverviewV2Source, 'label="Active Prayer"', "Groups V2 Overview must include active prayer status.");
assertIncludes(groupOverviewV2Source, 'label="Completed Gatherings"', "Groups V2 Overview must include completed gatherings status.");
assertIncludes(groupOverviewV2Source, 'label="Leaders"', "Groups V2 Overview must include leader status.");
assertNotIncludes(groupOverviewV2Source, "GroupQuickAction", "Groups V2 Overview must not repeat header actions.");
assertNotIncludes(groupOverviewV2Source, "onCopyPublicLink", "Groups V2 Overview must not own public link actions.");
assertIncludes(groupGatheringsTabSource, "nextUpcomingGroupGathering(group)", "Groups V2 Gatherings tab must scope contextual workflow to the true next gathering.");
assertIncludes(groupGatheringsTabSource, "nextGathering?.id === gathering.id", "Groups V2 Route Builder must attach to the next eligible gathering row.");
assertIncludes(groupGatheringsTabSource, '<GroupRouteBuilderPlaceholder className="mt-3" compact />', "Groups V2 Route Builder must render compactly inside Gatherings.");
assertNotIncludes(groupWorkflowBannerSource, "GroupRouteBuilderPlaceholder", "Groups Route Builder must not render above tabs or inside the standalone workflow banner.");
assertIncludes(appClient, "groupCapacitySettingLabel", "Groups V2 must keep capacity labeling in settings/editing contexts.");
assertIncludes(appClient, '["Capacity", groupCapacitySettingLabel(group.capacity)]', "Groups V2 Settings must show capacity as settings metadata.");
assertIncludes(appClient, '["Meeting link", "Gatherings can link to meeting logs"]', "Groups V2 Settings must use Meeting language for linked logs.");
assertNotIncludes(appClient, "No capacity set", "Groups UI must never show capacity text under People or Members.");
assertIncludes(appClient, "GroupCreateSheet", "Groups V2 must include a real New Community sheet.");
assertIncludes(appClient, "dosGroupCreationTemplates", "Group creation must be limited to approved templates.");
assertIncludes(appClient, "primaryLeaderPersonId", "Groups V2 must expose the primary leader concept.");
assertIncludes(appClient, "coLeaderPersonIds", "Groups V2 must support co-leaders.");
assertIncludes(appClient, "helperPersonIds", "Groups V2 must support helpers.");
assertIncludes(appClient, "sharedLeadershipEnabled", "Groups V2 must expose shared leadership metadata.");
assertIncludes(appClient, "const [role, setRole]", "Add Person must keep role state.");
assertIncludes(appClient, "role,", "Add Person must carry a role through the UI payload.");
assertIncludes(appClient, "My Community", "Private DOS Community must include My Community.");
assertIncludes(appClient, "All Community", "Private DOS Community must include All Community.");
assertIncludes(appClient, "GroupsSearchInput", "Private DOS Groups must include search.");
assertIncludes(appClient, "New Community", "Private DOS Community must expose New Community.");
assertIncludes(appClient, "Copy Public Directory Link", "Private DOS Groups must expose public directory copy without becoming the public directory.");
assertIncludes(appClient, "onCopyPublicDirectoryLink", "Private DOS Groups must wire public directory link copying.");
assertIncludes(appClient, "xl:grid-cols-[minmax(28rem,1fr)_minmax(22rem,auto)]", "Desktop group detail header must preserve a sensible text column width.");
assertIncludes(appClient, "max-w-4xl", "Group detail title and scripture column must use the available width instead of collapsing.");
assertIncludes(appClient, "whitespace-normal text-sm leading-6", "Group scripture text must render as normal paragraph copy.");
assertIncludes(appClient, "hidden min-w-0 flex-wrap gap-2 md:flex xl:justify-end", "Desktop group detail actions must wrap without squeezing the title column.");
assertIncludes(appClient, "More Actions", "Mobile group detail must move secondary actions into a compact More Actions sheet.");
assertIncludes(appClient, "isMobileActionSheetOpen", "Mobile group detail must keep secondary actions out of the crowded header.");
assertIncludes(appClient, "runMobileAction", "Mobile group secondary actions must close the sheet before running.");
assertIncludes(appClient, "inline-flex min-h-10 shrink-0", "Group detail action buttons must wrap as whole buttons instead of shrinking text.");
assertIncludes(appClient, "md:grid-cols-4", "Group metadata row must use four equal desktop columns.");
assertIncludes(appClient, "title={value}", "Group metadata chips must truncate with a readable title fallback.");
assertIncludes(appClient, "overflow-x-auto px-1 pb-1", "Group detail tabs must stay horizontally scrollable on narrow screens.");
assertIncludes(appClient, "grid grid-cols-2 gap-2 md:mt-4 md:grid-cols-3", "Today's Gathering workflow metrics must be compact on mobile.");
assertIncludes(appClient, "pb-32 md:space-y-4 md:pb-4", "Group detail must keep mobile bottom navigation from covering content.");
assertIncludes(appClient, "xl:grid-cols-2 xl:items-start", "Group overview must use a two-column desktop dashboard layout.");
assertIncludes(appClient, "GroupMobileSummaryCard", "Mobile group overview must use compact summary cards instead of the full desktop dashboard.");
assertIncludes(appClient, "Upcoming Discipleship Rhythms", "Mobile group overview must summarize upcoming rhythms.");
for (const tab of [
  "Overview",
  "Members",
  "Gatherings",
  "Attendance",
  "Prayer",
  "Resources",
  "Settings",
]) {
  assertIncludes(appClient, `label: "${tab}"`, `Group detail must include ${tab} tab.`);
}
assertIncludes(appClient, "Discipleship happens in rhythms.", "Groups intro must use the cross-group hero title.");
assertIncludes(appClient, "Build consistent rhythms of discipleship through weekly gatherings, prayer, accountability, and community.", "Groups intro must use the cross-group hero description.");
assertIncludes(appClient, "Featured Community", "Groups intro must label the featured community section.");
assertIncludes(appClient, "Log Meeting", "Group detail must expose Log Meeting.");
assertIncludes(appClient, "Start Gathering", "Group detail must expose Start Gathering.");
assertIncludes(appClient, "GroupInviteSheet", "Group Invite must open a real add-member sheet.");
assertIncludes(appClient, "Add to Community", "Group Invite must label the action as Add to Community.");
assertIncludes(appClient, 'label: "Add to Community"', "Group detail action must be renamed Add to Community.");
assertIncludes(appClient, "Pending Requests", "Private DOS Groups members tab must show pending public join requests.");
assertIncludes(appClient, "/api/dos/app/groups/join-requests", "Private DOS Groups must load pending requests through the authenticated review API.");
assertIncludes(appClient, "reviewJoinRequest", "Private DOS Groups must let leaders review pending group requests.");
assertIncludes(appClient, "onJoinRequestAccepted", "Accepted public join requests must update private group membership locally.");
assertIncludes(appClient, "Copy Public Link", "Group detail and cards must expose a public link copy action.");
assertIncludes(appClient, "View Public Page", "Group detail and cards must expose View Public Page.");
assertIncludes(appClient, "copyPublicGroupLink", "Group detail must wire public group link copying.");
assertIncludes(appClient, "/api/dos/app/groups/members", "Group Invite must call the member API route.");
assertIncludes(appClient, "groupMemberAdditions", "Group Invite must update group members locally after adding.");
assertIncludes(appClient, "setGroupDetailTab(\"members\")", "Group Invite success must switch to Members.");
assertIncludes(appClient, "GroupSettingsSheet", "Group Settings must open an edit sheet.");
assertIncludes(appClient, "Edit Community", "Group Settings must expose Edit Community.");
assertIncludes(appClient, "/api/dos/app/groups/settings", "Group Settings must call the settings API route.");
assertIncludes(appClient, "Apply location changes to future scheduled gatherings", "Group Settings must use an inline future gathering location checkbox.");
assertIncludes(appClient, "Archive community", "Group Settings must archive instead of hard delete.");
assertIncludes(appClient, "Public-shareable", "Group Settings must expose public-shareable visibility copy.");
assertIncludes(appClient, "type GroupRhythmSlot", "Group Settings must support multiple weekly rhythm rows.");
assertIncludes(appClient, "formatGroupRhythmLabel", "Group Settings must generate the rhythm label from selected days and times.");
assertIncludes(appClient, "groupTimeOptions", "Group Settings time controls must use selectable time options.");
assertIncludes(appClient, "Add day", "Group Settings must allow adding another weekly day.");
assertIncludes(appClient, "Selecting days and times updates the rhythm label.", "Group Settings must explain the automatic rhythm label behavior.");
assertIncludes(appClient, "groupSettingsLeaderPersonId", "Group Settings must resolve the leader selector to a real Field person id.");
assertIncludes(appClient, "people.filter((person) => isPersistedUuid(person.id))", "Group Settings leader options must avoid fallback non-UUID person ids.");
assertIncludes(appClient, "group.leaderPersonId && isPersistedUuid(group.leaderPersonId) && !peopleById.has(group.leaderPersonId)", "Group Settings leader options must include the existing leader fallback.");
assert(
  !appClient.includes("Invite will be wired after group management is ready."),
  "Group Invite placeholder copy must be removed.",
);
assertIncludes(appClient, "● Gathering In Progress", "Active gathering state must be visible.");
assertIncludes(appClient, "Attendance Progress", "Active gathering state must show attendance progress.");
assertIncludes(appClient, "activeGroupMembers(group)", "Attendance progress must ignore removed/deactivated group memberships.");
assertIncludes(appClient, "member.status === \"active\"", "Attendance progress must count only active group members.");
assertIncludes(appClient, "End Gathering Wizard", "Groups must include the end gathering wizard.");
assertIncludes(appClient, "Prayer Requests", "End gathering wizard must include prayer requests.");
assertIncludes(appClient, "What happened today?", "End gathering wizard must include the Fruit step prompt.");
assertIncludes(appClient, "Gospel conversation", "End gathering wizard must include fruit options.");
assertIncludes(appClient, "Create Follow-Up", "End gathering wizard must include follow-up creation.");
assertIncludes(appClient, "Complete Gathering", "End gathering wizard must include completion action.");
assertIncludes(appClient, "Gathering Completed", "End gathering wizard must include completion success state.");
assertIncludes(appClient, "Attendance Recorded", "Completion success state must confirm attendance.");
assertIncludes(appClient, "Prayer Updated", "Completion success state must confirm prayer.");
assertIncludes(appClient, "Fruit Recorded", "Completion success state must confirm fruit.");
assertIncludes(appClient, "Meeting Logged", "Completion success state must confirm meeting logging.");
assertIncludes(appClient, "Create Person after gathering", "Guest attendance must support creating People later.");
assertIncludes(appClient, "Attendance Trend", "Group dashboard must include attendance trend.");
assertIncludes(appClient, "Recent Prayer Requests", "Group dashboard must include recent prayer requests.");
assertIncludes(appClient, "Recent Fruit", "Group dashboard must include recent fruit.");
assertIncludes(appClient, "Recent Activity", "Group dashboard must include recent activity.");
assertIncludes(appClient, "Upcoming Follow Ups", "Group dashboard must include upcoming follow-ups.");
assertIncludes(appClient, "Community Health", "Group dashboard must include a health snapshot with Community copy.");
assertIncludes(appClient, "Momentum", "Community health must include momentum.");
assertIncludes(appClient, "No attendance has been recorded yet.", "Attendance empty state must use the polished title.");
assertIncludes(appClient, "Record attendance after your next gathering.", "Attendance empty state must use the polished body.");
assertIncludes(appClient, "No active prayer requests.", "Prayer empty state must use the polished title.");
assertIncludes(appClient, "Prayer requests added during gatherings will automatically appear here.", "Prayer empty state must use the polished body.");
assertIncludes(appClient, '{ label: "Prayers", value: "prayers" }', "Prayer app must include the Prayers tab.");
assertIncludes(appClient, '{ label: "Prayer Team", value: "prayer_team" }', "Prayer app must include the Prayer Team tab.");
assertIncludes(appClient, '{ label: "Answered", value: "answered" }', "Prayer app must include the Answered tab.");
assertIncludes(appClient, "prayerRequestFilterOptions", "Prayer app must keep old prayer categories as secondary filters.");
assertIncludes(appClient, '{ label: "High Priority", value: "high_priority" }', "Prayer app must include the High Priority filter.");
assertIncludes(appClient, '{ label: "Needs Follow-Up", value: "needs_follow_up" }', "Prayer app must include the Needs Follow-Up filter.");
assertIncludes(appClient, '{ label: "Group", value: "group" }', "Prayer app must include the Group filter.");
assertIncludes(
  appClient,
  'onLogAsTable={() => openForm("meeting")}',
  "Log Meeting should open the existing Table form instead of adding a new flow.",
);

assertIncludes(groupsConfig, 'dosGroupsSimplifiedFeatureFlag = "dos_groups_simplified_v2"', "Groups V2 feature flag key must be centralized.");
assertIncludes(groupsV2RolloutDocs, "dos_groups_simplified_v2", "Groups V2 rollout doc must use the canonical feature flag.");
assertIncludes(groupsV2RolloutDocs, "The implementation is shared for every DOS workspace", "Groups V2 rollout must document one shared implementation.");
assertIncludes(groupsV2RolloutDocs, "dirk-bond", "Groups V2 rollout doc must document the Dirk beta enablement path.");
assertIncludes(groupsV2RolloutDocs, "bond-family", "Groups V2 rollout doc must document Dirk's public workspace alias.");
assertIncludes(groupsV2RolloutDocs, "Do not create separate Ryan and Dirk Groups components, APIs, or schemas.", "Groups V2 rollout must reject separate user-specific forks.");
for (const fixture of groupsV2BetaWorkspaceFixtures) {
  assertIncludes(groupsV2RolloutDocs, fixture.slug, `Groups V2 rollout doc must cover ${fixture.label}'s canonical workspace slug.`);
  assertIncludes(groupsV2RolloutDocs, fixture.alias, `Groups V2 rollout doc must cover ${fixture.label}'s public workspace alias.`);
}
assertIncludes(groupsV2RolloutDocs, "Dirk workspace (`dirk-bond`, public alias `bond-family`): legacy Groups remains active.", "Dirk must remain legacy-only in the initial beta state.");
assertIncludes(groupsConfig, '"mens_discipleship"', "Approved templates must include Men's Discipleship Group.");
assertIncludes(groupsConfig, '"womens_discipleship"', "Approved templates must include Women's Discipleship Group.");
for (const activity of ["running", "walking", "hiking", "cycling", "fitness"]) {
  assertIncludes(groupsConfig, activity, `Approved 2three2 templates must include ${activity}.`);
}
for (const audience of ["men", "women", "coed"]) {
  assertIncludes(groupsConfig, audience, `Approved templates must include ${audience} audience.`);
}

for (const column of [
  "template_key",
  "template_category",
  "audience",
  "activity_type",
  "primary_leader_person_id",
  "capacity",
  "accepting_members",
  "shared_leadership_enabled",
  "settings",
]) {
  assertIncludes(groupsV2Migration, `add column if not exists ${column}`, `Groups V2 migration must add ${column}.`);
}
assertIncludes(groupsV2Migration, "create table if not exists public.dos_group_templates", "Groups V2 migration must create a template catalog.");
assertIncludes(groupsV2Migration, "alter table public.dos_group_templates enable row level security", "Groups V2 templates must have RLS.");
assertIncludes(groupsV2Migration, "revoke all on table public.dos_group_templates from anon", "Groups V2 templates must block anon access.");
assertIncludes(groupsV2Migration, "grant select on table public.dos_group_templates to authenticated", "Authenticated DOS users must be able to read templates.");
assertIncludes(groupsV2Migration, "to_regclass('public.ministry_events')", "Groups V2 migration must tolerate production environments where ministry_events has not been applied.");
assertIncludes(groupsV2Migration, "grant select, insert, update, delete on table public.dos_group_templates to service_role", "Service role must manage templates.");
assertIncludes(groupsV2Migration, "role in ('leader', 'co_leader', 'helper', 'member', 'guest')", "Groups V2 migration must add helper to shared leadership roles.");
assertIncludes(groupsV2Migration, "'dos_groups_simplified_v2'", "Groups V2 migration must seed the beta rollout flag.");
assertIncludes(groupsV2Migration, '"rollout_stage":"initial_beta"', "Groups V2 migration metadata must describe the initial beta rollout.");
assertIncludes(groupsV2Migration, '"next_step":"enable_dirk_via_dos_workspace_feature_flags"', "Groups V2 migration must document Dirk enablement as feature-flag configuration.");
assertIncludes(groupsV2Migration, "public_slug = 'fox-family'", "Groups V2 initial beta seed must target Ryan's canonical Fox Family workspace.");
assertIncludes(groupsV2Migration, "where workspace_id = initial_beta_workspace_id", "Groups V2 rollout must be workspace scoped.");
assert(
  !groupsV2Migration.includes("ryan_workspace_id"),
  "Groups V2 migration should use beta rollout naming rather than Ryan-specific gate naming.",
);
assertIncludes(groupsV2Migration, "ministry_event_id uuid references public.ministry_events(id)", "Group gatherings must only connect to ministry metrics through an explicit ministry event link.");
assertIncludes(groupsV2Migration, "do not affect Field, Fruit, Table, or Circle metrics until explicitly logged", "Migration comments must preserve metric boundaries.");
assert(
  !groupsV2Migration.includes("missionary_field_people.profile_id"),
  "Groups V2 migration must not rely on a non-existent missionary_field_people.profile_id auth mapping.",
);

assertIncludes(groupCreateRoute, "dosGroupsSimplifiedFeatureFlag", "New Group API must enforce the V2 feature flag.");
assertIncludes(groupCreateRoute, "Community is not enabled for this workspace.", "New Group API must 403 for flag-off workspaces with user-facing Community copy.");
assertIncludes(groupCreateRoute, "isDosGroupTemplateKey", "New Group API must reject unapproved templates.");
assert(!groupCreateRoute.toLowerCase().includes("ryan"), "New Group API must not contain Ryan-specific logic.");
assert(!groupCreateRoute.toLowerCase().includes("dirk"), "New Group API must not contain Dirk-specific logic.");
assertIncludes(groupCreateRoute, "primary_leader_person_id", "New Group API must persist primary leader.");
assertIncludes(groupCreateRoute, "role: \"co_leader\"", "New Group API must persist co-leaders.");
assertIncludes(groupCreateRoute, "role: \"helper\"", "New Group API must persist helpers.");
assertIncludes(groupMembersRoute, 'role === "helper"', "Group member API must accept helper role.");
assertIncludes(publicGroupsDirectoryPage, "Running Community", "Public community directory must avoid redundant 2three2 running labels.");
assertIncludes(publicSingleGroupRoute, "return `${publicGroupActivityLabel(group)} Community`", "Public community page must avoid redundant 2three2 running labels.");

assertIncludes(preview, 'const groups: DosAppData["groups"]', "DOS preview data must include groups.");
assertIncludes(preview, "groupsSimplifiedV2: false", "DOS preview must keep Groups V2 disabled unless explicitly enabled.");
assertIncludes(preview, "templateKey: \"2three2_running_men\"", "DOS preview group data must include V2 template metadata.");
assertIncludes(preview, 'process.env.DOS_DISABLE_DEMO_PREVIEW !== "true"', "DOS preview must stay token-available for production smoke checks unless explicitly disabled.");
assert(!preview.includes('process.env.VERCEL_ENV === "preview"'), "DOS preview must not disappear in production when the valid demo token is supplied.");
assertIncludes(preview, 'name: "2three2"', "DOS preview must render the featured 2three2 group.");
assertIncludes(preview, 'tagline: "Run. Pray. Pursue."', "DOS preview must seed the 2three2 tagline.");
assertIncludes(preview, "name: \"Tuesday Men's Group\"", "DOS preview must seed Tuesday Men's Group.");
assertIncludes(preview, "name: \"Wednesday Men's Group\"", "DOS preview must seed Wednesday Men's Group.");
assertIncludes(preview, 'tagline: "Grow together."', "DOS preview must seed Tuesday Men's Group tagline.");
assertIncludes(preview, 'tagline: "Brotherhood. Prayer. Discipleship."', "DOS preview must seed Wednesday Men's Group tagline.");
assertIncludes(preview, 'const prayerRequests: DosAppData["prayerRequests"]', "DOS preview must seed central prayer requests.");
assertIncludes(preview, 'groupId: "demo-group-2three2"', "DOS preview group prayer must use central groupId context.");

for (const column of [
  "group_id",
  "gathering_id",
  "meeting_id",
  "created_by_person_id",
  "created_by_user_id",
  "priority",
  "follow_up_at",
]) {
  assertIncludes(
    prayerMigration,
    `add column if not exists ${column}`,
    `Unified prayer migration must add ${column}.`,
  );
}
assertIncludes(
  prayerMigration,
  "visibility in ('private', 'group_members', 'group_leaders', 'organization', 'public_profile'",
  "Unified prayer migration must support private-first visibility values.",
);
assertIncludes(
  prayerMigration,
  "visibility = 'public_profile'",
  "Public prayer RLS must only expose public_profile visibility.",
);
assertIncludes(
  prayerMigration,
  "status = 'active'",
  "Public prayer RLS must only expose active public_profile requests.",
);
assertIncludes(prayerRoute, "groupId", "DOS prayer API must accept group context.");
assertIncludes(prayerRoute, "gatheringId", "DOS prayer API must accept gathering context.");
assertIncludes(prayerRoute, "meetingId", "DOS prayer API must accept meeting context.");
assertIncludes(prayerRoute, "priority", "DOS prayer API must accept priority.");
assertIncludes(groupMembersRoute, "loadDosGroupRoleAccess", "Group member API must be authenticated through canonical identity plus group role.");
assertIncludes(groupMembersRoute, validUuidFinalSegments, "Group member API must accept valid UUIDs with the final hyphenated segment.");
assertIncludes(groupMembersRoute, ".from(\"dos_group_members\")", "Group member API must write dos_group_members.");
assertIncludes(groupMembersRoute, ".eq(\"group_id\", groupId)", "Group member API must check existing group membership.");
assertIncludes(groupMembersRoute, ".eq(\"person_id\", person.id)", "Group member API must prevent duplicate memberships by person.");
assertIncludes(groupMembersRoute, ".from(\"missionary_field_people\")", "Group member API must create or link DOS person records.");
assertIncludes(groupMembersRoute, "alreadyMember", "Group member API must report duplicate-safe existing membership.");
assertIncludes(groupMembersRoute, "export async function DELETE", "Group member API must expose a private remove action.");
assertIncludes(groupMembersRoute, "status: \"removed\"", "Group member removal must deactivate membership instead of deleting data.");
assertIncludes(groupMembersRoute, "Change the group leader before removing this member.", "Group member removal must protect the current leader.");
assert(
  !groupMembersRoute.includes(".from(\"missionary_field_people\")\n    .delete"),
  "Group member removal must not delete the shared Person record.",
);
const groupJoinRequestAccessBlock = groupJoinRequestsRoute.slice(
  groupJoinRequestsRoute.indexOf("async function requireGroupRequestAccess"),
  groupJoinRequestsRoute.indexOf("async function findPossiblePersonMatches"),
);
assertIncludes(groupJoinRequestsRoute, "loadDosGroupRoleAccess", "Group join request API must authorize through canonical identity plus group role.");
assert(
  !groupJoinRequestAccessBlock.includes("missionary_field_people"),
  "Group join request access must not infer leadership from email/phone matched Field people.",
);
assertIncludes(groupJoinRequestsRoute, "\"leader\", \"co_leader\"", "Group join request API must restrict non-admin review to group leaders.");
assertIncludes(groupJoinRequestsRoute, ".from(\"dos_group_join_requests\")", "Group join request API must read and update pending join requests.");
assertIncludes(groupJoinRequestsRoute, ".eq(\"workspace_id\", workspaceId)", "Group join request API must scope requests to the active workspace.");
assertIncludes(groupJoinRequestsRoute, ".eq(\"group_id\", groupId)", "Group join request API must scope requests to the selected group.");
assertIncludes(groupJoinRequestsRoute, ".from(\"missionary_field_people\")", "Accepting a private join request must create or link the shared DOS Person record.");
assertIncludes(groupJoinRequestsRoute, ".from(\"dos_group_members\")", "Accepting a private join request must add the person to dos_group_members.");
assertIncludes(groupJoinRequestsRoute, "status: nextStatus", "Group join request API must close reviewed requests through status updates.");
assertIncludes(groupJoinRequestsRoute, "missingJoinRequestsTable", "Group join request API must fail softly before the migration lands.");
assertIncludes(groupJoinRequestsRoute, "possiblePersonMatches", "Pending requests must surface possible existing Person matches.");
assertIncludes(groupJoinRequestsRoute, "findPossiblePersonMatches", "Join request approval must inspect existing people before creating a Person.");
assertIncludes(groupJoinRequestsRoute, "Multiple possible people match this request", "Join request approval must require a leader choice when multiple matches exist.");
assertIncludes(groupJoinRequestsRoute, "selectedPersonId", "Join request approval must allow explicitly linking an existing Person.");
assertIncludes(groupJoinRequestsRoute, "createNewPerson", "Join request approval must allow an intentional create-new path.");
assertIncludes(groupMembersRoute, "loadDosGroupRoleAccess", "Group member API must authorize writes through canonical identity plus group role.");
assertIncludes(groupPendingRequestsRoute, "resolveDosIdentityForWorkspace", "Pending request counts must resolve the signed-in user through canonical DOS identity.");
assert(
  !groupPendingRequestsRoute.includes("requireDosWorkspaceRouteAccess"),
  "Pending request counts must not require broad workspace access for verified co-leaders.",
);
assertIncludes(groupSettingsRoute, "loadDosGroupRoleAccess", "Group settings API must authorize writes through canonical identity plus group role.");
assertIncludes(groupSettingsRoute, ".from(\"dos_groups\")", "Group settings API must update dos_groups.");
assertIncludes(groupSettingsRoute, "isUuid(groupId)", "Group settings API must tolerate legacy non-UUID client group identifiers.");
assertIncludes(groupSettingsRoute, validUuidFinalSegments, "Group settings API must accept valid UUIDs for group and leader ids.");
assertIncludes(groupSettingsRoute, ".eq(\"slug\", requestedSlug)", "Group settings API must fall back to workspace-scoped slug lookup.");
assertIncludes(groupSettingsRoute, "const resolvedGroupId = existingGroupResult.data.id", "Group settings API must normalize saves to the real group id.");
assertIncludes(groupSettingsRoute, ".neq(\"id\", resolvedGroupId)", "Group settings API must validate slug uniqueness excluding the resolved current group.");
assertIncludes(groupSettingsRoute, ".from(\"dos_group_gatherings\")", "Group settings API must update future gathering locations when confirmed.");
assertIncludes(groupSettingsRoute, ".from(\"dos_group_members\")", "Group settings API must update leader membership.");
assertIncludes(groupSettingsRoute, "return explicitRhythm || generated || null", "Group settings API must preserve the explicit generated multi-day rhythm label.");
assertIncludes(groupSettingsRoute, "leaderPersonId = existingGroupResult.data.leader_person_id ?? \"\"", "Group settings API must preserve the existing leader when stale UI submits a non-UUID fallback value.");
assertIncludes(groupSettingsRoute, "isCurrentGroupLeader", "Group settings API must allow the current valid leader to remain selected.");
assertIncludes(groupSettingsRoute, "existingLeaderMemberResult", "Group settings API must include existing leader/member records in validation.");
assertIncludes(appClient, "setSelectedGroupId(result.group.id)", "Group Settings must switch from a fallback identifier to the resolved group id after save.");
assertIncludes(appClient, "const resolvedGroupId = result.group.id || payload.groupId", "Group Settings must key local overrides by the resolved group id.");
assertIncludes(appClient, "Apply location changes to future scheduled gatherings", "Group Settings must use inline copy for future gathering location updates.");
assert(
  !appClient.includes("Update future scheduled gatherings with this location?"),
  "Group Settings must not trigger the old native confirm popup.",
);
assertIncludes(appClient, "possiblePersonMatches", "DOS Pending Requests must render possible existing Person matches.");
assertIncludes(appClient, "Accept & Link", "DOS Pending Requests must make matched-request approval explicit.");
assertIncludes(appClient, "onRemoveMember", "DOS group members tab must wire a private remove-member action.");
assertIncludes(appClient, "Remove Member", "DOS group members tab must show an inline remove confirmation.");
assertIncludes(appClient, "Their Person record stays in Field.", "DOS group member removal must explain that Person data is preserved.");
assertIncludes(groupSettingsRoute, "revalidatePath(\"/community\")", "Group Settings must revalidate the canonical public community directory after edits.");
assertIncludes(groupSettingsRoute, "revalidatePath(\"/groups\")", "Group Settings must keep revalidating the legacy public groups directory after edits.");
assertIncludes(groupSettingsRoute, "revalidatePath(`/community/${group.slug}`)", "Group Settings must revalidate the canonical public community page after edits.");
assertIncludes(groupSettingsRoute, "revalidatePath(`/groups/${group.slug}`)", "Group Settings must keep revalidating the legacy public group page after edits.");
assertIncludes(publicGroupPage, "2three2", "Public group route must render 2three2.");
assertIncludes(publicGroupPage, ".from(\"dos_groups\")", "Public group route must resolve from real group data.");
assertIncludes(publicGroupPage, ".eq(\"slug\", slug)", "Public group route must resolve groups by slug.");
assertIncludes(publicGroupPage, ".eq(\"active\", true)", "Public group route must only render active groups.");
assert(
  !publicGroupPage.includes(".eq(\"visibility\", \"workspace\")"),
  "Public group route must not 404 private DOS groups that are rendered through safe public fields.",
);
assert(
  !publicSingleGroupRoute.includes("dos_group_members"),
  "Public group route must not expose member data.",
);
assert(
  !publicSingleGroupRoute.includes("dos_group_attendance"),
  "Public group route must not expose attendance data.",
);
assert(
  !publicSingleGroupRoute.includes("prayer_requests"),
  "Public group route must not expose private prayer data.",
);
for (const privatePublicTerm of [
  "Members",
  "Attendance",
  "Settings",
  "Start Gathering",
  "Add to Community",
  "Log Meeting",
]) {
  assert(
    !publicSingleGroupRoute.includes(privatePublicTerm),
    `Public group route must not expose private admin term: ${privatePublicTerm}.`,
  );
}
assertIncludes(publicSingleGroupRoute, "PublicGroupHeader", "Public group route must present the minimal Community header.");
assertIncludes(publicSingleGroupRoute, "Next Gathering", "Public group route must include Next Gathering.");
assertIncludes(publicSingleGroupRoute, "Leaders", "Public group route must show group leaders.");
assertIncludes(publicSingleGroupRoute, "Request to Join", "Public group route must include Request to Join.");
assertIncludes(publicSingleGroupRoute, "Sign In", "Public group route must include Sign In.");
assertNotIncludes(publicSingleGroupRoute, "Manage in DOS", "Public Group Home must not expose DOS management actions.");
assertIncludes(publicSingleGroupRoute, "Request received. A community leader will follow up.", "Public group route must include the requested success state.");
assertIncludes(publicSingleGroupRoute, "submitGroupJoinRequest", "Public group route must submit the live join request action.");
assertIncludes(publicSingleGroupRoute, 'name="firstName"', "Public group join form must include First Name.");
assertIncludes(publicSingleGroupRoute, 'name="lastName"', "Public group join form must include Last Name.");
assertIncludes(publicSingleGroupRoute, 'name="email"', "Public group join form must include Email.");
assertIncludes(publicSingleGroupRoute, 'name="phone"', "Public group join form must include Phone.");
assertIncludes(publicSingleGroupRoute, 'name="message"', "Public group join form must include Message.");
assert(exists("public/images/usam/groups-share.png"), "Default Groups social share image must exist.");
assertIncludes(publicGroupsDirectoryPage, "Community | ${site.displayName}", "Public community directory metadata must use the resolved public site.");
assertIncludes(publicGroupsDirectoryPage, "Find discipleship communities connected to ${site.displayName}.", "Public community directory metadata must describe the resolved public site.");
assertIncludes(publicGroupsDirectoryPage, "/images/usam/groups-share.png", "Public groups directory must use the default Groups social image.");
assertIncludes(publicGroupsDirectoryPage, "summary_large_image", "Public groups directory must configure Twitter large image metadata.");
assertIncludes(publicGroupPage, "image_url", "Public group metadata must support a group-specific public image when present.");
assertIncludes(publicGroupPage, "groupShareImageUrl", "Public group metadata must normalize group share images.");
assertIncludes(publicGroupPage, "/images/usam/groups-share.png", "Public group metadata must fall back to the default Groups social image.");
assertIncludes(publicGroupPage, "summary_large_image", "Public group metadata must configure Twitter large image metadata.");
assert(
  !publicGroupsDirectoryPage.includes("the-table-source") && !publicGroupPage.includes("the-table-source"),
  "Public groups metadata must not point at the Table graphic.",
);
assertNotIncludes(publicGroupPageTemplate, "PrimaryNav", "Public group template must use the minimal Community header.");
assertIncludes(publicGroupPageTemplate, "PublicGroupHeader", "Public group template must render the minimal Community header.");
assertIncludes(publicGroupPageTemplate, "Powered by", "Public group template must render the minimal powered-by footer.");
assert(
  !publicGroupPageTemplate.includes("PublicGroupNav"),
  "Public group template must not use a custom group-specific header.",
);
assertIncludes(publicGroupsDirectoryPage, ".from(\"dos_groups\")", "Public groups directory must resolve from real group data.");
assertIncludes(publicGroupsDirectoryPage, ".eq(\"active\", true)", "Public groups directory must only list active groups.");
assertIncludes(publicGroupsDirectoryPage, "fallbackPublicDirectoryGroups", "Public groups directory must have safe local fallback data.");
assertIncludes(publicGroupsDirectoryPage, "publicGroupPath(group.slug, site)", "Public groups directory cards must link through the public-site base path.");
assertIncludes(publicGroupsDirectoryPage, "Powered by", "Public groups directory must include the powered-by footer.");
assert(
  !publicGroupsDirectoryPage.includes("dos_group_members"),
  "Public groups directory must not expose member data.",
);
assert(
  !publicGroupsDirectoryPage.includes("dos_group_attendance"),
  "Public groups directory must not expose attendance data.",
);
assert(
  !publicGroupsDirectoryPage.includes("prayer_requests"),
  "Public groups directory must not expose private prayer data.",
);
for (const privateDirectoryTerm of [
  "Members",
  "Attendance",
  "Settings",
  "Start Gathering",
  "Add to Community",
  "Log Meeting",
]) {
  assert(
    !publicGroupsDirectoryPage.includes(privateDirectoryTerm),
    `Public groups directory must not expose private admin term: ${privateDirectoryTerm}.`,
  );
}

assertIncludes(joinRequestsMigration, "create table if not exists public.dos_group_join_requests", "Join request migration must create pending group request storage.");
assertIncludes(joinRequestsMigration, "status text not null default 'pending'", "Join request migration must default requests to pending.");
assertIncludes(joinRequestsMigration, "source_type text not null default 'group_join_request'", "Join request migration must store source_type.");
assertIncludes(joinRequestsMigration, "source_group_slug text not null", "Join request migration must store source_group_slug.");
assertIncludes(joinRequestsMigration, "source_group_id uuid references public.dos_groups(id)", "Join request migration must store source_group_id.");
assertIncludes(joinRequestsMigration, "source_path text not null", "Join request migration must store source_path.");
assertIncludes(joinRequestsMigration, "submitted_at timestamptz not null default now()", "Join request migration must store submitted_at.");
assertIncludes(joinRequestsMigration, "alter table public.dos_group_join_requests enable row level security", "Join request migration must enable RLS.");
assertIncludes(joinRequestsMigration, "grant insert (", "Public join requests must use column-limited insert grants.");
assertIncludes(joinRequestsMigration, "email,", "Public join requests must allow email submission.");
assertIncludes(joinRequestsMigration, "source_group_slug,", "Public join requests must allow source_group_slug submission.");
assertIncludes(joinRequestsMigration, "to anon", "Public join requests must allow public insert only through the anon role.");
assertIncludes(joinRequestsMigration, "revoke all on table public.dos_group_join_requests from authenticated", "Join request migration must revoke direct authenticated table access.");
assertIncludes(joinRequestsMigration, "dos_group_join_requests_pending_group_email_unique", "Join request migration must prevent duplicate pending requests by group/email.");
assertIncludes(joinRequestsMigration, "Public can create pending group join requests", "Join request migration must include public pending insert policy.");
assertIncludes(joinRequestsMigration, "status = 'pending'", "Public insert policy must keep requests pending.");
assertIncludes(joinRequestsMigration, "group_id is null", "Direct public insert must not be able to set group_id.");
assertIncludes(joinRequestsMigration, "source_group_id is null", "Direct public insert must not be able to set source_group_id.");
assertIncludes(joinRequestsMigration, "workspace_id is null", "Direct public insert must not be able to set workspace_id.");
assertIncludes(joinRequestsMigration, "Private DOS server routes review requests with workspace/group scoping.", "Join request migration must document private DOS review scoping.");
assert(
  !joinRequestsMigration.includes("grant insert, select, update, delete on table public.dos_group_join_requests to authenticated"),
  "Join request migration must not grant direct authenticated CRUD access.",
);
assert(
  !joinRequestsMigration.includes("for select\nto anon"),
  "Join request migration must not allow public request selection.",
);
assertIncludes(publicGroupActions, ".from(\"dos_group_join_requests\")", "Join request action must write to dos_group_join_requests.");
assertIncludes(publicGroupActions, ".from(\"dos_groups\")", "Join request action must resolve the active group.");
assertIncludes(publicGroupActions, "emailPattern.test(email)", "Join request action must validate email format.");
assertIncludes(publicGroupActions, "normalizePhone", "Join request action must intentionally keep phone optional and normalized.");
assertIncludes(publicGroupActions, ".eq(\"status\", \"pending\")", "Join request action must check existing pending requests.");
assertIncludes(publicGroupActions, "(error as { code?: string }).code === \"23505\"", "Join request action must handle duplicate pending requests safely.");
assertIncludes(publicGroupActions, "status: \"pending\"", "Join request action must save requests as pending.");
assertIncludes(publicGroupActions, "source_type: \"group_join_request\"", "Join request action must save source_type.");
assertIncludes(publicGroupActions, "source_group_slug: group.slug", "Join request action must save source_group_slug.");
assertIncludes(publicGroupActions, "source_group_id: group.id", "Join request action must save source_group_id.");
assertIncludes(publicGroupActions, "source_path: sourcePath", "Join request action must save source_path.");
assertIncludes(publicGroupActions, "submitted_at: submittedAt", "Join request action must save submitted_at.");
assert(
  !publicGroupActions.includes(".from(\"dos_group_members\")"),
  "Join request action must not create group members directly.",
);
assert(
  !publicGroupActions.includes(".from(\"missionary_field_people\")"),
  "Join request action must not create DOS Person records directly.",
);

assert(exists("app/community/page.tsx"), "Community must create the canonical public directory route.");
assert(exists("app/community/[slug]/page.tsx"), "Community must create the canonical public share route.");
assert(exists("app/groups/page.tsx"), "Groups must keep the public directory compatibility route.");
assert(exists("app/groups/[slug]/page.tsx"), "Groups must keep the public share compatibility route.");
assert(exists("app/groups/PublicGroupPageTemplate.tsx"), "Groups must use a reusable public group page template.");
assert(exists("app/groups/actions.ts"), "Groups must create a live public join request action.");
assert(exists("app/api/dos/app/groups/members/route.ts"), "Groups must create the authenticated member add route.");
assert(exists("app/api/dos/app/groups/join-requests/route.ts"), "Groups must create the authenticated join request review route.");
assert(exists("app/api/dos/app/groups/settings/route.ts"), "Groups must create the authenticated settings route.");
assert(!exists("app/dos/groups/page.tsx"), "Groups should stay inside the authenticated DOS app surface.");

console.log("DOS groups regression passed.");
