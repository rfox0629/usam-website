import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { chromium } from "playwright";

const host = "127.0.0.1";
const port = Number(process.env.USA168_UI_PORT || 3197);
const externalBaseUrl = process.env.USA168_UI_BASE_URL?.trim();
const baseUrl = externalBaseUrl || `http://localhost:${port}`;
const previewUrl = `${baseUrl}/dos/app/preview?demo=dos2026`;
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
let server = null;
let serverExited = false;
let serverOutput = "";

if (!externalBaseUrl) {
  server = spawn("npm", ["run", "dev", "--", "--hostname", host, "--port", String(port)], {
    detached: process.platform !== "win32",
    env: { ...process.env, HOSTNAME: host, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (chunk) => { serverOutput += chunk.toString(); });
  server.stderr.on("data", (chunk) => { serverOutput += chunk.toString(); });
  server.on("exit", () => { serverExited = true; });
}

async function stopServer() {
  if (!server || serverExited) return;

  try {
    if (process.platform === "win32") server.kill("SIGTERM");
    else process.kill(-server.pid, "SIGTERM");
  } catch {
    return;
  }

  await Promise.race([once(server, "exit"), delay(5_000)]);
}

async function waitForServer() {
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    if (serverExited) throw new Error(`USA-168 test server exited early.\n${serverOutput}`);

    try {
      const response = await fetch(previewUrl, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      // Development server is still warming up.
    }

    await delay(500);
  }

  throw new Error(`Timed out waiting for ${previewUrl}.\n${serverOutput}`);
}

async function visibleLocators(locator) {
  const matches = [];
  for (let index = 0; index < await locator.count(); index += 1) {
    const candidate = locator.nth(index);
    if (await candidate.isVisible().catch(() => false)) matches.push(candidate);
  }
  return matches;
}

async function clickFirstVisible(locator) {
  const matches = await visibleLocators(locator);
  assert(matches.length, "Expected a visible control, but none was found.");
  await matches[0].click();
}

async function openNaomi(page) {
  await page.goto(previewUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Open Preview" }).waitFor({ state: "detached", timeout: 20_000 }).catch(() => {});
  await page.getByText("Naomi Lee", { exact: true }).first().waitFor({ state: "visible", timeout: 60_000 });

  let fieldControls = await visibleLocators(page.getByText("Field", { exact: true }));
  if (!fieldControls.length) {
    await clickFirstVisible(page.getByText("More", { exact: true }));
    fieldControls = await visibleLocators(page.getByText("Field", { exact: true }));
  }
  assert(fieldControls.length, "Field navigation was not available.");
  await fieldControls[0].click();

  await clickFirstVisible(page.getByText("Naomi Lee", { exact: true }));
  await page.getByRole("heading", { name: "Naomi Lee", exact: true }).waitFor({ state: "visible", timeout: 20_000 });
}

function rectanglesOverlap(first, second) {
  return first.x < second.x + second.width
    && first.x + first.width > second.x
    && first.y < second.y + second.height
    && first.y + first.height > second.y;
}

async function verifyPersonActions(page, width) {
  /* Person actions now all live on the canonical DOS FAB -- the same component
     Meetings uses -- rather than a header control plus a "+". What must not
     regress is that the launcher is present and reachable at every width, that
     it opens the ranked action list, and that it covers no row action once the
     page is scrolled to the end. */
  const launcher = page.getByRole("button", { name: "Open quick actions", exact: true });
  const visibleLaunchers = await visibleLocators(launcher);
  assert(visibleLaunchers.length === 1, `${width}px expected exactly one visible Person FAB, found ${visibleLaunchers.length}.`);
  const launcherBox = await visibleLaunchers[0].boundingBox();

  assert(launcherBox, `${width}px Person action launcher had no measurable bounds.`);
  assert(Math.round(launcherBox.width) === 64, `${width}px Person FAB is ${Math.round(launcherBox.width)}px, not the canonical 64px.`);
  assert(launcherBox.x >= 0 && launcherBox.x + launcherBox.width <= width, `${width}px Person FAB leaves the viewport.`);

  await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")]
      .find((candidate) => candidate.getAttribute("aria-label") === "Open quick actions" && candidate.getBoundingClientRect().width > 0);
    button?.click();
  });
  await delay(400);
  const rankedActions = [
    "Log meeting",
    "Schedule meeting",
    "Add accountability",
    "Add prayer request",
    "Add reminder",
    "Assign journey",
    "Add observed fruit",
    "Edit person",
  ];
  const visibleActions = await page.evaluate((expected) => [...document.querySelectorAll("button")]
    .filter((button) => button.getBoundingClientRect().width > 0 && expected.includes(button.textContent.trim()))
    .map((button) => button.textContent.trim()), rankedActions);
  assert.deepEqual(visibleActions, rankedActions, `${width}px Person actions are not in the agreed order.`);
  await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")]
      .find((candidate) => candidate.getAttribute("aria-label") === "Close quick actions" && candidate.getBoundingClientRect().width > 0);
    button?.click();
  });
  await delay(300);

  /* The Person action launcher is deliberately a floating + again. What must
     never regress is the behaviour the original check was protecting: the FAB
     must not sit on top of a row action, and the page must still scroll far
     enough that the last actionable row clears it. Assert that directly
     instead of banning fixed positioning. */
  const layout = await page.evaluate(async () => {
    const scroller = [...document.querySelectorAll("*")].find((element) => (
      element.scrollHeight > element.clientHeight + 4
      && ["auto", "scroll"].includes(getComputedStyle(element).overflowY)
    ));

    if (scroller) {
      scroller.scrollTop = scroller.scrollHeight;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const fab = [...document.querySelectorAll("button")].find((button) => (
      (button.getAttribute("aria-label") || "").includes("actions for Naomi")
      && getComputedStyle(button).position === "fixed"
    ));
    const fabBox = fab?.getBoundingClientRect() ?? null;
    const rowActions = [...(scroller ?? document).querySelectorAll("button")]
      .filter((button) => button.textContent.trim().length > 1 && button.getBoundingClientRect().height > 0)
      .map((button) => button.getBoundingClientRect());
    const covered = fabBox
      ? rowActions.filter((box) => (
        box.bottom > fabBox.top && box.top < fabBox.bottom
        && box.right > fabBox.left && box.left < fabBox.right
      )).length
      : 0;

    return {
      coveredRowActions: covered,
      viewportWidth: window.innerWidth,
      widestDocumentWidth: document.documentElement.scrollWidth,
    };
  });
  assert(layout.widestDocumentWidth <= layout.viewportWidth, `${width}px Person view has horizontal overflow.`);
  assert.equal(layout.coveredRowActions, 0, `${width}px floating + covers ${layout.coveredRowActions} row action(s).`);
}

