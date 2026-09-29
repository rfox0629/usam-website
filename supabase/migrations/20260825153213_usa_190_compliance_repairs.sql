-- USA-190: repair the existing USA-181/182 compliance workflow.
--
-- One filing row represents one obligation/due-date cycle. This makes a filed
-- 2026 Arizona report distinct from the next assigned annual due date.
create unique index if not exists compliance_filings_obligation_due_uidx
  on public.compliance_filings(obligation_id, computed_due_date);

-- A fact correction must supersede the current row and insert the replacement
-- in one transaction. Application-side insert-then-update cannot work with the
-- partial unique index that permits only one current fact.
create or replace function public.record_compliance_fact(
  p_organization_id uuid,
  p_fact_key text,
  p_value_text text default null,
  p_value_date date default null,
  p_value_number numeric default null,
  p_verification_state text default 'suggested',
  p_source_document_id uuid default null,
  p_source_reference text default null,
  p_verified_by text default null,
  p_verified_at timestamptz default null,
  p_notes text default null,
  p_created_by text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_fact_id uuid;
  replacement_fact_id uuid;
  changed_at timestamptz := now();
begin
  -- Serialize the organization/key even when there is no current row yet.
  -- Without this, two first-time saves can race past the row lock and one can
  -- fail against compliance_facts_current_uidx.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_organization_id::text || ':' || p_fact_key, 0)
  );

  select id
    into current_fact_id
    from public.compliance_facts
   where organization_id = p_organization_id
     and fact_key = p_fact_key
     and superseded_at is null
   for update;

  if current_fact_id is not null then
    update public.compliance_facts
       set superseded_at = changed_at
     where id = current_fact_id;
  end if;

  insert into public.compliance_facts (
    organization_id,
    fact_key,
    value_text,
    value_date,
    value_number,
    verification_state,
    source_document_id,
    source_reference,
    verified_by,
    verified_at,
    notes,
    created_by
  ) values (
    p_organization_id,
    p_fact_key,
    p_value_text,
    p_value_date,
    p_value_number,
    p_verification_state,
    p_source_document_id,
    p_source_reference,
    p_verified_by,
    p_verified_at,
    p_notes,
    p_created_by
  )
  returning id into replacement_fact_id;

  if current_fact_id is not null then
    update public.compliance_facts
       set superseded_by_fact_id = replacement_fact_id
     where id = current_fact_id;
  end if;

  return replacement_fact_id;
end;
$$;

revoke all on function public.record_compliance_fact(
  uuid, text, text, date, numeric, text, uuid, text, text, timestamptz, text, text
) from public, anon, authenticated;
grant execute on function public.record_compliance_fact(
  uuid, text, text, date, numeric, text, uuid, text, text, timestamptz, text, text
) to service_role;

comment on function public.record_compliance_fact(
  uuid, text, text, date, numeric, text, uuid, text, text, timestamptz, text, text
) is 'Atomically supersedes the current compliance fact and appends its replacement. Service role only.';

-- Filing completion is independent from deadline status. "reported_filed"
-- records the founder-confirmed Arizona outcome without inventing a filed date
-- or evidence reference; the UI asks for those missing details and never calls
-- the known completed filing overdue.
alter table public.compliance_filings
  add column if not exists filing_status text not null default 'not_filed';

alter table public.compliance_filings
  drop constraint if exists compliance_filings_filing_status_check;

alter table public.compliance_filings
  add constraint compliance_filings_filing_status_check
  check (filing_status in ('not_filed', 'reported_filed', 'filed'));

update public.compliance_filings
   set filing_status = 'filed'
 where filed_at is not null;

comment on column public.compliance_filings.filing_status is
  'External filing state, separate from the assigned due date and derived urgency. reported_filed means completion is known but the exact filed date/evidence still needs confirmation.';

-- One verified recurring period may be confirmed repeatedly without creating
-- duplicate period rows. Fact confirmations remain append-only below.
create unique index if not exists tax_periods_org_dates_uidx
  on public.tax_periods(organization_id, period_start, period_end)
  where period_start is not null and period_end is not null;

