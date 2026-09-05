# Phase 3 — Decision log and review package (USA-210)

Presented for Ryan's review. The specification consolidates approved direction and verified behavior; the items below are the only places where a choice was made or is still open.

## A. Choices made in the specification (all within already-approved direction)

| # | Choice | Basis | Reversible? |
| --- | --- | --- | --- |
| S-1 | Token values follow V10 where V10 defines them (`#0B1220`, `#5A6473`, `#9AA3B2`, `#E5E8EF`, `#2251E8`, `#1E3FB8`, `#F1F4FF`, `#E4EAFF`, `#F7F8FB`, radii 12/20/999, float shadow); USA-168 token names kept; production-only hex values retired. | Project: "V10 is the primary visual reference"; Phase 1 C10 named V10 the tie-breaker. | Yes — values in one file. |
| S-2 | `#5A6473` is the floor for readable text; `#94A3B8` and 8/9/10px readable text are retired. | Project guardrail "remove very light gray text"; `text-tokens.ts`. | Yes. |
| S-3 | Section eyebrows are blue (V10); grey sub-eyebrows inside a section (Person "Right now"). | V10 §2, §8. | Yes. |
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

## B. Open questions for Ryan (none blocks Phase 4; the affected Phase 5/6 issue is named)

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
| P-9 | The visual suite drifted on the Dashboard at a UTC day boundary (demo due-date buckets). | Drift rule recorded; freezing the demo clock is a Phase 7 candidate. | §8 |
| P-10 (Phase 8) | The first accessibility sweep found refreshed controls under the 44px hit area (header chips, eyebrow text actions, Field rows, Person `PDButton`, overlay back arrows, task-screen back, date-picker button). | All raised to 44px in USA-233 without visual change beyond the taller Person buttons; the sweep script is kept as tooling. | §3, §8 |
| P-11 (Phase 8) | The PillRail's scroll-into-view could scroll the page on tab change; the visual suite could capture a transient scroll. | Rail scrolls itself horizontally only; the suite resets scroll before each capture. | §3 PillRail |

**Retired regression assertions (deliberate, recorded in their PRs):** `dos-field-contact-form` (USA-217, rewritten to the shipped USA-168 form); `dos-my-record` KPI-card assertions (USA-220, replaced by Current + Recent assertions).

**Gate statement (USA-193).** Previews exist for every pilot PR; workflows were exercised on the demo route and are unchanged in data and handlers; the corrections above are applied before USA-225. Ryan's review of the previews remains a Founder Review checkpoint on each issue; under the autonomous-execution instruction Phase 6 proceeds on stacked branches.

