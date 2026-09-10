# Circle placement — migration, production impact, rollback

Companion to [`circle-reporting-contract.md`](./circle-reporting-contract.md). Read that first for what the data means.

**Status: not applied.** The migration has been written and proven against a local Postgres 17. It has not been run against production, no production override exists, and nothing here is deployed.

## Files

| | |
|---|---|
| Forward | `supabase/migrations/20260909180000_usa_247_circle_placements.sql` |
| Rollback | `supabase/migrations/20260909180000_usa_247_circle_placements_rollback.sql` |
| Proofs | `docs/dos-ui-refresh/usa-247/evidence/placement-proofs.sql` |
| Guard | `scripts/dos-circle-placement-regression.mjs` |

## Canonical source: why not the existing overrides table

Founder decision 1 approved "the existing workspace-scoped, effective-dated overrides table". **`dos_circle_overrides` is workspace-scoped, but it is not effective-dated**, and three of its properties make it unable to carry the approved contract. This was a read-only comparison against production.

### The existing table, as it actually is

| | `dos_circle_overrides` |
|---|---|
| Rows today | 0 |
| Key | `UNIQUE (workspace_id, person_id)` — one row per person, forever |
| History | none. An `updated_at` trigger overwrites in place |
| Removal | `updateCircleOverride` with `locked: false` runs a hard `DELETE` |
| Value type | enum `three, twelve, seventy, field` — cumulative circle names, not the exclusive tiers |
| States | two, expressed as a `locked` boolean; no reviewed-but-not-placed |
| Capacity | none |
| Concurrency | none; a plain upsert |
| Idempotency | none |
| Writers | `updateCircleOverride` in `src/lib/dos/circle-scoring.ts`, reached from `PATCH /api/dos/circles/override` |
| Readers | `loadCircleData` and `recalculateCircleScores`, which read `locked` rows to pin a machine score |
| RLS | on, admin/editor by email, not workspace-scoped |

### Why it cannot safely satisfy the contract

1. **It cannot hold history.** One row per person, overwritten in place. "Moving someone between circles preserves history" and "removing someone preserves history" are unsatisfiable without changing the unique key, which is not an additive change to a table other code writes.
2. **Removal destroys the record.** Unlocking deletes the row. The approved model requires a removal to leave the previous placement readable.
3. **It has no third state.** `locked` is a boolean. "Reviewed, not currently placed" has nowhere to live, and adding it would overload a flag other code already reads as "pin this machine score".
4. **Its values are the wrong vocabulary.** The enum stores cumulative circle names. Capacity is enforced on cumulative views computed from exclusive tiers, so storing the view is storing the derived thing.
5. **Its whole purpose is the opposite one.** `locked` exists to *pin a machine score*, and both readers use it that way. Reusing it as the record of human intent would mean the same column means "the machine's answer, held still" in one code path and "the missionary's decision" in another.

Retrofitting all five is not an additive migration. It is a rewrite of a table that two live functions read, with a data model change to its primary key.

### Recommendation

**Option 2: approve `dos_circle_placements` as the replacement, and fully deprecate the override pathway.** That deprecation is done in this branch, not deferred.

### What the old table now represents

**Approved and deprecated as of 2026-09-10.** `dos_circle_overrides` is no longer a source of circle placement in any sense:

- No People, Person, Reports, alignment or circle surface reads it.
- No user-facing route writes it. `PATCH /api/dos/circles/override` answers **410 Gone** and imports no database client.
- The client function behind it is inert and must stay inert.
- `scripts/dos-circle-placement-regression.mjs` fails if any of that regresses.

**Its one remaining use is legacy cleanup during Person merges.** `dos_merge_dos_person_records` (migration `20260806111227`) still moves and counts its rows so a merge of two people does not leave an orphan. **That use carries no current circle meaning.** The rows it moves are historical residue of a retired pathway; the merge function is tidying storage, not making or preserving a placement decision. Nothing reads the result as a circle. The table holds zero rows today, so in practice the merge function moves nothing.

**Removal is scheduled separately**, after the new system has been stable in production and at least one missionary has confirmed placements. That cleanup migration drops `dos_circle_overrides`, removes the `locked`-row branches from `circle-scoring.ts`, and removes the merge function's references to it. It is deliberately not part of this release, whose whole value is that it changes nothing existing.

