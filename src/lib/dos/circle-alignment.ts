/* USA-247: Circle Alignment.
 *
 * The governing sentence, which every rule below serves:
 *
 *   The missionary chooses intended placement. DOS measures whether lived
 *   investment aligns with it. DOS never silently moves someone.
 *
 * So nothing here returns a placement. It returns an OBSERVATION with the
 * concrete facts behind it, which a person may act on, keep, or dismiss.
 *
 * Four dimensions stay distinct and are never collapsed into one number:
 *   - TIME validates actual investment.
 *   - FRUIT reflects observed movement or outcomes.
 *   - MULTIPLICATION reflects reproduction through discipling others.
 *   - CONFIRMED CIRCLE records the missionary's intended stewardship.
 * A score may order suggestions internally; it may never be the explanation.
 *
 * Dependency-free on purpose, so Reports and the regression scripts can import
 * it directly under Node's type stripping. It therefore restates the tier and
 * view order rather than importing it; `dos-circle-alignment-regression.mjs`
 * imports BOTH this module and the contract module and asserts they agree, so
 * the two can never drift apart silently. */

export type CircleTier = "inner_3" | "next_9" | "next_58" | "next_50";
export type CirclePlacement = CircleTier | "not_placed";
export type CircleView = "my_3" | "my_12" | "my_70" | "my_120";

/* Innermost first. Position i of the tiers is position i of the views: a
   person stored in the i-th tier reads as being in the i-th circle. */
export const alignmentTierOrder: ReadonlyArray<CircleTier> = ["inner_3", "next_9", "next_58", "next_50"];
export const alignmentViewOrder: ReadonlyArray<CircleView> = ["my_3", "my_12", "my_70", "my_120"];

export const alignmentWindows = ["30d", "90d", "12m"] as const;

export type AlignmentWindow = typeof alignmentWindows[number];

export const defaultAlignmentWindow: AlignmentWindow = "90d";

export const alignmentWindowDays: Readonly<Record<AlignmentWindow, number>> = {
  "12m": 365,
  "30d": 30,
  "90d": 90,
};

export const alignmentWindowLabel: Readonly<Record<AlignmentWindow, string>> = {
  "12m": "last 12 months",
  "30d": "last 30 days",
  "90d": "last 90 days",
};

/** The circle a missionary reads for a stored tier: the innermost cumulative
    view that contains it. Inner 3 reads as "My 3", Next 9 as "My 12". */
export function closestCircleForTier(tier: CircleTier): CircleView {
  return alignmentViewOrder[alignmentTierOrder.indexOf(tier)] ?? "my_120";
}

/** How far in a person sits: 0 is the innermost. Used only to compare two
    people's intended closeness, never to rank them by activity. */
export function tierDepth(tier: CircleTier) {
  return alignmentTierOrder.indexOf(tier);
}

/* Every signal that may inform an observation. All are facts already recorded
   elsewhere in DOS; none of them may move a person. */
export type CircleEvidence = {
  /** Accountability touches inside the window. */
  accountability: number;
  /** Active Journeys for this person. */
  activeJourneys: number;
  /** When the placement was confirmed, so a fresh placement is not judged. */
  confirmedAt: string | null;
  /** Distinct weeks with any logged activity: consistency, not volume. */
  consistencyWeeks: number;
  fruitEvents: number;
  lastInteractionAt: string | null;
  meetings: number;
  /** Actual logged ministry time in minutes. */
  ministryMinutes: number;
  multiplicationEvents: number;
  personId: string;
  personName: string;
  placement: CirclePlacement;
  prayer: number;
  /** Kitchen tables specifically. */
  tables: number;
};

export type AlignmentState = "aligned" | "insufficient_data" | "needs_attention" | "review_placement";

export type AlignmentFinding = {
  /** The other person a comparison refers to, when there is one. */
  comparisonPersonId: string | null;
  /** Concrete facts, each a complete sentence a person can check. */
  evidence: string[];
  headline: string;
  personId: string;
  state: AlignmentState;
  window: AlignmentWindow;
};

