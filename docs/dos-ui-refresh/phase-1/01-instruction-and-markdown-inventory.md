# Phase 1 — Agent-instruction and Markdown inventory (USA-204)

Every file that can steer Claude/Codex or a human reviewer, with scope, precedence, freshness, contradictions, and a proposed disposition. Evidence-only; nothing was rewritten or deleted.

Classification key: **A/C** Active and correct · **A/X** Active but conflicting · **OBS** Obsolete · **HIST** Historical reference only · **?R** Unclear, Ryan decision required.

## 1. Precedence as it actually exists

There is **no written precedence rule** anywhere in the repository. Agents encounter these sources in this practical order:

1. Linear issue + project description (out of repo; controlling for this project).
2. `AGENTS.md` at the repo root (read by Codex and Claude on every session; there is **no `CLAUDE.md`**, no `.cursorrules`, no `.github/copilot-instructions.md`, no `.claude/` instruction files, no `*.mdc`).
3. Nearest README to the files being edited: `app/dos/README.md`, `app/admin/README.md`.
4. `tooling/automation/README.md` + `tooling/automation/docs/ENGINEERING_ONBOARDING.md` (delivery/merge policy; read by the dispatcher and by anyone following the onboarding guide).
5. `docs/**` design/rollout/architecture notes (read only when searched for).
6. Out-of-repo: Claude's per-project auto-memory (`~/.claude/projects/-Users-ryanfox-Code-usam-website/memory/`), which carries prior-session findings (e.g. "repo migrations are not the production schema"). Not a rule source; recorded so its existence is known.

The consequence: `AGENTS.md` (last edited **2026-05-12**, commit `eae5dbc`) outranks `app/dos/README.md` (2026-08-24) by position even though the README is newer and more specific, and several `AGENTS.md` rules describe a product that predates the shipped DOS app.

## 2. Inventory

