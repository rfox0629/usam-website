# NCC & DOS Event Architecture — Repository Gap Analysis and Phase 0 Implementation Plan

**A read-only audit of the actual repository against `docs/ncc-architecture.md`, producing the smallest reliable foundation that solves today's real problems while preserving the future architecture.**

No files were modified to produce this document. No migrations were written. Every claim below is grounded in a specific file, table, or route found by six parallel research passes over the live codebase — cited inline. Where the architecture document's assumptions turned out to be wrong or imprecise, this document says so explicitly rather than smoothing it over.

---

## A. Executive Assessment

The master vision document was right about the shape of the problem and wrong, in a few specific and useful ways, about how close the repository already is to solving it.

**Closer than expected:** `form_submissions` already functions as a lightweight, cross-form work-item table — status, priority, `assigned_team`, `assigned_to`, free-text notes, a JSON payload — feeding `OperationsInboxPage` across a dozen form types. `dos_relationship_score_history` and `prayer_logs` are proven, already-shipped examples of exactly the append-only event-log shape the architecture document proposes inventing. The email infrastructure (`src/lib/email/resend.ts` and two sibling helpers) is real, in production, and trivially extensible. Two of the three richest existing workflows (missionary applications, major gift inquiries) already have conditional email notifications and real multi-step status lifecycles. None of this needs to be built from zero.

**Further away than expected, in one specific place that matters most:** there is no reliable donation transaction data anywhere in this codebase. Every "give" button opens a new browser tab to an external Planning Center Church Center page; the schema built to receive PCO sync data (`pco_giving_records`, `pco_giving_sync_runs`) is entirely unpopulated — no credentials configured, no sync job, no webhook, not even a `vercel.json` to schedule one. `support_commitments` is a pre-donation intent record a human later marks "active" by hand-typing a donation ID. A `donation.received` event cannot be built on anything that exists today; it would require a real payment or PCO integration first, which is out of scope for this plan.

**A structural gap underneath everything:** `missionary_households` — the actual table DOS authorization resolves workspace access against — has no relationship to the `organizations` table at all. The multi-organization architecture in the vision document assumes `organization_id` is a live, populated, trustworthy column; today it exists on a handful of tables, is absent from most operational ones, and in two cases (`prayer_partners`, `prayer_requests`) the column exists but its foreign key was never actually enforced (§D.4, §H — one is a genuine migration bug, not a design choice). Phase 0 has to work around this rather than assume it's solved.

**The single biggest, fixable gap has nothing to do with events at all:** across eleven traced public intake sources, only two send any notification, and both fail silently if an environment variable is unset. Everything else — prayer requests, both prayer-team application variants, support commitments, financial freedom inquiries, the general interest form — has either an explicit `// TODO: Future email...` comment or no notification code whatsoever. The default failure mode of the current system is silence: a submission is only ever seen if a staff member happens to open the specific admin page for that exact form. This is true independent of any event architecture — it is the actual, present pain the vision document's event model exists to solve, and a meaningful slice of it can be fixed without building most of that model.

**Recommendation in one sentence:** build the smallest possible event-and-notification primitive against three already-working, already-scoped workflows, fix the DOS group-notification gap on its own separate track, and defer the organizational-inbox, cross-org RLS overhaul, and donation event entirely until there's a real second tenant and a real payment integration to justify them.

---

## B. Current-State Inventory

### B.1 Notifications, background jobs, webhooks

| Capability | Status | Evidence |
|---|---|---|
| Email sending | **Active, in production, extensible** | `src/lib/email/resend.ts` (raw `fetch` to Resend HTTP API, gated by `RESEND_API_KEY`), plus sibling `src/lib/prayer/email.ts` and `src/lib/major-gifts/email.ts` — same pattern, three independent copies. Used by `app/api/join/submit/route.ts` and `app/api/major-gift-inquiries/route.ts`. |
| SMS sending | **Does not exist** | Zero hits for "twilio" or any SMS provider anywhere in the repo. |
| Background/scheduled jobs | **Does not exist** | No `vercel.json`, no cron config in `next.config.js`, no `app/api/**/cron*` routes, no `supabase/functions/**` directory, no `pg_cron` in any migration. |
| Generic notifications/activity-feed table | **Does not exist** | No `create table.*notification` or `create table.*activity_feed` in any of 119 migrations. |
| Webhook receivers | **Does not exist** | No `app/api/**/webhook*` routes; the only "webhook" hit anywhere is a comment (`app/api/support-commitments/route.ts:141`, a TODO). |
| In-app notification badges/counts | **Does not exist** for any workflow, including DOS group requests (§C) | `DesktopHomeDashboard` in `DosMvpAppClient.tsx` has a badge mechanism for calendar-source pills only; nothing wires it to pending approvals. |
| Error/exception tracking | **Does not exist** | No Sentry dependency, no custom error-log table. |
| Delivery tracking (email/webhook) | **Does not exist** | No `sent_at`/`delivered_at` columns or tables anywhere. |

### B.2 Audit and work-item precedent

