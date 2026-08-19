#!/usr/bin/env node
// USA-180: proves donor identity is keyed strictly by stable Planning Center
// person id, that the people sync is idempotent, and that the proven donation
// import is not touched.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const { donorLabel, normalizePerson } = await import(
  pathToFileURL(path.join(root, "src/lib/planning-center/people-normalize.ts")).href
);

const results = [];
const check = (name, fn) => {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error: error.message });
  }
};

function person(id, first, last, email) {
  return {
    id,
    type: "Person",
    attributes: { email_address: email, first_name: first, last_name: last, updated_at: "2026-08-19T00:00:00Z" },
  };
}

const fixture = [
  person("200181687", "Dana", "Reyes", "dana@example.org"),
  person("180438509", "Marcus", "Webb", null),
  person("199000111", null, null, null), // Planning Center exposes no name
];

// Mirrors the database: pco_person_id carries a UNIQUE constraint and the sync
// upserts on that conflict target.
function applyPeopleSync(table, people) {
  const stats = { inserted: 0, skipped: 0, updated: 0 };

  for (const raw of people) {
    const normalized = normalizePerson(raw);

    if (!normalized) {
      stats.skipped += 1;
      continue;
    }

    if (table.has(normalized.pco_person_id)) {
      stats.updated += 1;
    } else {
      stats.inserted += 1;
    }

    table.set(normalized.pco_person_id, normalized);
  }

  return stats;
}

const table = new Map();
const first = applyPeopleSync(table, fixture);
const afterFirst = table.size;
const second = applyPeopleSync(table, fixture);
const afterSecond = table.size;

check("first people sync inserts each person once", () => {
  assert.equal(first.inserted, 3);
  assert.equal(first.updated, 0);
  assert.equal(afterFirst, 3);
});

check("second people sync updates in place and creates zero duplicates", () => {
  assert.equal(second.inserted, 0);
  assert.equal(second.updated, 3);
  assert.equal(afterSecond - afterFirst, 0, "duplicate people must be 0");
});

check("identity is keyed by the stable Planning Center person id", () => {
  assert.deepEqual([...table.keys()].sort(), ["180438509", "199000111", "200181687"]);
  assert.equal(table.get("200181687").display_name, "Dana Reyes");
  assert.equal(table.get("200181687").email, "dana@example.org");
});

check("a person Planning Center gives no name for stays unnamed", () => {
  const unnamed = table.get("199000111");
  assert.equal(unnamed.display_name, null);
  assert.equal(unnamed.first_name, null);
});

check("a gift with a cached person shows that person's name", () => {
  assert.equal(
    donorLabel({ cachedDisplayName: "Dana Reyes", personId: "200181687" }),
    "Dana Reyes",
  );
});

check("a gift with no person relationship is anonymous, not unknown", () => {
  assert.equal(donorLabel({ personId: null }), "Anonymous");
  assert.equal(donorLabel({}), "Anonymous");
});

check("a gift whose person is not cached yet is unknown, not anonymous", () => {
  // These are different facts and the UI must not blur them.
  assert.equal(donorLabel({ personId: "200181687" }), "Unknown donor");
});

check("donor identity is never resolved by name similarity", () => {
  const normalize = readFileSync(path.join(root, "src/lib/planning-center/people-normalize.ts"), "utf8");
  const sync = readFileSync(path.join(root, "src/lib/planning-center/people-sync.ts"), "utf8");
  const code = [normalize, sync]
    .join("\n")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  assert.doesNotMatch(code, /levenshtein|similarity|fuzzy|ilike|household/i);
  // The only join key anywhere is the person id.
  assert.match(sync, /onConflict: "pco_person_id"/);
  assert.match(sync, /\.in\("pco_person_id"/);
});

check("the proven donation import is not modified by this change", () => {
  const giving = readFileSync(path.join(root, "src/lib/planning-center/giving-sync.ts"), "utf8");
  // Donation upsert semantics and conflict target unchanged.
  assert.match(giving, /onConflict: "pco_donation_id"/);
  // The giving sync must not have grown a people fetch.
  assert.doesNotMatch(giving, /\/people\?/);
  assert.doesNotMatch(giving, /pco_people/);
  assert.doesNotMatch(giving, /runPlanningCenterPeopleSync/);
});

check("people sync writes only the people cache, never giving records", () => {
  const sync = readFileSync(path.join(root, "src/lib/planning-center/people-sync.ts"), "utf8");
  assert.doesNotMatch(sync, /from\("pco_giving_records"\)/);
  assert.match(sync, /from\("pco_people"\)/);
  // It records its own auditable run, scoped so the two syncs stay distinct.
  assert.match(sync, /scope: "people"/);
});

check("the Finance read enriches without rewriting a gift", () => {
  const finance = readFileSync(path.join(root, "src/lib/operations/finance.ts"), "utf8");
  assert.match(finance, /loadDonorIdentities/);
  // Enrichment is a read-side join; no update path exists in the loader.
  assert.doesNotMatch(finance, /\.update\(|\.upsert\(|\.insert\(/);
});

const failed = results.filter((entry) => !entry.ok);
for (const entry of results) {
  console.log(`${entry.ok ? "PASS" : "FAIL"}  ${entry.name}${entry.ok ? "" : `\n      ${entry.error}`}`);
}
console.log(`\nfirst  people run: inserted=${first.inserted} updated=${first.updated} skipped=${first.skipped}`);
console.log(`second people run: inserted=${second.inserted} updated=${second.updated} duplicates=${afterSecond - afterFirst}`);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length > 0) process.exit(1);
