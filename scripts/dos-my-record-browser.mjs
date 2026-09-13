// USA-272: isolated demo only. Run after build; never writes production data.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const port = 4187;
const base = `http://127.0.0.1:${port}`;
const now = "2026-09-04T17:00:00Z";
const server = spawn("npm", ["run", "start", "--", "--hostname", "127.0.0.1", "--port", String(port)], {
  env: { ...process.env, DOS_DEMO_NOW: now }, detached: true, stdio: "ignore",
});
let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 90; attempt++) {
    try { ready = (await fetch(base)).status < 500; } catch {}
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert(ready, "Production build server must start");
  await mkdir("test-results/usa-272", { recursive: true });
  browser = await chromium.launch();
  for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 900 : 844 }, deviceScaleFactor: width === 1440 ? 1 : 2 });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.clock.install({ time: new Date(now) });
    await page.goto(`${base}/dos/app/preview?demo=dos2026`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Open My 12/ }).first().click();
    await page.getByRole("tab", { name: /^All\b/ }).click();
    const actions = page.locator('[aria-label="People actions"]');
    await actions.waitFor();
    assert(await actions.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), "People actions must not scroll horizontally");
    for (const label of ["My Record", "Manage circles"]) {
      assert(await actions.getByRole("button", { name: label, exact: true }).isVisible());
    }
    await page.screenshot({ path: `test-results/usa-272/${width}-people.png` });
    await actions.getByRole("button", { name: "My Record", exact: true }).click();
    const record = page.locator('article[aria-label="My Record"]');
    await record.waitFor();
    assert.equal(await record.locator('section[aria-label="People discipling me"]').count(), 0, "No roster on Overview");
    await page.screenshot({ path: `test-results/usa-272/${width}-overview.png` });
    await page.getByRole("button", { name: "Timeline", exact: true }).click();
    await page.screenshot({ path: `test-results/usa-272/${width}-timeline.png` });
    await page.getByRole("button", { name: "My Life", exact: true }).click();
    const relationships = record.locator('section[aria-label="People discipling me"]');
    await relationships.getByText("Dirk Bond", { exact: true }).click();
    const sheet = page.locator('[data-dos-my-record-sheet]');
    await sheet.getByRole("button", { name: "Edit", exact: true }).click();
    await page.locator('[data-dos-my-record-sheet="editable"]').waitFor();
    await sheet.getByRole("button", { name: "Close", exact: true }).click();
    await page.screenshot({ path: `test-results/usa-272/${width}-my-life.png` });
    await page.getByRole("button", { name: "Overview", exact: true }).click();
    await record.locator('section[aria-label="Time with God"]').getByRole("button", { name: /Add|Log/ }).click();
    const notes = page.locator('[data-dos-my-record-sheet] textarea[name="notes"]');
    await notes.fill("USA-272 isolated unsaved-work verification");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Keep editing", exact: true }).click();
    assert.equal(await notes.inputValue(), "USA-272 isolated unsaved-work verification");
    await page.screenshot({ path: `test-results/usa-272/${width}-editor.png` });
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Leave without saving", exact: true }).click();
    await page.goto(`${base}/dos/app/preview?demo=dos2026&view=my_record&tab=journal`, { waitUntil: "networkidle" });
    await record.waitFor();
    assert(await page.getByRole("button", { name: "Timeline", exact: true }).isVisible(), "Legacy deep link restores My Record");
    assert.deepEqual(errors, [], "No application errors");
    console.log(`USA-272 browser checks passed at ${width}px`);
    await context.close();
  }
} finally {
  await browser?.close();
  try { process.kill(-server.pid, "SIGTERM"); } catch {}
}
