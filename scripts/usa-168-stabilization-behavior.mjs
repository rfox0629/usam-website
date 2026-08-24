import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { canonicalCircleForRecalculation } from "../src/lib/dos/circle-placement.ts";
import { createMeetingWorkflowIds, PersistedWorkflowStepError, runMeetingWorkflow } from "../src/lib/dos/meeting-workflow.ts";
import { canonicalSpiritualJourneyLabel, evidenceBelongsToPerson, personEvidenceCounts } from "../src/lib/dos/person-evidence.ts";
import { submitCanonicalReview } from "../src/lib/dos/review-submission-policy.ts";

const checks = [];

async function check(name, run) {
  await run();
  checks.push(name);
}

await check("Circle recalculation never changes placement without a human confirmation", async () => {
  assert.deepEqual(canonicalCircleForRecalculation({ existingCircle: "twelve", lockedOverrideCircle: null }), {
    assignmentSource: "automatic",
    circle: "twelve",
  });
  assert.deepEqual(canonicalCircleForRecalculation({ existingCircle: null, lockedOverrideCircle: null }), {
    assignmentSource: "automatic",
    circle: "field",
  });
  assert.deepEqual(canonicalCircleForRecalculation({ existingCircle: "field", lockedOverrideCircle: "three" }), {
    assignmentSource: "manual",
    circle: "three",
  });
});

await check("Log Meeting retries reuse operation IDs and resume failed children without duplicates", async () => {
  const deterministicIds = [
    "00000000-0000-4000-8000-000000000001",
    "00000000-0000-4000-8000-000000000002",
    "00000000-0000-4000-8000-000000000003",
    "00000000-0000-4000-8000-000000000004",
  ];
  const ids = createMeetingWorkflowIds(() => deterministicIds.shift());
  const records = {
    meeting: new Set(),
    prayer: new Set(),
    reflection: new Set(),
    reminder: new Set(),
  };
  let prayerFailures = 1;
  let reflectionFailures = 1;
  const steps = {
    meeting: async ({ meetingId, operationId }) => {
      assert.equal(meetingId, ids.meetingId);
      assert.equal(operationId, ids.meetingId);
      records.meeting.add(operationId);
    },
    prayer: async ({ meetingId, operationId }) => {
      assert.equal(meetingId, ids.meetingId);
      assert.equal(operationId, ids.prayerRequestId);
      if (prayerFailures-- > 0) throw new Error("Prayer service unavailable");
      records.prayer.add(operationId);
    },
    reflection: async ({ meetingId, operationId }) => {
      assert.equal(meetingId, ids.meetingId);
      assert.equal(operationId, ids.reflectionId);
      if (reflectionFailures-- > 0) throw new Error("Fruit sync unavailable");
      records.reflection.add(operationId);
    },
    reminder: async ({ meetingId, operationId }) => {
      assert.equal(meetingId, ids.meetingId);
      assert.equal(operationId, ids.reminderId);
      records.reminder.add(operationId);
    },
  };

  const first = await runMeetingWorkflow({ ids, requestPrayer: true, requestReflection: true, requestReminder: true, steps });
  assert.equal(first.complete, false);
  assert.match(first.errors.prayer, /Prayer service unavailable/);
  assert.match(first.errors.reflection, /Fruit sync unavailable/);
  assert.equal(first.statuses.meeting, "saved");
  assert.equal(first.statuses.reminder, "saved");

  const retry = await runMeetingWorkflow({ ids, requestPrayer: true, requestReflection: true, requestReminder: true, steps });
  assert.equal(retry.complete, true);
  assert.equal(records.meeting.size, 1);
  assert.equal(records.reflection.size, 1);
  assert.equal(records.prayer.size, 1);
  assert.equal(records.reminder.size, 1);
});

await check("A saved Meeting with failed canonical sync is visible and resumable", async () => {
  const ids = createMeetingWorkflowIds(() => "00000000-0000-4000-8000-000000000099");
  const meetings = new Set();
  let canonicalSyncFailures = 1;
  let reflectionWrites = 0;
  const steps = {
    meeting: async ({ operationId }) => {
      meetings.add(operationId);
      if (canonicalSyncFailures-- > 0) throw new PersistedWorkflowStepError("Meeting saved, but canonical sync failed");
    },
    reflection: async () => { reflectionWrites += 1; },
  };

  const partial = await runMeetingWorkflow({ ids, requestPrayer: false, requestReflection: true, requestReminder: false, steps });
  assert.equal(partial.complete, false);
  assert.equal(partial.statuses.meeting, "partial");
  assert.equal(partial.statuses.reflection, "skipped");
  assert.match(partial.errors.meeting, /canonical sync failed/);

  const retry = await runMeetingWorkflow({ ids, requestPrayer: false, requestReflection: true, requestReminder: false, steps });
  assert.equal(retry.complete, true);
  assert.equal(meetings.size, 1);
  assert.equal(reflectionWrites, 1);
});

