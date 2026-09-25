// September newsletter: Version A snapshot + V4 previews.
//
//   node --no-warnings --import ./scripts/ts-loader.mjs \
//     scripts/september-newsletter-preview.mjs
//
// Renders through the real renderers (no server, no database, no Resend) and
// writes to docs/newsletter/september-2026/:
//
//   version-a/  the September issue as it rendered before it moved onto its
//               record — the recoverable snapshot.
//   v4/         v4-email.*   what a subscriber would receive. No story.
//               v4-review.*  private founder review. Adds the review-only story
//                            mockup behind a "permission pending" marker.
//
// The story mockup is read from docs/.../review-only/ and injected here only.
// It is never written into v4-email.*, and nothing under src/ can reach it.
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const root = process.cwd();
const outDir = path.join(root, "docs", "newsletter", "september-2026");
const imageBase = pathToFileURL(path.join(root, "public")).href;
const load = (rel) => import(pathToFileURL(path.join(root, rel)).href);

const links = {
  archiveUrl: "https://usamissionaries.org/newsletter/q2-q3-2026-field-update",
  preferencesUrl: "https://usamissionaries.org/preferences/test-preview",
  unsubscribeUrl: "https://usamissionaries.org/unsubscribe/test-preview",
};

const { renderEditorialNewsletter } = await load("src/lib/communications/newsletter-editorial.ts");
const { septemberNewsletter } = await load("src/lib/communications/september-2026.ts");
const { renderEcosystemNewsletter } = await load("src/lib/communications/newsletter-ecosystem.ts");
const { septemberSections, SEPTEMBER_PREHEADER, SEPTEMBER_SUBJECT } =
  await load("src/lib/communications/september-2026-sections.ts");

const absolute = (section) => (section.image
  ? { ...section, image: { ...section.image, url: `${imageBase}${section.image.url}` } }
  : section);

const issue = (sections) => ({
  markBase: imageBase,
  postalAddress: null, // unverified; renders nothing and blocks sending
  preheader: SEPTEMBER_PREHEADER,
  sections: sections.map(absolute),
  subject: SEPTEMBER_SUBJECT,
});

const versionA = renderEditorialNewsletter({
  links,
  newsletter: septemberNewsletter({ imageBase, postalAddress: null }),
  recipientFirstName: "Ryan",
});

const email = renderEcosystemNewsletter({
  issue: issue(septemberSections),
  links,
  recipientFirstName: "Ryan",
});

// Private review: the story slot filled with the unapproved mockup, visible and
// marked. `body` carries it, not `story` — a `story` would claim a verified
// permission this has not got.
const mockupPath = path.join(outDir, "review-only", "story-mockup.json");
let reviewSections = septemberSections;

if (existsSync(mockupPath)) {
  const mockup = JSON.parse(await readFile(mockupPath, "utf8"));
  reviewSections = septemberSections.map((section) => (section.key === "ktg-story"
    ? {
      ...section,
      body: mockup.text,
      heading: mockup.heading,
      hidden: false,
      pendingNote: mockup.pendingNote,
    }
    : section));
}

const review = renderEcosystemNewsletter({
  issue: issue(reviewSections),
  links,
  recipientFirstName: "Ryan",
  reviewMarkers: true,
});

const targets = [
  { dir: "version-a", name: "version-a", rendered: versionA },
  { dir: "v4", name: "v4-email", rendered: email },
  { dir: "v4", name: "v4-review", rendered: review },
];

for (const { dir, name, rendered } of targets) {
  await mkdir(path.join(outDir, dir), { recursive: true });
  await writeFile(path.join(outDir, dir, `${name}.html`), rendered.html, "utf8");
  await writeFile(path.join(outDir, dir, `${name}.txt`), rendered.text, "utf8");
}

// A sendable render must never carry the mockup. Checked, not assumed.
const sendable = await readFile(path.join(outDir, "v4", "v4-email.html"), "utf8");
if (existsSync(mockupPath)) {
  const mockup = JSON.parse(await readFile(mockupPath, "utf8"));
  const fingerprint = mockup.text.slice(0, 60);
  if (sendable.includes(fingerprint) || sendable.includes(mockup.pullQuote)) {
    throw new Error("the story mockup leaked into the sendable render");
  }
}

const pinnedChromium = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(existsSync(pinnedChromium) ? { executablePath: pinnedChromium } : {});
const viewports = [
  { key: "desktop", height: 900, width: 700 },
  { key: "mobile", height: 844, width: 390 },
];
const measured = {};

for (const { dir, name } of targets) {
  for (const viewport of viewports) {
    const page = await browser.newPage({
      deviceScaleFactor: 1,
      viewport: { height: viewport.height, width: viewport.width },
    });
    // Navigated, not setContent: an about:blank origin cannot load the file://
    // photographs and would screenshot as empty frames.
    await page.goto(pathToFileURL(path.join(outDir, dir, `${name}.html`)).href, { waitUntil: "load" });
    await page.waitForTimeout(600);

    const result = await page.evaluate(() => ({
      height: document.documentElement.scrollHeight,
      missing: [...document.images].filter((img) => !img.naturalWidth).length,
      overflow: document.documentElement.scrollWidth > window.innerWidth,
    }));

    if (result.missing > 0) {
      throw new Error(`${name}/${viewport.key}: ${result.missing} image(s) failed to load`);
    }

    measured[`${name}/${viewport.key}`] = result;
    await page.screenshot({ fullPage: true, path: path.join(outDir, dir, `${name}-${viewport.key}.png`) });
    await page.close();
  }
}

await browser.close();

for (const [key, value] of Object.entries(measured)) {
  console.log(`${key.padEnd(22)} ${String(value.height).padStart(6)}px  overflow=${value.overflow}`);
}
console.log(`\nwritten to ${path.relative(root, outDir)}`);
