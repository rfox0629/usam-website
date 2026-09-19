# Vercel deployment cleanup audit — 2026-09-19

Team: **Ryan Fox's projects** (`ryan-foxs-projects-9a51a4d5` / `team_rOFmbMUGM3jaGadw3zBU2ejL`)
13 projects, **190 deployments**.

## Nothing has been deleted

The audit is complete; the deletions are **not** done. The Vercel MCP server
connected to this session exposes no deployment-deletion tool — it has
`cancel_deployment` (in-progress builds only) and no `delete_deployment` — and the
environment has no Vercel CLI and no API token. `tooling/vercel-cleanup/cleanup.mjs`
performs the cleanup once you supply a token.

## Retention policy applied

Keep: the deployment each production alias currently resolves to, the previous two
production deployments, and every preview whose branch still has an open PR or still
exists on its remote.
Delete: production builds older than current + 2, previews on merged or deleted
branches, `ERROR`/`BLOCKED` builds, and duplicate builds superseded by a newer build
of the same branch or commit.

## Which deployment serves each production domain

Verified from the Vercel alias API. Every one of these is in the keep set.

| Domain(s) | Project | Serving deployment |
|---|---|---|
| usamissionaries.org, www, new., usamissionaries.com (+www), kitchentablegospel.org (+www), ktgospel.com (+www), discipleshipoperatingsystem.com (+www), missionofreconciliation.org (+www) | usam-website | `dpl_3Zyp8PTUXnaFDxmhdjoY7vVLsztJ` |
| app.usamissionaries.org | usam-dashboard | `dpl_HZvR6vb7pMyhHnnTcVRf41hHwVjj` |
| savestandard.org, www.savestandard.org | save-platform | `dpl_Ev6LsPXCu9TCo1EHEpEtuQWiaG8T` |
| stewardship.capital | stewardship.capital | `dpl_MRoq8bfUCV1p3c8m1DixdiScZyWt` |
| thelords.army | army-website | `dpl_FuaUDwNZoxfc8yMPmV8UB7e9Li66` |
| alignedinsights.tech | alignedinsights-website | `dpl_757eZGBdKGN1ttqRKbCB7156gf6t` |
| autopilotstrategies.com | auto-pilot-strategies | `dpl_HtTo7GZ9dzX2uPb1fRmJ9XA93Pzk` |
| groundwork.autopilotstrategies.com | groundwork | `dpl_5PJBEQydmdwe1oMCQxdAMGrCv4jQ` |
| thestickkids.com, www.thestickkids.com | the-stick-kids | `dpl_ksUWEJTdQQq9mA17LSboh399pcCD` |

`stewardship.capital` and `usamissionaries.org` were additionally fetched live and
returned HTTP 200 from Vercel. The other domains could not be reached from this
container — its network policy answers 403 to CONNECT for them — so the script
re-checks all 23 hostnames before and after it deletes anything.

## Plan by project

| Project | Total | Keep | Delete |
|---|---:|---:|---:|
| army-website | 27 | 6 | 21 |
| usam-dashboard | 23 | 3 | 20 |
| save-platform | 24 | 6 | 18 |
| the-stick-kids | 20 | 3 | 17 |
| alignedinsights-website | 20 | 3 | 17 |
| auto-pilot-strategies | 20 | 4 | 16 |
| stewardship.capital | 14 | 4 | 10 |
| thelordsarmy-website | 15 | 6 | 9 |
| usam-website-usa-65-preview | 4 | 1 | 3 |
| usam-website | 19 | 18 | 1 |
| dos-2.0 | 1 | 0 | 1 |
| groundwork | 2 | 2 | 0 |
| usa-71-claude-20260722183220 | 1 | 1 | 0 |
| **Total** | **190** | **57** | **133** |

Exact IDs are in `deletion-plan.json`.

## Things worth knowing before you run it

- **usam-website is already clean.** It has only three production deployments, so
  none are droppable, and all 16 of its preview branches have open PRs (#1 through
  #163). The single deletion is a superseded build on the branch behind PR #163.
- **dos-2.0 needs a decision.** Its only deployment is an `ERROR` build that never
  served traffic, and the project has no domain. Deleting it leaves the project with
  zero deployments — the project itself, its repo link and its settings are
  untouched. Drop that entry from the plan if you would rather keep the build record.
- **thelordsarmy-website looks redundant.** It deploys the same `theLordsarmy` repo
  as `army-website` but has no custom domain, only `thelordsarmy-website.vercel.app`.
  It is cleaned, not removed — deleting projects was out of scope.
- **Most of the bulk is duplicate republishes of one commit.** army-website has 16
  production builds of SHA `0941a4b`; usam-dashboard has 11 of `c34fac1`;
  save-platform has clusters on `82b2ae7` and `6f8ff93`.
- **Setting a deployment retention policy** (Project → Settings → Deployment
  Retention) will stop this from rebuilding.

## Storage / free-tier question

This cannot be answered from the data available here. Vercel does not expose a
"deployment storage used" figure through the REST surface this audit had access to,
and the Hobby plan publishes no deployment-storage quota to compare against — its
documented deployment limits are on deployment *rate* (deploys per day) and
retention, not stored bytes. Check Settings → Usage (or the billing page) for the
authoritative number before and after running the cleanup; if it is a stored-bytes
limit you are hitting, removing 133 of 190 deployments removes roughly 70% of the
stored build artifacts.

## Running it

```sh
export VERCEL_TOKEN=...                      # scoped to "Ryan Fox's projects"
node tooling/vercel-cleanup/cleanup.mjs      # dry run — prints, changes nothing
node tooling/vercel-cleanup/cleanup.mjs --apply
node tooling/vercel-cleanup/cleanup.mjs --verify   # domain check on its own
```

The script deletes nothing but the listed deployment IDs. Before deleting it
re-reads every alias on the account and **aborts** if any planned ID is serving a
live domain, so a promotion or rollback made after this audit cannot be clobbered.
It also aborts if a production domain is already failing, and re-checks all 23
domains when it finishes.

Deployment deletion is permanent and instant rollback targets go with it. The two
retained prior production deployments per project are what keeps rollback possible.
