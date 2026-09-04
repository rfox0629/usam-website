# Phase 0 — Production and repository baseline report

Linear: USA-198 (phase), USA-201 (this evidence). Captured 2026-09-04 (UTC).

No application code was changed to produce this report. Everything below was read, not written.

## 1. Repository identity

| Item | Value |
| --- | --- |
| Canonical GitHub repository | `rfox0629/usam-website` (public) — https://github.com/rfox0629/usam-website |
| Default branch | `main` |
| `origin/main` at capture | `de6862f952d2f8c419c98815f8f3997db89e03f8` — "Give Kitchen Table Gospel its own share-card palette (#77)" |
| Previous `origin/main` (used for screenshots) | `828de2c0b518b48553c21b145e17e88ccfebe6e7` — "Clarify Kitchen Table Gospel scheduling flow (#76)". The only diff to `de6862f` is 2 non-DOS files (KTG share-card palette). |
| Phase 0 working branch | `ryan/usa-198-phase-0-baseline`, created from `de6862f` |
| Worktree used for Phase 0 | `.claude/worktrees/brand-metadata-favicons-refresh-1e4522` (clean; fast-forwarded from `828de2c` to `de6862f`) |
| Remote | `origin` → `https://github.com/rfox0629/usam-website.git` (fetch and push) |
| Git user | `rfox0629` |
| `main` branch protection | Required status check **"Typecheck, build, and smoke"** (non-strict). PR reviews required with 0 approvals, stale-review dismissal on, conversation resolution required. Force pushes and deletions blocked. `enforce_admins` off. No rulesets. |
| CODEOWNERS | `* @rfox0629`, with explicit ownership for `/app/dos/`, `/app/api/dos/`, `/src/components/dos/`, `/src/lib/dos/`, `/supabase/`, `/middleware.ts`, config files, and `/dos.html`. |

## 2. Worktree and concurrent-work state (must be preserved)

`git worktree list` shows **45 worktrees**. The ones that matter for this project:

| Path | Branch | State |
| --- | --- | --- |
| `/Users/ryanfox/Code/usam-website` (main checkout) | `main` at `054411a` | **77 commits behind `origin/main`** and **dirty**: 11 modified tracked files and 8 untracked paths. All of it is Finance/Compliance (USA-190) and dispatcher tooling work plus `app/dos/library-preview/` (untracked), `_to_delete/`, `error.log`, `scripts/tmp-usa151-screens.mjs`, and an **unapplied migration file** `supabase/migrations/20260825153213_usa_190_compliance_repairs.sql`. This is user-owned work. It was not touched, staged, stashed, or committed. |
| `.claude/worktrees/usa-168-people-v2-audit-99cbc0` | `usa-168-consolidated` at `76a942e` | Merged into main; source of the most recent DOS commits. |
| `/Users/ryanfox/USAM-Worktrees/dos-journey-claude-ui-refresh` | `ryan/usa-163-journey-focused-revision` | Older DOS UI branch; not merged. Phase 1 must classify it. |
| Remote branch `origin/codex/dos-ui-blitz` | — | Older DOS UI branch; not merged. Phase 1 must classify it. |

Ignored files present in the Phase 0 worktree: `.claude/.DS_Store`, `tsconfig.tsbuildinfo`, `.next/`, `node_modules/`. No `.env.local` exists in the Phase 0 worktree. The main checkout has a `.env.local` (name only recorded; contents never read or copied).

The git stash stack is empty.

Open PRs at capture (none touch DOS UI): #75 newsletter design proposal (review only), #56 USA-170, #20 USA-145, #19 USA-50, #18 System V2 preview, #17 USA-111, #13 USA-102, #1 briefing page.

## 3. Runtime, package manager, framework, tooling

