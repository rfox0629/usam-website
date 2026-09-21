#!/usr/bin/env node
// Guards the privacy contract of the /advisor briefing.
//
// This repository is public. The briefing's names, financial figures, and
// links live only in ADVISOR_BRIEFING_CONTENT, a server-side Vercel variable.
// These checks fail the build if that separation is ever eroded.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const failures = [];
let checked = 0;
const check = (label, condition, detail) => {
  checked += 1;
  if (!condition) failures.push(detail ? `${label}\n      ${detail}` : label);
};

const read = (path) => readFileSync(path, "utf8");

const access = read("src/lib/advisor-access.ts");
const contentLib = read("src/lib/advisor-content.ts");
const page = read("app/advisor/page.tsx");
const briefing = read("app/advisor/AdvisorBriefing.tsx");
const route = read("app/api/advisor-access/route.ts");
const rateLimit = read("src/lib/advisor-rate-limit.ts");
const clientKey = read("src/lib/advisor-client-key.ts");
const dashboard = read("app/advisor/AdvisorDashboardMockup.tsx");
const globalCss = read("app/globals.css");
const examplePage = read("app/advisor/examples/[slug]/page.tsx");
const exampleDashboard = read("app/advisor/examples/ExampleDashboard.tsx");
const exampleTheme = read("app/advisor/examples/exampleTheme.ts");
const sitemap = read("app/sitemap.ts");
const robots = read("app/robots.ts");
const contentDoc = read("docs/advisor-briefing-content.md");
const contentExample = read("docs/examples/advisor-briefing-content.example.json");
const envExample = read(".env.example");

/* -- the private payload never reaches the client ---------------------- */

check(
  "advisor-access.ts is server-only",
  /^import "server-only";/m.test(access),
);
check(
  "advisor-content.ts is server-only",
  /^import "server-only";/m.test(contentLib),
);
check(
  "AdvisorBriefing.tsx is a server component (no 'use client')",
  !/^["']use client["']/m.test(briefing),
);

// A NEXT_PUBLIC_ variable is inlined into the client bundle, which would put
// the whole briefing in the public JavaScript.
const trackedFiles = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);

const selfPath = "scripts/advisor-briefing-privacy-regression.mjs";
// Built from fragments so this checker does not match its own source.
const forbiddenPrefix = new RegExp(["NEXT", "PUBLIC", "ADVISOR"].join("_"));

const publicAdvisorVars = trackedFiles.filter((file) => {
  if (file === selfPath) {
    return false;
  }

  try {
    return forbiddenPrefix.test(readFileSync(file, "utf8"));
  } catch {
    return false;
  }
});

check(
  "no NEXT_PUBLIC_ADVISOR_* variable exists",
  publicAdvisorVars.length === 0,
  publicAdvisorVars.join(", "),
);

check(
  "the private payload JSON is not tracked by git",
  !trackedFiles.some((file) => /advisor-private-content\.json$/.test(file)),
);

/* -- the gate is checked before the content is read -------------------- */

const cookieCheckAt = page.indexOf("isAdvisorAccessTokenValid");
const contentReadAt = page.indexOf("getAdvisorBriefingContent(");

check("the page validates the access cookie", cookieCheckAt !== -1);
check("the page reads the briefing content", contentReadAt !== -1);
check(
  "the access cookie is validated before the briefing content is read",
  cookieCheckAt !== -1 && contentReadAt !== -1 && cookieCheckAt < contentReadAt,
);
check(
  "the page bails out when access fails, before reading content",
  /if \(!hasAccess\)/.test(page) && page.indexOf("if (!hasAccess)") < contentReadAt,
);
check(
  "a missing or malformed payload renders a generic message",
  /if \(!content\)/.test(page),
);

/* -- cookie hardening --------------------------------------------------- */

