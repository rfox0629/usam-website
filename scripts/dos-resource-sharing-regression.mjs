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
assert.ok(report.includes("the average of your two scores"), "the headline figure is labelled as an average");
assert.ok(/not a\s+measure of your marriage/.test(report), "the report refuses to read as a diagnosis");
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
/* USA-281: the sample is labelled as a sample and the way to read all of them
   is a link rather than a sentence. */
assert.ok(dosApp.includes("Sample questions"), "the five questions on the detail page are labelled a sample");
assert.ok(dosApp.includes("See all {total} questions"), "the detail page links to every question");
assert.ok(dosApp.includes("{sample.length} of {total}"), "the detail page says how much of the assessment the sample covers");
assert.ok(dosApp.includes("aria-label=\"Resources\""), "the Person Activity area has a Resources section");
assert.ok(dosApp.includes("label: \"Send resource\""), "Send resource is on the Person floating plus menu");
assert.ok(dosApp.includes("dosLinkedSpouseForPerson"), "the linked spouse comes from the household model");
assert.ok(dosApp.includes("Copy link"), "a resource row offers Copy link");
assert.ok(dosApp.includes("View results"), "a completed resource row opens the results");
assert.ok(dosApp.includes("sharedResultIds"), "one completion is one timeline entry, not two");

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

assert.ok(
  reportSource.includes(".assessment-report :where(p, li, dd) { color: inherit; }"),
  "the site's pale-grey <p> default must not win inside the report",
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
assert.ok(
  /share\.status === "completed" && shareResult \? \(\s*<PDButton onClick=\{\(\) => onOpenShareResult\(shareResult\.id\)\} tone="solid">View results<\/PDButton>/.test(appClient),
  "a completed row offers View results",
);

const dosLayout = read("app/dos/app/layout.tsx");
assert.ok(
  dosLayout.includes(".dos-app-route :where(p, li, dd)"),
  "DOS paragraphs inherit their container's colour instead of the dark site's grey",
);

console.log("DOS resource sharing (USA-278 / USA-279 / USA-280) regression passed.");
