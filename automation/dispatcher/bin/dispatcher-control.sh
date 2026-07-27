#!/bin/zsh
set -euo pipefail

ROOT="${DISPATCHER_ROOT:-/Users/ryanfox/USAM-Automation}"
CONTROL_DIR="$ROOT/control"
RUNNER="${2:-global}"

mkdir -p "$CONTROL_DIR"

case "${1:-status}" in
  pause)
    touch "$CONTROL_DIR/$RUNNER.pause"
    echo "paused $RUNNER"
    ;;
  resume)
    rm -f "$CONTROL_DIR/$RUNNER.pause"
    echo "resumed $RUNNER"
    ;;
  status)
    "$ROOT/bin/run-dispatcher.sh" --status
    ;;
  status-unsafe)
    "$ROOT/bin/run-dispatcher.sh" --status --unsafe-status
    ;;
  once)
    "$ROOT/bin/run-dispatcher.sh" --once
    ;;
  *)
    echo "usage: dispatcher-control.sh [pause|resume|status|status-unsafe|once] [global|codex|claude]" >&2
    exit 64
    ;;
esac
