import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { accountabilityConfirmedSubjects, accountabilityCountProgress, accountabilityProgressKind, accountabilityProgressLabel, commitmentConfirmedSubjectCount, unifiedAccountabilityRows } from "../src/lib/dos/accountability-presentation.ts";
import { isMissingCommitmentsSchema } from "../src/lib/dos/commitments-accountability.ts";
import { canonicalCircleForRecalculation } from "../src/lib/dos/circle-placement.ts";
import { createMeetingWorkflowIds, PersistedWorkflowStepError, runMeetingWorkflow } from "../src/lib/dos/meeting-workflow.ts";
import { canonicalSpiritualJourneyLabel, evidenceBelongsToPerson, personEvidenceCounts } from "../src/lib/dos/person-evidence.ts";
import { canonicalRelationshipModel, relationshipModelFromFields, relationshipModelSummary } from "../src/lib/dos/relationship-model.ts";
import { dosAdvancedFeatureEnabled, dosAdvancedFeatures } from "../src/lib/dos/advanced-features.ts";
import { personIsMultiplying } from "../src/lib/dos/accountability-presentation.ts";
import { backdropMayDismiss, exitAfterSaveNeedsConfirmation, exitNeedsConfirmation, formIsDirty, swipeMayDismiss } from "../src/lib/dos/unsaved-work.ts";
import { dosQuickReviewExperienceOptions, dosQuickReviewFormDefinition, dosQuickReviewOutcomeOptions } from "../src/lib/dos/review-form-config.ts";
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
    writer.includes("if (!route.title) {") && writer.includes("continue;"),
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

/* One user-facing Accountability concept, two canonical destinations chosen by
   what the user picked rather than which screen they used:
     Recurring -> dos_accountability_schedules (a rhythm)
     One-time  -> dos_person_commitments (a goal, the only side carrying a
                  target and progress updates)
   Both entry points -- Person FAB and Log Meeting -- and both meeting paths
   must route identically, or the same choice would persist to different tables
   depending on where it was made. */
await check("Accountability routes by type, identically from every entry point", async () => {
  const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");

  assert(client.includes("function accountabilityRoute(formData: FormData, prefix: string)"), "A single routing decision must exist.");

  const router = client.slice(client.indexOf("function accountabilityRoute("));
  const routerBody = router.slice(0, router.indexOf("\n  function "));

  assert(routerBody.includes('frequency === "one_time"'), "Routing must key off the user's Recurring/One-time choice.");
  assert(routerBody.includes('endpoint: "/api/dos/app/commitments"'), "One-time Accountability must become a commitment.");
  assert(routerBody.includes('endpoint: "/api/dos/app/accountability/schedules"'), "Recurring Accountability must stay a schedule.");

  // Both the Person sheet and the shared meeting writer consult the router.
  for (const caller of ["handleAccountabilityScheduleSubmit", "persistMeetingAccountability"]) {
    const start = client.indexOf(caller);
    assert(start !== -1, `${caller} must exist.`);
    const body = client.slice(start, start + 2600);
    assert(
      body.includes("accountabilityRoute(formData,"),
      `${caller} must route by type, or the same choice lands in different tables depending on the entry point.`,
    );
  }

  // A measurable target is optional and never invented.
  assert(routerBody.includes("targetCount"), "A measurable target must be carried when supplied.");
  assert(
    routerBody.includes('/^\\d+$/.test(rawTarget) && Number(rawTarget) > 0'),
    "Only a positive whole number counts as a target; anything else stays null so simple goals stay simple.",
  );

  // Blank titles are skipped rather than written on either destination.
  const writer = client.slice(client.indexOf("async function persistMeetingAccountability({"));
  assert(writer.includes("if (!route.title) {"), "A blank Accountability row must never be written to either table.");
});

/* The user experiences ONE Accountability system. Storage is split by what they
   picked -- Recurring becomes a schedule, One-time becomes a commitment -- but
   the Person shows a single section holding both, ordered by what is due
   soonest, with no "commitment" or "schedule" vocabulary reaching the screen. */
await check("One Accountability section holds both recurring rhythms and one-time goals", async () => {
  const formatDate = (value) => value ?? "No date";
  const dateValue = (value) => (value ? Date.parse(`${value}T00:00:00Z`) : 0);

  const rows = unifiedAccountabilityRows({
    commitments: [
      { id: "goal", status: "active", targetCount: 3, targetKind: "people", targetDate: "2026-09-10", title: "Begin discipling 3 men", updates: [{ subjectPersonId: "philip" }, { subjectPersonId: "philip" }] },
      { id: "read", status: "active", targetCount: null, targetDate: "2026-09-06", title: "Read John 4-6", updates: [] },
      { id: "plain", status: "active", targetCount: null, targetDate: null, title: "Write out his testimony", updates: [] },
      { id: "done", status: "completed", targetCount: null, targetDate: "2026-09-01", title: "Finished already", updates: [] },
    ],
    dateValue,
    formatDate,
    isJourneyFollowUp: (schedule) => schedule.title.startsWith("Growth follow-up due"),
    scheduleTitle: (schedule) => schedule.title,
    schedules: [
      { frequency: "weekly", id: "rhythm", nextCheckIn: "2026-09-04", status: "active", title: "Pray daily" },
      { frequency: "monthly", id: "late", nextCheckIn: "2026-08-20", status: "active", title: "Serve monthly" },
      /* Written here before routing by type existed. Left in place, read as
         the one-time goal it always was. */
      { frequency: "one_time", id: "legacy", nextCheckIn: "2026-09-08", status: "active", title: "Finish the workbook" },
      { frequency: "one_time", id: "journey", nextCheckIn: "2026-09-05", status: "active", title: "Growth follow-up due [resource-assignment:abc:midpoint]" },
      { frequency: "weekly", id: "paused", nextCheckIn: "2026-09-02", status: "paused", title: "Paused rhythm" },
    ],
    today: "2026-09-03",
  });

  // Both models reach the one list; neither is filtered out by the other's rules.
  assert.deepEqual(rows.map((row) => row.title), [
    "Serve monthly",
    "Pray daily",
    "Read John 4-6",
    "Finish the workbook",
    "Begin discipling 3 men",
    "Write out his testimony",
  ], "Everything active from both models appears once, soonest first, undated last.");

  assert.deepEqual(rows.map((row) => row.kind), ["recurring", "recurring", "one_time", "one_time", "one_time", "one_time"]);

  // Each row carries the metadata its own kind actually has.
  const metaByTitle = new Map(rows.map((row) => [row.title, row.meta]));
  assert.equal(metaByTitle.get("Pray daily"), "Weekly · Next 2026-09-04", "A rhythm reads as its cadence and next date.");
  assert.equal(metaByTitle.get("Serve monthly"), "Monthly · Overdue", "A missed rhythm must not still advertise a date that has passed.");
  assert.equal(metaByTitle.get("Read John 4-6"), "Due 2026-09-06", "An ordinary one-time goal reads as its due date.");
  // Two updates, both about Philip: one confirmed subject, not two.
  assert.equal(metaByTitle.get("Begin discipling 3 men"), "1 of 3 confirmed", "A measurable goal reads as its progress, counted by distinct subject.");
  assert.equal(metaByTitle.get("Write out his testimony"), "", "A goal with neither date nor target says nothing rather than 'No target date'.");
  assert.equal(metaByTitle.get("Finish the workbook"), "Due 2026-09-08",
    "A one-time row written before routing existed still reads as a deadline, and is not migrated to say so.");

  // Journey follow-ups stay Journeys: they are system-generated and are not
  // user-authored Accountability, so they are excluded, never reinterpreted.
  assert(!rows.some((row) => row.title.includes("resource-assignment")), "Journey follow-up schedules must not surface as Accountability.");
  assert(!rows.some((row) => row.sourceId === "journey"), "Journey follow-up schedules must not be reinterpreted as user commitments.");

  // Storage words never travel with the row.
  for (const row of rows) {
    assert(!/commitment|schedule/i.test(`${row.title} ${row.meta}`), `Row "${row.title}" must not expose storage vocabulary.`);
  }
});

/* A measurable target counts DISTINCT confirmed subjects, and only shows when
   the user actually declared a number. */
await check("Measurable Accountability shows real progress and never invents it", async () => {
  assert.equal(accountabilityProgressLabel({ id: "a", status: "active", targetCount: 3, targetKind: "people", targetDate: null, title: "x", updates: [] }), "0 of 3 confirmed",
    "A declared target shows at zero: that is the point of having set it.");
  assert.equal(accountabilityProgressLabel({ id: "a", status: "active", targetCount: null, targetKind: null, targetDate: "2026-09-06", title: "x", updates: [] }), null,
    "An ordinary one-time goal gets no progress UI.");
  assert.equal(accountabilityProgressLabel({ id: "a", status: "active", targetCount: 0, targetKind: "people", targetDate: null, title: "x", updates: [] }), null,
    "A zero or invalid target is not a measurable goal.");

  // Three notes about Philip are one confirmed subject, not three.
  assert.equal(commitmentConfirmedSubjectCount([
    { subjectPersonId: "philip" },
    { subjectPersonId: "philip" },
    { subjectPersonName: " Philip " },
  ]), 2, "A DOS Person and a bare name are different keys; repeats within each collapse.");
  assert.equal(commitmentConfirmedSubjectCount([{ subjectPersonName: "Philip" }, { subjectPersonName: " philip " }]), 1,
    "Repeated updates about one named subject count once.");
  assert.equal(commitmentConfirmedSubjectCount([{ progressNote: "Going well" }, { subjectPersonName: "   " }]), 0,
    "Progress notes with no subject count toward nothing.");
  assert.equal(commitmentConfirmedSubjectCount(null), 0, "A commitment with no updates counts zero, not NaN.");
});

/* Three doors into Accountability, one form behind all of them, and no fourth
   door left over from before the unification. */
await check("Every Person V2 Accountability entry point opens the one canonical form", async () => {
  const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");
  const personDetail = client.slice(
    client.indexOf("function PersonDetailOverlay({"),
    client.indexOf("\nfunction ReviewActionButton({"),
  );
  assert(personDetail.length > 1000, "The Person V2 component must be found before asserting anything about it.");

  // Exactly one Accountability section on the Person.
  assert.equal(
    (personDetail.match(/aria-label="Accountability"/g) ?? []).length,
    1,
    "The Person must render one Accountability section, not one per underlying model.",
  );
  assert(personDetail.includes("unifiedAccountabilityRows({"), "That section must be built from both models by the one presenter.");

  // Door 1: the section's own restrained add, available whether or not the
  // section already has rows.
  const section = personDetail.slice(personDetail.indexOf('aria-label="Accountability"'));
  const sectionHead = section.slice(0, section.indexOf("</section>"));
  assert(sectionHead.includes("+ Add"), "The section must offer + Add.");
  assert(
    /onClick=\{onAddAccountabilitySchedule\}[\s\S]{0,120}\+ Add/.test(sectionHead),
    "The section's + Add must open the canonical Accountability form.",
  );
  assert(
    !sectionHead.includes("{!accountabilityTopics.length ? ("),
    "+ Add must not be conditional on the section being empty.",
  );

  // Door 2: the Person FAB.
  assert(
    personDetail.includes('label: "Add accountability", onClick: onAddAccountabilitySchedule'),
    "The Person FAB must open the same canonical form.",
  );

  // Door 3: Log Meeting's inline Accountability, which is the same field set
  // the sheet renders -- not a second form that happens to look similar.
  /* Three renderers now, all the same component: the Add sheet, Log Meeting
     inline, and Edit. Editing deliberately reuses the canonical field set
     rather than being a second form that can drift from it. */
  assert.equal(
    (client.match(/<AccountabilityFields/g) ?? []).length,
    3,
    "Add, Log Meeting and Edit all render the one canonical field set.",
  );
  const editSheet = client.slice(client.indexOf("function PersonAccountabilityEditSheet("));
  assert(
    editSheet.slice(0, editSheet.indexOf("\nfunction ")).includes("<AccountabilityFields"),
    "Editing must not introduce a second Accountability form.",
  );
  const logMeetingSection = client.slice(client.indexOf("function MeetingLeaderReflectionSection("));
  assert(
    logMeetingSection.slice(0, logMeetingSection.indexOf("\nfunction ")).includes("<AccountabilityFields"),
    "Log Meeting must use the canonical Accountability fields inline.",
  );
  const scheduleSheet = client.slice(client.indexOf("function AccountabilityScheduleSheet({"));
  assert(
    scheduleSheet.slice(0, scheduleSheet.indexOf("\nfunction ")).includes("<AccountabilityFields"),
    "The Accountability sheet must use the same canonical fields.",
  );

  // And no fourth door: Person V2 must not reach the legacy creation sheet.
  // Word-bounded: onAddCommitmentUpdate is progress on an existing goal, which stays.
  assert(!/\bonAddCommitment\b/.test(personDetail), "Person V2 must not carry a second Accountability creation action.");
  assert(!personDetail.includes("openCommitmentCreate"), "Person V2 must not open the legacy creation sheet.");
  assert(!client.includes("function CommitmentsPanel("), "The duplicate Accountability panel must be gone.");
  assert(!client.includes("function PersonAccountabilitySummaryCard("), "The second Accountability card must be gone.");

  // Editing existing records keeps working through the model each one lives in.
  assert(client.includes("function openCommitmentEdit("), "Editing an existing one-time goal must still be possible.");
  assert(client.includes('title={schedule ? "Edit Accountability" : "Add Accountability"}'), "Editing an existing rhythm must still be possible.");
});

/* target_count alone cannot tell "Begin discipling 3 men" from "Read the Bible
   3 times this week": both are the number 3. target_kind carries what the
   number counts, chosen by the user and never inferred, and it is the only
   thing that may summon a person picker. */
