/* USA-275 — Multiplication: one discipleship graph for People, the
 * Multiplying indicator, Reports, and connected (upstream) visibility.
 *
 * "Person A disciples Person B" is a durable, directed relationship. It is
 * separate from accountability, Fruit, circle placement and engagement, and
 * this module reads none of those. Two kinds of edge exist:
 *
 *   - OWN RECORDS: a workspace's own Person whose structured role is
 *     `discipling_them`. That is the existing Discipling selection, so
 *     nothing is re-entered. Ending it is the Person relationship itself.
 *   - RECORDED HERE: a row in `dos_discipleship_connections`, entered on a
 *     Person's profile ("Tanner disciples Aaron"), with a Person or only a
 *     name. It never makes the disciple someone the workspace owner
 *     personally disciples, and it never unlocks anyone's account.
 *
 * Accounts connect only by explicit acceptance: a pending invitation on the
 * mentor's Person record, accepted by the signed-in user, who has seen the
 * upstream-visibility explanation, and backed by a verified identity link.
 * An automatic identity match alone is never enough (USA-275 audit:
 * `dos_identity_links` rows are verified by contact matching without
 * consent).
 *
 * Upstream visibility follows accepted account connections whose Person is
 * currently discipled by that workspace. It is read-only, recomputed on every
 * request (no cache), bounded in depth and size, and cycle-safe. Ending a
 * relationship removes every access that ran only through it.
 *
 * Identity: two records are the same person only through an explicit,
 * reversible confirmation (`dos_discipleship_identity_matches`). Names never
 * merge anything; records are linked, never destructively merged.
 *
 * Leaf module: no value imports, so the regression runs it directly and the
 * client, loader and routes share one implementation. */

import type { DosConnectedWorkspaceView } from "./discipleship-connected-view";

export type DosDiscipleshipConnectionStatus = "active" | "ended" | "removed";
export type DosAccountConnectionStatus = "pending" | "accepted" | "declined" | "revoked" | "canceled";
export type DosIdentityMatchStatus = "confirmed" | "declined" | "undone";

export type DosGraphPerson = {
  id: string;
  name: string;
  roleInMyLife: string;
  status: string;
  workspaceId: string;
};

export type DosGraphConnection = {
  createdAt: string;
  /* A snapshot of the disciple's name, kept even when a Person is linked. */
  discipleName: string;
  disciplePersonId: string | null;
  endedAt: string | null;
  id: string;
  mentorPersonId: string;
  /* Unknown unless someone entered it; never inferred. */
  startedOn: string | null;
  status: DosDiscipleshipConnectionStatus;
  workspaceId: string;
};

export type DosGraphAccountConnection = {
  discipleUserId: string | null;
  discipleWorkspaceId: string | null;
  id: string;
  /* A verified `dos_identity_links` row for (discipleUserId, mentor
     workspace, personId) exists. Required in addition to acceptance. */
  identityLinkVerified: boolean;
  mentorWorkspaceId: string;
  personId: string;
  status: DosAccountConnectionStatus;
};

export type DosGraphIdentityMatch = {
  accountConnectionId: string;
  connectionId: string;
  id: string;
  matchedPersonId: string | null;
  matchedWorkspaceId: string;
  status: DosIdentityMatchStatus;
};

export type DosDiscipleshipGraphInput = {
  accountConnections: DosGraphAccountConnection[];
  connections: DosGraphConnection[];
  matches: DosGraphIdentityMatch[];
  people: DosGraphPerson[];
  /* Workspaces whose own records this reader may use. A workspace outside
     this set contributes nothing, and an entry that would need it says so. */
  readableWorkspaceIds: string[];
};

export type DosDiscipleRef =
  | { kind: "person"; personId: string; workspaceId: string }
  | { kind: "name"; connectionId: string; name: string; workspaceId: string };

export type DosDiscipleEntry = {
  /* The recorded row behind this entry, when there is one (for End/Remove). */
  connectionId: string | null;
  /* Counted in direct and descendant totals and in Multiplying. */
  counted: boolean;
  key: string;
  name: string;
  ref: DosDiscipleRef;
  source: "own_records" | "recorded_here";
  startedOn: string | null;
  /* The mentor's account is connected and has not yet confirmed this entry. */
  state: "confirmed" | "awaiting_confirmation" | "declined";
};

export const dosDiscipleshipGraphLimits = { maxDepth: 8, maxNodes: 400 } as const;

export const dosMultiplicationEmptyState = "No discipleship connections added";
export const dosNoActivityState = "No activity recorded";
export const dosDisciplingRole = "discipling_them";

