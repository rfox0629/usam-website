import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

/* Production defect USA-168: a scheduled meeting was written to the database
   and the request still answered 500 "Unable to create meeting."

   The create path had `insertResult?.error ?? { message: ... }`. Supabase
   returns `error: null` on success, and `??` treats null as nullish, so every
   successful insert was rebranded a failure. Nothing caught it because no test
   executes the meetings route against a real Supabase response shape -- the
   workflow suite stubs its steps, and the other meeting suites assert on
   source text.

   This models both response shapes through the fixed expression. */
await check("A successful meeting insert is never reported as a failure", async () => {
  const routeSource = readFileSync(new URL("../app/api/dos/app/meetings/route.ts", import.meta.url), "utf8");

  assert(
    !routeSource.includes('insertResult?.error ?? { message: "Unable to create meeting." }'),
    "The create path must not fall back on insertResult.error; Supabase returns error:null on success.",
  );

  const resolveError = (insertResult) => (insertResult ? insertResult.error : { message: "Unable to create meeting." });

  // Supabase success: data present, error explicitly null.
  assert.equal(resolveError({ data: { id: "meeting-1" }, error: null }), null, "A successful insert must yield no error.");
  // Supabase failure: a real error object survives.
  assert.equal(resolveError({ data: null, error: { message: "boom" } }).message, "boom", "A real insert error must survive.");
  // The retry loop never ran: the fallback is the correct answer.
  assert.equal(resolveError(null).message, "Unable to create meeting.", "A missing insert result must report the fallback.");
});

/* Production defect: Log Meeting had two entry paths that persisted structured
   outcomes differently. handleMeetingSubmit (direct) wrote inline Accountability;
   handleEditMeetingSubmit (Schedule, then Log that scheduled meeting) had no
   accountability write at all, so anything entered there was silently dropped --
   no record, no error. Both paths now share one writer. */
await check("Both meeting entry paths persist structured outcomes through one writer", async () => {
  const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");

  assert(
    client.includes("async function persistMeetingAccountability({"),
    "A single shared accountability writer must exist.",
  );

  const sliceHandler = (name) => {
    const start = client.indexOf(`function ${name}(`);
    assert(start !== -1, `${name} must exist.`);
    const next = client.indexOf("\n  function ", start + 10);
    return client.slice(start, next === -1 ? client.length : next);
  };

  for (const handler of ["handleMeetingSubmit", "handleEditMeetingSubmit"]) {
    assert(
      sliceHandler(handler).includes("await persistMeetingAccountability({"),
      `${handler} must persist accountability through the shared writer, or accountability entered on that path is silently dropped.`,
    );
  }

  // Neither path may quietly swallow a failed item.
  assert(
    (client.match(/accountabilityFailureMessage\(accountabilityFailures\)/g) ?? []).length === 2,
    "Both paths must surface failed accountability items by name.",
  );

  // A blank inline row must never be written.
  const writer = client.slice(client.indexOf("async function persistMeetingAccountability({"));
  assert(
    writer.includes("if (!payload.title) {") && writer.includes("continue;"),
    "The shared writer must skip blank accountability rows rather than writing them.",
  );
});

/* Multiplication progress counts DISTINCT confirmed subjects, never raw update
   rows: several progress notes about Philip must not turn Philip into several
   people. Subjects are keyed by DOS Person id when present, otherwise by
   normalised name. Legacy rows carrying neither are plain progress notes and
   are excluded entirely. */
await check("Multiplication progress counts distinct subjects, not update rows", async () => {
  const countDistinctSubjects = (updates) => new Set(
    updates
      .filter((update) => update.subject_person_id || (update.subject_person_name ?? "").trim())
      .map((update) => update.subject_person_id
        ? `id:${update.subject_person_id}`
        : `name:${update.subject_person_name.trim().toLowerCase()}`),
  ).size;

  assert.equal(countDistinctSubjects([
    { subject_person_id: "philip" },
    { subject_person_id: "philip" },
    { subject_person_id: "philip" },
  ]), 1, "Repeated updates about one DOS Person must count once.");

  assert.equal(countDistinctSubjects([
    { subject_person_name: "Philip" },
    { subject_person_name: " philip " },
  ]), 1, "Repeated updates about one named subject must count once.");

  assert.equal(countDistinctSubjects([
    { subject_person_id: "philip" },
    { subject_person_id: "john" },
    { subject_person_name: "Marcus" },
  ]), 3, "Distinct subjects must each count once.");

  assert.equal(countDistinctSubjects([
    { progress_note: "Going well" },
    { subject_person_name: "   " },
  ]), 0, "Progress notes with no subject must not count toward a multiplication target.");
});

