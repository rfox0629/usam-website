#!/usr/bin/env bash
# USA-282 follow-up: stand up a throwaway Postgres + PostgREST so the
# accountability DELETE handlers can be exercised end to end, against the
# repository's own migrations, without touching any real workspace.
#
#   scripts/dos-accountability-e2e/setup.sh
#   npm run test:dos-accountability-e2e
#   scripts/dos-accountability-e2e/teardown.sh
#
# Needs the postgres 16 server binaries (Ubuntu: postgresql-16) and a
# postgrest binary on PATH or at $POSTGREST_BIN.
set -euo pipefail

ROOT="${USA282_PGROOT:-/var/tmp/usa282-pg}"
PGPORT="${USA282_PGPORT:-55432}"
PGRST_PORT="${USA282_PGRST_PORT:-55321}"
PROXY_PORT="${USA282_PROXY_PORT:-55320}"
PGBIN="${USA282_PGBIN:-/usr/lib/postgresql/16/bin}"
POSTGREST_BIN="${POSTGREST_BIN:-$(command -v postgrest || echo /var/tmp/postgrest)}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"

rm -rf "$ROOT"; mkdir -p "$ROOT/data" "$ROOT/log" "$ROOT/run"
id pgtest >/dev/null 2>&1 || useradd -m pgtest
chown -R pgtest "$ROOT"; chmod 755 "$ROOT"

su pgtest -c "PATH=$PGBIN:\$PATH initdb -D $ROOT/data -U postgres --auth=trust" >"$ROOT/log/initdb.log" 2>&1
su pgtest -c "PATH=$PGBIN:\$PATH pg_ctl -D $ROOT/data -l $ROOT/log/server.log -o '-p $PGPORT -k $ROOT/run -c listen_addresses=127.0.0.1' start"
sleep 2

psql -h 127.0.0.1 -p "$PGPORT" -U postgres -q -c "create database usam_test;"
psql -h 127.0.0.1 -p "$PGPORT" -U postgres -d usam_test -q <<'SQL'
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role authenticator noinherit login;
create role supabase_admin superuser login;
grant anon, authenticated, service_role to authenticator;
create schema if not exists auth;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema public;
create extension if not exists "uuid-ossp" with schema public;
-- Supabase's auth helpers, stubbed: the DOS policies call them.
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create or replace function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'service_role') $$;
create or replace function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb) $$;
create table if not exists auth.users (id uuid primary key, email text);
SQL

applied=0; failed=0
for file in "$REPO"/supabase/migrations/*.sql; do
  # Rollback scripts sit beside their migrations and sort after them, so
  # applying every file in order undoes the migration it just applied. They
  # are not part of the schema.
  case "$file" in *_rollback.sql) continue;; esac
  if psql -h 127.0.0.1 -p "$PGPORT" -U postgres -d usam_test -v ON_ERROR_STOP=1 -q -f "$file" >>"$ROOT/log/migrate.log" 2>&1; then
    applied=$((applied+1))
  else
    failed=$((failed+1)); echo "$(basename "$file")" >> "$ROOT/log/migrate-failures.log"
  fi
done
echo "migrations: applied=$applied failed=$failed (see $ROOT/log/migrate-failures.log)"

psql -h 127.0.0.1 -p "$PGPORT" -U postgres -d usam_test -q <<'SQL'
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;
SQL

# The four FK rules this test exists to prove are real. If the schema in this
# cluster does not match the migrations, stop rather than "verify" a fiction.
psql -h 127.0.0.1 -p "$PGPORT" -U postgres -d usam_test -v ON_ERROR_STOP=1 -q <<'SQL'
do $$
declare rule text;
begin
  select confdeltype into rule from pg_constraint c
    join unnest(c.conkey) k(attnum) on true
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
   where c.contype='f' and c.conrelid='dos_accountability_check_ins'::regclass and a.attname='schedule_id';
  if rule is distinct from 'n' then raise exception 'check_ins.schedule_id must be ON DELETE SET NULL, found %', rule; end if;

  select confdeltype into rule from pg_constraint c
    join unnest(c.conkey) k(attnum) on true
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
   where c.contype='f' and c.conrelid='dos_commitment_updates'::regclass and a.attname='commitment_id';
  if rule is distinct from 'c' then raise exception 'commitment_updates.commitment_id must be ON DELETE CASCADE, found %', rule; end if;
end $$;
SQL

psql -h 127.0.0.1 -p "$PGPORT" -U postgres -d usam_test -v ON_ERROR_STOP=1 -q -f "$HERE/seed.sql"

secret="$(head -c 48 /dev/urandom | base64 | tr -d '\n=' | head -c 48)"
printf '%s' "$secret" > "$ROOT/jwt.secret"
cat > "$ROOT/postgrest.conf" <<CONF
db-uri = "postgres://authenticator@127.0.0.1:$PGPORT/usam_test"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "$secret"
server-host = "127.0.0.1"
server-port = $PGRST_PORT
CONF
nohup "$POSTGREST_BIN" "$ROOT/postgrest.conf" > "$ROOT/log/postgrest.log" 2>&1 &
USA282_PGRST_PORT="$PGRST_PORT" PROXY_PORT="$PROXY_PORT" nohup node "$HERE/rest-proxy.mjs" > "$ROOT/log/proxy.log" 2>&1 &
sleep 4

node -e '
const crypto = require("node:crypto");
const fs = require("node:fs");
const root = process.argv[1];
const secret = fs.readFileSync(root + "/jwt.secret", "utf8").trim();
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const header = encode({ alg: "HS256", typ: "JWT" });
const now = Math.floor(Date.now() / 1000);
const body = encode({ role: "service_role", iss: "supabase", iat: now, exp: now + 86400 });
const signature = crypto.createHmac("sha256", secret).update(header + "." + body).digest("base64url");
fs.writeFileSync(root + "/service.jwt", header + "." + body + "." + signature);
' "$ROOT"

echo "ready. run:"
echo "  NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:$PROXY_PORT SUPABASE_SERVICE_ROLE_KEY=\$(cat $ROOT/service.jwt) npm run test:dos-accountability-e2e"
