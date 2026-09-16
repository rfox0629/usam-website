/* USA-278: sending a Library resource to the people it is for.
 *
 * Two halves. First the behavior that can run here: the scoring and answer
 * rules the Library preview, the recipient's assessment and the server-side
 * submission all share. Then the contract checks over the files, which is how
 * the rest of the DOS suite guards migrations, route guards and copy.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  assessmentOverallScore,
  assessmentPercentage,
  buildAssessmentAnswerPayload,
  buildAssessmentGroups,
  countAssessmentAnswers,
  isAssessmentComplete,
  normalizeAssessmentAnswers,
  scoreAssessmentCategory,
  scoreAssessmentParticipant,
  summarizeAssessment,
} from "../src/lib/dos/assessment-scoring.ts";
import {
  cleanShareParticipantName,
  dosResourceActionLabels,
  dosResourceSharePath,
  dosResourceShareStatusLabel,
  dosShareableResourceSlugs,
  isDosResourceShareEnabled,
  isDosResourceShareOpen,
  isValidDosResourceShareToken,
  shareParticipantSummary,
  shareRequesterDisplayName,
} from "../src/lib/dos/resource-sharing.ts";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

/* ---- Only a resource whose whole flow works is offered as sendable ------- */

assert.deepEqual([...dosShareableResourceSlugs], ["marriage-assessment"], "marriage is the only resource sendable in this release");
assert.equal(isDosResourceShareEnabled({ slug: "marriage-assessment" }), true);
assert.equal(isDosResourceShareEnabled({ slug: "friendship-assessment" }), false, "an assessment without a finished flow is not offered");

/* Assessments send and preview. A Journey keeps its existing wording and is
   never routed through the share flow. */
assert.deepEqual(
  dosResourceActionLabels({ slug: "marriage-assessment", type: "assessment" }),
  { canSend: true, previewLabel: "Preview assessment", sendLabel: "Send assessment" },
);
assert.equal(dosResourceActionLabels({ slug: "friendship-assessment", type: "assessment" }).canSend, false);
assert.equal(dosResourceActionLabels({ slug: "marks-of-discipleship", type: "guided_resource" }).canSend, false, "Journeys never route through the share flow");
assert.equal(dosResourceActionLabels({ slug: "marks-of-discipleship", type: "guided_resource" }).sendLabel, "Assign Journey");

/* ---- A link is ready, never sent ----------------------------------------- */

assert.equal(dosResourceShareStatusLabel("link_ready"), "Link ready");
assert.equal(dosResourceShareStatusLabel("in_progress"), "In progress");
assert.equal(dosResourceShareStatusLabel("completed"), "Completed");
assert.equal(dosResourceShareStatusLabel("revoked"), "Link revoked");
assert.equal(dosResourceShareStatusLabel("expired"), "Link expired", "a link that aged out reads differently from one someone turned off");
for (const status of ["link_ready", "in_progress", "completed", "expired", "revoked"]) {
  assert.ok(!/\bsent\b/i.test(dosResourceShareStatusLabel(status)), `status must never read as delivered: ${status}`);
}
assert.equal(isDosResourceShareOpen("link_ready"), true);
assert.equal(isDosResourceShareOpen("completed"), false, "a completed assessment never blocks a fresh one");

/* ---- Tokens ------------------------------------------------------------- */

assert.equal(isValidDosResourceShareToken("aB3-_".padEnd(24, "x")), true);
assert.equal(isValidDosResourceShareToken("short"), false, "a guessable token is rejected before any query");
assert.equal(isValidDosResourceShareToken("../../etc/passwd"), false);
assert.equal(isValidDosResourceShareToken(null), false);
assert.equal(dosResourceSharePath("abc123abc123abc123"), "/dos/resource/abc123abc123abc123");

/* ---- Participants: a first name is enough, nothing is invented ---------- */

assert.equal(cleanShareParticipantName("  Brooke   "), "Brooke");
assert.equal(cleanShareParticipantName(42), "", "a non-string is never coerced into a participant name");
assert.equal(
  shareParticipantSummary([
    { name: "Ryan", personId: "a", role: "Husband" },
    { name: "Brooke", personId: null, role: "Wife" },
  ]),
  "Ryan and Brooke",
);
assert.equal(
  shareParticipantSummary([
    { name: "", personId: "a", role: "Husband" },
    { name: "Brooke", personId: null, role: "Wife" },
  ]),
  "Husband and Brooke",
  "a missing name falls back to the role rather than reading as an empty slot",
);
assert.equal(shareRequesterDisplayName(null), "Your DOS leader", "the recipient always sees who asked");
assert.equal(shareRequesterDisplayName("Fox Family"), "Fox Family");