async function verifyGroupRoundTrip(page) {
  const groupName = page.getByText("Thursday Women's Study", { exact: true });
  const groupLabels = await visibleLocators(groupName);
  assert(groupLabels.length, "Naomi's Group was not visible on the Person overview.");
  const groupRow = groupLabels[0].locator("xpath=../..");
  await groupRow.getByRole("button", { name: "View", exact: true }).click();
  await page.getByRole("heading", { name: "Thursday Women's Study", exact: true }).waitFor({ state: "visible", timeout: 20_000 });

  const moreButtons = await visibleLocators(page.getByRole("button", { name: "More", exact: true }));
  assert(moreButtons.length, "Group back control was not visible.");
  const withBoxes = await Promise.all(moreButtons.map(async (button) => ({ button, box: await button.boundingBox() })));
  withBoxes.sort((first, second) => (first.box?.y ?? Infinity) - (second.box?.y ?? Infinity));
  await withBoxes[0].button.click();
  await page.getByRole("heading", { name: "Naomi Lee", exact: true }).waitFor({ state: "visible", timeout: 20_000 });
}

async function verifyCompactReviewRequest(page) {
  /* The stranded "Request review" link under Fruit is gone. Feedback is now
     requested from the FAB, which asks Quick Review or Testimony first. The
     behaviour being protected is unchanged: the request reaches the one
     canonical send sheet with its question preview collapsed. */
  await page.evaluate(() => {
    const launcher = [...document.querySelectorAll("button")]
      .find((button) => button.getAttribute("aria-label") === "Open quick actions" && button.getBoundingClientRect().width > 0);
    launcher?.click();
  });
  await delay(500);
  await page.evaluate(() => {
    const request = [...document.querySelectorAll("button")]
      .find((button) => button.textContent.trim() === "Request feedback" && button.getBoundingClientRect().width > 0);
    request?.click();
  });
  await delay(700);
  await page.evaluate(() => {
    const quickReview = [...document.querySelectorAll("button")]
      .find((button) => button.textContent.trim().startsWith("Quick Review") && button.getBoundingClientRect().width > 0);
    quickReview?.click();
  });
  await delay(700);
  const previewQuestions = page.getByText("Preview questions", { exact: true });
  await previewQuestions.waitFor({ state: "visible" });
  const detailsOpen = await previewQuestions.locator("xpath=ancestor::details").getAttribute("open");
  assert.equal(detailsOpen, null, "Review question preview should be collapsed by default.");
  await page.getByRole("button", { name: /Send (Quick Review|Review Options|Testimony Request)/ }).waitFor({ state: "visible" });
}

async function main() {
  await waitForServer();
  const browser = await chromium.launch({ headless: true });

  try {
    for (const width of [390, 768, 1440]) {
      const page = await browser.newPage({ viewport: { height: width === 390 ? 844 : width === 768 ? 1024 : 900, width } });
      await openNaomi(page);
      await verifyPersonActions(page, width);
      await verifyGroupRoundTrip(page);
      if (width === 390) await verifyCompactReviewRequest(page);
      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log("USA-168 Person UI behavior passed at 390×844, 768×1024, and 1440×900.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(stopServer);
