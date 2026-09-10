import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/* USA-247 production-backed circle placement.
   Guards the parts a browser test cannot reach: what the migration promises,
   what the transaction refuses, and what the route will not let through. The
   behaviour itself is proven against a real Postgres in the founder report;
   this file stops that behaviour being edited away silently. */

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const migration = read("supabase/migrations/20260909180000_usa_247_circle_placements.sql");
const rollback = read("supabase/migrations/20260909180000_usa_247_circle_placements_rollback.sql");
const store = read("src/lib/dos/circle-placement-store.ts");
const route = read("app/api/dos/app/circle-placements/route.ts");
const code = store.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const migrationCode = migration.replace(/^\s*--.*$/gm, "");

/* ---------------------------------------------- additive, never destructive */
assert.ok(
  !/\balter table\s+public\.dos_relationship_scores/i.test(migrationCode)
    && !/\bupdate\s+public\.dos_relationship_scores/i.test(migrationCode)
    && !/\bdelete\s+from\s+public\.dos_relationship_scores/i.test(migrationCode)
    && !/\bdrop\s+table[^;]*dos_relationship_scores/i.test(migrationCode),
  "the migration never writes, nulls or drops the legacy machine assignments",
);
assert.ok(
  !/\bdrop\s+table(?!\s+if\s+exists\s+public\.dos_circle_placement)/i.test(migrationCode),
  "the migration drops no pre-existing table",
);
assert.ok(
  !/\balter table\s+public\.missionary_field_people/i.test(migrationCode)
    && !/\balter table\s+public\.dos_circle_overrides/i.test(migrationCode),
  "the migration alters no pre-existing table",
);
assert.ok(
  /create table if not exists public\.dos_circle_placements/.test(migrationCode)
    && /create table if not exists public\.dos_circle_placement_batches/.test(migrationCode),
  "both new tables are created idempotently",
);

/* ------------------------------------------------- effective-dated history */
assert.ok(
  /effective_from timestamptz not null/.test(migrationCode) && /effective_to timestamptz/.test(migrationCode),
  "placement is effective-dated",
);
assert.ok(
  /create unique index if not exists dos_circle_placements_current_unique[\s\S]*?where effective_to is null/.test(migrationCode),
  "exactly one current row per person per workspace",
);
assert.ok(
  /superseded_by uuid references public\.dos_circle_placements/.test(migrationCode),
  "a closed row points at the row that replaced it, so a move is traceable",
);
assert.ok(
  /update public\.dos_circle_placements\s+set effective_to = v_now/.test(migrationCode),
  "a change closes the previous row rather than overwriting it, which is what preserves history",
);
assert.ok(
  !/delete from public\.dos_circle_placements/i.test(migrationCode),
  "nothing in the write path deletes a placement row",
);

/* --------------------------------------------------------- the three states */
assert.ok(
  /check \(placement in \('inner_3', 'next_9', 'next_58', 'next_50', 'reviewed_not_placed'\)\)/.test(migrationCode),
  "reviewed-not-placed is a stored value, distinct from the four tiers",
);
assert.ok(
  /if v_to <> 'not_reviewed' then/.test(migrationCode),
  "returning someone to not-reviewed leaves no current row, which is the absence state",
);
assert.ok(
  /and placement <> 'reviewed_not_placed'/.test(migrationCode),
  "a reviewed-but-unplaced person never consumes circle capacity",
);

/* ------------------------------------------- cumulative capacity, in the DB */
assert.ok(
  /'my_3'[\s\S]*?3 as capacity[\s\S]*?'my_12'[\s\S]*?12[\s\S]*?'my_70'[\s\S]*?70[\s\S]*?'my_120'[\s\S]*?120/.test(migrationCode),
  "capacity is 3 / 12 / 70 / 120 on the cumulative view",
);
assert.ok(
  /inner_3 \+ next_9 as used|'My 12', 12, inner_3 \+ next_9/.test(migrationCode),
  "My 12 counts the My 3 people inside it",
);
assert.ok(
  /circle_placement_over_capacity/.test(migrationCode),
  "going over capacity raises rather than truncating or warning",
);

/* --------------------------------------------------- concurrency and atomicity */
assert.ok(
  /perform pg_advisory_xact_lock\(hashtext\('dos_circle_placements:' \|\| v_workspace_id::text\)\)/.test(migrationCode),
  "the workspace is serialized, so two saves cannot both pass a capacity check",
);
const lockIndex = migrationCode.indexOf("pg_advisory_xact_lock");
const capacityIndex = migrationCode.indexOf("dos_circle_capacity_conflicts(coalesce(v_counts");
assert.ok(lockIndex > -1 && capacityIndex > lockIndex, "capacity is checked after the lock is held, never before");
assert.ok(
  /raise exception/.test(migrationCode),
  "a rule failure raises, which rolls the whole batch back",
);

/* -------------------------------------------------------------- idempotency */
assert.ok(
  /create unique index if not exists dos_circle_placement_batches_operation_key_unique/.test(migrationCode),
  "one batch per operation key per workspace",
);
assert.ok(
  /'status', 'already_applied'/.test(migrationCode),
  "a repeated operation key reports the original batch instead of applying twice",
);
const idempotencyIndex = migrationCode.indexOf("already_applied");
assert.ok(idempotencyIndex > lockIndex, "the idempotency check happens inside the lock");