| Item | Value |
| --- | --- |
| Node | `v24.13.1` locally; CI and Vercel pin `24.x` |
| npm | `11.8.0`; lockfile `package-lock.json` (no pnpm/yarn/bun) |
| Framework | Next.js `16.2.2` (App Router, Turbopack bundler in Vercel builds), React `^19.1.0` |
| Data | `@supabase/supabase-js ^2.105.1`, `@supabase/ssr ^0.10.2` |
| Styling | Tailwind CSS `^3.4.17`, PostCSS `^8`, autoprefixer |
| Icons | `lucide-react ^1.14.0` (used by `WorkspaceV2Shell`; the live app client uses its own inline `Icon` component) |
| TypeScript | `^5`, `strict: true`, `target: es5`, path alias `@/*` → repo root |
| Test tooling | `playwright ^1.61.1` (no `playwright.config`; scripts drive it directly). Chromium builds 1161–1228 are present locally. |
| Lint / format | **None.** No ESLint, Prettier, or Biome config; no `lint` script. `docs/ci-baseline.md` records this as a deliberate skip (USA-93). |
| Unit test runner | **None.** Tests are ~70 standalone Node regression scripts under `scripts/` wired as `npm run test:*`. |
| Analytics | `@vercel/analytics`, `@vercel/speed-insights`, GA and Clarity via `NEXT_PUBLIC_*` IDs |

## 4. CI, deployment, and environment boundaries

**CI** — `.github/workflows/ci.yml`, job "Typecheck, build, and smoke", runs on PRs to `main` and pushes to `main`:
`npm ci` → `npm run typecheck` → `test:join-contract` → `test:preparation` → `test:join-email-em-dash` → `npm run build` → `test:join-v2-release` → Chromium install → `npm run smoke`. No secrets are provided to CI; the build runs with Supabase unconfigured. Latest runs on `main` (828de2c, 76a942e, ec836b3, ebaeead) all **success**; the `de6862f` run was in progress at capture.

**Deployment** — Vercel project `usam-website` (`prj_gB0MBTEfFRmDb5FnZGg7YpYD7ng4`, team `Ryan Fox's projects`, hobby plan), GitHub-linked, framework `nextjs`, Node `24.x`, region `iad1`.

| Environment | How it is produced | Verified state at capture |
| --- | --- | --- |
| Production | Every push to `main` auto-deploys | `dpl_9swjVmkN2kk7tKVP6wQKtLtKf5Sg` for `de6862f` → **READY** (built 20:27–20:29 UTC). Aliases include `usamissionaries.org`, `www.usamissionaries.org`, `discipleshipoperatingsystem.com`, `kitchentablegospel.org`, `www.missionofreconciliation.org`, `ktgospel.com`, `usamissionaries.com`, `new.usamissionaries.org`, and `usa-missionaries.vercel.app`. `curl -I https://usamissionaries.org/dos` returns HTTP 200 from `server: Vercel`. |
| Previous production (rollback candidate) | — | `dpl_EsdGXNATBSJCPLkjEs2fKiT3rVfU` for `828de2c`, READY, `isRollbackCandidate: true`. |
| Preview | Every push to any branch / PR auto-deploys | Branch alias pattern `usam-website-git-<branch>-ryan-foxs-projects-9a51a4d5.vercel.app`. **Vercel Authentication (SSO) protection is ON for all non-custom-domain deployments**, so previews require a Vercel login or a bypass token. `middleware.ts` also branches on `VERCEL_ENV === "preview"` (domain-site routes are allowed on previews). |
| Local | `npm run dev` (launch config `dos-dev`, port 3000) | Without `.env.local` the DOS portal renders the "DOS unavailable / Supabase not configured" state. The synthetic demo route `/dos/app/preview?demo=<token>` renders the full app client with fixture data and needs no Supabase. |

