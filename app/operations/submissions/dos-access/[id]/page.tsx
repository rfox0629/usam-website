import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { dosAccessRequestStatusLabel, dosAccessRequestTypeLabel, isAnswerForRequestType } from "@/src/lib/dos/access-request-model";
import {
  canDecideDosAccessRequests,
  canViewDosAccessRequests,
  loadDosAccessRequestDetail,
  type DosAccessRequestRow,
} from "@/src/lib/dos/access-requests";
import { dosWalkthroughVideoUrl } from "@/src/lib/dos/access-request-email";
import { canAccessOperationsModule, getOperationsAuthorization } from "@/src/lib/operations/auth";
import { OperationsAccessDenied, OperationsShell } from "../../../_components/OperationsShell";
import {
  formatOperationsDate,
  operationsFont,
  OperationsActionLink,
  OperationsBadge,
  OperationsEmptyState,
  OperationsPanel,
  type OperationsTone,
} from "../../../_components/OperationsUI";
import {
  approveDosAccessRequestAction,
  declineDosAccessRequestAction,
  retryDosAccessProvisioningAction,
  retryDosWelcomeEmailAction,
  saveDosAccessRequestNotesAction,
} from "./actions";

export const dynamic = "force-dynamic";

// In the order the form asks them.
const answerLabels: Record<string, string> = {
  phone: "Mobile phone",
  city: "City",
  region: "State or region",
  individualRole: "Describes them",
  churchOrCommunity: "Church or community",
  organizationName: "Organization",
  organizationType: "Kind of organization",
  organizationRole: "Their role",
  expectedUsers: "People who would use DOS",
  organizationWebsite: "Website",
  primaryUses: "Wants DOS to help with",
  goals: "Anything else",
  heardAbout: "Heard about DOS",
  invitedBy: "Invited by",
};

function FieldBlock({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <div className="mt-1 break-words text-sm leading-6 text-slate-800">{value || "-"}</div>
    </div>
  );
}

function statusTone(status: string): OperationsTone {
  return status === "submitted" ? "blue" : status === "approved" ? "green" : "muted";
}

function accessLabel(request: DosAccessRequestRow) {
  if (request.status !== "approved") {
    return request.status === "declined" ? "No access (declined)" : "Not set up (awaiting decision)";
  }

  return {
    failed: "Setup failed",
    not_started: "Not started",
    provisioning: "Setting up",
    ready: "Ready (verified)",
  }[request.access_status];
}

function accessTone(request: DosAccessRequestRow): OperationsTone {
  if (request.access_status === "ready") {
    return "green";
  }

  return request.access_status === "failed" ? "red" : request.status === "approved" ? "amber" : "muted";
}

function emailLabel(status: DosAccessRequestRow["welcome_email_status"]) {
  return {
    failed: "Failed",
    not_sent: "Not sent",
    sending: "Sending",
    sent: "Accepted by Resend",
  }[status];
}

function outcomeValue(outcome: Record<string, unknown> | null, key: string) {
  return outcome && typeof outcome === "object" ? outcome[key] : undefined;
}

function answerRows(answers: Record<string, unknown> | null, requestType: DosAccessRequestRow["request_type"]) {
  if (!answers) {
    return [];
  }

  // Requests stored before path-only answers were cleared can still carry
  // answers from the path the person abandoned; those are not shown.
  return Object.entries(answerLabels)
    .filter(([key]) => isAnswerForRequestType(key, requestType))
    .map(([key, label]) => {
      const value = answers[key];
      const text = Array.isArray(value) ? value.join("\n") : typeof value === "string" ? value : "";

      return { label, value: text };
    })
    .filter((row) => row.value);
}

const buttonBase = "inline-flex min-h-10 w-full items-center justify-center rounded-md border px-4 text-[11px] uppercase tracking-[0.12em] transition-colors";

