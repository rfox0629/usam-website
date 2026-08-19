-- USA-181 Finance V2 foundation.
--
-- Adds the canonical financial-operations model: document evidence layer,
-- append-only compliance facts, curated compliance rule registry, tax periods,
-- banking/statements, bank transactions, reconciliation, and the 990 workpaper
-- readiness map. Planning Center Giving is untouched: pco_giving_records stays
-- the sole donation source and no table here duplicates it.

-- ---------------------------------------------------------------- shared util
create or replace function public.set_finance_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- --------------------------------------------------------------- doc evidence
create table if not exists public.finance_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  document_type text not null default 'other',
  title text not null,
  storage_path text not null,
  file_name text not null,
  file_size bigint,
  mime_type text,
  file_hash text not null,
  status text not null default 'uploaded',
  jurisdiction text,
  tax_period_id uuid,
  bank_account_id uuid,
  statement_month date,
  notes text,
  uploaded_by text,
  uploaded_at timestamptz not null default now(),
  superseded_by_document_id uuid references public.finance_documents(id) on delete set null,
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_documents_status_check check (
    status in ('uploaded', 'parsed', 'suggested', 'verified', 'superseded', 'archived')
  ),
  constraint finance_documents_type_check check (
    document_type in (
      'articles_of_incorporation', 'irs_determination_letter', 'form_1023',
      'ein_letter', 'prior_990', 'extension_confirmation', 'state_annual_report',
      'charity_registration', 'accounting_period_election', 'cpa_letter',
      'bank_statement', 'receipt', 'other'
    )
  )
);

-- Same file uploaded twice into one organization is a duplicate, not a version.
create unique index if not exists finance_documents_org_hash_uidx
  on public.finance_documents(organization_id, file_hash);
create index if not exists finance_documents_org_type_idx
  on public.finance_documents(organization_id, document_type, uploaded_at desc);
create index if not exists finance_documents_statement_idx
  on public.finance_documents(bank_account_id, statement_month)
  where bank_account_id is not null;

comment on table public.finance_documents is
  'Permanent finance/compliance source evidence. Originals are never mutated or deleted; a newer file supersedes via superseded_by_document_id.';

-- ------------------------------------------------------- extraction contract
-- Built so manual confirmation works today and automated extraction plugs into
-- the identical downstream path later. method distinguishes the two.
create table if not exists public.document_extractions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.finance_documents(id) on delete cascade,
  method text not null default 'manual',
  model_version text,
  status text not null default 'complete',
  extracted_by text,
  extracted_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint document_extractions_method_check check (method in ('manual', 'ai')),
  constraint document_extractions_status_check check (status in ('pending', 'complete', 'failed'))
);

create index if not exists document_extractions_document_idx
  on public.document_extractions(document_id, extracted_at desc);

create table if not exists public.document_extraction_facts (
  id uuid primary key default gen_random_uuid(),
  extraction_id uuid not null references public.document_extractions(id) on delete cascade,
  fact_key text not null,
  suggested_value text,
  source_reference text,
  confidence numeric(5, 2),
  applied_fact_id uuid,
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint document_extraction_facts_confidence_check
    check (confidence is null or (confidence >= 0 and confidence <= 100))
);

create index if not exists document_extraction_facts_extraction_idx
  on public.document_extraction_facts(extraction_id);

comment on table public.document_extraction_facts is
  'Candidate facts suggested from a source document. A suggestion only becomes canonical through an explicit human confirm/correct that writes compliance_facts.';

-- ------------------------------------------------------ compliance facts
-- Append-only. Correcting a fact supersedes the prior row and inserts a new
-- one, so a verified value can never be silently overwritten.
create table if not exists public.compliance_facts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  fact_key text not null,
  value_text text,
  value_date date,
  value_number numeric(18, 4),
  value_json jsonb,
  verification_state text not null default 'suggested',
  source_document_id uuid references public.finance_documents(id) on delete set null,
  source_reference text,
  extraction_fact_id uuid references public.document_extraction_facts(id) on delete set null,
  verified_by text,
  verified_at timestamptz,
  notes text,
  superseded_at timestamptz,
  superseded_by_fact_id uuid references public.compliance_facts(id) on delete set null,
  created_by text,
  created_at timestamptz not null default now(),
  constraint compliance_facts_state_check check (
    verification_state in ('suggested', 'verified', 'needs_cpa_review', 'cpa_confirmed')
  ),
  -- A verified or CPA-confirmed compliance fact must name who stood behind it.
  constraint compliance_facts_verifier_check check (
    verification_state in ('suggested', 'needs_cpa_review')
    or (verified_by is not null and verified_at is not null)
  )
);

