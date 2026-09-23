/* /join application audit (2026-09-23): the defects found walking the whole
 * application as an applicant, kept from coming back.
 *
 * 1. References, household members and prayer partners: "Add another" never
 *    added a row, and a space typed between two words vanished, because the
 *    rows were re-derived from the stored text (which drops blank rows and
 *    trims cells) on every keystroke.
 * 2. Return on a phone keyboard inside one of those rows advanced to the next
 *    step halfway through entering a person.
 * 3. A refresh opened a blank application: the resume token lived only in
 *    component state.
 * 4. "What community or area is on your heart?" and "Describe the vision or
 *    burden you are carrying." were asked and never submitted.
 * 5. Operations read only the DOS onboarding payload, so a /join record showed
 *    no spouse, address, household, church, experience, mission or profile
 *    draft, and every reference as "Reference" plus a raw line.
 *
 * The rules run for real; the wiring is checked against source. With
 * JOIN_BROWSER_BASE set (a running `next dev`, e.g. http://localhost:3000) the
 * reference list is also driven in Chromium, with the draft API stubbed.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { listRowCount, parseListValue, serializeListValue } from "../app/join/field-list.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const check = (label, condition) => {
  assert.ok(condition, label);
  console.log(`  ok    ${label}`);
};

console.log("/join application audit regression\n");

// ---- the stored form of a repeating answer
const three = [
  ["Jordan Example", "Former pastor", "jordan@example.test"],
  ["Morgan Sample", "Mentor", "555-0101"],
];
check("rows round-trip through the stored text", JSON.stringify(parseListValue(serializeListValue(three), 3)) === JSON.stringify(three));
check("a name with a space keeps the space", parseListValue(serializeListValue([["Jordan Example", "", ""]]), 3)[0][0] === "Jordan Example");
check("a blank row is not stored", listRowCount(serializeListValue([...three, ["", "", ""]])) === 2);
check(
  "a pipe typed inside a cell cannot shift the columns after it",
  JSON.stringify(parseListValue(serializeListValue([["A | B", "Friend", "x@example.test"]]), 3)[0]) === JSON.stringify(["A / B", "Friend", "x@example.test"]),
);
check("a row with no name keeps its later cells in place", parseListValue(serializeListValue([["", "Mentor", ""]]), 3)[0][1] === "Mentor");

// ---- the list control holds its own rows
const client = read("app/join/UsamApplicationClient.tsx");
const listField = client.slice(client.indexOf("function ListField("), client.indexOf("function FieldInput("));

check("the list control keeps the rows being edited in state", listField.includes("useState(() => ({ rows: parseListValue(value, columns.length), source: value }))"));
check("the list control rebuilds its rows only when the stored value changes from outside", listField.includes("if (value !== editing.source)"));
check("the list control no longer re-derives its rows from the stored text on every render", !/const rows = parseListValue\(value/.test(listField));
check("the question label points at the first cell", listField.includes("id={rowIndex === 0 && cellIndex === 0 ? id : undefined}"));
check("Enter inside a repeating answer stays on the page", client.includes('target?.closest(".join-list") && !modified'));

// ---- refresh restores the draft
check("the resume token is kept in the address bar once minted", client.includes('url.searchParams.set("resume", token)') && client.includes("window.history.replaceState"));
check("leaving the page sends unsaved edits once more", client.includes('window.addEventListener("pagehide", flush)') && client.includes("keepalive: true"));
check("the last-chance save never creates a draft without a token", client.includes("!latest.token ||"));
check("the review names an incomplete reference", client.includes("A name and a way to reach each reference"));

// ---- every question reaches the submitted application
const fields = read("app/join/application-fields.ts");
const submission = read("src/lib/join/submit-application.ts");
const fieldIds = [...fields.matchAll(/\{ id: "([A-Za-z.]+)", kind: "(?:short|long|money|list)"/g)].map((match) => match[1]);
const listIds = [...fields.matchAll(/id: "([A-Za-z]+)",\n\s+kind: "list"/g)].map((match) => match[1]);
const allIds = [...new Set([...fieldIds, ...listIds])];

check(`the question list was read (${allIds.length} questions)`, allIds.length >= 50 && allIds.includes("references"));

for (const id of allIds) {
  check(`"${id}" is written into the submitted application`, submission.includes(`"${id}"`));
}

// ---- Operations shows what /join submitted
const operations = read("src/lib/operations/onboarding.ts");
const detailPage = read("app/operations/missionaries/[id]/page.tsx");

check("Operations reads the /join spouse and address", operations.includes("asRecord(contactPayload.spouse)") && operations.includes("asRecord(contactPayload.address)"));
check("Operations reads /join household members", operations.includes("joinListRows(contactPayload.familyMembers, 3)"));
check("Operations splits /join references into name, relationship and contact", operations.includes("joinListRows(row.references_text, 3)"));
check("Operations reads /join prayer partners", operations.includes("joinListRows(joinPartners, 2)"));
check("Operations lists both /join photos", operations.includes("asArray(asRecord(row.contact_payload).photos)"));
check("Operations shows church, calling, experience, mission and profile draft answers", ["Church", "Calling", "Experience", "Mission", "Profile Draft (Unpublished)"].every((title) => operations.includes(`title: "${title}"`)));
check("the Operations record renders the application answers", detailPage.includes("item.applicationAnswers.map"));

// ---- in the browser, when a dev server is available
const base = process.env.JOIN_BROWSER_BASE;

if (base) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

  try {
    for (const width of [1280, 390]) {
      const page = await browser.newPage({ viewport: { height: 844, width } });

      await page.route("**/api/join/draft", (route) => route.fulfill({ json: { created: true, resumeToken: "regression-token" } }));
      await page.goto(`${base}/join`);
      await page.getByRole("button", { name: /begin/i }).first().click();
      await page.getByRole("button", { name: "Experience" }).click();

      for (let step = 0; step < 10 && !(await page.getByText("Who can speak to your character").count()); step += 1) {
        await page.getByRole("button", { name: /^Continue/ }).click();
      }

      const rows = page.locator(".join-list-row");
      const add = page.getByRole("button", { name: /Add another reference/ });

      await add.click();
      await add.click();
      check(`${width}px: Add another reference adds rows`, (await rows.count()) === 3);

      await rows.nth(0).locator("input").nth(0).pressSequentially("Jordan Example");
      check(`${width}px: a space typed in a name is kept`, (await rows.nth(0).locator("input").nth(0).inputValue()) === "Jordan Example");

      await rows.nth(0).locator("input").nth(1).press("Enter");
      check(`${width}px: Enter in a reference stays on References`, (await page.getByText("Who can speak to your character").count()) > 0);

      await rows.nth(2).getByRole("button", { name: /Remove/ }).click();
      check(`${width}px: Remove takes one row away`, (await rows.count()) === 2);

      await page.waitForURL(/resume=regression-token/, { timeout: 5000 });
      check(`${width}px: the resume token is in the address bar after the first save`, page.url().includes("resume=regression-token"));
      await page.close();
    }
  } finally {
    await browser.close();
  }
} else {
  console.log("  skip  browser checks (set JOIN_BROWSER_BASE to a running dev server)");
}

console.log("\n/join application audit regression passed.");
