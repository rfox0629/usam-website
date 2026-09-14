// USA-275 — Multiplication: discipleship connections, identity continuity and
// upstream visibility.
//
// Behavioural checks of the pure graph in src/lib/dos/discipleship-graph.ts,
// the one implementation shared by the People profile, the Multiplying
// indicator, Reports, the loader and the API routes. Fixtures only: the names
// follow the founder's acceptance chain (Dirk → Ryan → Tanner → Aaron) and are
// not production records.
import assert from "node:assert/strict";
import {
  createDosDiscipleshipGraph,
  dosAccountConnectionWouldCycle,
  dosDiscipleshipGraphLimits,
  dosMultiplicationCountLabel,
  dosMultiplicationEmptyState,
  dosNoActivityState,
  dosReadableWorkspaces,
  dosValidateDiscipleshipConnection,
} from "../src/lib/dos/discipleship-graph.ts";

const person = (id, workspaceId, name, roleInMyLife = "not_active", status = "new") => ({ id, name, roleInMyLife, status, workspaceId });
const connection = (id, workspaceId, mentorPersonId, discipleName, disciplePersonId = null, extra = {}) => ({
  createdAt: `2026-09-1${id.length % 9}T00:00:00Z`, discipleName, disciplePersonId, endedAt: null, id, mentorPersonId, startedOn: null, status: "active", workspaceId, ...extra,
});
const account = (id, mentorWorkspaceId, personId, discipleUserId, discipleWorkspaceId, extra = {}) => ({
  discipleUserId, discipleWorkspaceId, id, identityLinkVerified: true, mentorWorkspaceId, personId, status: "accepted", ...extra,
});

// Workspaces: dirk-ws, ryan-ws, tanner-ws, aaron-ws. Users: u-ryan, u-tanner, u-aaron.
const basePeople = [
  person("dirk-ryan", "dirk-ws", "Ryan Fox", "discipling_them"),
  person("ryan-tanner", "ryan-ws", "Tanner Kent", "discipling_them"),
  person("ryan-naomi", "ryan-ws", "Naomi Lee", "walking_with_them"),
  person("ryan-self", "ryan-ws", "Ryan Fox", "not_active"),
  person("ryan-philip", "ryan-ws", "Philip Saco", "discipling_them"),
];

// ---------------------------------------------------------------------------
// 1. Manual Tanner → Aaron before Tanner joins: listed once, Aaron is not
//    Ryan's own disciple, Multiplying derives from the active connection.
{
  const connections = [connection("c-aaron", "ryan-ws", "ryan-tanner", "Aaron Johnson")];
  const graph = createDosDiscipleshipGraph({ accountConnections: [], connections, matches: [], people: basePeople, readableWorkspaceIds: ["ryan-ws"] });
  const tanner = { kind: "person", personId: "ryan-tanner", workspaceId: "ryan-ws" };
  const entries = graph.directDisciples(tanner);

  assert.deepEqual(entries.map((entry) => [entry.name, entry.source, entry.state, entry.counted]), [["Aaron Johnson", "recorded_here", "confirmed", true]]);
  assert.equal(graph.isMultiplying(tanner), true, "Multiplying follows one active outgoing connection.");
  assert.equal(dosMultiplicationCountLabel(graph.directCount(tanner)), "1 person");
  assert.deepEqual(graph.ownerDisciples("ryan-ws").map((entry) => entry.name), ["Philip Saco", "Tanner Kent"], "Aaron never becomes someone Ryan personally disciples.");
  assert.equal(graph.isMultiplying({ kind: "person", personId: "ryan-naomi", workspaceId: "ryan-ws" }), false);
  assert.deepEqual(graph.descendants({ kind: "person", personId: "ryan-tanner", workspaceId: "ryan-ws" }), { generations: [1], total: 1, truncated: false });

  // Ended and removed connections leave current counts and Multiplying.
  for (const status of ["ended", "removed"]) {
    const closed = createDosDiscipleshipGraph({ accountConnections: [], connections: [{ ...connections[0], endedAt: "2026-09-12T00:00:00Z", status }], matches: [], people: basePeople, readableWorkspaceIds: ["ryan-ws"] });
    assert.equal(closed.isMultiplying(tanner), false, `A ${status} connection is not current.`);
    assert.equal(closed.directCount(tanner), 0);
  }

  assert.equal(dosMultiplicationEmptyState, "No discipleship connections added");
  assert.equal(dosNoActivityState, "No activity recorded");
  assert.equal(dosMultiplicationCountLabel(3), "3 people");
}

