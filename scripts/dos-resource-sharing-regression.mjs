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
/* USA-280: a completed link is no longer a dead end, so it has no state copy;
   it renders the couple's own report. The refusal states still do. */
for (const state of ["expired", "invalid", "revoked", "not_configured"]) {
  assert.ok(recipientPage.includes(`${state}: {`), `recipient page missing state copy: ${state}`);
}
assert.ok(!recipientPage.includes("completed: {"), "a completed link shows the report, not a thank-you dead end");
assert.ok(recipientPage.includes("DosSharedAssessmentReport"), "a completed link renders the shared report");
assert.ok(recipientPage.includes("index: false"), "a token page is never indexed");

/* USA-280: the link preview names the assessment, and never carries a token. */
assert.ok(recipientPage.includes("openGraph"), "the recipient page declares its own share card");
assert.ok(
  recipientPage.includes("/share/assessment/${dosShareableResourceSlugs[0]}"),
  "the share card is addressed by resource slug",
);
assert.ok(!/share\/assessment\/\$\{[^}]*token/.test(recipientPage), "no token reaches the share image URL");

const shareCardRoute = read("app/share/assessment/[slug]/route.tsx");
assert.ok(shareCardRoute.includes("generateStaticParams"), "the assessment share card is prerendered per slug");
/* Comments in that file discuss tokens at length; the code must not use one. */
assert.ok(
  !shareCardRoute.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "").includes("token"),
  "the share card route never reads a token",
);

/* USA-280: the report is shared, scrollable, printable, and honest about the
   number it leads with. */
const report = read("src/components/dos/assessments/AssessmentReport.tsx");
/* USA-281: "Print or save as PDF" handed the page to the browser, which
   stamped its own header, footer and the workspace URL onto every sheet. Both
   actions now hand over a generated document instead. */
assert.ok(/onClick=\{handleDownload\}[\s\S]{0,160}Download PDF/.test(report), "the report can be downloaded as a document");
assert.ok(/onClick=\{handlePrint\}[\s\S]{0,160}>\s*Print\s*</.test(report), "the report can still be printed");
assert.ok(
  report.includes("buildAssessmentReportPdf(data)"),
  "both actions build the document from the same data the screen renders",
);
assert.ok(
  report.includes("link.download = assessmentReportFileName"),
  "the download carries a real filename rather than the page title",
);
assert.ok(
  !/window\.print\(\)(?![\s\S]{0,400}refuses the generated file)/.test(report.slice(0, report.indexOf("return ("))),
  "printing goes through the generated document, with window.print only as the fallback",
);
assert.ok(report.includes("@media print"), "the report has a print layout");
assert.ok(report.includes("assessment-report-hide-on-print"), "app controls are hidden in print");
assert.ok(report.includes("break-inside: avoid"), "print avoids splitting a section mid-answer");
/* USA-282 reworded this, the guarantee is unchanged: the headline figure is
   named as an average and the reader is told how it was arrived at. */
assert.ok(report.includes("Average score"), "the headline figure is labelled as an average");
assert.ok(
  report.includes("your two scores added together and halved"),
  "the report says how the average was arrived at",
);
/* Same guarantee, read across the line breaks JSX puts in the sentence. */
assert.ok(
  /not a\s+measure\s+of your\s+marriage/.test(report) && /not a diagnosis/.test(report),
  "the report refuses to read as a diagnosis",
);
assert.ok(report.includes("Every answer"), "every answer is in the report");
assert.ok(!report.includes("\u2014"), "the report uses no em dashes");

const sharedReport = read("app/dos/resource/[token]/DosSharedAssessmentReport.tsx");
assert.ok(sharedReport.includes("AssessmentReport"), "the recipient view reuses the shared report");
assert.ok(sharedReport.includes("can see these results"), "the recipient is told who can see the results");

/* USA-280: Next and Previous move the real scroll container, not the window. */
assert.ok(recipientForm.includes("nearestScrollableAncestor"), "the form scrolls the container that actually scrolls");
assert.ok(recipientForm.includes("target.focus("), "focus moves to the new section");
assert.ok(
  /useEffect\(\(\) => \{[\s\S]*?revealSection[\s\S]*?\}, \[activeGroupIndex, stage\]\)/.test(recipientForm),
  "the scroll effect depends on the step alone, so autosaves never move the reader",
);

assert.ok(recipientForm.includes("Start assessment"), "the recipient's own assessment says Start assessment");
assert.ok(recipientForm.includes("Resume assessment"), "saved progress resumes rather than restarting");
assert.ok(recipientForm.includes("From ${requestedByName}"), "the recipient sees who asked");
assert.ok(recipientForm.includes("Never guess how your spouse would answer."));
assert.ok(
  recipientForm.includes("Both sets of answers are visible on this screen"),
  "the joint model is stated before anyone starts",
);
assert.ok(recipientForm.includes("intent: \"save\""), "progress persists to the server, not to this browser");
assert.ok(recipientForm.includes("intent: \"submit\""));
/* USA-282 replaced the "Assessment complete" dead end with the results
   themselves. The guarantee is the same one, kept stronger: submitting has to
   end somewhere that confirms the answers landed. */
