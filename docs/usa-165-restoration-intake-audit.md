# USA-165 Restoration Intake Audit

Date: 2026-08-13
Updated: 2026-08-16

## Scope

This issue originally implemented a branch-only restoration preview. The August 16 production update rebrands the public experience as Mission of Reconciliation, adds the national `/mission-of-reconciliation` page, and makes `/restoration` the public Restoration Journey form.

This update does not apply production migrations, alter production RLS, or write production data. USA-166 remains the gated work for dedicated restoration referrals, server-side drafts, reviewer authorization, answer-level audit trails, and private invitation persistence.

## Existing Patterns Audited

### Shared access-code gate

Files:

- `src/lib/access.ts`
- `app/api/access/validate/route.ts`
- `components/forms/AccessCodeModal.tsx`

Assessment:

- Useful for low-sensitivity protected pages and previews.
- Uses a broad code-based access cookie for system/team style access.
- Not enough for restoration intake because it is not unique to one referral/person, does not produce answer-scoped authorization, and is not sufficient for revocation/audit of sensitive material.

Decision:

- Do not use this as the production security boundary for restoration answers.

### DOS review/testimony token links

Files:

- `app/dos/review/[token]/page.tsx`
- `app/dos/testimony/[token]/page.tsx`
- `app/api/dos/reviews/[token]/route.ts`
- `app/api/dos/testimonies/[token]/route.ts`
- `src/lib/dos/review-requests.ts`
- `src/lib/dos/testimonies.ts`

Assessment:

- Strongest existing public-form pattern.
- Uses unique token routes, server-side loading, expiration/revocation style checks, and token-bound writes.
- Current use cases are short single-submit forms, not long-form save/resume intake.

Decision:

- Reuse the private-token route model, expiration/revocation semantics, and server-side verification approach.
- Extend it with authenticated return access, autosave, draft state, audit events, and restricted reviewer roles before production.

### Admin / Command Center protection

Files:

- `app/admin/layout.tsx`
- `src/lib/admin-auth.ts`
- `app/admin/_components/AdminShell.tsx`
- `app/admin/public-experience/page.tsx`

Assessment:

- Canonical operations surface is `/admin` with `AdminShell`.
- Admin access is already protected through Supabase Auth and `admin_users`.
- Public Experience already tracks website pages, forms, and protected access points.

Decision:

- Add Restoration to the existing Public Experience registry.
- Add the review experience under `/admin/restoration`.
- Do not create a separate admin portal or rename global navigation.

### Generic form submissions

Files:

- `src/lib/forms/form-submissions.ts`
- `app/api/form-submissions/route.ts`
- existing public forms that write to `form_submissions`

Assessment:

- Appropriate for ordinary public inquiries and operations inboxes.
- Too generic for this intake because restoration answers may include abuse, sexual history, addiction, medical, mental-health, self-harm, family, and spiritual history.
- Does not provide a clear Mission of Reconciliation answer boundary, draft autosave model, per-section progress, participant return session, or answer-level audit trail.

Decision:

- Use the existing `form_submissions` public-form architecture only as the current Operations intake path for the public Restoration Journey form.
- Do not represent that path as the final dedicated secure restoration persistence model.
- USA-166 remains required for private referrals, server-side save-and-return, least-privilege reviewer roles, dedicated audit events, and minimum-necessary discipleship handoff data.

## Current Public Implementation

Implemented in this branch:

- `/mission-of-reconciliation`: national public page for Mission of Reconciliation.
- `/restoration`: public Restoration Journey form branded as Mission of Reconciliation in partnership with USA Missionaries.
- `/restoration/[token]`: redirects old private-link preview URLs to `/restoration`.
- Local autosave and save/resume through browser storage.
- Visible saved state and review-before-submit.
- `/admin/restoration`: Command Center review surface that does not expose real answer fixtures.
- Public Experience registry entries for the page and form.
- Submissions use `/api/form-submissions` with `formType: "restoration"` and keep sensitive answers out of URLs, analytics events, ordinary email payloads, and fixtures.

Dedicated restoration referral/draft/reviewer persistence is intentionally deferred to USA-166.

## Production Persistence Recommendation

New schema/RLS is required before this can handle real participant data. This must be created under a separate gated schema issue blocked by USA-86 and founder approval.

Recommended tables:

