import { readFileSync, statSync } from "node:fs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sliceBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex);

  assert(startIndex >= 0, `Missing slice start: ${start}`);
  assert(endIndex > startIndex, `Missing slice end: ${end}`);

  return source.slice(startIndex, endIndex);
}

const catalog = readFileSync("src/lib/dos/resource-catalog.ts", "utf8");
const guidePage = readFileSync("app/guide/[slug]/page.tsx", "utf8");
const publicGuidedJourneyView = readFileSync("app/guide/[slug]/PublicGuidedJourneyView.tsx", "utf8");
const dosClient = readFileSync("app/dos/app/DosMvpAppClient.tsx", "utf8");
const pdf = readFileSync("public/guides/new-testament-14-days.pdf");
const pdfStats = statSync("public/guides/new-testament-14-days.pdf");
const libraryReadingPlanCard = sliceBetween(dosClient, "if (isGuidedResourceCard) {", "const rowContent");

assert(catalog.includes('title: "14 Days Through the New Testament"'), "Catalog should include the reading plan title.");
assert(catalog.includes('category: "Discipleship"'), "Reading plan should live in Discipleship.");
assert(catalog.includes('type: "reading_plan"'), "Reading plan should use the Reading Plan type.");
assert(catalog.includes('path: "/guide/new-testament-14-days"'), "Reading plan should open the canonical guide page.");
assert(catalog.includes('downloadPath: "/guides/new-testament-14-days.pdf"'), "Reading plan PDF should point at the printable PDF asset.");
assert(!catalog.includes("pdf-download-placeholder"), "Reading plan should not point at the placeholder PDF anchor.");
assert(catalog.includes('estimatedDuration: "14 Days"'), "Reading plan should show 14 Days duration.");
assert(catalog.includes("featured: true"), "Reading plan should be marked as featured.");
assert(catalog.includes("assignable: true"), "Reading plan should be assignable.");
assert(catalog.includes("durationDays: 14"), "Reading plan assignment default should be fourteen days.");
assert(catalog.includes('followUpCadence: "midpoint_and_completion"'), "Reading plan assignment should default midpoint and completion follow-up.");
assert(catalog.includes('status: "Sendable"'), "Reading plan should be marked Sendable.");
assert(catalog.includes('tags: ["Bible", "New Testament", "Reading Plan", "Growth"]'), "Reading plan should include the requested tags.");
assert(catalog.includes("Read the entire New Testament in two weeks while discovering the life of Jesus, the birth of the Church, and the call to follow Christ."), "Catalog should contain the public reading plan description.");
assert(pdf.subarray(0, 4).toString("utf8") === "%PDF", "Printable reading plan asset should be a PDF.");
assert(pdfStats.size > 50000, "Printable reading plan PDF should not be empty or truncated.");