**Database** — Supabase project `usam-website` (`dbupuphezeqkiolprrlg`, us-east-1, Postgres 17.6, `ACTIVE_HEALTHY`). All other Supabase projects in the org (`dos-2.0`, `dos-platform`, `usam-dashboard`, `usam-join-v2-disposable`, and two others) are `INACTIVE`. Production runtime env keys used by DOS code: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_CALENDAR_SCOPES`, `GOOGLE_TOKEN_ENCRYPTION_KEY`, `DOS_PREVIEW_TOKEN`, `DOS_DISABLE_DEMO_PREVIEW`, `SYSTEM_ACCESS_CODE`, `VERCEL_ENV`. No values were read or recorded.

## 5. Migration drift (production schema ≠ repository migrations)

Compared `supabase/migrations/` (146 files) against `supabase_migrations.schema_migrations` on the production project (90 rows), matching by migration **name** because the timestamps differ for the same migration in several cases (for example `usa_168_explicit_count_progress` is `20260903220000` in the repo and `20260904010157` in production).

| Finding | Count |
| --- | --- |
| Repo migration names with **no** production history row | **62** (29 DOS-related, e.g. `dos_group_location_and_recurrence`, `dos_guided_resource_progress_assignment_instances`, `dos_ministry_event_model`, `dos_person_field_visibility`, `dos_relationship_stewardship_model`, `dos_table_discipleship_roles`, `missionary_fruit_items`, `fruit_intelligence_metadata`) |
| Production history rows with **no** repo file | **6** (`build_financial_intake_system`, `communications_resend_subscribers`, `create_aligned_insights_inquiries`, `create_support_commitments_for_donor_intake`, `restore_form_submissions_inbox`, `usa_174_pco_donation_id_unique_constraint`) |

Some of the 62 may have been applied under a different name or via the dashboard SQL editor (the code tolerates missing tables in places, e.g. `isMissingWorkflowTable`). The point for this project: **a migration file in the tree is not evidence of the production schema, and no phase of this project may rely on applying one.** See risk R1.

## 6. Where the live DOS UI actually is

| Route | What serves it | Status |
| --- | --- | --- |
| `/dos` | `app/dos/page.tsx` → `DosPortalClient` (login / workspace selection), redirects an authorized user with one confirmed workspace to `/dos/<slug>` | **Canonical entry** (README: "Primary live entry route: https://usamissionaries.org/dos") |
| `/dos/[collectiveSlug]` | `app/dos/[collectiveSlug]/page.tsx` → loads `DosAppData` via `src/lib/dos/missionary-app.ts` and renders **`app/dos/app/DosMvpAppClient.tsx`** | **The live production DOS app (mobile and desktop)** |
| `/dos/app?workspace=<slug>` | compatibility redirect to `/dos/<slug>` | Protected compatibility only |
| `/dos/app/preview?demo=<token>` | `DosMvpAppClient` with synthetic fixture data | Smoke-test route; README calls it deprecated but it is live and gated by `DOS_PREVIEW_TOKEN` (default `dos2026`) unless `DOS_DISABLE_DEMO_PREVIEW=true` |
| `/dos/[collectiveSlug]/meetings`, `/people`, `/people/[personId]`, `/meetings/[meetingId]` | legacy prototype child routes → `redirectLegacyDosRoute` | Redirect to `/dos/<slug>` |
| `/dos/workspaces/[slug]`, `/dos/admin`, `/dos/onboarding`, `/dos/setup`, `/dos/library/*`, `/dos/book/[token]`, `/dos/review/[token]`, `/dos/review-options/[token]`, `/dos/testimony/[token]` | dedicated pages | Setup/onboarding, token-link public forms, library resources |

`DosMvpAppClient.tsx` is a single **46,898-line** client component (83 commits in the last 30 days). `src/components/dos/WorkspaceV2Shell.tsx` (1,379 lines, uses lucide icons, has its own "More" bottom tab) has **zero importers** in `app/` or `src/` — it is not rendered anywhere. `dos.html` at the repo root is a 34 KB static dark-theme mockup, last touched in commit `aa36752`, and is not served by the app.
