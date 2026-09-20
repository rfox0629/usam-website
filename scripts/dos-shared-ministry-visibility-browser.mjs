/* USA-276 browser check — the reported case, clicked.
 *
 * Boots the production build against the token-gated demo route (synthetic
 * data, no database, nobody's real record) and drives the real UI at mobile
 * and desktop widths.
 *
 * The fixture is the reported case: ONE canonical meeting Ryan logged with
 * Samuel Gaffney and Skylar Gaffney, with Brooke Fox added under More people →
 * Ministry Team as the picker's "Team" result (roster id, no field person id).
 *
 *   npm run test:dos-shared-ministry-visibility:browser
 *
 * Requires `npm run build` first. Set DOS_SMB_BASE to point at an already
 * running server instead of booting one.
 */
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const host = "127.0.0.1";
const port = Number(process.env.DOS_SMB_PORT || 4197);
const externalBase = process.env.DOS_SMB_BASE?.trim() || "";
const baseUrl = externalBase || `http://${host}:${port}`;
const token = process.env.DOS_PREVIEW_TOKEN?.trim() || "dos2026";
const demoNowIso = process.env.DOS_DEMO_NOW?.trim() || "2026-09-20T12:00:00-05:00";
const executablePath = process.env.DOS_CHROMIUM_PATH?.trim() || undefined;

const failures = [];
function check(name, passed, detail = "") {
  console.log(`${passed ? "  PASS" : "  FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);

  if (!passed) {
    failures.push(name);
  }
}

let server = null;

async function startServer() {
  if (externalBase) {
    return;
  }

  server = spawn("npx", ["next", "start", "-H", host, "-p", String(port)], {
    env: { ...process.env, DOS_DEMO_NOW: demoNowIso, HOSTNAME: host, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/dos/app/preview?demo=${token}`);

      if (response.ok) {
        return;
      }
    } catch {
      /* not listening yet */
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error("The demo server did not come up in time.");
}

function stopServer() {
  if (server && !server.killed) {
    server.kill("SIGTERM");
  }
}

/* Reach the People list from Home. Each persona gets a FRESH browser context
   rather than a reload: the app restores the tab it was last on, so a second
   `goto` in one context does not reliably land on Home. */
/* Both shells keep the other shell's controls in the DOM and hide them with a
   breakpoint class, so "first" is often the hidden one. Always click something
   a person could actually click. */
async function clickVisible(locator, label) {
  const total = await locator.count();

  for (let index = 0; index < total; index += 1) {
    if (await locator.nth(index).isVisible()) {
      await locator.nth(index).click();

      return;
    }
  }

  throw new Error(`No visible control for ${label}`);
}

async function openPeopleList(page) {
  /* Mobile reaches People through Home's card; desktop through the rail. */
  const myTwelve = page.getByRole("button", { name: /Open My 12/, exact: false });

  if (await myTwelve.count() && await myTwelve.first().isVisible().catch(() => false)) {
    await myTwelve.first().click();
  } else {
    await clickVisible(page.getByRole("button", { name: "People", exact: true }), "People navigation");
  }

  await page.waitForTimeout(900);
  await clickVisible(page.getByRole("tab", { name: /^All\b/ }), "All tab");
  await page.waitForTimeout(900);
}

/* Open a Person record by name from the People list. */
async function openPerson(page, name) {
  await openPeopleList(page);
  /* The mobile list labels its rows ("Open Brooke Fox"); the desktop list is a
     different component whose rows carry only text. Both are real ways a
     person opens this record, so either is accepted. */
  const labelled = page.locator(`button[aria-label="Open ${name}"]`);
  const byText = page.locator("button").filter({ hasText: name });

  if (await labelled.count() && await labelled.first().isVisible().catch(() => false)) {
    await labelled.first().click();
  } else {
    await clickVisible(byText, `row for ${name}`);
  }
  await page.waitForTimeout(1_100);
}

/* The record renders as a full-screen surface appended after the list, so the
   whole document is read rather than one container: a selector that misses
   returns "", and an empty string passes every "does not contain" check. */
const screenText = (page) => page.evaluate(() => document.body.innerText.replace(/\n/g, " | "));

async function openRecordTab(page, name) {
  const tabs = page.getByRole("button", { name, exact: true });
  const total = await tabs.count();

  for (let index = total - 1; index >= 0; index -= 1) {
    if (await tabs.nth(index).isVisible()) {
      await tabs.nth(index).click();
      await page.waitForTimeout(1_000);

      return;
    }
  }

  throw new Error(`No visible ${name} tab`);
}

