/**
 * USA-191 preview evidence.
 *
 * Drives the /join experience end to end at desktop and 390px and writes the
 * screenshots the founder review package is built from. Run it against a
 * production build, so what is captured is what would ship:
 *
 *   npm run build
 *   npx next start --hostname 127.0.0.1 --port 4300 &
 *   JOIN_PREVIEW_ACCESS_KEY=anything npx next start --hostname 127.0.0.1 --port 4301 &
 *   node scripts/usa-191-preview-capture.mjs
 *
 * The second server exists only to photograph the founder gate, which is
 * invisible when no access key is configured.
 *
 * The draft and application endpoints are stubbed in the browser, not in the
 * app. A capture host has no Supabase credentials, so without the stubs every
 * screenshot would show a save-retry state that exists nowhere but here, and
 * the submitted screen could not be reached at all. Nothing else is altered.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const EXEC = process.env.USA191_CHROMIUM || undefined;
const BASE = "http://127.0.0.1:4300";
const OUT = process.env.USA191_OUT || "docs/usa-191-review";

mkdirSync(`${OUT}/desktop`, { recursive: true });
mkdirSync(`${OUT}/mobile`, { recursive: true });

const SETTLE = 2200;

/**
 * The draft endpoint needs Supabase, which this preview host has no
 * credentials for. Stubbing it lets the screenshots show the flow in its
 * normal saved state rather than in a permanent retry state that only exists
 * because the capture box has no database.
 */
async function stubDraft(page) {
  await page.route("**/api/join/draft", (route) =>
    route.fulfill({
      body: JSON.stringify({ emailSent: true, resumeToken: "usa-191-preview-token" }),
      contentType: "application/json",
      status: 200,
    }),
  );
}

const shot = async (page, dir, name, opts = {}) => {
  await page.waitForTimeout(opts.wait ?? 700);
  await page.screenshot({ fullPage: opts.fullPage ?? true, path: `${OUT}/${dir}/${name}.png` });
  console.log(`  captured ${dir}/${name}`);
};

async function fillIdentity(page) {
  await page.fill("#applicant-firstName", "Daniel");
  await page.fill("#applicant-lastName", "Ruiz");
  await page.fill("#applicant-email", "daniel.ruiz@example.org");
  await page.fill("#applicant-phone", "(555) 214-8890");
}

/** Clicks a step in the sticky rail by its accessible name. */
async function gotoStep(page, title) {
  await page.click(`.join-rail button[aria-label="${title}"]`);
  await page.waitForTimeout(650);
}

async function nextPart(page) {
  await page.click(".join-footer .join-button-primary");
  await page.waitForTimeout(650);
}

/** Advances with Continue until `probe` matches, so the walk survives the
    page model changing shape underneath it. */
async function advanceUntil(page, probe, max = 14) {
  for (let i = 0; i < max; i += 1) {
    if (await page.$(probe)) {
      return true;
    }

    const next = await page.$(".join-footer .join-button-primary");

    if (!next) {
      return false;
    }

    await next.click();
    await page.waitForTimeout(420);
  }

  return Boolean(await page.$(probe));
}

async function run(label, viewport, dir, extra = {}) {
  const browser = await chromium.launch({ executablePath: EXEC });
  const context = await browser.newContext({
    deviceScaleFactor: 2,
    viewport,
    ...extra,
  });
  const page = await context.newPage();

  await stubDraft(page);

  console.log(`\n${label}`);

  // 01 the opening
  await page.goto(`${BASE}/join`, { waitUntil: "networkidle" });
  await page.waitForTimeout(SETTLE);
  await shot(page, dir, "01-welcome", { fullPage: false });
  await shot(page, dir, "01b-welcome-full");

  // 02 identity
  await page.click(".join-welcome-actions .join-button-primary");
  await page.waitForTimeout(900);
  await shot(page, dir, "02-about-identity");

  await fillIdentity(page);
  await page.check('.join-check input[type="checkbox"]');
  await page.waitForTimeout(450);
  await shot(page, dir, "03-about-couple");

  // 04 a run of short factual fields kept on one screen
  await nextPart(page);
  await shot(page, dir, "04-about-household");

  // 05 a narrative question owning its screen
  await gotoStep(page, "Your Story");
  await page.fill(
    "#story\\.testimony",
    "I grew up two streets from the church and never once walked in. A neighbour kept inviting us to dinner, and it was at that table, not in a service, that somebody finally explained the gospel to me in words I could hold.",
  );
  await page.waitForTimeout(400);
  await shot(page, dir, "05-story-longform");

  // 06 the branch
  await gotoStep(page, "Support and Fundraising");
  await shot(page, dir, "06-support-path");

  await page.click('.join-choice:has(.join-choice-title:text-is("Yes"))');
  await page.waitForTimeout(450);
  await shot(page, dir, "07-support-path-chosen");

  // 08 the private 17 category worksheet
  await advanceUntil(page, "#supportBudget\\.housing");
  await page.fill("#supportBudget\\.housing", "2400");
  await page.fill("#supportBudget\\.foodHousehold", "900");
  await page.fill("#supportBudget\\.utilities", "260");
  await page.fill("#supportBudget\\.transportation", "410");
  await page.fill("#supportBudget\\.hospitalityMeals", "300");
  await page.fill("#supportBudget\\.localTravel", "180");
  await page.waitForTimeout(450);
  await shot(page, dir, "08-support-worksheet");

  // 09 the support picture
  await advanceUntil(page, "#supportMonthlyNeed");
  await page.fill("#supportMonthlyNeed", "4450");
  await page.fill("#supportCommittedAmount", "1200");
  await page.fill("#supportRequestedGoal", "4450");
  await page.waitForTimeout(450);
  await shot(page, dir, "09-support-picture");

  // 10 photos
  await gotoStep(page, "Build Your Missionary Profile");
  await advanceUntil(page, ".join-photos");
  await shot(page, dir, "10-profile-photos");

  // 11 review
  await advanceUntil(page, ".join-review-list");
  await shot(page, dir, "11-review");

  await browser.close();
}

