import Link from "next/link";
import { canAccessOperationsModule, getOperationsAuthorization } from "@/src/lib/operations/auth";
import { loadOperationsOnboarding } from "@/src/lib/operations/onboarding";
import { loadOperationsSubmissions, operationsSubmissionStatusLabel } from "@/src/lib/operations/submissions";
import { OperationsAccessDenied, OperationsShell } from "./_components/OperationsShell";
import {
  formatOperationsDate,
  OperationsActionLink,
  OperationsBadge,
  OperationsEmptyState,
  OperationsMetric,
  OperationsPanel,
  type OperationsTone,
} from "./_components/OperationsUI";

function toneForStatus(status: string): OperationsTone {
  if (status === "new") {
    return "blue";
  }

  if (status === "needs_follow_up" || status === "follow_up") {
    return "amber";
  }

  if (status === "archived" || status === "converted") {
    return "green";
  }

  return "muted";
}

export default async function OperationsHomePage() {
  const authorization = await getOperationsAuthorization();

  if (authorization.status !== "authorized") {
    return null;
  }

  if (!canAccessOperationsModule(authorization, "home")) {
    return <OperationsAccessDenied active="home" authorization={authorization} />;
  }

  const canViewSubmissions = canAccessOperationsModule(authorization, "submissions");
  const canViewMissionaries = canAccessOperationsModule(authorization, "missionaries");
  const emptySubmissionsResult: Awaited<ReturnType<typeof loadOperationsSubmissions>> = { submissions: [] };
  const emptyOnboardingResult: Awaited<ReturnType<typeof loadOperationsOnboarding>> = { items: [] };
  const [{ error: submissionsError, submissions }, onboardingResult] = await Promise.all([
    canViewSubmissions
      ? loadOperationsSubmissions({ authorization, limit: 8 })
      : Promise.resolve(emptySubmissionsResult),
    canViewMissionaries
      ? loadOperationsOnboarding({ limit: 6 })
      : Promise.resolve(emptyOnboardingResult),
  ]);
  const onboardingItems = onboardingResult.items;
  const newSubmissions = submissions.filter((submission) => submission.status === "new");
  const followUpSubmissions = submissions.filter((submission) => (
    submission.status === "needs_follow_up" || submission.status === "follow_up"
  ));
  const onboardingNeedsReview = onboardingItems.filter((item) => (
    item.reviewLabel === "Needs review" || item.missingRequirements.length > 0
  ));
  const attentionCount = newSubmissions.length + followUpSubmissions.length + onboardingNeedsReview.length;

  return (
    <OperationsShell
      active="home"
      authorization={authorization}
      eyebrow="USA Missionaries"
      title="Operations Home"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <OperationsMetric
            href="/operations/submissions"
            label="Needs Attention"
            value={attentionCount}
          />
          <OperationsMetric
            href="/operations/submissions"
            label="New Submissions"
            value={newSubmissions.length}
          />
          <OperationsMetric
            href="/operations/missionaries"
            label="Onboarding"
            value={onboardingNeedsReview.length}
          />
          <OperationsMetric
            href="/operations/submissions"
            label="Follow Up"
            value={followUpSubmissions.length}
          />
        </div>

        {(submissionsError || onboardingResult.error) ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            {submissionsError ?? onboardingResult.error}
          </section>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.8fr)]">
          <OperationsPanel
            action={canViewSubmissions ? <OperationsActionLink href="/operations/submissions">Open Inbox</OperationsActionLink> : null}
            title="Submissions Needing Review"
          >
            {canViewSubmissions && submissions.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {submissions.slice(0, 5).map((submission) => (
                  <Link
                    className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                    href={submission.href}
                    key={submission.id}
                  >
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-950">{submission.submitter}</span>
                        <OperationsBadge tone={toneForStatus(submission.status)}>
                          {operationsSubmissionStatusLabel(submission.status)}
                        </OperationsBadge>
                        {submission.isSensitive ? <OperationsBadge tone="red">Restricted</OperationsBadge> : null}
                      </span>
                      <span className="mt-1 block truncate text-sm text-slate-500">
                        {submission.sourceLabel} · {submission.reviewSummary ?? submission.detail}
                      </span>
                    </span>
                    <span className="text-xs text-slate-500 sm:text-right">
                      {formatOperationsDate(submission.submittedAt)}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <OperationsEmptyState>
                {canViewSubmissions ? "No submissions are waiting in your current scope." : "No submission scope is assigned to this role."}
              </OperationsEmptyState>
            )}
          </OperationsPanel>

          <OperationsPanel
            action={canViewMissionaries ? <OperationsActionLink href="/operations/missionaries">Open</OperationsActionLink> : null}
            title="Missionary Applications"
          >
            {canViewMissionaries && onboardingItems.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {onboardingItems.slice(0, 4).map((item) => (
                  <Link
                    className="block py-3 first:pt-0 last:pb-0"
                    href={item.href}
                    key={item.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">{item.candidate}</p>
                        <p className="mt-1 truncate text-sm text-slate-500">
                          {item.completionLabel} · {item.followUpLabel}
                        </p>
                      </div>
                      <OperationsBadge tone={item.reviewLabel === "Needs review" ? "amber" : "green"}>
                        {item.reviewLabel}
                      </OperationsBadge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <OperationsEmptyState>
                {canViewMissionaries ? "No missionary applications are connected yet." : "Missionary onboarding is outside this role scope."}
              </OperationsEmptyState>
            )}
          </OperationsPanel>
        </div>
      </div>
    </OperationsShell>
  );
}
