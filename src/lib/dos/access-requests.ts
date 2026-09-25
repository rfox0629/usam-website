import "server-only";

import { randomInt, randomUUID } from "crypto";
import { slugify } from "@/src/lib/admin/organization-shared";
import { getDosLaunchWorkspaces, getDosWorkspaceAccess, type DosAuthorization } from "@/src/lib/dos/auth";
import {
  buildDosAccessRequestAdminNotification,
  buildDosWelcomeEmail,
  dosEmailFrom,
  dosSupportEmail,
} from "@/src/lib/dos/access-request-email";
import {
  dosAccessRequestSchemaVersion,
  normalizeDosAccessRequestAnswers,
  validateDosAccessRequest,
  type DosAccessRequestAnswers,
  type DosAccessRequestStatus,
  type DosAccessRequestType,
} from "@/src/lib/dos/access-request-model";
import { sendResendEmail } from "@/src/lib/email/resend";
import { canAccessOperationsWorkflow, canManageOperationsModule, type OperationsAuthorization } from "@/src/lib/operations/auth";
import { hasOperationsTestMarker } from "@/src/lib/operations/test-records";
import { getCanonicalSiteUrl } from "@/src/lib/site-url";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

/**
 * USA-289: DOS access requests from /dos/setup.
 *
 * Submission writes one `dos_access_requests` row with status 'submitted' and
 * grants nothing. Approval in Operations provisions or links access, verifies
 * it with the same resolver the DOS app uses, and only then sends the welcome
 * email. Every email attempt is recorded.
 *
 * Until the migration is applied, submissions fall back to `form_submissions`
 * (form_type dos_walkthrough_request, which the live table already allows) so
 * a request is never lost. Those rows show in the Operations inbox as DOS
 * Walkthrough with the reference code, and cannot be approved from here.
 */

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

export type DosAccessRequestRow = {
  access_error: string | null;
  access_started_at: string | null;
  access_status: "failed" | "not_started" | "provisioning" | "ready";
  answers: Record<string, unknown> | null;
  city: string | null;
  created_at: string;
  decided_at: string | null;
  decided_by_email: string | null;
  decided_by_user_id: string | null;
  decision_note: string | null;
  email: string;
  email_normalized: string;
  expected_users: string | null;
  first_name: string;
  id: string;
  internal_notes: string | null;
  last_name: string;
  organization_name: string | null;
  organization_role: string | null;
  organization_type: string | null;
  organization_website: string | null;
  phone: string | null;
  provisioned_at: string | null;
  provisioned_workspace_id: string | null;
  provisioned_workspace_slug: string | null;
  provisioning_outcome: Record<string, unknown> | null;
  reference_code: string;
  referrer: string | null;
  region: string | null;
  request_type: DosAccessRequestType;
  schema_version: number;
  source_page: string | null;
  status: DosAccessRequestStatus;
  submission_key: string;
  submitted_at: string;
  updated_at: string;
  user_agent: string | null;
  welcome_email_last_attempt_at: string | null;
  welcome_email_status: "failed" | "not_sent" | "sending" | "sent";
};

export type DosAccessEmailAttemptRow = {
  attempted_at: string;
  attempted_by_email: string | null;
  email_kind: string;
  error_message: string | null;
  id: string;
  idempotency_key: string;
  provider: string;
  provider_message_id: string | null;
  recipient_email: string;
  request_id: string;
  status: "failed" | "sent" | "skipped";
};

const requestTable = "dos_access_requests";
const attemptTable = "dos_access_request_email_attempts";
const referenceAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const provisioningLockMinutes = 10;

