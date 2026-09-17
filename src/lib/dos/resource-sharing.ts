/* USA-278: sending a Library resource to the people it is for.
 *
 * The first resource on this pattern is the Marriage Assessment: one couple
 * assignment, two identifiable participants, separately attributed answers,
 * and a public token link the couple completes together without a DOS
 * account. These helpers are pure so the Library UI, the People record, the
 * API routes, the public recipient page and the regression scripts all read
 * the same rules.
 *
 * Nothing here creates contacts, infers a spouse, or sends email or SMS.
 * Creating a link is "Link ready", never "Sent": DOS has no delivery
 * provider, the sender delivers the link themselves.
 */

import type { DosResource } from "@/src/lib/dos/resource-catalog";

export const dosResourceShareStatuses = ["link_ready", "in_progress", "completed", "expired", "revoked"] as const;

export type DosResourceShareStatus = typeof dosResourceShareStatuses[number];

/* Resources whose complete sharing flow works today. A resource is only
   offered as sendable when every step exists: a recipient experience, saved
   progress, a submission that lands on the People record, and results the
   sender can read. Adding a slug here without that flow would put a dead
   action in front of a leader. */
export const dosShareableResourceSlugs = ["marriage-assessment"] as const;

export type DosShareableResourceSlug = typeof dosShareableResourceSlugs[number];

/* 90 days: long enough for a couple to find an evening together, short enough
   that a forwarded link does not stay live indefinitely. Matches the
   revocable-token posture of the existing review links (30 days), which are
   answered in one sitting. */
export const dosResourceShareLifetimeDays = 90;

export const dosResourceSharePathPrefix = "/dos/resource";

const resourceShareStatusLabels: Record<DosResourceShareStatus, string> = {
  completed: "Completed",
  /* A link that ran out its 90 days. Distinct from revoked, which someone
     chose; this one simply aged out. */
  expired: "Link expired",
  in_progress: "In progress",
  /* Never "Sent". A link exists; whether anyone received it is not something
     DOS knows. */
  link_ready: "Link ready",
  revoked: "Link revoked",
};

export function isDosResourceShareStatus(value: unknown): value is DosResourceShareStatus {
  return typeof value === "string" && dosResourceShareStatuses.includes(value as DosResourceShareStatus);
}

export function dosResourceShareStatusLabel(status: DosResourceShareStatus) {
  return resourceShareStatusLabels[status];
}

export function isDosResourceShareOpen(status: DosResourceShareStatus) {
  return status === "link_ready" || status === "in_progress";
}

export function isDosResourceShareEnabled(resource: Pick<DosResource, "slug">) {
  return dosShareableResourceSlugs.includes(resource.slug as DosShareableResourceSlug);
}

/* Same token shape as the review and testimony links: 24 random bytes in
   base64url. Unguessable, and validated before it ever reaches a query. */
export function isValidDosResourceShareToken(token: unknown): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{16,96}$/.test(token);
}

export function dosResourceSharePath(token: string) {
  return `${dosResourceSharePathPrefix}/${token}`;
}

/* Resource-type actions. Assessments send and preview; guides and prayers
   share and open; Journeys keep the existing assignment wording so nothing
   about Journey changes. `canSend` is what decides whether the primary action
   is offered at all. */
export function dosResourceActionLabels(resource: Pick<DosResource, "slug" | "type">) {
  const canSend = isDosResourceShareEnabled(resource);

  if (resource.type === "assessment") {
    return { canSend, previewLabel: "Preview assessment", sendLabel: "Send assessment" };
  }

  if (resource.type === "guided_resource" || resource.type === "reading_plan") {
    return { canSend: false, previewLabel: "Open resource", sendLabel: "Assign Journey" };
  }

  return { canSend, previewLabel: "Open resource", sendLabel: "Share resource" };
}

/* A participant is a role from the Library resource ("Husband", "Wife") and
   the name the responses are attributed to. A first name is enough: a full
   contact record is a separate, explicit act. */
export type DosResourceShareParticipant = {
  name: string;
  personId: string | null;
  role: string;
};

export function cleanShareParticipantName(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, 120) : "";
}

export function isValidShareParticipantName(value: unknown) {
  return cleanShareParticipantName(value).length >= 1;
}

export function shareParticipantFirstName(value: string) {
  return cleanShareParticipantName(value).split(" ")[0] ?? "";
}

/* "Ryan and Brooke", the couple line on the Library flow, the People record
   row and the recipient page. Falls back to the roles when a name is missing
   so the line never reads as an empty slot. */
export function shareParticipantSummary(participants: readonly DosResourceShareParticipant[]) {
  const names = participants.map((participant) => cleanShareParticipantName(participant.name) || participant.role).filter(Boolean);

  if (names.length <= 1) {
    return names[0] ?? "";
  }

  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/* The two roles an assessment expects, straight from the Library resource so
   the questionnaire, the stored answers and the results all agree. Order here
   is the resource's declaration order, not an assumption about who is sent
   the link first. */
export function resourceShareParticipantRoles(resource: Pick<DosResource, "content">) {
  const participants = resource.content?.assessment?.participants ?? [];

  return [participants[0] ?? "Participant 1", participants[1] ?? "Participant 2"] as const;
}

/* USA-279: the person a leader picks first can be either spouse, so the role
   is an explicit choice rather than something inferred from selection order,
   a name, the workspace owner, or any gender guess. Given one role, the
   spouse necessarily answers as the other. */
export function isAssessmentRoleFor(resource: Pick<DosResource, "content">, role: unknown): role is string {
  return typeof role === "string" && resourceShareParticipantRoles(resource).includes(role);
}

export function oppositeAssessmentRole(resource: Pick<DosResource, "content">, role: string) {
  const [first, second] = resourceShareParticipantRoles(resource);

  return role === first ? second : first;
}

/* Whether existing relationship data reliably establishes which role a person
   holds. Only an explicit stored household role counts. A surname, a first
   name, the order a leader happened to click in, and the DOS account owner
   never do, so the form asks instead of guessing. */
export function reliableAssessmentRoleFor(
  resource: Pick<DosResource, "content">,
  storedRole: string | null | undefined,
) {
  const cleaned = typeof storedRole === "string" ? storedRole.trim() : "";

  return isAssessmentRoleFor(resource, cleaned) ? cleaned : null;
}

/* Who the recipient sees asked for this. Never an email address, never a
   workspace id: one display name crosses the token boundary. */
export function shareRequesterDisplayName(value: string | null | undefined) {
  const name = cleanShareParticipantName(value);

  return name || "Your DOS leader";
}
