import { FinanceSubnav } from "../_components/FinanceSubnav";
import { canAccessOperationsModule, canManageOperationsModule, getOperationsAuthorization } from "@/src/lib/operations/auth";
import { loadOperationsFinanceOverview, type OperationsFinanceGivingRecord, type OperationsFinanceMatch, type OperationsFinanceSyncRun } from "@/src/lib/operations/finance";
import { getPlanningCenterGivingConfigStatus } from "@/src/lib/planning-center/giving-sync";
import { runPlanningCenterSyncAction } from "../actions";
import { OperationsAccessDenied, OperationsShell } from "../../_components/OperationsShell";
import {
  formatOperationsDate,
  OperationsBadge,
  OperationsEmptyState,
  OperationsMetric,
  OperationsPanel,
  operationsFont,
  type OperationsTone,
} from "../../_components/OperationsUI";

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

function attributionTone(record: OperationsFinanceGivingRecord): OperationsTone {
  if (record.refunded) {
    return "red";
  }

  if (record.attribution === "missionary") {
    return "green";
  }

  if (record.attribution === "unmapped") {
    return "amber";
  }

  return "muted";
}

function GivingRecordRow({ record }: { record: OperationsFinanceGivingRecord }) {
  return (
    <div className="grid gap-2 py-3 first:pt-0 last:pb-0 lg:grid-cols-[minmax(0,1.1fr)_100px_110px_minmax(0,1fr)_130px_110px] lg:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-950">{record.donor}</p>
        <p className="mt-1 truncate text-xs text-slate-500">{record.planningCenterId ?? "No Planning Center id"}</p>
      </div>
      <p className="text-sm font-semibold text-slate-900">{record.amountLabel}</p>
      <p className="text-sm text-slate-700">{record.giftType}</p>
      <p className="truncate text-sm text-slate-600">{record.designation ?? "No designation"}</p>
      <div>
        <OperationsBadge tone={attributionTone(record)}>
          {record.refunded ? "Refunded" : record.attributionLabel}
        </OperationsBadge>
      </div>
      <span className="text-xs text-slate-500">{formatOperationsDate(record.date)}</span>
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

export default async function OperationsFinanceGivingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; synced?: string }>;
}) {
  const [query, authorization] = await Promise.all([searchParams, getOperationsAuthorization()]);

  if (authorization.status !== "authorized") {
    return null;
  }

  if (!canAccessOperationsModule(authorization, "finance")) {
    return <OperationsAccessDenied active="finance" authorization={authorization} />;
  }

  const overview = await loadOperationsFinanceOverview({ authorization });
  const canManage = canManageOperationsModule(authorization, "finance");
  const pcoConfig = getPlanningCenterGivingConfigStatus();

  return (
    <OperationsShell
      active="finance"
      action={canManage ? (
        <form action={runPlanningCenterSyncAction}>
          <button
            className="inline-flex min-h-9 items-center justify-center rounded-md border border-[#D8A932] bg-[#D8A932] px-3 text-[11px] uppercase tracking-[0.12em] text-[#101826] transition hover:bg-[#E7BF57] disabled:opacity-50"
            disabled={!pcoConfig.configured}
            style={{ fontFamily: operationsFont.rajdhani, fontWeight: 700 }}
            type="submit"
          >
            Run Sync
          </button>
        </form>
      ) : null}
      authorization={authorization}
      title="Finance"
    >
      <FinanceSubnav active="giving" />
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <OperationsMetric label="Records" value={overview.totalRecordCount} detail={overview.lastSync ? `Synced ${formatOperationsDate(overview.lastSync.startedAt)}` : "Not synced yet"} />
          <OperationsMetric label="General / USAM" value={overview.generalTotalLabel} />
          <OperationsMetric label="Missionary" value={overview.missionaryTotalLabel} />
          <OperationsMetric label="Unmapped" value={overview.unmappedCount} detail={overview.refundedCount > 0 ? `${overview.refundedCount} refunded` : undefined} />
        </div>

        {query.synced ? (
          <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Planning Center sync complete.
          </section>
        ) : null}

        {query.error ? (
          <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {query.error}
          </section>
        ) : null}

        {!pcoConfig.configured ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            Planning Center is not connected in this environment. Missing: {pcoConfig.missing.join(", ")}.
          </section>
        ) : null}

        {overview.error ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            {overview.error}
          </section>
        ) : null}

        <OperationsPanel title="Planning Center Giving Records">
          {overview.records.length > 0 ? (
            <div className="divide-y divide-slate-100">
              <div className="hidden gap-3 pb-2 lg:grid lg:grid-cols-[minmax(0,1.1fr)_100px_110px_minmax(0,1fr)_130px_110px]">
                {["Donor", "Amount", "Type", "Designation", "Attribution", "Date"].map((heading) => (
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

        {overview.unmappedDesignations.length > 0 ? (
          <OperationsPanel title="Unmapped Designations">
            <p className="mb-3 text-sm text-slate-500">
              These funds have no explicit missionary or general mapping, so their giving is not counted toward anyone.
            </p>
            <div className="divide-y divide-slate-100">
              {overview.unmappedDesignations.map((entry) => (
                <div className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_90px_110px] sm:items-center" key={entry.fundId ?? entry.label}>
                  <p className="truncate text-sm font-semibold text-slate-950">{entry.label}</p>
                  <p className="text-sm text-slate-700">{entry.count} {entry.count === 1 ? "gift" : "gifts"}</p>
                  <p className="text-sm text-slate-700">{entry.amountLabel}</p>
                </div>
              ))}
            </div>
          </OperationsPanel>
        ) : null}

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
