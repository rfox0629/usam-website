/* USA-244: household members as their own people, each with their own list
   visibility. Pure helpers shared by the people API, the household sync and
   the regression scripts (no server-only import here). */

export const householdMemberRelationships = ["child", "spouse"] as const;
export const householdMemberVisibilities = ["primary", "secondary", "hidden"] as const;

export type HouseholdMemberRelationship = typeof householdMemberRelationships[number];
export type HouseholdMemberVisibility = typeof householdMemberVisibilities[number];

export type HouseholdMemberInput = {
  /* Explicit list-visibility choice for this member. Absent = leave an
     existing person's setting alone, or create the member as household-only. */
  fieldVisibility?: HouseholdMemberVisibility;
  name: string;
  relationship: HouseholdMemberRelationship;
};

export function cleanHouseholdText(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export function householdNameKey(value: unknown) {
  return cleanHouseholdText(value).toLowerCase();
}

/* Accepts the form's JSON array (or an already-parsed array) and keeps only
   well-formed members: a name, a known relationship, an optional known
   visibility. One spouse at most; duplicates by name collapse to the first. */
export function normalizeHouseholdMembers(value: unknown): HouseholdMemberInput[] {
  let items: unknown = value;

  if (typeof items === "string") {
    try {
      items = JSON.parse(items);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(items)) {
    return [];
  }

  const seen = new Set<string>();
  const members: HouseholdMemberInput[] = [];
  let spouseSeen = false;

  items.forEach((item) => {
    if (!item || typeof item !== "object") {
      return;
    }

    const record = item as Record<string, unknown>;
    const name = cleanHouseholdText(record.name);
    const relationship = record.relationship;
    const visibility = record.fieldVisibility ?? record.field_visibility;
    const key = householdNameKey(name);

    if (!key || (relationship !== "spouse" && relationship !== "child") || seen.has(key)) {
      return;
    }

    if (relationship === "spouse") {
      if (spouseSeen) {
        return;
      }

      spouseSeen = true;
    }

    seen.add(key);
    members.push({
      ...(householdMemberVisibilities.includes(visibility as HouseholdMemberVisibility) ? { fieldVisibility: visibility as HouseholdMemberVisibility } : {}),
      name,
      relationship,
    });
  });

  return members;
}

/* The legacy text columns, derived from the member list so `spouse_name` and
   `children_names` stay consistent with the rows the sync creates. */
export function householdMemberColumns(members: ReadonlyArray<HouseholdMemberInput>) {
  const spouse = members.find((member) => member.relationship === "spouse");
  const children = members.filter((member) => member.relationship === "child").map((member) => member.name);

  return {
    childrenNames: children.length ? children.join(", ") : null,
    spouseName: spouse?.name ?? null,
  };
}
