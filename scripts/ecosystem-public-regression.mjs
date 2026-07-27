import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function exists(path) {
  return existsSync(new URL(`../${path}`, import.meta.url));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(source, needle, message) {
  assert(source.includes(needle), message);
}

function assertNotIncludes(source, needle, message) {
  assert(!source.includes(needle), message);
}

const primaryNav = read("components/PrimaryNav.tsx");
const ecosystemData = read("src/lib/ecosystem.ts");
const ecosystemPage = read("app/ecosystem/page.tsx");
const systemPage = read("app/system/page.tsx");
const nextConfig = read("next.config.js");
const middleware = read("middleware.ts");
const sitemap = read("app/sitemap.ts");
const robots = read("app/robots.ts");
const analytics = read("src/lib/analytics.ts");
const domainMetadata = read("src/lib/domain-metadata.ts");
const domainSites = read("src/lib/domain-sites.ts");
const ktgDomainPage = read("app/domain-sites/kitchen-table-gospel/page.tsx");
const dosDomainPage = read("app/domain-sites/discipleship-operating-system/page.tsx");
const domainLandingPage = read("app/domain-sites/_components/DomainSiteLandingPage.tsx");
const footer = read("components/SiteFooter.tsx");

assertIncludes(primaryNav, 'label: "Ecosystem"', "Primary nav must label the public item Ecosystem.");
assertIncludes(primaryNav, 'href: "/ecosystem"', "Primary nav must link Ecosystem to /ecosystem.");
assertNotIncludes(primaryNav, 'label: "System"', "Primary nav must not expose System as a public top-level label.");

assert(exists("app/ecosystem/page.tsx"), "/ecosystem page must exist.");
assertIncludes(systemPage, 'permanentRedirect("/ecosystem")', "/system page must redirect to /ecosystem.");
assertIncludes(nextConfig, 'source: "/system"', "Next redirects must preserve /system -> /ecosystem before routing.");
assertIncludes(nextConfig, 'destination: "/ecosystem"', "Next redirects must send /system to /ecosystem.");

for (const expected of [
  "Kitchen Table Gospel",
  "USA Missionaries initiative",
  "https://kitchentablegospel.org",
  "Discipleship Operating System",
  "USA Missionaries product/initiative",
  "https://discipleshipoperatingsystem.com",
  "Ministry of Reconciliation (MOR)",
  "Strategic Partner",
  "Category 1 strategic partner",
  "https://mor-mn.com/",
]) {
  assertIncludes(ecosystemData, expected, `Ecosystem data must include ${expected}.`);
}

assertIncludes(ecosystemPage, 'canonical: pageUrl', "/ecosystem must publish canonical metadata.");
assertIncludes(ecosystemPage, "summary_large_image", "/ecosystem must provide social preview metadata.");
assertIncludes(ecosystemPage, "PrimaryNav active=\"ecosystem\"", "/ecosystem must mark Ecosystem active in navigation.");
assertNotIncludes(ecosystemPage, 'target="_blank"', "Ecosystem links should not force a new window.");

assertIncludes(footer, 'href: "/ecosystem"', "Footer must link to Ecosystem.");
assertIncludes(footer, "https://kitchentablegospel.org", "Footer must link to Kitchen Table Gospel.");
assertIncludes(footer, "https://discipleshipoperatingsystem.com", "Footer must link to DOS.");

assertIncludes(domainLandingPage, "brandHref={domainSites.usam.canonicalOrigin}", "Domain pages must let visitors return to USA Missionaries.");
assertIncludes(domainLandingPage, "hrefOverrides={usamNavHrefOverrides}", "Domain pages must use USA Missionaries navigation links.");
assertIncludes(domainLandingPage, "Dedicated domain. Shared ecosystem.", "Domain pages must attribute the dedicated domain to the shared ecosystem.");
assertNotIncludes(domainLandingPage, 'target="_blank"', "Domain pages should not force a new window.");

for (const source of [ktgDomainPage, dosDomainPage]) {
  assertIncludes(source, "DomainSiteLandingPage", "Dedicated domain pages must render landing pages.");
  assertIncludes(source, "buildDomainSiteMetadata(site);", "Dedicated domain pages must use public metadata.");
  assertNotIncludes(source, "noIndex: true", "Dedicated domain pages must not remain placeholder noindex pages.");
}

assertIncludes(domainMetadata, "summary_large_image", "Domain metadata must support social preview cards.");
assertIncludes(domainSites, "Kitchen Table Gospel is a USA Missionaries initiative", "Kitchen Table Gospel metadata must be updated.");
assertIncludes(domainSites, "Discipleship Operating System is a USA Missionaries product", "DOS metadata must be updated.");

assertIncludes(middleware, "getAlternateDomainSiteByHostname", "Middleware must resolve dedicated domains.");
assertIncludes(middleware, "url.pathname = domainSite.rootPath", "Dedicated domain roots must rewrite to their domain pages.");
assertIncludes(middleware, "NextResponse.redirect(url, 308)", "Dedicated domain non-root routes must safely redirect.");
assertIncludes(middleware, "domainSites.usam.canonicalOrigin", "Dedicated domain redirects must return to USA Missionaries.");

assertIncludes(sitemap, '{ path: "/ecosystem"', "USAM sitemap must include /ecosystem.");
assertIncludes(sitemap, 'site.key !== "usam"', "Sitemap must branch for dedicated domains.");
assertIncludes(sitemap, "url: siteUrl", "Dedicated domain sitemap must include the canonical root.");

assertIncludes(robots, 'allow: "/"', "Robots must allow public roots.");
assertIncludes(robots, '"/dos"', "Robots must keep /dos private-route exclusions.");
assertIncludes(robots, '"/system/preview"', "Robots must keep protected preview exclusions.");
assertIncludes(robots, '"/domain-sites"', "Robots must exclude internal domain route paths.");

assertIncludes(analytics, '"/dos"', "Analytics must keep /dos excluded.");
assertIncludes(analytics, '"/system/preview"', "Analytics must keep protected preview excluded.");
assertNotIncludes(analytics, '"/ecosystem"', "Analytics must allow the public Ecosystem route.");

const builtEcosystemHtmlPath = ".next/server/app/ecosystem.html";

if (exists(builtEcosystemHtmlPath)) {
  const builtEcosystemHtml = read(builtEcosystemHtmlPath);

  for (const expected of [
    "<title>Ecosystem | USA Missionaries</title>",
    'href="https://usamissionaries.org/ecosystem"',
    'property="og:image"',
    'name="twitter:card" content="summary_large_image"',
    "Kitchen Table Gospel",
    "Discipleship Operating System",
    "Ministry of Reconciliation (MOR)",
    "Category 1 strategic partner",
  ]) {
    assertIncludes(builtEcosystemHtml, expected, `Built /ecosystem HTML must include ${expected}.`);
  }

  const anchorHrefs = [...builtEcosystemHtml.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map((match) => match[1]);
  const allowedExternalHosts = new Set([
    "discipleshipoperatingsystem.com",
    "kitchentablegospel.org",
    "mor-mn.com",
  ]);

  for (const href of anchorHrefs) {
    if (href.startsWith("https://")) {
      const { hostname } = new URL(href);
      assert(allowedExternalHosts.has(hostname), `Unexpected external anchor in built /ecosystem HTML: ${href}`);
      continue;
    }

    if (href === "/") {
      assert(exists("app/page.tsx"), "Built /ecosystem root anchor must resolve to app/page.tsx.");
      continue;
    }

    if (href.startsWith("/")) {
      assert(exists(`app${href}/page.tsx`), `Built /ecosystem internal anchor must resolve: ${href}`);
    }
  }
}

console.log("ecosystem-public-regression: all checks passed.");
