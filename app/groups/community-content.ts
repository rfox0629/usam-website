/**
 * Canonical public content for the approved Groups.
 *
 * USA-57 founder correction. Two problems this file exists to solve:
 *
 * 1. The directory and the detail route each carried their own fallback copy of
 *    the same three Groups, and they had drifted apart: Wednesday read
 *    "Weekly · Wednesday · Evening" in the directory and "Weekly · Wednesday ·
 *    5:30 PM" on its detail page, and Tuesday/Wednesday showed "Location TBD"
 *    in one place and "Eagan, MN" in the other. One source now feeds both.
 *
 * 2. Tuesday and Wednesday are the same kind of Group, but presented with
 *    different taglines and descriptions, which made the directory look like
 *    three unrelated products. Template copy is resolved here so two Groups of
 *    the same template read identically and only name, day/time and location
 *    differ.
 *
 * This is presentation normalization over canonical DOS data. It never writes,
 * and it never invents a schedule or a location: those still come from the
 * Group record.
 */

export type CommunityTemplate = "activity" | "mens";

export type ApprovedPublicGroup = {
  acceptsJoinRequests: boolean;
  defaultLocation: string;
  memberAccessEnabled: boolean;
  name: string;
  rhythmLabel: string;
  scriptureReference: string;
  scriptureText: string;
  slug: string;
  template: CommunityTemplate;
};

/** Shared copy for a template. Two Groups on one template read identically. */
type TemplateCopy = {
  description: string;
  scheduleIntro: string;
  scheduleTitle: string;
  tagline: string;
  typeLabel: string;
  whatToExpect: ReadonlyArray<{ note: string; title: string }>;
};

const TEMPLATE_COPY: Record<CommunityTemplate, TemplateCopy> = {
  activity: {
    description:
      "A men's discipleship group where we run together, pair up two-by-two, pray for one another, and pursue righteousness, faith, love, and peace.",
    scheduleIntro: "Arrive, pair up, pray on the move, and finish with one clear next step.",
    scheduleTitle: "The rhythm",
    tagline: "Run. Pray. Pursue.",
    typeLabel: "Running Group",
    whatToExpect: [
      { note: "The same rhythm every week. Show up and the group is there.", title: "A steady rhythm" },
      { note: "Paired two-by-two, so nobody runs alone and nobody prays alone.", title: "Prayer and accountability" },
      { note: "An honest check-in during the week, and one clear next step.", title: "Simple follow-up" },
    ],
  },
  mens: {
    description:
      "A weekly gathering where men open Scripture together, pray for one another, and build the kind of friendships that carry into the rest of the week.",
    scheduleIntro: "Arrive, open Scripture, pray together, and leave with one clear next step.",
    scheduleTitle: "The rhythm",
    tagline: "Scripture. Prayer. Brotherhood.",
    typeLabel: "Men's Group",
    whatToExpect: [
      { note: "The same rhythm every week. Show up and the group is there.", title: "A steady rhythm" },
      { note: "Scripture, honest prayer, and men who follow up with each other.", title: "Prayer and accountability" },
      { note: "A leader will tell you what to expect before your first time.", title: "A clear first step" },
    ],
  },
};

/**
 * The Groups USA Missionaries has approved for public listing.
 *
 * Used as the fallback when a host resolves no configured public site (preview
 * deployments, for example). Real public hosts resolve a site and read the
 * published rows from DOS instead, so publishing semantics are unchanged.
 */
export const APPROVED_PUBLIC_GROUPS: readonly ApprovedPublicGroup[] = [
  {
    acceptsJoinRequests: true,
    defaultLocation: "Lebanon Hills Trailhead, Eagan, MN",
    memberAccessEnabled: true,
    name: "2three2",
    rhythmLabel: "Weekly · Saturday · 7:00 AM",
    scriptureReference: "2 Timothy 2:22",
    scriptureText:
      "Flee also youthful lusts; but pursue righteousness, faith, love, peace with those who call on the Lord out of a pure heart.",
    slug: "2three2",
    template: "activity",
  },
  {
    acceptsJoinRequests: true,
    defaultLocation: "Eagan, MN",
    memberAccessEnabled: false,
    name: "Tuesday Men's Group",
    rhythmLabel: "Weekly · Tuesday · 6:00 AM",
    scriptureReference: "",
    scriptureText: "",
    slug: "tuesday-mens-group",
    template: "mens",
  },
  {
    acceptsJoinRequests: true,
    defaultLocation: "Eagan, MN",
    memberAccessEnabled: true,
    name: "Wednesday Men's Group",
    rhythmLabel: "Weekly · Wednesday · 5:30 PM",
    scriptureReference: "",
    scriptureText: "",
    slug: "wednesday-mens-group",
    template: "mens",
  },
];

export const approvedPublicGroupBySlug = new Map(APPROVED_PUBLIC_GROUPS.map((group) => [group.slug, group]));

/** Which template a Group presents as. Slug and name only, never location. */
export function communityTemplateFor(input: { name?: string | null; slug?: string | null; type?: string | null }): CommunityTemplate {
  const text = `${input.slug ?? ""} ${input.name ?? ""} ${input.type ?? ""}`.toLowerCase();

  if (text.includes("2three2") || text.includes("running")) {
    return "activity";
  }

  return "mens";
}

/**
 * Canonical public copy for a Group.
 *
 * Template copy wins over per-row copy so that two Groups on the same template
 * cannot drift apart in the directory. Name, schedule and location are not
 * touched here; those remain the Group's own canonical data.
 */
export function communityCopyFor(input: { name?: string | null; slug?: string | null; type?: string | null }): TemplateCopy {
  return TEMPLATE_COPY[communityTemplateFor(input)];
}