export function dosMultiplicationCountLabel(count: number) {
  return `${count} ${count === 1 ? "person" : "people"}`;
}

function isActivePerson(person: DosGraphPerson | undefined): person is DosGraphPerson {
  return Boolean(person) && person!.status !== "archived";
}

export function dosIsDiscipledByWorkspace(person: DosGraphPerson | undefined) {
  return isActivePerson(person) && person.roleInMyLife === dosDisciplingRole;
}

function usableAccountConnection(connection: DosGraphAccountConnection) {
  return connection.status === "accepted" && connection.identityLinkVerified && Boolean(connection.discipleUserId) && Boolean(connection.discipleWorkspaceId);
}

export type DosReadableWorkspace = {
  depth: number;
  fromWorkspaceId: string;
  viaAccountConnectionId: string;
  viaPersonId: string;
  workspaceId: string;
};

/* Every workspace a viewer may read, upstream to downstream. A path exists
   from W to D when W currently disciples Person P (own records) and P's
   account connection to D is accepted and verified. The viewer's own
   workspaces are the roots and are not returned. */
export function dosReadableWorkspaces({
  accountConnections,
  limits = dosDiscipleshipGraphLimits,
  people,
  viewerWorkspaceIds,
}: {
  accountConnections: DosGraphAccountConnection[];
  limits?: { maxDepth: number; maxNodes: number };
  people: DosGraphPerson[];
  viewerWorkspaceIds: string[];
}) {
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const byMentorWorkspace = new Map<string, DosGraphAccountConnection[]>();

  accountConnections.filter(usableAccountConnection).forEach((connection) => {
    byMentorWorkspace.set(connection.mentorWorkspaceId, [...(byMentorWorkspace.get(connection.mentorWorkspaceId) ?? []), connection]);
  });

  const visited = new Set(viewerWorkspaceIds);
  const readable = new Map<string, DosReadableWorkspace>();
  let frontier = Array.from(visited);

  for (let depth = 1; depth <= limits.maxDepth && frontier.length; depth += 1) {
    const next: string[] = [];

    for (const workspaceId of frontier) {
      const candidates = [...(byMentorWorkspace.get(workspaceId) ?? [])].sort((first, second) => first.id.localeCompare(second.id));

      for (const connection of candidates) {
        const person = peopleById.get(connection.personId);
        const discipleWorkspaceId = connection.discipleWorkspaceId as string;

        if (!person || person.workspaceId !== workspaceId || !dosIsDiscipledByWorkspace(person) || visited.has(discipleWorkspaceId)) {
          continue;
        }

        if (readable.size >= limits.maxNodes) {
          return readable;
        }

        visited.add(discipleWorkspaceId);
        readable.set(discipleWorkspaceId, { depth, fromWorkspaceId: workspaceId, viaAccountConnectionId: connection.id, viaPersonId: person.id, workspaceId: discipleWorkspaceId });
        next.push(discipleWorkspaceId);
      }
    }

    frontier = next;
  }

  return readable;
}

/* Accepting would make the mentor's workspace readable from itself. */
export function dosAccountConnectionWouldCycle({
  accountConnections,
  discipleWorkspaceId,
  mentorWorkspaceId,
  people,
}: {
  accountConnections: DosGraphAccountConnection[];
  discipleWorkspaceId: string;
  mentorWorkspaceId: string;
  people: DosGraphPerson[];
}) {
  return discipleWorkspaceId === mentorWorkspaceId
    || dosReadableWorkspaces({ accountConnections, people, viewerWorkspaceIds: [discipleWorkspaceId] }).has(mentorWorkspaceId);
}

export type DosConnectionValidation =
  | { discipleName: string; ok: true }
  | { code: "mentor_not_found" | "disciple_not_found" | "name_required" | "name_too_long" | "self_link" | "duplicate" | "cycle"; message: string; ok: false };

export const dosDiscipleNameMaxLength = 120;

/* A new recorded connection M → D inside one workspace. The workspace owner
   is `ownerPersonId` (their own Person there, when they have one): owner
   edges are the Persons they disciple. */
