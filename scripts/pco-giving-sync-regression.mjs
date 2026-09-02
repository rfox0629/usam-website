#!/usr/bin/env node
// USA-174: proves the Planning Center importer is idempotent and that
// missionary attribution is never guessed. Runs the real normalize/attribute
// code against a Planning Center fixture, twice, through an in-memory table
// that enforces the same unique key as the database.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const { normalizeDonation, resolveAttribution } = await import(
  pathToFileURL(path.join(root, "src/lib/planning-center/giving-normalize.ts")).href
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

const fundNames = new Map([
  ["fund_general", "General Fund"],
  ["fund_fox", "Fox Family Support"],
  ["fund_unknown", "Camp Scholarships"],
]);

const FOX_PROFILE = "11111111-2222-3333-4444-555555555555";

const mappings = [
  { pco_fund_id: "fund_general", fund_name: "General Fund", pco_campaign_id: null, campaign_name: null, designation_name: null, target_kind: "general", missionary_profile_id: null },
  { pco_fund_id: "fund_fox", fund_name: "Fox Family Support", pco_campaign_id: null, campaign_name: null, designation_name: null, target_kind: "missionary", missionary_profile_id: FOX_PROFILE },
];

function donation(id, fundId, { recurring = false, refunded = false, designations = 1 } = {}) {
  const designationIds = Array.from({ length: designations }, (_, i) => `${id}_d${i}`);

  return {
    id,
    type: "Donation",
    attributes: {
      amount_cents: 25000,
      amount_currency: "USD",
      completed_at: "2026-08-01T12:00:00Z",
      created_at: "2026-08-01T12:00:00Z",
      fee_cents: -750,
      payment_method: "card",
      payment_status: "succeeded",
      received_at: "2026-08-01T12:00:00Z",
      refunded,
      updated_at: "2026-08-02T12:00:00Z",
    },
    relationships: {
      designations: { data: designationIds.map((did) => ({ id: did, type: "Designation" })) },
      person: { data: { id: "person_1", type: "Person" } },
      recurring_donation: recurring ? { data: { id: "rec_1", type: "RecurringDonation" } } : { data: null },
      refund: refunded ? { data: { id: "refund_1", type: "Refund" } } : { data: null },
    },
    __designationIds: designationIds,
    __fundId: fundId,
  };
}

function includedFor(donations) {
  const included = new Map();
  included.set("Person:person_1", {
    id: "person_1",
    type: "Person",
    attributes: { first_name: "Dana", last_name: "Reyes" },
  });

  for (const d of donations) {
    for (const did of d.__designationIds) {
      included.set(`Designation:${did}`, {
        id: did,
        type: "Designation",
        attributes: { amount_cents: 25000 },
        relationships: { fund: { data: { id: d.__fundId, type: "Fund" } } },
      });
    }
  }

  return included;
}

const fixture = [
  donation("don_1", "fund_general"),
  donation("don_2", "fund_fox", { recurring: true }),
  donation("don_3", "fund_unknown"),
  donation("don_4", "fund_fox", { refunded: true }),
  donation("don_5", "fund_fox", { designations: 2 }),
];
const included = includedFor(fixture);

// Mirrors the database: pco_donation_id carries a unique index, and the
// importer upserts on that conflict target.
function applySync(table, donations) {
  const stats = { errors: 0, inserted: 0, skipped: 0, updated: 0 };

  for (const raw of donations) {
    const gift = normalizeDonation({ donation: raw, fundNames, included, mappings });

    if (!gift) {
      stats.skipped += 1;
      continue;
    }

    if (table.has(gift.pco_donation_id)) {
      stats.updated += 1;
    } else {
      stats.inserted += 1;
    }

    table.set(gift.pco_donation_id, gift);
  }

  return stats;
}

const table = new Map();
const first = applySync(table, fixture);
const afterFirst = table.size;
const second = applySync(table, fixture);
const afterSecond = table.size;

check("first sync inserts every gift once", () => {
  assert.equal(first.inserted, 5);
  assert.equal(first.updated, 0);
  assert.equal(first.errors, 0);
  assert.equal(afterFirst, 5);
});

check("second sync updates in place and creates zero duplicates", () => {
  assert.equal(second.inserted, 0);
  assert.equal(second.updated, 5);
  assert.equal(second.errors, 0);
  assert.equal(afterSecond, afterFirst, "row count must not change on a repeat run");
  assert.equal(afterSecond - afterFirst, 0, "duplicate gifts must be 0");
});

