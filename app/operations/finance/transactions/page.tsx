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

export default async function OperationsFinanceTransactionsPage() {
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
      <FinanceSubnav active="transactions" />

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <OperationsMetric label="Needs Review" value={banking.unreconciledTransactions} />
          <OperationsMetric label="Accounts" value={banking.accounts.length} />
        </div>

        <OperationsPanel title="Transactions">
          <OperationsEmptyState>
            No bank transactions yet. Transactions arrive from an uploaded statement and stay traceable to it; categorization and Program / Management &amp; General / Fundraising allocation are recorded as reviewable changes, never applied silently.
          </OperationsEmptyState>
        </OperationsPanel>

        <OperationsPanel title="Reconciliation">
          <OperationsEmptyState>
            Reconciliation runs against a statement in Banking: Planning Center deposits, transfers, fees, refunds, and checks are matched to bank activity, and anything that does not match stays in an unresolved queue rather than being forced to balance.
          </OperationsEmptyState>
        </OperationsPanel>
      </div>
    </OperationsShell>
  );
}
