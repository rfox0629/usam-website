#!/usr/bin/env node
/**
 * One-time canonical audience import.
 *
 * Deliberately a script, not a product feature: the reconciliation of Mailchimp,
 * Planning Center, and donor records happens outside this repository, and only
 * the reconciled result is imported. There is no Mailchimp-specific logic here.
 *
 *   node scripts/communications-audience-import.mjs --file audience.json --dry-run
 *   node scripts/communications-audience-import.mjs --file audience.json --commit
 *
 * Accepts JSON (array of objects) or CSV with a header row. Recognised fields:
 *   email (required), first_name, last_name, status, source, subscribed_at, metadata
 *
 * Guarantees:
 *   - idempotent by lowercased email; re-running changes nothing
 *   - never resubscribes anyone unsubscribed, bounced, or complained
 *   - preserves existing source metadata and merges rather than overwrites
 *   - dry run prints a full summary and writes nothing
 */
import { readFileSync } from "node:fs";
import process from "node:process";

const args = process.argv.slice(2);
const fileArg = args[args.indexOf("--file") + 1];
const commit = args.includes("--commit");
const dryRun = !commit;

if (!fileArg || args.indexOf("--file") === -1) {
  console.error("Usage: --file <path> [--dry-run | --commit]");
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  process.exit(1);
}

/** Statuses that must never be flipped back to subscribed by an import. */
const PROTECTED = new Set(["unsubscribed", "bounced", "complained"]);
const VALID_STATUS = new Set(["pending", "subscribed", "unsubscribed", "bounced", "complained"]);

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const header = lines.shift().split(",").map((h) => h.trim().replace(/^"|"$/g, ""));

  return lines.map((line) => {
    const cells = [];
    let cur = "";
    let quoted = false;

    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];

      if (ch === '"') {
        if (quoted && line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          quoted = !quoted;
        }
      } else if (ch === "," && !quoted) {
        cells.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }

    cells.push(cur);

    return Object.fromEntries(header.map((key, index) => [key, (cells[index] ?? "").trim()]));
  });
}

function loadRows(path) {
  const raw = readFileSync(path, "utf8");

  if (path.endsWith(".json")) {
    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : parsed.contacts ?? [];
  }

  return parseCsv(raw);
}

async function rest(path, init = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${await response.text()}`);
  }

  return response.status === 204 ? null : response.json();
}

const rows = loadRows(fileArg);
const existing = await rest("communication_subscribers?select=email,status,source,metadata&limit=50000");
const byEmail = new Map(existing.map((row) => [row.email, row]));

const summary = {
  invalid: [],
  insert: [],
  protectedUnchanged: [],
  unchanged: [],
  update: [],
};
const seen = new Set();

for (const row of rows) {
  const email = String(row.email ?? "").trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    summary.invalid.push({ email: row.email ?? "(blank)", reason: "invalid email" });
    continue;
  }

  if (seen.has(email)) {
    summary.invalid.push({ email, reason: "duplicate row in source file" });
    continue;
  }

  seen.add(email);

  const incomingStatus = VALID_STATUS.has(row.status) ? row.status : "subscribed";
  const current = byEmail.get(email);

  if (!current) {
    summary.insert.push({ email, status: incomingStatus });
    continue;
  }

  // Suppression and unsubscribe always win over whatever the file says.
  if (PROTECTED.has(current.status)) {
    summary.protectedUnchanged.push({ email, keeping: current.status, wanted: incomingStatus });
    continue;
  }

  if (current.status === incomingStatus) {
    summary.unchanged.push({ email });
    continue;
  }

  summary.update.push({ email, from: current.status, to: incomingStatus });
}

console.log(`\nCanonical audience import ${dryRun ? "(DRY RUN — nothing written)" : "(COMMIT)"}`);
console.log(`source file          ${fileArg}`);
console.log(`rows in file         ${rows.length}`);
console.log(`existing contacts    ${existing.length}`);
console.log(`--`);
console.log(`to insert            ${summary.insert.length}`);
console.log(`to update            ${summary.update.length}`);
console.log(`unchanged            ${summary.unchanged.length}`);
console.log(`protected (kept)     ${summary.protectedUnchanged.length}`);
console.log(`invalid / duplicate  ${summary.invalid.length}`);

if (summary.protectedUnchanged.length > 0) {
  console.log(`\nProtected — unsubscribe/suppression preserved, not resubscribed:`);
  for (const item of summary.protectedUnchanged.slice(0, 20)) {
    console.log(`  ${item.email} stays ${item.keeping} (file said ${item.wanted})`);
  }
}

if (summary.invalid.length > 0) {
  console.log(`\nSkipped:`);
  for (const item of summary.invalid.slice(0, 20)) {
    console.log(`  ${item.email}: ${item.reason}`);
  }
}

if (dryRun) {
  console.log(`\nNothing was written. Re-run with --commit to apply.`);
  process.exit(0);
}

const now = new Date().toISOString();
let inserted = 0;
let updated = 0;

for (const item of summary.insert) {
  const source = rows.find((row) => String(row.email).trim().toLowerCase() === item.email);
  await rest("communication_subscribers", {
    body: JSON.stringify({
      email: item.email,
      first_name: source?.first_name || null,
      last_name: source?.last_name || null,
      metadata: { import_source: source?.source || "reconciled_canonical_import", imported_at: now },
      source: "import",
      status: item.status,
      subscribed_at: item.status === "subscribed" ? (source?.subscribed_at || now) : null,
    }),
    method: "POST",
  });
  inserted += 1;
}

for (const item of summary.update) {
  await rest(`communication_subscribers?email=eq.${encodeURIComponent(item.email)}`, {
    body: JSON.stringify({ status: item.to, updated_at: now }),
    method: "PATCH",
  });
  updated += 1;
}

console.log(`\nCommitted: ${inserted} inserted, ${updated} updated, 0 unsubscribes overwritten.`);