-- Keep the canonical Operations Documents record as the dated source of truth.
update public.operations_documents document
   set document_date = date '2025-09-22'
  from public.organizations organization
 where organization.id = document.organization_id
   and organization.slug = 'usa-missionaries'
   and document.document_type = 'irs_determination_letter'
   and lower(btrim(document.title)) = '501(c)(3) approval letter'
   and document.superseded_at is null;

create or replace function public.confirm_recurring_tax_year(
  p_organization_id uuid,
  p_tax_year_type text,
  p_fiscal_year_end_month integer,
  p_period_start date,
  p_period_end date,
  p_source_document_id uuid,
  p_source_reference text,
  p_exemption_effective_date date,
  p_exemption_classification text,
  p_form_990_required text,
  p_actor text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  fact_ids uuid[] := array[]::uuid[];
  new_fact_id uuid;
  period_id uuid;
  verified_at timestamptz := now();
begin
  if p_tax_year_type <> 'fiscal'
     or p_fiscal_year_end_month < 1
     or p_fiscal_year_end_month > 11 then
    raise exception 'A fiscal tax year needs a non-December year-end month.';
  end if;

  if p_fiscal_year_end_month <> 8
     or p_exemption_effective_date <> date '2025-08-06'
     or p_exemption_classification <> '170(b)(1)(A)(vi)'
     or lower(btrim(p_form_990_required)) <> 'yes' then
    raise exception 'The confirmation does not match the USA Missionaries determination letter.';
  end if;

  if extract(month from p_period_end) <> p_fiscal_year_end_month
     or p_period_end <> (date_trunc('month', p_period_end::timestamp) + interval '1 month' - interval '1 day')::date
     or p_period_end <> (p_period_start + interval '12 months' - interval '1 day')::date then
    raise exception 'The recurring period does not match the verified fiscal year-end month.';
  end if;

  if not exists (
    select 1
      from public.operations_documents
     where id = p_source_document_id
       and organization_id = p_organization_id
       and category = 'irs_tax'
       and document_type = 'irs_determination_letter'
       and superseded_at is null
       and lower(btrim(title)) = '501(c)(3) approval letter'
  ) then
    raise exception 'The canonical IRS determination letter is unavailable.';
  end if;

  select public.record_compliance_fact(
    p_organization_id, 'tax_year_type', p_tax_year_type, null, null,
    'verified', p_source_document_id, p_source_reference, p_actor, verified_at,
    'Founder-confirmed from the IRS determination letter.', p_actor
  ) into new_fact_id;
  fact_ids := array_append(fact_ids, new_fact_id);

  select public.record_compliance_fact(
    p_organization_id, 'fiscal_year_end_month', null, null, p_fiscal_year_end_month,
    'verified', p_source_document_id, 'Accounting period ending: August 31', p_actor, verified_at,
    'Recurring fiscal year is September 1 through August 31.', p_actor
  ) into new_fact_id;
  fact_ids := array_append(fact_ids, new_fact_id);

  select public.record_compliance_fact(
    p_organization_id, 'exemption_effective_date', null, p_exemption_effective_date, null,
    'verified', p_source_document_id, 'Effective date of exemption', p_actor, verified_at,
    null, p_actor
  ) into new_fact_id;
  fact_ids := array_append(fact_ids, new_fact_id);

  select public.record_compliance_fact(
    p_organization_id, 'exemption_classification', p_exemption_classification, null, null,
    'verified', p_source_document_id, 'Public charity status', p_actor, verified_at,
    null, p_actor
  ) into new_fact_id;
  fact_ids := array_append(fact_ids, new_fact_id);

  select public.record_compliance_fact(
    p_organization_id, 'form_990_required', p_form_990_required, null, null,
    'verified', p_source_document_id, 'Form 990 / 990-EZ / 990-N required', p_actor, verified_at,
    null, p_actor
  ) into new_fact_id;
  fact_ids := array_append(fact_ids, new_fact_id);

  insert into public.tax_periods (
    organization_id, label, period_start, period_end, period_type,
    is_verified, source_document_id, status, reviewed_by, reviewed_at
  ) values (
    p_organization_id,
    'Fiscal year ending ' || to_char(p_period_end, 'Mon DD, YYYY'),
    p_period_start,
    p_period_end,
    'fiscal',
    true,
    p_source_document_id,
    'open',
    p_actor,
    verified_at
  )
  on conflict (organization_id, period_start, period_end)
    where period_start is not null and period_end is not null
  do update set
    label = excluded.label,
    period_type = excluded.period_type,
    is_verified = true,
    source_document_id = excluded.source_document_id,
    reviewed_by = excluded.reviewed_by,
    reviewed_at = excluded.reviewed_at,
    updated_at = verified_at
  returning id into period_id;

  insert into public.document_references (
    document_id, reference_type, reference_id, context_note, created_by
  )
  select p_source_document_id, 'compliance_fact', fact_id::text,
         'Verified fact from IRS determination letter', p_actor
    from unnest(fact_ids) as fact_id
  on conflict (document_id, reference_type, reference_id) do nothing;

  insert into public.document_references (
    document_id, reference_type, reference_id, context_note, created_by
  ) values (
    p_source_document_id, 'tax_period', period_id::text,
    'Recurring fiscal year verified from IRS determination letter', p_actor
  )
  on conflict (document_id, reference_type, reference_id) do nothing;

  return period_id;
end;
$$;

revoke all on function public.confirm_recurring_tax_year(
  uuid, text, integer, date, date, uuid, text, date, text, text, text
) from public, anon, authenticated;
grant execute on function public.confirm_recurring_tax_year(
  uuid, text, integer, date, date, uuid, text, date, text, text, text
) to service_role;

comment on function public.confirm_recurring_tax_year(
  uuid, text, integer, date, date, uuid, text, date, text, text, text
) is 'Atomically confirms a recurring tax year from an authorized canonical determination letter, appends fact history, and verifies the concrete recurring period. It never creates an initial short period.';

-- Record the known USA Missionaries 2026 Arizona outcome without fabricating
-- a filed date. If exact completion evidence already exists, leave it intact.
insert into public.compliance_filings (
  obligation_id,
  rule_version,
  computed_due_date,
  computed_inputs,
  status,
  filing_status,
  reviewed_by,
  reviewed_at,
  notes
)
select
  obligation.id,
  coalesce(rule.rule_version, 'v1'),
  obligation.organization_assigned_due_date,
  jsonb_build_object(
    'calculationType', 'state_assigned',
    'jurisdiction', 'AZ',
    'ruleKey', 'AZ_ANNUAL_REPORT',
    'ruleVersion', coalesce(rule.rule_version, 'v1'),
    'organizationAssignedDueDate', obligation.organization_assigned_due_date,
    'reportedFiled', true
  ),
  'ready_for_review',
  'reported_filed',
  'USA-190',
  now(),
  'Founder reports the 2026 Arizona Annual Report was filed; exact filed date and evidence still need confirmation.'
from public.compliance_obligations obligation
join public.organizations organization
  on organization.id = obligation.organization_id
left join lateral (
  select rule_version
    from public.compliance_rules
   where rule_key = obligation.rule_key
     and effective_to is null
   order by effective_from desc nulls last
   limit 1
) rule on true
where organization.slug = 'usa-missionaries'
  and obligation.rule_key = 'AZ_ANNUAL_REPORT'
  and obligation.organization_assigned_due_date >= date '2026-01-01'
  and obligation.organization_assigned_due_date < date '2027-01-01'
on conflict (obligation_id, computed_due_date)
do update set
  filing_status = case
    when public.compliance_filings.filing_status = 'filed' then 'filed'
    else 'reported_filed'
  end,
  status = case
    when public.compliance_filings.filing_status = 'filed' then public.compliance_filings.status
    else 'ready_for_review'
  end,
  notes = coalesce(public.compliance_filings.notes, excluded.notes),
  reviewed_by = coalesce(public.compliance_filings.reviewed_by, excluded.reviewed_by),
  reviewed_at = coalesce(public.compliance_filings.reviewed_at, excluded.reviewed_at);
