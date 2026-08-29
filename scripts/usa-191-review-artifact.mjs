/**
 * USA-191: builds the founder review page.
 *
 * The point of this script is that the review cannot lie. Rather than
 * reimplementing the Welcome screen and the application in a mockup, it drives
 * the real production build, lifts the real rendered DOM off each screen, and
 * ships it alongside the real stylesheet and the real watershed engine
 * compiled from the same TypeScript the site runs. What a reviewer looks at is
 * the shipping markup, the shipping CSS and the shipping animation.
 *
 * Usage, against a production build already serving on 4300:
 *
 *   npm run build
 *   npx next start --hostname 127.0.0.1 --port 4300 &
 *   node scripts/usa-191-review-artifact.mjs
 *
 * Writes docs/usa-191-review/founder-review.html.
 */
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const BASE = "http://127.0.0.1:4300";
const EXEC = process.env.USA191_CHROMIUM || undefined;
const OUT = "docs/usa-191-review/founder-review.html";

/* ------------------------------------------------------------------ stubs */

/**
 * The draft and submit endpoints need Supabase, which a review host has no
 * credentials for. Stubbing them in the browser lets the captured screens show
 * their normal saved state instead of a retry state that exists nowhere but
 * here, and lets the submitted screen be reached at all.
 */
async function stub(page) {
  await page.route("**/api/join/draft", (route) =>
    route.fulfill({
      body: JSON.stringify({ emailSent: true, resumeToken: "usa-191-review" }),
      contentType: "application/json",
      status: 200,
    }),
  );
  await page.route("**/api/join/application", (route) =>
    route.fulfill({
      body: JSON.stringify({ applicationId: "usam-app-2026-0417-rui" }),
      contentType: "application/json",
      status: 200,
    }),
  );
}

/* -------------------------------------------------------------- capturing */

/**
 * React sets form state as DOM properties, which do not serialise. Reflecting
 * them onto attributes first is what makes a captured screen show the answers
 * that were actually typed into it.
 */
const REFLECT = `
  for (const el of document.querySelectorAll('input, textarea')) {
    if (el.type === 'checkbox' || el.type === 'radio') {
      if (el.checked) el.setAttribute('checked', ''); else el.removeAttribute('checked');
    } else if (el.tagName === 'TEXTAREA') {
      el.textContent = el.value;
    } else {
      el.setAttribute('value', el.value);
    }
  }
`;

async function grab(page) {
  return page.evaluate(`(() => {${REFLECT}
    const root = document.querySelector('main.join');
    return root ? root.outerHTML : '';
  })()`);
}

async function fillAll(page) {
  const textareas = await page.$$(".join-stage textarea");

  for (const area of textareas) {
    if (await area.inputValue()) continue;
    await area.fill(
      "We have spent the last six years in the same neighbourhood, at the same table, with the same families. This is the work we believe God has already been doing through us, and the work we are asking to give ourselves to fully.",
    );
  }

  for (const input of await page.$$('.join-stage input[type="text"], .join-stage input[type="email"]')) {
    if (await input.inputValue()) continue;

    const id = (await input.getAttribute("id")) ?? "";

    if ((await input.getAttribute("inputmode")) === "decimal") await input.fill("350");
    else if (id.includes("email")) await input.fill("daniel.ruiz@example.org");
    else if (id.includes("firstName")) await input.fill("Daniel");
    else if (id.includes("lastName")) await input.fill("Ruiz");
    else if (id.includes("phone")) await input.fill("(555) 214-8890");
    else await input.fill("Waco, Texas");
  }

  for (const check of await page.$$(".join-stage .join-check")) {
    const text = (await check.innerText()).toLowerCase();

    if (text.includes("applying as a couple")) continue;

    const box = await check.$('input[type="checkbox"]');

    if (box && !(await box.isChecked())) await box.check();
  }

  const yes = await page.$('.join-choice:has(.join-choice-title:text-is("Yes"))');

  if (yes && (await yes.getAttribute("aria-pressed")) !== "true") await yes.click();
}

async function advanceUntil(page, probe, max = 60) {
  for (let i = 0; i < max; i += 1) {
    if (await page.$(probe)) return true;

    const next = await page.$(".join-footer .join-button-primary");

    if (!next) return false;

    await fillAll(page);
    await next.click();
    await page.waitForTimeout(240);
  }

  return Boolean(await page.$(probe));
}