// ---------------------------------------------------------------------------
// 2. Tanner joins later (sequence A): his accepted, verified account shows
//    Aaron awaiting confirmation; confirming matches Ryan's entry to Tanner's
//    own Aaron and the person counts once, without re-entry.
const tannerPeople = [
  ...basePeople,
  person("tanner-aaron", "tanner-ws", "Aaron Johnson", "discipling_them"),
  person("tanner-caleb", "tanner-ws", "Caleb Stone", "discipling_them"),
];
const acceptedTanner = account("acc-tanner", "ryan-ws", "ryan-tanner", "u-tanner", "tanner-ws");
{
  const connections = [connection("c-aaron", "ryan-ws", "ryan-tanner", "Aaron Johnson")];
  const tanner = { kind: "person", personId: "ryan-tanner", workspaceId: "ryan-ws" };
  const before = createDosDiscipleshipGraph({ accountConnections: [acceptedTanner], connections, matches: [], people: tannerPeople, readableWorkspaceIds: ["ryan-ws", "tanner-ws"] });
  const pending = before.directDisciples(tanner);

  assert.deepEqual(pending.map((entry) => [entry.name, entry.source, entry.state]), [
    ["Aaron Johnson", "own_records", "confirmed"],
    ["Caleb Stone", "own_records", "confirmed"],
    ["Aaron Johnson", "recorded_here", "awaiting_confirmation"],
  ], "Same name alone never merges: Tanner's Aaron and Ryan's entry stay separate until confirmed.");

  const match = { accountConnectionId: "acc-tanner", connectionId: "c-aaron", id: "m1", matchedPersonId: "tanner-aaron", matchedWorkspaceId: "tanner-ws", status: "confirmed" };
  const after = createDosDiscipleshipGraph({ accountConnections: [acceptedTanner], connections, matches: [match], people: tannerPeople, readableWorkspaceIds: ["ryan-ws", "tanner-ws"] });
  const confirmed = after.directDisciples(tanner);

  assert.deepEqual(confirmed.map((entry) => [entry.name, entry.source, entry.connectionId]), [["Aaron Johnson", "own_records", "c-aaron"], ["Caleb Stone", "own_records", null]], "A confirmed match counts Aaron once and keeps Ryan's row for correction.");
  assert.equal(after.directCount(tanner), 2);

  // 3. Mistaken match is correctable: undone restores two separate records.
  const undone = createDosDiscipleshipGraph({ accountConnections: [acceptedTanner], connections, matches: [{ ...match, status: "undone" }], people: tannerPeople, readableWorkspaceIds: ["ryan-ws", "tanner-ws"] });
  assert.equal(undone.directCount(tanner), 3, "Undoing a match separates the records again.");
  assert.equal(undone.directDisciples(tanner).at(-1).state, "awaiting_confirmation");

  // Declined: not someone Tanner disciples; Ryan's record stays but is not counted.
  const declined = createDosDiscipleshipGraph({ accountConnections: [acceptedTanner], connections, matches: [{ ...match, matchedPersonId: null, status: "declined" }], people: tannerPeople, readableWorkspaceIds: ["ryan-ws", "tanner-ws"] });
  assert.deepEqual(declined.directDisciples(tanner).map((entry) => [entry.name, entry.state, entry.counted]), [["Aaron Johnson", "confirmed", true], ["Caleb Stone", "confirmed", true], ["Aaron Johnson", "declined", false]]);
  assert.equal(declined.directCount(tanner), 2);
}

