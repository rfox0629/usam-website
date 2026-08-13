import Link from "next/link";
import { canAccessOperationsModule, getOperationsAuthorization } from "@/src/lib/operations/auth";
import { loadOperationsOnboarding } from "@/src/lib/operations/onboarding";
import { OperationsAccessDenied, OperationsShell } from "../_components/OperationsShell";
import {
  formatOperationsDate,
  OperationsActionLink,
  OperationsBadge,
  OperationsEmptyState,
  OperationsMetric,
  OperationsPanel,
} from "../_components/OperationsUI";

export const dynamic = "force-dynamic";

export default async function OperationsMissionariesPage() {
  const authorization = await getOperationsAuthorization();

  if (authorization.status !== "authorized") {
    return null;
  }

  if (!canAccessOperationsModule(authorization, "missionaries")) {
    return <OperationsAccessDenied active="missionaries" authorization={authorization} />;
  }

  const { error, items } = await loadOperationsOnboarding();
  const needsReview = items.filter((item) => item.reviewLabel === "Needs review").length;
  const missingRequirements = items.filter((item) => item.missingRequirements.length > 0).length;
  const accepted = items.filter((item) => item.decisionLabel === "Accepted").length;

  return (
    <OperationsShell
      active="missionaries"
      action={<OperationsActionLink href="/join/usam" variant="outline">Candidate Form</OperationsActionLink>}
      authorization={authorization}
      eyebrow="Applications"
      title="Missionaries / Onboarding"
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <OperationsMetric label="Needs Review" value={needsReview} />
          <OperationsMetric label="Missing Requirements" value={missingRequirements} />
          <OperationsMetric label="Accepted" value={accepted} />
        </div>

        {error ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            {error}
          </section>
        ) : null}

        <OperationsPanel eyebrow="USA-167 Contract" title="Onboarding Queue">
          {items.length > 0 ? (
            <div className="grid gap-3">
              {items.map((item) => (
                <Link
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:border-[#D8A932]/70 hover:bg-white"
                  href={item.href}
                  key={item.id}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-base font-semibold text-slate-950">{item.candidate}</h2>
                        <OperationsBadge tone={item.reviewLabel === "Needs review" ? "amber" : "green"}>
                          {item.reviewLabel}
                        </OperationsBadge>
                        <OperationsBadge tone="muted">{item.status}</OperationsBadge>
                      </div>
                      <p className="mt-2 truncate text-sm text-slate-500">{item.email ?? "No email"} · Submitted {formatOperationsDate(item.submittedAt)}</p>
                    </div>
                    <OperationsBadge tone={item.missingRequirements.length > 0 ? "amber" : "green"}>
                      {item.completionLabel}
                    </OperationsBadge>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      ["References", item.referencesLabel],
                      ["Documents", item.documentsLabel],
                      ["Decision", item.decisionLabel],
                      ["Follow Up", item.followUpLabel],
                      ["Fundraising", item.fundraisingLabel],
                      ["Profile", item.profileLabel],
                      ["DOS Setup", item.dosSetupLabel],
                      ["Owner", item.assignedTo ?? "Unassigned"],
                    ].map(([label, value]) => (
                      <div className="min-w-0" key={label}>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{label}</p>
                        <p className="mt-1 truncate text-sm text-slate-800">{value}</p>
                      </div>
                    ))}
                  </div>

                  {item.missingRequirements.length > 0 ? (
                    <p className="mt-4 text-sm text-slate-500">
                      Missing: {item.missingRequirements.join(", ")}
                    </p>
                  ) : null}
                </Link>
              ))}
            </div>
          ) : (
            <OperationsEmptyState
              action={<OperationsActionLink href="/join/usam" variant="outline">Open Candidate Form</OperationsActionLink>}
            >
              No USA Missionary applications are connected yet.
            </OperationsEmptyState>
          )}
        </OperationsPanel>
      </div>
    </OperationsShell>
  );
}
