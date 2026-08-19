import { canAccessOperationsModule, getOperationsAuthorization } from "@/src/lib/operations/auth";
import { loadComplianceFacts } from "@/src/lib/finance/facts";
import { loadForm990Readiness } from "@/src/lib/finance/form990";
import { loadFinanceOrganization, loadTaxPeriods } from "@/src/lib/finance/workspace";
import { OperationsAccessDenied, OperationsShell } from "../../_components/OperationsShell";
import {
  formatOperationsDate,
  OperationsBadge,
  OperationsEmptyState,
  OperationsPanel,
  type OperationsTone,
} from "../../_components/OperationsUI";
import { FinanceSubnav } from "../_components/FinanceSubnav";

export const dynamic = "force-dynamic";

function readinessTone(readiness: string): OperationsTone {
  if (readiness === "ready" || readiness === "cpa_confirmed") {
    return "green";
  }

  if (readiness === "needs_review" || readiness === "needs_cpa_review") {
    return "amber";
  }

  if (readiness === "data_available") {
    return "blue";
  }

  return "muted";
}

function label(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export default async function OperationsFinanceYearEndPage() {
  const authorization = await getOperationsAuthorization();

  if (authorization.status !== "authorized") {
    return null;
  }

  if (!canAccessOperationsModule(authorization, "finance")) {
    return <OperationsAccessDenied active="finance" authorization={authorization} />;
  }

  const organization = await loadFinanceOrganization();

  if (!organization) {
    return (
      <OperationsShell active="finance" authorization={authorization} title="Finance">
        <FinanceSubnav active="year-end" />
        <OperationsEmptyState>Organization record is unavailable.</OperationsEmptyState>
      </OperationsShell>
    );
  }

  const [{ facts }, periods] = await Promise.all([
    loadComplianceFacts(organization.id),
    loadTaxPeriods(organization.id),
  ]);
  const activePeriod = periods.find((period) => period.isVerified) ?? periods[0] ?? null;
  const parts = await loadForm990Readiness({
    facts,
    organizationId: organization.id,
    taxPeriodId: activePeriod?.isVerified ? activePeriod.id : null,
  });
  const readyCount = parts.filter((part) => part.readiness === "ready" || part.readiness === "cpa_confirmed").length;

  return (
    <OperationsShell active="finance" authorization={authorization} title="Finance">
      <FinanceSubnav active="year-end" />

      <div className="space-y-4">
        <OperationsPanel title="Tax Period">
          {activePeriod ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Period</p>
                <p className="mt-1 text-sm text-slate-900">
                  {activePeriod.periodStart ? formatOperationsDate(activePeriod.periodStart) : "?"} – {activePeriod.periodEnd ? formatOperationsDate(activePeriod.periodEnd) : "?"}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Verified</p>
                <div className="mt-1">
                  <OperationsBadge tone={activePeriod.isVerified ? "green" : "amber"}>
                    {activePeriod.isVerified ? "Verified" : "Needs verification"}
                  </OperationsBadge>
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Status</p>
                <p className="mt-1 text-sm text-slate-900">{label(activePeriod.status)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Parts ready</p>
                <p className="mt-1 text-sm text-slate-900">{readyCount} of {parts.length}</p>
              </div>
            </div>
          ) : (
            <OperationsEmptyState>
              No tax period exists yet. Verify the accounting period in Compliance first — the 990 workspace and its due date both depend on it.
            </OperationsEmptyState>
          )}
        </OperationsPanel>

        <OperationsPanel
          action={<OperationsBadge tone={readyCount === parts.length ? "green" : "muted"}>
            {readyCount === parts.length ? "CPA Package Ready" : "In preparation"}
          </OperationsBadge>}
          title="Form 990 Readiness"
        >
          <p className="mb-4 text-sm text-slate-500">
            Each part shows the real source data behind it. Schedule triggers are prompts for review, never answered automatically. Operations prepares the package; the CPA reviews and files it.
          </p>
          <div className="divide-y divide-slate-100">
            <div className="hidden gap-3 pb-2 lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_160px]">
              {["Part", "Source", "Readiness"].map((heading) => (
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400" key={heading}>{heading}</p>
              ))}
            </div>
            {parts.map((part) => (
              <div
                className="grid gap-2 py-3 first:pt-0 last:pb-0 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_160px] lg:items-center lg:gap-3"
                key={part.key}
              >
                <p className="text-sm font-semibold text-slate-950">{part.title}</p>
                <p className="truncate text-sm text-slate-600">{part.detail}</p>
                <div>
                  <OperationsBadge tone={readinessTone(part.readiness)}>{label(part.readiness)}</OperationsBadge>
                </div>
              </div>
            ))}
          </div>
        </OperationsPanel>
      </div>
    </OperationsShell>
  );
}
