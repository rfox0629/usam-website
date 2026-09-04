#!/usr/bin/env node
// Public Communications routes, rescued from USA-47, plus the September issue's
// send-safety and locked-design contract.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const read = (...parts) => readFileSync(path.join(root, ...parts), "utf8");
const load = (rel) => import(pathToFileURL(path.join(root, rel)).href);
const results = [];
const check = (name, fn) => {
  try {
    const value = fn();
    if (value instanceof Promise) return value.then(
      () => results.push({ name, ok: true }),
      (error) => results.push({ error: error.message, name, ok: false }));
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ error: error.message, name, ok: false });
  }
  return undefined;
};

const routes = {
  archive: read("app", "newsletter", "page.tsx"),
  issue: read("app", "newsletter", "[slug]", "page.tsx"),
  preferences: read("app", "preferences", "[token]", "page.tsx"),
  preferencesActions: read("app", "preferences", "[token]", "actions.ts"),
  unsubscribe: read("app", "unsubscribe", "[token]", "page.tsx"),
  unsubscribeActions: read("app", "unsubscribe", "[token]", "actions.ts"),
};
const data = read("src", "lib", "communications", "data.ts");
const render = read("src", "lib", "communications", "render.ts");

check("all three public routes exist and are server-rendered", () => {
  assert.match(routes.issue, /getPublishedNewsletterBySlug/);
  assert.match(routes.preferences, /getSubscriberByPreferenceToken/);
  assert.match(routes.unsubscribe, /getSubscriberByPreferenceToken/);
  for (const [name, source] of Object.entries(routes)) {
    assert.doesNotMatch(source, /^"use client"/m, `${name} must stay a server component`);
  }
});

