# Phase 0 — Branch, PR, preview, and rollback protocol (USA-202)

Applies to every issue in the DOS UI System Audit & Visual Refresh project (USA-192 … USA-234). Repository facts it depends on are in `01-baseline-report.md`.

## 1. Working-branch strategy

- **Base**: `origin/main`, always. No long-lived integration branch. Reason: `main` auto-deploys to production and is the only branch with required checks, and 45 worktrees plus 8 open PRs already exist; a second long-lived branch would drift immediately.
- **One branch per Linear issue (or one tightly related batch)**, named with Linear's suggested branch name (`ryan/usa-<n>-<slug>`), cut from `origin/main` at the moment work starts. Rebase onto `origin/main` before opening the PR; never merge `main` into the branch with unrelated changes bundled.
- **Phase 0** uses `ryan/usa-198-phase-0-baseline` (docs only). Phases 1–3 use one branch per phase issue for documentation. Phases 4–7 use one branch per child issue.
- **Worktrees**: each branch gets its own worktree under `.claude/worktrees/` (or `/Users/ryanfox/USAM-Worktrees/`). Never work in `/Users/ryanfox/Code/usam-website` (the main checkout is dirty with user-owned USA-190 work and 77 commits behind).
- **Never** use `git stash` without `-u -m <tag>` (the stash stack is shared across worktrees); prefer a WIP commit. Never force-push a shared branch; never rewrite `main`.

## 2. PR size and scope rules

| Rule | Limit |
| --- | --- |
| One concern per PR | Exactly one of: documentation, shared foundation (tokens/primitives), one pilot screen, one screen batch, one cleanup manifest item. Never mix cleanup, architecture change, data migration, and visual replacement. |
| Size | Target ≤ 400 changed lines of application code, hard stop at ~800 excluding generated docs/screenshots. `DosMvpAppClient.tsx` is 46,898 lines; a PR touching it must list the exact functions changed. |
| Forbidden in any PR of this project | New or edited files under `supabase/migrations/`; changes to `src/lib/supabase/*`, `src/lib/admin-auth.ts`, `src/lib/dos/auth.ts`, `src/lib/dos/api-auth.ts`, `middleware.ts`, any `app/api/**` request/response shape, `workspace_id`/person-id plumbing, RLS, or `dos_workspace_feature_flags` semantics. If one seems necessary, stop and open a separate issue for Ryan (true stop condition). |
| Behavior | No workflow, field, validation, history, or permission may be removed to simplify a screen. |
| Home | No PR may change the rendered output of the Home/Dashboard section without a separate approved issue. |
| Navigation | No PR may add a fourth tab, replace the `home`/`meetings`/`apps` icons, or rename "More". |

## 3. Merge order

1. Phase 0 docs (this PR) → 2. Phase 1 audit docs → 3. Phase 2 inventory docs → 4. Phase 3 canonical spec → 5. Phase 4 foundation PRs in order: tokens (USA-208) → editable-surface/form primitives (USA-211) → controls/cards/rows/states (USA-213) → navigation opacity/safe-area/overflow (USA-214) → regression coverage (USA-215) → 6. Phase 5 pilot PRs one screen at a time (USA-216 → 217 → 218 → 222 → 220 → 223) → 7. Phase 6 batches → 8. Phase 7 cleanup (each manifest item separately) → 9. Phase 8 verification docs.
A later PR may be opened while an earlier one awaits review only if it does not depend on unmerged code. Stack dependent PRs explicitly (base = previous branch) and re-target to `main` after the base merges.

## 4. Required checks before a PR is "ready"

- CI job "Typecheck, build, and smoke" green (the branch-protection required check).
- Locally: `npm run typecheck`, `npm run build`, and every DOS regression script in `02-verification-results.md` §B that passed at baseline still passes. The one baseline failure (`dos-field-contact-form`) stays recorded as pre-existing until Phase 1 disposes of it; a PR must not silently "fix" it.
- Any new regression script added in Phase 4 (USA-215) becomes required for later PRs.
- Accessibility and overflow check on the changed screens (contrast of secondary text, no horizontal scroll at 390px, bottom-bar clearance).

## 5. Preview deployment expectations