| Table | Shape | Verdict |
|---|---|---|
| `form_submissions` | `status` (`new/reviewed/needs_follow_up/follow_up/contacted/converted/archived`), `priority`, `assigned_team` (`prayer_team`\|`support_team`), `assigned_to`, `internal_notes`, `payload jsonb`, `form_type` enum covering ~12 form types | **Already a generic, lightweight work-item table.** Any new Phase 0 concept should extend this pattern, not duplicate it. |
| `dos_relationship_score_history` | `workspace_id`, `person_id`, `previous_score`, `new_score`, `movement_reason jsonb`, `calculated_at`, no `updated_at`, no update trigger | **Genuine append-only event log** — the closest existing precedent for a `platform_events`-style table. |
| `prayer_logs` | `workspace_id`, `prayer_request_id`, `field_person_id`, `prayed_at`, `note`, `created_at`, RLS: `anon`/`authenticated` revoked, `service_role` only | Second genuine append-only precedent, same shape discipline. |
| `missionary_profile_page_views` | RLS-enabled but `service_role`-only (no per-user policies) | Confirms the established pattern for server-only-write, analytics-style tables. |
| `OperationsInboxPage` | Pure read/list/bucket component; its only write path is a "link to profile" assignment action, not status/assignee transitions | Status transitions live per-page, outside the shared component, in 4+ different places (§D). |

Four distinct, non-unified status vocabularies already exist (`form_submissions.status`, `usam_missionary_applications.status`/`usam_application_status` pair, `missionary_fruit_items.cc_status`, and three near-identical-but-not-shared donor/prayer-inquiry vocabularies). `OperationsInboxPage.bucketForStatus()` already normalizes all of them into one shared display bucket at the read layer — this is a working precedent for *not* forcing schema-level unification.

### B.3 Access systems

| System | Scope | Mechanism |
|---|---|---|
| `admin_users` + Supabase Auth | `/admin`, `/api/admin/**` | Role (`admin`\|`editor`\|`viewer`) + `prayer_permissions text[]`, checked via `src/lib/admin-auth.ts` |
| `system_access_codes` HMAC cookie | `/missionaries`, `/system/preview` | Signed, expiring token (`src/lib/access.ts`) |
| Partners shared-secret cookie | `/partners` | Single SHA-256 hash of one shared env var, identical for every user (`src/lib/partners-access.ts`) |

`middleware.ts` protects exactly one literal path: `matcher: ["/partners"]`. Every other route — including all of `/admin` and `/api/admin/**` — relies entirely on each route/layout independently calling `getAdminAuthorization()`. All 16 sampled `app/api/admin/**` routes currently do this correctly, but each re-implements the same ~15-line check independently (confirmed via direct code comparison across 4 files) rather than sharing a wrapper. No RLS policy anywhere in 119 migrations references `organization_memberships` as a scoping filter — org-scoped RLS does not exist today (§H).

### B.4 Organization model

`organizations` is an 8-column table (`id, name, slug, type, branding_mode, created_at, updated_at`) with **no `parent_organization_id` and no hierarchy column of any kind**. One row exists in practice (`usa-missionaries`). `organization_id` appears on: `networks`, `collectives`, `profiles`, `people`, `organization_memberships`, `discipleship_relationships`, `meetings`, `visibility_rules`, `product_feedback`, `usam_missionary_applications`, `dos_groups`, `dos_group_join_requests`, and (with the FK-enforcement caveat below) `prayer_partners`/`prayer_requests`. It is **absent** from `missionary_tables`, `missionary_encounters`, `missionary_fruit_items`, `missionary_connection_logs`, `support_commitments`, `major_gift_inquiries`, `financial_freedom_inquiries`, `partners_documents`, and `form_submissions`.

**Most consequential finding:** `missionary_households` — the table `src/lib/dos/auth.ts` actually resolves DOS workspace access against — has zero relationship to `organizations`. DOS authorization today runs entirely through `missionary_team_members` → `household_id`, plus a secondary `profiles → collective_memberships → collectives.slug` path that string-matches against `missionary_households.slug`. `organization_id` plays no role in the live authorization decision anywhere in that file.

**A real bug, not a design gap:** `prayer_requests.organization_id` was added via `alter table ... add column if not exists organization_id uuid references public.organizations(id)`, but the column already existed as a plain `uuid` from an earlier migration — Postgres's `ADD COLUMN IF NOT EXISTS` silently no-ops when the column is already present, so the `references` clause was **never actually applied**. `prayer_partners.organization_id` was never given a foreign key at all, at any point. Both columns exist, are populated in places, and are unenforced.

`visibility_rules` is referenced by exactly one line of application code (`src/lib/dos/workspace.ts:349`), inside a function (`loadDosWorkspace`) that itself has zero callers anywhere in the repo. It is dead code, not merely an unused table.

### B.5 External integrations

Planning Center Online: schema exists, code does not (§E). No Stripe, PayPal, or any other payment processor anywhere in the repo (`.env.example`/`.env.local` confirm no such keys are configured). No `campaign` or `fund` table exists at any point in the schema's history. No chart-of-accounts table exists.

---

## C. DOS Group-Notification Diagnosis

**The gap:** a facilitator (e.g., Ryan or Dirk) can have zero awareness that someone requested to join their group. There is no email, no SMS, no dashboard badge, no nav badge — the only way to discover a pending request is to open that specific group's "Members" tab inside DOS and check.

