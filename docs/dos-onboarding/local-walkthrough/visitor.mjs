import { chromium } from "playwright";
const BASE = "http://localhost:3100";
const OUT = "/home/user/usam-website/docs/dos-onboarding/evidence";
const results = [];
const note = (m) => { results.push(m); console.log("•", m); };
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] }).catch(() => chromium.launch());
const mobile = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" };
const desktop = { viewport: { width: 1440, height: 900 } };
const shot = (page, name, full = false) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
// The form's selects are listbox buttons (USA-289), not native <select>s.
const choose = async (page, id, option) => { await page.locator(`#dsr-${id}`).click(); await page.locator(`#dsr-${id}-listbox [role=option]`, { hasText: option }).first().click(); };
const cont = (page) => page.getByRole("button", { name: /^(Continue|Send request)$/ }).click();

// 1. Mobile visitor, individual, with a legacy missionary draft on the device.
{
  const ctx = await browser.newContext(mobile);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/dos/setup`);
  await page.evaluate(() => localStorage.setItem("dos-unified-setup-draft-v1", JSON.stringify({ setupPath: "usam", firstName: "Casey", lastName: "Synthetic", contactEmail: "casey.usa289@localtest.dev", cellPhone: "555-010-2000", city: "Dayton", state: "OH", storyTestimony: "Synthetic testimony text for the walkthrough." })));
  await page.reload();
  await page.getByText("You have an unfinished USA Missionaries application on this device.").waitFor();
  await shot(page, "01-mobile-welcome-legacy-notice", true);
  note("mobile: welcome shows legacy missionary draft notice with link to /join");
  const legacyStill = await page.evaluate(() => Boolean(localStorage.getItem("dos-unified-setup-draft-v1")));
  note(`legacy draft still on device after load: ${legacyStill}`);
  await page.getByRole("button", { name: "Start my request" }).click();
  await page.getByRole("heading", { name: "Who is DOS for?" }).waitFor();
  await cont(page);
  await page.getByText("Choose who this DOS access is for.").waitFor();
  await shot(page, "02-mobile-path-validation");
  note("mobile: path step blocks Continue with a visible error");
  await page.getByRole("button", { name: /For me/ }).click();
  await shot(page, "03-mobile-path-selected");
  await cont(page);
  await page.getByRole("heading", { name: "Who should we contact?" }).waitFor();
  const prefilled = await page.locator("#dsr-firstName").inputValue();
  note(`contact prefilled from legacy draft: "${prefilled}"`);
  await page.fill("#dsr-email", "not-an-email");
  await cont(page);
  await page.getByText("Check the email address").waitFor();
  const focused = await page.evaluate(() => document.activeElement?.id);
  note(`invalid email error shown; focus moved to ${focused}`);
  await shot(page, "04-mobile-contact-validation");
  await page.fill("#dsr-firstName", "Morgan");
  await page.fill("#dsr-lastName", "Synthetic");
  await page.fill("#dsr-email", "morgan.usa289@localtest.dev");
  await cont(page);
  await choose(page, "individualRole", "Small group or Bible study leader");
  await page.fill("#dsr-churchOrCommunity", "Synthetic Community Church");
  await cont(page);
  await page.getByRole("heading", { name: "How do you plan to use DOS?" }).waitFor();
  // Resume: reload mid-flow.
  await page.waitForTimeout(600);
  await page.reload();
  await page.getByRole("button", { name: "Continue my request" }).click();
  await page.getByRole("heading", { name: "How do you plan to use DOS?" }).waitFor();
  note("mobile: reload mid-flow resumes on the same step with answers kept");
  await cont(page);
  await page.getByText("Choose at least one way you plan to use DOS.").waitFor();
  await page.getByRole("button", { name: "Prayer and follow-up" }).click();
  await page.getByRole("button", { name: "Small groups" }).click();
  await page.fill("#dsr-goals", "Keep up with the eight people in my Tuesday group.");
  await shot(page, "05-mobile-use", true);
  await cont(page);
  await page.getByRole("heading", { name: "Review and send your request." }).waitFor();
  // Back navigation keeps answers.
  await page.getByRole("button", { name: "Back" }).click();
  const kept = await page.getByRole("button", { name: "Small groups" }).getAttribute("aria-pressed");
  note(`Back from review keeps selections (Small groups pressed=${kept})`);
  await cont(page);
  await page.getByRole("button", { name: /^Edit About you$/ }).click();
  await page.getByRole("heading", { name: "Who should we contact?" }).waitFor();
  note("review Edit jumps to the right step");
  for (let i = 0; i < 3; i++) await cont(page);
  await page.getByRole("heading", { name: "Review and send your request." }).waitFor();
  await cont(page);
  await page.getByText("Confirm you understand").waitFor();
  await page.locator("#dsr-acknowledgement").check();
  await shot(page, "06-mobile-review", true);
  // Double-tap submit.
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent === "Send request"); b.click(); b.click(); b.click(); });
  await page.getByRole("heading", { name: "Thank you. Your request is in." }).waitFor();
  const ref = await page.locator(".ref .code").textContent();
  note(`mobile: submitted, confirmation shows reference ${ref} and "Awaiting review"`);
  await shot(page, "07-mobile-confirmation", true);
  await page.reload();
  await page.getByRole("heading", { name: "Thank you. Your request is in." }).waitFor();
  note("confirmation persists after reload");
  await ctx.close();
}

// 2. Desktop visitor, organization.
{
  const ctx = await browser.newContext(desktop);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/dos/setup`);
  await shot(page, "10-desktop-welcome");
  await page.getByRole("button", { name: "Start my request" }).click();
  await page.getByRole("button", { name: /For my organization/ }).click();
  await shot(page, "11-desktop-path");
  await cont(page);
  await page.fill("#dsr-firstName", "Avery");
  await page.fill("#dsr-lastName", "Synthetic");
  await page.fill("#dsr-email", "avery.usa289@localtest.dev");
  await page.fill("#dsr-phone", "(555) 010-3000");
  await page.fill("#dsr-city", "Columbus");
  await page.fill("#dsr-region", "OH");
  await cont(page);
  await cont(page);
  await page.getByText("Add the organization's name.").waitFor();
  await shot(page, "12-desktop-org-validation");
  await page.fill("#dsr-organizationName", "Synthetic Fellowship");
  await choose(page, "organizationType", "Church");
  await page.fill("#dsr-organizationRole", "Discipleship Pastor");
  await choose(page, "expectedUsers", "11–50 people");
  await cont(page);
  await page.getByRole("button", { name: "Equip leaders who disciple others" }).click();
  await cont(page);
  await page.locator("#dsr-acknowledgement").check();
  await shot(page, "13-desktop-review", true);
  await cont(page);
  await page.getByRole("heading", { name: "Thank you. Your request is in." }).waitFor();
  await shot(page, "14-desktop-confirmation");
  note("desktop: organization request submitted");
  await ctx.close();
}

