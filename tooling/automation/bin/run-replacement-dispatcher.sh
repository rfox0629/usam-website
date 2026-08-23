#!/bin/zsh
set -euo pipefail

ROOT="${USAM_AUTOMATION_ROOT:-/Users/ryanfox/Code/usam-website/tooling/automation}"
export USAM_RUNTIME_ROOT="${USAM_RUNTIME_ROOT:-/Users/ryanfox/.usam-dispatcher}"
CONFIG_FILE="${DISPATCHER_CONFIG:-$ROOT/config/dispatcher.config.json}"
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

export HOME="${HOME:-/Users/ryanfox}"
export PATH="/Users/ryanfox/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/opt/homebrew/sbin:/usr/sbin:/sbin:/Applications/ChatGPT.app/Contents/Resources:$PATH"
export TERM="${TERM:-xterm-256color}"
export NO_COLOR="${NO_COLOR:-1}"

mkdir -p "$USAM_RUNTIME_ROOT/logs"
cd "$ROOT"

poll_interval_ms="$(node -e 'const fs=require("fs"); const p=process.argv[1]; const cfg=JSON.parse(fs.readFileSync(p,"utf8")); console.log(Number(cfg.pollIntervalMs || 30000));' "$CONFIG_FILE")"
poll_interval_s="$(( poll_interval_ms / 1000 ))"
if [[ "$poll_interval_s" -lt 1 ]]; then
  poll_interval_s=1
fi

log() {
  printf '{"at":"%s","event":"replacement_entrypoint_%s","root":"%s","config":"%s"}\n' \
    "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$1" "$ROOT" "$CONFIG_FILE"
}

log start

while true; do
  set +e
  node "$ROOT/src/replacement/cli.mjs" launcher --live --config "$CONFIG_FILE"
  code="$?"
  set -e
  if [[ "$code" -ne 0 ]]; then
    printf '{"at":"%s","event":"replacement_entrypoint_fatal","exitStatus":%s,"root":"%s","config":"%s"}\n' \
      "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$code" "$ROOT" "$CONFIG_FILE" >&2
    exit "$code"
  fi
  sleep "$poll_interval_s"
done
