# USA-228 — Batch: Groups, Journeys, and participant views

Docs and evidence only (no further code beyond USA-229 and USA-225). The batch's constraint is the deliverable: assignment context, progress, group/person separation, saved reflections, schedules, permissions and back-navigation behavior must not change. Everything these surfaces receive comes from the shared rules already applied.

## What reached these surfaces, and how
| Surface | Received through | Structure / behavior |
| --- | --- | --- |
| Groups list (`activeMoreAppView === "groups"`, default path) | USA-229: `TabPageHeader` → canonical header with Directory Link / New Group as trailing actions; `SectionHeading` → blue eyebrows; `CompactButton` tokens | My Groups / All Groups toggle, search, group cards (logo mark, type badge, rhythm, next gathering, members, leaders, Copy Link / Public Page) unchanged |
| Group detail | USA-229: canonical back control and eyebrows | Members, gatherings, journeys (assignment instances per USA-170), attendance, prayer, join requests, settings sheets unchanged |
| Journey overview (`GuidedJourneyUi`, reached from a Person's "Continue" or a Group journey) | **Nothing** — the component is shared with the public participant portal and pinned by `dos-participant-preview-parity` (B14) | Progress, step selector, responses, "Save and finish later", Complete: as production. Spec §5.9's task-screen step and "complete requires response" stay unresolved (PL-9) |
| Participant views (`/groups/[slug]`, `GroupHomeMemberView`, `MemberGroupHomePreview`) | **Nothing** (parity-pinned; public surface outside `app/dos/**` receives tokens only where components are shared) | Unchanged |
| Assign a Journey sheet | USA-225: "Assign to someone" label, blue primary | Person picker, duplicate handling ("already has this Journey"), assignment instance creation unchanged |

## Decisions kept open
- **D6** Groups V2 promotion vs the default path: only the default path is refreshed (decision log S-6 / D6). No V2 flag or route was touched.
- **PL-9** Library/journey: resource-type colour, complete-requires-response, push vs expand for steps.

## Tests
- `dos-groups` ✓, `dos-legacy-group-assignment` ✓, `dos-group-member-portal` ✓, `dos-participant-preview-parity` ✓, `dos-guided-resources` ✓, `dos-resource-assignments` ✓ — all inside `npm run test:dos`, green on every Phase 6 PR.

## Screenshots
`./screenshots/usa-228/` — the leader journey progress sheet (top / end) opened from a Person's Continue (the participant-facing `GuidedJourneyUi` sits behind "Preview Participant View" and is untouched), and the Group detail end (USA-229 header and eyebrows applied). Groups list and detail top captures are in `../screenshots/usa-229/`.

## Rollback
Nothing to roll back beyond USA-229 / USA-225.