create unique index if not exists compliance_facts_current_uidx
  on public.compliance_facts(organization_id, fact_key)
  where superseded_at is null;
create index if not exists compliance_facts_history_idx
  on public.compliance_facts(organization_id, fact_key, created_at desc);

comment on table public.compliance_facts is
  'Canonical organization compliance facts. Append-only: the row with superseded_at is null is current. fact_key is open text, validated in application code, so new facts need no migration.';

-- ------------------------------------------------------------- tax periods
create table if not exists public.tax_periods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  label text not null,
  period_start date,
  period_end date,
  period_type text not null default 'annual',
  accounting_method text,
  is_verified boolean not null default false,
  source_document_id uuid references public.finance_documents(id) on delete set null,
  status text not null default 'open',
  cpa_notes text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tax_periods_type_check check (period_type in ('first_short', 'annual', 'short_change')),
  constraint tax_periods_status_check check (
    status in ('open', 'closing', 'cpa_package_ready', 'filed')
  ),
  -- A period may only be called verified when a source document backs it.
  constraint tax_periods_verified_source_check check (
    is_verified = false or (source_document_id is not null and period_start is not null and period_end is not null)
  )
);

create index if not exists tax_periods_org_idx on public.tax_periods(organization_id, period_end desc);

alter table public.finance_documents
  drop constraint if exists finance_documents_tax_period_fk;
alter table public.finance_documents
  add constraint finance_documents_tax_period_fk
  foreign key (tax_period_id) references public.tax_periods(id) on delete set null;

-- --------------------------------------------------- compliance rule registry
-- Curated, versioned product data. Never populated or altered at runtime by AI
-- or web lookup; updating law is a product maintenance migration.
create table if not exists public.compliance_rules (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null,
  jurisdiction text not null,
  entity_type_applicability text[] not null default array['nonprofit_corporation'],
  filing_name text not null,
  agency text not null,
  recurrence text not null default 'annual',
  calculation_type text not null,
  calculation_config jsonb not null default '{}'::jsonb,
  business_day_adjustment boolean not null default true,
  extension_available boolean not null default false,
  extension_form text,
  extension_months integer,
  fee_note text,
  authoritative_source_url text,
  authoritative_source_note text,
  rule_version text not null default 'v1',
  effective_from date,
  effective_to date,
  last_verified_at date,
  last_verified_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint compliance_rules_calculation_type_check check (
    calculation_type in ('months_after_period_end', 'fixed_annual_date', 'anniversary', 'state_assigned')
  )
);

create unique index if not exists compliance_rules_key_version_uidx
  on public.compliance_rules(rule_key, rule_version);

comment on table public.compliance_rules is
  'Curated federal/state filing rules. Product-maintained and versioned; runtime never researches rules.';

-- ------------------------------------------- organization filing obligations
create table if not exists public.compliance_obligations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  rule_key text not null,
  jurisdiction text not null,
  is_applicable boolean not null default true,
  organization_assigned_due_date date,
  assigned_date_source_document_id uuid references public.finance_documents(id) on delete set null,
  assigned_date_verified_by text,
  assigned_date_verified_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists compliance_obligations_org_rule_uidx
  on public.compliance_obligations(organization_id, rule_key);

comment on column public.compliance_obligations.organization_assigned_due_date is
  'For state_assigned rules such as the Arizona annual report, the date the agency assigned to this specific organization. Must come from the agency record or a filed report, never a default.';

create table if not exists public.compliance_filings (
  id uuid primary key default gen_random_uuid(),
  obligation_id uuid not null references public.compliance_obligations(id) on delete cascade,
  tax_period_id uuid references public.tax_periods(id) on delete set null,
  rule_version text,
  computed_due_date date,
  computed_inputs jsonb not null default '{}'::jsonb,
  extension_filed boolean not null default false,
  extension_due_date date,
  extension_source_document_id uuid references public.finance_documents(id) on delete set null,
  status text not null default 'needs_verification',
  filed_at date,
  confirmation_reference text,
  source_document_id uuid references public.finance_documents(id) on delete set null,
  reviewed_by text,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint compliance_filings_status_check check (
    status in ('needs_verification', 'upcoming', 'due_soon', 'ready_for_review', 'filed', 'extended', 'overdue', 'not_applicable')
  ),
  -- The product never claims Filed without a recorded external confirmation.
  constraint compliance_filings_filed_check check (
    status <> 'filed' or (filed_at is not null and confirmation_reference is not null)
  )
);