/* ------------------------------------------------- workspace scope and access */
assert.ok(
  /circle_placement_person_not_in_workspace/.test(migrationCode)
    && /person\.workspace_id = v_workspace_id/.test(migrationCode),
  "the transaction refuses a person from another workspace, whatever the caller claims",
);
assert.ok(
  /alter table public\.dos_circle_placements enable row level security/.test(migrationCode)
    && /alter table public\.dos_circle_placement_batches enable row level security/.test(migrationCode),
  "row level security is on for both new tables",
);
assert.ok(
  /create policy "Admins can manage DOS circle placements"/.test(migrationCode),
  "the placement table carries the same operator policy as the rest of DOS",
);
assert.ok(
  route.includes("requireDosWorkspaceRouteAccess") && route.includes("canWriteDosActivity"),
  "the route requires workspace access and write capability",
);
assert.ok(
  /operationKey\.length < 8/.test(route),
  "the route refuses a save with no usable operation key",
);
assert.ok(
  route.includes("isUuid(change.personId)") && route.includes("targets.has(change.to)"),
  "the route validates every person id and target before the transaction sees them",
);

/* ------------------------------------------ a refusal never loses the operator's work */
assert.ok(
  /over_capacity/.test(code) && /Move someone further out, then save again\./.test(store),
  "an over-capacity refusal names the circle and says what to do",
);
assert.ok(
  /status: "rejected"/.test(code),
  "a refusal is a value the surface can render, not a thrown error it must guess at",
);
assert.ok(
  route.includes('result.code === "over_capacity" ? 409 : 400'),
  "a resolvable rule failure is a 409, so the client knows it can retry after fixing it",
);

/* --------------------------------- confirmed placement is the only trusted source */
assert.ok(
  !/dos_relationship_scores|circle_assignment/.test(code),
  "the placement store never reads the machine assignments",
);
assert.ok(
  /\.is\("effective_to", null\)/.test(code),
  "current placement means the row that has not been closed",
);

const client = read("app/dos/app/DosMvpAppClient.tsx");
assert.ok(
  client.includes("const confirmedPlacementByPersonId = useMemo(")
    && client.includes("(data.circlePlacements ?? []).forEach((row) => {"),
  "the app reads confirmed placement from its own field, not from the score engine",
);
assert.ok(
  /const counts = tierCounts\(\s*searched\(allCirclePeople\)\.map\(\(item\) => placementForDecision\(confirmedPlacementByPersonId/.test(client),
  "the People rail counts confirmed placements only",
);
assert.ok(
  !/data\.circles\?\.my3|data\.circles\?\.my12|data\.circles\?\.my70|data\.circles\?\.my120/.test(client),
  "no circle list is built from the machine score data any more",
);

/* ----------------------------------------------------------------- rollback */
assert.ok(
  /drop function if exists public\.dos_confirm_circle_placements/.test(rollback)
    && /drop table if exists public\.dos_circle_placements/.test(rollback)
    && /drop table if exists public\.dos_circle_placement_batches/.test(rollback),
  "the rollback removes everything the migration created",
);
assert.ok(
  !/dos_relationship_scores|missionary_field_people|dos_circle_overrides/.test(
    rollback.replace(/^\s*--.*$/gm, ""),
  ),
  "the rollback touches nothing that existed before the migration",
);

/* ------------------------------- one canonical source, and only one writer */
const overrideRoute = read("app/api/dos/circles/override/route.ts");
const overrideRouteCode = overrideRoute.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
assert.ok(
  /status: 410/.test(overrideRouteCode) && !/updateCircleOverride|dos_circle_overrides|createSupabaseAdminClient/.test(overrideRouteCode),
  "the old override route is retired and writes nothing",
);
assert.ok(
  !/fetch\("\/api\/dos\/circles\/override"/.test(client),
  "no client code calls the retired override route",
);
assert.ok(
  (client.match(/\/api\/dos\/app\/circle-placements/g) ?? []).length >= 1,
  "the app writes placement through the transactional route",
);
assert.ok(
  !/updateCircleOverride/.test(client),
  "the app does not reach the override writer by any other name",
);

/* Founder decision 6, enforced at the one switch that governs it. */
assert.ok(
  /const automatedCirclePlacementSuggestionsEnabled = false;/.test(client),
  "automated placement suggestions are off for production release one",
);
assert.ok(
  /automatedCirclePlacementSuggestionsEnabled\s*\n?\s*\?\s*computeCircleSuggestion|automatedCirclePlacementSuggestionsEnabled$/m.test(client)
    || client.includes("automatedCirclePlacementSuggestionsEnabled\n    ? computeCircleSuggestion({"),
  "the suggestion engine is gated behind that switch rather than called directly",
);

/* The machine score never names anybody's circle. */
assert.ok(
  !/circleScore\?\.circle \?\? "field"/.test(client),
  "a Person's circle is no longer read from the machine score",
);
assert.ok(
  /const currentCircleKey: CircleKey = confirmedPlacement && isCircleTier\(confirmedPlacement\)/.test(client),
  "a Person's circle is read from the confirmed placement",
);
assert.ok(
  /confirmedPlacement === reviewedNotPlaced/.test(client) && /"Not reviewed"/.test(client),
  "a Person with no confirmed placement says so rather than showing a circle",
);

console.log("DOS circle placement (USA-247) regression passed.");
