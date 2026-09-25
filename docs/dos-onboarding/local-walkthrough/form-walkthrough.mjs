// Full /dos/setup walkthrough in Chrome: both paths at desktop and phone
// widths. Test harness only; run against the local stack in README.md, never
// against production. Every email is synthetic and unique to the run.
//
//   node docs/dos-onboarding/local-walkthrough/form-walkthrough.mjs
//
// Env: BASE (default http://127.0.0.1:3100), OUT (screenshot folder),
// PSQL (psql connection string for the local database).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://127.0.0.1:3100";
const OUT = process.env.OUT ?? "/var/tmp/pgusam/form";
const PSQL = process.env.PSQL ?? "postgresql://postgres@127.0.0.1:55432/usam";
const RUN = Date.now().toString(36);
mkdirSync(OUT, { recursive: true });

let passed = 0;
const ok = (message) => { passed += 1; console.log(`  ok  ${message}`); };
const sql = (query) => execFileSync("psql", [PSQL, "-tAc", query], { encoding: "utf8" }).trim();
const rowsFor = (email) => Number(sql(`select count(*) from public.dos_access_requests where email = '${email}'`));
const rowFor = (email) => JSON.parse(sql(`select row_to_json(r) from public.dos_access_requests r where email = '${email}'`));

await fetch("http://127.0.0.1:54321/auth/v1/__password", {
  body: JSON.stringify({ email: "reviewer.usa289@localtest.dev", password: "Local-Test-Pass-1" }),
  headers: { "Content-Type": "application/json" },
  method: "POST",
});

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const sizes = {
  desktop: { viewport: { width: 1440, height: 900 } },
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true },
};

const heading = (page) => page.locator("main h1").first();
const expectHeading = async (page, text) => {
  await page.getByRole("heading", { level: 1, name: text }).waitFor();
};
const cont = (page) => page.locator(".bar .btn-primary").click();
const back = (page) => page.getByRole("button", { exact: true, name: "Back" }).click();
const errorFor = (page, id) => page.locator(`#dsr-${id}-error`);
const choose = async (page, id, option) => {
  await page.locator(`#dsr-${id}`).click();
  await page.locator(`#dsr-${id}-listbox [role=option]`, { hasText: option }).first().click();
  assert.equal((await page.locator(`#dsr-${id} .select-value`).textContent()).trim(), option);
};
const reviewValue = (page, label) => page.locator(".review dt", { hasText: new RegExp(`^${label}$`) }).locator("xpath=following-sibling::dd[1]");
const reviewLabels = (page) => page.locator(".review dt").allTextContents();
// Playwright's phone emulation can misplace a tap on a control far down a
// long page (its layout viewport is taller than the configured one), so the
// acknowledgement is ticked the way a keyboard user would: focus, then Space.
const tickAcknowledgement = async (page) => {
  await page.locator("#dsr-acknowledgement").focus();
  await page.keyboard.press("Space");
  assert.equal(await page.locator("#dsr-acknowledgement").isChecked(), true);
};
const shot = async (page, name) => {
  const overflow = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const wide = [...document.querySelectorAll(".dsr *")].find((el) => el.getBoundingClientRect().right > width + 1 && getComputedStyle(el).position !== "absolute" && !el.closest(".hp"));
    return wide ? `${wide.tagName}.${wide.className} "${wide.textContent.slice(0, 60)}"` : "";
  });
  assert.equal(overflow, "", `${name}: content runs past the right edge`);
  await page.screenshot({ fullPage: true, path: `${OUT}/${name}.png` });
};

