# USA-83 Repository Layout Migration

Target roots:

- Automation source repo: `/Users/ryanfox/Code/usam-website/tooling/automation`
- Canonical website repo: `/Users/ryanfox/Code/usam-website`
- Issue worktrees: `/Users/ryanfox/USAM-Worktrees`
- Release worktrees: `/Users/ryanfox/USAM-Releases`
- Runtime state: `/Users/ryanfox/.usam-dispatcher`

## Safe Migration Rules

- Pause dispatcher pickup before copying state.
- Copy first, verify second, delete nothing during the migration window.
- Do not move active website worktrees. Existing lock records may continue to point at old worktree paths until those cycles finish.
- Preserve lock, completion, publication, screenshot, and handoff history exactly.
- Install or reload launchd only after the new automation source repo and runtime-state directories exist.

## Operator Sequence

1. Pause pickup:

```sh
mkdir -p /Users/ryanfox/USAM-Automation/control /Users/ryanfox/.usam-dispatcher/control
date -u +"%Y-%m-%dT%H:%M:%SZ" > /Users/ryanfox/USAM-Automation/control/global.pause
date -u +"%Y-%m-%dT%H:%M:%SZ" > /Users/ryanfox/.usam-dispatcher/control/global.pause
```

2. Create target roots:

```sh
mkdir -p /Users/ryanfox/Code /Users/ryanfox/USAM-Worktrees /Users/ryanfox/USAM-Releases /Users/ryanfox/.usam-dispatcher
```

3. Copy automation source into the new source repo location without copying runtime history into the repo:

```sh
rsync -a \
  --exclude '.env' \
  --exclude 'node_modules/' \
  --exclude 'locks/' \
  --exclude 'logs/' \
  --exclude 'state/' \
  --exclude 'tmp/' \
  --exclude 'worktrees/' \
  /Users/ryanfox/USAM-Automation/ /Users/ryanfox/Code/usam-website/tooling/automation/
```

4. Copy runtime history into runtime state without deleting the originals:

```sh
mkdir -p /Users/ryanfox/.usam-dispatcher/{locks,logs,state,tmp,handoffs,publications,manifests/completions}
rsync -a /Users/ryanfox/USAM-Automation/locks/ /Users/ryanfox/.usam-dispatcher/locks/
rsync -a /Users/ryanfox/USAM-Automation/logs/ /Users/ryanfox/.usam-dispatcher/logs/
rsync -a /Users/ryanfox/USAM-Automation/state/ /Users/ryanfox/.usam-dispatcher/state/
rsync -a /Users/ryanfox/USAM-Automation/tmp/ /Users/ryanfox/.usam-dispatcher/tmp/
rsync -a /Users/ryanfox/USAM-Automation/state/handoffs/ /Users/ryanfox/.usam-dispatcher/handoffs/
rsync -a /Users/ryanfox/USAM-Automation/state/publications/ /Users/ryanfox/.usam-dispatcher/publications/
rsync -a /Users/ryanfox/USAM-Automation/state/completions/ /Users/ryanfox/.usam-dispatcher/manifests/completions/
```

5. Initialize the automation source Git repository and remote backup only after reviewing `git status` in `/Users/ryanfox/Code/usam-website/tooling/automation`. Push only with explicit founder authorization.

6. Reload the LaunchAgent from `/Users/ryanfox/Code/usam-website/tooling/automation/launchd/com.usam.dispatcher.plist` after verifying:

```sh
cd /Users/ryanfox/Code/usam-website/tooling/automation
npm test
USAM_AUTOMATION_ROOT=/Users/ryanfox/Code/usam-website/tooling/automation /Users/ryanfox/Code/usam-website/tooling/automation/bin/control.sh status
```

7. Resume pickup only after confirming the active locks and USA-82 publication history are present under `/Users/ryanfox/.usam-dispatcher`.