function isMissingTableError(error: { code?: string; message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";

  return error?.code === "42P01"
    || error?.code === "PGRST205"
    || (message.includes(requestTable) && (message.includes("does not exist") || message.includes("could not find")))
    || (message.includes(attemptTable) && (message.includes("does not exist") || message.includes("could not find")));
}

function isUniqueViolation(error: { code?: string; message?: string } | null | undefined) {
  return error?.code === "23505" || (error?.message ?? "").toLowerCase().includes("duplicate key");
}

function isMissingColumn(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";

  return message.includes("column") && (message.includes("does not exist") || message.includes("could not find"));
}

/** ilike treats _ and % as wildcards; an email must match itself only. */
function ilikeExact(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function nullable(value: string) {
  const trimmed = value.trim();

  return trimmed ? trimmed : null;
}

export function generateDosAccessReferenceCode() {
  let code = "";

  for (let index = 0; index < 6; index += 1) {
    code += referenceAlphabet[randomInt(referenceAlphabet.length)];
  }

  return `DOS-${code}`;
}

function answersRecord(answers: DosAccessRequestAnswers) {
  return {
    ...answers,
    schemaVersion: dosAccessRequestSchemaVersion,
  };
}

/* -------------------------------------------------------------- submission */

export type CreateDosAccessRequestResult =
  | {
    outcome: "created" | "same_submission";
    referenceCode: string;
    requestType: DosAccessRequestType;
    status: "submitted";
    storage: "dos_access_requests" | "form_submissions";
    submittedAt: string;
  }
  | {
    outcome: "open_request_exists";
    status: "submitted";
  }
  | {
    error: string;
    fieldErrors?: Record<string, string>;
    httpStatus: number;
  };

export async function createDosAccessRequest({
  input,
  referrer,
  sourcePage,
  submissionKey,
  userAgent,
}: {
  input: unknown;
  referrer: string | null;
  sourcePage: string | null;
  submissionKey: string;
  userAgent: string | null;
}): Promise<CreateDosAccessRequestResult> {
  const answers = normalizeDosAccessRequestAnswers(input);
  const fieldErrors = validateDosAccessRequest(answers);

  if (Object.keys(fieldErrors).length > 0 || !answers.requestType) {
    return {
      error: "Some answers need attention before this request can be sent.",
      fieldErrors: fieldErrors as Record<string, string>,
      httpStatus: 400,
    };
  }

  if (!isSupabaseAdminConfigured()) {
    return { error: "Requests cannot be received right now. Please try again shortly.", httpStatus: 503 };
  }

  const supabase = createSupabaseAdminClient();
  const requestType = answers.requestType;

  // Same submission key: the browser is retrying or double-tapped. Return the original.
  const existingByKey = await supabase
    .from(requestTable)
    .select("reference_code, request_type, submitted_at")
    .eq("submission_key", submissionKey)
    .maybeSingle();

  if (existingByKey.error && isMissingTableError(existingByKey.error)) {
    return createFallbackFormSubmission({ answers, referrer, sourcePage, submissionKey, supabase, userAgent });
  }

  if (existingByKey.error) {
    return { error: "We could not save your request. Please try again.", httpStatus: 500 };
  }

  if (existingByKey.data) {
    return {
      outcome: "same_submission",
      referenceCode: existingByKey.data.reference_code as string,
      requestType: existingByKey.data.request_type as DosAccessRequestType,
      status: "submitted",
      storage: "dos_access_requests",
      submittedAt: existingByKey.data.submitted_at as string,
    };
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const referenceCode = generateDosAccessReferenceCode();
    const { data, error } = await supabase
      .from(requestTable)
      .insert({
        answers: answersRecord(answers),
        city: nullable(answers.city),
        email: answers.email,
        expected_users: requestType === "organization" ? nullable(answers.expectedUsers) : null,
        first_name: answers.firstName,
        last_name: answers.lastName,
        organization_name: requestType === "organization" ? nullable(answers.organizationName) : null,
        organization_role: requestType === "organization" ? nullable(answers.organizationRole) : null,
        organization_type: requestType === "organization" ? nullable(answers.organizationType) : null,
        organization_website: requestType === "organization" ? nullable(answers.organizationWebsite) : null,
        phone: nullable(answers.phone),
        reference_code: referenceCode,
        referrer: referrer ? referrer.slice(0, 500) : null,
        region: nullable(answers.region),
        request_type: requestType,
        schema_version: dosAccessRequestSchemaVersion,
        source_page: sourcePage ? sourcePage.slice(0, 200) : null,
        status: "submitted",
        submission_key: submissionKey,
        user_agent: userAgent ? userAgent.slice(0, 400) : null,
      })
      .select("id, reference_code, submitted_at")
      .single();

    if (!error && data) {
      await notifyAdminOfNewRequest({
        email: answers.email,
        id: data.id as string,
        name: `${answers.firstName} ${answers.lastName}`.trim(),
        organizationName: requestType === "organization" ? answers.organizationName : null,
        referenceCode: data.reference_code as string,
        requestType,
      });

      return {
        outcome: "created",
        referenceCode: data.reference_code as string,
        requestType,
        status: "submitted",
        storage: "dos_access_requests",
        submittedAt: data.submitted_at as string,
      };
    }

    if (isUniqueViolation(error)) {
      const message = error?.message ?? "";

      if (message.includes("submission_key")) {
        // Two identical requests raced; the other one won. Report it.
        const winner = await supabase
          .from(requestTable)
          .select("reference_code, request_type, submitted_at")
          .eq("submission_key", submissionKey)
          .maybeSingle();

        if (winner.data) {
          return {
            outcome: "same_submission",
            referenceCode: winner.data.reference_code as string,
            requestType: winner.data.request_type as DosAccessRequestType,
            status: "submitted",
            storage: "dos_access_requests",
            submittedAt: winner.data.submitted_at as string,
          };
        }
      }

      if (message.includes("one_open_per_email")) {
        // Deliberately does not reveal the other request's reference code.
        return { outcome: "open_request_exists", status: "submitted" };
      }

      // Reference code collision: try another code.
      continue;
    }

    return { error: "We could not save your request. Please try again.", httpStatus: 500 };
  }

  return { error: "We could not save your request. Please try again.", httpStatus: 500 };
}

async function createFallbackFormSubmission({
  answers,
  referrer,
  sourcePage,
  submissionKey,
  supabase,
  userAgent,
}: {
  answers: DosAccessRequestAnswers;
  referrer: string | null;
  sourcePage: string | null;
  submissionKey: string;
  supabase: SupabaseAdminClient;
  userAgent: string | null;
}): Promise<CreateDosAccessRequestResult> {
  const requestType = answers.requestType as DosAccessRequestType;
  const existing = await supabase
    .from("form_submissions")
    .select("payload, created_at")
    .eq("form_type", "dos_walkthrough_request")
    .eq("payload->dos_access_request->>submission_key", submissionKey)
    .limit(1)
    .maybeSingle();

  const existingPayload = existing.data?.payload as { dos_access_request?: { reference_code?: string } } | undefined;

  if (existingPayload?.dos_access_request?.reference_code) {
    return {
      outcome: "same_submission",
      referenceCode: existingPayload.dos_access_request.reference_code,
      requestType,
      status: "submitted",
      storage: "form_submissions",
      submittedAt: existing.data?.created_at as string,
    };
  }

  const referenceCode = generateDosAccessReferenceCode();
  const name = `${answers.firstName} ${answers.lastName}`.trim();
  const { data, error } = await supabase
    .from("form_submissions")
    .insert({
      assigned_team: "support_team",
      email: answers.email,
      first_name: answers.firstName,
      form_type: "dos_walkthrough_request",
      last_name: answers.lastName,
      message: answers.goals || null,
      name,
      payload: {
        dos_access_request: {
          answers: answersRecord(answers),
          reference_code: referenceCode,
          referrer: referrer ? referrer.slice(0, 500) : null,
          request_type: requestType,
          status: "submitted",
          submission_key: submissionKey,
          user_agent: userAgent ? userAgent.slice(0, 400) : null,
        },
        interest: requestType === "organization" ? "DOS access request (organization)" : "DOS access request (individual)",
        organization: requestType === "organization" ? answers.organizationName : "",
        reference_code: referenceCode,
      },
      phone: answers.phone || null,
      source_page: sourcePage ? `${sourcePage.slice(0, 160)} · DOS access request` : "dos_setup · DOS access request",
      status: "new",
    })
    .select("id, created_at")
    .single();

  if (error || !data) {
    return { error: "We could not save your request. Please try again.", httpStatus: 500 };
  }

  await notifyAdminOfNewRequest({
    email: answers.email,
    id: null,
    name,
    organizationName: requestType === "organization" ? answers.organizationName : null,
    referenceCode,
    requestType,
  });

  return {
    outcome: "created",
    referenceCode,
    requestType,
    status: "submitted",
    storage: "form_submissions",
    submittedAt: data.created_at as string,
  };
}

async function notifyAdminOfNewRequest(input: {
  email: string;
  id: string | null;
  name: string;
  organizationName: string | null;
  referenceCode: string;
  requestType: DosAccessRequestType;
}) {
  const recipient = process.env.DOS_ACCESS_REQUEST_ADMIN_EMAIL?.trim()
    || process.env.ADMIN_APPLICATION_EMAIL?.trim()
    || process.env.USAM_APPLICATION_ADMIN_EMAIL?.trim();

  if (!recipient) {
    return;
  }

  const siteUrl = getCanonicalSiteUrl();
  const operationsUrl = input.id
    ? `${siteUrl}/operations/submissions/dos-access/${input.id}`
    : `${siteUrl}/operations/submissions`;

  // Best effort. The Operations inbox is the record; this is only a nudge.
  await sendResendEmail(recipient, buildDosAccessRequestAdminNotification({ ...input, operationsUrl }), {
    from: dosEmailFrom(),
    idempotencyKey: `dos-access-request-admin-${input.referenceCode}`,
  });
}

/* ------------------------------------------------------ operations: access */

export function canViewDosAccessRequests(authorization: OperationsAuthorization) {
  return authorization.status === "authorized"
    && canAccessOperationsWorkflow(authorization, "ministry_forms", "view");
}

/**
 * Approving grants someone an account and a workspace, so it is limited to the
 * two roles that can already administer accounts: platform owner (admin) and
 * organization admin (editor). Viewer-level reviewers can read, not decide.
 */
export function canDecideDosAccessRequests(authorization: OperationsAuthorization) {
  return authorization.status === "authorized"
    && (authorization.role === "platform_owner" || authorization.role === "organization_admin")
    && canManageOperationsModule(authorization, "submissions")
    && canAccessOperationsWorkflow(authorization, "ministry_forms", "manage");
}

export type DosAccessRequestListItem = {
  accessStatus: DosAccessRequestRow["access_status"];
  email: string;
  href: string;
  id: string;
  isTestRecord: boolean;
  name: string;
  organizationName: string | null;
  referenceCode: string;
  requestType: DosAccessRequestType;
  status: DosAccessRequestStatus;
  submittedAt: string;
  welcomeEmailStatus: DosAccessRequestRow["welcome_email_status"];
};

const listColumns = [
  "id",
  "reference_code",
  "request_type",
  "status",
  "first_name",
  "last_name",
  "email",
  "organization_name",
  "submitted_at",
  "access_status",
  "welcome_email_status",
].join(", ");

function listItemFromRow(row: Pick<DosAccessRequestRow, "access_status" | "email" | "first_name" | "id" | "last_name" | "organization_name" | "reference_code" | "request_type" | "status" | "submitted_at" | "welcome_email_status">): DosAccessRequestListItem {
  const name = `${row.first_name} ${row.last_name}`.trim() || row.email;

  return {
    accessStatus: row.access_status,
    email: row.email,
    href: `/operations/submissions/dos-access/${row.id}`,
    id: row.id,
    isTestRecord: hasOperationsTestMarker(row.email) || hasOperationsTestMarker(name),
    name,
    organizationName: row.organization_name,
    referenceCode: row.reference_code,
    requestType: row.request_type,
    status: row.status,
    submittedAt: row.submitted_at,
    welcomeEmailStatus: row.welcome_email_status,
  };
}

export async function loadDosAccessRequestsForOperations({
  authorization,
  limit = 100,
}: {
  authorization: OperationsAuthorization;
  limit?: number;
}): Promise<{ error?: string; migrationPending?: boolean; requests: DosAccessRequestListItem[] }> {
  if (!canViewDosAccessRequests(authorization) || !isSupabaseAdminConfigured()) {
    return { requests: [] };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from(requestTable)
    .select(listColumns)
    .order("submitted_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingTableError(error)) {
      return { migrationPending: true, requests: [] };
    }

    return { error: error.message, requests: [] };
  }

  return {
    requests: ((data ?? []) as unknown as DosAccessRequestRow[]).map(listItemFromRow),
  };
}

export async function loadDosAccessRequestDetail({
  authorization,
  id,
}: {
  authorization: OperationsAuthorization;
  id: string;
}): Promise<{
  attempts: DosAccessEmailAttemptRow[];
  error?: string;
  request: DosAccessRequestRow | null;
}> {
  if (!canViewDosAccessRequests(authorization)) {
    return { attempts: [], error: "You do not have access to DOS access requests.", request: null };
  }

  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return { attempts: [], request: null };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from(requestTable).select("*").eq("id", id).maybeSingle();

  if (error) {
    return {
      attempts: [],
      error: isMissingTableError(error) ? "The DOS access request table has not been created yet." : error.message,
      request: null,
    };
  }

  if (!data) {
    return { attempts: [], request: null };
  }

  const attempts = await supabase
    .from(attemptTable)
    .select("*")
    .eq("request_id", id)
    .order("attempted_at", { ascending: false })
    .limit(25);

  return {
    attempts: (attempts.data ?? []) as DosAccessEmailAttemptRow[],
    request: data as DosAccessRequestRow,
  };
}

async function loadRow(supabase: SupabaseAdminClient, id: string) {
  const { data, error } = await supabase.from(requestTable).select("*").eq("id", id).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as DosAccessRequestRow | null;
}

/* ---------------------------------------------------------------- decisions */

export type DosAccessDecisionResult = {
  error?: string;
  message?: string;
};

export async function declineDosAccessRequest({
  authorization,
  id,
  note,
}: {
  authorization: OperationsAuthorization;
  id: string;
  note: string;
}): Promise<DosAccessDecisionResult> {
  if (authorization.status !== "authorized" || !canDecideDosAccessRequests(authorization)) {
    return { error: "Only an Operations admin or editor can decide DOS access requests." };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from(requestTable)
    .update({
      decided_at: new Date().toISOString(),
      decided_by_email: authorization.email,
      decided_by_user_id: authorization.userId || null,
      decision_note: note.trim().slice(0, 2000) || null,
      status: "declined",
    })
    .eq("id", id)
    .eq("status", "submitted")
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (!data) {
    const row = await loadRow(supabase, id);

    return { error: row ? `This request was already ${row.status}. Nothing changed.` : "Request not found." };
  }

  return { message: "Request declined. No account or workspace was created." };
}

export async function approveDosAccessRequest({
  authorization,
  id,
  note,
}: {
  authorization: OperationsAuthorization;
  id: string;
  note: string;
}): Promise<DosAccessDecisionResult> {
  if (authorization.status !== "authorized" || !canDecideDosAccessRequests(authorization)) {
    return { error: "Only an Operations admin or editor can decide DOS access requests." };
  }

  const supabase = createSupabaseAdminClient();
  const current = await loadRow(supabase, id);

  if (!current) {
    return { error: "Request not found." };
  }

  if (current.status === "declined") {
    return { error: "This request was declined. It cannot be approved." };
  }

  if (current.status === "submitted") {
    const { data, error } = await supabase
      .from(requestTable)
      .update({
        decided_at: new Date().toISOString(),
        decided_by_email: authorization.email,
        decided_by_user_id: authorization.userId || null,
        decision_note: note.trim().slice(0, 2000) || null,
        status: "approved",
      })
      .eq("id", id)
      .eq("status", "submitted")
      .select("id")
      .maybeSingle();

    if (error) {
      return { error: error.message };
    }

    if (!data) {
      const raced = await loadRow(supabase, id);

      if (raced?.status !== "approved") {
        return { error: raced ? `This request was already ${raced.status}. Nothing changed.` : "Request not found." };
      }
    }
  }

  return completeDosAccessApproval({ actorEmail: authorization.email, id });
}

/**
 * Provisions access if it is not ready, then sends the welcome email if it
 * has not been sent. Safe to call repeatedly: this is also the Retry action.
 */
export async function completeDosAccessApproval({
  actorEmail,
  id,
}: {
  actorEmail: string;
  id: string;
}): Promise<DosAccessDecisionResult> {
  const supabase = createSupabaseAdminClient();
  let row = await loadRow(supabase, id);

  if (!row || row.status !== "approved") {
    return { error: "Only an approved request can be given access." };
  }

  if (row.access_status !== "ready") {
    const provisioning = await provisionDosAccess(supabase, row);

    if (provisioning.error) {
      return { error: `Approved, but access is not ready yet: ${provisioning.error} Use Retry access setup.` };
    }

    row = await loadRow(supabase, id);
  }

  if (!row || row.access_status !== "ready") {
    return { error: "Approved, but access is not ready yet. Use Retry access setup." };
  }

  if (row.welcome_email_status === "sent") {
    return { message: "Access is ready. The welcome email was already accepted by Resend earlier." };
  }

  const email = await sendDosWelcomeEmail({ actorEmail, row, supabase });

  return email.error
    ? { error: `Access is ready, but the welcome email failed: ${email.error} Use Retry welcome email.` }
    : { message: "Access is ready and the welcome email was accepted by Resend. Delivery is not confirmed until the person signs in." };
}

export async function retryDosWelcomeEmail({
  authorization,
  id,
}: {
  authorization: OperationsAuthorization;
  id: string;
}): Promise<DosAccessDecisionResult> {
  if (authorization.status !== "authorized" || !canDecideDosAccessRequests(authorization)) {
    return { error: "Only an Operations admin or editor can send DOS welcome emails." };
  }

  const supabase = createSupabaseAdminClient();
  const row = await loadRow(supabase, id);

  if (!row || row.status !== "approved" || row.access_status !== "ready") {
    return { error: "The welcome email is sent only after the request is approved and access is ready." };
  }

  const result = await sendDosWelcomeEmail({ actorEmail: authorization.email, row, supabase });

  return result.error
    ? { error: `The welcome email failed again: ${result.error}` }
    : { message: "Welcome email accepted by Resend. Delivery is not confirmed until the person signs in." };
}

export async function retryDosAccessProvisioning({
  authorization,
  id,
}: {
  authorization: OperationsAuthorization;
  id: string;
}): Promise<DosAccessDecisionResult> {
  if (authorization.status !== "authorized" || !canDecideDosAccessRequests(authorization)) {
    return { error: "Only an Operations admin or editor can set up DOS access." };
  }

  return completeDosAccessApproval({ actorEmail: authorization.email, id });
}

export async function saveDosAccessRequestNotes({
  authorization,
  id,
  notes,
}: {
  authorization: OperationsAuthorization;
  id: string;
  notes: string;
}): Promise<DosAccessDecisionResult> {
  if (authorization.status !== "authorized" || !canDecideDosAccessRequests(authorization)) {
    return { error: "Only an Operations admin or editor can edit notes." };
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from(requestTable)
    .update({ internal_notes: notes.trim().slice(0, 4000) || null })
    .eq("id", id);

  return error ? { error: error.message } : { message: "Notes saved." };
}

/* ------------------------------------------------------------- provisioning */

type ProvisioningOutcome = {
  authUser?: { state: "created" | "existing"; userId?: string | null };
  collectiveId?: string;
  collectiveMembership?: boolean;
  householdId?: string;
  householdSlug?: string;
  linkedExistingWorkspace?: boolean;
  organizationId?: string;
  organizationMembership?: boolean;
  ownerPersonId?: string;
  profileId?: string;
  teamMemberId?: string;
  verifiedAt?: string;
  workspaceName?: string;
};

function outcomeFrom(row: DosAccessRequestRow): ProvisioningOutcome {
  const value = row.provisioning_outcome;

  return value && typeof value === "object" && !Array.isArray(value) ? { ...(value as ProvisioningOutcome) } : {};
}

async function saveOutcome(supabase: SupabaseAdminClient, id: string, outcome: ProvisioningOutcome) {
  const { error } = await supabase.from(requestTable).update({ provisioning_outcome: outcome }).eq("id", id);

  if (error) {
    throw new Error(`Could not record provisioning progress: ${error.message}`);
  }
}

// The scope resolver filters profiles by user_id, which is a uuid column. When
// an existing account's id is not known here, the nil uuid matches nothing and
// scope falls back to email matching, exactly as it does for the person.
const unknownUserId = "00000000-0000-0000-0000-000000000000";

function memberAuthorizationFor(email: string, userId: string | null | undefined): DosAuthorization {
  return {
    access: "member",
    email,
    isActive: true,
    phone: null,
    prayerPermissions: [],
    role: "member",
    status: "authorized",
    userId: userId || unknownUserId,
  };
}

function isAlreadyRegisteredError(error: { code?: string; message?: string; status?: number } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";

  return error?.code === "email_exists"
    || error?.code === "user_already_exists"
    || message.includes("already been registered")
    || message.includes("already registered")
    || message.includes("already exists");
}

async function uniqueSlug(supabase: SupabaseAdminClient, table: "collectives" | "missionary_households" | "organizations", baseValue: string) {
  const base = slugify(baseValue);

  for (let index = 0; index < 24; index += 1) {
    const candidate = index === 0 ? base : `${base}-${index + 1}`;
    const { data, error } = await supabase.from(table).select("id").eq("slug", candidate).maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return candidate;
    }
  }

  return `${base}-${Date.now()}`;
}

async function workspaceExists(supabase: SupabaseAdminClient, householdId: string) {
  const { data } = await supabase
    .from("missionary_households")
    .select("id, slug, display_name")
    .eq("id", householdId)
    .maybeSingle();

  return data as { display_name: string; id: string; slug: string } | null;
}

/**
 * Finds a DOS workspace this email can already open, using the same scope
 * rules as the DOS app (profiles, collective memberships, team members).
 */
async function findExistingAccessibleWorkspace(email: string, userId: string | null | undefined) {
  const workspaces = await getDosLaunchWorkspaces(memberAuthorizationFor(email, userId));

  return workspaces[0] ?? null;
}

async function ensureAuthUser(supabase: SupabaseAdminClient, row: DosAccessRequestRow, outcome: ProvisioningOutcome) {
  if (outcome.authUser) {
    return;
  }

  // No password is set. The person signs in with an email link and may set a
  // password later from the DOS sign-in page.
  const { data, error } = await supabase.auth.admin.createUser({
    email: row.email_normalized,
    email_confirm: true,
    user_metadata: {
      first_name: row.first_name,
      last_name: row.last_name,
      source: "dos_access_request",
    },
  });

  if (error) {
    if (!isAlreadyRegisteredError(error)) {
      throw new Error(`Could not create the sign-in account (${error.message}).`);
    }

    const existingProfile = await supabase
      .from("profiles")
      .select("user_id")
      .ilike("email", ilikeExact(row.email_normalized))
      .not("user_id", "is", null)
      .limit(1)
      .maybeSingle();

    outcome.authUser = {
      state: "existing",
      userId: (existingProfile.data?.user_id as string | undefined) ?? null,
    };
  } else {
    outcome.authUser = { state: "created", userId: data.user?.id ?? null };
  }

  await saveOutcome(supabase, row.id, outcome);
}

async function ensureOrganization(supabase: SupabaseAdminClient, row: DosAccessRequestRow, outcome: ProvisioningOutcome) {
  if (outcome.organizationId) {
    const { data } = await supabase.from("organizations").select("id").eq("id", outcome.organizationId).maybeSingle();

    if (data) {
      return outcome.organizationId;
    }
  }

  const personName = `${row.first_name} ${row.last_name}`.trim();
  const isOrganization = row.request_type === "organization";
  const name = isOrganization ? (row.organization_name ?? personName) : `${personName} DOS`;
  const type = isOrganization && (row.organization_type ?? "").toLowerCase() === "church" ? "church" : isOrganization ? "ministry" : "other";
  // Always a new organization row: reusing one found by slug could attach
  // this person to an unrelated organization that happens to share a name.
  const slug = await uniqueSlug(supabase, "organizations", name);
  const { data, error } = await supabase
    .from("organizations")
    .insert({ branding_mode: "default", name, slug, type })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Could not create the organization record (${error?.message ?? "no row returned"}).`);
  }

  outcome.organizationId = data.id as string;
  await saveOutcome(supabase, row.id, outcome);

  return outcome.organizationId;
}

async function ensureWorkspaceRecords(supabase: SupabaseAdminClient, row: DosAccessRequestRow, outcome: ProvisioningOutcome) {
  const personName = `${row.first_name} ${row.last_name}`.trim();
  const isOrganization = row.request_type === "organization";
  const workspaceName = isOrganization ? (row.organization_name ?? personName) : personName;
  const organizationId = await ensureOrganization(supabase, row, outcome);

  if (!outcome.householdId || !(await workspaceExists(supabase, outcome.householdId))) {
    const slug = await uniqueSlug(supabase, "missionary_households", workspaceName);
    const location = [row.city, row.region].filter(Boolean).join(", ") || null;
    const full = {
      display_name: workspaceName,
      enable_prayer_team: true,
      location,
      public_visible: false,
      short_mission: `${workspaceName} DOS workspace.`,
      show_fruit: false,
      show_household: false,
      show_photos: false,
      show_prayer: true,
      show_story: false,
      show_support: false,
      show_team: false,
      slug,
    };
    let result = await supabase.from("missionary_households").insert(full).select("id, slug").single();

    if (result.error && isMissingColumn(result.error)) {
      result = await supabase
        .from("missionary_households")
        .insert({ display_name: workspaceName, location, public_visible: false, short_mission: full.short_mission, slug })
        .select("id, slug")
        .single();
    }

    if (result.error || !result.data) {
      throw new Error(`Could not create the DOS workspace (${result.error?.message ?? "no row returned"}).`);
    }

    outcome.householdId = result.data.id as string;
    outcome.householdSlug = result.data.slug as string;
    outcome.workspaceName = workspaceName;
    await saveOutcome(supabase, row.id, outcome);
  }

  if (!outcome.collectiveId) {
    // Same slug as the workspace: DOS scope resolves a collective to its
    // workspace by slug. The organization is new, so the slug is free in it.
    const slug = outcome.householdSlug as string;
    const { data, error } = await supabase
      .from("collectives")
      .insert({
        name: workspaceName,
        owner_organization_id: organizationId,
        slug,
        type: isOrganization ? "ministry_team" : "family",
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(`Could not create the workspace group (${error?.message ?? "no row returned"}).`);
    }

    outcome.collectiveId = data.id as string;
    await saveOutcome(supabase, row.id, outcome);
  }

  if (!outcome.profileId) {
    // Reuse an existing profile for this email rather than creating a second identity.
    const existing = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", ilikeExact(row.email_normalized))
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existing.data?.id) {
      outcome.profileId = existing.data.id as string;
    } else {
      const createdUserId = outcome.authUser?.state === "created" ? outcome.authUser.userId ?? null : null;
      const { data, error } = await supabase
        .from("profiles")
        .insert({
          email: row.email_normalized,
          first_name: row.first_name,
          last_name: row.last_name,
          owner_organization_id: organizationId,
          phone: row.phone,
          primary_collective_id: outcome.collectiveId,
          user_id: createdUserId,
        })
        .select("id")
        .single();

      if (error || !data) {
        throw new Error(`Could not create the profile (${error?.message ?? "no row returned"}).`);
      }

      outcome.profileId = data.id as string;
    }

    await saveOutcome(supabase, row.id, outcome);
  }

  if (!outcome.organizationMembership) {
    const existing = await supabase
      .from("organization_memberships")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("profile_id", outcome.profileId)
      .maybeSingle();

    if (!existing.data) {
      const { error } = await supabase.from("organization_memberships").insert({
        organization_id: organizationId,
        profile_id: outcome.profileId,
        role: isOrganization ? "leader" : "owner",
        status: "active",
      });

      if (error && !isUniqueViolation(error)) {
        throw new Error(`Could not create the organization membership (${error.message}).`);
      }
    }

    outcome.organizationMembership = true;
    await saveOutcome(supabase, row.id, outcome);
  }

  if (!outcome.collectiveMembership) {
    const existing = await supabase
      .from("collective_memberships")
      .select("id")
      .eq("collective_id", outcome.collectiveId)
      .eq("profile_id", outcome.profileId)
      .maybeSingle();

    if (!existing.data) {
      const { error } = await supabase.from("collective_memberships").insert({
        collective_id: outcome.collectiveId,
        profile_id: outcome.profileId,
        role: "owner",
        status: "active",
      });

      if (error && !isUniqueViolation(error)) {
        throw new Error(`Could not create the workspace membership (${error.message}).`);
      }
    }

    outcome.collectiveMembership = true;
    await saveOutcome(supabase, row.id, outcome);
  }

  if (!outcome.ownerPersonId) {
    // The owner's own People record, shaped exactly like the one the DOS app
    // creates for a signed-in viewer (resolveDosViewerPerson). Creating it
    // here means the app's first-open syncs (viewer and team member) both
    // find it, instead of racing to insert two copies of the same person.
    const existing = await supabase
      .from("missionary_field_people")
      .select("id")
      .eq("household_id", outcome.householdId)
      .ilike("email", ilikeExact(row.email_normalized))
      .limit(1)
      .maybeSingle();

    if (existing.data?.id) {
      outcome.ownerPersonId = existing.data.id as string;
    } else {
      const { data, error } = await supabase
        .from("missionary_field_people")
        .insert({
          church: null,
          created_by: outcome.authUser?.userId ?? null,
          discipleship_stage: "not_started",
          email: row.email_normalized,
          engagement_level: "0",
          field_visibility: "secondary",
          household_id: outcome.householdId,
          household_notes: "Default DOS user person for workspace ownership, group leadership, attendance, and prayer context.",
          name: personName,
          phone: row.phone,
          relationship_context: "family",
          relationship_type: "new",
          role_in_my_life: "not_active",
          source: "field",
          status: "active",
          workspace_id: outcome.householdId,
        })
        .select("id")
        .single();

      if (error || !data) {
        throw new Error(`Could not create the owner's People record (${error?.message ?? "no row returned"}).`);
      }

      outcome.ownerPersonId = data.id as string;
    }

    await saveOutcome(supabase, row.id, outcome);
  }

  if (!outcome.teamMemberId) {
    const existing = await supabase
      .from("missionary_team_members")
      .select("id")
      .eq("household_id", outcome.householdId)
      .ilike("dos_user_id", ilikeExact(row.email_normalized))
      .limit(1)
      .maybeSingle();

    if (existing.data?.id) {
      outcome.teamMemberId = existing.data.id as string;
    } else {
      const full = {
        account_linked_at: new Date().toISOString(),
        display_name: personName,
        dos_user_id: row.email_normalized,
        household_id: outcome.householdId,
        invite_email: row.email_normalized,
        invite_phone: row.phone,
        invite_phone_normalized: row.phone ? row.phone.replace(/\D/g, "").slice(-10) || null : null,
        is_public: false,
        relationship_to_workspace: "owner",
        role_title: isOrganization ? (row.organization_role ?? "Leader") : "Owner",
        source: "dos",
        status: "active",
      };
      let result = await supabase.from("missionary_team_members").insert(full).select("id").single();

      if (result.error && isMissingColumn(result.error)) {
        const { account_linked_at: _a, invite_email: _b, invite_phone: _c, invite_phone_normalized: _d, relationship_to_workspace: _e, ...minimal } = full;
        result = await supabase.from("missionary_team_members").insert(minimal).select("id").single();
      }

      if (result.error || !result.data) {
        throw new Error(`Could not add you to the workspace team (${result.error?.message ?? "no row returned"}).`);
      }

      outcome.teamMemberId = result.data.id as string;
    }

    await saveOutcome(supabase, row.id, outcome);
  }
}

