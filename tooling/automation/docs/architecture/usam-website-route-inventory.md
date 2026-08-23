# Route and Domain Inventory — rfox0629/usam-website

**Date:** 2026-07-28 · **Commit:** `b90dbc72183a` (`main`) · Read-only.

## Domain routing mechanism

Three hostnames are served by **one** Vercel project (`usam-website`) through host-based rewrites in `middleware.ts`, driven by `src/lib/domain-sites.ts`:

| Hostname | `DomainSiteKey` | Root path | Mechanism |
|---|---|---|---|
| `usamissionaries.org` | `usam` | `/` | canonical, no rewrite |
| `kitchentablegospel.org` | `kitchen-table-gospel` | `/domain-sites/kitchen-table-gospel` | host → rewrite |
| `discipleshipoperatingsystem.com` | `discipleship-operating-system` | `/domain-sites/discipleship-operating-system` | host → rewrite |

Key behaviours:
- `/domain-sites/*` returns **404** on direct access unless the `x-usam-domain-route` header is set, or `VERCEL_ENV === "preview"`.
- Non-root paths on an alternate domain **308-redirect** to `usamissionaries.org`, except `/robots.txt` and `/sitemap.xml`.
- Per-domain favicon/manifest assets are rewritten per host.
- `/board-briefing` → 308 → `/vision`.

**Migration consequence:** Kitchen Table Gospel and DOS marketing have no independent deployment today. Separating them means moving a domain to a new Vercel project — a DNS-visible change. This is the single highest-risk step in any extraction and must be gated.

## Route family inventory

| Route family | Public/Auth | Current owner | Desired owner | DB deps | Must keep URL | Migration risk |
|---|---|---|---|---|---|---|
| `/` | Public | USAM Website | USAM Website | missionary_* | Yes | Low |
| `/mission`, `/missionaries`, `/missionary-intake`, `/missionary-team` | Public | USAM Website | USAM Website | missionary_profiles, missionary_people, missionary_households | Yes | Low |
| `/partners` | Gated (cookie) | USAM Website | USAM Website | partners_documents | Yes | Low |
| `/vision` | Gated (cookie) | USAM Website | USAM Website | — | Yes | Low |
| `/support`, `/financialfreedom` | Public | USAM Website | USAM Website | support_commitments, financial_freedom_* | Yes | Low |
| `/join` | Public | USAM Website | USAM Website | usam_missionary_applications | Yes | Low |
| `/prayer` | Public | USAM Website | USAM Website | prayer_requests, prayer_partners | Yes | Low |
| `/briefing` | Public | USAM Website | USAM Website | — | No | Low |
| `/system` | Public + gated preview | USAM Website | USAM Website | system_access_codes | Yes | Low |
| `/domain-sites/kitchen-table-gospel` | Public (host-routed) | KTG | **Stay with USAM Website** | — | Via domain | **High (DNS)** |
| `/domain-sites/discipleship-operating-system` | Public (host-routed) | DOS Marketing | **Stay with USAM Website** | — | Via domain | **High (DNS)** |
| `/dos/**` | Authenticated | DOS | **DOS application** | 48 `dos_*` tables + shared identity | Yes | **High** |
| `/groups/**` | Public + token member portal | DOS Community | **DOS application** | dos_groups, dos_group_* | Yes | **High** |
| `/guide/[slug]` | Public | DOS | DOS application | dos_* resources | Yes | Medium |
| `/review/[token]`, `/review-options/[token]` | Token-gated | DOS | DOS application | dos_review_links | Yes | Medium |
| `/testimony/[token]` | Token-gated | DOS | DOS application | participant_testimonies | Yes | Medium |
| `/admin/**` | Authenticated (allowlist) | Mixed | **Split: 91% USAM Website, 9% Org OS** | many | Yes | **High** |
| `/api/dos/**` | Authenticated | DOS | DOS application | dos_* | Yes | High |
| `/api/admin/**` | Authenticated | Mixed | Mixed | many | Yes | High |
| `/api/{join,prayer-*,support-*,major-gift-*,form-submissions,partners*,missionary-*}` | Public | USAM Website | USAM Website | website tables | Yes | Low |
| `/auth`, `/login`, `/update-password` | Public | Shared platform | **Shared identity** | auth.users, profiles | Yes | **Critical** |

## `app/admin` breakdown (28,076 LOC)

| Subpath | LOC | True owner |
|---|---:|---|
| `missionary-profiles` | 14,635 | USAM Website |
| `prayer` | 2,643 | USAM Website |
| `organizations` | 1,967 | **Organization OS** (mostly preview data) |
| `support-team` | 1,628 | USAM Website |
| `_components` | 1,375 | Shared admin |
| `dashboard` | 907 | Shared admin |
| `financial-freedom` | 890 | USAM Website |
| `settings` | 714 | Shared admin |
| `public-experience` | 644 | USAM Website |
| `uploads`, `product-feedback`, `partners-documents`, `forms`, `relationship-intelligence` | 1,721 | USAM Website |
| `workspaces` | 299 | **Organization OS** |
| `people` | 225 | **Organization OS** |
| `finance` | 130 | **Organization OS** (form inbox, not finance) |
| remainder (stubs ≤31 LOC each) | ~300 | Mixed |

**Organization OS total: ≈2,621 LOC (9%).**

## Recommended future domain map

| Domain | Application | Vercel project | Change from today |
|---|---|---|---|
| `usamissionaries.org` | USAM Website (incl. KTG + DOS marketing) | `usam-website` | none |
| `kitchentablegospel.org`, `ktgospel.com` | USAM Website (host rewrite) | `usam-website` | none |
| `discipleshipoperatingsystem.com` | USAM Website (host rewrite) — marketing only | `usam-website` | none |
| `app.discipleshipoperatingsystem.com` *(new)* | DOS application | `dos-app` *(new)* | **new subdomain, no existing URL moves** |
| `thelords.army` | The Lord's Army | `army-website` | none |
| SAVE, Stewardship domains | unchanged | unchanged | none |

**Design rule:** DOS moves to a **new subdomain**, not an existing one. No production URL changes, no DNS cutover on a live domain, and `/dos/*` on the current domain can 308 to the new host during a compatibility window. This converts the highest-risk step into an additive one.

## Test ownership

39 scripts in `scripts/`, 6,143 LOC. **31 of 39 are `test:dos-*`** regression scripts. `npm run smoke` (`scripts/ci-smoke.mjs`) is the CI gate. Playwright is a devDependency.

Test suite ownership mirrors code ownership: the test surface is overwhelmingly DOS. Extraction must move these scripts with DOS or the DOS repo ships untested.

## Security boundaries

| Boundary | Mechanism | Location |
|---|---|---|
| Admin access | allowlist + RLS | `src/lib/admin-auth.ts`, `admin_users` |
| Partners gate | signed cookie | `src/lib/partners-access.ts` + middleware |
| Vision gate | signed cookie | `src/lib/vision-access.ts` + middleware |
| DOS member portal | access tokens | `dos_group_member_access_tokens` |
| Review/testimony | one-time tokens | `dos_review_links` |
| Domain isolation | header check | `middleware.ts` (`/domain-sites/*` 404 guard) |
| Supabase | RLS policies | 125 migrations |

`middleware.ts` is a **single shared chokepoint** for domain routing, the partners gate, and the vision gate. Any split must decide where it lives; it is the one file that genuinely spans all domains.
