# DOS UI System Audit & Visual Refresh — Phase 5: representative pilot

Linear: USA-193 (phase) · USA-216 Log/Edit Meeting · USA-217 Schedule Meeting and Add/Edit Person · USA-218 Meetings Calendar/Timeline · USA-222 Person Record · USA-220 My Record · USA-223 Apps launcher · USA-224 gate and spec corrections. One stacked PR per issue (#87 → #88 → #89 → #90 → #91 → #92 → #93), each left unmerged for Ryan per repository merge policy. Every PR has a Vercel preview (SSO-protected, shared production database; the demo route `/dos/app/preview?demo=dos2026` renders synthetic data).

| Issue | PR | Preview | Evidence | Visible change |
| --- | --- | --- | --- | --- |
| USA-216 | #87 | [preview](https://usam-website-git-ryan-usa-21-21dfc2-ryan-foxs-projects-9a51a4d5.vercel.app) | [usa-216-log-and-edit-meeting.md](./usa-216-log-and-edit-meeting.md) | Log / Edit Meeting: sentence-case sections, duration stepper, attendee chips, spec primary |
| USA-217 | #88 | [preview](https://usam-website-git-ryan-usa-21-253348-ryan-foxs-projects-9a51a4d5.vercel.app) | [usa-217-schedule-meeting-and-add-person.md](./usa-217-schedule-meeting-and-add-person.md) | Schedule Meeting and Add/Edit Person on the same grammar; stale field-contact script retired |
| USA-218 | #89 | [preview](https://usam-website-git-ryan-usa-21-99d73f-ryan-foxs-projects-9a51a4d5.vercel.app) | [usa-218-meetings-calendar-and-timeline.md](./usa-218-meetings-calendar-and-timeline.md) | Calendar \| Timeline rail; calendar no longer repeats history; logged-only Timeline |
| USA-222 | #90 | [preview](https://usam-website-git-ryan-usa-22-217159-ryan-foxs-projects-9a51a4d5.vercel.app) | [usa-222-person-record-overview.md](./usa-222-person-record-overview.md) | Person: PillRail, Last / Next cards with chevrons, "Right now" band with sub-eyebrows, capped lists |
| USA-220 | #91 | [preview](https://usam-website-git-ryan-usa-22-30882c-ryan-foxs-projects-9a51a4d5.vercel.app) | [usa-220-my-record.md](./usa-220-my-record.md) | My Record: PageHeader + Private chip, PillRail, Overview = Current + Recent |
| USA-223 | #92 | see PR | [usa-223-apps-launcher.md](./usa-223-apps-launcher.md) | More: PageHeader, compact spec tiles with StatusPill |
| USA-224 | #93 | see PR | [usa-224-pilot-gate.md](./usa-224-pilot-gate.md) | None (spec v1.1 corrections and this index) |

## What the pilot proved
- The shared grammar (tokens, PageHeader, Eyebrow, PillRail, Row, Card, StatusPill, Stepper, Chip, Button) covers six unrelated surfaces without any new one-off style.
- Structural changes were bounded to exactly what the issues named; every handler, sheet, save path, deep link and data contract is unchanged (B8, B10), and the protected surfaces (Home, Dashboard, nav, Person Timeline/Details) have byte-identical visual baselines across all six PRs.
- Two regression scripts asserted retired layouts; both were replaced deliberately with assertions for the approved layout and recorded in their PRs (USA-217 `dos-field-contact-form`, USA-220 `dos-my-record` KPI cards). No assertion was weakened silently.

## Gate check (USA-193: "Production-like mobile and desktop previews are reviewed and approved. Findings update the canonical spec before Phase 6.")
- Previews: one per PR above; screenshots at 390×844 @2x (plus 320 for rails) and 1440×900 in each evidence page; workflows exercised on the demo route (log, schedule, add person, calendar/timeline, person overview, my record, launcher).
- Findings are recorded as canonical spec v1.1 corrections in [usa-224-pilot-gate.md](./usa-224-pilot-gate.md) and applied to `phase-3/dos-ui-canonical-spec.md` before USA-225 starts.
- Ryan's approval of the previews is a checkpoint for later review (Founder Review on each issue); per the autonomous-execution instruction Phase 6 proceeds on stacked branches.

## Deliberately not done in Phase 5
No product decision in spec §9 was guessed (labels "More", "Feedback", "Next meeting" kept; circle at creation, defaults, week view, search on Calendar as production). Walk / Growth / Purpose / Faithfulness content, Timeline / Details tabs, and every non-pilot screen are untouched until their Phase 6 batch.
