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

export PATH="/usr/local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/bin:/bin:/usr/sbin:/sbin:/Applications/ChatGPT.app/Contents/Resources:$PATH"
export TERM="${TERM:-xterm-256color}"
export NO_COLOR="${NO_COLOR:-1}"

mkdir -p "$USAM_RUNTIME_ROOT/logs"
cd "$ROOT"
exec node "$ROOT/src/dispatcher.mjs" "$@"
