/**
 * USA Missionaries organizational support policy.
 *
 * USA Missionaries allocates a share of missionary-designated contributions
 * ACTUALLY RECEIVED to organizational support: administration, financial
 * management and accounting, donation processing and receipting, technology,
 * training, missionary support, and organizational oversight. The allocation
 * applies whether a missionary is underfunded, fully funded, or above target.
 *
 * Three rules are load-bearing here.
 *
 * 1. The target is grossed up, not marked up. An approved ministry budget is
 *    what must remain AFTER the allocation, so:
 *
 *        target = budget / (1 - rate)      NOT   budget * (1 + rate)
 *
 *    On a $6,000 budget at 10% that is $6,666.67, not $6,600. The wrong formula
 *    leaves the ministry $60 a month short at what it would call full funding.
 *
 * 2. Planning is whole dollars and the target rounds UP. Rounding a target down
 *    would leave the missionary a few dollars short of their approved budget at
 *    "full" funding, which is the one direction the error must never go. Ceiling
 *    also makes the displayed plan add up exactly: $6,000 + $667 = $6,667.
 *    Actual money is never rounded here. Contributions, allocations, and any
 *    ledger activity keep their cents; only planning figures are whole dollars.
 *
 * 3. The rate is a parameter, not a constant baked into history. If USAM ever
 *    moves off 10%, results already recorded must keep the rate that was
 *    actually applied to them. So the applied* functions take an explicit rate:
 *    a caller working on a recorded allocation passes the rate stored with that
 *    allocation, and only forward-looking planning falls back to the current
 *    rate. Nothing here writes a ledger; this is the shape that keeps one
 *    possible without a rewrite.
 *
 * Separate from the overflow/excess-support policy. This allocation comes off
 * contributions received; treatment of missionary-designated funds above the
 * approved target is decided by the overflow and budget-review policy. Changing
 * one does not change the other.
 *
 * The allocation base is GROSS. See OrganizationalSupportAllocation below for
 * the settled rule and the values a future ledger has to keep apart.
 */
export const ORGANIZATIONAL_SUPPORT_POLICY = {
  /** Bump alongside `rate`, and stamp it on an allocation when one is recorded. */
  version: "usam-organizational-support-v1",
  rate: 0.1,
} as const;

/**
 * The rate in force today.
 *
 * Correct for planning a new target. NOT correct for interpreting an allocation
 * that already happened, which must use the rate recorded with it.
 */
export const CURRENT_ORGANIZATIONAL_SUPPORT_RATE = ORGANIZATIONAL_SUPPORT_POLICY.rate;

function usable(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function ministryShare(rate: number) {
  const clamped = Number.isFinite(rate) && rate > 0 && rate < 1 ? rate : CURRENT_ORGANIZATIONAL_SUPPORT_RATE;

  return 1 - clamped;
}

/* ------------------------------------------------------------------ planning
   Whole dollars. Forward looking. Safe to recompute at any time, because these
   describe an intention rather than something that happened. */

/**
 * What has to be raised so that, after the allocation, the approved ministry
 * budget is fully funded. Rounded up to the dollar.
 */
export function planningFundraisingTarget(
  ministryBudget: number,
  rate: number = CURRENT_ORGANIZATIONAL_SUPPORT_RATE,
) {
  return Math.ceil(usable(ministryBudget) / ministryShare(rate));
}

/**
 * The organizational support a fully funded target carries. Taken as the
 * difference from the target rather than as a percentage of the budget, so the
 * three planning figures always reconcile to the dollar.
 */
export function planningOrganizationalSupport(
  ministryBudget: number,
  rate: number = CURRENT_ORGANIZATIONAL_SUPPORT_RATE,
) {
  return planningFundraisingTarget(ministryBudget, rate) - Math.round(usable(ministryBudget));
}

/* -------------------------------------------------------------------- actual
   Exact. Never rounded. The rate is required, because the right rate for money
   that has already moved is the one that was applied to it, not today's. */

/** The allocation on contributions actually received, at the rate applied. */
export function appliedOrganizationalSupport(received: number, rate: number) {
  const clamped = Number.isFinite(rate) && rate > 0 && rate < 1 ? rate : CURRENT_ORGANIZATIONAL_SUPPORT_RATE;

  return usable(received) * clamped;
}

/** What reaches the ministry from contributions actually received. */
export function appliedNetMinistryFunding(received: number, rate: number) {
  return usable(received) - appliedOrganizationalSupport(received, rate);
}

/* -------------------------------------------------------------- future ledger

   Not implemented, and deliberately not implemented here. This is the settled
   policy written down at the point someone will look for it, so the decision is
   not re-derived from scratch or quietly guessed at later. */

/**
 * The shape a recorded allocation has to preserve. Nothing writes this yet.
 *
 * The base is the GROSS missionary-designated contribution, before
 * payment-processing fees. Processing fees are a separate transaction and
 * organizational expense; they do not reduce the base the allocation is
 * calculated on. Netting fees out first would quietly shrink organizational
 * support by a slice of every gift, which is not the policy.
 *
 * All five values are kept distinct rather than derived on read. Rate and
 * version are stored with the row precisely so that a future change to the
 * organizational support rate cannot reprice history: an allocation is always
 * interpreted at the rate that was applied to it, which is why
 * appliedOrganizationalSupport takes the rate rather than reaching for the
 * current constant.
 *
 * Amounts are exact. Planning rounds to whole dollars; recorded money does not.
 */
export type OrganizationalSupportAllocation = {
  /** The full missionary-designated contribution, before any fee. */
  grossContribution: number;
  /** Charged by the payment processor. Never subtracted from the base above. */
  processingFee: number;
  /** The rate actually applied to this contribution, not today's rate. */
  appliedRate: number;
  /** The policy version this allocation was taken under. */
  appliedPolicyVersion: string;
  /** grossContribution * appliedRate. */
  organizationalSupportAmount: number;
  /** What remains for the ministry after the allocation. */
  netAmount: number;
};
