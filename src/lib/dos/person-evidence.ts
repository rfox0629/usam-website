export type CanonicalDiscipleshipStage = "disciple_maker" | "discipling" | "exploring" | "not_started" | "walking_with";

export function evidenceBelongsToPerson({
  meetingPersonIds,
  personId,
  recordPersonId,
}: {
  meetingPersonIds: string[];
  personId: string;
  recordPersonId?: string | null;
}) {
  if (recordPersonId) {
    return recordPersonId === personId;
  }

  return meetingPersonIds.length === 1 && meetingPersonIds[0] === personId;
}

export function personEvidenceCounts({
  fruit,
  reviews,
  testimonies,
}: {
  fruit: readonly unknown[];
  reviews: readonly unknown[];
  testimonies: readonly unknown[];
}) {
  return {
    fruitCount: fruit.length,
    reviewCount: reviews.length,
    testimonyCount: testimonies.length,
  };
}

export function canonicalSpiritualJourneyLabel(stage: CanonicalDiscipleshipStage) {
  switch (stage) {
    case "disciple_maker":
      return "Disciple Maker";
    case "discipling":
      return "Discipling";
    case "walking_with":
      return "Growing";
    case "not_started":
    case "exploring":
    default:
      return "Exploring";
  }
}
