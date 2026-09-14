-- Rollback for 20260913180000_usa_275_discipleship_connections.sql.
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