// 4. Tanner already created Aaron (sequence B), and Ryan entered Aaron as a
//    Person in his own workspace: explicit match keeps both records (history
//    stays with each owner) and counts once.
{
  const people = [...tannerPeople, person("ryan-aaron", "ryan-ws", "Aaron Johnson", "not_active")];
  const connections = [connection("c-aaron-person", "ryan-ws", "ryan-tanner", "Aaron Johnson", "ryan-aaron")];
  const match = { accountConnectionId: "acc-tanner", connectionId: "c-aaron-person", id: "m2", matchedPersonId: "tanner-aaron", matchedWorkspaceId: "tanner-ws", status: "confirmed" };
  const graph = createDosDiscipleshipGraph({ accountConnections: [acceptedTanner], connections, matches: [match], people, readableWorkspaceIds: ["ryan-ws", "tanner-ws"] });
  const tanner = { kind: "person", personId: "ryan-tanner", workspaceId: "ryan-ws" };

  assert.equal(graph.directCount(tanner), 2);
  assert.ok(graph.person("ryan-aaron") && graph.person("tanner-aaron"), "Both records survive; nothing is merged destructively.");
  assert.deepEqual(graph.ownerDisciples("ryan-ws").map((entry) => entry.name), ["Philip Saco", "Tanner Kent"], "Ryan's Aaron record is still not Ryan's disciple.");
}

// ---------------------------------------------------------------------------
// 5. Upstream visibility: Dirk → Ryan → Tanner → Aaron.
const chainPeople = [
  ...tannerPeople,
  person("aaron-zoe", "aaron-ws", "Zoe Park", "discipling_them"),
];
const chainAccounts = [
  account("acc-ryan", "dirk-ws", "dirk-ryan", "u-ryan", "ryan-ws"),
  acceptedTanner,
  account("acc-aaron", "tanner-ws", "tanner-aaron", "u-aaron", "aaron-ws"),
];
{
  const dirk = dosReadableWorkspaces({ accountConnections: chainAccounts, people: chainPeople, viewerWorkspaceIds: ["dirk-ws"] });
  assert.deepEqual(Array.from(dirk.values()).map((entry) => [entry.workspaceId, entry.depth, entry.viaPersonId]), [["ryan-ws", 1, "dirk-ryan"], ["tanner-ws", 2, "ryan-tanner"], ["aaron-ws", 3, "tanner-aaron"]], "Dirk reads Ryan, and through Ryan's verified downline, Tanner and Aaron.");
  const ryan = dosReadableWorkspaces({ accountConnections: chainAccounts, people: chainPeople, viewerWorkspaceIds: ["ryan-ws"] });
  assert.deepEqual(Array.from(ryan.keys()), ["tanner-ws", "aaron-ws"]);
  assert.equal(ryan.has("dirk-ws"), false, "Visibility is upstream only: Ryan never reads Dirk.");
  const tanner = dosReadableWorkspaces({ accountConnections: chainAccounts, people: chainPeople, viewerWorkspaceIds: ["tanner-ws"] });
  assert.deepEqual(Array.from(tanner.keys()), ["aaron-ws"]);
  assert.equal(tanner.has("ryan-ws"), false, "Siblings and upstream are never readable.");
  const unrelated = dosReadableWorkspaces({ accountConnections: chainAccounts, people: chainPeople, viewerWorkspaceIds: ["stranger-ws"] });
  assert.equal(unrelated.size, 0, "An unrelated user reads nothing.");

  // Dirk navigates Ryan → Tanner → Aaron through the same graph.
  const graph = createDosDiscipleshipGraph({ accountConnections: chainAccounts, connections: [], matches: [], people: chainPeople, readableWorkspaceIds: ["dirk-ws", ...dirk.keys()] });
  const ryanRef = { kind: "person", personId: "dirk-ryan", workspaceId: "dirk-ws" };
  const ryanEntries = graph.directDisciples(ryanRef);
  assert.deepEqual(ryanEntries.map((entry) => entry.name), ["Philip Saco", "Tanner Kent"], "Dirk sees Ryan's direct disciples, including Tanner.");
  const tannerEntry = ryanEntries.find((entry) => entry.name === "Tanner Kent");
  assert.equal(graph.directCount(tannerEntry.ref), 2, "Tanner Kent · 2 — direct disciples only.");
  const aaronEntry = graph.directDisciples(tannerEntry.ref).find((entry) => entry.name === "Aaron Johnson");
  assert.deepEqual(graph.directDisciples(aaronEntry.ref).map((entry) => entry.name), ["Zoe Park"]);
  assert.deepEqual(graph.descendants(ryanRef), { generations: [2, 2, 1], total: 5, truncated: false }, "Deeper generations are a separate unique total.");
}

