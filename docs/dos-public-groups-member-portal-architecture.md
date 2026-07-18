# DOS Public Groups Group Home Architecture

## Purpose

The DOS public group work adds a lightweight Group Home for public groups without turning public pages into DOS dashboards. Public visitors can learn about a group and request to join. Approved lightweight members can use a small group-scoped home. Authorized leaders continue to manage the group inside DOS.

The canonical page is `/groups/[slug]`.

## Current Foundation

Production main already has DOS Groups V2, shared leadership, public group pages, join requests, and the canonical `dos_identity_links` bridge.

- Public directory: `app/groups/page.tsx` renders active published groups for the resolved public site.
- Public detail pages: `app/groups/[slug]/page.tsx` render the public visitor state or the authenticated lightweight member state.
- Public join flow: `app/groups/actions.ts` writes `dos_group_join_requests`, not members or people directly.
- Leader review flow: `app/api/dos/app/groups/join-requests/route.ts` authorizes leaders, reuses or creates `missionary_field_people`, activates `dos_group_members`, and prepares member access.
- Group management: `app/api/dos/app/groups/route.ts`, `members/route.ts`, `settings/route.ts`, and `DosMvpAppClient.tsx`.
- Group data: `dos_groups`, `dos_group_templates`, `dos_group_members`, `dos_group_gatherings`, `dos_group_attendance`, `dos_group_resources`.
- Identity: `dos_identity_links` maps Supabase Auth users to verified `missionary_field_people`.
- Notifications: Resend-backed group join-request email exists. SMS remains disabled for this feature.
- Prayer: `prayer_requests` supports `group_id`, `visibility`, `source = 'dos_group'`, and private-by-default behavior.

## Reuse Rules

- Keep `missionary_field_people` as the canonical person record.
- Keep `dos_group_members` as the membership record.
- Reuse `dos_identity_links` for full DOS users and leaders.
- Reuse `prayer_requests` for group prayer; do not create a group prayer table.
- Reuse `loadDosGroupRoleAccess` for leader authorization.
- Reuse public join-request review instead of creating members directly from public forms.

## Public-Site Resolution

This branch adds `public_sites` and `dos_groups.public_site_id/public_status`.

Resolution:

`hostname + /groups + slug -> public_sites -> organization -> dos_groups`

Existing USA URLs remain:

- `https://usamissionaries.org/groups`
- `https://usamissionaries.org/groups/[slug]`

Group slugs are unique per active published public site, not globally. Same-slug isolation depends on `public_site_id`, `public_status = 'published'`, and active group state.

## Final Group Home State Model

There are three supported states for `/groups/[slug]`.

| State | Viewer | Surface | Allowed |
| --- | --- | --- | --- |
| Public visitor | No valid member cookie | Public group page | Organization branding, group name, type/tagline, general rhythm, public-safe location, leaders, next-gathering public timing, Request to Join, Member Sign In |
| Approved lightweight member | Valid member session cookie | Group Home | Compact group identity, next gathering, RSVP, latest update, prayer, resources, update preferences, sign out |
| Authorized DOS leader | Verified DOS identity with leader/co-leader role | DOS workspace | Operational controls remain inside DOS, not on public Group Home |

The `/groups/[slug]/member` route is only a sign-in bridge. Valid member sessions redirect back to `/groups/[slug]`.

## Public Visitor Behavior

Public visitors should see only public-safe group data. The page should stay concise and invitational.

Public visitors must not see:

- exact private gathering location
- member updates
- member prayer
- member resources
- RSVP controls
- attendance
- member identities
- workspace IDs
- person IDs
- identity links
- internal roles
- private notes
- leader-only actions

Closed groups use `accepting_members = false` to hide the join form and reject forged join submissions.

## Group Home Member Model

The Group Home member model is intentionally narrow: it grants a person access to one group-scoped experience without granting DOS workspace access.

## Approved Member Behavior

Lightweight members do not receive a DOS workspace.

Added foundation tables:

- `dos_group_member_identities`
- `dos_group_member_access_tokens`
- `dos_group_member_sessions`
- `dos_group_rsvps`
- `dos_group_updates`
- `dos_group_member_notification_preferences`
- `dos_group_notification_deliveries`

The approved member hierarchy is:

1. Compact group identity
2. Next gathering
3. RSVP
4. Latest update
5. Prayer
6. Resources
7. Keep Me Updated
8. Sign out

Members can see only their active group, their own RSVP/preferences, member-visible updates, member-visible prayer, member-visible resources, and location detail permitted by the group setting.

## Leader Behavior

Leaders and co-leaders keep operational controls inside DOS. The public Group Home does not render management actions; leaders manage groups from the DOS workspace.

Helpers, unrelated authenticated users, members of another group, and leaders from another organization must not receive the same management access.