**What already works, precisely:**
- `dos_group_join_requests` (`supabase/migrations/20260709160043_dos_group_join_requests.sql`) is a well-formed table: `status` enum (`pending/reviewed/accepted/declined/archived`), a partial unique index preventing duplicate *pending* requests per `(group_id, email)`, and correct `workspace_id`/`organization_id`/`group_id` scoping.
- The public submission path (`app/groups/actions.ts::submitGroupJoinRequest`) and the DOS-side approve/decline path (`PATCH /api/dos/app/groups/join-requests`) both work correctly and do persist real status transitions plus `dos_group_members` creation on accept.

**What's actually broken or missing:**
1. **No notification of any kind** fires anywhere in this flow (confirmed by direct inspection of both the insert path and the approval path).
2. **The facilitator-access check is fragile.** `requireGroupRequestAccess()` does not use `dos_groups.leader_person_id` directly — it resolves the logged-in Supabase Auth user's email/phone, fuzzy-matches it against `missionary_field_people`, and then checks for an active `leader`/`co_leader` row in `dos_group_members`. If the facilitator's login email doesn't exactly match their `missionary_field_people` email, they get a silent `403` and never see the tab that would show them anything.
3. **The dashboard surfaces nothing.** `DesktopHomeDashboard`'s `upcomingItems` computation has no reference to `dos_group_join_requests` at all — no badge on the dashboard, no badge on the Groups nav entry, no badge on the individual group card.

**Recommended ticket** (standalone, does not depend on any NCC work in this plan):

