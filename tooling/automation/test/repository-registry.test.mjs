/**
 * Regression tests for repository resolution (USA-89 R2/R4).
 *
 * These exist because an empty duplicate USA-Missionaries/usam-website once sat
 * alongside the canonical rfox0629/usam-website. Every test below encodes a way
 * that ambiguity could have caused the wrong repository to be targeted.
 *
 *   node --test test/repository-registry.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  loadRegistry, resolveRepository, resolveVercelProject, RepositoryResolutionError,
} from "../src/repository-registry.mjs";

const REGISTRY_PATH = new URL("../config/repository-registry.json", import.meta.url).pathname;

function tempRegistry(contents) {
  const dir = mkdtempSync(join(tmpdir(), "regtest-"));
  const path = join(dir, "repository-registry.json");
  writeFileSync(path, typeof contents === "string" ? contents : JSON.stringify(contents));
  return path;
}

function baseRecord(overrides = {}) {
  return {
    application: "Test", githubOwner: "owner", repository: "repo", slug: "owner/repo",
    defaultBranch: "main", runtimePath: "/tmp/repo", vercelProject: "vp",
    supabaseProject: "sp", linearApplication: ["X"], status: "active", ...overrides,
  };
}

// ---------------------------------------------------------- the real registry

test("resolves the canonical rfox0629/usam-website", () => {
  const registry = loadRegistry(REGISTRY_PATH);
  const record = resolveRepository(registry, "rfox0629/usam-website");
  assert.equal(record.owner, "rfox0629");
  assert.equal(record.repository, "usam-website");
  assert.equal(record.defaultBranch, "main");
  assert.equal(record.vercelProject, "usam-website");
  assert.equal(record.supabaseRef, "dbupuphezeqkiolprrlg");
  assert.equal(record.status, "active-production");
});

test("automation labels resolve through the website checkout", () => {
  const registry = loadRegistry(REGISTRY_PATH);
  const records = registry.applications.filter((record) =>
    (record.linearApplication ?? []).includes("Automation") &&
    record.status !== "legacy-reference" &&
    record.status !== "archived",
  );
  assert.equal(records.length, 1);
  assert.equal(records[0].slug, "rfox0629/usam-website");
  assert.equal(records[0].runtimePath, "/Users/ryanfox/Code/usam-website");
});

test("resolves USA-Missionaries/dos-platform under the other owner", () => {
  const registry = loadRegistry(REGISTRY_PATH);
  const record = resolveRepository(registry, "USA-Missionaries/dos-platform");
  assert.equal(record.owner, "USA-Missionaries");
  assert.equal(record.repository, "dos-platform");
  assert.equal(record.status, "legacy-reference");
});

test("the deleted duplicate USA-Missionaries/usam-website does not resolve", () => {
  const registry = loadRegistry(REGISTRY_PATH);
  assert.throws(
    () => resolveRepository(registry, "USA-Missionaries/usam-website"),
    (e) => e instanceof RepositoryResolutionError && e.code === "REPOSITORY_NOT_FOUND",
  );
});

test("same repo name under two owners resolves to distinct records", () => {
  const registry = loadRegistry(REGISTRY_PATH);
  // dos-platform exists only under USA-Missionaries; usam-website only under rfox0629.
  const a = resolveRepository(registry, "rfox0629/usam-website");
  const b = resolveRepository(registry, "USA-Missionaries/dos-platform");
  assert.notEqual(a.owner, b.owner);
  assert.notEqual(a.application, b.application);
});

// ------------------------------------------------------------- fail-closed

test("refuses a bare repository name", () => {
  const registry = loadRegistry(REGISTRY_PATH);
  for (const bare of ["usam-website", "dos-platform", "save-website"]) {
    assert.throws(
      () => resolveRepository(registry, bare),
      (e) => e.code === "OWNER_MISSING",
      `bare name "${bare}" must be refused`,
    );
  }
});

test("never falls back to a default repository", () => {
  const registry = loadRegistry(REGISTRY_PATH);
  for (const missing of ["", "   ", null, undefined]) {
    assert.throws(() => resolveRepository(registry, missing));
  }
  assert.throws(
    () => resolveRepository(registry, "rfox0629/does-not-exist"),
    (e) => e.code === "REPOSITORY_NOT_FOUND",
  );
});

test("rejects a duplicate repository name across owners as ambiguous", () => {
  const path = tempRegistry({
    schemaVersion: 2,
    applications: [
      baseRecord({ githubOwner: "a", slug: "dup/repo", application: "First" }),
      baseRecord({ githubOwner: "b", slug: "dup/repo", application: "Second" }),
    ],
  });
  const registry = loadRegistry(path);
  assert.throws(
    () => resolveRepository(registry, "dup/repo"),
    (e) => e.code === "AMBIGUOUS_MATCH",
  );
});

test("rejects a record with a missing owner", () => {
  const path = tempRegistry({
    schemaVersion: 2,
    applications: [baseRecord({ githubOwner: "" })],
  });
  assert.throws(() => loadRegistry(path), (e) => e.code === "OWNER_MISSING");
});

test("rejects a record missing a required field", () => {
  const record = baseRecord();
  delete record.supabaseProject;
  const path = tempRegistry({ schemaVersion: 2, applications: [record] });
  assert.throws(() => loadRegistry(path), (e) => e.code === "REGISTRY_MALFORMED");
});

test("rejects malformed JSON", () => {
  assert.throws(() => loadRegistry(tempRegistry("{ not json")),
    (e) => e.code === "REGISTRY_MALFORMED");
});

test("rejects a v1 registry — it carries no ownership data", () => {
  const path = tempRegistry({ schemaVersion: 1, canonicalRepositories: {} });
  assert.throws(() => loadRegistry(path), (e) => e.code === "REGISTRY_MALFORMED");
});

test("rejects a missing registry file", () => {
  assert.throws(() => loadRegistry("/nonexistent/registry.json"),
    (e) => e.code === "REGISTRY_MISSING");
});

// ------------------------------------------------------------ vercel mapping

test("resolves the Vercel project through the registry, not a default", () => {
  const registry = loadRegistry(REGISTRY_PATH);
  assert.equal(resolveVercelProject(registry, "rfox0629/usam-website").project, "usam-website");
  // Names differ across systems — exactly why a default is unsafe.
  assert.equal(resolveVercelProject(registry, "rfox0629/save-website").project, "save-platform");
  assert.equal(resolveVercelProject(registry, "rfox0629/theLordsarmy").project, "army-website");
});

test("old usam-automation record is archived and has no Vercel target", () => {
  const registry = loadRegistry(REGISTRY_PATH);
  const record = resolveRepository(registry, "rfox0629/usam-automation");
  assert.equal(record.status, "archived");
  assert.throws(() => resolveVercelProject(registry, "rfox0629/usam-automation"),
    (e) => e.code === "VERCEL_PROJECT_MISSING");
});