const VIEWPORTS = [
  { dir: "desktop", extra: {}, viewport: { height: 900, width: 1440 } },
  { dir: "mobile", extra: { hasTouch: true, isMobile: true }, viewport: { height: 844, width: 390 } },
];

async function stub(page) {
  await stubDraft(page);
  await page.route("**/api/join/application", (route) =>
    route.fulfill({
      body: JSON.stringify({ applicationId: "usam-app-2026-0417-rui" }),
      contentType: "application/json",
      status: 200,
    }),
  );
}

/** Fills every question on the current screen with plausible sample material. */
async function fillScreen(page) {
  const textareas = await page.$$(".join-stage textarea");

  for (const area of textareas) {
    if (await area.inputValue()) continue;
    await area.fill(
      "We have spent the last six years in the same neighbourhood, at the same table, with the same families. This is the work we believe God has already been doing through us, and the work we are asking to give ourselves to fully.",
    );
  }

  const inputs = await page.$$('.join-stage input[type="text"], .join-stage input[type="email"]');

  for (const input of inputs) {
    if (await input.inputValue()) continue;

    const id = (await input.getAttribute("id")) ?? "";
    const money = (await input.getAttribute("inputmode")) === "decimal";

    if (money) {
      await input.fill("350");
    } else if (id.includes("email")) {
      await input.fill("daniel.ruiz@example.org");
    } else if (id.includes("firstName")) {
      await input.fill("Daniel");
    } else if (id.includes("lastName")) {
      await input.fill("Ruiz");
    } else if (id.includes("phone")) {
      await input.fill("(555) 214-8890");
    } else {
      await input.fill("Waco, Texas");
    }
  }

  // Acknowledgements yes, the couple toggle no: checking it would add a second
  // person's required fields to a run that is only trying to reach the end.
  const checks = await page.$$(".join-stage .join-check");

  for (const check of checks) {
    const text = (await check.innerText()).toLowerCase();

    if (text.includes("applying as a couple")) continue;

    const box = await check.$('input[type="checkbox"]');

    if (box && !(await box.isChecked())) {
      await box.check();
    }
  }

  // The support path is a choice, and nothing advances until one is made.
  const yes = await page.$('.join-choice:has(.join-choice-title:text-is("Yes"))');

  if (yes && (await yes.getAttribute("aria-pressed")) !== "true") {
    await yes.click();
  }
}

async function runSubmitted({ dir, extra, viewport }) {
  const browser = await chromium.launch({ executablePath: EXEC });
  const context = await browser.newContext({ deviceScaleFactor: 2, viewport, ...extra });
  const page = await context.newPage();

  await stub(page);
  await page.goto("http://127.0.0.1:4300/join", { waitUntil: "networkidle" });
  await page.waitForTimeout(1800);
  await page.click(".join-welcome-actions .join-button-primary");
  await page.waitForTimeout(800);

  for (let i = 0; i < 70; i += 1) {
    await fillScreen(page);
    await page.waitForTimeout(160);

    const next = await page.$(".join-footer .join-button-primary");

    if (!next) break; // the review step has no advance control

    await next.click();
    await page.waitForTimeout(420);
  }

  await page.waitForTimeout(600);
  await page.screenshot({ fullPage: true, path: `${OUT}/${dir}/12-review-complete.png` });
  console.log(`  captured ${dir}/12-review-complete`);

  await page.click('.join-fields .join-button-primary:has-text("Submit application")');
  await page.waitForTimeout(2200);
  await page.screenshot({ fullPage: true, path: `${OUT}/${dir}/13-submitted.png` });
  console.log(`  captured ${dir}/13-submitted`);

  await browser.close();
}

async function runGate({ dir, extra, viewport }) {
  const browser = await chromium.launch({ executablePath: EXEC });
  const context = await browser.newContext({ deviceScaleFactor: 2, viewport, ...extra });
  const page = await context.newPage();

  await page.goto("http://127.0.0.1:4301/join", { waitUntil: "networkidle" });
  await page.waitForTimeout(1800);
  await page.screenshot({ fullPage: false, path: `${OUT}/${dir}/00-founder-gate.png` });
  console.log(`  captured ${dir}/00-founder-gate`);

  await browser.close();
}

for (const target of VIEWPORTS) {
  const label = target.dir === "desktop" ? "Desktop 1440x900" : "Mobile 390x844";

  await runGate(target);
  await run(label, target.viewport, target.dir, target.extra);
  await runSubmitted(target);
}

console.log("\ndone");
