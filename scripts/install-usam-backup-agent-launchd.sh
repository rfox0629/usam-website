#!/bin/bash
# One-time installer for the USA-91 local Mac Mini backup agent.
# After this runs, the Operations Dashboard can pair with the agent and perform
# Keychain-backed setup without routine Terminal use.

set -euo pipefail

AGENT_HOME="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AGENT_SCRIPT="${AGENT_HOME}/scripts/usam-backup-agent.mjs"
NODE_BIN="${NODE_BIN:-$(command -v node)}"
LABEL="com.usam.backup-agent"
PLIST="${HOME}/Library/LaunchAgents/${LABEL}.plist"
LOG_DIR="${HOME}/USAM-Backups/logs"

if [[ -z "${NODE_BIN}" || ! -x "${NODE_BIN}" ]]; then
  printf 'Node.js was not found. Install Node.js first.\n' >&2
  exit 1
fi

if [[ ! -f "${AGENT_SCRIPT}" ]]; then
  printf 'Backup agent script not found: %s\n' "${AGENT_SCRIPT}" >&2
  exit 1
fi

mkdir -p "${HOME}/Library/LaunchAgents" "${LOG_DIR}"

cat > "${PLIST}" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${NODE_BIN}</string>
    <string>${AGENT_SCRIPT}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${LOG_DIR}/backup-agent-stdout.log</string>
  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/backup-agent-stderr.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>USAM_AUTOMATION_ROOT</key>
    <string>${HOME}/USAM-Automation</string>
    <key>USAM_BACKUP_AGENT_PORT</key>
    <string>47691</string>
  </dict>
</dict>
</plist>
PLIST

chmod 600 "${PLIST}"
launchctl bootout "gui/$(id -u)" "${PLIST}" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "${PLIST}"
launchctl kickstart -k "gui/$(id -u)/${LABEL}"

printf 'USAM backup agent installed and started.\n'
printf 'Dashboard local agent URL: http://127.0.0.1:47691\n'