## Public Authentication Patterns

Public authentication uses purpose-built member access tokens instead of full DOS login for lightweight members.

## Authentication Lifecycle

The member-access lifecycle is:

1. Public visitor submits a join request.
2. Leader approves in DOS.
3. The app reuses or creates the canonical person record and activates group membership.
4. The app creates or updates a lightweight member identity.
5. The app generates a random access token.
6. Only the SHA-256 token hash is stored.
7. Member claims the token through `/groups/[slug]/member/access`.
8. Claiming marks the token `used`, revokes existing active sessions for the same identity, and creates a hashed session.
9. The browser receives an httpOnly, same-site, `/groups` scoped cookie.
10. Every Group Home request rechecks session expiry, identity status, active membership, active group state, group slug, and member access enablement.
11. Sign-out or leader removal revokes access.

Plain tokens are never stored.

## Session And Revocation Behavior

- Access tokens are random, hashed, scoped to member identity and group, expiring, and single-use.
- Session tokens are random, hashed, expiring, and revocable.
- Claiming a new access token revokes prior active sessions for that member identity and group before creating a replacement session.
- Removed membership fails on the next request because member access is rechecked against `dos_group_members.status = 'active'`.
- Sign-out revokes the server session and clears the cookie at the same `/groups` path used when setting it.

## Exact Location Rules

Public visitors never receive more than public-safe location text.

Public pages and public metadata use `dos_groups.default_location` or `Location shared after leader confirmation`. They do not use exact next-gathering locations as a fallback.

Approved members use `dos_groups.member_visible_location_mode`:

- `hidden`: shared after leader confirmation
- `general`: public/general group location
- `exact`: exact gathering location when present, otherwise default group location

Public visitors should not automatically receive exact route or location data.

## RSVP Versus Attendance

RSVP records live in `dos_group_rsvps` and are keyed by `gathering_id + person_id`.

RSVP does not count as leader-confirmed attendance. Attendance remains a leader-managed operational record in `dos_group_attendance`.

## Prayer Visibility

Member-submitted prayer uses `prayer_requests` with:

- `source = 'dos_group'`
- the member's person and group
- `visibility = 'group_leaders'` by default

The member Group Home reads only active prayer with `visibility = 'group_members'`.

## Notification Consent

Group notification preferences are stored separately from donor, newsletter, prayer-team, and marketing communication.

Preferences are keyed by `member_identity_id + group_id + channel + notification_type`.

Email preferences can be saved now. SMS remains disabled until consent language, provider rules, unsubscribe handling, rate limits, and delivery audit behavior are approved.

## Authorization Matrix

- Public visitor: public group info and join request only.
- Active lightweight member: own Group Home and own actions only.
- Helper: existing limited shared group permissions only.
- Co-leader: existing shared group management inside DOS.
- Primary leader: group management, join-request review, and member-access link actions.
- Organization admin: future public-site/policy control; no automatic private leader notes.
- Service role: database access only through server-side application authorization.

## Migration Notes

The pending migration depends on prior Groups V2, shared leadership, identity, prayer, and join-request schema.

It adds public-site ownership, member identity/session/token tables, RSVP, updates, notification preference/delivery tables, RLS, service-role grants, and USA public-site backfill.

Safety properties:

- RLS enabled on all new public/member tables.
- Member tables revoke `anon` and `authenticated` direct access.
- Only `public_sites` active rows are public-readable.
- Tokens and sessions store hashes only.
- Unique constraints cover public site, public group slug, token hash, session hash, RSVP, notification preferences, and delivery dedupe.
- The USA seed uses `on conflict do nothing`.
- Existing active USA group URLs are preserved by assigning the USA public site and publishing active groups that are still draft.
- No route tables, map SDKs, or route foreign keys are added.
- No destructive backfills are intended.

The worktree is not linked to a Supabase project in this review environment, so remote migration history must be verified before applying the migration in staging or production.

## Deferred Route Builder

The current branch only adds a compact, disabled placeholder for appropriate 2three2 activity groups. It does not add route tables, map SDKs, route calculations, provider integrations, GPX files, elevation logic, location tracking, or route navigation.

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
- Route-building is limited to appropriate 2three2 activity templates: running, walking, hiking, cycling, and route-based general fitness.
- Future map-provider integration requires API-key restrictions, billing controls, quotas, and privacy review before implementation.

## Known Limitations

- Custom-domain activation UI is deferred.
- Organization-wide public group policy UI is deferred.
- Automated scheduled notification sending is deferred.
- SMS one-time codes and SMS notifications are deferred.
- Full leader announcement composer is deferred.
- The live route builder is deferred.
- No real member invitations, email, or SMS should be sent before rollout approval.
- Remote migration history could not be verified from this unlinked local worktree.
