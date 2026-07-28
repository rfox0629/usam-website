#!/usr/bin/env node
/**
 * Architecture manifest tests.
 *
 * Zero dependencies, no network, no database, no secrets, no build.
 * Run: node --test scripts/architecture/architecture.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parseYamlSubset, YamlSubsetError } from "./yaml-subset.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const docs = path.join(root, "docs", "architecture");
const read = (f) => readFileSync(path.join(docs, f), "utf8");
const load = (f) => parseYamlSubset(read(f));

const run = (script, args = []) =>
  execFileSync("node", [path.join("scripts", "architecture", script), ...args], {
    cwd: root,
    encoding: "utf8",
  });

// ------------------------------------------------------------- parser itself
test("yaml subset parser handles the constructs the manifests use", () => {
  const d = parseYamlSubset(`
version: 1
name: plain
quoted: 'auth.users'
flowseq: [a, b, c]
flowmap: {x: 1, y: 2}
empty: []
folded: >-
  one two
  three
block:
  nested: true
list:
  - alpha
  - key: v
    other: 2
  - >-
    folded item
trailing: [q]   # comment here
`);
  assert.equal(d.version, 1);
  assert.equal(d.quoted, "auth.users");
  assert.deepEqual(d.flowseq, ["a", "b", "c"]);
  assert.deepEqual(d.flowmap, { x: 1, y: 2 });
  assert.deepEqual(d.empty, []);
  assert.equal(d.folded, "one two three");
  assert.equal(d.block.nested, true);
  assert.equal(d.list[0], "alpha");
  assert.deepEqual(d.list[1], { key: "v", other: 2 });
  assert.equal(d.list[2], "folded item");
  assert.deepEqual(d.trailing, ["q"]);
});

test("yaml subset parser fails closed on unsupported constructs", () => {
  for (const bad of ["a: &anchor 1", "a: !!str x", "%YAML 1.2\na: 1", "a: |\n  literal"]) {
    assert.throws(() => parseYamlSubset(bad), YamlSubsetError, `should reject: ${bad}`);
  }
  assert.throws(() => parseYamlSubset("a:\n\tb: 1"), YamlSubsetError, "should reject tabs");
});

// ------------------------------------------------------------------ manifests
test("all three manifests parse", () => {
  for (const f of ["application-ownership.yaml", "route-ownership.yaml", "database-ownership.yaml"]) {
    assert.doesNotThrow(() => load(f), `${f} must parse`);
  }
});

test("domain names are unique and non-empty", () => {
  const names = load("application-ownership.yaml").domains.map((d) => d.name);
  assert.ok(names.length > 0);
  assert.equal(new Set(names).size, names.length, "duplicate domain name");
  for (const n of names) assert.match(n, /^[a-z][a-z0-9-]*$/, `bad domain name: ${n}`);
});

test("every canonical_repository is a known repository", () => {
  const m = load("application-ownership.yaml");
  const known = new Set(m.known_repositories);
  for (const d of m.domains) assert.ok(known.has(d.canonical_repository), `${d.name}: ${d.canonical_repository}`);
});

test("every linear_application is a known Application label", () => {
  const m = load("application-ownership.yaml");
  const known = new Set(m.known_linear_applications);
  for (const d of m.domains) {
    if (d.linear_application) assert.ok(known.has(d.linear_application), `${d.name}: ${d.linear_application}`);
  }
});

test("retired repository names never appear as a current source", () => {
  const m = load("application-ownership.yaml");
  const declarationBlocks = /^(known_repositories|retired_repositories|legacy_repositories|absent_routes):/;
  for (const f of ["application-ownership.yaml", "route-ownership.yaml", "database-ownership.yaml"]) {
    let section = null;
    read(f).split("\n").forEach((line, i) => {
      const top = line.match(/^([a-z_][a-z0-9_]*):/);
      if (top) section = top[0];
      if (section && declarationBlocks.test(section)) return;
      if (/^\s*#/.test(line)) return;
      for (const stale of m.retired_repositories) {
        if (line.includes(stale)) {
          assert.match(line, /retired|deleted|orphan|legacy|do not|never|absent/i,
            `${f}:${i + 1} uses retired name "${stale}" as a current source`);
        }
      }
    });
  }
});

test("dos-platform is only ever referenced as legacy", () => {
  const m = load("application-ownership.yaml");
  const legacy = m.legacy_repositories.find((r) => r.slug === "USA-Missionaries/dos-platform");
  assert.ok(legacy, "dos-platform must be declared under legacy_repositories");
  assert.equal(legacy.status, "legacy-reference");
});

test("Organization OS is never described as mature or independently deployable", () => {
  const org = load("application-ownership.yaml").domains.find((d) => d.name === "organization-platform");
  assert.ok(org);
  assert.ok(["planned-and-partial", "emerging", "planned"].includes(org.status), `status: ${org.status}`);
  assert.equal(org.independently_deployable, false);
});

test("no new DOS repository is proposed anywhere in the manifests", () => {
  for (const f of ["application-ownership.yaml", "route-ownership.yaml", "database-ownership.yaml"]) {
    const text = read(f);
    assert.doesNotMatch(text, /rfox0629\/dos-app/, `${f} proposes a separate DOS repository`);
    assert.doesNotMatch(text, /rfox0629\/organization-os/, `${f} proposes a separate Organization OS repository`);
  }
});

// --------------------------------------------------------------------- routes
test("route patterns are well formed and owners are known domains", () => {
  const apps = load("application-ownership.yaml");
  const routes = load("route-ownership.yaml");
  const vocab = new Set([...apps.domains.map((d) => d.name), "split-by-subtree"]);
  for (const r of routes.routes) {
    assert.ok(r.pattern.startsWith("/"), `${r.pattern} must start with /`);
    assert.equal((r.pattern.match(/\[/g) ?? []).length, (r.pattern.match(/\]/g) ?? []).length, `${r.pattern} brackets`);
    assert.ok(vocab.has(r.current_owner), `${r.pattern} current_owner ${r.current_owner}`);
    assert.ok(vocab.has(r.desired_owner), `${r.pattern} desired_owner ${r.desired_owner}`);
    assert.ok(r.access, `${r.pattern} needs an access classification`);
  }
});

test("duplicate route patterns require an explicit shared flag", () => {
  const routes = load("route-ownership.yaml").routes;
  const counts = new Map();
  for (const r of routes) counts.set(r.pattern, (counts.get(r.pattern) ?? 0) + 1);
  for (const [pattern, n] of counts) {
    if (n > 1) {
      for (const r of routes.filter((x) => x.pattern === pattern)) {
        assert.equal(r.shared, true, `${pattern} duplicated without shared: true`);
      }
    }
  }
});

test("absent routes are not also claimed as implemented", () => {
  const r = load("route-ownership.yaml");
  const real = new Set(r.routes.map((x) => x.pattern));
  for (const a of r.absent_routes) assert.ok(!real.has(a.pattern), `${a.pattern} in both lists`);
});

// ------------------------------------------------------------------- database
test("database objects have a single logical owner", () => {
  const db = load("database-ownership.yaml");
  const seen = new Map();
  for (const o of [...db.shared_identity, ...db.shared_organization, ...db.external_or_unknown]) {
    assert.ok(o.primary_logical_owner, `${o.object} has no owner`);
    const prev = seen.get(o.object);
    assert.ok(prev === undefined || prev === o.primary_logical_owner, `${o.object} owner conflict`);
    seen.set(o.object, o.primary_logical_owner);
  }
});

test("drift appendix records USA-100 evidence and forbids remediation", () => {
  const d = load("database-ownership.yaml").drift_appendix;
  assert.equal(d.remediation_authorized, false);
  assert.ok(d.version_mismatches.length > 0);
  assert.equal(d.issue, "USA-100");
});

test("Aligned Insights is classified external-or-unknown and flagged HIGH", () => {
  const db = load("database-ownership.yaml");
  const ai = db.external_or_unknown.find((o) => o.object === "aligned_insights_inquiries");
  assert.ok(ai, "aligned_insights_inquiries must be recorded");
  assert.equal(ai.primary_logical_owner, "UNKNOWN");
  assert.equal(ai.severity, "HIGH");
});

// ------------------------------------------------------------------ executables
test("validator exits 0 on the committed manifests", () => {
  const out = run("validate-architecture.mjs");
  assert.match(out, /Architecture validation passed/);
});

test("dependency report is deterministic", () => {
  const a = run("dependency-report.mjs", ["--json"]);
  const b = run("dependency-report.mjs", ["--json"]);
  assert.equal(a, b, "dependency report output is not deterministic");
});

test("dependency baseline matches current state", () => {
  const out = run("dependency-report.mjs", ["--check"]);
  assert.match(out, /Dependency boundary check passed/);
});

test("shared-platform does not import application code", () => {
  const report = JSON.parse(run("dependency-report.mjs", ["--json"]));
  assert.equal(report.shared_platform_leaking_out, 0,
    "shared-platform must not depend on application-specific code");
});

test("there are no circular dependencies across the repository", () => {
  const report = JSON.parse(run("dependency-report.mjs", ["--json"]));
  assert.equal(report.circular_dependencies, 0);
});
