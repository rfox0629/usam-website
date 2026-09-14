// USA-275 — Multiplication across People, Reports and connected accounts.
//
// Behavioural checks of the read-only projection, and source checks of the
// contracts that have no runtime harness here: route authorization order,
// the connected-read double check, the loader's no-write connected mode, the
// migration's grants, the shared-group scrub, and the People overview
// hierarchy. The pure graph has its own suite
// (dos-discipleship-graph-regression.mjs).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dosConnectedWorkspaceViewFromAppData } from "../src/lib/dos/discipleship-connected-view.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

// ---------------------------------------------------------------------------
// 1. The projection carries DOS information and nothing third-party.
{
  const secrets = ["tanner.private@example.com", "918-555-0199", "review-token-abc", "reviewer@example.com", "Reviewer Lastname", "Private reflection only", "calendar-secret", "booking-secret", "org-admin@example.com"];
  const data = {
    accountabilityCheckIns: [{ checkInDate: "2026-09-01", createdAt: null, createdByUserId: null, durationMinutes: 15, followUp: null, generalUpdate: "Kept reading.", id: "ci1", personId: "p1", prayerNeeds: null, scheduleId: null, struggles: null, updatedAt: null, wins: null, workspaceId: "w" }],
    accountabilitySchedules: [{ createdAt: null, createdByUserId: null, dayOfWeek: null, frequency: "weekly", id: "s1", nextCheckIn: "2026-09-20", personId: "p1", scheduledTime: null, startDate: "2026-08-01", status: "active", title: "Scripture", updatedAt: null, workspaceId: "w" }],
    calendarConnection: { googleAccountEmail: "calendar-secret" },
    commitments: [{ assignedDate: "2026-08-01", category: null, completedDate: null, createdAt: null, createdByUserId: null, description: "Read John", id: "c1", personId: "p1", status: "active", targetCount: null, targetKind: null, targetDate: null, title: "John", updatedAt: null, updates: [], workspaceId: "w" }],
    externalCalendarEvents: [{ title: "calendar-secret" }],
    fruitEvents: [
      { confidenceLevel: "observed", date: "2026-09-02", debugContext: {}, description: "Started meeting with Eli", fruitType: "began_discipling_others", generatedBy: null, generationKey: null, id: "f1", meetingId: "m1", personId: "p1", sourceId: null, sourceType: "manual", status: "approved", title: null, visibility: "private" },
      { confidenceLevel: "observed", date: "2026-09-02", debugContext: {}, description: "hidden", fruitType: "x", generatedBy: null, generationKey: null, id: "f-hidden", meetingId: null, personId: "p1", sourceId: null, sourceType: "manual", status: "hidden", title: null, visibility: "private" },
    ],
    groups: [{ gatherings: [{ attendance: [{ firstTimeGuest: false, gatheringId: "g1", id: "a1", notes: null, personId: "p1", personName: "Aaron", status: "present" }], startsAt: "2026-09-03T07:00:00Z", status: "completed", title: "Breakfast", id: "g1" }], id: "grp", locationAddress: "842 North Ash Ave", members: [{ memberAccess: { verifiedEmail: "tanner.private@example.com", verifiedPhone: "918-555-0199" }, personId: "p1", status: "active" }], name: "Breakfast" }],
    leaderReflections: [{ createdAt: null, followUpNeeded: false, id: "r1", meetingId: "m1", nextStep: null, observedFruit: [], personId: "p1", prayerNeeds: "Pray for Eli", privateNotes: "Private reflection only", spiritualOpenness: null, whatHappened: "Read John 15" }],
    meetings: [{ conversationFlowKey: "none", date: "2026-09-02T12:00:00", fieldPersonIds: ["p1", "p1"], id: "m1", meetingStatus: "logged", notes: "Good time", review: { token: "review-token-abc" }, reviewLinks: [{ token: "review-token-abc" }], scheduledEndAt: "2026-09-02T14:30:00", scheduledStartAt: "2026-09-02T12:00:00", source: "table", tableRole: "ministering", tableRoleRecorded: true, type: "kitchen_table" }],
    myRecord: { journalEntries: [{ body: "journal" }], mentorMeetings: [{ actionSteps: null, counselReceived: null, createdAt: null, discussed: "Leading", durationMinutes: 60, fieldPersonId: null, followUpDate: null, id: "mm1", meetingDate: "2026-08-30", mentorName: "Ryan Fox", notes: null, relationshipId: null, updatedAt: null }] },
    organizations: [{ adminEmail: "org-admin@example.com" }],
    participantReviews: [{ comments: "Helpful", conversationHelpful: null, feltCaredFor: null, feltHeard: null, id: "rv1", legacyForm: null, meetingId: "m1", overallRating: "Very helpful", outcomeTags: [], personId: "p1", status: "submitted", submittedAt: "2026-09-03", submittedEmail: "reviewer@example.com", submittedFirstName: "Reviewer", submittedLastName: "Reviewer Lastname", submittedName: "Reviewer Lastname", wantsFollowUp: null, wouldMeetAgain: true, wouldMeetAgainResponse: null }],
    people: [
      { email: "tanner.private@example.com", id: "p1", name: "Aaron Johnson", notes: "Started with Eli", phone: "918-555-0199", relationshipTypeValue: "discipling", roleInMyLife: "discipling_them", spouseName: "Spouse", status: "active" },
      { email: null, id: "p-archived", name: "Old", notes: null, phone: "", relationshipTypeValue: "new", roleInMyLife: "not_active", status: "archived" },
    ],
    prayerPartners: [{ email: "tanner.private@example.com" }],
    prayerRequests: [{ answeredAt: null, createdAt: "2026-09-01", fieldPersonId: "p1", id: "pr1", linkedPersonIds: ["p1"], request: "Wisdom", status: "active", title: "Wisdom", visibility: "private" }],
    resourceAssignments: [{ completedAt: null, id: "j1", personId: "p1", resourceSlug: "daily-bible-reading", startDate: "2026-08-01", status: "in_progress" }],
    tableInvitationBookings: [{ requesterEmail: "booking-secret" }],
    tableInvitations: [{ token: "booking-secret" }],
    usamApplication: { assignedAdminEmail: "org-admin@example.com" },
  };
  const view = dosConnectedWorkspaceViewFromAppData(data, { depth: 2, ownerName: "Tanner Kent", workspaceId: "w" });
  const serialized = JSON.stringify(view);

  for (const secret of secrets) {
    assert.ok(!serialized.includes(secret), `The connected view must not carry "${secret}".`);
  }

  assert.equal(view.readOnly, true);
  assert.deepEqual(view.people.map((person) => Object.keys(person).sort()), [["id", "name", "notes", "relationshipTypeValue", "roleInMyLife", "status"]], "People carry names and notes, never contact details; archived people are omitted.");
  assert.deepEqual([view.meetings[0].minutes, view.meetings[0].personIds, view.meetings[0].whatHappened, view.meetings[0].prayerNeeds], [150, ["p1"], "Read John 15", "Pray for Eli"]);
  assert.deepEqual(view.fruit.map((fruit) => fruit.id), ["f1"], "Hidden Fruit is not shown.");
  assert.deepEqual(view.accountability.map((item) => item.kind).sort(), ["check_in", "commitment", "schedule"]);
  assert.deepEqual([view.groups[0].gatherings[0].presentPersonIds, view.groups[0].memberPersonIds], [["p1"], ["p1"]]);
  assert.deepEqual(view.discipleshipMeetings.map((meeting) => meeting.mentorName), ["Ryan Fox"]);
  assert.deepEqual(view.feedback.map((feedback) => Object.keys(feedback).sort()), [["comments", "id", "meetingId", "overallRating", "personId", "submittedAt", "wantsFollowUp"]]);
  for (const key of ["calendar", "tableInvitations", "organizations", "usamApplication", "prayerPartners", "circlePlacements", "featureFlags"]) {
    assert.ok(!(key in view), `The connected view has no ${key}.`);
  }
}

