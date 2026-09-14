import "server-only";

/* USA-275 — server side of Multiplication.
 *
 * Every read here uses the service-role client and is authorized by the
 * caller (route or loader) before it runs; nothing is cached. Traversal is the
 * pure `dosReadableWorkspaces`, applied level by level so only workspaces that
 * are already proven readable are ever loaded. The connected read adds a
 * second, independent database check (`dos_discipleship_readable_workspaces`)
 * and grants access only when both agree. */

import type { DosAuthorizedUser } from "@/src/lib/dos/auth";
import {
  dosDiscipleshipGraphLimits,
  dosIsDiscipledByWorkspace,
  dosNormalizedPersonName,
  dosReadableWorkspaces,
  emptyDosAppDiscipleship,
  type DosAccountConnectionStatus,
  type DosAppDiscipleship,
  type DosDiscipleshipConnectionStatus,
  type DosGraphAccountConnection,
  type DosGraphConnection,
  type DosGraphIdentityMatch,
  type DosGraphPerson,
  type DosIdentityMatchStatus,
  type DosReadableWorkspace,
} from "@/src/lib/dos/discipleship-graph";
import type { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;
type QueryError = { code?: string; message: string } | null | undefined;

export type DosDiscipleshipPersonRow = {
  household_id: string | null;
  id: string;
  name: string | null;
  role_in_my_life: string | null;
  status: string | null;
  workspace_id: string | null;
};

export type DosDiscipleshipConnectionRow = {
  created_at: string;
  disciple_name: string;
  disciple_person_id: string | null;
  ended_at: string | null;
  id: string;
  mentor_person_id: string;
  started_on: string | null;
  status: string;
  workspace_id: string;
};

export type DosDiscipleshipAccountRow = {
  accepted_at: string | null;
  created_at: string;
  disciple_user_id: string | null;
  disciple_workspace_id: string | null;
  id: string;
  identity_link_id: string | null;
  invite_email: string;
  mentor_workspace_id: string;
  person_id: string;
  status: string;
  upstream_viewer_names: string[] | null;
};

export type DosDiscipleshipMatchRow = {
  account_connection_id: string;
  connection_id: string;
  created_person: boolean | null;
  id: string;
  matched_person_id: string | null;
  matched_workspace_id: string;
  status: string;
};

export const dosDiscipleshipPersonColumns = "id, name, role_in_my_life, status, workspace_id, household_id";
export const dosDiscipleshipConnectionColumns = "id, workspace_id, mentor_person_id, disciple_person_id, disciple_name, status, started_on, ended_at, created_at";
export const dosDiscipleshipAccountColumns = "id, mentor_workspace_id, person_id, invite_email, status, disciple_user_id, disciple_workspace_id, identity_link_id, accepted_at, created_at, upstream_viewer_names";
export const dosDiscipleshipMatchColumns = "id, connection_id, account_connection_id, matched_workspace_id, matched_person_id, status, created_person";

const chunkSize = 100;

export function isDosDiscipleshipSchemaMissing(error: QueryError) {
  if (!error) {
    return false;
  }

  return ["42P01", "42883", "PGRST202", "PGRST205"].includes(error.code ?? "")
    || /does not exist|schema cache|could not find the (table|function)/i.test(error.message ?? "");
}

export function dosWorkspaceScopeFilter(workspaceIds: string[]) {
  const list = workspaceIds.join(",");

  return `workspace_id.in.(${list}),household_id.in.(${list})`;
}

function chunks<T>(items: T[]) {
  const result: T[][] = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    result.push(items.slice(index, index + chunkSize));
  }

  return result;
}

export function toDosGraphPerson(row: DosDiscipleshipPersonRow): DosGraphPerson {
  return {
    id: row.id,
    name: row.name?.trim() || "Unnamed person",
    roleInMyLife: row.role_in_my_life ?? "not_active",
    status: row.status ?? "new",
    workspaceId: row.workspace_id ?? row.household_id ?? "",
  };
}

