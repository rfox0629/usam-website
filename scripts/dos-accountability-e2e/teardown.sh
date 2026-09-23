#!/usr/bin/env bash
# Stops the throwaway stack and removes its data directory entirely.
set -uo pipefail
ROOT="${USA282_PGROOT:-/var/tmp/usa282-pg}"
PGBIN="${USA282_PGBIN:-/usr/lib/postgresql/16/bin}"
pkill -f "postgrest $ROOT/postgrest.conf" 2>/dev/null
pkill -f "dos-accountability-delete-e2e/rest-proxy.mjs" 2>/dev/null
su pgtest -c "PATH=$PGBIN:\$PATH pg_ctl -D $ROOT/data stop -m immediate" 2>/dev/null
rm -rf "$ROOT"
echo "torn down"
