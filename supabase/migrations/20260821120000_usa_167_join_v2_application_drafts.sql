-- USA-167: server-side drafts for the USA Missionaries application at /join.
--
-- The V1 flow saved drafts only to browser localStorage under the key
-- dos-unified-setup-draft-v1. That makes a resume link structurally incapable
-- of doing anything: the founder tapped "Continue your application" on a phone
-- and the draft was sitting in a different device's browser. Cross-device
-- resume needs the draft to live on the server, keyed by a token the email can
-- carry.
--
-- This table holds only pre-submission drafts. On submit the canonical record
-- is still written to usam_missionary_applications through the existing
-- USA-172 ingress; nothing here duplicates or replaces that. The draft is then
-- marked submitted and stops being resumable.

create table if not exists public.usam_application_drafts (
  id uuid primary key default gen_random_uuid(),

  -- Looked up by the hash, never by the raw token: a database leak must not
  -- hand out working resume links. The raw token exists only in the applicant's
  -- email and in the URL they click.
  resume_token_hash text not null unique,

  -- Contact address the resume link was sent to. Nullable because step 1 runs
  -- before we have collected an email.
  applicant_email text,
  applicant_name text,

  -- The whole in-progress application. Deliberately jsonb rather than a column
  -- per field: the nine steps are still being shaped, and a draft is not the
  -- canonical record. The canonical schema stays in usam_missionary_applications.
  draft jsonb not null default '{}'::jsonb,

  -- Which step to reopen on. The applicant returns where they left off, not at
  -- the beginning.
  current_step text not null default 'start',

  status text not null default 'draft',

  -- Set when the draft becomes a real application, so the row records what it
  -- turned into rather than being deleted.
  submitted_application_id uuid,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_resumed_at timestamptz,

  -- A resume link is a bearer credential sent by email, so it expires.
  expires_at timestamptz not null default now() + interval '90 days'
);

alter table public.usam_application_drafts drop constraint if exists usam_application_drafts_status_check;
alter table public.usam_application_drafts add constraint usam_application_drafts_status_check
  check (status in ('draft', 'submitted', 'abandoned'));

create index if not exists usam_application_drafts_email_idx
  on public.usam_application_drafts (lower(applicant_email))
  where applicant_email is not null;

create index if not exists usam_application_drafts_status_idx
  on public.usam_application_drafts (status, updated_at desc);

-- No public role touches this table. Draft reads and writes go through the
-- /join API routes using the service role, which resolves the token hash
-- server-side. There is no client-side path to a draft, by design: anyone
-- holding a raw token could otherwise enumerate applications.
alter table public.usam_application_drafts enable row level security;

drop policy if exists "usam_application_drafts_no_public_access" on public.usam_application_drafts;
create policy "usam_application_drafts_no_public_access"
  on public.usam_application_drafts
  for all
  using (false)
  with check (false);

comment on table public.usam_application_drafts is
  'USA-167 pre-submission drafts for the USA Missionaries application at /join. Resume links carry a raw token whose sha256 is stored in resume_token_hash. Canonical submitted applications remain in usam_missionary_applications.';
