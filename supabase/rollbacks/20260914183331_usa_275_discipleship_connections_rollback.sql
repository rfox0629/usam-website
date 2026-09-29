-- Rollback for supabase/migrations/20260914183331_usa_275_discipleship_connections.sql
-- (production version 20260914183331, name usa_275_discipleship_connections,
-- applied 2026-09-14 through Supabase MCP apply_migration). The file was first
-- committed as 20260913180000_usa_275_discipleship_connections.sql; its SQL is
-- unchanged, including the header comment that still names the old rollback
-- path.
--
-- This script lives OUTSIDE supabase/migrations on purpose: the Supabase CLI and
-- GitHub integration run every .sql file in that directory as a forward
-- migration. Run it by hand only. If it is ever run, also record the reversal in
-- the ledger so history stays true:
--   delete from supabase_migrations.schema_migrations where version = '20260914183331';
--
-- Run only with founder authorization. Dropping these tables permanently
-- discards every recorded discipleship connection, account connection and
-- identity decision. Take a snapshot first:
--
--   create table public.usa_275_rollback_connections as table public.dos_discipleship_connections;
--   create table public.usa_275_rollback_account_connections as table public.dos_discipleship_account_connections;
--   create table public.usa_275_rollback_identity_matches as table public.dos_discipleship_identity_matches;
--
-- No existing table was altered by the migration, so nothing else needs
-- restoring: People, Discipling selections, Fruit, circles, journeys, notes,
-- accountability and attendance are unaffected either way. The application
-- probes for the tables and falls back to own records only (current
-- Discipling selections) when they are absent, so the code can stay deployed.
--
-- Access granted through account connections ends immediately on rollback.
-- Verified dos_identity_links rows written on acceptance are left in place:
-- they grant nothing on their own (the connected read requires an accepted
-- account connection), and deleting identity rows is out of scope here.

drop function if exists public.dos_discipleship_readable_workspaces(uuid[], integer);
drop trigger if exists dos_discipleship_connections_scope_guard on public.dos_discipleship_connections;
drop function if exists private_dos.dos_discipleship_connection_scope_guard();
drop table if exists public.dos_discipleship_identity_matches;
drop table if exists public.dos_discipleship_account_connections;
drop table if exists public.dos_discipleship_connections;
