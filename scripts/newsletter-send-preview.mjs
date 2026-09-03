#!/usr/bin/env node
/**
 * Sends one newsletter preview through Resend, using the same renderer, the
 * same sender configuration, and the same tables as /admin/communications.
 *
 * This exists because the admin screen is behind an admin passcode, and a
 * review send should not require one person to be at a keyboard. It is
 * deliberately not a bulk sender: it refuses any recipient outside the phase 1
 * allowlist in src/lib/communications/config.ts, and it sends to exactly one
 * address per run.
 *
 *   RESEND_API_KEY=... SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... \
 *     node scripts/newsletter-send-preview.mjs --slug q2-q3-2026-field-update --to ryan@usamissionaries.org
 *
 * Flags:
 *   --dry-run   Render and report, send nothing.
 *   --no-db     Skip the Supabase reads and writes. Use only when the service
 *               role key is unavailable and the send is being logged by hand;
 *               the script then requires --manage-token and --first-name.
 */

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function flag(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`);

  if (index === -1) {
    return fallback;
  }

  const value = process.argv[index + 1];

  return value && !value.startsWith("--") ? value : true;
}

const slug = flag("slug", "q2-q3-2026-field-update");
const to = String(flag("to", "")).trim().toLowerCase();
const dryRun = flag("dry-run") === true;
const skipDb = flag("no-db") === true;

const { renderQ3FieldUpdateEmail } = await import(
  join(repoRoot, "src/lib/communications/newsletter-q3-2026-template.ts")
);
const {
  isPhase1NewsletterRecipient,
  phase1NewsletterRecipients,
  q3FieldUpdateAssetBaseUrl,
  q3FieldUpdateLinks,
  q3FieldUpdateSlug,
} = await import(join(repoRoot, "src/lib/communications/config.ts"));

if (!to) {
  throw new Error("--to is required");
}

// The allowlist is the safety rail. Nothing about this script can reach a donor
// list, and a typo cannot turn a review into a broadcast.
if (!isPhase1NewsletterRecipient(to)) {
  throw new Error(
    `${to} is not on the phase 1 allowlist (${phase1NewsletterRecipients.map((r) => r.email).join(", ")})`,
  );
}

if (slug !== q3FieldUpdateSlug) {
  throw new Error(`this script only sends ${q3FieldUpdateSlug}`);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;
const siteUrl = process.env.NEWSLETTER_SITE_URL || q3FieldUpdateLinks.siteUrl;

async function supabase(path, init = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`supabase ${path}: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

let manageToken = String(flag("manage-token", "")) || null;
let firstName = String(flag("first-name", "")) || null;
let newsletterId = String(flag("newsletter-id", "")) || null;
let subscriberId = null;
let sendId = null;

if (!skipDb) {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (or pass --no-db)");
  }

  const [newsletter] = await supabase(`communication_newsletters?slug=eq.${slug}&select=id,subject`);

  if (!newsletter) {
    throw new Error(`no newsletter row for slug ${slug}`);
  }

  newsletterId = newsletter.id;

  const [subscriber] = await supabase(
    `communication_subscribers?email=eq.${encodeURIComponent(to)}&select=id,first_name,status`,
  );

  if (!subscriber) {
    throw new Error(`${to} is not a subscriber row; seed it before sending`);
  }

  subscriberId = subscriber.id;
  firstName = firstName ?? subscriber.first_name ?? "";

  // Same token shape as createSubscriberPreferenceToken: the raw token only
  // ever leaves in the email, the database keeps the hash.
  manageToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(manageToken, "utf8").digest("hex");

  await supabase("communication_subscriber_tokens", {
    body: JSON.stringify({ subscriber_id: subscriberId, token_hash: tokenHash }),
    method: "POST",
  });
  await supabase(`communication_subscribers?id=eq.${subscriberId}`, {
    body: JSON.stringify({
      manage_token_hash: tokenHash,
      manage_token_issued_at: new Date().toISOString(),
    }),
    method: "PATCH",
  });
}

if (!manageToken || firstName === null) {
  throw new Error("--no-db requires --manage-token and --first-name");
}

const archiveUrl = `${siteUrl}/newsletter/${slug}`;
const preferencesUrl = `${siteUrl}/preferences/${manageToken}`;
const unsubscribeUrl = `${siteUrl}/unsubscribe/${manageToken}`;
const rendered = renderQ3FieldUpdateEmail({
  archiveUrl,
  assetBaseUrl: q3FieldUpdateAssetBaseUrl(),
  firstName,
  links: q3FieldUpdateLinks,
  preferencesUrl,
  // A preview is a founder review, so the outstanding-work notes belong in it.
  showPlaceholderNotes: true,
  unsubscribeUrl,
});
const subject = process.env.NEWSLETTER_SUBJECT || "There's a Lot We've Been Wanting to Share";
const idempotencyKey = `newsletter-preview:${slug}:${to}:${randomUUID()}`;

console.log(`slug         ${slug}`);
console.log(`recipient    ${to}`);
console.log(`subject      ${subject}`);
console.log(`assets       ${q3FieldUpdateAssetBaseUrl()}`);
console.log(`html bytes   ${Buffer.byteLength(rendered.html, "utf8")}`);
console.log(`idempotency  ${idempotencyKey}`);

if (dryRun) {
  console.log("dry run, nothing sent");
  process.exit(0);
}

if (!resendApiKey) {
  throw new Error("RESEND_API_KEY is required to send");
}

if (!skipDb) {
  const [send] = await supabase("communication_sends", {
    body: JSON.stringify({
      created_by_email: process.env.NEWSLETTER_ACTOR_EMAIL || "ryan@usamissionaries.org",
      idempotency_key: idempotencyKey,
      metadata: { archive_url: archiveUrl, asset_base_url: q3FieldUpdateAssetBaseUrl() },
      newsletter_id: newsletterId,
      recipient_email: to,
      send_type: "preview",
      status: "queued",
      subscriber_id: subscriberId,
    }),
    method: "POST",
  });

  sendId = send.id;
}

const from = process.env.NEWSLETTER_EMAIL_FROM
  || process.env.EMAIL_FROM
  || process.env.JOIN_EMAIL_FROM
  || "USA Missionaries <onboarding@resend.dev>";
const response = await fetch("https://api.resend.com/emails", {
  body: JSON.stringify({
    from,
    html: rendered.html,
    subject,
    tags: [{ name: "category", value: "newsletter_preview" }],
    text: rendered.text,
    to,
  }),
  headers: {
    Authorization: `Bearer ${resendApiKey}`,
    "Content-Type": "application/json",
    "Idempotency-Key": idempotencyKey,
  },
  method: "POST",
});
const payload = await response.json().catch(() => ({}));

if (!response.ok) {
  if (!skipDb && sendId) {
    await supabase(`communication_sends?id=eq.${sendId}`, {
      body: JSON.stringify({ error_message: JSON.stringify(payload).slice(0, 400), status: "failed" }),
      method: "PATCH",
    });
  }

  throw new Error(`resend ${response.status}: ${JSON.stringify(payload)}`);
}

if (!skipDb && sendId) {
  await supabase(`communication_sends?id=eq.${sendId}`, {
    body: JSON.stringify({
      resend_email_id: payload.id ?? null,
      sent_at: new Date().toISOString(),
      status: "sent",
    }),
    method: "PATCH",
  });
}

console.log(`from         ${from}`);
console.log(`resend id    ${payload.id ?? "(none returned)"}`);
console.log(`send row     ${sendId ?? "(not logged, --no-db)"}`);
console.log("sent 1 preview. No donor-wide send is possible from this script.");
