import Link from "next/link";
import { dosAccessRequestStatusLabel } from "@/src/lib/dos/access-request-model";
import { loadDosAccessRequestsForOperations, type DosAccessRequestListItem } from "@/src/lib/dos/access-requests";
import { canAccessOperationsModule, getOperationsAuthorization } from "@/src/lib/operations/auth";
import {
  loadOperationsSubmissions,
  operationsSubmissionSourceOptions,
  operationsSubmissionStatusLabel,
  type OperationsSubmissionListItem,
} from "@/src/lib/operations/submissions";
import { OperationsAccessDenied, OperationsShell } from "../_components/OperationsShell";
import {
  formatOperationsDate,
  OperationsActionLink,
  OperationsBadge,
  OperationsEmptyState,
  OperationsMetric,
  OperationsPanel,
  type OperationsTone,
} from "../_components/OperationsUI";

export const dynamic = "force-dynamic";

function toneForStatus(status: string): OperationsTone {
  if (status === "new") {
    return "blue";
  }

  if (status === "needs_follow_up" || status === "follow_up") {
    return "amber";
  }

  if (status === "converted" || status === "archived") {
    return "green";
  }

  return "muted";
}

function isKitchenTableGospelSubmission(submission: OperationsSubmissionListItem) {
  return submission.type === "general"
    && submission.detail.startsWith("Kitchen Table Gospel");
}

function sourceLabelForSubmission(submission: OperationsSubmissionListItem) {
  return isKitchenTableGospelSubmission(submission)
    ? "Kitchen Table Gospel"
    : submission.sourceLabel;
}

function toneForSource(submission: OperationsSubmissionListItem): OperationsTone {
  if (submission.isSensitive) {
    return "red";
  }

  if (isKitchenTableGospelSubmission(submission)) {
    return "blue";
  }

  if (submission.sourceGroupLabel === "Missionary Application") {
    return "blue";
  }

  if (submission.sourceGroupLabel === "Finance") {
    return "green";
  }

  if (submission.sourceGroupLabel === "Prayer") {
    return "amber";
  }

  return "muted";
}

// USA-289: DOS access requests are their own record type (dos_access_requests),
// listed here alongside form submissions so the inbox stays the one queue.
const dosAccessSourceKey = "dos_access_request";

type InboxRow = {
  detail: string;
  followUp: string;
  href: string;
  id: string;
  isSensitive: boolean;
  isTestRecord: boolean;
  sourceKey: string;
  sourceLabel: string;
  sourceTone: OperationsTone;
  statusLabel: string;
  statusTone: OperationsTone;
  submittedAt: string;
  submitter: string;
};

function inboxRowFromSubmission(submission: OperationsSubmissionListItem): InboxRow {
  return {
    detail: submission.reviewSummary ?? submission.detail,
    followUp: submission.nextAction ?? submission.followUpState ?? "Needs review",
    href: submission.href,
    id: submission.id,
    isSensitive: submission.isSensitive,
    isTestRecord: submission.isTestRecord,
    sourceKey: submission.sourceKey,
    sourceLabel: sourceLabelForSubmission(submission),
    sourceTone: toneForSource(submission),
    statusLabel: operationsSubmissionStatusLabel(submission.status),
    statusTone: toneForStatus(submission.status),
    submittedAt: submission.submittedAt,
    submitter: submission.submitter,
  };
}

function dosAccessFollowUp(request: DosAccessRequestListItem) {
  if (request.status === "submitted") {
    return "Approve or decline";
  }

  if (request.status === "declined") {
    return "Declined · no access";
  }

  if (request.accessStatus !== "ready") {
    return request.accessStatus === "failed" ? "Access setup failed · retry" : "Access setup in progress";
  }

  if (request.welcomeEmailStatus === "failed") {
    return "Welcome email failed · retry";
  }

  return request.welcomeEmailStatus === "sent" ? "Access ready · email accepted" : "Access ready · email not sent";
}

function inboxRowFromDosAccessRequest(request: DosAccessRequestListItem): InboxRow {
  const needsAttention = request.status === "approved"
    && (request.accessStatus === "failed" || request.welcomeEmailStatus === "failed");

  return {
    detail: `${request.referenceCode} · ${request.requestType === "organization" ? `Organization: ${request.organizationName ?? ""}` : "Individual"} · ${request.email}`,
    followUp: dosAccessFollowUp(request),
    href: request.href,
    id: `dos-access-${request.id}`,
    isSensitive: false,
    isTestRecord: request.isTestRecord,
    sourceKey: dosAccessSourceKey,
    sourceLabel: "DOS Access Request",
    sourceTone: "blue",
    statusLabel: needsAttention ? "Needs Attention" : dosAccessRequestStatusLabel(request.status),
    statusTone: needsAttention ? "red" : request.status === "submitted" ? "blue" : request.status === "approved" ? "green" : "muted",
    submittedAt: request.submittedAt,
    submitter: request.name,
  };
}

