#!/usr/bin/env node
/**
 * USA-167: no em dashes in applicant-facing join/application email copy.
 *
 * Founder direction on USA-167: applicant-facing emails and email subject
 * lines use ordinary punctuation (periods, commas, colons, parentheses)
 * instead of em dashes. This guard exists so they do not creep back in as
 * templates are edited or as new ones are added to the flow.
 *
 * Scope is the join/application email templates only. En dashes are NOT
 * flagged: the site uses them correctly in numeric ranges such as the
 * "MATTHEW 28:19-20" footer, and the founder direction was about em dashes.
 *
 * The literal character and its HTML entity forms are all caught, because an
 * em dash reaches an inbox the same way whether it was typed as U+2014,
 * &mdash;, or &#8212;.
 *
 * Run: node scripts/join-email-em-dash-regression.mjs
 */
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Every module that builds copy carried by the /join application flow. Add new
 * ones here as the flow grows (a save/resume email, follow-ups), so the guard
 * covers them from the day they land.
 *
 * The submit route is included because it composes applicant text that leaves
 * the form (references, prayer needs) and is read back by Operations. It is not
 * an email template, but it is the same USA-167 applicant copy and the founder
 * asked for the flow to be clean of em dashes, not just the templates.
 */
const emailSources = [
  path.join("src", "lib", "email", "resend.ts"),
  path.join("app", "api", "join", "submit", "route.ts"),
];

/**
 * Template builders that must exist. Without this the guard would pass
 * vacuously if a template were renamed or moved out of the scanned file.
 */
const requiredBuilders = [
  "buildApplicantApplicationSubmittedEmail",
  "buildAdminNewApplicationEmail",
  "buildApplicationApprovedEmail",
  "buildRequestMoreInformationEmail",
  "buildApplicationDeclinedEmail",
];

const emDashForms = [
  { label: "em dash (U+2014)", pattern: /—/ },
  { label: "horizontal bar (U+2015)", pattern: /―/ },
  { label: "&mdash; entity", pattern: /&mdash;/i },
  { label: "&#8212; entity", pattern: /&#8212;/ },
  { label: "&#x2014; entity", pattern: /&#x2014;/i },
];

const failures = [];
const check = (ok, message) => {
  console.log(`${ok ? "  ok  " : "  FAIL"}  ${message}`);
  if (!ok) failures.push(message);
};

console.log("USA-167 join email em dash guard\n");

for (const relativePath of emailSources) {
  const absolutePath = path.join(process.cwd(), relativePath);

  let source;
  try {
    source = readFileSync(absolutePath, "utf8");
  } catch {
    check(false, `${relativePath} is readable (scanned email source is missing)`);
    continue;
  }

  const lines = source.split("\n");

  for (const { label, pattern } of emDashForms) {
    const hits = [];

    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        hits.push(`line ${index + 1}: ${line.trim()}`);
      }
    });

    check(hits.length === 0, `${relativePath} contains no ${label}`);
    hits.forEach((hit) => console.log(`          ${hit}`));
  }

  if (relativePath.endsWith("resend.ts")) {
    for (const builder of requiredBuilders) {
      check(
        source.includes(`function ${builder}(`),
        `${relativePath} still defines ${builder} (guard would pass vacuously otherwise)`,
      );
    }

    // Subject lines are called out separately in the founder direction, and a
    // subject is the one string a recipient sees before opening anything.
    const subjects = [...source.matchAll(/subject:\s*(`[^`]*`|"[^"]*")/g)].map((match) => match[1]);

    check(subjects.length >= requiredBuilders.length, `${relativePath} exposes a subject line per template`);

    for (const subject of subjects) {
      const offender = emDashForms.find(({ pattern }) => pattern.test(subject));

      check(!offender, `subject ${subject} has no em dash`);
    }
  }
}

console.log("");

if (failures.length > 0) {
  console.error(`${failures.length} check(s) failed.`);
  console.error("Replace em dashes with a period, comma, colon, or parentheses.");
  process.exit(1);
}

console.log("All join/application email copy is free of em dashes.");
