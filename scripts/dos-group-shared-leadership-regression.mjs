/* Shared Leadership -> Add Person on a group's People tab.
 *
 * It used to open the add-member sheet, which defaulted to Member · Active,
 * showed existing members only as "In group" and so could not make one of
 * them a leader; its list also stopped at five people with nothing to scroll.
 * This pins the contract: Shared Leadership has its own sheet that starts from
 * the group's members, changes the role on their one membership, adds someone
 * from outside the group only with an on-screen confirmation, never touches
 * the primary leader, and is authorised like every other member write. The
 * ordinary add path must no longer rewrite an existing member's role.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const slice = (source, start, end) => {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);

  assert.ok(from >= 0 && to > from, `slice ${start} .. ${end}`);
  return source.slice(from, to);
};

const client = read("app/dos/app/DosMvpAppClient.tsx");
const route = read("app/api/dos/app/groups/members/route.ts");
const leaderSheet = read("src/components/dos/groups/GroupLeaderAssignSheet.tsx");
const addSheet = read("src/components/dos/groups/GroupAddPersonSheet.tsx");

/* ---------- 1. The entry point opens the leader sheet ---------- */

const peopleTab = slice(client, "function GroupPeopleTabV2(", "function computeGroupFocusAssignment(");

assert.match(peopleTab, /label="Add Person" onClick=\{onAddLeader\} \/>\} title="Shared Leadership"/, "Shared Leadership -> Add Person opens the leader sheet");
assert.doesNotMatch(peopleTab, /onInvite/, "the People tab no longer routes Shared Leadership to the add-member sheet");
assert.match(client, /onAddLeader=\{openGroupLeaderSheet\}/, "the workspace wires the leader sheet");
assert.match(client, /<GroupLeaderAssignSheet[\s\S]*?onAssign=\{\(request\) => assignGroupLeader\(selectedGroup\.id, request\)\}/, "the sheet saves through assignGroupLeader");
assert.match(client, /onInvite=\{openGroupInviteSheet\}/, "the header Add Person still adds members");

/* ---------- 2. The sheet ---------- */

assert.match(leaderSheet, /\.filter\(\(member\) => member\.status === "active"\)/, "the default list is the group's active members");
assert.match(leaderSheet, /isPrimary \? \(\s*<div/, "the primary leader is shown but is not a choice");
assert.match(leaderSheet, /confirmAddToGroup: !selected\.inGroup/, "someone outside the group is added only with the confirmation flag");
assert.match(leaderSheet, /Saving adds them as an active member/, "the sheet says so before saving");
assert.match(leaderSheet, /inFlightRef\.current/, "a double tap cannot write twice");
assert.match(leaderSheet, /disabled=\{isSaving \|\| roleUnchanged\}/, "choosing the role someone already has cannot save");
assert.match(leaderSheet, /overflow-y-auto overscroll-contain/, "the candidate list scrolls on its own under a visible search");
assert.match(leaderSheet, /role="status"/, "success is announced");
assert.match(leaderSheet, /role="alert"/, "errors are announced");
assert.doesNotMatch(leaderSheet, /invitation|send_member_access/i, "assigning a leader sends nothing");

/* ---------- 3. The route ---------- */

const leadership = slice(route, "async function setLeadershipRole(", "export async function POST(");
const post = slice(route, "export async function POST(", "export async function DELETE(");

assert.ok(
  post.indexOf('allowedRoles: ["leader", "co_leader"]') < post.indexOf('action === "set_leadership_role"'),
  "leadership changes are authorised as a group leader before the action runs",
);
assert.match(leadership, /const leadershipRoles = \["co_leader", "helper", "member"\]|leadershipRoles\.includes\(role\)/, "only co-leader, helper or member can be set");
assert.match(route, /const leadershipRoles = \["co_leader", "helper", "member"\] as const;/, "leader (primary) is never a settable role here");
assert.match(leadership, /existing\?\.role === "leader" \|\| groupResult\.data\?\.leader_person_id === person\.id/, "the primary leader cannot be changed here");
assert.match(leadership, /!inGroup && payload\.confirmAddToGroup !== true[\s\S]*?needsMembership: true/, "the server refuses to add someone without the confirmation");
assert.match(leadership, /existing\s*\?\s*await supabase\s*\.from\("dos_group_members"\)\s*\.update\(/, "an existing membership is updated, never duplicated");
assert.match(leadership, /unchanged: true/, "setting the same role again is a no-op");

/* ---------- 4. The ordinary add no longer rewrites roles ---------- */

assert.match(post, /const currentMembership = existingMemberResult\.data && existingMemberResult\.data\.status !== "removed"/, "a current membership is left as it is");
assert.match(post, /currentMembership\s*\?\s*\{ data: currentMembership, error: null \}/, "re-adding a current member writes nothing");

/* ---------- 5. The add-member list scrolls ---------- */

assert.doesNotMatch(addSheet, /slice\(0, query\.trim\(\) \? 8 : 5\)/, "the add-member list is not capped at five");
assert.match(addSheet, /data-testid="group-add-results"/, "the add-member results have their own scroll area");
assert.match(addSheet, /overflow-y-auto overscroll-contain rounded-dos-1 border border-dos-line px-3/, "the add-member results scroll");

console.log("DOS group Shared Leadership regression passed.");
