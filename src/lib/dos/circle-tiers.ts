/* USA-247: the circle data contract.
 *
 * There are two different things here and the code keeps them apart on
 * purpose, because conflating them is what produces double-counted reports.
 *
 *   TIER  — where a person is actually stored. Mutually exclusive: a person
 *           holds exactly one tier, or none. Storage and every aggregate use
 *           tiers, so summing tiers can never count a person twice.
 *
 *   VIEW  — what a missionary is shown. Cumulative, following the biblical
 *           pattern: My 12 contains My 3, My 70 contains My 12, and so on.
 *           Views are for reading. Never store a view.
 *
 * The tier sizes are chosen so the cumulative views land on the familiar
 * numbers: 3, 3+9=12, 12+58=70, 70+50=120.
 *
 * Placement is a human decision. Nothing in this module reads a score, a
 * meeting, minutes, Fruit, an engagement level or a date: it cannot move
 * anyone on its own, by construction.
 *
 * Dependency-free so the regression script can import it directly. */

export const circleTiers = ["inner_3", "next_9", "next_58", "next_50"] as const;

export type CircleTier = typeof circleTiers[number];

/** A person is in exactly one tier, or explicitly not placed. */
export type CirclePlacement = CircleTier | "not_placed";

export const circleViews = ["my_3", "my_12", "my_70", "my_120"] as const;

export type CircleView = typeof circleViews[number];

export const circleTierCapacity: Readonly<Record<CircleTier, number>> = {
  inner_3: 3,
  next_9: 9,
  next_50: 50,
  next_58: 58,
};

export const circleTierLabel: Readonly<Record<CircleTier, string>> = {
  inner_3: "Inner 3",
  next_9: "Next 9",
  next_50: "Next 50",
  next_58: "Next 58",
};

export const circleViewLabel: Readonly<Record<CircleView, string>> = {
  my_12: "My 12",
  my_120: "My 120",
  my_3: "My 3",
  my_70: "My 70",
};

/** Which exclusive tiers a cumulative view is made of, widest view last. */
export const circleViewTiers: Readonly<Record<CircleView, readonly CircleTier[]>> = {
  my_12: ["inner_3", "next_9"],
  my_120: ["inner_3", "next_9", "next_58", "next_50"],
  my_3: ["inner_3"],
  my_70: ["inner_3", "next_9", "next_58"],
};

export function isCircleTier(value: unknown): value is CircleTier {
  return typeof value === "string" && circleTiers.includes(value as CircleTier);
}

export function normalizeCirclePlacement(value: unknown): CirclePlacement {
  return isCircleTier(value) ? value : "not_placed";
}

/** 3, 12, 70, 120 — derived from the tiers, never hard-coded twice. */
export function circleViewCapacity(view: CircleView) {
  return circleViewTiers[view].reduce((total, tier) => total + circleTierCapacity[tier], 0);
}

export function circleViewIncludesTier(view: CircleView, tier: CircleTier) {
  return circleViewTiers[view].includes(tier);
}

export type CircleTierCounts = Record<CircleTier, number>;

export function emptyTierCounts(): CircleTierCounts {
  return { inner_3: 0, next_9: 0, next_50: 0, next_58: 0 };
}

/** Exclusive tallies. One person contributes to exactly one entry. */
export function tierCounts(placements: ReadonlyArray<CirclePlacement>): CircleTierCounts {
  const counts = emptyTierCounts();

  placements.forEach((placement) => {
    if (isCircleTier(placement)) {
      counts[placement] += 1;
    }
  });

  return counts;
}

/** Cumulative tallies for display. Each is the sum of its own tiers, so a
    person in Inner 3 is counted once in My 3 and once in My 12 -- as a view,
    not as an aggregate. Use `placedTotal` when you need "how many people". */
export function viewCounts(counts: CircleTierCounts): Record<CircleView, number> {
  return {
    my_12: circleViewTiers.my_12.reduce((total, tier) => total + counts[tier], 0),
    my_120: circleViewTiers.my_120.reduce((total, tier) => total + counts[tier], 0),
    my_3: circleViewTiers.my_3.reduce((total, tier) => total + counts[tier], 0),
    my_70: circleViewTiers.my_70.reduce((total, tier) => total + counts[tier], 0),
  };
}

/** The only correct answer to "how many people are placed": the exclusive sum. */
export function placedTotal(counts: CircleTierCounts) {
  return circleTiers.reduce((total, tier) => total + counts[tier], 0);
}

export type CircleCapacityRow = {
  capacity: number;
  overBy: number;
  remaining: number;
  tier: CircleTier;
  used: number;
};

export function capacityReport(counts: CircleTierCounts): CircleCapacityRow[] {
  return circleTiers.map((tier) => {
    const capacity = circleTierCapacity[tier];
    const used = counts[tier];

    return {
      capacity,
      overBy: Math.max(0, used - capacity),
      remaining: Math.max(0, capacity - used),
      tier,
      used,
    };
  });
}

/** Tiers a draft would leave over capacity. Empty means the draft is safe. */
export function capacityConflicts(counts: CircleTierCounts) {
  return capacityReport(counts).filter((row) => row.overBy > 0);
}

export type CirclePlacementChange = {
  from: CirclePlacement;
  personId: string;
  to: CirclePlacement;
};

/** What a save would actually write: only the people whose tier changed. */
export function placementChanges(
  current: ReadonlyMap<string, CirclePlacement>,
  draft: ReadonlyMap<string, CirclePlacement>,
): CirclePlacementChange[] {
  const changes: CirclePlacementChange[] = [];

  draft.forEach((to, personId) => {
    const from = current.get(personId) ?? "not_placed";

    if (from !== to) {
      changes.push({ from, personId, to });
    }
  });

  return changes.sort((first, second) => first.personId.localeCompare(second.personId));
}
