import { restorationSections, type RestorationField } from "@/src/lib/restoration/intake";

/**
 * Preparation Summary for a Restoration case (USA-187).
 *
 * Deterministic on purpose. The generator filters and organizes what the
 * participant actually submitted; it never interprets, diagnoses, or writes
 * anything the participant did not say. No case content leaves the request.
 *
 * Sections 1 to 6 are the participant's own answers, regrouped. Section 7
 * consolidates the areas they themselves marked. Section 8 is the only
 * generated content, and it is phrased as questions to ask, never conclusions.
 */

export const preparationSectionIds = [
  "seeking",
  "context",
  "experiences",
  "identified",
  "spiritual",
  "relationships",
  "prayer",
  "questions",
] as const;

export type PreparationSectionId = typeof preparationSectionIds[number];

export type PreparationItem = {
  fieldId: string;
  label: string;
  value: string;
};

export type PreparationSection = {
  /** "participant" is their own words; "generated" is organized by this tool. */
  kind: "generated" | "participant";
  id: PreparationSectionId;
  items: PreparationItem[];
  /** Reviewer-editable text. Starts empty and falls back to `items`. */
  narrative: string;
  provenance: string;
  title: string;
};

export type PreparationNote = {
  author: string;
  text: string;
  updatedAt: string;
};

export type PreparationSummary = {
  caseReference: string;
  generatedAt: string;
  generatedBy: string;
  notes: Partial<Record<PreparationSectionId, PreparationNote>>;
  savedAt: null | string;
  savedBy: null | string;
  sections: PreparationSection[];
  status: "draft" | "saved";
};

const sectionMeta: Record<PreparationSectionId, { kind: "generated" | "participant"; provenance: string; title: string }> = {
  seeking: {
    kind: "participant",
    provenance: "In their own words, from the intake.",
    title: "Why they are seeking restoration",
  },
  context: {
    kind: "participant",
    provenance: "Life, health, and household details they reported.",
    title: "Life and family context",
  },
  experiences: {
    kind: "participant",
    provenance: "Experiences they chose to share. Handle with care.",
    title: "Significant experiences",
  },
  identified: {
    kind: "participant",
    provenance: "Areas the participant selected for themselves.",
    title: "Areas they identified",
  },
  spiritual: {
    kind: "participant",
    provenance: "Their spiritual history as they described it.",
    title: "Spiritual history and recurring patterns",
  },
  relationships: {
    kind: "participant",
    provenance: "People they described. Names appear here for the reviewer only.",
    title: "Important relationships to understand",
  },
  prayer: {
    kind: "generated",
    provenance: "Highlights pulled from the areas they marked. Counts and quotes only, never an assessment.",
    title: "Worth attending to first",
  },
  questions: {
    kind: "generated",
    provenance: "Prompts generated from what they submitted. Not conclusions.",
    title: "Questions worth exploring together",
  },
};

/** Gate radios, consent boxes, and contact details never reach the summary. */
const excludedFields = new Set([
  "careAcknowledgement",
  "confidentialityAcknowledgement",
  "continuedAnswers",
  "informedConsent",
  "manifestationHoldHarmlessInitials",
  "noGuaranteeInitials",
  "participantEmail",
  "participantName",
  "participantPhone",
  "todaysDate",
  "truthfulInitials",
]);

const sectionForField: Record<string, PreparationSectionId> = {};
const assign = (ids: readonly string[], section: PreparationSectionId) => {
  ids.forEach((id) => { sectionForField[id] = section; });
};

assign([
  "whatBringsYouHere", "restorationGoals", "previousDeliverance", "previousProfessionalCare",
  "jesusAuthorityFreedom", "willingToVisitPastHurt", "additionalInformation",
], "seeking");