// ---------------------------------------------------------------------------
// 2. The route: every request authorized before any data access; upstream
//    reads need the double path check; nothing cached.
{
  const route = stripComments(read("app/api/dos/app/discipleship/route.ts"));
  const get = route.slice(route.indexOf("export async function GET"), route.indexOf("export async function POST"));
  const post = route.slice(route.indexOf("export async function POST"));

  for (const [label, body] of [["GET", get], ["POST", post]]) {
    assert.ok(body.indexOf("requireDosWorkspaceRouteAccess") > 0 && body.indexOf("requireDosWorkspaceRouteAccess") < body.indexOf("createSupabaseAdminClient()"), `${label}: workspace access is checked before the service-role client exists.`);
  }

  assert.ok(get.indexOf("authorizeDosConnectedWorkspaceRead") < get.indexOf("loadDosAppData("), "GET: the path is authorized before another workspace is loaded.");
  assert.ok(get.includes('json({ error: "Not found." }, 404)'), "An unreadable workspace is indistinguishable from a missing one.");
  assert.ok(get.includes("connectedRead: { recordUserId: read.recordUserId }"), "The connected load runs in its no-write mode for the accepting account only.");
  assert.ok(route.includes('"Cache-Control": "no-store, max-age=0"') && route.includes('export const dynamic = "force-dynamic"'), "No response is cached.");
  assert.ok(post.includes("authorize(true)"), "Every change needs DOS write access.");

  const accept = post.slice(post.indexOf('case "accept_account":'), post.indexOf('case "confirm_match":'));
  assert.ok(accept.includes('authorization.access !== "member"'), "Only a signed-in member answers for their own account.");
  assert.ok(accept.includes("row.invite_email !== email"), "An invitation is answerable only by the account whose authenticated email it names.");
  assert.ok(accept.includes("payload.visibilityExplained !== true"), "Acceptance requires the upstream-visibility explanation.");
  assert.ok(accept.indexOf("reach.reach.readable.has(row.mentor_workspace_id)") < accept.indexOf('.from("dos_identity_links")\n        .upsert'), "Cycles are rejected before any identity link is written.");
  assert.ok(accept.includes("That Person record is already connected to a different account."), "A Person already linked to another account cannot be claimed.");

  const add = post.slice(post.indexOf('case "add_connection":'), post.indexOf('case "end_connection":'));
  assert.ok(add.includes("dosValidateDiscipleshipConnection("), "Recorded connections pass the shared validation (self, duplicate, cycle, workspace scope).");
  assert.ok(!add.includes("dos_identity_links\")\n        .upsert") && !add.includes("dos_discipleship_account_connections"), "Typing a name or choosing a Person never touches identity or account connections.");

  const end = post.slice(post.indexOf('case "end_person_discipleship":'), post.indexOf('case "invite_account":'));
  assert.ok(end.includes('status: "revoked"') && end.includes('.in("status", ["pending", "accepted"])'), "Ending discipleship revokes the account connection through that path.");
  assert.ok(!/delete\(\)/.test(route), "Nothing in Multiplication hard-deletes a record.");
  for (const forbidden of ["recalculateCircleScores", "circle-placement", "dos_circle", "fruit_events\").insert"]) {
    assert.ok(!route.includes(forbidden), `The discipleship route must not touch ${forbidden}.`);
  }

  const undo = post.slice(post.indexOf('case "undo_match":'));
  assert.ok(undo.includes('.eq("matched_workspace_id", workspaceId)') && undo.includes('status: "undone"'), "A mistaken match is undone by the workspace that made it, and kept as history.");
}

