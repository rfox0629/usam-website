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

/**
 * USA-170 founder follow-up: Preview as Member is a click-through QA flow on
 * the real shared components — Group Home -> Journey -> response -> save ->
 * return -> reopen — with an unmistakable indicator, zero writes, and no
 * leader surfaces reachable inside the overlay.
 */
async function runPreviewAsMember(browser, label, viewport) {
  const context = await browser.newContext({ deviceScaleFactor: 2, viewport });
  const page = await context.newPage();
  const pageErrors = [];
  const writeRequests = [];

  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("request", (request) => {
    if (["DELETE", "PATCH", "POST", "PUT"].includes(request.method())) {
      writeRequests.push(`${request.method()} ${request.url()}`);
    }
  });

  await page.goto(`${baseUrl}/dos/app/preview?demo=dos2026`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  if (viewport.width < 640) {
    await page.getByRole("button", { name: "More", exact: true }).click();
    await page.waitForTimeout(600);
  }

  await page.getByRole("button", { name: /Groups/ }).first().click();
  await page.waitForTimeout(1200);
  await page.getByText("Wednesday Men's Group").first().click();
  await page.waitForTimeout(1200);

  const journeysTab = page.getByRole("button", { name: "Journeys", exact: true }).first();

  await journeysTab.click();
  await page.waitForTimeout(1000);

  const writesBeforePreview = writeRequests.length;
  const previewButton = page.getByRole("button", { name: /Preview Tanner's Experience/ }).first();

  check(await previewButton.count() === 1, `[${label}] Journeys tab offers Preview Tanner's Experience.`);
  await previewButton.click();
  await page.waitForTimeout(900);

  /* --- Overlay: indicator + permission realism. -------------------- */
  const overlayBar = page.getByText("Preview as Member", { exact: false }).first();

  check(await overlayBar.count() >= 1, `[${label}] The Preview as Member indicator is visible.`);
  check(await page.getByText("nothing you do here is saved").count() >= 1, `[${label}] The indicator states nothing is saved.`);
  check(await page.getByRole("button", { name: "Exit Preview" }).count() === 1, `[${label}] Exit Preview is available.`);

  // The overlay must own the viewport: whatever sits at the leader-nav
  // position must be inside the preview dialog, not the DOS app behind it.
  const navCovered = await page.evaluate(() => {
    const dialog = document.querySelector("[role='dialog']");
    if (!dialog) return false;
    const probes = [
      [24, window.innerHeight - 24],
      [window.innerWidth / 2, window.innerHeight - 24],
      [24, window.innerHeight / 2],
    ];
    return probes.every(([x, y]) => {
      const el = document.elementFromPoint(x, y);
      return el !== null && dialog.contains(el);
    });
  });

  check(navCovered, `[${label}] No leader navigation is reachable inside the preview overlay.`);
  await page.screenshot({ path: `${shotsDir}/${label}-preview-home.png` });

  const homeBody = await page.locator("[role='dialog']").innerText();

  check(homeBody.includes("Signed in as Tanner Kent"), `[${label}] Preview Group Home carries Tanner's identity line.`);

  /* --- Click through: Group Home -> Journey. ------------------------ */
  await page.locator("[role='dialog']").getByText("Continue", { exact: true }).first().click();
  await page.waitForTimeout(900);

  const journeyBody = await page.locator("[role='dialog']").innerText();

  check(journeyBody.includes("What stood out?"), `[${label}] Preview Journey shows the canonical prompt.`);
  // The canonical helper varies by week shape (single chapter, multi-chapter,
  // reading plan) — accept any canonical variant, reject absence.
  check(
    journeyBody.includes("What stood out to you as you considered this question")
      || journeyBody.includes("Looking across both chapters and questions, what stood out most?"),
    `[${label}] Preview Journey shows the visible canonical helper.`,
  );
  check(journeyBody.includes("Preview as Member"), `[${label}] The preview indicator stays visible inside the Journey.`);
  await page.screenshot({ path: `${shotsDir}/${label}-preview-journey.png` });

  /* --- Respond, save, return, reopen — all in overlay memory. ------- */
  const reflection = page.locator("[role='dialog'] textarea[name='reflection']").first();

  await reflection.fill("Preview QA reflection — must never persist.");
  await page.locator("[role='dialog']").getByRole("button", { name: "Save", exact: true }).first().click();
  await page.waitForTimeout(600);

  const savedBody = await page.locator("[role='dialog']").innerText();

  check(
    savedBody.includes("Saved. You can come back and finish this any time."),
    `[${label}] Preview save shows the same saved state as the real Journey.`,
  );

  // Return to Group Home via Back to Group, then reopen.
  await page.locator("[role='dialog']").getByRole("button", { name: "Back to Group" }).first().click();
  await page.waitForTimeout(700);
  check(
    (await page.locator("[role='dialog']").innerText()).includes("Signed in as Tanner Kent"),
    `[${label}] Returning lands back on the preview Group Home.`,
  );

  await page.locator("[role='dialog']").getByText("Continue", { exact: true }).first().click();
  await page.waitForTimeout(700);

  const draftValue = await page.locator("[role='dialog'] textarea[name='reflection']").first().inputValue();

  check(
    draftValue === "Preview QA reflection — must never persist.",
    `[${label}] Reopening the Journey retains the preview draft (save -> return -> reopen works).`,
  );

  /* --- Zero writes. -------------------------------------------------- */
  check(
    writeRequests.length === writesBeforePreview,
    `[${label}] The entire preview flow sent zero write requests (${writeRequests.slice(writesBeforePreview).join("; ") || "none"}).`,
  );

  await page.getByRole("button", { name: "Exit Preview" }).click();
  await page.waitForTimeout(500);
  check(
    await page.locator("[role='dialog']").count() === 0,
    `[${label}] Exit Preview closes the overlay and returns to the leader app.`,
  );

  check(pageErrors.length === 0, `[${label}] No uncaught page errors in the preview flow (${pageErrors[0] ?? "none"}).`);
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
  await runPreviewAsMember(browser, "preview-mobile-390x844", { height: 844, width: 390 });
  await runPreviewAsMember(browser, "preview-desktop-1440x900", { height: 900, width: 1440 });
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