/* ---- Scoring is the rule that already shipped --------------------------- */

const questions = [
  { group: "Trust & Communication", id: "trust", prompt: "How much do you trust me?" },
  { group: "Trust & Communication", id: "conflict", prompt: "How well do we handle conflicts?" },
  { group: "Shared Life", id: "money", prompt: "How well do we manage money?" },
];
const roles = ["Husband", "Wife"];
const answers = {
  conflict: { Husband: 6, Wife: 4 },
  money: { Husband: 10, Wife: 8 },
  trust: { Husband: 8, Wife: 10 },
};

assert.equal(buildAssessmentGroups(questions).length, 2, "questions keep their Library groups");
assert.equal(countAssessmentAnswers(answers, questions, roles), 6);
assert.equal(scoreAssessmentParticipant(answers, questions, "Husband", 30).score, 24);
assert.equal(scoreAssessmentParticipant(answers, questions, "Wife", 30).score, 22);
assert.equal(assessmentOverallScore([{ score: 24 }, { score: 22 }]), 23, "the relationship total is the spouses' rounded average");
assert.equal(assessmentPercentage(23, 30), 77);

const trustCategory = scoreAssessmentCategory(answers, buildAssessmentGroups(questions)[0], roles);
assert.equal(trustCategory.husbandScore, 14);
assert.equal(trustCategory.wifeScore, 14, "each spouse keeps their own category figure");

const summary = summarizeAssessment({ answers, maxScore: 30, participants: roles, questions });
assert.equal(summary.overallScore, 23);
assert.equal(summary.categoryScores.length, 2);
assert.ok(summary.range.label, "a health range label comes from the ranges that already shipped");

/* ---- Answers are never guessed, coerced, or attributed to the wrong person */

assert.deepEqual(
  normalizeAssessmentAnswers({ trust: { Husband: 8, Wife: "10" } }, questions, roles),
  { trust: { Husband: 8 } },
  "a non-numeric score is dropped, never coerced",
);
assert.deepEqual(
  normalizeAssessmentAnswers({ trust: { Husband: 8, Stranger: 5 } }, questions, roles),
  { trust: { Husband: 8 } },
  "an unknown participant cannot smuggle in an answer",
);
assert.deepEqual(
  normalizeAssessmentAnswers({ "not-a-question": { Husband: 8 } }, questions, roles),
  {},
  "an unknown question is dropped",
);
assert.deepEqual(normalizeAssessmentAnswers({ trust: { Husband: 11 } }, questions, roles), {}, "a score outside 0-10 is dropped");
assert.deepEqual(normalizeAssessmentAnswers(null, questions, roles), {});

assert.equal(isAssessmentComplete(answers, questions, roles), true);
assert.equal(
  isAssessmentComplete({ trust: { Husband: 8 } }, questions, roles),
  false,
  "a half-answered assessment can never be submitted as complete",
);

const payload = buildAssessmentAnswerPayload(answers, questions, roles, { Husband: "Ryan", Wife: "Brooke" });
assert.deepEqual(payload.participantNames, { Husband: "Ryan", Wife: "Brooke" });
assert.equal(payload.questions.length, 3);
assert.deepEqual(payload.questions[0].scores, { Husband: 8, Wife: 10 }, "each spouse's answer stays attributed to them");

/* ---- Migration: additive, scoped, revocable ----------------------------- */

const migration = read("supabase/migrations/20260916120000_dos_resource_share_assignments.sql");

for (const required of [
  "create table if not exists public.dos_resource_share_assignments",
  "workspace_id uuid not null references public.missionary_households(id) on delete cascade",
  "primary_person_id uuid not null references public.missionary_field_people(id) on delete cascade",
  "secondary_person_id uuid references public.missionary_field_people(id) on delete set null",
  "secondary_participant_name text not null",
  "result_id uuid references public.dos_assessment_results(id) on delete set null",
  "alter table public.dos_resource_share_assignments enable row level security",
  "revoke all on table public.dos_resource_share_assignments from anon",
  "public.can_access_dos_workspace(workspace_id, array['admin', 'editor'])",
  "dos_resource_share_assignments_token_key",
  "where status in ('link_ready', 'in_progress')",
  "dos_resource_share_assignments_open_couple_unique",
  "couple_person_low uuid generated always as (least(primary_person_id, secondary_person_id)) stored",
  "check (status in ('link_ready', 'in_progress', 'completed', 'expired', 'revoked'))",
]) {
  assert.ok(migration.includes(required), `share migration missing: ${required}`);
}

