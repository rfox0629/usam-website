# Architecture manifests

**Date:** 2026-07-28 · **Evidence commit:** `b90dbc72183a`

Machine- and human-readable ownership baseline for `rfox0629/usam-website`.
These files **describe the repository as it is today**. They do not change
runtime behaviour, routes, domains, the database, or deployment.

## Files

| File | Purpose |
|---|---|
| `application-ownership.yaml` | Seven application domains: paths, deployment, auth boundary, database ownership, criticality, migration readiness |
| `route-ownership.yaml` | 29 verified route families + 11 routes recorded as **absent** so planning docs stop implying they exist |
| `database-ownership.yaml` | 102-table ownership map, shared identity core, and the USA-100 drift appendix |
| `dependency-baseline.json` | Committed snapshot of current cross-domain imports; CI fails on **new** ones only |

## Commands

```bash
npm run arch:validate        # manifest consistency
npm run arch:deps            # human-readable dependency report
npm run arch:deps:check      # CI mode — fails only on NEW cross-domain imports
npm run arch:test            # 21 architecture tests
```

To accept new coupling deliberately:

```bash
npm run arch:deps:baseline   # then commit the baseline diff so it is reviewed
```

The baseline stores exact per-edge file lists, so regenerating it to hide a
regression produces a visible diff rather than a silent pass.

## Current measured state

| Metric | Value |
|---|---:|
| Files scanned | 454 |
| Import edges | 786 |
| Intra-domain | 493 |
| Into `shared-platform` | 216 |
| **Cross-domain** | **45** |
| `shared-platform` importing app code | **0** |
| Circular dependencies | **0** |
| Unresolved imports | **0** |

### Cross-domain edges

| From → To | Edges | Assessment |
|---|---:|---|
| `transitional-or-unclear` → `usam-public-web` | 15 | Expected. `app/admin` is 91% website back-office; resolves when `app/admin` is split. |
| `organization-platform` → `transitional-or-unclear` | 12 | Expected. Org OS pages use shared `app/admin/_components` chrome. |
| `transitional-or-unclear` → `dos-app` | 10 | Real coupling. Admin imports `src/lib/dos/*` for circle scoring, guide resources, product feedback, USAM applications. |
| `usam-public-web` → `dos-app` | 3 | `/join` ×2, `/system` ×1. Low-risk to remove. |
| `dos-app` → `organization-platform` | 2 | Both import `src/lib/admin/organization-shared.ts`. |
| `dos-app` → `usam-public-web` | 1 | `src/lib/prayer/email.ts` → `src/data/missionaries.ts`. |

### Correction to the 2026-07-28 audit

The prior audit reported **zero** imports from DOS into website-only modules.
Measured precisely, there is **one**: `src/lib/prayer/email.ts` imports
`src/data/missionaries.ts`. The direction of coupling is still overwhelmingly
one-way, but "zero" was wrong and is corrected here.

The prior audit also counted `src/lib/supabase` as having 99 consumers. Measured
per-module, `src/lib/supabase/admin.ts` alone has **117**. It is the highest
fan-in module in the repository and the natural first shared package.

## Highest fan-in modules

| Consumers | Module |
|---:|---|
| 117 | `src/lib/supabase/admin.ts` |
| 49 | `src/lib/dos/auth.ts` |
| 43 | `src/lib/dos/missionary-app.ts` |
| 36 | `src/lib/dos/api-auth.ts` |
| 35 | `src/lib/admin-auth.ts` |
| 17 | `app/admin/_components/AdminShell.tsx` |
| 17 | `src/lib/dos/circle-scoring.ts` |
| 17 | `components/forms/PublicForm.tsx` |
| 17 | `components/PrimaryNav.tsx` |

## Why a hand-written YAML parser

`scripts/architecture/yaml-subset.mjs` exists because the repository has no YAML
dependency and adding one to a production web application to validate
documentation is poor value. It supports exactly the constructs these manifests
use and **throws on anything else** — so an unsupported construct produces a loud
parse error rather than a silent mis-parse.

## Approved direction

Founder rulings of 2026-07-28 are recorded in
`rfox0629/usam-automation/docs/architecture/target-repository-architecture.md`
§ "Founder Architecture Decision — Approved Direction". In summary: structured
monorepo evolved in place; DOS becomes an internal app workspace; **no new DOS
repository**; **no new Organization OS repository**; the repository is **not
renamed**; Kitchen Table Gospel and DOS marketing stay with the public web app.

`desired_future_workspace` fields record that target. Every other field is
current truth.