> **Ticket: DOS facilitator notification for group join requests**
> - Send an email to the resolved facilitator (via the leader/co-leader lookup already implemented in `requireGroupRequestAccess`, reused rather than rebuilt) at the moment `submitGroupJoinRequest` inserts a row — following the exact pattern already proven in `src/lib/email/resend.ts` and its `major-gifts`/`prayer` siblings. New file: `src/lib/groups/email.ts`.
> - Add a pending-request count to the DOS dashboard and to each `GroupCard`, sourced from a lightweight count query against `dos_group_join_requests` scoped to groups the logged-in user leads.
> - Deep-link the notification and the badge directly to the group's Members tab (route already exists; no new page needed).
> - Resolve the notification implicitly when `status` transitions away from `pending` (no new state needed — reuse the existing status column).
> - Optional email preference per person: **defer** unless a per-person preferences table already exists (it doesn't) — ship the notification as always-on first, add opt-out only if it becomes a real complaint.
> - Do **not** touch the facilitator-access-check fragility (item 2 above) in this ticket — it's a real bug worth its own separate, smaller ticket, but conflating it with the notification ticket risks delaying a fix that's otherwise safe to ship this week.

This requires no organization-hierarchy work, no RLS rework, and no event-envelope design. It should ship independently of everything else in this document.

---

## D. Current Organizational Intake Map

Eleven traced sources. Two items from the original list turned out not to exist as live public forms — noted explicitly rather than silently omitted.

| # | Source | Destination Table | Org/Person Attribution | Notification | Admin Page(s) | Real Workflow? |
|---|---|---|---|---|---|---|
| 1 | Missionary application (`/join`) | `usam_missionary_applications` | `organization_id` (nullable, usually populated via hardcoded USAM lookup), `profile_id`, `workspace_id` | **Yes, conditional** on `RESEND_API_KEY` (unset in this checkout — unconfirmed in production); silent no-op on failure | `/admin/applications` (list) + `/admin/organizations/[id]` (real approve/decline/publish actions) | Real — full status lifecycle |
| 2 | "Join the Mission" general interest | `form_submissions` (`join_mission_interest`) | `assigned_team` only | None | `/admin/applications` | Write-once; generic status only |
| 2b | Organization/church partnership inquiry | **Does not exist.** `/admin/partners` literally says "No partner intake data source exists yet." | — | — | `/admin/partners` (empty placeholder) | N/A |
| 2c | Generic "general" form (Mission/Briefing CTA) | `form_submissions` (`general`) | `assigned_team` only | None | **No dedicated inbox filters this type at all** | Effectively orphaned |
| 3 | Major gift inquiry | `major_gift_inquiries` | `household_id`, `missionary_profile_id` | **Yes, conditional**, same caveat as #1 | Split: `/admin/finance` (read-only) + `/admin/financial-freedom?type=major-gift` (real status control) | Real, but fragmented across two pages |
| 4 | Support commitment / giving intent | `support_commitments` | `household_id`, `missionary_profile_id` | None (explicit TODO comment) | Split: `/admin/finance` (read-only) + Missionary Profiles dashboard (real reconciliation) | Real, but fragmented, and entangled with the unreliable giving data (§E) |
| 5a | Prayer request (per-missionary) | `prayer_requests` | `household_id`, `related_household_id`, `organization_id` (FK-unenforced, §B.4) | None | `/admin/prayer` — richest existing workflow (prayed/covered/answered/archived, partner assignment) | Real, well-built, just silent |
| 5b | Prayer team application (generic) | `form_submissions` only | `assigned_team` only | None | `/admin/prayer`, `/admin/prayer-team` | Partial — approved but never linked to a specific missionary |
| 5c | Prayer team application (per-missionary) | `prayer_partners` | `field_person_id`, `recruited_by_household_id`, `workspace_id` | None (explicit TODO comment) | `/admin/prayer` | Real — approve/decline/deactivate lifecycle |
| 6 | Testimony submission (token-based) | `participant_testimonies` | `meeting_id`, `person_id`, `leader_id` | None | **No `app/admin/**` page reads this table at all** — review happens entirely inside the missionary's own DOS app | Confined to DOS, invisible to NCC |
| 7 | Quick review (token-based) | `dos_meeting_reviews` + `participant_reviews` | `meeting_id`, `workspace_id` | None | Indirect, via an unconfirmed promotion step into `missionary_fruit_items`, then `/admin/missionary-profiles` Fruit tab | Real but two-hop and partially unconfirmed |
| 8 | Partner documents | `partners_documents` | None | N/A — outbound only | `/admin/partners-documents` | **Not an intake source** — admin-to-partner only, no public submission exists |
| 9 | Financial Freedom inquiry | `financial_freedom_inquiries` | None | None | Split: `/admin/finance` (read-only) + `/admin/financial-freedom` (real status control) | Real, but fragmented, and completely silent |
| 10 | `form_submissions` catch-all | `form_submissions` | `assigned_team` only | Varies by wrapper | `/admin/public-experience`, `/admin/forms` | Two declared form types (`field_report_access`, `missionary_profile_review`) have **zero live public submitter** — dead form types with live admin wiring |
| 11 | Internal missionary intake (`/missionary-intake`) | `form_submissions` (`missionary_application` — reuses the application's own form_type) | `assigned_team` only | None | `/admin/applications` (conflated with real applications) | Write-once, and risks being visually confused with row 1 |

**The pattern across every fragmented row (3, 4, 9):** the page that *lists* a submission and the page with the *real status-transition action* are different admin pages. This is a genuinely fixable, low-risk problem independent of any event architecture.

---

## E. Giving Architecture Assessment

**There is no reliable system of record for donations today, in either direction.**

- Every "give" button (`GivingCommitmentForm.submitCommitment`) opens `window.open()` to `https://usa-missionaries-506166.churchcenter.com/giving` or an admin-overridden URL — an external Planning Center Church Center page. The website has zero visibility into whether that tab ever completes a transaction.
- `pco_giving_sync_runs` / `pco_giving_records` exist as tables but are never written to by any code path. `src/lib/planning-center/giving-sync.ts` is a 29-line stub checking for three env vars (`PLANNING_CENTER_APP_ID`, `PLANNING_CENTER_SECRET`, `PLANNING_CENTER_GIVING_BASE_URL`) that are present in neither `.env.example` nor `.env.local` — the integration isn't even credentialed in this environment, let alone implemented.
- `support_commitments` is a **pre-donation intent record**, forced to `status = 'pending_giving_setup'` on every public insert. It is only ever marked `active` by a human admin typing a `pcoDonationId` into a form (`PATCH /api/admin/missionary-profiles/support-commitments`) — no code verifies that against an actual transaction.
- `missionary_support_settings.monthly_received` — the number shown publicly as "raised so far" — is a plain integer an admin types by hand. Nothing derives it from any transaction source.
- No `campaign` or `fund` table exists anywhere in the schema's history. No `organization_id` exists on any giving-related table. No chart-of-accounts table exists. `support_commitment_matches` (the reconciliation table) is only ever read, never written — the matching algorithm described in the stub file's own comments was never implemented.

**What would be required before a reliable `donation.received` event could exist:** a real, credentialed integration with either the Planning Center Giving API (webhook or polling sync, populating `pco_giving_records` for real) or a direct payment processor — plus, separately, real `campaigns`/`funds` tables if attribution to those concepts is required. None of this exists today; all of it is genuinely new work, not a gap analysis finding.

**What should remain in Planning Center / QuickBooks rather than being duplicated here:** the actual ledger of record for money movement. This plan does not recommend building a competing transaction store — only, eventually, a thin event that fires once a real gift is confirmed through whichever system ends up being the source of truth.

---

## F. Event Architecture Recommendation — the Smallest Reliable Phase 0 Model

**No event bus, queue, or external workflow platform.** Given: zero background-job infrastructure exists today, all three recommended Phase 0 workflows are synchronous form submissions (not webhook replays), and nothing yet needs asynchronous processing, an append-only Postgres table plus synchronous, in-request consumer calls is not just sufficient — it's the only thing actually justified by what exists.

**Collapse domain event and audit entry into one table for Phase 0 — with the reasoning stated, not assumed:** the architecture document's instruction to keep these separate is right in general and specifically not applicable yet. A domain event and its own audit trail only need to diverge once something autonomous (a retrying consumer, an AI job, a rule engine) starts writing *derived* records that themselves need auditing separately from the source fact. Phase 0 has no such consumer — every event is read by, at most, one synchronous notification call in the same request. Splitting them now would be exactly the premature-generality pattern the architecture document itself argues against repeatedly (module toggles, multi-org grants, elevation automation). Revisit the split the first time a real asynchronous consumer is built.

**Do not build a `work_items` table.** All three Phase 0 workflows already have their own dedicated status column on their own dedicated table (`usam_missionary_applications.status`, `major_gift_inquiries.status`, `prayer_requests.status`/`prayer_partners.status`). A "work item," for Phase 0, is simply: the existing row, in its existing table, with a notification now firing when it's created. `form_submissions` already plays this role for the catch-all sources. A generic cross-table `work_items` table would duplicate state that already exists and would need to stay in sync with it — a maintenance burden with no Phase 0 payoff.

**Do not build a `notifications` table.** For Phase 0's three workflows, "notify" means "call the existing Resend-based email pattern synchronously, right after the insert succeeds, in the same request" — exactly the shape already proven by `sendApplicantApplicationSubmittedEmail` and `sendMajorGiftNotification`. No queue, no retry table, no delivery-status tracking yet; those become worth building the first time Phase 1 introduces a real asynchronous consumer.

### The minimum event envelope

```sql
create table public.platform_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  event_type text not null,
  subject_type text not null,
  subject_id uuid not null,
  actor_type text not null default 'public', -- 'public' | 'admin' | 'system'
  actor_id text,                              -- email or admin_users.email; nullable for public submissions
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  correlation_id uuid not null default gen_random_uuid(),
  schema_version smallint not null default 1,
  constraint platform_events_dedupe unique (subject_type, subject_id, event_type)
);
```

- **`organization_id` is `not null`.** Given only one organization exists in production today, and the codebase already has an established pattern for resolving it (`select id from organizations where slug = 'usa-missionaries'`, used verbatim in the `dos_groups` and `usam_missionary_applications` migrations), Phase 0 should reuse that exact lookup rather than inventing multi-tenant attribution logic for a second tenant that doesn't exist yet. This is honest about scope, not a shortcut around the architecture — the column is real and enforced from day one, populated correctly for the tenant that actually exists.
- **`platform_events_dedupe`** is the idempotency mechanism for Phase 0: since every source event here is a direct form submission (not a replayed webhook), a unique constraint on `(subject_type, subject_id, event_type)` is sufficient to prevent a double-click or a retried request from writing the event twice. A dedicated idempotency-key column, designed for retriable webhook delivery, is deferred until Phase 0 actually has a webhook.
- **`correlation_id`** is reserved but unused in Phase 0 — cheap to add now, genuinely not needed until an event fans out to more than one downstream action, which none of the three Phase 0 workflows do.
- **`schema_version`** is reserved for the same reason — cheap now, meaningful once a second consumer depends on a stable shape.
- **RLS:** `service_role` only, matching the exact pattern already proven by `prayer_logs` and `missionary_profile_page_views` — `revoke all ... from anon, authenticated; grant all ... to service_role;`. This sidesteps the "no org-scoped RLS pattern exists yet" problem (§H) entirely for Phase 0, because nothing except server-side code ever touches this table. Org-scoped, client-readable RLS on this table is explicitly a later-phase problem, once the Organizational Inbox (deferred, §K) needs to render it.
- **Sensitive-data minimization:** `payload` must never carry raw prayer-request text, SSNs, or full financial details — reference the source row by `subject_id` instead. For all three Phase 0 workflows, `payload` should carry only what's needed for the notification copy (a name, an amount if a major gift, a status) — nothing that isn't already visible to whoever the notification goes to.

---

## G. Work-Item and Inbox Recommendation

**What already functions like a work item:** every row in `usam_missionary_applications`, `major_gift_inquiries`, `prayer_requests`, `prayer_partners`, and `form_submissions` already carries a status column and, in most cases, a real admin action that transitions it. Phase 0 needs zero new work-item infrastructure — it needs the existing rows to trigger a notification when they're created, and (per §D's fragmentation finding) for the page that lists a submission to be the same page that can act on it.

**Should Phase 0 build a generic `work_items` table?** No — see §F. Revisit only once a second, genuinely cross-table workflow needs coordinated status beyond what an individual table's own status column expresses.

**Should work items be generated for every event type, or only selected high-value workflows?** Only the three selected in §I. Generating one for every event type in the intake map (§D) before those tables even have real notifications would be scope creep beyond what this plan recommends.

**Should department pages remain the system of record?** Yes, explicitly — this matches the vision document's own Principle 7 ("every entity is a hub, not a dead end"). Nothing in Phase 0 should introduce a second place status lives.

**Deep-linking:** not applicable yet, since there's no aggregating inbox in Phase 0 to link *from* — the notification itself should deep-link directly to the authoritative admin page (e.g., the specific application's row in `/admin/applications`), which is simpler than building an inbox first.