assert.ok(
  !/alter table public\.dos_resource_assignments/.test(migration),
  "Journey assignments must not be altered by this migration",
);
assert.ok(
  !/drop table (?!if exists public\.dos_resource_share_assignments)/.test(migration),
  "the migration is additive; it drops nothing that already holds data",
);
assert.ok(
  read("supabase/migrations/20260916120000_dos_resource_share_assignments_rollback.sql").includes("drop table if exists public.dos_resource_share_assignments"),
  "an additive migration ships with its rollback",
);

/* ---- Server library: scoped, idempotent, minimal across the token boundary */

const shareLib = read("src/lib/dos/resource-share-links.ts");

for (const required of [
  "import \"server-only\"",
  "randomBytes(24).toString(\"base64url\")",
  "dosPersonBelongsToWorkspace",
  "findOpenAssignmentForCouple",
  ".in(\"status\", [\"link_ready\", \"in_progress\"])",
  "revokeDosResourceShareAssignment",
  "linkDosResourceShareSpouse",
  "settleExpiredAssignments",
  "requestedPeople.has(personId as string)",
  "isAssessmentComplete",
  "summarizeAssessment",
  "source: \"sent_link\"",
]) {
  assert.ok(shareLib.includes(required), `share server library missing: ${required}`);
}

assert.ok(
  shareLib.includes("if (row.status === \"completed\") {\n    return { alreadyCompleted: true as const, ok: true as const, resultId: row.result_id };"),
  "a repeated submission returns the existing result instead of creating a second one",
);
assert.ok(
  /await supabase\s*\.from\("dos_assessment_results"\)\s*\.delete\(\)/.test(shareLib),
  "a losing concurrent submission cleans up its own result row",
);
assert.ok(shareLib.includes("shareRequesterDisplayName(row.requested_by_name)"), "only a display name crosses the token boundary");

/* The recipient state carries the assessment and two names. Nothing about the
   workspace, the contact records or any other assignment goes with it. */
const recipientState = shareLib.slice(
  shareLib.indexOf("export async function loadDosResourceShareLink"),
  shareLib.indexOf("async function loadShareRowForToken"),
);
assert.ok(recipientState.length > 200, "the recipient state slice was found");
for (const forbidden of ["email", "phone", "workspaceId", "notes", "person_id"]) {
  assert.ok(!recipientState.includes(forbidden), `recipient state must not expose: ${forbidden}`);
}

/* ---- Routes: permission first, every time ------------------------------- */

const shareRoute = read("app/api/dos/app/resource-share-assignments/route.ts");

for (const required of [
  "requireDosWorkspaceRouteAccess",
  "canWriteDosActivity",
  "resolveDosAppWorkspaceId",
  "revokeDosResourceShareAssignment",
  "linkDosResourceShareSpouse",
]) {
  assert.ok(shareRoute.includes(required), `share route missing guard: ${required}`);
}
assert.ok(shareRoute.includes("export async function POST") && shareRoute.includes("export async function PATCH"));

const publicRoute = read("app/api/dos/resource-links/[token]/route.ts");
assert.ok(publicRoute.includes("isValidDosResourceShareToken"), "the public route validates the token shape first");
for (const forbidden of ["missionary_field_people", "createSupabaseAdminClient", "workspaceId"]) {
  assert.ok(!publicRoute.includes(forbidden), `the public route must not reach past its token: ${forbidden}`);
}

/* ---- Recipient experience ----------------------------------------------- */

const recipientPage = read("app/dos/resource/[token]/page.tsx");
const recipientForm = read("app/dos/resource/[token]/DosSharedAssessmentForm.tsx");

assert.ok(recipientPage.includes("loadDosResourceShareLink"));
for (const state of ["expired", "invalid", "revoked", "completed", "not_configured"]) {
  assert.ok(recipientPage.includes(`${state}: {`), `recipient page missing state copy: ${state}`);
}
assert.ok(recipientPage.includes("index: false"), "a token page is never indexed");