const connectionStatuses: DosDiscipleshipConnectionStatus[] = ["active", "ended", "removed"];
const accountStatuses: DosAccountConnectionStatus[] = ["pending", "accepted", "declined", "revoked", "canceled"];
const matchStatuses: DosIdentityMatchStatus[] = ["confirmed", "declined", "undone"];

export function toDosGraphConnection(row: DosDiscipleshipConnectionRow): DosGraphConnection {
  return {
    createdAt: row.created_at,
    discipleName: row.disciple_name,
    disciplePersonId: row.disciple_person_id,
    endedAt: row.ended_at,
    id: row.id,
    mentorPersonId: row.mentor_person_id,
    startedOn: row.started_on,
    status: connectionStatuses.find((status) => status === row.status) ?? "removed",
    workspaceId: row.workspace_id,
  };
}

export function toDosGraphAccount(row: DosDiscipleshipAccountRow, identityLinkVerified: boolean): DosGraphAccountConnection {
  return {
    discipleUserId: row.disciple_user_id,
    discipleWorkspaceId: row.disciple_workspace_id,
    id: row.id,
    identityLinkVerified,
    mentorWorkspaceId: row.mentor_workspace_id,
    personId: row.person_id,
    status: accountStatuses.find((status) => status === row.status) ?? "canceled",
  };
}

export function toDosGraphMatch(row: DosDiscipleshipMatchRow): DosGraphIdentityMatch {
  return {
    accountConnectionId: row.account_connection_id,
    connectionId: row.connection_id,
    id: row.id,
    matchedPersonId: row.matched_person_id,
    matchedWorkspaceId: row.matched_workspace_id,
    status: matchStatuses.find((status) => status === row.status) ?? "undone",
  };
}

async function loadVerifiedLinkKeys(supabase: SupabaseAdminClient, personIds: string[]) {
  const keys = new Set<string>();

  for (const ids of chunks(Array.from(new Set(personIds)))) {
    const result = await supabase
      .from("dos_identity_links")
      .select("user_id, workspace_id, person_id")
      .eq("verification_status", "verified")
      .in("person_id", ids);

    if (result.error) {
      return { error: result.error, keys };
    }

    ((result.data ?? []) as Array<{ person_id: string; user_id: string; workspace_id: string }>).forEach((link) => keys.add(`${link.user_id}:${link.workspace_id}:${link.person_id}`));
  }

  return { error: null, keys };
}

const accountLinkKey = (row: Pick<DosDiscipleshipAccountRow, "disciple_user_id" | "mentor_workspace_id" | "person_id">) => `${row.disciple_user_id}:${row.mentor_workspace_id}:${row.person_id}`;

export type DosDiscipleshipReach = {
  accountRows: DosDiscipleshipAccountRow[];
  accounts: DosGraphAccountConnection[];
  connections: DosGraphConnection[];
  matches: DosDiscipleshipMatchRow[];
  people: DosGraphPerson[];
  readable: Map<string, DosReadableWorkspace>;
};

export type DosDiscipleshipReachResult =
  | { status: "missing" }
  | { message: string; status: "error" }
  | { reach: DosDiscipleshipReach; status: "ready" };

/* Everything the viewer's workspace may use: its own rows, then — only once
   proven readable — each downstream workspace's People, recorded connections
   and accepted account connections. Bounded by the graph limits. */