### What the old table represented before

**Nothing, going forward.** It holds zero rows, no code writes it, and no product surface offers to. It stays in the schema only so the person-merge function (`20260806111227_dos_person_merge_records.sql`) keeps working unchanged, and so this pull request touches nothing it does not have to.

### How every read and write resolves to one source

| | Before | Now |
|---|---|---|
| Write | `PATCH /api/dos/circles/override` → upsert or delete | `POST /api/dos/app/circle-placements` → `dos_confirm_circle_placements` only |
| Read, People counts | machine scores | `data.circlePlacements` |
| Read, circle lists | machine scores | `data.circlePlacements` |
| Read, a Person's circle | `circleScore?.circle ?? "field"` | the confirmed placement, or "Not reviewed" |

### How stale code is prevented from reviving machine placement

- `PATCH /api/dos/circles/override` now answers **410 Gone** and imports no database client. A stale client fails loudly instead of writing where nothing reads.
- The automated Possible-placement suggestion on the Person record is behind one named switch, `automatedCirclePlacementSuggestionsEnabled = false`. Turning it on is a product decision, not a tidy-up.
- `scripts/dos-circle-placement-regression.mjs` fails if any client code calls the retired route, if the switch is flipped, or if a Person's circle is read from the score again.

### Future cleanup migration

**Yes, one, and it is not urgent.** Once a missionary has confirmed placements and the reporting evidence layer exists, a later migration should drop `dos_circle_overrides` and the `locked`-row branches in `circle-scoring.ts`. It is deliberately not in this pull request: the table is empty and unread, so dropping it now would add schema risk to a release whose whole point is that it changes nothing existing.

## Reconciling the audit counts

The earlier audit said **73**; this work said **121**. Both are right and they count different scopes. There is no third number hiding.

