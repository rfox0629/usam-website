// DOS visual regression (USA-215).
//
// Boots the production build the same way scripts/ci-smoke.mjs does, renders
// the token-gated demo route (synthetic data, no database) and the primitives
// gallery, and compares each screenshot byte-for-byte with the committed
// baseline for this platform under docs/dos-ui-refresh/visual-baseline/.
//
//   npm run test:dos:visual            compare; a mismatch writes the new PNG
//                                      to test-results/visual/ and fails
//   npm run test:dos:visual -- --update  rewrite the baselines (record an
//                                      intentional visual change in the PR)
//
// Baselines are keyed by platform because Chromium text rendering differs
// between macOS and Linux; when this platform has no baselines the script
// prints a notice and exits 0 so CI (Linux) stays green until Linux baselines
// are recorded deliberately. Requires `npm run build` first.
import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const host = "127.0.0.1";
const port = Number(process.env.DOS_VISUAL_PORT || 4174);
const baseUrl = `http://${host}:${port}`;
const token = process.env.DOS_PREVIEW_TOKEN?.trim() || "dos2026";
const update = process.argv.includes("--update");
const platformKey = `${process.platform}-${process.arch}`;
const baselineDir = path.join(process.cwd(), "docs", "dos-ui-refresh", "visual-baseline", platformKey);
const resultsDir = path.join(process.cwd(), "test-results", "visual");

const viewports = {
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
};

async function clickRole(page, role, name, exact = true) {
  const locator = page.getByRole(role, { name, exact }).first();

  await locator.waitFor({ state: "visible", timeout: 8_000 });
  await locator.click();
}

const clickButton = (page, name, exact = true) => clickRole(page, "button", name, exact);
const clickTab = (page, name) => clickRole(page, "tab", name);

/* Each scene: which viewport, how to reach it. Keep this list short and
   representative; the goal is to catch an accidental change to a shared
   primitive or to a protected screen, not to photograph every state. */
const scenes = [
  { name: "home", viewport: "mobile", go: async (page) => {} },
  { name: "meetings", viewport: "mobile", go: async (page) => clickButton(page, "Meetings") },
  { name: "more", viewport: "mobile", go: async (page) => clickButton(page, "More") },
  /* USA-247 (#128) appends a count to each People tab, so the accessible name is "All 13". */
  { name: "field", viewport: "mobile", go: async (page) => { await clickButton(page, /Open My 12/, false); await clickTab(page, /^All\b/); } },
  { name: "groups", viewport: "mobile", go: async (page) => { await clickButton(page, "More"); await clickButton(page, /Groups/, false); } },
  { name: "fruit", viewport: "mobile", go: async (page) => { await clickButton(page, "More"); await clickButton(page, /Fruit/, false); } },
  { name: "library", viewport: "mobile", go: async (page) => { await clickButton(page, "More"); await clickButton(page, /Library/, false); } },
  { name: "library-resource", viewport: "mobile", go: async (page) => { await clickButton(page, "More"); await clickButton(page, /Library/, false); await page.getByText("Kitchen Table Gospel", { exact: true }).first().click(); } },
  { name: "prayer", viewport: "mobile", go: async (page) => { await clickButton(page, "More"); await clickButton(page, /Prayer/, false); } },
  /* USA-272: My Record is reached from the People action row, not from More.
     Its three views are photographed because they are the change under
     review. */
  { name: "my-record", viewport: "mobile", go: async (page) => { await clickButton(page, /Open My 12/, false); await clickTab(page, /^All\b/); await clickButton(page, /My Record/, false); } },
  { name: "my-record-timeline", viewport: "mobile", go: async (page) => { await clickButton(page, /Open My 12/, false); await clickTab(page, /^All\b/); await clickButton(page, /My Record/, false); await clickButton(page, "Timeline", false); } },
  { name: "my-record-my-life", viewport: "mobile", go: async (page) => { await clickButton(page, /Open My 12/, false); await clickTab(page, /^All\b/); await clickButton(page, /My Record/, false); await clickButton(page, "My Life", false); } },
  /* Meetings moved to the canonical Segmented rail (USA-246), which is a
     group of buttons rather than a tablist, so this scene selects the segment
     by its button role. The Person and Groups rails are still PillRails. */
  { name: "meetings-timeline", viewport: "mobile", go: async (page) => { await clickButton(page, "Meetings"); await clickButton(page, "Timeline", false); } },
  {
    name: "person-record",
    viewport: "mobile",
    go: async (page) => {
      await clickButton(page, /Open My 12/, false);
      await clickTab(page, /^All\b/);
      await clickButton(page, "Open Naomi Lee");
    },
  },
  { name: "log-meeting", viewport: "mobile", go: async (page) => clickButton(page, "Log Meeting", false) },
  { name: "primitives-gallery", viewport: "mobile", url: `/dos/app/preview?demo=${token}&gallery=primitives`, go: async () => {} },
  { name: "dashboard", viewport: "desktop", go: async () => {} },
  { name: "primitives-gallery", viewport: "desktop", url: `/dos/app/preview?demo=${token}&gallery=primitives`, go: async () => {} },
];

