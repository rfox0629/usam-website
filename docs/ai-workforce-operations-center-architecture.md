# AI Workforce Operations Center Architecture

Status: USA-51 foundation  
V1 route: `/admin/operations-center`  
V1 access: active Supabase Auth users with an active `public.admin_users` allowlist row, any existing admin role (`admin`, `editor`, or `viewer`)  
V1 mode: read-only status foundation; no dispatch, shell, merge, deploy, DNS, or database control actions

## Existing Repo Audit

- Repository guidance in `AGENTS.md` defines this as the USAM website and Command Center, not the DOS app. Public pages must stay invitational and must not become operational dashboards.
- Admin routing is already centralized under `/admin`. `app/admin/layout.tsx` sets `dynamic = "force-dynamic"` and blocks unauthenticated or unauthorized users before rendering admin children.
- Admin authorization is implemented in `src/lib/admin-auth.ts` with `supabase.auth.getUser()` plus the `public.admin_users` allowlist exposed through RLS. Roles are `admin`, `editor`, and `viewer`.
- Admin setup is documented in `ADMIN_AUTH_SETUP.md`. It explicitly avoids an environment-variable admin allowlist.
- Supabase server clients use `@supabase/ssr` in `src/lib/supabase/server.ts`; service-role access is isolated in `src/lib/supabase/admin.ts` and must stay server-only.
- Route middleware protects public access-code pages and domain rewrites only. It does not currently protect `/admin`; admin protection happens in the admin layout.
- Deployment is a Next.js/Vercel-style app (`next.config.js`, `package.json`) with no `.openai/hosting.json` in this worktree.
- This repo does not currently contain Linear dispatcher, Mac mini runner, Claude/Codex runner, or worktree orchestration code. The Operations Center must consume a safe summary contract instead of reaching into runner internals.

## V1 Recommendation

Build the Operations Center inside the existing admin platform at `/admin/operations-center`.

The route inherits the established Supabase Auth plus `admin_users` server boundary. It is intentionally hidden from public navigation and currently omitted from the admin sidebar until dashboard packets are ready. V1 may show status and contracts only. Any action that starts, stops, retries, merges, deploys, edits DNS, mutates production schema, or contacts a person remains outside V1.

The companion status endpoint is `/api/admin/operations-center/status`. It is also server-authorized and returns only sanitized JSON snapshots.

## System Flow

Ryan -> ChatGPT -> Linear -> Dispatcher -> Claude/Codex -> QA -> Founder Review

Ryan defines priorities, constraints, and founder-level approval decisions. ChatGPT turns founder direction into Linear-ready work packets. Linear is the canonical work queue and review state. The Mac mini dispatcher pulls eligible Linear packets, creates isolated worktrees, assigns Claude/Codex lanes, and manages locks. Claude/Codex implement and validate in isolated worktrees. QA verifies output and risk. Founder Review is the final approval boundary before merge, deploy, DNS, or production database work.

## Responsibilities

| Component | Owns | Must Not Own |
| --- | --- | --- |
| Ryan | Priorities, final approvals, production go/no-go | Runner credentials or browser-side secrets |
| ChatGPT | Translating intent into scoped Linear packets | Direct production control |
| Linear | Issue status, priority, labels, assignee, In Review state | Mac mini credentials or shell access |
| Dispatcher | Queue selection, locks, isolated worktrees, agent assignment, runner health | Public web rendering or admin auth |
| Claude/Codex | Implementation, local validation, changed-file reporting | Merging, pushing, deploying, DNS, production DB mutation without approval |
| QA | Focused validation, regression checks, risk notes | Founder approval |
| Founder Review | Final approval gates | Routine runner internals |
| USAM Web App | Admin-only display of sanitized workforce state | Pulling runner secrets, unrestricted shell, or local filesystem browsing |

## Work Packet Lifecycle

1. Ryan or ChatGPT creates a Linear issue with scope, safety rules, and acceptance criteria.
2. Dispatcher selects eligible issues and creates a per-issue lock.
3. Dispatcher creates an isolated worktree and assigns a Claude or Codex lane.
4. Agent audits existing code, implements the smallest complete change, and validates locally.
5. Agent reports changed files, validation, limitations, and risk.
6. QA reviews the packet and records pass/fail or follow-up.
7. Issue moves to In Review for Founder Approval.
8. Only after founder approval may a separate approved process merge, push, deploy, change DNS, mutate production schema, or enable controls.