async function run(viewportName, viewport) {
  const browser = await chromium.launch(executablePath ? { executablePath } : {});

  async function freshPage(query = "") {
    const context = await browser.newContext(viewport);
    const page = await context.newPage();

    page.on("pageerror", (error) => check(`${viewportName}: no page error`, false, error.message.slice(0, 160)));
    await page.goto(`${baseUrl}/dos/app/preview?demo=${token}${query}`, { waitUntil: "load" });
    await page.waitForTimeout(4_000);

    return page;
  }

  console.log(`\n${viewportName} (${viewport.viewport.width}x${viewport.viewport.height})`);

  /* ---- Brooke's People record: Overview and Timeline -------------------- */
  const page = await freshPage();

  await openPerson(page, "Brooke Fox");

  const brookeOverview = await screenText(page);

  check(
    `${viewportName}: Brooke's record actually opened`,
    /LAST MEETING/.test(brookeOverview) && /Brooke Fox/.test(brookeOverview),
  );
  check(
    `${viewportName}: Brooke's Overview no longer reads "Nothing logged yet"`,
    /LAST MEETING/.test(brookeOverview) && !brookeOverview.includes("Nothing logged yet"),
  );
  check(
    `${viewportName}: Brooke's Overview names who was joined, not discipleship`,
    /Joined Ryan Fox in a meeting with/.test(brookeOverview) && !/Ministered with|Ministered to Brooke|Discipled Brooke/i.test(brookeOverview),
    (brookeOverview.match(/Joined [^|]*/) ?? ["(not found)"])[0].trim(),
  );

  await openRecordTab(page, "Timeline");

  const brookeTimeline = await screenText(page);

  check(
    `${viewportName}: Brooke's Timeline shows the shared ministry meeting`,
    /Joined Ryan Fox in a meeting with Samuel Gaffney and Skylar Gaffney/.test(brookeTimeline),
  );
  check(
    `${viewportName}: the shared row appears exactly once`,
    (brookeTimeline.match(/Joined Ryan Fox in a meeting with Samuel Gaffney and Skylar Gaffney/g) ?? []).length === 1,
    `${(brookeTimeline.match(/Joined Ryan Fox in a meeting with Samuel Gaffney and Skylar Gaffney/g) ?? []).length} occurrence(s)`,
  );

  /* ---- Samuel: the primary attendee path is untouched -------------------- */
  const samuelPage = await freshPage();

  await openPerson(samuelPage, "Samuel Gaffney");
  await openRecordTab(samuelPage, "Timeline");

  const samuelTimeline = await screenText(samuelPage);

  check(
    `${viewportName}: Samuel still sees the meeting as his own`,
    /Kitchen Table/.test(samuelTimeline),
  );
  check(
    `${viewportName}: Samuel is never shown as shared ministry`,
    !/Joined .* in a meeting with/.test(samuelTimeline),
  );

  /* ---- My Record, from Brooke's seat ------------------------------------ */
  const brookeSeat = await freshPage("&perspective=brooke");

  await openPeopleList(brookeSeat);
  await clickVisible(brookeSeat.getByRole("button", { name: "My Record", exact: true }), "My Record");
  await brookeSeat.waitForTimeout(1_500);
  await openRecordTab(brookeSeat, "Timeline");

  const myRecordTimeline = await screenText(brookeSeat);

  check(
    `${viewportName}: My Record Timeline carries the shared ministry meeting`,
    /Joined Ryan Fox in a meeting with Samuel Gaffney and Skylar Gaffney/.test(myRecordTimeline),
  );
  check(
    `${viewportName}: it is badged Ministry, not Discipleship`,
    /Ministry/.test(myRecordTimeline),
  );
  check(
    `${viewportName}: My Record's Last meeting card stays discipler-scoped`,
    !/Last meeting[^|]*\|[^|]*Joined .* in a meeting with/.test(myRecordTimeline),
  );

  /* ---- No horizontal overflow at this width ----------------------------- */
  const overflows = await brookeSeat.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);

  check(`${viewportName}: no horizontal overflow`, !overflows);

  await browser.close();
}

try {
  await startServer();
  await run("mobile", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await run("desktop", { viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 });
} finally {
  stopServer();
}

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed:\n  - ${failures.join("\n  - ")}`);
  process.exit(1);
}

console.log("\nDOS shared ministry visibility (USA-276) browser checks passed.");
