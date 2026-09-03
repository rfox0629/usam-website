import { readFileSync } from "node:fs";

function assertIncludes(haystack, needle, message) {
  if (!haystack.includes(needle)) {
    throw new Error(`${message}\nMissing: ${needle}`);
  }
}

function assertNotIncludes(haystack, needle, message) {
  if (haystack.includes(needle)) {
    throw new Error(`${message}\nUnexpected: ${needle}`);
  }
}

const migration = readFileSync("supabase/migrations/20260720221343_communications_resend_subscribers.sql", "utf8");
const config = readFileSync("src/lib/communications/config.ts", "utf8");
const template = readFileSync("src/lib/communications/newsletter-template.ts", "utf8");
const webhook = readFileSync("app/api/resend/webhook/route.ts", "utf8");
const verifier = readFileSync("src/lib/communications/webhook.ts", "utf8");

[
  "communication_subscribers",
  "communication_preferences",
  "communication_newsletters",
  "communication_publications",
  "communication_sends",
  "communication_delivery_events",
  "communication_subscriber_events",
  "communication_subscriber_tokens",
].forEach((table) => {
  assertIncludes(migration, `public.${table}`, `${table} must be created in the communications migration.`);
  assertIncludes(migration, `alter table public.${table} enable row level security;`, `${table} must enable RLS.`);
  assertIncludes(migration, `grant select, insert, update, delete on table public.${table} to service_role;`, `${table} must be service-role managed.`);
  assertNotIncludes(migration, `grant select on table public.${table} to anon`, `${table} must not expose subscriber data to anon.`);
});

assertIncludes(migration, "communication_sends_phase1_recipient_check", "Migration must enforce Phase 1 send recipient restrictions.");
assertIncludes(migration, "ryan@usamissionaries.org", "Ryan Fox must be seeded and allowed.");
assertIncludes(migration, "brooke.r.fox@gmail.com", "Brooke Fox must be seeded and allowed.");
assertIncludes(migration, "token_hash text not null", "Preference tokens must be stored as hashes.");
assertIncludes(config, "phase1NewsletterRecipients", "Preview recipient allowlist must live in communications config.");
assertIncludes(config, "isPhase1NewsletterRecipient", "Preview sends must validate the allowlist in code.");
assertIncludes(template, "/preferences/${manageToken}", "Newsletter email must include a preference-management link.");
assertIncludes(template, "/unsubscribe/${manageToken}", "Newsletter email must include an unsubscribe link.");
assertIncludes(webhook, "await request.text()", "Resend webhook must verify the raw request body.");
assertIncludes(webhook, "communication_delivery_events", "Resend webhook must record delivery events.");
assertIncludes(webhook, "svix-id", "Resend webhook must dedupe by svix-id.");
assertIncludes(verifier, "createHmac(\"sha256\"", "Webhook verifier must use HMAC SHA-256.");
assertIncludes(verifier, "timingSafeEqual", "Webhook verifier must use constant-time comparison.");
assertIncludes(verifier, "5 * 60", "Webhook verifier must reject stale replay timestamps.");

console.log("Communications regression checks passed.");
