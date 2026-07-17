export type RouteBuilderGroupInput = {
  activityType?: string | null;
  name?: string | null;
  slug?: string | null;
  templateCategory?: string | null;
  templateKey?: string | null;
  type?: string | null;
};

const routeBasedActivityTypes = new Set(["running", "walking", "hiking", "cycling", "fitness"]);

function normalized(value: string | null | undefined) {
  return value?.trim().toLowerCase().replace(/_/g, "-") ?? "";
}

export function isRouteBuilderEligibleGroup(group: RouteBuilderGroupInput) {
  const activityType = normalized(group.activityType ?? group.type);
  const templateKey = normalized(group.templateKey);
  const templateCategory = normalized(group.templateCategory);
  const slug = normalized(group.slug);
  const name = normalized(group.name);
  const is2three2Template = [templateKey, slug, name].some((value) => value.includes("2three2"));

  return is2three2Template
    && (routeBasedActivityTypes.has(activityType) || templateCategory === "activity");
}

export const routeBuilderComingSoonLabel = "Route Builder";
export const routeBuilderComingSoonStatus = "Coming Soon";
