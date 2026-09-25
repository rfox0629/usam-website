import { chromium } from "playwright";
const BASE = "http://localhost:3100";
const OUT = "/home/user/usam-website/docs/dos-onboarding/evidence";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const note = (m) => console.log("•", m);
for (const [label, opts] of [["desktop", { viewport: { width: 1440, height: 900 } }], ["mobile", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
  const ctx = await b.newContext(opts);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login?next=%2Foperations%2Fsubmissions`);
  await page.fill('input[name="email"]', "reviewer.usa289@localtest.dev");
  await page.fill('input[name="password"]', "Local-Test-Pass-1");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/operations\/submissions/);
  await page.locator("a span", { hasText: "DOS Access Request" }).first().waitFor();
  await page.screenshot({ path: `${OUT}/20-${label}-operations-inbox.png`, fullPage: true });
  note(`${label}: inbox shows DOS Access Request rows`);
  if (label === "mobile") { await ctx.close(); continue; }
  await page.selectOption('select[name="type"]', "dos_access_request");
  await page.getByRole("button", { name: "Apply" }).click();
  await page.waitForURL(/type=dos_access_request/);
  const rows = await page.locator('a[href*="/operations/submissions/dos-access/"]').count();
  note(`type filter DOS Access Request -> ${rows} rows`);
  await page.screenshot({ path: `${OUT}/21-desktop-inbox-filtered.png`, fullPage: true });

  const open = async (name) => { await page.goto(`${BASE}/operations/submissions?type=dos_access_request`); await page.locator('a[href*="/dos-access/"]', { hasText: name }).first().click(); await page.getByRole("heading", { name: "Request Summary" }).waitFor(); };

  // Approve a new individual.
  await open("Morgan Synthetic");
  await page.screenshot({ path: `${OUT}/22-desktop-detail-submitted.png`, fullPage: true });
  await page.getByRole("button", { name: "Approve and set up access" }).click();
  await page.waitForURL(/(saved|error)=/);
  note(`approve Morgan -> ${decodeURIComponent(page.url().split("?")[1])}`);
  await page.screenshot({ path: `${OUT}/23-desktop-approved-email-failed.png`, fullPage: true });
  // Retry welcome email.
  if (await page.getByRole("button", { name: "Retry welcome email" }).count()) {
    await page.getByRole("button", { name: "Retry welcome email" }).click();
    await page.waitForURL(/(saved|error)=/);
    note(`retry email -> ${decodeURIComponent(page.url().split("?")[1])}`);
  }
  // Approve again should be idempotent: reload detail, no approve button.
  note(`approve button still present after approval: ${await page.getByRole("button", { name: "Approve and set up access" }).count()}`);

  // Approve existing account holder.
  await open("Sam Existing");
  await page.getByRole("button", { name: "Approve and set up access" }).click();
  await page.waitForURL(/(saved|error)=/);
  note(`approve Sam (existing) -> ${decodeURIComponent(page.url().split("?")[1])}`);
  await page.screenshot({ path: `${OUT}/24-desktop-approved-existing.png`, fullPage: true });

  // Decline org: first without confirmation, then with.
  await open("Avery Synthetic");
  await page.getByRole("button", { name: "Decline request" }).click();
  await page.waitForURL(/(saved|error)=/);
  note(`decline without confirm -> ${decodeURIComponent(page.url().split("?")[1])}`);
  await page.fill('form:has(button:text("Decline request")) textarea[name="note"]', "Synthetic walkthrough decline.");
  await page.check('input[name="confirm"]');
  await page.getByRole("button", { name: "Decline request" }).click();
  await page.waitForURL(/saved=/);
  note(`decline confirmed -> ${decodeURIComponent(page.url().split("?")[1])}`);
  await page.screenshot({ path: `${OUT}/25-desktop-declined.png`, fullPage: true });
  await page.goto(`${BASE}/operations/submissions?type=dos_access_request`);
  await page.screenshot({ path: `${OUT}/26-desktop-inbox-after-decisions.png`, fullPage: true });
  await ctx.close();
}
await b.close();