// 6. Names and unverified or unaccepted connections never unlock an account.
{
  for (const [label, override] of [
    ["pending", { status: "pending" }],
    ["declined", { status: "declined" }],
    ["revoked", { status: "revoked" }],
    ["unverified identity link", { identityLinkVerified: false }],
    ["no accepting user", { discipleUserId: null }],
  ]) {
    const accounts = [account("acc-ryan", "dirk-ws", "dirk-ryan", "u-ryan", "ryan-ws", override)];
    assert.equal(dosReadableWorkspaces({ accountConnections: accounts, people: chainPeople, viewerWorkspaceIds: ["dirk-ws"] }).size, 0, `A ${label} account connection grants nothing.`);
  }

  // A name typed under Tanner never grants Ryan access to anyone's account.
  const typed = dosReadableWorkspaces({ accountConnections: [], people: chainPeople, viewerWorkspaceIds: ["ryan-ws"] });
  assert.equal(typed.size, 0);

  // Marking Discipling alone (no accepted account) unlocks nothing either.
  assert.equal(dosReadableWorkspaces({ accountConnections: [], people: [person("x", "ryan-ws", "Someone", "discipling_them")], viewerWorkspaceIds: ["ryan-ws"] }).size, 0);

  // A graph built without Tanner's workspace readable shows only what Ryan recorded.
  const hidden = createDosDiscipleshipGraph({ accountConnections: [acceptedTanner], connections: [], matches: [], people: tannerPeople, readableWorkspaceIds: ["ryan-ws"] });
  assert.equal(hidden.directCount({ kind: "person", personId: "ryan-tanner", workspaceId: "ryan-ws" }), 0, "An unreadable workspace contributes nothing.");
}

// 7. Ending a discipleship connection revokes access supplied through that
//    path, including for ancestors, unless another valid path remains.
{
  const ended = chainPeople.map((entry) => (entry.id === "ryan-tanner" ? { ...entry, roleInMyLife: "walking_with_them" } : entry));
  const dirk = dosReadableWorkspaces({ accountConnections: chainAccounts, people: ended, viewerWorkspaceIds: ["dirk-ws"] });
  assert.deepEqual(Array.from(dirk.keys()), ["ryan-ws"], "Ryan ends discipling Tanner: Dirk loses Tanner and Aaron.");
  assert.equal(dosReadableWorkspaces({ accountConnections: chainAccounts, people: ended, viewerWorkspaceIds: ["ryan-ws"] }).size, 0);

  const archived = chainPeople.map((entry) => (entry.id === "ryan-tanner" ? { ...entry, status: "archived" } : entry));
  assert.equal(dosReadableWorkspaces({ accountConnections: chainAccounts, people: archived, viewerWorkspaceIds: ["ryan-ws"] }).size, 0, "An archived Person is not a current path.");

  // A second, independent path keeps access: Dirk also disciples Tanner directly.
  const secondPath = [...ended, person("dirk-tanner", "dirk-ws", "Tanner Kent", "discipling_them")];
  const secondAccounts = [...chainAccounts, account("acc-tanner-dirk", "dirk-ws", "dirk-tanner", "u-tanner", "tanner-ws")];
  const kept = dosReadableWorkspaces({ accountConnections: secondAccounts, people: secondPath, viewerWorkspaceIds: ["dirk-ws"] });
  assert.deepEqual(Array.from(kept.entries()).map(([id, entry]) => [id, entry.viaPersonId]), [["ryan-ws", "dirk-ryan"], ["tanner-ws", "dirk-tanner"], ["aaron-ws", "tanner-aaron"]], "Access remains only through the other valid path.");
}

