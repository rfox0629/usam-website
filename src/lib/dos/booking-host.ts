/* USA-246 booking write path: which workspace member hosts a booked slot.
 *
 * Founder rule: a single-host link's host owns and records the meeting; a
 * team link uses the host assigned to the booked slot, with a documented
 * deterministic fallback. The workspace's slot model has no per-host
 * availability today, so "assigned to the slot" is resolved here as the
 * first configured host who is free at that time (by their own scheduled
 * meetings), then the first configured host. When a link names no host, the
 * workspace owner hosts; failing that, the first active member with a linked
 * DOS account; failing that, the first active adult member.
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

export type BookingHostBusyInterval = {
  endAt: string;
  hostUserId: string | null;
  startAt: string;
};

export type BookingHostRule =
  | "first_active_member"
  | "first_linked_member"
  | "none"
  | "single_configured_host"
  | "team_first_configured_host"
  | "team_first_free_host"
  | "workspace_owner";

export type BookingHostAssignment = {
  member: BookingHostMember | null;
  rule: BookingHostRule;
};

function isAdultActive(member: BookingHostMember) {
  const relationship = (member.relationship ?? "").toLowerCase();

  return member.status === "active" && relationship !== "child";
}

function byOrder(first: BookingHostMember, second: BookingHostMember) {
  return first.sortOrder - second.sortOrder || first.displayName.localeCompare(second.displayName);
}

function overlaps(startAt: string, endAt: string, busy: BookingHostBusyInterval) {
  return Date.parse(busy.startAt) < Date.parse(endAt) && Date.parse(busy.endAt) > Date.parse(startAt);
}

export function assignBookingHost({
  busy,
  hostMemberIds,
  hostMode,
  members,
  slot,
}: {
  busy: BookingHostBusyInterval[];
  hostMemberIds: string[];
  hostMode: "household" | "single";
  members: BookingHostMember[];
  slot: { endAt: string; startAt: string };
}): BookingHostAssignment {
  const active = members.filter(isAdultActive).sort(byOrder);
  const configured = hostMemberIds
    .map((id) => active.find((member) => member.id === id) ?? null)
    .filter((member): member is BookingHostMember => Boolean(member));

  if (hostMode === "household" && configured.length) {
    const free = configured.find((member) => !busy.some((interval) => (
      Boolean(interval.hostUserId)
      && Boolean(member.dosUserId)
      && interval.hostUserId === member.dosUserId
      && overlaps(slot.startAt, slot.endAt, interval)
    )));

    return free
      ? { member: free, rule: "team_first_free_host" }
      : { member: configured[0], rule: "team_first_configured_host" };
  }

  if (configured.length) {
    return { member: configured[0], rule: "single_configured_host" };
  }

  const owner = active.find((member) => (member.relationship ?? "").toLowerCase() === "owner");

  if (owner) {
    return { member: owner, rule: "workspace_owner" };
  }

  const linked = active.find((member) => Boolean(member.dosUserId));

  if (linked) {
    return { member: linked, rule: "first_linked_member" };
  }

  return active[0] ? { member: active[0], rule: "first_active_member" } : { member: null, rule: "none" };
}