assign([
  "lifeSatisfaction", "physicalHealth", "mentalHealth", "takesPrescriptionMeds", "prescriptionMeds",
  "takesNonPrescriptionMeds", "nonPrescriptionMeds", "alcoholOrDrugs", "lastWellSeason",
  "servedMilitary", "combatExperience", "currentlyMarried", "marriageCount", "yearsMarried",
  "ageWhenMarried", "spouseAgeWhenMarried", "currentlyEngaged", "yearsEngaged", "hasChildren",
  "childrenSatisfaction", "everDivorced", "exYearsMarried", "exAgeWhenMarried",
  "exSpouseAgeWhenMarried", "hasSiblings", "relationshipProblems",
], "context");

assign([
  "orphanageFosterHome", "orphanageFosterAges", "childhoodExperience", "childhoodFears",
  "parentsBirthFeelings", "parentsDiscipline", "sexualityGrowingUp", "oppositeSexTrauma",
  "oppositeSexTraumaDetails", "sameSexTrauma", "sameSexTraumaDetails", "pornExposure",
  "pornExposureAge", "sexualBackgroundNotes", "hindrance_traumas", "otherPhysicalTraumas",
  "bloodTransfusion", "pregnancyLossHistory", "miscarriagesAbortions",
], "experiences");

assign([
  "hindrance_possessiveness", "hindrance_fears", "hindrance_criticalSpirit", "hindrance_rebellion",
  "hindrance_angerIssues", "hindrance_victimMentality", "hindrance_emotionalIssues",
  "hindrance_sexualBackgroundItems", "hindrance_addictions", "hindrance_mentalIllness",
  "hindrance_physicalDiseases", "hindrance_miscellaneous", "otherEmotionalMental",
  "otherAddictionsMisc",
], "identified");

assign([
  "bornAgainChristian", "yearsChristian", "waterBaptized", "hasCurrentChurch", "currentChurch",
  "lastChurch", "spiritualBackground", "cultInvolvement", "cultName", "familyOccultInvolvement",
  "familyOccultActivity", "spiritualIssues", "hasOccultInvolvement", "occultInvolvement",
  "otherOccult", "hindrance_falseReligions", "otherFalseReligions",
], "spiritual");

assign([
  "spouseFirstName", "spouseTraitsLike", "spouseTraitsDislike", "spouseExpectations",
  "spouseExpectationsMet", "spouseExpectationsWhyNot", "spouseConfide", "spouseSatisfaction",
  "spouseFamilyRelationship", "marriageInterference", "fianceFirstName", "favoredChild",
  "childrenDifficulty", "childrenConfide", "exSpouseFirstName", "exTraitsLike", "exTraitsDislike",
  "exFamilyRelationship", "fatherNameOccupation", "motherNameOccupation", "hadStepfather",
  "stepfatherNameOccupation", "hadStepmother", "stepmotherNameOccupation", "fatherTraits",
  "stepfatherTraits", "motherTraits", "stepmotherTraits", "likedFather", "dislikedFather",
  "fatherRelationship", "fatherNatureNow", "likedMother", "dislikedMother", "motherRelationship",
  "parentsRelationship", "parentConfide", "houseValues", "childhoodAtmosphere", "siblingsGrowingUp",
  "siblingsNow", "familyTreeSelf", "familyTreeFather", "familyTreeMother", "familyTreeSiblings",
  "familyTreeSpouse", "familyTreeExSpouse", "familyTreeChildren", "otherRelationshipFigures",
], "relationships");

/**
 * Fields whose whole purpose is to identify a third party. Dropped from the PDF
 * rather than generalized, because a role label carries the useful context and
 * the name does not.
 */
export const directIdentifierFields = new Set([
  "exSpouseFirstName",
  "familyTreeChildren",
  "familyTreeExSpouse",
  "familyTreeFather",
  "familyTreeMother",
  "familyTreeSelf",
  "familyTreeSiblings",
  "familyTreeSpouse",
  "fatherNameOccupation",
  "fianceFirstName",
  "motherNameOccupation",
  "parentConfide",
  "spouseFirstName",
  "stepfatherNameOccupation",
  "stepmotherNameOccupation",
]);

const fieldIndex = new Map<string, RestorationField>();
for (const section of restorationSections) {
  for (const field of section.fields) {
    fieldIndex.set(field.id, field);
  }
}

function displayValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean).join(", ");
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "";
  }

  return typeof value === "string" ? value.trim() : "";
}

/** Drops No, false, blank, gate radios, consent boxes, and contact details. */
function isSubstantive(fieldId: string, value: string) {
  if (!value) return false;
  if (excludedFields.has(fieldId)) return false;
  if (fieldId.startsWith("hasHindrance_")) return false;
  if (value === "No") return false;
  if (fieldId === "immediateDanger" && value === "No") return false;

  return true;
}

/** Unambiguous alphabet: no 0/O or 1/I/L, so the reference is easy to read aloud. */
export function generateCaseReference(randomBytes: Uint8Array) {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let reference = "";
  for (let index = 0; index < 5; index += 1) {
    reference += alphabet[randomBytes[index] % alphabet.length];
  }

  return `R-${reference}`;
}

const prayerSourceFields = [
  "hindrance_fears", "hindrance_angerIssues", "hindrance_victimMentality",
  "hindrance_emotionalIssues", "hindrance_addictions", "hindrance_traumas",
  "hindrance_sexualBackgroundItems", "hindrance_mentalIllness", "hindrance_physicalDiseases",
  "hindrance_criticalSpirit", "hindrance_rebellion", "hindrance_possessiveness",
];

/**
 * Selections a reviewer should see before meeting rather than find buried in a
 * long checklist. Surfacing them is not a diagnosis; the participant marked
 * each one themselves.
 */
const safetyRelevantSelections = new Set([
  "Murder",
  "Rape",
  "Self-harming",
  "Self-hatred",
  "Self-punishment",
  "Suicidal",
  "Violence",
]);

function selections(values: Record<string, unknown>, fieldId: string) {
  const raw = values[fieldId];

  return Array.isArray(raw) ? raw.map((entry) => String(entry).trim()).filter(Boolean) : [];
}

/**
 * Deliberately short. The full inventory already appears under "Areas they
 * identified", so repeating every category here would bury the few things a
 * reviewer most needs before the first conversation.
 */
function buildPrayerItems(values: Record<string, unknown>): PreparationItem[] {
  const items: PreparationItem[] = [];
  const danger = displayValue(values.immediateDanger);

  if (danger && danger !== "No") {
    items.push({
      fieldId: "immediateDanger",
      label: "Safety flag raised on the intake",
      value: `They answered "${danger}" to the question about immediate danger, current abuse, or thoughts of ending their life. Follow the ministry's safety process before meeting.`,
    });
  }

  const flagged: string[] = [];
  const counts: { count: number; label: string }[] = [];

  for (const fieldId of prayerSourceFields) {
    const chosen = selections(values, fieldId);

    if (chosen.length === 0) {
      continue;
    }

    const label = fieldIndex.get(fieldId)?.label ?? fieldId;

    for (const entry of chosen) {
      if (safetyRelevantSelections.has(entry)) {
        flagged.push(`${entry} (${label})`);
      }
    }

    counts.push({ count: chosen.length, label });
  }

  if (flagged.length > 0) {
    items.push({
      fieldId: "safetyRelevantSelections",
      label: "Safety-relevant items they marked",
      value: flagged.join("; "),
    });
  }

  const heaviest = counts.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, 3);

  if (heaviest.length > 0) {
    items.push({
      fieldId: "heaviestAreas",
      label: "Where they marked the most",
      value: heaviest.map((entry) => `${entry.label} (${entry.count} selected)`).join(", "),
    });
  }

  const totals = counts.reduce((sum, entry) => sum + entry.count, 0);

  if (totals > 0) {
    items.push({
      fieldId: "selectionTotal",
      label: "Total marked across all areas",
      value: `${totals} items across ${counts.length} ${counts.length === 1 ? "area" : "areas"}.`,
    });
  }

  const misc = displayValue(values.otherAddictionsMisc);

  if (misc) {
    items.push({ fieldId: "otherAddictionsMisc", label: "In their own words", value: misc });
  }

  const goals = displayValue(values.restorationGoals);

  if (goals) {
    items.push({ fieldId: "restorationGoals", label: "What they hope God will do", value: goals });
  }

  return items;
}

