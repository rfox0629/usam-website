-- USA-181: correct the tax-period model to the IRS accounting-period rules.
--
--   calendar     — January 1 to December 31.
--   fiscal       — 12 consecutive months ending on the LAST DAY of a month
--                  other than December.
--   short_period — under 12 months with explicit start/end and a reason, such
--                  as an initial period or an accounting-period change.
--
-- The previous period_type vocabulary (first_short / annual / short_change)
-- described how a period arose rather than what shape it has, which left room
-- for an incorporation anniversary such as August 3 to be recorded as a
-- recurring year end. The constraint below makes that unrepresentable.

alter table public.tax_periods
  add column if not exists short_period_reason text;

alter table public.tax_periods
  drop constraint if exists tax_periods_type_check;

alter table public.tax_periods
  add constraint tax_periods_type_check
  check (period_type in ('calendar', 'fiscal', 'short_period'));

alter table public.tax_periods
  alter column period_type set default 'calendar';

alter table public.tax_periods
  drop constraint if exists tax_periods_shape_check;

-- Shape is only enforced once both dates exist, so a draft period may be
-- created before the source document is in hand. It simply cannot be verified.
alter table public.tax_periods
  add constraint tax_periods_shape_check
  check (
    period_start is null
    or period_end is null
    or (
      period_end > period_start
      and case period_type
        when 'calendar' then
          extract(month from period_end) = 12
          and extract(day from period_end) = 31
          and extract(month from period_start) = 1
          and extract(day from period_start) = 1
        when 'fiscal' then
          -- Last day of its month, and not December (December is calendar).
          period_end = (date_trunc('month', period_end::timestamp) + interval '1 month' - interval '1 day')::date
          and extract(month from period_end) <> 12
          and period_end = (period_start + interval '12 months' - interval '1 day')::date
        when 'short_period' then
          period_end < (period_start + interval '12 months')::date
        else false
      end
    )
  );

-- A short period must say why it is short; that reason is part of the record a
-- CPA reviews.
alter table public.tax_periods
  drop constraint if exists tax_periods_short_reason_check;

alter table public.tax_periods
  add constraint tax_periods_short_reason_check
  check (
    period_type <> 'short_period'
    or period_start is null
    or period_end is null
    or (short_period_reason is not null and length(btrim(short_period_reason)) > 0)
  );

comment on column public.tax_periods.period_type is
  'calendar (Jan 1-Dec 31), fiscal (12 months ending the last day of a non-December month), or short_period (under 12 months, initial or accounting-period change).';
comment on column public.tax_periods.short_period_reason is
  'Why this period is under 12 months, for example an initial period or a change in accounting period.';
