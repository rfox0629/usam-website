# USA-63 — NCC Reset Reconciliation Report

**Status:** Ready for founder review. Originally prepared 2026-07-23 in the
dedicated worktree `/Users/ryanfox/Documents/GitHub/usam-website-ncc-usa-31`
(branch `ryan/usa-31-ncc-parallel-sprint-isolate-claude-work-and-continue`),
where `/ncc` and its governing docs actually live. No production,
migration, merge, or deployment action was taken to produce this report.

**2026-07-30 re-verification (this run):** This issue's own runtime branch
(`ryan/usa-63-urgent-ncc-reset-mockup-reconcile-legacy-new-platform-and`) is
based on `main`, which has **no `app/ncc/**` directory and none of
`CLAUDE.md` / `ARCHITECTURE.md` / `WORKFLOW.md` / `docs/ncc-architecture.md`
at all** — those exist only on the still-unmerged `ryan/usa-31-...` branch.
That branch has not moved a single commit since this report was written
(`1a77b1f9` remains its tip), and `main` has not touched `app/admin`,
`app/ncc`, or any finance-runbook path since this report's base commit
either — so every VERIFIED claim below was re-checked against the
unchanged source and still holds. This report and the accompanying mockup
are standalone artifacts (a Markdown file and a self-contained HTML file)
brought onto this issue's own branch for review; no application code from
`ryan/usa-31-...` was merged into `main` or this branch to do this — that
merge is itself a founder decision this report's §7 route strategy informs,
not something this run performed.

Every claim below is either **VERIFIED** (read directly from code/docs in
this worktree, cited with file paths) or explicitly marked
**RECOMMENDATION** (my judgment, not a fact). Nothing here should be read
as already-approved direction — it is input to the founder decision this
issue asks for.

---

## 1. What is the legacy system today? (`/admin`)

**VERIFIED.** `app/admin/README.md` calls this "the USAM National Command
Center," and it is the only fully-functional operational surface in the
app today. Auth is per-route via `app/admin/layout.tsx` →
`getAdminAuthorization()` (`src/lib/admin-auth.ts`), backed by
`public.admin_users` (`admin`/`editor`/`viewer` roles). `middleware.ts`
does not gate `/admin` at all — everything is enforced in the layout.

Inventory (33 routes/pages under `app/admin/`):

| Area | Routes | State |
|---|---|---|
| Dashboard | `dashboard` (+ `page.tsx` re-export) | Live — 11 parallel Supabase queries |
| Applications | `applications` | Live |
| Finance (inbox) | `finance` | Live |
| Financial Freedom (hidden from nav) | `financial-freedom` | Live |
| Missionary Profiles | `missionary-profiles` (13,121-line editor) | Live, **self-labeled "Legacy Missionary Workspace"** |
| Organizations | `organizations`, `organizations/[id]`, `organizations/usam` (redirect) | Live — the newer of the two internal models |
| Partners | `partners` | Explicit stub — "No partner intake data source exists yet" |
| Partners Documents | `partners-documents` | Live (real Storage bucket + table) |
| People | `people/[id]` | Live |
| Prayer | `prayer`, `prayer-team` (re-export) | Live, large (1,777 lines) |
| Product Feedback | `product-feedback`, `feedback` (re-export) | Live |
| Profiles | `profiles` | Live, narrow (one form type) |
| Public Experience | `public-experience` | Hybrid — live counts over a hardcoded page/form/access-gate catalog |
| Relationship Intelligence | `relationship-intelligence` ("Circle Engine") | Live |
| Settings | `settings` | Live |
| Stewardship / Stewardship Sharing | `stewardship`, `stewardship-sharing` | Explicit placeholders |
| Support | `support-team`, `support` (re-export) | Live, but 4 of 8 actions are stubs (TODO comments for CRM/notification wiring) |
| Uploads | `uploads` | Mixed — 1 of 4 rows is a real Storage bucket, 3 are hardcoded "not connected" |
| Workspaces preview | `workspaces/[id]/preview` | Live — **contradicts its own README**, which claims it's a redirect shim |
| Redirects only | `forms`, `inquiries`, `pages`, `site` | Pure redirects to `public-experience` |

Notable issues found in legacy (VERIFIED, not new problems introduced by
this audit):

- `app/admin/forms/FormsControlTable.tsx` is a fully built component with
  no importer anywhere — dead code.
- `RolePreviewSelect.tsx` ("Viewing as" dropdown in every admin header)
  writes to `localStorage` only and changes nothing — cosmetic.
- The Missionary Profiles editor titles itself **"Legacy Missionary
  Workspace"** in its own copy, i.e. even legacy's own authors consider it
  superseded in intent by `admin/organizations/**`.

