#!/usr/bin/env node
// Operations Communications V1 safety contract.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const read = (...parts) => readFileSync(path.join(root, ...parts), "utf8");
const results = [];
const check = (name, fn) => {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error: error.message });
  }
};

const { newsletterFromEmail, isPhase1NewsletterRecipient, TEST_SEND_RECIPIENT } = await import(
  pathToFileURL(path.join(root, "src/lib/communications/config.ts")).href
);

check("no second Resend system is introduced", () => {
  const resend = read("src", "lib", "communications", "resend.ts");
  assert.match(resend, /api\.resend\.com\/emails/);
  // Exactly one newsletter send path in the communications lib.
  const files = ["src/lib/operations/communications.ts", "app/operations/communications/newsletters/[id]/actions.ts"];
  for (const file of files) {
    assert.doesNotMatch(read(...file.split("/")), /api\.resend\.com/, `${file} must not call Resend directly`);
  }
});

check("the sandbox sender can never be used", () => {
  const previous = process.env.JOIN_EMAIL_FROM;
  process.env.JOIN_EMAIL_FROM = "USA Missionaries <onboarding@resend.dev>";
  assert.equal(newsletterFromEmail(), null, "onboarding@resend.dev must resolve to null");
  delete process.env.JOIN_EMAIL_FROM;
  delete process.env.NEWSLETTER_EMAIL_FROM;
  delete process.env.RESEND_NEWSLETTER_FROM;
  assert.equal(newsletterFromEmail(), null, "an unset sender must resolve to null, not a fallback");
  if (previous) process.env.JOIN_EMAIL_FROM = previous;
});

check("a verified sender is returned when configured", () => {
  process.env.NEWSLETTER_EMAIL_FROM = "Ryan & Brooke | USA Missionaries <updates@usamissionaries.org>";
  assert.match(newsletterFromEmail(), /updates@usamissionaries\.org/);
  delete process.env.NEWSLETTER_EMAIL_FROM;
});

check("test sends are hard-coded to Ryan only", () => {
  assert.equal(TEST_SEND_RECIPIENT, "ryan@usamissionaries.org");
  const actions = read("app", "operations", "communications", "newsletters", "[id]", "actions.ts");
  assert.match(actions, /to: TEST_SEND_RECIPIENT/);
  // The test path must never read the audience.
  const testFn = actions.slice(actions.indexOf("export async function sendNewsletterTestAction"), actions.indexOf("export async function markNewsletterReadyAction"));
  assert.doesNotMatch(testFn, /loadAudienceContacts|eligibleSubscriberStatuses/);
  assert.match(testFn, /send_type: "test"/);
  assert.ok(isPhase1NewsletterRecipient("ryan@usamissionaries.org"));
  assert.equal(isPhase1NewsletterRecipient("donor@example.org"), false);
});

check("production send re-checks readiness server-side", () => {
  const actions = read("app", "operations", "communications", "newsletters", "[id]", "actions.ts");
  const sendFn = actions.slice(actions.indexOf("export async function sendNewsletterToAudienceAction"));
  assert.match(sendFn, /evaluateSendReadiness/);
  assert.match(sendFn, /readiness\.canSend/);
  assert.match(sendFn, /!== "SEND"/, "an explicit typed confirmation is required");
  assert.match(sendFn, /requireManager|authorization/);
});

