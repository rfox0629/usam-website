"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { adminFont, AdminBadge, type AdminBadgeTone } from "../../../../admin/_components/AdminUI";
import {
  createFinancialAccountAction,
  importTransactionsAction,
  runTransactionSuggestionsAction,
  updateTransactionReviewAction,
} from "../actions";
import {
  functionalClassificationLabels,
  functionalClassifications,
  reviewStatusLabels,
  reviewStatuses,
  type FinancialAccount,
  type FinanceTransaction,
  type ReviewStatus,
} from "@/src/lib/finance-ops/types";

const fieldClassName =
  "mt-1.5 w-full border border-stone-800 bg-black/40 px-3 py-2.5 text-sm text-stone-100 outline-none transition focus:border-[#C9A24A] disabled:cursor-not-allowed disabled:opacity-50";

const statusTone: Record<ReviewStatus, AdminBadgeTone> = {
  approved: "green",
  categorized: "blue",
  excluded: "muted",
  imported: "muted",
  needs_information: "red",
  needs_review: "amber",
};

function formatCurrency(amount: number, type: "debit" | "credit") {
  const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  return type === "debit" ? `(${formatted})` : formatted;
}

export function TransactionsWorkspace({
  accounts,
  periodEnd,
  periodStart,
  taxYear,
  transactions,
  writeEnabled,
}: {
  accounts: readonly FinancialAccount[];
  periodEnd: string;
  periodStart: string;
  taxYear: string;
  transactions: readonly FinanceTransaction[];
  writeEnabled: boolean;
}) {
  const router = useRouter();
  const importFormRef = useRef<HTMLFormElement>(null);
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id ?? "");
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isRunningSuggestions, setIsRunningSuggestions] = useState(false);
  const [importResult, setImportResult] = useState<{ duplicateCount: number; errorCount: number; errors: string[]; importedCount: number; rowCount: number } | null>(null);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | "">("");
  const [savingId, setSavingId] = useState<string | null>(null);

  async function handleCreateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsCreatingAccount(true);

    const formData = new FormData(event.currentTarget);

    try {
      const account = await createFinancialAccountAction({
        accountType: formData.get("accountType") as FinancialAccount["accountType"],
        institution: String(formData.get("institution") ?? ""),
        lastFour: String(formData.get("lastFour") ?? ""),
        name: String(formData.get("name") ?? ""),
      });
      setSelectedAccountId(account.id);
      router.refresh();
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Could not create account.");
    } finally {
      setIsCreatingAccount(false);
    }
  }

  async function handleImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setImportResult(null);
    setIsImporting(true);

    try {
      const result = await importTransactionsAction(selectedAccountId, taxYear, new FormData(event.currentTarget));
      setImportResult(result);
      importFormRef.current?.reset();
      router.refresh();
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Import failed.");
    } finally {
      setIsImporting(false);
    }
  }

  async function handleRunSuggestions() {
    setError("");
    setIsRunningSuggestions(true);

    try {
      await runTransactionSuggestionsAction(taxYear, periodStart, periodEnd);
      router.refresh();
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Could not run suggestions.");
    } finally {
      setIsRunningSuggestions(false);
    }
  }

  async function handleReviewChange(transaction: FinanceTransaction, updates: Partial<Parameters<typeof updateTransactionReviewAction>[2]>) {
    setSavingId(transaction.id);

    try {
      await updateTransactionReviewAction(taxYear, transaction.id, {
        approvedCategory: transaction.approvedCategory ?? undefined,
        fundOrRestriction: transaction.fundOrRestriction ?? undefined,
        functionalClassification: transaction.functionalClassification ?? undefined,
        notes: transaction.notes ?? undefined,
        reviewStatus: transaction.reviewStatus,
        ...updates,
      });
      router.refresh();
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Could not update transaction.");
    } finally {
      setSavingId(null);
    }
  }

  const filteredTransactions = statusFilter ? transactions.filter((transaction) => transaction.reviewStatus === statusFilter) : transactions;

  if (!writeEnabled) {
    return (
      <section className="border border-[#C9A24A]/35 bg-[#C9A24A]/[0.06] p-4">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[#E4C465]" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
          Transactions Unavailable In This Preview
        </p>
        <p className="mt-2 text-sm leading-6 text-stone-300">
          The <code className="text-stone-100">finance_operations</code> migration hasn&apos;t been applied to any
          database yet. Import, review, and categorization are fully built below but disabled until that
          migration runs against a real (staging, then production) database.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="border border-stone-800/75 bg-[#080808]/85 p-5">
        <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-stone-100" style={{ fontFamily: adminFont.rajdhani }}>
          Financial Accounts
        </h2>
        {accounts.length === 0 ? <p className="mt-2 text-sm text-stone-500">No accounts yet — add one to start importing.</p> : null}
        <form className="mt-4 grid gap-4 sm:grid-cols-4" onSubmit={handleCreateAccount}>
          <input className={fieldClassName} name="name" placeholder="Account name" required type="text" />
          <select className={fieldClassName} defaultValue="checking" name="accountType">
            <option value="checking">Checking</option>
            <option value="savings">Savings</option>
            <option value="credit_card">Credit Card</option>
            <option value="other">Other</option>
          </select>
          <input className={fieldClassName} name="institution" placeholder="Institution (optional)" type="text" />
          <div className="flex gap-2">
            <input className={fieldClassName} maxLength={4} name="lastFour" placeholder="Last 4" type="text" />
            <button
              className="inline-flex min-h-10 shrink-0 items-center justify-center border border-transparent bg-[#D4A63D] px-4 text-[11px] font-bold uppercase tracking-[0.16em] text-black transition-colors hover:bg-[#F5B942] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isCreatingAccount}
              style={{ fontFamily: adminFont.rajdhani }}
              type="submit"
            >
              Add
            </button>
          </div>
        </form>
      </section>

      <section className="border border-stone-800/75 bg-[#080808]/85 p-5">
        <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-stone-100" style={{ fontFamily: adminFont.rajdhani }}>
          Import Transactions (CSV)
        </h2>
        <form className="mt-4 grid gap-4 sm:grid-cols-3" onSubmit={handleImport} ref={importFormRef}>
          <select
            className={fieldClassName}
            onChange={(event) => setSelectedAccountId(event.target.value)}
            required
            value={selectedAccountId}
          >
            <option value="">Select an account</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}{account.lastFour ? ` ••${account.lastFour}` : ""}
              </option>
            ))}
          </select>
          <input accept=".csv" className={`${fieldClassName} sm:col-span-2 file:mr-3 file:border-0 file:bg-stone-800 file:px-3 file:py-1.5 file:text-stone-100`} name="file" required type="file" />
          <div className="sm:col-span-3">
            <button
              className="inline-flex min-h-10 items-center justify-center border border-transparent bg-[#D4A63D] px-5 text-[11px] font-bold uppercase tracking-[0.16em] text-black transition-colors hover:bg-[#F5B942] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isImporting || !selectedAccountId}
              style={{ fontFamily: adminFont.rajdhani }}
              type="submit"
            >
              {isImporting ? "Importing..." : "Import"}
            </button>
          </div>
        </form>
        <p className="mt-2 text-[11px] text-stone-500">
          Accepts a single signed &ldquo;Amount&rdquo; column, or separate Debit/Credit columns. Duplicate rows
          (matched by transaction ID when available, otherwise account + date + amount + description) are
          skipped automatically.
        </p>

        {importResult ? (
          <div className="mt-4 border border-stone-800 bg-[#050505] p-3 text-sm text-stone-300">
            {importResult.importedCount} imported, {importResult.duplicateCount} duplicate(s) skipped,{" "}
            {importResult.errorCount} error(s) out of {importResult.rowCount} row(s).
            {importResult.errors.length > 0 ? (
              <ul className="mt-2 space-y-1 text-xs text-red-300">
                {importResult.errors.slice(0, 10).map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      </section>

      <section className="border border-stone-800/75 bg-[#080808]/85 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-stone-100" style={{ fontFamily: adminFont.rajdhani }}>
            Transactions ({filteredTransactions.length})
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="min-h-9 border border-stone-800 bg-black/40 px-3 text-xs text-stone-100"
              onChange={(event) => setStatusFilter(event.target.value as ReviewStatus | "")}
              value={statusFilter}
            >
              <option value="">All statuses</option>
              {reviewStatuses.map((status) => (
                <option key={status} value={status}>
                  {reviewStatusLabels[status]}
                </option>
              ))}
            </select>
            <button
              className="inline-flex min-h-9 items-center justify-center border border-stone-700 px-4 text-[11px] uppercase tracking-[0.16em] text-stone-100 transition-colors hover:border-[#D4A63D] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isRunningSuggestions}
              onClick={handleRunSuggestions}
              style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
              type="button"
            >
              {isRunningSuggestions ? "Running..." : "Run Suggestion Pass"}
            </button>
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <p className="mt-4 text-sm text-stone-500">No transactions for this filter.</p>
        ) : (
          <div className="mt-4 divide-y divide-stone-900 overflow-x-auto">
            {filteredTransactions.map((transaction) => (
              <div className="grid gap-2 py-3 sm:grid-cols-[100px_1fr_110px_140px_140px_130px] sm:items-center" key={transaction.id}>
                <span className="text-xs text-stone-400">{transaction.transactionDate}</span>
                <span className="min-w-0 truncate text-sm text-stone-200">{transaction.description}</span>
                <span className={`text-sm ${transaction.transactionType === "debit" ? "text-red-300" : "text-green-300"}`}>
                  {formatCurrency(transaction.amount, transaction.transactionType)}
                </span>
                <input
                  className="min-h-8 border border-stone-800 bg-black/40 px-2 text-xs text-stone-100 outline-none focus:border-[#C9A24A]"
                  defaultValue={transaction.approvedCategory ?? transaction.proposedCategory ?? ""}
                  key={`${transaction.id}-category`}
                  onBlur={(event) => handleReviewChange(transaction, { approvedCategory: event.target.value })}
                  placeholder={transaction.proposedCategory ? `Suggested: ${transaction.proposedCategory}` : "Category"}
                  type="text"
                />
                <select
                  className="min-h-8 border border-stone-800 bg-black/40 px-2 text-xs text-stone-100 outline-none focus:border-[#C9A24A]"
                  defaultValue={transaction.functionalClassification ?? ""}
                  onChange={(event) => handleReviewChange(transaction, { functionalClassification: event.target.value as FinanceTransaction["functionalClassification"] || undefined })}
                >
                  <option value="">Functional…</option>
                  {functionalClassifications.map((classification) => (
                    <option key={classification} value={classification}>
                      {functionalClassificationLabels[classification]}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <select
                    className="min-h-8 flex-1 border border-stone-800 bg-black/40 px-2 text-xs text-stone-100 outline-none focus:border-[#C9A24A]"
                    disabled={savingId === transaction.id}
                    onChange={(event) => handleReviewChange(transaction, { reviewStatus: event.target.value as ReviewStatus })}
                    value={transaction.reviewStatus}
                  >
                    {reviewStatuses.map((status) => (
                      <option key={status} value={status}>
                        {reviewStatusLabels[status]}
                      </option>
                    ))}
                  </select>
                  <AdminBadge tone={statusTone[transaction.reviewStatus]}>·</AdminBadge>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