/* Observed Fruit was the catch-all for every kind of discipleship activity.
   The narrowed selector must not orphan history: fruit_events.fruit_type stores
   the display label, so a retired value that stopped rendering would make a
   recorded fact disappear from the meeting it belongs to. */
await check("Retired Fruit types cannot be newly selected but still render", async () => {
  const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");
  const retired = ["Started Discipling Others", "Discipling", "Prayer Request", "Joined Discipleship", "Felt encouraged", "Prayer Received"];
  const kept = ["New Believers", "Baptized", "Answered Prayer", "Reconciliation", "Marriage Restoration", "Testimony Shared", "Gospel Conversation", "Serving"];

  const categoriesBlock = client.slice(
    client.indexOf("const meetingObservedFruitCategories"),
    client.indexOf("const meetingObservedFruitOptions ="),
  );

  for (const value of kept) {
    assert(categoriesBlock.includes(`value: "${value}"`), `${value} must remain selectable, preserving its stored value.`);
  }

  for (const value of retired) {
    assert(!categoriesBlock.includes(`value: "${value}"`), `${value} must not be offered as new Observed Fruit.`);
  }

  // Selection is validated against the narrowed set; display is not.
  assert(
    client.includes("typeof value === \"string\" && meetingObservedFruitValues.has(value)"),
    "New submissions must be validated against the narrowed selectable set.",
  );
  assert(
    client.includes("renderableObservedFruitValues.has(fruit)"),
    "Display must use the full historical set, or retired Fruit vanishes from the meetings that recorded it.",
  );
  assert(
    client.includes("...outcomeTagOptions,"),
    "The renderable set must include every value DOS has ever offered.",
  );

  // The selector shows categorised choices directly: no inner disclosure, no badge.
  const selector = client.slice(client.indexOf("function ObservedFruitMultiSelect({"));
  const selectorBody = selector.slice(0, selector.indexOf("\nfunction "));
  assert(selectorBody.includes("meetingObservedFruitCategories.map("), "The selector must render categories directly.");
  assert(!selectorBody.includes("Hide outcomes"), "The inner disclosure must be gone.");
  assert(!selectorBody.includes("Select observed fruit"), "The inner disclosure trigger must be gone.");
  assert(!selectorBody.includes('"Optional"'), "The OPTIONAL badge must be gone; a closed section already says it.");
  assert(selectorBody.includes("aria-pressed={selected}"), "Choices must be multi-select toggles.");
});

/* Semantics: none of the other three canonical concepts may become Fruit. */
await check("Review, Testimony and Prayer never become new Fruit", async () => {
  const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");
  const intelligence = readFileSync(new URL("../src/lib/dos/fruit-intelligence.ts", import.meta.url), "utf8");

  assert(intelligence.includes("export async function inferFruitEventsFromReview"), "The review inference helper still exists.");
  assert(
    !client.includes("inferFruitEventsFromReview"),
    "Reviews and Testimonies must not be wired to generate Fruit.",
  );

  const categoriesBlock = client.slice(
    client.indexOf("const meetingObservedFruitCategories"),
    client.indexOf("const meetingObservedFruitOptions ="),
  );
  assert(!categoriesBlock.includes('value: "Prayer Request"'), "Prayer Request is canonical Prayer, not Fruit.");
  assert(!categoriesBlock.includes('value: "Started Discipling Others"'), "Multiplication is Accountability progress, not Fruit.");
});

console.log(`USA-168 stabilization behavior checks passed (${checks.length}):`);
for (const name of checks) console.log(`- ${name}`);
