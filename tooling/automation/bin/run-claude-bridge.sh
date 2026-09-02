#!/bin/zsh
set -euo pipefail

ROOT="${USAM_AUTOMATION_ROOT:-/Users/ryanfox/Code/usam-website/tooling/automation}"
export USAM_RUNTIME_ROOT="${USAM_RUNTIME_ROOT:-/Users/ryanfox/.usam-dispatcher}"
REPO_ENV_FILE="$ROOT/.env"
RUNTIME_ENV_FILE="$USAM_RUNTIME_ROOT/.env"

if [[ -f "$REPO_ENV_FILE" ]]; then
  set -a
  source "$REPO_ENV_FILE"
  set +a
fi
if [[ -f "$RUNTIME_ENV_FILE" ]]; then
  set -a
  source "$RUNTIME_ENV_FILE"
  set +a
fi

export PATH="/Users/ryanfox/.local/bin:/usr/local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/bin:/bin:/usr/sbin:/sbin:/Applications/ChatGPT.app/Contents/Resources:$PATH"
export TERM="${TERM:-xterm-256color}"
export NO_COLOR="${NO_COLOR:-1}"

mkdir -p "$USAM_RUNTIME_ROOT/logs" "$USAM_RUNTIME_ROOT/state" "$USAM_RUNTIME_ROOT/control"
cd "$ROOT"

args=(
  claude-bridge-daemon
  --live
  --finish-state "${CLAUDE_BRIDGE_FINISH_STATE:-Founder Review}"
  --poll-interval-ms "${CLAUDE_BRIDGE_POLL_INTERVAL_MS:-60000}"
)

# Production uses the bridge's 30-minute default. Short validation jobs must pass
# an explicit timeout instead of inheriting a production LaunchAgent default.
if [[ -n "${CLAUDE_BRIDGE_TIMEOUT_MS:-}" ]]; then
  args+=(--claude-timeout-ms "$CLAUDE_BRIDGE_TIMEOUT_MS")
fi

exec node "$ROOT/src/replacement/cli.mjs" "${args[@]}" "$@"
