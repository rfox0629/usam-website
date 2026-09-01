/**
 * USA Missionaries organizational support policy.
 *
 * USA Missionaries allocates 10% of missionary-designated contributions
 * ACTUALLY RECEIVED to organizational support: administration, financial
 * management and accounting, donation processing and receipting, technology,
 * training, missionary support, and organizational oversight. The allocation
 * applies whether a missionary is underfunded, fully funded, or above target.
 *
 * The consequence for fundraising is the part that is easy to get wrong. An
 * approved ministry budget is the amount available for ministry AFTER the
 * allocation, so the target has to be grossed up, not marked up:
 *
 *     target = budget / 0.90        NOT   budget * 1.10
 *
 * On a $6,000 budget that is a $6,666.67 target carrying $666.67 of
 * organizational support. The wrong formula gives $6,600 and leaves the
 * ministry $60 a month short at "full" funding.
 *
 * This lives outside src/lib/join because both the applicant-facing funding
 * plan and the Operations review read it. One rate, one formula, one place.
 *
 * Separate from the overflow/excess-support policy: this allocation is taken
 * from contributions received, while treatment of missionary-designated funds
 * above the approved target is decided by the overflow and budget-review
 * policy. Changing one does not change the other.
 */
export const ORGANIZATIONAL_SUPPORT_RATE = 0.1;

/** The share of a contribution that reaches the approved ministry budget. */
export const MINISTRY_SHARE = 1 - ORGANIZATIONAL_SUPPORT_RATE;

function clean(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * What a missionary has to raise so that, after the 10% allocation, the
 * approved ministry budget is fully funded.
 */
export function fundraisingTarget(ministryBudget: number) {
  return clean(ministryBudget) / MINISTRY_SHARE;
}

/**
 * The organizational support carried by a fully funded target. This is the
 * difference between the target and the budget, which is 10% OF THE TARGET and
 * therefore more than 10% of the budget.
 */
export function organizationalSupportAtTarget(ministryBudget: number) {
  return fundraisingTarget(ministryBudget) - clean(ministryBudget);
}

/** 10% of what actually came in, whatever the target. */
export function organizationalSupportOnReceived(received: number) {
  return clean(received) * ORGANIZATIONAL_SUPPORT_RATE;
}

/** What reaches the ministry from what actually came in. */
export function netMinistryFunding(received: number) {
  return clean(received) * MINISTRY_SHARE;
}
