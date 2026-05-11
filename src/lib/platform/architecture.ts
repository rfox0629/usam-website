export const platformPrinciple = {
  summary: "DOS is the platform. USAM is one network running on DOS.",
  publicProfiles:
    "Profiles are a network-level feature enabled for USAM or approved organizations, not part of DOS Core.",
  sharing:
    "Users and workspaces stay private by default and must opt in before activity rolls up to an organization or church dashboard.",
} as const;

export const platformLayers = [
  {
    key: "national_command_center",
    label: "National Command Center",
    primaryAudience: "USAM National Admin",
    routeScope: "/admin",
    summary:
      "USAM master admin view for all organizations, workspaces, metrics, fruit, support, prayer, users, permissions, and publishing controls.",
  },
  {
    key: "organization_dashboard",
    label: "Organization Dashboard",
    primaryAudience: "Organization Leader",
    routeScope: "future organization-scoped admin route",
    summary:
      "Church, ministry, or partner organization view scoped to its own users, teams, activity, fruit, and metrics.",
  },
  {
    key: "missionary_workspace",
    label: "Missionary Workspace",
    primaryAudience: "Workspace Leader",
    routeScope: "/admin/missionary-profiles",
    summary:
      "Private workspace for an individual, household, or missionary team covering People, Meetings, Fruit, Prayer, Library, In Season, and DOS activity.",
  },
  {
    key: "dos_field_app",
    label: "DOS Field App",
    primaryAudience: "DOS User",
    routeScope: "/dos/app",
    summary:
      "Mobile daily-use app for disciple makers to add people, log meetings, view follow-up, and see fruit.",
  },
] as const;

export type PlatformLayerKey = typeof platformLayers[number]["key"];

export const accessTiers = [
  {
    key: "dos_user",
    label: "DOS User",
    scope: "own data only",
    layers: ["dos_field_app"],
  },
  {
    key: "workspace_leader",
    label: "Workspace Leader",
    scope: "their workspace only",
    layers: ["missionary_workspace", "dos_field_app"],
  },
  {
    key: "organization_leader",
    label: "Organization Leader",
    scope: "their organization only",
    layers: ["organization_dashboard", "missionary_workspace", "dos_field_app"],
  },
  {
    key: "usam_national_admin",
    label: "USAM National Admin",
    scope: "all data",
    layers: ["national_command_center", "organization_dashboard", "missionary_workspace", "dos_field_app"],
  },
  {
    key: "prayer_team",
    label: "Prayer Team",
    scope: "scoped prayer only",
    layers: ["national_command_center"],
  },
  {
    key: "support_team",
    label: "Support Team",
    scope: "scoped support and fundraising only",
    layers: ["national_command_center"],
  },
] as const;

export type AccessTierKey = typeof accessTiers[number]["key"];

export const featureUnlocks = [
  {
    key: "dos_core",
    label: "DOS Core",
    features: [
      "Add people",
      "Log meetings",
      "Track fruit",
      "View personal metrics",
      "Upload CSV when enabled",
    ],
  },
  {
    key: "usam_missionary",
    label: "USAM Missionary",
    features: [
      "Public Missionary Profile",
      "Fundraising",
      "Prayer team page",
      "Support team tools",
      "Approved fruit publishing",
      "National rollup reporting",
      "Coaching/accountability visibility",
    ],
  },
  {
    key: "organization_church",
    label: "Organization / Church",
    features: [
      "Organization Dashboard",
      "Team rollups",
      "Shared metrics",
      "CSV import",
      "Group/team reporting",
    ],
  },
] as const;

export type FeatureUnlockKey = typeof featureUnlocks[number]["key"];

export function getPlatformLayer(key: PlatformLayerKey) {
  return platformLayers.find((layer) => layer.key === key);
}

export function getAccessTier(key: AccessTierKey) {
  return accessTiers.find((tier) => tier.key === key);
}

export function canAccessPlatformLayer(tierKey: AccessTierKey, layerKey: PlatformLayerKey) {
  const tier = getAccessTier(tierKey);

  return Boolean((tier?.layers as readonly PlatformLayerKey[] | undefined)?.includes(layerKey));
}
