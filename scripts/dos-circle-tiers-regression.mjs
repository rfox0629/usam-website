import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  capacityConflicts,
  capacityReport,
  circleTierCapacity,
  circleTiers,
  circleViewCapacity,
  circleViewTiers,
  circleViews,
  normalizeCirclePlacement,
  placedTotal,
  placementChanges,
  tierCounts,
  viewCounts,
} from "../src/lib/dos/circle-tiers.ts";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

/* ---- Storage is exclusive; display is cumulative -------------------------
 *
 * The whole point of the contract. Tiers never overlap, views nest, and no
 * aggregate over the field may count a person twice. */

assert.deepEqual([...circleTiers], ["inner_3", "next_9", "next_58", "next_50"], "the four exclusive tiers, innermost first");
assert.deepEqual([...circleViews], ["my_3", "my_12", "my_70", "my_120"], "the four cumulative views");

/* Tier capacities produce the familiar view sizes, and are not written twice. */
assert.deepEqual(
  circleViews.map((view) => circleViewCapacity(view)),
  [3, 12, 70, 120],
  "cumulative capacities are 3 / 12 / 70 / 120, derived from tiers of 3 / 9 / 58 / 50",
);
assert.equal(circleTierCapacity.inner_3 + circleTierCapacity.next_9, circleViewCapacity("my_12"));
assert.equal(circleTiers.reduce((total, tier) => total + circleTierCapacity[tier], 0), 120, "the tiers add up to 120 exactly once");

/* Views nest: each view's tiers are a prefix of the next. */
circleViews.forEach((view, index) => {
  if (index === 0) {
    return;
  }

  const previous = circleViewTiers[circleViews[index - 1]];
  const current = circleViewTiers[view];

  assert.deepEqual(current.slice(0, previous.length), [...previous], `${view} contains every tier of ${circleViews[index - 1]}`);
  assert.ok(current.length > previous.length, `${view} is strictly wider`);
});

/* ---- Counting ----------------------------------------------------------- */
const placements = [
  "inner_3", "inner_3", "inner_3",
  "next_9", "next_9",
  "next_58",
  "next_50", "next_50", "next_50", "next_50",
  "not_placed", "not_placed",
];
const counts = tierCounts(placements);

assert.deepEqual(counts, { inner_3: 3, next_9: 2, next_50: 4, next_58: 1 }, "tier tallies are exclusive");
assert.deepEqual(viewCounts(counts), { my_12: 5, my_120: 10, my_3: 3, my_70: 6 }, "view tallies are cumulative");
assert.equal(placedTotal(counts), 10, "the exclusive total is the only correct answer to how many people are placed");

/* The invariant that protects reporting: the widest view equals the
   exclusive total, so aggregating the field never double-counts. */
assert.equal(viewCounts(counts).my_120, placedTotal(counts), "My 120 equals the number of placed people, counted once each");
assert.ok(
  viewCounts(counts).my_3 <= viewCounts(counts).my_12
    && viewCounts(counts).my_12 <= viewCounts(counts).my_70
    && viewCounts(counts).my_70 <= viewCounts(counts).my_120,
  "cumulative counts never decrease as the circle widens",
);
assert.notEqual(
  viewCounts(counts).my_3 + viewCounts(counts).my_12 + viewCounts(counts).my_70 + viewCounts(counts).my_120,
  placedTotal(counts),
  "summing the four VIEWS is not a headcount -- that is the double-count this contract exists to prevent",
);

/* Unknown or legacy values are never silently treated as a placement. */
["three", "twelve", "seventy", "my_120", "field", null, undefined, "", 7].forEach((value) => {
  assert.equal(normalizeCirclePlacement(value), "not_placed", `${JSON.stringify(value)} is not a confirmed placement`);
});
circleTiers.forEach((tier) => assert.equal(normalizeCirclePlacement(tier), tier));

/* ---- Capacity is a cumulative hard cap ----------------------------------
 *
 * Founder decision, 2026-09-09: My 3 at most 3, My 12 at most 12 counting the
 * three, My 70 at most 70, My 120 at most 120. */
const report = capacityReport({ inner_3: 3, next_9: 2, next_50: 0, next_58: 1 });
const my3 = report.find((row) => row.view === "my_3");
const my12 = report.find((row) => row.view === "my_12");

