// Deadline calculation for curated compliance rules.
//
// This module deliberately has no imports: no server-only, no Supabase, no path
// aliases. Rules and organization facts are passed in, so the calculation is a
// pure function the regression script can execute directly.
//
// Nothing here consults the network. Rules come from the curated registry in the
// database; organization facts come from verified compliance_facts.

export type ComplianceCalculationType =
  | "months_after_period_end"
  | "fixed_annual_date"
  | "anniversary"
  | "state_assigned";

export type ComplianceRule = {
  businessDayAdjustment: boolean;
  calculationConfig: Record<string, unknown>;
  calculationType: ComplianceCalculationType;
  extensionAvailable: boolean;
  extensionForm: string | null;
  extensionMonths: number | null;
  filingName: string;
  jurisdiction: string;
  ruleKey: string;
  ruleVersion: string;
};

export type DueDateInputs = {
  /** Agency-assigned date for state_assigned rules. */
  organizationAssignedDueDate?: string | null;
  /** Verified accounting-period end. Unverified periods must not be passed. */
  periodEnd?: string | null;
  periodEndVerified?: boolean;
};

export type DueDateResult = {
  /** Every input that produced the date, persisted so the UI can explain it. */
  computedInputs: Record<string, unknown>;
  dueDate: string | null;
  extensionDueDate: string | null;
  reason: string;
  status: "computed" | "needs_verification";
};

function pad(value: number) {
  return value < 10 ? `0${value}` : `${value}`;
}

function toIso(date: Date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function parseIso(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);

  if (!match) {
    return null;
  }

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));

  return Number.isNaN(date.getTime()) ? null : date;
}

function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number) {
  const first = new Date(Date.UTC(year, month, 1));
  const offset = (weekday - first.getUTCDay() + 7) % 7;

  return new Date(Date.UTC(year, month, 1 + offset + (nth - 1) * 7));
}

function lastWeekdayOfMonth(year: number, month: number, weekday: number) {
  const last = new Date(Date.UTC(year, month + 1, 0));
  const offset = (last.getUTCDay() - weekday + 7) % 7;

  return new Date(Date.UTC(year, month, last.getUTCDate() - offset));
}

/**
 * US federal holidays, including the weekend-observance shift the IRS applies.
 * A Saturday holiday is observed the preceding Friday and a Sunday holiday the
 * following Monday, and both shift filing deadlines.
 */
export function federalHolidays(year: number): Set<string> {
  const fixed = [
    [0, 1],   // New Year's Day
    [5, 19],  // Juneteenth
    [6, 4],   // Independence Day
    [10, 11], // Veterans Day
    [11, 25], // Christmas Day
  ];
  const dates: Date[] = [
    nthWeekdayOfMonth(year, 0, 1, 3),  // MLK Jr. Day
    nthWeekdayOfMonth(year, 1, 1, 3),  // Washington's Birthday
    lastWeekdayOfMonth(year, 4, 1),    // Memorial Day
    nthWeekdayOfMonth(year, 8, 1, 1),  // Labor Day
    nthWeekdayOfMonth(year, 9, 1, 2),  // Columbus Day
    nthWeekdayOfMonth(year, 10, 4, 4), // Thanksgiving
  ];

  const observed = new Set<string>();

  for (const [month, day] of fixed) {
    const date = new Date(Date.UTC(year, month, day));
    const weekday = date.getUTCDay();

    if (weekday === 6) {
      date.setUTCDate(date.getUTCDate() - 1);
    } else if (weekday === 0) {
      date.setUTCDate(date.getUTCDate() + 1);
    }

    observed.add(toIso(date));
  }

  for (const date of dates) {
    observed.add(toIso(date));
  }

  return observed;
}

export function isBusinessDay(iso: string) {
  const date = parseIso(iso);

  if (!date) {
    return false;
  }

  const weekday = date.getUTCDay();

  return weekday !== 0 && weekday !== 6 && !federalHolidays(date.getUTCFullYear()).has(iso);
}

/** Moves a date forward to the next business day, reporting why it moved. */
export function nextBusinessDay(iso: string): { adjusted: string; reason: string | null } {
  let date = parseIso(iso);

  if (!date) {
    return { adjusted: iso, reason: null };
  }

  let moved = 0;

  while (!isBusinessDay(toIso(date))) {
    date = new Date(date.getTime() + 86400000);
    moved += 1;

    if (moved > 10) {
      break;
    }
  }

  return {
    adjusted: toIso(date),
    reason: moved === 0 ? null : `Moved forward ${moved} day${moved === 1 ? "" : "s"} to the next business day.`,
  };
}

function addMonthsClamped(iso: string, months: number, dayOfMonth: number) {
  const date = parseIso(iso);

  if (!date) {
    return null;
  }

  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const daysInMonth = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();

  return toIso(new Date(Date.UTC(
    target.getUTCFullYear(),
    target.getUTCMonth(),
    Math.min(dayOfMonth, daysInMonth),
  )));
}

