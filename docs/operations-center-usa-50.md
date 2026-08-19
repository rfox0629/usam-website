# USA-50 Operations Center

Status: protected founder preview implementation  
Route: `/admin/operations-center`  
Mode: read-only, orchestration-agnostic

## Recovery Inventory

Historical Operations Center branches were inspected before implementation:

- USA-51 supplied a useful route/auth/status-contract foundation.
- USA-52 supplied useful Linear issue normalization, explicit unavailable states, and the protected preview path.
- USA-53 was not reused because it depends on a Supabase registry migration, which is out of scope for USA-50.
- USA-54 supplied useful founder-facing dashboard direction, but runner overrides and action controls were not reused.
- USA-62 supplied the recovery requirement and preview workflow guardrails.
- USA-91 was reviewed as a preserved future Infrastructure > Backups capability. USA-50 includes only read-only backup visibility/unavailable status because live backup controls require a separately approved paired local agent and should not be introduced inside this dashboard version.

This implementation retains the prior PR #19 route, status API, server-side auth boundary, USA-147 feed consumer, Linear normalization, redaction tests, and documentation. It refreshes the branch against current `origin/main`, updates Linear routing to the current canonical Runner label model, improves Founder Review evidence handling, adds completed-work and backup visibility, and keeps the dashboard inside the existing `/admin` boundary.

## Data Contract

The browser receives `usam.operations-center.v1` from `/api/admin/operations-center/status`.

Top-level fields:

- `schemaVersion`
- `generatedAt`
- `sources`
- `cards`
- `summary`
- `activeWork`
- `completedWork`
- `founderReviewQueue`
- `alerts`
- `recentActivity`
- `backupVisibility`
- `unavailableData`

The USA-147 producer remains the normalized workforce source. When configured, the web app reads either:

- `USAM_WORKFORCE_STATUS_URL` for an HTTPS JSON feed, or
- `USAM_WORKFORCE_STATUS_FILE` for a server-side local runtime file during Mac mini/dev validation.

Linear is read server-side through `OPERATIONS_CENTER_LINEAR_API_KEY` or `LINEAR_API_KEY`. The app first requests enriched fields for attachments, branch name, assignee, and Linear delegate. If the Linear API rejects an enriched field, it falls back to the compatibility issue query rather than taking the whole dashboard offline.

## Current Routing Interpretation

- `Ready for Dispatcher` means the issue is eligible for dispatcher pickup only when paired with exactly one canonical runner signal.
- Canonical runner signals are `Runner -> Codex`, `Runner -> Claude`, or equivalent exact `Codex` / `Claude` labels from the current dispatcher label model.
- Deprecated `Ready for Codex` and `Ready for Claude` labels are displayed as warnings, not as proof of execution.
- Linear assignment or delegation is displayed as Linear state only. It is not shown as active execution unless USA-147 reports a claimed or running heartbeat.
- Repository route is shown from safe Linear labels/text and USA-147 selected repository data. Missing or conflicting routes are explicit alerts.

## Security Boundary

- Existing `/admin` Supabase Auth and `admin_users` authorization protect the page.
- The status API repeats the same server-side authorization check.
- No secrets, raw logs, prompts, local filesystem paths, shell handles, or unrestricted command controls are returned to the browser.
- Local runtime paths are reduced to repository/worktree names.
- Token-shaped values and Vercel share tokens are redacted.
- No Supabase schema changes, database writes, production deploys, DNS changes, or shell controls are introduced.

## Live vs Unavailable Data

Live when configured:

- Dispatcher state, active runs, queue holds, alerts, review deliverables, and recent lifecycle events from USA-147.
- Linear issue state, labels, runner delegation, repository routing labels, and Founder Review issues.

Explicitly unavailable unless supplied by connected sources:

- Runner usage allowance and cooldown.
- PR, preview URL, screenshots, checks, branch, and commit for deliverables not reported by USA-147.
- Direct process controls or restarts.

## Future `app.usamissionaries.org` Cutover

1. Keep `/admin/operations-center` as the application route.
2. Add the future host only after Founder Approval and security review.
3. Configure authenticated preview/production environment variables server-side.
4. Validate that unauthenticated requests are blocked by Vercel protection and app auth.
5. Point `app.usamissionaries.org` to the same authenticated application after DNS approval.

Trigger.dev or another orchestrator can replace the producer later if it emits the same normalized run/event contract.