- `restoration_referrals`: referral/person/workspace link, invited by, current status, assigned Mission of Reconciliation reviewer/team, internal follow-up status, minimal handoff status, expiration/revocation fields, timestamps.
- `restoration_invitation_tokens`: referral id, hashed token, token purpose, expiration, revoked timestamp, verification attempts, created by, created at. Never store raw tokens.
- `restoration_drafts`: referral id, participant auth id/session id, section completion JSON, encrypted answer payload or restricted JSONB answer payload, last saved timestamp, draft version, submitted timestamp.
- `restoration_submissions`: submitted immutable answer snapshot, submitted timestamp, submitted by, review status. Restricted to Mission of Reconciliation/authorized operations only.
- `restoration_review_assignments`: referral id, reviewer/team, assigned by, assignment status, timestamps.
- `restoration_audit_events`: referral id, actor id, actor role, event type, material status change, request metadata without sensitive payload, created at.
- `restoration_handoffs`: referral id, outcome, minimum necessary handoff summary, next meeting/date, created by, created at.
- `restoration_reconciliation_authorizations` or a scoped extension of `admin_users`: explicit Mission of Reconciliation/operations permission for full-answer review.

Status values:

- `invited`
- `started`
- `last_saved`
- `submitted`
- `under_review`
- `meeting_scheduled`
- `in_restoration`
- `completed`
- `declined_closed`

Handoff outcomes:

- Begin discipleship
- Begin discipleship alongside focused restoration
- Prioritize specialized restoration, then begin structured discipleship

## RLS Proposal

Baseline:

- Enable RLS on every restoration table.
- Deny by default.
- Use server-side route handlers for invitation validation, autosave, submit, review, assignment, and handoff changes.
- Never expose service-role access to client components.

Participant access:

- Participant can access only the referral tied to their verified private invite/session.
- Participant can update draft answers only before submit and while invite/session is valid.
- Participant cannot read any other referral, reviewer notes, audit entries beyond allowed self-visible status, or restricted Mission of Reconciliation review fields.
- Submitted records are locked from participant edit unless a new staff-authorized revision window is created.

Mission of Reconciliation / authorized operations access:

- Explicit Mission of Reconciliation/operations role can read full answer payloads.
- General Command Center/admin users can see only referral status, assigned staff, next action, and minimum handoff data.
- Staff assignment and status changes require admin auth and Mission of Reconciliation/operations authorization.
- Audit rows are append-only from trusted server functions/routes.

Public page access:

- `/restoration` remains unlisted/noindex.
- `/restoration/[token]` never reveals whether a referral exists beyond a generic unavailable state.
- Tokens must be long, random, single-referral, revocable, expiring, and stored only as hashes.

## Security Requirements For Production

- Token validation and identity verification must run server-side.
- Sensitive answers must never be placed in URL parameters, page source, client logs, analytics events, notification payloads, email, fixtures, screenshots, or seeds.
- Autosave endpoints must accept only the allowed field IDs from `src/lib/restoration/intake.ts`.
- Emails should contain only the private link and generic wording, not status or answer content.
- Reviewer notifications should contain only referral id/status and a Command Center link.
- Use HTTPS and existing Supabase managed encryption at rest. The founder and Mission of Reconciliation leadership should decide whether application-level field encryption is also required for answer payloads.
- Session timeout and reauthentication are required for participant return and restricted reviewer access.
- Immediate danger/current abuse/suicidal intent must block normal submission and route the participant to the approved escalation protocol.
- Retention/deletion policy must be founder-approved before production.

## Content Decisions Requiring Founder and Mission of Reconciliation Review

- Final informed consent language.
- Confidentiality limits and mandatory-reporting protocol.
- Immediate danger/current abuse/suicidal ideation escalation copy and operating procedure.
- Retention, deletion, export, and correction policy.
- Theological wording around deliverance, restoration, occult involvement, and false religions.
- Medical, medication, mental-health, addiction, and diagnosis classifications.
- Trauma-sensitive wording for sexual history, abuse, family conflict, and childhood questions.
- Hold-harmless language from the source forms.
- Whether family-tree fields are participant-entered, staff-entered, or split.
- Minimum handoff fields visible to ordinary DOS/person views.

## Gate Required

Dedicated restoration referral and draft persistence requires a separate `Gate: Schema` implementation issue blocked by USA-86. The public page and form can be published, but production schema/RLS mutations remain outside this scope.
