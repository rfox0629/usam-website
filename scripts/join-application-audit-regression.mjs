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

import {
  incompleteReferences,
  listCellId,
  listRowCount,
  parseListValue,
  referenceRowGaps,
  serializeListValue,
} from "../app/join/field-list.ts";

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
check("the question label points at the first cell", listCellId("references", 0, 0) === "references" && listField.includes("id={listCellId(id, rowIndex, cellIndex)}"));
check("every other cell has its own id Review can point at", listCellId("references", 2, 2) === "references-row3-cell3");
check("Enter inside a repeating answer stays on the page", client.includes('target?.closest(".join-list") && !modified'));

// ---- refresh restores the draft
check("the resume token is kept in the address bar once minted", client.includes('url.searchParams.set("resume", token)') && client.includes("window.history.replaceState"));
check("leaving the page sends unsaved edits once more", client.includes('window.addEventListener("pagehide", flush)') && client.includes("keepalive: true"));
check("the last-chance save never creates a draft without a token", client.includes("!latest.token ||"));
// ---- USA-285: Review names the incomplete reference and what it lacks
const refs = serializeListValue([
  ["Jordan Example", "Former pastor", "jordan@example.test"],
  ["Taylor Placeholder", "Coworker", ""],
  ["", "Mentor", "555-0104"],
]);
const incomplete = incompleteReferences(refs);

check("a complete reference is not flagged", !incomplete.some((item) => item.rowIndex === 0));
check("a reference with no contact is named with what it lacks", incomplete.some((item) => item.label === "Reference 2 (Taylor Placeholder): add a phone or email" && item.cellIndex === 2));
check("a reference with no name says so", incomplete.some((item) => item.label === "Reference 3: add a name" && item.cellIndex === 0));
check("an empty reference list flags nothing (the required check covers it)", incompleteReferences("").length === 0);
check("the on-page marks agree with Review", JSON.stringify(referenceRowGaps(["Taylor", "Coworker", ""])) === "[2]" && JSON.stringify(referenceRowGaps(["", "", ""])) === "[]");
check("each incomplete reference jumps to its empty cell", client.includes("focusId: listCellId(\"references\", reference.rowIndex, reference.cellIndex)"));
check("the old catch-all reference message is gone", !client.includes("A name and a way to reach each reference"));
check("Review jumps offer the way straight back", client.includes("Back to review") && client.includes("fromReview: true"));

// ---- USA-285: Review shows the answers, with Edit links
check("Review renders an answer summary", client.includes("<ReviewSummary draft={draft} onJump={onJump} />"));
check("the summary reads from the same field list as the form", client.includes("for (const field of visibleFieldsForStep(stepId, draft.applyingAsCouple))"));
check("every summary row has an Edit link back to its question", client.includes("aria-label={`Edit ${row.label}`}"));

// ---- USA-285: resume reopens the exact question
const steps = read("src/lib/join/application-steps.ts");
const draftRoute = read("app/api/join/draft/route.ts");
const drafts = read("src/lib/join/drafts.ts");

check("the draft carries the page it was saved on", steps.includes("position?: string;") && client.includes("draft: { ...draft, position: currentPageKey }"));
check("the draft API keeps a well-formed position and drops anything else", draftRoute.includes("position: normalizeJoinDraftPosition(record.position)") && drafts.includes("position: normalizeJoinDraftPosition(record.position)"));
check("a page key is built from names, never from a page index", client.includes("return `${page.stepId}/${page.sectionId}/${leaf}`;"));
check("an older draft without a position opens at its step", client.includes("const found = built.findIndex((candidate) => candidate.stepId === step);"));
check("the notice only claims the exact question when it is", client.includes("this is the question you stopped on") && client.includes("We have opened the part of the application you were working on"));
check("the old 'exactly where you left it' promise is gone", !client.includes("exactly where you left it"));

// ---- USA-285: photo previews, and the way back to Review
const previewRoute = read("app/api/join/photos/preview/route.ts");
const draftsLib = read("src/lib/join/drafts.ts");

