import Link from "next/link";
import { canAccessOperationsModule, getOperationsAuthorization } from "@/src/lib/operations/auth";
import { loadFinanceOverview, type FinanceFiling } from "@/src/lib/finance/workspace";
import { complianceFactLabels, isFactVerified, taxPeriodCriticalFacts } from "@/src/lib/finance/facts";
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
import { FinanceSubnav } from "./_components/FinanceSubnav";

export const dynamic = "force-dynamic";

function filingTone(status: string): OperationsTone {
  if (status === "overdue") {
    return "red";
  }

  if (status === "due_soon" || status === "needs_verification") {
    return "amber";
  }

  if (status === "filed" || status === "extended") {
    return "green";
  }

  return "muted";
}

function filingStatusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function FilingRow({ filing }: { filing: FinanceFiling }) {
  return (
    <div className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_130px_150px] sm:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-950">{filing.filingName}</p>
        <p className="mt-1 truncate text-sm text-slate-500">
          {filing.jurisdiction} · {filing.agency}
        </p>
      </div>
      <OperationsBadge tone={filingTone(filing.status)}>
        {filingStatusLabel(filing.status)}
      </OperationsBadge>
      <p className="text-sm text-slate-700">
        {filing.dueDate ? formatOperationsDate(filing.dueDate) : "No date yet"}
      </p>
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

  const today = new Date().toISOString().slice(0, 10);
  const overview = await loadFinanceOverview({ today });

  if (!overview) {
    return (
      <OperationsShell active="finance" authorization={authorization} title="Finance">
        <FinanceSubnav active="overview" />
        <OperationsEmptyState>
          The USA Missionaries organization record is not available in this environment.
        </OperationsEmptyState>
      </OperationsShell>
    );
  }

  // "What needs review" is the union of unverified compliance facts, filings
  // that cannot be dated yet, and unreconciled bank activity.
  const needsVerificationFilings = overview.filings.filter((filing) => filing.status === "needs_verification");
  const missingCriticalFacts = taxPeriodCriticalFacts
    .filter((key) => !isFactVerified(overview.facts.get(key)));
  const attentionCount = needsVerificationFilings.length
    + missingCriticalFacts.length
    + overview.banking.unreconciledTransactions
    + overview.banking.missingStatements;
  const nextFiling = overview.filings
    .filter((filing) => filing.dueDate)
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))[0] ?? null;

  return (
    <OperationsShell active="finance" authorization={authorization} title="Finance">
      <FinanceSubnav active="overview" />

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <OperationsMetric
            href="/operations/finance/giving"
            label="Giving To Date"
            value={overview.givingTotalLabel}
          />
          <OperationsMetric
            href="/operations/finance/banking"
            label="Unreconciled"
            value={overview.banking.unreconciledTransactions}
          />
          <OperationsMetric
            href="/operations/finance/compliance"
            label="Needs Review"
            value={attentionCount}
          />
          <OperationsMetric
            href="/operations/finance/compliance"
            label="Due Next"
            value={nextFiling?.dueDate ? formatOperationsDate(nextFiling.dueDate) : "—"}
            detail={nextFiling?.dueDate ? nextFiling.filingName : "No verified due date yet"}
          />
        </div>

        {missingCriticalFacts.length > 0 ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            <p className="font-semibold text-amber-900">The tax period is not verified yet.</p>
            <p className="mt-1 text-amber-900">
              {missingCriticalFacts.map((key) => complianceFactLabels[key]).join(" and ")} still
              {missingCriticalFacts.length === 1 ? " needs" : " need"} a source document. Until then Finance
              will not state a Form 990 due date.
            </p>
            <div className="mt-3">
              <OperationsActionLink href="/operations/finance/compliance" variant="outline">
                Open Compliance
              </OperationsActionLink>
            </div>
          </section>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.8fr)]">
          <OperationsPanel
            action={<OperationsActionLink href="/operations/finance/compliance">Open</OperationsActionLink>}
            title="Filing Calendar"
          >
            {overview.filings.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {overview.filings.map((filing) => (
                  <FilingRow filing={filing} key={filing.ruleKey} />
                ))}
              </div>
            ) : (
              <OperationsEmptyState>No compliance rules apply to this organization yet.</OperationsEmptyState>
            )}
          </OperationsPanel>

          <OperationsPanel
            action={<OperationsActionLink href="/operations/finance/banking">Open</OperationsActionLink>}
            title="Banking"
          >
            {overview.banking.accounts.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {overview.banking.accounts.map((account) => (
                  <div className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0" key={account.id}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">{account.name}</p>
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {account.institution ?? "No institution"}
                        {account.last4 ? ` ····${account.last4}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <OperationsEmptyState
                action={<OperationsActionLink href="/operations/finance/banking" variant="outline">Add an account</OperationsActionLink>}
              >
                No bank accounts are set up yet.
              </OperationsEmptyState>
            )}
          </OperationsPanel>
        </div>

        <OperationsPanel
          action={<OperationsActionLink href="/operations/finance/documents">Open</OperationsActionLink>}
          title="Evidence"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Link className="rounded-lg border border-slate-200 bg-slate-50 p-3 transition hover:border-[#D8A932]/70 hover:bg-white" href="/operations/finance/documents">
              <p className="text-sm font-semibold text-slate-950">{overview.documentCount}</p>
              <p className="mt-1 text-xs text-slate-500">Source documents</p>
            </Link>
            <Link className="rounded-lg border border-slate-200 bg-slate-50 p-3 transition hover:border-[#D8A932]/70 hover:bg-white" href="/operations/finance/compliance">
              <p className="text-sm font-semibold text-slate-950">{overview.unverifiedFactCount}</p>
              <p className="mt-1 text-xs text-slate-500">Facts awaiting verification</p>
            </Link>
            <Link className="rounded-lg border border-slate-200 bg-slate-50 p-3 transition hover:border-[#D8A932]/70 hover:bg-white" href="/operations/finance/year-end">
              <p className="text-sm font-semibold text-slate-950">{overview.periods.length}</p>
              <p className="mt-1 text-xs text-slate-500">Tax periods</p>
            </Link>
          </div>
        </OperationsPanel>
      </div>
    </OperationsShell>
  );
}