await check("Concurrent Quick Review submissions create one canonical record and retries recover it", async () => {
  let claimed = false;
  let releaseInsert;
  const insertGate = new Promise((resolve) => { releaseInsert = resolve; });
  const records = [];
  const adapter = {
    claimLink: async () => {
      if (claimed) return false;
      claimed = true;
      return true;
    },
    findExisting: async () => records[0] ?? null,
    insertCanonical: async () => {
      await insertGate;
      const record = { id: "canonical-review-1" };
      records.push(record);
      return record;
    },
    releaseClaim: async () => { claimed = false; },
  };

  const firstSubmission = submitCanonicalReview(adapter);
  await new Promise((resolve) => setTimeout(resolve, 0));
  const concurrentSubmission = await submitCanonicalReview(adapter);
  assert.deepEqual(concurrentSubmission, { status: "in_progress" });
  releaseInsert();
  const created = await firstSubmission;
  assert.equal(created.status, "created");
  const retry = await submitCanonicalReview(adapter);
  assert.equal(retry.status, "existing");
  assert.equal(records.length, 1);
});

await check("A failed Quick Review insert releases its claim for a safe retry", async () => {
  let claimed = false;
  let attempts = 0;
  const records = [];
  const adapter = {
    claimLink: async () => claimed ? false : (claimed = true),
    findExisting: async () => records[0] ?? null,
    insertCanonical: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("temporary insert failure");
      const record = { id: "canonical-review-2" };
      records.push(record);
      return record;
    },
    releaseClaim: async () => { claimed = false; },
  };

  await assert.rejects(() => submitCanonicalReview(adapter), /temporary insert failure/);
  const retry = await submitCanonicalReview(adapter);
  assert.equal(retry.status, "created");
  assert.equal(records.length, 1);
});

await check("Person evidence fallback is explicit or single-person only", async () => {
  assert.equal(evidenceBelongsToPerson({ meetingPersonIds: ["p1", "p2"], personId: "p1", recordPersonId: "p1" }), true);
  assert.equal(evidenceBelongsToPerson({ meetingPersonIds: ["p1"], personId: "p1", recordPersonId: null }), true);
  assert.equal(evidenceBelongsToPerson({ meetingPersonIds: ["p1", "p2"], personId: "p1", recordPersonId: null }), false);
  assert.equal(evidenceBelongsToPerson({ meetingPersonIds: ["p1"], personId: "p2", recordPersonId: null }), false);
});

await check("Review, Testimony, and Fruit remain separate evidence counts", async () => {
  const fruit = [{ id: "fruit-1" }, { id: "fruit-2" }];
  const reviews = [{ id: "review-1" }, { id: "review-2" }, { id: "review-3" }];
  const testimonies = [{ id: "testimony-1" }];

  assert.deepEqual(personEvidenceCounts({ fruit, reviews, testimonies }), {
    fruitCount: 2,
    reviewCount: 3,
    testimonyCount: 1,
  });
  assert.equal(personEvidenceCounts({ fruit, reviews: [], testimonies }).fruitCount, 2, "Testimony must not increase Fruit count.");
});

await check("Spiritual Journey displays the explicit canonical Person stage", async () => {
  const narrativeWithForbiddenKeywords = "She shared a testimony about teaching as a leader and discipling others.";
  assert(narrativeWithForbiddenKeywords.includes("discipling"));
  assert.equal(canonicalSpiritualJourneyLabel("not_started"), "Exploring");
  assert.equal(canonicalSpiritualJourneyLabel("walking_with"), "Growing");
  assert.equal(canonicalSpiritualJourneyLabel("discipling"), "Discipling");
  assert.equal(canonicalSpiritualJourneyLabel("disciple_maker"), "Disciple Maker");
});

await check("Production review submission has no legacy dual-write", async () => {
  const source = await readFile(new URL("../src/lib/dos/reviews.ts", import.meta.url), "utf8");
  const submitSource = source.slice(source.indexOf("export async function submitDosQuickReview"));
  assert.doesNotMatch(submitSource, /\.from\("participant_reviews"\)\s*\.insert/);
  assert.match(submitSource, /submitCanonicalReview/);
});

console.log(`USA-168 stabilization behavior checks passed (${checks.length}):`);
for (const name of checks) console.log(`- ${name}`);
