alter table public.support_commitments
  add column if not exists pco_donation_id text,
  add column if not exists pco_recurring_donation_id text,
  add column if not exists matched_at timestamptz,
  add column if not exists activated_at timestamptz,
  add column if not exists gross_amount numeric(12, 2),
  add column if not exists general_fund_amount numeric(12, 2),
  add column if not exists missionary_net_amount numeric(12, 2),
  add column if not exists match_confidence numeric(5, 2);

create table if not exists public.pco_giving_sync_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending',
  sync_type text not null default 'manual',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  records_seen integer not null default 0,
  records_imported integer not null default 0,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pco_giving_sync_runs_status_check check (status in ('pending', 'running', 'succeeded', 'failed')),
  constraint pco_giving_sync_runs_sync_type_check check (sync_type in ('manual', 'daily_poll', 'webhook'))
);

create table if not exists public.pco_giving_records (
  id uuid primary key default gen_random_uuid(),
  sync_run_id uuid references public.pco_giving_sync_runs(id) on delete set null,
  pco_donation_id text,
  pco_recurring_donation_id text,
  donor_first_name text,
  donor_last_name text,
  donor_email text,
  donor_phone text,
  gross_amount numeric(12, 2),
  gift_type text not null default 'unknown',
  designation_name text,
  fund_name text,
  donation_date timestamptz,
  received_at timestamptz,
  status text not null default 'imported',
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pco_giving_records_gift_type_check check (gift_type in ('monthly', 'one_time', 'unknown')),
  constraint pco_giving_records_status_check check (status in ('imported', 'matched', 'ignored', 'needs_review'))
);

create table if not exists public.support_commitment_matches (
  id uuid primary key default gen_random_uuid(),
  support_commitment_id uuid not null references public.support_commitments(id) on delete cascade,
  pco_giving_record_id uuid not null references public.pco_giving_records(id) on delete cascade,
  match_status text not null default 'suggested',
  confidence numeric(5, 2) not null default 0,
  match_criteria jsonb not null default '{}'::jsonb,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_commitment_matches_status_check check (match_status in ('suggested', 'confirmed', 'rejected', 'needs_review')),
  constraint support_commitment_matches_confidence_check check (confidence >= 0 and confidence <= 100)
);

alter table public.support_commitments
  drop constraint if exists support_commitments_match_confidence_check;

alter table public.support_commitments
  add constraint support_commitments_match_confidence_check
  check (match_confidence is null or (match_confidence >= 0 and match_confidence <= 100));

create unique index if not exists pco_giving_records_donation_id_uidx
  on public.pco_giving_records(pco_donation_id)
  where pco_donation_id is not null;

create unique index if not exists pco_giving_records_recurring_donation_id_uidx
  on public.pco_giving_records(pco_recurring_donation_id)
  where pco_recurring_donation_id is not null;

create unique index if not exists support_commitment_matches_pair_uidx
  on public.support_commitment_matches(support_commitment_id, pco_giving_record_id);

create index if not exists support_commitments_reconciliation_status_idx
  on public.support_commitments(status, gift_type, submitted_at desc);

create index if not exists support_commitments_pco_donation_idx
  on public.support_commitments(pco_donation_id)
  where pco_donation_id is not null;

create index if not exists support_commitments_pco_recurring_donation_idx
  on public.support_commitments(pco_recurring_donation_id)
  where pco_recurring_donation_id is not null;

create index if not exists pco_giving_records_unmatched_idx
  on public.pco_giving_records(status, donation_date desc);

create index if not exists pco_giving_records_donor_email_idx
  on public.pco_giving_records(lower(donor_email), donation_date desc);

create index if not exists support_commitment_matches_status_idx
  on public.support_commitment_matches(match_status, confidence desc, created_at desc);

create or replace function public.set_pco_giving_sync_runs_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_pco_giving_records_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_support_commitment_matches_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_pco_giving_sync_runs_updated_at on public.pco_giving_sync_runs;
create trigger set_pco_giving_sync_runs_updated_at
  before update on public.pco_giving_sync_runs
  for each row
  execute function public.set_pco_giving_sync_runs_updated_at();

drop trigger if exists set_pco_giving_records_updated_at on public.pco_giving_records;
create trigger set_pco_giving_records_updated_at
  before update on public.pco_giving_records
  for each row
  execute function public.set_pco_giving_records_updated_at();

drop trigger if exists set_support_commitment_matches_updated_at on public.support_commitment_matches;
create trigger set_support_commitment_matches_updated_at
  before update on public.support_commitment_matches
  for each row
  execute function public.set_support_commitment_matches_updated_at();

alter table public.pco_giving_sync_runs enable row level security;
alter table public.pco_giving_records enable row level security;
alter table public.support_commitment_matches enable row level security;

revoke all on table public.pco_giving_sync_runs from anon;
revoke all on table public.pco_giving_records from anon;
revoke all on table public.support_commitment_matches from anon;
revoke all on table public.pco_giving_sync_runs from authenticated;
revoke all on table public.pco_giving_records from authenticated;
revoke all on table public.support_commitment_matches from authenticated;

grant select, insert, update on table public.pco_giving_sync_runs to authenticated;
grant select, insert, update on table public.pco_giving_records to authenticated;
grant select, insert, update on table public.support_commitment_matches to authenticated;

drop policy if exists "Admins can manage PCO giving sync runs" on public.pco_giving_sync_runs;
create policy "Admins can manage PCO giving sync runs"
  on public.pco_giving_sync_runs
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role = 'admin'
    )
  );

drop policy if exists "Admins can manage PCO giving records" on public.pco_giving_records;
create policy "Admins can manage PCO giving records"
  on public.pco_giving_records
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role = 'admin'
    )
  );

drop policy if exists "Admins can manage support commitment matches" on public.support_commitment_matches;
create policy "Admins can manage support commitment matches"
  on public.support_commitment_matches
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role = 'admin'
    )
  );

comment on table public.pco_giving_sync_runs is
  'Planning Center Giving sync run metadata. MVP supports manual/daily polling before future webhook automation.';

comment on table public.pco_giving_records is
  'Imported Planning Center Giving donation or recurring donation records used for NCC support reconciliation.';

comment on table public.support_commitment_matches is
  'Suggested or confirmed matches between donor support intake commitments and Planning Center Giving records.';

comment on column public.support_commitments.gross_amount is
  'Confirmed gross gift amount from Planning Center or NCC reconciliation.';

comment on column public.support_commitments.general_fund_amount is
  'Calculated USA Missionaries general fund reserve, currently 10 percent of confirmed support.';

comment on column public.support_commitments.missionary_net_amount is
  'Calculated missionary support credit, currently 90 percent of confirmed support.';