assert.deepEqual(report.map((row) => row.capacity), [3, 12, 70, 120], "the caps are the cumulative circle sizes");
assert.deepEqual({ capacity: my3.capacity, overBy: my3.overBy, remaining: my3.remaining, used: my3.used }, { capacity: 3, overBy: 0, remaining: 0, used: 3 }, "a full My 3 reports no remaining space and no overflow");
assert.deepEqual({ remaining: my12.remaining, used: my12.used }, { remaining: 7, used: 5 }, "My 12 counts the three inside it");
assert.deepEqual(capacityConflicts({ inner_3: 3, next_9: 9, next_50: 50, next_58: 58 }), [], "a completely full field is still within every cap");

/* A fourth person in My 3 is refused; the same person inside My 12 is fine. */
const fourthInThree = capacityConflicts({ inner_3: 4, next_9: 0, next_50: 0, next_58: 0 });

assert.equal(fourthInThree.length, 1, "a fourth person in My 3 is a conflict");
assert.deepEqual({ capacity: fourthInThree[0].capacity, overBy: fourthInThree[0].overBy, view: fourthInThree[0].view }, { capacity: 3, overBy: 1, view: "my_3" }, "the conflict names the circle, its cap, and by how many");
assert.deepEqual(capacityConflicts({ inner_3: 3, next_9: 1, next_50: 0, next_58: 0 }), [], "that fourth relationship belongs in My 12, which accepts it");

/* Cumulative, not per ring: a small three leaves room for a larger next ring. */
assert.deepEqual(capacityConflicts({ inner_3: 1, next_9: 11, next_50: 0, next_58: 0 }), [], "one person in My 3 and eleven more still makes a legal My 12 of twelve");
assert.equal(capacityConflicts({ inner_3: 1, next_9: 12, next_50: 0, next_58: 0 })[0].view, "my_12", "thirteen in My 12 is refused");

/* ---- What a save would write -------------------------------------------- */
const current = new Map([["a", "inner_3"], ["b", "next_9"], ["c", "not_placed"]]);
const draft = new Map([["a", "inner_3"], ["b", "not_placed"], ["c", "next_58"], ["d", "inner_3"]]);

assert.deepEqual(
  placementChanges(current, draft),
  [
    { from: "next_9", personId: "b", to: "not_placed" },
    { from: "not_placed", personId: "c", to: "next_58" },
    { from: "not_placed", personId: "d", to: "inner_3" },
  ],
  "only people whose tier actually changed are written, including removals",
);
assert.deepEqual(placementChanges(current, current), [], "an unchanged draft writes nothing");

/* ---- Placement can never be computed ------------------------------------ */
const source = read("src/lib/dos/circle-tiers.ts");