async function provisionDosAccess(supabase: SupabaseAdminClient, row: DosAccessRequestRow): Promise<{ error?: string }> {
  // Two compare-and-set attempts rather than one `or=` filter: PostgREST
  // re-applies a logical `or` to the rows an update returns, which fails when
  // the returned columns do not include the filtered ones. Simple filters are
  // applied once, in the UPDATE itself.
  const staleBefore = new Date(Date.now() - provisioningLockMinutes * 60_000).toISOString();
  const lockUpdate = { access_error: null, access_started_at: new Date().toISOString(), access_status: "provisioning" };
  let lock = await supabase
    .from(requestTable)
    .update(lockUpdate)
    .eq("id", row.id)
    .eq("status", "approved")
    .in("access_status", ["not_started", "failed"])
    .select("id")
    .maybeSingle();

  if (!lock.error && !lock.data) {
    // A run that started more than the lock window ago is treated as dead.
    lock = await supabase
      .from(requestTable)
      .update(lockUpdate)
      .eq("id", row.id)
      .eq("status", "approved")
      .eq("access_status", "provisioning")
      .lt("access_started_at", staleBefore)
      .select("id")
      .maybeSingle();
  }

  if (lock.error) {
    return { error: lock.error.message };
  }

  if (!lock.data) {
    return { error: "Access setup is already running for this request. Wait a minute and refresh." };
  }

  const outcome = outcomeFrom(row);

  try {
    await ensureAuthUser(supabase, row, outcome);

    if (!outcome.householdId && row.request_type === "individual") {
      // An individual who can already open a DOS workspace keeps it. Linking
      // instead of creating is what keeps their People, groups, Journeys, and
      // reading plans exactly where they are.
      const existing = await findExistingAccessibleWorkspace(row.email_normalized, outcome.authUser?.userId);

      if (existing) {
        outcome.householdId = existing.id;
        outcome.householdSlug = existing.slug;
        outcome.linkedExistingWorkspace = true;
        outcome.workspaceName = existing.displayName;
        await saveOutcome(supabase, row.id, outcome);
      }
    }

    if (!outcome.linkedExistingWorkspace) {
      await ensureWorkspaceRecords(supabase, row, outcome);
    }

    const workspace = outcome.householdId ? await workspaceExists(supabase, outcome.householdId) : null;

    if (!workspace) {
      throw new Error("The workspace could not be found after setup.");
    }

    // Verify with the resolver the DOS app itself uses, as this person.
    const access = await getDosWorkspaceAccess(memberAuthorizationFor(row.email_normalized, outcome.authUser?.userId), workspace.slug);

    if (access.status !== "allowed") {
      throw new Error(`The workspace exists but this email cannot open it yet (${access.status}).`);
    }

    outcome.householdSlug = workspace.slug;
    outcome.workspaceName = outcome.workspaceName ?? workspace.display_name;
    outcome.verifiedAt = new Date().toISOString();

    const { error } = await supabase
      .from(requestTable)
      .update({
        access_error: null,
        access_status: "ready",
        provisioned_at: new Date().toISOString(),
        provisioned_workspace_id: workspace.id,
        provisioned_workspace_slug: workspace.slug,
        provisioning_outcome: outcome,
      })
      .eq("id", row.id);

    if (error) {
      throw new Error(error.message);
    }

    return {};
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";

    await supabase
      .from(requestTable)
      .update({ access_error: message.slice(0, 1000), access_status: "failed", provisioning_outcome: outcome })
      .eq("id", row.id);

    return { error: message };
  }
}