export function dosValidateDiscipleshipConnection({
  connections,
  discipleName,
  disciplePersonId,
  mentorPersonId,
  ownerPersonId,
  people,
  workspaceId,
}: {
  connections: DosGraphConnection[];
  discipleName: string | null | undefined;
  disciplePersonId: string | null | undefined;
  mentorPersonId: string;
  ownerPersonId: string | null;
  people: DosGraphPerson[];
  workspaceId: string;
}): DosConnectionValidation {
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const mentor = peopleById.get(mentorPersonId);

  if (!isActivePerson(mentor) || mentor.workspaceId !== workspaceId) {
    return { code: "mentor_not_found", message: "That person is not in this workspace.", ok: false };
  }

  let name = (discipleName ?? "").replace(/\s+/g, " ").trim();

  if (disciplePersonId) {
    const disciple = peopleById.get(disciplePersonId);

    if (!isActivePerson(disciple) || disciple.workspaceId !== workspaceId) {
      return { code: "disciple_not_found", message: "That person is not in this workspace.", ok: false };
    }

    name = disciple.name;
  }

  if (!name) {
    return { code: "name_required", message: "Choose a person or enter a name.", ok: false };
  }

  if (name.length > dosDiscipleNameMaxLength) {
    return { code: "name_too_long", message: `Names are limited to ${dosDiscipleNameMaxLength} characters.`, ok: false };
  }

  const node = (personId: string) => (ownerPersonId && personId === ownerPersonId ? "owner" : personId);

  if (disciplePersonId && node(disciplePersonId) === node(mentorPersonId)) {
    return { code: "self_link", message: "Someone can't be recorded as discipling themselves.", ok: false };
  }

  const active = connections.filter((connection) => connection.workspaceId === workspaceId && connection.status === "active");

  if (disciplePersonId && active.some((connection) => connection.mentorPersonId === mentorPersonId && connection.disciplePersonId === disciplePersonId)) {
    return { code: "duplicate", message: `${name} is already listed.`, ok: false };
  }

  if (disciplePersonId) {
    const adjacency = new Map<string, string[]>();
    const addEdge = (from: string, to: string) => adjacency.set(from, [...(adjacency.get(from) ?? []), to]);

    people
      .filter((person) => person.workspaceId === workspaceId && dosIsDiscipledByWorkspace(person))
      .forEach((person) => addEdge("owner", node(person.id)));
    active.forEach((connection) => {
      if (connection.disciplePersonId) {
        addEdge(node(connection.mentorPersonId), node(connection.disciplePersonId));
      }
    });

    const target = node(mentorPersonId);
    const seen = new Set<string>();
    const stack = [node(disciplePersonId)];

    while (stack.length && seen.size <= dosDiscipleshipGraphLimits.maxNodes) {
      const current = stack.pop() as string;

      if (current === target) {
        return { code: "cycle", message: `${name} already disciples ${mentor.name}, directly or through others.`, ok: false };
      }

      if (!seen.has(current)) {
        seen.add(current);
        stack.push(...(adjacency.get(current) ?? []));
      }
    }
  }

  return { discipleName: name, ok: true };
}

export type DosDiscipleshipGraph = ReturnType<typeof createDosDiscipleshipGraph>;