create index if not exists compliance_filings_due_idx
  on public.compliance_filings(status, computed_due_date);

comment on column public.compliance_filings.computed_inputs is
  'Every input that produced computed_due_date: period end, rule version, offset applied, unadjusted date, and any business-day adjustment. This is what makes the date explainable.';

-- ----------------------------------------------------------------- banking
create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null,
  institution text,
  account_type text not null default 'checking',
  last4 text,
  currency text not null default 'USD',
  is_active boolean not null default true,
  opened_on date,
  closed_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bank_accounts_type_check check (account_type in ('checking', 'savings', 'money_market', 'credit_card', 'other')),
  constraint bank_accounts_last4_check check (last4 is null or last4 ~ '^[0-9]{4}$')
);

create index if not exists bank_accounts_org_idx on public.bank_accounts(organization_id, is_active);

alter table public.finance_documents
  drop constraint if exists finance_documents_bank_account_fk;
alter table public.finance_documents
  add constraint finance_documents_bank_account_fk
  foreign key (bank_account_id) references public.bank_accounts(id) on delete set null;

create table if not exists public.bank_statements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  bank_account_id uuid not null references public.bank_accounts(id) on delete cascade,
  tax_period_id uuid references public.tax_periods(id) on delete set null,
  statement_month date not null,
  period_start date,
  period_end date,
  opening_balance numeric(14, 2),
  closing_balance numeric(14, 2),
  document_id uuid references public.finance_documents(id) on delete set null,
  status text not null default 'missing',
  uploaded_by text,
  uploaded_at timestamptz,
  reviewed_by text,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bank_statements_status_check check (
    status in ('missing', 'uploaded', 'parsed', 'reconciled', 'reviewed')
  )
);

create unique index if not exists bank_statements_account_month_uidx
  on public.bank_statements(bank_account_id, statement_month);

-- ------------------------------------------------------------ transactions
create table if not exists public.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  bank_account_id uuid not null references public.bank_accounts(id) on delete cascade,
  statement_id uuid references public.bank_statements(id) on delete set null,
  posted_at date,
  transaction_date date,
  description text,
  payee text,
  amount numeric(14, 2) not null,
  direction text not null,
  category text,
  account_code text,
  functional_allocation text,
  missionary_profile_id uuid,
  donor_restriction text,
  receipt_document_id uuid references public.finance_documents(id) on delete set null,
  review_status text not null default 'unreviewed',
  source text not null default 'manual',
  external_ref text,
  raw_payload jsonb not null default '{}'::jsonb,
  notes text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bank_transactions_direction_check check (direction in ('debit', 'credit')),
  constraint bank_transactions_allocation_check check (
    functional_allocation is null
    or functional_allocation in ('program_services', 'management_general', 'fundraising')
  ),
  constraint bank_transactions_restriction_check check (
    donor_restriction is null or donor_restriction in ('without_donor_restriction', 'with_donor_restriction')
  ),
  constraint bank_transactions_review_check check (
    review_status in ('unreviewed', 'categorized', 'reconciled', 'needs_review')
  ),
  constraint bank_transactions_source_check check (source in ('statement_import', 'manual'))
);

create index if not exists bank_transactions_account_date_idx
  on public.bank_transactions(bank_account_id, transaction_date desc);
create index if not exists bank_transactions_review_idx
  on public.bank_transactions(organization_id, review_status, transaction_date desc);
create unique index if not exists bank_transactions_external_ref_uidx
  on public.bank_transactions(bank_account_id, external_ref)
  where external_ref is not null;

comment on column public.bank_transactions.raw_payload is
  'Imported source row, retained unchanged. Classification edits never rewrite it.';

-- Classification history. Imported values are never destructively overwritten
-- without a record of who changed what.
create table if not exists public.bank_transaction_audit (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.bank_transactions(id) on delete cascade,
  field_name text not null,
  previous_value text,
  new_value text,
  changed_by text,
  changed_at timestamptz not null default now(),
  note text
);

create index if not exists bank_transaction_audit_txn_idx
  on public.bank_transaction_audit(transaction_id, changed_at desc);

