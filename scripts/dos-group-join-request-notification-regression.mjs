import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(source, needle, message) {
  assert(source.includes(needle), message);
}

function assertOrder(source, first, second, message) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);

  assert(firstIndex !== -1 && secondIndex !== -1 && firstIndex < secondIndex, message);
}

const groupActions = read("app/groups/actions.ts");
const notifyFacilitatorsHelper = read("src/lib/groups/notify-facilitators.ts");
const emailHelper = read("src/lib/groups/email.ts");
const pendingRequestsRoute = read("app/api/dos/app/groups/pending-requests/route.ts");
const joinRequestsRoute = read("app/api/dos/app/groups/join-requests/route.ts");
const appClient = read("app/dos/app/DosMvpAppClient.tsx");

// --- Facilitator notification is wired, best-effort, and never blocks submission ---
//
// The resolution logic (dos_group_members / missionary_field_people reads) lives in its
// own module, not inline in app/groups/actions.ts. That file is the public join-request
// submission path and must never itself write group members or DOS person records; the
// existing dos-groups-regression suite enforces that by checking it never references
// those two tables at all, so notification lookups have to live elsewhere.

assertIncludes(
  groupActions,
  'import { notifyGroupFacilitators } from "@/src/lib/groups/notify-facilitators"',
  "Public group actions must import the facilitator notification helper.",
);
assertIncludes(
  groupActions,
  "await notifyGroupFacilitators(supabase, group,",
  "submitGroupJoinRequest must call notifyGroupFacilitators after persisting the request.",
);
assert(
  !groupActions.includes('.from("dos_group_members")') && !groupActions.includes('.from("missionary_field_people")'),
  "app/groups/actions.ts must not read or write dos_group_members / missionary_field_people directly -- that logic belongs in notify-facilitators.ts.",
);
assertOrder(
  groupActions,
  '.from("dos_group_join_requests")\n    .insert(',
  "await notifyGroupFacilitators(supabase, group,",
  "The join request must be persisted before the facilitator is notified.",
);
assertOrder(
  groupActions,
  "await notifyGroupFacilitators(supabase, group,",
  'revalidatePath(`/groups/${group.slug}`);\n  redirectToGroup(group.slug, "received");',
  "The facilitator notification must be attempted before the final success redirect.",
);

assertIncludes(
  notifyFacilitatorsHelper,
  "export async function notifyGroupFacilitators(",
  "notify-facilitators.ts must export notifyGroupFacilitators.",
);
assertIncludes(
  notifyFacilitatorsHelper,
  "} catch (error) {\n    console.warn(\"[Public Group] Facilitator notification failed\"",
  "notifyGroupFacilitators must catch its own errors so a failed email never fails the public submission.",
);
assertIncludes(
  notifyFacilitatorsHelper,
  'in("role", ["leader", "co_leader"])',
  "notifyGroupFacilitators must scope recipients to active leaders/co-leaders.",
);
assertIncludes(
  notifyFacilitatorsHelper,
  'eq("status", "active")',
  "notifyGroupFacilitators must only notify active leadership membership.",
);

// --- Duplicate-pending-request protection must remain intact ---

assertIncludes(
  groupActions,
  '.eq("status", "pending")\n    .limit(1)\n    .maybeSingle();',
  "Existing pending-request lookup must remain in place before insert.",
);
assertIncludes(
  groupActions,
  '(error as { code?: string }).code === "23505"',
  "Unique-constraint violation fallback for duplicate pending requests must remain in place.",
);

// --- Email helper never throws a way that skips the "skipped" path when unconfigured ---

assertIncludes(
  emailHelper,
  "export async function sendGroupJoinRequestNotification(",
  "Group email helper must export sendGroupJoinRequestNotification.",
);
assertIncludes(
  emailHelper,
  'status: "skipped"',
  "Group email helper must return a skipped result when the provider or recipients are not configured, not throw.",
);

// --- Pending-count endpoint only counts status = pending ---

assertIncludes(
  pendingRequestsRoute,
  '.eq("status", "pending")',
  "Pending-requests endpoint must filter to status = pending only.",
);
assertIncludes(
  pendingRequestsRoute,
  'in("role", ["leader", "co_leader"])',
  "Pending-requests endpoint must scope counts to active leader/co-leader membership.",
);
assertIncludes(
  pendingRequestsRoute,
  'eq("status", "active")',
  "Pending-requests endpoint must only treat active leadership membership as facilitation.",
);

// --- Join-requests route still transitions status away from pending on every resolving action ---

assertIncludes(
  joinRequestsRoute,
  'const nextStatus = action === "accept" ? "accepted" : action === "decline" ? "declined" : "reviewed";',
  "Accept/decline/review must continue to move a request out of the pending status.",
);

// --- Client wiring: badge, dashboard section, resolved-callback decrement, deep link ---

assertIncludes(appClient, "pendingRequestCount?: number", "GroupCard must accept an optional pendingRequestCount prop.");
assertIncludes(appClient, "onOpenJoinRequests: () => void", "GroupCard must accept an onOpenJoinRequests handler.");
assertIncludes(appClient, "pendingGroupJoinRequestCounts", "Top-level DOS client must track pending join request counts by group.");
assertIncludes(appClient, "/api/dos/app/groups/pending-requests", "Top-level DOS client must fetch the pending-requests summary endpoint.");
assertIncludes(appClient, "function openGroupJoinRequests(groupId: string) {", "DOS client must expose a deep-link helper into a group's Members tab.");
assertIncludes(appClient, 'setGroupDetailTab("members");', "Deep-link helper must land on the Members tab.");
assertIncludes(appClient, "function handleGroupJoinRequestResolved(groupId: string) {", "DOS client must define a handler that decrements pending counts when a request is resolved.");
assertIncludes(appClient, "const wasPending = joinRequests.find((request) => request.id === requestId)?.status ===", "reviewJoinRequest must check the pre-action status before deciding whether to decrement.");
assertIncludes(appClient, "onJoinRequestResolved(group.id);", "reviewJoinRequest must call onJoinRequestResolved after a resolving action.");
assertIncludes(appClient, 'const requestedGroupId = searchParams.get("openGroup");', "DOS client must read an openGroup query param for email deep links.");
assertIncludes(appClient, "Groups needing your attention", "Dashboard must render a pending group join request section.");

console.log("dos-group-join-request-notification-regression: all checks passed.");
