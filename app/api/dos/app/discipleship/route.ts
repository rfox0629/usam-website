import { NextResponse } from "next/server";
import { requireDosWorkspaceRouteAccess } from "@/src/lib/dos/api-auth";
import { canWriteDosActivity, getDosAuthorization, type DosAuthorizedUser } from "@/src/lib/dos/auth";
import { dosConnectedWorkspaceViewFromAppData } from "@/src/lib/dos/discipleship-connected-view";
import {
  authorizeDosConnectedWorkspaceRead,
  dosDiscipleshipAccountColumns,
  dosDiscipleshipConnectionColumns,
  dosDiscipleshipMatchColumns,
  dosDiscipleshipPersonColumns,
  dosWorkspaceScopeFilter,
  isDosDiscipleshipSchemaMissing,
  loadDosDiscipleshipReach,
  loadDosUpstreamViewerNames,
  toDosGraphConnection,
  toDosGraphPerson,
  type DosDiscipleshipAccountRow,
  type DosDiscipleshipConnectionRow,
  type DosDiscipleshipPersonRow,
} from "@/src/lib/dos/discipleship-connections";
import { dosValidateDiscipleshipConnection } from "@/src/lib/dos/discipleship-graph";
import { loadDosAppData, resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";
import { canonicalRelationshipModel, relationshipModelSummary, relationshipScoreFromEngagementLevel, relationshipScoreLabel } from "@/src/lib/dos/relationship-model";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

/* USA-275 — Multiplication: discipleship connections, account connections,
   identity decisions and the read-only connected view.

   Authorization, in order, for every request: a signed-in DOS user; access to
   the workspace named in the request (`requireDosWorkspaceRouteAccess`); then
   the row itself must belong to that workspace (mentor side) or to the
   signed-in account (disciple side). Upstream reads additionally require a
   current discipleship path, checked in TypeScript and in the database. No
   response is cached. */

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, max-age=0" };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { headers: noStore, status });
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asDate(value: unknown) {
  const text = asString(value);

  return /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(Date.parse(`${text}T00:00:00Z`)) ? text : null;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function authorize(requireWrite: boolean) {
  const authorization = await getDosAuthorization();

  if (authorization.status === "unauthenticated") {
    return { response: json({ error: "Authentication required." }, 401) };
  }

  if (authorization.status === "configuration_error") {
    return { response: json({ error: authorization.message }, 500) };
  }

  if (authorization.status === "unauthorized" || (requireWrite && !canWriteDosActivity(authorization))) {
    return { response: json({ error: "DOS field app access required." }, 403) };
  }

  if (!isSupabaseAdminConfigured()) {
    return { response: json({ error: "Supabase admin environment variables are not configured." }, 500) };
  }

  return { authorization };
}

function userIdOf(authorization: DosAuthorizedUser) {
  return "userId" in authorization && typeof authorization.userId === "string" ? authorization.userId : null;
}

const unsupported = () => json({ error: "Discipleship connections are not available in this environment yet." }, 409);

/* ---------- GET: read-only connected view ---------- */

export async function GET(request: Request) {
  const auth = await authorize(false);

  if ("response" in auth) {
    return auth.response;
  }

  const url = new URL(request.url);
  const workspaceId = await resolveDosAppWorkspaceId(asString(url.searchParams.get("workspaceId")));

  if (!workspaceId) {
    return json({ error: "Workspace is required." }, 400);
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(auth.authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  const supabase = createSupabaseAdminClient();
  const targetWorkspaceId = asString(url.searchParams.get("connectedWorkspaceId"));
  const read = await authorizeDosConnectedWorkspaceRead(supabase, workspaceId, targetWorkspaceId);

  if (!read.ok) {
    return json({ error: "Not found." }, 404);
  }

  const loaded = await loadDosAppData({ id: targetWorkspaceId }, null, { connectedRead: { recordUserId: read.recordUserId } });

  if (loaded.status !== "ready") {
    return json({ error: "Not found." }, 404);
  }

  return json({
    view: dosConnectedWorkspaceViewFromAppData(loaded.data, {
      depth: read.readable.depth,
      ownerName: read.ownerName,
      workspaceId: targetWorkspaceId,
    }),
  });
}

/* ---------- POST: every change ---------- */

type Payload = Record<string, unknown>;

export async function POST(request: Request) {
  const auth = await authorize(true);

  if ("response" in auth) {
    return auth.response;
  }

  const payload = await request.json().catch(() => null) as Payload | null;

  if (!payload) {
    return json({ error: "Invalid request." }, 400);
  }

  const workspaceId = await resolveDosAppWorkspaceId(asString(payload.workspaceId));

  if (!workspaceId) {
    return json({ error: "Workspace is required." }, 400);
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(auth.authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  const supabase = createSupabaseAdminClient();
  const authorization = auth.authorization;
  const userId = userIdOf(authorization);
  const now = new Date().toISOString();
  const action = asString(payload.action);

  const loadWorkspacePerson = async (personId: string) => {
    if (!personId) {
      return null;
    }

    const result = await supabase
      .from("missionary_field_people")
      .select(dosDiscipleshipPersonColumns)
      .eq("id", personId)
      .or(dosWorkspaceScopeFilter([workspaceId]))
      .maybeSingle();

    return (result.data as DosDiscipleshipPersonRow | null) ?? null;
  };

  const loadOwnConnection = async (connectionId: string) => {
    const result = await supabase
      .from("dos_discipleship_connections")
      .select(dosDiscipleshipConnectionColumns)
      .eq("id", connectionId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    return { error: result.error, row: (result.data as DosDiscipleshipConnectionRow | null) ?? null };
  };

  switch (action) {
    /* A recorded connection on a Person in this workspace. */
    case "add_connection": {
      const mentorPersonId = asString(payload.mentorPersonId);
      const disciplePersonId = asString(payload.disciplePersonId) || null;
      const [peopleResult, connectionResult, ownerLink] = await Promise.all([
        supabase.from("missionary_field_people").select(dosDiscipleshipPersonColumns).or(dosWorkspaceScopeFilter([workspaceId])),
        supabase.from("dos_discipleship_connections").select(dosDiscipleshipConnectionColumns).eq("workspace_id", workspaceId).eq("status", "active"),
        userId
          ? supabase.from("dos_identity_links").select("person_id").eq("user_id", userId).eq("workspace_id", workspaceId).eq("verification_status", "verified").maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (isDosDiscipleshipSchemaMissing(connectionResult.error)) {
        return unsupported();
      }

      if (peopleResult.error || connectionResult.error) {
        return json({ error: (peopleResult.error ?? connectionResult.error)?.message ?? "Unable to add connection." }, 500);
      }

      const validation = dosValidateDiscipleshipConnection({
        connections: ((connectionResult.data ?? []) as DosDiscipleshipConnectionRow[]).map(toDosGraphConnection),
        discipleName: asString(payload.discipleName),
        disciplePersonId,
        mentorPersonId,
        ownerPersonId: (ownerLink.data as { person_id?: string } | null)?.person_id ?? null,
        people: ((peopleResult.data ?? []) as DosDiscipleshipPersonRow[]).map(toDosGraphPerson).map((person) => ({ ...person, workspaceId })),
        workspaceId,
      });

      if (!validation.ok) {
        return json({ code: validation.code, error: validation.message }, validation.code === "mentor_not_found" || validation.code === "disciple_not_found" ? 404 : 409);
      }

      /* Evidence is linked only when it is this mentor's own Fruit; a
         connection never creates Fruit. */
      let evidenceFruitEventId: string | null = null;
      const evidenceId = asString(payload.evidenceFruitEventId);

      if (evidenceId) {
        const evidence = await supabase.from("fruit_events").select("id, person_id").eq("id", evidenceId).maybeSingle();

        evidenceFruitEventId = (evidence.data as { person_id?: string } | null)?.person_id === mentorPersonId ? evidenceId : null;
      }

      const insert = await supabase
        .from("dos_discipleship_connections")
        .insert({
          created_by_user_id: userId,
          disciple_name: validation.discipleName,
          disciple_person_id: disciplePersonId,
          evidence_fruit_event_id: evidenceFruitEventId,
          mentor_person_id: mentorPersonId,
          started_on: asDate(payload.startedOn),
          status: "active",
          updated_by_user_id: userId,
          workspace_id: workspaceId,
        })
        .select(dosDiscipleshipConnectionColumns)
        .single();

      if (insert.error) {
        return json({ error: insert.error.code === "23505" ? `${validation.discipleName} is already listed.` : insert.error.message }, insert.error.code === "23505" ? 409 : 500);
      }

      return json({ connection: toDosGraphConnection(insert.data as DosDiscipleshipConnectionRow) });
    }

    /* End: no longer current, kept as history. Remove: an accidental entry,
       excluded from history. Neither deletes the row. */
    case "end_connection":
    case "remove_connection": {
      const { error, row } = await loadOwnConnection(asString(payload.connectionId));

      if (isDosDiscipleshipSchemaMissing(error)) {
        return unsupported();
      }

      const allowed = action === "end_connection" ? ["active"] : ["active", "ended"];

      if (!row || !allowed.includes(row.status)) {
        return json({ error: "Connection not found." }, 404);
      }

      const update = await supabase
        .from("dos_discipleship_connections")
        .update(action === "end_connection"
          ? { ended_at: now, status: "ended", updated_by_user_id: userId }
          : { removed_at: now, status: "removed", updated_by_user_id: userId })
        .eq("id", row.id)
        .eq("workspace_id", workspaceId)
        .select(dosDiscipleshipConnectionColumns)
        .single();

      if (update.error) {
        return json({ error: update.error.message }, 500);
      }

      return json({ connection: toDosGraphConnection(update.data as DosDiscipleshipConnectionRow) });
    }

    /* Ending the workspace's own discipleship of a Person: the relationship
       becomes Walking With, and any account connection through it is
       revoked, so every access that ran only through this path ends and a
       later reconnection needs a new acceptance. Stage, history, Fruit,
       circles and every record stay exactly as they are. */
    case "end_person_discipleship": {
      const personId = asString(payload.personId);
      const personResult = await supabase
        .from("missionary_field_people")
        .select("id, role_in_my_life, discipleship_stage, relationship_context")
        .eq("id", personId)
        .or(dosWorkspaceScopeFilter([workspaceId]))
        .maybeSingle();
      const person = personResult.data as { discipleship_stage: string | null; id: string; relationship_context: string | null; role_in_my_life: string | null } | null;

      if (!person) {
        return json({ error: "Person not found." }, 404);
      }

      if (person.role_in_my_life !== "discipling_them") {
        return json({ error: "This person is not currently recorded as someone you disciple." }, 409);
      }

      const model = canonicalRelationshipModel({
        discipleshipStage: person.discipleship_stage,
        relationshipContext: person.relationship_context,
        relationshipType: "walking_with",
        roleInMyLife: "walking_with_them",
      });
      const personUpdate = await supabase
        .from("missionary_field_people")
        .update({
          discipleship_stage: model.discipleshipStage,
          relationship_context: model.relationshipContext,
          relationship_type: relationshipModelSummary(model),
          role_in_my_life: model.roleInMyLife,
          updated_at: now,
        })
        .eq("id", person.id)
        .or(dosWorkspaceScopeFilter([workspaceId]));

      if (personUpdate.error) {
        return json({ error: personUpdate.error.message }, 500);
      }

      const revoke = await supabase
        .from("dos_discipleship_account_connections")
        .update({ revoked_at: now, revoked_by_user_id: userId, status: "revoked", updated_at: now })
        .eq("mentor_workspace_id", workspaceId)
        .eq("person_id", person.id)
        .in("status", ["pending", "accepted"]);

      if (revoke.error && !isDosDiscipleshipSchemaMissing(revoke.error)) {
        return json({ error: revoke.error.message }, 500);
      }

      return json({ person: { id: person.id, roleInMyLife: model.roleInMyLife } });
    }

    /* ---------- account connections, mentor side ---------- */

    case "invite_account": {
      const person = await loadWorkspacePerson(asString(payload.personId));
      const email = asString(payload.email).toLowerCase();

      if (!person || person.status === "archived") {
        return json({ error: "Person not found." }, 404);
      }

      if (!emailPattern.test(email)) {
        return json({ error: "Enter the email address they sign in to DOS with." }, 400);
      }

      const insert = await supabase
        .from("dos_discipleship_account_connections")
        .insert({ invite_email: email, invited_by_user_id: userId, mentor_workspace_id: workspaceId, person_id: person.id, status: "pending" })
        .select(dosDiscipleshipAccountColumns)
        .single();

      if (isDosDiscipleshipSchemaMissing(insert.error)) {
        return unsupported();
      }

      if (insert.error) {
        return json({ error: insert.error.code === "23505" ? "An invitation or connection already exists for this person." : insert.error.message }, insert.error.code === "23505" ? 409 : 500);
      }

      const row = insert.data as DosDiscipleshipAccountRow;

      return json({ account: { acceptedAt: null, id: row.id, inviteEmail: row.invite_email, personId: row.person_id, status: "pending" } });
    }

    case "cancel_invite":
    case "disconnect_account": {
      const id = asString(payload.accountConnectionId);
      const fromStatuses = action === "cancel_invite" ? ["pending"] : ["pending", "accepted"];
      const update = await supabase
        .from("dos_discipleship_account_connections")
        .update(action === "cancel_invite"
          ? { status: "canceled", updated_at: now }
          : { revoked_at: now, revoked_by_user_id: userId, status: "revoked", updated_at: now })
        .eq("id", id)
        .eq("mentor_workspace_id", workspaceId)
        .in("status", fromStatuses)
        .select("id");

      if (isDosDiscipleshipSchemaMissing(update.error)) {
        return unsupported();
      }

      if (update.error) {
        return json({ error: update.error.message }, 500);
      }

      if (!update.data?.length) {
        return json({ error: "Connection not found." }, 404);
      }

      return json({ ok: true });
    }

    /* ---------- account connections, disciple side ---------- */

    case "accept_account":
    case "decline_account":
    case "leave_account": {
      if (authorization.access !== "member" || !userId) {
        return json({ error: "Sign in with your own DOS account to respond." }, 403);
      }

      const id = asString(payload.accountConnectionId);
      const rowResult = await supabase.from("dos_discipleship_account_connections").select(dosDiscipleshipAccountColumns).eq("id", id).maybeSingle();

      if (isDosDiscipleshipSchemaMissing(rowResult.error)) {
        return unsupported();
      }

      const row = rowResult.data as DosDiscipleshipAccountRow | null;
      const email = authorization.email.trim().toLowerCase();

      if (action === "leave_account") {
        if (!row || row.status !== "accepted" || row.disciple_user_id !== userId || row.disciple_workspace_id !== workspaceId) {
          return json({ error: "Connection not found." }, 404);
        }

        const update = await supabase
          .from("dos_discipleship_account_connections")
          .update({ revoked_at: now, revoked_by_user_id: userId, status: "revoked", updated_at: now })
          .eq("id", row.id)
          .eq("status", "accepted");

        return update.error ? json({ error: update.error.message }, 500) : json({ ok: true });
      }

      /* An invitation is visible and answerable only by the account whose
         authenticated email it names. */
      if (!row || row.status !== "pending" || row.invite_email !== email) {
        return json({ error: "Invitation not found." }, 404);
      }

      if (action === "decline_account") {
        const update = await supabase
          .from("dos_discipleship_account_connections")
          .update({ declined_at: now, status: "declined", updated_at: now })
          .eq("id", row.id)
          .eq("status", "pending");

        return update.error ? json({ error: update.error.message }, 500) : json({ ok: true });
      }

      if (payload.visibilityExplained !== true) {
        return json({ error: "Review who will be able to view your DOS information before accepting." }, 400);
      }

      if (row.mentor_workspace_id === workspaceId) {
        return json({ error: "An invitation can't connect a workspace to itself." }, 409);
      }

      /* Cycle: if this workspace can already view the inviting workspace,
         accepting would make each view the other. */
      const reach = await loadDosDiscipleshipReach(supabase, workspaceId);

      if (reach.status !== "ready") {
        return reach.status === "missing" ? unsupported() : json({ error: reach.message }, 500);
      }

      if (reach.reach.readable.has(row.mentor_workspace_id)) {
        return json({ code: "cycle", error: "This workspace already views the inviting workspace, so this connection would loop." }, 409);
      }

      const existingLinks = await supabase
        .from("dos_identity_links")
        .select("id, user_id, person_id, workspace_id, verification_status")
        .eq("verification_status", "verified")
        .or(`person_id.eq.${row.person_id},and(user_id.eq.${userId},workspace_id.eq.${row.mentor_workspace_id})`);

      if (existingLinks.error) {
        return json({ error: existingLinks.error.message }, 500);
      }

      const links = (existingLinks.data ?? []) as Array<{ id: string; person_id: string; user_id: string; workspace_id: string }>;

      if (links.some((link) => link.person_id === row.person_id && link.user_id !== userId)) {
        return json({ error: "That Person record is already connected to a different account." }, 409);
      }

      if (links.some((link) => link.user_id === userId && link.workspace_id === row.mentor_workspace_id && link.person_id !== row.person_id)) {
        return json({ error: "Your account is already linked to a different Person in that workspace." }, 409);
      }

      const linkResult = await supabase
        .from("dos_identity_links")
        .upsert({
          match_reasons: ["discipleship_invitation_accepted"],
          person_id: row.person_id,
          user_id: userId,
          verification_method: "discipleship_account_acceptance",
          verification_status: "verified",
          verified_at: now,
          verified_by_user_id: userId,
          workspace_id: row.mentor_workspace_id,
        }, { onConflict: "user_id,workspace_id,person_id" })
        .select("id")
        .single();

      if (linkResult.error) {
        return json({ error: linkResult.error.message }, 500);
      }

      const upstreamViewerNames = await loadDosUpstreamViewerNames(supabase, row.mentor_workspace_id);
      const update = await supabase
        .from("dos_discipleship_account_connections")
        .update({
          accepted_at: now,
          disciple_user_id: userId,
          disciple_workspace_id: workspaceId,
          identity_link_id: (linkResult.data as { id: string }).id,
          status: "accepted",
          updated_at: now,
          upstream_viewer_names: upstreamViewerNames,
          visibility_explained_at: now,
        })
        .eq("id", row.id)
        .eq("status", "pending")
        .select("id");

      if (update.error) {
        return json({ error: update.error.message }, 500);
      }

      if (!update.data?.length) {
        return json({ error: "Invitation not found." }, 404);
      }

      return json({ ok: true, upstreamViewerNames });
    }

    /* ---------- identity decisions, disciple side ---------- */

    case "confirm_match":
    case "decline_match": {
      if (authorization.access !== "member" || !userId) {
        return json({ error: "Sign in with your own DOS account to confirm." }, 403);
      }

      const accountResult = await supabase
        .from("dos_discipleship_account_connections")
        .select(dosDiscipleshipAccountColumns)
        .eq("id", asString(payload.accountConnectionId))
        .eq("status", "accepted")
        .eq("disciple_user_id", userId)
        .eq("disciple_workspace_id", workspaceId)
        .maybeSingle();

      if (isDosDiscipleshipSchemaMissing(accountResult.error)) {
        return unsupported();
      }

      const account = accountResult.data as DosDiscipleshipAccountRow | null;

      if (!account) {
        return json({ error: "Connection not found." }, 404);
      }

      const connectionResult = await supabase
        .from("dos_discipleship_connections")
        .select(dosDiscipleshipConnectionColumns)
        .eq("id", asString(payload.connectionId))
        .eq("workspace_id", account.mentor_workspace_id)
        .eq("mentor_person_id", account.person_id)
        .eq("status", "active")
        .maybeSingle();
      const connection = connectionResult.data as DosDiscipleshipConnectionRow | null;

      if (!connection) {
        return json({ error: "Entry not found." }, 404);
      }

      let matchedPersonId: string | null = null;
      let createdPerson = false;

      if (action === "confirm_match") {
        if (asString(payload.mode) === "existing") {
          const person = await loadWorkspacePerson(asString(payload.personId));

          if (!person || person.status === "archived") {
            return json({ error: "Choose a person in your workspace." }, 404);
          }

          matchedPersonId = person.id;
        } else {
          /* One new Person in the disciple's own workspace, recorded as
             someone they disciple. Circles are never touched. */
          const model = canonicalRelationshipModel({ relationshipType: "discipling", roleInMyLife: "discipling_them" });
          const insert = await supabase
            .from("missionary_field_people")
            .insert({
              created_by: userId,
              discipleship_stage: model.discipleshipStage,
              engagement_level: relationshipScoreLabel(relationshipScoreFromEngagementLevel(undefined)),
              household_id: workspaceId,
              name: connection.disciple_name,
              phone: "",
              relationship_context: model.relationshipContext,
              relationship_type: relationshipModelSummary(model),
              role_in_my_life: model.roleInMyLife,
              source: "field",
              status: "new",
              workspace_id: workspaceId,
            })
            .select("id")
            .single();

          if (insert.error) {
            return json({ error: insert.error.message }, 500);
          }

          matchedPersonId = String((insert.data as { id: string }).id);
          createdPerson = true;
        }
      }

      const decision = await supabase
        .from("dos_discipleship_identity_matches")
        .insert({
          account_connection_id: account.id,
          connection_id: connection.id,
          created_person: createdPerson,
          decided_at: now,
          decided_by_user_id: userId,
          matched_person_id: matchedPersonId,
          matched_workspace_id: workspaceId,
          status: action === "confirm_match" ? "confirmed" : "declined",
        })
        .select(dosDiscipleshipMatchColumns)
        .single();

      if (decision.error) {
        return json({ error: decision.error.code === "23505" ? "This entry was already answered." : decision.error.message }, decision.error.code === "23505" ? 409 : 500);
      }

      return json({ match: decision.data, personId: matchedPersonId });
    }

    /* A mistaken match is corrected by undoing it. The records separate
       again; a Person created by confirming stays, with anything added to it. */
    case "undo_match": {
      const update = await supabase
        .from("dos_discipleship_identity_matches")
        .update({ status: "undone", undone_at: now, undone_by_user_id: userId })
        .eq("id", asString(payload.matchId))
        .eq("matched_workspace_id", workspaceId)
        .in("status", ["confirmed", "declined"])
        .select("id");

      if (isDosDiscipleshipSchemaMissing(update.error)) {
        return unsupported();
      }

      if (update.error) {
        return json({ error: update.error.message }, 500);
      }

      if (!update.data?.length) {
        return json({ error: "Decision not found." }, 404);
      }

      return json({ ok: true });
    }

    default:
      return json({ error: "Unknown action." }, 400);
  }
}