- Vercel auto-creates a preview for every pushed branch (`usam-website-git-<branch>-…vercel.app`). **SSO protection is on**, so reviewers must be logged into Vercel or use a bypass token; `?_vercel_share=` links are supported by the app (line 13630).
- A preview is **production-like** only when it has the production env keys; previews share the production Supabase project, so **no test writes against real workspaces**. Use `/dos/app/preview?demo=<token>` on the preview for synthetic-data screenshots, and a designated test workspace (to be named by Ryan before Phase 5) for persistence checks.
- Each implementation PR description links its preview URL and the demo-route URL.

## 6. Screenshot requirements

- Widths: **390×844 (mobile, DPR 2)** and **1440×900 (desktop)**; add 768×1024 when a layout has a tablet breakpoint.
- Before/after pairs for every changed screen and state (populated, empty, loading, error where reachable), captured with the Playwright capture script pattern used in Phase 0 (`docs/dos-ui-refresh/phase-0/screenshots/capture-log.txt` records the flows).
- Bottom navigation visible in every mobile screenshot of a tabbed screen; forms show their sticky footer and the discard dialog once.
- Stored under `docs/dos-ui-refresh/<phase>/screenshots/` and attached to the Linear issue.

## 7. Rollback procedure

**Code (any merged PR):**
1. `git revert -m 1 <merge-sha>` (or `git revert <sha>` for squash merges) on a branch from `origin/main`; open a PR titled "Revert: …"; let CI pass; merge. Production redeploys automatically from `main`.
2. If production is broken and a revert PR would take too long: in Vercel → project `usam-website` → Deployments → promote the last READY production deployment ("Instant Rollback"). At Phase 0 the rollback target is `dpl_EsdGXNATBSJCPLkjEs2fKiT3rVfU` (`828de2c`); each implementation PR must record the production deployment id that was READY before it merged as its rollback target.
3. Feature branches are never deleted until their PR's rollback window (one week after merge) has passed.

**Data:** Not applicable by construction — this project ships no migrations and no data rewrites. If a PR is found to have changed persisted data meaning, treat it as an incident: revert the code first, then open an issue for Ryan before any data repair.

**Local:** the Phase 0 worktree is clean; `git checkout -- .` and `git clean -fd` are permitted only inside a project-owned worktree, never in the main checkout.

## 8. Database migrations

Prohibited for the duration of this project. A change that appears to need one is a true stop condition: open a separate Linear issue outside this project's implementation issues, state the evidence and options, and wait. The repo's migration folder is also known to be out of sync with production (62 names not in production history, 6 the other way), so a migration file must never be treated as proof of schema.

## 9. Protecting concurrent work

- Before every branch cut and every rebase: `git fetch`, then `git status` in the main checkout and `git worktree list`; record anything dirty in the PR description. Never stage, stash, reset, or clean another worktree.
- Known user-owned uncommitted work at Phase 0 (do not touch): the main checkout's Finance/Compliance (USA-190) changes, `app/dos/library-preview/`, `_to_delete/`, `scripts/tmp-usa151-screens.mjs`, and `supabase/migrations/20260825153213_usa_190_compliance_repairs.sql`.
- Branches that overlap this project's files and are not merged (`ryan/usa-163-journey-focused-revision`, `origin/codex/dos-ui-blitz`, `usa-168-consolidated` after `76a942e`) are inventoried in Phase 1; this project does not rebase, merge, or delete them.
- If `origin/main` receives a DOS commit during a phase, rebase and re-run the DOS regression scripts before continuing.

## 10. Phase gates

A gate is an evidence requirement. A phase is complete when: every acceptance criterion in its Linear issue is met; the phase's docs are merged; all applicable child issues are Done with evidence comments; the verification in §4 is recorded; risks, unresolved questions, and intentionally unchanged behavior are listed on the phase issue; and the phase issue comment names the next phase. The next phase starts automatically unless a true stop condition from the project's operating rules applies (contradictory approved rules, a material product decision, a migration/schema/auth/permission/destructive/architectural change, possible data loss, unverifiable identity or rollback target, V10-vs-production material conflict, unreliable tests, a Home redesign, a navigation change, an unprovable cleanup item, a preview ambiguity, or Linear explicitly requiring Ryan).

## 11. Implementation-issue report template

Every Phase 4–7 issue comment and PR description uses this shape:

```
Routes / components changed: …
Behavior intentionally preserved: …
Tests: typecheck ✓ build ✓ scripts: <list with pass/fail> new coverage: …
Screenshots: before/after at 390 and 1440 (links)
Accessibility / overflow: …
Known limitations / unresolved decisions: …
Commit / PR: …
Rollback: revert <sha>; production deployment before merge: dpl_…
```