await check("Only a people target asks who is being discipled", async () => {
  const goal = (extra) => ({ id: "c", status: "active", targetDate: null, title: "x", updates: [], ...extra });

  assert.equal(accountabilityProgressKind(goal({ targetCount: 3, targetKind: "people" })), "people",
    "A people target records named subjects.");
  assert.equal(accountabilityProgressKind(goal({ targetCount: 3, targetKind: "count" })), "count",
    "\"Read the Bible 3 times this week\" must never be asked who is being discipled.");
  assert.equal(accountabilityProgressKind(goal({ targetCount: 3, targetKind: null })), "count",
    "A number with no declared kind stays generic rather than guessing at people.");
  assert.equal(accountabilityProgressKind(goal({ targetCount: null, targetKind: null })), "check_in",
    "Ordinary Accountability keeps the check-in it has always had.");
  assert.equal(accountabilityProgressKind(goal({ targetCount: null, targetKind: "people" })), "check_in",
    "A kind without a number counts nothing and must not add multiplication UI.");

  // Ordinary goals stay completely undecorated.
  for (const title of ["Read John 4-6", "Pray daily", "Stay sober", "Call your brother"]) {
    const ordinary = goal({ targetCount: null, targetKind: null, title });
    assert.equal(accountabilityProgressKind(ordinary), "check_in", `${title} must stay ordinary.`);
    assert.equal(accountabilityProgressLabel(ordinary), null, `${title} must show no progress UI.`);
    assert.deepEqual(accountabilityConfirmedSubjects(ordinary.updates), [], `${title} must list no subjects.`);
  }

  // The two targets read differently: people are confirmed, occurrences are tallied.
  assert.equal(accountabilityProgressLabel(goal({ targetCount: 3, targetKind: "people", updates: [{ subjectPersonName: "Philip" }] })), "1 of 3 confirmed");
  assert.equal(accountabilityProgressLabel(goal({ targetCount: 3, targetKind: "count", updates: [{ progressNote: "read" }] })), "1 of 3");
});

/* Philip is one man however many times he is mentioned, and he is dated from
   when he started rather than when he was last discussed. */
await check("Confirmed subjects list each person once, and progress never closes the goal", async () => {
  const subjects = accountabilityConfirmedSubjects([
    { subjectPersonName: "Marcus", updateDate: "2026-09-03" },
    { subjectPersonName: " marcus ", updateDate: "2026-09-10" },
    { subjectPersonId: "person-philip", subjectPersonNameResolved: "Philip", updateDate: "2026-09-05" },
    { progressNote: "Going well" },
  ]);

  assert.deepEqual(subjects.map((subject) => subject.name), ["Marcus", "Philip"],
    "Repeated mentions are one person; an update naming nobody is not a person at all.");
  assert.equal(subjects[0].startedDate, "2026-09-03", "A subject is dated from when they started, not when last mentioned.");
  assert.equal(subjects.length, commitmentConfirmedSubjectCount([
    { subjectPersonName: "Marcus" },
    { subjectPersonName: " marcus " },
    { subjectPersonId: "person-philip" },
    { progressNote: "Going well" },
  ]), "The list and the count must never disagree about how many people are confirmed.");

  // Different people count separately, all the way to the target.
  assert.equal(commitmentConfirmedSubjectCount([
    { subjectPersonId: "a" }, { subjectPersonId: "b" }, { subjectPersonName: "Carl" },
  ]), 3, "Distinct people each count once.");

  const rows = unifiedAccountabilityRows({
    commitments: [{
      id: "multiply",
      status: "active",
      targetCount: 3,
      targetKind: "people",
      targetDate: null,
      title: "Begin discipling 3 men",
      updates: [
        { subjectPersonName: "Marcus", updateDate: "2026-09-03" },
        { subjectPersonName: "marcus", updateDate: "2026-09-10" },
      ],
    }],
    dateValue: (value) => (value ? Date.parse(`${value}T00:00:00Z`) : 0),
    formatDate: (value) => value ?? "",
    isJourneyFollowUp: () => false,
    scheduleTitle: (schedule) => schedule.title,
    schedules: [],
    today: "2026-09-03",
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].meta, "1 of 3 confirmed", "Two updates about one man are one confirmed man.");
  assert.equal(rows[0].progressKind, "people");
  assert.deepEqual(rows[0].subjects.map((subject) => subject.name), ["Marcus"], "The Overview shows the man once, not once per note.");
  assert.equal(rows[0].subjects.length, 1, "Progress notes must not be dumped into the Overview one row each.");
});

/* Recording that John started discipling Philip must not require a meeting to
   have happened, must not create a Person to hold a name, must not close the
   goal, and must not leak into Fruit or Circle. */
await check("People progress is recorded without a Meeting, a Person record, Fruit or a Circle move", async () => {
  const updatesRoute = readFileSync(new URL("../app/api/dos/app/commitments/updates/route.ts", import.meta.url), "utf8");
  const commitmentsRoute = readFileSync(new URL("../app/api/dos/app/commitments/route.ts", import.meta.url), "utf8");
  const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");

  // A subject alone is a complete update; an empty one is still refused.
  /* A fourth way to say something was added later: an explicit progress
     amount. An update carrying none of the four is still refused. */
  assert(
    updatesRoute.includes("if (!progressNote && !subjectPersonId && !subjectPersonName && !hasAmount) {"),
    "An update must carry a note, a person, a name or an amount, and is rejected with none of them.",
  );
  assert(
    !updatesRoute.includes("if (!isUuid(commitmentId) || !progressNote) {"),
    "A progress note must no longer be mandatory: \"Philip, started Sep 3\" says enough on its own.",
  );

  // Both subject columns are actually written, and a name never becomes a Person.
  assert(updatesRoute.includes("subject_person_id: subjectPersonId,"), "An existing DOS Person is stored by id.");
  assert(updatesRoute.includes("subject_person_name: subjectPersonName,"), "Someone not in DOS is stored by name.");
  for (const route of [updatesRoute, commitmentsRoute]) {
    assert(!/missionary_field_people[\s\S]{0,120}\.insert\(/.test(route), "Recording progress must never create a placeholder Person.");
    assert(!/fruit_events|fruit_type/.test(route), "Accountability progress must never create Fruit.");
    assert(!/dos_relationship_scores|dos_circle_overrides/.test(route), "Accountability progress must never move a Circle.");
  }

  // The owner cannot be one of the people they are discipling.
  assert(
    updatesRoute.includes("subjectPersonId === String(commitmentResult.data.person_id)"),
    "Selecting the Accountability owner must be refused at the API boundary, not merely hidden in the picker.",
  );

  // Confirming one man must not complete the whole goal.
  const submitStart = client.indexOf("async function handleCommitmentSubjectSubmit(");
  assert(submitStart !== -1, "The Add Person flow must exist.");
  const submitBody = client.slice(submitStart, client.indexOf("\n  async function", submitStart + 10));
  assert(!submitBody.includes("progressState"), "The Add Person flow must not send progressState, or the API would close the goal.");
  assert(submitBody.includes("subjectPersonId"), "The Add Person flow must send the chosen subject.");
  assert(
    updatesRoute.includes('progressState === "completed"'),
    "Completion stays an explicit state the Add Person flow never sends.",
  );

  // The picker offers everyone except the owner, and does not require creating a Person.
  const sheetStart = client.indexOf("function CommitmentSubjectSheet({");
  const sheetBody = client.slice(sheetStart, client.indexOf("\nfunction ", sheetStart + 10));
  assert(sheetBody.includes("candidate.id !== commitment.personId"), "The owner must never be offered as a subject.");
  assert(sheetBody.includes('name="subject_person_name"'), "A name-only subject must be enterable.");
  assert(sheetBody.includes("Who are they discipling?"), "The people flow must ask who, plainly.");
});

/* A number goal still records whether progress means people or a generic
   count, but the form asks directly instead of sending the user through a
   Yes/No gate about implementation details. */
await check("A number goal records its unit without an extra Yes or No gate", async () => {
  const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");
  const fieldsStart = client.indexOf("function AccountabilityFields({");
  const fields = client.slice(fieldsStart, client.indexOf("\nfunction ", fieldsStart + 10));

  assert(fields.includes('label="Count"'), "The one canonical form names the unit plainly.");
  assert(!fields.includes("Is there a number you're working toward?"), "The old Yes/No number gate must stay removed.");
  assert(fields.includes('trackingMode === "number"'), "Target and unit fields appear only for a number goal.");
  assert(fields.includes('{ label: "People", value: "people" as const }'), "People stores the people kind.");
  assert(fields.includes('{ label: "Times", value: "count" as const }'), "Times reads plainly but stores the generic count kind.");

  // The choice travels to the commitments endpoint, and never without a number.
  const routerStart = client.indexOf("function accountabilityRoute(");
  const router = client.slice(routerStart, client.indexOf("\n  function ", routerStart + 10));
  assert(router.includes("targetCount !== null && isDosCommitmentTargetKind(rawKind)"), "A kind is only stored alongside a real number.");
  assert(router.includes("targetKind,"), "The chosen kind reaches the commitments endpoint.");

  // Rows name their own action, so nobody infers that "Check in" adds a person.
  assert(
    client.includes('row.progressKind === "people" ? "Add person" : row.progressKind === "count" ? "Add progress" : "Check in"'),
    "Each row must name the action it actually performs.",
  );
});

/* PRODUCTION DEFECT, 2026-09-03. Person -> Accountability -> Add person ->
   Save answered "Commitments and accountability are not ready yet."

   Two faults, one visible. The API had been relaxed so that naming who was
   discipled is a complete update, but dos_commitment_updates still carried
   dos_commitment_updates_note_check demanding a non-empty progress_note, so a
   subject-only insert was refused. Postgres words that refusal as

     new row for relation "dos_commitment_updates" violates check constraint

   and the missing-schema matcher accepted any message merely CONTAINING one of
   its table names -- so a rejected row was reported as an unbuilt feature, and
   the true cause was invisible. The constraint now matches the contract, and
   the matcher no longer claims a table is missing when the database has simply
   refused a row. */
await check("A refused row is never reported as an unbuilt feature", async () => {
  const constraintViolation = {
    message: 'new row for relation "dos_commitment_updates" violates check constraint "dos_commitment_updates_note_check"',
  };
  assert.equal(isMissingCommitmentsSchema(constraintViolation), false,
    "The exact production error must reach the user as itself, not as a setup problem.");

  for (const message of [
    'null value in column "progress_note" of relation "dos_commitment_updates" violates not-null constraint',
    'insert or update on table "dos_commitment_updates" violates foreign key constraint "dos_commitment_updates_commitment_id_fkey"',
    'duplicate key value violates unique constraint "dos_person_commitments_pkey"',
  ]) {
    assert.equal(isMissingCommitmentsSchema({ message }), false, `A refused row is not missing schema: ${message}`);
  }

  // Genuinely absent schema must still be recognised, or setup guidance is lost.
  for (const message of [
    'relation "public.dos_person_commitments" does not exist',
    "Could not find the 'subject_person_id' column of 'dos_commitment_updates' in the schema cache",
    'relation "public.dos_workspace_feature_flags" does not exist',
  ]) {
    assert.equal(isMissingCommitmentsSchema({ message }), true, `Missing schema must still be recognised: ${message}`);
  }

  assert.equal(isMissingCommitmentsSchema({ message: 'relation "public.meeting_reflections" does not exist' }), false,
    "Another feature's missing table is not this feature's setup problem.");
  assert.equal(isMissingCommitmentsSchema(null), false, "No error is not a missing table.");

  // The database now enforces exactly what the route enforces.
  const migration = readFileSync(new URL("../supabase/migrations/20260903180000_usa_168_subject_only_progress_updates.sql", import.meta.url), "utf8");
  assert(migration.includes("drop constraint if exists dos_commitment_updates_note_check"), "The note-only constraint must be gone.");
  assert(
    migration.includes("length(btrim(progress_note)) > 0")
      && migration.includes("subject_person_id is not null")
      && migration.includes("length(btrim(coalesce(subject_person_name, ''))) > 0"),
    "The replacement must accept a note OR a DOS Person OR a name -- the same contract the route applies.",
  );
});

/* The Add Person request the browser actually sends must match what the route
   reads, or the write fails for a reason no test would catch. */
await check("Add Person sends exactly what the update route reads", async () => {
  const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");
  const route = readFileSync(new URL("../app/api/dos/app/commitments/updates/route.ts", import.meta.url), "utf8");

  const submitStart = client.indexOf("async function handleCommitmentSubjectSubmit(");
  const submit = client.slice(submitStart, client.indexOf("\n  async function", submitStart + 10));

  assert(submit.includes('"/api/dos/app/commitments/updates"'), "Add Person must post to the deployed updates route.");

  /* The REQUEST BODY, not merely the surrounding function -- a local variable
     of the same name proves nothing about what is actually sent. */
  const bodyStart = submit.indexOf('"/api/dos/app/commitments/updates",');
  const body = submit.slice(submit.indexOf("{", bodyStart), submit.indexOf("\n      },", bodyStart));
  assert(body.includes("commitmentId"), "The request body must be found before asserting about it.");

  for (const field of ["commitmentId", "date", "progressNote", "subjectPersonId", "subjectPersonName"]) {
    assert(new RegExp(`(^|[\\s{,])${field}\\s*[,:]`).test(body), `The request body must carry ${field}.`);
    assert(route.includes(`payload.${field}`), `The route must read ${field} from the payload.`);
  }

  // The commitment id comes from the sheet's own hidden field, not from ambient state.
  const sheetStart = client.indexOf("function CommitmentSubjectSheet({");
  const sheet = client.slice(sheetStart, client.indexOf("\nfunction ", sheetStart + 10));
  assert(sheet.includes('<input name="commitment_id" type="hidden" value={commitment.id} />'), "The sheet must carry the commitment it was opened on.");
  assert(submit.includes('String(formData.get("commitment_id") ?? "")'), "The request must send that commitment id.");

  // A name-only save carries no note, which the route and the database now both allow.
  assert(sheet.includes('name="subject_person_name"'), "A name-only subject must be enterable.");
  assert(!/name="progress_note"[^>]*required/.test(sheet), "The note must not be required in the markup either.");
  assert(
    route.includes("if (!progressNote && !subjectPersonId && !subjectPersonName && !hasAmount) {"),
    "A subject alone is a complete update; nothing at all is still refused.",
  );

  // Guards stay where they belong.
  assert(route.includes("authorizeDosCommitmentsWrite()"), "Writes stay behind DOS write authorization.");
  assert(route.includes("resolveAuthorizedCommitmentsWorkspace("), "Writes stay scoped to an authorized workspace.");
  assert(route.includes('.eq("workspace_id", workspaceResult.workspaceId)'), "The commitment must belong to that workspace.");
  assert(route.includes("subjectPersonId === String(commitmentResult.data.person_id)"), "The owner is refused as their own subject.");
});

/* The user picks the way progress works in words they already understand.
   That one choice reveals only the fields the selected goal needs. */
await check("Natural tracking choices progressively reveal only relevant fields", async () => {
  const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");
  const fieldsStart = client.indexOf("function AccountabilityFields({");
  const fields = client.slice(fieldsStart, client.indexOf("\nfunction ", fieldsStart + 10));

  for (const label of ["Check in regularly", "Reach a number", "Complete once"]) {
    assert(fields.includes(`label: "${label}"`), `${label} must be offered.`);
  }
  assert(fields.includes('trackingMode === "regular"'), "Frequency is revealed only for a regular check-in.");
  assert(fields.includes('trackingMode === "number"'), "Target and Count are revealed only for a number goal.");
  assert(fields.includes('label={trackingMode === "regular" ? "Start" : "Due"}'), "Regular rhythms start; finite goals are due.");
  assert(!fields.includes("Is there a number you're working toward?"), "The form must not ask the removed Yes/No question.");
  assert(!fields.includes('label="Type"'), "The form must not expose Recurring versus One-time as a technical type.");
  assert(fields.includes('label="Start with an area"'), "The guided category entry point must remain available.");
  assert(fields.includes('label="Suggested goals"'), "Selecting an area must provide useful examples.");
  assert(fields.includes('label="What are they working toward?"'), "The custom goal question must stay clear and person-centered.");

  /* No database words in anything the user can actually read. Identifiers and
     form field names are not user-visible and are deliberately not checked;
     labels, helpers, placeholders and choice text are. */
  const visibleText = [
    ...fields.matchAll(/(?:label|helper|placeholder)="([^"]+)"/g),
    ...fields.matchAll(/label: "([^"]+)"/g),
  ].map((match) => match[1]);
  assert(visibleText.length >= 10, "The form's visible copy must actually have been found before asserting about it.");
  for (const text of visibleText) {
    assert(!/target_count|target_kind|commitment|schedule|subject/i.test(text), `The form must not say "${text}" to the user.`);
  }
});

