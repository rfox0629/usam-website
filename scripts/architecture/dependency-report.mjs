#!/usr/bin/env node
/**
 * Cross-boundary dependency reporter.
 *
 * MEASURES ONLY. It never edits source, never rewrites imports, and by default
 * never fails on pre-existing cross-domain imports. Its job is to make the
 * current coupling visible and to stop NEW coupling from appearing unnoticed.
 *
 *   node scripts/architecture/dependency-report.mjs            # human report
 *   node scripts/architecture/dependency-report.mjs --json     # machine output
 *   node scripts/architecture/dependency-report.mjs --write-baseline
 *   node scripts/architecture/dependency-report.mjs --check    # CI mode
 *
 * --check compares against docs/architecture/dependency-baseline.json and exits
 * non-zero ONLY when a cross-domain edge appears that is not in the baseline.
 * Existing violations stay visible but do not block. To update the baseline
 * deliberately, run --write-baseline and commit the diff; the baseline records
 * exact counts so a casual regeneration that hides a regression shows up in review.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parseYamlSubset } from "./yaml-subset.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const docs = path.join(root, "docs", "architecture");
const baselinePath = path.join(docs, "dependency-baseline.json");

const args = new Set(process.argv.slice(2));
const asJson = args.has("--json");
const writeBaseline = args.has("--write-baseline");
const check = args.has("--check");

const manifest = parseYamlSubset(readFileSync(path.join(docs, "application-ownership.yaml"), "utf8"));

// ------------------------------------------------------------- classification
/** Build matchers, most-specific first. Specificity = literal length before any wildcard. */
const matchers = [];
for (const d of manifest.domains) {
  for (const raw of d.path_patterns ?? []) {
    const p = raw.replace(/\/\*\*$/, "");
    const isPrefix = raw.endsWith("/**");
    matchers.push({ domain: d.name, prefix: p, isPrefix, specificity: p.length });
  }
}
matchers.sort((a, b) => b.specificity - a.specificity);

function classify(rel) {
  for (const m of matchers) {
    if (m.isPrefix ? rel === m.prefix || rel.startsWith(m.prefix + "/") : rel === m.prefix) return m.domain;
  }
  return null; // unclassified
}

// ------------------------------------------------------------------ file walk
const SKIP = new Set(["node_modules", ".git", ".next", "test-results", "public", "docs", "supabase"]);
const EXT = new Set([".ts", ".tsx", ".mjs", ".js", ".jsx"]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue;
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (EXT.has(path.extname(entry))) out.push(full);
  }
  return out;
}

const files = walk(root);

// ------------------------------------------------------------- import parsing
const IMPORT_RE = /(?:^|\n)\s*(?:import|export)[\s\S]*?from\s+["']([^"']+)["']|(?:^|\W)import\(\s*["']([^"']+)["']\s*\)|require\(\s*["']([^"']+)["']\s*\)/g;

/** Resolve an alias/relative specifier to a repo-relative path, or null if external. */
function resolveSpecifier(spec, fromFile) {
  let candidate;
  if (spec.startsWith("@/")) candidate = path.join(root, spec.slice(2));
  else if (spec.startsWith("./") || spec.startsWith("../")) candidate = path.resolve(path.dirname(fromFile), spec);
  else return null; // bare package specifier — external

  const tries = [
    candidate,
    candidate + ".ts", candidate + ".tsx", candidate + ".mjs", candidate + ".js", candidate + ".jsx",
    path.join(candidate, "index.ts"), path.join(candidate, "index.tsx"), path.join(candidate, "index.mjs"),
  ];
  for (const t of tries) {
    try { if (statSync(t).isFile()) return path.relative(root, t); } catch { /* keep trying */ }
  }
  return { unresolved: path.relative(root, candidate) };
}

const edges = [];
const unresolved = [];
const fanIn = new Map();
const graph = new Map();

for (const file of files) {
  const rel = path.relative(root, file);
  const fromDomain = classify(rel);
  const text = readFileSync(file, "utf8");
  IMPORT_RE.lastIndex = 0;
  let m;
  const targets = new Set();
  while ((m = IMPORT_RE.exec(text)) !== null) {
    const spec = m[1] ?? m[2] ?? m[3];
    if (spec) targets.add(spec);
  }
  for (const spec of targets) {
    const res = resolveSpecifier(spec, file);
    if (res === null) continue;
    if (typeof res === "object") { unresolved.push({ from: rel, spec, expected: res.unresolved }); continue; }
    const toDomain = classify(res);
    fanIn.set(res, (fanIn.get(res) ?? 0) + 1);
    if (!graph.has(rel)) graph.set(rel, new Set());
    graph.get(rel).add(res);
    edges.push({ from: rel, to: res, fromDomain, toDomain });
  }
}

// --------------------------------------------------------------- edge buckets
const SHARED = "shared-platform";
const bucket = { intraDomain: 0, intoShared: 0, crossDomain: [], fromUnclassified: 0, toUnclassified: 0, sharedLeaking: [] };

for (const e of edges) {
  if (e.fromDomain === null) { bucket.fromUnclassified++; continue; }
  if (e.toDomain === null) { bucket.toUnclassified++; continue; }
  if (e.fromDomain === e.toDomain) { bucket.intraDomain++; continue; }
  if (e.toDomain === SHARED) { bucket.intoShared++; continue; }
  if (e.fromDomain === SHARED) { bucket.sharedLeaking.push(e); continue; }
  bucket.crossDomain.push(e);
}

