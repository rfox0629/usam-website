import "server-only";

import { randomBytes } from "node:crypto";
import type { DosAuthorizedUser } from "@/src/lib/dos/auth";
import { isMissingWorkspaceScopeColumn } from "@/src/lib/dos/missionary-app";
import { getDosResourceBySlug, type DosAssessmentQuestion, type DosResource } from "@/src/lib/dos/resource-catalog";
import {
  cleanShareParticipantName,
  dosResourceShareLifetimeDays,
  dosResourceSharePath,
  isAssessmentRoleFor,
  isDosResourceShareEnabled,
  isValidDosResourceShareToken,
  oppositeAssessmentRole,
  resourceShareParticipantRoles,
  shareRequesterDisplayName,
  type DosResourceShareStatus,
} from "@/src/lib/dos/resource-sharing";
import {
  buildAssessmentAnswerPayload,
  isAssessmentComplete,
  normalizeAssessmentAnswers,
  summarizeAssessment,
  type AssessmentAnswerMap,
  type AssessmentSummary,
} from "@/src/lib/dos/assessment-scoring";
import { getCanonicalSiteUrl } from "@/src/lib/site-url";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type SupabaseError = { message?: string } | null | undefined;

const shareTable = "dos_resource_share_assignments";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type DosResourceShareRow = {
  completed_at: string | null;
  created_at: string;
  expires_at: string;
  id: string;
  opened_at: string | null;
  primary_participant_name: string;
  primary_participant_role: string;
  primary_person_id: string;
  /* USA-281: set when a workspace member takes this assessment off the
     record. Present only once the removal migration is applied, so every read
     that asks for it falls back to the old column list. */
  removed_at?: string | null;
  requested_by_name: string | null;
  resource_slug: string;
  responses: Record<string, unknown> | null;
  result_id: string | null;
  revoked_at: string | null;
  secondary_participant_name: string;
  secondary_participant_role: string;
  secondary_person_id: string | null;
  started_at: string | null;
  status: DosResourceShareStatus;
  token: string;
  updated_at: string;
  workspace_id: string;
};

const shareColumns = "id, workspace_id, resource_slug, primary_person_id, secondary_person_id, primary_participant_name, secondary_participant_name, primary_participant_role, secondary_participant_role, requested_by_name, status, token, expires_at, opened_at, started_at, completed_at, revoked_at, responses, result_id, created_at, updated_at";

/* USA-281: the same list plus the removal columns. Asked for first, so that a
   removed assessment is refused everywhere; falls back to shareColumns when
   the migration has not been applied yet, which is the pre-removal behaviour
   and correct until then. */
const shareColumnsWithRemoval = `${shareColumns}, removed_at, removed_by_user_id`;

export function isMissingResourceShareRemovalColumn(error: SupabaseError) {
  const message = error?.message?.toLowerCase() ?? "";

  return (message.includes("removed_at") || message.includes("removed_by_user_id"))
    && (message.includes("does not exist") || message.includes("schema cache") || message.includes("could not find"));
}

export function isMissingResourceShareTable(error: SupabaseError) {
  const message = error?.message?.toLowerCase() ?? "";

  return message.includes(shareTable)
    && (message.includes("does not exist") || message.includes("schema cache") || message.includes("could not find"));
}