export default async function DosAccessRequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const [{ id }, query, authorization] = await Promise.all([params, searchParams, getOperationsAuthorization()]);

  if (authorization.status !== "authorized") {
    return null;
  }

  if (!canAccessOperationsModule(authorization, "submissions") || !canViewDosAccessRequests(authorization)) {
    return <OperationsAccessDenied active="submissions" authorization={authorization} title="DOS Access Requests" />;
  }

  const { attempts, error, request } = await loadDosAccessRequestDetail({ authorization, id });

  if (!request && !error) {
    notFound();
  }

  const canDecide = canDecideDosAccessRequests(authorization);
  const outcome = request?.provisioning_outcome ?? null;
  const authUser = outcomeValue(outcome, "authUser") as { state?: string } | undefined;
  const linkedExisting = outcomeValue(outcome, "linkedExistingWorkspace") === true;
  const videoUrl = dosWalkthroughVideoUrl();
  const name = request ? `${request.first_name} ${request.last_name}`.trim() : "DOS Access Request";

  return (
    <OperationsShell
      action={<OperationsActionLink href="/operations/submissions?type=dos_access_request" variant="outline">Back to Inbox</OperationsActionLink>}
      active="submissions"
      authorization={authorization}
      eyebrow="DOS Access Request"
      title={name}
    >
      <div className="space-y-4">
        {query.saved ? (
          <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800" role="status">{query.saved}</section>
        ) : null}
        {query.error ? (
          <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{query.error}</section>
        ) : null}
        {error ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">{error}</section>
        ) : null}

        {request ? (
          <>
            <OperationsPanel eyebrow={request.reference_code} title="Request Summary">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <FieldBlock label="Type" value={<OperationsBadge tone="blue">DOS Access · {dosAccessRequestTypeLabel(request.request_type)}</OperationsBadge>} />
                <FieldBlock label="Status" value={<OperationsBadge tone={statusTone(request.status)}>{dosAccessRequestStatusLabel(request.status)}</OperationsBadge>} />
                <FieldBlock label="Submitted" value={formatOperationsDate(request.submitted_at)} />
                <FieldBlock label="Access" value={<OperationsBadge tone={accessTone(request)}>{accessLabel(request)}</OperationsBadge>} />
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <FieldBlock label="Email" value={<a className="text-blue-700 underline" href={`mailto:${request.email}`}>{request.email}</a>} />
                <FieldBlock label="Phone" value={request.phone} />
                <FieldBlock label="Location" value={[request.city, request.region].filter(Boolean).join(", ")} />
                <FieldBlock label="Organization" value={request.request_type === "organization" ? request.organization_name : "Individual"} />
              </div>
              <p className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                This is a DOS access request, not a USA Missionaries missionary application. Missionary applications are reviewed under Missionaries.
              </p>
            </OperationsPanel>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
              <div className="min-w-0 space-y-4">
                <OperationsPanel title="Answers">
                  <div className="divide-y divide-slate-100">
                    {answerRows(request.answers, request.request_type).map((row) => (
                      <div className="grid gap-2 py-3 first:pt-0 last:pb-0 md:grid-cols-[minmax(180px,0.42fr)_minmax(0,1fr)]" key={row.label}>
                        <p className="text-sm font-medium leading-6 text-slate-700">{row.label}</p>
                        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-900">{row.value}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-xs text-slate-500">
                    Source: {request.source_page ?? "-"} · Schema v{request.schema_version}
                  </p>
                </OperationsPanel>

                <OperationsPanel title="Welcome Email Attempts">
                  <p className="mb-3 text-xs leading-5 text-slate-500">
                    &quot;Accepted by Resend&quot; means Resend took the message for delivery. It does not confirm the person received it.
                    The email&apos;s button opens /dos; the <a className="text-blue-700 underline" href={videoUrl}>2-minute walkthrough</a> is on the DOS sign-in page.
                    {request.access_status === "ready" ? (
                      <>
                        {" "}<a className="text-blue-700 underline" href={`/operations/submissions/dos-access/welcome-email?request=${request.id}`}>Preview the welcome email for this request</a>.
                      </>
                    ) : null}
                  </p>
                  {attempts.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {attempts.map((attempt) => (
                        <div className="grid gap-1 py-3 first:pt-0 last:pb-0 md:grid-cols-[150px_120px_minmax(0,1fr)] md:items-start md:gap-3" key={attempt.id}>
                          <p className="text-sm text-slate-600">{formatOperationsDate(attempt.attempted_at)}</p>
                          <div>
                            <OperationsBadge tone={attempt.status === "sent" ? "green" : "red"}>
                              {attempt.status === "sent" ? "Accepted" : attempt.status === "skipped" ? "Not sent" : "Failed"}
                            </OperationsBadge>
                          </div>
                          <div className="min-w-0 text-sm leading-6 text-slate-700">
                            <p className="break-words text-slate-700">To {attempt.recipient_email} · by {attempt.attempted_by_email ?? "-"}</p>
                            {attempt.provider_message_id ? <p className="break-words text-xs text-slate-500">Resend id {attempt.provider_message_id}</p> : null}
                            {attempt.error_message ? <p className="break-words text-xs text-red-700">{attempt.error_message}</p> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <OperationsEmptyState>No welcome email has been attempted.</OperationsEmptyState>
                  )}
                </OperationsPanel>
              </div>

              <div className="space-y-4">
                <OperationsPanel title="Decision">
                  <div className="grid gap-3">
                    <FieldBlock label="Decision" value={request.status === "submitted" ? "Awaiting review" : dosAccessRequestStatusLabel(request.status)} />
                    <FieldBlock label="Reviewer" value={request.decided_by_email} />
                    <FieldBlock label="Decided" value={request.decided_at ? formatOperationsDate(request.decided_at) : null} />
                    <FieldBlock label="Decision note" value={request.decision_note} />
                  </div>

                  {request.status === "submitted" && canDecide ? (
                    <div className="mt-5 grid gap-4">
                      <form action={approveDosAccessRequestAction} className="grid gap-3 rounded-md border border-emerald-200 bg-emerald-50/50 p-3">
                        <input name="id" type="hidden" value={request.id} />
                        <label className="block">
                          <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Note (optional, internal)</span>
                          <textarea className="mt-2 min-h-16 w-full rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-950 outline-none focus:border-[#D8A932]" maxLength={2000} name="note" />
                        </label>
                        <p className="text-xs leading-5 text-slate-600">
                          Approving sets up {request.request_type === "organization" ? "an organization workspace" : "their DOS access (linking an existing workspace if they already have one)"}, verifies it opens, then emails sign-in and home screen instructions to {request.email}.
                        </p>
                        <button className={`${buttonBase} border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800`} style={{ fontFamily: operationsFont.rajdhani, fontWeight: 700 }} type="submit">
                          Approve and set up access
                        </button>
                      </form>
                      <form action={declineDosAccessRequestAction} className="grid gap-3 rounded-md border border-slate-200 p-3">
                        <input name="id" type="hidden" value={request.id} />
                        <label className="block">
                          <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Reason (optional, internal)</span>
                          <textarea className="mt-2 min-h-16 w-full rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-950 outline-none focus:border-[#D8A932]" maxLength={2000} name="note" />
                        </label>
                        <label className="flex items-start gap-2 text-xs leading-5 text-slate-600">
                          <input className="mt-0.5" name="confirm" type="checkbox" value="decline" />
                          Decline. No account or workspace is created and no email is sent.
                        </label>
                        <button className={`${buttonBase} border-slate-300 bg-white text-slate-800 hover:border-red-400 hover:text-red-700`} style={{ fontFamily: operationsFont.rajdhani, fontWeight: 700 }} type="submit">
                          Decline request
                        </button>
                      </form>
                    </div>
                  ) : null}

                  {request.status === "submitted" && !canDecide ? (
                    <p className="mt-4 text-xs leading-5 text-slate-500">Only an Operations admin or editor can approve or decline DOS access.</p>
                  ) : null}
                </OperationsPanel>

                {request.status === "approved" ? (
                  <OperationsPanel title="Access Setup">
                    <div className="grid gap-3">
                      <FieldBlock label="Access" value={<OperationsBadge tone={accessTone(request)}>{accessLabel(request)}</OperationsBadge>} />
                      <FieldBlock label="Workspace" value={request.provisioned_workspace_slug ? `/dos/${request.provisioned_workspace_slug}` : null} />
                      <FieldBlock label="Sign-in account" value={authUser?.state === "created" ? "Created (no password; signs in by email link)" : authUser?.state === "existing" ? "Existing account reused" : null} />
                      <FieldBlock label="Workspace source" value={request.provisioned_workspace_id ? (linkedExisting ? "Linked their existing workspace" : "New workspace created") : null} />
                      <FieldBlock label="Verified" value={request.provisioned_at ? formatOperationsDate(request.provisioned_at) : null} />
                      {request.access_error ? <FieldBlock label="Last error" value={<span className="text-red-700">{request.access_error}</span>} /> : null}
                      <FieldBlock label="Welcome email" value={<OperationsBadge tone={request.welcome_email_status === "sent" ? "green" : request.welcome_email_status === "failed" ? "red" : "muted"}>{emailLabel(request.welcome_email_status)}</OperationsBadge>} />
                    </div>
                    {canDecide ? (
                      <div className="mt-4 grid gap-2">
                        {request.access_status !== "ready" ? (
                          <form action={retryDosAccessProvisioningAction}>
                            <input name="id" type="hidden" value={request.id} />
                            <button className={`${buttonBase} border-[#D8A932] bg-[#D8A932] text-[#101826] hover:bg-[#E7BF57]`} style={{ fontFamily: operationsFont.rajdhani, fontWeight: 700 }} type="submit">
                              Retry access setup
                            </button>
                          </form>
                        ) : null}
                        {request.access_status === "ready" ? (
                          <form action={retryDosWelcomeEmailAction}>
                            <input name="id" type="hidden" value={request.id} />
                            <button className={`${buttonBase} ${request.welcome_email_status === "sent" ? "border-slate-300 bg-white text-slate-800 hover:border-[#D8A932]" : "border-[#D8A932] bg-[#D8A932] text-[#101826] hover:bg-[#E7BF57]"}`} style={{ fontFamily: operationsFont.rajdhani, fontWeight: 700 }} type="submit">
                              {request.welcome_email_status === "sent" ? "Send welcome email again" : "Retry welcome email"}
                            </button>
                          </form>
                        ) : null}
                      </div>
                    ) : null}
                  </OperationsPanel>
                ) : null}

                <OperationsPanel title="Internal Notes">
                  {canDecide ? (
                    <form action={saveDosAccessRequestNotesAction} className="grid gap-3">
                      <input name="id" type="hidden" value={request.id} />
                      <textarea className="min-h-24 w-full rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-950 outline-none focus:border-[#D8A932]" defaultValue={request.internal_notes ?? ""} maxLength={4000} name="notes" />
                      <button className={`${buttonBase} border-slate-300 bg-white text-slate-800 hover:border-[#D8A932]`} style={{ fontFamily: operationsFont.rajdhani, fontWeight: 700 }} type="submit">
                        Save notes
                      </button>
                    </form>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm text-slate-700">{request.internal_notes || "-"}</p>
                  )}
                </OperationsPanel>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </OperationsShell>
  );
}
