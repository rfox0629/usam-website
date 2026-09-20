#!/usr/bin/env node
// Guards the privacy contract of the /advisor briefing.
//
// This repository is public. The briefing's names, financial figures, and
// links live only in ADVISOR_BRIEFING_CONTENT, a server-side Vercel variable.
// These checks fail the build if that separation is ever eroded.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const failures = [];
const check = (label, condition, detail) => {
  if (!condition) failures.push(detail ? `${label}\n      ${detail}` : label);
};

const read = (path) => readFileSync(path, "utf8");

const access = read("src/lib/advisor-access.ts");
const contentLib = read("src/lib/advisor-content.ts");
const page = read("app/advisor/page.tsx");
const briefing = read("app/advisor/AdvisorBriefing.tsx");
const route = read("app/api/advisor-access/route.ts");
const robots = read("app/robots.ts");
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
  "the access cookie lasts one day",
  /MAX_AGE_SECONDS = 60 \* 60 \* 24;/.test(access),
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

console.log("advisor briefing privacy regression: all checks passed");