async function captureScreens() {
  const browser = await chromium.launch({ executablePath: EXEC });
  const context = await browser.newContext({ viewport: { height: 900, width: 1440 } });
  const page = await context.newPage();

  await stub(page);
  await page.goto(`${BASE}/join`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1400);

  const screens = {};

  screens.welcome = await grab(page);
  console.log("  captured welcome");

  await page.click(".join-hero-actions .join-button-primary");
  await page.waitForTimeout(700);
  await page.fill("#applicant-firstName", "Daniel");
  await page.fill("#applicant-lastName", "Ruiz");
  await page.fill("#applicant-email", "daniel.ruiz@example.org");
  await page.fill("#applicant-phone", "(555) 214-8890");
  await page.waitForTimeout(300);
  screens.identity = await grab(page);
  console.log("  captured identity");

  await page.click('.join-rail button[aria-label="Your Story"]');
  await page.waitForTimeout(500);
  await page.fill(
    "#story\\.testimony",
    "I grew up two streets from the church and never once walked in. A neighbour kept inviting us to dinner, and it was at that table, not in a service, that somebody finally explained the gospel to me in words I could hold.",
  );
  await page.waitForTimeout(300);
  screens.story = await grab(page);
  console.log("  captured story");

  await page.click('.join-rail button[aria-label="Support and Fundraising"]');
  await page.waitForTimeout(500);
  screens.supportPath = await grab(page);
  console.log("  captured supportPath");

  await page.click('.join-choice:has(.join-choice-title:text-is("Yes"))');
  await page.waitForTimeout(400);
  await advanceUntil(page, "#supportBudget\\.housing");
  await page.fill("#supportBudget\\.housing", "2400");
  await page.fill("#supportBudget\\.foodHousehold", "900");
  await page.fill("#supportBudget\\.utilities", "260");
  await page.fill("#supportBudget\\.transportation", "410");
  await page.fill("#supportBudget\\.hospitalityMeals", "300");
  await page.fill("#supportBudget\\.localTravel", "180");
  await page.waitForTimeout(400);
  screens.worksheet = await grab(page);
  console.log("  captured worksheet");

  await advanceUntil(page, "#supportMonthlyNeed");
  await page.fill("#supportMonthlyNeed", "4450");
  await page.fill("#supportCommittedAmount", "1200");
  await page.fill("#supportRequestedGoal", "4450");
  await page.waitForTimeout(400);
  screens.supportPicture = await grab(page);
  console.log("  captured supportPicture");

  // The captures above jumped around the rail, so whole steps were never
  // visited and their required questions are still empty. Walk the flow from
  // the first step to fill every page, then land on review.
  await page.click('.join-rail button[aria-label="About You"]');
  await page.waitForTimeout(400);
  await advanceUntil(page, ".join-review-list");
  // advanceUntil stops the moment the review screen appears, so the four
  // acknowledgements on it have not been confirmed yet.
  await fillAll(page);
  await page.waitForTimeout(500);
  screens.review = await grab(page);
  console.log("  captured review");

  const submit = await page.$('.join-fields .join-button-primary:has-text("Submit application")');

  if (submit && (await submit.isEnabled())) {
    await submit.click();
    await page.waitForTimeout(1600);
    screens.submitted = await grab(page);
    console.log("  captured submitted");
  } else {
    console.log("  skip submitted (submit not enabled)");
  }

  await browser.close();

  return screens;
}

/* ------------------------------------------------------------- the engine */

/**
 * Compiles the shipping watershed engine to plain script.
 *
 * The two modules are emitted by the project's own TypeScript, then their
 * import and export keywords are removed so they concatenate into one classic
 * script. No reimplementation: the animation on the review page is the
 * animation on the site.
 */
function buildEngine() {
  const dir = mkdtempSync(path.join(tmpdir(), "usa191-"));

  execFileSync(
    "npx",
    [
      "tsc",
      "app/join/watershed-data.ts",
      "app/join/watershed-engine.ts",
      "--outDir",
      dir,
      "--target",
      "ES2020",
      "--module",
      "ESNext",
      "--skipLibCheck",
      "--lib",
      "ES2020,DOM",
    ],
    { stdio: "inherit" },
  );

  const data = readFileSync(path.join(dir, "watershed-data.js"), "utf8")
    .replace(/^export /gm, "");
  const engine = readFileSync(path.join(dir, "watershed-engine.js"), "utf8")
    .replace(/^import[^;]+;\s*$/gm, "")
    .replace(/^export /gm, "");

  return `${data}\n${engine}`;
}

/* ------------------------------------------------------------------ build */

console.log("Capturing the shipping screens\n");

const screens = await captureScreens();

console.log("\nCompiling the shipping watershed engine\n");

const engine = buildEngine();

const mountain = readFileSync("public/missionary-mountain-background-v2.png").toString("base64");

/* The stylesheet, verbatim, with the one asset path turned into a data URI so
   the page stays self contained. */
const css = readFileSync("app/join/join-experience.css", "utf8").replace(
  'url("/missionary-mountain-background-v2.png")',
  `url("data:image/png;base64,${mountain}")`,
);

