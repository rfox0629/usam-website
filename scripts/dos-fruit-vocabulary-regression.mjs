// USA-243 — the one fruit model: one vocabulary across meetings and recipient
// forms, provenance preserved on every observation, corroboration counted once,
// activity kept out of fruit, and no fruit ever inferred from free text.
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import {
  buildFruitAssertions,
  canonicalFruitGroupOptions,
  canonicalFruitOptions,
  classifyFruitValue,
  fruitProvenanceSources,
  fruitReportingTotals,
  normalizeDosReviewOutcomeTags,
} from "../src/lib/dos/fruit-vocabulary.ts";
import { dosQuickReviewExperienceOptions } from "../src/lib/dos/review-form-config.ts";
/* Read as text, not imported: this module pulls in the "@/" alias, which Node's
   type stripping cannot resolve. */
const testimonyConfig = readFileSync(new URL("../src/lib/dos/testimony-form-config.ts", import.meta.url), "utf8");

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const client = read("app/dos/app/DosMvpAppClient.tsx");

// 1. One vocabulary, four groups, eleven labels — and every surface uses it.
assert.equal(canonicalFruitOptions.length, 11, "The canonical vocabulary is 11 labels.");
assert.equal(canonicalFruitGroupOptions.length, 4, "Grouped into four.");
assert.equal(
  canonicalFruitGroupOptions.reduce((total, group) => total + group.options.length, 0),
  11,
  "Every label belongs to exactly one group.",
);
assert(
  testimonyConfig.includes("export const dosReviewOutcomeOptions = canonicalFruitOptions.map((option) => ({ label: option.label, value: option.label }));"),
  "The testimony fruit question offers the canonical vocabulary, not a second list.",
);
assert(
  client.includes("canonicalFruitGroupOptions.map("),
  "Observed Fruit is built from the shared vocabulary rather than a hand-written list.",
);

// 2. Activity is not fruit. This is the distinction the whole issue turns on.
for (const activity of ["Gospel Conversation", "Prayer Received", "Someone prayed with me", "Communion", "Washing of Feet", "Testimony Shared", "Discipling", "Church Visit"]) {
  assert.equal(classifyFruitValue(activity).class, "activity", `${activity} is ministry activity, never fruit.`);
}
for (const impact of ["Felt encouraged", "Peace", "Hope", "I felt closer to God", "Life giving", "Still processing"]) {
  assert.equal(classifyFruitValue(impact).class, "impact", `${impact} is impact, not an event.`);
}
for (const followUp of ["Prayer Request", "Follow Up Requested", "I want to keep growing", "Baptism requested"]) {
  assert.equal(classifyFruitValue(followUp).class, "follow_up", `${followUp} is a next step, not fruit.`);
}

// 3. Legacy wording maps onto canonical fruit without losing its detail.
assert.equal(classifyFruitValue("New Believers").key, "new_believer", "Legacy leader wording maps to the canonical key.");
assert.equal(classifyFruitValue("I decided to follow Jesus").key, "new_believer", "Recipient wording lands on the same key.");
assert.equal(classifyFruitValue("Marriage Restoration").key, "reconciliation", "Marriage restoration is reconciliation…");
assert.equal(classifyFruitValue("Marriage Restoration").context, "Marriage", "…with its detail kept as context, not a twelfth label.");
assert.equal(classifyFruitValue("Deliverance").context, "Deliverance", "Subtypes survive as context.");
assert.equal(classifyFruitValue("answered   PRAYER").key, "answered_prayer", "Matching ignores case and spacing.");

// 4. Nothing stored is rewritten, and nothing unknown is guessed.
assert.equal(classifyFruitValue("New Believers").originalValue, "New Believers", "The stored string is preserved verbatim.");
assert.equal(classifyFruitValue("Something nobody mapped").class, "unmapped", "An unmapped value is never guessed into fruit.");
assert.equal(classifyFruitValue("Something nobody mapped").label, "Something nobody mapped", "It renders as recorded.");
assert.equal(
  classifyFruitValue("We talked about how her marriage is healing and she felt closer to God").class,
  "unmapped",
  "A sentence is narrative: fruit is never inferred from free text.",
);

// 5. The free-text classifier is gone from the client, and no caller feeds it narrative.
assert(!client.includes("function fruitOutcomeMatchesText("), "The substring-matching classifier must be deleted, not left dormant.");
assert(
  client.includes("fruitOutcomesFromValues(testimony.outcomeTags)")
    && client.includes("fruitOutcomesFromValues(reflection.observedFruit)")
    && client.includes("fruitOutcomesFromValues(event.fruitType)")
    && client.includes("fruitOutcomesFromValues(fruit.outcomeTags)"),
  "Only explicit tag values may be classified; story, summary, description and next step must not be passed in.",
);