assert.ok(
  recipientForm.includes("<DosSharedAssessmentReport shareLink={completedReport} />"),
  "completion is confirmed by showing the couple their own results",
);
assert.ok(
  recipientForm.includes("Answers received"),
  "and by a confirmation screen when the report itself could not be read back",
);
assert.ok(
  !recipientForm.includes("Assessment complete"),
  "the dead end that confirmed nothing must not come back",
);

/* ---- Library and People ------------------------------------------------- */

const dosApp = read("app/dos/app/DosMvpAppClient.tsx");

assert.ok(dosApp.includes("actions.sendLabel"), "the Library resource page offers the send action");
assert.ok(dosApp.includes("actions.previewLabel"), "the Library resource page offers preview");
assert.ok(
  !dosApp.includes(">\n          Start Assessment\n        </a>"),
  "the Library detail no longer starts a questionnaire in place of establishing recipients",
);
assert.ok(dosApp.includes("mode=preview"), "preview opens the questions in preview mode");
/* USA-281: the sample is labelled as a sample and the way to read all of them
   is a link rather than a sentence. */
assert.ok(dosApp.includes("Sample questions"), "the five questions on the detail page are labelled a sample");
assert.ok(dosApp.includes("See all {total} questions"), "the detail page links to every question");
assert.ok(dosApp.includes("{sample.length} of {total}"), "the detail page says how much of the assessment the sample covers");
assert.ok(dosApp.includes("aria-label=\"Resources\""), "the Person Activity area has a Resources section");
/* USA-281 follow-up: ONE entry, not two. "Assign journey" and "Send resource"
   made the user pick an internal flow before picking a resource. */
assert.ok(dosApp.includes("label: \"Add resource\""), "Add resource is on the Person floating plus menu");
assert.ok(!dosApp.includes("label: \"Send resource\"") && !dosApp.includes("label: \"Assign journey\""),
  "the two old entries are gone rather than left beside the new one");
/* One PERSON-level picker. Assigning a journey to a whole group is a
   different flow and keeps its own sheet. */
assert.ok(!dosApp.includes("assignResourcePickerPersonId"),
  "the second person-level journey picker is gone, not merely unreachable");
assert.ok(/label: "Add resource", onClick: \(\) => onSendResource\(person\.id\)/.test(dosApp),
  "the floating entry opens the same picker as Resources + Add, with this person already chosen");
assert.ok(dosApp.includes("dosLinkedSpouseForPerson"), "the linked spouse comes from the household model");
assert.ok(dosApp.includes("Copy link"), "a resource row offers Copy link");
assert.ok(dosApp.includes("View results"), "a completed resource row opens the results");
assert.ok(dosApp.includes("sharedResultIds"), "one completion is one timeline entry, not two");

const addSheet = dosApp.slice(dosApp.indexOf("function ResourceAddSheet("), dosApp.indexOf("function ResourcePickerSheet("));

assert.ok(/label: "Journeys"/.test(addSheet) && /label: "Assessments"/.test(addSheet),
  "the picker groups by what the resource is, not by which flow it uses");
assert.ok(!/"Send a link"|"Assign a journey"/.test(addSheet),
  "the old flow-shaped group names are gone");
assert.ok(addSheet.includes('].filter((group) => group.resources.length);'),
  "a group with no supported resources is not rendered at all");
assert.ok(addSheet.includes("const journeys = dosAssignableResourceItems.filter((resource) => !assessmentSlugs.has(resource.slug));"),
  "a resource that supports both flows is listed once, under what it is");
assert.ok(addSheet.includes("Nothing is created until you confirm it."),
  "choosing in the picker creates nothing");

/* The person chosen for + Add is carried into whichever setup follows, so a
   record never asks who this is for. */
