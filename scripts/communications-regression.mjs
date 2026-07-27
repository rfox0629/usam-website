import { readFileSync } from "node:fs";

const files = {
  adminPage: "app/admin/communications/page.tsx",
  envExample: ".env.example",
  migration: "supabase/migrations/20260722131015_communications_resend_subscribers.sql",
  newsletterLib: "src/lib/communications/newsletter.ts",
  preferencesActions: "app/preferences/actions.ts",
  resendWebhookLib: "src/lib/communications/resend-webhooks.ts",
  resendWebhookRoute: "app/api/webhooks/resend/route.ts",
};

function read(path) {
  return readFileSync(path, "utf8");
}

function assertIncludes(source, needle, message) {
  if (!source.includes(needle)) {
    throw new Error(message);
  }
}

function assertNotIncludes(source, needle, message) {
  if (source.includes(needle)) {
    throw new Error(message);
  }
}

function assertMatch(source, pattern, message) {
  if (!pattern.test(source)) {
    throw new Error(message);
  }
}

const migration = read(files.migration);
const newsletterLib = read(files.newsletterLib);
const webhookLib = read(files.resendWebhookLib);
const webhookRoute = read(files.resendWebhookRoute);
const adminPage = read(files.adminPage);
const preferencesActions = read(files.preferencesActions);
const envExample = read(files.envExample);

[
  "communication_subscribers",
  "communication_preferences",
  "communication_tokens",
  "communication_audit_events",
  "newsletters",
  "newsletter_publications",
  "newsletter_sends",
  "newsletter_delivery_events",
].forEach((tableName) => {
  assertIncludes(migration, `public.${tableName}`, `Migration must define ${tableName}.`);
  assertIncludes(migration, `alter table public.${tableName} enable row level security`, `${tableName} must enable RLS.`);
  assertIncludes(migration, `grant all on table public.${tableName} to service_role`, `${tableName} must grant service role access explicitly.`);
});

assertIncludes(migration, "newsletter_sends_phase1_allowed_recipient_check", "Send table must enforce Phase 1 recipient restriction.");
assertIncludes(migration, "newsletter_phase1_recipient_allowed", "Migration must define a reusable Phase 1 recipient guard.");
assertIncludes(migration, "ryan@usamissionaries.org", "Ryan seed subscriber must be present.");
assertIncludes(migration, "brooke.r.fox@gmail.com", "Brooke seed subscriber must be present.");
assertIncludes(migration, "communication_tokens_token_hash_key", "Communication tokens must be stored by hash.");
assertNotIncludes(migration, " token text", "Migration must not store raw communication tokens.");
assertIncludes(migration, "revoke all on table public.newsletter_publications from anon", "Newsletter publication rows must not be directly exposed to anon clients.");
assertNotIncludes(migration, "grant select on table public.newsletter_publications to anon", "Public archive must be server-rendered, not directly exposed through Supabase anon reads.");

assertIncludes(newsletterLib, "phase1NewsletterRecipients", "Newsletter library must expose fixed Phase 1 recipients.");
assertIncludes(newsletterLib, "isPhase1NewsletterRecipient", "Newsletter sends must validate fixed recipients in app code.");
assertIncludes(newsletterLib, "Phase 1 newsletter sends are restricted to Ryan and Brooke Fox.", "Recipient rejection copy must remain explicit.");
assertIncludes(newsletterLib, "Idempotency-Key", "Resend requests must include an idempotency key.");
assertIncludes(newsletterLib, "buildNewsletterEmail", "Newsletter renderer must be present.");
assertIncludes(newsletterLib, "@media only screen and (max-width: 620px)", "Newsletter email must include a responsive template check.");
assertIncludes(newsletterLib, "Manage preferences", "Newsletter email must include preference management.");
assertIncludes(newsletterLib, "Unsubscribe", "Newsletter email must include unsubscribe access.");
assertIncludes(newsletterLib, ".eq(\"status\", \"published\")", "Public archive loader must require published status.");
assertIncludes(newsletterLib, ".eq(\"archive_visible\", true)", "Public archive loader must require archive visibility.");
assertIncludes(newsletterLib, "recordResendWebhookEvent", "Webhook events must be recorded.");
assertIncludes(newsletterLib, "duplicate_count", "Webhook duplicate handling must be auditable.");

assertIncludes(webhookRoute, "await request.text()", "Webhook route must use raw request body.");
assertIncludes(webhookRoute, "verifyResendWebhookSignature", "Webhook route must verify Resend signatures.");
assertIncludes(webhookRoute, "recordResendWebhookEvent", "Webhook route must persist verified events.");
assertIncludes(webhookLib, "`${input.id}.${input.timestamp}.${input.payload}`", "Webhook verifier must follow Svix signed payload format.");
assertIncludes(webhookLib, "svixToleranceSeconds", "Webhook verifier must reject stale signatures.");
assertIncludes(webhookLib, "timingSafeEqual", "Webhook verifier must use constant-time signature comparison.");

assertIncludes(adminPage, "phase1NewsletterRecipients.map", "Admin preview must render from the fixed Phase 1 recipient list.");
assertIncludes(adminPage, "getAdminAuthorization", "Admin communications page must verify authorization before loading data.");
assertIncludes(adminPage, "Preview {recipient.name.split", "Admin preview labels must derive from fixed recipient names.");
assertIncludes(adminPage, "name=\"recipient_email\" type=\"hidden\"", "Admin preview recipient should not be free-form input.");
assertNotIncludes(adminPage, "type=\"email\"", "Admin preview workflow must not expose an arbitrary recipient email input.");
assertIncludes(preferencesActions, "requestPreferenceManagementLink", "Preference request action must use tokenized management link flow.");
assertIncludes(preferencesActions, "updatePreferencesByToken", "Preference saves must require a token.");
assertIncludes(preferencesActions, "unsubscribeByToken", "Unsubscribe must require a token.");

assertMatch(envExample, /^RESEND_API_KEY=$/m, "RESEND_API_KEY must be documented without a secret.");
assertMatch(envExample, /^RESEND_WEBHOOK_SECRET=$/m, "RESEND_WEBHOOK_SECRET must be documented without a secret.");
assertMatch(envExample, /^NEWSLETTER_EMAIL_FROM=$/m, "NEWSLETTER_EMAIL_FROM must be documented without a secret.");

console.log("Communications regression checks passed.");
