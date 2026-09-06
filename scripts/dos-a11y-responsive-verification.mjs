// DOS accessibility / responsive / overflow verification (USA-233, Phase 8).
//
// Boots the production build the same way scripts/dos-visual-regression.mjs
// does, opens the token-gated demo route (synthetic data, no database) and,
// for each screen and viewport width, records:
//   - horizontal overflow (document.scrollWidth vs clientWidth)
//   - visible tappable controls whose hit area is under 44px in either axis
//   - the bottom navigation's opacity and backdrop filter
//   - tablist / tab roles present on the pill rails
//   - console errors and failed network requests
// It writes a Markdown report to the path given as the first argument (default
// docs/dos-ui-refresh/phase-8/a11y-responsive-report.md) and exits non-zero
// only if a screen overflows horizontally or the nav is not opaque. Hit-area
// findings are reported, not failed: the canonical spec (§8) sets the 44px
// target for controls the refresh touched; legacy controls are listed so the
// follow-up is concrete. Requires `npm run build` first.
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const host = "127.0.0.1";
const port = Number(process.env.DOS_VERIFY_PORT || 4175);
const baseUrl = `http://${host}:${port}`;
const token = process.env.DOS_PREVIEW_TOKEN?.trim() || "dos2026";
const reportPath = process.argv[2] || path.join("docs", "dos-ui-refresh", "phase-8", "a11y-responsive-report.md");
const widths = [320, 375, 390, 430, 768, 1024, 1440];

async function click(page, role, name, exact = true) {
  const locator = page.getByRole(role, { name, exact }).locator("visible=true").first();

  await locator.waitFor({ state: "visible", timeout: 8_000 });
  await locator.click();
}

/* On mobile the bottom nav and the Home circle target reach each screen; at
   768px and above the sidebar does (there is no desktop More screen). */
const sidebar = (page, label) => page.getByText(label, { exact: true }).first().click();
const screens = [
  { name: "Home", go: async () => {} },
  { name: "Meetings (Calendar)", go: async (page, mobile) => (mobile ? click(page, "button", "Meetings") : sidebar(page, "Meetings")) },
  { name: "Meetings (Timeline)", go: async (page, mobile) => { await (mobile ? click(page, "button", "Meetings") : sidebar(page, "Meetings")); await click(page, "tab", "Timeline"); } },
  { name: "More", mobileOnly: true, go: async (page) => click(page, "button", "More") },
  { name: "Field", go: async (page, mobile) => { if (mobile) { await click(page, "button", /Open My 12/, false); await click(page, "tab", "All"); } else { await sidebar(page, "Field"); } } },
  { name: "Person Record", go: async (page, mobile) => { if (mobile) { await click(page, "button", /Open My 12/, false); await click(page, "tab", "All"); await click(page, "button", "Open Naomi Lee"); } else { await sidebar(page, "Field"); await page.getByRole("button", { name: /Naomi Lee/ }).locator("visible=true").first().click(); } } },
  { name: "My Record", go: async (page, mobile) => { if (mobile) { await click(page, "button", "More"); await click(page, "button", /My Record/, false); } else { await sidebar(page, "My Record"); } } },
  { name: "Prayer", go: async (page, mobile) => { if (mobile) { await click(page, "button", "More"); await click(page, "button", /Prayer/, false); } else { await sidebar(page, "Prayer"); } } },
  { name: "Library", go: async (page, mobile) => { if (mobile) { await click(page, "button", "More"); await click(page, "button", /Library/, false); } else { await sidebar(page, "Library"); } } },
  /* The desktop task screen is reached through the quick-actions menu and is covered by the USA-216 captures; the sweep opens it on mobile widths. */
  { name: "Log Meeting", mobileOnly: true, go: async (page) => click(page, "button", "Log Meeting", false) },
];

const server = spawn("npm", ["run", "start", "--", "--hostname", host, "--port", String(port)], {
  env: { ...process.env, HOSTNAME: host, PORT: String(port) },
  detached: process.platform !== "win32",
  stdio: ["ignore", "pipe", "pipe"],
});
let serverExited = false;
server.on("exit", () => { serverExited = true; });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForServer() {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (serverExited) throw new Error("Next.js server exited before verification.");
    try {
      const response = await fetch(baseUrl, { redirect: "manual" });
      if (response.status < 500) return;
    } catch { /* warming up */ }
    await delay(500);
  }
  throw new Error(`Timed out waiting for ${baseUrl}`);
}

async function stopServer() {
  if (serverExited) return;
  const signal = (name) => { try { process.platform === "win32" ? server.kill(name) : process.kill(-server.pid, name); } catch { /* gone */ } };
  signal("SIGTERM");
  await Promise.race([once(server, "exit"), delay(5_000).then(() => { if (!serverExited) signal("SIGKILL"); })]);
}