export function isUuidValue(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

function shareToken() {
  return randomBytes(24).toString("base64url");
}

function shareExpiresAt() {
  return new Date(Date.now() + dosResourceShareLifetimeDays * 24 * 60 * 60 * 1000).toISOString();
}

export function dosResourceShareUrl(token: string) {
  return new URL(dosResourceSharePath(token), getCanonicalSiteUrl()).toString();
}

function isExpired(row: Pick<DosResourceShareRow, "expires_at">) {
  const expiry = new Date(row.expires_at).getTime();

  return Number.isFinite(expiry) && expiry <= Date.now();
}

/* One place that answers "is this person in this workspace?", with the same
   legacy-column fallback the rest of the DOS API uses. Every create, link and
   revoke goes through it: a person id from a request body is never trusted. */
export async function dosPersonBelongsToWorkspace(personId: string, workspaceId: string) {
  const supabase = createSupabaseAdminClient();
  const scopedResult = await supabase
    .from("missionary_field_people")
    .select("id, name, spouse_name")
    .eq("id", personId)
    .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
    .maybeSingle();
  const result = scopedResult.error && isMissingWorkspaceScopeColumn(scopedResult.error)
    ? await supabase
      .from("missionary_field_people")
      .select("id, name, spouse_name")
      .eq("id", personId)
      .eq("household_id", workspaceId)
      .maybeSingle()
    : scopedResult;

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data ?? null) as { id: string; name: string | null; spouse_name: string | null } | null;
}

type CreateShareInput = {
  authorization: DosAuthorizedUser;
  /* Which role the person chosen first answers as. Required: it is the
     leader's explicit choice, never inferred from order or from a name. */
  primaryParticipantRole: string;
  primaryPersonId: string;
  requestedByName: string | null;
  resourceSlug: string;
  secondaryParticipantName: string;
  secondaryPersonId: string | null;
  workspaceId: string;
};

export type CreateShareResult =
  | {
    assignment: DosResourceShareRow;
    ok: true;
    resource: DosResource;
    reused: boolean;
    url: string;
  }
  | { error: string; ok: false; status: number };

/* Creating a link is deliberately idempotent for a couple: re-running "Send
   assessment" returns the link that already exists instead of splitting their
   responses across two assignments. "The same couple" is whoever already has
   an open link for this resource, whichever side of it they are on and
   whether the spouse is a contact or just a name -- sending to the wife when
   the husband already has one is the same assessment. A completed assessment
   is never reused: that is how a repeat assessment stays a distinct record.

   One open assignment per person per resource suits a marriage, where a
   person has one spouse. A resource where someone pairs with several people
   (Friendship) will need its own rule before it is made sendable. */
/* An open link that ran out its 90 days is settled as `expired` before a new
   one is created. Without this the partial unique index would keep the dead
   link's slot and a couple could never be sent a fresh assessment. */
async function settleExpiredAssignments(workspaceId: string, resourceSlug: string) {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();

  return supabase
    .from(shareTable)
    .update({ status: "expired" })
    .eq("workspace_id", workspaceId)
    .eq("resource_slug", resourceSlug)
    .in("status", ["link_ready", "in_progress"])
    .lte("expires_at", now);
}

async function findOpenAssignmentForCouple({
  primaryPersonId,
  resourceSlug,
  secondaryPersonId,
  workspaceId,
}: {
  primaryPersonId: string;
  resourceSlug: string;
  secondaryPersonId: string | null;
  workspaceId: string;
}) {
  const supabase = createSupabaseAdminClient();
  const personIds = [primaryPersonId, ...(secondaryPersonId ? [secondaryPersonId] : [])];
  const result = await supabase
    .from(shareTable)
    .select(shareColumns)
    .eq("workspace_id", workspaceId)
    .eq("resource_slug", resourceSlug)
    .in("status", ["link_ready", "in_progress"])
    .or(`primary_person_id.in.(${personIds.join(",")}),secondary_person_id.in.(${personIds.join(",")})`)
    .order("created_at", { ascending: false });

  if (result.error) {
    return result;
  }

  const rows = (result.data ?? []) as DosResourceShareRow[];
  const requestedPeople = new Set(personIds);
  const match = rows.find((row) => {
    if (isExpired(row)) {
      return false;
    }

    /* Either participant of an open row being one of the people named in this
       request makes it the same assessment. That covers the mirror (sent from
       the other spouse), a spouse promoted from a typed name to a contact, and
       a plain re-send. */
    return [row.primary_person_id, row.secondary_person_id]
      .filter(Boolean)
      .some((personId) => requestedPeople.has(personId as string));
  }) ?? null;

  return { data: match, error: null };
}

