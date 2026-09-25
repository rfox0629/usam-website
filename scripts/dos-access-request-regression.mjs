/* USA-289: DOS onboarding — /dos/setup access request, Operations review,
 * approval provisioning, welcome email, and the Sign out fix.
 *
 * https://linear.app/usa-missionaries/issue/USA-289
 *
 * Three halves. The request rules, run for real: validation per step,
 * normalization of untrusted input, and the submission key. Then the contract
 * over the code: submission never grants access, missionary applications are
 * not collected here, decisions are authorized and compare-and-set, the
 * welcome email waits for verified access and never carries a password or
 * token, and every attempt is recorded. Then Sign out: no GET link to a
 * POST-only route, and the handler ends the Supabase session.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  emptyDosAccessRequestAnswers,
  firstInvalidStep,
  isValidSubmissionKey,
  normalizeDosAccessRequestAnswers,
  validateDosAccessRequest,
  validateDosAccessRequestStep,
} from "../src/lib/dos/access-request-model.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
let passed = 0;
const check = (condition, message) => {
  assert.ok(condition, message);
  passed += 1;
  console.log(`  ok  ${message}`);
};

console.log("USA-289 DOS access request regression\n");
console.log("Rules");

const complete = normalizeDosAccessRequestAnswers({
  acknowledgement: true,
  email: "  Person@Example.org ",
  firstName: "Pat",
  individualRole: "Disciple-maker",
  lastName: "Lee",
  primaryUses: ["Prayer and follow-up", "not an option", "Prayer and follow-up"],
  requestType: "individual",
  sneaky: "<script>",
});

check(complete.email === "person@example.org", "email is trimmed and lowercased");
check(complete.primaryUses.length === 1, "unknown and duplicate uses are dropped");
check(!("sneaky" in complete), "unknown fields are dropped");
check(Object.keys(validateDosAccessRequest(complete)).length === 0, "a complete individual request validates");
check(firstInvalidStep(emptyDosAccessRequestAnswers) === "path", "an empty draft starts at the path step");
check(Boolean(validateDosAccessRequestStep("contact", { ...complete, email: "not-an-email" }).email), "an invalid email is rejected");
check(Boolean(validateDosAccessRequestStep("review", { ...complete, acknowledgement: false }).acknowledgement), "the review acknowledgement is required");

const organization = normalizeDosAccessRequestAnswers({ ...complete, requestType: "organization" });
const orgErrors = validateDosAccessRequestStep("details", organization);
check(Boolean(orgErrors.organizationName && orgErrors.organizationType && orgErrors.organizationRole && orgErrors.expectedUsers), "an organization request needs name, type, role, and size");
check(normalizeDosAccessRequestAnswers({ requestType: "usam" }).requestType === "", "the missionary path is not a DOS access request type");
check(isValidSubmissionKey("3f2b8c1e-8c6f-4a36-9d2e-4a1b2c3d4e5f") && !isValidSubmissionKey("x") && !isValidSubmissionKey("a b c d e f g h i j k l"), "submission keys are validated");

console.log("\nForm (/dos/setup)");
const setupClient = read("app/dos/setup/DosOnboardingClient.tsx");
const setupPage = read("app/dos/setup/page.tsx");

check(setupPage.includes("dosAppMetadata") && setupPage.includes("DosOnboardingClient"), "/dos/setup keeps DOS identity");
check(setupClient.includes('fetch("/api/dos/access-requests"'), "the form submits to the DOS access request endpoint");
check(!setupClient.includes("/api/join/submit") && !setupClient.includes("/api/join/photos"), "the form no longer collects or submits missionary applications");
check(!/type=\{?["']password["']/.test(setupClient) && !setupClient.includes("confirmPassword"), "the form asks for no password");
check(setupClient.includes("invitation-only application") && (setupClient.match(/href="\/join"/g) ?? []).length === 1, "missionary applicants are told to use their invitation; /join is linked only from the unfinished-application notice");
check(!/<Link[^>]*className="ident"/.test(setupClient) && !setupClient.includes("Start a new request"), "the logo and confirmation do not link away from the flow");
check(!setupClient.includes("/dos/ryan-fox"), "no hard-coded workspace link after submitting");
check(setupClient.includes("dos-unified-setup-draft-v1") && !/removeKey\(legacy/.test(setupClient), "legacy drafts are read and never deleted");
check(setupClient.includes("submittingRef") && setupClient.includes("submissionKey"), "double submission is guarded in the browser and by a submission key");
check(setupClient.includes("Awaiting review") && setupClient.includes("No account has been created yet"), "the confirmation says the request awaits review");

console.log("\nServer contract");
const route = read("app/api/dos/access-requests/route.ts");
const store = read("src/lib/dos/access-requests.ts");
const migration = read("supabase/migrations/20260925174009_usa_289_dos_access_requests.sql");
const createBody = store.slice(store.indexOf("export async function createDosAccessRequest"), store.indexOf("async function createFallbackFormSubmission"));

check(route.includes("isValidSubmissionKey") && route.includes("website"), "the endpoint validates the submission key and has a honeypot");
check(!/auth\.admin|missionary_households|collective_memberships|profiles/.test(createBody), "submission creates no account, workspace, or membership");
check(createBody.includes('status: "submitted"'), "submissions are stored with status submitted");
check(/submission_key text not null unique/.test(migration), "the submission key is unique in the database");
check(/one_open_per_email_idx[\s\S]*where status = 'submitted'/.test(migration), "one open request per email is enforced in the database");
check(/enable row level security/.test(migration) && /revoke all on public\.dos_access_requests from anon, authenticated/.test(migration), "the tables are RLS-enabled and service-role only");
check(/access_requires_approval_check/.test(migration) && /welcome_requires_access_check/.test(migration), "the database refuses access before approval and email before access");
check(read("supabase/migrations/20260925174009_usa_289_dos_access_requests_rollback.sql").includes("drop table if exists public.dos_access_requests"), "a rollback migration exists");

console.log("\nReview and approval");
const actions = read("app/operations/submissions/dos-access/[id]/actions.ts");
const decline = store.slice(store.indexOf("export async function declineDosAccessRequest"), store.indexOf("export async function approveDosAccessRequest"));
const approve = store.slice(store.indexOf("export async function approveDosAccessRequest"), store.indexOf("export async function completeDosAccessApproval"));
const provision = store.slice(store.indexOf("async function provisionDosAccess"), store.indexOf("/* -------------------------------------------------------------------- email */"));
const sendWelcome = store.slice(store.indexOf("async function sendDosWelcomeEmail"));

