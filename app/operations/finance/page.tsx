import { canAccessOperationsModule, getOperationsAuthorization } from "@/src/lib/operations/auth";
import { loadOperationsFinanceOverview, type OperationsFinanceGivingRecord, type OperationsFinanceMatch, type OperationsFinanceSyncRun } from "@/src/lib/operations/finance";
import { OperationsAccessDenied, OperationsShell } from "../_components/OperationsShell";
import {
  formatOperationsDate,
  OperationsBadge,
  OperationsEmptyState,
  OperationsMetric,
  OperationsPanel,
  type OperationsTone,
} from "../_components/OperationsUI";

export const dynamic = "force-dynamic";

function toneForStatus(status: string): OperationsTone {
  const normalized = status.toLowerCase();

  if (normalized.includes("matched") || normalized.includes("succeeded")) {
    return "green";
  }

  if (normalized.includes("review") || normalized.includes("pending") || normalized.includes("running")) {
    return "amber";
  }

  if (normalized.includes("failed") || normalized.includes("rejected")) {
    return "red";
  }

  return "muted";
}

function GivingRecordRow({ record }: { record: OperationsFinanceGivingRecord }) {
  return (
    <div className="grid gap-2 py-3 first:pt-0 last:pb-0 lg:grid-cols-[minmax(0,1.2fr)_110px_110px_minmax(0,1fr)_110px] lg:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-950">{record.donor}</p>
        <p className="mt-1 truncate text-xs text-slate-500">{record.email ?? record.planningCenterId ?? "No donor email"}</p>
      </div>
      <p className="text-sm font-semibold text-slate-900">{record.amountLabel}</p>
      <p className="text-sm text-slate-700">{record.giftType}</p>
      <p className="truncate text-sm text-slate-600">{record.designation ?? "No designation"}</p>
      <div className="flex flex-wrap items-center gap-2">
        <OperationsBadge tone={toneForStatus(record.status)}>{record.status}</OperationsBadge>
        <span className="text-xs text-slate-500">{formatOperationsDate(record.date)}</span>
      </div>
    </div>
  );
}

function SyncRunRow({ run }: { run: OperationsFinanceSyncRun }) {
  return (
    <div className="grid gap-2 py-3 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_110px_90px_90px] md:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-950">{run.syncType}</p>
        <p className="mt-1 truncate text-xs text-slate-500">{run.errorMessage ?? formatOperationsDate(run.startedAt)}</p>
      </div>
      <OperationsBadge tone={toneForStatus(run.status)}>{run.status}</OperationsBadge>
      <p className="text-sm text-slate-700">{run.seen} seen</p>
      <p className="text-sm text-slate-700">{run.imported} imported</p>
    </div>
  );
}

function MatchRow({ match }: { match: OperationsFinanceMatch }) {
  return (
    <div className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_90px_110px] sm:items-center">
      <OperationsBadge tone={toneForStatus(match.status)}>{match.status}</OperationsBadge>
      <p className="text-sm text-slate-700">{match.confidenceLabel}</p>
      <p className="text-sm text-slate-500">{formatOperationsDate(match.createdAt)}</p>
    </div>
  );
}

export default async function OperationsFinancePage() {
  const authorization = await getOperationsAuthorization();

  if (authorization.status !== "authorized") {
    return null;
  }

  if (!canAccessOperationsModule(authorization, "finance")) {
    return <OperationsAccessDenied active="finance" authorization={authorization} />;
  }

  const overview = await loadOperationsFinanceOverview({ authorization });

  return (
    <OperationsShell
      active="finance"
      authorization={authorization}
      eyebrow="Read-only V1"
      title="Finance"
    >
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <OperationsMetric label="Source" value="PCO" detail={overview.lastSync ? `${overview.sourceLabel} · ${formatOperationsDate(overview.lastSync.startedAt)}` : overview.sourceLabel} />
          <OperationsMetric label="Records" value={overview.totalRecordCount} />
          <OperationsMetric label="This Month" value={overview.currentMonthGrossLabel} />
          <OperationsMetric label="Needs Review" value={overview.needsReviewCount} detail={`${overview.matchCount} recent matches`} />
        </div>

        {overview.error ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            {overview.error}
          </section>
        ) : null}

        <OperationsPanel title="Planning Center Giving Records">
          {overview.records.length > 0 ? (
            <div className="divide-y divide-slate-100">
              <div className="hidden gap-3 pb-2 lg:grid lg:grid-cols-[minmax(0,1.2fr)_110px_110px_minmax(0,1fr)_110px]">
                {["Donor", "Amount", "Type", "Designation", "Status"].map((heading) => (
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400" key={heading}>
                    {heading}
                  </p>
                ))}
              </div>
              {overview.records.map((record) => (
                <GivingRecordRow key={record.id} record={record} />
              ))}
            </div>
          ) : (
            <OperationsEmptyState>
              No Planning Center Giving records are available.
            </OperationsEmptyState>
          )}
        </OperationsPanel>

        <div className="grid gap-4 xl:grid-cols-2">
          <OperationsPanel title="Sync Runs">
            {overview.syncRuns.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {overview.syncRuns.map((run) => (
                  <SyncRunRow key={run.id} run={run} />
                ))}
              </div>
            ) : (
              <OperationsEmptyState>No sync runs are recorded.</OperationsEmptyState>
            )}
          </OperationsPanel>

          <OperationsPanel title="Commitment Matches">
            {overview.recentMatches.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {overview.recentMatches.map((match) => (
                  <MatchRow key={match.id} match={match} />
                ))}
              </div>
            ) : (
              <OperationsEmptyState>No recent matches are recorded.</OperationsEmptyState>
            )}
          </OperationsPanel>
        </div>
      </div>
    </OperationsShell>
  );
}