export async function createDosResourceShareAssignment(input: CreateShareInput): Promise<CreateShareResult> {
  if (!isSupabaseAdminConfigured()) {
    return { error: "Supabase admin environment variables are not configured.", ok: false, status: 500 };
  }

  const resource = getDosResourceBySlug(input.resourceSlug);

  if (!resource || !isDosResourceShareEnabled(resource)) {
    return { error: "This resource cannot be sent yet.", ok: false, status: 400 };
  }

  if (!isUuidValue(input.primaryPersonId)) {
    return { error: "Select a person to send this to.", ok: false, status: 400 };
  }

  if (input.secondaryPersonId && !isUuidValue(input.secondaryPersonId)) {
    return { error: "The selected spouse is invalid.", ok: false, status: 400 };
  }

  if (input.secondaryPersonId === input.primaryPersonId) {
    return { error: "A person cannot be both participants.", ok: false, status: 400 };
  }

  const secondaryParticipantName = cleanShareParticipantName(input.secondaryParticipantName);

  if (!secondaryParticipantName) {
    return { error: "Add the spouse's name, or select their contact.", ok: false, status: 400 };
  }

  /* The role has to be one this resource declares. Defaulting it here would
     reintroduce exactly the assumption this release removes. */
  if (!isAssessmentRoleFor(resource, input.primaryParticipantRole)) {
    return { error: "Choose which role this person answers as.", ok: false, status: 400 };
  }

  const primaryRole = input.primaryParticipantRole;
  const secondaryRole = oppositeAssessmentRole(resource, primaryRole);

  const [primaryPerson, secondaryPerson] = await Promise.all([
    dosPersonBelongsToWorkspace(input.primaryPersonId, input.workspaceId),
    input.secondaryPersonId ? dosPersonBelongsToWorkspace(input.secondaryPersonId, input.workspaceId) : Promise.resolve(null),
  ]);

  if (!primaryPerson) {
    return { error: "That person is not in this workspace.", ok: false, status: 403 };
  }

  if (input.secondaryPersonId && !secondaryPerson) {
    return { error: "That spouse is not in this workspace.", ok: false, status: 403 };
  }

  const settled = await settleExpiredAssignments(input.workspaceId, resource.slug);

  if (settled.error) {
    if (isMissingResourceShareTable(settled.error)) {
      return { error: "Resource sending is not installed yet.", ok: false, status: 503 };
    }

    return { error: settled.error.message, ok: false, status: 500 };
  }

  const existing = await findOpenAssignmentForCouple({
    primaryPersonId: input.primaryPersonId,
    resourceSlug: resource.slug,
    secondaryPersonId: input.secondaryPersonId,
    workspaceId: input.workspaceId,
  });

  if (existing.error) {
    if (isMissingResourceShareTable(existing.error)) {
      return { error: "Resource sending is not installed yet.", ok: false, status: 503 };
    }

    return { error: existing.error.message ?? "Unable to read existing assignments.", ok: false, status: 500 };
  }

  if (existing.data) {
    return {
      assignment: existing.data,
      ok: true,
      resource,
      reused: true,
      url: dosResourceShareUrl(existing.data.token),
    };
  }

  const supabase = createSupabaseAdminClient();
  const insert = await supabase
    .from(shareTable)
    .insert({
      expires_at: shareExpiresAt(),
      primary_participant_name: cleanShareParticipantName(primaryPerson.name) || primaryRole,
      primary_participant_role: primaryRole,
      primary_person_id: input.primaryPersonId,
      requested_by_name: cleanShareParticipantName(input.requestedByName) || null,
      requested_by_user_id: input.authorization.userId,
      resource_slug: resource.slug,
      responses: {},
      secondary_participant_name: secondaryParticipantName,
      secondary_participant_role: secondaryRole,
      secondary_person_id: input.secondaryPersonId,
      status: "link_ready",
      token: shareToken(),
      workspace_id: input.workspaceId,
    })
    .select(shareColumns)
    .single();

  if (insert.error) {
    if (isMissingResourceShareTable(insert.error)) {
      return { error: "Resource sending is not installed yet.", ok: false, status: 503 };
    }

    return { error: insert.error.message, ok: false, status: 500 };
  }

  const assignment = insert.data as DosResourceShareRow;

  /* Link creation is a link, not a delivery: DOS adds no email or SMS
     provider for this, and the log says so plainly. */
  console.info("[DOS resource send]", {
    deliveryChannel: "link",
    event: "link_created",
    providerRequestStatus: "not_attempted",
    resourceSlug: assignment.resource_slug,
    shareAssignmentId: assignment.id,
    workspaceId: assignment.workspace_id,
  });

  return { assignment, ok: true, resource, reused: false, url: dosResourceShareUrl(assignment.token) };
}

