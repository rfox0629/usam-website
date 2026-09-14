# Rollback and reference scripts

Scripts here are **never** executed automatically. They are kept out of
`supabase/migrations` because the Supabase CLI and the Supabase GitHub
integration treat every `.sql` file in that directory as a forward migration,
so a rollback stored there would drop objects on the next deploy.

| Script | Reverses | Production version |
|---|---|---|
| `20260914183331_usa_275_discipleship_connections_rollback.sql` | `supabase/migrations/20260914183331_usa_275_discipleship_connections.sql` (USA-275) | `20260914183331` |

Rules:

- Run a rollback by hand only, with founder authorization, after taking the
  snapshot described in its header.
- After running one, remove the matching row from
  `supabase_migrations.schema_migrations` so the ledger reflects the database.
- Older rollback files (USA-246, USA-247, person feedback import, gathering
  Journey columns) still sit in `supabase/migrations`. Moving them is part of the
  broader migration-history reconciliation
  (`docs/dos-ui-refresh/usa-275/migration-history-audit.md`), not this change.
