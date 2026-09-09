import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { circleTiers, circleViewTiers } from "../src/lib/dos/circle-tiers.ts";
import {
  alignmentTierOrder,
  alignmentViewOrder,
  alignmentWindowDays,
  alignmentWindows,
  closestCircleForTier,
  defaultAlignmentWindow,
  evaluateCircleAlignment,
  formatMinutes,
  isFindingDismissed,
} from "../src/lib/dos/circle-alignment.ts";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const NOW = "2026-09-09T12:00:00.000Z";
const LONG_AGO = "2026-01-01T00:00:00.000Z";

function person(overrides) {
  return {
    accountability: 0,
    activeJourneys: 0,
    confirmedAt: LONG_AGO,
    consistencyWeeks: 0,
    fruitEvents: 0,
    lastInteractionAt: null,
    meetings: 0,
    ministryMinutes: 0,
    multiplicationEvents: 0,
    personId: overrides.personName.toLowerCase(),
    prayer: 0,
    tables: 0,
    ...overrides,
  };
}

/* ---- Windows ------------------------------------------------------------ */
assert.equal(defaultAlignmentWindow, "90d", "the default analysis window is a trailing 90 days");
assert.deepEqual([...alignmentWindows].sort(), ["12m", "30d", "90d"], "30 days, 90 days and 12 months are supported");
assert.deepEqual(alignmentWindows.map((w) => alignmentWindowDays[w]), [30, 90, 365]);

/* ---- The two modules agree, so they cannot drift ------------------------
 *
 * Alignment restates the tier order so it stays importable under Node's type
 * stripping. This is the guard that keeps the restatement honest. */
assert.deepEqual([...alignmentTierOrder], [...circleTiers], "the alignment module's tier order matches the storage contract exactly");
alignmentTierOrder.forEach((tier, index) => {
  const innermostViewContaining = alignmentViewOrder.find((view) => circleViewTiers[view].includes(tier));

  assert.equal(closestCircleForTier(tier), innermostViewContaining, `${tier} reads as the innermost circle the contract says contains it`);
  assert.equal(alignmentViewOrder[index], innermostViewContaining, "tier position and view position line up");
});

/* ---- Tier reads as the closest circle ----------------------------------- */
assert.deepEqual(
  ["inner_3", "next_9", "next_58", "next_50"].map((tier) => closestCircleForTier(tier)),
  ["my_3", "my_12", "my_70", "my_120"],
  "a stored tier reads as the innermost circle that contains it",
);

/* ---- Nobody without a confirmed placement is ever evaluated -------------- */
assert.deepEqual(
  evaluateCircleAlignment({ evidence: [person({ personName: "Unplaced", placement: "not_placed", meetings: 9, ministryMinutes: 900 })], now: NOW }),
  [],
  "an unconfirmed person is never measured: a machine assignment is not a decision to measure against",
);

/* ---- The founder's example --------------------------------------------- */
const example = evaluateCircleAlignment({
  evidence: [
    person({ personName: "Samuel", placement: "inner_3", meetings: 1, ministryMinutes: 45, consistencyWeeks: 1 }),
    person({ personName: "Philip", placement: "next_58", meetings: 8, ministryMinutes: 720, consistencyWeeks: 8 }),
  ],
  now: NOW,
});
const samuel = example.find((finding) => finding.personId === "samuel");

assert.equal(samuel.state, "review_placement", "someone farther out receiving materially more investment raises a review");
assert.equal(samuel.headline, "Review My 3", "the headline names the circle in the language the missionary reads");
assert.equal(
  samuel.evidence[0],
  "You logged 45 minutes with Samuel during the last 90 days and 12 hours with Philip, currently in My 70.",
  "the observation compares real facts, in plain units",
);
assert.equal(samuel.comparisonPersonId, "philip", "the comparison names who it is comparing against");

/* ---- An inner circle with little recent investment ---------------------- */
const quiet = evaluateCircleAlignment({ evidence: [person({ personName: "Quiet", placement: "inner_3" })], now: NOW });

assert.equal(quiet[0].state, "needs_attention", "an inner-circle person with nothing recorded needs attention");
assert.match(quiet[0].evidence[0], /No meetings, tables, accountability, prayer or active Journeys recorded/, "it says exactly what is missing");

/* An outer-circle person with nothing recorded is not an alarm. */
const quietOuter = evaluateCircleAlignment({ evidence: [person({ personName: "Outer", placement: "next_50" })], now: NOW });

assert.equal(quietOuter[0].state, "insufficient_data", "silence farther out is not treated as a problem");

/* ---- A fresh placement is not judged ------------------------------------ */
const fresh = evaluateCircleAlignment({
  evidence: [person({ personName: "Fresh", placement: "inner_3", confirmedAt: "2026-09-01T00:00:00.000Z" })],
  now: NOW,
});

assert.equal(fresh[0].state, "insufficient_data", "a placement younger than the window has not had a fair chance");
assert.match(fresh[0].evidence[0], /8 days ago, which is less than the last 90 days/, "it says how long it has been watching");

/* ---- Absence of Fruit alone never questions a placement ----------------- */
const faithful = evaluateCircleAlignment({
  evidence: [person({ personName: "Faithful", placement: "inner_3", meetings: 10, ministryMinutes: 900, consistencyWeeks: 9, fruitEvents: 0, multiplicationEvents: 0 })],
  now: NOW,
});