check("upsert key is the Planning Center donation id", () => {
  assert.deepEqual([...table.keys()].sort(), ["don_1", "don_2", "don_3", "don_4", "don_5"]);
});

check("recurring schedule id never lands on the unique recurring column", () => {
  const recurring = table.get("don_2");
  assert.equal(recurring.pco_recurring_source_id, "rec_1");
  assert.equal(recurring.is_recurring, true);
  assert.equal(recurring.gift_type, "monthly");
  assert.ok(!("pco_recurring_donation_id" in recurring), "must not write the uniquely-indexed column");
});

check("explicit fund mapping attributes to the missionary", () => {
  const gift = table.get("don_2");
  assert.equal(gift.attribution_kind, "missionary");
  assert.equal(gift.attributed_missionary_profile_id, FOX_PROFILE);
  assert.equal(gift.attribution_source, "fund_mapping");
});

check("explicit general mapping stays general", () => {
  const gift = table.get("don_1");
  assert.equal(gift.attribution_kind, "general");
  assert.equal(gift.attributed_missionary_profile_id, null);
});

check("unmapped fund stays unmapped instead of guessing", () => {
  const gift = table.get("don_3");
  assert.equal(gift.attribution_kind, "unmapped");
  assert.equal(gift.attributed_missionary_profile_id, null);
});

check("split gifts are never attributed to one missionary", () => {
  const gift = table.get("don_5");
  assert.equal(gift.designation_count, 2);
  assert.equal(gift.attribution_kind, "unmapped");
  assert.equal(gift.attribution_source, "multi_designation");
});

check("refunds are captured, not silently counted", () => {
  const gift = table.get("don_4");
  assert.equal(gift.refunded, true);
  assert.equal(gift.pco_refund_id, "refund_1");
});

check("donor name similarity never produces an attribution", () => {
  // A fund whose name matches the missionary's household exactly still resolves
  // to unmapped, because no mapping row names it.
  const attribution = resolveAttribution({
    campaignId: null,
    designationCount: 1,
    designationName: "Fox Family Support",
    fundId: "fund_not_mapped",
    mappings,
  });
  assert.equal(attribution.kind, "unmapped");
  assert.equal(attribution.missionaryProfileId, null);
});

check("amounts convert from cents and keep fee/net context", () => {
  const gift = table.get("don_1");
  assert.equal(gift.gross_amount, 250);
  assert.equal(gift.fee_amount, -7.5);
  assert.equal(gift.net_amount, 242.5);
  assert.equal(gift.currency, "USD");
});

check("source identifiers are preserved for auditability", () => {
  const gift = table.get("don_1");
  assert.equal(gift.pco_donation_id, "don_1");
  assert.equal(gift.pco_person_id, "person_1");
  assert.equal(gift.pco_fund_id, "fund_general");
  assert.equal(gift.gift_status, "succeeded");
  assert.ok(gift.raw_payload && gift.raw_payload.attributes, "raw payload retained");
});

check("importer source never embeds credentials in output", () => {
  const sync = readFileSync(path.join(root, "src/lib/planning-center/giving-sync.ts"), "utf8");
  assert.match(sync, /PCO_APP_ID/);
  assert.match(sync, /PCO_SECRET/);
  assert.doesNotMatch(sync, /PLANNING_CENTER_APP_ID|PLANNING_CENTER_SECRET/);
  assert.doesNotMatch(sync, /console\.(log|error|warn)/, "importer must not log");
  assert.match(sync, /https:\/\/api\.planningcenteronline\.com\/giving\/v2/);
});

const failed = results.filter((entry) => !entry.ok);

for (const entry of results) {
  console.log(`${entry.ok ? "PASS" : "FAIL"}  ${entry.name}${entry.ok ? "" : `\n      ${entry.error}`}`);
}

console.log(`\nfirst  run: inserted=${first.inserted} updated=${first.updated} skipped=${first.skipped} errors=${first.errors}`);
console.log(`second run: inserted=${second.inserted} updated=${second.updated} skipped=${second.skipped} errors=${second.errors} duplicates=${afterSecond - afterFirst}`);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);

if (failed.length > 0) {
  process.exit(1);
}
