import { canAccessOperationsModule, getOperationsAuthorization } from "@/src/lib/operations/auth";
import { loadBankingSummary, loadFinanceOrganization } from "@/src/lib/finance/workspace";
import { OperationsAccessDenied, OperationsShell } from "../../_components/OperationsShell";
import {
  OperationsEmptyState,
  OperationsMetric,
  OperationsPanel,
} from "../../_components/OperationsUI";
import { FinanceSubnav } from "../_components/FinanceSubnav";

export const dynamic = "force-dynamic";

export default async function OperationsFinanceBankingPage() {
  const authorization = await getOperationsAuthorization();

  if (authorization.status !== "authorized") {
    return null;
  }

  if (!canAccessOperationsModule(authorization, "finance")) {
    return <OperationsAccessDenied active="finance" authorization={authorization} />;
  }

  const organization = await loadFinanceOrganization();
  const banking = organization
    ? await loadBankingSummary(organization.id)
    : { accounts: [], missingStatements: 0, statementsByStatus: {}, unreconciledTransactions: 0 };

  return (
    <OperationsShell active="finance" authorization={authorization} title="Finance">
      <FinanceSubnav active="banking" />

      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <OperationsMetric label="Accounts" value={banking.accounts.length} />
          <OperationsMetric label="Statements Missing" value={banking.missingStatements} />
          <OperationsMetric label="Unreconciled" value={banking.unreconciledTransactions} />
        </div>

        <OperationsPanel title="Bank Accounts">
          {banking.accounts.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {banking.accounts.map((account) => (
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
            <OperationsEmptyState>
              No bank accounts yet. Adding an account creates the statement-month grid for the verified tax period, so each month can be uploaded and reconciled.
            </OperationsEmptyState>
          )}
        </OperationsPanel>

        <OperationsPanel title="Statement Months">
          <OperationsEmptyState>
            Statement tracking activates once an account exists and the tax period is verified. Each account-month then shows Missing, Uploaded, Parsed, Reconciled, or Reviewed.
          </OperationsEmptyState>
        </OperationsPanel>
      </div>
    </OperationsShell>
  );
}