check("no route links to a page that does not exist on main", () => {
  for (const [name, source] of Object.entries(routes)) {
    assert.doesNotMatch(source, /["'`]\/subscribe/, `${name} still links to the absent /subscribe route`);
  }
});

check("an unapproved draft is never publicly readable", () => {
  assert.match(data, /publiclyReadableNewsletterStatuses = \["published", "sent"\]/);
  // The workflow statuses that precede approval must not appear in the gate.
  const gate = data.slice(data.indexOf("publiclyReadableNewsletterStatuses"), data.indexOf("publicNewsletterColumns"));
  for (const status of ["draft", "ready_for_review", "test_sent", "approved", "scheduled"]) {
    assert.doesNotMatch(gate, new RegExp(`"${status}"`), `${status} must not be publicly readable`);
  }
  // Both public reads go through the same filter.
  assert.equal((data.match(/publiclyReadableNewsletterStatuses as unknown as string\[\]/g) ?? []).length, 2);
});

check("preference and unsubscribe pages are excluded from search indexes", () => {
  for (const source of [routes.preferences, routes.unsubscribe]) {
    assert.match(source, /robots:\s*\{[\s\S]*?index:\s*false/);
  }
});

check("unsubscribe is idempotent and never resubscribes silently", () => {
  assert.match(data, /alreadyUnsubscribed \? "unsubscribe_idempotent" : "unsubscribed"/);
  assert.match(routes.unsubscribe, /safe to submit more than once/);
});

check("clearing every topic unsubscribes rather than leaving a subscribed ghost", () => {
  assert.match(routes.preferencesActions, /selectedTopics\.length === 0/);
  assert.match(routes.preferencesActions, /unsubscribeSubscriber/);
});

check("a token is only ever stored hashed", () => {
  assert.doesNotMatch(data, /token_hash:\s*token\b/, "the raw token must never be written");
  assert.match(data, /hashManageToken/);
  const tokens = read("src", "lib", "communications", "tokens.ts");
  assert.match(tokens, /createHash\("sha256"\)/);
});

check("an expired or inactive token resolves to nobody", () => {
  assert.match(data, /tokenRow\.status !== "active"/);
  assert.match(data, /new Date\(tokenRow\.expires_at\)\.getTime\(\) < Date\.now\(\)/);
});

check("preview, test, and broadcast share one renderer", () => {
  const page = read("app", "operations", "communications", "newsletters", "[id]", "page.tsx");
  const actions = read("app", "operations", "communications", "newsletters", "[id]", "actions.ts");
  assert.match(page, /renderNewsletter\(/);
  assert.match(actions, /renderNewsletter\(/);
  assert.doesNotMatch(page, /renderNewsletterEmail\(/);
  assert.doesNotMatch(actions, /renderNewsletterEmail\(/);
});

check("September renders in the locked editorial design", () => {
  assert.match(render, /"q2-q3-2026-field-update": septemberNewsletter/);
});

check("a test send can never carry a real subscriber token", () => {
  const actions = read("app", "operations", "communications", "newsletters", "[id]", "actions.ts");
  const page = read("app", "operations", "communications", "newsletters", "[id]", "page.tsx");
  assert.match(actions, /manageToken: PLACEHOLDER_MANAGE_TOKEN/);
  assert.match(page, /manageToken: PLACEHOLDER_MANAGE_TOKEN/);
  assert.doesNotMatch(actions, /createSubscriberPreferenceToken/);
});

check("test sends still go only to Ryan", () => {
  const actions = read("app", "operations", "communications", "newsletters", "[id]", "actions.ts");
  assert.match(actions, /to: TEST_SEND_RECIPIENT/);
  assert.doesNotMatch(actions, /to:\s*["'`]/, "no literal recipient address may be sent to");
});

check("donor broadcast is still disabled", () => {
  const actions = read("app", "operations", "communications", "newsletters", "[id]", "actions.ts");
  assert.match(actions, /Donor broadcast is not enabled yet/);
  assert.doesNotMatch(actions, /send_type:\s*["']broadcast["']/);
});

check("no migration on this branch drops the phase-1 recipient constraint", () => {
  const dir = path.join(root, "supabase", "migrations");
  const files = readdirSync(dir).filter((name) => name.endsWith(".sql"));
  for (const name of files) {
    const sql = readFileSync(path.join(dir, name), "utf8");
    assert.doesNotMatch(
      sql,
      /drop\s+constraint\s+(if\s+exists\s+)?communication_sends_phase1_recipient_check/i,
      `${name} drops the phase-1 recipient guard`,
    );
  }
});

await check("the September email renders its real links, and fails closed on the address", async () => {
  const editorial = await load("src/lib/communications/newsletter-editorial.ts");
  const september = await load("src/lib/communications/september-2026.ts");
  const links = {
    archiveUrl: "https://usamissionaries.org/newsletter/q2-q3-2026-field-update",
    preferencesUrl: "https://usamissionaries.org/preferences/TOKEN123",
    unsubscribeUrl: "https://usamissionaries.org/unsubscribe/TOKEN123",
  };
  const build = (postalAddress) => editorial.renderEditorialNewsletter({
    links,
    newsletter: september.septemberNewsletter({ imageBase: "https://usamissionaries.org", postalAddress }),
    recipientFirstName: "Ryan",
  });

  const withoutAddress = build(null);
  for (const url of Object.values(links)) {
    assert.ok(withoutAddress.html.includes(url), `missing ${url} in HTML`);
    assert.ok(withoutAddress.text.includes(url), `missing ${url} in text`);
  }
  // Locked design markers: black hero, gold, condensed display type.
  assert.match(withoutAddress.html, /#0D0D0D/);
  assert.match(withoutAddress.html, /#C2A14E/);
  assert.match(withoutAddress.html, /Oswald/);
  // Fluid shell, so the issue does not clip on a phone.
  assert.match(withoutAddress.html, /max-width:600px/);
  assert.match(withoutAddress.html, /@media only screen and \(max-width:620px\)/);
  assert.doesNotMatch(withoutAddress.html, /width="600"\s+style="width:600px/);

  const address = "USA Missionaries, 123 Example Rd, Somewhere, MN 55000";
  const withAddress = build(address);
  assert.ok(withAddress.html.includes(address), "a supplied postal address must render");
  assert.ok(!withoutAddress.html.includes("Somewhere"), "no address may be invented when none is supplied");
});

check("every newsletter image is within an email payload budget", () => {
  const september = read("src", "lib", "communications", "september-2026.ts");
  // Email images are dedicated derivatives, never the site's full-resolution
  // originals under /images/vision.
  assert.match(september, /images\/email\/september-2026/);
  assert.doesNotMatch(september.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, ""), /images\/vision/);

  const files = [...september.matchAll(/img\("([^"]+)"\)/g)].map((match) => match[1]);
  assert.ok(files.length > 0, "the issue must reference at least one image");

  let total = 0;
  for (const file of files) {
    const full = path.join(root, "public", "images", "email", "september-2026", file);
    const { size } = statSync(full);
    total += size;
    assert.ok(size <= 260 * 1024, `${file} is ${Math.round(size / 1024)}KB, over the 260KB per-image budget`);
  }
  assert.ok(total <= 600 * 1024, `total image payload ${Math.round(total / 1024)}KB exceeds 600KB`);
});

const failed = results.filter((entry) => !entry.ok);
for (const entry of results) {
  console.log(`${entry.ok ? "PASS" : "FAIL"}  ${entry.name}${entry.ok ? "" : `\n      ${entry.error}`}`);
}
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length > 0) process.exit(1);
