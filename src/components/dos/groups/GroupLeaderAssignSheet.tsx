"use client";

import { CheckCircle2, ChevronRight, Search, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Sheet } from "@/src/components/dos/overlays/DosSurfaces";
import { Avatar, Button, StatusPill } from "@/src/components/dos/ui";
import { phoneDigitsOnly } from "@/src/lib/dos/phone-format";
import type { GroupAddPersonOption } from "@/src/components/dos/groups/GroupAddPersonSheet";

/* Shared Leadership -> Add Person.
 *
 * Adding a member and sharing leadership are different questions, so they are
 * different sheets. This one starts from the people already in the group,
 * because a co-leader or helper is almost always someone who is already
 * there, and changes the role on their one membership. Someone from People
 * who is not in the group yet can be chosen too; the sheet says plainly that
 * saving adds them to the group as well. The primary leader is changed in
 * Edit Group. Nothing here sends a message or creates an account.
 */

export type GroupLeadershipRole = "co_leader" | "helper" | "member";

export type GroupLeaderMember = {
  personId: string;
  personName: string;
  role: "leader" | "co_leader" | "helper" | "member" | "guest";
  status: "active" | "invited" | "removed";
};

export type GroupLeaderAssignRequest = {
  confirmAddToGroup: boolean;
  personId: string;
  role: GroupLeadershipRole;
};

export type GroupLeaderAssignOutcome =
  | { addedToGroup: boolean; ok: true; personName: string; role: GroupLeadershipRole; unchanged: boolean }
  | { error: string; ok: false };

type Candidate = {
  currentRole: GroupLeaderMember["role"] | null;
  id: string;
  inGroup: boolean;
  name: string;
};

const roleLabels: Record<GroupLeaderMember["role"], string> = {
  co_leader: "Co-leader",
  guest: "Guest",
  helper: "Helper",
  leader: "Primary leader",
  member: "Member",
};

const leadershipChoices: ReadonlyArray<{ label: string; value: GroupLeadershipRole }> = [
  { label: "Co-leader", value: "co_leader" },
  { label: "Helper", value: "helper" },
];

function isLeadershipRole(role: GroupLeaderMember["role"] | null): role is "co_leader" | "helper" {
  return role === "co_leader" || role === "helper";
}

function matchesQuery(name: string, person: GroupAddPersonOption | undefined, query: string) {
  const text = query.trim().toLowerCase();
  const digits = query.replace(/\D/g, "");

  return !text
    || name.toLowerCase().includes(text)
    || (person?.email ?? "").toLowerCase().includes(text)
    || (digits.length >= 3 && phoneDigitsOnly(person?.phone).includes(digits));
}

function successMessage(outcome: Extract<GroupLeaderAssignOutcome, { ok: true }>, groupName: string) {
  const label = outcome.role === "member" ? "" : roleLabels[outcome.role];

  if (outcome.unchanged) {
    return outcome.role === "member" ? `${outcome.personName} is already a member.` : `${outcome.personName} is already a ${label}.`;
  }

  if (outcome.role === "member") {
    return `${outcome.personName} is now a member without a leadership role.`;
  }

  return outcome.addedToGroup
    ? `${outcome.personName} added to ${groupName} as ${label}.`
    : `${outcome.personName} is now a ${label} of ${groupName}.`;
}

