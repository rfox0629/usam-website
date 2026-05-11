# DOS Route Boundary

`/dos/app?workspace=...` is the mobile-first Field app for fast discipleship activity. DOS is the platform; USA Missionaries is one network running on DOS.

- Canonical DOS route: `/dos/app?workspace=<slug>`.
- Canonical Missionary Workspace route: `/admin/missionary-profiles`.
- Canonical DOS data helper: `src/lib/dos/missionary-app.ts`.
- Canonical workspace identity: `missionary_households.id`, resolved from the workspace slug.
- Canonical activity tables: `missionary_field_people`, `missionary_tables`, `missionary_connection_logs`, `missionary_fruit_items`, and shared workspace tables used by Missionary Workspace.
- Keep DOS-specific UI under `app/dos/app`.
- Do not import Command Center shells, admin navigation, profile management tools, or analytics panels here.
- Shared backend/data helpers are allowed when they remain UI-neutral.
- Legacy `/dos/[collectiveSlug]` prototype routes redirect to `/dos/app?workspace=[collectiveSlug]`.
- Legacy collective helpers (`src/lib/dos/workspace.ts`, `src/lib/dos/people.ts`, `src/lib/dos/meetings.ts`) remain only for reference until fully removed. Do not build new features on the collective `organizations` / `collectives` / `people` / `meetings` prototype model.
- Demo and marketing previews belong under `/system/preview`, not inside the active DOS app route.
- DOS Core users can add people, log meetings, track fruit, view personal metrics, and upload CSV only when enabled.
- Public Profiles, fundraising, prayer team pages, support team tools, approved fruit publishing, national rollups, and coaching/accountability visibility are network-level unlocks.
- Private DOS activity stays private by default. Organization/church rollups require an explicit sharing opt-in.
