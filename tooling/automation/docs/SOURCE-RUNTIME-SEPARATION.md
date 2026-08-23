# Source / Runtime Layout — USAM Automation

USA-189 consolidates USAM product source and local automation source into one
visible checkout:

`/Users/ryanfox/Code/usam-website`

Automation source lives in an isolated tooling directory:

`/Users/ryanfox/Code/usam-website/tooling/automation`

The live dispatcher and Claude bridge LaunchAgents execute that directory
directly. There is no source-to-runtime copy step.

Runtime state remains outside Git:

`/Users/ryanfox/.usam-dispatcher`

That runtime root owns logs, locks, cooldowns, manifests, handoffs, temporary
files, evidence, publications, and live credentials. None of those paths belong
inside the website repository.

## Active Paths

| Role | Path |
|---|---|
| Canonical source checkout | `/Users/ryanfox/Code/usam-website` |
| Automation source | `/Users/ryanfox/Code/usam-website/tooling/automation` |
| Runtime state | `/Users/ryanfox/.usam-dispatcher` |
| Issue worktrees | `/Users/ryanfox/USAM-Worktrees` |
| Release worktrees | `/Users/ryanfox/USAM-Releases` |

## Retired Paths

| Path | Status |
|---|---|
| `/Users/ryanfox/USAM-Automation` | Retired old mixed runtime/source layout |
| `/Users/ryanfox/Code/usam-automation` | Retired separate automation source checkout after live cutover validation |

Do not restart services from either retired path. Do not recreate them as a
runtime target.

## LaunchAgents

Installed LaunchAgents live in:

`/Users/ryanfox/Library/LaunchAgents`

Source plist templates live in:

`/Users/ryanfox/Code/usam-website/tooling/automation/launchd`

The dispatcher and Claude bridge plists must point at the `tooling/automation`
wrappers, while stdout/stderr stay under `/Users/ryanfox/.usam-dispatcher/logs`.

## Validation

Run source validation from the automation tooling directory:

```sh
cd /Users/ryanfox/Code/usam-website/tooling/automation
npm test
```

Run live validation with launchd evidence:

```sh
launchctl print gui/$(id -u)/com.usam.dispatcher
launchctl print gui/$(id -u)/com.usam.claude-bridge
```

The reported command, working directory, and `USAM_AUTOMATION_ROOT` must all
resolve to `/Users/ryanfox/Code/usam-website/tooling/automation`.

## Guardrails

- Keep `.env` and all live credentials under `/Users/ryanfox/.usam-dispatcher`
  or the macOS Keychain.
- Keep logs, locks, manifests, cooldowns, screenshots, and temp files out of Git.
- Do not use `/Users/ryanfox/USAM-Automation` as a fallback runtime.
- Do not use `/Users/ryanfox/Code/usam-automation` after the live cutover passes.
- Preserve old-folder evidence before deleting any obsolete source checkout.