function numberFrom(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * Computes a filing due date from a curated rule and verified organization
 * facts. Returns `needs_verification` rather than a plausible-looking date when
 * the inputs are not verified — a wrong federal deadline is worse than no date.
 */
export function computeFilingDueDate(rule: ComplianceRule, inputs: DueDateInputs): DueDateResult {
  const base: Record<string, unknown> = {
    calculationType: rule.calculationType,
    jurisdiction: rule.jurisdiction,
    ruleKey: rule.ruleKey,
    ruleVersion: rule.ruleVersion,
  };

  if (rule.calculationType === "state_assigned") {
    const assigned = inputs.organizationAssignedDueDate ?? null;

    if (!assigned) {
      return {
        computedInputs: { ...base, requiresOrganizationAssignedDueDate: true },
        dueDate: null,
        extensionDueDate: null,
        reason: `${rule.jurisdiction} assigns this organization its own due date. Enter the date from the agency record or a filed report.`,
        status: "needs_verification",
      };
    }

    const adjustment = rule.businessDayAdjustment
      ? nextBusinessDay(assigned)
      : { adjusted: assigned, reason: null };

    return {
      computedInputs: {
        ...base,
        adjustmentReason: adjustment.reason,
        organizationAssignedDueDate: assigned,
        unadjustedDueDate: assigned,
      },
      dueDate: adjustment.adjusted,
      extensionDueDate: null,
      reason: `Due date assigned to this organization by the ${rule.jurisdiction} agency.`,
      status: "computed",
    };
  }

  if (rule.calculationType === "months_after_period_end") {
    // The accounting-period end must be verified. Incorporation date is never
    // a fallback: the two are frequently different and guessing is a missed
    // federal filing.
    if (!inputs.periodEnd || inputs.periodEndVerified !== true) {
      return {
        computedInputs: { ...base, periodEndVerified: Boolean(inputs.periodEndVerified) },
        dueDate: null,
        extensionDueDate: null,
        reason: "The accounting period end is not verified yet. Upload the IRS determination letter, Form 1023, or accounting-period record to confirm it.",
        status: "needs_verification",
      };
    }

    const months = numberFrom(rule.calculationConfig.months, 5);
    const dayOfMonth = numberFrom(rule.calculationConfig.day_of_month, 15);
    const unadjusted = addMonthsClamped(inputs.periodEnd, months, dayOfMonth);

    if (!unadjusted) {
      return {
        computedInputs: { ...base, periodEnd: inputs.periodEnd },
        dueDate: null,
        extensionDueDate: null,
        reason: "The accounting period end could not be read as a date.",
        status: "needs_verification",
      };
    }

    const adjustment = rule.businessDayAdjustment
      ? nextBusinessDay(unadjusted)
      : { adjusted: unadjusted, reason: null };

    let extensionDueDate: string | null = null;

    if (rule.extensionAvailable && rule.extensionMonths) {
      const rawExtension = addMonthsClamped(adjustment.adjusted, rule.extensionMonths, dayOfMonth);
      extensionDueDate = rawExtension
        ? (rule.businessDayAdjustment ? nextBusinessDay(rawExtension).adjusted : rawExtension)
        : null;
    }

    return {
      computedInputs: {
        ...base,
        adjustmentReason: adjustment.reason,
        dayOfMonth,
        extensionForm: rule.extensionForm,
        extensionMonths: rule.extensionMonths,
        months,
        periodEnd: inputs.periodEnd,
        periodEndVerified: true,
        unadjustedDueDate: unadjusted,
      },
      dueDate: adjustment.adjusted,
      extensionDueDate,
      reason: `The 15th day of the ${months}th month after the accounting period ends ${inputs.periodEnd}.`,
      status: "computed",
    };
  }

  return {
    computedInputs: base,
    dueDate: null,
    extensionDueDate: null,
    reason: `Calculation type ${rule.calculationType} is not implemented yet.`,
    status: "needs_verification",
  };
}

export type FilingStatus =
  | "needs_verification"
  | "upcoming"
  | "due_soon"
  | "ready_for_review"
  | "filed"
  | "extended"
  | "overdue"
  | "not_applicable";

/** Derives display status from the effective date. Filed/extended win. */
export function deriveFilingStatus({
  dueDate,
  extensionDueDate,
  extensionFiled,
  filedAt,
  today,
}: {
  dueDate: string | null;
  extensionDueDate?: string | null;
  extensionFiled?: boolean;
  filedAt?: string | null;
  today: string;
}): FilingStatus {
  if (filedAt) {
    return "filed";
  }

  if (extensionFiled) {
    return "extended";
  }

  if (!dueDate) {
    return "needs_verification";
  }

  const effective = extensionDueDate ?? dueDate;
  const due = parseIso(effective);
  const now = parseIso(today);

  if (!due || !now) {
    return "needs_verification";
  }

  const days = Math.round((due.getTime() - now.getTime()) / 86400000);

  if (days < 0) {
    return "overdue";
  }

  return days <= 30 ? "due_soon" : "upcoming";
}
