/**
 * USA-170 — beginning-to-end participant smoke test.
 *
 * Drives the real built app in a real browser at Tanner's iPhone width and at
 * desktop, through the whole path that failed in production:
 *
 *   leader preview -> fresh invitation -> unfurler HEAD/GET -> human redemption
 *   -> Group Home -> Journey -> install help -> recovery screen
 *
 * Deliberately not a component test. The production defect was invisible at the
 * component level: every piece worked, and the flow still locked Tanner out.
 *
 * Run: npm run test:dos-participant-e2e
 *
 * Scope honesty: this runs against the demo-safe participant pipeline, which is
 * the only participant identity an automated run may touch. Demo tokens are
 * stateless by design, so the *stateful* guarantee (a GET never marks a real
 * token `used`) is proven separately, against the database-backed path, by
 * scripts/dos-invitation-crawler-safety-regression.mjs.
 */

import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const host = "127.0.0.1";
const port = Number(process.env.E2E_PORT || 4324);
const baseUrl = `http://${host}:${port}`;
const shotsDir = process.env.E2E_SHOTS || "test-results/usa-170-e2e";
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

function invitationToken(overrides = {}) {
  const payload = {
    completedSessionIds: ["marks-of-discipleship-week-1"],
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    groupId: "demo-group-wednesday-mens",
    groupName: "Wednesday Men's Group",
    groupSlug: "wednesday-mens-group",
    identityId: "demo-identity-e2e",
    memberId: "demo-group-wednesday-member-tanner",
    personId: "demo-person-tanner-kent",
    personName: "Tanner Kent",
    resourceSlug: "marks-of-discipleship",
    startDate: "2026-08-12",
    ...overrides,
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

/** Any element escaping the viewport, or clipped content in a visible-overflow box. */
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

async function runViewport(browser, label, viewport) {
  const context = await browser.newContext({ deviceScaleFactor: 2, viewport });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));

  const token = invitationToken();
  const invitationUrl = `${baseUrl}/groups/wednesday-mens-group/member/access?token=${encodeURIComponent(token)}`;

  /* --- 1. The unfurler looks first. -------------------------------- */
  const head = await fetch(invitationUrl, { method: "HEAD", redirect: "manual" });
  check(head.status < 400, `[${label}] HEAD on a fresh invitation renders (${head.status}).`);
  check(
    !(head.headers.get("set-cookie") ?? "").includes("dos_group_member_session="),
    `[${label}] HEAD does not establish a member session.`,
  );

  for (let i = 1; i <= 2; i += 1) {
    const get = await fetch(invitationUrl, { redirect: "manual" });
    check(get.status === 200, `[${label}] Unfurler GET #${i} renders the confirmation page (${get.status}).`);
    check(
      !(get.headers.get("set-cookie") ?? "").includes("dos_group_member_session="),
      `[${label}] Unfurler GET #${i} does not establish a member session.`,
    );
  }

  /* --- 2. Tanner opens the same link, after the unfurl. ------------ */
  await page.goto(invitationUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.screenshot({ fullPage: true, path: `${shotsDir}/${label}-1-invitation.png` });

  const invitationBody = await page.locator("body").innerText();
  check(
    /Open Group Home/.test(invitationBody),
    `[${label}] The invitation is still redeemable after HEAD + 2 unfurler GETs.`,
  );
  check(!/no longer active/i.test(invitationBody), `[${label}] Unfurling did not expire the invitation.`);
  check(!/Tanner/.test(invitationBody), `[${label}] The invitation page does not expose the participant's name.`);
  const invitationOverflow = await overflow(page);
  check(
    invitationOverflow.offenders.length === 0 && invitationOverflow.bodyScrollWidth <= invitationOverflow.docWidth,
    `[${label}] Invitation page has no overflow (${invitationOverflow.offenders.join(", ") || "clean"}).`,
  );

  /* --- 3. Explicit human redemption. ------------------------------- */
  await page.getByRole("button", { name: /Open Group Home/ }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ fullPage: true, path: `${shotsDir}/${label}-2-group-home.png` });

  const homeUrl = page.url();
  check(/\/groups\/wednesday-mens-group/.test(homeUrl), `[${label}] Redemption lands on canonical Group Home (${homeUrl}).`);

  const homeBody = await page.locator("body").innerText();
  check(/Signed in as Tanner Kent/.test(homeBody), `[${label}] Group Home resolves Tanner's identity.`);
  check(/Wednesday Men's Group/.test(homeBody), `[${label}] Group Home shows the Group identity.`);
  check(/next gathering|meets/i.test(homeBody), `[${label}] Group Home shows the canonical next gathering.`);
  check(/Continue|Review/.test(homeBody), `[${label}] Group Home offers Continue on the current Journey.`);
  check(/Add DOS to your Home Screen/.test(homeBody), `[${label}] Install help is present.`);

  // Install help must be collapsed until asked for.
  const installRow = page.getByRole("button", { name: /Add DOS to your Home Screen/ }).first();
  check(await installRow.getAttribute("aria-expanded") === "false", `[${label}] Install instructions start collapsed.`);
  await installRow.click();
  await page.waitForTimeout(300);
  check(await installRow.getAttribute("aria-expanded") === "true", `[${label}] Install instructions expand only on tap.`);
  await page.screenshot({ fullPage: true, path: `${shotsDir}/${label}-3-install-expanded.png` });

  // DOS light/blue, not the retired treatment.
  // The root layout's <body> also carries `min-h-screen` with the legacy dark
  // brand background, so target the Community shell explicitly — that is the
  // element whose background the participant actually sees.
  const palette = await page.evaluate(() => {
    const shell = document.querySelector("main[class*='background-color:#F8FBFF']")
      ?? document.querySelector("[class*='background-color:#F8FBFF']");
    return {
      pageBackground: shell ? getComputedStyle(shell).backgroundColor : null,
    };
  });
  check(palette.pageBackground === "rgb(248, 251, 255)", `[${label}] Group Home uses the DOS light page surface (${palette.pageBackground}).`);

  const homeOverflow = await overflow(page);
  check(
    homeOverflow.bodyScrollWidth <= homeOverflow.docWidth,
    `[${label}] Group Home has no horizontal page scroll (${homeOverflow.bodyScrollWidth} vs ${homeOverflow.docWidth}).`,
  );

  /* --- 4. Session persists across a close/reopen. ------------------ */
  const reopened = await context.newPage();
  await reopened.goto(`${baseUrl}/groups/wednesday-mens-group`, { waitUntil: "networkidle" });
  await reopened.waitForTimeout(500);
  const reopenedBody = await reopened.locator("body").innerText();
  check(
    /Signed in as Tanner Kent/.test(reopenedBody),
    `[${label}] Reopening the Group URL resumes the scoped session instead of showing a request form.`,
  );
  await reopened.screenshot({ fullPage: true, path: `${shotsDir}/${label}-4-reopened.png` });
  await reopened.close();

  /* --- 5. Journey opens and carries completed history. ------------- */
  await page.goto(`${baseUrl}/groups/wednesday-mens-group/journey?resource=marks-of-discipleship`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.screenshot({ fullPage: true, path: `${shotsDir}/${label}-5-journey.png` });
  const journeyBody = await page.locator("body").innerText();
  check(journeyBody.trim().length > 100, `[${label}] Journey renders for the scoped member.`);
  const journeyOverflow = await overflow(page);
  check(
    journeyOverflow.bodyScrollWidth <= journeyOverflow.docWidth,
    `[${label}] Journey has no horizontal page scroll.`,
  );

  /* --- 6. Recovery screen language and layout. --------------------- */
  const recovery = await browser.newContext({ deviceScaleFactor: 2, viewport });
  const recoveryPage = await recovery.newPage();
  await recoveryPage.goto(`${baseUrl}/groups/wednesday-mens-group/member?state=access-expired`, { waitUntil: "networkidle" });
  await recoveryPage.waitForTimeout(400);
  await recoveryPage.screenshot({ fullPage: true, path: `${shotsDir}/${label}-6-recovery.png` });

  const recoveryBody = await recoveryPage.locator("body").innerText();
  check(!/Sign in to your group\./.test(recoveryBody), `[${label}] Recovery no longer calls itself a member sign-in.`);
  check(!/Request Access Link/i.test(recoveryBody), `[${label}] Recovery drops the old jargon CTA.`);
  check(/new Group link/i.test(recoveryBody), `[${label}] Recovery offers a leader-assisted new Group link.`);
  check(/Sign in with your DOS account/.test(recoveryBody), `[${label}] Recovery offers real account sign-in separately.`);
  check(/no longer active/i.test(recoveryBody), `[${label}] Recovery states the expired reason accurately.`);

  const recoveryOverflow = await overflow(recoveryPage);
  check(
    recoveryOverflow.offenders.length === 0 && recoveryOverflow.bodyScrollWidth <= recoveryOverflow.docWidth,
    `[${label}] Recovery screen is not clipped at the viewport edge (${recoveryOverflow.offenders.join(", ") || "clean"}).`,
  );

  const recoveryPalette = await recoveryPage.evaluate(() => {
    const shell = document.querySelector("main[class*='background-color:#F8FBFF']")
      ?? document.querySelector("[class*='background-color:#F8FBFF']");
    return shell ? getComputedStyle(shell).backgroundColor : null;
  });
  check(recoveryPalette === "rgb(248, 251, 255)", `[${label}] Recovery screen uses the DOS light surface (${recoveryPalette}).`);
  await recovery.close();

  /* --- 7. A spent invitation degrades honestly. -------------------- */
  const spent = await browser.newContext({ viewport });
  const spentPage = await spent.newPage();
  await spentPage.goto(`${baseUrl}/groups/wednesday-mens-group/member/access?token=not-a-real-token`, { waitUntil: "networkidle" });
  const spentBody = await spentPage.locator("body").innerText();
  check(/no longer active|not valid|turned off/i.test(spentBody), `[${label}] An unusable invitation explains itself.`);
  check(/new Group link/i.test(spentBody), `[${label}] An unusable invitation offers a recovery next step.`);
  await spentPage.screenshot({ fullPage: true, path: `${shotsDir}/${label}-7-invalid-invitation.png` });
  await spent.close();

  check(pageErrors.length === 0, `[${label}] No uncaught page errors (${pageErrors.slice(0, 2).join(" | ") || "none"}).`);

  await context.close();
}

let exitCode = 0;

try {
  await waitForServer();
  const browser = await chromium.launch(executablePath ? { executablePath } : {});

  try {
    await runViewport(browser, "iphone-390x844", { height: 844, width: 390 });
    await runViewport(browser, "desktop-1440x900", { height: 900, width: 1440 });
  } finally {
    await browser.close();
  }
} catch (error) {
  failures.push(`Smoke run could not complete: ${error instanceof Error ? error.message : error}`);
} finally {
  server.kill("SIGTERM");
  await delay(500);
  if (!server.killed) server.kill("SIGKILL");
}

const passed = results.filter((entry) => entry.ok).length;

console.log(`\ndos-participant-e2e-smoke: ${passed}/${results.length} checks passed`);
for (const entry of results) {
  console.log(`  ${entry.ok ? "PASS" : "FAIL"}  ${entry.message}`);
}

if (failures.length) {
  exitCode = 1;
  console.error(`\ndos-participant-e2e-smoke: FAILED (${failures.length})`);
}

console.log(`\nScreenshots: ${shotsDir}`);
process.exit(exitCode);