**Assignment:** reuse the free-text email-assignment pattern already established (`assigned_admin_email` on `usam_missionary_applications`) rather than building a real user/team foreign-key system. It's the pattern this codebase already trusts, and Phase 0's three workflows don't need more than that.

**Statuses required now vs. later:** the existing per-table status enums are sufficient for all three Phase 0 workflows. No new status vocabulary is needed. A shared, cross-table status vocabulary (§F of the vision document) is explicitly Phase 1+.

**The cross-department Organizational Inbox itself: deferred.** Per both this brief's own instruction and the vision document's own sequencing discipline, it should not be built until at least two departments have real work-item-generating flows to aggregate — Phase 0 only touches three narrow, single-table workflows, which is not yet a cross-department aggregation problem.

---

## H. Security Prerequisites

**Not a Phase 0 blocker:** a full RLS overhaul of the ~80-table schema, unifying the 31 migrations that hand-roll the `admin_users` subquery instead of calling `is_dos_admin()`, retrofitting organization-scoped RLS onto every existing `dos_*` table, or consolidating the three access-gate systems. None of these are made worse by Phase 0, and none of Phase 0's new surface depends on them being fixed first.

**Must be true before Phase 0's new table and routes ship:**
1. **`platform_events` must use `service_role`-only RLS from its first migration** — not the blanket `is_dos_admin()`-or-equivalent pattern every other admin-gated table uses today, since that pattern grants every admin/editor/viewer unfiltered access regardless of organization, and there is no existing org-scoped RLS precedent to copy correctly (confirmed: zero policies anywhere reference `organization_memberships` as a scoping filter). Locking the table to server-only access sidesteps needing to invent that precedent under time pressure.
2. **Any new `app/api/admin/**` route this plan adds must call `getAdminAuthorization()`/`canEditAdminContent()`**, following the existing pattern exactly — there is no middleware or layout-level backstop (`middleware.ts` matcher is the literal string `"/partners"` only), so this is pure code-review discipline, not a structural guarantee. Given this plan adds new routes at once, this is the single highest-probability regression vector and should be an explicit item on every PR checklist for this work.
3. **Fix the `prayer_requests`/`prayer_partners.organization_id` FK bug (§B.4) if either table is touched by this plan** — `prayer_requests` is one of the three recommended Phase 0 workflows (§I). The fix is a real `alter table ... add constraint ... foreign key`, not a re-run of the broken `add column if not exists`.