-- --------------------------------------------------------- reconciliation
create table if not exists public.reconciliation_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  bank_account_id uuid not null references public.bank_accounts(id) on delete cascade,
  statement_id uuid references public.bank_statements(id) on delete set null,
  opening_balance numeric(14, 2),
  cleared_total numeric(14, 2),
  statement_ending_balance numeric(14, 2),
  calculated_balance numeric(14, 2),
  difference numeric(14, 2),
  status text not null default 'in_progress',
  reviewed_by text,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reconciliation_sessions_status_check check (
    status in ('in_progress', 'balanced', 'unresolved', 'reviewed')
  )
);

create index if not exists reconciliation_sessions_account_idx
  on public.reconciliation_sessions(bank_account_id, created_at desc);

-- Join table, so one deposit matching many gifts and one gift split across
-- deposits both work without a schema change.
create table if not exists public.reconciliation_matches (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.reconciliation_sessions(id) on delete cascade,
  bank_transaction_id uuid references public.bank_transactions(id) on delete set null,
  matched_source_type text not null,
  matched_source_id text,
  amount numeric(14, 2),
  match_status text not null default 'suggested',
  matched_by text,
  matched_at timestamptz not null default now(),
  note text,
  constraint reconciliation_matches_source_check check (
    matched_source_type in ('pco_giving', 'transfer', 'payroll', 'fee', 'refund', 'check', 'cash', 'manual', 'unresolved')
  ),
  constraint reconciliation_matches_status_check check (
    match_status in ('suggested', 'confirmed', 'rejected')
  )
);

create index if not exists reconciliation_matches_session_idx
  on public.reconciliation_matches(session_id, match_status);

-- ------------------------------------------------------- 990 readiness map
create table if not exists public.form_990_workpapers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  tax_period_id uuid not null references public.tax_periods(id) on delete cascade,
  part_key text not null,
  readiness text not null default 'not_started',
  computed_summary jsonb not null default '{}'::jsonb,
  narrative text,
  source_document_id uuid references public.finance_documents(id) on delete set null,
  reviewer text,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint form_990_workpapers_readiness_check check (
    readiness in ('not_started', 'data_available', 'needs_review', 'ready', 'needs_cpa_review', 'cpa_confirmed', 'not_applicable')
  )
);

create unique index if not exists form_990_workpapers_period_part_uidx
  on public.form_990_workpapers(tax_period_id, part_key);

comment on table public.form_990_workpapers is
  'Readiness map connecting real source data to 990 Parts and Schedules. Schedule triggers are Needs review prompts, never asserted conclusions.';

-- ------------------------------------------------------------- updated_at
do $$
declare
  t text;
begin
  foreach t in array array[
    'finance_documents', 'tax_periods', 'compliance_rules', 'compliance_obligations',
    'compliance_filings', 'bank_accounts', 'bank_statements', 'bank_transactions',
    'reconciliation_sessions', 'form_990_workpapers'
  ]
  loop
    execute format('drop trigger if exists set_%1$s_updated_at on public.%1$I', t);
    execute format(
      'create trigger set_%1$s_updated_at before update on public.%1$I for each row execute function public.set_finance_updated_at()',
      t
    );
  end loop;
end $$;

-- ------------------------------------------------------------------- RLS
-- Finance data is admin-only, matching the pco_* pattern already in production
-- and staying tighter than scoped reviewer access.
do $$
declare
  t text;
begin
  foreach t in array array[
    'finance_documents', 'document_extractions', 'document_extraction_facts',
    'compliance_facts', 'tax_periods', 'compliance_rules', 'compliance_obligations',
    'compliance_filings', 'bank_accounts', 'bank_statements', 'bank_transactions',
    'bank_transaction_audit', 'reconciliation_sessions', 'reconciliation_matches',
    'form_990_workpapers'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon', t);
    execute format('revoke all on table public.%I from authenticated', t);
    execute format('grant select, insert, update on table public.%I to authenticated', t);
    execute format('drop policy if exists "Admins manage %1$s" on public.%1$I', t);
    execute format($p$
      create policy "Admins manage %1$s" on public.%1$I for all to authenticated
      using (exists (select 1 from public.admin_users
        where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
          and admin_users.role = 'admin'))
      with check (exists (select 1 from public.admin_users
        where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
          and admin_users.role = 'admin'))
    $p$, t);
  end loop;
end $$;

-- --------------------------------------------------------- private storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'finance-documents',
  'finance-documents',
  false,
  26214400,
  array['application/pdf', 'image/png', 'image/jpeg', 'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
on conflict (id) do nothing;
