import { readFileSync } from "node:fs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const catalog = readFileSync("src/lib/dos/resource-catalog.ts", "utf8");
const guidePage = readFileSync("app/guide/[slug]/page.tsx", "utf8");
const dosClient = readFileSync("app/dos/app/DosMvpAppClient.tsx", "utf8");

assert(catalog.includes('title: "14 Days Through the New Testament"'), "Catalog should include the reading plan title.");
assert(catalog.includes('category: "Discipleship"'), "Reading plan should live in Discipleship.");
assert(catalog.includes('type: "reading_plan"'), "Reading plan should use the Reading Plan type.");
assert(catalog.includes('path: "/guide/new-testament-14-days"'), "Reading plan should open the canonical guide page.");
assert(catalog.includes('downloadPath: "/guide/new-testament-14-days#pdf-download-placeholder"'), "Reading plan PDF should point at the placeholder anchor.");
assert(catalog.includes('estimatedDuration: "14 Days"'), "Reading plan should show 14 Days duration.");
assert(catalog.includes('status: "Sendable"'), "Reading plan should be marked Sendable.");
assert(catalog.includes('tags: ["Bible", "New Testament", "Reading Plan", "Growth"]'), "Reading plan should include the requested tags.");

assert(guidePage.includes("ShareGuideButton"), "Guide page should expose the Share action.");
assert(guidePage.includes("Start Reading"), "Guide page should expose the Start Reading action.");
assert(guidePage.includes("Download PDF"), "Guide page should expose the Download PDF action.");
assert(guidePage.includes("alternates"), "Guide metadata should include canonical alternates.");
assert(guidePage.includes("openGraph"), "Guide metadata should include OpenGraph data.");
assert(guidePage.includes("twitter"), "Guide metadata should include Twitter data.");
assert(guidePage.includes("pdf-download-placeholder"), "Guide page should render the PDF placeholder target.");

assert(dosClient.includes('const dosDiscipleshipResourceItems = getDosResourcesByCategory("Discipleship")'), "DOS Library should load Discipleship resources.");
assert(dosClient.includes('<LibrarySection title="Discipleship">'), "DOS Library should render the Discipleship section.");
assert(dosClient.includes("Download PDF"), "DOS Library resource card should expose the PDF action.");

console.log("New Testament reading plan regression passed.");
