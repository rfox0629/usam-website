// USA-275 — browser check for Multiplication in the DB-free preview.
//
// Trusted Playwright input against a production build: the People overview
// hierarchy and heading scale, keyboard expand / collapse, opening names,
// Dirk's read-only navigation Ryan → Tanner → Aaron, In person labels in both
// report views, and the report's current multiplication detail. Fixtures only.
//
//   npm run build
//   DOS_BROWSER_BASE_URL=http://localhost:3275 node scripts/dos-multiplication-browser-check.mjs [screenshot-dir]
//
// Without DOS_BROWSER_BASE_URL the script starts `npm run start` itself.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const port = Number(process.env.DOS_BROWSER_PORT || 4275);
const baseUrl = process.env.DOS_BROWSER_BASE_URL || `http://127.0.0.1:${port}`;
const token = process.env.DOS_PREVIEW_TOKEN || "dos2026";
const shotDir = process.argv[2] ? path.resolve(process.argv[2]) : null;
let server = null;

async function waitForServer() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/dos/app/preview?demo=${token}`);

      if (response.ok) {
        return;
      }
    } catch {
      // not up yet
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Server did not start at ${baseUrl}`);
}

async function shot(page, name) {
  if (shotDir) {
    await page.mouse.move(-10, -10);
    await page.screenshot({ path: path.join(shotDir, `${name}.png`) });
  }
}

async function openPeople(page, mobile) {
  const people = page.getByRole("button", { exact: true, name: "People" });
  await (mobile ? people.last() : people.first()).click();
}

async function openPerson(page, name, mobile) {
  if (mobile) {
    await page.getByRole("button", { exact: true, name: `Open ${name}` }).click();
  } else {
    await page.getByRole("button", { name: new RegExp(`\\b${name}\\b`) }).first().click();
  }

  await page.getByRole("heading", { exact: true, level: 2, name }).waitFor();
}

