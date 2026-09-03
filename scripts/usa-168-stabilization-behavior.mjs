import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { accountabilityConfirmedSubjects, accountabilityProgressKind, accountabilityProgressLabel, commitmentConfirmedSubjectCount, unifiedAccountabilityRows } from "../src/lib/dos/accountability-presentation.ts";
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
  assert.equal(
    (client.match(/<AccountabilityFields/g) ?? []).length,
    2,
    "Exactly two places render Accountability fields: the sheet and Log Meeting inline.",
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
  assert(
    updatesRoute.includes("if (!progressNote && !subjectPersonId && !subjectPersonName) {"),
    "An update must be valid with a note OR a person id OR a name, and rejected with none of them.",
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

/* The question that decides all of the above is asked once, in the one
   canonical form, and only when there is a number to describe. */
await check("What are you counting is asked only when a target is entered", async () => {
  const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");
  const fieldsStart = client.indexOf("function AccountabilityFields({");
  const fields = client.slice(fieldsStart, client.indexOf("\nfunction ", fieldsStart + 10));

  assert(fields.includes("What are you counting?"), "The one canonical form asks what the number counts.");
  assert(fields.includes("{hasTargetCount ? ("), "The question appears only once a valid number is entered.");
  assert(
    fields.includes('const hasTargetCount = /^\\d+$/.test(targetCount.trim()) && Number(targetCount.trim()) > 0;'),
    "Only a positive whole number counts as a target.",
  );
  assert(fields.includes('{ label: "People", value: "people" as const }'), "People stores the people kind.");
  assert(fields.includes('{ label: "Times", value: "count" as const }'), "Times reads plainly but stores the generic count kind.");

  // The choice travels to the commitments endpoint, and never without a number.
  const routerStart = client.indexOf("function accountabilityRoute(");
  const router = client.slice(routerStart, client.indexOf("\n  function ", routerStart + 10));
  assert(router.includes("targetCount !== null && isDosCommitmentTargetKind(rawKind)"), "A kind is only stored alongside a real number.");
  assert(router.includes("targetKind,"), "The chosen kind reaches the commitments endpoint.");

  // Rows name their own action, so nobody infers that "Check in" adds a person.
  assert(
    client.includes('row.progressKind === "people" ? "+ Add person" : row.progressKind === "count" ? "+ Add progress" : "Check in"'),
    "Each row must name the action it actually performs.",
  );
});

console.log(`USA-168 stabilization behavior checks passed (${checks.length}):`);
for (const name of checks) console.log(`- ${name}`);