export async function loadDosDiscipleshipReach(supabase: SupabaseAdminClient, rootWorkspaceId: string): Promise<DosDiscipleshipReachResult> {
  const loaded = new Set<string>();
  const people: DosGraphPerson[] = [];
  const connections: DosGraphConnection[] = [];
  const accountRows: DosDiscipleshipAccountRow[] = [];
  let accounts: DosGraphAccountConnection[] = [];
  let readable = new Map<string, DosReadableWorkspace>();
  let pending = [rootWorkspaceId];

  for (let round = 0; round <= dosDiscipleshipGraphLimits.maxDepth && pending.length; round += 1) {
    const workspaceIds = pending.filter((id) => !loaded.has(id)).slice(0, dosDiscipleshipGraphLimits.maxNodes);

    if (!workspaceIds.length) {
      break;
    }

    workspaceIds.forEach((id) => loaded.add(id));

    const [peopleResult, connectionResult, accountResult] = await Promise.all([
      supabase.from("missionary_field_people").select(dosDiscipleshipPersonColumns).or(dosWorkspaceScopeFilter(workspaceIds)),
      supabase.from("dos_discipleship_connections").select(dosDiscipleshipConnectionColumns).in("workspace_id", workspaceIds).in("status", ["active", "ended"]),
      supabase.from("dos_discipleship_account_connections").select(dosDiscipleshipAccountColumns).in("mentor_workspace_id", workspaceIds).in("status", ["pending", "accepted"]),
    ]);

    if (isDosDiscipleshipSchemaMissing(connectionResult.error) || isDosDiscipleshipSchemaMissing(accountResult.error)) {
      return { status: "missing" };
    }

    const error = peopleResult.error ?? connectionResult.error ?? accountResult.error;

    if (error) {
      return { message: error.message, status: "error" };
    }

    people.push(...((peopleResult.data ?? []) as DosDiscipleshipPersonRow[]).map(toDosGraphPerson));
    connections.push(...((connectionResult.data ?? []) as DosDiscipleshipConnectionRow[]).map(toDosGraphConnection));

    /* Downstream workspaces contribute accepted connections only; pending
       invitations are the root workspace's own business. */
    const rows = ((accountResult.data ?? []) as DosDiscipleshipAccountRow[]).filter((row) => row.mentor_workspace_id === rootWorkspaceId || row.status === "accepted");
    const accepted = rows.filter((row) => row.status === "accepted" && row.disciple_user_id);
    const links = accepted.length ? await loadVerifiedLinkKeys(supabase, accepted.map((row) => row.person_id)) : { error: null, keys: new Set<string>() };

    if (links.error) {
      return { message: links.error.message, status: "error" };
    }

    accountRows.push(...rows);
    accounts = [...accounts, ...rows.map((row) => toDosGraphAccount(row, links.keys.has(accountLinkKey(row))))];
    readable = dosReadableWorkspaces({ accountConnections: accounts, people, viewerWorkspaceIds: [rootWorkspaceId] });
    pending = Array.from(readable.keys()).filter((id) => !loaded.has(id));
  }

  const matches: DosDiscipleshipMatchRow[] = [];

  for (const ids of chunks(connections.map((connection) => connection.id))) {
    const result = await supabase
      .from("dos_discipleship_identity_matches")
      .select(dosDiscipleshipMatchColumns)
      .in("connection_id", ids)
      .in("status", ["confirmed", "declined"]);

    if (isDosDiscipleshipSchemaMissing(result.error)) {
      return { status: "missing" };
    }

    if (result.error) {
      return { message: result.error.message, status: "error" };
    }

    matches.push(...((result.data ?? []) as DosDiscipleshipMatchRow[]));
  }

  return { reach: { accountRows, accounts, connections, matches, people, readable }, status: "ready" };
}

/* Workspaces that already view `workspaceId` (it first), walking upstream
   through accepted, verified connections whose Person is currently discipled.
   Used to explain, before acceptance, exactly who will be able to view. */
