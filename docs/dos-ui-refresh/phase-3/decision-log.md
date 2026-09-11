# Phase 3 — Decision log and review package (USA-210)

Presented for Ryan's review. The specification consolidates approved direction and verified behavior; the items below are the only places where a choice was made or is still open.

## A. Choices made in the specification (all within already-approved direction)

| # | Choice | Basis | Reversible? |
| --- | --- | --- | --- |
| S-1 | Token values follow V10 where V10 defines them (`#0B1220`, `#5A6473`, `#9AA3B2`, `#E5E8EF`, `#2251E8`, `#1E3FB8`, `#F1F4FF`, `#E4EAFF`, `#F7F8FB`, radii 12/20/999, float shadow); USA-168 token names kept; production-only hex values retired. | Project: "V10 is the primary visual reference"; Phase 1 C10 named V10 the tie-breaker. | Yes — values in one file. |
| S-2 | `#5A6473` is the floor for readable text; `#94A3B8` and 8/9/10px readable text are retired. | Project guardrail "remove very light gray text"; `text-tokens.ts`. | Yes. |
| S-3 | Section eyebrows are blue (V10); grey sub-eyebrows remain available only for true nested groupings. Person's named overview sections are all blue. | V10 §2, §8; founder clarification USA-236. | Yes. |
| S-4 | Home keeps its gradient background and `#2563EB` until a Home decision exists; only 1:1 text-color mappings may touch it, verified by screenshot. | Project: Home unchanged. | n/a |
| S-5 | Desktop is treated by rule (tokens + components), layout untouched. | V10 has no desktop frames. | n/a |
| S-6 | Production defaults are kept wherever V10 shows a different default that is marked "Product logic — later" (Log context "In person" not "Coffee"; duration default 30m; circle at creation allowed; Repeat/reminder defaults; "Feedback" label). | Operating rule: never guess product logic. | Yes. |
| S-7 | The More-tab "+" FAB is kept (production shortcut menu). | D12 pending. | Yes. |
| S-8 | Meetings month/week "View" control is kept alongside the new Calendar/Timeline rail; search stays on Timeline and, until decided, also on Calendar as today. | B8 (no control removal without approval). | Yes. |
| S-9 | Rhythm pills on Field rows are not built; no per-person rhythm exists in data. | `missionary-app.ts` line 174. | n/a |
| S-10 | My Record "Current" shows only what production already treats as active, or is hidden; no new aggregate. | D10 pending. | Yes. |
| S-11 | Nav clearance constant 134px; z-index ladder fixed to eleven named layers. | V10 nav spec + Phase 2 inventory. | Yes. |
| S-12 | `app/dos/README.md` amended now (docs only): points to the spec, describes the demo route truthfully, allows primitives under `src/components/dos/`. | Phase 1 S2. | Yes. |
| S-13 | `AGENTS.md` is **not** edited; the spec declares its DOS statements superseded for `app/dos/**` pending D1. | Phase 1 D1. | — |

## B. Open questions for Ryan at Phase 3 (historical — outcomes in §E)

| Id | Question | Recommended answer | Blocks |
| --- | --- | --- | --- |
| D1 | Confirm the precedence statement and that `AGENTS.md` DOS statements are superseded for `app/dos/**`. | Yes; add a DOS section to `AGENTS.md` in Phase 7. | nothing |
| D2 | Rename "More" → "Apps"? | — | USA-223 label only |
| D3 | Demo route in production. | Disable via env; keep for local/preview. | nothing |
| D4 | Delete legacy prototype API handlers in Phase 7? | Yes, with approval. | USA-234 |
| D5 | "Household" copy per terminology doc? | Defer. | nothing |
| D6 | Groups V2 promote vs refresh default path? | Default path only. | USA-228 |
| D7 | Unmerged usa-163/164/138 branches? | Superseded; leave unmerged. | nothing |
| D8 | What is `app/dos/library-preview/`? | — | USA-225 |
| D9 | Strict status checks on `main`? | Yes. | nothing |
| D10 | My Record "Current" rule. | Active journeys/resource assignments + in-progress assessments; hidden when empty. | USA-220 Overview section only |
| D11 | Field Needs-placement bounded block. | Approve the V10 sheet up to ~6, pushed list beyond. | USA-227 |
| D12 | Keep the More-tab "+" FAB? | Keep. | USA-223 |
| PL-3 | Log form: future-date rule (block vs redirect), 4-hour confirm, default duration, Fruit on the form. | Block with instruction; confirm past 4h; 30m; keep Fruit where production has it. | USA-216 polish only |
| PL-6 | Empty-day sheet; Schedule pre-fills the tapped date. | Sheet with "Nothing on <date>" + Schedule; yes pre-fill. | USA-218 polish only |
| PL-7 | "Follow-up" vs "Feedback"; Upcoming empty state shows Schedule inside the card? | "Feedback" until decided; yes Schedule inside. | USA-222 polish only |

