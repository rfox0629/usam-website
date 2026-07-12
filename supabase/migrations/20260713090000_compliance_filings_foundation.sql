-- Annual Compliance Center foundation (NCC Finance).
--
-- NOT APPLIED to any database as part of this task. Mirrors the finance_documents
-- pattern (supabase/migrations/20260711120000_finance_documents_foundation.sql):
-- private storage bucket, service-role-only access, gated writes in the app layer
-- via a *_MIGRATION_APPLIED env flag until this is deliberately applied to a real
-- database. Do not run this against the shared production Supabase project without
-- a reviewed decision to do so -- see docs/track-b-platform-events-status.md for
-- the same staging gap, which applies equally here.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'compliance-documents',
  'compliance-documents',
  false,
  20971520,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg'
  ]::text[]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types,
  updated_at = now();

-- One row per (filing_key, period_key) -- e.g. ("arizona-annual-report", "2026")
-- or ("990", "unknown") until a tax year-end is confirmed. filing_key identifies
-- which recurring filing program this is; the *program* definitions themselves
-- (agency, official URL, recurrence rule) live in code
-- (src/lib/compliance/filings.ts), not in this table -- this table only stores
-- the human-entered, per-period state that must never be inferred or fabricated:
-- status, assignment, readiness, confirmation, and the workflow stage.
create table if not exists public.compliance_filings (
  id uuid primary key default gen_random_uuid(),
  filing_key text not null,
  period_key text not null,
  filing_name text not null,
  agency text not null,
  jurisdiction text,
  filing_period text not null,
  original_due_date date,
  extended_due_date date,
  status text not null default 'not_started',
  workflow_stage text not null default 'source_documents_uploaded',
  assigned_person text,
  readiness_percentage integer not null default 0,
  official_filing_url text,
  last_filed_date date,
  confirmation_number text,
  filing_receipt_path text,
  open_questions jsonb not null default '[]'::jsonb,
  missing_documents jsonb not null default '[]'::jsonb,
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint compliance_filings_period_unique unique (filing_key, period_key),
  constraint compliance_filings_readiness_range check (readiness_percentage between 0 and 100),
  constraint compliance_filings_status_check check (status in (
    'not_started',
    'gathering_documents',
    'ai_prepared',
    'missing_information',
    'ready_for_review',
    'approved',
    'filed_pending_confirmation',
    'filed',
    'archived'
  )),
  constraint compliance_filings_workflow_stage_check check (workflow_stage in (
    'source_documents_uploaded',
    'ai_extraction_and_preparation',
    'missing_information_review',
    'human_approval',
    'accountant_or_officer_filing',
    'confirmation_uploaded',
    'filing_marked_complete',
    'next_deadline_scheduled'
  ))
);

-- Status can only ever reach 'filed' through a real confirmation number being
-- recorded -- enforced here, not just in application code, since this table
-- may eventually be written to by more than one code path.
create or replace function public.compliance_filings_require_confirmation()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'filed' and (new.confirmation_number is null or btrim(new.confirmation_number) = '') then
    raise exception 'compliance_filings.status cannot be "filed" without a confirmation_number';
  end if;

  return new;
end;
$$;

drop trigger if exists compliance_filings_require_confirmation_trigger on public.compliance_filings;
create trigger compliance_filings_require_confirmation_trigger
  before insert or update on public.compliance_filings
  for each row execute function public.compliance_filings_require_confirmation();

create index if not exists compliance_filings_filing_key_idx on public.compliance_filings(filing_key);

alter table public.compliance_filings enable row level security;
revoke all on table public.compliance_filings from anon;
revoke all on table public.compliance_filings from authenticated;

-- Source documents the Finance & Compliance Agent prep layer reads from
-- (bank statements, payroll reports, donation reports, board records,
-- governing/formation documents) -- attached per filing.
create table if not exists public.compliance_filing_documents (
  id uuid primary key default gen_random_uuid(),
  filing_id uuid not null references public.compliance_filings(id) on delete cascade,
  doc_category text not null,
  doc_name text not null,
  file_path text not null,
  file_type text,
  file_size bigint,
  created_at timestamptz not null default now(),
  constraint compliance_filing_documents_category_check check (doc_category in (
    'formation_document',
    'bank_statement',
    'payroll_report',
    'donation_report',
    'board_record',
    'governing_document',
    'filing_receipt',
    'other'
  ))
);

create unique index if not exists compliance_filing_documents_file_path_idx
  on public.compliance_filing_documents(file_path);
create index if not exists compliance_filing_documents_filing_id_idx
  on public.compliance_filing_documents(filing_id);

alter table public.compliance_filing_documents enable row level security;
revoke all on table public.compliance_filing_documents from anon;
revoke all on table public.compliance_filing_documents from authenticated;
