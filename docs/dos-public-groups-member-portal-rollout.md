# DOS Public Groups Group Home Rollout Readiness

## Status

This branch is ready for a controlled staging rollout after the Supabase project is linked and remote migration history is verified. It is not ready for production migration application until the checklist below is completed.

Do not merge, deploy, apply the migration, send live member invitations, send live email/SMS, or enable real members from this branch before rollout approval.

## Migration Application Order

1. Confirm production main has not advanced past the branch merge base in a way that changes DOS groups, shared leadership, public groups, prayer, or identity assumptions.
2. Link the intended Supabase project in a separate operator-controlled session.
3. Run `supabase migration list --linked` and confirm the remote project has all prior required migrations.
4. Confirm these existing foundations are present:
   - Groups V2 and shared leadership
   - `dos_identity_links`
   - `dos_group_join_requests`
   - `dos_group_members`
   - `dos_group_gatherings`
   - `prayer_requests` group fields and visibility behavior
5. If `20260707132434_dos_unified_prayer_context.sql` is not recorded remotely, apply and record it before the Group Home migration. Group Home prayer depends on `prayer_requests.group_id`, `gathering_id`, and group visibility states.
6. Apply `supabase/migrations/20260717143757_dos_public_groups_member_portal_foundation.sql` in staging first.
7. Run the validation scripts from this document against staging.
8. Review staging data manually.
9. Apply to production only after staging smoke passes and rollout owner approval is recorded.

## Required Environment Variables

Required for Supabase-backed public/member behavior:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Required for correct absolute links:

- one of `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_BASE_URL`, or `SITE_URL`

Required only when email sending is intentionally enabled:

- `RESEND_API_KEY`
- one of `GROUPS_EMAIL_FROM`, `PRAYER_EMAIL_FROM`, or `EMAIL_FROM`

Optional existing admin notification fallbacks:

- `ADMIN_APPLICATION_EMAIL`
- `USAM_APPLICATION_ADMIN_EMAIL`

Do not add SMS provider variables for this rollout. SMS must remain unavailable.

## Email Safeguards

- Keep live member invitation sending off until a rollout owner approves the first controlled beta members.
- Use only safe test addresses in staging.
- Confirm Resend domain/from-address alignment before any production send.
- Confirm group join-request emails still go only to authorized facilitators.
- Confirm the member access request flow returns the same `access-requested` state whether the email matches or not.
- Do not log access tokens or access URLs in production logs.

## Feature Configuration

Per group:

- `public_status = 'published'` exposes the public group page for the resolved public site.
- `accepting_members = false` hides the join form and blocks forged join submissions.
- `member_access_enabled = false` disables lightweight member access without removing public pages.
- `member_visible_location_mode = 'hidden' | 'general' | 'exact'` controls member location disclosure.

Per public site:

- `public_sites.status = 'active'` makes the site resolvable.
- `hostname + base_path` must be unique.

## USA Public-Site Seed Verification

After applying in staging, verify one active USA public site:

```sql
select id, organization_id, hostname, base_path, display_name, status, is_default
from public.public_sites
where lower(hostname) = 'usamissionaries.org'
  and base_path = '/groups';
```

Expected:

- one row
- `display_name = 'USA Missionaries'`
- `status = 'active'`
- `is_default = true`

Verify active USA groups were preserved:

```sql
select slug, public_status, public_site_id, active
from public.dos_groups
where active is not false
order by slug;
```

Expected:

- active existing USA groups have a `public_site_id`
- active existing USA groups are published only where intentional
- no duplicate active published slug under the same public site

Verify uniqueness:

```sql
select public_site_id, slug, count(*)
from public.dos_groups
where active is true
  and public_status = 'published'
  and public_site_id is not null
group by public_site_id, slug
having count(*) > 1;
```

Expected: zero rows.

## Test Member Setup

Use staging-only or local-only test records.

Prepare:

- Ryan readiness leader
- Brandon readiness co-leader
- Justin readiness lightweight member
- unrelated authenticated user
- removed member
- expired-session member
- revoked-token member
- member of another group
- member of another organization

Use `@example.test` contact data. Do not create production users for readiness review.

