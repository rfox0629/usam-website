/**
 * USA-170 — leader-side + save/resume + scope-isolation smoke.
 *
 * Companion to dos-participant-e2e-smoke.mjs, covering the founder's remaining
 * end-to-end requirements in a real browser against the built app:
 *
 *   1. Leader view: each member row states one of the four identity
 *      conditions (Person only / Scoped access active / Invitation expired /
 *      Linked DOS account) and carries the `Send {First} a fresh link` action,
 *      with no overflow at 390x844 or 1440x900.
 *   2. Participant Journey: type a reflection, Save, land on the saved state,
 *      then reopen the Group URL and resume the scoped session.
 *   3. Scope isolation: Tanner's scoped session opens his own Group Home only —
 *      another Group's page stays public, and the full DOS app stays closed.
 *
 * Run: npm run test:dos-leader-e2e
 * Env: E2E_CHROMIUM=/path/to/chromium to reuse a preinstalled browser.
 */

import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const host = "127.0.0.1";
const port = Number(process.env.E2E_PORT || 4326);
const baseUrl = `http://${host}:${port}`;
const shotsDir = process.env.E2E_SHOTS || "test-results/usa-170-e2e-leader";
const executablePath = process.env.E2E_CHROMIUM || undefined;

mkdirSync(shotsDir, { recursive: true });

const results = [];
const failures = [];

function check(condition, message) {
  results.push({ ok: Boolean(condition), message });

  if (!condition) {
    failures.push(message);
  }

  return Boolean(condition);
}

function invitationToken() {
  const payload = {
    completedSessionIds: ["marks-of-discipleship-week-1"],
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    groupId: "demo-group-wednesday-mens",
    groupName: "Wednesday Men's Group",
    groupSlug: "wednesday-mens-group",
    identityId: "demo-identity-leader-e2e",
    memberId: "demo-group-wednesday-member-tanner",
    personId: "demo-person-tanner-kent",
    personName: "Tanner Kent",
    resourceSlug: "marks-of-discipleship",
    startDate: "2026-08-12",
  };

  return `demo_group_member_access.${Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")}`;
}

const server = spawn("npm", ["run", "start", "--", "--hostname", host, "--port", String(port)], {
  env: { ...process.env, HOSTNAME: host, NEXT_TELEMETRY_DISABLED: "1", PORT: String(port), VERCEL_ENV: "preview" },
  stdio: ["ignore", "pipe", "pipe"],
});

let serverLog = "";
server.stdout.on("data", (chunk) => { serverLog += chunk.toString(); });
server.stderr.on("data", (chunk) => { serverLog += chunk.toString(); });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForServer() {
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl, { redirect: "manual" });
      if (response.status < 500) return;
    } catch { /* not up yet */ }
    await delay(1000);
  }

  throw new Error(`Server did not start.\n${serverLog}`);
}

async function overflow(page) {
  return page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth;
    const offenders = [];

    for (const el of document.querySelectorAll("body *")) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      if (rect.right > docWidth + 1 || rect.left < -1) {
        offenders.push(`${el.tagName.toLowerCase()}.${(el.className || "").toString().slice(0, 40)}`);
      }
    }

    return { bodyScrollWidth: document.body.scrollWidth, docWidth, offenders: offenders.slice(0, 6) };
  });
}

