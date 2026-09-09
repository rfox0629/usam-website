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

## Rollback

One file, `..._rollback.sql`. It drops only what the forward migration created: two functions, two policies, one constraint, two tables.

**Cost of rolling back:** every human confirmation recorded since the migration is destroyed, because it lives only in these two tables. Export first if any confirmation matters:

```sql
copy (select * from public.dos_circle_placements) to stdout with csv header;
copy (select * from public.dos_circle_placement_batches) to stdout with csv header;
```

After the rollback the People counts return to zero confirmed placements, which is the pre-migration state. `dos_relationship_scores` is untouched by the rollback exactly as it was untouched by the migration.

## Proof

45 assertions against a real Postgres 17, in `evidence/placement-proofs.sql`. Every one passes.

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
