-- USA-289: DOS access requests submitted from /dos/setup.
--
-- A DOS access request is its own submission type. It is NOT a USA
-- Missionaries application: those continue through /join into
-- usam_missionary_applications and the Operations missionary review.
--
-- Submitting a request creates exactly one row here with status 'submitted'.
-- It creates no auth user, no workspace, and no membership. Only an
-- Operations reviewer's approval does that (access_status tracks it), and the
-- welcome email is sent only once access_status = 'ready'.
--
-- Duplicate protection, two layers:
--   submission_key   unique, generated once per draft in the browser, so a
--                    double tap or a retried network request returns the row
--                    that already exists instead of inserting another.
--   one open request per email (partial unique index on status 'submitted'),
--                    so the same person cannot queue several reviews.
--
-- Both tables are service-role only: RLS is enabled with no policies, and
-- anon/authenticated have no grants. The public API route validates input and
-- writes through the service role; Operations reads through the service role
-- after its own admin_users authorization.

create extension if not exists pgcrypto;

create table if not exists public.dos_access_requests (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  submission_key text not null unique,
  schema_version integer not null default 1,

  request_type text not null
    check (request_type in ('individual', 'organization')),
  status text not null default 'submitted'
    check (status in ('submitted', 'approved', 'declined')),

  first_name text not null,
  last_name text not null,
  email text not null,
  email_normalized text generated always as (lower(btrim(email))) stored,
  phone text,
  city text,
  region text,

  organization_name text,
  organization_type text,
  organization_role text,
  organization_website text,
  expected_users text,

  -- The full answer set as submitted, including fields not broken out above.
  answers jsonb not null default '{}'::jsonb,

  source_page text,
  referrer text,
  user_agent text,
  submitted_at timestamptz not null default now(),

  -- Review decision.
  decided_at timestamptz,
  decided_by_email text,
  decided_by_user_id uuid,
  decision_note text,
  internal_notes text,

  -- Access provisioning after approval. Declined requests stay 'not_started'.
  access_status text not null default 'not_started'
    check (access_status in ('not_started', 'provisioning', 'ready', 'failed')),
  access_error text,
  access_started_at timestamptz,
  provisioned_at timestamptz,
  provisioned_workspace_id uuid references public.missionary_households(id) on delete set null,
  provisioned_workspace_slug text,
  -- Step-by-step record of what approval created or linked, so a retry
  -- resumes instead of creating anything twice.
  provisioning_outcome jsonb not null default '{}'::jsonb,

  -- Latest welcome email outcome. Every attempt is in dos_access_request_email_attempts.
  welcome_email_status text not null default 'not_sent'
    check (welcome_email_status in ('not_sent', 'sending', 'sent', 'failed')),
  welcome_email_last_attempt_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint dos_access_requests_organization_name_check
    check (request_type <> 'organization' or nullif(btrim(organization_name), '') is not null),
  constraint dos_access_requests_decision_check
    check (status = 'submitted' or decided_at is not null),
  constraint dos_access_requests_access_requires_approval_check
    check (access_status = 'not_started' or status = 'approved'),
  constraint dos_access_requests_welcome_requires_access_check
    check (welcome_email_status = 'not_sent' or access_status = 'ready')
);

create unique index if not exists dos_access_requests_one_open_per_email_idx
  on public.dos_access_requests (email_normalized)
  where status = 'submitted';

create index if not exists dos_access_requests_status_submitted_idx
  on public.dos_access_requests (status, submitted_at desc);

create index if not exists dos_access_requests_email_idx
  on public.dos_access_requests (email_normalized);

create or replace function public.set_dos_access_requests_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_dos_access_requests_updated_at on public.dos_access_requests;
create trigger set_dos_access_requests_updated_at
  before update on public.dos_access_requests
  for each row execute function public.set_dos_access_requests_updated_at();

create table if not exists public.dos_access_request_email_attempts (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.dos_access_requests(id) on delete cascade,
  email_kind text not null default 'welcome'
    check (email_kind in ('welcome')),
  recipient_email text not null,
  -- 'sent' means Resend accepted the message. It does not prove delivery.
  status text not null
    check (status in ('sent', 'failed', 'skipped')),
  provider text not null default 'resend',
  provider_message_id text,
  error_message text,
  idempotency_key text not null unique,
  attempted_by_email text,
  attempted_at timestamptz not null default now()
);

create index if not exists dos_access_request_email_attempts_request_idx
  on public.dos_access_request_email_attempts (request_id, attempted_at desc);

alter table public.dos_access_requests enable row level security;
alter table public.dos_access_request_email_attempts enable row level security;

revoke all on public.dos_access_requests from anon, authenticated;
revoke all on public.dos_access_request_email_attempts from anon, authenticated;

comment on table public.dos_access_requests is
  'USA-289: DOS access requests from /dos/setup. Service-role only. Submission never grants access; approval in Operations provisions it.';
comment on table public.dos_access_request_email_attempts is
  'USA-289: every welcome-email attempt for a DOS access request. status sent = accepted by Resend, not confirmed delivery.';