type QuestionRule = {
  question: string;
  when: (values: Record<string, unknown>) => boolean;
};

const has = (values: Record<string, unknown>, fieldId: string) => Boolean(displayValue(values[fieldId]));
const answered = (values: Record<string, unknown>, fieldId: string, expected: string) =>
  displayValue(values[fieldId]) === expected;

const questionRules: QuestionRule[] = [
  { question: "What would it look like day to day if God met the hope they named?", when: (v) => has(v, "restorationGoals") },
  { question: "What prompted them to reach out now rather than earlier?", when: (v) => has(v, "whatBringsYouHere") },
  { question: "What was their earlier experience like, and what changed afterward?", when: (v) => answered(v, "previousDeliverance", "Yes") },
  { question: "Who is walking with them spiritually right now?", when: (v) => !answered(v, "hasCurrentChurch", "Yes") },
  { question: "Which of the fears they listed feels most present in an ordinary week?", when: (v) => has(v, "hindrance_fears") },
  { question: "Where does the anger tend to show up, and who sees it?", when: (v) => has(v, "hindrance_angerIssues") },
  { question: "Is there someone they are still carrying unforgiveness toward?", when: (v) => has(v, "hindrance_angerIssues") || has(v, "hindrance_emotionalIssues") },
  { question: "What still feels unresolved from the earlier marriage?", when: (v) => answered(v, "everDivorced", "Yes") },
  { question: "How are things between them and their spouse at the moment?", when: (v) => answered(v, "currentlyMarried", "Yes") },
  { question: "What is hardest with their children right now?", when: (v) => has(v, "childrenDifficulty") },
  { question: "How would they describe their father's influence on them today?", when: (v) => has(v, "fatherRelationship") || has(v, "dislikedFather") },
  { question: "How would they describe their mother's influence on them today?", when: (v) => has(v, "motherRelationship") || has(v, "dislikedMother") },
  { question: "What did they learn about God from how they were parented?", when: (v) => has(v, "parentsDiscipline") || has(v, "houseValues") },
  { question: "Are there places from the past they would rather not revisit yet?", when: (v) => answered(v, "willingToVisitPastHurt", "Not sure") || answered(v, "willingToVisitPastHurt", "No") },
  { question: "What do they believe God thinks of them right now?", when: (v) => has(v, "hindrance_victimMentality") || has(v, "hindrance_emotionalIssues") },
  { question: "What has helped in the seasons when they felt well?", when: (v) => has(v, "lastWellSeason") },
  { question: "Is anything they are carrying something they have never said out loud?", when: () => true },
];

function buildQuestionItems(values: Record<string, unknown>): PreparationItem[] {
  return questionRules
    .filter((rule) => rule.when(values))
    .map((rule, index) => ({
      fieldId: `question-${index}`,
      label: `Question ${index + 1}`,
      value: rule.question,
    }));
}

/**
 * Organizes a submitted payload into the Preparation Summary sections.
 * `values` is the participant's `payload.values` object and is never mutated.
 */
export function buildPreparationSections(values: Record<string, unknown>): PreparationSection[] {
  const buckets = new Map<PreparationSectionId, PreparationItem[]>();
  for (const id of preparationSectionIds) {
    buckets.set(id, []);
  }

  for (const section of restorationSections) {
    for (const field of section.fields) {
      const value = displayValue(values[field.id]);
      if (!isSubstantive(field.id, value)) continue;

      const target = sectionForField[field.id];
      if (!target) continue;

      buckets.get(target)?.push({ fieldId: field.id, label: field.label, value });
    }
  }

  buckets.set("prayer", buildPrayerItems(values));
  buckets.set("questions", buildQuestionItems(values));

  return preparationSectionIds.map((id) => ({
    ...sectionMeta[id],
    id,
    items: buckets.get(id) ?? [],
    narrative: "",
  }));
}

export type PreparationBriefEntry = {
  /** "participant" is their own words; "generated" is organized by this tool. */
  kind: "generated" | "participant";
  label: string;
  value: string;
};