| | Count |
|---|---|
| Unique people, Ryan's workspace | 73 |
| Machine rows, Ryan's workspace | 73 |
| Machine rows, all workspaces (2 of them) | 121 |
| Unique people, all workspaces | 121 |
| Total historical placement rows | 0 |
| Current machine rows | 121 (73 of them Ryan's) |
| Confirmed human rows | 0 |
| Legacy override rows | 0 |

`dos_relationship_scores` holds exactly one row per person and keeps no history, so rows and people are the same number at every scope. Every one of the 121 is `assignment_source = 'automatic'`; there is not a single human-confirmed placement anywhere in production.

Ryan's 73 split `three=3, twelve=9, seventy=49, field=12`. Of those 73 people, **34 are active and primary**; the other 39 are archived or household-only, which is why the People list shows far fewer than 73.

## What it adds

Two tables and two functions. Nothing else.

- **`dos_circle_placements`** — one row per placement per person, workspace-scoped, effective-dated. A unique partial index on `(workspace_id, person_id) where effective_to is null` guarantees exactly one current row.
- **`dos_circle_placement_batches`** — one row per confirmed review-and-save, unique on `(workspace_id, operation_key)`.
- **`dos_circle_capacity_conflicts(jsonb)`** — the cumulative capacity rule, in one place.
- **`dos_confirm_circle_placements(jsonb)`** — the only supported write path.

Row level security is enabled on both tables with the same operator policy the rest of DOS uses. The application scopes every call to a workspace the caller has been granted, and the transaction independently refuses any person who does not belong to that workspace.

## What it does not touch

Verified by assertion, not by intention. The regression fails if any of this changes.

- **`dos_relationship_scores`** keeps all 121 machine rows exactly as they are. The migration contains no `update`, `delete`, `alter` or `drop` against it. Nothing in the application reads it as placement any more.
- **`dos_circle_overrides`** is left in place, unchanged, still empty.
- **`missionary_field_people`** is unchanged.

No backfill runs. There is nothing to backfill: confirmed placement starts empty, which is the honest state, because no missionary has confirmed anyone.

## Production impact when applied

| | |
|---|---|
| Rows written by the migration | 0 |
| Rows modified | 0 |
| Tables altered | 0 |
| Locks taken | brief, on two tables that do not yet exist |
| Expected duration | under a second |

**Visible change the moment it deploys:** the People rail counts and the circle lists switch from machine assignments to confirmed placements, so every circle reads **0** until someone is confirmed. That is the intended consequence of founder decision 2 and it is not data loss. The machine values remain in the database and remain visible through the existing scoring surfaces.

The application tolerates a deployment that is ahead of its database: if the placement table is unreadable, DOS reports zero confirmed placements rather than failing, and never falls back to the machine assignments.

## Deployment order

**Migration first, code second. Always.** There must be no window in which deployed code expects a table that does not exist.

1. **Apply the migration to production.** It writes no rows and modifies none, so it is safe against the currently deployed code, which does not know these tables exist.
2. **Verify the objects exist.**
   ```sql
   select count(*) from public.dos_circle_placements;
   select count(*) from public.dos_circle_placement_batches;
   select public.dos_circle_capacity_conflicts('{"inner_3":4}'::jsonb);
   ```
   The first two must return 0. The third must return one conflict naming `my_3`.
3. **Merge and deploy the code.**
4. **Confirm the deployment is READY**, then check that People renders and every circle reads 0.

Between steps 1 and 3 production is running old code against a database with two extra empty tables it never queries. That is inert. The reverse order is what must never happen.

**Belt and braces for the gap:** even if step 3 somehow preceded step 1, the reader tolerates it. `loadConfirmedPlacementsSafely` catches an unreadable placement table and reports zero confirmed placements rather than failing the page, and it never falls back to the machine assignments. A *write* attempted in that window fails cleanly with nothing saved and the operator's changes kept on screen. So the ordering rule is about correctness, not about avoiding an outage.

## Rollback

One file, `..._rollback.sql`. It drops only what the forward migration created: two functions, two policies, one constraint, two tables.

### Before any human confirmation is saved

**Rollback destroys zero user-created data**, and this is checkable rather than assumed. Both tables are created empty and the migration writes no rows, so until a missionary presses Confirm the only thing a rollback removes is empty structure. Verify immediately before dropping:

```sql
select
  (select count(*) from public.dos_circle_placements) as placements,
  (select count(*) from public.dos_circle_placement_batches) as batches;
```

**Both zero: roll back freely.** Nothing a person created is lost. This is the state on the day the migration lands.

### After confirmations begin

**Either number above non-zero: export first. The rollback is destructive from that moment on**, because a confirmation exists nowhere else. `dos_relationship_scores` is not a backup of it; those are machine guesses, and by decision 2 they are not even recommendation inputs.

**Cost of rolling back:** every human confirmation recorded since the migration is destroyed, because it lives only in these two tables. Export first if any confirmation matters:

```sql
copy (select * from public.dos_circle_placements) to stdout with csv header;
copy (select * from public.dos_circle_placement_batches) to stdout with csv header;
```

After the rollback the People counts return to zero confirmed placements, which is the pre-migration state. `dos_relationship_scores` is untouched by the rollback exactly as it was untouched by the migration.

## Proof

38 assertions against a real Postgres 17, in `evidence/placement-proofs.sql`. Every one passes.

| Founder requirement | Result |
|---|---|
| A fourth person cannot enter My 3 | refused, no row and no batch left behind |
| Twelve cumulative cannot become thirteen | refused; the thirteenth is accepted into My 70 instead |
| Two concurrent saves cannot exceed capacity | ten concurrent saves against a My 3 holding two: one committed, nine refused, My 3 held at three, one batch row |
| Moving preserves history | one current row, the previous placement closed and pointing at its replacement |
| Removing preserves history | no current row, every earlier placement kept |
| Reviewed-not-placed differs from not reviewed | stored value versus absence, distinguishable in one query, and it consumes no capacity |
| Legacy machine values remain intact but untrusted | all rows survive unedited; no confirmed placement is derived from them |
| Private and household-only placement respects access | both can be placed; a person from another workspace is refused by the transaction |
| Reports cannot read unconfirmed placement as fact | the store never queries the score table; the app reads only confirmed rows |
| Failed saves preserve the proposed changes and explain the error | a mixed batch that breaks capacity applies none of itself; the surface keeps the changes and names the full circle |

The concurrency proof, run as ten parallel `psql` processes:

```
succeeded: 1
refused:   9
inner_3 current rows = 3
batches committed = 1
```