export async function loadDosUpstreamViewerWorkspaceIds(supabase: SupabaseAdminClient, workspaceId: string) {
  const ordered = [workspaceId];
  const visited = new Set(ordered);
  let frontier = [workspaceId];

  for (let depth = 0; depth < dosDiscipleshipGraphLimits.maxDepth && frontier.length; depth += 1) {
    const accountResult = await supabase
      .from("dos_discipleship_account_connections")
      .select(dosDiscipleshipAccountColumns)
      .in("disciple_workspace_id", frontier)
      .eq("status", "accepted");

    if (accountResult.error) {
      break;
    }

    const rows = (accountResult.data ?? []) as DosDiscipleshipAccountRow[];

    if (!rows.length) {
      break;
    }

    const [peopleResult, links] = await Promise.all([
      supabase.from("missionary_field_people").select(dosDiscipleshipPersonColumns).in("id", rows.map((row) => row.person_id)),
      loadVerifiedLinkKeys(supabase, rows.map((row) => row.person_id)),
    ]);

    if (peopleResult.error || links.error) {
      break;
    }

    const peopleById = new Map(((peopleResult.data ?? []) as DosDiscipleshipPersonRow[]).map((row) => [row.id, toDosGraphPerson(row)]));
    const next: string[] = [];

    rows.forEach((row) => {
      const person = peopleById.get(row.person_id);

      if (!person || person.workspaceId !== row.mentor_workspace_id || !dosIsDiscipledByWorkspace(person) || !links.keys.has(accountLinkKey(row)) || visited.has(row.mentor_workspace_id)) {
        return;
      }

      visited.add(row.mentor_workspace_id);
      ordered.push(row.mentor_workspace_id);
      next.push(row.mentor_workspace_id);
    });

    frontier = next;
  }

  return ordered;
}

export async function loadDosWorkspaceNames(supabase: SupabaseAdminClient, workspaceIds: string[]) {
  const names = new Map<string, string>();
  const ids = Array.from(new Set(workspaceIds.filter(Boolean)));

  for (const batch of chunks(ids)) {
    const result = await supabase.from("missionary_households").select("id, display_name").in("id", batch);

    ((result.data ?? []) as Array<{ display_name: string | null; id: string }>).forEach((row) => names.set(row.id, row.display_name?.trim() || "DOS workspace"));
  }

  return names;
}

export async function loadDosUpstreamViewerNames(supabase: SupabaseAdminClient, workspaceId: string) {
  const ids = await loadDosUpstreamViewerWorkspaceIds(supabase, workspaceId);
  const names = await loadDosWorkspaceNames(supabase, ids);

  return ids.map((id) => names.get(id) ?? "DOS workspace");
}

/* The page payload for the signed-in viewer's workspace. Never throws: if the
   USA-275 tables are absent (migration not applied) or unreadable, own
   records still count and nothing else is offered. */