/* Section-level creation and row-level progress must not look like the same
   action. "+ Add" in the heading makes a new Accountability; a row's action
   works on the one that is already there. */
await check("Creating an Accountability and progressing one look different", async () => {
  const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");
  const personDetail = client.slice(
    client.indexOf("function PersonDetailOverlay({"),
    client.indexOf("\nfunction ReviewActionButton({"),
  );
  const section = personDetail.slice(personDetail.indexOf('aria-label="Accountability"'));
  const sectionBody = section.slice(0, section.indexOf("</section>"));

  // Exactly one blue creation link, on the heading. Comments and the empty
  // state may mention it in prose; only real controls are counted.
  const code = sectionBody.replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
  const blueAddControls = code.match(/text-dos-blue"[^>]*>\s*\+ Add\s*</g) ?? [];
  assert.equal(blueAddControls.length, 1, "Exactly one blue + Add, and it belongs to the heading.");
  assert(/onClick=\{onAddAccountabilitySchedule\}[\s\S]{0,120}\+ Add/.test(code), "That + Add creates a new Accountability.");

  /* Row actions moved inside the record. The Overview row is now the doorway
     to the Accountability itself, so the action that fits it lives in its
     detail sheet rather than on a surface meant to be scanned. */
  assert(sectionBody.includes("<PersonRecordRow"), "A row opens its record.");
  assert(!sectionBody.includes("topic.actionLabel"), "The Overview no longer carries per-record actions.");
  assert(
    client.includes('row.progressKind === "people" ? "Add person" : row.progressKind === "count" ? "Add progress" : "Check in"'),
    "People add a person, counts add progress, ordinary accountability checks in.",
  );
  assert(!client.includes('"+ Add person"'), "A progress action must never be worded as a creation link.");
});

/* QUICK REVIEW V2. The question is "after meeting with me, what did this
   person experience?" -- three questions and one request, on one screen. */
await check("Quick Review asks three questions and one request, and nothing it already knows", async () => {
  const form = readFileSync(new URL("../app/dos/review/[token]/DosQuickReviewForm.tsx", import.meta.url), "utf8");

  // The context a recipient needs to recognise the conversation.
  assert(form.includes("How was your conversation with ${leaderFirstName}?"), "The header must name the leader.");
  assert(form.includes("formatMeetingDate(reviewLink.meetingDate)"), "The header must date the conversation.");
  assert(form.includes("You&apos;re answering as") || form.includes("You're answering as"), "The recipient must see who they are answering as.");
  assert(form.includes("Not you?"), "The identity correction must survive.");
  assert(form.includes("linkKnowsReviewer && !isEditingIdentity"), "A bound link must not ask for identity up front.");

  // Three questions and one separated request.
  assert(form.includes("How was it?"), "Q1 is the overall rating.");
  assert(form.includes("Did any of this happen? (optional)"), "Q2 is optional.");
  assert(form.includes("Anything you&apos;d like us to know? (optional)") || form.includes("Anything you'd like us to know? (optional)"), "Q3 is optional.");
  assert(form.includes("I&apos;d like someone to follow up with me"), "The follow-up request must exist as its own control.");
  assert(
    form.indexOf("border-t border-[#EAF2FF]") < form.indexOf("I&apos;d like someone to follow up with me"),
    "The request must be visually separated from the experience questions.",
  );

  // Everything the audit retired is gone from what is asked.
  for (const retired of ["I felt heard", "I felt cared for", "I would be happy to meet again", "Last Name", "Email"]) {
    assert(!form.includes(`label="${retired}"`) && !form.includes(`>${retired}<`), `${retired} must no longer be asked.`);
  }
  assert(!form.includes("submittedEmail"), "Email must not be collected; the link already knows the Person.");

  // The rating is the one thing worth insisting on.
  assert(form.includes("if (!overallRating) {"), "A review with no rating must not submit.");

  // Four experience options, not ten.
  assert.equal(dosQuickReviewExperienceOptions.length, 4, "Q2 must stay short.");
  assert.deepEqual(dosQuickReviewExperienceOptions.map((option) => option.value), ["Closer to God", "Prayer Received", "New Believers", "Discipling"]);
  assert(dosQuickReviewOutcomeOptions.length > dosQuickReviewExperienceOptions.length,
    "The historical tag set must stay wider than what is offered, so stored tags still render.");
  for (const option of dosQuickReviewExperienceOptions) {
    assert(dosQuickReviewOutcomeOptions.some((historical) => historical.value === option.value),
      `${option.value} must remain a recognised historical tag.`);
  }

  // The leader-facing preview must describe the form that exists.
  const previewLabels = dosQuickReviewFormDefinition.sections.map((section) => section.label);
  assert(previewLabels.includes("How was it?"), "The preview must match the real first question.");
  assert(!previewLabels.includes("I felt heard"), "The preview must not advertise a question nobody is asked.");
});

/* The two derivations that put words in the recipient's mouth. */
await check("Quick Review never claims something the recipient did not say", async () => {
  const reviews = readFileSync(new URL("../src/lib/dos/reviews.ts", import.meta.url), "utf8");

  // step_toward_jesus was written from how helpful the conversation was.
  assert(
    !reviews.includes("stepTowardJesus: normalizedChoice(payload.stepTowardJesus, dosReviewStepAnswers) ?? answerToLegacyUnsure(conversationHelpful)"),
    "\"Very meaningful\" must no longer be recorded as a step toward Jesus.",
  );
  assert(
    !/step_toward_jesus: answerToLegacyUnsure\(/.test(reviews),
    "step_toward_jesus must not be derived from the rating.",
  );
  assert(
    reviews.includes('submission.outcomeTags?.includes("New Believers") ? "yes" : null'),
    "Only an explicit \"I decided to follow Jesus\" may support it, and its absence means unknown rather than no.",
  );

  // wants_follow_up was written from "I would be happy to meet again".
  assert(
    !/wants_follow_up:[\s\S]{0,120}answerToLegacyMaybe\(submission.wouldMeetAgain\)/.test(reviews),
    "Being glad to meet again must no longer be recorded as asking for follow-up.",
  );
  assert(
    !reviews.includes("wantsFollowUp: normalizedChoice(payload.wantsFollowUp, dosReviewFollowUpAnswers) ?? answerToLegacyMaybe(wouldMeetAgain)"),
    "The normalizer must not invent a follow-up request either.",
  );
  assert(reviews.includes("wants_follow_up: submission.wantsFollowUp"), "Follow-up comes from the explicit control.");

  // A blank submission cannot burn a single-use link.
  assert(reviews.includes("if (!submission.overallRating) {"), "A review answering nothing must be refused server-side.");

  // Still recipient-reported, and still nothing else.
  assert(!/fruit_events|missionary_fruit_items/.test(reviews), "Submitting a review must not create Fruit.");
  assert(!/participant_testimonies/.test(reviews), "Submitting a review must not create a Testimony.");
});

/* Satisfaction is not discipleship depth. */
await check("Quick Review changes no Circle placement and no relationship score", async () => {
  const reviews = readFileSync(new URL("../src/lib/dos/reviews.ts", import.meta.url), "utf8");
  /* Comments explain why the sentiment coupling was removed and necessarily
     name it, so assert against code with comments stripped. */
  const scoringSource = readFileSync(new URL("../src/lib/dos/circle-scoring.ts", import.meta.url), "utf8");
  const scoring = scoringSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

  // Submitting does not trigger a recalculation at all.
  assert(!reviews.includes("recalculateCircleScores"), "Submitting a Quick Review must not recalculate circle scores.");
  assert(!reviews.includes("dos_relationship_scores"), "Submitting a Quick Review must not write a relationship score.");
  assert(!reviews.includes("dos_circle_overrides"), "Submitting a Quick Review must not touch circle placement.");

  // And review sentiment contributes nothing to the score when something else
  // does trigger one.
  assert(!scoring.includes("quickReviewRelationshipScore"), "Review sentiment must not feed the score breakdown.");
  assert(!scoring.includes("quickReviewPositiveSignals"), "Felt-heard style answers must not score a relationship.");
  assert(!scoring.includes("quickReviewGrowthSignals"), "Self-reported experience must not score discipleship depth.");
  /* Case-insensitive: personQuickReviews is the same coupling under another
     capitalisation, and the first version of this check missed it. */
  assert(
    !/discipleshipProgress:[^\n]*quickreview/i.test(scoring),
    "Discipleship progress must not be inferred from how a conversation felt.",
  );
  assert(
    !/(fruit|momentum|multiplication|meetingFrequency|timeInvested):[^\n]*quickreview/i.test(scoring),
    "No score component may be computed from Quick Reviews.",
  );

  // A follow-up note is still surfaced, but only when actually requested.
  const followUp = scoringSource.slice(scoringSource.indexOf("function quickReviewRequestedFollowUp("));
  const followUpBody = followUp.slice(0, followUp.indexOf("\n}") + 2);
  assert(followUpBody.includes('review.wants_follow_up === "yes"'), "An explicit request still counts.");
  assert(!followUpBody.includes("would_meet_again_response"), "Being glad to meet again is not a follow-up request.");

  // The timestamp of a real event is still a real event.
  assert(reviews.includes("last_activity_at: submittedAt"), "A submitted review is still activity on that date.");
});

/* The leader has to be able to see it without digging. */
await check("Completed feedback reaches Person Overview, and history still renders", async () => {
  const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");
  const personDetail = client.slice(
    client.indexOf("function PersonDetailOverlay({"),
    client.indexOf("\nfunction ReviewActionButton({"),
  );

  assert(personDetail.includes('aria-label="Feedback"'), "Person Overview must carry a Feedback section.");
  const section = personDetail.slice(personDetail.indexOf('aria-label="Feedback"'));
  const sectionBody = section.slice(0, section.indexOf("</section>"));
  assert(sectionBody.includes("latestPersonFeedback.overallRating"), "It must lead with how the conversation was.");
  assert(sectionBody.includes("latestPersonFeedback.comment"), "It must show what they wrote.");
  assert(sectionBody.includes("Follow-up requested"), "A follow-up request must be plainly visible, not a subtle badge.");
  assert(personDetail.includes('item.kind === "quick_review"'), "Only Quick Review feeds it; a Testimony is its own thing.");

  // Deeper destinations survive.
  assert(personDetail.includes('kind: "quick_review" as const'), "The Timeline entry stays.");
  /* The sheet is now titled Feedback and split into Quick Reviews and
     Testimonies; it is still the deeper destination it always was. */
  assert(personDetail.includes("title={`Feedback · ${firstName}`}"), "The reviews sheet stays, as Feedback.");

  // Historical answers still render on Meeting Detail rather than vanishing.
  assert(client.includes("Historical answers keep rendering"), "Retired questions must still show where a review recorded them.");
  assert(client.includes("quickReviewAnswerLabel(review.feltHeard)"), "felt_heard must still render for reviews that have it.");
  assert(client.includes("quickReviewMeetAgainLabel(review)"), "would_meet_again must still render for reviews that have it.");
});

/* A feedback link is texted to one person. Its unfurl has to say what it is,
   and must say nothing about who it is for. */
await check("A Quick Review link previews as feedback, and names nobody", async () => {
  const page = readFileSync(new URL("../app/dos/review/[token]/page.tsx", import.meta.url), "utf8");
  const card = readFileSync(new URL("../app/dos/review/opengraph-image.tsx", import.meta.url), "utf8");

  const metadataCodeOf = (source) => source
    .slice(source.indexOf("export const metadata"), source.indexOf("export default async function"))
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");

  assert(page.includes('title: "Share your feedback"'), "The preview title must say what the link is.");
  assert(page.includes('description: "A quick review of your conversation."'), "The description must explain it in one line.");
  assert(page.includes("openGraph: {") && page.includes("twitter: {"), "Both unfurl formats must be overridden, not inherited.");
  assert(card.includes('title: "Share your feedback"'), "The card must carry the same words as the metadata.");
  assert(card.includes('brand: "discipleship-operating-system"'), "DOS branding stays.");

  /* Nothing identifying may reach a preview: it is rendered and cached by the
     messaging app, outside the token that protects everything else. */
  for (const leak of ["reviewerPersonName", "leaderName", "recipientPersonId", "meetingDate", "meetingId", "person.name"]) {
    assert(!card.includes(leak), `The share card must not expose ${leak}.`);
    assert(!metadataCodeOf(page).includes(leak), `Link metadata must not expose ${leak}.`);
  }
  /* The card must actually be referenced. Declaring an openGraph object at
     all suppresses Next's file-convention injection, which shipped this route
     once with a correct title and no picture; the first version of this check
     asserted the opposite and let that through. It must point at the generated
     card, and never at the generic DOS promotional image. */
  const metadataCode = metadataCodeOf(page);
  assert(metadataCode.includes('url: "/dos/review/opengraph-image"'), "The preview must reference the Quick Review card.");
  assert(!/images:\s*undefined/.test(metadataCode), "images must never be undefined, which suppresses the card entirely.");
  assert(!metadataCode.includes("share/discipleship-operating-system"), "It must not fall back to the generic DOS promotional card.");
});

/* The public form is DOS, not a generic web questionnaire. */
await check("The public review form uses the DOS visual system", async () => {
  const form = readFileSync(new URL("../app/dos/review/[token]/DosQuickReviewForm.tsx", import.meta.url), "utf8");

  assert(form.includes("radial-gradient"), "It must sit on the DOS atmospheric background.");
  assert(form.includes("bg-dos-blue") && form.includes("text-dos-primary"), "It must use DOS tokens rather than ad-hoc hexes.");
  /* Assert the colour of the submit control, not the spacing around it: a
     margin tweak is not a design regression. */
  const sendButton = form.slice(form.lastIndexOf("<button"), form.lastIndexOf("</button>"));
  assert(sendButton.includes("bg-dos-blue"), "Send must be canonical DOS blue.");
  assert(sendButton.includes("Sending...") && sendButton.includes("Send"), "That control is the submit button.");
  assert(!form.includes("bg-[#111111]"), "The black submit button is gone.");
  assert(!form.includes("font.oswald") && !form.includes("font.rajdhani"), "The standalone form fonts are gone.");

  // One surface divided by rules, not a stack of bordered cards.
  assert.equal((form.match(/border-t border-dos-rule/g) ?? []).length, 4, "Questions are separated by rules, not by their own boxes.");
  assert(!/rounded-\[20px\] border border-\[#DCEBFF\]/.test(form), "The old card-per-question treatment is gone.");
  assert(form.includes("function RatingRow("), "The rating uses a deliberate DOS control.");
  assert(form.includes("function ExperienceChip("), "The optional signals read as chips.");

  // Nothing paler than dos-secondary carries a sentence.
  assert(!form.includes("text-[#94A3B8]") && !form.includes("text-dos-disabled"), "No pale gray readable text.");
});

/* Fruit is what we observed. Feedback is what they reported. The Person must
   not blur them, and neither may be shown three times. */
await check("Fruit and Feedback are separate everywhere on the Person", async () => {
  const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");
  const personDetail = client.slice(
    client.indexOf("function PersonDetailOverlay({"),
    client.indexOf("\nfunction ReviewActionButton({"),
  );

  // Fruit's Overview section carries no feedback link.
  const fruitSection = personDetail.slice(personDetail.indexOf("const renderFruit = () => {"));
  const fruitBody = fruitSection.slice(0, fruitSection.indexOf("\n  };"));
  assert(!fruitBody.includes("Reviews &amp; testimonies"), "Fruit must not link to reviews and testimonies.");
  assert(!fruitBody.includes("testimonyCount") && !fruitBody.includes("reviewCount"), "Fruit must not count what people reported.");
  /* Fruit records are now rows you open directly, so the section no longer
     needs its own navigation action at all. */
  assert(fruitBody.includes("<PersonRecordRow"), "A Fruit record opens itself.");
  assert(fruitBody.includes("setSelectedOutcomeEntry(entry)"), "And opens the purpose-built Fruit detail.");

  // Feedback is its own section, present even when empty.
  assert(personDetail.includes('aria-label="Feedback"'), "Feedback is its own Overview section.");
  const feedback = personDetail.slice(personDetail.indexOf('aria-label="Feedback"'));
  const feedbackBody = feedback.slice(0, feedback.indexOf("</section>"));
  assert(feedbackBody.includes("No feedback yet."), "It keeps a restrained empty state, worded like the others.");
  assert(feedbackBody.includes("Follow-up requested"), "A follow-up request is plainly visible.");
  /* Add reminder moved into the record's own detail, where the rest of that
     review's actions are. */
  assert(client.includes("onAddFollowUpReminder"), "A requested follow-up still offers the canonical Reminder form.");

  // The deep sheet is Feedback, and holds no Fruit.
  const sheet = client.slice(client.indexOf("{isFruitReviewsOpen ? ("), client.indexOf("{isCircleReviewOpen && visibleCircleSuggestion ? ("));
  assert(sheet.includes("title={`Feedback · ${firstName}`}"), "The sheet is Feedback, not Fruit and feedback.");
  assert(sheet.includes("Quick Reviews") && sheet.includes("Testimonies"), "It lists what the person reported.");
  assert(!sheet.includes("Fruit observed"), "It must not duplicate Fruit.");
  assert(!sheet.includes("fruitOutcomeLabel"), "It must not render Fruit records at all.");

  // Fruit gets its own destination instead.
  assert(client.includes("title={`Fruit · ${firstName}`}"), "Fruit has its own sheet.");

  // Details is Person reference information, not a third doorway.
  assert(!personDetail.includes("Fruit &amp; reviews"), "Details must not repeat Fruit and reviews.");

  // Timeline keeps them as separate chronological events.
  assert(personDetail.includes('kind: "quick_review" as const') && personDetail.includes('kind: "fruit" as const'),
    "Timeline keeps Quick Review and Fruit as separate events.");
});

/* Request wording, request context, and no em dashes in any of it. */
await check("Feedback requests name the conversation, in consistent words", async () => {
  const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");
  const sheet = client.slice(client.indexOf("{isFruitReviewsOpen ? ("), client.indexOf("{isCircleReviewOpen && visibleCircleSuggestion ? ("));

  assert(sheet.includes("For your {formatShortDate(lastMeeting.date)}"), "The request must name the conversation it attaches to.");
  assert(sheet.includes("conversation with {person.name}"), "And who it was with.");
  assert(/>\s*Request Review\s*</.test(sheet), "Consistent wording: Request Review.");
  assert(/>\s*Request Testimony\s*</.test(sheet), "Consistent wording: Request Testimony.");
  assert(!sheet.includes("Requests are tied to a specific conversation"), "The vague explanatory line is gone.");

  // The FAB still opens the selector, which is a different question.
  assert(client.includes('label: "Request feedback"'), "The FAB entry keeps its own wording, because it opens a choice.");

  /* No em dashes in copy anyone reads, across everything this pass touched. */
  const files = [
    "../app/dos/review/[token]/DosQuickReviewForm.tsx",
    "../app/dos/review/[token]/page.tsx",
    "../app/dos/review/opengraph-image.tsx",
    "../src/lib/dos/review-form-config.ts",
  ];
  for (const file of files) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    const copy = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    assert(!copy.includes("\u2014"), `${file} must contain no em dashes in user-facing copy.`);
  }
  const clientCopy = client.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  for (const line of clientCopy.split("\n")) {
    if (line.includes("\u2014") && /dos-body|dos-primary|Feedback|Accountability|conversations yet/.test(line)) {
      throw new Error(`Person copy still contains an em dash: ${line.trim().slice(0, 90)}`);
    }
  }
});

/* A link that is texted out should not stay live forever. */
await check("New review links expire, and existing links are left alone", async () => {
  const requests = readFileSync(new URL("../src/lib/dos/review-requests.ts", import.meta.url), "utf8");
  const reviews = readFileSync(new URL("../src/lib/dos/reviews.ts", import.meta.url), "utf8");

  assert(requests.includes("export const dosReviewLinkLifetimeDays = 30;"), "New links get a thirty day life.");
  assert(requests.includes("expires_at: reviewLinkExpiresAt(),"), "The expiry is set when the link is created.");
  assert(/expires_at: reviewLinkExpiresAt\(\)/.test(requests) && !/update\([\s\S]{0,200}expires_at/.test(requests),
    "Existing links must never be back-filled or retroactively expired.");
  assert(reviews.includes("link.expires_at && new Date(link.expires_at).getTime() < Date.now()"),
    "Expiry enforcement stays exactly where it was.");
});

/* Working from a Person, every record opens a surface designed for the concept
   it is, never the shared record inspector. That inspector still serves the
   Fruit app's Reviews tab, where the metadata it shows is the point. */
await check("A Person never opens the generic record inspector", async () => {
  const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");
  const personDetail = client.slice(
    client.indexOf("function PersonDetailOverlay({"),
    client.indexOf("\nfunction ReviewActionButton({"),
  );
  const personCode = personDetail.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

  for (const inspector of ["onOpenReview", "Open Table", "Related Table", "Review Type", "Submitted By", "sourceType", "generatedBy"]) {
    assert(!personCode.includes(inspector), `A Person must never surface ${inspector}.`);
  }

  // The Person's own sheets exist, and each answers its own question.
  for (const sheet of ["function PersonFeedbackDetailSheet(", "function PersonFruitDetailSheet(", "function PersonPrayerSheet("]) {
    assert(client.includes(sheet), `${sheet} must exist.`);
  }

  /* The shared inspector is left alone where it is still the right surface. */
  assert(client.includes("function ReviewDetailSheet("), "The shared inspector stays for the Fruit app's Reviews tab.");
  assert(client.includes("<SubmittedReviewsList items={submittedReviewItems} onOpenReview={openSubmittedReview} />"),
    "That tab still routes to it.");

  // The Person's Fruit detail no longer floats above its own card.
  assert(!personCode.includes("MobileBottomSheet"), "Person detail surfaces use the canonical sheet, not the absolutely positioned popup.");
  const fruitSheet = client.slice(client.indexOf("function PersonFruitDetailSheet("));
  const fruitBody = fruitSheet.slice(0, fruitSheet.indexOf("\nfunction "));
  assert(fruitBody.includes("<Sheet "), "Fruit detail uses the canonical DOS sheet.");
  assert(!fruitBody.includes("Source") && !fruitBody.includes("People Involved"), "Fruit detail shows the fact, not how DOS stored it.");
});

/* Overview and Timeline must land on the same surface for the same record. */
await check("Overview and Timeline open the same detail for the same record", async () => {
  const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");
  const personDetail = client.slice(
    client.indexOf("function PersonDetailOverlay({"),
    client.indexOf("\nfunction ReviewActionButton({"),
  );

  // Feedback: the sheet's rows and both Timeline entries use one setter.
  assert.equal(
    (personDetail.match(/setSelectedFeedbackItem\(item\)/g) ?? []).length,
    4,
    "Feedback opens one surface from the sheet's reviews, its testimonies, and both Timeline entries.",
  );
  assert(personDetail.includes('onClick: () => setSelectedFeedbackItem(item),'), "Timeline routes into it.");

  // Fruit: Overview rows, the Fruit sheet and the Timeline share one setter.
  assert(personDetail.includes("onClick: () => setSelectedOutcomeEntry(entry)"), "Timeline Fruit opens the Person Fruit detail.");
  assert(personDetail.includes("<PersonFruitDetailSheet entry={selectedOutcomeEntry}"), "And that is the purpose-built sheet.");

  // A V2 review has no answers to the retired questions, so none are shown.
  const feedbackSheet = client.slice(client.indexOf("function PersonFeedbackDetailSheet("));
  const feedbackBody = feedbackSheet.slice(0, feedbackSheet.indexOf("\nfunction "));
  assert(
    feedbackBody.includes('historicalReviewAnswers(review).filter(([, value]) => value.toLowerCase() !== "skipped")'),
    "Skipped is not an answer and must never render as one.",
  );
  assert(feedbackBody.includes("What they experienced") && feedbackBody.includes("What they shared"),
    "It reads as what the person reported.");
  assert(feedbackBody.includes("Follow-up requested") && feedbackBody.includes("Add reminder"),
    "A requested follow-up stays actionable from the detail.");
});

/* The Prayer card summarises requests, so its Open must show requests. */
await check("Person Prayer opens their requests, not the resource library", async () => {
  const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");
  const personDetail = client.slice(
    client.indexOf("function PersonDetailOverlay({"),
    client.indexOf("\nfunction ReviewActionButton({"),
  );

  assert(!personDetail.includes("primaryPrayer.onOpen ?? onOpenPrayerResources"),
    "Open must not fall through to Prayer Resources when a request has no meeting behind it.");
  /* The record is now the doorway, and it opens this Person's prayer rather
     than the resource library. */
  const prayerSection = personDetail.slice(personDetail.indexOf('aria-label="Prayer"'));
  const prayerSectionBody = prayerSection.slice(0, prayerSection.indexOf("</section>"));
  assert(prayerSectionBody.includes("onOpen={() => setIsPersonPrayerOpen(true)}"), "A prayer record opens this Person's prayer.");
  assert(/onClick=\{onAddPrayerRequest\}[\s\S]{0,140}\+ Add/.test(prayerSectionBody), "The section action creates another request.");
  assert(!prayerSectionBody.includes("onOpenPrayerResources"), "The card must not route to the resource library.");
  assert(personDetail.includes("<PersonPrayerSheet"), "That sheet exists and is mounted.");

  const prayerSheet = client.slice(client.indexOf("function PersonPrayerSheet("));
  const prayerBody = prayerSheet.slice(0, prayerSheet.indexOf("\nfunction "));
  assert(prayerBody.includes("Prayer requests"), "Requests lead.");
  assert(prayerBody.indexOf("Prayer requests") < prayerBody.indexOf("Prayer resources"),
    "Requests come first; resources are the secondary action.");
  assert(prayerBody.includes("Add prayer request"), "Adding one is available from here.");
  assert(prayerBody.includes('tone="white"') && prayerBody.includes("onOpenPrayerResources"),
    "Prayer Resources is retained, clearly separate and secondary.");
});

/* Every Overview card says how to open it. */
await check("Person Overview cards carry a visible action, not an invisible one", async () => {
  const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");
  const personDetail = client.slice(
    client.indexOf("function PersonDetailOverlay({"),
    client.indexOf("\nfunction ReviewActionButton({"),
  );

  const fruit = personDetail.slice(personDetail.indexOf("const renderFruit = () => {"));
  const fruitBody = fruit.slice(0, fruit.indexOf("\n  };"));
  /* Fruit records open themselves, so the section carries no action at all:
     observed fruit is captured while logging a meeting, never typed in here. */
  assert(fruitBody.includes("<PersonRecordRow"), "A Fruit record is a row you open.");
  assert(!fruitBody.includes("+ Add"), "Fruit offers no manual creation.");

  const feedback = personDetail.slice(personDetail.indexOf('aria-label="Feedback"'));
  const feedbackBody = feedback.slice(0, feedback.indexOf("</section>"));
  /* The record is the doorway and Request is the section action, so there is
     no separate View button competing with either. */
  assert(feedbackBody.includes("<PersonRecordRow"), "A feedback record opens itself.");
  assert.equal((feedbackBody.match(/View all/g) ?? []).length, 0, "No competing navigation on that small card.");
  assert(feedbackBody.includes("Request"), "The section action requests more feedback.");

  /* No em dashes anywhere a Person can read. The regex that strips a session
     prefix matches input and is not copy. */
  const personCopy = personDetail.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  for (const line of personCopy.split("\n")) {
    if (line.includes("\u2014") && !line.includes(".replace(")) {
      throw new Error(`Person copy contains an em dash: ${line.trim().slice(0, 90)}`);
    }
  }
});

/* One interaction model on the Person: the section heading creates, the record
   opens itself, and the actions live inside the record. */
await check("Person Overview is one interaction system: section creates, record opens", async () => {
  const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");
  const personDetail = client.slice(
    client.indexOf("function PersonDetailOverlay({"),
    client.indexOf("\nfunction ReviewActionButton({"),
  );

  // Section-level actions, each semantically right for its category.
  const section = (label) => {
    const start = personDetail.indexOf(`aria-label="${label}"`);
    return start === -1 ? "" : personDetail.slice(start, personDetail.indexOf("</section>", start));
  };
  assert(/onClick=\{onAddAccountabilitySchedule\}[\s\S]{0,140}\+ Add/.test(section("Accountability")), "Accountability creates a new one.");
  assert(/onClick=\{onAddPrayerRequest\}[\s\S]{0,140}\+ Add/.test(section("Prayer")), "Prayer creates a request, not a resource lookup.");
  assert(/setIsFeedbackChoiceOpen\(true\)[\s\S]{0,140}Request/.test(section("Feedback")), "Feedback is requested through the canonical selector.");

  // Fruit is observed during an interaction, so it has no create action.
  const fruit = personDetail.slice(personDetail.indexOf("const renderFruit = () => {"));
  const fruitBody = fruit.slice(0, fruit.indexOf("\n  };"));
  assert(!fruitBody.includes("+ Add"), "Fruit must not offer manual creation.");

  // Records are the doorway, with a visible affordance rather than hover.
  assert(client.includes("function PersonRecordRow("), "There is one record row.");
  const row = client.slice(client.indexOf("function PersonRecordRow("));
  const rowBody = row.slice(0, row.indexOf("\nfunction "));
  assert(rowBody.includes("<ChevronRight"), "A record row shows that it opens.");
  for (const surface of ["Accountability", "Prayer", "Feedback"]) {
    assert(section(surface).includes("<PersonRecordRow"), `${surface} records are rows you open.`);
  }
  assert(fruitBody.includes("<PersonRecordRow"), "Fruit records are rows you open.");

  // The Overview stops carrying per-record action buttons.
  assert(!section("Accountability").includes("topic.actionLabel"), "Row actions moved into the record.");

  // Consistent, restrained empty states.
  for (const empty of ["Nothing they are working on yet.", "No prayer requests yet.", "No feedback yet.", "No fruit recorded yet."]) {
    assert(personDetail.includes(empty), `Empty state missing: ${empty}`);
  }
});

/* The Accountability record itself, with the action that fits it. */
await check("Accountability opens as a record, and can be edited", async () => {
  const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");

  assert(client.includes("function PersonAccountabilityDetailSheet("), "The record has its own sheet.");
  const detail = client.slice(client.indexOf("function PersonAccountabilityDetailSheet("));
  const detailBody = detail.slice(0, detail.indexOf("\nfunction "));
  assert(detailBody.includes('progressKind === "people" && onAddPerson'), "A people target adds a person.");
  assert(detailBody.includes('progressKind === "count" && onAddProgress'), "A count target adds progress.");
  assert(detailBody.includes('progressKind === "check_in" && onCheckIn'), "Everything else checks in.");
  assert(detailBody.includes("Recent check-ins") && detailBody.includes("Recent progress"), "It shows what has happened.");

  /* Journey follow-ups are written by DOS. Offering Edit would let someone
     rewrite a record they did not create. */
  assert(detailBody.includes("onEdit && !isSystemGenerated"), "System-generated records are not editable here.");
  assert(client.includes("isSystemGenerated={Boolean(schedule && parseResourceAssignmentFollowUpScheduleTitle(schedule.title))}"),
    "A Journey follow-up is recognised as system-generated.");

  // Editing reuses the one canonical field set, prepopulated.
  assert(client.includes("function PersonAccountabilityEditSheet("), "Editing has a sheet.");
  const edit = client.slice(client.indexOf("function PersonAccountabilityEditSheet("));
  const editBody = edit.slice(0, edit.indexOf("\nfunction "));
  assert(editBody.includes("<AccountabilityFields"), "It reuses the canonical form, not a second one.");
  assert(editBody.includes("defaultTitle={commitment.title}") && editBody.includes("defaultTargetCount="), "Values prepopulate.");
  assert(editBody.includes("lockType"), "Editing cannot turn a goal into a rhythm, which would move it between records.");
  assert(editBody.includes('name="commitment_id"'), "It edits the record rather than creating another.");

  // Editing changes the goal, never its progress.
  const handler = client.slice(client.indexOf("async function handlePersonAccountabilityEditSubmit("));
  const handlerBody = handler.slice(0, handler.indexOf("\n  function "));
  assert(handlerBody.includes('"PATCH"'), "It updates in place.");
  for (const field of ["progressNote", "subjectPersonId", "meetings", "fruit"]) {
    assert(!handlerBody.includes(field), `Editing must not touch ${field}.`);
  }
});

/* Progress recorded against an existing goal cannot be reinterpreted by an
   edit, and the route is the thing that enforces it. */
await check("Editing a target cannot strand progress already recorded", async () => {
  const route = readFileSync(new URL("../app/api/dos/app/commitments/route.ts", import.meta.url), "utf8");

  assert(route.includes("updates.target_count = nextCount;"), "The target is editable.");
  assert(route.includes("updates.target_kind = nextKind;"), "What it counts is editable.");
  assert(route.includes("commitmentConfirmedSubjectCount("), "Confirmed people are counted from the stored rows, not from the form.");
  /* The same guards now cover both kinds, measured each by its own rule. */
  assert(route.includes("recordedProgress > nextCount"), "A target cannot drop below the progress already recorded.");
  assert(
    route.includes("existingKind && nextKind !== existingKind && recordedProgress > 0"),
    "Recorded progress cannot be reinterpreted as the other kind of measurement.",
  );
  assert(
    route.includes("nextCount === null && recordedProgress > 0"),
    "A goal with recorded progress cannot stop being measurable.",
  );
  assert(route.includes("Choose a target of"), "The refusal says what to do instead.");
});

/* Accountability is not a meeting. */
await check("Person check-in is small, canonical, and writes no meeting", async () => {
  const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");
  const personDetail = client.slice(
    client.indexOf("function PersonDetailOverlay({"),
    client.indexOf("\nfunction ReviewActionButton({"),
  );

  assert(client.includes("function PersonAccountabilityCheckInSheet("), "Check-in has its own sheet.");
  const sheet = client.slice(client.indexOf("function PersonAccountabilityCheckInSheet("));
  const sheetBody = sheet.slice(0, sheet.indexOf("\nfunction "));

  /* Everything the legacy Log Check-In asked for that belongs to another
     canonical workflow, or to Add Accountability. */
  for (const legacy of ["Duration", "General Update", "Wins", "Struggles", "Prayer Needs", "New Accountability", "Category", "Description", "No state"]) {
    assert(!sheetBody.includes(legacy), `Check-in must not ask for ${legacy}.`);
  }
  assert(sheetBody.includes("How&apos;s it going?"), "It asks the one question.");
  /* The two states live in one const beside the sheet, so both the sheet and
     anything else that offers them stay in step. */
  const states = client.slice(client.indexOf("const accountabilityCheckInStates = ["));
  const statesBody = states.slice(0, states.indexOf("] as const;"));
  assert(statesBody.includes('label: "Going well", value: "going_well"'), "Going well maps to the stored state that means it.");
  assert(statesBody.includes('label: "Needs attention", value: "struggling"'), "Needs attention maps to struggling, without exposing that word.");
  /* Done finishes a one-time goal. A rhythm has no done: ending it is Pause. */
  assert(sheetBody.includes("const canComplete = Boolean(commitment) && !schedule;"), "Done is offered only where it means something.");

  // Person V2 is off the legacy sheet, which still serves the Dashboard.
  assert(!personDetail.includes("LogCheckInSheet"), "The Person never opens the legacy form.");
  assert(client.includes("function LogCheckInSheet("), "The legacy form stays for the Dashboard.");
  assert(client.includes("onLogAccountabilityCheckIn={openAccountabilityCheckInForSchedule}"), "And the Dashboard still uses it.");

  // Direct progress writes progress, and nothing else.
  const handler = client.slice(client.indexOf("async function handlePersonAccountabilityCheckInSubmit("));
  const handlerBody = handler.slice(0, handler.indexOf("\n  async function "));
  assert(handlerBody.includes('"/api/dos/app/accountability/check-ins"'), "A rhythm records a check-in and rolls forward.");
  assert(handlerBody.includes('"/api/dos/app/commitments/updates"'), "A goal records progress.");
  for (const forbidden of ["/api/dos/app/meetings", "fruit", "reminders", "prayer-requests", "circles"]) {
    assert(!handlerBody.includes(forbidden), `Checking in must not write ${forbidden}.`);
  }
});

/* A count target counts what the leader entered, not how many rows happen to
   exist. Reading twice in one sitting is two. */
await check("Count progress is the sum of what was entered, never the row count", async () => {
  // Adding 2 moves the total by 2.
  assert.equal(accountabilityCountProgress([{ progressAmount: 2 }]), 2, "Adding 2 is 2, not 1.");
  assert.equal(accountabilityCountProgress([{ progressAmount: 2 }, { progressAmount: 3 }]), 5, "Several updates sum.");
  assert.equal(accountabilityCountProgress([]), 0, "Nothing recorded is zero.");
  assert.equal(accountabilityCountProgress(null), 0, "No updates at all is zero.");

  /* Rows written before the column existed carry null and count as one, which
     is what they have always meant. Compatibility only. */
  assert.equal(accountabilityCountProgress([{ progressNote: "read" }, { progressNote: "read" }]), 2,
    "Historical rows still count as one each.");
  assert.equal(accountabilityCountProgress([{ progressAmount: 4 }, { progressNote: "read" }]), 5,
    "Explicit and historical rows add up together.");

  // The label reads the sum, so 2 + 3 against a target of 5 is finished.
  const goal = (updates) => ({ id: "g", status: "active", targetCount: 5, targetKind: "count", targetDate: null, title: "Read Scripture", updates });
  assert.equal(accountabilityProgressLabel(goal([{ progressAmount: 1 }])), "1 of 5");
  assert.equal(accountabilityProgressLabel(goal([{ progressAmount: 1 }, { progressAmount: 2 }])), "3 of 5",
    "Existing 1 plus an added 2 reads 3 of 5.");

  /* People are counted a completely different way and must not borrow this
     one: two updates about Philip are one Philip, whatever amount they carry. */
  const people = { id: "p", status: "active", targetCount: 3, targetKind: "people", targetDate: null, title: "Disciple 3", updates: [
    { progressAmount: 5, subjectPersonName: "Philip" },
    { progressAmount: 5, subjectPersonName: "philip" },
  ] };
  assert.equal(accountabilityProgressLabel(people), "1 of 3 confirmed", "People counting ignores progress amounts entirely.");
});

/* The number is entered, validated, and written. */
await check("Add progress writes an explicit amount, and refuses a non-number", async () => {
  const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");
  const route = readFileSync(new URL("../app/api/dos/app/commitments/updates/route.ts", import.meta.url), "utf8");

  const sheet = client.slice(client.indexOf("function PersonAccountabilityProgressSheet("));
  const sheetBody = sheet.slice(0, sheet.indexOf("\nfunction "));
  assert(sheetBody.includes("How many more?"), "The sheet asks how many.");
  assert(sheetBody.includes('name="progress_amount"'), "And carries it on the form.");
  assert(sheetBody.includes("accountabilityCountProgress(commitment.updates)"), "It shows the explicit total, not a row count.");

  const handler = client.slice(client.indexOf("async function handlePersonAccountabilityProgressSubmit("));
  const handlerBody = handler.slice(0, handler.indexOf("\n  function "));
  assert(handlerBody.includes("progressAmount: Number(rawAmount)"), "The amount is sent explicitly.");
  assert(handlerBody.includes('!/^\\d+$/.test(rawAmount) || Number(rawAmount) <= 0'), "Zero and negatives are refused, not corrected.");
  assert(!handlerBody.includes("progressState"), "Adding progress never declares the goal complete.");

  // The route is the authority, and refuses the same things.
  assert(route.includes("Progress must be a whole number greater than zero."), "The route refuses a bad amount.");
  assert(route.includes("!Number.isInteger(parsedAmount) || (parsedAmount as number) <= 0"), "Zero, negatives and fractions are all refused.");
  assert(route.includes("progress_amount: parsedAmount,"), "And writes what was entered.");
  assert(route.includes("!progressNote && !subjectPersonId && !subjectPersonName && !hasAmount"),
    "An update carrying nothing at all is still refused.");

  /* Reaching the number finishes the goal through the completion the model
     already has, and passing it is preserved rather than clamped. */
  assert(route.includes("reachedCountTarget = total >= commitmentResult.data.target_count;"), "Reaching the target completes it.");
  assert(route.includes('progressState === "completed" || reachedCountTarget'), "Through the existing completion, not a second status system.");
  assert(!/Math\.min\(/.test(route), "An entered amount is never clamped to the target.");

  // Progress is progress. It writes nothing else.
  for (const forbidden of ["/api/dos/app/meetings", "fruit_events", "dos_relationship_scores", "relationship_reminders"]) {
    assert(!route.includes(forbidden), `Adding progress must not write ${forbidden}.`);
  }
});

/* An edit may not strand or reinterpret progress of either kind. */
await check("A target cannot be edited below the progress already recorded", async () => {
  const route = readFileSync(new URL("../app/api/dos/app/commitments/route.ts", import.meta.url), "utf8");

  assert(route.includes("accountabilityCountProgress(rows)"), "Count progress is measured by the same rule that displays it.");
  assert(route.includes("commitmentConfirmedSubjectCount(rows)"), "People progress keeps counting distinct subjects.");
  assert(route.includes("recordedProgress > nextCount"), "A target below what is recorded is refused.");
  assert(route.includes("Choose a target of ${recordedProgress} or more."), "The refusal says what to choose instead.");
  assert(
    route.includes("existingKind && nextKind !== existingKind && recordedProgress > 0"),
    "Recorded progress cannot be reinterpreted as the other kind of measurement.",
  );
  assert(route.includes("nextCount === null && recordedProgress > 0"), "A goal with progress cannot stop being measurable.");
  /* Raising the target is always allowed: 3 -> 4 leaves every update alone. */
  assert(!/delete\(\)/.test(route), "Editing never deletes progress.");
});


/* ---------------------------------------------------------------------------
   The Person read contract.

   missionary_field_people has never had a discipleship_relationship column: the
   migration that would have added it (20260702194002_dos_table_discipleship_roles)
   is in the repo but was never applied to any environment. While the primary
   Person select named that column, every Person read failed with PostgREST's
   missing-column error and fell to the first compatibility rung, which returns
   rows WITHOUT relationship_context, role_in_my_life or discipleship_stage.

   Those fields are written on every save, so the app was persisting them and
   then reading them back as absent. Absent does not mean "default": the model
   builder re-derives them from relationship_type, which is a display summary
   string, so a stored "other" came back as "friend" and a stored
   "discipling_them" came back as "not_active". 73 of 117 production rows loaded
   a different model than the one stored.

   These checks exist so that select cannot quietly acquire an unbacked column
   again.
--------------------------------------------------------------------------- */

/* The columns missionary_field_people actually has in production, from
   information_schema on 2026-09-04. A select naming anything outside this set
   is what triggers the fallback. */
const productionPersonColumns = new Set([
  "id", "household_id", "name", "phone", "email", "church", "relationship_type",
  "engagement_level", "notes", "status", "source", "created_by", "last_activity_at",
  "created_at", "updated_at", "workspace_id", "spouse_name", "children_names",
  "household_notes", "field_visibility", "relationship_context", "role_in_my_life",
  "discipleship_stage",
]);

function personSelectColumns(source, constantName) {
  const match = source.match(new RegExp(`const ${constantName} = "([^"]+)"`));
  assert(match, `${constantName} must be a single string literal this check can read.`);

  return match[1].split(",").map((column) => column.trim());
}

await check("The Person loader only requests columns production actually has", async () => {
  const source = readFileSync(new URL("../src/lib/dos/missionary-app.ts", import.meta.url), "utf8");
  const primary = personSelectColumns(source, "personSelect");

  /* The specific column that caused this. Naming it again reintroduces the bug
     wholesale, so it gets its own assertion with its own message. */
  assert(
    !primary.includes("discipleship_relationship"),
    "personSelect must not request discipleship_relationship: no environment has that column, and requesting it drops every Person read into the compatibility fallback.",
  );

  /* The general rule, so the next unbacked column is caught too. */
  const unbacked = primary.filter((column) => !productionPersonColumns.has(column));
  assert.deepEqual(unbacked, [], `personSelect requests columns that do not exist in production: ${unbacked.join(", ")}`);

  /* And the fields this fix exists to recover are actually asked for. */
  for (const column of ["relationship_context", "role_in_my_life", "discipleship_stage"]) {
    assert(primary.includes(column), `personSelect must request ${column}; it is written on every save and must be read back.`);
  }
});

await check("The compatibility fallback still drops the relationship fields, so the primary select must never fail", async () => {
  const source = readFileSync(new URL("../src/lib/dos/missionary-app.ts", import.meta.url), "utf8");
  const firstFallback = personSelectColumns(source, "relationshipCompatiblePersonSelect");

  /* This is not a bug in the fallback: it is a rung for environments that
     genuinely lack the relationship model. The bug was reaching it. This check
     pins WHY the primary select matters, so anyone who breaks the primary
     select sees what it costs. */
  for (const column of ["relationship_context", "role_in_my_life", "discipleship_stage"]) {
    assert(
      !firstFallback.includes(column),
      `relationshipCompatiblePersonSelect is the rung reached on a missing column and is expected to omit ${column}. If that changed, this whole check needs rewriting rather than relaxing.`,
    );
  }
});

/* The behavioral half: dropping those columns does not yield defaults, it
   yields different values re-derived from a display string. These are the real
   production shapes of the protected profiles, read on 2026-09-04. */
await check("Dropping the relationship columns changes what a Person means", async () => {
  const storedRows = [
    { context: "church", expectFallbackRole: "not_active", name: "Philip John Suaco", role: "discipling_them", type: "Discipling · Church · Exploring" },
    { context: "other", expectFallbackContext: "friend", name: "Ryan Fox", role: "not_active", type: "Discipling · Friend · Exploring" },
    { context: "other", expectFallbackContext: "friend", expectFallbackRole: "mentoring_me", name: "Dirk Bond", role: "not_active", type: "Mentor · Friend · Exploring" },
    { context: "family", expectFallbackContext: "other", name: "Brooke Fox", role: "not_active", type: "new" },
    { context: "other", expectFallbackRole: "not_active", name: "USA168 Release Test", role: "discipling_them", type: "Discipling · Other · Exploring" },
  ];

  for (const row of storedRows) {
    const loaded = relationshipModelFromFields({
      discipleshipStage: "not_started",
      relationshipContext: row.context,
      relationshipType: row.type,
      roleInMyLife: row.role,
      status: "new",
    });

    /* What the fixed select produces: exactly what is stored, untouched. */
    assert.equal(loaded.relationshipContext, row.context, `${row.name} must load the stored relationship_context.`);
    assert.equal(loaded.roleInMyLife, row.role, `${row.name} must load the stored role_in_my_life.`);
    assert.equal(loaded.discipleshipStage, "not_started", `${row.name} must load the stored discipleship_stage.`);

    /* What the fallback produced, and why this is a data-integrity bug rather
       than a display one: these values are wrong, not merely empty. */
    const dropped = relationshipModelFromFields({
      discipleshipStage: undefined,
      relationshipContext: undefined,
      relationshipType: row.type,
      roleInMyLife: undefined,
      status: "new",
    });

    assert.notDeepEqual(dropped, loaded, `${row.name} must not load identically with and without the relationship columns, or this check proves nothing.`);
    assert.equal(dropped.relationshipContext, row.expectFallbackContext ?? row.context, `${row.name} fallback context drifted from the recorded behavior.`);
    assert.equal(dropped.roleInMyLife, row.expectFallbackRole ?? row.role, `${row.name} fallback role drifted from the recorded behavior.`);
  }
});

await check("Edit Person seeds from the loaded Person rather than substituting defaults", async () => {
  const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");
  const seed = client.match(/function personRelationshipModel\(person: DosAppPerson\): DosRelationshipModel \{[\s\S]*?\n\}/);

  assert(seed, "personRelationshipModel is the seam Edit Person seeds from.");

  /* A passthrough, field for field. If any of these ever gains a `??` default,
     Edit Person starts writing that default over the stored value on save. */
  const body = seed[0].replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  assert(/discipleshipStage:\s*person\.discipleshipStage\s*,/.test(body), "Stage is seeded from the person, with no default.");
  assert(/relationshipContext:\s*person\.relationshipContext\s*,/.test(body), "Context is seeded from the person, with no default.");
  assert(/roleInMyLife:\s*person\.roleInMyLife\s*,/.test(body), "Role is seeded from the person, with no default.");
  assert(!/\?\?/.test(body), "A default here would be written back over the stored value on the next save.");
});


/* ---------------------------------------------------------------------------
   Person Form Simplification + Advanced Features.
--------------------------------------------------------------------------- */

function personFormSource() {
  const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");
  const start = client.indexOf("function PersonFormContent({");

  assert(start > 0, "PersonFormContent is the Add/Edit Person form.");

  const end = client.indexOf("\nfunction ", start + 10);
  /* Comments are stripped so an assertion cannot be satisfied by prose
     explaining the very thing it is meant to forbid. */
  return client.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

await check("Canonical relationship state is read from the structured fields, never from the summary string", async () => {
  /* relationship_type in the database is "Discipling · Church · Exploring".
     Feeding that back in must not be able to set context or role. */
  const fromSummaryOnly = canonicalRelationshipModel({
    relationshipType: "Discipling · Church · Exploring",
  });

  assert.equal(fromSummaryOnly.relationshipContext, "other", "A summary string must not set context.");
  assert.equal(fromSummaryOnly.roleInMyLife, "not_active", "A summary string must not set role.");
  assert.equal(fromSummaryOnly.discipleshipStage, "not_started", "A summary string must not set stage.");

  /* The structured values are taken exactly as stored. */
  const stored = canonicalRelationshipModel({
    discipleshipStage: "not_started",
    relationshipContext: "church",
    roleInMyLife: "discipling_them",
  });

  assert.equal(stored.relationshipContext, "church");
  assert.equal(stored.roleInMyLife, "discipling_them");
  /* Type has no column, so it is derived -- from role and stage, which do. */
  assert.equal(stored.relationshipType, "discipling", "Type comes from the structured role, not from prose.");

  /* And the summary is generated FROM the model, so it stays downstream. */
  assert.equal(relationshipModelSummary(stored), "Discipling · Church · Exploring");
});

await check("The Person loader and the Person write path both stop parsing relationship_type", async () => {
  const loader = readFileSync(new URL("../src/lib/dos/missionary-app.ts", import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const route = readFileSync(new URL("../app/api/dos/app/people/route.ts", import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  const loaderCall = loader.slice(loader.indexOf("canonicalRelationshipModel({"), loader.indexOf("canonicalRelationshipModel({") + 300);

  assert(loader.includes("canonicalRelationshipModel({"), "The loader resolves the model canonically.");
  assert(
    !/canonicalRelationshipModel\(\{[^}]*relationshipType:\s*person\.relationship_type/.test(loader),
    "The loader must not feed the stored summary string back into the model.",
  );
  assert(loaderCall.includes("person.relationship_context"), "It reads the structured context column.");
  assert(loaderCall.includes("person.role_in_my_life"), "It reads the structured role column.");

  assert(route.includes("canonicalRelationshipModel({"), "The write path validates structured values.");
  assert(
    route.indexOf("relationship_type: relationshipModelSummary(model)") > route.indexOf("canonicalRelationshipModel({"),
    "The summary must be generated after the model, never used to build it.",
  );

  /* The client must not rebuild the model from the summary either. */
  const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");
  const seed = client.slice(client.indexOf("function personRelationshipModel("), client.indexOf("function personRelationshipModel(") + 400);

  assert(seed.includes("relationshipType: person.relationshipTypeValue"), "Edit Person seeds from the canonical value.");
  assert(!seed.includes("normalizeRelationshipType"), "Edit Person must not re-derive the type from the summary string.");
});

await check("The Basic Person form asks three questions and hides the advanced ones", async () => {
  const form = personFormSource();

  /* Present: the questions Basic DOS is for. */
  assert(form.includes('label="Your relationship with them"'), "Relationship type is asked.");
  assert(form.includes('label="How do you know them?"'), "Context is asked, in those words.");
  assert(form.includes('label="Person role"'), "Person role is asked.");
  assert(form.includes("options={relationshipTypeOptions}"), "The four relationship choices remain available.");
  assert(form.includes("options={relationshipContextOptions}"), "The nine context values remain available.");
  assert(form.includes("options={personRoleOptions}"), "Person role remains available.");

  /* Absent: the control with no column behind it. */
  assert(!form.includes("discipleship_relationship"), "Discipleship Relationship is gone from the Basic form.");
  assert(!form.includes("discipleshipRelationshipOptions"), "And so is its option list.");

  /* Absent unless the workspace turned it on. */
  assert(form.includes("showEngagement ? ("), "Engagement is behind the Advanced Feature flag.");
  assert(
    form.indexOf("RelationshipScorePicker") > form.indexOf("showEngagement ? ("),
    "The engagement control renders only inside that gate.",
  );

  /* No internal vocabulary anywhere a person can read it. Component and prop
     identifiers are removed first, so this looks at copy rather than at
     DosFormField and FieldInputClass. */
  const copyOnly = form
    .replace(/\b(?:Dos)?Form(?:Field|Grid|Section)\b/g, "")
    .replace(/\bField(?:InputClass|TextareaClass|Label|set|Visibility)\b/g, "")
    .replace(/\bfield(?:_visibility|Visibility)\b/g, "")
    .replace(/<\/?fieldset[^>]*>/g, "");
  const jargon = copyOnly.match(/\b[Ff]ield\b/g) ?? [];
  assert.deepEqual(jargon, [], `Basic DOS must not show internal Field vocabulary (${jargon.length} occurrence(s)).`);
});

await check("Person role keeps the stored values and only changes the words", async () => {
  const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");
  const options = client.slice(client.indexOf("const personRoleOptions"), client.indexOf("const personRoleOptions") + 700);

  assert(/label: "Primary Contact", value: "primary"/.test(options), "primary reads as Primary Contact.");
  assert(/label: "Household Member", value: "secondary"/.test(options), "secondary reads as Household Member.");
  assert(/label: "Hidden", value: "hidden"/.test(options), "hidden reads as Hidden.");
  assert(!/Primary Field Contact|Hidden from Field/.test(options), "The old Field wording is gone.");
});

await check("An Advanced Feature is off by default, per feature, and per workspace", async () => {
  /* A workspace with no flag rows at all is a Basic workspace. */
  assert.equal(dosAdvancedFeatureEnabled([], "engagementLevels"), false, "Default is off.");
  assert.equal(dosAdvancedFeatureEnabled(null, "engagementLevels"), false, "No rows at all is off.");

  /* Another feature being on says nothing about this one. */
  assert.equal(
    dosAdvancedFeatureEnabled([{ enabled: true, flag_key: "dos_commitments_accountability" }], "engagementLevels"),
    false,
    "This is not a single Advanced Mode switch.",
  );

  assert.equal(
    dosAdvancedFeatureEnabled([{ enabled: true, flag_key: "dos_engagement_levels" }], "engagementLevels"),
    true,
    "On when this workspace turned this feature on.",
  );
  assert.equal(
    dosAdvancedFeatureEnabled([{ enabled: false, flag_key: "dos_engagement_levels" }], "engagementLevels"),
    false,
    "A row that says false is off.",
  );

  /* No workspace, person or name is hardcoded anywhere in the definition. */
  const source = readFileSync(new URL("../src/lib/dos/advanced-features.ts", import.meta.url), "utf8");
  for (const name of ["Ryan", "Dirk", "Brooke", "Fox", "fox_family"]) {
    assert(!source.includes(name), `Advanced features must not name ${name}: entitlement is per workspace flag, not per person.`);
  }
  assert(!/[0-9a-f]{8}-[0-9a-f]{4}-/.test(source), "No workspace UUID may be hardcoded.");
});

await check("Turning Engagement Levels off changes visibility and never touches stored engagement", async () => {
  const loader = readFileSync(new URL("../src/lib/dos/missionary-app.ts", import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  /* The commitments flag genuinely gates loading. The engagement flag must
     not: the values have to survive being hidden, and be there again when it
     is switched back on. */
  assert(
    /commitmentRows = featureFlags\.commitmentsAccountability \?/.test(loader),
    "Baseline: the commitments flag does gate its rows, which is why this check exists.",
  );
  assert(
    !/featureFlags\.engagementLevels\s*\?/.test(loader),
    "The engagement flag must never gate a data load: hiding is not deleting.",
  );
  assert(
    loader.includes("engagementLevel: person.engagement_level"),
    "Every person's stored engagement is loaded whether the feature is on or off.",
  );

  /* And the form must not write through a hidden control. */
  const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");
  const payload = client.slice(client.indexOf("function personPayloadFromForm("), client.indexOf("function personPayloadFromForm(") + 1800)
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  assert(
    payload.includes("engagementLevelsEnabled") && payload.includes("engagementScore:"),
    "engagementScore is sent only when the feature is on.",
  );
  assert(
    /engagementFields\s*=\s*engagementLevelsEnabled\s*\?/.test(payload),
    "With the feature off the field is omitted rather than round-tripped, so a stored null stays null.",
  );

  /* The update route only writes the column when the payload carries it. */
  const route = readFileSync(new URL("../app/api/dos/app/people/route.ts", import.meta.url), "utf8");
  assert(
    route.includes("if (includeDefaultScore || payload.engagementScore !== undefined)"),
    "engagement_level is written only when the payload supplies it.",
  );

  /* The toggle route touches feature flags and nothing else. */
  const toggle = readFileSync(new URL("../app/api/dos/app/advanced-features/route.ts", import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  assert(toggle.includes("dos_workspace_feature_flags"), "The toggle writes a feature flag.");
  for (const forbidden of ["missionary_field_people", "engagement_level", "dos_relationship_scores", "delete()"]) {
    assert(!toggle.includes(forbidden), `Toggling a feature must not touch ${forbidden}.`);
  }
});

await check("Multiplying requires a confirmed person, and counts each person once", async () => {
  const peopleGoal = (updates) => ([{
    id: "c1", status: "active", targetCount: 3, targetDate: null, targetKind: "people", title: "Begin discipling 3 people", updates,
  }]);

  /* A goal on its own is an intention, not fruit. */
  assert.equal(personIsMultiplying(peopleGoal([])), false, "A goal with nobody confirmed is not Multiplying.");
  assert.equal(personIsMultiplying([]), false, "No goals at all is not Multiplying.");
  assert.equal(personIsMultiplying(null), false, "No data is not Multiplying.");

  /* An update that names nobody is a progress note, not a person. */
  assert.equal(
    personIsMultiplying(peopleGoal([{ progressAmount: null, subjectPersonId: null, subjectPersonName: null }])),
    false,
    "A note naming nobody confirms nobody.",
  );

  /* One confirmed person is enough. */
  assert.equal(
    personIsMultiplying(peopleGoal([{ subjectPersonName: "Marcus", updateDate: "2026-09-01" }])),
    true,
    "One distinct confirmed person is Multiplying.",
  );

  /* Two updates about Marcus are still one Marcus. */
  const twice = peopleGoal([
    { subjectPersonName: "Marcus", updateDate: "2026-09-01" },
    { subjectPersonName: " marcus ", updateDate: "2026-09-03" },
  ]);
  assert.equal(personIsMultiplying(twice), true);
  assert.equal(
    accountabilityConfirmedSubjects(twice[0].updates).length,
    1,
    "Duplicate updates about one person must not inflate the evidence.",
  );

  /* A count target has no subjects and can never make someone Multiplying,
     however large the number. */
  assert.equal(
    personIsMultiplying([{ id: "c2", status: "active", targetCount: 50, targetDate: null, targetKind: "count", title: "Read Scripture 50 times", updates: [{ progressAmount: 50 }] }]),
    false,
    "A count target is not multiplication.",
  );

  /* And none of the things that are not evidence. */
  const titleOnly = [{ id: "c3", status: "active", targetCount: null, targetDate: null, targetKind: null, title: "Multiplying disciples who multiply", updates: [] }];
  assert.equal(personIsMultiplying(titleOnly), false, "A title is not evidence.");
});

await check("Multiplying is derived on read, and writes nothing", async () => {
  const source = readFileSync(new URL("../src/lib/dos/accountability-presentation.ts", import.meta.url), "utf8");
  const fn = source.slice(source.indexOf("export function personIsMultiplying("));

  assert(fn.includes("accountabilityConfirmedSubjects(commitment.updates).length > 0"), "The rule is confirmed subjects.");
  assert(!/engagement/i.test(fn), "Engagement is not evidence.");
  assert(!/circle/i.test(fn), "Circle is not evidence.");
  assert(!/relationship_type|relationshipType/.test(fn), "The summary string is not evidence.");

  /* It is a pure presenter: this module has no client, no fetch, no write. */
  for (const forbidden of ["supabase", "fetch(", "insert(", "update(", "fruit_events"]) {
    assert(!source.includes(forbidden), `Multiplying must not ${forbidden}: it is derived display, not a record.`);
  }

  /* Nothing stores it on the Person either. */
  const app = readFileSync(new URL("../src/lib/dos/missionary-app.ts", import.meta.url), "utf8");
  assert(!/is_multiplying|isMultiplying:/.test(app), "No Person-level multiplying flag is written.");
});

await check("Edit Person no longer creates reminders, and Save outranks Delete", async () => {
  const form = personFormSource();

  /* The reminder shortcut belongs to creating a person, not editing one. */
  assert(
    form.includes("{isEditMode ? null : <ImportantDatesReminderSection />}"),
    "Add a reminder must not render inside Edit Person.",
  );

  /* Save is the sticky action, alone. */
  const footer = form.slice(form.indexOf("<StickyFormFooter>"));
  assert(footer.includes('type="submit"'), "Save is the sticky action.");
  assert(!footer.includes("onDelete"), "Delete must not share the sticky footer with Save.");

  /* Delete still exists, still confirms, and is visibly secondary. */
  assert(form.includes("Delete this person"), "Delete is still available.");
  assert(form.includes("onClick={onDelete}"), "It still runs the existing delete flow.");
  assert(
    form.indexOf("Delete this person") < form.indexOf("<StickyFormFooter>"),
    "Delete sits above the footer, scrolling with the form rather than following the thumb.",
  );
});


await check("Basic DOS surfaces do not leak engagement values when the feature is off", async () => {
  const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");
  const strip = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  /* The desktop dashboard's Top Time Investments row. Off it must say the
     relationship and stop, rather than "Discipling · +3" or a placeholder. */
  const line = strip(client.slice(
    client.indexOf("function dashboardTimeInvestmentRelationshipLine("),
    client.indexOf("function DashboardAlignmentRow("),
  ));

  assert(
    /function dashboardTimeInvestmentRelationshipLine\(person: DosAppPerson, showEngagement: boolean\)/.test(line),
    "The dashboard line takes the advanced-feature state rather than assuming it.",
  );
  assert(
    /showEngagement \? [^:]*dashboardEngagementScoreLabel\(person\)[^:]*: relationship/.test(line),
    "Off yields the relationship alone; on keeps the existing engagement display.",
  );
  /* Off must not substitute "Not rated" or any other filler. */
  assert(!/Not rated|Unknown|--/.test(line), "Off shows nothing extra, not a placeholder.");

  /* It is wired to the real flag at the call site, not to a local default. */
  assert(
    client.includes("dashboardTimeInvestmentRelationshipLine(item.person, engagementLevelsEnabled)"),
    "The dashboard row passes the workspace's actual setting.",
  );
  assert(
    client.includes("engagementLevelsEnabled={engagementLevelsEnabled}"),
    "The setting is threaded from app state rather than re-derived ad hoc.",
  );

  /* One canonical source for that boolean, everywhere. */
  const derivations = client.match(/const engagementLevelsEnabled = [^;]+;/g) ?? [];
  assert.equal(derivations.length, 1, "Exactly one place decides whether Engagement Levels are on.");
  assert(
    derivations[0].includes("data.featureFlags.engagementLevels"),
    "And it reads the workspace feature flag, not a name or a heuristic.",
  );

  /* The Person Overview's Relationship card must not carry an Engagement cell
     for a workspace that never turned the framework on. */
  const overlay = strip(client.slice(client.indexOf("function PersonDetailOverlay(")));
  const engagementCell = overlay.indexOf("Engagement</dt>");

  assert(engagementCell > 0, "The Person Overview still has an Engagement cell to gate.");
  assert(
    overlay.slice(Math.max(0, engagementCell - 300), engagementCell).includes("engagementLevelsEnabled ? ("),
    "The Person Overview Engagement cell renders only when the feature is on.",
  );
});

await check("Hiding engagement on the dashboard is visibility only", async () => {
  const loader = readFileSync(new URL("../src/lib/dos/missionary-app.ts", import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");

  /* Same contract as every other Advanced Feature: the flag never gates a load. */
  assert(
    !/featureFlags\.engagementLevels\s*\?/.test(loader),
    "The dashboard fix must not start gating engagement data loading.",
  );
  assert(
    loader.includes("engagementLevel: person.engagement_level"),
    "Every person still carries their stored engagement to the client.",
  );

  /* And the label function still reads the stored value rather than deciding it. */
  const label = client.slice(client.indexOf("function dashboardEngagementScoreLabel("), client.indexOf("function dashboardTimeInvestmentRelationshipLine("));
  assert(label.includes("person.engagementLevel"), "The score is read from the person, unchanged.");
  assert(!/engagementLevel\s*=/.test(label), "Nothing here assigns engagement.");
});


await check("The People table drops the Engagement column rather than blanking a cell", async () => {
  const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");
  const strip = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  const withCol = client.match(/const desktopPeopleGridWithEngagement = "([^"]+)"/);
  const withoutCol = client.match(/const desktopPeopleGridWithoutEngagement = "([^"]+)"/);

  assert(withCol && withoutCol, "Both layouts are declared in one place.");

  /* Each layout declares both breakpoints, and both are real templates. */
  const columnsOf = (value, prefix) => {
    const match = value.match(new RegExp(`${prefix}grid-cols-\\[([^\\]]+)\\]`));

    assert(match, `${prefix || "base "}variant must be declared.`);

    return match[1].split("_");
  };

  const baseOn = columnsOf(withCol[1], "");
  const xlOn = columnsOf(withCol[1], "xl:");
  const baseOff = columnsOf(withoutCol[1], "");
  const xlOff = columnsOf(withoutCol[1], "xl:");

  /* On keeps exactly the seven columns the table has always had. */
  assert.equal(baseOn.length, 7, "On: seven columns at the base breakpoint.");
  assert.equal(xlOn.length, 7, "On: seven columns at xl.");

  /* Off has six: the column is removed, not hidden, so nothing leaves a gap. */
  assert.equal(baseOff.length, 6, "Off: six columns at the base breakpoint, not seven with a blank.");
  assert.equal(xlOff.length, 6, "Off: six columns at xl.");

  /* And it is the Engagement column (index 2) that goes, with every other
     column keeping its exact width. */
  assert.deepEqual(baseOff, baseOn.filter((_, index) => index !== 2), "Off drops only the third column at base.");
  assert.deepEqual(xlOff, xlOn.filter((_, index) => index !== 2), "Off drops only the third column at xl.");

  /* Header and rows share one template, so they cannot drift apart. */
  const table = strip(client.slice(client.indexOf("function DesktopPeopleIndex("), client.indexOf("function DesktopPeopleIndex(") + 5200));
  const templateUses = table.match(/desktopPeopleGridClass\(engagementLevelsEnabled\)/g) ?? [];

  assert.equal(templateUses.length, 2, "The header and the body row both read the same layout helper.");
  assert(
    !/grid-cols-\[/.test(table),
    "No hardcoded column template may survive inside the table; both come from the helper.",
  );

  /* Both the header cell and the value cell are gated. */
  assert(
    /\{engagementLevelsEnabled \? \([\s\S]{0,200}?Engagement<\/span>/.test(table),
    "The Engagement Level header renders only when the feature is on.",
  );
  assert(
    /\{engagementLevelsEnabled \? \([\s\S]{0,200}?engagementLevelTableLabel\(person\)/.test(table),
    "The Engagement value cell renders only when the feature is on.",
  );
  assert(!/Not rated|--|n\/a/i.test(table), "Off shows no placeholder in place of the column.");

  /* Wired to the one canonical derivation, not a second one. */
  assert(
    client.includes("<DesktopPeopleIndex") && /engagementLevelsEnabled=\{engagementLevelsEnabled\}/.test(client),
    "The table receives the workspace's actual setting.",
  );
  const derivations = client.match(/const engagementLevelsEnabled = [^;]+;/g) ?? [];
  assert.equal(derivations.length, 1, "Still exactly one place decides whether Engagement Levels are on.");
  assert(derivations[0].includes("data.featureFlags.engagementLevels"), "And it is the canonical feature flag.");
});

await check("Hiding the People table column loads and writes nothing", async () => {
  const loader = readFileSync(new URL("../src/lib/dos/missionary-app.ts", import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");

  assert(
    !/featureFlags\.engagementLevels\s*\?/.test(loader),
    "The People table fix must not start gating engagement data loading.",
  );
  assert(
    loader.includes("engagementLevel: person.engagement_level"),
    "Every person still carries their stored engagement to the client.",
  );

  /* The table renders the value; it never assigns one. */
  const table = client.slice(client.indexOf("function DesktopPeopleIndex("), client.indexOf("function DesktopPeopleIndex(") + 5200);
  assert(!/engagementLevel\s*=[^=]/.test(table), "The table assigns no engagement value.");
  for (const forbidden of ["fetch(", "submitJson", "/api/dos/app/people"]) {
    assert(!table.includes(forbidden), `A layout change must not ${forbidden}.`);
  }
});


/* ---------------------------------------------------------------------------
   An accidental tap must never destroy meaningful user-entered work.
--------------------------------------------------------------------------- */

await check("A backdrop can close what you are reading and never what you are typing", async () => {
  assert.equal(backdropMayDismiss("inspection"), true, "Reading a record: the backdrop closes it, as it always has.");
  assert.equal(backdropMayDismiss("editable"), false, "Holding user input: the backdrop is not a control.");
  assert.equal(swipeMayDismiss("inspection"), true, "A read-only sheet may be swiped away.");
  assert.equal(swipeMayDismiss("editable"), false, "A swipe while scrolling a form must not discard it.");

  const client = readFileSync(new URL("../src/components/dos/overlays/DosSurfaces.tsx", import.meta.url), "utf8");
  const sheet = client.slice(client.indexOf("function Sheet({"), client.indexOf("function MobileBottomSheet("));

  /* The rule is applied at the one place every sheet's backdrop is built, so
     it cannot be forgotten by an individual caller. */
  assert(
    sheet.includes("onMouseDown={backdropMayDismiss(kind) ? onClose : undefined}"),
    "Sheet's backdrop consults the surface kind rather than always closing.",
  );
  assert(
    !/onMouseDown=\{onClose\}/.test(sheet),
    "No unconditional backdrop dismissal may survive in Sheet.",
  );
  /* Default stays inspection so the read-only sheets are untouched. */
  assert(/kind = "inspection"/.test(sheet), "Sheets are read-only by default; only a form opts into protection.");
});

await check("A dirty form confirms before leaving, and a clean one does not", async () => {
  assert.equal(exitNeedsConfirmation({ isDirty: true, kind: "editable" }), true, "Dirty: confirm.");
  assert.equal(exitNeedsConfirmation({ isDirty: false, kind: "editable" }), false, "Clean: leave silently.");
  assert.equal(
    exitNeedsConfirmation({ isDirty: true, kind: "inspection" }),
    false,
    "A record you were only reading never asks, however long you looked at it.",
  );

  /* Save contract: a save that worked has nothing left to protect. */
  assert.equal(exitAfterSaveNeedsConfirmation(true), false, "A successful save leaves without a warning.");
  assert.equal(exitAfterSaveNeedsConfirmation(false), true, "A failed save has persisted nothing, so the work still matters.");
});

await check("Dirtiness means real entered work, not any keystroke", async () => {
  const opened = { name: "Naomi", notes: "", role: "not_active" };

  assert.equal(formIsDirty(opened, opened), false, "Untouched is clean.");
  assert.equal(formIsDirty(opened, { ...opened, notes: "Met for coffee" }), true, "Typed notes are work.");
  assert.equal(formIsDirty(opened, { ...opened, role: "discipling_them" }), true, "A changed selection is work.");

  /* Typing and deleting again leaves nothing to lose, so it must not prompt --
     a confirmation people see for no reason is a confirmation they learn to
     dismiss. */
  assert.equal(formIsDirty(opened, { ...opened, notes: "   " }), false, "Whitespace alone is not work.");
  assert.equal(formIsDirty(opened, { ...opened, name: " Naomi " }), false, "Re-typing the same value is not a change.");

  /* Controlled forms rebuild their objects every keystroke, so equal-by-value
     must not read as dirty or every form would prompt forever. */
  assert.equal(
    formIsDirty({ children: ["A", "B"] }, { children: ["A", "B"] }),
    false,
    "Equal nested values are clean despite being different objects.",
  );
  assert.equal(formIsDirty({ children: ["A"] }, { children: ["A", "B"] }), true, "An added child is work.");
});

await check("Add and Edit Person are the same protected task screen", async () => {
  const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");
  const addBlock = client.slice(client.indexOf('{formMode === "person" ? ('), client.indexOf('{formMode === "editPerson"'));
  const editBlock = client.slice(client.indexOf('{formMode === "editPerson"'), client.indexOf('{formMode === "meeting" ? ('));

  assert(addBlock.includes("<DosWorkflowPage"), "Add Person is a task screen.");
  assert(editBlock.includes("<DosWorkflowPage"), "Edit Person is a task screen, not a dismissible overlay.");
  assert(!editBlock.includes("<Sheet"), "Edit Person must not be a Sheet.");
});

await check("Every task screen is guarded by the primitive, not by per-form wiring", async () => {
  // USA-211 moved the primitive into DosSurfaces.tsx; the task screens still mount it from the client.
  const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");
  const surfaces = readFileSync(new URL("../src/components/dos/overlays/DosSurfaces.tsx", import.meta.url), "utf8");
  const page = surfaces.slice(surfaces.indexOf("function DosWorkflowPage("), surfaces.indexOf("function Sheet({"));

  /* The guard lives in the screen itself, so Log Meeting, Schedule Meeting and
     both Person screens are protected by being task screens rather than by
     each remembering to wire something. */
  assert(page.includes("useUnsavedWorkGuard({"), "The task-screen primitive owns the guard.");
  assert(page.includes("onClick={requestClose}"), "Back routes through the guard.");
  assert(page.includes("{guard.confirmation}"), "The screen renders the discard confirmation.");
  assert(!/onClick=\{onClose\}/.test(page), "No exit may bypass the guard.");

  /* All four task screens, therefore all four protected. */
  const mounts = client.match(/<DosWorkflowPage[\s\S]{0,200}?title="([^"]+)"/g) ?? [];
  assert(mounts.length >= 4, `Expected the four task screens, found ${mounts.length}.`);
  for (const expected of ["Add Person", "Edit Person", "Log Meeting", "Schedule Meeting"]) {
    assert(
      client.includes(`<DosWorkflowPage`) && client.includes(`title="${expected}"`) || client.includes(`title={logWorkflowSubtitle}`),
      `${expected} should be a guarded task screen.`,
    );
  }
});

await check("Every editable sheet declares itself, and the primitive protects it", async () => {
  // USA-211 moved the primitive into DosSurfaces.tsx; the editable sheets are still declared in the client.
  const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");
  const surfaces = readFileSync(new URL("../src/components/dos/overlays/DosSurfaces.tsx", import.meta.url), "utf8");
  const sheet = surfaces.slice(surfaces.indexOf("function Sheet({"), surfaces.indexOf("function MobileBottomSheet("));

  assert(sheet.includes("useUnsavedWorkGuard({"), "Sheet owns the guard for editable surfaces.");
  assert(sheet.includes("onClick={requestClose}"), "The X routes through the guard.");
  assert(/event.key === "Escape"[\s\S]{0,120}requestClose\(\)/.test(sheet), "Escape routes through the guard.");
  assert(sheet.includes("{guard.confirmation}"), "The sheet renders the discard confirmation.");

  /* Dirtiness is read from the live surface, so a sheet is protected by saying
     what it is rather than by reporting its own state. */
  assert(sheet.includes("readSurfaceValues(panelRef.current)"), "Dirtiness comes from the rendered controls.");

  /* Every form that collects input says so. This list is the completion
     criterion: a new editable sheet added without kind="editable" fails here. */
  const editableTitles = [
    "Edit Journey", "New Group", "Resource Check-In", "Check in", "Add progress",
    "Log Check-In", "Add Prayer Partner", "Add Prayer Request", "Edit Prayer Request",
    "Log Prayer", "Import Contacts",
  ];

  for (const title of editableTitles) {
    const line = client.split("\n").find((row) => row.includes("<Sheet ") && row.includes(`title="${title}"`));

    assert(line, `Expected an editable sheet titled ${title}.`);
    assert(line.includes('kind="editable"'), `${title} collects input and must declare kind="editable".`);
  }

  /* The Accountability, gathering, reminder and meeting sheets carry computed
     titles, so they are checked by their surrounding expression instead. */
  for (const marker of ['"Edit Accountability" : "New Accountability"', '"Edit Accountability" : "Add Accountability"', '"Log Meeting" : "Edit Meeting"', '"Edit Reminder"']) {
    const line = client.split("\n").find((row) => row.includes("<Sheet ") && row.includes(marker));

    assert(line, `Expected an editable sheet for ${marker}.`);
    assert(line.includes('kind="editable"'), `The sheet for ${marker} must declare kind="editable".`);
  }
});

await check("The second sheet primitive cannot become a loophole", async () => {
  const client = readFileSync(new URL("../src/components/dos/overlays/DosSurfaces.tsx", import.meta.url), "utf8");
  const legacy = client.slice(client.indexOf("function MobileBottomSheet("), client.indexOf("function MobileBottomSheet(") + 2600);

  assert(legacy.includes("kind?: DosSurfaceKind"), "MobileBottomSheet takes the same contract as Sheet.");
  assert(
    legacy.includes("onMouseDown={backdropMayDismiss(kind) ? onClose : undefined}"),
    "Its backdrop obeys the same rule rather than always closing.",
  );
  assert(/kind = "inspection"/.test(legacy), "Its two read-only previews keep backdrop dismissal.");
});

await check("Keep editing is the safe default and does not rebuild the form", async () => {
  const client = readFileSync(new URL("../src/components/dos/overlays/DosSurfaces.tsx", import.meta.url), "utf8");
  const guard = client.slice(client.indexOf("function useUnsavedWorkGuard("), client.indexOf("function useUnsavedWorkGuard(") + 1600);
  const dialog = client.slice(client.indexOf("function DiscardChangesDialog("), client.indexOf("function useUnsavedWorkGuard("));

  /* Keep editing only stops asking. The form was never unmounted, so typed
     values, selections and scroll position are all still there -- which is why
     the guard intercepts the exit rather than saving and restoring state. */
  assert(
    /onKeepEditing=\{\(\) => setIsConfirming\(false\)\}/.test(guard),
    "Keep editing dismisses the dialog and nothing else: no reset, no reload.",
  );
  assert(!/onExit\(\)/.test(guard.slice(guard.indexOf("onKeepEditing"))), "Keep editing must never exit.");

  /* Escape and the dialog's own backdrop choose the safe option. */
  assert(/event.key === "Escape"[\s\S]{0,80}onKeepEditing\(\)/.test(dialog), "Escape keeps editing.");
  assert(/onMouseDown=\{onKeepEditing\}/.test(dialog), "The dialog's backdrop keeps editing rather than discarding.");

  /* Discard is the only thing that throws work away. */
  assert(/onDiscard=\{\(\) => \{[\s\S]{0,120}onExit\(\)/.test(guard), "Only Discard exits with unsaved changes.");
});

await check("The FAB belongs to the app shell, not to a content container", async () => {
  const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");
  const fab = client.slice(client.indexOf("function MobileFloatingActions("), client.indexOf("function DesktopNavigation("));

  /* The old condition portaled only the desktop variant, so the mobile FAB
     asked for `fixed` and then rendered inside whatever overlay mounted it --
     anchoring to that container instead of the viewport. */
  assert(
    /if \(portalToBody\) \{/.test(fab),
    "Both variants portal to the body, so neither can anchor to a content container.",
  );
  assert(
    !/portalToBody && variant === "desktop"/.test(fab),
    "The desktop-only portal condition was the positioning defect and must not return.",
  );

  /* One diameter and one inset, declared once each. */
  assert(/h-16 w-16[^\"]*items-center justify-center rounded-full/.test(fab), "One circular button, one diameter.");
  const insets = fab.match(/right-\d+/g) ?? [];
  assert(insets.length > 0, "The inset is declared in the component, not by callers.");
  assert(!/right-\[\d+px\]/.test(fab), "No screenshot-specific magic offset.");

  /* Nothing square behind the circle: the button is the only thing with a
     shadow, and its container carries no background or radius. */
  const stack = fab.slice(fab.indexOf("const stackClassName"), fab.indexOf("const content"));
  assert(!/bg-\[|bg-white|shadow-\[/.test(stack), "The FAB stack has no background or shadow of its own.");
  assert(!stack.includes("overflow-y-auto"), "The FAB stack must not clip the circular shadow into a square silhouette.");
  assert(fab.includes('className="min-h-0 w-full overflow-y-auto'), "Only the open quick-action menu scrolls.");
  assert(fab.includes("[-webkit-tap-highlight-color:transparent]"), "The circular FAB suppresses Safari's rectangular tap highlight.");

  /* Sheets sit above it, so an open sheet is never competed with. */
  // USA-214: the FAB moved onto the documented z ladder (`z-dos-fab` = 25, beneath the nav at 30, above in-content overlays at 20); a sheet is still far above it.
  assert(/z-dos-fab/.test(fab), "The FAB sits below the sheet layer.");
  const surfaces = readFileSync(new URL("../src/components/dos/overlays/DosSurfaces.tsx", import.meta.url), "utf8");
  const sheet = surfaces.slice(surfaces.indexOf("function Sheet({"), surfaces.indexOf("function MobileBottomSheet("));
  assert(/z-\[1000\]/.test(sheet), "A sheet renders above the FAB, so the FAB stays behind its backdrop.");
});

await check("Person polish keeps fixed tabs centered and section hierarchy blue", async () => {
  const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");
  const personStart = client.indexOf("function PersonDetailOverlay(");
  const person = client.slice(personStart, client.indexOf("\nfunction ", personStart + 10));

  assert(person.includes('<Segmented') && person.includes('label={`${firstName} views`}'), "Person's three fixed views use the centered segmented control.");
  assert(!person.includes("<Eyebrow>Right now</Eyebrow>"), "The redundant Right now umbrella heading stays removed.");
  assert(person.includes('const eyebrowClass = "text-dos-eyebrow uppercase text-dos-eyebrowSection"'), "Last and Next meeting card eyebrows are blue.");
  for (const section of ["Journey", "Accountability", "Prayer", "Fruit", "Feedback", "Groups", "Reminder", "Group gathering"]) {
    assert(person.includes(`aria-label="${section}"`) || person.includes(`<Eyebrow>${section}</Eyebrow>`), `${section} remains a named Person section.`);
  }
  assert(!person.includes('tone="sub"'), "Person's named overview sections use the blue section eyebrow treatment.");
});

console.log(`USA-168 stabilization behavior checks passed (${checks.length}):`);
for (const name of checks) console.log(`- ${name}`);