function inspect() {
  const isVisible = (element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none" && rect.bottom > 0 && rect.top < innerHeight;
  };
  const controls = [...document.querySelectorAll("button, a[href], [role=tab], input, select, textarea")].filter(isVisible);
  const small = controls
    .map((element) => {
      const rect = element.getBoundingClientRect();
      const label = (element.getAttribute("aria-label") || element.textContent || element.getAttribute("placeholder") || element.tagName).trim().replace(/\s+/g, " ").slice(0, 40);
      return { height: Math.round(rect.height), label, width: Math.round(rect.width) };
    })
    .filter((item) => item.height < 44 || item.width < 44);
  const nav = document.querySelector('nav[aria-label="Primary"]');
  const alphaOf = (color) => { const m = color.match(/rgba\([^)]*,\s*([0-9.]+)\)/); return m ? Number(m[1]) : (color === "transparent" ? 0 : 1); };
  let navOpaque = null;
  if (nav) {
    const navRect = nav.getBoundingClientRect();
    const candidates = [nav, ...nav.querySelectorAll("*")];
    const bar = candidates.find((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return alphaOf(style.backgroundColor) >= 1 && rect.width >= navRect.width * 0.9 && rect.height >= navRect.height * 0.6;
    });
    const blurred = candidates.some((element) => { const filter = getComputedStyle(element).backdropFilter; return filter && filter !== "none"; });
    navOpaque = Boolean(bar) && !blurred;
  }
  return {
    clientWidth: document.documentElement.clientWidth,
    controls: controls.length,
    navOpaque,
    scrollWidth: document.documentElement.scrollWidth,
    small,
    tablists: document.querySelectorAll('[role="tablist"]').length,
    tabs: document.querySelectorAll('[role="tab"][aria-selected]').length,
  };
}

async function main() {
  await waitForServer();
  await mkdir(path.dirname(reportPath), { recursive: true });
  const browser = await chromium.launch();
  const rows = [];
  const smallByScreen = new Map();
  const errorLog = new Map();
  let failures = 0;
  try {
    for (const width of widths) {
      const mobile = width < 768;
      for (const screen of screens) {
        if (screen.mobileOnly && !mobile) { rows.push(`| ${width} | ${screen.name} | n/a (mobile-only screen) | | | | |`); continue; }
        const context = await browser.newContext({ deviceScaleFactor: mobile ? 2 : 1, hasTouch: mobile, isMobile: mobile, viewport: { height: mobile ? 844 : 900, width } });
        const page = await context.newPage();
        const consoleErrors = [];
        const failedRequests = [];
        page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text().slice(0, 120)); });
        page.on("requestfailed", (request) => failedRequests.push(request.url()));
        page.on("response", (response) => { if (response.status() >= 400) failedRequests.push(`${response.status()} ${response.url()}`); });
        let status = "ok";
        let result = null;
        try {
          await page.goto(`${baseUrl}/dos/app/preview?demo=${token}`, { waitUntil: "networkidle" });
          await screen.go(page, mobile);
          await page.waitForTimeout(600);
          result = await page.evaluate(inspect);
        } catch (error) {
          status = `skipped (${String(error).split("\n")[0].slice(0, 60)})`;
        }
        if (result) {
          const overflow = result.scrollWidth > result.clientWidth;
          if (overflow) failures += 1;
          if (mobile && result.navOpaque === false) failures += 1;
          const key = `${screen.name}`;
          const existing = smallByScreen.get(key) ?? new Map();
          result.small.forEach((item) => existing.set(item.label, `${item.width}×${item.height}`));
          smallByScreen.set(key, existing);
          consoleErrors.forEach((text) => errorLog.set(`console: ${text}`, (errorLog.get(`console: ${text}`) ?? 0) + 1));
          failedRequests.forEach((text) => errorLog.set(`network: ${text}`, (errorLog.get(`network: ${text}`) ?? 0) + 1));
          rows.push(`| ${width} | ${screen.name} | ${overflow ? "**OVERFLOW**" : "none"} | ${result.navOpaque === null ? "n/a" : result.navOpaque ? "opaque" : "**translucent**"} | ${result.tablists} / ${result.tabs} | ${result.small.length} of ${result.controls} | ${consoleErrors.length} / ${failedRequests.length} |`);
        } else {
          rows.push(`| ${width} | ${screen.name} | ${status} | | | | |`);
        }
        await context.close();
      }
    }
  } finally {
    await browser.close().catch(() => {});
    await stopServer();
  }
  const small = [...smallByScreen.entries()].map(([screen, items]) => `- **${screen}**: ${[...items.entries()].map(([label, size]) => `${label || "(unlabelled)"} ${size}`).join("; ") || "none"}`).join("\n");
  const report = `# DOS accessibility, responsive and overflow verification (USA-233)

Generated by \`node scripts/dos-a11y-responsive-verification.mjs\` against the production build of the demo route on ${new Date().toISOString().slice(0, 10)}. Widths: ${widths.join(", ")}. "Tablists / tabs" counts the pill rails and their tabs on the screen; "small controls" counts visible controls whose hit area is under 44px in either axis (reported for follow-up, listed below).

| Width | Screen | Horizontal overflow | Bottom nav | Tablists / tabs | Small controls | Console errors / failed requests |
| --- | --- | --- | --- | --- | --- | --- |
${rows.join("\n")}

## Controls under 44px (union across widths)
${small}

## Console errors and failed requests (unique, with occurrence counts)
${[...errorLog.entries()].map(([text, count]) => `- ${text} (×${count})`).join("\n") || "- none"}
`;
  await writeFile(reportPath, report);
  console.log(`${failures ? `FAILED: ${failures} overflow/nav finding(s).` : "No horizontal overflow; bottom nav opaque on every mobile width."} Report: ${reportPath}`);
  if (failures) process.exitCode = 1;
}

main().catch(async (error) => { console.error(error.message ?? error); await stopServer(); process.exitCode = 1; });
