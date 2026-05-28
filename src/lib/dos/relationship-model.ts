export const relationshipContextOptions = [
  { label: "Family", value: "family" },
  { label: "Work", value: "work" },
  { label: "Church", value: "church" },
  { label: "Friend", value: "friend" },
  { label: "Outreach", value: "outreach" },
  { label: "Community", value: "community" },
  { label: "Other", value: "other" },
] as const;

export const roleInMyLifeOptions = [
  { label: "I am discipling them", value: "discipling_them" },
  { label: "I am walking with them", value: "walking_with_them" },
  { label: "They are mentoring me", value: "mentoring_me" },
  { label: "Peer encouragement", value: "peer_encouragement" },
  { label: "Not active yet", value: "not_active" },
] as const;

export const discipleshipStageOptions = [
  { label: "Not Started", value: "not_started" },
  { label: "Exploring", value: "exploring" },
  { label: "Walking With", value: "walking_with" },
  { label: "Discipling", value: "discipling" },
  { label: "Disciple Maker", value: "disciple_maker" },
] as const;

export type RelationshipContextValue = typeof relationshipContextOptions[number]["value"];
export type RoleInMyLifeValue = typeof roleInMyLifeOptions[number]["value"];
export type DiscipleshipStageValue = typeof discipleshipStageOptions[number]["value"];

export type DosRelationshipModel = {
  discipleshipStage: DiscipleshipStageValue;
  relationshipContext: RelationshipContextValue;
  roleInMyLife: RoleInMyLifeValue;
};

export type DosRelationshipModelCounts = {
  discipleshipStage: Record<DiscipleshipStageValue, number>;
  relationshipContext: Record<RelationshipContextValue, number>;
  roleInMyLife: Record<RoleInMyLifeValue, number>;
};

export const defaultRelationshipModel: DosRelationshipModel = {
  discipleshipStage: "not_started",
  relationshipContext: "other",
  roleInMyLife: "not_active",
};

function normalizeText(...values: Array<string | null | undefined>) {
  return values
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .toLowerCase()
    .replace(/[_-]+/g, " ");
}

function optionValue<T extends string>(value: string | null | undefined, options: ReadonlyArray<{ value: T }>) {
  const normalized = value?.trim().toLowerCase();

  return options.find((option) => option.value === normalized)?.value ?? null;
}

export function relationshipContextLabel(value: RelationshipContextValue) {
  return relationshipContextOptions.find((option) => option.value === value)?.label ?? "Other";
}

export function roleInMyLifeLabel(value: RoleInMyLifeValue) {
  return roleInMyLifeOptions.find((option) => option.value === value)?.label ?? "Not active yet";
}

export function discipleshipStageLabel(value: DiscipleshipStageValue) {
  return discipleshipStageOptions.find((option) => option.value === value)?.label ?? "Not Started";
}

export function normalizeRelationshipContext(value: string | null | undefined, legacyRelationshipType?: string | null) {
  const exactValue = optionValue(value, relationshipContextOptions);

  if (exactValue) {
    return exactValue;
  }

  const legacyText = normalizeText(legacyRelationshipType);

  if (legacyText.includes("family")) {
    return "family";
  }

  if (legacyText.includes("work") || legacyText.includes("coworker") || legacyText.includes("co worker") || legacyText.includes("job") || legacyText.includes("marketplace")) {
    return "work";
  }

  if (legacyText.includes("church") || legacyText.includes("ministry") || legacyText.includes("small group")) {
    return "church";
  }

  if (legacyText.includes("friend")) {
    return "friend";
  }

  if (legacyText.includes("outreach") || legacyText.includes("new contact") || legacyText.includes("evangelism")) {
    return "outreach";
  }

  if (legacyText.includes("community") || legacyText.includes("neighbor") || legacyText.includes("neighbour")) {
    return "community";
  }

  return defaultRelationshipModel.relationshipContext;
}

export function normalizeRoleInMyLife(value: string | null | undefined, legacyRelationshipType?: string | null, status?: string | null) {
  const exactValue = optionValue(value, roleInMyLifeOptions);

  if (exactValue) {
    return exactValue;
  }

  const legacyText = normalizeText(legacyRelationshipType, status);

  if (legacyText.includes("mentor")) {
    return "mentoring_me";
  }

  if (legacyText.includes("discipling them") || legacyText.includes("i am discipling") || legacyText.includes("disciple")) {
    return "discipling_them";
  }

  if (legacyText.includes("walking") || legacyText.includes("walk with") || legacyText.includes("active") || legacyText.includes("follow up")) {
    return "walking_with_them";
  }

  if (legacyText.includes("peer") || legacyText.includes("co labor") || legacyText.includes("co-labor") || legacyText.includes("collaborator")) {
    return "peer_encouragement";
  }

  return defaultRelationshipModel.roleInMyLife;
}

export function normalizeDiscipleshipStage(
  value: string | null | undefined,
  legacyRelationshipType?: string | null,
  status?: string | null,
  engagementLevel?: string | null,
) {
  const exactValue = optionValue(value, discipleshipStageOptions);

  if (exactValue) {
    return exactValue;
  }

  const legacyText = normalizeText(legacyRelationshipType, status, engagementLevel);

  if (legacyText.includes("disciple maker") || legacyText.includes("multiplying") || legacyText.includes("started discipling others")) {
    return "disciple_maker";
  }

  if (legacyText.includes("discipling") || legacyText.includes("discipleship") || legacyText.includes("disciple")) {
    return "discipling";
  }

  if (legacyText.includes("walking with") || legacyText.includes("walking") || legacyText.includes("growing") || legacyText.includes("active") || legacyText.includes("follow up")) {
    return "walking_with";
  }

  if (legacyText.includes("exploring") || legacyText.includes("curious") || legacyText.includes("open")) {
    return "exploring";
  }

  return defaultRelationshipModel.discipleshipStage;
}

export function relationshipModelFromFields(fields: {
  discipleshipStage?: string | null;
  engagementLevel?: string | null;
  relationshipContext?: string | null;
  relationshipType?: string | null;
  roleInMyLife?: string | null;
  status?: string | null;
}) {
  return {
    discipleshipStage: normalizeDiscipleshipStage(
      fields.discipleshipStage,
      fields.relationshipType,
      fields.status,
      fields.engagementLevel,
    ),
    relationshipContext: normalizeRelationshipContext(fields.relationshipContext, fields.relationshipType),
    roleInMyLife: normalizeRoleInMyLife(fields.roleInMyLife, fields.relationshipType, fields.status),
  } satisfies DosRelationshipModel;
}

export function relationshipModelSummary(model: DosRelationshipModel) {
  return [
    relationshipContextLabel(model.relationshipContext),
    roleInMyLifeLabel(model.roleInMyLife),
    discipleshipStageLabel(model.discipleshipStage),
  ].join(" · ");
}

export function emptyRelationshipModelCounts() {
  return {
    discipleshipStage: Object.fromEntries(discipleshipStageOptions.map((option) => [option.value, 0])),
    relationshipContext: Object.fromEntries(relationshipContextOptions.map((option) => [option.value, 0])),
    roleInMyLife: Object.fromEntries(roleInMyLifeOptions.map((option) => [option.value, 0])),
  } as DosRelationshipModelCounts;
}

export function relationshipModelCounts(models: DosRelationshipModel[]) {
  const counts = emptyRelationshipModelCounts();

  models.forEach((model) => {
    counts.relationshipContext[model.relationshipContext] += 1;
    counts.roleInMyLife[model.roleInMyLife] += 1;
    counts.discipleshipStage[model.discipleshipStage] += 1;
  });

  return counts;
}