assert.ok(
  !/score|meeting|minute|fruit|engagement|momentum|recency|last_activity/i.test(source.replace(/\/\*[\s\S]*?\*\//g, "")),
  "the placement model reads no activity signal of any kind, so it cannot move anyone on its own",
);

console.log("DOS circle tiers (USA-247) regression passed.");

/* ---- The Manage circles surface honours the contract -------------------- */
const client = read("app/dos/app/DosMvpAppClient.tsx");
const manageStart = client.indexOf("/* USA-247: Manage circles.");
const manageEnd = client.indexOf("\nfunction PersonFormContent(", manageStart);
const manage = client.slice(manageStart, manageEnd);

assert.ok(manageStart !== -1 && manageEnd !== -1 && client.includes("function ManageCirclesWorkflow("), "the Manage circles workflow exists");
assert.ok(
  client.includes('<button') && client.includes("<span>Manage circles</span>") && client.includes("setIsManageCirclesOpen(true)"),
  "Manage circles is reachable from the People screen",
);

/* Every founder requirement for the workflow, asserted where it lives. */
assert.ok(manage.includes("visiblePeople.map((person)") && manage.includes("placementOf(person.id)"), "it lists people with their confirmed placement");
assert.ok(manage.includes("onPlace={(next) => place(person.id, next)}"), "a person can be moved deliberately");
assert.ok(manage.includes('onPlace("not_placed")') && /Remove from circles\s*<\/button>/.test(manage), "a person can be removed from placement");
assert.ok(manage.includes("capacityReport(counts)") && manage.includes("row.remaining") && manage.includes("row.capacity"), "remaining capacity is shown per circle");
assert.ok(
  manage.includes("Confirmed: ${manageCircleLabel(placement)}") && manage.includes("Possible {manageCircleLabel(recommendation.suggested)}"),
  "a confirmed placement and a possibility are visibly different things",
);

/* Built for 73-120 people: search, filters, and compact rows. */
assert.ok(manage.includes("<SearchField label=\"Search people to place\""), "the list is searchable");
assert.ok(
  manage.includes('{ label: "Confirmed", value: "confirmed" }') && manage.includes('{ label: "Unplaced", value: "unplaced" }')
    && manage.includes('{ label: "Possible", value: "possible" }') && manage.includes('{ label: "Changed", value: "changed" }'),
  "Confirmed, Unplaced, Possible and Changed filters exist",
);
assert.ok(!manage.includes("No suggestion"), "the repetitive no-suggestion copy is gone");

/* The missionary reads circles; tiers stay internal. */
assert.ok(
  manage.includes('{ helper: "Your closest three.", label: "My 3", tier: "inner_3" }')
    && manage.includes('label: "My 12", tier: "next_9"'),
  "placement is asked in My 3 / My 12 language, stored as the exclusive tier",
);
assert.ok(
  manage.includes("Inside your twelve, outside your three."),
  "choosing a circle explains what it means, so cumulative naming is never ambiguous",
);
assert.ok(
  manage.includes("Which circle is") && manage.includes("closest to?"),
  "placing someone asks for their closest circle",
);
assert.ok(
  !/circleTierLabel/.test(manage),
  "internal tier names are not shown on this screen",
);

/* Neutral language: DOS has not pinned anyone. */
assert.ok(
  manage.includes("This is an observation, not a decision."),
  "a possibility says outright that it is not a decision",
);
assert.ok(
  !/\bSuggested:/.test(manage) && !/Pinned to/.test(manage) && !/Accept and place/.test(manage),
  "no wording implies DOS has already assigned or pinned someone",
);
assert.ok(manage.includes("capacityConflicts(counts)") && manage.includes("Over capacity"), "capacity conflicts are surfaced");
assert.ok(
  manage.includes("setIsReviewing(true)") && manage.includes("Confirm these changes") && manage.includes("disabled={Boolean(conflicts.length) || !changes.length}"),
  "saving takes an explicit confirmation and is blocked while a conflict stands",
);
assert.ok(
  manage.includes("{changes.length} {changes.length === 1 ? \"change\" : \"changes\"} to save") && manage.includes("changes.map((change)"),
  "the final review lists only the proposed changes",
);
assert.ok(
  manage.includes("Prototype — nothing was saved"),
  "the prototype says plainly that it writes nothing",
);

/* Recommendations explain themselves and are never applied automatically. */
assert.ok(
  manage.includes("recommendation.reasons.map((reason)"),
  "a possibility shows the concrete reasons behind it",
);
assert.ok(
  manage.includes("Place in {manageCircleLabel(recommendation.suggested)}") && manage.includes("onPlace(recommendation.suggested)"),
  "a possibility is applied only when a human presses the button",
);
assert.ok(
  !/useEffect\([^)]*\)\s*=>\s*\{[^}]*place\(/.test(manage),
  "nothing places a person as a side effect",
);

/* The People rail is cumulative on top of exclusive tiers. */
assert.ok(
  client.includes("const cumulative = viewCounts(counts);") && client.includes("three: cumulative.my_3,") && client.includes("twelve: cumulative.my_12,"),
  "the rail counts are cumulative views computed from exclusive tier tallies",
);
assert.ok(
  client.includes("const unplacedPeopleCount = Math.max(0, peopleCircleCounts.all - peopleCircleCounts.placed);")
    && client.includes("the circles overlap by design and cannot be added together"),
  "All explains both the unplaced people it includes and why the circles cannot be summed",
);
assert.ok(
  client.includes("placed: placedTotal(counts),"),
  "the headcount of placed people uses the exclusive total, never the sum of views",
);

console.log("DOS circle management (USA-247) regression passed.");
