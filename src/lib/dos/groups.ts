export const dosGroupsSimplifiedFeatureFlag = "dos_groups_simplified_v2";

export const dosGroupAudienceOptions = ["men", "women", "coed"] as const;
export const dosGroupActivityOptions = ["running", "walking", "hiking", "cycling", "fitness"] as const;
export const dosGroupTemplateCategories = ["discipleship", "activity"] as const;
export const dosGroupSharedLeadershipRoles = ["leader", "co_leader", "helper", "member", "guest"] as const;

export type DosGroupAudience = typeof dosGroupAudienceOptions[number];
export type DosGroupActivity = typeof dosGroupActivityOptions[number];
export type DosGroupTemplateCategory = typeof dosGroupTemplateCategories[number];
export type DosGroupSharedLeadershipRole = typeof dosGroupSharedLeadershipRoles[number];

export type DosGroupCreationTemplate =
  | "mens_discipleship"
  | "womens_discipleship"
  | `2three2_${DosGroupActivity}_${DosGroupAudience}`;

export type DosGroupTemplateDefinition = {
  activityType: DosGroupActivity | null;
  audience: DosGroupAudience;
  category: DosGroupTemplateCategory;
  defaultName: string;
  defaultSlug: string;
  description: string;
  scriptureReference: string | null;
  scriptureText: string | null;
  tagline: string;
  templateKey: DosGroupCreationTemplate;
  title: string;
};

const twoThreeTwoDescription = "A 2three2 activity group where people move together, pray in pairs, and pursue Christ.";
const twoThreeTwoScriptureReference = "2 Timothy 2:22";
const twoThreeTwoScriptureText = "Flee also youthful lusts; but pursue righteousness, faith, love, peace with those who call on the Lord out of a pure heart.";

const activityTitles: Record<DosGroupActivity, string> = {
  cycling: "Cycling",
  fitness: "General Fitness",
  hiking: "Hiking",
  running: "Running",
  walking: "Walking",
};

const activityVerbs: Record<DosGroupActivity, string> = {
  cycling: "Ride",
  fitness: "Move",
  hiking: "Hike",
  running: "Run",
  walking: "Walk",
};

function titleCaseAudience(audience: DosGroupAudience) {
  return audience === "coed" ? "Coed" : audience === "men" ? "Men's" : "Women's";
}

function twoThreeTwoTemplate(activityType: DosGroupActivity, audience: DosGroupAudience): DosGroupTemplateDefinition {
  return {
    activityType,
    audience,
    category: "activity",
    defaultName: `2three2 ${activityTitles[activityType]} Group`,
    defaultSlug: `2three2-${activityType}-${audience}`,
    description: twoThreeTwoDescription,
    scriptureReference: twoThreeTwoScriptureReference,
    scriptureText: twoThreeTwoScriptureText,
    tagline: `${activityVerbs[activityType]}. Pray. Pursue.`,
    templateKey: `2three2_${activityType}_${audience}`,
    title: `2three2 ${activityTitles[activityType]} · ${titleCaseAudience(audience)}`,
  };
}

export const dosGroupCreationTemplates: DosGroupTemplateDefinition[] = [
  {
    activityType: null,
    audience: "men",
    category: "discipleship",
    defaultName: "Men's Discipleship Group",
    defaultSlug: "mens-discipleship-group",
    description: "A simple men's discipleship rhythm for Scripture, prayer, accountability, and next steps.",
    scriptureReference: null,
    scriptureText: null,
    tagline: "Scripture. Accountability. Prayer.",
    templateKey: "mens_discipleship",
    title: "Men's Discipleship Group",
  },
  {
    activityType: null,
    audience: "women",
    category: "discipleship",
    defaultName: "Women's Discipleship Group",
    defaultSlug: "womens-discipleship-group",
    description: "A simple women's discipleship rhythm for Scripture, prayer, encouragement, and next steps.",
    scriptureReference: null,
    scriptureText: null,
    tagline: "Scripture. Prayer. Encouragement.",
    templateKey: "womens_discipleship",
    title: "Women's Discipleship Group",
  },
  ...dosGroupAudienceOptions.flatMap((audience) => dosGroupActivityOptions.map((activityType) => (
    twoThreeTwoTemplate(activityType, audience)
  ))),
];

export function getDosGroupTemplate(templateKey: string | null | undefined) {
  return dosGroupCreationTemplates.find((template) => template.templateKey === templateKey) ?? null;
}

export function isDosGroupTemplateKey(value: string): value is DosGroupCreationTemplate {
  return dosGroupCreationTemplates.some((template) => template.templateKey === value);
}

export function slugFromGroupName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
