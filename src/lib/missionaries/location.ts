export const usStates = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
] as const;

export const servingScopes = [
  "local",
  "statewide",
  "regional",
  "nationwide",
  "global",
] as const;

export type ServingScope = typeof servingScopes[number];

export const ministryRegions = [
  "midwest",
  "south",
  "northeast",
  "west",
  "southwest",
  "other",
] as const;

export const roleTypes = [
  "missionary_household",
  "state_leader",
  "regional_leader",
  "national_leader",
  "prayer_leader",
  "support_leader",
  "operations_leader",
  "training_leader",
  "founder_national_missionary",
] as const;

export const locationVisibilities = ["public", "hidden"] as const;

export type MinistryRegion = typeof ministryRegions[number];
export type RoleType = typeof roleTypes[number];
export type LocationVisibility = typeof locationVisibilities[number];

export const servingScopeOptions: Array<{ label: string; value: ServingScope }> = [
  { label: "Local", value: "local" },
  { label: "Statewide", value: "statewide" },
  { label: "Regional", value: "regional" },
  { label: "Nationwide", value: "nationwide" },
  { label: "Global", value: "global" },
];

export const ministryRegionOptions: Array<{ label: string; value: MinistryRegion }> = [
  { label: "Midwest", value: "midwest" },
  { label: "South", value: "south" },
  { label: "Northeast", value: "northeast" },
  { label: "West", value: "west" },
  { label: "Southwest", value: "southwest" },
  { label: "Other", value: "other" },
];

export const roleTypeOptions: Array<{ label: string; value: RoleType }> = [
  { label: "Missionary Household", value: "missionary_household" },
  { label: "State Leader", value: "state_leader" },
  { label: "Regional Leader", value: "regional_leader" },
  { label: "National Leader", value: "national_leader" },
  { label: "Prayer Leader", value: "prayer_leader" },
  { label: "Support Leader", value: "support_leader" },
  { label: "Operations Leader", value: "operations_leader" },
  { label: "Training Leader", value: "training_leader" },
  { label: "Founder / National Missionary", value: "founder_national_missionary" },
];

export const locationVisibilityOptions: Array<{ label: string; value: LocationVisibility }> = [
  { label: "Public", value: "public" },
  { label: "Hidden", value: "hidden" },
];

export function normalizePrimaryState(value: string | null | undefined) {
  const state = value?.trim();

  return state && usStates.includes(state as typeof usStates[number])
    ? state
    : null;
}

export function normalizeServingScope(value: string | null | undefined): ServingScope {
  return servingScopes.includes(value as ServingScope) ? value as ServingScope : "nationwide";
}

export function normalizeMinistryRegion(value: string | null | undefined): MinistryRegion | null {
  return ministryRegions.includes(value as MinistryRegion) ? value as MinistryRegion : null;
}

export function normalizeRoleType(value: string | null | undefined): RoleType {
  return roleTypes.includes(value as RoleType) ? value as RoleType : "missionary_household";
}

export function normalizeLocationVisibility(value: string | null | undefined): LocationVisibility {
  return locationVisibilities.includes(value as LocationVisibility) ? value as LocationVisibility : "public";
}

function regionLabel(region: MinistryRegion | null) {
  return ministryRegionOptions.find((option) => option.value === region)?.label ?? null;
}

export function roleTypeLabel(roleType: RoleType) {
  return roleTypeOptions.find((option) => option.value === roleType)?.label ?? "Missionary Household";
}

export function servingScopeLabel(scope: ServingScope, primaryState: string | null, region: MinistryRegion | null) {
  switch (scope) {
    case "local":
      return "Serving Locally";
    case "statewide":
      return primaryState ? `Serving ${primaryState}` : "Serving Statewide";
    case "regional":
      return region && region !== "other" ? `Serving the ${regionLabel(region)}` : "Serving Regionally";
    case "global":
      return "Serving Globally";
    case "nationwide":
    default:
      return "Serving Nationwide";
  }
}

export function profileLocationLine({
  customServingLabel,
  locationVisibility,
  primaryState,
  region,
  servingScope,
}: {
  customServingLabel?: string | null;
  locationVisibility: LocationVisibility;
  primaryState: string | null;
  region: MinistryRegion | null;
  servingScope: ServingScope;
}) {
  const basedIn = locationVisibility === "hidden"
    ? "Based in Undisclosed Location"
    : primaryState
      ? `Based in ${primaryState}`
      : "";
  const servingLabel = customServingLabel?.trim() || servingScopeLabel(servingScope, primaryState, region);

  return [basedIn, servingLabel].filter(Boolean).join(" | ");
}
