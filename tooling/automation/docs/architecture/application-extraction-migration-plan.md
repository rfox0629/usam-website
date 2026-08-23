# Application Extraction Migration Plan

**Date:** 2026-07-28 · Target: Option B (structured monorepo, evolved in place). No stage below was started.

> **Founder rulings apply.** See "Founder Architecture Decision — Approved Direction" in `target-repository-architecture.md`. In particular: no new DOS repository, no new Organization OS repository, no rename of `rfox0629/usam-website`, Kitchen Table Gospel and DOS marketing stay with the public web app, and Stage E is a *build* decision rather than an extraction. Stage D is gated on USA-100 and USA-86. Nothing in this plan authorizes a production change.

## Principles

Additive before mutating. Documentation before code movement. Deployment separation before code separation. No stage runs a database migration except where explicitly stated. Every stage is independently revertible.

---

## Stage A — Documentation and contracts

**Objective:** make ownership explicit before any code moves.
**Scope:** route ownership, database ownership (done — `database-ownership-map.md`), environment ownership, shared-package contracts, deployment map. Complete `.env.example` with the Supabase variables.
**Prerequisites:** none.
**Duration:** 2–3 engineering days.
**Repos:** `usam-automation` (docs), `usam-website` (`.env.example` only).
**Linear:** Platform & Automation.
**DB risk:** none. **Deploy risk:** none. **Migrations:** not allowed.
**Rollback:** `git revert`.
**Verification:** a new engineer can provision a working local environment from `.env.example` alone.
**Founder gate:** approve the architecture recommendation.
**Production traffic:** unchanged. **Pausable:** yes, anywhere.

## Stage B — Internal boundaries inside `usam-website`

**Objective:** eliminate cross-domain coupling while everything still lives in one repository.
**Scope:**
1. Separate the `app/admin` tangle — move the ~2,621 LOC Organization OS surface behind `app/admin/(org-os)/`, and the 25,455 LOC of website back-office behind `app/admin/(website)/`.
2. Remove the 4 stray imports from `app/join`, `app/system`, `app/guide` into DOS modules.
3. Introduce `packages/`-shaped directories for `database`, `ui`, `auth`, `config` — still one build.
4. Add ESLint boundary rules (`eslint-plugin-boundaries` or `import/no-restricted-paths`) failing any cross-app import.
5. Add architecture tests asserting the dependency graph.

**Prerequisites:** Stage A.
**Duration:** 8–12 engineering days.
**DB risk:** none. **Deploy risk:** low — same build output, but it is a large refactor of a live production app.
**Migrations:** not allowed.
**Rollback:** `git revert` per PR. Keep PRs per-domain, never one mega-PR.
**Verification:** `npm run typecheck`, `npm run build`, `npm run smoke`, all 31 DOS regression scripts, plus new boundary lint.
**Founder gate:** review after the `app/admin` split — the riskiest step.
**Production traffic:** unchanged. **Pausable:** yes, between sub-steps.

## Stage C — Deployment separation

**Objective:** independent deploys before independent code.
**Scope:** convert to npm workspaces + Turborepo; create `apps/usam-web` and `apps/dos-app`; add a **new** Vercel project for `dos-app` on the **new** subdomain `app.discipleshipoperatingsystem.com`; scope environment variables per project; keep `/dos/*` on the existing domain serving from `usam-web` during a compatibility window.
**Prerequisites:** Stages A–B, **USA-95 and USA-96 complete**.
**Duration:** 5–8 engineering days.
**DB risk:** none — both projects target the same Supabase project.
**Deploy risk:** medium. Mitigated because the DOS app launches on a *new* subdomain; no existing URL changes.
**Migrations:** not allowed.
**Rollback:** delete the new Vercel project; traffic never left the original.
**Verification:** both Vercel projects build and deploy; dual-serve `/dos/*` produces identical output on both hosts.
**Founder gate:** before pointing any real user at the new subdomain.
**Production traffic:** unchanged until the compatibility window closes. **Pausable:** yes.

> **⚠️ First irreversible step is inside Stage C:** creating the public DNS record for `app.discipleshipoperatingsystem.com`. Everything before it is revertible with `git revert`. Everything after has a public-URL dimension.

## Stage D — DOS consolidation into its app workspace

**Objective:** all DOS code under `apps/dos-app`.
**Scope:** move `app/dos`, `app/groups`, `app/guide`, `app/review`, `app/review-options`, `app/testimony`, `app/api/dos`, `src/lib/dos`, `src/lib/groups`, `src/components/dos`, and the 31 `test:dos-*` scripts. Preserve history with `git mv` (retains blame through renames).
**Prerequisites:** Stage C, **USA-100 resolved**, **USA-86 verified restore**.
**Duration:** 8–12 engineering days.
**DB risk:** low if no migration is written; **high** if schema changes ride along — do not combine.
**Deploy risk:** medium.
**Migrations:** not allowed in the same PR as a move.
**Rollback:** `git revert`; moves are pure renames.
**Verification:** full DOS regression suite; dual validation against the old build.
**Founder gate:** before closing the `/dos/*` compatibility window.
**Production traffic:** changes only at cutover. **Pausable:** yes.