async function run() {
  if (!process.env.DOS_BROWSER_BASE_URL) {
    server = spawn("npm", ["run", "start", "--", "-p", String(port)], { env: { ...process.env, PORT: String(port) }, stdio: "ignore" });
  }

  await waitForServer();

  if (shotDir) {
    await mkdir(shotDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const results = [];
  const check = async (label, fn) => {
    await fn();
    results.push(label);
    console.log(`ok - ${label}`);
  };

  try {
    // ---------------- Ryan, mobile ----------------
    const mobile = await browser.newPage({ deviceScaleFactor: 2, viewport: { height: 844, width: 390 } });
    await mobile.goto(`${baseUrl}/dos/app/preview?demo=${token}`, { waitUntil: "networkidle" });
    await openPeople(mobile, true);

    await check("Manage circles stays in the People actions row", async () => {
      await mobile.locator('[aria-label="People actions"]').getByRole("button", { name: "Manage circles" }).waitFor();
    });

    await openPerson(mobile, "Tanner Kent", true);

    await check("overview hierarchy: MULTIPLICATION, ACTIVITY, FRUIT & FEEDBACK", async () => {
      const structure = await mobile.evaluate(() => Array.from(document.querySelectorAll("[data-overview-group]")).map((group) => ({
        label: group.getAttribute("data-overview-group"),
        sections: Array.from(group.querySelectorAll("section[aria-label]")).map((section) => section.getAttribute("aria-label")),
      })));
      assert.deepEqual(structure, [
        { label: "Multiplication", sections: [] },
        { label: "Activity", sections: ["Journey", "Accountability", "Groups", "Prayer"] },
        { label: "Fruit & Feedback", sections: ["Fruit", "Feedback"] },
      ]);
    });

    await check("group headings: DOS blue, uppercase, bolder and larger than eyebrows, smaller than the name", async () => {
      const styles = await mobile.evaluate(() => {
        const read = (element) => {
          const style = getComputedStyle(element);
          return { color: style.color, size: parseFloat(style.fontSize), transform: style.textTransform, weight: Number(style.fontWeight) };
        };
        const group = document.querySelector("[data-overview-group] > div > h2");
        const eyebrow = document.querySelector('[data-overview-group="Activity"] section[aria-label="Journey"] h2');
        const name = Array.from(document.querySelectorAll("h2")).find((heading) => heading.textContent === "Tanner Kent");
        return { eyebrow: read(eyebrow), group: read(group), name: read(name) };
      });
      assert.equal(styles.group.color, "rgb(34, 81, 232)");
      assert.equal(styles.group.transform, "uppercase");
      assert.ok(styles.group.size > styles.eyebrow.size && styles.group.size < styles.name.size, JSON.stringify(styles));
      assert.ok(styles.group.weight >= styles.eyebrow.weight, JSON.stringify(styles));
      assert.equal(styles.eyebrow.color, "rgb(34, 81, 232)", "Subsection eyebrows stay DOS blue.");
    });

    await check("Multiplying is shown and the Multiplication list is compact", async () => {
      await mobile.getByText(/Discipling · Multiplying/).first().waitFor();
      const group = mobile.locator('[data-overview-group="Multiplication"]');
      const text = await group.innerText();
      assert.match(text, /Aaron Johnson · 1/);
      assert.match(text, /Caleb Stone/);
      assert.match(text, /Luke Harmon/);
      assert.match(text, /Discipling 3 people/);
      assert.match(text, /4 people across all generations/);
      assert.doesNotMatch(text, /Recorded by|Discipled by|cadence/i);
    });

    await check("keyboard expand and collapse", async () => {
      const expand = mobile.getByRole("button", { name: "Show the 1 person Aaron Johnson disciples" });
      await expand.focus();
      await mobile.keyboard.press("Enter");
      const hide = mobile.getByRole("button", { name: "Hide the 1 person Aaron Johnson disciples" });
      await hide.waitFor();
      assert.equal(await hide.getAttribute("aria-expanded"), "true");
      await mobile.locator('[data-overview-group="Multiplication"]').getByText("Eli Brooks").waitFor();
      await hide.focus();
      await mobile.keyboard.press(" ");
      await expand.waitFor();
      assert.equal(await mobile.locator('[data-overview-group="Multiplication"]').getByText("Eli Brooks").count(), 0);
    });

    await shot(mobile, "mobile-person-multiplication");

    await check("opening a connected name opens the read-only view", async () => {
      await mobile.locator('[data-overview-group="Multiplication"]').getByRole("button", { name: /^Aaron Johnson/ }).focus();
      await mobile.keyboard.press("Enter");
      const dialog = mobile.getByRole("dialog");
      await dialog.getByRole("heading", { name: "Aaron Johnson" }).waitFor();
      await dialog.getByText("Read-only").first().waitFor();
      assert.equal(await dialog.locator("input, textarea, select").count(), 0, "The connected view has no inputs.");
      await mobile.keyboard.press("Escape");
      await dialog.waitFor({ state: "detached" });
    });

    await check("connected activity: In person label, attributed, read-only", async () => {
      await mobile.getByRole("button", { name: "Tanner’s DOS activity" }).click();
      const dialog = mobile.getByRole("dialog");
      await dialog.getByRole("heading", { name: "Tanner Kent" }).waitFor();
      await dialog.getByRole("button", { name: /^Meetings/ }).click();
      await dialog.getByRole("button", { name: /^In person · / }).click();
      const detail = await dialog.innerText();
      assert.match(detail, /How\s*In person/);
      assert.doesNotMatch(detail, /Kitchen table/i);
      await shot(mobile, "mobile-connected-meeting");
      await mobile.keyboard.press("Escape");
    });

    await mobile.evaluate(() => window.scrollTo(0, 0));

    await check("scroll-positioned group screenshot", async () => {
      await mobile.locator('[data-overview-group="Activity"]').scrollIntoViewIfNeeded();
      await shot(mobile, "mobile-person-activity-groups");
    });

    // ---------------- Dirk, mobile ----------------
    const dirk = await browser.newPage({ deviceScaleFactor: 2, viewport: { height: 844, width: 390 } });
    await dirk.goto(`${baseUrl}/dos/app/preview?demo=${token}&perspective=dirk`, { waitUntil: "networkidle" });
    await openPeople(dirk, true);
    await openPerson(dirk, "Ryan Fox", true);

    await check("Dirk sees Ryan's direct disciples, Tanner Kent · 3, and expands the generations", async () => {
      const group = dirk.locator('[data-overview-group="Multiplication"]');
      await group.getByText(/Tanner Kent · 3/).waitFor();
      await group.getByRole("button", { name: "Show the 3 people Tanner Kent disciples" }).click();
      await group.getByRole("button", { name: "Show the 1 person Aaron Johnson disciples" }).click();
      await group.getByText("Eli Brooks").waitFor();
      assert.match(await group.innerText(), /Discipling 4 people/);
    });

    await shot(dirk, "mobile-dirk-ryan-multiplication");

    await check("Dirk navigates Ryan → Tanner → Aaron read-only, and back", async () => {
      await dirk.getByRole("button", { name: "Ryan’s DOS activity" }).click();
      const dialog = dirk.getByRole("dialog");
      await dialog.getByRole("heading", { name: "Ryan Fox" }).waitFor();
      await dialog.getByRole("button", { name: /^Meetings/ }).waitFor();
      assert.doesNotMatch(await dialog.innerText(), /Kitchen table/i);
      await dialog.getByRole("button", { name: /^Tanner Kent/ }).click();
      await dialog.getByRole("heading", { name: "Tanner Kent" }).waitFor();
      await dialog.getByRole("button", { name: /^Aaron Johnson/ }).click();
      await dialog.getByRole("heading", { name: "Aaron Johnson" }).waitFor();
      await dialog.getByRole("button", { name: /^Meetings/ }).click();
      await dialog.getByRole("button", { name: /^Coffee · / }).waitFor();
      await shot(dirk, "mobile-dirk-aaron-meetings");
      await dialog.getByRole("button", { exact: true, name: "Back" }).click();
      await dialog.getByRole("button", { exact: true, name: "Back" }).click();
      await dialog.getByRole("heading", { name: "Tanner Kent" }).waitFor();
      assert.equal(await dialog.locator("input, textarea, select").count(), 0);
    });

    // ---------------- Reports, desktop ----------------
    const desktop = await browser.newPage({ viewport: { height: 900, width: 1440 } });
    await desktop.goto(`${baseUrl}/dos/app/preview?demo=${token}`, { waitUntil: "networkidle" });

    await check("desktop profile keeps the same hierarchy", async () => {
      await openPeople(desktop, false);
      await openPerson(desktop, "Tanner Kent", false);
      const labels = await desktop.evaluate(() => Array.from(document.querySelectorAll("[data-overview-group]")).map((group) => group.getAttribute("data-overview-group")));
      assert.deepEqual(labels, ["Multiplication", "Activity", "Fruit & Feedback"]);
      await shot(desktop, "desktop-person-multiplication");
    });

    await desktop.goto(`${baseUrl}/dos/app/preview?demo=${token}`, { waitUntil: "networkidle" });

    await check("Reports: Multiplication column, Multiplying filter, In person labels, current detail", async () => {
      await desktop.getByRole("button", { name: "Reports" }).first().click();
      await desktop.getByRole("button", { name: "Multiplying" }).first().waitFor();
      const row = desktop.locator("tr", { has: desktop.getByRole("button", { exact: true, name: "Tanner Kent" }) }).first();
      await row.waitFor();
      const cells = await row.locator("td").allInnerTexts();
      assert.equal(cells[5].trim(), "3", `Multiplication cell: ${JSON.stringify(cells)}`);
      await row.getByRole("button", { name: /Show records|records/i }).last().click();
      const expanded = await desktop.locator("table").first().innerText();
      assert.doesNotMatch(expanded, /Kitchen table/i, "Expanded contributing records never say Kitchen table.");
      await row.getByRole("button", { exact: true, name: "Tanner Kent" }).click();
      const dialog = desktop.getByRole("dialog");
      await dialog.getByText("Current connections, not limited to this period.").waitFor();
      await dialog.getByText("Not included in your totals.").waitFor();
      const detail = await dialog.innerText();
      assert.match(detail, /Aaron Johnson · 1/);
      assert.doesNotMatch(detail, /Kitchen table/i, "Person detail contributing records never say Kitchen table.");
      await shot(desktop, "desktop-report-person-multiplication");
    });

    console.log(`\nDOS multiplication browser check passed (${results.length} checks).`);
  } finally {
    await browser.close();

    if (server) {
      server.kill("SIGTERM");
    }
  }
}

run().catch((error) => {
  console.error(error);

  if (server) {
    server.kill("SIGTERM");
  }

  process.exit(1);
});
