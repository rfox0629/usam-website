# Finance Production Activation Runbook

**For Ryan to execute directly.** I (Claude) have no Supabase credentials in
this environment — no management/access token, no direct Postgres
connection string, no dashboard login — so I cannot run any of this myself.
This is the exact, copy-pasteable sequence to apply the 4 Finance
migrations to production and turn the feature on, one step at a time, with
a real check after each step before moving to the next.

**Stop and tell me the exact error if any step fails.** Do not continue to
the next migration, and do not manually mark a failed step as applied —
we'll diagnose together before proceeding.

## Before you start

**You almost certainly don't need a separate seeding step for yourself.**
Your existing `admin_users` row (role `admin`) already maps to
`finance_owner` automatically once the code is live — see
`src/lib/finance-auth.ts::resolveFinanceAccess()`. The
`finance_team_permissions` migration (step 4) exists so a *future*
accountant can get Finance-only access without an `admin_users` row; it's
not required for your own access.

Confirm this first — run in the Supabase SQL Editor:

```sql
select email, role, is_active from public.admin_users where lower(email) = lower('YOUR_LOGIN_EMAIL_HERE');
```

If `role` is `admin` and `is_active` is `true`, you're set — you'll get
`finance_owner` automatically the moment the migrations below are applied
and the matching feature flags are on. If it says something else, tell me
before continuing.

## Option A (recommended): Supabase CLI, if you have it installed locally

This is the repo's normal migration process and automatically records
migration history correctly.

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