## 2. What new NCC platform has already been built by Claude? (`/ncc`)

**VERIFIED.** `docs/ncc-route-canonicality.md`: *"`/ncc` is the new
canonical route tree going forward. `/admin` remains fully functional,
unredirected, and unmodified."* Auth reuses the same
`getAdminAuthorization()` / `admin_users` mechanism — no new identity
system. All 5 commits touching `app/ncc/**` landed within a two-day window
(2026-07-12 to 2026-07-13) — this is very recent, single-threaded work,
not a mature platform yet.

`app/ncc/_components/nccNav.ts` is the single source of truth for
department status, and it matches the code:

| Department | Nav status | Actual state |
|---|---|---|
| Home (`/ncc`) | live | Live — 5 real metric cards, deep-links to authoritative pages |
| **Finance** | live | **Code-complete but not launched** — see §4 |
| **Partnerships** | live | Documents tab live (reuses legacy `PartnersDocumentsAdmin`); every other tab (Pipeline, Contacts, Meetings, Tasks, Initiatives) is an explicit "planned, no table exists" empty state |
| Organizations | legacy | No `/ncc` page — nav links straight to `/admin/organizations` |
| Prayer | legacy | No `/ncc` page — nav links straight to `/admin/prayer` |
| Settings | legacy | No `/ncc` page — nav links straight to `/admin/settings` |
| Executive, People, Development, Communications, Ministry Operations, Compliance & Legal (top-level), Reports, Knowledge Base, Technology | planned | Placeholder pages only (`NccPlanned` component), most cross-link to a legacy equivalent, none have real data |

There are **no `app/api/ncc/**` routes** — everything is Next.js Server
Actions colocated per page. There is no `src/components/ncc/` directory —
shared UI lives only in `app/ncc/_components/`.

## 3. What is the current Operations Center page, and why does it show unavailable data?

**VERIFIED — it does not exist in this codebase.** An exhaustive
case-insensitive grep for "operations center" / "operations-center" /
"dispatcher" across `app/`, `src/`, `components/`, `docs/`, and root
`*.md` files — in both this worktree and the base `usam-website`
checkout, and across `git log --all` — returns zero hits for a page,
route, or API endpoint. There is no `app/admin/operations`, no
`app/ncc/operations-center`, no `app/api/dispatcher*`.

What *does* exist near this name:

- `ARCHITECTURE.md` §"AI Workforce / Dispatcher" — a prose-only section
  describing how agent implementation work (Claude/Codex) gets planned,
  isolated, validated, and handed off. Not a page, not ministry-facing.
- The real Linear-polling **dispatcher** is a separate local Node.js
  daemon at `/Users/ryanfox/USAM-Automation/src/dispatcher.mjs` — a
  CLI/launchd process (`Ryan → ChatGPT → Linear → automatic Claude/Codex
  pickup`) with **no web UI or HTTP page of its own**. Nothing in
  `usam-website` (this worktree or the base repo) imports or fetches from
  `USAM-Automation` — confirmed zero references either direction.
- `app/admin/_components/OperationsInboxPage.tsx` is a similarly-named
  but unrelated *shared component* (the generic inbox pattern behind
  Applications/Finance/Partners/Profiles) — not a page called "Operations
  Center."

**Conclusion:** the Operations Center page in the founder's screenshot is
not served by this repository. It cannot be diagnosed as broken NCC/admin
routes because no such route exists to break. It is very likely being
rendered by something entirely outside this codebase — a different local
tool, an ad hoc status script, or a separate project.

**RECOMMENDATION:** before any engineering response, confirm the exact
URL/host that screenshot was taken from. If the founder wants a real
Dispatcher/Linear/Claude/Codex status surface, that is new scope (a
System/Developer area, per the issue's own requirement to keep it
separate from ministry-operations nav) — not a fix to something broken.

## 4. Finance platform status

**VERIFIED — the most-built part of NCC, but not live in production.**

Routes: `/ncc/finance` (Overview / Documents / Monthly Checklist /
Compliance redirect / Reports-planned / Finance Team),
`/ncc/finance/compliance`, `/ncc/finance/compliance/arizona-annual-report/[year]`,
`/ncc/finance/990/[taxYear]` (12-tab Form 990 workspace).

Four Supabase migrations exist
(`20260711120000_finance_documents_foundation.sql`,
`20260713090000_compliance_filings_foundation.sql`,
`20260714090000_finance_operations_foundation.sql`,
`20260715090000_finance_team_permissions_foundation.sql`) — **each file's
own header states it has not been applied to any database.** Every write
path checks a dedicated env flag
(`FINANCE_DOCUMENTS_MIGRATION_APPLIED`, `COMPLIANCE_FILINGS_MIGRATION_APPLIED`,
`FINANCE_OPERATIONS_MIGRATION_APPLIED`, `FINANCE_PERMISSIONS_MIGRATION_APPLIED`),
none of which is set anywhere in this checkout. A ready-to-run activation
runbook already exists: `docs/finance-production-activation-runbook.md`.