assert(guidePage.includes("PublicGuidedJourneyView"), "Guide page should render guided resources through the reusable public guided journey shell.");
assert(guidePage.includes("resource.content?.guidedResource?.sessions?.length"), "Guide page should route session-based reading plans into the guided journey shell.");
assert(publicGuidedJourneyView.includes("Download PDF"), "Public guided journey should expose the Download PDF action.");
assert(publicGuidedJourneyView.includes("<FileText"), "Public guided journey download action should include a PDF icon.");
assert(publicGuidedJourneyView.includes("download href={resource.downloadPath}"), "Public guided journey PDF action should request a download.");
assert(publicGuidedJourneyView.includes('progressStorageKey(slug: string)'), "Public guided journey should key browser progress by resource slug.");
assert(publicGuidedJourneyView.includes("usam-guide-progress"), "Public guided journey should persist self-guided progress in browser storage.");
assert(publicGuidedJourneyView.includes("loadSavedProgress(resource.slug)"), "Public guided journey should resume saved progress.");
assert(publicGuidedJourneyView.includes("persistSavedProgress(resource.slug, next)"), "Public guided journey should save day progress.");
assert(publicGuidedJourneyView.includes("firstOpenSession"), "Public guided journey should resume at the first incomplete day.");
assert(publicGuidedJourneyView.includes("Save Progress"), "Public guided journey should expose a Save Progress action.");
assert(publicGuidedJourneyView.includes("Save &amp; Mark Day Complete"), "Public guided journey should expose a completion action.");
assert(publicGuidedJourneyView.includes("days complete"), "Public guided journey should show reading-plan progress.");
assert(!guidePage.includes("Open DOS"), "Reading plan guide should not expose an Open DOS public action.");
assert(!guidePage.includes("Sign in to DOS"), "Reading plan guide should not expose a DOS sign-in action.");
assert(!guidePage.includes("Access the DOS Library"), "Reading plan guide should not expose a DOS Library public action.");
assert(!guidePage.includes("Download through DOS"), "Reading plan guide should not route downloads through DOS.");
assert(!guidePage.includes("getDosAuthorization"), "Public guide should not require DOS authentication.");
assert(!publicGuidedJourneyView.includes("getDosAuthorization"), "Public guided journey should not require DOS authentication.");
assert(!guidePage.includes("searchParams: Promise"), "Public guide should not become dynamic just to detect DOS context.");
assert(!guidePage.includes("pdf-download-placeholder"), "Guide page should no longer render the PDF placeholder.");
assert(guidePage.includes("alternates"), "Guide metadata should include canonical alternates.");
assert(guidePage.includes("openGraph"), "Guide metadata should include OpenGraph data.");
assert(guidePage.includes("twitter"), "Guide metadata should include Twitter data.");

assert(dosClient.includes('const dosDiscipleshipResourceItems = getDosResourcesByCategory("Discipleship")'), "DOS Library should load Discipleship resources.");
assert(dosClient.includes('<LibrarySection title="Discipleship">'), "DOS Library should render the Discipleship section.");
assert(dosClient.includes("isGuidedResourceCard = isGuidedResource(resource) && !onClick"), "Guided resource card should not override picker rows with custom click behavior.");
assert(dosClient.includes("dosLibraryResourceHref"), "DOS Library should add context to the reading plan guide URL.");
assert(dosClient.includes('from: "dos-library"'), "DOS Library guide link should identify DOS Library context.");
assert(dosClient.includes("query.set(\"workspace\", workspaceSlug)"), "DOS Library guide link should include the active workspace slug.");
assert(dosClient.includes('searchParams.get("view") !== "library"'), "DOS app should recognize Library fallback URLs.");
assert(dosClient.includes('setMoreAppView("library")'), "DOS app fallback should open the Library view.");
assert(dosClient.includes("Download PDF"), "DOS Library resource card should expose the PDF action.");
assert(dosClient.includes("<FileText"), "DOS Library PDF action should include a PDF icon.");
assert(dosClient.includes("download"), "DOS Library PDF action should request a download.");
assert(libraryReadingPlanCard.includes("FEATURED"), "Featured reading plan card should show a FEATURED badge.");
assert(libraryReadingPlanCard.includes("READING PLAN"), "Featured reading plan card should show a READING PLAN badge.");
assert(libraryReadingPlanCard.includes("Assign"), "Featured reading plan card should expose the Assign action.");
assert(libraryReadingPlanCard.includes("onAssign?.(resource)"), "Featured reading plan Assign action should call the Library assignment flow.");
assert(libraryReadingPlanCard.includes("onOpenGuidedResource(resource)"), "Featured reading plan card should open the in-app guided journey.");
assert(libraryReadingPlanCard.includes('{completion.completed ? "Continue" : "Open"}'), "Featured reading plan card should expose Open/Continue based on progress.");
assert(libraryReadingPlanCard.includes("Download PDF"), "Featured reading plan card should keep the PDF action.");
assert(libraryReadingPlanCard.includes("resource.downloadPath"), "Download PDF should use the catalog download path.");
assert(!libraryReadingPlanCard.includes("Type: ${typeLabel}"), "Reading plan card should not duplicate the type badge as a second Type: line.");
assert(libraryReadingPlanCard.includes("{resource.estimatedDuration}"), "Featured reading plan card should display duration metadata in the compact badge row.");
assert(dosClient.includes("resource.content?.subtitle ?? resource.description"), "Featured reading plan card should use the public reading plan description.");

console.log("New Testament reading plan regression passed.");
