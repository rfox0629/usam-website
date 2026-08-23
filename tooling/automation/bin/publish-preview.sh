#!/usr/bin/env bash
set -euo pipefail

ROOT="${USAM_AUTOMATION_ROOT:-/Users/ryanfox/Code/usam-website/tooling/automation}"
export USAM_RUNTIME_ROOT="${USAM_RUNTIME_ROOT:-/Users/ryanfox/.usam-dispatcher}"
export HOME="${HOME:-/Users/ryanfox}"
export PATH="/Users/ryanfox/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"

exec node "$ROOT/scripts/host-publisher.mjs" "$@"