What's real (code, not scaffolding): document upload/delete against
Supabase Storage, a 4-role permission model
(`finance_owner`/`accountant`/`bookkeeper`/`treasurer_readonly`) enforced
server-side, transaction CSV import with rule-based (non-AI) category
suggestion and outlier flagging, draft workpaper generation, a Form 990
workspace with a Postgres trigger that blocks a filing from silently
becoming "filed" without a human-entered confirmation number, and a
Finance Team management flow that grants external accountants access with
**zero** `admin_users` row.

What's explicitly not real yet: `MonthlyChecklistPrototype.tsx` is
labeled a client-only prototype with no backing table (state resets on
reload). The top-level `/ncc/compliance-legal` nav item (broader
legal/insurance scope) is a separate, still-planned placeholder — distinct
from the real, built `/ncc/finance/compliance` filings-only sub-area.

**Important discrepancy to flag:** `docs/ncc-architecture.md` §20 still
describes Finance as pre-Phase-1 ("zero accounting functionality," "a
donor-intake inbox wearing a department name"). That framing is now stale
— real Finance code has since been built past that description. Treat the
master-vision doc's Finance section as outdated versus the live code and
the activation runbook.

## 5. Duplicate / overlap map

| Capability | Legacy (`/admin`) | New (`/ncc`) | Overlap type |
|---|---|---|---|
| Partner document library | `admin/partners-documents` (built) | `ncc/partnerships` → Documents tab | **Same code reused**, not duplicated — `/ncc/partnerships` imports `PartnersDocumentsAdmin` directly |
| Partner intake/pipeline | `admin/partners` (explicit stub, no data source) | `ncc/partnerships` other tabs (explicit "planned") | Both honestly say "not built" — no real duplication, just two placeholders in two trees |
| Organizations | `admin/organizations` (live, newer internal model) | none — nav links to legacy | No duplication; `/ncc` correctly defers |
| Finance intake (giving/support/major-gift) | `admin/finance` inbox (live) | `ncc/finance` (documents/990/compliance — a different, deeper scope) | **Not truly duplicate** — legacy is a submission inbox; new is filing/compliance/document work. Both currently coexist and both are real. This is the one area that needs an explicit decision (see §7). |
| Prayer, Settings | `admin/prayer`, `admin/settings` (live) | none — nav links to legacy | No duplication |
| Missionary onboarding/status | `admin/applications`, `admin/missionary-profiles` (live, self-labeled legacy) | `ncc/people` (empty placeholder) | No duplication yet — new is unbuilt |
| Operations Center / dispatcher | n/a | n/a | **Does not exist anywhere** — see §3 |

There is **no third competing implementation** anywhere in the codebase.
Every `/ncc` department is either (a) a genuine new build, (b) a direct
re-use of legacy code (Partnerships Documents tab), or (c) an honest
placeholder that links out to the working legacy page instead of faking
one.

## 6. Keep / migrate / retire-later / hide-from-navigation

**RECOMMENDATION** (builds on the existing, already-decided
`docs/ncc-route-canonicality.md`, does not override it):

- **Keep exactly as-is, no new feature work:** all of `/admin` remains
  live and linked from `/ncc`'s "legacy" nav items until each department
  is actually rebuilt. This matches the issue's non-negotiable directive.
- **Migrate next (lowest-risk, most finished):** Finance — flip the 4
  existing migrations/flags per the existing runbook once founder
  approves a production activation window. This is an operational
  decision (apply pre-written migrations), not new engineering scope.
- **Migrate next (already proven pattern):** Organizations — `/ncc` should
  gain its own Organizations page reusing `admin/organizations`' data
  layer (`loadOrganizationsOverview`), the same way Partnerships reused
  Documents. Low engineering risk since the underlying query layer already
  exists.
- **Retire later, not now:** `app/admin/missionary-profiles` — already
  self-labeled "Legacy Missionary Workspace" by its own authors; do not
  extend it further, but do not remove it until People/onboarding is
  rebuilt in `/ncc`.
- **Hide from navigation (already effectively hidden, keep it that way):**
  `financial-freedom`, `inquiries`, `pages`, `stewardship`,
  `stewardship-sharing` — these are either redirect shims or explicit
  placeholders; no reason to promote them anywhere.
- **Fix regardless of migration timing (small, low-risk cleanups, not in
  scope for this issue to execute, flagging for a future ticket):** the
  `app/admin/README.md` claim about `workspaces/[id]/preview` being a
  redirect is factually wrong and should be corrected or the route
  behavior reconciled with intent; `FormsControlTable.tsx` is dead code.

## 7. Single recommended product hierarchy and route strategy

**RECOMMENDATION.**

```
/ncc                      → Operations Platform (new, canonical, growing)
  /ncc/finance             → Finance & Compliance (activate pending migrations)
  /ncc/partnerships        → Partnerships (Documents live; pipeline built next)
  /ncc/organizations       → NEW: reuse admin/organizations data layer
  /ncc/people              → NEW: onboarding/status workflow (not yet started)
  ...remaining departments → stay "planned," link to legacy until rebuilt

/admin                     → Legacy Command Center (frozen scope, stays live)
  (unchanged — no new admin/** feature work per founder directive)

/system (proposed, new)    → Developer/System area: Dispatcher, Linear,
                              Claude, Codex status — separated from
                              ministry-operations nav entirely, per this
                              issue's own requirement. Does not exist
                              anywhere today (see §3); this is new scope,
                              not a migration.
```

This keeps exactly one ministry-operations product (`/ncc`, backed by
`/admin` for anything not yet rebuilt) and adds exactly one small,
clearly-separated system/developer surface — no third competing NCC
implementation.

## 8. Phase 1 onboarding path by audience

**RECOMMENDATION**, since no existing doc defines this end-to-end yet
(`docs/ncc-architecture.md` is explicitly a strategy artifact, not an
onboarding spec):

- **Founder/admin:** `/ncc` home → Finance (once activated) →
  Partnerships Documents → legacy `/admin` for anything still tagged
  "legacy"/"planned" in the nav rail.
- **Finance operator/accountant:** direct link straight into
  `/ncc/finance` — already supported today via `resolveFinanceAccess()`,
  which grants Finance-only users access with **no** `admin_users` row.
  This path already works in code; it is only blocked by the unapplied
  migrations.
- **Missionary or ministry staff:** today, still `/admin/applications` /
  `/admin/missionary-profiles` (legacy) — `/ncc/people` has no workflow
  yet. This is the clearest current gap in the new platform.
- **Future MOR organization operator:** not yet supported anywhere —
  `organization-context.ts` hardcodes a single tenant
  ("USA Missionaries"); multi-org onboarding is out of scope until a real
  second tenant is being onboarded (per `docs/ncc-architecture.md`'s own
  explicit deferral).

## 9. What should the new Phase 1 system visibly include now?

**RECOMMENDATION**, reflecting what's actually buildable without new
backend work: `/ncc` home dashboard (already live), Finance & Compliance
(already built, pending activation), Partnerships Documents (already
live, reused), an honest "planned" state for every other department
(already the current pattern — do not fake completion), and a new,
clearly separate System/Developer area for Dispatcher/Linear/Claude/Codex
status (does not exist yet, is new scope, and must stay out of the
ministry-operations nav per the issue's requirement).

## 10. Exact code/routes reused in the accompanying mockup

The mockup (`mockups/ncc-operations-platform-mockup.html`) is a
standalone static file — it does not import application code — but its
navigation structure, department list, status tags ("Live" / "Planned" /
"Legacy"), and Finance sub-navigation are modeled directly on:

- `app/ncc/_components/nccNav.ts` (department list + status)
- `app/ncc/page.tsx` (home dashboard metric-card pattern)
- `app/ncc/finance/page.tsx` and its sub-routes (990, compliance, monthly
  checklist, finance team tabs)
- `app/ncc/partnerships/page.tsx` (tab structure, Documents-live-vs-rest-planned pattern)
- `app/admin/_components/AdminShell.tsx` nav-group visual language (sidebar
  + status pill conventions), adapted rather than copied verbatim

All content in the mockup is explicitly labeled mock/demo data. No live
completion state is implied beyond what is verified above.

---

## Recommendation: what to build next after founder approval

1. Confirm the Operations Center screenshot's actual source (§3) before
   any engineering response to it — it's not a repo bug.
2. If Finance activation is approved, that's the fastest real Phase 1 win:
   run the existing `docs/finance-production-activation-runbook.md` in a
   controlled window (Founder Approval gate, per `CLAUDE.md`).
3. Build `/ncc/organizations` next by reusing
   `loadOrganizationsOverview()` — same low-risk reuse pattern already
   proven by Partnerships Documents.
4. Only after that, scope `/ncc/people` (onboarding/status) as its own
   Linear issue — it has no existing code to reuse and needs its own
   Phase 1 definition (this is exactly what USA-9 is for).
5. Treat the System/Developer area (Dispatcher/Linear/Claude/Codex status)
   as new, separately-scoped work — do not fold it into ministry
   operations nav, and do not build it reactively off a screenshot from an
   unknown source.
