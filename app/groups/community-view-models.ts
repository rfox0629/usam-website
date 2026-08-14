/**
 * Typed view models for the DOS Community surfaces.
 *
 * USA-57. These interfaces are the **product contract** the USA-57 design
 * preview renders against. USA-173 should implement these shapes so the
 * presentation layer does not have to be redesigned once real data lands.
 *
 * Each block below records: what already exists today, and what USA-173 must
 * add. Nothing here writes to production, and nothing here ships a schema.
 */

/* ------------------------------------------------------------------ *
 * Organization affiliation
 *
 * EXISTS TODAY: `public_sites` config (display name, logo, hostname,
 * base path) drives public co-branding.
 * USA-173 MUST ADD: real organization + optional initiative records, and an
 * affiliation/approval state on the Group. Affiliation must be optional —
 * an independent DOS Group carries `affiliation: null` and renders no
 * organization chrome at all.
 * ------------------------------------------------------------------ */

export type CommunityAffiliation = {
  /** Optional programme inside the organization, e.g. "Men's Discipleship". */
  initiativeName?: string | null;
  /** Small mark shown beside the label. */
  logoUrl?: string | null;
  /** Display name, e.g. "USA Missionaries". */
  organizationName: string;
  /** Whether the organization has approved this Group for public promotion. */
  publicationStatus: "approved" | "not_submitted" | "pending";
};

/** An independent DOS Group. Never publish, never co-brand. */
export type CommunityOwnership =
  | { affiliation: CommunityAffiliation; kind: "affiliated" }
  | { kind: "independent" };

/* ------------------------------------------------------------------ *
 * Announcements + unread
 *
 * EXISTS TODAY: `dos_group_updates` (title, body, visibility in
 * public|group_members|leaders, status, published_at).
 * USA-173 MUST ADD: (1) projection of published `group_members` updates into
 * the member portal payload — they are not surfaced to members at all today;
 * (2) a per-member read state table so `unreadCount` is real rather than
 * derived from "everything since last session".
 * ------------------------------------------------------------------ */

export type CommunityAnnouncement = {
  body?: string | null;
  id: string;
  /** False when this member has not yet opened it. */
  isRead: boolean;
  /** ISO timestamp of `published_at`. */
  publishedAt: string;
  /** Leader display name. */
  postedBy: string;
  title: string;
};

export type CommunityAnnouncementFeed = {
  latest: CommunityAnnouncement | null;
  unreadCount: number;
};

/* ------------------------------------------------------------------ *
 * Group-shared prayer
 *
 * EXISTS TODAY: member-submitted prayer stored with
 * `visibility: "group_leaders"` — private to leaders, NOT shared with the
 * Group. Surfacing today's rows to members would break that boundary.
 * USA-173 MUST ADD: an explicit `group_members` visibility on prayer, plus a
 * "prayed" acknowledgement per member. Private personal prayer and leader
 * notes must remain excluded by construction, not by filtering in the UI.
 * ------------------------------------------------------------------ */

export type CommunityPrayerRequest = {
  /** Set when the request has been marked answered. */
  answeredNote?: string | null;
  /** Display name, or null when shared anonymously. */
  authorName: string | null;
  id: string;
  /** True once the viewing member has marked that they prayed. */
  hasPrayed: boolean;
  /** Count of members who marked prayed. */
  prayedCount: number;
  request: string;
  sharedAt: string;
  /** Only ever `group` on a member surface. Leader-only never reaches here. */
  visibility: "group";
};

/* ------------------------------------------------------------------ *
 * Role ladder
 *
 * EXISTS TODAY: `dos_group_members.role in ('leader','co_leader','member',
 * 'guest')`.
 * USA-173 MUST DECIDE: the brief asks for member / helper / co-leader, but
 * the enum ships `guest` and has no `helper`. Either add `helper` or map
 * `guest` onto it. The same stable identity must gain permissions without a
 * new account or a replaced Group Home.
 * ------------------------------------------------------------------ */

export type CommunityRole = "co_leader" | "helper" | "leader" | "member";

export type CommunityRoleCapabilities = {
  /** Group schedule, announcements, shared prayer, own Journeys. */
  canSeeGroupBasics: boolean;
  /** Explicitly delegated task, e.g. taking attendance. */
  canSeeDelegatedTask: boolean;
  /** Member roster and per-member Journey progress. */
  canSeeMemberProgress: boolean;
  /** Group settings, publishing, invitations. */
  canManageGroup: boolean;
  /** Private reflections stay private by default at every level. */
  canSeePrivateReflections: false;
};

export function capabilitiesForRole(role: CommunityRole): CommunityRoleCapabilities {
  return {
    canManageGroup: role === "leader",
    canSeeDelegatedTask: role === "helper" || role === "co_leader" || role === "leader",
    canSeeGroupBasics: true,
    canSeeMemberProgress: role === "co_leader" || role === "leader",
    canSeePrivateReflections: false,
  };
}

export const communityRoleLabel: Record<CommunityRole, string> = {
  co_leader: "Co-leader",
  helper: "Helper",
  leader: "Leader",
  member: "Member",
};

/* ------------------------------------------------------------------ *
 * Leader Group Home
 *
 * EXISTS TODAY: gatherings, members/roles, join requests, attendance/RSVP,
 * assignments and progress are all real and already queried by the workspace.
 * This view model only reshapes them for presentation.
 * ------------------------------------------------------------------ */

export type CommunityLeaderSummary = {
  activeJourneyTitle: string | null;
  activeMemberCount: number;
  /** Members who have not opened the current Journey yet. */
  notStartedCount: number;
  pendingJoinRequestCount: number;
};

/* ------------------------------------------------------------------ *
 * National directory / map
 *
 * EXISTS TODAY: nothing trustworthy.
 * USA-173 MUST DEFINE, before any of this renders live: what counts as an
 * active Group, an active participant, a gathering held, an active vs
 * completed Journey, and the inactivity cutoff that makes a Group stale.
 * Aggregation must stay at city/state level — never member level, never
 * prayer content. Until those definitions exist this stays a concept.
 * ------------------------------------------------------------------ */

export type CommunityRegionSummary = {
  /** Cities named only when the Group is already publicly discoverable. */
  cities: string[];
  groupCount: number;
  state: string;
  stateCode: string;
};

/* ------------------------------------------------------------------ *
 * Preview labelling
 *
 * Every surface rendered from data that does not exist yet must carry one of
 * these so nobody mistakes the preview for shipped functionality. These
 * labels are preview-only and must not reach production UI.
 * ------------------------------------------------------------------ */

export type CommunityDataProvenance = "live" | "preview";