export async function revokeDosResourceShareAssignment({
  assignmentId,
  workspaceId,
}: {
  assignmentId: string;
  workspaceId: string;
}) {
  if (!isUuidValue(assignmentId)) {
    return { error: "Assignment is invalid.", ok: false as const, status: 400 };
  }

  const supabase = createSupabaseAdminClient();
  const result = await supabase
    .from(shareTable)
    .update({ revoked_at: new Date().toISOString(), status: "revoked" })
    .eq("id", assignmentId)
    .eq("workspace_id", workspaceId)
    .in("status", ["link_ready", "in_progress"])
    .select("id")
    .maybeSingle();

  if (result.error) {
    if (isMissingResourceShareTable(result.error)) {
      return { error: "Resource sending is not installed yet.", ok: false as const, status: 503 };
    }

    return { error: result.error.message, ok: false as const, status: 500 };
  }

  return result.data?.id
    ? { id: result.data.id, ok: true as const }
    : { error: "That link is no longer active.", ok: false as const, status: 404 };
}

/* USA-281: taking a sent assessment off the record.

   This is NOT revocation with a different name. Revoking kills a live link and
   is refused on anything already finished. Removal has to work on a completed
   assessment too, which is the case the deployed Journey control never
   covered, and a completed row cannot be marked revoked at all: the table's
   completed_check and revoked_check constraints contradict each other on one
   row.

   So removal always sets removed_at, and additionally revokes when there is a
   live link to revoke. Answers, completed_at, result_id and the
   dos_assessment_results row are never touched, in either shape. */
type ShareRemovalTarget = Pick<DosResourceShareRow, "completed_at" | "id" | "result_id" | "status"> & { removed_at?: string | null };