// ---------------------------------------------------------------------------
// 3. Server traversal: level by level, only proven-readable workspaces load,
//    and connected reads need the TypeScript AND the database path.
{
  const server = stripComments(read("src/lib/dos/discipleship-connections.ts"));
  assert.ok(server.startsWith('import "server-only";'));
  assert.ok(server.includes("pending = Array.from(readable.keys()).filter((id) => !loaded.has(id));"), "Only workspaces already proven readable are loaded next.");
  assert.ok(server.includes('row.mentor_workspace_id === rootWorkspaceId || row.status === "accepted"'), "Downstream workspaces contribute accepted connections only.");
  const authorize = server.slice(server.indexOf("export async function authorizeDosConnectedWorkspaceRead"));
  assert.ok(authorize.indexOf("result.reach.readable.get(targetWorkspaceId)") < authorize.indexOf('rpc("dos_discipleship_readable_workspaces"'), "The TypeScript path is required first…");
  assert.ok(authorize.includes("database.error || !Array.isArray(database.data)"), "…and the database path must agree.");
  assert.ok(!server.includes("unstable_cache") && !server.includes("revalidateTag"), "Nothing is cached.");
}

// ---------------------------------------------------------------------------
// 4. The loader's connected mode performs no write and never recurses.
{
  const loader = read("src/lib/dos/missionary-app.ts");
  const body = loader.slice(loader.indexOf("export async function loadDosAppData("), loader.indexOf("async function loadConfirmedPlacementsSafely"));
  for (const guarded of [
    "connectedRead ? { error: null } : await syncHouseholdTeamMembersAsPeople(",
    "viewer && !connectedRead\n    ? await ensureDosViewerPerson(",
    "if (viewer && !connectedRead) {\n    const identityResult",
    "connectedRead ? { error: null } : await ensureRyanDosWorkspaceGroups(",
    "circles: connectedRead ? null : await loadFreshCircleData(",
    "discipleship: connectedRead\n        ? emptyDosAppDiscipleship(workspace.id)",
    "loadMeetingsForWorkspace(supabase, workspace.id, connectedRead ? null : viewer)",
  ]) {
    assert.ok(body.includes(guarded), `Connected reads skip: ${guarded.split("\n")[0]}`);
  }
}

