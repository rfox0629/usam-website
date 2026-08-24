export type CanonicalCircleAssignment = "field" | "my_120" | "seventy" | "three" | "twelve";

export function canonicalCircleForRecalculation({
  existingCircle,
  lockedOverrideCircle,
}: {
  existingCircle?: CanonicalCircleAssignment | null;
  lockedOverrideCircle?: CanonicalCircleAssignment | null;
}) {
  if (lockedOverrideCircle) {
    return {
      assignmentSource: "manual" as const,
      circle: lockedOverrideCircle,
    };
  }

  return {
    assignmentSource: "automatic" as const,
    // Recalculation refreshes recommendation metrics only. It must never move
    // an existing Person. New People begin in Field until a human confirms a
    // canonical override.
    circle: existingCircle ?? "field",
  };
}