async function loadShareAssignmentForRemoval(assignmentId: string, workspaceId: string) {
  const supabase = createSupabaseAdminClient();
  const columns = "id, status, completed_at, result_id, removed_at";
  const scoped = await supabase
    .from(shareTable)
    .select(columns)
    .eq("id", assignmentId)
    /* Workspace scoping is part of the lookup, so an id from another
       workspace is a 404 before anything is read, not after. */
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (scoped.error && isMissingResourceShareRemovalColumn(scoped.error)) {
    return supabase
      .from(shareTable)
      .select("id, status, completed_at, result_id")
      .eq("id", assignmentId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
  }

  return scoped;
}

export async function removeDosResourceShareAssignment({
  assignmentId,
  removedByUserId,
  workspaceId,
}: {
  assignmentId: string;
  removedByUserId: string | null;
  workspaceId: string;
}) {
  if (!isUuidValue(assignmentId)) {
    return { error: "Assessment is invalid.", ok: false as const, status: 400 };
  }

  const supabase = createSupabaseAdminClient();
  const existing = await loadShareAssignmentForRemoval(assignmentId, workspaceId);

  if (existing.error) {
    if (isMissingResourceShareTable(existing.error)) {
      return { error: "Resource sending is not installed yet.", ok: false as const, status: 503 };
    }

    return { error: existing.error.message, ok: false as const, status: 500 };
  }

  const row = existing.data as ShareRemovalTarget | null;

  if (!row) {
    return { error: "That assessment is not on this record.", ok: false as const, status: 404 };
  }

  if (row.removed_at) {
    return { error: "That assessment has already been removed.", ok: false as const, status: 404 };
  }

  const now = new Date().toISOString();
  const wasCompleted = row.status === "completed";
  const hadLiveLink = row.status === "link_ready" || row.status === "in_progress";
  const update: Record<string, unknown> = {
    removed_at: now,
    removed_by_user_id: removedByUserId,
  };

  /* A link someone may already be holding is revoked as part of removal, so
     an unfinished assessment cannot be opened or answered afterwards. A
     completed row keeps its status, and the token path refuses it on
     removed_at instead. */
  if (hadLiveLink) {
    update.revoked_at = now;
    update.status = "revoked";
  }

  const result = await supabase
    .from(shareTable)
    .update(update)
    .eq("id", assignmentId)
    .eq("workspace_id", workspaceId)
    .is("removed_at", null)
    .select("id")
    .maybeSingle();

  if (result.error) {
    if (isMissingResourceShareRemovalColumn(result.error)) {
      return { error: "Removing an assessment is not installed yet.", ok: false as const, status: 503 };
    }

    if (isMissingResourceShareTable(result.error)) {
      return { error: "Resource sending is not installed yet.", ok: false as const, status: 503 };
    }

    return { error: result.error.message, ok: false as const, status: 500 };
  }

  return result.data?.id
    ? { id: result.data.id, linkRevoked: hadLiveLink, ok: true as const, resultPreserved: wasCompleted && Boolean(row.result_id) }
    : { error: "That assessment is not on this record.", ok: false as const, status: 404 };
}

/* The inverse, for a removal made by mistake. It clears removed_at and
   nothing else. A link revoked as part of removing an unfinished assessment
   stays revoked on purpose: a public URL that was withdrawn should not start
   working again because someone pressed undo. Restoring a completed
   assessment brings back the whole record, its answers and its result. */
export async function restoreDosResourceShareAssignment({
  assignmentId,
  workspaceId,
}: {
  assignmentId: string;
  workspaceId: string;
}) {
  if (!isUuidValue(assignmentId)) {
    return { error: "Assessment is invalid.", ok: false as const, status: 400 };
  }

  const supabase = createSupabaseAdminClient();
  const result = await supabase
    .from(shareTable)
    .update({ removed_at: null, removed_by_user_id: null })
    .eq("id", assignmentId)
    .eq("workspace_id", workspaceId)
    .not("removed_at", "is", null)
    .select("id")
    .maybeSingle();

  if (result.error) {
    if (isMissingResourceShareRemovalColumn(result.error)) {
      return { error: "Removing an assessment is not installed yet.", ok: false as const, status: 503 };
    }

    if (isMissingResourceShareTable(result.error)) {
      return { error: "Resource sending is not installed yet.", ok: false as const, status: 503 };
    }

    return { error: result.error.message, ok: false as const, status: 500 };
  }

  return result.data?.id
    ? { id: result.data.id, ok: true as const }
    : { error: "That assessment was not removed.", ok: false as const, status: 404 };
}

/* Linking a spouse's contact record after the fact. Responses are untouched:
   the entered participant name stays as the attribution, the People record is
   added beside it. */
export async function linkDosResourceShareSpouse({
  assignmentId,
  secondaryPersonId,
  workspaceId,
}: {
  assignmentId: string;
  secondaryPersonId: string;
  workspaceId: string;
}) {
  if (!isUuidValue(assignmentId) || !isUuidValue(secondaryPersonId)) {
    return { error: "Assignment or contact is invalid.", ok: false as const, status: 400 };
  }

  const person = await dosPersonBelongsToWorkspace(secondaryPersonId, workspaceId);

  if (!person) {
    return { error: "That contact is not in this workspace.", ok: false as const, status: 403 };
  }

  const supabase = createSupabaseAdminClient();
  const result = await supabase
    .from(shareTable)
    .update({ secondary_person_id: secondaryPersonId })
    .eq("id", assignmentId)
    .eq("workspace_id", workspaceId)
    .neq("primary_person_id", secondaryPersonId)
    .select("id, result_id")
    .maybeSingle();

  if (result.error) {
    if (isMissingResourceShareTable(result.error)) {
      return { error: "Resource sending is not installed yet.", ok: false as const, status: 503 };
    }

    return { error: result.error.message, ok: false as const, status: 500 };
  }

  if (!result.data?.id) {
    return { error: "That assignment is not available.", ok: false as const, status: 404 };
  }

  /* A result that already exists follows the link, so the completed
     assessment shows on both People records without a second submission. */
  if (result.data.result_id) {
    await supabase
      .from("dos_assessment_results")
      .update({ secondary_person_id: secondaryPersonId })
      .eq("id", result.data.result_id)
      .eq("workspace_id", workspaceId);
  }

  return { id: result.data.id, ok: true as const };
}

export type DosResourceShareLinkState =
  | {
    assessment: {
      maxScore: number;
      participants: readonly string[];
      questions: readonly DosAssessmentQuestion[];
    };
    completedAt: string | null;
    description: string;
    participants: Array<{ name: string; role: string }>;
    requestedByName: string;
    resourceSlug: string;
    responses: AssessmentAnswerMap;
    status: "ready";
    title: string;
    token: string;
    typeLabel: string;
  }
  /* USA-280: a completed link is no longer a dead end. The couple who
     answered can reopen it and read their own report, for as long as the
     link itself remains valid. Expiry and revocation still cut it off, and
     the payload is still only this one assignment. */
  | {
    completedAt: string | null;
    expiresAt: string | null;
    participants: Array<{ name: string; role: string }>;
    report: AssessmentSummary;
    requestedByName: string;
    resourceSlug: string;
    responses: AssessmentAnswerMap;
    status: "completed";
    title: string;
    questions: readonly DosAssessmentQuestion[];
  }
  | { status: "expired" | "invalid" | "not_configured" | "revoked" };

/* Everything the recipient page is allowed to know. Only the two participant
   names and one requester display name cross the token boundary: no contact
   record, no notes, no other assignment, no workspace identity. */
export async function loadDosResourceShareLink(token: string): Promise<DosResourceShareLinkState> {
  if (!isSupabaseAdminConfigured()) {
    return { status: "not_configured" };
  }

  if (!isValidDosResourceShareToken(token)) {
    return { status: "invalid" };
  }

  const { data, error } = await selectShareRowByToken(token);

  if (error) {
    return isMissingResourceShareTable(error) ? { status: "not_configured" } : { status: "invalid" };
  }

  if (!data) {
    return { status: "invalid" };
  }

  const row = data as DosResourceShareRow;
  const resource = getDosResourceBySlug(row.resource_slug);
  const assessment = resource?.content?.assessment ?? null;

  if (!resource || !assessment || !isDosResourceShareEnabled(resource)) {
    return { status: "invalid" };
  }

  /* USA-281: a removed assessment is refused here, ahead of the completed
     branch below. This is the check that stops a removed RESULT from staying
     readable through a link the couple already has. */
  if (row.removed_at) {
    return { status: "revoked" };
  }

  if (row.status === "revoked") {
    return { status: "revoked" };
  }

  /* A revoked or expired link is refused above and below this branch, so
     reopening a completed one never outlives the access it was given. */
  if (row.status === "completed") {
    if (isExpired(row)) {
      return { status: "expired" };
    }

    const participantRoles = [row.primary_participant_role, row.secondary_participant_role];
    const completedAnswers = normalizeAssessmentAnswers(row.responses, assessment.questions, participantRoles);

    return {
      completedAt: row.completed_at,
      expiresAt: row.expires_at,
      participants: [
        { name: row.primary_participant_name, role: row.primary_participant_role },
        { name: row.secondary_participant_name, role: row.secondary_participant_role },
      ],
      questions: assessment.questions,
      report: summarizeAssessment({
        answers: completedAnswers,
        maxScore: assessment.maxScore,
        participants: participantRoles,
        questions: assessment.questions,
      }),
      requestedByName: shareRequesterDisplayName(row.requested_by_name),
      resourceSlug: row.resource_slug,
      responses: completedAnswers,
      status: "completed",
      title: resource.title,
    };
  }

  if (row.status === "expired" || isExpired(row)) {
    return { status: "expired" };
  }

  return {
    assessment: {
      maxScore: assessment.maxScore,
      participants: [row.primary_participant_role, row.secondary_participant_role],
      questions: assessment.questions,
    },
    completedAt: row.completed_at,
    description: resource.description,
    participants: [
      { name: row.primary_participant_name, role: row.primary_participant_role },
      { name: row.secondary_participant_name, role: row.secondary_participant_role },
    ],
    requestedByName: shareRequesterDisplayName(row.requested_by_name),
    resourceSlug: row.resource_slug,
    responses: normalizeAssessmentAnswers(row.responses, assessment.questions, [row.primary_participant_role, row.secondary_participant_role]),
    status: "ready",
    title: resource.title,
    token: row.token,
    typeLabel: "Assessment",
  };
}

/* Every token read goes through here, so that removal cuts off public access
   in one place rather than in each caller. The removal columns are asked for
   first and the old list is used when they are not there yet. */
async function selectShareRowByToken(token: string) {
  const supabase = createSupabaseAdminClient();
  const withRemoval = await supabase
    .from(shareTable)
    .select(shareColumnsWithRemoval)
    .eq("token", token)
    .maybeSingle();

  if (withRemoval.error && isMissingResourceShareRemovalColumn(withRemoval.error)) {
    return supabase
      .from(shareTable)
      .select(shareColumns)
      .eq("token", token)
      .maybeSingle();
  }

  return withRemoval;
}

async function loadShareRowForToken(token: string) {
  if (!isValidDosResourceShareToken(token)) {
    return { error: "This link is not available.", status: 404 as const };
  }

  const { data, error } = await selectShareRowByToken(token);

  if (error) {
    return isMissingResourceShareTable(error)
      ? { error: "Resource sending is not installed yet.", status: 503 as const }
      : { error: "This link is not available.", status: 404 as const };
  }

  if (!data) {
    return { error: "This link is not available.", status: 404 as const };
  }

  const row = data as DosResourceShareRow;

  /* USA-281: checked before status, so a removed assessment is refused in
     every shape it can be in, including a completed one whose status is still
     "completed". The recipient is told the link was withdrawn, which is what
     happened, and is told nothing about the record it was withdrawn from. */
  if (row.removed_at) {
    return { error: "This link has been revoked.", status: 410 as const };
  }

  if (row.status === "revoked") {
    return { error: "This link has been revoked.", status: 410 as const };
  }

  if (row.status === "expired" || isExpired(row)) {
    return { error: "This link has expired.", status: 410 as const };
  }

  const resource = getDosResourceBySlug(row.resource_slug);
  const assessment = resource?.content?.assessment ?? null;

  if (!resource || !assessment) {
    return { error: "This link is not available.", status: 404 as const };
  }

  return { assessment, resource, row };
}

/* Saved progress. Draft answers are stored on the assignment, never as a
   timeline event and never as a result: a half-finished assessment is not a
   record of anything yet. */
export async function saveDosResourceShareProgress(token: string, responses: unknown) {
  if (!isSupabaseAdminConfigured()) {
    return { error: "Resource sending is not configured.", status: 500 as const };
  }

  const loaded = await loadShareRowForToken(token);

  if ("error" in loaded) {
    return loaded;
  }

  const { assessment, row } = loaded;

  if (row.status === "completed") {
    return { alreadyCompleted: true as const, ok: true as const };
  }

  const participants = [row.primary_participant_role, row.secondary_participant_role];
  const answers = normalizeAssessmentAnswers(responses, assessment.questions, participants);
  const answeredCount = Object.values(answers).reduce((total, scores) => total + Object.keys(scores).length, 0);
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from(shareTable)
    .update({
      opened_at: row.opened_at ?? new Date().toISOString(),
      responses: answers,
      started_at: row.started_at ?? (answeredCount ? new Date().toISOString() : null),
      status: answeredCount ? "in_progress" : row.status,
    })
    .eq("id", row.id)
    .in("status", ["link_ready", "in_progress"]);

  if (error) {
    return { error: error.message, status: 500 as const };
  }

  return { ok: true as const, savedCount: answeredCount };
}

/* Final submission. The score is recomputed here from the submitted answers,
   the result row is written once, and the assignment is flipped to completed
   in the same call. A repeated submission returns the result that already
   exists rather than creating a second one. */
export async function submitDosResourceShareAssessment(token: string, responses: unknown) {
  if (!isSupabaseAdminConfigured()) {
    return { error: "Resource sending is not configured.", status: 500 as const };
  }

  const loaded = await loadShareRowForToken(token);

  if ("error" in loaded) {
    return loaded;
  }

  const { assessment, resource, row } = loaded;
  const supabase = createSupabaseAdminClient();

  if (row.status === "completed") {
    return { alreadyCompleted: true as const, ok: true as const, resultId: row.result_id };
  }

  const participants = [row.primary_participant_role, row.secondary_participant_role];
  const answers = normalizeAssessmentAnswers(responses, assessment.questions, participants);

  if (!isAssessmentComplete(answers, assessment.questions, participants)) {
    return { error: "Every question needs a score for both people before this can be submitted.", status: 400 as const };
  }

  const summary = summarizeAssessment({
    answers,
    maxScore: assessment.maxScore,
    participants,
    questions: assessment.questions,
  });
  const completedAt = new Date().toISOString();
  const resultInsert = await supabase
    .from("dos_assessment_results")
    .insert({
      answers: buildAssessmentAnswerPayload(answers, assessment.questions, participants, {
        [row.primary_participant_role]: row.primary_participant_name,
        [row.secondary_participant_role]: row.secondary_participant_name,
      }),
      assessment_title: resource.title,
      assessment_type: resource.slug,
      category_scores: summary.categoryScores,
      completed_at: completedAt,
      completed_by_email: null,
      completed_by_name: `${row.primary_participant_name} and ${row.secondary_participant_name}`,
      max_score: assessment.maxScore,
      overall_score: summary.overallScore,
      percentage: summary.percentage,
      person_id: row.primary_person_id,
      secondary_person_id: row.secondary_person_id,
      source: "sent_link",
      workspace_id: row.workspace_id,
    })
    .select("id")
    .single();

  if (resultInsert.error) {
    return { error: resultInsert.error.message, status: 500 as const };
  }

  /* Only an assignment that is still open is completed here, so two taps on
     Submit cannot produce two completions. If the guarded update matches
     nothing, another request already finished it and its result stands. */
  const completion = await supabase
    .from(shareTable)
    .update({
      completed_at: completedAt,
      responses: answers,
      result_id: resultInsert.data.id,
      status: "completed",
    })
    .eq("id", row.id)
    .in("status", ["link_ready", "in_progress"])
    .select("id, result_id")
    .maybeSingle();

  if (completion.error) {
    return { error: completion.error.message, status: 500 as const };
  }

  if (!completion.data?.id) {
    await supabase.from("dos_assessment_results").delete().eq("id", resultInsert.data.id);

    const settled = await supabase.from(shareTable).select("result_id").eq("id", row.id).maybeSingle();

    return { alreadyCompleted: true as const, ok: true as const, resultId: settled.data?.result_id ?? null };
  }

  return { ok: true as const, resultId: resultInsert.data.id };
}
