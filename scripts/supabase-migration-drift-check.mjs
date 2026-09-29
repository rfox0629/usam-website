#!/usr/bin/env node
// USA-279: detect drift between supabase/migrations and the production ledger.
//
// Static mode (default, runs in CI, no credentials):
//   - no rollback or non-migration .sql file inside supabase/migrations
//   - every file is named <14-digit version>_<snake_name>.sql
//   - no two files share a version
//   - a file whose name is recorded in the production ledger snapshot uses the
//     recorded version (a renumbered copy would be pushed a second time)
//   - every rollback in supabase/rollbacks reverses a migration that exists
//   Reports, without failing: repo files not in the snapshot (pending or
//   unrecorded) and snapshot rows with no repo file.
//
// Live mode (--live, needs SUPABASE_DB_URL and psql; read-only):
//   compares the committed snapshot with production and fails when they differ.
//   --write-snapshot rewrites supabase/migration-ledger/production.tsv instead.
//
// Nothing here writes to any database.

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const migrationsDir = path.join(root, "supabase", "migrations");
const rollbacksDir = path.join(root, "supabase", "rollbacks");
const snapshotPath = path.join(root, "supabase", "migration-ledger", "production.tsv");

const args = new Set(process.argv.slice(2));
const failures = [];
const notes = [];

function readSnapshot() {
  if (!existsSync(snapshotPath)) {
    failures.push(`missing ledger snapshot ${path.relative(root, snapshotPath)}`);
    return [];
  }
  return readFileSync(snapshotPath, "utf8")
    .split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const [version, name, md5] = line.split("\t");
      return { version, name, md5 };
    });
}

function parseMigrationFiles() {
  const files = readdirSync(migrationsDir).filter((file) => !file.startsWith("."));
  const parsed = [];
  for (const file of files) {
    if (!file.endsWith(".sql")) {
      failures.push(`non-SQL file in supabase/migrations: ${file}`);
      continue;
    }
    if (/_rollback\.sql$/.test(file) || /rollback/i.test(file)) {
      failures.push(`rollback file in supabase/migrations (move it to supabase/rollbacks): ${file}`);
      continue;
    }
    const match = /^(\d{14})_([a-z0-9_]+)\.sql$/.exec(file);
    if (!match) {
      failures.push(`migration name must be <14-digit version>_<snake_name>.sql: ${file}`);
      continue;
    }
    parsed.push({ file, version: match[1], name: match[2] });
  }
  return parsed;
}

function staticChecks(snapshot, migrations) {
  const byVersion = new Map();
  for (const migration of migrations) {
    const list = byVersion.get(migration.version) ?? [];
    list.push(migration.file);
    byVersion.set(migration.version, list);
  }
  for (const [version, list] of byVersion) {
    if (list.length > 1) failures.push(`duplicate migration version ${version}: ${list.join(", ")}`);
  }

  const ledgerByName = new Map();
  for (const row of snapshot) {
    const list = ledgerByName.get(row.name) ?? [];
    list.push(row.version);
    ledgerByName.set(row.name, list);
  }
  const ledgerVersions = new Set(snapshot.map((row) => row.version));

  const pending = [];
  for (const migration of migrations) {
    const recorded = ledgerByName.get(migration.name);
    if (recorded && !recorded.includes(migration.version)) {
      failures.push(
        `${migration.file} is recorded in production as ${recorded.join(" / ")}_${migration.name}; rename it to the recorded version`,
      );
    } else if (!ledgerVersions.has(migration.version)) {
      pending.push(migration.file);
    }
  }

  const repoVersions = new Set(migrations.map((migration) => migration.version));
  const remoteOnly = snapshot.filter((row) => !repoVersions.has(row.version));

  if (existsSync(rollbacksDir)) {
    for (const file of readdirSync(rollbacksDir).filter((name) => name.endsWith(".sql"))) {
      const match = /^(\d{14})_([a-z0-9_]+)_rollback\.sql$/.exec(file);
      if (!match) {
        failures.push(`rollback name must be <version>_<name>_rollback.sql: ${file}`);
        continue;
      }
      const forward = `${match[1]}_${match[2]}.sql`;
      if (!existsSync(path.join(migrationsDir, forward))) {
        failures.push(`rollback ${file} has no forward migration supabase/migrations/${forward}`);
      }
    }
  }

  const latestApplied = [...ledgerVersions].sort().at(-1);
  const outOfOrder = pending.filter((file) => file.slice(0, 14) < latestApplied);
  notes.push(`${migrations.length} migration files; ${snapshot.length} production ledger rows (snapshot)`);
  notes.push(`${pending.length} repo migrations not in the production ledger (${outOfOrder.length} older than the latest applied version ${latestApplied}, so \`supabase db push\` needs --include-all or a repair first)`);
  if (args.has("--verbose")) for (const file of pending) notes.push(`  unrecorded: ${file}`);
  notes.push(`${remoteOnly.length} production ledger rows with no repo file${remoteOnly.length ? `: ${remoteOnly.map((row) => `${row.version}_${row.name}`).join(", ")}` : ""}`);
}

function queryLive() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    failures.push("--live needs SUPABASE_DB_URL (a read-only connection string)");
    return null;
  }
  const sql = "select version || E'\\t' || coalesce(name, '') || E'\\t' || coalesce(md5(array_to_string(statements, E'\\n')), '-') from supabase_migrations.schema_migrations order by version";
  const output = execFileSync("psql", [url, "-At", "-v", "ON_ERROR_STOP=1", "-c", sql], { encoding: "utf8" });
  return output
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [version, name, md5] = line.split("\t");
      return { version, name, md5 };
    });
}

const snapshot = readSnapshot();
const migrations = parseMigrationFiles();

if (args.has("--live")) {
  const live = queryLive();
  if (live) {
    if (args.has("--write-snapshot")) {
      const header = readFileSync(snapshotPath, "utf8").split("\n").filter((line) => line.startsWith("#"));
      writeFileSync(snapshotPath, [...header, ...live.map((row) => `${row.version}\t${row.name}\t${row.md5}`)].join("\n") + "\n");
      notes.push(`snapshot rewritten with ${live.length} rows`);
    } else {
      const key = (row) => `${row.version}\t${row.name}\t${row.md5}`;
      const snapshotKeys = new Set(snapshot.map(key));
      const liveKeys = new Set(live.map(key));
      const added = live.filter((row) => !snapshotKeys.has(key(row)));
      const removed = snapshot.filter((row) => !liveKeys.has(key(row)));
      for (const row of added) failures.push(`production ledger has ${row.version}_${row.name} but the snapshot does not`);
      for (const row of removed) failures.push(`snapshot has ${row.version}_${row.name} but production does not`);
    }
  }
}

staticChecks(snapshot, migrations);

for (const note of notes) console.log(note);
if (failures.length) {
  console.error(`\nMigration drift check FAILED (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("\nMigration drift check passed.");