export default async function OperationsSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const [authorization, query] = await Promise.all([
    getOperationsAuthorization(),
    searchParams,
  ]);

  if (authorization.status !== "authorized") {
    return null;
  }

  if (!canAccessOperationsModule(authorization, "submissions")) {
    return <OperationsAccessDenied active="submissions" authorization={authorization} />;
  }

  const [{ error, submissions }, dosAccess] = await Promise.all([
    loadOperationsSubmissions({ authorization }),
    loadDosAccessRequestsForOperations({ authorization }),
  ]);
  const rows: InboxRow[] = [
    ...submissions.map(inboxRowFromSubmission),
    ...dosAccess.requests.map(inboxRowFromDosAccessRequest),
  ].sort((first, second) => second.submittedAt.localeCompare(first.submittedAt));
  const sourceOptions = [
    ...operationsSubmissionSourceOptions(submissions),
    ...(dosAccess.requests.length > 0
      ? [{ count: dosAccess.requests.length, key: dosAccessSourceKey, label: "DOS Access Request" }]
      : []),
  ].sort((first, second) => first.label.localeCompare(second.label));
  const selectedSource = sourceOptions.some((option) => option.key === query.type)
    ? query.type ?? null
    : null;
  const visibleSubmissions = selectedSource
    ? rows.filter((row) => row.sourceKey === selectedSource)
    : rows;
  const newCount = submissions.filter((submission) => submission.status === "new").length
    + dosAccess.requests.filter((request) => request.status === "submitted").length;
  const followUpCount = submissions.filter((submission) => submission.status === "needs_follow_up" || submission.status === "follow_up").length
    + dosAccess.requests.filter((request) => request.status === "approved" && (request.accessStatus !== "ready" || request.welcomeEmailStatus !== "sent")).length;
  const restrictedCount = submissions.filter((submission) => submission.isSensitive).length;
  const dosAccessError = dosAccess.error
    ? `DOS access requests could not be loaded: ${dosAccess.error}`
    : dosAccess.migrationPending
      ? "DOS access requests are being saved as DOS Walkthrough submissions until the dos_access_requests migration (USA-289) is applied."
      : null;

  return (
    <OperationsShell
      active="submissions"
      action={<OperationsActionLink href="/restoration" variant="outline">Restoration Intake</OperationsActionLink>}
      authorization={authorization}
      title="Forms / Submissions"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <OperationsMetric label="New" value={newCount} />
          <OperationsMetric label="Follow Up" value={followUpCount} />
          <OperationsMetric label="Restricted" value={restrictedCount} />
        </div>

        {error ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            {error}
          </section>
        ) : null}

        {dosAccessError ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            {dosAccessError}
          </section>
        ) : null}

        <OperationsPanel title="Submission Queue">
          {rows.length > 0 ? (
            <div className="space-y-3">
              <form action="/operations/submissions" className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-xs">
                  <span className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Type</span>
                  <select
                    className="min-h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#D8A932]"
                    defaultValue={selectedSource ?? ""}
                    name="type"
                  >
                    <option value="">All types</option>
                    {sourceOptions.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label} ({option.count})
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="inline-flex min-h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-[11px] uppercase tracking-[0.12em] text-slate-800 transition hover:border-[#D8A932] hover:text-[#7A5200]"
                  type="submit"
                >
                  Apply
                </button>
              </form>

              {visibleSubmissions.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  <div className="hidden gap-3 pb-2 lg:grid lg:grid-cols-[150px_minmax(0,1.35fr)_130px_150px_110px]">
                    {["Type", "Submission", "Status", "Follow Up", "Submitted"].map((heading) => (
                      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400" key={heading}>
                        {heading}
                      </p>
                    ))}
                  </div>
                  {visibleSubmissions.map((submission) => (
                    <Link
                      className="grid gap-2 py-3 first:pt-0 lg:grid-cols-[150px_minmax(0,1.35fr)_130px_150px_110px] lg:items-center lg:gap-3"
                      href={submission.href}
                      key={submission.id}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <OperationsBadge tone={submission.sourceTone}>
                          {submission.sourceLabel}
                        </OperationsBadge>
                        {submission.isSensitive ? <OperationsBadge tone="red">Restricted</OperationsBadge> : null}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">{submission.submitter}</p>
                        <p className="mt-1 truncate text-sm text-slate-500">
                          {submission.detail}
                        </p>
                      </div>
                      <div>
                        <OperationsBadge tone={submission.statusTone}>
                          {submission.statusLabel}
                        </OperationsBadge>
                      </div>
                      <p className="truncate text-sm text-slate-700">
                        {submission.followUp}
                      </p>
                      <p className="text-sm text-slate-500">{formatOperationsDate(submission.submittedAt)}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <OperationsEmptyState>
                  No submissions match this type.
                </OperationsEmptyState>
              )}
            </div>
          ) : (
            <OperationsEmptyState
              action={<OperationsActionLink href="/restoration" variant="outline">Open Restoration</OperationsActionLink>}
            >
              No submissions are available in your current Operations scope.
            </OperationsEmptyState>
          )}
        </OperationsPanel>
      </div>
    </OperationsShell>
  );
}
