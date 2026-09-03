#!/usr/bin/env node
/**
 * Renders the Q2/Q3 2026 field update to disk so the HTML can be opened,
 * screenshotted, and reviewed without a running server or a send.
 *
 * The template module is imported directly, so what lands in
 * docs/previews/newsletter is byte for byte what the mailer builds. Node strips
 * the TypeScript, which is why that module keeps to plain types and relative
 * imports.
 *
 *   node scripts/newsletter-q3-2026-preview.mjs
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const { renderQ3FieldUpdateEmail } = await import(
  join(repoRoot, "src/lib/communications/newsletter-q3-2026-template.ts")
);
const { q3FieldUpdateLinks } = await import(
  join(repoRoot, "src/lib/communications/config.ts")
);

const assetBaseUrl = process.env.NEWSLETTER_ASSET_BASE_URL
  || `${q3FieldUpdateLinks.siteUrl}/images/email/q3-2026`;
const siteUrl = process.env.NEWSLETTER_SITE_URL || q3FieldUpdateLinks.siteUrl;

const rendered = renderQ3FieldUpdateEmail({
  archiveUrl: `${siteUrl}/newsletter/q2-q3-2026-field-update`,
  assetBaseUrl,
  firstName: process.env.NEWSLETTER_PREVIEW_NAME || "Ryan",
  links: q3FieldUpdateLinks,
  preferencesUrl: `${siteUrl}/preferences/preview-token`,
  showPlaceholderNotes: process.env.NEWSLETTER_HIDE_NOTES !== "true",
  unsubscribeUrl: `${siteUrl}/unsubscribe/preview-token`,
});

const outDir = join(repoRoot, "docs/previews/newsletter");
await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, "q3-2026-field-update.html"), rendered.html, "utf8");
await writeFile(join(outDir, "q3-2026-field-update.txt"), rendered.text, "utf8");

console.log(`HTML  ${(rendered.html.length / 1024).toFixed(1)} KB`);
console.log(`Text  ${(rendered.text.length / 1024).toFixed(1)} KB`);
console.log(`Assets served from ${assetBaseUrl}`);
console.log(`Wrote ${join(outDir, "q3-2026-field-update.html")}`);