// ---------------------------------------------------------------------------
// 5. Migration: additive, service-role only, rollback documented.
{
  const migration = read("supabase/migrations/20260913180000_usa_275_discipleship_connections.sql");
  const rollback = read("supabase/migrations/20260913180000_usa_275_discipleship_connections_rollback.sql");
  for (const table of ["dos_discipleship_connections", "dos_discipleship_account_connections", "dos_discipleship_identity_matches"]) {
    assert.ok(migration.includes(`alter table public.${table} enable row level security;`), `${table}: RLS on.`);
    assert.ok(migration.includes(`revoke all on public.${table} from anon, authenticated;`), `${table}: no anon or authenticated grant (new tables inherit anon by default).`);
    assert.ok(rollback.includes(`drop table if exists public.${table};`), `${table}: rollback drops it.`);
  }
  assert.ok(migration.includes("grant execute on function public.dos_discipleship_readable_workspaces(uuid[], integer) to service_role;") && migration.includes("revoke all on function public.dos_discipleship_readable_workspaces(uuid[], integer) from public, anon, authenticated;"));
  assert.ok(migration.includes("security invoker") && migration.includes("not ac.disciple_workspace_id = any(w.path)") && migration.includes("l.verification_status = 'verified'"), "The database traversal is invoker-rights, cycle-safe and requires verified identity.");
  assert.ok(!/^\s*(alter|update|delete)\s+(table\s+)?public\.(missionary_field_people|fruit_events|dos_circle)/im.test(migration), "No existing table is altered or rewritten.");
  assert.ok(migration.includes("dos_discipleship_connections_not_self") && migration.includes("dos_discipleship_account_connections_not_own_workspace"));
}

// ---------------------------------------------------------------------------
// 6. Shared collective views never receive discipleship data.
{
  const page = read("app/dos/[collectiveSlug]/page.tsx");
  assert.ok(page.includes("discipleship: emptyDosAppDiscipleship(data.workspace.id),"));
}

