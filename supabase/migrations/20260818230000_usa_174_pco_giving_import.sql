-- USA-174: extend the canonical Planning Center giving tables for the real
-- importer. No second donation ledger is introduced; pco_giving_records stays
-- the single import layer read by /operations/finance.

alter table public.pco_giving_records
  add column if not exists pco_person_id text,
  add column if not exists donor_display_name text,
  add column if not exists pco_fund_id text,
  add column if not exists pco_campaign_id text,
  add column if not exists campaign_name text,
  add column if not exists pco_batch_id text,
  add column if not exists pco_payment_source_id text,
  add column if not exists payment_source text,
  add column if not exists payment_method text,
  add column if not exists gift_status text,
  add column if not exists is_recurring boolean not null default false,
  add column if not exists pco_recurring_source_id text,
  add column if not exists refunded boolean not null default false,
  add column if not exists refunded_at timestamptz,
  add column if not exists pco_refund_id text,
  add column if not exists currency text,
  add column if not exists fee_amount numeric(12, 2),
  add column if not exists net_amount numeric(12, 2),
  add column if not exists designation_count integer not null default 0,
  add column if not exists attribution_kind text not null default 'unmapped',
  add column if not exists attribution_source text,
  add column if not exists attributed_missionary_profile_id uuid,
  add column if not exists pco_updated_at timestamptz,
  add column if not exists last_synced_at timestamptz;

alter table public.pco_giving_records
  drop constraint if exists pco_giving_records_attribution_kind_check;

alter table public.pco_giving_records
  add constraint pco_giving_records_attribution_kind_check
  check (attribution_kind in ('general', 'missionary', 'unmapped', 'ignored'));

-- A missionary attribution must always name the missionary it belongs to, and
-- nothing else may carry one. This is what keeps "attributed" honest.
alter table public.pco_giving_records
  drop constraint if exists pco_giving_records_attribution_target_check;

alter table public.pco_giving_records
  add constraint pco_giving_records_attribution_target_check
  check (
    (attribution_kind = 'missionary' and attributed_missionary_profile_id is not null)
    or (attribution_kind <> 'missionary' and attributed_missionary_profile_id is null)
  );

-- pco_recurring_donation_id carries a unique index from the original schema, so
-- it cannot hold the recurring schedule id repeated across its donations. The
-- importer writes that linkage to pco_recurring_source_id instead.
create index if not exists pco_giving_records_recurring_source_idx
  on public.pco_giving_records(pco_recurring_source_id)
  where pco_recurring_source_id is not null;

create index if not exists pco_giving_records_attribution_idx
  on public.pco_giving_records(attribution_kind, donation_date desc);

create index if not exists pco_giving_records_attributed_missionary_idx
  on public.pco_giving_records(attributed_missionary_profile_id, donation_date desc)
  where attributed_missionary_profile_id is not null;

create index if not exists pco_giving_records_fund_idx
  on public.pco_giving_records(pco_fund_id)
  where pco_fund_id is not null;

comment on column public.pco_giving_records.attribution_kind is
  'How this gift is attributed: general (USA Missionaries), missionary (explicit mapping), unmapped (needs a founder decision), ignored.';
comment on column public.pco_giving_records.attribution_source is
  'Which explicit rule produced the attribution, for example fund_mapping or campaign_mapping. Never a name guess.';
comment on column public.pco_giving_records.pco_recurring_source_id is
  'Planning Center recurring donation id this gift came from. Non-unique: many gifts share one schedule.';

-- Explicit fund/campaign to missionary mappings. Attribution is only ever
-- derived from a row here; the importer never fuzzy-matches donor or fund names.
create table if not exists public.pco_designation_mappings (
  id uuid primary key default gen_random_uuid(),
  pco_fund_id text,
  fund_name text,
  pco_campaign_id text,
  campaign_name text,
  designation_name text,
  target_kind text not null default 'unmapped',
  missionary_profile_id uuid,
  notes text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pco_designation_mappings_target_kind_check
    check (target_kind in ('general', 'missionary', 'ignored')),
  constraint pco_designation_mappings_target_check
    check (
      (target_kind = 'missionary' and missionary_profile_id is not null)
      or (target_kind <> 'missionary' and missionary_profile_id is null)
    ),
  constraint pco_designation_mappings_key_check
    check (pco_fund_id is not null or pco_campaign_id is not null or designation_name is not null)
);

create unique index if not exists pco_designation_mappings_fund_uidx
  on public.pco_designation_mappings(pco_fund_id)
  where pco_fund_id is not null;

create unique index if not exists pco_designation_mappings_campaign_uidx
  on public.pco_designation_mappings(pco_campaign_id)
  where pco_campaign_id is not null and pco_fund_id is null;

create unique index if not exists pco_designation_mappings_designation_uidx
  on public.pco_designation_mappings(lower(designation_name))
  where designation_name is not null and pco_fund_id is null and pco_campaign_id is null;

create or replace function public.set_pco_designation_mappings_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_pco_designation_mappings_updated_at on public.pco_designation_mappings;
create trigger set_pco_designation_mappings_updated_at
  before update on public.pco_designation_mappings
  for each row
  execute function public.set_pco_designation_mappings_updated_at();

alter table public.pco_designation_mappings enable row level security;

revoke all on table public.pco_designation_mappings from anon;
revoke all on table public.pco_designation_mappings from authenticated;
grant select, insert, update on table public.pco_designation_mappings to authenticated;

drop policy if exists "Admins can manage PCO designation mappings" on public.pco_designation_mappings;
create policy "Admins can manage PCO designation mappings"
  on public.pco_designation_mappings
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

comment on table public.pco_designation_mappings is
  'Explicit Planning Center fund/campaign/designation to missionary or general-fund mappings. The only source of missionary giving attribution.';

-- The original schema indexed pco_donation_id with a PARTIAL unique index, which
-- Postgres cannot use to infer `on conflict (pco_donation_id)`. The importer's
-- upsert needs a real constraint, so swap it. NULL donation ids stay allowed.
alter table public.pco_giving_records
  drop constraint if exists pco_giving_records_donation_id_key;

alter table public.pco_giving_records
  add constraint pco_giving_records_donation_id_key unique (pco_donation_id);

drop index if exists public.pco_giving_records_donation_id_uidx;