// 6. Provenance is preserved, and corroboration counts once.
const meeting = "meeting-1";
const observations = [
  { meetingId: meeting, personId: "p1", source: "leader_observed", value: "Reconciliation", workspaceId: "w", observedAt: "2026-09-01T10:00:00Z" },
  { meetingId: meeting, personId: "p1", source: "recipient_reported", value: "Reconciliation", workspaceId: "w", observedAt: "2026-09-02T10:00:00Z" },
  { meetingId: meeting, personId: "p1", source: "leader_observed", value: "Prayer Received", workspaceId: "w" },
  { meetingId: meeting, personId: "p1", source: "recipient_reported", value: "I felt closer to God", workspaceId: "w" },
  { meetingId: meeting, personId: "p2", source: "leader_observed", value: "Reconciliation", workspaceId: "w" },
];
const built = buildFruitAssertions(observations);
assert.equal(built.assertions.length, 2, "Two people reconciling are two results; one result reported twice is one.");

const shared = built.assertions.find((assertion) => assertion.personId === "p1");
assert.equal(shared.observations.length, 2, "Both observations are kept as supporting evidence.");
assert.deepEqual(shared.sources.sort(), ["leader_observed", "recipient_reported"], "Both provenances are preserved.");
assert.equal(shared.observedAt, "2026-09-01T10:00:00Z", "Corroboration never moves the result's date.");
assert.equal(built.activity.length, 1, "Prayer Received stays activity evidence.");
assert.equal(built.impact.length, 1, "Closer to God stays impact.");

const totals = fruitReportingTotals(observations);
assert.equal(totals.assertionCount, 2, "Reports count distinct results…");
assert.equal(totals.supportingObservationCount, 3, "…and supporting observations separately.");
assert.equal(totals.corroboratedAssertionCount, 1, "One result is backed by both a leader and the person.");
assert.equal(totals.supportingObservationsBySource.leader_observed, 2, "Observations break down by who said it.");
assert.equal(totals.supportingObservationsBySource.recipient_reported, 1, "Recipient evidence is never merged into the leader's.");
assert.notEqual(totals.assertionCount, totals.supportingObservationCount, "The two numbers are different measures and must never be summed.");

// Different meetings are different results; no meeting falls back to a 30-day window.
const acrossMeetings = buildFruitAssertions([
  { meetingId: "m1", personId: "p1", source: "leader_observed", value: "Baptized", workspaceId: "w" },
  { meetingId: "m2", personId: "p1", source: "leader_observed", value: "Baptized", workspaceId: "w" },
]);
assert.equal(acrossMeetings.assertions.length, 2, "The same fruit in two meetings is two results.");
const windowed = buildFruitAssertions([
  { personId: "p1", source: "leader_observed", value: "Baptized", workspaceId: "w", observedAt: "2026-09-01T00:00:00Z" },
  { personId: "p1", source: "recipient_reported", value: "Baptized", workspaceId: "w", observedAt: "2026-09-03T00:00:00Z" },
  { personId: "p1", source: "leader_observed", value: "Baptized", workspaceId: "w", observedAt: "2027-03-01T00:00:00Z" },
]);
assert.equal(windowed.assertions.length, 2, "Unlinked observations group into a window; months later is a new result.");
assert.deepEqual(fruitProvenanceSources.slice(0, 2), ["leader_observed", "recipient_reported"], "Both evidence sources are first-class.");

// 7. Backward compatibility: every historical value still validates and renders.
const legacy = ["Reconciliation", "New Believers", "Marriage Restoration", "Baptized", "Discipling", "Started Discipling Others", "Answered Prayer"];
assert.deepEqual(normalizeDosReviewOutcomeTags(legacy), legacy, "Every testimony value ever stored still validates.");
assert.deepEqual(
  normalizeDosReviewOutcomeTags(canonicalFruitOptions.map((option) => option.label)),
  canonicalFruitOptions.map((option) => option.label),
  "So does every canonical label.",
);
assert.deepEqual(normalizeDosReviewOutcomeTags(["Not a real tag"]), [], "Unknown values are still rejected on the way in.");
assert(
  client.includes("renderableObservedFruitValues.has(value)"),
  "A historical Observed Fruit value must survive re-submission.",
);

// 8. Quick Review stays short, and its activity chip stays activity.
assert.equal(dosQuickReviewExperienceOptions.length, 4, "Quick Review stays intentionally brief.");
assert.equal(
  classifyFruitValue(dosQuickReviewExperienceOptions.find((option) => option.label === "Someone prayed with me").value).class,
  "activity",
  "\"Someone prayed with me\" is activity, however it is worded on the form.",
);

console.log("DOS fruit vocabulary (USA-243) regression passed.");