**Explicitly deferred:** consolidating `partners-access.ts`/`access.ts`/`admin_users` into one identity system; converting `is_dos_admin()` callers everywhere; adding edge-middleware coverage for `/admin` broadly. None of this is touched by, or a prerequisite for, the three workflows in §I.

---

## I. Recommended Initial Workflows

Three, per the brief's cap, chosen against: real current pain, existing data/routes, low migration risk, clear ownership, meaningful value, testability, and the ability to prove organization attribution and notification delivery end to end.

### 1. Missionary Application Submitted

Already has the richest existing lifecycle and the only table in the intake map where `organization_id` is already a real (if nullable) column. The Phase 0 work here is almost entirely about reliability, not new plumbing: confirm `RESEND_API_KEY` behavior in production, add a `platform_events` row alongside the existing email call (not instead of it), and make a failed send visible somewhere a human will actually see it instead of only a server log. High value — this is literally how missionaries join — and low migration risk, since the table and admin actions already work correctly.

### 2. Major Gift Inquiry

A clean, self-contained table with a single clear purpose, already has a conditional email, and is the clearest instance of §D's fragmentation problem (listed on `/admin/finance`, acted on from `/admin/financial-freedom`). The Phase 0 fix is two-part: add the `platform_events` row + reliable notification at submission, and — the actual highest-value part — make the `/admin/finance` listing deep-link to the real action screen instead of being a read-only dead end, directly fixing the exact failure mode §D found. Small blast radius, easy to test end-to-end (one table, one clear "did a human get notified" success criterion).

### 3. Prayer Request / Prayer Partner Application

The lowest-risk of the three: the admin workflow already exists and already works well (`/admin/prayer` has the richest set of real actions of anything in the intake map — prayed/covered/answered/archived, partner assignment). The only gap is notification, and it's an *acknowledged* gap — both `prayer_requests` and `prayer_partners` submission paths carry an explicit `// TODO: Future email/SMS/DOS integration...` comment admitting it. This is the safest possible proof case for the event-and-notification pattern because nothing about the existing, working lifecycle needs to change — it's purely additive. (This is also the one workflow where the `organization_id` FK bug from §B.4/§H must be fixed as part of the same ticket, since it's the attribution column the new event row depends on.)

### Explicitly not selected, and why

- **Donation received** — no reliable transaction source exists anywhere in the codebase (§E). Selecting this would mean building a payment/PCO integration first, which is out of scope for a gap-analysis-driven Phase 0.
- **Group registration** — this is the DOS ticket in §C, not an NCC workflow. Selecting it here would repeat the exact domain-boundary mistake the architecture document's event-domain sections exist to prevent.
- **Partner document uploaded** — doesn't exist as an intake source; `partners_documents` is an admin-managed library with no public submission path (§D, row 8).
- **Bank statement uploaded** — the Finance document portal itself hasn't been built yet (per the architecture document's own Finance Phase 1); there's nothing to attach an event to.
- **Financial Freedom submission** — a real, valid fourth candidate (same fragmentation pattern as Major Gift, completely silent today) but excluded only to respect the cap of three; it should be the first workflow added once Phase 0's pattern is proven, since it requires no new design decisions, only repetition of the Major Gift ticket's shape.
- **Support commitments** — deliberately excluded even though it's a real gap, because it's entangled with the unreliable giving/reconciliation story in §E; fixing its notification in isolation would create the appearance of progress on giving reliability without actually improving it.
- **Public testimony / quick review** — real gaps, but the promotion path from DOS-side tables into NCC-visible `missionary_fruit_items` is itself unconfirmed by this research (§D, rows 6–7) — building an event on top of a mechanism that isn't fully understood yet risks the ticket silently growing into "also reverse-engineer the Fruit promotion flow."

