# DOS MVP Architecture

`/dos/app?workspace=...` is the mobile-first Field app for fast discipleship activity. DOS is the platform; USA Missionaries is the first major network running on DOS.

## DOS Core And USAM

DOS Core is the universal discipleship operating system. It owns people, meetings, fruit, prayer, notes, workspace activity, and the daily ministry loop.

USA Missionaries Missionary Workspace is an implementation layer built on top of DOS Core. It adds missionary profiles, public pages, fundraising, support workflows, prayer-team infrastructure, publishing controls, and USAM-specific operations.

Non-USAM DOS users should still be able to use DOS mobile and DOS desktop without seeing USAM-specific missionary, fundraising, support, donor, or public-profile workflows.

## Mobile And Desktop

DOS mobile app is The Field:

- Fast, simple, action first, and mobile first.
- Optimized for quick add, quick logging, prayer, follow-up, and relationship activity.
- Should stay lightweight and avoid feeling like a bloated CRM.

Desktop dashboard and Command Center are The Hub:

- Richer admin, analytics, CSV import, workspace management, reporting, and organization visibility.
- Missionary Workspace lives at `/admin/missionary-profiles` for the USAM implementation.
- Desktop can support more detail, but should still stay clean, restrained, and operational.

## Canonical People Model

`missionary_field_people` is the canonical DOS people table.

- Mobile quick add writes to `missionary_field_people`.
- Mobile people read/list/detail uses `missionary_field_people`.
- Missionary Workspace desktop Add/Edit Person writes to `missionary_field_people`.
- Missionary Workspace CSV import writes to `missionary_field_people`.
- `workspace_id` is the primary scoping column.
- `household_id` fallback exists only for backward compatibility with older/local schemas and should be removed once all environments are fully migrated.

Do not introduce another people, contact, disciple, or relationship table for the same core model.

## Meetings Discipleship Engine

`missionary_tables` is the active DOS meeting model.

- Meetings separate Meeting Context from Conversation Flow.
- Meeting Context records how the interaction happened, such as Kitchen Table, Coffee, Phone, Zoom, Text, Prayer, Group, Discipleship, or Other.
- Conversation Flow records what spiritual guide was used. `None` is the universal default.
- Kitchen Table Gospel is currently gated to USAM Missionary Workspaces.
- Kitchen Table Gospel responses are stored as flexible private JSONB on the meeting record so future flows can expand without a migration for every question.
- Recommended resources are queued on the meeting record. DOS does not automatically send texts, emails, or shared guides yet.
- Future work: move resource recommendations to a database-backed library and add explicit SMS/email/share actions.

## Active Route Boundary

- Canonical DOS route: `/dos/app?workspace=<slug>`.
- Canonical Missionary Workspace route: `/admin/missionary-profiles`.
- Canonical DOS data helper: `src/lib/dos/missionary-app.ts`.
- Canonical workspace identity: `missionary_households.id`, resolved from the workspace slug.
- Canonical activity tables: `missionary_field_people`, `missionary_tables`, `missionary_connection_logs`, `missionary_fruit_items`, and shared workspace tables used by Missionary Workspace.
- Keep DOS-specific UI under `app/dos/app`.
- Do not import Command Center shells, admin navigation, profile management tools, or analytics panels into the mobile DOS route.
- Shared backend/data helpers are allowed when they remain UI-neutral.

## Legacy Guardrails

- Do not revive old legacy people/contact models.
- Do not introduce duplicate people tables.
- Legacy `/dos/[collectiveSlug]` prototype routes redirect to `/dos/app?workspace=[collectiveSlug]`.
- Legacy collective helpers (`src/lib/dos/workspace.ts`, `src/lib/dos/people.ts`, `src/lib/dos/meetings.ts`) remain only for reference until fully removed.
- Do not build new features on the collective `organizations` / `collectives` / `people` / `meetings` prototype model.
- Active `/dos/app` and Missionary Workspace should stay aligned on the same canonical DOS models.

## Product Direction

- Keep DOS simple.
- Prefer action-first UI and short labels.
- Avoid excessive copy and architecture explanations in product surfaces.
- Mobile flows should be fast enough for real field use.
- Desktop can contain deeper management, imports, and reporting, but should not feel bloated.
- Demo and marketing previews belong under `/system/preview`, not inside the active DOS app route.
- DOS Core users can add people, log meetings, track fruit, view personal metrics, and upload CSV only when enabled.
- Public Profiles, fundraising, prayer team pages, support team tools, approved fruit publishing, national rollups, and coaching/accountability visibility are network-level unlocks.
- Private DOS activity stays private by default. Organization/church rollups require an explicit sharing opt-in.
