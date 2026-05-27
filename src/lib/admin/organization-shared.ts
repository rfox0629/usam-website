export type AdminOrganizationType = "church" | "ministry" | "partner" | "other";

export type OrganizationSummary = {
  brandingMode: string;
  createdAt: string;
  id: string;
  lastActivityAt: string | null;
  memberCount: number;
  name: string;
  slug: string;
  status: "active" | "setup";
  type: AdminOrganizationType;
  workspaceCount: number;
};

export type OrganizationWorkspaceSummary = {
  id: string;
  kind: "foundation" | "workspace";
  lastActivityAt: string | null;
  name: string;
  previewHref: string | null;
  slug: string;
  sourceLabel: string;
  status: "active" | "setup";
};

export type OrganizationDetail = OrganizationSummary & {
  workspaces: OrganizationWorkspaceSummary[];
};

export type WorkspacePreviewData = {
  activity: Array<{
    detail: string;
    href: string;
    id: string;
    label: string;
    timestamp: string | null;
    title: string;
  }>;
  counts: {
    fieldPeople: number;
    fruit: number;
    followUps: number;
    meetings: number;
    members: number;
    prayerRequests: number;
    readyForNextStep: number;
    recentMeetings: number;
  };
  features: {
    dosEnabled: boolean;
    prayerEnabled: boolean;
    publicProfileEnabled: boolean;
    publishingEnabled: boolean;
  };
  members: Array<{
    id: string;
    name: string;
    role: string | null;
  }>;
  missionFocus: {
    my3: number;
    my12: number;
    my70: number;
  };
  organizationName: string;
  workspace: {
    displayName: string;
    id: string;
    slug: string;
  };
};

export function normalizeOrganizationType(type: string | null | undefined): AdminOrganizationType {
  return type === "church" || type === "partner" || type === "other" || type === "ministry"
    ? type
    : "ministry";
}

export function formatOrganizationType(type: string, brandingMode?: string | null) {
  if (brandingMode === "usam") {
    return "USA Missionaries";
  }

  return {
    church: "Church",
    ministry: "Ministry",
    other: "Other",
    partner: "Partner",
  }[normalizeOrganizationType(type)];
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "workspace";
}
