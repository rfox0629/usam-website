# DOS MVP Architecture

`/dos` is the user-facing DOS entry point for login, onboarding, and workspace selection. `/dos/[workspace-slug]` is the launch DOS app route for fast discipleship activity. DOS is the platform; USA Missionaries is the first major network running on DOS.

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
- Table Conversations are live-meeting resources. They may include a printable PDF teaching guide, an app-startable flow, or both.
- App-startable Conversation Flows are reusable guided discipleship experiences, not passive PDFs.
- Implemented table conversations: Kitchen Table Gospel and Four Questions.
- Kitchen Table Gospel and Four Questions are currently gated to USAM Missionary Workspaces.
- Library is for opening resources. Structured conversation execution belongs inside Log Meeting -> Conversation Flow.
- Flow responses are stored as flexible private JSONB on the meeting record so new questions can expand without a migration for every prompt.
- Flows support simple answer types, recommendations, and follow-up actions.
- Recommended resources are queued on the meeting record. DOS does not automatically send texts, emails, or shared guides yet.
- Future work: database-backed flows, adaptive branching, AI coaching, smarter recommendation triggers, and explicit SMS/email/share actions.

## Reviews And Fruit Verification

DOS Reviews are external fruit verification from the person ministered to.

- Quick Review MVP uses token links under `/dos/review/[token]`.
- A logged meeting can generate a `Send Review` link from the DOS meeting detail screen.
- Review status now appears on meeting details as Not Sent, Pending, Submitted, Approved, or Private.
- Quick Reviews save to `dos_meeting_reviews` with `status = pending_review`.
- A pending private Fruit item is queued from the review so DOS Fruit and Missionary Workspace Fruit can see it.
- Quick Review Fruit keeps the review source, snippet, sharing permission, and submitted name only when the reviewer allowed name sharing.
- The Missionary Workspace Fruit Inbox manages Quick Review status: `pending_review`, `approved`, `private`, or `archived`.
- Approved means approved for internal Fruit tracking only. It does not publish to public Profiles.
- Public sharing permission is captured, but reviews and Fruit stay private until a future publishing workflow explicitly publishes them.
- Future work: publishing approvals, testimony pages, Quick Check-In variants, Ministry Experience, Full Testimony / Fruit Story, SMS/email/WhatsApp sending, and public testimony publishing.

## Google Calendar Setup

DOS Calendar sync is server-owned. OAuth tokens must stay out of client components and are stored through the DOS calendar connection tables.

Required environment variables:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `GOOGLE_CALENDAR_SCOPES`

Use `https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email openid` for the MVP scope set unless product direction changes. `GOOGLE_REDIRECT_URI` should point to `/api/dos/app/calendar/google/callback` on the active local, preview, or production origin being tested.

## Active Route Boundary

- Canonical DOS entry route: `/dos`.
- Canonical personal DOS app route: `/dos/<personal-workspace-slug>`, for example `/dos/ryan-fox`.
- `/dos/app?workspace=<slug>` remains only as a compatibility redirect to `/dos/<slug>`.
- `/dos/workspaces/[slug]` remains only as a compatibility redirect to `/dos/[slug]`; do not promote the Workspace v2 portal for launch.
- Primary live test/demo route: `https://new.usamissionaries.org/dos/ryan-fox` once the personal workspace exists. `/dos/ryan-brooke-fox` is a household/team rollup, not Ryan's personal default.
- Canonical Missionary Workspace route: `/admin/missionary-profiles`.
- Canonical admin Command Center route: `/admin`; `/admin/dashboard` may remain as a compatibility alias.
- Canonical DOS data helper: `src/lib/dos/missionary-app.ts`.
- Canonical workspace identity: `missionary_households.id`, resolved from the workspace slug.
- Canonical activity tables: `missionary_field_people`, `missionary_tables`, `missionary_connection_logs`, `missionary_fruit_items`, and shared workspace tables used by Missionary Workspace.
- Keep DOS-specific UI under `app/dos/app`.
- Shared production UI in `app/dos/app/DosMvpAppClient.tsx` powers both `/dos/[slug]` and `/dos/app/preview`; make new UI fixes there first.
- `/dos/app/preview?demo=dos2026` can remain as an optional gated smoke-test route, but do not add demo-only UI unless the live app cannot be used for a specific test.
- Preview data must stay synthetic and isolated. The live Ryan & Brooke workspace is the source of truth for product testing and deployment checks.
- Do not import Command Center shells, admin navigation, profile management tools, or analytics panels into the mobile DOS route.
- Shared backend/data helpers are allowed when they remain UI-neutral.

## Personal Workspace Slugs And Rollups

- Onboarding creates an individual personal DOS workspace first.
- Personal workspace slugs are generated from the user's first and last name, such as `ryan-fox`, with safe numeric suffixes for duplicates.
- Shared family/team workspaces such as `ryan-brooke-fox` are rollups, not the default launch route.
- Spouse/team information collected during onboarding is stored as non-public team metadata on the personal workspace when possible. A dedicated household/team rollup relationship is still pending; do not overbuild it until the schema has a clear rollup relation.
- Public Profile links are shown only for USA Missionaries workspaces. Church and personal DOS users should stay in the DOS app and should not see public-profile controls by default.

## Legacy Guardrails

- Do not revive old legacy people/contact models.
- Do not introduce duplicate people tables.
- Legacy `/dos/[collectiveSlug]` prototype child routes redirect to `/dos/[collectiveSlug]`.
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
