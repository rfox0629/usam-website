# DOS Identity & Shared Leadership Foundation

## Current Identity Flow

Authenticated DOS users enter through Supabase Auth. The app resolves normal users from `auth.users` into `profiles` by `profiles.user_id` or email, then resolves workspace access through `profiles.primary_collective_id`, `collective_memberships`, and `missionary_team_members`. Admin users continue through `admin_users`.

Operational DOS data currently lives mostly in workspace-scoped tables:

- `missionary_households`: DOS workspace boundary.
- `missionary_team_members`: public/household roster and invite-based workspace access.
- `missionary_field_people`: Field person records used by DOS People, Groups, Tables, Prayer, and attendance.
- `dos_groups`, `dos_group_members`, `dos_group_gatherings`, `dos_group_attendance`: shared group records.
- `ministry_events`, `ministry_event_people`: canonical event and participant/leader attribution model.
- My Record tables and personal notes remain user/workspace-scoped private records.

## Current Ownership Model

Shared ministry objects are generally scoped by `workspace_id`, but role-specific sharing has been inconsistent. Groups use shared rows and `dos_group_members.person_id`, while private records such as My Record, personal prayer notes, and pastoral observations stay scoped to the authenticated user.

## Current Authorization Model

Workspace access is currently resolved in server code through profile, collective, and team-member membership. Database policies mostly allow DOS admins/editors. Before this change, some group leader APIs inferred leadership by matching the signed-in email or phone to `missionary_field_people`, then checking `dos_group_members`. That works for simple cases but is not a canonical identity model.

## Existing Duplication

There are two person concepts:

- `profiles`: DOS authenticated user profile.
- `missionary_field_people`: operational Field person used by DOS ministry objects.

The older `people` table is part of the initial platform model, but the live DOS app primarily uses `missionary_field_people`. The safest near-term canonical chain is not a new person store; it is a verified bridge from authenticated user/profile to the existing Field person.

## Canonical Identity Chain

The implemented chain is:

`auth.users` -> `profiles` -> `dos_identity_links` -> `missionary_field_people` -> workspace/group/organization roles -> permissions.

`dos_identity_links` is the canonical bridge. A verified link means this authenticated user is this Field person in this workspace. Candidate, ambiguous, rejected, revoked, and inactive rows preserve history or possible matches without granting permissions.

## Shared Ownership Model

Shared objects remain single-source-of-truth rows:

- Groups
- Group members
- Group gatherings
- Attendance
- Shared prayer requests
- Shared follow-ups
- Ministry events and organization reports

Group permissions derive from the authenticated user's verified identity link and active `dos_group_members.role`:

- `leader`: primary group management.
- `co_leader`: shared management.
- `helper`: scoped helper permissions, such as gathering support.
- `member`/`guest`: read/participation only where explicitly allowed.

## Private Ownership Model

Private records remain owned by one authenticated DOS user and workspace. They are not exposed by group role:

- My Record
- Private prayer notes
- Personal observations
- Personal meeting notes
- One-to-one pastoral notes
- Personal next steps

Sharing of private records should remain explicit and section-specific in future Share Settings work.

## Safe Linking

When a user signs in, DOS resolves or creates their Field person and then verifies the identity link. Exact `created_by`, email, or phone matches can be verified automatically only when unique. Multiple possible matches are stored as ambiguous candidates and do not grant shared permissions until manually verified.

## Authorization Model

Server APIs now use `loadDosGroupRoleAccess()` for group member, settings, join-request, and pending-count operations. Database functions provide the same boundary:

- `private_dos.current_dos_identity_person_ids(workspace_id)`
- `private_dos.can_view_dos_group(group_id, roles)`
- `private_dos.can_manage_dos_group(group_id, roles)`

The database RLS additions allow verified group members/leaders to read or manage shared group objects according to role. Workspace membership alone no longer grants shared group management. The privileged helper functions live in the non-exposed `private_dos` schema with explicit `search_path = ''`, not in the exposed `public` API schema.

When a verified group member can open a shared group without full workspace membership, the `/dos/[workspace]` route rebuilds a filtered DOS payload instead of spreading the full workspace payload. That filtered view includes only the accessible group rows, group-scoped people, and shareable group prayer requests. It clears My Record, Field-wide meetings, prayer partners, private prayer logs, private notes/reviews/testimonies, commitments, household members, organizations, USAM application metadata, table invitations, Fruit, and other private workspace surfaces.

## Metrics Model

Group gatherings remain one shared record. Attendance remains one row per participant. Leadership/time credit should be attributed through `acting_leader_person_id` and the verified identity link for that person. This prevents double counting when Ryan and Brandon co-lead but only Brandon leads a specific gathering.

## Remaining Limitations

- Manual verification UI for ambiguous identity candidates is not built yet.
- Helper role permissions are represented in the database and API guard but detailed per-action helper UX can be refined later.
- Organizations and future shared features can reuse the same identity link, but their feature-specific policies still need to be added as those surfaces are built.
- The live app still uses `missionary_field_people` as the operational canonical person. A future consolidation with the older `people` table should be a separate migration plan, not an implicit merge.
- Live Ryan/Brandon beta validation has not been executed. See `docs/dos-groups-v2-shared-leadership-beta-validation.md`.
