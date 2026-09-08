# DOS audit closeout — final report (USA-239)

Final: 2026-09-08. Every closeout PR is merged; production is the squash of PR #107 at `main` **0dcf304**. This report (PR #109) is the last docs-only merge and does not claim itself merged. Ancestry for every SHA below was verified with `git merge-base --is-ancestor` before each merge.

## 1. What merged, in the order it merged
| Order | PR | Squash commit on `main` | Content | Production after merge |
| --- | --- | --- | --- | --- |
| 1 | #106 | `8437b34` | Settled decisions: spec v1.2 §9, decision log §E, `app/dos/AGENTS.md`, `app/dos/README.md`, Phase 1 matrix historical (docs) | READY, site 200 |
| 2 | #108 | `d2a5103` | Deterministic demo clock (`DOS_DEMO_NOW` + faked browser clock), corrected reading-plan script, root `CLAUDE.md`, `AGENTS.md` DOS pointer, re-recorded baselines | READY, site 200 |
| 3 | #105 | `e4672fe` | USA-238 Kitchen Table Gospel Responses (conversational order, inline conditional gifts, one significant-outcomes row, historical outcomes preserved) with the server-side USAM boundary (403 for gated flows from generic workspaces) | READY, demo route 200, no runtime errors |
| 4 | #111 | `c3c8e17` | USA-242 compact accountability composer in Log Meeting and Person | READY, no runtime errors |
| 5 | #110 | `63c5b32` | USA-239 Phase 5 addendum, **reconciled**: reading-plan script appended to `test:dos` (43 scripts), `scripts/dos-dead-code-scan.mjs` (`npm run scan:dos-dead-code`), addendum note. Dropped: the twelve stale baseline PNGs, the Phase 8 a11y report and the script/doc edits the old branch carried — they were the pre-rebase copy of #108, already on `main` | READY |
| 6 | #107 | `0dcf304` | Revalidated cleanup (see §4) | READY, no runtime errors, full read-only production smoke green |
| 7 | #109 | this PR | Closeout README, verification and this report | docs only |

Superseded and closed: stale PR #100. Integration proof branch `ryan/usa-239-closeout-integration` (`c55e3b4`) served its purpose and can be deleted.

## 2. Production verification after the last merge
Deployment `dpl_FCLcZtSUmEvQ9KeBh66bSt19WST9` for `0dcf304`: READY, target production, aliased to usamissionaries.org and the other domains; Vercel runtime errors for the hour: none. Read-only Playwright smoke against production at 390px: Home renders Log Meeting; Log Meeting shows the Kitchen Table Gospel Responses row; the accountability composer opens with the goal field and Tracking select; Meetings → Timeline → detail renders; Person record renders; More → Fruit (with its Reviews section), Library, Prayer, My Record render with no horizontal overflow; no page or console errors. Legacy `/dos/[slug]/meetings` and `/people` pages still serve (200). Details: [verification.md](./verification.md).