// 8. Multiple mentors deduplicate totals; cycles are rejected and never loop.
{
  const people = [
    ...chainPeople,
    person("ryan-sam", "ryan-ws", "Sam Lucas", "discipling_them"),
    person("sam-aaron", "sam-ws", "Aaron Johnson", "discipling_them"),
  ];
  const accounts = [
    ...chainAccounts,
    account("acc-sam", "ryan-ws", "ryan-sam", "u-sam", "sam-ws"),
    account("acc-aaron-sam", "sam-ws", "sam-aaron", "u-aaron", "aaron-ws"),
  ];
  const readable = dosReadableWorkspaces({ accountConnections: accounts, people, viewerWorkspaceIds: ["ryan-ws"] });
  assert.deepEqual(Array.from(readable.keys()).sort(), ["aaron-ws", "sam-ws", "tanner-ws"], "Aaron's workspace appears once however many paths reach it.");
  const graph = createDosDiscipleshipGraph({ accountConnections: accounts, connections: [], matches: [], people, readableWorkspaceIds: ["ryan-ws", ...readable.keys()] });
  const tanner = { kind: "person", personId: "ryan-tanner", workspaceId: "ryan-ws" };
  const sam = { kind: "person", personId: "ryan-sam", workspaceId: "ryan-ws" };
  const aaronViaTanner = graph.directDisciples(tanner).find((entry) => entry.name === "Aaron Johnson");
  const aaronViaSam = graph.directDisciples(sam).find((entry) => entry.name === "Aaron Johnson");
  assert.equal(aaronViaTanner.key, aaronViaSam.key, "One connected account is one person on every path.");
  const everyone = new Set();
  [...graph.ownerDisciples("ryan-ws")].forEach((entry) => {
    everyone.add(entry.key);
    const walk = (ref, depth) => graph.countedDisciples(ref).forEach((child) => {
      if (!everyone.has(child.key) && depth < 8) {
        everyone.add(child.key);
        walk(child.ref, depth + 1);
      }
    });
    walk(entry.ref, 1);
  });
  const names = Array.from(everyone);
  assert.equal(names.filter((key) => key === "account:u-aaron").length, 1);

  // Account cycle: Aaron's workspace accepting a connection from Tanner's workspace
  // when Tanner already reads Aaron is a cycle; so is accepting into oneself.
  assert.equal(dosAccountConnectionWouldCycle({ accountConnections: chainAccounts, discipleWorkspaceId: "ryan-ws", mentorWorkspaceId: "aaron-ws", people: [...chainPeople, person("aaron-ryan", "aaron-ws", "Ryan Fox", "discipling_them")] }), true, "Ryan cannot connect as Aaron's disciple while Ryan reads Aaron.");
  assert.equal(dosAccountConnectionWouldCycle({ accountConnections: [], discipleWorkspaceId: "ryan-ws", mentorWorkspaceId: "ryan-ws", people: chainPeople }), true);
  assert.equal(dosAccountConnectionWouldCycle({ accountConnections: chainAccounts, discipleWorkspaceId: "zed-ws", mentorWorkspaceId: "aaron-ws", people: chainPeople }), false);

  // Even with a cycle present in stored data, traversal terminates.
  const loopPeople = [person("a-b", "a-ws", "B", "discipling_them"), person("b-a", "b-ws", "A", "discipling_them")];
  const loopAccounts = [account("ab", "a-ws", "a-b", "u-b", "b-ws"), account("ba", "b-ws", "b-a", "u-a", "a-ws")];
  assert.deepEqual(Array.from(dosReadableWorkspaces({ accountConnections: loopAccounts, people: loopPeople, viewerWorkspaceIds: ["a-ws"] }).keys()), ["b-ws"]);
  const loopGraph = createDosDiscipleshipGraph({ accountConnections: loopAccounts, connections: [], matches: [], people: loopPeople, readableWorkspaceIds: ["a-ws", "b-ws"] });
  assert.deepEqual(loopGraph.descendants({ kind: "person", personId: "a-b", workspaceId: "a-ws" }), { generations: [1], total: 1, truncated: false });

  // Bounded: a very deep chain stops at the depth limit.
  const deepPeople = [];
  const deepAccounts = [];
  for (let index = 0; index < 20; index += 1) {
    deepPeople.push(person(`p${index}`, `w${index}`, `Person ${index}`, "discipling_them"));
    deepAccounts.push(account(`a${index}`, `w${index}`, `p${index}`, `u${index + 1}`, `w${index + 1}`));
  }
  assert.equal(dosReadableWorkspaces({ accountConnections: deepAccounts, people: deepPeople, viewerWorkspaceIds: ["w0"] }).size, dosDiscipleshipGraphLimits.maxDepth);
}