check("the access cookie is httpOnly", /httpOnly:\s*true/.test(access));
check("the access cookie is sameSite=lax", /sameSite:\s*"lax"/.test(access));
check(
  "the access cookie is secure in production",
  /secure:\s*process\.env\.NODE_ENV === "production"/.test(access),
);
check(
  "the access cookie is scoped to /advisor",
  /ADVISOR_ACCESS_PATH = "\/advisor"/.test(access) && /path:\s*ADVISOR_ACCESS_PATH/.test(access),
);
check(
  "the access cookie lasts three days",
  /MAX_AGE_SECONDS = 60 \* 60 \* 24 \* 3;/.test(access),
);
check(
  "the cookie carries a derived token, not the access code",
  /sha256Hex\(`\$\{TOKEN_CONTEXT\}/.test(access),
);

/* -- the access code is case-sensitive ---------------------------------- */

check(
  "the access code comparison is case-sensitive",
  !/toLowerCase\(\)|toUpperCase\(\)/.test(access),
  "found a case-folding call in src/lib/advisor-access.ts",
);
check(
  "a wrong code returns 401",
  /isValidAdvisorAccessCode\(accessCode\)\)\) \{\s*return NextResponse\.json\([^)]*\{ status: 401 \}/s.test(route)
    || /status: 401/.test(route),
);

/* -- crawlers ----------------------------------------------------------- */

check('robots.ts disallows "/advisor"', /"\/advisor",/.test(robots));
check('robots.ts disallows "/advisor/"', /"\/advisor\/",/.test(robots));
check("the page is noindex", /index:\s*false/.test(page));
check("the page is nofollow", /follow:\s*false/.test(page));
check("the page is never statically cached", /export const dynamic = "force-dynamic";/.test(page));

/* -- no private content in the committed source ------------------------- */

// Values and names that belong only in the Vercel variable. The public source
// must not reintroduce them.
const forbiddenInAdvisorSource = [
  /\$\s?\d{1,3},\d{3}/, // any concrete dollar figure
  /\b\d{1,3},\d{3}\s*\/\s*mo\b/i,
];

for (const advisorFile of [
  "app/advisor/page.tsx",
  "app/advisor/AdvisorBriefing.tsx",
  "app/advisor/AdvisorAccessGateForm.tsx",
  "app/advisor/AdvisorTabs.tsx",
  "app/advisor/AdvisorLinkAccordion.tsx",
  "app/advisor/AdvisorPrintButton.tsx",
  "src/lib/advisor-content.ts",
  "src/lib/advisor-access.ts",
]) {
  const source = read(advisorFile);

  for (const pattern of forbiddenInAdvisorSource) {
    check(
      `${advisorFile} contains no hardcoded financial figure`,
      !pattern.test(source),
      `matched ${pattern}`,
    );
  }
}

check(
  ".env.example ships ADVISOR_ACCESS_KEY with no value",
  /^ADVISOR_ACCESS_KEY=\s*$/m.test(envExample),
);
check(
  ".env.example ships ADVISOR_BRIEFING_CONTENT with no value",
  /^ADVISOR_BRIEFING_CONTENT=\s*$/m.test(envExample),
);

/* -- failed-attempt throttling ------------------------------------------ */

const limitCheckAt = route.indexOf("getAdvisorRateLimitState");
const bodyReadAt = route.indexOf("await request.json()");

check("the endpoint consults the rate limiter", limitCheckAt !== -1);
check(
  "the rate limit is checked before the request body is read",
  limitCheckAt !== -1 && bodyReadAt !== -1 && limitCheckAt < bodyReadAt,
);
check("a throttled client gets 429", /status: 429/.test(route));
check(
  "a 429 carries a Retry-After header",
  /"Retry-After": String\(rateLimit\.retryAfterSeconds\)/.test(route),
);
check(
  "a failed attempt is recorded",
  /recordAdvisorFailedAttempt\(clientKey\)/.test(route),
);
check(
  "a successful authentication clears the client's attempts",
  /clearAdvisorFailedAttempts\(clientKey\)/.test(route),
);
check(
  "the limiter store is bounded",
  /ADVISOR_RATE_LIMIT_MAX_CLIENTS/.test(rateLimit) && /enforceCapacity/.test(rateLimit),
);
check("the limiter prunes expired records", /pruneExpired/.test(rateLimit));
check(
  "the client key is a hash, not a raw address",
  /sha256Hex\(address\)/.test(clientKey),
);
check("advisor-client-key.ts is server-only", /^import "server-only";/m.test(clientKey));

// Nothing in the advisor path may log. A stray console call is the easiest way
// for a code, a cookie, or a payload to end up in a build or runtime log.
for (const [label, source] of [
  ["route", route],
  ["access lib", access],
  ["content lib", contentLib],
  ["rate limiter", rateLimit],
  ["client key", clientKey],
  ["page", page],
]) {
  check(`the ${label} logs nothing`, !/console\.(log|warn|error|info|debug)/.test(source));
}

/* -- the public docs reveal no subject matter --------------------------- */

// The repository should disclose only that /advisor is a generic protected
// briefing system. never what any particular briefing is about.
// The guarded terms are base64-encoded so that this file does not itself
// restate, in the public repository, the subject matter it exists to keep
// out of it. Decode to read or extend the list.
const subjectMatter = new RegExp(
  Buffer.from("Y3VtdWxhdGl2ZSBnaXZpbmd8YmFuayBiYWxhbmNlfG1vbnRobHkgc3VwcG9ydHxjYXNoIG9uIGhhbmR8XGJTSElORVxifHNjb3JlY2FyZHxwYXJ0bmVyc2hpcHx3ZWVrbHl8Y2FkZW5jZQ==", "base64").toString("utf8"),
  "i",
);

check(
  "docs/advisor-briefing-content.md stays generic",
  !subjectMatter.test(contentDoc),
  "found subject-matter wording in the public schema doc",
);
check(
  "the example payload stays generic",
  !subjectMatter.test(contentExample),
  "found subject-matter wording in the public example",
);
check(
  "the example uses neutral figure labels",
  /"label": "Measure A"/.test(contentExample),
);
check(
  "the docs state the limiter is defence in depth",
  /defence in depth, not the primary control/i.test(contentDoc),
);
check(
  "the limiter source states it is not durable",
  /NOT durable and NOT shared/.test(rateLimit),
);

/* -- the light document and its print rules ----------------------------- */

check(
  "the briefing opts into its own light scope",
  /data-advisor-doc/.test(briefing) && /\[data-advisor-doc\]/.test(globalCss),
);
check(
  "`.no-print` is actually defined",
  /@media print \{\s*\.no-print \{\s*display: none !important;/.test(globalCss),
  "screen-only chrome would otherwise print into the document",
);
check(
  "print forces high-contrast text",
  /@media print[\s\S]*\[data-advisor-doc\] :where\(p, li, dd, dt, td, th, blockquote\) \{\s*color: #1a1a1a/.test(globalCss),
);
check(
  "the briefing avoids the globally-overridden stone utilities",
  !/text-stone-|border-stone-|bg-usam-black/.test(briefing),
  "stone-* is forced to dark-theme values site-wide and would be unreadable on white",
);

/* -- the DOS mockup is always marked as illustrative -------------------- */

check("the dashboard mockup exists", dashboard.length > 0);
check(
  "the mockup labels itself as sample data",
  /Sample data/.test(dashboard),
  "a mockup must not depend on surrounding prose to say it is not live",
);
check(
  "the mockup falls back to an explicit illustrative caption",
  /Illustrative mockup of DOS configured for/.test(dashboard),
);
// Encoded for the same reason as the subject-matter blocklist above: this
// public file should not name the ministries the briefing happens to discuss.
const namedOrgs = new RegExp(Buffer.from("Uml2ZXIgVmFsbGV5fEVuZ2FnZSBZb3VyIERlc3Rpbnk=", "base64").toString("utf8"), "i");

check(
  "the mockup carries no hardcoded organisation name",
  !namedOrgs.test(dashboard),
);

/* -- no em dashes anywhere in the advisor surface ----------------------- */

// Ryan asked for these gone: they read as machine-written. The character is
// built from its code point so this check does not contain one itself.
const EM_DASH = String.fromCharCode(0x2014);

const advisorSurface = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter(
    (file) =>
      file.startsWith("app/advisor/")
      || /^src\/lib\/advisor-/.test(file)
      || /^scripts\/(advisor-|validate-advisor)/.test(file)
      || file === "docs/advisor-briefing-content.md"
      || file === "docs/examples/advisor-briefing-content.example.json",
  );

const withEmDash = advisorSurface.filter((file) => {
  try {
    return readFileSync(file, "utf8").includes(EM_DASH);
  } catch {
    return false;
  }
});

check(
  "no em dash anywhere in the advisor experience or its schema",
  withEmDash.length === 0,
  withEmDash.join(", "),
);

check(
  "the content validator rejects an em dash in the payload",
  /emDashPaths\.length > 0/.test(read("scripts/validate-advisor-content.mjs"))
    && /process\.exit\(1\)/.test(read("scripts/validate-advisor-content.mjs")),
);

/* -- the dashboard concept route ---------------------------------------- */

const exampleCookieAt = examplePage.indexOf("isAdvisorAccessTokenValid");
const exampleReadAt = examplePage.indexOf("getAdvisorExample(");

check("the example route validates the access cookie", exampleCookieAt !== -1);
check("the example route reads its content", exampleReadAt !== -1);
check(
  "the example route checks access before reading any content",
  exampleCookieAt !== -1 && exampleReadAt !== -1 && exampleCookieAt < exampleReadAt,
);
check("the example route is noindex", /index:\s*false/.test(examplePage));
check("the example route is nofollow", /follow:\s*false/.test(examplePage));
check("the example route is never statically cached", /export const dynamic = "force-dynamic";/.test(examplePage));
check(
  "the example route's metadata names no organisation",
  /title: "Advisor Briefing"/.test(examplePage),
  "metadata is emitted before the gate, so it must stay generic",
);

check(
  "examples are excluded from the sitemap",
  !/advisor/.test(sitemap),
  "the sitemap is an explicit allowlist; /advisor must not appear in it",
);

check(
  "every dashboard concept must carry a disclaimer",
  /isNonEmptyString\(value\.disclaimer\)/.test(contentLib),
  "the schema must require it rather than trusting the payload",
);
check(
  "the concept disclaimer renders at the top and the foot",
  (exampleDashboard.match(/example\.disclaimer/g) || []).length >= 2,
  "a printed page must not lose it",
);
check(
  "organisation-wide figures carry a visible illustrative marker",
  /illustrativeLabel \?\? "Illustrative figures"/.test(exampleDashboard)
    && (exampleDashboard.match(/\{illustrative\}/g) || []).length >= 3,
);
check(
  "verified figures are marked as not illustrative",
  /Not illustrative/.test(exampleDashboard),
);
check(
  "the themes carry no organisation identity",
  !namedOrgs.test(exampleTheme) && /"contemporary" \| "tactical"/.test(exampleTheme),
);
check(
  "the example route hardcodes no organisation name",
  !namedOrgs.test(examplePage) && !namedOrgs.test(exampleDashboard),
);

/* -- mobile: no wide table on a narrow screen --------------------------- */

check(
  "wide tables become stacked cards below sm",
  /sm:hidden/.test(briefing) && /hidden sm:block/.test(briefing),
);
check(
  "the desktop table cannot push the page wider than the viewport",
  /table-fixed/.test(briefing) && !/min-w-\[\d/.test(briefing),
);

/* -- the documented template stays valid -------------------------------- */

try {
  execFileSync(
    "node",
    ["scripts/validate-advisor-content.mjs", "docs/examples/advisor-briefing-content.example.json"],
    { stdio: "pipe" },
  );
} catch {
  failures.push("docs/examples/advisor-briefing-content.example.json no longer matches the schema");
}

/* ----------------------------------------------------------------------- */

if (failures.length > 0) {
  console.error(`\nadvisor briefing privacy regression: ${failures.length} failure(s)\n`);
  failures.forEach((message) => console.error(`  ✗ ${message}`));
  process.exit(1);
}

console.log(`advisor briefing privacy regression: all ${checked} checks passed`);