// ---------------------------------------------------------------------------
// 7. People: the approved hierarchy, the derived indicator, Manage circles
//    unchanged, no accordions, compact copy.
{
  const client = read("app/dos/app/DosMvpAppClient.tsx");
  const overview = client.slice(client.indexOf('aria-label="Relationship brief"'), client.indexOf('activeDetailTab === "history"', client.indexOf('aria-label="Relationship brief"')));
  const order = (labels) => labels.map((label) => overview.indexOf(label));
  const groups = order(['<PersonOverviewGroup\n                  action=', '<PersonOverviewGroup label="Activity">', '<PersonOverviewGroup label="Fruit &amp; Feedback">']);
  assert.ok(groups.every((index) => index > 0) && groups[0] < groups[1] && groups[1] < groups[2], "MULTIPLICATION, then ACTIVITY, then FRUIT & FEEDBACK.");
  assert.ok(overview.includes('label="Multiplication"'));
  const activity = overview.slice(groups[1], groups[2]);
  const subsections = ['aria-label="Journey"', 'aria-label="Accountability"', 'aria-label="Groups"', 'aria-label="Prayer"'].map((label) => activity.indexOf(label));
  assert.ok(subsections.every((index, position) => index > 0 && (position === 0 || index > subsections[position - 1])), "ACTIVITY holds Journey, Accountability, Groups, Prayer in that order.");
  const fruitAndFeedback = overview.slice(groups[2]);
  assert.ok(fruitAndFeedback.indexOf('aria-label="Fruit"') > 0 && fruitAndFeedback.indexOf('aria-label="Fruit"') < fruitAndFeedback.indexOf('aria-label="Feedback"'), "FRUIT & FEEDBACK holds Fruit then Feedback.");
  assert.ok(!overview.includes("<details"), "No group accordions.");
  const cardsEnd = overview.indexOf("{renderMeetingCards()}");
  assert.ok(cardsEnd > 0 && cardsEnd < groups[0] && !overview.slice(cardsEnd, groups[0]).includes("<div") && !overview.slice(cardsEnd, groups[0]).includes("<section"), "MULTIPLICATION follows the meeting cards directly.");
  assert.ok(overview.indexOf('data-overview-followups="true"') > groups[2], "Mobile follow-ups stay after the three groups.");
  assert.equal((overview.match(/<Eyebrow>Journey<\/Eyebrow>/g) ?? []).length, 1);

  const group = client.slice(client.indexOf("function PersonOverviewGroup("), client.indexOf("type PersonMultiplicationProps"));
  assert.ok(group.includes('text-[14px] font-bold uppercase') && group.includes("text-dos-eyebrowSection"), "Group headings are DOS blue, uppercase, bold, 14px: above the 11.5px eyebrows and far below the 25px name.");

  assert.ok(!client.includes("personIsMultiplying("), "Multiplying no longer reads accountability subjects.");
  assert.ok(client.includes("const isMultiplying = multiplication.graph.isMultiplying(personGraphRef);"), "Multiplying derives from the graph.");
  assert.ok(client.includes("const relationshipSignal = isMultiplying ? `${relationshipTypePill} · Multiplying` : relationshipTypePill;"), "The compact line under the name is unchanged in form.");

  const peopleActions = client.slice(client.indexOf('aria-label="People actions"'), client.indexOf("{/* USA-275: connection requests"));
  assert.ok(peopleActions.includes("setIsManageCirclesOpen(true)") && peopleActions.includes("<span>Manage circles</span>"), "Manage circles stays in the People actions row.");
  const addSheet = client.slice(client.indexOf("<AddDiscipleshipConnectionSheet"), client.indexOf("<InviteAccountSheet"));
  assert.ok(!/circle/i.test(addSheet), "Adding a connection has no circle editing.");

  const surfaces = [read("src/components/dos/multiplication/MultiplicationTree.tsx"), read("src/components/dos/multiplication/DiscipleshipSheets.tsx"), read("src/components/dos/multiplication/ConnectedWorkspaceSheet.tsx")].map(stripComments).join("\n");
  for (const forbidden of ["Recorded by", "Discipled by", "People Ryan", "cadence", "Cadence"]) {
    assert.ok(!surfaces.includes(forbidden), `Multiplication copy stays compact: no "${forbidden}".`);
  }
  assert.ok(read("src/lib/dos/discipleship-graph.ts").includes('dosMultiplicationEmptyState = "No discipleship connections added"'));
  assert.ok(read("src/lib/dos/discipleship-graph.ts").includes('dosNoActivityState = "No activity recorded"'));
  const tree = read("src/components/dos/multiplication/MultiplicationTree.tsx");
  assert.ok(tree.includes("aria-expanded={expanded}") && tree.includes("aria-controls={childListId}"), "Expand / collapse is a real, labelled button.");
  assert.ok(tree.includes("!ancestors.includes(entry.key)"), "The display can never loop.");

  const run = client.slice(client.indexOf("const runDiscipleshipAction"), client.indexOf("const loadConnectedView"));
  assert.ok(run.indexOf("if (isPreview)") < run.indexOf("fetch("), "Preview never writes.");
}

// ---------------------------------------------------------------------------
// 8. Reports: current, attributed, never added to personal totals.
{
  const report = read("src/components/dos/reports/MinistryTimeInvestmentReport.tsx");
  assert.ok(report.includes("Current connections, not limited to this period."));
  assert.ok(report.includes("Not included in your totals."));
  assert.ok(!report.includes("buildDosMinistryReport({ ...input, meetings: [...input.meetings"), "Downstream meetings never join the report input.");
}

// ---------------------------------------------------------------------------
// 9. Preview fixtures show the chain without production data.
{
  const preview = read("app/dos/app/preview/page.tsx");
  assert.ok(preview.includes('params.perspective === "dirk" ? buildDirkPerspectiveData(demoData) : demoData'));
  assert.ok(preview.includes("None\n   of these are production records."));
}

console.log("DOS multiplication (USA-275) regression passed.");