This applies every pending migration in `supabase/migrations/` in order —
including the 4 Finance ones, since nothing else is pending ahead of them
(confirmed: they're the newest 4 files in the directory, and none of their
table names collide with anything already applied). Skip to
["After migrations are applied"](#after-migrations-are-applied) once this
succeeds.

## Option B: Supabase Dashboard SQL Editor, one migration at a time

If the CLI isn't set up, run each block below in
**Supabase Dashboard → SQL Editor → New Query**, one at a time, waiting for
success before the next.

### Step 1 — `20260711120000_finance_documents_foundation.sql`

```sql
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'finance-documents',
  'finance-documents',
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

create table if not exists public.finance_documents (
  id uuid primary key default gen_random_uuid(),
  group_name text not null,
  doc_name text not null,
  file_path text not null,
  file_type text,
  file_size bigint,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists finance_documents_file_path_idx
  on public.finance_documents(file_path);

create index if not exists finance_documents_group_name_idx
  on public.finance_documents(group_name);

alter table public.finance_documents enable row level security;

revoke all on table public.finance_documents from anon;
revoke all on table public.finance_documents from authenticated;
```

**Verify:**
```sql
select count(*) from public.finance_documents;                 -- expect 0
select id, public from storage.buckets where id = 'finance-documents';  -- expect public = false
```

### Step 2 — `20260713090000_compliance_filings_foundation.sql`

```sql
insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
values (
  'compliance-documents', 'compliance-documents', false, 20971520,
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
set public = false, file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types, updated_at = now();

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
    'not_started', 'gathering_documents', 'ai_prepared', 'missing_information',
    'ready_for_review', 'approved', 'filed_pending_confirmation', 'filed', 'archived'
  )),
  constraint compliance_filings_workflow_stage_check check (workflow_stage in (
    'source_documents_uploaded', 'ai_extraction_and_preparation', 'missing_information_review',
    'human_approval', 'accountant_or_officer_filing', 'confirmation_uploaded',
    'filing_marked_complete', 'next_deadline_scheduled'
  ))
);

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
    'formation_document', 'bank_statement', 'payroll_report', 'donation_report',
    'board_record', 'governing_document', 'filing_receipt', 'other'
  ))
);

create unique index if not exists compliance_filing_documents_file_path_idx
  on public.compliance_filing_documents(file_path);
create index if not exists compliance_filing_documents_filing_id_idx
  on public.compliance_filing_documents(filing_id);

alter table public.compliance_filing_documents enable row level security;
revoke all on table public.compliance_filing_documents from anon;
revoke all on table public.compliance_filing_documents from authenticated;
```

**Verify:**
```sql
select count(*) from public.compliance_filings;            -- expect 0
select count(*) from public.compliance_filing_documents;   -- expect 0
-- confirm the trigger really blocks a bad update:
insert into public.compliance_filings (filing_key, period_key, filing_name, agency, filing_period)
values ('test', 'delete-me', 'Test', 'Test Agency', 'Test');
update public.compliance_filings set status = 'filed' where filing_key = 'test';  -- expect this to FAIL with the trigger's error
delete from public.compliance_filings where filing_key = 'test';  -- clean up the test row either way
```

### Step 3 — `20260714090000_finance_operations_foundation.sql`

```sql
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
  constraint finance_transactions_type_check check (transaction_type in ('debit', 'credit')),
  constraint finance_transactions_review_status_check check (review_status in (
    'imported', 'needs_review', 'categorized', 'needs_information', 'approved', 'excluded'
  )),
  constraint finance_transactions_functional_classification_check check (
    functional_classification is null or functional_classification in (
      'program', 'management_and_general', 'fundraising'
    )
  )
);

create unique index if not exists finance_transactions_dedupe_key_idx
  on public.finance_transactions(financial_account_id, dedupe_key);
create index if not exists finance_transactions_review_status_idx on public.finance_transactions(review_status);
create index if not exists finance_transactions_transaction_date_idx on public.finance_transactions(transaction_date);
create index if not exists finance_transactions_import_batch_id_idx on public.finance_transactions(import_batch_id);

alter table public.finance_transactions enable row level security;
revoke all on table public.finance_transactions from anon;
revoke all on table public.finance_transactions from authenticated;

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
    'profit_and_loss', 'balance_sheet', 'revenue_summary', 'contribution_summary',
    'expense_detail', 'functional_expense_allocation', 'payroll_summary',
    'officer_compensation_summary', 'year_end_cash_reconciliation',
    'restricted_fund_worksheet', 'uncategorized_transactions_report'
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
```

**Verify:**
```sql
select count(*) from public.finance_financial_accounts;   -- expect 0
select count(*) from public.finance_transactions;          -- expect 0
-- confirm organizations FK resolves for USAM:
select id, name, slug from public.organizations where slug = 'usa-missionaries';  -- expect exactly 1 row
```

### Step 4 — `20260715090000_finance_team_permissions_foundation.sql`

```sql
create table if not exists public.finance_team_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  finance_role text not null,
  invited_by text not null,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  disabled_at timestamptz,
  last_access_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_team_members_role_check check (finance_role in (
    'finance_owner', 'accountant', 'bookkeeper', 'treasurer_readonly'
  )),
  constraint finance_team_members_unique unique (organization_id, email)
);

create unique index if not exists finance_team_members_email_lower_unique
  on public.finance_team_members (organization_id, lower(email));
create index if not exists finance_team_members_email_idx on public.finance_team_members (lower(email));

alter table public.finance_team_members enable row level security;
revoke all on table public.finance_team_members from anon;
revoke all on table public.finance_team_members from authenticated;
grant select on table public.finance_team_members to authenticated;

drop policy if exists "Finance team members can read their own row" on public.finance_team_members;
create policy "Finance team members can read their own row"
  on public.finance_team_members
  for select
  to authenticated
  using (
    disabled_at is null
    and lower(email) = lower(((select auth.jwt()) ->> 'email'))
  );

comment on table public.finance_team_members is
  'Organization-scoped Finance department access, independent of admin_users -- lets accountants/bookkeepers/treasurers use Finance without broader /admin or /ncc access.';
```

**Verify:**
```sql
select count(*) from public.finance_team_members;  -- expect 0 -- you don't need a row here, see "Before you start"
```

**Optional** — only if you want yourself to also show up in the Finance
Team list in the UI (purely cosmetic, not required for your access):
```sql
insert into public.finance_team_members (organization_id, email, finance_role, invited_by)
select id, 'YOUR_LOGIN_EMAIL_HERE', 'finance_owner', 'YOUR_LOGIN_EMAIL_HERE'
from public.organizations where slug = 'usa-missionaries';
```

## After migrations are applied

### Enable feature flags — one at a time, in this order, in Vercel Production only

Vercel dashboard → `usam-website` project → **Settings → Environment
Variables**. Add each as **Production**-scoped (not Preview, not
unscoped), one at a time, redeploying and confirming before the next:

1. `FINANCE_DOCUMENTS_MIGRATION_APPLIED=true` → redeploy → confirm you can
   upload a test PDF at `/ncc/finance?tab=documents` → delete the test file.
2. `COMPLIANCE_FILINGS_MIGRATION_APPLIED=true` → redeploy → confirm
   `/ncc/finance/compliance` loads and you can click "Start Tracking" on the
   Arizona filing.
3. `FINANCE_OPERATIONS_MIGRATION_APPLIED=true` → redeploy → confirm the
   Transactions tab at `/ncc/finance/990/unknown?tab=transactions` shows the
   import form as enabled (not "unavailable in this preview").
4. `FINANCE_PERMISSIONS_MIGRATION_APPLIED=true` → redeploy → confirm the
   Finance Team tab on `/ncc/finance?tab=team` shows the invite form as
   enabled.

Redeploys here should go through the normal Vercel Git integration
(pushing to `main` triggers it) — no `vercel --prod`, no manual alias
changes.

## Rollback, at any point

**Known-good rollback point (last production deploy before this work):**
commit `c54a95be` ("Guard Groups V2 migration dependency"), Vercel
deployment `dpl_8dcVANSymbPU9cV3tutZWptxGj8A`. If the app itself needs to
be rolled back (not just a flag disabled), redeploying that commit via the
normal Vercel Git flow returns the site to this exact known-good state.
`/admin` and existing DOS behavior are unaffected by anything in this
runbook regardless of rollback.

Order of response if something goes wrong, least destructive first:

1. **Disable the relevant flag(s)** in Vercel Production env vars and
   redeploy — this alone makes the write paths return "unavailable" again
   without touching any data. This is the first response for almost any
   problem.
2. Uploaded documents, transactions, and filings **stay in the database**
   when you do this — disabling a flag never deletes anything.
3. If the app itself is broken (not just Finance), redeploy commit
   `c54a95be` via the normal Vercel Git flow (revert or redeploy from Git
   history — no manual `vercel --prod`, no manual alias reassignment).
4. Only drop a table manually if we've explicitly decided that's necessary
   after diagnosing a real problem — never as the first response, and never
   without discussing it first.