const SCREENS = [
  { key: "welcome", label: "Welcome", live: true, note: "The opening. The watershed is live: light travels from the headwaters down to the Gulf, and the pointer wakes whatever is near it." },
  { key: "identity", label: "About you", note: "Step 1. The couple model is the checkbox; ticking it adds a second person in their own right." },
  { key: "story", label: "A narrative question", note: "Typeform pacing. One question owns the screen, set as the heading, with room to write and no second label over the box." },
  { key: "supportPath", label: "The branch", note: "Nothing advances until this is answered. Number keys 1, 2 and 3 answer it from the keyboard." },
  { key: "worksheet", label: "Private worksheet", note: "The USA-167 seventeen category worksheet, unchanged. Private to the review team." },
  { key: "supportPicture", label: "Support picture", note: "Budget total, proposed need, covered and gap. The three money values stay separate; Operations owns the approved public goal." },
  { key: "review", label: "Review and submit", note: "Every required question answered, all four acknowledgements confirmed." },
  { key: "submitted", label: "Submitted", note: "Warm without promising anything: submitting is not acceptance." },
].filter((screen) => screens[screen.key]);

const payload = {
  css,
  engine,
  screens: Object.fromEntries(SCREENS.map((s) => [s.key, screens[s.key]])),
};

const page = `<title>USA-191 Join Review</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Oswald:wght@500;600&display=swap">
<style>
  /*
   * The review chrome defers to the product. The join experience has its own
   * design system and this page is a frame around it, so the frame borrows the
   * product's faces and its warm neutral and then gets out of the way. Anything
   * louder here would compete with the thing being reviewed.
   *
   * Tokens are declared once for light, then redefined for the two dark states
   * the viewer can be in: the un-stamped system default, and an explicit
   * toggle. Components only ever read tokens.
   */
  :root {
    --ground: #ece6da;
    --raised: #fbf9f5;
    --edge: #ded4c2;
    --edge-strong: #c9bda6;
    --ink: #171f2b;
    --ink-soft: #55606f;
    --accent: #a6821c;
    --accent-ink: #16130a;
    --shadow: rgba(23, 31, 43, 0.11);
  }

  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --ground: #14171d;
      --raised: #1c212a;
      --edge: #2c333e;
      --edge-strong: #3c4451;
      --ink: #f1eee8;
      --ink-soft: #a4adba;
      --accent: #d8b043;
      --accent-ink: #16130a;
      --shadow: rgba(0, 0, 0, 0.45);
    }
  }

  :root[data-theme="dark"] {
    --ground: #14171d;
    --raised: #1c212a;
    --edge: #2c333e;
    --edge-strong: #3c4451;
    --ink: #f1eee8;
    --ink-soft: #a4adba;
    --accent: #d8b043;
    --accent-ink: #16130a;
    --shadow: rgba(0, 0, 0, 0.45);
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    background: var(--ground);
    color: var(--ink);
    font-family: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  .wrap {
    max-width: 1520px;
    margin: 0 auto;
    padding: 28px clamp(14px, 3vw, 32px) 64px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  header h1 {
    margin: 0;
    font-family: "Oswald", "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: clamp(1.24rem, 2.4vw, 1.6rem);
    font-weight: 600;
    letter-spacing: 0.012em;
    text-transform: uppercase;
    text-wrap: balance;
  }

  .lede {
    margin: 9px 0 0;
    max-width: 66ch;
    font-size: 0.92rem;
    line-height: 1.62;
    color: var(--ink-soft);
  }

  .lede b { color: var(--ink); font-weight: 600; }

  .bar {
    position: sticky;
    top: 0;
    z-index: 5;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    padding: 12px 0;
    background: var(--ground);
    border-bottom: 1px solid var(--edge);
  }

  .tabs { display: flex; flex-wrap: wrap; gap: 6px; }
  .widths { display: flex; gap: 6px; margin-left: auto; }

  button {
    font: inherit;
    font-size: 0.82rem;
    font-weight: 500;
    padding: 8px 13px;
    border-radius: 6px;
    cursor: pointer;
    border: 1px solid var(--edge);
    background: var(--raised);
    color: var(--ink-soft);
    transition: border-color .18s, color .18s, background .18s;
  }

  button:hover { border-color: var(--edge-strong); color: var(--ink); }

  button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  button[aria-pressed="true"] {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-ink);
    font-weight: 600;
  }

  .note {
    margin: 0;
    font-size: 0.88rem;
    line-height: 1.58;
    color: var(--ink-soft);
    max-width: 78ch;
  }

  .note b { color: var(--ink); font-weight: 600; }

  .stage { display: flex; justify-content: center; }

  .device {
    background: var(--raised);
    border: 1px solid var(--edge);
    border-radius: 12px;
    box-shadow: 0 12px 44px var(--shadow);
    overflow: hidden;
    transition: width .32s cubic-bezier(.16, 1, .3, 1), height .32s cubic-bezier(.16, 1, .3, 1);
  }

  iframe { display: block; width: 100%; height: 100%; border: 0; }

  .meta {
    margin: 0;
    text-align: center;
    font-size: 0.72rem;
    letter-spacing: .12em;
    text-transform: uppercase;
    color: var(--ink-soft);
    font-variant-numeric: tabular-nums;
  }

  @media (prefers-reduced-motion: reduce) {
    * { transition-duration: .001ms !important; }
  }
</style>

<div class="wrap">
  <header>
    <h1>USA-191 &middot; Join experience</h1>
    <p class="lede">
      Not a mockup. Every screen here is the rendered markup lifted straight off the production build and
      styled by the shipping stylesheet, and the Welcome screen runs the shipping watershed engine compiled
      from the same TypeScript the site uses. Each screen renders in a frame at a true device width, so what
      you see is what responds at that size. <b>The Welcome map is live</b> &mdash; watch the light travel
      down the tributaries into the Mississippi, and move your pointer across it. The application screens are
      real rendered state rather than a running React app, so their buttons do not advance.
    </p>
  </header>

  <div class="bar">
    <div class="tabs" id="tabs"></div>
    <div class="widths">
      <button data-w="1440" aria-pressed="true">Desktop 1440</button>
      <button data-w="390">Mobile 390</button>
    </div>
  </div>

  <p class="note" id="note"></p>

  <div class="stage">
    <div class="device" id="device"><iframe id="frame" title="Join preview"></iframe></div>
  </div>
  <p class="meta" id="meta"></p>
</div>

<script id="payload" type="application/json">${JSON.stringify(payload).replace(/</g, "\\u003c")}</script>
<script>
  const DATA = JSON.parse(document.getElementById("payload").textContent);
  const SCREENS = ${JSON.stringify(SCREENS)};

  const tabs = document.getElementById("tabs");
  const frame = document.getElementById("frame");
  const device = document.getElementById("device");
  const note = document.getElementById("note");
  const meta = document.getElementById("meta");

  let current = SCREENS[0].key;
  let width = 1440;

  SCREENS.forEach((screen) => {
    const button = document.createElement("button");
    button.textContent = screen.label;
    button.dataset.key = screen.key;
    button.addEventListener("click", () => { current = screen.key; render(); });
    tabs.appendChild(button);
  });

  document.querySelectorAll(".widths button").forEach((button) => {
    button.addEventListener("click", () => { width = Number(button.dataset.w); render(); });
  });

  function render() {
    const screen = SCREENS.find((s) => s.key === current);

    tabs.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.key === current)));
    document.querySelectorAll(".widths button").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.w) === width)));

    note.innerHTML = "<b>" + screen.label + ".</b> " + screen.note;

    // The frame is scaled down to fit on screen while still LAYING OUT at the
    // real device width, so media queries resolve the way they do on the device.
    const room = Math.min(document.querySelector(".wrap").clientWidth, 1440);
    const scale = Math.min(1, room / width);
    const height = width === 390 ? 844 : 900;

    device.style.width = Math.round(width * scale) + "px";
    device.style.height = Math.round(height * scale) + "px";
    frame.style.width = width + "px";
    frame.style.height = height + "px";
    frame.style.transformOrigin = "0 0";
    frame.style.transform = "scale(" + scale + ")";

    meta.textContent = width + " x " + height + (scale < 1 ? "  ·  shown at " + Math.round(scale * 100) + "%" : "");

    const live = screen.live
      ? "<scr" + "ipt>" + DATA.engine +
        "\\nconst c = document.querySelector('canvas.join-map'); if (c) startWatershed(c);</scr" + "ipt>"
      : "";

    frame.srcdoc =
      '<!doctype html><html><head><meta charset="utf-8">' +
      '<link rel="preconnect" href="https://fonts.googleapis.com">' +
      '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
      // media="print" until it loads, so the face request can never block the
      // frame from painting. A blocked or slow font left the frame blank.
      '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Oswald:wght@400;500;600;700&family=Rajdhani:wght@400;500;600;700&display=swap"' +
      // Entities rather than nested quotes: this string passes through a
      // template literal on the way out, which eats backslash escapes.
      ' rel="stylesheet" media="print" onload="this.media=&#39;all&#39;">' +
      "<style>html,body{margin:0;padding:0}" + DATA.css + "</style></head><body>" +
      DATA.screens[current] + live + "</body></html>";
  }

  window.addEventListener("resize", render);
  render();
</script>
`;

writeFileSync(OUT, page);
console.log(`\nWrote ${OUT} (${(page.length / 1024).toFixed(0)} KB)`);
