# DOS Public Groups Group Home Architecture

## Current Architecture

Production main already has DOS Groups V2, shared leadership, public group pages, join requests, and the canonical `dos_identity_links` bridge.

- Public directory: `app/groups/page.tsx` renders active `dos_groups` and upcoming `dos_group_gatherings`.
- Public detail pages: `app/groups/[slug]/page.tsx` render by global group `slug`.
- Public join flow: `app/groups/actions.ts` writes `dos_group_join_requests`, not members or people directly.
- Leader review flow: `app/api/dos/app/groups/join-requests/route.ts` authorizes leaders, safely reuses or creates `missionary_field_people`, and activates `dos_group_members`.
- Groups V2 management: `app/api/dos/app/groups/route.ts`, `members/route.ts`, `settings/route.ts`, and `DosMvpAppClient.tsx`.
- Group data: `dos_groups`, `dos_group_templates`, `dos_group_members`, `dos_group_gatherings`, `dos_group_attendance`, `dos_group_resources`.
- Identity: `dos_identity_links` maps Supabase Auth users to verified `missionary_field_people`.
- Organizations: `organizations`, `organization_memberships`, `collectives`, `profiles`; current workspace resolution often falls back to USA Missionaries.
- Notifications: Resend-backed group join-request email exists; SMS is not safely available for this feature yet.
- Prayer: `prayer_requests` already supports `group_id`, `visibility`, `source = 'dos_group'`, and private-by-default behavior.

## Reuse

- Keep `missionary_field_people` as the canonical member/person record.
- Keep `dos_group_members` as the membership record.
- Reuse `dos_identity_links` for full DOS users/leaders.
- Reuse `prayer_requests` for group prayer; do not create a group prayer table.
- Reuse existing leader authorization through `loadDosGroupRoleAccess`.
- Reuse existing public join request review rather than creating members from public forms.

## Hard-Coded USA Assumptions

- `/groups` and `/groups/[slug]` previously resolved all active groups by global slug.
- Metadata and copy assumed `USA Missionaries`.
- Group creation did not consistently write `organization_id`.
- Public URLs were implied by the singleton production hostname instead of `public site + slug`.

## Ownership Corrections

This branch adds `public_sites` and `dos_groups.public_site_id/public_status`.

Resolution is now:

`hostname + /groups + slug -> public_sites -> organization -> dos_groups`

Existing USA URLs remain:

- `https://usamissionaries.org/groups`
- `https://usamissionaries.org/groups/[slug]`

New groups inherit the workspace organization/default public site when available. Leaders do not choose domain or branding during normal USA Missionaries group creation.

## Public Authentication Patterns

Existing public token patterns include review/table invitation links and Supabase magic-link tests. This branch uses a safer purpose-built pattern for lightweight members:

- Random access tokens are generated server-side.
- Plain tokens are never stored.
- `dos_group_member_access_tokens.token_hash` stores SHA-256 hashes only.
- Claiming a token creates a hashed, httpOnly cookie-backed `dos_group_member_sessions` record.
- Access is checked against active identity, active membership, active group, and session expiry every request.

## Group Home Member Model

Lightweight members do not receive a DOS workspace.

Added foundations:

- `dos_group_member_identities`
- `dos_group_member_access_tokens`
- `dos_group_member_sessions`
- `dos_group_rsvps`
- `dos_group_updates`
- `dos_group_member_notification_preferences`
- `dos_group_notification_deliveries`

The canonical Group Home lives at `/groups/[slug]`. The `/groups/[slug]/member` route remains as a secure sign-in bridge, but authenticated members return to `/groups/[slug]` for the actual group experience. The Group Home shows only group-scoped member data.

## Authorization Matrix

- Public visitor: public group info and join request only.
- Active lightweight member: own Group Home, own RSVP, member-visible updates/resources/prayer, own update preferences.
- Helper: existing limited shared group permissions only.
- Co-leader: existing shared group management.
- Primary leader: group management and member-access links.
- Organization admin: future public-site/policy control; no automatic private leader notes.

## Security Risks

- Duplicate slugs are safe only when scoped by public site.
- Member access must fail closed when contact/person matching is ambiguous.
- Removed membership must revoke portal access immediately; code checks membership on every session load.
- Tokens must not be logged or stored in plaintext.
- Public pages must never read member lists, attendance, identity links, or private prayer.
- SMS remains disabled until verified consent and provider rules are implemented.

## Data Migration Risks

- Existing active USA groups are backfilled as `published` to preserve current public URLs.
- `public_site_id + slug` uniqueness may reveal duplicate public slugs that were previously only workspace-scoped.
- Current workspace-to-organization linkage is imperfect; code falls back to the USA Missionaries default where existing app logic already does.
- Do not apply the migration to production until duplicate slug and default public-site records are checked.

## Rollout Plan

1. Apply migration in staging only.
2. Verify one default USA Missionaries `public_sites` row.
3. Verify existing groups have `organization_id`, `public_site_id`, and `public_status = 'published'`.
4. Test `/groups`, `/groups/2three2`, and `/groups/[slug]/member`.
5. Accept one staging join request and generate a member access link.
6. Test RSVP, prayer submission, preferences, sign-out, and removed-member revocation.
7. Enable email delivery only after templates, suppression rules, and consent language are reviewed.
8. Promote migration/code to production without enabling SMS or scheduled notifications.

## Deferred Route Builder

The current branch only adds a compact, disabled placeholder for appropriate 2three2 activity groups. It does not add route tables, map SDKs, route calculations, provider integrations, GPX files, elevation logic, or location tracking.

Likely future model:

`dos_group_routes`

- `id`
- `organization_id`
- `group_id`
- `created_by_identity_id`
- `name`
- `activity_type`
- `provider`
- `encoded_path` or provider route reference
- `start_label`
- `end_label`
- `distance_meters`
- `estimated_duration_seconds`
- `elevation_gain_meters`, nullable
- `visibility`
- `status`
- `created_at`
- `updated_at`

`dos_group_gatherings`

- optional `route_id`

Conceptual rules:

- A route is reusable.
- A gathering may reference one route.
- Route visibility can be leader-only or member-visible.
- Routes belong to the shared group context, not a leader's private workspace.
- Public visitors should not automatically receive exact route or location data.
- Route-building is limited to appropriate 2three2 activity templates: running, walking, hiking, cycling, and route-based general fitness.
- Future map-provider integration requires API-key restrictions, billing controls, quotas, and privacy review before implementation.

## Not Yet Activated

- Custom-domain administration UI.
- Organization-wide group policy UI.
- Automated scheduled notification sending.
- SMS one-time codes.
- Full leader announcement composer.
- Route creation, route sharing, map-provider integration, route navigation, and live location features.
