import Link from "next/link";
import { canAccessOperationsModule, getOperationsAuthorization } from "@/src/lib/operations/auth";
import { loadOperationsSubmissions, operationsSubmissionStatusLabel } from "@/src/lib/operations/submissions";
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

export default async function OperationsSubmissionsPage() {
  const authorization = await getOperationsAuthorization();

  if (authorization.status !== "authorized") {
    return null;
  }

  if (!canAccessOperationsModule(authorization, "submissions")) {
    return <OperationsAccessDenied active="submissions" authorization={authorization} />;
  }

  const { error, submissions } = await loadOperationsSubmissions({ authorization });
  const newCount = submissions.filter((submission) => submission.status === "new").length;
  const followUpCount = submissions.filter((submission) => submission.status === "needs_follow_up" || submission.status === "follow_up").length;
  const restrictedCount = submissions.filter((submission) => submission.isSensitive).length;

  return (
    <OperationsShell
      active="submissions"
      action={<OperationsActionLink href="/restoration" variant="outline">Restoration Intake</OperationsActionLink>}
      authorization={authorization}
      eyebrow="Review"
      title="Forms / Submissions"
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <OperationsMetric label="New" value={newCount} />
          <OperationsMetric label="Follow Up" value={followUpCount} />
          <OperationsMetric detail="Full answers stay on case detail" label="Restricted" value={restrictedCount} />
        </div>

        {error ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            {error}
          </section>
        ) : null}

        <OperationsPanel eyebrow="Inbox" title="Submission Queue">
          {submissions.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {submissions.map((submission) => (
                <Link
                  className="grid gap-3 py-4 first:pt-0 last:pb-0 lg:grid-cols-[minmax(0,1.2fr)_170px_150px_170px_120px] lg:items-center"
                  href={submission.href}
                  key={submission.id}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">{submission.submitter}</p>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
                      {submission.reviewSummary ?? submission.detail}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 lg:hidden">
                      <OperationsBadge tone={toneForStatus(submission.status)}>
                        {operationsSubmissionStatusLabel(submission.status)}
                      </OperationsBadge>
                      {submission.isSensitive ? <OperationsBadge tone="red">Restricted</OperationsBadge> : null}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Type</p>
                    <p className="mt-1 truncate text-sm text-slate-700">{submission.sourceLabel}</p>
                  </div>
                  <div className="hidden lg:block">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Status</p>
                    <div className="mt-1">
                      <OperationsBadge tone={toneForStatus(submission.status)}>
                        {operationsSubmissionStatusLabel(submission.status)}
                      </OperationsBadge>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Follow Up</p>
                    <p className="mt-1 truncate text-sm text-slate-700">
                      {submission.nextAction ?? submission.followUpState ?? "Needs review"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Submitted</p>
                    <p className="mt-1 text-sm text-slate-700">{formatOperationsDate(submission.submittedAt)}</p>
                  </div>
                </Link>
              ))}
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