export async function loadDosAppDiscipleship(
  supabase: SupabaseAdminClient,
  {
    people,
    viewer,
    workspace,
  }: {
    people: Array<{ id: string; name: string; roleInMyLife: string; status: string }>;
    viewer: DosAuthorizedUser | null | undefined;
    workspace: { id: string };
  },
): Promise<DosAppDiscipleship> {
  const own: DosGraphPerson[] = people.map((person) => ({ id: person.id, name: person.name, roleInMyLife: person.roleInMyLife, status: person.status, workspaceId: workspace.id }));

  try {
    const result = await loadDosDiscipleshipReach(supabase, workspace.id);

    if (result.status !== "ready") {
      if (result.status === "error") {
        console.warn("[DOS discipleship] Unable to load connections.", result.message);
      }

      return emptyDosAppDiscipleship(workspace.id, own, false);
    }

    const { reach } = result;
    const readableIds = Array.from(reach.readable.keys());
    const graphPeople = [...own, ...reach.people.filter((person) => person.workspaceId !== workspace.id)];
    const peopleById = new Map(graphPeople.map((person) => [person.id, person]));
    const member = viewer?.access === "member" ? viewer : null;
    const email = member?.email?.trim().toLowerCase() ?? "";
    const [incomingResult, mentorResult] = await Promise.all([
      email
        ? supabase.from("dos_discipleship_account_connections").select(dosDiscipleshipAccountColumns).eq("invite_email", email).eq("status", "pending")
        : Promise.resolve({ data: [], error: null }),
      member
        ? supabase.from("dos_discipleship_account_connections").select(dosDiscipleshipAccountColumns).eq("disciple_user_id", member.userId).eq("disciple_workspace_id", workspace.id).eq("status", "accepted")
        : Promise.resolve({ data: [], error: null }),
    ]);
    const incomingRows = ((incomingResult.data ?? []) as DosDiscipleshipAccountRow[]).filter((row) => row.mentor_workspace_id !== workspace.id);
    const mentorRows = (mentorResult.data ?? []) as DosDiscipleshipAccountRow[];
    const mentorWorkspaceIds = Array.from(new Set([...incomingRows, ...mentorRows].map((row) => row.mentor_workspace_id)));
    const [workspaceNames, upstreamEntries, incomingPeopleResult] = await Promise.all([
      loadDosWorkspaceNames(supabase, [...readableIds, ...mentorWorkspaceIds]),
      Promise.all(mentorWorkspaceIds.map(async (id) => [id, await loadDosUpstreamViewerNames(supabase, id)] as const)),
      incomingRows.length
        ? supabase.from("missionary_field_people").select(dosDiscipleshipPersonColumns).in("id", incomingRows.map((row) => row.person_id))
        : Promise.resolve({ data: [], error: null }),
    ]);
    const upstreamByWorkspace = new Map(upstreamEntries);
    const incomingPeople = new Map(((incomingPeopleResult.data ?? []) as DosDiscipleshipPersonRow[]).map((row) => [row.id, row.name?.trim() || "You"]));
    const workspaceName = (id: string) => workspaceNames.get(id) ?? "DOS workspace";

    let confirmations: DosAppDiscipleship["confirmations"] = [];
    let decisions: DosAppDiscipleship["decisions"] = [];

    if (mentorRows.length) {
      /* Entries a mentor recorded about someone the viewer disciples. Only
         the name and optional start date leave the mentor's workspace, and
         only to the account the entry is about. */
      const upstreamConnections = await supabase
        .from("dos_discipleship_connections")
        .select(dosDiscipleshipConnectionColumns)
        .in("mentor_person_id", mentorRows.map((row) => row.person_id))
        .eq("status", "active");
      const rows = ((upstreamConnections.data ?? []) as DosDiscipleshipConnectionRow[])
        .filter((connection) => mentorRows.some((row) => row.person_id === connection.mentor_person_id && row.mentor_workspace_id === connection.workspace_id));
      const matchResult = rows.length
        ? await supabase.from("dos_discipleship_identity_matches").select(dosDiscipleshipMatchColumns).in("connection_id", rows.map((row) => row.id)).in("status", ["confirmed", "declined"])
        : { data: [], error: null };
      const decided = (matchResult.data ?? []) as DosDiscipleshipMatchRow[];
      const decidedIds = new Set(decided.map((match) => match.connection_id));
      const accountFor = (connection: DosDiscipleshipConnectionRow) => mentorRows.find((row) => row.person_id === connection.mentor_person_id) as DosDiscipleshipAccountRow;

      confirmations = rows
        .filter((connection) => !decidedIds.has(connection.id))
        .map((connection) => ({
          accountConnectionId: accountFor(connection).id,
          connectionId: connection.id,
          discipleName: connection.disciple_name,
          mentorWorkspaceName: workspaceName(connection.workspace_id),
          sameNamePersonIds: own.filter((person) => person.status !== "archived" && dosNormalizedPersonName(person.name) === dosNormalizedPersonName(connection.disciple_name)).map((person) => person.id),
          startedOn: connection.started_on,
        }));
      decisions = decided
        .filter((match) => match.matched_workspace_id === workspace.id)
        .map((match) => {
          const connection = rows.find((row) => row.id === match.connection_id);

          return {
            accountConnectionId: match.account_connection_id,
            connectionId: match.connection_id,
            createdPerson: Boolean(match.created_person),
            discipleName: connection?.disciple_name ?? "",
            id: match.id,
            matchedPersonId: match.matched_person_id,
            mentorWorkspaceName: connection ? workspaceName(connection.workspace_id) : "DOS workspace",
            status: match.status === "declined" ? "declined" as const : "confirmed" as const,
          };
        });
    }

    return {
      accounts: reach.accountRows
        .filter((row) => row.mentor_workspace_id === workspace.id)
        .map((row) => ({ acceptedAt: row.accepted_at, id: row.id, inviteEmail: row.invite_email, personId: row.person_id, status: toDosGraphAccount(row, false).status })),
      confirmations,
      decisions,
      graph: {
        accountConnections: reach.accounts,
        connections: reach.connections,
        matches: reach.matches.map(toDosGraphMatch),
        people: graphPeople,
        readableWorkspaceIds: [workspace.id, ...readableIds],
      },
      incomingRequests: incomingRows.map((row) => ({
        id: row.id,
        invitedAt: row.created_at,
        mentorWorkspaceName: workspaceName(row.mentor_workspace_id),
        personName: incomingPeople.get(row.person_id) ?? "You",
        upstreamViewerNames: upstreamByWorkspace.get(row.mentor_workspace_id) ?? [workspaceName(row.mentor_workspace_id)],
      })),
      mentorAccounts: mentorRows.map((row) => ({
        acceptedAt: row.accepted_at,
        id: row.id,
        mentorWorkspaceName: workspaceName(row.mentor_workspace_id),
        upstreamViewerNames: upstreamByWorkspace.get(row.mentor_workspace_id) ?? [workspaceName(row.mentor_workspace_id)],
      })),
      readableWorkspaces: readableIds.map((id) => {
        const entry = reach.readable.get(id) as DosReadableWorkspace;

        return { ...entry, ownerName: peopleById.get(entry.viaPersonId)?.name ?? workspaceName(id) };
      }),
      supported: true,
      workspaceId: workspace.id,
    };
  } catch (error) {
    console.warn("[DOS discipleship] Unable to load connections.", error instanceof Error ? error.message : error);

    return emptyDosAppDiscipleship(workspace.id, own, false);
  }
}