check("a photo chosen in this visit previews from the file on the device", client.includes("URL.createObjectURL(file)"));
check("a restored photo previews through the private route", client.includes('fetch("/api/join/photos/preview"') && client.includes('className="join-photo-preview"'));
check("the preview route keeps the resume token out of the URL", previewRoute.includes("export async function POST(") && !previewRoute.includes("export async function GET("));
check("the preview route answers only for a draft still in progress", draftsLib.includes('.eq("status", "draft")') && previewRoute.includes("findLiveJoinDraft(resumeToken)"));
check("the preview route reads only paths /join wrote", previewRoute.includes('!photo.path.startsWith("pending/")') && previewRoute.includes('photo.path.includes("..")'));
check("the preview is private and uncacheable", previewRoute.includes('"Cache-Control": "private, no-store, max-age=0"'));
check("a step-rail jump no longer closes the way back to Review", client.includes("if (options.fromReview === true) {\n      setFromReview(true);\n    }") && !client.includes("setFromReview(options.fromReview === true)"));
check("the rail offers Review once it has been reached", client.includes("reviewReached && reviewIndex >= 0") && client.includes('aria-label="Review and submit"'));

// ---- USA-285: a resume link that cannot reopen a draft says so on its own screen
check("a dead resume link gets its own screen, not the new-application welcome", client.includes("<ResumeLinkStatus") && client.includes("linkStatusOpen && resumeState !== \"none\" && resumeState !== \"restored\""));
check("every unopenable state has its own message", ["expired: {", "revoked: {", "submitted: {", "unavailable: {"].every((key) => client.includes(key)) && client.includes("Your application was submitted"));
check("the dead ?resume= is dropped from the address bar", client.includes('url.searchParams.delete("resume")'));
check("the status screen reads nothing from the draft", !client.slice(client.indexOf("function ResumeLinkStatus("), client.indexOf("function resumeNotice(")).includes("draft"));

// ---- USA-285: the welcome-back notice is dismissible and does not follow the applicant
check("the notice can be dismissed", client.includes('aria-label="Dismiss this message"') && client.includes("setNoticeVisible(false)"));
check("the notice goes once the applicant moves on", client.includes("if (clamped !== safeIndex) {\n      setNoticeVisible(false);"));

// ---- USA-285: household names are not cut off
check("list columns are weighted rather than equal thirds", client.includes("function listColumnTemplate(") && read("app/join/join-experience.css").includes("grid-template-columns: var(--join-list-columns"));
check("a page with a repeating answer gets the wide measure", client.includes('className={`join-q${hasList ? " join-q-wide" : ""}`}'));

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

// ---- USA-285: Operations display fixes
const photoRoute = read("app/operations/missionaries/[id]/photos/[kind]/route.ts");

