// USA-274: Relationship select behavior in a real browser (touch, mouse, keyboard).
//
// Runs against a running DOS server with the token-gated demo route:
//   BASE=http://localhost:3000 node scripts/dos-relationship-select-behavior.mjs
// Not part of `npm run test:dos` (that aggregate is static and needs no
// server). Covers WebKit + touch -- the engine where a tapped option used to
// leave its list open -- and Chromium with touch, mouse and keyboard.
import { chromium, webkit } from "playwright";

const base = process.env.BASE || "http://localhost:3000";
const token = process.env.DOS_PREVIEW_TOKEN?.trim() || "dos2026";
let failures = 0;

function check(engine, condition, message) {
  console.log(`${condition ? "PASS" : "FAIL"} [${engine}] ${message}`);
  if (!condition) failures += 1;
}

const expanded = (page, label) => page.locator(`[aria-label="${label}"]`).getAttribute("aria-expanded");
const hiddenValue = (page, name) => page.locator(`input[type="hidden"][name="${name}"]`).first().inputValue();
const summary = (page) => page.locator('button[aria-controls="person-section-relationship"] span span').nth(1).innerText();

async function openAddRelationship(page, press) {
  await page.goto(`${base}/dos/app/preview?demo=${token}`, { waitUntil: "networkidle" });
  const homeAction = page.getByRole("button", { name: "Add Person" }).first();

  if (await homeAction.isVisible()) {
    await press(homeAction);
  } else {
    // Desktop: People, then the quick-actions button, then Add Person.
    await press(page.getByRole("button", { name: "People", exact: true }).first());
    await press(page.getByRole("button", { name: "Open quick actions" }).first());
    await press(page.getByRole("button", { name: "Add Person" }).first());
  }
  await press(page.locator('button[aria-controls="person-section-relationship"]'));
}

const runs = [
  { engine: webkit, name: "webkit touch", context: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }, press: (locator) => locator.tap() },
  { engine: chromium, name: "chromium touch", context: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }, press: (locator) => locator.tap() },
  { engine: chromium, name: "chromium mouse desktop", context: { viewport: { width: 1440, height: 900 } }, press: (locator) => locator.click() },
];