## 3. Verification per PR
Every PR was rebased onto the `main` of its moment and re-verified before merging: `npm run typecheck`, `npm run test:dos` (41 → 43 scripts), join contract / preparation / join email / join release, `npm run build`, `npm run smoke`, `npm run test:dos:visual` (byte-for-byte; only intentional scenes re-recorded: #105 `mobile--log-meeting`, `mobile--library-resource`; #111, #110 and #107 changed nothing — 16/16 identical), `scripts/dos-a11y-responsive-verification.mjs` (7 widths, no overflow, opaque nav), and `npm run test:usa-168-person-ui`. GitHub's required check "Typecheck, build, and smoke" passed on every head. The informational Supabase Preview check reports "Remote migration versions not found in local migrations directory" on every push to `main`; it is not required, pre-dates this stack, and no Supabase setting was changed.

## 4. Deleted and deliberately retained (#107, approved by Ryan on 2026-09-08)
**Deleted, regenerated on `main` 63c5b32 (not rebased from the stale commit):** `src/components/dos/WorkspaceV2Shell.tsx`; `dos.html`; `app/dos/[collectiveSlug]/meetings/MeetingsWorkspaceClient.tsx`, `…/people/PeopleWorkspaceClient.tsx`, `…/people/[personId]/PersonRelationshipModal.tsx`, `…/people/[personId]/RelationshipInsightsPanel.tsx`; `src/lib/dos/workspace.ts`, `src/lib/dos/meetings.ts`, `src/lib/dos/people.ts`; **74** of the approved 76 zero-reference functions in `app/dos/app/DosMvpAppClient.tsx` (`ConversationFlowDetail` and `ConversationFlowExperience` had already been removed by #105). Client 46,450 → 44,340 lines; 8,745 lines removed in total. Nothing outside the approved manifest was deleted.
**Retained:** the 15 script-pinned functions; **15 second-order candidates** that lost their last caller only because an approved function was deleted (listed in the manifest; a later, separately approved PR); the legacy `app/api/dos/[collectiveSlug]/*` handlers (D4 → USA-241); the redirecting pages and `legacy-redirect.ts`; the demo route (D3); `AppButton tone="black"`; the CODEOWNERS rule for `dos.html`. Evidence and recovery: `../phase-7/usa-234-deletion-manifest.md` (recover any file or function with `git show 63c5b32:<path>`).

## 5. Finalized instruction precedence
For `app/dos/**`, `app/api/dos/**`, `src/components/dos/**`, `components/dos/**`, `src/lib/dos/**`: **Linear project and issue → canonical spec (`docs/dos-ui-refresh/phase-3/dos-ui-canonical-spec.md`, v1.2) → V10 reference (visual detail only) → `app/dos/README.md` → root `AGENTS.md` (website/admin; its DOS-specific statements superseded — D1) → phase evidence.** Entry points: `app/dos/AGENTS.md` (Codex), root `CLAUDE.md` (Claude), a DOS pointer at the top of root `AGENTS.md`. Superseded direction lives under `docs/archive/dos-ui-refresh-superseded/`.

## 6. Settled decisions
Settled by Ryan: D1, D2 (More), D5, D6, D7, D10, D12; three-tab navigation with production icons and an opaque background; Field inside More; Home protected; Kitchen Table capture USAM-specific and server-enforced; Kitchen Table question order, inline conditional gifts and the significant-outcomes row (USA-238, to be consolidated into one universal Observed Fruit under USA-243); the compact accountability composer (USA-242). Resolved from history: D8. Conservative dispositions carried forward: D3, D4, D9, D11.

## 7. Remaining decisions and follow-ups (Ryan's actions)
- **D4** legacy handlers: USA-241 holds the deprecation log line, 30-day traffic watch and removal criteria; no traffic in 7 days of logs.
- **D9** strict status checks: the only required check on `main` is **"Typecheck, build, and smoke"** (GitHub Actions app id 15368); `strict` is off and 0 approvals are required. Recommendation: enable "Require branches to be up to date before merging" for that same check name only. Repository setting; not changed.
- **D3** demo route in production: set `DOS_DISABLE_DEMO_PREVIEW=true` in the Vercel production environment to disable it; not changed.
- **D7** superseded remote branches safe to delete after the closeout is stable: `codex/dos-ui-blitz`, `clean/public-website-brand-refresh`, `ryan/usa-138-dos-full-product-run-through-and-cleanup-audit-first-then`, `claude/usa-138-dos-v3-solo`, `ryan/usa-163-journey-v2-polish-replace-week-card-stack-with-compact`, `ryan/usa-164-people-home-v2-canonical-discipleship-workflow-prototype`; plus the merged stack branches `ryan/usa-192…usa-199`, `ryan/usa-208…usa-231`, `ryan/usa-234-deletions`, `ryan/usa-234-phase-7-cleanup`, `ryan/usa-239-closeout-integration`, `claude/kitchen-table-log-meeting-3jcrli`. Remote operations, not performed.
- **USA-240** Person views Segmented control 44px hit area (USA-236 regression).
- **USA-243** unify fruit evidence (Kitchen Table significant outcomes → universal Observed Fruit) — starts after this closeout.
- Second-order dead functions (15) — a later approved cleanup PR.

## 8. Rollback
Each merge is one squash commit; `git revert <sha>` applies cleanly in reverse order (`0dcf304`, `63c5b32`, `c3c8e17`, `e4672fe`, `d2a5103`, `8437b34`). No schema, environment or data change was introduced, so Vercel's instant rollback to any earlier production deployment remains the fastest path. Deleted code recovers from `git show 63c5b32:<path>`.

## 9. Recommendation
Broad DOS UI refinement can safely resume. The settled rules are in the spec, the verification harness is deterministic and in CI, and production has been verified after every merge.
