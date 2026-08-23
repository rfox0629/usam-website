#!/bin/zsh
set -euo pipefail

ROOT="${USAM_AUTOMATION_ROOT:-/Users/ryanfox/Code/usam-website/tooling/automation}"
RUNTIME_ROOT="${USAM_RUNTIME_ROOT:-/Users/ryanfox/.usam-dispatcher}"
CONTROL="$RUNTIME_ROOT/control"
mkdir -p "$CONTROL"

usage() {
  cat <<'USAGE'
Usage:
  control.sh status
  control.sh health
  control.sh alerts
  control.sh inspect-queue
  control.sh pause global|codex|claude
  control.sh resume global|codex|claude
  control.sh once
  control.sh claude-bridge-status
  control.sh claude-bridge-restart
  control.sh claude-bridge-disable
  control.sh claude-bridge-enable
USAGE
}

target_file() {
  case "$1" in
    global) printf "%s/global.pause" "$CONTROL" ;;
    codex) printf "%s/codex.pause" "$CONTROL" ;;
    claude) printf "%s/claude.pause" "$CONTROL" ;;
    *) return 1 ;;
  esac
}

cmd="${1:-}"
target="${2:-}"
GUI="gui/$(id -u)"
BRIDGE_AGENT="com.usam.claude-bridge"
BRIDGE_PLIST="$HOME/Library/LaunchAgents/${BRIDGE_AGENT}.plist"
BRIDGE_PAUSE="$CONTROL/claude-bridge.pause"

case "$cmd" in
  status)
    "$ROOT/bin/run-dispatcher.sh" --status
    ;;
  health)
    if [[ -f "$RUNTIME_ROOT/state/health.json" ]]; then
      cat "$RUNTIME_ROOT/state/health.json"
    else
      "$ROOT/bin/run-dispatcher.sh" --status
    fi
    ;;
  alerts)
    if [[ -f "$RUNTIME_ROOT/state/alerts.json" ]]; then
      cat "$RUNTIME_ROOT/state/alerts.json"
    else
      printf '{"at":null,"alerts":[]}\n'
    fi
    ;;
  inspect-queue)
    "$ROOT/bin/run-dispatcher.sh" --inspect-queue
    ;;
  pause)
    file="$(target_file "$target")" || { usage; exit 2; }
    date -u +"%Y-%m-%dT%H:%M:%SZ" > "$file"
    printf "paused %s\n" "$target"
    ;;
  resume)
    file="$(target_file "$target")" || { usage; exit 2; }
    if [[ -f "$file" ]]; then
      rm "$file"
    fi
    printf "resumed %s\n" "$target"
    ;;
  once)
    "$ROOT/bin/run-dispatcher.sh" --once
    ;;
  claude-bridge-status)
    printf 'launchd:\n'
    launchctl print "$GUI/$BRIDGE_AGENT" 2>/dev/null | sed -n '1,80p' || printf '  not loaded\n'
    printf '\nstate:\n'
    if [[ -f "$RUNTIME_ROOT/state/claude-bridge.json" ]]; then
      cat "$RUNTIME_ROOT/state/claude-bridge.json"
    else
      printf '{"status":"unknown","reason":"state file missing"}\n'
    fi
    ;;
  claude-bridge-restart)
    launchctl bootout "$GUI/$BRIDGE_AGENT" 2>/dev/null || true
    rm -f "$BRIDGE_PAUSE"
    launchctl bootstrap "$GUI" "$BRIDGE_PLIST"
    printf "restarted %s\n" "$BRIDGE_AGENT"
    ;;
  claude-bridge-disable)
    date -u +"%Y-%m-%dT%H:%M:%SZ" > "$BRIDGE_PAUSE"
    launchctl bootout "$GUI/$BRIDGE_AGENT" 2>/dev/null || true
    printf "disabled %s\n" "$BRIDGE_AGENT"
    ;;
  claude-bridge-enable)
    rm -f "$BRIDGE_PAUSE"
    launchctl bootout "$GUI/$BRIDGE_AGENT" 2>/dev/null || true
    launchctl bootstrap "$GUI" "$BRIDGE_PLIST"
    printf "enabled %s\n" "$BRIDGE_AGENT"
    ;;
  *)
    usage
    exit 2
    ;;
esac