## C. Gate statement

The specification only consolidates already-approved direction and verified existing behavior, records its sources and precedence (§0), and lists every unresolved decision (§9). Under the project's autonomous-execution instruction, the Phase 3 gate is therefore satisfied on publication, and Phase 4 (shared foundation) proceeds. Any answer above that changes data meaning, navigation, or an approved workflow will be applied as a spec revision (v1.1) before the affected Phase 5/6 issue starts.

## D. Pilot review (USA-224) — corrections applied as spec v1.1

All six pilots (USA-216, 217, 218, 222, 220, 223; PRs #87–#92) were built on the v1.0 spec. The findings below are the only places the spec needed correcting; each is marked *[v1.1]* in the spec.

| # | Finding | Correction | Where |
| --- | --- | --- | --- |
| P-1 | The PillRail's right-edge fade painted a white strip on short rails over tinted grounds. | Fade renders only while the rail overflows; `edgeInset` documented. | §3 PillRail |
| P-2 | V10 shows search on the Timeline only; production had it on the calendar, and B8 forbids removing it. | Search is shared by both Meetings views; leaving Calendar stays unresolved (PL-6). | §5.1 |
| P-3 | The calendar key would list six kinds even when absent. | Key lists only the kinds present. | §5.1 |
| P-4 | "set by you" on the Person header is not approved copy and has no data distinction. | Line reads `Relationship · My N`. | §5.6 |
| P-5 | "Upcoming" card label is a rename §6 does not approve. | "Next meeting" kept; recorded under PL-7. | §5.6 |
| P-6 | "Eyebrow never a bordered card" conflicted with the Person page's atmosphere ground. | The Right now band is one white surface with hairline groups; never nested cards. Groups / Reminder / Group gathering kept as further groups (B8). | §5.6 |
| P-7 | Desktop has no More launcher screen. | PageHeader "More" is mobile only. | §5.7 |
| P-8 | Spec named a My Record Settings control that does not exist. | None rendered. | §5.8 |
| P-9 | The visual suite drifted on the Dashboard at a UTC day boundary (demo due-date buckets). | **Resolved in the USA-239 closeout:** the demo fixture pins "today" with `DOS_DEMO_NOW` and the visual and accessibility suites fake the browser clock to the same instant (`2026-09-04T12:00:00-05:00` by default), so date-relative rows no longer drift. Baselines re-recorded once under the pinned clock. | §8 |
| P-10 (Phase 8) | The first accessibility sweep found refreshed controls under the 44px hit area (header chips, eyebrow text actions, Field rows, Person `PDButton`, overlay back arrows, task-screen back, date-picker button). | All raised to 44px in USA-233 without visual change beyond the taller Person buttons; the sweep script is kept as tooling. | §3, §8 |
| P-11 (Phase 8) | The PillRail's scroll-into-view could scroll the page on tab change; the visual suite could capture a transient scroll. | Rail scrolls itself horizontally only; the suite resets scroll before each capture. | §3 PillRail |
| P-12 (USA-236) | Person's three fixed views looked left-weighted as a scroll rail, “Right now” duplicated the grouping below it, and grey section labels weakened hierarchy. | Person uses the centered Segmented control; the umbrella heading is removed; named overview sections and meeting-card eyebrows are blue. | §3, §5.6 |

**Retired regression assertions (deliberate, recorded in their PRs):** `dos-field-contact-form` (USA-217, rewritten to the shipped USA-168 form); `dos-my-record` KPI-card assertions (USA-220, replaced by Current + Recent assertions).

**Gate statement (USA-193).** Previews exist for every pilot PR; workflows were exercised on the demo route and are unchanged in data and handlers; the corrections above are applied before USA-225. Ryan's review of the previews remains a Founder Review checkpoint on each issue; under the autonomous-execution instruction Phase 6 proceeds on stacked branches.

## E. Settlement (USA-239 closeout, Ryan, 2026-09-07)

| Id | Outcome | Recorded in |
| --- | --- | --- |
| D1 | Settled: the scoped canonical spec supersedes obsolete root `AGENTS.md` DOS statements for `app/dos/**`. | spec §0, `app/dos/AGENTS.md` |
| D2 | Settled: keep **More**; do not rename it Apps. | spec B2 |
| D3 | Policy: keep the DB-free demo route for local/preview; production disablement is an environment change documented separately, not applied here. | spec §9 |
| D4 | Open: legacy prototype API handlers are live HTTP surfaces — analysed in the deletion manifest, removed only with evidence and founder approval. | manifest |
| D5 | Settled: Household/Workspace copy changes deferred. | spec §9 |
| D6 | Settled: keep the current/default Groups path; Groups V2 not promoted here. | spec §9 |
| D7 | Settled: USA-138/163/164 UI branches superseded. | spec §9 |
| D8 | Resolved from history: `app/dos/library-preview/` untracked in `50b6b5f` (2026-08-21); nothing to reconcile. | spec §9 |
| D9 | Documented: required check "Typecheck, build, and smoke", strict off, 0 approvals; recommend strict on — repository setting for Ryan. | spec §9 |
| D10 | Settled: My Record Current = existing active data only; hidden when empty. | spec §5.8 |
| D11 | Open (conservative): shipped Needs-placement behavior preserved unless Ryan approves a replacement. | spec §5.11 |
| D12 | Settled: keep the More-tab FAB. | spec §5.7 |
| — | Settled: three-tab navigation with production icons and an opaque background; Field inside More; Home protected; Kitchen Table capture USAM-specific and enforced server-side (USA-238). | spec §9 preamble |

PL-1 … PL-10 remain open product-logic questions; production behavior stands for each.


## F. Reports & Ministry Intelligence (USA-249 / USA-251 / USA-257 / USA-260, 2026-09-09)

| Id | Outcome | Recorded in |
| --- | --- | --- |
| B1 (Home) | **Superseded for Home only by USA-257**, on founder direction of 2026-09-09: Today's Alignment leaves Home (My Record stays its own destination); Top Time Investments becomes the first reporting element with a **View Report** action that opens the Master Ministry Report; Table Activity is renamed **Meeting Activity** with honest definitions and moves up; Accountability becomes a compact attention summary; Recent Fruit and Recent Reviews move into Reports; Assigned Resources leaves Home until USA-258 proves the status source. **Settled by Ryan on 2026-09-09 (PR #130 review): USA-257 officially supersedes B1 for the approved Home sections.** | spec §1 B1 note, `scripts/dos-home-v1-regression.mjs` |
| R-1 | Reports is no longer a Coming Soon screen: it renders the Master Ministry Report / Time Investment (read-only, no data entry) followed by the Recent Fruit and Recent Reviews lists that left Home. | `src/components/dos/reports/`, `src/lib/dos/ministry-report.ts` |
| R-2 | Report contract (USA-250 recommendation, prototype only): 30-day default with 7 / 90 / custom; one row per person with qualifying activity; recorded time only, no estimates; check-ins separate; group time credited per person but never summed as elapsed time; Recorded / Partial / No qualifying activity; no circle field; no multiplication without an explicit record. Founder decisions listed in `docs/dos-ui-refresh/usa-249/metric-registry.md` §5. | metric registry, `scripts/dos-ministry-report-regression.mjs` |
| R-3 | **Rejected by Ryan (2026-09-09): no separate `discipleshipChain` model.** Person remains the canonical discipleship relationship record. Multiplication resolves from a downstream person's own confirmed, directed Person relationship (`role_in_my_life = discipling_them` in their workspace) reached through their DOS identity link; nothing is claimed until that link exists. | `ministry-report.ts` (`DosResolvedDownstreamRelationship`), metric registry §5 |
| R-4 | Ryan (2026-09-09): the Person's structured relationship is canonical for "Discipling me"; My Record must reference the same Person relationship rather than compete with it. The Dirk conflict warning stays in the prototype; reconciliation is documented in the registry §5. | `dosMinistryDirectionForPerson`, registry §5 |
| R-5 | Ryan (2026-09-09): meetings where someone disciples the missionary are included, but **Time I invested** and **Time invested in me** are separate lists and never ranked together. Check-ins stay their own column and never contribute to contact-time hours. | report module buckets, `scripts/dos-ministry-report-regression.mjs` |
| R-6 | Ryan (2026-09-09): "Recorded time" becomes **Logged duration** wherever the number is an entered duration; historical start times are synthetic and imply no clock-in precision. | report, Home, registry |
| R-7 | Ryan (2026-09-09): Learning's non-functional "future sharing" checkbox and its promise are removed; book notes are private until a real explicit-sharing feature exists. The stored flag is carried through untouched. | My Record Learning form |
| R-8 | Ryan (2026-09-09): the fixture keeps "Philip John Saco"; the production record's name is not touched. USA-258 stays separate; Reports must not trust a stale assignment status when canonical Journey progress exists. | fixture, registry §3 |
| R-11 | Ryan (2026-09-10, live-report review): one primary Time Investment table with one row per person (Person · Relationship · Meetings · Logged duration · Last activity · Multiplication · Fruit · Data status), filters All / I'm discipling / Discipling me / Relationship not set, ranges unchanged; "Direction unresolved" renamed **Relationship not set** (pill *Needs relationship*, blue); multiplication as a column with honest states (N people / Not recorded / Not resolved yet / Not connected / —), never a zero; confirmed relationships without activity on the same table, never tasks; What flows upward, the standalone multiplication and no-activity sections, next-action copy, and the Fruit / Reviews cards removed; a compact **Ministry Fruit** table from structured sources only (no KTG responses, no narrative). Desktop clipping fixed structurally (scroll container, sticky Person column). | registry §5b, `ministry-report.ts` (`rows`, `fruitRows`), report component, `scripts/dos-ministry-report-regression.mjs` §15–17 |
| R-12 | 2026-09-10: the loader reads only which people of the workspace carry a verified `dos_identity_links` row (`identityLinkedPersonIds`); it never reads another workspace. The downstream reader that would let the column say "Not recorded" or "N people" is still not built; production's single verified link is Ryan's own Person, so every production disciple reads "Not connected". | `missionary-app.ts`, registry §3 |
| C-2 | Ryan (2026-09-11, USA-269): unsaved work across DOS is measured from the user's first interaction with a surface, not from the primitive's first commit (which preceded the form's own initialisation and produced false "Discard changes?" warnings on fresh Log Meeting and similar screens). Search boxes, filters and other viewing controls (`data-unsaved="ignore"`, `type="search"`, `role="searchbox"`) never count. A surface that stays open after a successful save re-baselines through `savedRevision` (Edit group, Import Contacts); Add to group clears only the search after an addition and never touches an unfinished guest draft. The dialog reads **Leave without saving?** / "Your unsaved changes will be lost. Anything already saved will stay." / Keep editing · Leave without saving (Manage circles keeps its placement wording). | `unsaved-work.ts`, `DosSurfaces.tsx` (`useSurfaceBaseline`), `scripts/dos-unsaved-work-regression.mjs`, `docs/dos-ui-refresh/usa-269/` |
| C-1 | Ryan (2026-09-11, USA-266): Manage circles' unsaved work is exactly the difference between proposed and confirmed placements; search, filters, the Household toggle, and opening or closing a person never count. Back leaves at once when nothing is pending; with pending edits the dialog reads **Leave without saving?** / "Only your unsaved changes will be lost. Saved placements will stay." / Keep editing · Leave without saving. A successful save updates rows from the server response, collapses the editor, clears the draft, exits review, and shows a brief Saved; rows say "My 70 · Not saved" until persistence succeeds. Filters are All | Confirmed | Unplaced (Reviewed and Changed removed; the deliberate not-placed state is still stored and labelled); the "No changes to review" footer is gone; a discreet Household toggle (off) hides unplaced Household-only people only. `DosWorkflowPage` gains optional `isDirty` / `discardCopy` / `backDisabled`; other task screens are unchanged. | `ManageCirclesWorkflow`, `DosSurfaces.tsx`, `unsaved-work.ts`, `scripts/dos-circle-tiers-regression.mjs`, `docs/dos-ui-refresh/usa-266/` |
| R-10 | Ryan (2026-09-09, third review): no yellow, amber, orange, or red in Reports or Home. Blue = neutral, partial, unresolved, attention, next action; green = confirmed only; white / grey = ordinary surfaces. Guarded by the report and Home regression scripts. | report component, `scripts/dos-ministry-report-regression.mjs`, `scripts/dos-home-v1-regression.mjs` |
| R-9 | Ryan (2026-09-09, second review): a meeting's direction is classified by a recorded meeting role, else by the confirmed structured Person direction of everyone present, else it is **Direction unresolved** (missing, unconfirmed-by-My-Record-only, conflicting, or mixed directions). Nothing is defaulted to Time I invested; notes are never read; no migration. My Record discipleship meetings are a separate record type that can overlap logged meetings and are not combined until a stored link exists. | registry §6, `dosMinistryClassifyMeeting`, `scripts/dos-ministry-report-regression.mjs` |
| L-1 | Visible product language is discipleship language (USA-260): "Discipling me", "I am discipling", "Being discipled by …", "People Discipling Me", "Discipleship meeting". Legacy enum values, API keys, columns, and stored labels ("Mentor") are unchanged and rendered through the new words. | PR #129 (reconciled) |
