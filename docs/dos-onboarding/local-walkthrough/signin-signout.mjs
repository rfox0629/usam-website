import { chromium } from "playwright";
const BASE = "http://localhost:3100";
const OUT = "/home/user/usam-website/docs/dos-onboarding/evidence";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const note = (m) => console.log("•", m);
for (const [who, slug, opts, label] of [
  ["morgan", "morgan-synthetic", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, "mobile"],
  ["existing", "sam-existing", { viewport: { width: 1440, height: 900 } }, "desktop"],
]) {
  const ctx = await b.newContext(opts);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login?next=${encodeURIComponent(`/dos/${slug}`)}`);
  if (who === "morgan") await page.screenshot({ path: `${OUT}/30-mobile-dos-login-email-link.png`, fullPage: true });
  await page.fill('input[name="email"]', `${who}.usa289@localtest.dev`);
  await page.fill('input[name="password"]', "Local-Test-Pass-1");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await page.waitForURL(new RegExp(`/dos/${slug}`), { timeout: 30000 });
  await page.waitForTimeout(2500);
  const title = await page.title();
  note(`${who}: signed in and opened /dos/${slug} (title "${title}", url ${page.url().replace(BASE, "")})`);
  await page.screenshot({ path: `${OUT}/31-${label}-${slug}-opened.png` });
  const body = await page.locator("body").innerText();
  note(`${who}: page mentions "Access pending": ${body.includes("Access pending")}; mentions Jordan Synthetic: ${body.includes("Jordan")}`);
  // Sign out via the real control.
  let signOut = page.locator('form[action="/api/access/logout"] button:visible').first();
  if (!(await signOut.count())) {
    for (const opener of [page.getByRole("button", { name: /profile|account|settings|more/i }).first(), page.getByRole("link", { name: /more/i }).first()]) {
      if (await opener.count()) { await opener.click().catch(() => {}); await page.waitForTimeout(800); }
      signOut = page.locator('form[action="/api/access/logout"] button:visible').first();
      if (await signOut.count()) break;
    }
  }
  if (await signOut.count()) {
    await signOut.click();
    await page.waitForURL(/\/login/);
    note(`${who}: Sign out -> ${page.url().replace(BASE, "")}; banner: ${(await page.locator("body").innerText()).includes("You are signed out.")}`);
    await page.screenshot({ path: `${OUT}/32-${label}-signed-out.png` });
    await page.goto(`${BASE}/dos/${slug}`);
    await page.waitForURL(/\/login/, { timeout: 15000 }).catch(() => {});
    note(`${who}: after sign out /dos/${slug} -> ${page.url().replace(BASE, "")}`);
  } else {
    note(`${who}: visible Sign out control not found automatically; posting the same form the control uses`);
    await page.evaluate(() => { const f = document.createElement("form"); f.method = "post"; f.action = "/api/access/logout"; document.body.appendChild(f); f.submit(); });
    await page.waitForURL(/\/login/);
    await page.goto(`${BASE}/dos/${slug}`);
    await page.waitForURL(/\/login/, { timeout: 15000 }).catch(() => {});
    note(`${who}: after sign out /dos/${slug} -> ${page.url().replace(BASE, "")}`);
  }
  await ctx.close();
}
await b.close();