export function createDosDiscipleshipGraph(input: DosDiscipleshipGraphInput) {
  const peopleById = new Map(input.people.map((person) => [person.id, person]));
  const readable = new Set(input.readableWorkspaceIds);
  const accountByPerson = new Map<string, DosGraphAccountConnection>();
  const activeByMentor = new Map<string, DosGraphConnection[]>();
  const decisionByConnection = new Map<string, DosGraphIdentityMatch>();
  const ownDisciplesByWorkspace = new Map<string, DosGraphPerson[]>();

  input.accountConnections.filter(usableAccountConnection).forEach((connection) => accountByPerson.set(connection.personId, connection));
  input.connections
    .filter((connection) => connection.status === "active")
    .sort((first, second) => first.createdAt.localeCompare(second.createdAt) || first.id.localeCompare(second.id))
    .forEach((connection) => activeByMentor.set(connection.mentorPersonId, [...(activeByMentor.get(connection.mentorPersonId) ?? []), connection]));
  input.matches
    .filter((match) => match.status === "confirmed" || match.status === "declined")
    .forEach((match) => decisionByConnection.set(match.connectionId, match));
  input.people
    .filter(dosIsDiscipledByWorkspace)
    .sort((first, second) => first.name.localeCompare(second.name) || first.id.localeCompare(second.id))
    .forEach((person) => ownDisciplesByWorkspace.set(person.workspaceId, [...(ownDisciplesByWorkspace.get(person.workspaceId) ?? []), person]));

  /* One key per real person across workspaces: a connected account is one
     person wherever they are recorded; otherwise the Person record, or the
     recorded row for a name. A confirmed match resolves a row to the
     matched Person, so both records count once. */
  const keyOf = (ref: DosDiscipleRef): string => {
    if (ref.kind === "name") {
      return `name:${ref.connectionId}`;
    }

    const account = accountByPerson.get(ref.personId);

    return account ? `account:${account.discipleUserId}` : `person:${ref.personId}`;
  };

  /* The account behind a Person, only when that account's workspace may be
     read and the Person is currently discipled there. */
  const readableAccountFor = (person: DosGraphPerson) => {
    const account = accountByPerson.get(person.id);

    return account && dosIsDiscipledByWorkspace(person) && readable.has(account.discipleWorkspaceId as string) ? account : null;
  };

  const resolveRecorded = (connection: DosGraphConnection, mentorAccount: DosGraphAccountConnection | undefined): Pick<DosDiscipleEntry, "counted" | "name" | "ref" | "state"> => {
    const decision = decisionByConnection.get(connection.id);

    if (decision?.status === "declined") {
      return { counted: false, name: connection.discipleName, ref: { connectionId: connection.id, kind: "name", name: connection.discipleName, workspaceId: connection.workspaceId }, state: "declined" };
    }

    const matched = decision?.status === "confirmed" && decision.matchedPersonId ? peopleById.get(decision.matchedPersonId) : undefined;

    if (isActivePerson(matched)) {
      return { counted: true, name: matched.name, ref: { kind: "person", personId: matched.id, workspaceId: matched.workspaceId }, state: "confirmed" };
    }

    const person = connection.disciplePersonId ? peopleById.get(connection.disciplePersonId) : undefined;
    const state = mentorAccount && !decision ? "awaiting_confirmation" : "confirmed";

    return isActivePerson(person)
      ? { counted: true, name: person.name, ref: { kind: "person", personId: person.id, workspaceId: person.workspaceId }, state }
      : { counted: true, name: connection.discipleName, ref: { connectionId: connection.id, kind: "name", name: connection.discipleName, workspaceId: connection.workspaceId }, state };
  };

  const entryCache = new Map<string, DosDiscipleEntry[]>();

  /* Direct disciples of a Person: their own records (when their account is
     connected and readable) first, then what was recorded about them in the
     workspace that holds this Person. Deduplicated by person key. */
  const directDisciples = (ref: DosDiscipleRef): DosDiscipleEntry[] => {
    if (ref.kind === "name") {
      return [];
    }

    const cacheKey = `${ref.workspaceId}:${ref.personId}`;
    const cached = entryCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const person = peopleById.get(ref.personId);

    if (!isActivePerson(person)) {
      return [];
    }

    const selfKey = keyOf(ref);
    const entries: DosDiscipleEntry[] = [];
    const indexByKey = new Map<string, number>();
    const push = (entry: DosDiscipleEntry) => {
      if (entry.key === selfKey) {
        return;
      }

      const existing = indexByKey.get(entry.key);

      if (existing === undefined) {
        indexByKey.set(entry.key, entries.length);
        entries.push(entry);
      } else if (!entries[existing].connectionId && entry.connectionId) {
        entries[existing] = { ...entries[existing], connectionId: entry.connectionId };
      }
    };
    const account = readableAccountFor(person);

    if (account) {
      (ownDisciplesByWorkspace.get(account.discipleWorkspaceId as string) ?? []).forEach((disciple) => {
        const discipleRef: DosDiscipleRef = { kind: "person", personId: disciple.id, workspaceId: disciple.workspaceId };

        push({ connectionId: null, counted: true, key: keyOf(discipleRef), name: disciple.name, ref: discipleRef, source: "own_records", startedOn: null, state: "confirmed" });
      });
    }

    const mentorAccount = accountByPerson.get(person.id);

    (activeByMentor.get(person.id) ?? []).forEach((connection) => {
      const resolved = resolveRecorded(connection, mentorAccount);

      push({ ...resolved, connectionId: connection.id, key: keyOf(resolved.ref), source: "recorded_here", startedOn: connection.startedOn });
    });

    entryCache.set(cacheKey, entries);

    return entries;
  };

  /* The workspace owner's own direct disciples (Reports' root). */
  const ownerDisciples = (workspaceId: string): DosDiscipleEntry[] => (ownDisciplesByWorkspace.get(workspaceId) ?? []).map((disciple) => {
    const ref: DosDiscipleRef = { kind: "person", personId: disciple.id, workspaceId };

    return { connectionId: null, counted: true, key: keyOf(ref), name: disciple.name, ref, source: "own_records", startedOn: null, state: "confirmed" };
  });

  const countedDisciples = (ref: DosDiscipleRef) => directDisciples(ref).filter((entry) => entry.counted);

  /* Unique people across every generation below `ref`, bounded and
     cycle-safe. Shared paths count a person once. */
  const descendants = (ref: DosDiscipleRef, limits = dosDiscipleshipGraphLimits) => {
    const visited = new Set([keyOf(ref)]);
    const generations: number[] = [];
    let frontier: DosDiscipleRef[] = [ref];
    let truncated = false;

    for (let depth = 1; depth <= limits.maxDepth && frontier.length && !truncated; depth += 1) {
      const next: DosDiscipleRef[] = [];

      for (const current of frontier) {
        for (const entry of countedDisciples(current)) {
          if (visited.has(entry.key)) {
            continue;
          }

          if (visited.size > limits.maxNodes) {
            truncated = true;
            break;
          }

          visited.add(entry.key);
          next.push(entry.ref);
        }
      }

      if (next.length) {
        generations.push(next.length);
      }

      frontier = next;
    }

    return { generations, total: visited.size - 1, truncated };
  };

  return {
    accountFor: (personId: string) => accountByPerson.get(personId) ?? null,
    countedDisciples,
    descendants,
    directCount: (ref: DosDiscipleRef) => countedDisciples(ref).length,
    directDisciples,
    isMultiplying: (ref: DosDiscipleRef) => countedDisciples(ref).length > 0,
    keyOf,
    ownerDisciples,
    person: (personId: string) => peopleById.get(personId) ?? null,
    readableAccountFor: (personId: string) => {
      const person = peopleById.get(personId);

      return person ? readableAccountFor(person) : null;
    },
  };
}