## Stage E — Organization OS

**Objective:** decide, then build — do not extract.
**Scope:** Organization OS is ~2,621 LOC of largely preview UI. This stage is **a product decision, not a migration**. If it is to be a real product, build it inside `apps/admin` against the existing shared identity core, then reassess. If not, retire the preview surface.
**Prerequisites:** Stage D; a founder product decision.
**Duration:** not estimable as migration work. As product work: 20+ engineering days for a genuine MVP.
**DB risk:** medium — a real Org OS will need real schema on the shared identity tables.
**Founder gate:** the decision itself.
**Pausable:** indefinitely. **This stage may never run, and that is an acceptable outcome.**

## Stage F — Cleanup

**Objective:** remove transitional scaffolding.
**Scope:** delete compatibility shims and dual-serve routes; archive transition branches; update registry v2; update Linear Application labels and handoff views; retire orphaned Vercel projects; then, and only then, execute the `dos-platform` artifact preservation and deletion.
**Prerequisites:** Stages A–D complete and stable for at least one release cycle.
**Duration:** 3–5 engineering days.
**Rollback:** limited — this stage deletes things. Gate each deletion separately.
**Founder gate:** each deletion.

---

## Sequencing and gates

| | |
|---|---|
| **First irreversible step** | DNS record for `app.discipleshipoperatingsystem.com` (Stage C) |
| **Safest stopping points** | End of Stage A; end of Stage B; before the Stage C DNS record; before the Stage D cutover |
| **Can run in parallel** | Stage A docs ∥ USA-95/96; Stage B sub-steps per domain; USA-100 ∥ Stages A–B |
| **Must be sequential** | B → C → D → F. Never overlap a code move with a database migration. |
| **Minimum backup requirement** | Verified `pg_dump` restore of `dbupuphezeqkiolprrlg` + storage export, dated within 24h of any Stage D action |
| **Required USA-86 state** | Restore **tested**, not merely scheduled |
| **Required USA-100 state** | Drift resolved before Stage D; may remain open through Stages A–C |
| **Required USA-95/96 state** | Complete before Stage C |
| **Required USA-97/98/99 state** | Not blocking. USA-98's pilot should ideally run before Stage D so delivery rails are proven on a small change first. |

**Should extraction wait for delivery-rails completion?** Partially. Stages A and B need nothing. Stage C needs USA-95/96. Stage D needs USA-100 and USA-86. Waiting for all of USA-93–99 before starting Stage A would waste the cheapest, highest-value window.

## Estimates

Assumptions: AI-agent execution with founder review; one reviewer; no second engineer; production traffic must not regress. "Engineering days" = agent execution days, not founder hours.

| Work | Optimistic | Realistic | High-risk |
|---|---:|---:|---:|
| Architecture cleanup in current repo (Stage B) | 6 d | **10 d** | 20 d |
| DOS consolidation (Stage D) | 6 d | **10 d** | 18 d |
| Organization OS | — | *not migration work* | 20+ d as product |
| CI changes (Turborepo, affected graph) | 2 d | **4 d** | 7 d |
| CODEOWNERS rewrite | 0.5 d | **1 d** | 2 d |
| Vercel mapping | 1 d | **3 d** | 6 d |
| Environment-variable separation | 1 d | **2 d** | 4 d |
| Database-contract documentation | 2 d | **3 d** | 5 d |
| Route compatibility / dual-serve | 2 d | **4 d** | 8 d |
| DNS / domain cutover | 0.5 d | **1 d** | 4 d |
| Test work | 3 d | **6 d** | 12 d |
| Documentation | 2 d | **3 d** | 5 d |
| Cleanup (Stage F) | 2 d | **4 d** | 7 d |
| **Total (excl. Org OS product work)** | **28 d** | **51 d** | **98 d** |

**Distinguishing the clocks:**
- **AI-agent execution:** ~51 days realistic.
- **Founder review:** ~12–18 review sittings; with the Founder Review WIP cap of 7 and a daily digest, roughly 1–2 sittings per week.
- **Elapsed calendar time:** **3–5 months realistic**, driven by review cadence, not agent throughput.
- **Production risk windows:** two — the Stage C DNS record and the Stage D cutover. Each is a single, schedulable, revertible event.

These are ranges, not commitments. The largest uncertainty is Stage B: the `app/admin` split is the only place where the code genuinely resists a clean boundary, and its 28,076 LOC have not been read line by line.
