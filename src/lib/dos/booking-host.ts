/* USA-246 booking write path: which workspace members may host a booked slot.
 *
 * Founder rules (2026-09-09): a team link uses the first AVAILABLE configured
 * host in a stable documented order; a busy host is never assigned; if hosts
 * are configured and none is available the slot is unavailable; a link with
 * no configured hosts falls back to the workspace owner, whose availability
 * is verified the same way; concurrent bookings can never share a host.
 *
 * This module decides only the ORDERED CANDIDATE LIST. Availability is
 * decided by `dos_create_table_booking` inside the booking transaction,
 * under the per-workspace lock, which is what makes the concurrency rule
 * hold. The ordering:
 *   1. configured hosts, in the order they are listed on the link
 *      (`host_member_ids`), skipping members who are not active adults;
 *   2. otherwise the workspace owner (`relationship_to_workspace = owner`);
 *   3. otherwise nobody: the link cannot take bookings until a host is set.
 *
 * Dependency-free on purpose so the regression script can import it. */

export type BookingHostMember = {
  displayName: string;
  dosUserId: string | null;
  id: string;
  relationship: string | null;
  sortOrder: number;
  status: string;
};

export type BookingHostCandidate = {
  memberId: string;
  userId: string | null;
};

export type BookingHostRule = "configured_hosts" | "none" | "workspace_owner";

export type BookingHostCandidates = {
  candidates: BookingHostCandidate[];
  rule: BookingHostRule;
};

function isAdultActive(member: BookingHostMember) {
  const relationship = (member.relationship ?? "").toLowerCase();

  return member.status === "active" && relationship !== "child";
}

function toCandidate(member: BookingHostMember): BookingHostCandidate {
  return { memberId: member.id, userId: member.dosUserId };
}

export function bookingHostCandidates({
  hostMemberIds,
  members,
}: {
  hostMemberIds: string[];
  members: BookingHostMember[];
}): BookingHostCandidates {
  const active = members.filter(isAdultActive);
  const configured = hostMemberIds
    .map((id) => active.find((member) => member.id === id) ?? null)
    .filter((member): member is BookingHostMember => Boolean(member));

  if (configured.length) {
    return { candidates: configured.map(toCandidate), rule: "configured_hosts" };
  }

  const owner = active
    .filter((member) => (member.relationship ?? "").toLowerCase() === "owner")
    .sort((first, second) => first.sortOrder - second.sortOrder || first.displayName.localeCompare(second.displayName))[0];

  if (owner) {
    return { candidates: [toCandidate(owner)], rule: "workspace_owner" };
  }

  return { candidates: [], rule: "none" };
}
