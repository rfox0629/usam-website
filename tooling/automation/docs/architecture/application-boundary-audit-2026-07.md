# Application Boundary Audit — rfox0629/usam-website

**Date:** 2026-07-28
**Author context:** Principal-engineer architecture review session following USA-90 (Project Zero migration, Done) and USA-94 (CODEOWNERS, Done).
**Status:** Read-only audit. No application code was moved. No repository was created or deleted.

## Source repositories and commits inspected

| Repository | Ref | Commit |
|---|---|---|
| `rfox0629/usam-website` | `main` | `b90dbc72183a` (USA-94 merge) |
| `rfox0629/usam-automation` | `preservation/initial-20260727` | `b69c65ce7148` |
| `rfox0629/save-website` | `main` | `76f796b546f7` |
| `rfox0629/stewardship.capital` | `main` | `7d2d46d101ef` |
| `rfox0629/theLordsarmy` | `main` | `59ec04cda6e7` |
| `USA-Missionaries/dos-platform` | `main` + `rescue/dos-platform-legacy-reference-20260727` | `51ffeefc7d1f` |

Supabase and Vercel were inspected read-only via their APIs. No mutation was performed on either.

## Headline finding

**`usam-website` is not a website with an application attached. It is an application with a website attached.**

Measured at `b90dbc7`:

| Domain | Files | LOC | Share |
|---|---:|---:|---:|
| Authenticated DOS (`app/dos`, `src/lib/dos`, `app/api/dos`, `src/components/dos`) | 129 | **81,679** | 45% |
| DOS Community public surface (`app/groups`, `src/lib/groups`) | 17 | 4,015 | 2% |
| Admin back-office (`app/admin`, `src/lib/admin`, `app/api/admin`) | 74 | 36,257 | 20% |
| USAM public website (all public route families) | ~45 | ~12,031 | 7% |
| Kitchen Table Gospel + DOS marketing (`app/domain-sites`) | 6 | 1,775 | 1% |
| Supabase migrations | 125 | 15,513 | 9% |
| Everything else (shared, config, scripts, public assets) | ~350 | ~28,000 | 16% |
| **Repository total** | **649** | **353,117** | |

DOS is roughly **6× the size of the public website** it supposedly lives inside. Kitchen Table Gospel and DOS marketing together are **1,775 LOC across 6 files**.

## Domain classification

### A. USAM Public Website
`app/page.tsx`, `app/mission`, `app/missionaries`, `app/missionary-intake`, `app/missionary-team`, `app/partners`, `app/prayer`, `app/support`, `app/join`, `app/vision`, `app/financialfreedom`, `app/briefing`, `app/system`, `src/lib/missionaries`, `src/components/missionaries`, `src/data/missionaries.ts`, `components/` (nav, footer, forms, analytics).

Note: `app/system` was classified as Organization OS in the USA-94 CODEOWNERS. That is incorrect — it is the **public** system/ecosystem marketing surface shipped by USA-82, plus a gated preview.

### B. Kitchen Table Gospel
`app/domain-sites/kitchen-table-gospel` only. Served by host-based rewrite in `middleware.ts` via `src/lib/domain-sites.ts`. Not a separate application — a route group with its own favicon set and social image.

### C. DOS Marketing
`app/domain-sites/discipleship-operating-system` only. Same rewrite mechanism. `dos.html` at repo root is a static artifact.

### D. Authenticated DOS Product
`app/dos/**` (portal, workspaces, collectives, library, book, review, review-options, testimony, setup, onboarding, admin, app), `app/api/dos/**` (7 endpoint groups, 54 files, 14,024 LOC), `src/lib/dos/**` (37 files, 20,039 LOC), `src/components/dos`, plus the public Community surface `app/groups` and `app/guide`.

### E. Organization OS
**Does not meaningfully exist as code.** Total footprint ≈ 2,621 LOC:
- `app/admin/organizations` (1,967 LOC) — the list view renders a hardcoded `previewOrganizations` array with `isPreviewOnly: true` (Crew Ministry etc.)
- `app/admin/workspaces` (299), `app/admin/people` (225), `app/admin/finance` (130)

`app/admin/finance` is a thin wrapper over the shared `OperationsInboxPage` component, titled "Finance Inbox | USA Missionaries" — a form-submission inbox, not a nonprofit finance system. Tables `organizations`, `organization_memberships`, `people`, `person_roles` exist and are real, but the product surface over them is a prototype.