// ------------------------------------------------------------------- cycles
function findCycles(limit = 20) {
  const found = [];
  const state = new Map();
  const stack = [];
  function dfs(n) {
    if (found.length >= limit) return;
    state.set(n, 1);
    stack.push(n);
    for (const next of graph.get(n) ?? []) {
      if (found.length >= limit) break;
      const s = state.get(next);
      if (s === 1) found.push([...stack.slice(stack.indexOf(next)), next]);
      else if (s === undefined) dfs(next);
    }
    stack.pop();
    state.set(n, 2);
  }
  for (const n of graph.keys()) if (!state.has(n)) dfs(n);
  return found;
}
const cycles = findCycles();

// -------------------------------------------------------------- normalisation
const key = (e) => `${e.fromDomain} -> ${e.toDomain}`;
const crossSummary = {};
for (const e of bucket.crossDomain) {
  crossSummary[key(e)] ??= { count: 0, files: [] };
  crossSummary[key(e)].count++;
  crossSummary[key(e)].files.push(`${e.from} -> ${e.to}`);
}
for (const v of Object.values(crossSummary)) v.files.sort();

const topFanIn = [...fanIn.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
  .map(([f, c]) => ({ module: f, consumers: c }));

const report = {
  generated_from_commit: process.env.GITHUB_SHA ?? "local",
  files_scanned: files.length,
  edges_total: edges.length,
  intra_domain: bucket.intraDomain,
  into_shared_platform: bucket.intoShared,
  from_unclassified: bucket.fromUnclassified,
  to_unclassified: bucket.toUnclassified,
  shared_platform_leaking_out: bucket.sharedLeaking.length,
  cross_domain_total: bucket.crossDomain.length,
  cross_domain: Object.fromEntries(
    Object.entries(crossSummary).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, v]),
  ),
  circular_dependencies: cycles.length,
  unresolved_imports: unresolved.length,
  top_fan_in: topFanIn,
};

// ------------------------------------------------------------------ execution
if (writeBaseline) {
  writeFileSync(baselinePath, JSON.stringify(report, null, 2) + "\n");
  console.log(`Baseline written to ${path.relative(root, baselinePath)}`);
  console.log(`  cross-domain edges: ${report.cross_domain_total}`);
  process.exit(0);
}

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

if (check) {
  let baseline;
  try {
    baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
  } catch {
    console.error(`No baseline at ${path.relative(root, baselinePath)}. Run --write-baseline first.`);
    process.exit(1);
  }
  const newViolations = [];
  for (const [pair, data] of Object.entries(report.cross_domain)) {
    const base = baseline.cross_domain[pair];
    if (!base) { newViolations.push(`NEW boundary crossed: ${pair} (${data.count} edge(s))`); continue; }
    const added = data.files.filter((f) => !base.files.includes(f));
    for (const f of added) newViolations.push(`NEW cross-domain import (${pair}): ${f}`);
  }
  if (report.shared_platform_leaking_out > (baseline.shared_platform_leaking_out ?? 0))
    newViolations.push(
      `shared-platform now imports application code: ${report.shared_platform_leaking_out} (baseline ${baseline.shared_platform_leaking_out ?? 0})`,
    );

  if (newViolations.length) {
    console.error(`Dependency boundary check FAILED — ${newViolations.length} new violation(s):`);
    for (const v of newViolations) console.error("  ✗ " + v);
    console.error("\nIf this coupling is intentional, run:");
    console.error("  node scripts/architecture/dependency-report.mjs --write-baseline");
    console.error("and commit the baseline diff so the change is reviewed explicitly.");
    process.exit(1);
  }
  console.log(
    `Dependency boundary check passed — ${report.cross_domain_total} cross-domain edge(s), all baselined.`,
  );
  process.exit(0);
}

// human-readable
console.log("Dependency boundary report");
console.log("==========================");
console.log(`files scanned            ${report.files_scanned}`);
console.log(`import edges             ${report.edges_total}`);
console.log(`  intra-domain           ${report.intra_domain}`);
console.log(`  into shared-platform   ${report.into_shared_platform}`);
console.log(`  cross-domain           ${report.cross_domain_total}`);
console.log(`  shared-platform leaks  ${report.shared_platform_leaking_out}`);
console.log(`  from unclassified      ${report.from_unclassified}`);
console.log(`  to unclassified        ${report.to_unclassified}`);
console.log(`circular dependencies    ${report.circular_dependencies}`);
console.log(`unresolved imports       ${report.unresolved_imports}`);
console.log("\nCross-domain edges by pair:");
for (const [pair, data] of Object.entries(report.cross_domain)) {
  console.log(`  ${pair}  (${data.count})`);
  for (const f of data.files.slice(0, 6)) console.log(`      ${f}`);
  if (data.files.length > 6) console.log(`      … and ${data.files.length - 6} more`);
}
console.log("\nHighest fan-in modules:");
for (const t of report.top_fan_in) console.log(`  ${String(t.consumers).padStart(4)}  ${t.module}`);
if (cycles.length) {
  console.log("\nCircular dependencies (first few):");
  for (const c of cycles.slice(0, 5)) console.log("  " + c.join(" -> "));
}