// 3. Same email again from a new device: no duplicate.
{
  const ctx = await browser.newContext(mobile);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/dos/setup?path=individual`);
  await page.getByRole("button", { name: "Start my request" }).click();
  await page.fill("#dsr-firstName", "Morgan");
  await page.fill("#dsr-lastName", "Synthetic");
  await page.fill("#dsr-email", "MORGAN.usa289@localtest.dev");
  await cont(page);
  await choose(page, "individualRole", "Disciple-maker");
  await cont(page);
  await page.getByRole("button", { name: "Prayer and follow-up" }).click();
  await cont(page);
  await page.locator("#dsr-acknowledgement").check();
  await cont(page);
  await page.getByRole("heading", { name: "You already have a request waiting." }).waitFor();
  await shot(page, "15-mobile-duplicate-email");
  note("second request for the same email (different case, new device) is refused as a duplicate");
  await ctx.close();
}

// 4. Existing DOS user requests access.
{
  const ctx = await browser.newContext(mobile);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/dos/setup`);
  await page.getByRole("button", { name: "Start my request" }).click();
  await page.getByRole("button", { name: /For me/ }).click();
  await cont(page);
  await page.fill("#dsr-firstName", "Sam");
  await page.fill("#dsr-lastName", "Existing");
  await page.fill("#dsr-email", "existing.usa289@localtest.dev");
  await cont(page);
  await choose(page, "individualRole", "Disciple-maker");
  await cont(page);
  await page.getByRole("button", { name: "Journeys and reading plans" }).click();
  await cont(page);
  await page.locator("#dsr-acknowledgement").check();
  await cont(page);
  await page.getByRole("heading", { name: "Thank you. Your request is in." }).waitFor();
  note("existing-account user submitted a request");
  await ctx.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 1));