### F. Shared Platform Infrastructure
`src/lib/supabase` (3 files, **87 LOC**), `src/lib/access.ts`, `src/lib/admin-auth.ts`, `src/lib/partners-access.ts`, `src/lib/vision-access.ts`, `src/lib/analytics.ts`, `src/lib/domain-sites.ts`, `src/lib/domain-metadata.ts`, `src/lib/email`, `src/lib/forms`, `src/lib/platform`, `middleware.ts`, `app/layout.tsx`, `app/globals.css`, `tailwind.config.js`, `public/`.

### G. Unclear / Coupled / Transitional
- `app/admin` as a whole — 52% of it (`missionary-profiles`, 14,635 LOC) is USAM Website back-office; `prayer` (2,643) and `support-team` (1,628) are website operations; only ~9% is Organization OS.
- `src/lib/planning-center` — Planning Center integration; carries the open `pco_people` RLS finding.
- `app/review`, `app/testimony`, `app/guide` — token-gated public surfaces owned by DOS but living outside `app/dos`.
- `src/lib/major-gifts`, `src/lib/giving.ts` — finance-adjacent website code.

## Dependency findings

**Cross-boundary imports are one-way and shallow.**

- **Zero** imports from DOS into website-only modules (`src/lib/missionaries`, `src/components/missionaries`).
- Public routes import DOS modules in only 4 places: `app/groups` (9 imports of `src/lib/groups/*`), `app/join` (2), `app/system` (1), `app/guide` (1).
- The single high-fan-out shared module is `src/lib/supabase`: imported by 60 DOS files, 33 admin files, 6 public files — 99 consumers, but the module itself is **87 lines**.
- `src/lib/admin-auth` spans admin (34) and DOS (1).
- No circular dependencies were found across domain boundaries.

**Conclusion: the code is not the obstacle to extraction. The database is.**

## Environment variables

`.env.example` declares only four: `NEXT_PUBLIC_CLARITY_PROJECT_ID`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `PARTNERS_ACCESS_KEY`, `VISION_ACCESS_KEY`.

The application depends on `@supabase/ssr` and `@supabase/supabase-js` throughout, so **the Supabase URL and keys are consumed but undocumented in the template**. This is a real gap: a new engineer or a new deployment target cannot be provisioned from `.env.example`. Fix before any extraction — an incomplete env contract is the most common cause of a failed deployment split.

## Deployment inventory (read-only)

13 Vercel projects exist under team `ryan-foxs-projects-9a51a4d5`; 4 map to canonical repositories:

| Vercel project | Repository | Status |
|---|---|---|
| `usam-website` | `rfox0629/usam-website` | canonical, production |
| `save-platform` | `rfox0629/save-website` | canonical (name differs from repo) |
| `stewardship.capital` | `rfox0629/stewardship.capital` | canonical |
| `army-website` | `rfox0629/theLordsarmy` | canonical, owns thelords.army |
| `thelordsarmy-website` | `rfox0629/theLordsarmy` | **redundant — deploys on every PR alongside army-website** |
| `usam-dashboard` | *(repository deleted)* | **orphaned** |
| `dos-2.0`, `groundwork`, `auto-pilot-strategies` | archived repos | orphaned |
| `usa-71-claude-20260722183220`, `usam-website-usa-65-preview` | per-ticket previews | orphaned, violates the one-project-per-app rule |
| `the-stick-kids`, `alignedinsights-website` | out of scope | unrelated |

All of the above is USA-96 scope and was **not** changed.

## Limitations

- Supabase inspection was limited to project listing and migration history. No table, RLS policy, or storage bucket was queried directly; table ownership below was derived from migration DDL and code references.
- The second Supabase account holding `save-website` and `stewardship.capital` projects remains inaccessible (USA-89 D17). SAVE's project ref is now visible in CI as `lcxgfnjfnhohlqivldkp`, which is more specific than the registry's masked `lcxgfn`.
- LOC counts include blank lines and comments; they measure scale, not complexity.
- `app/admin` was classified by subdirectory name and spot-read; a full per-file classification was not performed.

## Related Linear issues

USA-90 (Done), USA-93 (Done), USA-94 (Done), USA-95, USA-96, USA-97, USA-98, USA-99, USA-100, USA-86, USA-88, USA-89.

No secrets appear in this document.
