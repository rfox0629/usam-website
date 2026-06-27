export type AdminOrganizationType = "church" | "ministry" | "partner" | "other";

export type OrganizationSummary = {
  applicationCount: number;
  approvedProfileCount: number;
  brandingMode: string;
  createdAt: string;
  id: string;
  lastActivityAt: string | null;
  memberCount: number;
  name: string;
  pendingApplicationCount: number;
  slug: string;
  status: "active" | "setup";
  type: AdminOrganizationType;
  updatedAt: string | null;
  workspaceCount: number;
};

export type OrganizationApplicationSummary = {
  adminNotes: string | null;
  applicantEmail: string | null;
  applicantName: string;
  applicantPhone: string | null;
  assignedAdmin: string | null;
  callingFocus: string | null;
  householdDetails: OrganizationApplicationDetailItem[];
  householdMembers: OrganizationApplicationHouseholdMember[];
  hasPhotos: boolean;
  id: string;
  location: string | null;
  monthlyBudget: number | null;
  photos: OrganizationApplicationPhotoSummary[];
  prayerPartners: OrganizationApplicationContactItem[];
  prayerRequests: string[];
  prayerNeeds: string | null;
  references: OrganizationApplicationReferenceItem[];
  referencesText: string | null;
  status: string;
  storyAnswers: OrganizationApplicationDetailItem[];
  storyTestimony: string | null;
  supportDetails: OrganizationApplicationDetailItem[];
  submittedAt: string | null;
  supportGoal: number | null;
};

export type OrganizationApplicationDetailItem = {
  label: string;
  value: string;
};

export type OrganizationApplicationContactItem = {
  email: string | null;
  name: string;
  phone: string | null;
  relationship: string | null;
};

export type OrganizationApplicationHouseholdMember = {
  age: string | null;
  name: string;
  relationship: string | null;
  status: string | null;
};

export type OrganizationApplicationReferenceItem = {
  description: string | null;
  email: string | null;
  name: string;
  organization: string | null;
  phone: string | null;
  relationship: string | null;
};

export type OrganizationApplicationPhotoSummary = {
  contentType: string | null;
  fileName: string;
  id: string;
  kind: "Family" | "Profile" | "Submitted";
  path: string | null;
  size: number | null;
  status: "Submitted";
  thumbnailUrl: string | null;
  uploadedAt: string | null;
};

export type OrganizationApprovedProfileSummary = {
  applicationId: string | null;
  editorUrl: string;
  id: string;
  lastUpdated: string | null;
  location: string | null;
  publicName: string;
  publicUrl: string;
  slug: string;
  supportGoal: number | null;
  visibility: "Archived" | "Draft" | "Hidden" | "Live";
};

export type OrganizationMemberSummary = {
  email: string | null;
  id: string;
  lastActiveAt: string | null;
  name: string;
  personId: string | null;
  role: string | null;
  status: string | null;
  viewHref: string | null;
  workspaceId: string | null;
  workspaceName: string | null;
};

export type OrganizationWorkspaceSummary = {
  activitySummary: string;
  householdName: string | null;
  id: string;
  kind: "foundation" | "workspace";
  lastActivityAt: string | null;
  name: string;
  ownerName: string | null;
  slug: string;
  sourceLabel: string;
  status: "active" | "setup";
  viewHref: string | null;
};

export type OrganizationDetail = OrganizationSummary & {
  approvedProfiles: OrganizationApprovedProfileSummary[];
  applications: OrganizationApplicationSummary[];
  members: OrganizationMemberSummary[];
  workspaces: OrganizationWorkspaceSummary[];
};

export type OrganizationPersonDetail = {
  createdAt: string | null;
  email: string | null;
  id: string;
  identityKind: "profile" | "team_member";
  identityValue: string | null;
  isPublic: boolean | null;
  lastActiveAt: string | null;
  metrics: {
    fieldPeople: number;
    tables: number;
    tableSignal: "auth-linked" | "unlinked";
  };
  name: string;
  recentTables: Array<{
    date: string | null;
    id: string;
    participantNames: string[];
    type: string | null;
  }>;
  relationshipToWorkspace: string | null;
  role: string | null;
  source: string | null;
  status: string | null;
  updatedAt: string | null;
  workspace: {
    id: string;
    intelligenceHref: string;
    name: string;
    slug: string;
  } | null;
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
  field: {
    meetings: Array<{
      conversationFlow: string | null;
      date: string | null;
      followUpNeeded: string | null;
      id: string;
      movementStep: string | null;
      notes: string | null;
      participantNames: string[];
      personIds: string[];
      type: string | null;
    }>;
    people: Array<{
      church: string | null;
      email: string | null;
      id: string;
      lastActivityAt: string | null;
      lastMeetingAt: string | null;
      meetingCount: number;
      name: string;
      notes: string | null;
      phone: string | null;
      relationshipType: string | null;
      status: string | null;
    }>;
  };
  prayer: {
    activity: Array<{
      detail: string;
      id: string;
      label: string;
      timestamp: string | null;
      title: string;
    }>;
    partners: Array<{
      email: string | null;
      id: string;
      name: string;
      source: string | null;
      status: string;
      timestamp: string | null;
    }>;
    requests: Array<{
      createdAt: string | null;
      id: string;
      personId: string | null;
      personName: string | null;
      status: string;
      summary: string;
      title: string;
      updatedAt: string | null;
      urgency: string | null;
      visibility: string | null;
    }>;
    stats: {
      activePartners: number;
      pendingApplications: number;
      pendingRequests: number;
      recentActivity: number;
    };
    teamEnabled: boolean;
  };
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
    supportEnabled: boolean;
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
