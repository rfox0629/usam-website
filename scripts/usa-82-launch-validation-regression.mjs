import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function normalizeText(value) {
  const rawAndRenderedFragments = value.includes("<")
    ? `${value}\n${value.replace(/<[^>]+>/g, " ")}`
    : value;

  return rawAndRenderedFragments
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/[{}]/g, " ")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/&ldquo;|&rdquo;/g, "\"")
    .replace(/&middot;/g, " ")
    .replace(/&ndash;/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function assertIncludes(source, needle, message) {
  assert(
    normalizeText(source).includes(normalizeText(needle)),
    message,
  );
}

function assertNotIncludes(source, needle, message) {
  assert(
    !normalizeText(source).includes(normalizeText(needle)),
    message,
  );
}

function routeById(manifest, id) {
  const route = manifest.routes.find((candidate) => candidate.id === id);
  assert(route, `Manifest must include ${id}.`);
  return route;
}

function assertExpectedContent(route, expectedMarkers) {
  assert.deepEqual(
    route.expectedContent,
    expectedMarkers,
    `${route.id} must use its route-specific marker list.`,
  );
}

function assertExpectedContentDoesNotInclude(route, forbiddenMarkers) {
  for (const marker of forbiddenMarkers) {
    assert(
      !route.expectedContent.some((candidate) => normalizeText(candidate) === normalizeText(marker)),
      `${route.id} expectedContent must not require ${marker}.`,
    );
  }
}

const manifest = readJson("config/usa-82-launch-verification.json");
const systemRoute = read("app/system/page.tsx");
const systemV1Route = read("app/system/v1/page.tsx");
const systemV2Route = read("app/system/v2/page.tsx");
const systemV2Page = read("app/system/SystemPage.tsx");
const waitingListCta = read("app/system/WaitingListCTA.tsx");
const dosDomainRoute = read("app/domain-sites/discipleship-operating-system/page.tsx");
const dosPage = read("app/domain-sites/discipleship-operating-system/DosLandingPage.tsx");
const ktgDomainRoute = read("app/domain-sites/kitchen-table-gospel/page.tsx");
const ktgPage = read("app/domain-sites/kitchen-table-gospel/KitchenTableGospelPage.tsx");
const middleware = read("middleware.ts");
const domainSites = read("src/lib/domain-sites.ts");
const robots = read("app/robots.ts");
const sitemap = read("app/sitemap.ts");

const riverMarkers = ["RIVER OF MINISTRIES", "MANY STREAMS.", "ONE MOVEMENT."];
// System V3 (USA-38) replaced the two-initiative V2 page at /system and /system/v2.
const systemV3Markers = [
  "Jesus Went.",
  "So Do We.",
  "The Model",
  "How Jesus Ministered.",
  "We Do Not Go Alone.",
];
const legacyMarkers = [
  "INFRASTRUCTURE IS BEING BUILT",
  "JOIN THE WAITING LIST",
  "ENTER WITH ACCESS CODE",
];
const dosMarkers = [
  "Discipleship Operating System",
  "The operating system for intentional discipleship",
  "Never lose a person or a moment that matters.",
  "Request Information",
  "USA Missionaries",
];
const ktgMarkers = [
  "Kitchen Table Gospel",
  "An initiative of USA Missionaries",
  "Discipleship Doesn't Start on a Stage.",
  "Join the Table",
  "Pull Up a Chair",
];

assert.equal(manifest.issueId, "USA-82", "Manifest must identify the USA-82 launch.");
assert.equal(manifest.textMatching, "case-insensitive", "Publisher text checks must tolerate rendered casing.");
assert.deepEqual(
  manifest.routes.map((route) => route.id),
  ["system-v1", "system-v2", "system", "dos", "kitchen-table-gospel"],
  "Manifest must verify the exact five launch surfaces.",
);

const systemV1 = routeById(manifest, "system-v1");
const systemV2 = routeById(manifest, "system-v2");
const systemCanonical = routeById(manifest, "system");
const dos = routeById(manifest, "dos");
const ktg = routeById(manifest, "kitchen-table-gospel");

assertExpectedContent(systemV1, legacyMarkers);
assertExpectedContentDoesNotInclude(systemV1, [...systemV3Markers, ...riverMarkers, ...dosMarkers, ...ktgMarkers]);
assert.equal(systemV1.host, "usamissionaries.org", "/system/v1 must validate on the USAM host.");
assert.equal(systemV1.path, "/system/v1", "/system/v1 must validate the preserved legacy route.");
assert.equal(systemV1.rendersExperience, "system-v1", "/system/v1 must not be treated as V2.");
for (const marker of legacyMarkers) {
  assertIncludes(`${systemV1Route}\n${waitingListCta}`, marker, `System V1 source must contain legacy marker: ${marker}.`);
}
assertNotIncludes(systemV1Route, "./SystemPage", "System V1 must not import the live system page.");

assertExpectedContent(systemV2, systemV3Markers);
assertExpectedContentDoesNotInclude(systemV2, riverMarkers);
assert.equal(systemV2.host, "usamissionaries.org", "/system/v2 must validate on the USAM host.");
assert.equal(systemV2.path, "/system/v2", "/system/v2 must validate the mirrored System route.");
assert.equal(systemV2.rendersExperience, "system-v3", "/system/v2 must mirror the live System V3 experience.");
assertIncludes(systemV2Route, 'export { default } from "../SystemPage";', "/system/v2 must render the shared SystemPage.");
for (const marker of systemV3Markers) {
  assertIncludes(systemV2Page, marker, `System V3 source must contain V3 marker: ${marker}.`);
}
for (const marker of riverMarkers) {
  assertNotIncludes(systemV2Page, marker, `System V3 must not require or render USA-80 marker: ${marker}.`);
}

assertExpectedContent(systemCanonical, systemV3Markers);
assertExpectedContentDoesNotInclude(systemCanonical, riverMarkers);
assert.equal(systemCanonical.host, "usamissionaries.org", "/system must validate on the USAM host.");
assert.equal(systemCanonical.path, "/system", "/system must validate the canonical public entry.");
assert.equal(systemCanonical.rendersExperience, "system-v3", "/system must resolve to V3.");
assert.equal(systemCanonical.safeResolution, "serves-v3", "/system must explicitly serve the V3 experience.");
assertIncludes(systemRoute, 'export { default } from "./SystemPage";', "/system must render the shared SystemPage.");

assertExpectedContent(dos, dosMarkers);
assertExpectedContentDoesNotInclude(dos, [...legacyMarkers, ...riverMarkers, "Join the Table"]);
assert.equal(dos.host, "discipleshipoperatingsystem.com", "DOS must validate on its production domain.");
assert.equal(dos.path, "/", "DOS public domain must validate the root path.");
assert.equal(dos.directPreviewPath, "/domain-sites/discipleship-operating-system", "DOS preview must use the hostname-aware route target.");
assert.equal(dos.rendersExperience, "discipleship-operating-system", "DOS route must identify its own experience.");
assertIncludes(dosDomainRoute, "requireDomainRoute(site.key)", "DOS domain route must stay hostname-aware.");
assertIncludes(dosPage, 'data-domain-site="discipleship-operating-system"', "DOS page must expose its domain-site marker.");
assertIncludes(dosPage, 'form_name: "DOS Request Information"', "DOS Request Information flow must stay wired.");
for (const marker of dosMarkers) {
  assertIncludes(dosPage, marker, `DOS page source must contain DOS marker: ${marker}.`);
}

assertExpectedContent(ktg, ktgMarkers);
assertExpectedContentDoesNotInclude(ktg, [...legacyMarkers, ...riverMarkers, "Request Information"]);
assert.equal(ktg.host, "kitchentablegospel.org", "KTG must validate on its production domain.");
assert.equal(ktg.path, "/", "KTG public domain must validate the root path.");
assert.equal(ktg.directPreviewPath, "/domain-sites/kitchen-table-gospel", "KTG preview must use the hostname-aware route target.");
assert.equal(ktg.rendersExperience, "kitchen-table-gospel", "KTG route must identify its own experience.");
assertIncludes(ktgDomainRoute, "requireDomainRoute(site.key)", "KTG domain route must stay hostname-aware.");
assertIncludes(ktgPage, 'source: "kitchen_table_gospel"', "KTG Join the Table flow must stay wired.");
for (const marker of ktgMarkers) {
  assertIncludes(ktgPage, marker, `KTG page source must contain KTG marker: ${marker}.`);
}

assertIncludes(domainSites, '"discipleshipoperatingsystem.com": domainSites["discipleship-operating-system"]', "DOS hostname must route to the DOS domain site.");
assertIncludes(domainSites, '"kitchentablegospel.org": domainSites["kitchen-table-gospel"]', "KTG hostname must route to the KTG domain site.");
assertIncludes(middleware, "alternateDomainSite", "Middleware must keep alternate-domain routing active.");
assertIncludes(middleware, "return NextResponse.rewrite(url", "Alternate-domain root requests must rewrite to the domain route.");
assertIncludes(middleware, "return NextResponse.redirect(new URL(`${domainSites.usam.canonicalOrigin}${pathname}${request.nextUrl.search}`), 308)", "Private or non-root alternate-domain paths must redirect back to USAM.");
assertIncludes(robots, '"/dos"', "Robots must keep private /dos paths disallowed on public domains.");
assertIncludes(sitemap, "if (site.key !== \"usam\")", "Alternate-domain sitemaps must stay domain-specific.");

const excludedUsa80 = manifest.excludedLaunchDependencies.find((issue) => issue.issueId === "USA-80");
assert(excludedUsa80, "Manifest must explicitly exclude USA-80 from USA-82 launch validation.");
assert.deepEqual(excludedUsa80.contentMarkers, riverMarkers, "USA-80 exclusion must list River markers.");
for (const route of manifest.routes) {
  assertExpectedContentDoesNotInclude(route, riverMarkers);
}

console.log("usa-82-launch-validation-regression: all checks passed.");