---

## J. Phase 0 Implementation Plan

### J.1 — `platform_events` table and event-write helper

- **Goal:** a single, minimal, append-only event table (§F) and one small server-side helper function that writes to it, reusable by all three workflows in §I.
- **Existing files/tables affected:** none directly modified; net-new.
- **New files/tables:** `supabase/migrations/<timestamp>_platform_events.sql` (table per §F's DDL); `src/lib/events/record-event.ts` (a `recordEvent({ eventType, subjectType, subjectId, payload })` helper resolving `organization_id` via the existing `usa-missionaries` slug lookup, using `createSupabaseAdminClient()`).
- **Migration requirements:** one new table, `service_role`-only RLS, the dedupe unique constraint from §F.
- **Backfill requirements:** none — Phase 0 only writes forward from the moment it ships; no historical backfill of past applications/inquiries/prayer requests into `platform_events`.
- **Security requirements:** per §H.1 — `service_role`-only RLS from the first migration, no client-side access.
- **Tests required:** a duplicate-insert test confirming the dedupe constraint actually blocks a second identical `(subject_type, subject_id, event_type)`; a test confirming `organization_id` resolves correctly.
- **Rollback strategy:** the table is purely additive and read by nothing else yet — dropping it is safe and has no downstream dependents at this stage.
- **Dependencies:** none.
- **Risks:** low. The main risk is scope creep — resist adding `correlation_id` logic, retry handling, or a second consumer before Phase 1 actually needs them.

### J.2 — Missionary Application: reliability + event

- **Goal:** confirm/harden the existing conditional email, add a `platform_events` row, surface a failed send visibly.
- **Existing files affected:** `app/api/join/submit/route.ts`, `src/lib/email/resend.ts` (read, not modified, to confirm failure-mode behavior).
- **New files:** none beyond J.1's helper, called from the existing submit route.
- **Migration requirements:** none beyond J.1.
- **Backfill:** none.
- **Security requirements:** none beyond J.1 — this route already correctly gates admin-side actions.
- **Tests required:** submission → event row exists; submission with `RESEND_API_KEY` unset → failure is logged somewhere an admin can see (at minimum, a `payload` field on the event row itself recording send success/failure — the event row doubles as the audit trail here, per §F's collapse decision).
- **Rollback strategy:** revert the route change; the underlying application flow is untouched.
- **Dependencies:** J.1.
- **Risks:** low — this is additive to a working flow.

### J.3 — Major Gift Inquiry: reliability + event + inbox deep-link fix

- **Goal:** same event/notification hardening as J.2, plus fix the `/admin/finance` → `/admin/financial-freedom?type=major-gift` fragmentation by making the Finance-page listing link directly to the real action screen.
- **Existing files affected:** `app/api/major-gift-inquiries/route.ts`, `app/admin/finance/page.tsx` (the `OperationsInboxPage` config/rendering for major-gift rows).
- **New files:** none beyond reusing J.1's helper.
- **Migration requirements:** none beyond J.1.
- **Backfill:** none.
- **Security requirements:** none beyond J.1.
- **Tests required:** same shape as J.2; plus a UI test confirming the Finance-page row links to the correct, working action screen.
- **Rollback strategy:** revert independently of J.2; no shared code beyond J.1's helper.
- **Dependencies:** J.1.
- **Risks:** low-medium — the deep-link fix touches a shared component (`OperationsInboxPage`) used by other inboxes; verify it doesn't regress the other `formTypes` configurations on the same page.

### J.4 — Prayer Request / Prayer Partner: FK fix + event + notification

- **Goal:** fix the `organization_id` FK bug (§B.4/§H.3), add the event/notification pattern to both the request and partner-application submission paths, replacing the existing TODO comments with real code.
- **Existing files affected:** `app/api/prayer-requests/route.ts`, `app/api/prayer-team/join/route.ts`; new migration for the FK fix.
- **New files:** `src/lib/prayer/notify-request.ts` (or extend the existing `src/lib/prayer/email.ts`) for the new notification call.
- **Migration requirements:** one small migration: `alter table public.prayer_requests add constraint prayer_requests_organization_id_fkey foreign key (organization_id) references public.organizations(id) on delete set null;` and the equivalent `alter table public.prayer_partners add column if not exists organization_id uuid references public.organizations(id) on delete set null;` (this one genuinely needs the column added correctly, since it was never added with a working FK at all).
- **Backfill requirements:** existing `prayer_requests`/`prayer_partners` rows with a non-null `organization_id` need to be verified against real `organizations.id` values before the constraint is added — if any orphaned/invalid values exist, they must be nulled out first or the `ADD CONSTRAINT` will fail. This is the one step in this plan that requires a real data-verification pass before shipping, not just a schema change.
- **Security requirements:** per §H.1/§H.3.
- **Tests required:** constraint-addition test against current data (should be run against a staging copy first, precisely because of the backfill risk above); event/notification tests matching J.2's shape.
- **Rollback strategy:** the FK addition can be dropped if the backfill reveals unexpected issues; the event/notification code is independently revertible.
- **Dependencies:** J.1. Independent of J.2/J.3.
- **Risks:** medium — this is the only ticket in Phase 0 touching an existing, populated column with a real (if broken) history; the backfill-verification step must not be skipped.

---

## K. Explicit Deferrals

Not built in Phase 0, and why:

- **Autonomous agents, multi-agent orchestration** — no automated consumer of any kind exists yet to justify this; per the architecture document's own automation ladder, this is Phase 4, evaluate-only.
- **Full workflow designer / automation-rules UI** — Phase 0 has three hardcoded workflows; a rules UI has no users yet.
- **Full cross-department Organizational Inbox** — deferred per §G, until at least two departments have real work-item flows to aggregate.
- **Full Finance accounting engine, QuickBooks replacement** — explicitly out of scope per the architecture document's own Finance phasing; nothing in this plan touches accounting.
- **All-table `organization_id` migration** — only the tables actually touched by the three Phase 0 workflows get attention (§J); the other ~9 tables identified as missing `organization_id` in §B.4 are untouched.
- **Dynamic module marketplace / module-toggle UI** — no second tenant exists to justify it (per the architecture document's own repeated sequencing argument, reused here without re-litigating it).
- **Consolidated financial statements** — no reliable financial data exists yet to consolidate (§E).
- **AI touching confidential prayer, HR, or financial records** — no AI is introduced anywhere in this plan; §I's prayer workflow gets a plain templated email, not a drafted one.
- **A `donation.received` event** — no reliable transaction source exists (§E); this is the most important deferral in this document.
- **A generic `work_items` table and a generic `notifications` table** — per §F/§G, the existing per-table status columns and the existing synchronous email pattern are sufficient for Phase 0's scope; building these now would be state that has to be kept in sync with the real tables for no current payoff.
- **Full RLS overhaul, access-gate consolidation, edge-middleware expansion** — per §H, none of these block Phase 0; all remain real technical debt worth a dedicated phase of their own.

---

## L. Sequenced Implementation Tickets

Independently reviewable, in recommended order.

### Ticket 1 — DOS group join-request notification (standalone track)

- **Purpose:** fix the concrete, present pain in §C.
- **Scope:** email notification to the resolved facilitator on join-request submission; pending-count badge on the DOS dashboard and group card; deep-link to the Members tab.
- **Out of scope:** the facilitator-access fragility bug (§C, item 2); SMS; per-person notification preferences.
- **Acceptance criteria:** submitting a join request results in an email to the correct facilitator within the same request cycle; the DOS dashboard shows a nonzero pending count for a group with an open request; opening the notification/badge lands on the correct group's Members tab.
- **Tests:** submission → email-send assertion (mocked Resend call); badge count reflects actual pending row count; regression test that non-pending requests don't count.
- **Dependencies:** none — can start immediately, independent of every other ticket in this document.
- **Recommended order:** can run in parallel with Ticket 2, first among the NCC-side tickets.

### Ticket 2 — `platform_events` table and event-write helper

- **Purpose:** J.1.
- **Scope:** the table, its migration, RLS, the dedupe constraint, and the `recordEvent()` helper.
- **Out of scope:** any caller of the helper (Tickets 3–5 add those); correlation-id logic; any consumer beyond synchronous email.
- **Acceptance criteria:** the table exists with `service_role`-only RLS; a duplicate `(subject_type, subject_id, event_type)` insert is rejected; the helper correctly resolves `organization_id` for the one seeded organization.
- **Tests:** per J.1.
- **Dependencies:** none.
- **Recommended order:** first among the NCC-side tickets — everything else depends on it.

### Ticket 3 — Missionary application event + reliability

- **Purpose:** J.2.
- **Scope:** as described in J.2.
- **Out of scope:** any change to the application review/approval workflow itself, which already works.
- **Acceptance criteria:** per J.2's test list.
- **Tests:** per J.2.
- **Dependencies:** Ticket 2.
- **Recommended order:** second, as the lowest-new-design-decision ticket (mostly hardening an existing flow).

### Ticket 4 — Major gift inquiry event + inbox deep-link fix

- **Purpose:** J.3.
- **Scope:** as described in J.3.
- **Out of scope:** any change to `financial_freedom_inquiries` (a separate, similarly-fragmented table deliberately left for a follow-on ticket, §I).
- **Acceptance criteria:** per J.3's test list.
- **Tests:** per J.3.
- **Dependencies:** Ticket 2. Independent of Ticket 3.
- **Recommended order:** third, or in parallel with Ticket 3 if two engineers are available — no shared files beyond Ticket 2's helper.

### Ticket 5 — Prayer request/partner FK fix + event + notification

- **Purpose:** J.4.
- **Scope:** as described in J.4, including the FK backfill-verification step.
- **Out of scope:** the generic (non-per-missionary) prayer team application (§D, row 5b), which has a separate, lower-priority linkage gap not addressed here.
- **Acceptance criteria:** per J.4's test list, plus explicit confirmation the backfill-verification step was run against a staging copy before the constraint migration ships to production.
- **Tests:** per J.4.
- **Dependencies:** Ticket 2.
- **Recommended order:** last among the four NCC tickets, specifically because it's the only one with real data-migration risk (§J.4) and benefits from the pattern being proven on Tickets 3–4 first.

---

*This document is a snapshot of the repository at the time of research. If the codebase changes materially before implementation begins, re-verify the specific file/table citations above rather than assuming they still hold.*
