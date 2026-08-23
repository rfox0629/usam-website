#!/bin/bash
# USA-189 consolidated layout guard.
#
# Automation source now lives in:
#   /Users/ryanfox/Code/usam-website/tooling/automation
#
# LaunchAgents execute that source checkout directly. Mutable runtime state stays
# outside Git in:
#   /Users/ryanfox/.usam-dispatcher
#
# The old source -> ~/USAM-Automation copy deployment path is intentionally
# retired. Keep this command as a compatibility guard so stale runbooks fail
# closed instead of recreating the obsolete runtime layout.
set -euo pipefail

ROOT="${USAM_AUTOMATION_ROOT:-/Users/ryanfox/Code/usam-website/tooling/automation}"
RUNTIME="${USAM_RUNTIME_ROOT:-/Users/ryanfox/.usam-dispatcher}"

printf '%s\n' "USAM automation now runs directly from:"
printf '  %s\n' "$ROOT"
printf '%s\n' "Runtime state remains outside Git at:"
printf '  %s\n' "$RUNTIME"
printf '\n%s\n' "No files were copied. To validate the canonical source checkout, run:"
printf '  cd %s && npm test\n' "$ROOT"
