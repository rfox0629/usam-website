// USA-289: DOS entry, sign-in, and welcome flow, end to end in Chrome.
// Test harness only; run against the local stack in README.md, never
// production. Every account is synthetic (*.usa289@localtest.dev).
//
//   node docs/dos-onboarding/local-walkthrough/entry-flow.mjs
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://127.0.0.1:3100";
const AUTH = process.env.AUTH ?? "http://127.0.0.1:54321/auth/v1";
const OUT = process.env.OUT ?? "/var/tmp/pgusam/entry";
const PASSWORD = "Local-Test-Pass-1";
mkdirSync(OUT, { recursive: true });
let passed = 0;
const ok = (message) => { passed += 1; console.log(`  ok  ${message}`); };
const fonts = await import(new URL("../../../.audit-tmp/fonts-route.mjs", import.meta.url)).catch(() => null);
const setPassword = (email) => fetch(`${AUTH}/__password`, { body: JSON.stringify({ email, password: PASSWORD }), headers: { "Content-Type": "application/json" }, method: "POST" });
await fetch(`${AUTH}/__seed`, { body: JSON.stringify({ email: "nodos.usa289@localtest.dev", password: PASSWORD }), headers: { "Content-Type": "application/json" }, method: "POST" }).catch(() => undefined);
for (const email of ["quinn.usa289@localtest.dev", "existing.usa289@localtest.dev", "nodos.usa289@localtest.dev", "reviewer.usa289@localtest.dev"]) await setPassword(email);

console.log("Route map (signed out)");
// A route with a loading state streams, so its redirect arrives in the body
// (Next's NEXT_REDIRECT marker plus a meta refresh) rather than as a header.
const location = async (path) => {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
  const header = res.headers.get("location");
  if (header) return { how: `HTTP ${res.status}`, location: header.replace(BASE, ""), status: res.status };
  const body = await res.text();
  const streamed = /NEXT_REDIRECT;(?:replace|push);([^;]+);30[78];/.exec(body);
  return streamed ? { how: "streamed redirect", location: streamed[1].replace(/&amp;/g, "&"), status: 307 } : { how: `HTTP ${res.status}`, location: null, status: res.status };
};
const redirects = [
  ["/dos", "/dos/sign-in"],
  ["/dos/signup", "/dos/setup"],
  ["/dos/sign-up", "/dos/setup"],
  ["/dos/register", "/dos/setup"],
  ["/dos/onboarding", "/dos/setup"],
  ["/dos/login?next=%2Fdos%2Fquinn-synthetic", "/dos/sign-in?next=%2Fdos%2Fquinn-synthetic"],
  ["/dos/signin", "/dos/sign-in"],
  ["/login?next=%2Fdos", "/dos/sign-in"],
  ["/login?next=%2Fdos%2Fsignup", "/dos/sign-in"],
  ["/login?next=%2Fdos&signedOut=1", "/dos/sign-in?signedOut=1"],
  ["/login?next=%2Fdos%2Fquinn-synthetic&error=auth-link", "/dos/sign-in?next=%2Fdos%2Fquinn-synthetic&error=auth-link"],
  ["/dos/quinn-synthetic", "/dos/sign-in?next=%2Fdos%2Fquinn-synthetic"],
];
for (const [from, to] of redirects) {
  const result = await location(from);
  assert.ok([307, 308].includes(result.status) && result.location === to, `${from} -> ${result.status} ${result.location}, expected ${to}`);
  ok(`${from} → ${to} (${result.how})`);
}
for (const path of ["/dos/sign-in", "/dos/setup", "/dos/walkthrough", "/join", "/login?next=%2Foperations"]) {
  const result = await location(path);
  assert.equal(result.status, 200, `${path} -> ${result.status}`);
}
ok("/dos/sign-in, /dos/setup, /dos/walkthrough, /join, and the Operations sign-in each render (200)");
const legacy = await fetch(`${BASE}/api/join/submit`, { body: JSON.stringify({ accountEmail: "bypass.usa289@localtest.dev", firstName: "By", lastName: "Pass", password: "x".repeat(12) }), headers: { "Content-Type": "application/json" }, method: "POST" });
assert.equal(legacy.status, 410); ok("POST /api/join/submit (the old account + workspace endpoint) is closed: 410");
const portal = await fetch(`${BASE}/api/dos/portal/workspaces`, { body: "{}", headers: { "Content-Type": "application/json" }, method: "POST" });
assert.ok([401, 403].includes(portal.status)); ok(`POST /api/dos/portal/workspaces without staff sign-in is refused: ${portal.status}`);

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const sizes = { desktop: { viewport: { width: 1440, height: 900 } }, phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true } };
const context = async (size = "desktop") => { const ctx = await browser.newContext(sizes[size]); if (fonts) await fonts.routeFonts(ctx); return ctx; };
const signIn = async (page, email, next) => {
  await page.goto(`${BASE}/dos/sign-in${next ? `?next=${encodeURIComponent(next)}` : ""}`, { waitUntil: "networkidle" });
  await page.fill("#dsi-email", email);
  await page.fill("#dsi-password", PASSWORD);
  await page.press("#dsi-password", "Enter");
};