check("a household member's age is labelled Age", detailPage.includes('<FieldBlock label="Age" value={item.age} />') && !detailPage.includes("item.status ?? item.age"));
check("budget categories follow the application's Household then Ministry order", operations.includes('supportBudgetCategories.filter((category) => category.group === "household")') && detailPage.includes("<BudgetGroups groups={item.budgetGroups} />"));
check("budget categories use the application's labels, not raw keys", operations.includes("const known = new Set<string>(supportBudgetCategories.map((category) => category.key))"));
check("a /join testimony is split into its questions", operations.includes("function joinStoryParts(") && operations.includes('"Walk with God"'));
check("the story empty state shows only when nothing was captured", detailPage.includes("item.storyTestimony || item.storyAnswers.length > 0") && !detailPage.includes("No structured story answers are captured yet."));
check("Profile and DOS setup say what exists, not 'linked'", operations.includes('PROFILE_PRIVATE_DRAFT = "Private record (unpublished)"') && operations.includes('DOS_NO_LOGIN = "Application record only (no login)"') && !/"(Profile|Workspace) linked"/.test(detailPage.replace(/\/\/.*$/gm, "")));
check("login status comes from an actual applicant user", operations.includes("if (cleanText(row.applicant_user_id)) {"));
check("a value saved before the option change is still shown", detailPage.includes("keepSavedValue && defaultValue && !options.includes(defaultValue) ? [...options, defaultValue] : options"));
check("a display summary is never offered as a stored choice", detailPage.includes('<SelectField defaultValue={item.fundraisingLabel} label="Fundraising"') && !/fundraisingLabel\} keepSavedValue/.test(detailPage));
check("reviewers can open both photos", operations.includes("viewHref: joinPhotoViewHref(row, photo.kind)") && detailPage.includes("src={item.viewHref}"));
check("the photo route checks the missionaries module", photoRoute.includes('canAccessOperationsModule(authorization, "missionaries")'));
check("the photo is streamed, never a shareable signed URL", !photoRoute.includes("createSignedUrl") && !operations.slice(operations.indexOf("export async function loadOperationsApplicationPhoto")).includes("createSignedUrl"));
check("the photo response is private and uncacheable", photoRoute.includes('"Cache-Control": "private, no-store, max-age=0"'));
check("only paths /join wrote are read, from the private bucket", operations.includes('!path.startsWith("pending/") || path.includes("..") || bucket !== JOIN_APPLICATION_PHOTO_BUCKET'));

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

      // USA-285: a second reference with no way to reach them is named on
      // Review, and Fix lands in the empty cell with the way back.
      await rows.nth(0).locator("input").nth(2).fill("jordan@example.test");
      await rows.nth(1).locator("input").nth(0).fill("Taylor Placeholder");
      await rows.nth(1).locator("input").nth(1).fill("Coworker");

      for (let step = 0; step < 30 && !(await page.getByRole("heading", { name: "Review and submit" }).count()); step += 1) {
        // The support path gates Continue until a path is chosen; "No" keeps
        // the walk short.
        const choose = page.locator(".join-choice").filter({ hasText: "already funded" });

        if (await choose.count()) {
          await choose.first().click();
        }

        await page.getByRole("button", { name: /^Continue/ }).click();
      }

      check(`${width}px: Review names the incomplete reference and what it lacks`, (await page.getByText("Reference 2 (Taylor Placeholder): add a phone or email").count()) === 1);
      check(`${width}px: Review shows the answers`, (await page.locator(".join-summary").getByText(/Jordan Example/).count()) > 0);
      check(`${width}px: Review does not scroll sideways`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));

      await page.getByRole("button", { name: /Reference 2 \(Taylor Placeholder\)/ }).click();
      await page.waitForFunction(() => document.activeElement?.id === "references-row2-cell3", null, { timeout: 5000 });
      check(`${width}px: Fix puts the cursor in the empty contact cell`, (await page.evaluate(() => document.activeElement?.id)) === "references-row2-cell3");
      check(`${width}px: the empty cell is marked`, (await page.locator("#references-row2-cell3").getAttribute("aria-invalid")) === "true");

      await page.locator("#references-row2-cell3").fill("taylor@example.test");

      // USA-285: the rail keeps the way back open and offers Review directly.
      if (width >= 1024) {
        await page.locator(".join-rail").getByRole("button", { exact: true, name: "Your Mission" }).first().click();
        check(`${width}px: after a rail jump, Back to review is still offered`, (await page.locator(".join-footer").getByRole("button", { name: /Back to review/ }).count()) === 1);
        await page.locator(".join-rail").getByRole("button", { name: "Review and submit" }).click();
        check(`${width}px: the rail's Review stop opens Review`, (await page.getByRole("heading", { name: "Review and submit" }).count()) === 1);
      } else {
        await page.getByRole("button", { name: /Back to review|^Review$/ }).first().click();
      }

      check(`${width}px: the way back returns to Review`, (await page.getByRole("heading", { name: "Review and submit" }).count()) === 1);
      check(`${width}px: the fixed reference is no longer flagged`, (await page.getByText(/Taylor Placeholder\): add/).count()) === 0);
      await page.close();
    }
  } finally {
    await browser.close();
  }
} else {
  console.log("  skip  browser checks (set JOIN_BROWSER_BASE to a running dev server)");
}

console.log("\n/join application audit regression passed.");