for (const run of runs) {
  const browser = await run.engine.launch();
  const page = await (await browser.newContext(run.context)).newPage();
  const { press, name } = run;
  await openAddRelationship(page, press);
  const stage = page.locator('[aria-label="How are you connected?"]');
  const context = page.locator('[aria-label="How do you know them?"]');
  const visibility = page.locator('[aria-label="List visibility"]');

  // Selecting the option that is already selected closes the list.
  await press(stage);
  check(name, (await expanded(page, "How are you connected?")) === "true", "the connected list opens");
  await press(page.getByRole("option", { name: /Getting to know them/ }));
  await page.waitForTimeout(120);
  check(name, (await expanded(page, "How are you connected?")) === "false", "choosing the already-selected option closes the list");
  check(name, (await stage.innerText()).includes("Getting to know them"), "the selected value stays visible");

  // Selecting a new option closes the list and records the value.
  await press(stage);
  await press(page.getByRole("option", { name: /I am discipling them/ }));
  await page.waitForTimeout(120);
  check(name, (await expanded(page, "How are you connected?")) === "false", "choosing a new option closes the list");
  check(name, (await stage.innerText()).includes("I am discipling them"), "the new value shows in the closed control");
  check(name, (await hiddenValue(page, "relationship_type_value")) === "discipling", "the submitted stage value is discipling");

  await press(context);
  await press(page.getByRole("option", { name: /^Friend/ }));
  await page.waitForTimeout(120);
  check(name, (await expanded(page, "How do you know them?")) === "false", "choosing a context closes its list");
  check(name, (await hiddenValue(page, "relationship_context")) === "friend", "the submitted context value is friend");
  check(name, (await page.locator('button[aria-controls="person-section-relationship"]').getAttribute("aria-expanded")) === "true", "the Relationship section stays open after choosing");
  check(name, (await summary(page)) === "I am discipling them · Friend", `the summary is short (got "${await summary(page)}")`);

  // One list at a time. (Open the lower list, then the trigger above it: an
  // open list covers the controls beneath it, exactly as it does for a person.)
  await press(context);
  await press(stage);
  await page.waitForTimeout(120);
  check(name, (await expanded(page, "How do you know them?")) === "false" && (await expanded(page, "How are you connected?")) === "true", "opening a second list closes the first");
  await page.keyboard.press("Escape");
  await press(context);

  // The bottom of the long context list is reachable above the sticky footer.
  const reach = await page.evaluate(() => {
    const listbox = document.querySelector('[role="listbox"]');
    const options = listbox ? [...listbox.querySelectorAll('[role="option"]')] : [];
    const last = options.at(-1);
    last?.scrollIntoView({ block: "nearest" });
    const rect = last?.getBoundingClientRect();
    const hit = rect ? document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) : null;
    const footer = [...document.querySelectorAll("div.sticky.bottom-0")].at(-1)?.getBoundingClientRect();
    return { count: options.length, lastHit: Boolean(hit && last?.contains(hit)), lastBottom: rect?.bottom ?? 0, footerTop: footer?.top ?? Infinity, viewport: innerHeight };
  });
  check(name, reach.count === 9 && reach.lastHit && reach.lastBottom <= reach.viewport, `the last context option is visible and not covered (bottom ${Math.round(reach.lastBottom)}, footer top ${Math.round(reach.footerTop)})`);
  await press(page.getByRole("option", { name: /^Other/ }));
  await page.waitForTimeout(120);
  check(name, (await hiddenValue(page, "relationship_context")) === "other" && (await expanded(page, "How do you know them?")) === "false", "the last option can be chosen and closes the list");

  // A press outside dismisses.
  await press(visibility);
  await press(page.locator('button[aria-controls="person-section-basic"]'));
  await page.waitForTimeout(120);
  check(name, (await expanded(page, "List visibility")) === "false", "a press outside closes the list");
  if ((await page.locator('button[aria-controls="person-section-relationship"]').getAttribute("aria-expanded")) !== "true") {
    await press(page.locator('button[aria-controls="person-section-relationship"]'));
  }

  // Non-default visibility is added to the summary.
  await press(visibility);
  await press(page.getByRole("option", { name: /Household only/ }));
  await page.waitForTimeout(120);
  check(name, (await summary(page)) === "I am discipling them · Other · Household only", `non-default visibility joins the summary (got "${await summary(page)}")`);

  // No horizontal overflow: nothing in the form reaches past the viewport, and
  // neither the page nor the task screen scrolls sideways. (The form's own
  // scrollWidth is not a signal: the sticky footer deliberately bleeds -mx-4.)
  const overflow = await page.evaluate(() => {
    const form = document.querySelector("#person-section-relationship")?.closest("form");
    const beyond = form ? [...form.querySelectorAll("*")].some((el) => { const rect = el.getBoundingClientRect(); return rect.width > 0 && (rect.right > innerWidth + 1 || rect.left < -1); }) : true;
    const scroller = form?.closest(".overflow-y-auto");
    return beyond || document.documentElement.scrollWidth > innerWidth + 1 || Boolean(scroller && scroller.scrollWidth > scroller.clientWidth + 1);
  });
  check(name, !overflow, "no horizontal overflow");

  // Escape closes and returns focus to the trigger.
  await press(stage);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(80);
  check(name, (await expanded(page, "How are you connected?")) === "false", "Escape closes the list");

  if (name === "chromium mouse desktop") {
    // Keyboard: Enter opens with focus on the selected option, arrows move, Enter chooses.
    await context.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(80);
    const focusedOption = await page.evaluate(() => document.activeElement?.getAttribute("role") + ":" + document.activeElement?.getAttribute("aria-selected"));
    check(name, focusedOption === "option:true", `Enter opens the list with focus on the selected option (got ${focusedOption})`);
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(80);
    check(name, (await hiddenValue(page, "relationship_context")) === "friend" && (await expanded(page, "How do you know them?")) === "false", "Home, ArrowDown, Enter chooses Friend and closes");
    check(name, (await page.evaluate(() => document.activeElement?.getAttribute("aria-label"))) === "How do you know them?", "focus returns to the trigger after choosing");
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(80);
    check(name, (await expanded(page, "How do you know them?")) === "true", "ArrowDown on the trigger opens the list");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(80);
    check(name, (await expanded(page, "How do you know them?")) === "false", "tabbing out of the list closes it");
  }

  await browser.close();
}

if (failures) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nDOS Relationship select behavior (USA-274) passed.");
