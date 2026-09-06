# DOS UI System Audit & Visual Refresh — Phase 6: remaining screen batches

Linear: USA-197 (phase) · USA-227 People and Field · USA-226 Prayer and My Record sections · USA-229 shared controls and remaining surfaces · USA-225 Community, Fruit, Library, Reports · USA-228 Groups, Journeys, participant views · USA-230 protected Home. One stacked PR per batch (#94 → #95 → #96 → #97 → #98), each left unmerged for Ryan per repository merge policy; every PR has a Vercel preview.

| Issue | PR | Evidence | Visible change |
| --- | --- | --- | --- |
| USA-227 | #94 | [usa-227-people-and-field.md](./usa-227-people-and-field.md) | Field: PageHeader + Settings chip, SearchField, PillRail circles, rows with relationship · circle · last met, Log meeting shortcut kept |
| USA-226 | #95 | [usa-226-prayer-and-my-record-sections.md](./usa-226-prayer-and-my-record-sections.md) | Prayer: PageHeader, PillRail, eyebrow + filter, "N open", initials rows; My Record panel tokens |
| USA-229 | #96 | [usa-229-shared-controls-and-remaining-surfaces.md](./usa-229-shared-controls-and-remaining-surfaces.md) | Every More sub-view: canonical header, back arrow, blue eyebrows, compact buttons; Fruit/Library page headers |
| USA-225 | #97 | [usa-225-community-fruit-library-reports.md](./usa-225-community-fruit-library-reports.md) | Library resource page on the spec header; "Assign to someone" |
| USA-228 | #98 | [usa-228-groups-journeys-participant.md](./usa-228-groups-journeys-participant.md) | None beyond #96/#97 (parity-pinned journey/participant views untouched) |
| USA-230 | #98 | [usa-230-home-protected.md](./usa-230-home-protected.md) | None (Home byte-identical across the stack) |

## Gate check (USA-197: "Every batch verified; Home unchanged")
- Each batch passed `npm run typecheck`, the 40-script `npm run test:dos` aggregate, `npm run build`, and the visual suite, which grew from 9 to 16 scenes across Phase 6; in every batch the only baseline differences were the batch's own new scenes.
- Home (`mobile--home.png`) has never been re-recorded since it was first captured in USA-215; the Dashboard baseline changed once for demo clock drift (USA-218, P-9).
- Loading, empty, error, permission, confirmation and destructive states: empty states moved to the shared `EmptyState` where a batch touched a list (Field, Prayer); every other state keeps its production component and copy (spec §5.12).

## Deliberately not done in Phase 6
`AppButton` primary gradient (pinned by the controls script; §10 retirement is a manifest item), `UserProfileAvatar` (Home), `TabHero` on desktop (B12), `GuidedJourneyUi` and participant views (B14), the Needs-placement block (D11), Prayer follow-up pill (prayer guard), the Library assign helper sentence (no approved copy), My Record per-tab restructure (PL-8), Groups V2 (D6).
