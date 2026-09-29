-- USA-181: seed the curated compliance rule registry.
--
-- These are product-maintained rules, not organization data and not the result
-- of any runtime lookup. Updating them when law changes is a migration, which
-- is what keeps deadline calculation explainable and versioned.

-- Federal Form 990-series.
-- Due the 15th day of the 5th month after the accounting period ends, moved to
-- the next business day when it lands on a weekend or legal holiday. Form 8868
-- gives an automatic 6-month extension. The organization's accounting period
-- end is an input, never inferred from an incorporation date.
insert into public.compliance_rules (
  rule_key, jurisdiction, entity_type_applicability, filing_name, agency, recurrence,
  calculation_type, calculation_config, business_day_adjustment,
  extension_available, extension_form, extension_months,
  authoritative_source_url, authoritative_source_note,
  rule_version, effective_from, last_verified_at, last_verified_by
)
values (
  'US_FORM_990',
  'US',
  array['nonprofit_corporation', 'exempt_organization'],
  'Form 990 / 990-EZ / 990-PF',
  'Internal Revenue Service',
  'annual',
  'months_after_period_end',
  '{"months": 5, "day_of_month": 15}'::jsonb,
  true,
  true,
  'Form 8868',
  6,
  'https://www.irs.gov/charities-non-profits/annual-exempt-organization-return-due-date',
  'Return is due the 15th day of the 5th month after the accounting period ends; next business day when that falls on a Saturday, Sunday, or legal holiday.',
  'v1',
  '2026-01-01',
  '2026-08-19',
  'USA-181'
)
on conflict (rule_key, rule_version) do nothing;

-- Arizona annual report.
-- The Arizona Corporation Commission assigns each corporation its own due date,
-- shown on that corporation's ACC business record. Deliberately state_assigned
-- with no default date: encoding a universal deadline here would be wrong for
-- most organizations, so the product asks for the assigned date instead.
insert into public.compliance_rules (
  rule_key, jurisdiction, entity_type_applicability, filing_name, agency, recurrence,
  calculation_type, calculation_config, business_day_adjustment,
  extension_available, fee_note,
  authoritative_source_url, authoritative_source_note,
  rule_version, effective_from, last_verified_at, last_verified_by
)
values (
  'AZ_ANNUAL_REPORT',
  'AZ',
  array['nonprofit_corporation'],
  'Arizona Annual Report',
  'Arizona Corporation Commission',
  'annual',
  'state_assigned',
  '{"requires_organization_assigned_due_date": true}'::jsonb,
  true,
  false,
  'Fee varies by entity type; confirm on the ACC entity record.',
  'https://azcc.gov/corporations/annual-reports',
  'Arizona corporations file an annual report by the due date the Commission assigns to that specific corporation, shown on its ACC business record. There is no universal statewide nonprofit due date.',
  'v1',
  '2026-01-01',
  '2026-08-19',
  'USA-181'
)
on conflict (rule_key, rule_version) do nothing;