assert.ok(recipientForm.includes("Start assessment"), "the recipient's own assessment says Start assessment");
assert.ok(recipientForm.includes("Resume assessment"), "saved progress resumes rather than restarting");
assert.ok(recipientForm.includes("Requested by"), "the recipient sees who asked");
assert.ok(recipientForm.includes("Never guess how your spouse would answer."));
assert.ok(
  recipientForm.includes("both of your responses are visible in this session"),
  "the joint model is stated before anyone starts",
);
assert.ok(recipientForm.includes("intent: \"save\""), "progress persists to the server, not to this browser");
assert.ok(recipientForm.includes("intent: \"submit\""));
assert.ok(recipientForm.includes("Assessment complete"), "completion is confirmed");

/* ---- Library and People ------------------------------------------------- */

const dosApp = read("app/dos/app/DosMvpAppClient.tsx");

assert.ok(dosApp.includes("actions.sendLabel"), "the Library resource page offers the send action");
assert.ok(dosApp.includes("actions.previewLabel"), "the Library resource page offers preview");
assert.ok(
  !dosApp.includes(">\n          Start Assessment\n        </a>"),
  "the Library detail no longer starts a questionnaire in place of establishing recipients",
);
assert.ok(dosApp.includes("mode=preview"), "preview opens the questions in preview mode");
assert.ok(dosApp.includes("Preview is for you — it saves nothing and assigns nobody."));
assert.ok(dosApp.includes("aria-label=\"Resources\""), "the Person Activity area has a Resources section");
assert.ok(dosApp.includes("label: \"Send resource\""), "Send resource is on the Person floating plus menu");
assert.ok(dosApp.includes("dosLinkedSpouseForPerson"), "the linked spouse comes from the household model");
assert.ok(dosApp.includes("Copy link"), "a resource row offers Copy link");
assert.ok(dosApp.includes("View results"), "a completed resource row opens the results");
assert.ok(dosApp.includes("sharedResultIds"), "one completion is one timeline entry, not two");

const sendSheet = dosApp.slice(dosApp.indexOf("function SendResourceSheet"), dosApp.indexOf("function ResourceShareResultSheet"));
assert.ok(sendSheet.includes("A first name is enough. No contact record is created."));
assert.ok(sendSheet.includes("Nobody by that name yet. Add them in People first."), "sending never quick-adds a contact");
assert.ok(!sendSheet.includes("onCreatePerson"), "the send flow has no contact-creation path");
/* Comments may name the wording they avoid; the rendered flow may not. */
const sendSheetCopy = sendSheet.replace(/\/\*[\s\S]*?\*\//g, "");
assert.ok(!/\bSent\b/.test(sendSheetCopy), "the send flow never claims a delivery");
assert.ok(sendSheetCopy.includes("Link ready"), "the send flow reports a link, not a delivery");
assert.ok(sendSheetCopy.includes("Nothing has been sent yet."), "the send flow says plainly that DOS delivered nothing");

const spouseLookup = dosApp.slice(dosApp.indexOf("function dosLinkedSpouseForPerson"), dosApp.indexOf("function dosResourceShareDateLine"));
assert.ok(!spouseLookup.includes("lastName") && !spouseLookup.includes("surname"), "a spouse is never inferred from a surname");

/* ---- Existing work is preserved ----------------------------------------- */

const marriageClient = read("app/dos/library/marriage-assessment/MarriageAssessmentClient.tsx");
assert.ok(marriageClient.includes("/api/dos/app/assessment-results"), "the in-app save path is untouched");
assert.ok(marriageClient.includes("Standalone result. Not saved to a profile."));
assert.ok(marriageClient.includes("Preview. Nothing is saved, nobody is assigned this, and no link is created."));

const loader = read("src/lib/dos/missionary-app.ts");
assert.ok(loader.includes("loadResourceShareAssignmentsForWorkspace"));
assert.ok(
  loader.includes("isMissingWorkflowTable(result.error, \"dos_resource_share_assignments\")"),
  "the loader tolerates the table not being installed yet",
);
assert.ok(loader.includes("loadResourceAssignmentsForWorkspace"), "Journey assignments still load");

console.log("DOS resource sharing (USA-278) regression passed.");