// 9. Recorded connections: self-links, duplicates and cycles are rejected;
//    same-name different people are allowed as separate entries.
{
  const people = [
    ...basePeople,
    person("ryan-aaron", "ryan-ws", "Aaron Johnson"),
    person("ryan-aaron-2", "ryan-ws", "Aaron Johnson"),
    person("other-ws-person", "tanner-ws", "Elsewhere"),
  ];
  const base = { connections: [], ownerPersonId: "ryan-self", people, workspaceId: "ryan-ws" };
  assert.deepEqual(dosValidateDiscipleshipConnection({ ...base, discipleName: "  Aaron   Johnson ", disciplePersonId: null, mentorPersonId: "ryan-tanner" }), { discipleName: "Aaron Johnson", ok: true });
  assert.equal(dosValidateDiscipleshipConnection({ ...base, discipleName: "", disciplePersonId: null, mentorPersonId: "ryan-tanner" }).code, "name_required");
  assert.equal(dosValidateDiscipleshipConnection({ ...base, discipleName: "x".repeat(121), disciplePersonId: null, mentorPersonId: "ryan-tanner" }).code, "name_too_long");
  assert.equal(dosValidateDiscipleshipConnection({ ...base, discipleName: null, disciplePersonId: "ryan-tanner", mentorPersonId: "ryan-tanner" }).code, "self_link");
  assert.equal(dosValidateDiscipleshipConnection({ ...base, discipleName: null, disciplePersonId: "other-ws-person", mentorPersonId: "ryan-tanner" }).code, "disciple_not_found", "A Person from another workspace can't be attached.");
  assert.equal(dosValidateDiscipleshipConnection({ ...base, discipleName: null, disciplePersonId: "ryan-aaron", mentorPersonId: "missing" }).code, "mentor_not_found");

  const existing = [connection("c1", "ryan-ws", "ryan-tanner", "Aaron Johnson", "ryan-aaron")];
  assert.equal(dosValidateDiscipleshipConnection({ ...base, connections: existing, discipleName: null, disciplePersonId: "ryan-aaron", mentorPersonId: "ryan-tanner" }).code, "duplicate");
  assert.equal(dosValidateDiscipleshipConnection({ ...base, connections: existing, discipleName: null, disciplePersonId: "ryan-aaron-2", mentorPersonId: "ryan-tanner" }).ok, true, "A second Aaron Johnson is a different person.");
  assert.equal(dosValidateDiscipleshipConnection({ ...base, connections: existing, discipleName: "Aaron Johnson", disciplePersonId: null, mentorPersonId: "ryan-tanner" }).ok, true, "A typed name never matches an existing record.");

  // Aaron → Tanner would close Tanner → Aaron.
  assert.equal(dosValidateDiscipleshipConnection({ ...base, connections: existing, discipleName: null, disciplePersonId: "ryan-tanner", mentorPersonId: "ryan-aaron" }).code, "cycle");
  // Tanner → Ryan would close Ryan (owner) → Tanner.
  assert.equal(dosValidateDiscipleshipConnection({ ...base, discipleName: null, disciplePersonId: "ryan-self", mentorPersonId: "ryan-tanner" }).code, "cycle");
  // An ended connection no longer closes a cycle.
  assert.equal(dosValidateDiscipleshipConnection({ ...base, connections: [{ ...existing[0], status: "ended" }], discipleName: null, disciplePersonId: "ryan-tanner", mentorPersonId: "ryan-aaron" }).ok, true);
}

// 10. The module stays a leaf that reads no circle, Fruit, engagement or
//     accountability signal, so a connection can never move a placement.
{
  const { readFileSync } = await import("node:fs");
  const source = readFileSync(new URL("../src/lib/dos/discipleship-graph.ts", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  assert.ok(!/^import\s(?!type)/m.test(source), "No value imports.");
  for (const forbidden of ["circle", "fruit", "engagement", "commitment", "supabase", "fetch("]) {
    assert.ok(!source.toLowerCase().includes(forbidden), `The graph must not read ${forbidden}.`);
  }
}

console.log("DOS discipleship graph (USA-275) regression passed.");