async function openWednesdayPeopleTab(page, label, isMobile) {
  await page.goto(`${baseUrl}/dos/app/preview?demo=dos2026`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  if (isMobile) {
    await page.getByRole("button", { name: "More", exact: true }).click();
    await page.waitForTimeout(600);
  }

  await page.getByRole("button", { name: /Groups/ }).first().click();
  await page.waitForTimeout(1200);
  await page.getByText("Wednesday Men's Group").first().click();
  await page.waitForTimeout(1200);

  const peopleTab = page.getByRole("button", { name: "People", exact: true }).first();

  check(await peopleTab.count() === 1, `[${label}] Group detail exposes the People tab.`);
  await peopleTab.click();
  await page.waitForTimeout(1000);
}

async function runLeaderViewport(browser, label, viewport) {
  const context = await browser.newContext({ deviceScaleFactor: 2, viewport });
  const page = await context.newPage();
  const pageErrors = [];

  page.on("pageerror", (error) => pageErrors.push(String(error)));

  await openWednesdayPeopleTab(page, label, viewport.width < 640);
  await page.screenshot({ fullPage: true, path: `${shotsDir}/${label}-people-tab.png` });

  const body = await page.locator("body").innerText();

  // The four identity conditions, tokenlessly. "Person only" belongs to a
  // member with no scoped identity at all — the Tuesday group demo members.
  check(body.includes("Linked DOS account"), `[${label}] Members panel states the linked-account condition.`);
  check(body.includes("Invitation expired"), `[${label}] Members panel states the expired-invitation condition.`);
  check(body.includes("Scoped access active"), `[${label}] Members panel states the active scoped-access condition.`);
  check(!body.includes("Portal: "), `[${label}] The old Portal: labels are gone.`);

  const freshLink = page.getByRole("button", { name: "Send Tanner a fresh link" });

  check(await freshLink.count() === 1, `[${label}] Leader has the Send Tanner a fresh link action.`);

  const flow = await overflow(page);

  check(
    flow.bodyScrollWidth <= flow.docWidth && flow.offenders.length === 0,
    `[${label}] People tab has no overflow (${flow.bodyScrollWidth} vs ${flow.docWidth}${flow.offenders.length ? `; ${flow.offenders.join(", ")}` : ""}).`,
  );

  // "Person only" needs a group whose demo members carry no scoped identity.
  await page.goto(`${baseUrl}/dos/app/preview?demo=dos2026`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  if (viewport.width < 640) {
    await page.getByRole("button", { name: "More", exact: true }).click();
    await page.waitForTimeout(600);
  }

  await page.getByRole("button", { name: /Groups/ }).first().click();
  await page.waitForTimeout(1200);

  const tuesday = page.getByText("Tuesday Men's Group").first();

  if (await tuesday.count()) {
    await tuesday.click();
    await page.waitForTimeout(1200);

    const peopleTab = page.getByRole("button", { name: "People", exact: true }).first();

    if (await peopleTab.count()) {
      await peopleTab.click();
      await page.waitForTimeout(900);
      check((await page.locator("body").innerText()).includes("Person only"), `[${label}] A member with no scoped identity reads Person only.`);
    }
  }

  check(pageErrors.length === 0, `[${label}] No uncaught page errors on leader surfaces (${pageErrors.length ? pageErrors[0] : "none"}).`);
  await context.close();
}

async function runParticipantSaveResume(browser) {
  const label = "mobile-390x844";
  const context = await browser.newContext({ deviceScaleFactor: 2, viewport: { height: 844, width: 390 } });
  const page = await context.newPage();
  const pageErrors = [];

  page.on("pageerror", (error) => pageErrors.push(String(error)));

  // Redeem a fresh invitation the human way: land, then POST.
  await page.goto(`${baseUrl}/groups/wednesday-mens-group/member/access?token=${invitationToken()}`, { waitUntil: "networkidle" });

  const openButton = page.getByRole("button", { name: "Open Group Home" });

  check(await openButton.count() === 1, `[${label}] Invitation offers the explicit Open Group Home action.`);
  await openButton.click();
  await page.waitForURL(/state=signed-in/, { timeout: 15_000 });

  // Into the Journey, write, save.
  await page.getByText("Continue", { exact: true }).first().click();
  await page.waitForURL(/\/journey/, { timeout: 15_000 });
  await page.waitForTimeout(800);

  const reflection = page.locator("textarea[name='reflection']").first();

  check(await reflection.count() === 1, `[${label}] Journey offers the reflection field.`);
  await reflection.fill("Grateful for this week's passage — e2e smoke reflection.");
  await page.getByRole("button", { name: "Save", exact: true }).first().click();
  await page.waitForURL(/state=journey-saved/, { timeout: 15_000 });

  const savedBody = await page.locator("body").innerText();

  check(savedBody.includes("Saved. You can come back and finish this any time."), `[${label}] Save lands on the saved state with resume language.`);
  await page.screenshot({ fullPage: true, path: `${shotsDir}/${label}-journey-saved.png` });

  // Close and reopen: the scoped session resumes without any re-redemption.
  const reopened = await context.newPage();

  await reopened.goto(`${baseUrl}/groups/wednesday-mens-group`, { waitUntil: "networkidle" });

  const reopenedBody = await reopened.locator("body").innerText();

  check(reopenedBody.includes("Signed in as Tanner Kent"), `[${label}] Reopening resumes Tanner's scoped session.`);
  check(reopenedBody.includes("Continue"), `[${label}] Resumed Group Home still offers Continue.`);

  /* --- Scope isolation. --------------------------------------------- */

  await reopened.goto(`${baseUrl}/groups/tuesday-mens-group`, { waitUntil: "networkidle" });

  const otherGroupBody = await reopened.locator("body").innerText();

  check(!otherGroupBody.includes("Signed in as"), `[${label}] Tanner's session does not open another Group's member Home.`);

  const dosResponse = await reopened.goto(`${baseUrl}/dos/app`, { waitUntil: "networkidle" });
  const dosBody = await reopened.locator("body").innerText();
  const dosUrl = reopened.url();

  check(
    !dosBody.includes("Log Meeting") && !dosBody.includes("Discipleship on the go"),
    `[${label}] Tanner's scoped session cannot open the full DOS app (landed on ${dosUrl}, status ${dosResponse?.status() ?? "?"}).`,
  );

  check(pageErrors.length === 0, `[${label}] No uncaught page errors on participant surfaces (${pageErrors.length ? pageErrors[0] : "none"}).`);
  await context.close();
}

async function main() {
  await waitForServer();

  const browser = await chromium.launch({ executablePath });

  await runLeaderViewport(browser, "mobile-390x844", { height: 844, width: 390 });
  await runLeaderViewport(browser, "desktop-1440x900", { height: 900, width: 1440 });
  await runParticipantSaveResume(browser);
  await browser.close();
}

try {
  await main();
} finally {
  server.kill("SIGTERM");
}

for (const result of results) {
  console.log(`  ${result.ok ? "PASS " : "FAIL "} ${result.message}`);
}

console.log(`\nScreenshots: ${shotsDir}`);

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed.`);
  process.exit(1);
}
