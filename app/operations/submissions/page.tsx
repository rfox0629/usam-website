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

        <OperationsPanel title="Submission Queue">
          {submissions.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {/* Column labels appear once, not repeated on every row. */}
              <div className="hidden gap-3 pb-2 lg:grid lg:grid-cols-[minmax(0,1.4fr)_150px_150px_110px]">
                {["Submission", "Status", "Follow Up", "Submitted"].map((heading) => (
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400" key={heading}>
                    {heading}
                  </p>
                ))}
              </div>
              {submissions.map((submission) => (
                <Link
                  className="grid gap-2 py-3 first:pt-0 lg:grid-cols-[minmax(0,1.4fr)_150px_150px_110px] lg:items-center lg:gap-3"
                  href={submission.href}
                  key={submission.id}
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold text-slate-950">{submission.submitter}</span>
                      {submission.isSensitive ? <OperationsBadge tone="red">Restricted</OperationsBadge> : null}
                    </p>
                    <p className="mt-1 truncate text-sm text-slate-500">
                      {submission.sourceLabel} · {submission.reviewSummary ?? submission.detail}
                    </p>
                  </div>
                  <div>
                    <OperationsBadge tone={toneForStatus(submission.status)}>
                      {operationsSubmissionStatusLabel(submission.status)}
                    </OperationsBadge>
                  </div>
                  <p className="truncate text-sm text-slate-700">
                    {submission.nextAction ?? submission.followUpState ?? "Needs review"}
                  </p>
                  <p className="text-sm text-slate-500">{formatOperationsDate(submission.submittedAt)}</p>
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