/* ---------- payloads shared by the loader, routes, preview and client ---------- */

/* The mentor side of an account connection, on this workspace's own Person. */
export type DosAppDiscipleshipAccount = {
  acceptedAt: string | null;
  id: string;
  inviteEmail: string | null;
  personId: string;
  status: DosAccountConnectionStatus;
};

/* An invitation to the signed-in user, matched to their authenticated email. */
export type DosAppDiscipleshipIncomingRequest = {
  id: string;
  invitedAt: string;
  mentorWorkspaceName: string;
  personName: string;
  /* Everyone who would be able to view: the inviting workspace first, then
     every workspace that already views it (indirect upstream viewers). */
  upstreamViewerNames: string[];
};

/* The viewer as a disciple: a mentor workspace they accepted. */
export type DosAppDiscipleshipMentorAccount = {
  acceptedAt: string | null;
  id: string;
  mentorWorkspaceName: string;
  upstreamViewerNames: string[];
};

/* An entry the mentor recorded about someone the viewer disciples, awaiting
   the viewer's one-time decision. */
export type DosAppDiscipleshipConfirmation = {
  accountConnectionId: string;
  connectionId: string;
  discipleName: string;
  mentorWorkspaceName: string;
  /* Same-name People in the viewer's workspace, offered first. Never chosen
     automatically: a shared name is not the same person. */
  sameNamePersonIds: string[];
  startedOn: string | null;
};

/* A decision the viewer's workspace made, so it can be corrected. */
export type DosAppDiscipleshipDecision = {
  accountConnectionId: string;
  connectionId: string;
  createdPerson: boolean;
  discipleName: string;
  id: string;
  matchedPersonId: string | null;
  mentorWorkspaceName: string;
  status: "confirmed" | "declined";
};

export type DosAppDiscipleship = {
  accounts: DosAppDiscipleshipAccount[];
  confirmations: DosAppDiscipleshipConfirmation[];
  decisions: DosAppDiscipleshipDecision[];
  graph: DosDiscipleshipGraphInput;
  incomingRequests: DosAppDiscipleshipIncomingRequest[];
  mentorAccounts: DosAppDiscipleshipMentorAccount[];
  /* DB-free preview only: connected views the demo would otherwise fetch.
     Never set by the loader. */
  previewConnectedViews?: Record<string, DosConnectedWorkspaceView>;
  readableWorkspaces: Array<DosReadableWorkspace & { ownerName: string }>;
  /* False until the USA-275 tables exist. Own records (current Discipling
     selections) still count; nothing can be added or connected. */
  supported: boolean;
  workspaceId: string;
};

export function emptyDosAppDiscipleship(workspaceId: string, people: DosGraphPerson[] = [], supported = false): DosAppDiscipleship {
  return {
    accounts: [],
    confirmations: [],
    decisions: [],
    graph: { accountConnections: [], connections: [], matches: [], people, readableWorkspaceIds: [workspaceId] },
    incomingRequests: [],
    mentorAccounts: [],
    readableWorkspaces: [],
    supported,
    workspaceId,
  };
}

export function dosNormalizedPersonName(name: string | null | undefined) {
  return (name ?? "").normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
}