| # | Path | Scope | Last commit | Class | Notes / contradictions | Proposed disposition |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `AGENTS.md` (660 lines) | Whole repo; the only root-level agent instruction | 2026-05-12 | **A/X** | See §3. Core content is the Command Center / Profiles / Field model and the "Missionary Workspace and Command Center UI Rules". Says "This is the USAM website (not the DOS app)", "Do not build Field UI yet", "Discipleship Circles are plan-only… Do NOT automate yet", "Primary actions: solid gold, dark text", "Use RLS for all tables", "All admin pages must use the shared AdminShell", typography rules for the *website* font system. | Keep for website/admin. Phase 3 spec must add a **DOS section or a scoped `app/dos/AGENTS.md`** and an explicit precedence line; the stale DOS statements are listed in §3 for Ryan to confirm as superseded. Do not edit in Phase 1. |
| 2 | `app/dos/README.md` (≈120 lines) | `/app/dos/**` | 2026-08-24 | **A/X** | Mostly accurate and the best DOS map in the repo. Conflicts: (a) "`/dos/app/preview` is deprecated and redirects to `/dos`" — the code serves it behind `DOS_PREVIEW_TOKEN`; (b) "Legacy collective helpers … remain only for reference until fully removed" — still present with zero importers for two of three; (c) "Shared production UI lives in `app/dos/app/DosMvpAppClient.tsx`; make DOS app UI fixes there first" — this rule is a direct cause of the 46,898-line single file and of every UI PR conflicting in one file. | Amend in Phase 3 (canonical spec supersedes the "fix it in DosMvpAppClient first" rule by allowing extracted primitives under `src/components/dos/`). Fix (a) text when the demo route's fate is decided (?R, see D3). |
| 3 | `app/admin/README.md` | `/app/admin/**` | — | **A/C** | "Shared UI should be generic primitives only" — consistent with the Phase 4 plan. "Do not import DOS mobile app layouts here." | Keep. |
| 4 | `ADMIN_AUTH_SETUP.md` | Supabase auth setup | — | **A/C** | Reference; names the production admin email. Not a UI rule. | Keep; out of scope. |
| 5 | `docs/ci-baseline.md` | CI | — | **A/C** | States lint and unit tests are deliberately skipped (USA-93). | Keep; link from the Phase 3 spec. |
| 6 | `tooling/automation/docs/ci-baseline.md` | CI (automation copy) | 2026-08-22 | **A/X** | Diverges from #5: lists `npm test` as a required check although the website `package.json` has **no `test` script** (only `tooling/automation/package.json` does). | Phase 7 candidate: reconcile or point one at the other. Safe resolution, no Ryan decision. |
| 7 | `docs/architecture/workspace-terminology.md` | Naming policy (USA-110) | 2026-07-29 | **A/X** | Policy: UI copy says **"Household"** for anything scoped by `workspace_id`; "Workspace" is reserved for the unbuilt V2 tenant. The DOS UI says "DOS WORKSPACE" in the desktop sidebar and "Workspace" in 3 labels, "Household" in 59 places. | **?R (D5)**: confirm whether the DOS sidebar label should read Household. Product copy, not a refresh decision. |
| 8 | `docs/architecture/audit-log-contract.md`, `dos-portal-provisioning-security-boundary.md`, `join-provisioner-extraction-boundary.md` | Security / extraction contracts | 2026-07-29 | **A/C** | Non-UI. Provisioning boundary explains the USA-117 global authorization. | Keep; cite in the boundary map. |
| 9 | `docs/dos-groups-v2-rollout.md` | Groups V2 flag rollout | 2026-07-12 | **A/C** (partly HIST) | Flag `dos_groups_simplified_v2`; production has it enabled for **1** workspace. | Keep; Phase 6 Groups batch input. |
| 10 | `docs/dos-groups-v2-polish-audit.md` | Groups UI recommendations | 2026-07-12 | **A/X** | "Recommendations only." Pre-dates V10 and the project's approved direction; some items (reduce explanatory copy, one primary action) agree with the project, none were implemented. | Fold agreeing items into the Phase 3 spec's Groups section; mark the doc HIST afterwards. |
| 11 | `docs/dos-groups-v2-shared-leadership-beta-validation.md` | Validation checklist | 2026-07-12 | **HIST** | "Status: Not executed." Never run. | Archive in Phase 7 or execute in Phase 8 if Groups shared leadership is touched. |
| 12 | `docs/dos-identity-shared-leadership.md` | Identity flow | 2026-07-12 | **A/C** | Describes `profiles` → `missionary_households` resolution; matches `src/lib/dos/auth.ts`. | Keep. |
| 13 | `docs/dos-public-groups-member-portal-architecture.md`, `-rollout.md` | Public `/groups/[slug]` portal | 2026-07-17 | **A/C** / **HIST** | Architecture doc current; rollout doc is a pre-merge checklist whose "do not merge" language is stale now that it is on `main`. | Keep architecture; mark rollout HIST in Phase 7. |
| 14 | `docs/release-notes/2026-07-09-dos-groups-production-branch.md` | Release note | 2026-07-09 | **HIST** | Branch-lock note for a merged branch. | Keep as history. |
| 15 | `docs/tickets/dos-group-facilitator-access-follow-up.md` | Open defect note | 2026-07-11 | **A/C** | Real unresolved defect in group access resolution; not a UI rule. | Out of scope; ensure a Linear issue exists (not verified here). |
| 16 | `docs/brand-metadata-and-favicons.md` | Metadata/favicons | 2026-09-02 | **A/C** | Names `src/lib/dos/brand-metadata.ts` as the DOS metadata owner. | Keep. |
| 17 | `docs/domain-routing-analytics-foundation.md`, `docs/operations-v1-migration-map.md`, `docs/usa-165-*.md`, `docs/usa-191-review/**` | Non-DOS | 2026-08 | **A/C** / **HIST** | Website, operations, join. `usa-191-review` is a screenshot review package for a branch that is "not merged or deployed". | Out of scope. |
| 18 | `docs/usa-170-journey-assignment-instance-migration.sql`, `docs/usa-170-legacy-group-assignment-repair.sql` | SQL repair scripts stored in docs | 2026-08 | **HIST** | Runnable SQL outside `supabase/migrations/`; a reader could mistake them for pending migrations. | Phase 7: move under an `archive/` folder with a "never run" header. Safe. |
| 19 | `tooling/automation/README.md` | Dispatcher + **merge policy** | 2026-08-22 | **A/C** | "Merge/deploy… forbidden by prompt and dispatcher policy unless explicitly authorized per issue"; the `Founder Approved — Production` label is the only merge authorization. | **Governs this project's PR policy: no PR is merged without Ryan.** |
| 20 | `tooling/automation/docs/ENGINEERING_ONBOARDING.md` | Engineering rules | 2026-08-22 | **A/C** | "Do not merge to `main` unless the issue already contains explicit founder authorization"; founder review required for migrations, auth, RLS, cleanup/deletion of old folders, architecture boundary changes. | Governs; consistent with the Phase 0 protocol. |
| 21 | `tooling/automation/docs/architecture/target-repository-architecture.md` | **Founder Architecture Decision (2026-07-28)** | 2026-08-22 | **A/C** | Authoritative: DOS stays in this monorepo as a bounded app workspace; no production change authorized; legacy `dos-platform` must not be revived. | Governs; the refresh must not create a new repo or move routes. |
| 22 | `tooling/automation/docs/architecture/application-boundary-audit-2026-07.md`, `usam-website-route-inventory.md`, `database-ownership-map.md`, `organization-os-product-boundary.md`, `application-extraction-migration-plan.md`, `dos-platform-legacy-audit.md` | Architecture audits | 2026-07-28 | **HIST** (accurate at date) | Route inventory at `b90dbc7`; DOS was 81,679 LOC then. Useful Phase 2 cross-check. | Keep as history. |
| 23 | `tooling/automation/docs/usa-100-supabase-migration-history-reconciliation.md` | Migration drift | 2026-07-30 | **A/C** | Independently confirms Phase 0 R1 (60 local-only names at that date; 62 now). | Keep; cite. |
| 24 | `tooling/automation/docs/usa-135-*`, `usa-147-*`, `usa-70-*`, `usa-83-*`, `SOURCE-RUNTIME-SEPARATION.md`, `dispatcher-fixtures/*.md`, `src/replacement/README.md` | Dispatcher internals, prompt fixtures | 2026-08-22 | **A/C** (tooling) | Contain runner prompts and fixture issue text. Not product rules. | Out of scope. |
| 25 | `.github/CODEOWNERS`, `.github/workflows/ci.yml` | Ownership, CI | — | **A/C** | No PR/issue templates exist. | Keep. |
| 26 | `dos.html` (repo root, 34 KB) | Static mockup | 2026-04-24 | **OBS** | Dark theme (`--bg: #000000`), Barlow Condensed + JetBrains Mono fonts, "Disciple Operating System" title; never served (no route, not in `public/`). Listed in CODEOWNERS. | Phase 7 deletion candidate after the reference search rule (0 references found in `app/`, `src/`, `next.config.js`, `middleware.ts`). |
| 27 | `app/dos/app/preview/page.tsx` (2,079 lines, mostly fixture data) | Demo fixture | — | **A/C** | Generated-artifact-like data file. Required by the Phase 0/5 screenshot method. | Keep; see D3. |
| 28 | `config/usa-82-launch-verification.json`, `data/*.json` | Website metrics/launch data | — | **A/C** | Not DOS. | Out of scope. |
| 29 | `.claude/launch.json` | Dev-server config (`dos-dev`, port 3000) | — | **A/C** | Used for previews. | Keep. |
| 30 | Linear USA-219 attachment (V10 HTML, SHA-256 `835681cc…`) | Design reference | 2026-09-04 | **A/C** | Primary visual reference for included screens; explicitly not authority for behavior. | Governs Phase 3. |

