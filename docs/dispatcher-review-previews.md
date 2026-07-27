# Dispatcher Review Previews

`scripts/dispatcher-review-preview.mjs` is the review-preview gate for dispatcher-created branches. It is intentionally narrow: it only permits non-force pushes of approved review branches to `origin` so Vercel can build protected previews before founder approval.

## Allowed Branches

Default allowlist:

```text
^dispatcher/usa-[0-9]+-(codex|claude)-[0-9]{14}$
```

The script rejects `main`, `master`, `production`, `prod`, `release/*`, `deploy/*`, full refs, unsafe git ref characters, and branch names outside the dispatcher convention.

## Runner Command

```bash
node scripts/dispatcher-review-preview.mjs \
  --branch dispatcher/usa-52-codex-20260721154907 \
  --issue USA-52 \
  --route /admin/operations-center
```

The push is always built as:

```text
git push --porcelain origin refs/heads/<branch>:refs/heads/<branch>
```

No force flag, delete refspec, merge, production deploy, DNS mutation, or production database action is performed.

## Required Runner Environment

```text
VERCEL_TOKEN=
VERCEL_PROJECT_ID=
VERCEL_TEAM_ID=
LINEAR_API_KEY=
```

`VERCEL_TEAM_SLUG` may be used instead of `VERCEL_TEAM_ID` when that is how the project is scoped.

## Controls

```text
DISPATCHER_REVIEW_PUSH_DISABLED=true
DISPATCHER_REVIEW_PUSH_ENABLED=false
DISPATCHER_TEST_MODE=true
DISPATCHER_SINGLE_WORKER_MODE=true
```

Any of these block side effects and report `Preview Blocked` with the exact reason. Single-worker mode can opt in with `DISPATCHER_REVIEW_PUSH_IN_SINGLE_WORKER=true`.

Use `--dry-run` for validation without push, Vercel polling, or Linear posting.

## Completion Behavior

The script only emits `product-preview-ready` after all of these pass:

1. Branch name and git ref validation.
2. Local branch exists and has a diff from `origin/main`, unless `--allow-empty-diff` is set.
3. Non-force push to the same-named remote review branch succeeds.
4. Vercel returns a matching preview deployment for the pushed commit.
5. The exact review route is resolved.
6. An unauthenticated request to the route receives a protection challenge or auth redirect.
7. The clickable preview URL and review instructions are posted to Linear.

All failures are reported as `Preview Blocked`.