## Security Model

- Authentication: Supabase Auth session validated server-side with `getUser()`.
- Admin authorization: active row in `public.admin_users`; no client-side role decision.
- Browser boundary: browser receives only sanitized status snapshots, never Linear API keys, Supabase service-role keys, runner credentials, absolute worktree paths, local logs, raw prompts, unrestricted command strings, or shell handles.
- Server boundary: the web app reads a sanitized status model. It does not pull from the Mac mini directly and does not execute dispatcher commands.
- Service-role boundary: service-role usage remains server-only and is not required for the V1 status route.
- Caching: Operations Center routes are dynamic and status JSON sends `Cache-Control: private, no-store`.
- Public exposure: no public route, no public nav link, no public profile integration.

## Canonical Data Sources

| Data | Canonical Source | Web-App Contract |
| --- | --- | --- |
| Linear issues | Linear API, synchronized by dispatcher or integration worker | Issue identifier, title, URL, state, assignee, department, updated time |
| Dispatcher health | Mac mini dispatcher heartbeat | Status, heartbeat time, queue depth, active agent count, stale threshold |
| Locks | Dispatcher lock registry | Issue identifier, lane, owner alias, status, expiry time |
| Worktrees | Dispatcher worktree inventory | Issue identifier, branch, lane, status, updated time; no absolute paths |
| Agents | Dispatcher agent run summaries | Agent name, lane, issue identifier, status, heartbeat, safe current step |
| Reviews | Linear state plus QA/founder review records | Required approval, reviewer alias, status, updated time |

## Push Vs Pull

Use push for V1 and future dashboard packets.

The Mac mini dispatcher should push sanitized snapshots to a web-side ingestion boundary or trusted store. The web app should read those snapshots from the server side. The web app must not poll the Mac mini, hold runner credentials, mount runner storage, expose SSH, or offer arbitrary command execution.

This packet implements the web-side read contract and sanitizer only. A later packet may add a signed ingestion endpoint and Supabase storage table after founder approval of the schema and rotation plan.

## Secret Storage And Rotation

- Linear API keys stay with the dispatcher or a dedicated integration worker, not in browser code.
- Runner credentials stay on the Mac mini using local secret storage such as Keychain or locked environment files.
- Web-app server secrets stay in Vercel/Supabase environment configuration and are never named `NEXT_PUBLIC_*`.
- A future ingestion token must be server-only, rotated by issuing a new token, accepting both tokens briefly, then revoking the old one.
- Rotation events should be recorded in Linear or an internal operations log without posting secret values.

## Failure And Offline Behavior

- Empty state: show no snapshot connected, with all sources unknown.
- Stale state: if `generatedAt` is older than the freshness threshold, mark the snapshot stale and keep the last safe values.
- Offline state: show dispatcher offline when heartbeat explicitly reports offline or no fresh heartbeat exists after the threshold.
- Invalid payload: fail closed to an empty snapshot and warning.
- Sensitive payload: sanitizer redacts values that look like secrets or local filesystem paths and ignores unknown fields.
- Control failure: future controls must fail closed and require explicit re-approval before retrying destructive or production-affecting actions.

## Observability

Operations Center should eventually display only the minimum operational signals:

- dispatcher heartbeat and stale age
- queue depth and active agent count
- lock status and expiry
- agent lane status and last heartbeat
- Linear issue status and In Review state
- QA outcome and founder approval requirement
- warnings for stale, blocked, failed, or offline packets

Detailed logs, prompts, command output, local paths, env names, and stack traces stay in the dispatcher environment unless separately sanitized for review.

## Release And Approval Gates

- V1 route and status endpoint are read-only and may ship only after local validation passes.
- Dashboard feature packets may add display surfaces but still cannot add controls without founder approval.
- Control packets require an explicit Linear issue, threat model, audit log design, rollback plan, and Founder Approval.
- Merge, push, deploy, DNS, production database/schema mutation, and external communications remain outside this packet.
- This work should stop in Linear In Review for Founder Approval.

## Department Boundaries

- Product/Founder: issue priority, approval gates, production decisions.
- Engineering: code, contracts, local validation, route security.
- Validation/QA: test results, limitations, regression risks.
- Operations Dispatcher: queue, locks, worktrees, runner status.
- Public Website: mission, support, profiles, and forms only; no AI workforce dashboard.
- DOS/Field: daily missionary workflows only; no AI workforce controls.