assert.equal(faithful[0].state, "aligned", "steady investment with no Fruit yet is aligned: new, difficult or seasonal relationships come before visible Fruit");
assert.ok(
  !faithful[0].evidence.join(" ").toLowerCase().includes("fruit"),
  "the aligned observation does not hold a lack of Fruit against anyone",
);

/* And Fruit alone never rescues an inner placement with no investment. */
const fruitOnly = evaluateCircleAlignment({
  evidence: [person({ personName: "FruitOnly", placement: "inner_3", fruitEvents: 5 })],
  now: NOW,
});

assert.equal(fruitOnly[0].state, "needs_attention", "Fruit is not a substitute for investment when judging an inner placement");

/* ---- Aligned reads as facts, not a score -------------------------------- */
const aligned = faithful[0];

assert.equal(aligned.evidence[0], "10 meetings and 15 hours logged with Faithful in the last 90 days.");
assert.equal(aligned.evidence[1], "Activity in 9 separate weeks.");
assert.ok(
  !JSON.stringify(aligned).match(/score/i),
  "no user-facing observation exposes a score: every one is concrete evidence",
);

/* ---- Windows change the wording and the arithmetic ---------------------- */
const monthly = evaluateCircleAlignment({
  evidence: [person({ personName: "Monthly", placement: "inner_3", meetings: 2, ministryMinutes: 120, consistencyWeeks: 2 })],
  now: NOW,
  window: "30d",
});

assert.match(monthly[0].evidence[0], /in the last 30 days\.$/, "the window is stated in the observation");

/* ---- Comparison only points inward-out, never the reverse --------------- */
const reverse = evaluateCircleAlignment({
  evidence: [
    person({ personName: "Inner", placement: "inner_3", meetings: 9, ministryMinutes: 900, consistencyWeeks: 9 }),
    person({ personName: "Outer", placement: "next_58", meetings: 1, ministryMinutes: 30, consistencyWeeks: 1 }),
  ],
  now: NOW,
});

assert.equal(reverse.find((finding) => finding.personId === "inner").state, "aligned", "an inner person receiving the most investment is aligned");
assert.equal(reverse.find((finding) => finding.personId === "outer").state, "aligned", "an outer person receiving less is not a problem to raise");

/* Marginally more investment is not 'materially more'. */
const marginal = evaluateCircleAlignment({
  evidence: [
    person({ personName: "Inner", placement: "inner_3", meetings: 4, ministryMinutes: 400, consistencyWeeks: 4 }),
    person({ personName: "Outer", placement: "next_58", meetings: 5, ministryMinutes: 450, consistencyWeeks: 5 }),
  ],
  now: NOW,
});

assert.equal(marginal.find((finding) => finding.personId === "inner").state, "aligned", "a normal week's variation never raises a review");

/* ---- Dismissal ---------------------------------------------------------- */
const dismissal = { dismissedAt: NOW, dismissedBy: "user", findingState: "review_placement", personId: "samuel", reason: "Season of grief; staying put.", window: "90d" };

assert.ok(isFindingDismissed(samuel, [dismissal]), "a dismissal silences that observation");
assert.ok(!isFindingDismissed(quiet[0], [dismissal]), "a dismissal is specific to the person, state and window");

/* ---- Formatting --------------------------------------------------------- */
assert.equal(formatMinutes(45), "45 minutes");
assert.equal(formatMinutes(1), "1 minute");
assert.equal(formatMinutes(60), "1 hour");
assert.equal(formatMinutes(720), "12 hours");
assert.equal(formatMinutes(90), "1.5 hours");

/* ---- The module cannot move anyone -------------------------------------- */
const source = read("src/lib/dos/circle-alignment.ts");
const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

assert.ok(
  !/\bplacement\s*=|setPlacement|assign|promote|demote/.test(code),
  "alignment never assigns, promotes or demotes: it only observes",
);
assert.ok(
  !/sort\(\s*\(first, second\)\s*=>\s*second\.(?:fruit|multiplication)/.test(code),
  "people are never ordered by Fruit or multiplication",
);

/* ---- One query layer, owned elsewhere ----------------------------------
 *
 * The rules module must never grow its own production query: Reports (USA-251)
 * owns the single facts loader, and Manage circles consumes the same shape. */
assert.ok(
  !/supabase|createClient|\.from\(|SELECT /i.test(code),
  "the alignment rules contain no query, no client and no SQL: they receive normalized evidence",
);
assert.ok(
  source.includes("THE SHARED EVIDENCE INTERFACE"),
  "the evidence object is documented as the shared interface between the loader and its consumers",
);
assert.ok(
  source.includes("owned by the Reports") && source.includes("USA-251"),
  "the module names which issue owns the production facts loader",
);

/* The evidence shape is exercised in full, so a loader has an exact target. */
const everyField = person({
  accountability: 1, activeJourneys: 1, confirmedAt: LONG_AGO, consistencyWeeks: 3, fruitEvents: 1,
  lastInteractionAt: NOW, meetings: 3, ministryMinutes: 180, multiplicationEvents: 1, personName: "Complete",
  placement: "inner_3", prayer: 1, tables: 2,
});

assert.deepEqual(
  Object.keys(everyField).sort(),
  ["accountability", "activeJourneys", "confirmedAt", "consistencyWeeks", "fruitEvents", "lastInteractionAt", "meetings", "ministryMinutes", "multiplicationEvents", "personId", "personName", "placement", "prayer", "tables"],
  "the evidence interface is exactly these fields; a loader has one target to satisfy",
);
assert.equal(evaluateCircleAlignment({ evidence: [everyField], now: NOW })[0].state, "aligned");

console.log("DOS circle alignment (USA-247) regression passed.");
