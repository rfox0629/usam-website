# DOS audit closeout — final report (USA-239)

Date: 2026-09-07. Baseline `main` = `e30a49e` (DOS UI Foundation V1 released 2026-09-06 plus USA-235/236/237). Nothing in this closeout is merged or deployed; every change is a PR for Ryan.

## 1. PRs in merge order
| Order | PR | Branch | Content | Merge status |
| --- | --- | --- | --- | --- |
| 1 | #106 | `ryan/usa-239-decisions-reconciliation` | Settled decisions: spec v1.2 §9, decision log §E, `app/dos/AGENTS.md`, `app/dos/README.md`, Phase 1 matrix banner, refresh index (docs only) | **Safe to merge** |
| 2 | #108 | `ryan/usa-239-tooling-drift` | Deterministic demo clock (`DOS_DEMO_NOW` + faked browser clock), corrected reading-plan script, root `CLAUDE.md` + `AGENTS.md` DOS pointer, re-recorded baselines | **Safe to merge** (no product change) |
| 3 | #105 | `usa-238-kitchen-table-responses` | USA-238 Kitchen Table responses (Codex) + Claude review + **server-side USAM boundary** in the meetings API | **Ready for Ryan's review** (product feature; USA-238 asked for explicit approval). After merging, re-record `mobile--log-meeting` and `mobile--library-resource` under the pinned clock (its two intended visual changes) |
| 4 | #107 | `ryan/usa-239-cleanup-revalidated` | Revalidated dead-code cleanup (draft) | **Requires explicit founder approval** (destructive). Conflicts trivially with #105 in `DosMvpAppClient.tsx`; rebase after #105 and keep #105's code (as done on the integration branch) |

Integration proof of the whole set: `ryan/usa-239-closeout-integration` (`c55e3b4`, pushed for a combined Vercel preview; not a PR). Stale PR #100 is closed with a pointer to #107.

## 2. Safe to merge now
#106 and #108 (docs, tooling, instructions, baselines). Order does not matter between them; both are based on `main`.

## 3. Still requires explicit approval or decision
- **#105** — product feature review (Ryan asked to approve after Claude's review). The boundary is enforced server-side; generic workspaces receive 403 for a gated flow.
- **#107** — deletion of proven-dead code (cleanup/deletion rule).
- **D4 — legacy API handlers** `app/api/dos/[collectiveSlug]/{people,meetings,relationships,people/[personId]/insights}/route.ts`: live HTTP surfaces, untouched. Evidence for a separate removal PR: no repository caller once #107 lands; 7 days of production runtime logs show only `/api/dos/app/*` requests. Recommendation: approve removal in its own PR.
- **D9 — strict status checks**: `main` requires "Typecheck, build, and smoke" with strict mode off and no required approvals. Recommendation: turn strict on (repository setting; not changed).
- **D3 — production demo route**: keep for local/preview; if it should be off in production, set `DOS_DISABLE_DEMO_PREVIEW=true` (environment change; not changed).
- **D11 — Needs-placement block**: shipped behavior preserved; only Ryan can approve the V10 block.
- **Remote branches** `codex/dos-ui-blitz`, `clean/public-website-brand-refresh`, USA-138/163/164 UI branches: superseded (D7); deleting them is a remote operation for Ryan.

## 4. Files deleted and deliberately retained (#107)
**Deleted (proven unreferenced on current `main`):** `src/components/dos/WorkspaceV2Shell.tsx`; `dos.html`; 76 zero-reference functions in `app/dos/app/DosMvpAppClient.tsx` (2,218 lines; 46,110 → 43,807); `app/dos/[collectiveSlug]/meetings/MeetingsWorkspaceClient.tsx`, `…/people/PeopleWorkspaceClient.tsx`, `…/people/[personId]/PersonRelationshipModal.tsx`, `…/people/[personId]/RelationshipInsightsPanel.tsx`; `src/lib/dos/workspace.ts`, `src/lib/dos/meetings.ts`, `src/lib/dos/people.ts`.
**Retained:** 15 script-pinned zero-reference functions (`AssessmentResultSummaryCard`, `FollowUpDetailCard`, `FruitOutcomesDetailCard`, `GrowthMilestoneRow`, `MyRecordAssessmentsPanel`, `MyRecordLearningPanel`, `MyRecordPreviewCard`, `MyRecordPropheticOverviewCard`, `NotesReflectionDetailCard`, `PDPill`, `PrayerTeamCountVisibilityToggle`, `ResourceAssignmentCard`, `TableActionsDetailCard`, `TableRolePicker`, `WeekStatTile`); the legacy API handlers (D4); the redirecting pages and `legacy-redirect.ts`; the demo route (D3); `AppButton tone="black"` (design follow-up); the CODEOWNERS rule for `dos.html` (now matches nothing). Full table with evidence and recovery: `../phase-7/usa-234-deletion-manifest.md`.

## 5. Finalized instruction precedence
For `app/dos/**`, `app/api/dos/**`, `src/components/dos/**`, `components/dos/**`, `src/lib/dos/**`: **Linear project and issue → canonical spec (`docs/dos-ui-refresh/phase-3/dos-ui-canonical-spec.md`, v1.2) → V10 reference (visual detail only) → `app/dos/README.md` → root `AGENTS.md` (website/admin; its DOS-specific statements superseded — D1) → phase evidence.** Entry points: `app/dos/AGENTS.md` (Codex, nested), root `CLAUDE.md` (Claude), a DOS pointer at the top of root `AGENTS.md`. Superseded direction lives under `docs/archive/dos-ui-refresh-superseded/`.

## 6. Settled decisions and superseded rules
Settled by Ryan: D1, D2 (More), D5 (copy deferred), D6 (default Groups path), D7 (old branches superseded), D10 (Current = existing active data, hidden when empty), D12 (More FAB kept); three-tab navigation with production icons and opaque background; Field inside More; Home protected; Kitchen Table capture USAM-specific and server-enforced. Conservative: D3, D4, D9, D11. Resolved from history: D8. Superseded rules: the root `AGENTS.md` DOS statements listed in Phase 1 §3; the "← More" pill, gold eyebrows, light-grey text and the other §10 patterns; the documents under `docs/archive/dos-ui-refresh-superseded/`.

## 7. Verification results
See [verification.md](./verification.md): every suite green on the integration branch; the visual suite's two differences are #105's intended changes; the a11y sweep is clean except the USA-236 Segmented hit area (USA-240); no closeout regression.

## 8. Rollback
- Each PR is a single commit (#105 has three: Codex, review, boundary); `git revert` applies cleanly per PR. Merge order above keeps reverts independent except #107, which must be reverted before #105 if both are in.
- Production rollback remains Vercel's instant rollback to the deployment of `e30a49e` (current) — no schema, env or data change is introduced by any closeout PR.
- Deleted code recovers from the parent of #107's commit (`git show <parent>:<path>`).

## 9. Known limitations and follow-ups
- #105's two visual baselines need re-recording after #108 (pinned clock) lands.
- USA-240: Person views Segmented control hit area (USA-236 regression).
- 15 dead functions remain script-pinned; retiring them means editing guards deliberately.
- D4 handler removal, D9 repository setting, D3 environment change: Ryan's actions.

## 10. Recommendation on resuming broad DOS UI refinement
**Ready, with two conditions:** merge #106 and #108 first (so every future PR verifies against deterministic baselines and the settled spec), and decide #105 before any further Log Meeting work. Broad refinement can then resume under the settled rules; #107 and the D4/D9/D3 items can proceed independently on Ryan's approval.
