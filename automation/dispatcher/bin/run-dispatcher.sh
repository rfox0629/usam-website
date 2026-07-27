#!/bin/zsh
set -euo pipefail

ROOT="${DISPATCHER_ROOT:-/Users/ryanfox/USAM-Automation}"
ENV_FILE="$ROOT/.env"
CONFIG_FILE="${DISPATCHER_CONFIG:-$ROOT/config/dispatcher.config.json}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

export PATH="/usr/local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/bin:/bin:/usr/sbin:/sbin:/Applications/ChatGPT.app/Contents/Resources:$PATH"
export TERM="${TERM:-xterm-256color}"
export NO_COLOR="${NO_COLOR:-1}"
export DISPATCHER_ROOT="$ROOT"
export DISPATCHER_CONFIG="$CONFIG_FILE"

cd "$ROOT"
exec node "$ROOT/src/dispatcher.mjs" "$@"
