export const dosGroupHomeReadinessFixtures = Object.freeze({
  publicSites: {
    usam: {
      basePath: "/groups",
      displayName: "USA Missionaries",
      hostname: "usamissionaries.org",
      organizationKey: "usa-missionaries",
    },
    secondOrganization: {
      basePath: "/groups",
      displayName: "Fixture Fellowship",
      hostname: "fixture-fellowship.example.test",
      organizationKey: "fixture-fellowship",
    },
  },
  organizations: {
    usam: {
      key: "usa-missionaries",
      name: "USA Missionaries",
    },
    second: {
      key: "fixture-fellowship",
      name: "Fixture Fellowship",
    },
  },
  groups: {
    tuesdayMensGroup: {
      acceptingRequests: true,
      organizationKey: "usa-missionaries",
      publicSiteKey: "usam",
      slug: "tuesday-mens-group",
      type: "mens",
    },
    twoThreeTwoRunning: {
      acceptingRequests: true,
      activityType: "running",
      organizationKey: "usa-missionaries",
      publicSiteKey: "usam",
      slug: "2three2-running",
      templateKey: "2three2-running",
    },
    twoThreeTwoWalking: {
      acceptingRequests: true,
      activityType: "walking",
      organizationKey: "usa-missionaries",
      publicSiteKey: "usam",
      slug: "2three2-walking",
      templateKey: "2three2-walking",
    },
    secondOrganizationSameSlug: {
      acceptingRequests: true,
      organizationKey: "fixture-fellowship",
      publicSiteKey: "secondOrganization",
      slug: "2three2-running",
      templateKey: "2three2-running",
    },
    noNextGathering: {
      acceptingRequests: true,
      organizationKey: "usa-missionaries",
      publicSiteKey: "usam",
      slug: "no-next-gathering",
      type: "discipleship",
    },
    noMembers: {
      acceptingRequests: true,
      organizationKey: "usa-missionaries",
      publicSiteKey: "usam",
      slug: "no-members-yet",
      type: "discipleship",
    },
    noUpdatesPrayerResources: {
      acceptingRequests: true,
      organizationKey: "usa-missionaries",
      publicSiteKey: "usam",
      slug: "quiet-group",
      type: "discipleship",
    },
    closedGroup: {
      acceptingRequests: false,
      organizationKey: "usa-missionaries",
      publicSiteKey: "usam",
      slug: "closed-group",
      type: "discipleship",
    },
    privateGroup: {
      publicStatus: "draft",
      organizationKey: "usa-missionaries",
      publicSiteKey: "usam",
      slug: "private-group",
      type: "discipleship",
    },
    archivedGroup: {
      active: false,
      publicStatus: "archived",
      organizationKey: "usa-missionaries",
      publicSiteKey: "usam",
      slug: "archived-group",
      type: "discipleship",
    },
  },
  gatherings: {
    futureScheduled: {
      groupKey: "tuesdayMensGroup",
      locationMode: "general",
      startsAt: "2026-08-04T12:00:00.000Z",
      status: "scheduled",
      title: "Tuesday Morning Group",
    },
    canceled: {
      groupKey: "tuesdayMensGroup",
      startsAt: "2026-08-11T12:00:00.000Z",
      status: "canceled",
      title: "Canceled Gathering",
    },
    past: {
      groupKey: "tuesdayMensGroup",
      startsAt: "2026-07-01T12:00:00.000Z",
      status: "scheduled",
      title: "Past Gathering",
    },
  },
  people: {
    ryanLeader: {
      email: "ryan.leader@example.test",
      name: "Ryan Readiness Leader",
      role: "leader",
    },
    brandonCoLeader: {
      email: "brandon.coleader@example.test",
      name: "Brandon Readiness Co-Leader",
      role: "co_leader",
    },
    justinLightweightMember: {
      email: "justin.member@example.test",
      name: "Justin Readiness Member",
      role: "member",
    },
    unrelatedAuthenticatedUser: {
      email: "unrelated.user@example.test",
      name: "Unrelated Fixture User",
      role: "none",
    },
    removedMember: {
      email: "removed.member@example.test",
      membershipStatus: "removed",
      name: "Removed Fixture Member",
      role: "member",
    },
    expiredSessionMember: {
      email: "expired.session@example.test",
      name: "Expired Session Fixture Member",
      sessionStatus: "expired",
    },
    revokedTokenMember: {
      email: "revoked.token@example.test",
      name: "Revoked Token Fixture Member",
      tokenStatus: "revoked",
    },
    otherGroupMember: {
      email: "other.group.member@example.test",
      groupKey: "twoThreeTwoWalking",
      name: "Other Group Fixture Member",
    },
    otherOrganizationMember: {
      email: "other.organization.member@example.test",
      groupKey: "secondOrganizationSameSlug",
      name: "Other Organization Fixture Member",
    },
  },
  rsvps: {
    going: "going",
    maybe: "maybe",
    notGoing: "not_going",
  },
  notificationStates: {
    emailDisabled: {
      channel: "email",
      enabled: false,
    },
    emailEnabled: {
      channel: "email",
      enabled: true,
    },
    smsDisabled: {
      channel: "sms",
      enabled: false,
    },
    smsUnavailable: {
      channel: "sms",
      providerConfigured: false,
    },
  },
});