async function walk(sizeName, path) {
  const label = `${sizeName}/${path}`;
  const email = `${path}.${sizeName}.${RUN}@localtest.dev`;
  console.log(`\n${label}  (${email})`);
  const ctx = await browser.newContext(sizes[sizeName]);
  const page = await ctx.newPage();
  const joinPosts = [];
  page.on("request", (request) => { if (request.url().includes("/api/join/")) joinPosts.push(request.url()); });

  // Welcome
  await page.goto(`${BASE}/dos/setup?restart=1`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Start with the people God has placed in front of you." }).waitFor();
  assert.equal(await page.getByRole("link", { name: "Already have DOS? Sign in" }).getAttribute("href"), "/login?next=%2Fdos");
  assert.equal(await page.locator('a[href="/join"]').count(), 0);
  assert.ok(await page.getByText("invitation-only application").isVisible());
  ok("welcome: heading, Sign in link, missionary note without a /join link");
  await shot(page, `${sizeName}-${path}-0-welcome`);

  // Step 1: who it's for
  await page.getByRole("button", { name: "Start my request" }).click();
  await expectHeading(page, "Who is DOS for?");
  assert.match(await page.locator(".progress-label").textContent(), /Step 1 of 5/);
  await cont(page);
  await page.getByText("Choose who this DOS access is for.").waitFor();
  ok("path: Continue without a choice shows the required error");
  await back(page);
  await page.getByRole("button", { name: "Start my request" }).waitFor();
  ok("path: Back returns to the welcome screen");
  await page.getByRole("button", { name: "Start my request" }).click();

  // Both runs start with "For me"; organization runs switch later, to check
  // that nothing from the abandoned path is sent.
  await page.getByRole("button", { name: /^For me/ }).click();
  await cont(page);

  // Step 2: contact
  await expectHeading(page, "Who should we contact?");
  await cont(page);
  for (const id of ["firstName", "lastName", "email"]) await errorFor(page, id).waitFor();
  await page.waitForFunction((id) => document.activeElement?.id === id, "dsr-firstName", { timeout: 2000 });
  assert.equal(await page.locator("#dsr-email").getAttribute("aria-invalid"), "true");
  ok("contact: name and email required, focus on first error");
  await shot(page, `${sizeName}-${path}-2-contact-errors`);
  await page.fill("#dsr-firstName", path === "organization" ? "Avery" : "Morgan");
  await page.fill("#dsr-lastName", "Synthetic");
  await page.fill("#dsr-email", "not-an-email");
  await page.fill("#dsr-phone", "abc");
  await cont(page);
  assert.match(await errorFor(page, "email").textContent(), /Check the email address/);
  assert.match(await errorFor(page, "phone").textContent(), /Check the phone number/);
  ok("contact: invalid email and phone are rejected");
  await page.fill("#dsr-email", email.toUpperCase());
  await page.fill("#dsr-phone", "(555) 010-4242");
  await page.fill("#dsr-city", "Dayton");
  await page.fill("#dsr-region", "OH");
  await page.locator("#dsr-region").press("Enter");
  await expectHeading(page, "Tell us where you serve.");
  ok("contact: Enter in a field advances like Continue");

  if (path === "organization") {
    // Answer the individual question, then go back and switch paths.
    await choose(page, "individualRole", "Missionary");
    await page.fill("#dsr-churchOrCommunity", "Abandoned Individual Church");
    await back(page);
    await back(page);
    await expectHeading(page, "Who is DOS for?");
    await page.getByRole("button", { name: /^For my organization/ }).click();
    assert.equal(await page.getByRole("button", { name: /^For my organization/ }).getAttribute("aria-pressed"), "true");
    await cont(page);
    await cont(page);
    ok("path switched from For me to For my organization; contact answers kept");
  }

  // Step 3: details
  await expectHeading(page, "Tell us where you serve.");
  await cont(page);
  if (path === "individual") {
    await errorFor(page, "individualRole").waitFor();
    await page.waitForFunction((id) => document.activeElement?.id === id, "dsr-individualRole", { timeout: 2000 });
    ok("details (individual): role required, focus on the select");
    await shot(page, `${sizeName}-${path}-3-details-errors`);
    await choose(page, "individualRole", "Small group or Bible study leader");
    await page.fill("#dsr-churchOrCommunity", "Synthetic Community Church");
  } else {
    for (const id of ["organizationName", "organizationType", "organizationRole", "expectedUsers"]) await errorFor(page, id).waitFor();
    await page.waitForFunction((id) => document.activeElement?.id === id, "dsr-organizationName", { timeout: 2000 });
    ok("details (organization): name, kind, role, size required; focus on first");
    await shot(page, `${sizeName}-${path}-3-details-errors`);
    await page.fill("#dsr-organizationName", "Synthetic Fellowship");
    await choose(page, "organizationType", "Church");
    await page.fill("#dsr-organizationRole", "Discipleship Pastor");
    await choose(page, "expectedUsers", "11–50 people");
    await page.fill("#dsr-organizationWebsite", "https://synthetic-fellowship.example");
  }
  assert.equal(await errorFor(page, path === "individual" ? "individualRole" : "expectedUsers").count(), 0);
  await cont(page);

  // Step 4: use
  await expectHeading(page, "How do you plan to use DOS?");
  await cont(page);
  await page.getByText("Choose at least one way you plan to use DOS.").waitFor();
  ok("use: at least one use required");
  await page.getByRole("button", { name: "Prayer and follow-up" }).click();
  await page.getByRole("button", { name: "Small groups" }).click();
  await page.getByRole("button", { name: "Small groups" }).click();
  await page.getByRole("button", { name: "Journeys and reading plans" }).click();
  assert.equal(await page.getByRole("button", { name: "Small groups" }).getAttribute("aria-pressed"), "false");
  ok("use: checkbox rows toggle on and off");
  await page.fill("#dsr-goals", "Line one of synthetic goals.\nLine two.");
  await choose(page, "heardAbout", "A friend or leader invited me");
  await page.fill("#dsr-invitedBy", "Jordan Synthetic");
  await shot(page, `${sizeName}-${path}-4-use`);

  // Save and resume
  await page.waitForTimeout(700);
  assert.equal((await page.locator(".saved").textContent()).trim(), "Saved on this device");
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Continue my request" }).click();
  await expectHeading(page, "How do you plan to use DOS?");
  assert.equal(await page.getByRole("button", { name: "Journeys and reading plans" }).getAttribute("aria-pressed"), "true");
  assert.equal(await page.inputValue("#dsr-goals"), "Line one of synthetic goals.\nLine two.");
  assert.equal((await page.locator("#dsr-heardAbout .select-value").textContent()).trim(), "A friend or leader invited me");
  ok("reload: Continue my request resumes this step with every answer kept");
  await back(page);
  await expectHeading(page, "Tell us where you serve.");
  const detailKept = path === "individual"
    ? (await page.locator("#dsr-individualRole .select-value").textContent()).trim() === "Small group or Bible study leader"
    : (await page.locator("#dsr-expectedUsers .select-value").textContent()).trim() === "11–50 people";
  assert.ok(detailKept);
  ok("Back: earlier step shows its saved answers");
  await cont(page);
  await cont(page);

  // Step 5: review
  await expectHeading(page, "Review and send your request.");
  assert.equal(await reviewValue(page, "Request").textContent(), path === "individual" ? "DOS for me" : "DOS for my organization");
  assert.equal(await reviewValue(page, "Name").textContent(), `${path === "organization" ? "Avery" : "Morgan"} Synthetic`);
  assert.equal(await reviewValue(page, "Email").textContent(), email);
  assert.equal(await reviewValue(page, "Location").textContent(), "Dayton, OH");
  assert.equal(await reviewValue(page, "Help with").textContent(), "Prayer and follow-up\nJourneys and reading plans");
  assert.equal(await reviewValue(page, "Heard about DOS").textContent(), "A friend or leader invited me");
  const labels = await reviewLabels(page);
  if (path === "individual") {
    assert.equal(await reviewValue(page, "Describes you").textContent(), "Small group or Bible study leader");
    assert.ok(!labels.includes("Organization") && !labels.includes("Website"));
  } else {
    assert.equal(await reviewValue(page, "Organization").textContent(), "Synthetic Fellowship");
    assert.equal(await reviewValue(page, "People using DOS").textContent(), "11–50 people");
    assert.ok(!labels.includes("Describes you") && !labels.includes("Church or community"));
  }
  ok("review: every answer shown, email normalized, other path's fields hidden");
  await page.getByRole("button", { name: "Send request" }).click();
  await errorFor(page, "acknowledgement").waitFor();
  await page.waitForFunction(() => document.activeElement?.id === "dsr-acknowledgement", null, { timeout: 2000 });
  await page.waitForTimeout(300);
  const hidden = await page.evaluate(() => {
    const barTop = document.querySelector(".bar").getBoundingClientRect().top;
    const box = document.querySelector("#dsr-acknowledgement").getBoundingClientRect();
    const error = document.querySelector("#dsr-acknowledgement-error").getBoundingClientRect();
    return { barTop: Math.round(barTop), boxBottom: Math.round(box.bottom), errorBottom: Math.round(error.bottom), boxTop: Math.round(box.top) };
  });
  assert.ok(hidden.boxTop >= 0 && hidden.errorBottom <= hidden.barTop, `acknowledgement or its error is hidden behind the action bar: ${JSON.stringify(hidden)}`);
  ok("review: Send without the acknowledgement shows the error, focused and clear of the action bar");
  await page.getByRole("button", { name: /^Edit/ }).nth(1).click();
  await expectHeading(page, "Who should we contact?");
  await page.fill("#dsr-phone", "(555) 010-9999");
  for (let i = 0; i < 3; i += 1) await cont(page);
  await expectHeading(page, "Review and send your request.");
  assert.equal(await reviewValue(page, "Mobile phone").textContent(), "(555) 010-9999");
  ok("review: Edit About you opens that step and the change shows on review");
  await tickAcknowledgement(page);
  await shot(page, `${sizeName}-${path}-5-review`);

  // Submission: a network failure keeps the answers, then a double click sends once.
  await page.route("**/api/dos/access-requests", (route) => route.abort());
  await page.getByRole("button", { name: "Send request" }).click();
  await page.getByText("We could not reach the server.").waitFor();
  assert.equal(rowsFor(email), 0);
  await expectHeading(page, "Review and send your request.");
  ok("submit: a network failure shows an error, keeps the review, saves nothing");
  await page.unroute("**/api/dos/access-requests");
  await page.evaluate(() => { const b = document.querySelector(".bar .btn-primary"); b.click(); b.click(); b.click(); });
  await expectHeading(page, "Thank you. Your request is in.");
  const reference = (await page.locator(".ref .code").textContent()).trim();
  assert.match(reference, /^DOS-[A-Z0-9]{6}$/);
  assert.ok(await page.getByText("Awaiting review").first().isVisible());
  assert.ok(await page.getByText("No account has been created yet").isVisible());
  assert.ok(await page.getByText(email).first().isVisible());
  assert.equal(await page.locator('main a[href^="/"]').count(), 0);
  ok(`submit: confirmation ${reference}, awaiting review, no account, no links away`);
  await shot(page, `${sizeName}-${path}-6-confirmation`);
  assert.equal(rowsFor(email), 1);
  const row = rowFor(email);
  assert.equal(row.reference_code, reference);
  assert.equal(row.status, "submitted");
  assert.equal(row.access_status, "not_started");
  assert.equal(row.request_type, path);
  assert.equal(row.phone, "(555) 010-9999");
  assert.equal(row.source_page, "/dos/setup");
  if (path === "organization") {
    assert.equal(row.organization_name, "Synthetic Fellowship");
    assert.equal(row.expected_users, "11–50 people");
    assert.equal(row.answers.individualRole ?? "", "", `abandoned individual answer stored: ${row.answers.individualRole}`);
    assert.equal(row.answers.churchOrCommunity ?? "", "", `abandoned individual answer stored: ${row.answers.churchOrCommunity}`);
  } else {
    assert.equal(row.organization_name, null);
    assert.equal(row.answers.individualRole, "Small group or Bible study leader");
  }
  ok("database: exactly one row, status submitted, access not started, answers match");
  await page.reload({ waitUntil: "networkidle" });
  await expectHeading(page, "Thank you. Your request is in.");
  assert.equal((await page.locator(".ref .code").textContent()).trim(), reference);
  ok("reload after submitting shows the same confirmation");
  assert.equal(joinPosts.length, 0);
  ok("no request went to /api/join/*");
  await ctx.close();

  // Same email, different case, new device: no second row.
  const ctx2 = await browser.newContext(sizes[sizeName]);
  const page2 = await ctx2.newPage();
  await page2.goto(`${BASE}/dos/setup?path=individual`, { waitUntil: "networkidle" });
  await page2.getByRole("button", { name: "Start my request" }).click();
  await expectHeading(page2, "Who should we contact?");
  await page2.fill("#dsr-firstName", "Again");
  await page2.fill("#dsr-lastName", "Synthetic");
  await page2.fill("#dsr-email", email.replace(/^./, (c) => c.toUpperCase()));
  await cont(page2);
  await choose(page2, "individualRole", "Disciple-maker");
  await cont(page2);
  await page2.getByRole("button", { name: "Prayer and follow-up" }).click();
  await cont(page2);
  await tickAcknowledgement(page2);
  await cont(page2);
  await expectHeading(page2, "You already have a request waiting.");
  assert.equal(rowsFor(email), 1);
  ok("duplicate: same email from another device is refused; still one row");
  await ctx2.close();
  return { email, reference, row };
}

const results = [];
const only = process.env.ONLY; // e.g. ONLY=phone/organization to repeat one run
for (const sizeName of ["desktop", "phone"]) {
  for (const path of ["individual", "organization"]) {
    if (!only || only === `${sizeName}/${path}`) results.push(await walk(sizeName, path));
  }
}
if (only) { await browser.close(); console.log(`\n${passed} checks passed.`); process.exit(0); }

// /join stays separate.
console.log("\n/join");
{
  const ctx = await browser.newContext(sizes.phone);
  const page = await ctx.newPage();
  const response = await page.goto(`${BASE}/join`, { waitUntil: "networkidle" });
  assert.ok(response.status() < 500);
  assert.equal(await page.locator(".dsr").count(), 0);
  assert.equal(await page.locator('[data-dos-setup]').count(), 0);
  ok(`/join (${response.status()}) is its own page, not the DOS access form`);
  await page.screenshot({ path: `${OUT}/join.png` });
  await page.goto(`${BASE}/dos/setup?restart=1`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.setItem("dos-unified-setup-draft-v1", JSON.stringify({ contactEmail: "casey.usa289@localtest.dev", firstName: "Casey", setupPath: "usam", storyTestimony: "Synthetic testimony text for the walkthrough." })));
  await page.goto(`${BASE}/dos/setup`, { waitUntil: "networkidle" });
  await page.getByText("You have an unfinished USA Missionaries application on this device.").waitFor();
  assert.equal(await page.locator('a[href="/join"]').count(), 1);
  ok("an unfinished missionary draft is pointed to /join, and only then");
  await ctx.close();
}

// Operations detail shows the submitted answers.
console.log("\nOperations detail");
{
  const ctx = await browser.newContext(sizes.desktop);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login?next=%2Foperations%2Fsubmissions`);
  await page.fill('input[name="email"]', "reviewer.usa289@localtest.dev");
  await page.fill('input[name="password"]', "Local-Test-Pass-1");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/operations\/submissions/);
  const answersPanel = (page) => page.locator("section").filter({ has: page.getByRole("heading", { exact: true, name: "Answers" }) }).first().innerText();

  // A local copy of production request DOS-B5FFW3's stored answers (same
  // answers JSON; synthetic name, email, and phone), to check how its detail reads.
  const copyId = process.env.B5FFW3_COPY_ID;
  if (copyId) {
    await page.goto(`${BASE}/operations/submissions/dos-access/${copyId}`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Request Summary" }).waitFor();
    const answers = await answersPanel(page);
    for (const value of ["Describes them", "Disciple-maker", "Church or community", "Fox", "Keep track of the people I am discipling", "Heard about DOS", "A friend or leader invited me", "Invited by", "Ryan", "Lakeville", "Minnesota"]) {
      assert.ok(answers.includes(value), `DOS-B5FFW3 copy detail is missing "${value}"`);
    }
    for (const value of ["Kind of organization", "People who would use DOS", "Anything else"]) assert.ok(!answers.includes(value), `DOS-B5FFW3 copy shows "${value}"`);
    const summary = await page.locator("main").innerText();
    assert.ok(summary.includes("Individual") && summary.includes("Awaiting review"));
    ok("DOS-B5FFW3's stored answers render as submitted: role, church, use, how heard, invited by, location; nothing blank or off-path");
    await page.screenshot({ fullPage: true, path: `${OUT}/operations-b5ffw3-copy.png` });
  }

  for (const { email, reference, row } of results.filter((r) => r.email.includes("desktop"))) {
    await page.goto(`${BASE}/operations/submissions/dos-access/${row.id}`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Request Summary" }).waitFor();
    const text = await page.locator("main").innerText();
    assert.ok(text.includes(reference) || text.includes(email));
    const answers = await answersPanel(page);
    const expected = row.request_type === "organization"
      ? ["Synthetic Fellowship", "Church", "Discipleship Pastor", "11–50 people", "Prayer and follow-up", "Journeys and reading plans", "Jordan Synthetic"]
      : ["Small group or Bible study leader", "Synthetic Community Church", "Prayer and follow-up", "Journeys and reading plans", "Jordan Synthetic"];
    for (const value of expected) assert.ok(answers.includes(value), `${row.request_type} detail is missing "${value}"`);
    const forbidden = row.request_type === "organization" ? ["Describes them", "Abandoned Individual Church"] : ["Kind of organization", "People who would use DOS"];
    for (const value of forbidden) assert.ok(!answers.includes(value), `${row.request_type} detail shows "${value}"`);
    ok(`${row.request_type} detail shows the submitted answers and nothing from the other path`);
    await page.screenshot({ fullPage: true, path: `${OUT}/operations-${row.request_type}.png` });
  }
  await ctx.close();
}

await browser.close();
console.log(`\n${passed} checks passed. Screenshots in ${OUT}.`);
