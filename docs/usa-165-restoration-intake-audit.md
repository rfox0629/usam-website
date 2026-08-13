# USA-165 Restoration Intake Audit

Date: 2026-08-13

## Scope

This issue implements a branch-only, non-production preview for the Ministry of Reconciliation restoration doorway and intake workflow. It does not apply migrations, alter RLS, write production data, use production secrets, or store real intake answers.

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
- Does not provide a clear MOR-only answer boundary, draft autosave model, per-section progress, participant return session, or answer-level audit trail.

Decision:

- Do not store restoration answers in the generic `form_submissions` table.

## Branch Preview Implementation

Implemented in this branch:

- `/restoration`: unlisted invitation doorway with one primary action.
- `/restoration/[token]`: private-link intake preview using the existing token-route convention.
- Local-only preview verification: `preview@usam.dev` and `MOR-PREVIEW`.
- Local-only autosave and save/resume through browser storage.
- Visible saved state and review-before-submit.
- `/admin/restoration`: Command Center review design with fabricated, non-sensitive sample state.
- Public Experience registry entries for the page, form, and invitation access item.

The preview intentionally performs no network write and no production persistence.

## Production Persistence Recommendation

New schema/RLS is required before this can handle real participant data. This must be created under a separate gated schema issue blocked by USA-86 and founder approval.

Recommended tables:

- `restoration_referrals`: referral/person/workspace link, invited by, current status, assigned MOR reviewer/team, internal follow-up status, minimal handoff status, expiration/revocation fields, timestamps.
- `restoration_invitation_tokens`: referral id, hashed token, token purpose, expiration, revoked timestamp, verification attempts, created by, created at. Never store raw tokens.
- `restoration_drafts`: referral id, participant auth id/session id, section completion JSON, encrypted answer payload or restricted JSONB answer payload, last saved timestamp, draft version, submitted timestamp.
- `restoration_submissions`: submitted immutable answer snapshot, submitted timestamp, submitted by, review status. Restricted to MOR/authorized operations only.
- `restoration_review_assignments`: referral id, reviewer/team, assigned by, assignment status, timestamps.
- `restoration_audit_events`: referral id, actor id, actor role, event type, material status change, request metadata without sensitive payload, created at.
- `restoration_handoffs`: referral id, outcome, minimum necessary handoff summary, next meeting/date, created by, created at.
- `restoration_mor_authorizations` or a scoped extension of `admin_users`: explicit MOR/operations permission for full-answer review.

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
- Participant cannot read any other referral, reviewer notes, audit entries beyond allowed self-visible status, or MOR-only review fields.
- Submitted records are locked from participant edit unless a new staff-authorized revision window is created.

MOR / authorized operations access:

- Explicit MOR/operations role can read full answer payloads.
- General Command Center/admin users can see only referral status, assigned staff, next action, and minimum handoff data.
- Staff assignment and status changes require admin auth and MOR/operations authorization.
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
- Use HTTPS and existing Supabase managed encryption at rest. Founder/MOR should decide whether application-level field encryption is also required for answer payloads.
- Session timeout and reauthentication are required for participant return and restricted reviewer access.
- Immediate danger/current abuse/suicidal intent must block normal submission and route the participant to the approved escalation protocol.
- Retention/deletion policy must be founder-approved before production.

## Content Decisions Requiring Founder/MOR Review

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

Production persistence requires a separate `Gate: Schema` implementation issue blocked by USA-86. This branch should remain a preview until the schema/RLS/backup gate is approved.