/**
 * The lead brief.
 *
 * The eight sections below it are ordered the way the intake is ordered, which
 * means the two most decision-relevant sections land last: on a case like this
 * one a reviewer scrolls past roughly 80 percent of the summary before reaching
 * what needs attention first. This block answers the five questions a reviewer
 * actually opens the case with, before any of that.
 *
 * It invents nothing and re-derives everything from the sections already built,
 * so every line here also appears in full below. It is a lead, not a
 * replacement, and no detail is dropped from the sections to make room for it.
 */
export function buildCaseBrief(
  // Structural, so the PDF can build the brief from its already-redacted
  // sections rather than from the raw ones.
  sections: { id: PreparationSectionId; items: PreparationItem[] }[],
): PreparationBriefEntry[] {
  const find = (fieldId: string) => {
    for (const section of sections) {
      const item = section.items.find((entry) => entry.fieldId === fieldId);

      if (item) {
        return item;
      }
    }

    return null;
  };

  const entries: PreparationBriefEntry[] = [];
  const push = (label: string, fieldId: string, kind: "generated" | "participant") => {
    const item = find(fieldId);

    if (item) {
      entries.push({ kind, label, value: item.value });
    }
  };

  push("Why they are here, in their words", "whatBringsYouHere", "participant");
  push("What they hope God will do", "restorationGoals", "participant");
  push("The context they gave", "relationshipProblems", "participant");
  push("Safety-relevant items they marked", "safetyRelevantSelections", "generated");
  push("Where they marked the most", "heaviestAreas", "generated");

  const questions = sections.find((section) => section.id === "questions")?.items ?? [];

  if (questions.length > 0) {
    const leading = questions.slice(0, 3).map((item) => item.value);
    const remainder = questions.length - leading.length;

    entries.push({
      kind: "generated",
      label: "Questions to open with",
      value: remainder > 0
        ? `${leading.join(" ")} (${remainder} more below.)`
        : leading.join(" "),
    });
  }

  return entries;
}

export function createPreparationSummary({
  caseReference,
  generatedBy,
  now,
  values,
}: {
  caseReference: string;
  generatedBy: string;
  now: string;
  values: Record<string, unknown>;
}): PreparationSummary {
  return {
    caseReference,
    generatedAt: now,
    generatedBy,
    notes: {},
    savedAt: null,
    savedBy: null,
    sections: buildPreparationSections(values),
    status: "draft",
  };
}

/** Reads a stored summary out of the submission payload, if present. */
export function readPreparationSummary(payload: Record<string, unknown>): PreparationSummary | null {
  const stored = payload.operations_preparation;

  if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
    return null;
  }

  const candidate = stored as Partial<PreparationSummary>;

  if (!candidate.caseReference || !Array.isArray(candidate.sections)) {
    return null;
  }

  return {
    caseReference: candidate.caseReference,
    generatedAt: candidate.generatedAt ?? "",
    generatedBy: candidate.generatedBy ?? "",
    notes: candidate.notes ?? {},
    savedAt: candidate.savedAt ?? null,
    savedBy: candidate.savedBy ?? null,
    sections: candidate.sections,
    status: candidate.status === "saved" ? "saved" : "draft",
  };
}

/**
 * The redacted view used for the PDF. Drops third-party identifier fields and
 * reports how many were withheld so the reviewer knows the document is partial.
 */
export function redactForExport(summary: PreparationSummary, { includeNotes }: { includeNotes: boolean }) {
  const sections = summary.sections.map((section) => {
    const kept = section.items.filter((item) => !directIdentifierFields.has(item.fieldId));
    const withheld = section.items.length - kept.length;

    return {
      id: section.id,
      items: kept,
      narrative: section.narrative,
      note: includeNotes ? summary.notes[section.id]?.text ?? "" : "",
      provenance: section.provenance,
      title: section.title,
      withheld,
    };
  });

  return {
    caseReference: summary.caseReference,
    sections: sections.filter((section) => section.items.length > 0 || section.narrative || section.note),
  };
}
