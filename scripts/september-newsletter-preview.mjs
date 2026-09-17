// September newsletter: Version A snapshot + V3 proposal previews.
//
//   node --no-warnings --import ./scripts/ts-loader.mjs \
//     scripts/september-newsletter-preview.mjs
//
// Renders both versions through their real renderers (no server, no database,
// no Resend) and writes them under docs/newsletter/september-2026/:
//
//   version-a/  the live September issue exactly as Operations renders it
//               today. This is the recoverable snapshot; it is written from
//               src/lib/communications/september-2026.ts, which this script
//               never modifies.
//   v3/         the proposed revision, in both its review form (reserved slots
//               visible) and the form an email client would receive.
//
// Screenshots use the local public/ directory as the image base so the PNGs do
// not depend on a deploy being up.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
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
const { renderProposedNewsletter } = await load("src/lib/communications/proposed/september-ecosystem.ts");
const { septemberProposedContent } = await load("src/lib/communications/proposed/september-content.ts");

// V2, checked out from PR #75's head into .v2-ref/, so the height and length
// comparison in the review notes is measured rather than asserted. Optional:
// the script still runs without it.
const v2Ref = existsSync(path.join(root, ".v2-ref", "september-content.ts"))
  ? {
      render: (await load(".v2-ref/september-ecosystem.ts")).renderProposedNewsletter,
      content: (await load(".v2-ref/september-content.ts")).septemberProposedContent,
    }
  : null;

// Version A — the live issue. postalAddress stays null: it is unverified, and
// an invented address would be worse than a visibly missing one.
const versionA = renderEditorialNewsletter({
  links,
  newsletter: septemberNewsletter({ imageBase, postalAddress: null }),
  recipientFirstName: "Ryan",
});

const v3 = (showReservedSlots) => renderProposedNewsletter({
  assetBase: imageBase,
  content: septemberProposedContent,
  links,
  postalAddress: null,
  recipientFirstName: "Ryan",
  showReservedSlots,
});

const v3Review = v3(true);
const v3Email = v3(false);

const targets = [
  { dir: "version-a", name: "version-a", rendered: versionA, shoot: true },
  { dir: "v3", name: "v3-review", rendered: v3Review, shoot: true },
  { dir: "v3", name: "v3-email", rendered: v3Email, shoot: true },
];

if (v2Ref) {
  targets.push({
    dir: "v2",
    name: "v2",
    measureOnly: true,
    rendered: v2Ref.render({
      assetBase: imageBase,
      content: v2Ref.content,
      links,
      postalAddress: null,
      recipientFirstName: "Ryan",
    }),
    shoot: true,
  });
}

for (const { dir, measureOnly, name, rendered } of targets) {
  // V2 is rendered only to measure it; it is PR #75's, not this branch's, so
  // it is not committed here.
  const target = measureOnly ? path.join(root, ".v2-ref") : path.join(outDir, dir);
  await mkdir(target, { recursive: true });
  await writeFile(path.join(target, `${name}.html`), rendered.html, "utf8");
  if (!measureOnly) {
    await writeFile(path.join(target, `${name}.txt`), rendered.text, "utf8");
  }
}

// This environment ships a pinned Chromium that may not match the browser
// build the installed Playwright expects, so use it directly when it is there.
const pinnedChromium = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(
  existsSync(pinnedChromium) ? { executablePath: pinnedChromium } : {},
);
const viewports = [
  { key: "desktop", width: 700, height: 900 },
  { key: "mobile", width: 390, height: 844 },
];
const heights = {};

for (const { dir, measureOnly, name, shoot } of targets) {
  if (!shoot) continue;

  const pageDir = measureOnly ? path.join(root, ".v2-ref") : path.join(outDir, dir);

  for (const viewport of viewports) {
    const page = await browser.newPage({
      deviceScaleFactor: 1,
      viewport: { height: viewport.height, width: viewport.width },
    });
    // Navigated, not setContent: a document with an about:blank origin cannot
    // load the file:// photographs, and would screenshot as an empty frame.
    await page.goto(pathToFileURL(path.join(pageDir, `${name}.html`)).href, { waitUntil: "load" });
    await page.waitForTimeout(600);

    const missing = await page.evaluate(() => [...document.images].filter((i) => !i.naturalWidth).length);
    if (missing > 0) {
      throw new Error(`${name}/${viewport.key}: ${missing} image(s) failed to load`);
    }

    const measured = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      height: document.documentElement.scrollHeight,
    }));
    heights[`${name}/${viewport.key}`] = measured;

    if (!measureOnly) {
      await page.screenshot({
        fullPage: true,
        path: path.join(outDir, dir, `${name}-${viewport.key}.png`),
      });
    }
    await page.close();
  }
}

await browser.close();

for (const [key, value] of Object.entries(heights)) {
  console.log(`${key.padEnd(24)} ${String(value.height).padStart(6)}px  overflow=${value.overflow}`);
}
console.log(`\nwritten to ${path.relative(root, outDir)}`);