## 3. `AGENTS.md` statements that conflict with the shipped DOS product

| Statement in `AGENTS.md` | Reality at `de6862f` | Effect on agents | Disposition |
| --- | --- | --- | --- |
| "This is the USAM website (not the DOS app)… Do not build Field UI yet." | The DOS mobile app ("The Field") is in production at `/dos/<slug>`. | An agent obeying the root file literally would refuse or misroute DOS work; in practice agents ignore it, which trains them to ignore the file. | Supersede for `app/dos/**` (D1). |
| "Tables are meeting events… buttons: Save Table, Save + Add Encounter… modal or slide-over" | UI copy is **Meetings**, Log Meeting / Schedule Meeting full-screen task pages; DB table is still `missionary_tables`. | Agents reintroduce "Table" wording (it survives in `dos-table-*` script names and `DosTableBookingForm`). | Spec: "Meeting" in UI, `missionary_tables` in data; never rename either. |
| "Discipleship Circles are plan-only… Do NOT automate yet" | `circle-scoring.ts` computes deterministic recommendations; placement stays human-confirmed via `/api/dos/circles/override`. | Partial conflict; the *human-confirmed* half matches the project guardrail. | Rewrite as: recommendations automated, placement never. |
| "Primary actions: solid gold, dark text" / "no new design systems, fonts, decorative effects" / website typography rules (display font for titles) | DOS primary is blue (`#2563EB`/`#2450C8`), Inter only, white surfaces. The website uses Inter + Oswald + Rajdhani and a black/gold theme. | Agents porting website conventions into DOS produce gold buttons and dark cards; the opposite leaks the DOS blue into admin. | Spec: two explicit design contexts (Website/Admin vs DOS) with their own tokens. |
| "Use RLS for all tables… Admin pages can SELECT/UPDATE based on admin access" | DOS reads/writes through the service-role client in 63 files; authorization is application-layer. | Agents may assume RLS protects DOS queries and drop a `workspace_id` filter. | Spec + boundary map state the truth; **no change to auth in this project**. |
| "All admin pages must use the shared AdminShell" | Correct for `/admin`; `app/admin/README.md` forbids DOS layouts there. | None for DOS; keep the boundary both ways. | Keep. |
| "Your Field… Required fields: name, phone… Always editable: relationship type, engagement level, church" | USA-168 Basic Person form asks three questions; engagement is an Advanced Feature (visibility-only flag, off by default). | Agents "restore" engagement fields that were deliberately hidden. | Supersede for DOS (D1). |
| "In Season tracks current focus" | In the app `in_season` = **Testimony Practice** (Coming Soon). | Naming drift. | Spec glossary. |

## 4. Rules most likely to slow agents or produce contradictory output

1. **No precedence statement** between `AGENTS.md`, `app/dos/README.md`, Linear, and the V10 artifact.
2. **"Make DOS app UI fixes in `DosMvpAppClient.tsx` first"** — funnels every change into one 46,898-line file; typecheck of that file dominates the 15 s typecheck; every concurrent branch conflicts there.
3. **32 regression scripts string-search `DosMvpAppClient.tsx`** (24 of them slice by `function <Name>` anchors). Any extraction or rename breaks them even when behavior is unchanged, so agents either avoid refactoring or "fix" tests by loosening them. (Detail in `03-config-build-lint-audit.md`.)
4. **Website-era `AGENTS.md` UI rules** (gold primaries, dark surfaces, display fonts) contradict the DOS palette; agents that read only the root file drift toward the website look.
5. **Stale README claims** (deprecated preview route, legacy helpers "until removed") make agents re-verify what a doc already claims to settle.