check("nothing sends on deploy, import, or page load", () => {
  const actions = read("app", "operations", "communications", "newsletters", "[id]", "actions.ts");
  assert.match(actions, /^"use server";/);
  // Every send is inside an exported action, never at module scope.
  const moduleScope = actions.split("export async function")[0];
  assert.doesNotMatch(moduleScope, /sendNewsletterEmail\(/);
  const page = read("app", "operations", "communications", "newsletters", "[id]", "page.tsx");
  assert.doesNotMatch(page, /sendNewsletterEmail\(/, "the page must not send while rendering");
});

check("only subscribed contacts are ever eligible", () => {
  const lib = read("src", "lib", "operations", "communications.ts");
  assert.match(lib, /eligibleSubscriberStatuses = \["subscribed"\]/);
  assert.match(lib, /suppressedSubscriberStatuses = \["bounced", "complained"\]/);
  // Eligible count excludes pending, unsubscribed and suppressed.
  assert.match(lib, /eligible: rows\.filter\(\(row\) => row\.status === "subscribed"\)\.length/);
});

check("readiness blocks every unsafe send condition", async () => {
  const lib = read("src", "lib", "operations", "communications.ts");
  const fn = lib.slice(lib.indexOf("export function evaluateSendReadiness"));
  for (const guard of [
    /not approved for send/i,
    /No recorded approver/i,
    /No test send/i,
    /already been sent/i,
    /No eligible subscribers/i,
    /No verified sending address/i,
    /cannot send communications/i,
  ]) {
    assert.match(fn, guard, `missing guard ${guard}`);
  }
});

check("approval requires a completed test send and a named approver", () => {
  const actions = read("app", "operations", "communications", "newsletters", "[id]", "actions.ts");
  const approve = actions.slice(actions.indexOf("export async function approveNewsletterAction"), actions.indexOf("export async function sendNewsletterToAudienceAction"));
  assert.match(approve, /lastTestSentAt/);
  assert.match(approve, /approved_by_email: authorization\.email/);
  const sql = read("supabase", "migrations", "20260903220000_operations_communications_newsletter_workflow.sql");
  assert.match(sql, /communication_newsletters_approval_check/);
  assert.match(sql, /approved_at is not null and approved_by_email is not null/);
});

check("the database phase-1 recipient guard is left in place", () => {
  const sql = read("supabase", "migrations", "20260903220000_operations_communications_newsletter_workflow.sql");
  assert.doesNotMatch(sql, /drop constraint if exists communication_sends_phase1_recipient_check/);
  assert.match(sql, /phase-1 recipient CHECK/i);
});

check("no duplicate communication tables are created", () => {
  const sql = read("supabase", "migrations", "20260903220000_operations_communications_newsletter_workflow.sql");
  assert.doesNotMatch(sql, /create table/i, "the existing USA-47 tables are reused, not recreated");
});

check("the preview renders the same HTML the send uses", () => {
  const page = read("app", "operations", "communications", "newsletters", "[id]", "page.tsx");
  const actions = read("app", "operations", "communications", "newsletters", "[id]", "actions.ts");
  // Both go through src/lib/communications/render.ts, which picks the locked
  // editorial issue for September and the generic template for anything else.
  assert.match(page, /renderNewsletter\(/);
  assert.match(actions, /renderNewsletter\(/);
  // Preview is sandboxed so newsletter HTML cannot script the Operations page.
  assert.match(page, /sandbox=""/);
  for (const tab of [/desktop/, /mobile/, /Plain Text/]) {
    assert.match(page, tab);
  }
});

check("Communications is gated by the Operations permission model", () => {
  for (const file of [
    "app/operations/communications/page.tsx",
    "app/operations/communications/audience/page.tsx",
    "app/operations/communications/newsletters/page.tsx",
    "app/operations/communications/newsletters/[id]/page.tsx",
  ]) {
    const source = read(...file.split("/"));
    assert.match(source, /getOperationsAuthorization/);
    assert.match(source, /canAccessOperationsModule\(authorization, "communications"\)/);
  }
  const actions = read("app", "operations", "communications", "newsletters", "[id]", "actions.ts");
  assert.match(actions, /canManageOperationsModule\(authorization, "communications"\)/);
  // Read-only staff cannot manage.
  const auth = read("src", "lib", "operations", "auth.ts");
  assert.match(auth, /grant\("communications", false\)/);
});

check("Resend secrets stay server-side", () => {
  for (const file of ["src/lib/communications/resend.ts", "src/lib/operations/communications.ts"]) {
    assert.match(read(...file.split("/")), /^import "server-only";/m, `${file} must be server-only`);
  }
  const resend = read("src", "lib", "communications", "resend.ts");
  assert.doesNotMatch(resend, /NEXT_PUBLIC_/);
  assert.doesNotMatch(resend, /console\.(log|error|warn)/, "never log around the API key");
});

check("the audience importer protects unsubscribe state", () => {
  const script = read("scripts", "communications-audience-import.mjs");
  assert.match(script, /PROTECTED = new Set\(\["unsubscribed", "bounced", "complained"\]\)/);
  assert.match(script, /if \(PROTECTED\.has\(current\.status\)\)/);
  assert.match(script, /dryRun = !commit/, "dry run must be the default");
  assert.match(script, /source: "import"/);
  // No Mailchimp-specific logic in the permanent product. Check the code, not
  // the comment that explains why Mailchimp is out of scope.
  const code = script.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.doesNotMatch(code, /mailchimp/i);
});

const failed = results.filter((entry) => !entry.ok);
for (const entry of results) {
  console.log(`${entry.ok ? "PASS" : "FAIL"}  ${entry.name}${entry.ok ? "" : `\n      ${entry.error}`}`);
}
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length > 0) process.exit(1);