assert.ok(/onAssign=\{\(resource\) => \{\s*const personId = addResourcePersonId;[\s\S]{0,200}openResourceAssignmentCreate\(resource, personId/.test(dosApp),
  "journey setup opens for the person the picker was opened for");
assert.ok(/onSend=\{\(resource\) => \{\s*const personId = addResourcePersonId;[\s\S]{0,160}openSendResource\(resource, personId\)/.test(dosApp),
  "assessment setup opens for the person the picker was opened for");

/* One Resources section: journeys then assessments, under one + Add. */
assert.ok(!dosApp.includes('<section aria-label="Journey" '),
  "the Person record no longer has a Journey section separate from Resources");
assert.ok(dosApp.includes("{conceptJourneys.length || personResourceShares.length ? ("),
  "the Person Resources section holds journeys and assessments together");
assert.ok(dosApp.includes("{assignmentGroups.length || resourceShares.length ? ("),
  "My Record's Resources section holds journeys and assessments together");
assert.ok(dosApp.includes("const currentCount = draftAssessments.length + activeCommitments.length;"),
  "a journey is no longer counted under Current commitments as well, so nothing is listed twice");
assert.ok(dosApp.includes("function ResourceAssessmentRow("),
  "an assessment row is drawn once and used by both panels");

/* The Person record overlay reserves the same floating-button clearance My
   Record already had. Without it the last Resources row sat under the button
   with no way to scroll it clear, which the browser run caught. */
assert.ok(
  !dosApp.includes("pb-[calc(env(safe-area-inset-bottom)+9.5rem)]"),
  "the Person overlay no longer carries its own ad-hoc bottom padding",
);
assert.ok(
  (dosApp.match(/pb-dos-fab-clearance/g) ?? []).length >= 5,
  "every surface that carries a floating button reserves the shared clearance",
);

const sendSheet = dosApp.slice(dosApp.indexOf("function SendResourceSheet"), dosApp.indexOf("function ResourceShareResultSheet"));
assert.ok(sendSheet.includes("A first name is enough. No contact is created."));
assert.ok(sendSheet.includes("Nobody by that name yet. Add them in People first."), "sending never quick-adds a contact");
assert.ok(!sendSheet.includes("onCreatePerson"), "the send flow has no contact-creation path");
/* Comments may name the wording they avoid; the rendered flow may not. */
const sendSheetCopy = sendSheet.replace(/\/\*[\s\S]*?\*\//g, "");
assert.ok(!/\bSent\b/.test(sendSheetCopy), "the send flow never claims a delivery");
assert.ok(sendSheetCopy.includes("Link ready"), "the send flow reports a link, not a delivery");
assert.ok(sendSheetCopy.includes("Nothing has been sent yet."), "the send flow says plainly that DOS delivered nothing");

const spouseLookup = dosApp.slice(dosApp.indexOf("function dosLinkedSpouseForPerson"), dosApp.indexOf("function dosResourceShareDateLine"));
assert.ok(!spouseLookup.includes("lastName") && !spouseLookup.includes("surname"), "a spouse is never inferred from a surname");

/* ---- USA-279: the book study design, and a preview that is a preview ----- */

const assessmentUi = read("src/components/dos/assessments/AssessmentUi.tsx");
const marriageClient = read("app/dos/library/marriage-assessment/MarriageAssessmentClient.tsx");

/* The book study's own tokens, reused rather than reinvented. */
for (const token of [
  "max-w-[700px]",          // the Journey's reading measure
  "bg-white",               // no blue page background
  "border-[#EAF2FF]",       // hairline
  "bg-[#F8FBFF]",           // band
  "rounded-[11px]",         // header button radius
  "rounded-[14px]",         // dock button radius
  "text-[11px] font-bold uppercase tracking-[0.15em]", // eyebrow ramp
]) {
  assert.ok(assessmentUi.includes(token), `assessment UI must reuse the book study token: ${token}`);
}

/* The shapes the founder called out as defects must not come back. */
for (const defect of ["rounded-[28px]", "rounded-[24px]", "shadow-[0_24px_70px", "bg-[#F8FBFF] px-4 pb-24"]) {
  assert.ok(!assessmentUi.includes(defect), `assessment UI must not reintroduce: ${defect}`);
}

assert.ok(
  !marriageClient.includes("fixed inset-x-0 bottom-0"),
  "the assessment page no longer pins a bar over its own content",
);

const preview = marriageClient.slice(marriageClient.indexOf("if (isPreview)"), marriageClient.indexOf("const activeGroup ="));
assert.ok(preview.length > 200, "the preview branch was found");
assert.ok(preview.includes("Preview only. Answers are not saved."), "preview says plainly that nothing is saved");
assert.ok(preview.includes("groups.map"), "preview renders every group on one page");
assert.ok(!preview.includes("AssessmentStepBand"), "preview shows no progress band");
assert.ok(!preview.includes("AssessmentDock"), "preview shows no Back/Next wizard controls");
assert.ok(!/completionPercentage|answeredCount|requiredCount/.test(preview), "preview shows no percentage or answered count");
assert.ok(preview.includes("Back to Marriage Assessment"), "preview offers a labelled way back");
assert.ok(
  marriageClient.includes('const assessmentDetailHref = "/dos/app?view=library&resource=marriage-assessment"'),
  "preview returns to the assessment detail screen, not the Library root",
);

/* The recipient keeps its step-by-step flow. */
assert.ok(recipientForm.includes("AssessmentStepBand"), "the recipient questionnaire keeps its steps");
assert.ok(recipientForm.includes('secondaryLabel={activeGroupIndex === 0 ? undefined : "Previous"}'), "the recipient has working Previous navigation");
assert.ok(recipientForm.includes('primaryLabel={isLastGroup ? (isSubmitting ? "Sending..." : "Finish and send") : "Next"}'), "the recipient has working Next navigation");

/* ---- USA-279: the role is an explicit choice ---------------------------- */

assert.ok(shareLib.includes("isAssessmentRoleFor(resource, input.primaryParticipantRole)"), "the server validates the chosen role");
assert.ok(shareLib.includes("oppositeAssessmentRole(resource, primaryRole)"), "the spouse takes the opposite role");
assert.ok(shareRoute.includes("primaryParticipantRole: asString(payload.personRole)"), "the route carries the role through");

const scoring = read("src/lib/dos/assessment-scoring.ts");
assert.ok(
  scoring.includes('participants.includes("Husband") ? "Husband" : participants[0]'),
  "category figures are looked up by role, not by participant order",
);
assert.ok(
  !scoring.includes('getAssessmentAnswer(answers, question.id, participants[0] ?? "Husband")'),
  "the positional husband lookup is gone",
);

const sendForm = dosApp.slice(dosApp.indexOf("function SendResourceSheet"), dosApp.indexOf("function ResourceShareResultSheet"));
assert.ok(sendForm.includes("Who are you sending this to?"), "the send form asks who it is for");
assert.ok(sendForm.includes("Their role in this assessment"), "the send form asks for the role explicitly");
assert.ok(sendForm.includes('placeholder="Search people"'), "the picker says Search people");
assert.ok(!sendForm.includes("Search your field"), "the old picker wording is gone");
assert.ok(sendForm.includes("A first name is enough. No contact is created."), "the spouse input stays compact and says a first name is enough");
assert.ok(!sendForm.includes("Use this when they already have their own People record."), "the oversized radio-option explanations are gone");
assert.ok(sendForm.includes("spousePersonId === personId"), "the same contact cannot be both participants");
assert.ok(sendForm.includes("setRole(reliableAssessmentRoleFor"), "the role resets when the person changes");
assert.ok(sendForm.includes("setSpousePersonId(linkedSpouse?.id"), "changing the person revalidates the spouse");
assert.ok(sendForm.includes("answers as {role}"), "names and roles are shown before the link is created");

/* ---- USA-279: no em dashes in this flow's user-facing copy -------------- */

for (const [name, source] of [
  ["AssessmentUi", assessmentUi],
  ["marriage assessment client", marriageClient],
  ["recipient form", recipientForm],
  ["recipient page", recipientPage],
  ["resource sharing library", read("src/lib/dos/resource-sharing.ts")],
  ["share server library", shareLib],
]) {
  assert.ok(!source.includes("\u2014"), `${name} must not use em dashes in user-facing copy`);
}

assert.ok(!sendForm.includes("\u2014"), "the send form must not use em dashes");
assert.ok(!preview.includes("\u2014"), "the preview must not use em dashes");

/* ---- Existing work is preserved ----------------------------------------- */

assert.ok(marriageClient.includes("/api/dos/app/assessment-results"), "the in-app save path is untouched");
assert.ok(marriageClient.includes("Standalone result. Not saved to a profile."));
assert.ok(marriageClient.includes("Preview only. Answers are not saved."));

const loader = read("src/lib/dos/missionary-app.ts");
assert.ok(loader.includes("loadResourceShareAssignmentsForWorkspace"));
assert.ok(
  loader.includes("isMissingWorkflowTable(result.error, \"dos_resource_share_assignments\")"),
  "the loader tolerates the table not being installed yet",
);
assert.ok(loader.includes("loadResourceAssignmentsForWorkspace"), "Journey assignments still load");

/* ---- USA-280: My Record reaches the account holder's own record ---------- */

const identity = read("src/lib/dos/identity.ts");
const linkLoaderStart = identity.indexOf("async function loadVerifiedIdentityLink");
const linkLoaderBody = identity.slice(linkLoaderStart, identity.indexOf("async function loadCandidatePeople"));

assert.ok(
  !/authorization\.access !== "member"/.test(linkLoaderBody),
  "an admin must be able to READ a link this workspace already verified, or My Record has no person",
);
assert.ok(
  linkLoaderBody.includes('.eq("verification_status", "verified")'),
  "only a verified link is ever read",
);
assert.ok(
  identity.indexOf("const existingLinkResult = await loadVerifiedIdentityLink")
    < identity.indexOf('return { message: "DOS admins do not need a workspace person identity link."'),
  "the verified link is read BEFORE the admin guard, and the guard still blocks inferring or creating one",
);
assert.ok(
  /isAdminDosAuthorization\(authorization\)[\s\S]{0,120}DOS admins do not need a workspace person identity link/.test(identity),
  "admins are still refused an inferred or newly created identity link",
);

assert.ok(
  !/displayName: viewer\?\.email/.test(loader),
  "My Record must not fall back to the sign-in address for a person's name",
);
assert.ok(
  loader.includes("function myRecordDisplayName"),
  "an email-shaped stored display name is rejected rather than shown as a name",
);

const myRecordRoute = read("app/api/dos/app/my-record/route.ts");
assert.ok(
  !/display_name: displayName \|\| auth/.test(myRecordRoute),
  "the API must not write the sign-in address into display_name",
);

/* ---- USA-280: the report on paper --------------------------------------- */

const reportSource = read("src/components/dos/assessments/AssessmentReport.tsx");

/* USA-282: the same guarantee, by a rule that does not also defeat the
   report's own colours. The first version inherited the page colour from a
   class selector, which outranked every text class in the report and painted
   it pale grey on white. */
assert.ok(
  reportSource.includes(":where(.assessment-report) :where(p, li, dd) { color: #1E3A5F; }"),
  "the site's pale-grey <p> default must not win inside the report",
);
assert.ok(
  !reportSource.includes(".assessment-report :where(p, li, dd) { color: inherit; }"),
  "and the report must not inherit the page colour, which is the pale grey it is escaping",
);
assert.ok(
  reportSource.includes("body:has(> .assessment-report-sheet) > *:not(.assessment-report-sheet) { display: none !important; }"),
  "printing the report must not print the app behind it",
);
assert.ok(
  /\.assessment-report-sheet \{[^}]*position: static !important;/.test(reportSource),
  "a fixed sheet cannot paginate, so it becomes an ordinary document on paper",
);

const appClient = read("app/dos/app/DosMvpAppClient.tsx");

assert.ok(
  appClient.includes('className="assessment-report-sheet fixed inset-0 z-dos-sheet'),
  "the DOS report sheet carries the class its print rules target",
);
assert.ok(
  /const report = \(\s*<div className="assessment-report-sheet[\s\S]{0,4000}return isMounted \? createPortal\(report, document\.body\) : null;/.test(appClient),
  "the report portals to the body, so z-dos-sheet outranks the quick-action button",
);
/* USA-281: a reassessment still never reuses a finished link, but the way to
   start one is Resources > + Add, which is the single place a resource is
   chosen. A completed row therefore offers its result and nothing else. */
assert.ok(
  !appClient.includes("Send another"),
  "a completed row does not carry its own second send action",
);
/* USA-281 follow-up: the row is drawn once now, so the check reads the shared
   component rather than one panel's copy of it.

   USA-280 Person record actions moved View results off a button beside the
   row's menu and into the menu itself, because the row was offering it twice.
   Same guarantee, read where it now lives, and asserted to appear once. */
assert.ok(
  /share\.status === "completed" && result\s*\?\s*\[\{ label: "View results", onSelect: \(\) => onOpenShareResult\(result\.id\) \}\]/.test(appClient),
  "a completed row offers View results",
);
const assessmentRowSource = appClient.slice(
  appClient.indexOf("function ResourceAssessmentRow"),
  appClient.indexOf("function ResourceShareLinkActions"),
);
/* Counted as the menu entries they are, so the prose around them does not
   decide whether this passes. */
assert.ok(
  (assessmentRowSource.match(/label: "View results"/g) ?? []).length === 1
  && (assessmentRowSource.match(/label: "Copy link"/g) ?? []).length === 1,
  "the row lists each of its actions once, not as a button and a menu item",
);
assert.ok(
  !assessmentRowSource.includes("<PDButton"),
  "the assessment row carries no button competing with its own menu",
);

const dosLayout = read("app/dos/app/layout.tsx");
assert.ok(
  dosLayout.includes(".dos-app-route :where(p, li, dd)"),
  "DOS paragraphs inherit their container's colour instead of the dark site's grey",
);

/* ---- USA-281: the picker, and removal ----------------------------------- */

assert.ok(
  appClient.includes("function ResourceAddSheet"),
  "+ Add opens a picker rather than assuming one resource",
);
assert.ok(
  !/function openSendResourceForPerson\([^)]*\) \{\s*const marriageAssessment/.test(appClient),
  "+ Add no longer hardcodes the Marriage Assessment",
);
assert.ok(
  appClient.includes("setAddResourcePersonId(personId)"),
  "the person + Add was pressed for is kept through the picker",
);
assert.ok(
  appClient.includes("isDosResourceShareEnabled(resource)") && appClient.includes("dosAssignableResourceItems"),
  "the picker offers only resources with a working share or assignment flow",
);
assert.ok(
  /onSend=\{\(resource\) => \{[\s\S]{0,240}openSendResource\(resource, personId\)/.test(appClient)
  && /onAssign=\{\(resource\) => \{[\s\S]{0,260}openResourceAssignmentCreate\(resource, personId/.test(appClient),
  "each choice routes to that resource's own setup, carrying the person",
);

const removalMigration = read("supabase/migrations/20260918120000_usa_281_resource_assignment_removal.sql");

assert.ok(
  removalMigration.includes("add column if not exists removed_at timestamptz"),
  "removal is a soft delete, so progress and reflections survive it",
);
assert.ok(
  !/delete\s+from\s+public\.dos_resource_assignments/i.test(removalMigration),
  "the removal migration never deletes an assignment row",
);
assert.ok(
  loader.includes('.is("removed_at", null)'),
  "a removed assignment is filtered out where assignments are read, so it stays gone after a refresh",
);
assert.ok(
  loader.includes("isMissingColumnError(result.error)"),
  "reads still work before the removal migration is applied",
);

const assignmentsRoute = read("app/api/dos/app/resource-assignments/route.ts");

assert.ok(
  assignmentsRoute.includes('action === "remove" || action === "restore"'),
  "removal and restore are explicit actions on the assignment route",
);
assert.ok(
  /removal[\s\S]{0,400}\.eq\("workspace_id", workspaceResult\.workspaceId\)/.test(assignmentsRoute),
  "removal is scoped to the workspace the caller is authorized for",
);
/* USA-281 follow-up: the confirmation is the app's own dialog. The browser
   prompt could not be styled, could not carry more than one line, and offered
   OK rather than Remove. */
assert.ok(
  /setPendingRemoval\(\{[\s\S]{0,600}title: "Remove this from the record\?"/.test(appClient),
  "removal is confirmed rather than immediate",
);
assert.ok(
  !/window\.confirm\([\s\S]{0,40}Remove/.test(appClient),
  "removal never falls back to the browser prompt",
);
assert.ok(
  appClient.includes("const identity = resourceAssignmentIdentityLabel(assignment, groups)"),
  "the confirmation identifies the assignment by group and start date, because a person can hold one resource twice",
);
assert.ok(
  appClient.includes("Everyone else assigned it in the group keeps theirs."),
  "a shared assignment says what removal does to the other participants",
);
assert.ok(
  appClient.includes("Progress already recorded is kept and is not deleted."),
  "removal discloses that recorded progress survives",
);
assert.ok(
  appClient.includes('{ danger: true, label: "Remove"'),
  "Remove is reachable from the row menu in My Record and on a Person",
);

/* ---- USA-281 follow-up: a SENT ASSESSMENT can be removed too ------------
   The deployed Remove menu reached Journey assignments and stopped there. A
   sent assessment is a different table, a different lifecycle, a public link
   and two records, so each of those is checked here rather than assumed to be
   covered by the Journey path. */

assert.ok(
  shareLib.includes("export async function removeDosResourceShareAssignment"),
  "removing a sent assessment is its own operation, not revocation renamed",
);
assert.ok(
  /hadLiveLink[\s\S]{0,200}update\.revoked_at = now;[\s\S]{0,80}update\.status = "revoked";/.test(shareLib),
  "removing an unfinished assessment revokes its public link in the same write",
);
assert.ok(
  !/removeDosResourceShareAssignment[\s\S]{0,2400}\.delete\(\)/.test(shareLib),
  "removal never deletes the row, so responses and the result survive",
);
assert.ok(
  !/removeDosResourceShareAssignment[\s\S]{0,2400}responses:/.test(shareLib),
  "removal never rewrites the answers",
);
assert.ok(
  /const wasCompleted = row\.status === "completed"/.test(shareLib)
  && !/update\.status = "revoked";[\s\S]{0,120}wasCompleted/.test(shareLib),
  "a completed assessment keeps its completed status, because the table's own check constraints forbid marking it revoked",
);
assert.ok(
  /if \(row\.public_access_revoked_at \|\| row\.removed_at\) \{\s*return \{ status: "revoked" \};/.test(shareLib),
  "a removed result is not reachable through a link the couple already has",
);
assert.ok(
  /if \(row\.public_access_revoked_at \|\| row\.removed_at\) \{\s*return \{ error: "This link has been revoked\.", status: 410 as const \};/.test(shareLib),
  "a removed assessment cannot be opened, answered or submitted through its token",
);
assert.ok(
  shareLib.includes("export async function restoreDosResourceShareAssignment"),
  "removal is recoverable, which is what makes preserving the result meaningful",
);

/* Restore recovers the RECORD, not the URL. The two are different decisions
   and one must never silently perform the other. */
assert.ok(
  /Removal always withdraws the link[\s\S]{0,240}public_access_revoked_at: now,/.test(shareLib),
  "removal always withdraws public access, in both shapes",
);
const restoreBody = shareLib.slice(
  shareLib.indexOf("export async function restoreDosResourceShareAssignment"),
  shareLib.indexOf("export async function enableDosResourceSharePublicAccess"),
);
assert.ok(
  restoreBody.includes('.update({ removed_at: null, removed_by_user_id: null })'),
  "restore clears the removal and nothing else",
);
assert.ok(
  !/public_access_revoked_at: null/.test(restoreBody),
  "restore never reopens the public link",
);
assert.ok(
  shareLib.includes("export async function enableDosResourceSharePublicAccess"),
  "re-enabling sharing is its own explicit action",
);
const enableBody = shareLib.slice(
  shareLib.indexOf("export async function enableDosResourceSharePublicAccess"),
  shareLib.indexOf("/* Linking a spouse's contact record"),
);
for (const [guard, why] of [
  ['row.removed_at', "a still-removed assessment cannot be shared again"],
  ['row.status === "revoked"', "an independently revoked link is never silently overridden"],
  ['row.status === "expired" || isExpired(row)', "an expired link is never silently extended"],
]) {
  assert.ok(enableBody.includes(guard), `enable_sharing refuses when ${why}`);
}
assert.ok(
  enableBody.includes('.update({ public_access_revoked_at: null })'),
  "enable_sharing is the only thing that clears the public-access flag",
);
assert.ok(
  (shareLib.match(/public_access_revoked_at: null/g) ?? []).length === 1,
  "nothing else anywhere clears it",
);
assert.ok(
  /if \(row\.public_access_revoked_at \|\| row\.removed_at\)/.test(shareLib)
  && (shareLib.match(/if \(row\.public_access_revoked_at \|\| row\.removed_at\)/g) ?? []).length === 2,
  "both token readers refuse a withdrawn link, so a restored record stays unreachable through the old URL",
);
assert.ok(
  shareRoute.includes('action === "enable_sharing"'),
  "the route exposes re-enabling as its own action",
);
assert.ok(
  shareRoute.includes("publicAccessRestored: false"),
  "restore says plainly that it did not reopen the link",
);

const shareMigration = read("supabase/migrations/20260919120000_usa_281_share_assignment_removal.sql");
assert.ok(
  shareMigration.includes("add column if not exists public_access_revoked_at timestamptz"),
  "the migration adds the public-access column",
);
assert.ok(
  !/drop\s+table|delete\s+from/i.test(shareMigration),
  "the migration never deletes anything",
);

assert.ok(
  /action === "remove"/.test(shareRoute) && /action === "restore"/.test(shareRoute),
  "remove and restore are explicit actions on the share route",
);
assert.ok(
  /requireDosWorkspaceRouteAccess[\s\S]{0,1500}action === "remove"/.test(shareRoute),
  "removal only runs after workspace access is proved",
);
assert.ok(
  /\.eq\("workspace_id", workspaceId\)/.test(shareLib),
  "an assessment id from another workspace is a 404 rather than a removal",
);

const shareLoader = loader.slice(
  loader.indexOf("async function loadResourceShareAssignmentsForWorkspace("),
  loader.indexOf("async function loadExternalCalendarEventsForWorkspace("),
);

assert.ok(
  shareLoader.includes("isMissingColumnError(result.error)"),
  "reads still work before the share removal migration is applied",
);
assert.ok(
  loader.includes("const removedShareResultIds = new Set(")
  && loader.includes("!removedShareResultIds.has(result.id)"),
  "the result a removed completed assessment owns stops showing on the record too, rather than reappearing under its own name",
);
assert.ok(
  loader.includes("resourceShareAssignmentRows.filter((assignment) => !assignment.removed_at)"),
  "a removed assessment is filtered out where assessments are read, so it stays gone after a refresh",
);

assert.ok(
  appClient.includes("function resourceShareIdentityLabel"),
  "the confirmation identifies the assessment by participants, status and date",
);
assert.ok(
  /shareParticipantSummary\(assignment\.participants\)[\s\S]{0,120}dosResourceShareStatusLabel\(assignment\.status\)[\s\S]{0,120}dosResourceShareDateLine\(assignment\)/.test(appClient),
  "all three identifying facts are in that label, because a couple can hold more than one assessment",
);
assert.ok(
  appClient.includes("This is a shared assessment, so it comes off both participants' records."),
  "removing a couple assessment says that it affects both records",
);
assert.ok(
  appClient.includes("The scores and every answer are kept and can be restored."),
  "removing a completed assessment discloses that the results survive",
);
assert.ok(
  appClient.includes('title: isCompleted ? "Remove these completed results?" : "Remove this assessment?"'),
  "a completed assessment asks its own explicit question rather than the generic one",
);
assert.ok(
  appClient.includes('confirmLabel: isCompleted ? "Remove results" : "Remove"'),
  "the confirm button says what it will remove",
);
assert.ok(
  appClient.includes("It will be its own record and will not overwrite these answers."),
  "the confirmation states that a new assessment can follow without overwriting",
);
/* The row is shared now, so Remove is checked once, in the component, and
   both panels are checked for passing the handler into it. */
const assessmentRow = appClient.slice(
  appClient.indexOf("function ResourceAssessmentRow("),
  appClient.indexOf("/* Copy link and, where the browser offers it"),
);
assert.ok(
  assessmentRow.includes('{ danger: true, label: "Remove", onSelect: () => onRemove(share) }'),
  "Remove is reachable from the assessment row menu",
);
assert.ok(
  assessmentRow.includes('label: "Copy link", onSelect: copyLink') && assessmentRow.includes('label: "View results"'),
  "the same menu also carries Copy link and View results, so the row's actions are all in one place",
);
assert.ok(
  (appClient.match(/onRemoveResourceShare=\{removeResourceShare\}/g) ?? []).length === 2,
  "both People and My Record get the control, not one of them",
);
assert.ok(
  (appClient.match(/onRemove=\{onRemoveResourceShare\}/g) ?? []).length === 2,
  "both panels pass the handler into the shared row",
);

const surfaces = read("src/components/dos/overlays/DosSurfaces.tsx");

assert.ok(
  surfaces.includes("export function DosConfirmDialog("),
  "the confirmation is a styled in-app dialog",
);
assert.ok(
  /DiscardChangesDialog[\s\S]{0,400}<DosConfirmDialog/.test(surfaces),
  "there is one confirmation implementation rather than a parallel copy",
);
assert.ok(
  /confirmLabel=\{pendingRemoval\.confirmLabel\}/.test(appClient) && /cancelLabel="Cancel"/.test(appClient),
  "the dialog offers Cancel and a named Remove, not the browser's OK",
);

const rowMenu = appClient.slice(
  appClient.indexOf("function RowActionMenu("),
  appClient.indexOf("/* USA-281: several assignments can exist"),
);

/* USA-280 Person record actions put the close behind a helper, because the
   menu now also returns focus to its trigger on Escape. The guarantee is the
   same one and is still read from the order of the two calls. */
assert.ok(
  /onClick=\{\(\) => \{\s*close\(\);\s*item\.onSelect\?\.\(\);/.test(rowMenu),
  "the action menu closes before the confirmation opens, so the two are never stacked",
);
assert.ok(
  /const close = \(returnFocus = false\) => \{\s*setIsOpen\(false\);/.test(rowMenu),
  "closing the menu is what that helper does",
);
assert.ok(
  rowMenu.includes('event.key === "Escape"') && rowMenu.includes("triggerRef.current?.focus()"),
  "USA-280: Escape closes the menu and puts focus back on the control that opened it",
);

/* ---- USA-281: grouped assignments stay individually addressable --------- */

assert.ok(
  appClient.includes("function resourceAssignmentIdentityLabel"),
  "an assignment is named by where it came from and when it started, not by a count",
);
assert.ok(
  /group\.others\.map\(\(other\) =>/.test(appClient),
  "every other assignment of a resource is listed in its own right",
);
assert.ok(
  appClient.includes("onSelect: () => onRemoveResourceAssignment(other)"),
  "each grouped assignment can be removed on its own",
);
assert.ok(
  appClient.includes("label={`More actions for ${resourceAssignmentTitle(other)}, ${resourceAssignmentIdentityLabel(other, groups)}`}"),
  "removal names which assignment it acts on",
);

const indexMigration = read("supabase/migrations/20260918140000_usa_281_active_assignment_index.sql");

assert.ok(
  indexMigration.includes("and removed_at is null"),
  "a removed assignment stops reserving its unique slot",
);
assert.ok(
  indexMigration.includes("assignment_context") && indexMigration.includes("coalesce(source_group_id"),
  "the index keeps production's context and group terms, so one study can run in two groups",
);
assert.ok(
  indexMigration.includes("raise exception"),
  "the migration proves no existing row conflicts before it creates the index",
);
assert.ok(
  !/\bdelete\s+from\b/i.test(indexMigration) && !/\bdrop\s+table\b/i.test(indexMigration),
  "the index migration touches no data",
);

/* ---- USA-281: the index migration is transactional and narrowly scoped ---- */

assert.ok(
  /^begin;$/m.test(indexMigration) && /^commit;$/m.test(indexMigration),
  "the index migration runs as one transaction, so a failure cannot leave the table with no unique index",
);
/* The word appears in the migration's own comment explaining why it is not
   used, so this looks for an actual statement rather than the word. */
const indexMigrationStatements = indexMigration
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n");

assert.ok(
  !/create\s+(unique\s+)?index\s+concurrently/i.test(indexMigrationStatements),
  "CREATE INDEX CONCURRENTLY cannot run in a transaction, so it is not used here",
);
assert.ok(
  indexMigration.includes("assignment_context") && indexMigration.includes("coalesce(source_group_id"),
  "the rebuilt index keeps production's columns exactly",
);

const indexRollback = read("supabase/migrations/20260918140000_usa_281_active_assignment_index_rollback.sql");

assert.ok(
  /^begin;$/m.test(indexRollback) && /^commit;$/m.test(indexRollback),
  "the rollback is transactional too",
);
assert.ok(
  indexRollback.includes("raise exception"),
  "the rollback reports conflicting slots and refuses rather than guessing",
);
assert.ok(
  !/\bdelete\s+from\b/i.test(indexRollback) && !/\bdrop\s+table\b/i.test(indexRollback),
  "the rollback never deletes an assignment or its history to make the index build",
);
assert.ok(
  indexRollback.includes("do NOT clear its notes"),
  "the rollback says plainly that history must not be destroyed to resolve a conflict",
);
const indexRollbackStatements = indexRollback
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n");

assert.ok(
  !indexRollbackStatements.includes("dos_resource_assignments_active_unique"),
  "the rollback does not resurrect the stale repository index",
);

const correction = read("docs/dos-ui-refresh/phase-8/usa-281-assignment-model-correction.md");

assert.ok(
  correction.includes("They are not duplicates"),
  "the earlier description of these assignments as duplicates is corrected in writing",
);

assert.ok(
  appClient.includes("resourceAssignmentIdentityLabel(assignment, groups),"),
  "every assignment shows its group and start date, not only the grouped ones",
);

console.log("DOS resource sharing (USA-278 / USA-279 / USA-280) regression passed.");