Cover these group states:

- Tuesday Men's Group
- 2three2 Running
- 2three2 Walking
- same slug under a second fake public site
- no next gathering
- no members
- no updates/prayer/resources
- canceled gathering
- past gathering
- group not accepting members
- private/draft group
- archived group

The static fixture source lives in `scripts/dos-group-home-readiness-fixtures.mjs`.

## Production Smoke Steps

Before real members:

1. Open `/groups`.
2. Open `/groups/2three2`.
3. Verify public page shows public-safe location only.
4. Verify a closed group does not render a join form.
5. Verify unknown/private/archived slugs do not expose content.
6. Sign in as an authorized leader and verify one secondary `Manage in DOS` action appears.
7. Sign in as an unrelated authenticated user and verify no management action appears.
8. Claim a staging-only member access link and verify `/groups/[slug]` renders Group Home.
9. RSVP `going`, `maybe`, and `not_going`; verify only one RSVP row exists for the member/gathering.
10. Submit a prayer request; verify it is leader-visible first.
11. Toggle email preferences; verify one preference row per identity/group/channel/type.
12. Sign out; verify the server session is revoked and the cookie is cleared.
13. Remove membership; verify old access fails immediately.
14. Confirm no SMS provider is called.

## How To Disable Member Access

Disable member access for one group without removing the public page:

```sql
update public.dos_groups
set member_access_enabled = false,
    updated_at = now()
where slug = '<group-slug>'
  and public_site_id = '<public-site-id>';
```

Pause the public page:

```sql
update public.dos_groups
set public_status = 'paused',
    updated_at = now()
where slug = '<group-slug>'
  and public_site_id = '<public-site-id>';
```

Close public requests while leaving the page visible:

```sql
update public.dos_groups
set accepting_members = false,
    updated_at = now()
where slug = '<group-slug>'
  and public_site_id = '<public-site-id>';
```

## Revoke Test Sessions

Revoke sessions for a specific group:

```sql
update public.dos_group_member_sessions
set revoked_at = now(),
    updated_at = now()
where group_id = '<group-id>'
  and revoked_at is null;
```

Revoke active access tokens for a specific group:

```sql
update public.dos_group_member_access_tokens
set status = 'revoked',
    updated_at = now()
where group_id = '<group-id>'
  and status = 'active';
```

## Verify No Live SMS

Confirm no SMS provider variables are configured for this rollout and no SMS send worker exists for group member notifications.

Confirm code behavior:

- SMS can be stored as a disabled preference.
- SMS is not sent.
- SMS one-time codes are not implemented.
- No scheduled notification sender is active.

## Rollback Steps

If staging rollout fails before production:

1. Stop testing and revoke staging member sessions.
2. Revoke active staging member access tokens.
3. Set affected groups to `member_access_enabled = false`.
4. Set affected groups to `accepting_members = false` if public requests should pause.
5. Set affected groups to `public_status = 'paused'` if public pages should disappear.
6. Keep the migration in place in staging unless a destructive schema issue is found; prefer config rollback first.

If production rollout fails after migration:

1. Do not drop tables first.
2. Disable member access on affected groups.
3. Pause public pages only when needed.
4. Revoke sessions/tokens.
5. Disable Resend for group emails if email behavior is involved.
6. Capture failing request paths, response shape, and affected group/member IDs.
7. Ship a repair migration only if schema correction is required.

## Required Validation Commands

Run before rollout approval:

```bash
npm run test:dos-public-sites
npm run test:dos-group-member-portal
npm run test:dos-group-home-ux
npm run test:dos-group-home-readiness
npm run test:dos-groups
npm run test:dos-group-join-request-notification
npm run test:dos-identity-security
npm run test:dos-ministry-events
npm run test:dos-fruit-guard
npm run test:dos-table-roles
npx tsc --noEmit
npm run build
git diff --check
```

## Remaining Rollout Blockers

- Remote migration history must be verified on the linked Supabase project.
- Staging migration must be applied and smoke-tested before production.
- No real member invitations should be sent until email templates/from-address behavior are approved.
- SMS must remain disabled.
- The live route builder remains deferred.
- Custom-domain activation remains deferred.
