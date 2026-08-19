import { canAccessOperationsModule, canManageOperationsModule, getOperationsAuthorization } from "@/src/lib/operations/auth";
import {
  complianceFactKeys,
  complianceFactLabels,
  isFactVerified,
  loadComplianceFacts,
} from "@/src/lib/finance/facts";
import {
  loadComplianceCalendar,
  loadFinanceDocuments,
  loadFinanceOrganization,
  loadTaxPeriods,
  type FinanceFiling,
} from "@/src/lib/finance/workspace";
import { OperationsAccessDenied, OperationsShell } from "../../_components/OperationsShell";
import {
  formatOperationsDate,
  OperationsBadge,
  OperationsEmptyState,
  OperationsPanel,
  operationsFont,
  type OperationsTone,
} from "../../_components/OperationsUI";
import { FinanceSubnav } from "../_components/FinanceSubnav";
import { recordAssignedDueDateAction, recordComplianceFactAction } from "./actions";

export const dynamic = "force-dynamic";

function stateTone(state: string): OperationsTone {
  if (state === "verified" || state === "cpa_confirmed") {
    return "green";
  }

  if (state === "needs_cpa_review") {
    return "red";
  }

  return "amber";
}

function stateLabel(state: string) {
  return state.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function FilingCard({
  documents,
  canManage,
  filing,
}: {
  canManage: boolean;
  documents: { id: string; title: string }[];
  filing: FinanceFiling;
}) {
  const inputs = filing.computedInputs as Record<string, string | number | boolean | null>;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-950">{filing.filingName}</h3>
          <p className="mt-1 text-sm text-slate-500">{filing.jurisdiction} · {filing.agency}</p>
        </div>
        <OperationsBadge tone={filing.status === "needs_verification" ? "amber" : filing.status === "overdue" ? "red" : "muted"}>
          {stateLabel(filing.status)}
        </OperationsBadge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Due date</p>
          <p className="mt-1 text-sm text-slate-900">
            {filing.dueDate ? formatOperationsDate(filing.dueDate) : "Not stated yet"}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Extension</p>
          <p className="mt-1 text-sm text-slate-900">
            {filing.extensionDueDate ? formatOperationsDate(filing.extensionDueDate) : "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Rule</p>
          <p className="mt-1 text-sm text-slate-900">{filing.ruleKey} {filing.ruleVersion}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Source</p>
          {filing.sourceUrl ? (
            <a className="mt-1 block truncate text-sm text-[#9D7417] underline" href={filing.sourceUrl} rel="noreferrer" target="_blank">
              Authority
            </a>
          ) : (
            <p className="mt-1 text-sm text-slate-500">—</p>
          )}
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-600">{filing.reason}</p>

      {/* Every date shows the inputs that produced it, so it is checkable. */}
      <details className="mt-3">
        <summary className="cursor-pointer text-xs uppercase tracking-[0.12em] text-slate-500" style={{ fontFamily: operationsFont.rajdhani, fontWeight: 700 }}>
          How this is calculated
        </summary>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          {Object.entries(inputs)
            .filter(([, value]) => value !== null && value !== undefined)
            .map(([key, value]) => (
              <div className="flex gap-2 text-xs" key={key}>
                <dt className="text-slate-500">{key.replace(/([A-Z])/g, " $1").toLowerCase()}</dt>
                <dd className="text-slate-900">{String(value)}</dd>
              </div>
            ))}
        </dl>
        {filing.sourceNote ? <p className="mt-3 text-xs leading-5 text-slate-500">{filing.sourceNote}</p> : null}
      </details>

      {canManage && filing.computedInputs.requiresOrganizationAssignedDueDate ? (
        <form action={recordAssignedDueDateAction} className="mt-4 grid gap-3 border-t border-slate-200 pt-4 md:grid-cols-[160px_minmax(0,1fr)_auto] md:items-end">
          <input name="ruleKey" type="hidden" value={filing.ruleKey} />
          <input name="jurisdiction" type="hidden" value={filing.jurisdiction} />
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Assigned due date</span>
            <input
              className="mt-2 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[#D8A932]"
              name="assignedDueDate"
              required
              type="date"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Source document</span>
            <select
              className="mt-2 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[#D8A932]"
              name="sourceDocumentId"
              required
            >
              <option value="">Select the agency record</option>
              {documents.map((document) => (
                <option key={document.id} value={document.id}>{document.title}</option>
              ))}
            </select>
          </label>
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#D8A932] px-4 text-[11px] uppercase tracking-[0.14em] text-[#101826] transition hover:bg-[#E7BF57]"
            style={{ fontFamily: operationsFont.rajdhani, fontWeight: 700 }}
            type="submit"
          >
            Save
          </button>
        </form>
      ) : null}
    </div>
  );
}

export default async function OperationsFinanceCompliancePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const [query, authorization] = await Promise.all([searchParams, getOperationsAuthorization()]);

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
        <FinanceSubnav active="compliance" />
        <OperationsEmptyState>Organization record is unavailable.</OperationsEmptyState>
      </OperationsShell>
    );
  }

  const canManage = canManageOperationsModule(authorization, "finance");
  const today = new Date().toISOString().slice(0, 10);
  const [{ facts }, periods, { documents }] = await Promise.all([
    loadComplianceFacts(organization.id),
    loadTaxPeriods(organization.id),
    loadFinanceDocuments(organization.id),
  ]);
  const filings = await loadComplianceCalendar({ facts, organizationId: organization.id, periods, today });
  const documentOptions = documents.map((document) => ({ id: document.id, title: document.title }));

  return (
    <OperationsShell active="finance" authorization={authorization} title="Finance">
      <FinanceSubnav active="compliance" />

      <div className="space-y-4">
        {query.saved ? (
          <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">Saved.</section>
        ) : null}
        {query.error ? (
          <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{query.error}</section>
        ) : null}

        <OperationsPanel title="Filing Calendar">
          {filings.length > 0 ? (
            <div className="grid gap-3">
              {filings.map((filing) => (
                <FilingCard canManage={canManage} documents={documentOptions} filing={filing} key={filing.ruleKey} />
              ))}
            </div>
          ) : (
            <OperationsEmptyState>No compliance rules apply yet.</OperationsEmptyState>
          )}
        </OperationsPanel>

        <OperationsPanel title="Organization Facts">
          <p className="mb-4 text-sm text-slate-500">
            A fact becomes canonical only when a person confirms it against a source document. Corrections are recorded as history; nothing is overwritten.
          </p>
          <div className="grid gap-3">
            {complianceFactKeys.map((factKey) => {
              const fact = facts.get(factKey);

              return (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4" key={factKey}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">{complianceFactLabels[factKey]}</p>
                      <p className="mt-1 truncate text-sm text-slate-600">
                        {fact?.value ?? "Not set"}
                        {fact?.sourceDocumentTitle ? ` · ${fact.sourceDocumentTitle}` : ""}
                      </p>
                    </div>
                    <OperationsBadge tone={fact ? stateTone(fact.verificationState) : "muted"}>
                      {fact ? stateLabel(fact.verificationState) : "Not set"}
                    </OperationsBadge>
                  </div>

                  {fact && isFactVerified(fact) ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Verified by {fact.verifiedBy} on {formatOperationsDate(fact.verifiedAt)}
                    </p>
                  ) : null}

                  {canManage ? (
                    <form action={recordComplianceFactAction} className="mt-3 grid gap-3 border-t border-slate-200 pt-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_160px_auto] md:items-end">
                      <input name="factKey" type="hidden" value={factKey} />
                      <label className="block">
                        <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Value</span>
                        <input
                          className="mt-2 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[#D8A932]"
                          defaultValue={fact?.value ?? ""}
                          name="value"
                          required
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Source document</span>
                        <select
                          className="mt-2 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[#D8A932]"
                          defaultValue={fact?.sourceDocumentId ?? ""}
                          name="sourceDocumentId"
                        >
                          <option value="">None</option>
                          {documentOptions.map((document) => (
                            <option key={document.id} value={document.id}>{document.title}</option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">State</span>
                        <select
                          className="mt-2 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[#D8A932]"
                          defaultValue="verified"
                          name="verificationState"
                        >
                          <option value="suggested">Suggested</option>
                          <option value="verified">Verified</option>
                          <option value="needs_cpa_review">Needs CPA review</option>
                          <option value="cpa_confirmed">CPA confirmed</option>
                        </select>
                      </label>
                      <button
                        className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-[11px] uppercase tracking-[0.12em] text-slate-800 transition hover:border-[#D8A932]"
                        style={{ fontFamily: operationsFont.rajdhani, fontWeight: 700 }}
                        type="submit"
                      >
                        Confirm
                      </button>
                    </form>
                  ) : null}
                </div>
              );
            })}
          </div>
        </OperationsPanel>
      </div>
    </OperationsShell>
  );
}
