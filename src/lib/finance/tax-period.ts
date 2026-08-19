// Tax-period definitions and validation, per IRS accounting-period rules.
//
// No imports: pure and directly executable by the regression script.
//
// The distinction this module enforces:
//   calendar     — January 1 to December 31.
//   fiscal       — 12 consecutive months ending on the LAST DAY of a month
//                  other than December.
//   short_period — fewer than 12 months, with explicit start and end dates,
//                  such as an initial period or an accounting-period change.
//
// A recurring fiscal year is therefore identified by a month, never by a
// month-and-day. There is deliberately no field in which "August 3" could be
// stored as a recurring year end: an incorporation anniversary is not a tax
// year end, and the schema makes that unrepresentable rather than merely
// discouraged.

export type TaxYearType = "calendar" | "fiscal";
export type TaxPeriodType = "calendar" | "fiscal" | "short_period";

export const taxYearTypes: TaxYearType[] = ["calendar", "fiscal"];
export const taxPeriodTypes: TaxPeriodType[] = ["calendar", "fiscal", "short_period"];

export const taxPeriodTypeLabels: Record<TaxPeriodType, string> = {
  calendar: "Calendar year",
  fiscal: "Fiscal year",
  short_period: "Short period",
};

export type ValidationResult = {
  errors: string[];
  ok: boolean;
};

function pad(value: number) {
  return value < 10 ? `0${value}` : `${value}`;
}

function parts(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());

  if (!match) {
    return null;
  }

  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(date.getTime())
    || date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    return null;
  }

  return { day, month, year };
}

export function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function lastDayOfMonth(year: number, month: number) {
  return `${year}-${pad(month)}-${pad(daysInMonth(year, month))}`;
}

export function isLastDayOfMonth(iso: string) {
  const value = parts(iso);

  return value ? value.day === daysInMonth(value.year, value.month) : false;
}

/**
 * Validates a recurring tax-year definition. A fiscal year is named by the
 * month it ends in; December is excluded because a December year end is a
 * calendar year.
 */
export function validateTaxYearDefinition({
  fiscalYearEndMonth,
  taxYearType,
}: {
  fiscalYearEndMonth?: number | string | null;
  taxYearType: string;
}): ValidationResult {
  const errors: string[] = [];

  if (taxYearType !== "calendar" && taxYearType !== "fiscal") {
    errors.push('Tax year type must be "calendar" or "fiscal". A short period is recorded as its own tax period, not as a recurring tax year.');

    return { errors, ok: false };
  }

  if (taxYearType === "calendar") {
    if (fiscalYearEndMonth !== null && fiscalYearEndMonth !== undefined && `${fiscalYearEndMonth}`.trim() !== "") {
      errors.push("A calendar tax year ends December 31 and cannot carry a fiscal year-end month.");
    }

    return { errors, ok: errors.length === 0 };
  }

  const month = Number(fiscalYearEndMonth);

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    errors.push("A fiscal tax year needs a year-end month from 1 to 12.");

    return { errors, ok: false };
  }

  if (month === 12) {
    errors.push("A year ending in December is a calendar tax year. Choose calendar instead of fiscal.");
  }

  return { errors, ok: errors.length === 0 };
}

/** The recurring year end for a definition, always a month's final day. */
export function recurringYearEnd({
  fiscalYearEndMonth,
  taxYearType,
  year,
}: {
  fiscalYearEndMonth?: number | null;
  taxYearType: TaxYearType;
  year: number;
}) {
  if (taxYearType === "calendar") {
    return `${year}-12-31`;
  }

  const month = Number(fiscalYearEndMonth);

  if (!Number.isInteger(month) || month < 1 || month > 11) {
    return null;
  }

  return lastDayOfMonth(year, month);
}

function monthsBetween(start: { day: number; month: number; year: number }, end: { day: number; month: number; year: number }) {
  return (end.year - start.year) * 12 + (end.month - start.month) + (end.day >= start.day ? 0 : -1);
}

/**
 * Validates one concrete tax period. Recurring calendar and fiscal periods must
 * land on a month end; short periods may end anywhere but must be under twelve
 * months and carry a reason.
 */
export function validateTaxPeriod({
  periodEnd,
  periodStart,
  periodType,
  shortPeriodReason,
}: {
  periodEnd?: string | null;
  periodStart?: string | null;
  periodType: string;
  shortPeriodReason?: string | null;
}): ValidationResult {
  const errors: string[] = [];

  if (!taxPeriodTypes.includes(periodType as TaxPeriodType)) {
    errors.push('Period type must be "calendar", "fiscal", or "short_period".');

    return { errors, ok: false };
  }

  if (!periodStart || !periodEnd) {
    // A draft period may exist without dates; it simply cannot be verified.
    return { errors, ok: true };
  }

  const start = parts(periodStart);
  const end = parts(periodEnd);

  if (!start || !end) {
    errors.push("Period start and end must be real dates in YYYY-MM-DD form.");

    return { errors, ok: false };
  }

  if (periodEnd <= periodStart) {
    errors.push("Period end must fall after period start.");

    return { errors, ok: false };
  }

  if (periodType === "calendar") {
    if (end.month !== 12 || end.day !== 31) {
      errors.push("A calendar tax year must end December 31.");
    }

    if (start.month !== 1 || start.day !== 1) {
      errors.push("A calendar tax year must begin January 1.");
    }
  }

  if (periodType === "fiscal") {
    if (!isLastDayOfMonth(periodEnd)) {
      errors.push(
        `A recurring fiscal year must end on the last day of a month. ${periodEnd} is not a month end — if this is an initial or transition period, record it as a short period instead.`,
      );
    }

    if (end.month === 12) {
      errors.push("A year ending in December is a calendar tax year, not a fiscal year.");
    }

    if (monthsBetween(start, end) !== 11) {
      errors.push("A recurring fiscal year must span 12 consecutive months. Shorter spans are short periods.");
    }
  }

  if (periodType === "short_period") {
    if (monthsBetween(start, end) >= 12) {
      errors.push("A short period must be under 12 months. Record a full year as calendar or fiscal.");
    }

    if (!shortPeriodReason || !shortPeriodReason.trim()) {
      errors.push("A short period needs a reason, such as an initial period or an accounting-period change.");
    }
  }

  return { errors, ok: errors.length === 0 };
}
