-- Finance Operations foundation (990 preparation workspace).
--
-- NOT APPLIED to any database as part of this task. Do not apply to production
-- until docs/finance-migration-test-plan.md has been run against a staging
-- environment per docs/finance-staging-setup.md. Gated in the app layer behind
-- FINANCE_OPERATIONS_MIGRATION_APPLIED, matching the finance_documents and
-- compliance_filings pattern.
--
-- Explicitly NOT a general ledger or double-entry accounting engine: there is
-- no chart of accounts, no debit/credit posting, no account balancing logic.
-- This is a transaction *staging and review* layer that feeds draft workpapers
-- an accountant reviews -- QuickBooks (or whatever the real ledger is) remains
-- the system of record, per docs/ncc-architecture.md §20.

-- One row per real-world bank/credit-card account transactions are imported
-- against. Deliberately minimal -- no balance tracking, no reconciliation
-- state machine.
create table if not exists public.finance_financial_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  name text not null,
  institution text,
  account_type text not null,
  last_four text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint finance_financial_accounts_type_check check (account_type in (
    'checking', 'savings', 'credit_card', 'other'
  ))
);

alter table public.finance_financial_accounts enable row level security;
revoke all on table public.finance_financial_accounts from anon;
revoke all on table public.finance_financial_accounts from authenticated;

-- Tracks each CSV upload as a batch, independent of the individual
-- transaction rows it produced -- gives an audit trail of who imported what,
-- when, and how many rows were new vs. duplicate vs. rejected.
create table if not exists public.finance_transaction_imports (
  id uuid primary key default gen_random_uuid(),
  financial_account_id uuid not null references public.finance_financial_accounts(id),
  source_document_id uuid references public.compliance_filing_documents(id),
  file_name text not null,
  imported_by text not null,
  row_count integer not null default 0,
  imported_count integer not null default 0,
  duplicate_count integer not null default 0,
  error_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.finance_transaction_imports enable row level security;
revoke all on table public.finance_transaction_imports from anon;
revoke all on table public.finance_transaction_imports from authenticated;

-- The transaction staging table. proposed_category is written only by the
-- rule-based suggestion pass (never by a human); approved_category is written
-- only by a human action -- these are two separate columns on purpose, so an
-- AI/rule-based suggestion can never silently become the accounting value of
-- record. review_status governs what's usable in a workpaper: only
-- 'approved' rows should be summed into a draft P&L/Balance Sheet.
create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  financial_account_id uuid not null references public.finance_financial_accounts(id),
  transaction_date date not null,
  posted_date date,
  description text not null,
  amount numeric(12, 2) not null,
  transaction_type text not null,
  source_document_id uuid references public.compliance_filing_documents(id),
  import_batch_id uuid references public.finance_transaction_imports(id) on delete set null,
  external_transaction_id text,
  proposed_category text,
  approved_category text,
  functional_classification text,
  fund_or_restriction text,
  review_status text not null default 'imported',
  reviewed_by text,
  reviewed_at timestamptz,
  notes text,
  dedupe_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_transactions_type_check check (transaction_type in (
    'debit', 'credit'
  )),
  constraint finance_transactions_review_status_check check (review_status in (
    'imported', 'needs_review', 'categorized', 'needs_information', 'approved', 'excluded'
  )),
  constraint finance_transactions_functional_classification_check check (
    functional_classification is null or functional_classification in (
      'program', 'management_and_general', 'fundraising'
    )
  )
);

-- Dedupe strategy: prefer external_transaction_id when the source provides
-- one (most bank exports do); otherwise fall back to a composite of account +
-- date + amount + description, computed by the application before insert
-- (see src/lib/finance-ops/transactions.ts::dedupeKeyFor) rather than by a
-- database expression, so the exact hashing logic is one reviewable function.
create unique index if not exists finance_transactions_dedupe_key_idx
  on public.finance_transactions(financial_account_id, dedupe_key);

create index if not exists finance_transactions_review_status_idx on public.finance_transactions(review_status);
create index if not exists finance_transactions_transaction_date_idx on public.finance_transactions(transaction_date);
create index if not exists finance_transactions_import_batch_id_idx on public.finance_transactions(import_batch_id);

alter table public.finance_transactions enable row level security;
revoke all on table public.finance_transactions from anon;
revoke all on table public.finance_transactions from authenticated;