export function formatMinutes(minutes: number) {
  if (minutes < 60) {
    return `${Math.round(minutes)} minute${Math.round(minutes) === 1 ? "" : "s"}`;
  }

  const hours = minutes / 60;
  const rounded = Math.round(hours * 10) / 10;

  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} hour${rounded === 1 ? "" : "s"}`;
}

export const circleViewName: Readonly<Record<CircleView, string>> = {
  my_12: "My 12",
  my_120: "My 120",
  my_3: "My 3",
  my_70: "My 70",
};

/* An inner placement carries an expectation of regular investment. These are
   deliberately modest: the question is "has anything happened", not "has
   enough happened", because the missionary decides what enough means. */
const innerTiers: CircleTier[] = ["inner_3", "next_9"];

function daysBetween(fromIso: string, toIso: string) {
  return Math.floor((Date.parse(toIso) - Date.parse(fromIso)) / 86_400_000);
}

function hasAnyActivity(evidence: CircleEvidence) {
  return evidence.meetings > 0
    || evidence.ministryMinutes > 0
    || evidence.tables > 0
    || evidence.accountability > 0
    || evidence.prayer > 0
    || evidence.activeJourneys > 0;
}

/**
 * Evaluate one workspace's confirmed placements against lived investment.
 *
 * Returns observations only. Never a placement, never an ordering of people,
 * never a mutation. People with no confirmed placement are skipped entirely:
 * an unconfirmed machine assignment is not a decision to measure against.
 */
export function evaluateCircleAlignment({
  evidence,
  now,
  window = defaultAlignmentWindow,
}: {
  evidence: ReadonlyArray<CircleEvidence>;
  now: string;
  window?: AlignmentWindow;
}): AlignmentFinding[] {
  const windowDays = alignmentWindowDays[window];
  const windowLabel = alignmentWindowLabel[window];
  const placed = evidence.filter((row): row is CircleEvidence & { placement: CircleTier } => row.placement !== "not_placed");
  const findings: AlignmentFinding[] = [];

  placed.forEach((row) => {
    const circle = circleViewName[closestCircleForTier(row.placement)];
    const observedDays = row.confirmedAt ? daysBetween(row.confirmedAt, now) : windowDays;

    /* A placement younger than the window has not had a fair chance to show
       investment, and neither has a person with nothing recorded yet. */
    if (!hasAnyActivity(row) && observedDays < windowDays) {
      findings.push({
        comparisonPersonId: null,
        evidence: [`${row.personName} was placed in ${circle} ${observedDays} day${observedDays === 1 ? "" : "s"} ago, which is less than the ${windowLabel}.`],
        headline: `Not enough yet to say for ${row.personName}`,
        personId: row.personId,
        state: "insufficient_data",
        window,
      });

      return;
    }

    if (!hasAnyActivity(row)) {
      findings.push({
        comparisonPersonId: null,
        evidence: [`No meetings, tables, accountability, prayer or active Journeys recorded with ${row.personName} in the ${windowLabel}.`],
        headline: innerTiers.includes(row.placement)
          ? `${row.personName} is in ${circle} and has had little recent investment`
          : `No recent investment recorded with ${row.personName}`,
        personId: row.personId,
        state: innerTiers.includes(row.placement) ? "needs_attention" : "insufficient_data",
        window,
      });

      return;
    }

    /* Someone farther out receiving materially more investment than someone
       closer in. "Materially" is deliberately strict: at least double, and at
       least an hour more, so a normal week's variation never triggers it. */
    const outInvestedBy = placed
      .filter((other) => tierDepth(other.placement) > tierDepth(row.placement))
      .filter((other) => other.ministryMinutes >= row.ministryMinutes * 2 && other.ministryMinutes - row.ministryMinutes >= 60)
      .sort((first, second) => second.ministryMinutes - first.ministryMinutes)[0];

    if (innerTiers.includes(row.placement) && outInvestedBy) {
      const otherCircle = circleViewName[closestCircleForTier(outInvestedBy.placement)];

      findings.push({
        comparisonPersonId: outInvestedBy.personId,
        evidence: [
          `You logged ${formatMinutes(row.ministryMinutes)} with ${row.personName} during the ${windowLabel} and ${formatMinutes(outInvestedBy.ministryMinutes)} with ${outInvestedBy.personName}, currently in ${otherCircle}.`,
        ],
        headline: `Review ${circle}`,
        personId: row.personId,
        state: "review_placement",
        window,
      });

      return;
    }

    findings.push({
      comparisonPersonId: null,
      evidence: [
        `${row.meetings} meeting${row.meetings === 1 ? "" : "s"} and ${formatMinutes(row.ministryMinutes)} logged with ${row.personName} in the ${windowLabel}.`,
        `Activity in ${row.consistencyWeeks} separate week${row.consistencyWeeks === 1 ? "" : "s"}.`,
      ],
      headline: `${row.personName} looks aligned with ${circle}`,
      personId: row.personId,
      state: "aligned",
      window,
    });
  });

  return findings;
}

/* A dismissal records that a person considered the observation and kept the
   placement. It never edits, hides or deletes the activity the observation
   was drawn from -- the facts stay true, the suggestion simply stops asking. */
export type AlignmentDismissal = {
  dismissedAt: string;
  dismissedBy: string | null;
  findingState: AlignmentState;
  personId: string;
  reason: string | null;
  window: AlignmentWindow;
};

export function isFindingDismissed(
  finding: AlignmentFinding,
  dismissals: ReadonlyArray<AlignmentDismissal>,
) {
  return dismissals.some((dismissal) => (
    dismissal.personId === finding.personId
    && dismissal.findingState === finding.state
    && dismissal.window === finding.window
  ));
}