check((actions.match(/getOperationsAuthorization\(\)/g) ?? []).length >= 5, "every Operations action re-reads authorization on the server");
check(decline.includes("canDecideDosAccessRequests") && approve.includes("canDecideDosAccessRequests"), "approve and decline require a deciding role");
check(decline.includes('.eq("status", "submitted")') && approve.includes('.eq("status", "submitted")'), "decisions are compare-and-set from submitted");
check(decline.includes("decided_by_email") && decline.includes("decided_at") && approve.includes("decided_by_user_id"), "the reviewer and decision time are recorded");
check(!decline.includes("provision") && !decline.includes("sendResendEmail"), "declining grants nothing and sends nothing");
check(approve.includes('current.status === "declined"'), "a declined request cannot be approved");
check(provision.includes('access_status: "provisioning"') && provision.includes('.lt("access_started_at", staleBefore)'), "provisioning takes a lock that expires");
check(!/\.update\([^)]*\)[\s\S]{0,200}\.or\(/.test(store), "no update uses an or= filter (PostgREST re-applies it to the returned rows)");
check(provision.includes("findExistingAccessibleWorkspace") && provision.includes("linkedExistingWorkspace"), "an individual's existing workspace is linked, not duplicated");
check(provision.includes("getDosWorkspaceAccess") && provision.indexOf("getDosWorkspaceAccess") < provision.indexOf('access_status: "ready"'), "access is marked ready only after the app's own resolver allows it");
check(store.includes("ownerPersonId") && store.includes("Default DOS user person for workspace ownership"), "a created workspace gets one owner People record, so first open does not create two");
check(store.includes("isAlreadyRegisteredError") && !/password:/.test(store.slice(store.indexOf("async function ensureAuthUser"), store.indexOf("async function ensureOrganization"))), "an existing account is reused and no password is set");
check(sendWelcome.includes('row.access_status !== "ready"') && sendWelcome.includes("attemptTable") && sendWelcome.includes("idempotencyKey"), "the welcome email requires ready access and records every attempt");
check(sendWelcome.includes('.eq("welcome_email_status", "sending")') && sendWelcome.includes("already being sent"), "a welcome email send is claimed so it cannot go out twice at once");

console.log("\nWelcome email");
const email = read("src/lib/dos/access-request-email.ts");
check(email.includes("Add to Home Screen") && email.includes("Install app") && email.includes("Add to Home screen"), "the email has iPhone and Android home screen steps");
check(email.includes("dosWalkthroughVideoUrl") && email.includes("A short walkthrough video is on the way"), "the video link appears only when configured");
check(!/access_token|token_hash|magiclink|generateLink/i.test(email), "the email carries no sign-in token");
check(email.includes("dosSupportEmail"), "the email names a support contact");

console.log("\nSign out");
const logout = read("app/api/access/logout/route.ts");
const dosApp = read("app/dos/app/DosMvpAppClient.tsx");
check(/export async function GET/.test(logout) && /export async function POST/.test(logout), "logout answers GET and POST (no more 405)");
check(logout.includes("auth.signOut"), "logout ends the Supabase session DOS uses");
check(logout.includes("isPrefetchOrDataRequest"), "a prefetch never signs anyone out");
check(!dosApp.includes('href="/api/access/logout"'), "DOS Sign out is no longer a GET link");
check((dosApp.match(/action="\/api\/access\/logout" method="post"|formAction="\/api\/access\/logout"/g) ?? []).length >= 2, "both DOS Sign out controls POST a form");

console.log("\nEntry points");
check(read("app/domain-sites/discipleship-operating-system/DosLandingPage.tsx").includes("/dos/setup"), "the public DOS page's Get Started opens /dos/setup");
check(read("app/dos/DosPortalClient.tsx").includes('href="/dos/setup"'), "the /dos Get Started opens /dos/setup");

console.log(`\n${passed} checks passed. dos-access-request regression passed.`);