export type DosConnectedReadAuthorization =
  | { ok: false }
  | { ok: true; ownerName: string; readable: DosReadableWorkspace; recordUserId: string | null };

/* A read of another workspace's DOS information. Allowed only when the
   TypeScript traversal AND the database function both find a current path
   from the viewer's own workspace. Anything else is indistinguishable from a
   workspace that does not exist. */
export async function authorizeDosConnectedWorkspaceRead(
  supabase: SupabaseAdminClient,
  viewerWorkspaceId: string,
  targetWorkspaceId: string,
): Promise<DosConnectedReadAuthorization> {
  if (!targetWorkspaceId || targetWorkspaceId === viewerWorkspaceId) {
    return { ok: false };
  }

  const result = await loadDosDiscipleshipReach(supabase, viewerWorkspaceId);

  if (result.status !== "ready") {
    return { ok: false };
  }

  const entry = result.reach.readable.get(targetWorkspaceId);

  if (!entry) {
    return { ok: false };
  }

  const database = await supabase.rpc("dos_discipleship_readable_workspaces", {
    p_max_depth: dosDiscipleshipGraphLimits.maxDepth,
    p_viewer_workspace_ids: [viewerWorkspaceId],
  });

  if (database.error || !Array.isArray(database.data) || !(database.data as Array<{ workspace_id?: string }>).some((row) => row.workspace_id === targetWorkspaceId)) {
    return { ok: false };
  }

  const account = result.reach.accounts.find((candidate) => candidate.id === entry.viaAccountConnectionId);
  const owner = result.reach.people.find((person) => person.id === entry.viaPersonId);

  return { ok: true, ownerName: owner?.name ?? "Connected account", readable: entry, recordUserId: account?.discipleUserId ?? null };
}