/* -------------------------------------------------------------------- email */

async function sendDosWelcomeEmail({
  actorEmail,
  row,
  supabase,
}: {
  actorEmail: string;
  row: DosAccessRequestRow;
  supabase: SupabaseAdminClient;
}): Promise<{ error?: string }> {
  const outcome = outcomeFrom(row);
  const workspaceSlug = row.provisioned_workspace_slug ?? outcome.householdSlug;

  if (row.access_status !== "ready" || !workspaceSlug) {
    return { error: "Access is not ready." };
  }

  const attemptId = randomUUID();
  const idempotencyKey = `dos-access-welcome-${row.id}-${attemptId}`;

  // Claim the send so two clicks (or two reviewers) cannot email twice. A
  // claim older than two minutes is a send that died and may be retried.
  const sendingUpdate = { welcome_email_last_attempt_at: new Date().toISOString(), welcome_email_status: "sending" };
  let claim = await supabase
    .from(requestTable)
    .update(sendingUpdate)
    .eq("id", row.id)
    .eq("access_status", "ready")
    .in("welcome_email_status", ["not_sent", "failed", "sent"])
    .select("id")
    .maybeSingle();

  if (!claim.error && !claim.data) {
    claim = await supabase
      .from(requestTable)
      .update(sendingUpdate)
      .eq("id", row.id)
      .eq("access_status", "ready")
      .eq("welcome_email_status", "sending")
      .lt("welcome_email_last_attempt_at", new Date(Date.now() - 2 * 60_000).toISOString())
      .select("id")
      .maybeSingle();
  }

  if (claim.error) {
    return { error: claim.error.message };
  }

  if (!claim.data) {
    return { error: "A welcome email is already being sent for this request. Refresh in a minute." };
  }

  const template = buildDosWelcomeEmail({
    accountState: outcome.authUser?.state === "created" ? "created" : "existing",
    firstName: row.first_name,
    organizationName: row.organization_name,
    requestType: row.request_type,
    workspaceName: outcome.workspaceName ?? `${row.first_name} ${row.last_name}`.trim(),
    workspaceSlug,
  });
  const result = await sendResendEmail(row.email, template, {
    from: dosEmailFrom(),
    idempotencyKey,
    replyTo: dosSupportEmail(),
  });
  const status = result.sent ? "sent" : result.skippedReason ? "skipped" : "failed";
  const errorMessage = result.sent
    ? null
    : result.skippedReason === "missing_resend_api_key"
      ? "RESEND_API_KEY is not configured on this deployment."
      : [result.error, result.errorDetail].filter(Boolean).join(" · ") || "Unknown email error.";

  await supabase.from(attemptTable).insert({
    attempted_by_email: actorEmail,
    email_kind: "welcome",
    error_message: errorMessage,
    id: attemptId,
    idempotency_key: idempotencyKey,
    provider: "resend",
    provider_message_id: result.id ?? null,
    recipient_email: row.email,
    request_id: row.id,
    status,
  });

  await supabase
    .from(requestTable)
    .update({ welcome_email_status: result.sent ? "sent" : "failed" })
    .eq("id", row.id);

  return result.sent ? {} : { error: errorMessage ?? "Unknown email error." };
}