function CandidateRow({ candidate, onChoose }: { candidate: Candidate; onChoose: () => void }) {
  const isPrimary = candidate.currentRole === "leader";
  const secondary = candidate.inGroup ? roleLabels[candidate.currentRole ?? "member"] : "Not in this group";
  const body = (
    <>
      <Avatar name={candidate.name} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-dos-body font-semibold text-dos-primary">{candidate.name}</span>
        {isPrimary || isLeadershipRole(candidate.currentRole) ? null : <span className="block truncate text-dos-meta text-dos-secondary">{secondary}</span>}
      </span>
      {isPrimary ? (
        <StatusPill tone="grey">Primary leader</StatusPill>
      ) : isLeadershipRole(candidate.currentRole) ? (
        <StatusPill tone="blue">{roleLabels[candidate.currentRole]}</StatusPill>
      ) : null}
      {isPrimary ? null : <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-dos-secondary" strokeWidth={2} />}
    </>
  );
  const rowClass = "flex min-h-[60px] w-full min-w-0 items-center gap-3 border-t border-dos-line py-2.5 text-left first:border-t-0";

  /* The primary leader is listed so nobody wonders where they went, but is
     not a choice here. */
  return isPrimary ? (
    <div className={rowClass}>{body}</div>
  ) : (
    <button
      className={`${rowClass} rounded-none transition-colors hover:bg-dos-blue50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-dos-blue`}
      onClick={onChoose}
      type="button"
    >
      {body}
    </button>
  );
}

export function GroupLeaderAssignSheet({
  groupName,
  isPreview,
  members,
  onAssign,
  onClose,
  people,
}: {
  groupName: string;
  isPreview: boolean;
  members: readonly GroupLeaderMember[];
  onAssign: (request: GroupLeaderAssignRequest) => Promise<GroupLeaderAssignOutcome>;
  onClose: () => void;
  people: readonly GroupAddPersonOption[];
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [role, setRole] = useState<GroupLeadershipRole>("co_leader");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<Extract<GroupLeaderAssignOutcome, { ok: true }> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  /* A second tap while the first save is in flight must not write twice. */
  const inFlightRef = useRef(false);

  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const groupCandidates = useMemo<Candidate[]>(() => members
    .filter((member) => member.status === "active")
    .map((member) => ({ currentRole: member.role, id: member.personId, inGroup: true, name: member.personName }))
    .sort((first, second) => {
      const rank = (candidate: Candidate) => (candidate.currentRole === "leader" ? 0 : isLeadershipRole(candidate.currentRole) ? 1 : 2);

      return rank(first) - rank(second) || first.name.localeCompare(second.name);
    }), [members]);
  const activeMemberIds = useMemo(() => new Set(groupCandidates.map((candidate) => candidate.id)), [groupCandidates]);
  const visibleMembers = groupCandidates.filter((candidate) => matchesQuery(candidate.name, peopleById.get(candidate.id), query));
  /* Everyone else in People appears only once the leader searches, so the
     default list is the group itself. An invited or removed membership counts
     as not in the group: choosing them makes them active. */
  const visibleOthers = query.trim()
    ? people
      .filter((person) => !person.archived && !activeMemberIds.has(person.id) && matchesQuery(person.name, person, query))
      .slice(0, 20)
      .map<Candidate>((person) => ({ currentRole: null, id: person.id, inGroup: false, name: person.name }))
    : [];
  const hasOtherMembers = groupCandidates.some((candidate) => candidate.currentRole !== "leader");
  const roleChoices = selected && isLeadershipRole(selected.currentRole)
    ? [...leadershipChoices, { label: "Member", value: "member" as const }]
    : leadershipChoices;
  const roleUnchanged = Boolean(selected?.inGroup && selected.currentRole === role);
  const firstName = selected?.name.split(/\s+/)[0] ?? "";
  const roleLabel = role === "member" ? "Member" : roleLabels[role];

  function choose(candidate: Candidate) {
    setError("");
    setSuccess(null);
    setSelected(candidate);
    setRole(isLeadershipRole(candidate.currentRole) ? candidate.currentRole : "co_leader");
  }

  function backToList() {
    setError("");
    setSelected(null);
  }

  async function save() {
    if (!selected || roleUnchanged || inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setIsSaving(true);
    setError("");

    try {
      const outcome = await onAssign({ confirmAddToGroup: !selected.inGroup, personId: selected.id, role });

      if (!outcome.ok) {
        setError(outcome.error);
        return;
      }

      setSuccess(outcome);
      setSelected(null);
      setQuery("");
    } finally {
      inFlightRef.current = false;
      setIsSaving(false);
    }
  }

  return (
    <Sheet
      description="Choose who shares leadership. No message is sent."
      isDirty={() => Boolean(selected && !roleUnchanged && !isSaving)}
      kind="editable"
      onClose={onClose}
      showEyebrow={false}
      title="Add a leader"
    >
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 pt-1">
        {success ? (
          <div className="grid gap-3 rounded-dos-1 bg-dos-greenBg px-3.5 py-3" role="status">
            <div className="flex items-start gap-3">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-dos-green" strokeWidth={2} />
              <div className="min-w-0 flex-1">
                <p className="text-dos-body font-semibold text-dos-primary">{successMessage(success, groupName)}</p>
                {isPreview ? <p className="mt-0.5 text-dos-meta text-dos-secondary">Preview only. Nothing was saved.</p> : null}
              </div>
            </div>
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 min-[420px]:grid-cols-2">
              <Button fullWidth onClick={onClose} variant="primary">Done</Button>
              <Button fullWidth onClick={() => setSuccess(null)} variant="secondary">Add another leader</Button>
            </div>
          </div>
        ) : null}

        {!success && !selected ? (
          <section className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dos-secondary" strokeWidth={2} />
              <input
                aria-label="Search members and People"
                autoComplete="off"
                className="h-12 w-full rounded-dos-1 border border-dos-line bg-white pl-10 pr-11 text-dos-body text-dos-primary outline-none placeholder:text-dos-secondary focus-visible:border-dos-blue focus-visible:ring-2 focus-visible:ring-dos-blue focus-visible:ring-offset-2 [&::-webkit-search-cancel-button]:appearance-none"
                data-unsaved="ignore"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search members or People"
                type="search"
                value={query}
              />
              {query ? (
                <button aria-label="Clear search" className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-dos-3 text-dos-secondary hover:text-dos-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-dos-blue" onClick={() => setQuery("")} type="button">
                  <X aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
                </button>
              ) : null}
            </div>
            {/* The list scrolls on its own so the search stays in view and a
                long group never pushes the sheet past a small screen. */}
            {visibleMembers.length || visibleOthers.length ? (
              <div
                className="max-h-[max(14rem,calc(100dvh_-_22rem))] overflow-y-auto overscroll-contain rounded-dos-1 border border-dos-line px-3 [-webkit-overflow-scrolling:touch]"
                data-testid="leader-candidates"
              >
                {visibleMembers.length ? (
                  <div>
                    <p className="pb-1 pt-3 text-dos-meta font-semibold text-dos-secondary">In this group</p>
                    {visibleMembers.map((candidate) => <CandidateRow candidate={candidate} key={candidate.id} onChoose={() => choose(candidate)} />)}
                  </div>
                ) : null}
                {visibleOthers.length ? (
                  <div className={visibleMembers.length ? "border-t border-dos-line" : ""}>
                    <p className="pb-1 pt-3 text-dos-meta font-semibold text-dos-secondary">Other People</p>
                    {visibleOthers.map((candidate) => <CandidateRow candidate={candidate} key={candidate.id} onChoose={() => choose(candidate)} />)}
                  </div>
                ) : null}
              </div>
            ) : query.trim() ? (
              <p className="text-dos-body text-dos-secondary">No one matches “{query.trim()}”.</p>
            ) : null}
            {!query.trim() && !hasOtherMembers ? (
              <p className="text-dos-body text-dos-secondary">No other members yet. Search People to choose someone.</p>
            ) : null}
          </section>
        ) : null}

        {!success && selected ? (
          <section className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={selected.name} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-dos-question text-dos-primary">{selected.name}</p>
                <p className="truncate text-dos-meta text-dos-secondary">{selected.inGroup ? roleLabels[selected.currentRole ?? "member"] : "Not in this group"}</p>
              </div>
            </div>
            <div className="grid gap-1.5">
              <p className="text-dos-label text-dos-primary" id="leader-role-label">Role</p>
              <div aria-labelledby="leader-role-label" className="flex h-12 rounded-dos-3 border border-dos-line bg-white p-1" role="radiogroup">
                {roleChoices.map((option) => (
                  <button
                    aria-checked={role === option.value}
                    className={`min-w-0 flex-1 truncate rounded-dos-3 px-2 text-dos-label transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-dos-blue ${role === option.value ? "bg-dos-blue text-white" : "text-dos-secondary hover:text-dos-primary"}`}
                    disabled={isSaving}
                    key={option.value}
                    onClick={() => setRole(option.value)}
                    role="radio"
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            {!selected.inGroup ? (
              <p className="rounded-dos-1 border border-dos-amber/40 bg-dos-amberBg px-3.5 py-3 text-dos-meta text-dos-primary" role="status">
                {selected.name} is not in {groupName} yet. Saving adds them as an active member and {roleLabel}.
              </p>
            ) : null}
            {error ? <p className="rounded-dos-1 bg-dos-redBg px-3.5 py-3 text-dos-label text-dos-red" role="alert">{error}</p> : null}
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 min-[420px]:grid-cols-[auto_1fr]">
              <Button disabled={isSaving} onClick={backToList} variant="text">Back</Button>
              <Button disabled={isSaving || roleUnchanged} fullWidth onClick={() => void save()} variant="primary">
                <span className="min-w-0 truncate">
                  {isSaving
                    ? "Saving…"
                    : roleUnchanged
                      ? `Already ${roleLabel}`
                      : !selected.inGroup
                        ? `Add and make ${roleLabel}`
                        : role === "member"
                          ? `Make ${firstName} a member`
                          : `Make ${firstName} ${roleLabel}`}
                </span>
              </Button>
            </div>
          </section>
        ) : null}
      </div>
    </Sheet>
  );
}
