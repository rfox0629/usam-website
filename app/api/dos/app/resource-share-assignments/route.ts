import { NextResponse } from "next/server";
import { requireDosWorkspaceRouteAccess } from "@/src/lib/dos/api-auth";
import { canWriteDosActivity, getDosAuthorization } from "@/src/lib/dos/auth";
import { resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";
import { asString } from "@/src/lib/dos/review-requests";
import {
  createDosResourceShareAssignment,
  enableDosResourceSharePublicAccess,
  linkDosResourceShareSpouse,
  removeDosResourceShareAssignment,
  restoreDosResourceShareAssignment,
  revokeDosResourceShareAssignment,
} from "@/src/lib/dos/resource-share-links";
import { isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

/* USA-278: creating, revoking and later-linking a sent Library resource.
   Every call proves workspace access first, then proves each person id in the
   body belongs to that workspace. A person id from a request body is never
   taken at face value. */

async function authorizeWrite() {
  const authorization = await getDosAuthorization();

  if (authorization.status === "unauthenticated") {
    return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }

  if (authorization.status === "configuration_error") {
    return { response: NextResponse.json({ error: authorization.message }, { status: 500 }) };
  }

  if (authorization.status === "unauthorized" || !canWriteDosActivity(authorization)) {
    return { response: NextResponse.json({ error: "DOS field app write access required." }, { status: 403 }) };
  }

  if (!isSupabaseAdminConfigured()) {
    return { response: NextResponse.json({ error: "Supabase admin environment variables are not configured." }, { status: 500 }) };
  }

  return { authorization };
}

export async function POST(request: Request) {
  const authResult = await authorizeWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  let payload: Record<string, unknown>;

  try {
    payload = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const workspaceId = await resolveDosAppWorkspaceId(asString(payload.workspaceId));

  if (!workspaceId) {
    return NextResponse.json({ error: "Missionary workspace not found." }, { status: 404 });
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(authResult.authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  try {
    const result = await createDosResourceShareAssignment({
      authorization: authResult.authorization,
      /* The leader's explicit Husband/Wife choice. The library refuses a value
         this resource does not declare, so an absent or invented role is a
         400 rather than a silent default. */
      primaryParticipantRole: asString(payload.personRole),
      primaryPersonId: asString(payload.personId),
      /* The recipient sees who asked, and "who asked" is the workspace's own
         display name -- never an email address. */
      requestedByName: workspaceAccess.workspaceAccess.workspace.displayName,
      resourceSlug: asString(payload.resourceSlug),
      secondaryParticipantName: asString(payload.spouseName),
      secondaryPersonId: asString(payload.spousePersonId) || null,
      workspaceId,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      assignmentId: result.assignment.id,
      ok: true,
      participants: [
        { name: result.assignment.primary_participant_name, role: result.assignment.primary_participant_role },
        { name: result.assignment.secondary_participant_name, role: result.assignment.secondary_participant_role },
      ],
      reused: result.reused,
      /* "Link ready", never "Sent": nothing was delivered by DOS. */
      status: result.assignment.status,
      url: result.url,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create the link." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const authResult = await authorizeWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  let payload: Record<string, unknown>;

  try {
    payload = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const workspaceId = await resolveDosAppWorkspaceId(asString(payload.workspaceId));

  if (!workspaceId) {
    return NextResponse.json({ error: "Missionary workspace not found." }, { status: 404 });
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(authResult.authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  const action = asString(payload.action);
  const assignmentId = asString(payload.assignmentId);

  try {
    if (action === "revoke") {
      const result = await revokeDosResourceShareAssignment({ assignmentId, workspaceId });

      return result.ok
        ? NextResponse.json({ ok: true })
        : NextResponse.json({ error: result.error }, { status: result.status });
    }

    /* USA-281: removal is a separate action from revocation, not a rename of
       it. Revoking only ever applied to a live link; removing has to work on a
       completed assessment too, and it preserves the responses and the result
       either way. The workspace was proved above, so an id belonging to
       another workspace is a 404 inside the library rather than an update
       that finds nothing. */
    if (action === "remove") {
      const result = await removeDosResourceShareAssignment({
        assignmentId,
        removedByUserId: authResult.authorization.status === "authorized" ? authResult.authorization.userId : null,
        workspaceId,
      });

      return result.ok
        ? NextResponse.json({ linkRevoked: result.linkRevoked, ok: true, resultPreserved: result.resultPreserved })
        : NextResponse.json({ error: result.error }, { status: result.status });
    }

    /* Restore brings the record back. It never reopens the link: that is a
       separate, deliberate decision, below. */
    if (action === "restore") {
      const result = await restoreDosResourceShareAssignment({ assignmentId, workspaceId });

      return result.ok
        ? NextResponse.json({ ok: true, publicAccessRestored: false })
        : NextResponse.json({ error: result.error }, { status: result.status });
    }

    if (action === "enable_sharing") {
      const result = await enableDosResourceSharePublicAccess({ assignmentId, workspaceId });

      return result.ok
        ? NextResponse.json({ ok: true })
        : NextResponse.json({ error: result.error }, { status: result.status });
    }

    if (action === "link_spouse") {
      const result = await linkDosResourceShareSpouse({
        assignmentId,
        secondaryPersonId: asString(payload.spousePersonId),
        workspaceId,
      });

      return result.ok
        ? NextResponse.json({ ok: true })
        : NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update the link." }, { status: 500 });
  }
}
