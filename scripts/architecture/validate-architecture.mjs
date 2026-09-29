#!/usr/bin/env node
/**
 * Architecture manifest validator.
 *
 * Validates docs/architecture/*.yaml for internal consistency. Deterministic,
 * fast, no network, no secrets, no database. Does NOT inspect application source
 * and therefore cannot fail because of ordinary product changes.
 *
 * Exit 0 = valid. Exit 1 = malformed ownership configuration.
 *
 * Run: node scripts/architecture/validate-architecture.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parseYamlSubset } from "./yaml-subset.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const docs = path.join(root, "docs", "architecture");

const errors = [];
const warnings = [];
const fail = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

function load(name) {
  try {
    return parseYamlSubset(readFileSync(path.join(docs, name), "utf8"));
  } catch (e) {
    fail(`${name}: ${e.message}`);
    return null;
  }
}

const apps = load("application-ownership.yaml");
const routes = load("route-ownership.yaml");
const db = load("database-ownership.yaml");

if (errors.length) {
  console.error("Architecture manifests failed to parse:\n" + errors.map((e) => "  ✗ " + e).join("\n"));
  process.exit(1);
}

// ---------------------------------------------------------------- shared sets
const domainNames = new Set((apps.domains ?? []).map((d) => d.name));
const knownRepos = new Set(apps.known_repositories ?? []);
const retiredRepos = new Set(apps.retired_repositories ?? []);
const knownApplications = new Set(apps.known_linear_applications ?? []);
const legacyRepos = new Set((apps.legacy_repositories ?? []).map((r) => r.slug));

// Domain names permitted as owners in the route manifest.
const ownerVocabulary = new Set([...domainNames, "split-by-subtree"]);

// ------------------------------------------------------- application manifest
{
  const seen = new Set();
  for (const d of apps.domains ?? []) {
    if (!d.name) { fail("application-ownership: a domain has no name"); continue; }
    if (seen.has(d.name)) fail(`application-ownership: duplicate domain name "${d.name}"`);
    seen.add(d.name);

    if (!d.status) fail(`application-ownership: ${d.name} has no status`);
    if (!d.canonical_repository) fail(`application-ownership: ${d.name} has no canonical_repository`);
    else if (!knownRepos.has(d.canonical_repository))
      fail(`application-ownership: ${d.name} canonical_repository "${d.canonical_repository}" is not a known repository`);

    if (d.linear_application && !knownApplications.has(d.linear_application))
      fail(`application-ownership: ${d.name} linear_application "${d.linear_application}" is not a known Application label`);

    if (!d.codeowners_owner) fail(`application-ownership: ${d.name} has no codeowners_owner`);
    else if (!/^@[A-Za-z0-9][A-Za-z0-9-]*(\/[A-Za-z0-9-]+)?$/.test(d.codeowners_owner))
      fail(`application-ownership: ${d.name} codeowners_owner "${d.codeowners_owner}" is not a valid owner token`);

    for (const p of d.path_patterns ?? []) {
      if (typeof p !== "string" || p.trim() === "")
        fail(`application-ownership: ${d.name} has an empty path pattern`);
      else if (p.startsWith("/"))
        fail(`application-ownership: ${d.name} path pattern "${p}" must be repo-relative, not absolute`);
      else if (p.includes("\\"))
        fail(`application-ownership: ${d.name} path pattern "${p}" uses backslashes`);
    }

    // Truthfulness guards on status vocabulary.
    if (d.status === "planned-and-partial" && d.independently_deployable === true)
      fail(`application-ownership: ${d.name} is planned-and-partial but claims independent deployability`);
  }

  // Organization OS must never be described as mature or independently deployable.
  const org = (apps.domains ?? []).find((d) => d.name === "organization-platform");
  if (org) {
    if (!["planned-and-partial", "emerging", "planned"].includes(org.status))
      fail(`application-ownership: organization-platform status "${org.status}" overstates maturity (founder ruling 3)`);
    if (org.independently_deployable !== false)
      fail("application-ownership: organization-platform must explicitly set independently_deployable: false");
  }
}

// ------------------------------------------------------------- stale-name scan
{
  // Blocks that legitimately *declare* retired/legacy names. Scanning them for
  // "stale usage" would be a false positive: the declaration is the point.
  const DECLARATION_KEYS = new Set([
    "known_repositories",
    "retired_repositories",
    "legacy_repositories",
    "absent_routes",
  ]);

  const files = ["application-ownership.yaml", "route-ownership.yaml", "database-ownership.yaml"];
  for (const f of files) {
    const text = readFileSync(path.join(docs, f), "utf8");
    let section = null;
    text.split("\n").forEach((line, i) => {
      // Track the current top-level key (indent 0, `key:`).
      const top = line.match(/^([a-z_][a-z0-9_]*):/);
      if (top) section = top[1];
      if (/^\s*#/.test(line)) return;
      if (DECLARATION_KEYS.has(section)) return;

      for (const stale of retiredRepos) {
        if (line.includes(stale) && !/retired|deleted|orphan|legacy|do not|never|absent/i.test(line))
          fail(`${f}:${i + 1}: retired repository name "${stale}" used as a current source`);
      }
      if (line.includes("dos-platform") && !/legacy|archive|preserve|rescue|never|reuse/i.test(line))
        fail(`${f}:${i + 1}: dos-platform referenced without a legacy marker`);
    });
  }
  if (legacyRepos.size === 0) warn("application-ownership: no legacy_repositories recorded");
  for (const r of apps.legacy_repositories ?? []) {
    if (r.status !== "legacy-reference")
      fail(`application-ownership: legacy repository ${r.slug} must have status legacy-reference`);
  }
}

// ------------------------------------------------------------- route manifest
{
  const byPattern = new Map();
  for (const r of routes.routes ?? []) {
    if (!r.pattern) { fail("route-ownership: a route has no pattern"); continue; }
    if (!r.pattern.startsWith("/"))
      fail(`route-ownership: pattern "${r.pattern}" must start with '/'`);
    if (/\/\//.test(r.pattern))
      fail(`route-ownership: pattern "${r.pattern}" contains an empty segment`);
    // Bracket balance for dynamic segments.
    const open = (r.pattern.match(/\[/g) ?? []).length;
    const close = (r.pattern.match(/\]/g) ?? []).length;
    if (open !== close) fail(`route-ownership: pattern "${r.pattern}" has unbalanced [ ]`);

    if (!r.current_owner) fail(`route-ownership: ${r.pattern} has an empty current_owner`);
    else if (!ownerVocabulary.has(r.current_owner))
      fail(`route-ownership: ${r.pattern} current_owner "${r.current_owner}" is not a known application domain`);

    if (!r.desired_owner) fail(`route-ownership: ${r.pattern} has an empty desired_owner`);
    else if (!ownerVocabulary.has(r.desired_owner))
      fail(`route-ownership: ${r.pattern} desired_owner "${r.desired_owner}" is not a known application domain`);

    if (!r.access) fail(`route-ownership: ${r.pattern} has no access classification`);

    const prior = byPattern.get(r.pattern);
    if (prior) {
      if (r.shared !== true || prior.shared !== true)
        fail(`route-ownership: duplicate pattern "${r.pattern}" without shared: true on both entries`);
    }
    byPattern.set(r.pattern, r);
  }

  // Absent routes must not also be claimed as real.
  for (const a of routes.absent_routes ?? []) {
    if (byPattern.has(a.pattern))
      fail(`route-ownership: "${a.pattern}" appears in both routes and absent_routes`);
    if (!a.status) fail(`route-ownership: absent route ${a.pattern} has no status`);
  }
}

// ------------------------------------------------------------- database manifest
{
  const owners = new Map();
  const groups = [
    ...(db.shared_identity ?? []),
    ...(db.shared_organization ?? []),
    ...(db.external_or_unknown ?? []),
  ];
  for (const o of groups) {
    if (!o.object) { fail("database-ownership: an object has no name"); continue; }
    if (!o.primary_logical_owner)
      fail(`database-ownership: ${o.object} has no primary_logical_owner`);
    const prev = owners.get(o.object);
    if (prev && prev !== o.primary_logical_owner)
      fail(`database-ownership: ${o.object} has conflicting owners "${prev}" and "${o.primary_logical_owner}"`);
    owners.set(o.object, o.primary_logical_owner);

    const owner = o.primary_logical_owner;
    const allowed = new Set([...domainNames, "shared-identity", "UNKNOWN"]);
    if (!allowed.has(owner))
      fail(`database-ownership: ${o.object} owner "${owner}" is not a known domain`);
  }

  for (const g of db.domain_owned ?? []) {
    if (!g.group) fail("database-ownership: a domain_owned entry has no group");
    if (!domainNames.has(g.primary_logical_owner))
      fail(`database-ownership: group ${g.group} owner "${g.primary_logical_owner}" is not a known domain`);
  }

  // Anything remote-only or unowned must be surfaced, not silently owned.
  for (const o of db.external_or_unknown ?? []) {
    if (o.primary_logical_owner === "UNKNOWN" && o.severity !== "HIGH")
      warn(`database-ownership: ${o.object} is UNKNOWN-owned but not flagged HIGH severity`);
  }

  const drift = db.drift_appendix;
  if (!drift) fail("database-ownership: drift_appendix is missing");
  else {
    if (drift.remediation_authorized !== false)
      fail("database-ownership: drift_appendix.remediation_authorized must be false");
    if (!Array.isArray(drift.version_mismatches) || drift.version_mismatches.length === 0)
      fail("database-ownership: drift_appendix records no version mismatches despite USA-100 being open");
  }
}

// ------------------------------------------------------------------- reporting
if (warnings.length) {
  console.log("Warnings:");
  for (const w of warnings) console.log("  ! " + w);
}
if (errors.length) {
  console.error(`\nArchitecture validation FAILED — ${errors.length} error(s):`);
  for (const e of errors) console.error("  ✗ " + e);
  process.exit(1);
}
console.log(
  `Architecture validation passed — ${apps.domains.length} domains, ` +
    `${routes.routes.length} routes (${routes.absent_routes.length} recorded absent), ` +
    `${(db.shared_identity.length + db.shared_organization.length + db.external_or_unknown.length)} individually-owned DB objects, ` +
    `${db.domain_owned.length} owned groups.`,
);
