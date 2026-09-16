// USA-272 follow-up: isolated demo only. Run after build; never writes production data.
//
// Proves on a real page, at phone and desktop widths, that My Record's
// Upcoming meeting card shows the meeting the Meetings calendar holds and
// opens that same record -- the fault Ryan reported, where a scheduled
// meeting with Dirk Bond sat on the calendar while My Record said "Nothing
// scheduled."
//
// DOS_DEMO_NOW is the real instant here rather than a pinned past one: the
// fixture's dates are offsets from it, so the scheduled meeting is genuinely
// ahead of the clock the browser reads, and server and client still render
// against the same instant (no hydration mismatch).
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const port = 4188;
const base = `http://127.0.0.1:${port}`;
const server = spawn("npm", ["run", "start", "--", "--hostname", "127.0.0.1", "--port", String(port)], {
  env: { ...process.env, DOS_DEMO_NOW: new Date().toISOString() }, detached: true, stdio: "ignore",
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
  await mkdir("test-results/usa-272-mentor-meeting", { recursive: true });
  /* CI installs the browser Playwright expects and needs nothing here.
     DOS_CHROMIUM_PATH lets a sandbox with a pre-installed Chromium of a
     different build point at it instead of downloading one. */
  browser = await chromium.launch(process.env.DOS_CHROMIUM_PATH ? { executablePath: process.env.DOS_CHROMIUM_PATH } : {});

  const openMyRecord = async (page, width) => {
    if (width < 768) {
      await page.getByRole("button", { name: /Open My 12/ }).first().click();
    } else {
      await page.getByRole("button", { name: "People", exact: true }).locator("visible=true").first().click();
    }
    await page.getByRole("tab", { name: /^All\b/ }).click();
    await page.locator('[aria-label="People actions"]').getByRole("button", { name: "My Record", exact: true }).click();
    const record = page.locator('article[aria-label="My Record"]');
    await record.waitFor();
    return record;
  };

  for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 900 : 844 }, deviceScaleFactor: width === 1440 ? 1 : 2 });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto(`${base}/dos/app/preview?demo=dos2026`, { waitUntil: "networkidle" });
    let record = await openMyRecord(page, width);

    /* The filled card is a <button> (Card with onClick), the empty one a
       <section>. Both carry the eyebrow, so match on either element. */
    const upcoming = record.locator(":is(button, section)", { hasText: "Upcoming meeting" }).last();
    await upcoming.waitFor();
    const upcomingText = (await upcoming.innerText()).replace(/\s+/g, " ");
    assert(!upcomingText.includes("No meeting scheduled"), `Upcoming meeting must not be empty at ${width}px: ${upcomingText}`);
    assert(upcomingText.includes("Dirk Bond"), `Upcoming meeting must name the person discipling Ryan at ${width}px: ${upcomingText}`);
    assert(/\b\d{1,2}:\d{2}\s?(AM|PM)\b/.test(upcomingText), `Upcoming meeting must carry the scheduled time at ${width}px: ${upcomingText}`);

    /* The card must fit its half of the pair without forcing the row wider
       than the viewport -- 320px is where a long person name would show it. */
    assert(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      `My Record Overview must not scroll horizontally at ${width}px`,
    );
    await page.screenshot({ path: `test-results/usa-272-mentor-meeting/${width}-overview.png` });

    // The action opens the EXISTING meeting, on the Meetings calendar's own record.
    await upcoming.click();
    const detail = page.getByText("Scheduled", { exact: true }).first();
    await detail.waitFor();
    assert(await page.getByText("Dirk Bond").first().isVisible(), `The opened record must be the meeting with Dirk Bond at ${width}px`);
    await page.screenshot({ path: `test-results/usa-272-mentor-meeting/${width}-opened-meeting.png` });

    /* Empty state: Dirk's own perspective has no one discipling him, so the
       card says what is actually missing and offers Schedule, not Log. */
    await page.goto(`${base}/dos/app/preview?demo=dos2026&perspective=dirk`, { waitUntil: "networkidle" });
    record = await openMyRecord(page, width);
    const emptyUpcoming = record.locator(":is(button, section)", { hasText: "Upcoming meeting" }).last();
    await emptyUpcoming.waitFor();
    const emptyText = (await emptyUpcoming.innerText()).replace(/\s+/g, " ");
    assert(emptyText.includes("No meeting scheduled with someone discipling you."), `Empty upcoming wording at ${width}px: ${emptyText}`);
    assert(await emptyUpcoming.getByRole("button", { name: "Schedule", exact: true }).isVisible(), `Empty upcoming offers Schedule at ${width}px`);
    assert.equal(await emptyUpcoming.getByRole("button", { name: "Log", exact: true }).count(), 0, `Empty upcoming must not offer Log at ${width}px`);
    await page.screenshot({ path: `test-results/usa-272-mentor-meeting/${width}-empty-upcoming.png` });

    assert.deepEqual(errors, [], "No application errors");
    console.log(`USA-272 follow-up browser checks passed at ${width}px`);
    await context.close();
  }
} finally {
  await browser?.close();
  try { process.kill(-server.pid, "SIGTERM"); } catch {}
}