console.log("DOS sign-in page");
for (const size of ["desktop", "phone"]) {
  const ctx = await context(size);
  const page = await ctx.newPage();
  const videoRequests = [];
  page.on("request", (request) => { if (request.url().includes("/videos/dos/")) videoRequests.push(request.url().split("/").pop()); });
  await page.goto(`${BASE}/dos/sign-in`, { waitUntil: "networkidle" });
  assert.equal(await page.title(), "Sign in | DOS");
  assert.equal(await page.locator('input[type="email"]').count(), 1);
  assert.equal(await page.getByRole("link", { name: "Request DOS access" }).getAttribute("href"), "/dos/setup");
  const html = await page.content();
  assert.ok(!/\/operations|\/admin"|Operations sign/i.test(html), "the DOS sign-in page must not link staff pages");
  ok(`${size}: one email field, Sign in / Email me a sign-in link, Request DOS access; no staff links`);
  assert.deepEqual(videoRequests.filter((f) => !f.endsWith(".jpg")), []); ok(`${size}: walkthrough shows its poster; no video bytes before Play`);
  await page.screenshot({ fullPage: true, path: `${OUT}/sign-in-${size}.png` });
  await page.getByRole("button", { name: /Play the 1:52 DOS walkthrough/ }).click();
  await page.waitForFunction(() => { const v = document.querySelector(".dsi video"); return v && !v.paused && v.currentTime > 1.5; }, null, { timeout: 20000 });
  const src = await page.locator(".dsi video").evaluate((v) => v.currentSrc.split("/").pop());
  assert.equal(src, size === "phone" ? "dos-walkthrough-v1-720p.webm" : "dos-walkthrough-v1-1080p.webm");
  const cues = await page.locator(".dsi video").evaluate(async (v) => { const t = v.textTracks[0]; t.mode = "showing"; for (let i = 0; i < 40 && !t.cues?.length; i += 1) await new Promise((r) => setTimeout(r, 100)); return t.cues?.length ?? 0; });
  assert.ok(cues >= 10, `captions cues: ${cues}`);
  assert.equal(await page.locator(".dsi .play").count(), 0);
  ok(`${size}: Play starts the real ${src} file with the served captions (${cues} cues); the play button gives way to controls`);
  await page.waitForTimeout(2500);
  await page.locator(".dsi .video").screenshot({ path: `${OUT}/sign-in-${size}-video-playing.png` });
  await page.locator(".dsi details summary").click();
  assert.equal(await page.locator("#dsi-video-steps li").count(), 6); ok(`${size}: the six steps are readable as text`);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
  await ctx.close();
}
{
  const ctx = await context();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/dos/sign-in`, { waitUntil: "networkidle" });
  await page.fill("#dsi-email", "quinn.usa289@localtest.dev");
  await page.fill("#dsi-password", "wrong-password");
  await page.press("#dsi-password", "Enter");
  await page.getByText("That email and password didn't match.").waitFor();
  ok("a wrong password shows a clear error on the DOS page");
  await page.screenshot({ path: `${OUT}/sign-in-error.png` });
  await page.fill("#dsi-email", "quinn.usa289@localtest.dev");
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await page.getByText("If this address has DOS access, a sign-in link is on its way.").waitFor();
  ok("Email me a sign-in link uses the same email field and confirms without revealing whether the account exists");
  await page.fill("#dsi-email", "quinn.usa289@localtest.dev");
  await page.getByRole("button", { name: "Forgot or set password" }).click();
  await page.getByText("Check your email for a link to set or reset your password.").waitFor();
  ok("Forgot or set password is available as a secondary choice");
  await ctx.close();
}

console.log("Accounts");
{
  const ctx = await context();
  const page = await ctx.newPage();
  await signIn(page, "quinn.usa289@localtest.dev", "/dos/signup");
  await page.waitForURL(/\/dos\/quinn-synthetic/);
  ok("approved new user: signing in (even from an old /dos/signup link) lands in their own workspace via /dos");
  await page.waitForLoadState("networkidle"); await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/new-user-workspace.png` });
  await page.goto(`${BASE}/dos/sign-in`); await page.waitForURL(/\/dos\/quinn-synthetic/);
  ok("an already signed-in user who opens the sign-in page goes straight to DOS");
  await page.evaluate(() => { const f = document.createElement("form"); f.method = "post"; f.action = "/api/access/logout"; document.body.append(f); f.submit(); });
  await page.waitForURL(/\/dos\/sign-in\?signedOut=1/);
  await page.getByText("You're signed out.").waitFor();
  await page.goto(`${BASE}/dos`); await page.waitForURL(/\/dos\/sign-in$/);
  ok("sign out lands on the DOS sign-in page, and /dos asks to sign in again");
  await ctx.close();
}
{
  const ctx = await context("phone");
  const page = await ctx.newPage();
  await signIn(page, "existing.usa289@localtest.dev", "/dos/sam-existing");
  await page.waitForURL(/\/dos\/sam-existing/);
  ok("existing user and workspace: a validated DOS destination is kept");
  await ctx.close();
}
{
  const ctx = await context();
  const page = await ctx.newPage();
  await signIn(page, "nodos.usa289@localtest.dev");
  await page.waitForURL(`${BASE}/dos`);
  await page.getByRole("heading", { name: "Your DOS access isn't set up yet" }).waitFor();
  assert.equal(await page.getByRole("link", { name: "Request DOS access" }).getAttribute("href"), "/dos/setup");
  await page.screenshot({ path: `${OUT}/no-workspace.png` });
  await page.goto(`${BASE}/dos/quinn-synthetic`, { waitUntil: "networkidle" });
  assert.ok(/Workspace unavailable|isn't set up/.test(await page.locator("body").innerText()));
  ok("a signed-in account with no approved workspace gets no DOS access and is pointed to Request DOS access");
  await ctx.close();
}
{
  const ctx = await context();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login?next=%2Foperations`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Operations Sign In" }).waitFor();
  await page.screenshot({ path: `${OUT}/operations-sign-in.png` });
  await page.fill('input[name="email"]', "reviewer.usa289@localtest.dev");
  await page.fill('input[name="password"]', PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/operations/);
  ok("staff: /login?next=/operations is the Operations sign-in and opens Operations");

  console.log("Welcome email");
  for (const variant of ["new", "existing"]) {
    await page.goto(`${BASE}/operations/submissions/dos-access/welcome-email?variant=${variant}`, { waitUntil: "networkidle" });
    const html = await page.locator("iframe").first().getAttribute("srcdoc");
    const text = await page.locator("pre").innerText();
    const links = [...new Set([...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]))];
    const images = [...new Set([...html.matchAll(/src="([^"]+)"/g)].map((m) => m[1]))];
    assert.deepEqual(links, ["https://usamissionaries.org/dos"]);
    assert.deepEqual(images, ["https://usamissionaries.org/images/email/dos-mark-v1.png"]);
    assert.ok(!/walkthrough|login|workspace-slug|mailto/i.test(html) && text.includes("Open DOS: https://usamissionaries.org/dos"));
    assert.equal(/Email me a sign-in link/.test(html), variant === "new");
    for (const [label, width] of [["desktop", 700], ["phone", 375]]) {
      const c = await browser.newContext({ deviceScaleFactor: 2, viewport: { height: 800, width } });
      await c.route("https://usamissionaries.org/**", async (route) => {
        const res = await fetch(route.request().url().replace("https://usamissionaries.org", BASE));
        await route.fulfill({ body: Buffer.from(await res.arrayBuffer()), contentType: res.headers.get("content-type") ?? undefined, status: res.status });
      });
      const p = await c.newPage();
      await p.setContent(html, { waitUntil: "networkidle" });
      assert.deepEqual(await p.evaluate(() => [...document.images].filter((i) => !i.naturalWidth).length), 0);
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
      await p.screenshot({ fullPage: true, path: `${OUT}/email-${variant}-${label}.png` });
      await c.close();
    }
    ok(`${variant} account: one link (Open DOS → /dos), one image (logo), no walkthrough or login links, plain text kept; renders at 700px and 375px`);
  }
  await ctx.close();
}
await browser.close();
console.log(`\n${passed} checks passed. Screenshots in ${OUT}.`);