-- Generic store for every rule-based/AI suggestion the preparation layer
-- produces (document classification, reporting-period guess, missing-document
-- flags, payroll detection, unusual-transaction flags, draft questions,
-- draft workpaper narrative) -- kept entirely separate from any table that
-- holds an approved accounting value, so a suggestion can never be mistaken
-- for a human-approved fact. status defaults to 'pending' and only a human
-- action can move it to 'accepted'; nothing here writes back into
-- finance_transactions.approved_category or any other approved-value column.
create table if not exists public.finance_ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  filing_id uuid references public.compliance_filings(id) on delete cascade,
  subject_type text not null,
  subject_id text not null,
  suggestion_type text not null,
  suggested_value jsonb not null,
  confidence numeric(3, 2),
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_by text,
  reviewed_at timestamptz,
  constraint finance_ai_suggestions_status_check check (status in ('pending', 'accepted', 'rejected'))
);

create index if not exists finance_ai_suggestions_subject_idx on public.finance_ai_suggestions(subject_type, subject_id);
create index if not exists finance_ai_suggestions_filing_id_idx on public.finance_ai_suggestions(filing_id);

alter table public.finance_ai_suggestions enable row level security;
revoke all on table public.finance_ai_suggestions from anon;
revoke all on table public.finance_ai_suggestions from authenticated;

-- One row per generated draft report. data holds the actual computed report
-- content (a jsonb snapshot, not a live view) so a workpaper reflects exactly
-- what existed when it was prepared, even if transactions are edited later --
-- re-generating creates a new row rather than mutating the old one.
create table if not exists public.finance_draft_workpapers (
  id uuid primary key default gen_random_uuid(),
  filing_id uuid references public.compliance_filings(id) on delete cascade,
  workpaper_type text not null,
  source_period_start date not null,
  source_period_end date not null,
  prepared_at timestamptz not null default now(),
  prepared_by text not null,
  data jsonb not null default '{}'::jsonb,
  missing_data_warnings jsonb not null default '[]'::jsonb,
  reviewed_by text,
  review_status text not null default 'draft',
  constraint finance_draft_workpapers_type_check check (workpaper_type in (
    'profit_and_loss',
    'balance_sheet',
    'revenue_summary',
    'contribution_summary',
    'expense_detail',
    'functional_expense_allocation',
    'payroll_summary',
    'officer_compensation_summary',
    'year_end_cash_reconciliation',
    'restricted_fund_worksheet',
    'uncategorized_transactions_report'
  )),
  constraint finance_draft_workpapers_review_status_check check (review_status in (
    'draft', 'reviewed', 'approved'
  ))
);

create index if not exists finance_draft_workpapers_filing_id_idx on public.finance_draft_workpapers(filing_id);
create index if not exists finance_draft_workpapers_type_idx on public.finance_draft_workpapers(workpaper_type);

alter table public.finance_draft_workpapers enable row level security;
revoke all on table public.finance_draft_workpapers from anon;
revoke all on table public.finance_draft_workpapers from authenticated;

-- Structured worksheets that aren't derivable from transactions at all
-- (governance questionnaire, program-accomplishments narrative, officer
-- compensation roster). One discriminated table rather than three, mirroring
-- compliance_filings.extra -- each worksheet_type's shape is documented in
-- src/lib/finance-ops/types.ts, not enforced at the schema level, since these
-- are narrative/worksheet content rather than accounting facts.
create table if not exists public.finance_990_worksheets (
  id uuid primary key default gen_random_uuid(),
  filing_id uuid not null references public.compliance_filings(id) on delete cascade,
  worksheet_type text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text,
  constraint finance_990_worksheets_type_check check (worksheet_type in (
    'governance', 'program_accomplishments', 'officer_compensation'
  )),
  constraint finance_990_worksheets_unique unique (filing_id, worksheet_type)
);

alter table public.finance_990_worksheets enable row level security;
revoke all on table public.finance_990_worksheets from anon;
revoke all on table public.finance_990_worksheets from authenticated;

-- A generated snapshot of what an accountant package contained and when --
-- the package itself is compiled from already-persisted data at generation
-- time and rendered/downloaded client-side; this table exists purely as a
-- record that a package was generated, by whom, and a manifest of what it
-- referenced. There is no send/export-delivery mechanism here on purpose.
create table if not exists public.finance_accountant_packages (
  id uuid primary key default gen_random_uuid(),
  filing_id uuid references public.compliance_filings(id) on delete cascade,
  generated_at timestamptz not null default now(),
  generated_by text not null,
  manifest jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  constraint finance_accountant_packages_status_check check (status in ('draft', 'ready'))
);

create index if not exists finance_accountant_packages_filing_id_idx on public.finance_accountant_packages(filing_id);

alter table public.finance_accountant_packages enable row level security;
revoke all on table public.finance_accountant_packages from anon;
revoke all on table public.finance_accountant_packages from authenticated;
