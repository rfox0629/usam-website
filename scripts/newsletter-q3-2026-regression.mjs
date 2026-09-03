#!/usr/bin/env node
/**
 * Guards the Q2/Q3 2026 field update.
 *
 * The things this checks are the things that would be expensive to discover
 * after a donor send: an invented name in the reserved team block, a review
 * note left visible, a link that was never verified live, an em dash, a body
 * big enough for Gmail to clip.
 *
 *   node scripts/newsletter-q3-2026-regression.mjs
 */

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function check(label, condition) {
  if (!condition) {
    failures.push(label);
  }
}

const { renderQ3FieldUpdateEmail } = await import(
  join(repoRoot, "src/lib/communications/newsletter-q3-2026-template.ts")
);
const { q3FieldUpdateLinks, q3FieldUpdateSlug } = await import(
  join(repoRoot, "src/lib/communications/config.ts")
);

const baseInput = {
  archiveUrl: "https://usamissionaries.org/newsletter/q2-q3-2026-field-update",
  assetBaseUrl: "https://usamissionaries.org/images/email/q3-2026",
  firstName: "Ryan",
  links: q3FieldUpdateLinks,
  preferencesUrl: "https://usamissionaries.org/preferences/token",
  unsubscribeUrl: "https://usamissionaries.org/unsubscribe/token",
};

const review = renderQ3FieldUpdateEmail({ ...baseInput, showPlaceholderNotes: true });
const donor = renderQ3FieldUpdateEmail({ ...baseInput, showPlaceholderNotes: false });

// The slug is the only thing that routes a newsletter row to this template.
check("slug is stable", q3FieldUpdateSlug === "q2-q3-2026-field-update");

// Copy rules.
check("no em dashes in html", !review.html.includes("—"));
check("no em dashes in text", !review.text.includes("—"));
for (const banned of [
  "operational infrastructure",
  "approved stories",
  "credible individuals",
  "production system",
  "strategic ministry deployment",
]) {
  check(`copy avoids "${banned}"`, !review.html.toLowerCase().includes(banned));
}

// The reserved team block must stay reserved. A name, a city, or a quote
// appearing here means someone filled it in without the onboarding being done.
const teamBlock = donor.html.slice(
  donor.html.indexOf("The team is growing"),
  donor.html.indexOf("Meet the team"),
);
check("team block is present", teamBlock.length > 0);
check("team block says reserved", teamBlock.includes("Team announcement"));
check("team block has no quotation marks", !/&quot;|&ldquo;/.test(teamBlock));

// Review notes are a founder-review affordance and must never ship to donors.
check("review notes render for founder review", review.html.includes("Founder review note"));
check("review notes absent from donor render", !donor.html.includes("Founder review note"));

// Compliance and self-service links.
for (const [label, url] of [
  ["archive", baseInput.archiveUrl],
  ["preferences", baseInput.preferencesUrl],
  ["unsubscribe", baseInput.unsubscribeUrl],
]) {
  check(`${label} link in html`, donor.html.includes(url));
  check(`${label} link in text`, donor.text.includes(url));
}
check("postal address placeholder is still flagged", donor.html.includes("[POSTAL ADDRESS]"));

// Destinations. Each of these was checked live before it went into config.
for (const [key, url] of Object.entries(q3FieldUpdateLinks)) {
  check(`${key} is https`, url.startsWith("https://"));
  check(`${key} appears in the email`, donor.html.includes(url));
  check(`${key} appears in the plain text`, donor.text.includes(url));
}
check("no localhost or preview host leaked", !/localhost|vercel\.app/.test(donor.html));

// Imagery. Three photographs and the site screenshot, each with alt text.
const images = [...donor.html.matchAll(/<img\s[^>]*>/g)].map((match) => match[0]);
check("four images", images.length === 4);
check("every image has non-empty alt", images.every((tag) => /alt="[^"]+"/.test(tag)));
check("every image has a width", images.every((tag) => /width="\d+"/.test(tag)));
for (const name of ["kitchen-table-01.jpg", "kitchen-table-02.jpg", "mens-group.jpg", "website-hero.jpg"]) {
  check(`references ${name}`, donor.html.includes(name));
}

// Email client constraints.
check("html under the 102KB Gmail clipping limit", Buffer.byteLength(donor.html, "utf8") < 102400);
check("single 640px frame", donor.html.includes('max-width:640px'));
check("no border-radius", !donor.html.includes("border-radius"));
check("no flex or grid layout", !/display:\s*(flex|grid)/.test(donor.html));
check("has a preheader", donor.html.includes("mso-hide:all"));
check("plain text fallback is substantial", donor.text.length > 2000);

// Personalization falls back rather than printing an empty greeting.
const anonymous = renderQ3FieldUpdateEmail({ ...baseInput, firstName: "", showPlaceholderNotes: false });
check("greeting falls back", anonymous.html.includes("Hi friend,"));

// The images the template points at are actually in the repo.
for (const name of ["kitchen-table-01.jpg", "kitchen-table-02.jpg", "mens-group.jpg", "website-hero.jpg"]) {
  const file = join(repoRoot, "public/images/email/q3-2026", name);
  const bytes = await readFile(file).then((buffer) => buffer.length).catch(() => 0);
  check(`${name} exists in public/images/email/q3-2026`, bytes > 0);
  check(`${name} is under 300KB`, bytes > 0 && bytes < 300 * 1024);
}

if (failures.length > 0) {
  console.error("Q3 2026 newsletter regression failed:");
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}

console.log("Q3 2026 newsletter regression checks passed.");