/* Deterministic clock (USA-239, decision log P-9): the server renders the demo
   fixture with DOS_DEMO_NOW and every page gets a fake browser clock at the
   same instant, so date-relative rows ("2 days ago", the Today cell, due
   buckets) never drift between runs. Override with DOS_DEMO_NOW to re-record
   on purpose. */
const demoNowIso = process.env.DOS_DEMO_NOW?.trim() || "2026-09-04T12:00:00-05:00";
const demoNowMs = new Date(demoNowIso).getTime();

const server = spawn("npm", ["run", "start", "--", "--hostname", host, "--port", String(port)], {
  env: { ...process.env, DOS_DEMO_NOW: demoNowIso, HOSTNAME: host, PORT: String(port) },
  detached: process.platform !== "win32",
  stdio: ["ignore", "pipe", "pipe"],
});

let serverExited = false;
let serverOutput = "";
server.stdout.on("data", (chunk) => { serverOutput += chunk.toString(); });
server.stderr.on("data", (chunk) => { serverOutput += chunk.toString(); });
server.on("exit", () => { serverExited = true; });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForServer() {
  const deadline = Date.now() + 45_000;

  while (Date.now() < deadline) {
    if (serverExited) {
      throw new Error(`Next.js server exited before the visual run.\n${serverOutput}`);
    }

    try {
      const response = await fetch(baseUrl, { redirect: "manual" });
      if (response.status < 500) {
        return;
      }
    } catch {
      // warming up
    }

    await delay(500);
  }

  throw new Error(`Timed out waiting for ${baseUrl}`);
}

async function stopServer() {
  if (serverExited) {
    return;
  }

  const signal = (name) => {
    try {
      if (process.platform === "win32") {
        server.kill(name);
      } else {
        process.kill(-server.pid, name);
      }
    } catch {
      // gone already
    }
  };

  signal("SIGTERM");
  await Promise.race([once(server, "exit"), delay(5_000).then(() => { if (!serverExited) signal("SIGKILL"); })]);
}

async function main() {
  if (!existsSync(baselineDir) && !update) {
    console.log(`No visual baselines for ${platformKey} (expected under ${path.relative(process.cwd(), baselineDir)}). Skipping; run with --update on this platform to record them.`);
    return;
  }

  await waitForServer();
  await mkdir(update ? baselineDir : resultsDir, { recursive: true });

  const browser = await chromium.launch();
  const failures = [];
  let compared = 0;

  try {
    for (const scene of scenes) {
      const context = await browser.newContext({ viewport: viewports[scene.viewport], ...viewports[scene.viewport] });
      const page = await context.newPage();
      await page.clock.install({ time: demoNowMs });
      const url = `${baseUrl}${scene.url ?? `/dos/app/preview?demo=${token}`}`;

      await page.goto(url, { waitUntil: "networkidle" });
      await scene.go(page);
      await page.waitForTimeout(500);
      /* Settle: a tab switch can leave a transient vertical scroll behind
         (observed once in ~20 runs of the Timeline scene); every scene is
         photographed from the top of its scroll container so the baseline
         compares layout, not scroll timing. */
      await page.evaluate(() => {
        document.querySelectorAll("*").forEach((element) => {
          if (element.scrollTop > 0) {
            element.scrollTop = 0;
          }
        });
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(200);

      const fileName = `${scene.viewport}--${scene.name}.png`;
      const actual = await page.screenshot({ fullPage: false });
      const baselinePath = path.join(baselineDir, fileName);

      if (update) {
        await writeFile(baselinePath, actual);
        console.log(`recorded ${fileName}`);
      } else if (!existsSync(baselinePath)) {
        failures.push(`${fileName}: no baseline (run with --update)`);
      } else {
        const expected = await readFile(baselinePath);
        compared += 1;

        if (!expected.equals(actual)) {
          await writeFile(path.join(resultsDir, fileName), actual);
          failures.push(`${fileName}: differs from baseline (new render saved to test-results/visual/)`);
        }
      }

      await context.close();
    }
  } finally {
    await browser.close().catch(() => {});
    await stopServer();
  }

  if (failures.length) {
    throw new Error(`DOS visual regression: ${failures.length} scene(s) changed.\n- ${failures.join("\n- ")}\nIf the change is intentional, re-run with --update and commit the baselines with the PR.`);
  }

  console.log(update ? `DOS visual baselines recorded for ${platformKey} (${scenes.length} scenes).` : `DOS visual regression passed (${compared} scenes match the ${platformKey} baselines).`);
}

main().catch(async (error) => {
  console.error(error.message ?? error);
  await stopServer();
  process.exitCode = 1;
});
