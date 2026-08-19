import Link from "next/link";
import { canAccessOperationsModule, getOperationsAuthorization } from "@/src/lib/operations/auth";
import {
  documentCategoryLabels,
  financeDocumentCategories,
  loadOperationsDocuments,
} from "@/src/lib/documents/library";
import { loadFinanceOrganization } from "@/src/lib/finance/workspace";
import { OperationsAccessDenied, OperationsShell } from "../../_components/OperationsShell";
import {
  formatOperationsDate,
  OperationsActionLink,
  OperationsBadge,
  OperationsEmptyState,
  OperationsPanel,
  operationsFont,
} from "../../_components/OperationsUI";
import { FinanceSubnav } from "../_components/FinanceSubnav";
import { openOperationsDocumentAction } from "../../documents/actions";

export const dynamic = "force-dynamic";

export default async function OperationsFinanceDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [query, authorization] = await Promise.all([searchParams, getOperationsAuthorization()]);

  if (authorization.status !== "authorized") {
    return null;
  }

  if (!canAccessOperationsModule(authorization, "finance")) {
    return <OperationsAccessDenied active="finance" authorization={authorization} />;
  }

  const organization = await loadFinanceOrganization();
  // This is a contextual view of the one shared library, not a Finance library.
  const { documents, error } = organization
    ? await loadOperationsDocuments({
      authorization,
      categories: financeDocumentCategories,
      organizationId: organization.id,
    })
    : { documents: [], error: "Organization record is unavailable." };

  return (
    <OperationsShell active="finance" authorization={authorization} title="Finance">
      <FinanceSubnav active="documents" />

      <div className="space-y-4">
        {query.error ? (
          <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{query.error}</section>
        ) : null}

        {error ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</section>
        ) : null}

        <OperationsPanel
          action={<OperationsActionLink href="/operations/documents" variant="outline">Full Library</OperationsActionLink>}
          title="Finance Source Documents"
        >
          <p className="mb-4 text-sm leading-6 text-slate-600">
            A filtered view of the shared Operations document library — {financeDocumentCategories
              .map((category) => documentCategoryLabels[category])
              .join(", ")}. Documents live once and are referenced here; uploading happens in the library.
          </p>

          {documents.length > 0 ? (
            <div className="divide-y divide-slate-100">
              <div className="hidden gap-3 pb-2 lg:grid lg:grid-cols-[minmax(0,1.4fr)_170px_minmax(0,1fr)_120px_90px]">
                {["Document", "Category", "Used For", "Added", ""].map((heading, index) => (
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400" key={`${heading}-${index}`}>
                    {heading}
                  </p>
                ))}
              </div>
              {documents.map((document) => (
                <div
                  className="grid gap-2 py-3 first:pt-0 last:pb-0 lg:grid-cols-[minmax(0,1.4fr)_170px_minmax(0,1fr)_120px_90px] lg:items-center lg:gap-3"
                  key={document.id}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">{document.title}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{document.fileName}</p>
                  </div>
                  <p className="truncate text-sm text-slate-700">{document.categoryLabel}</p>
                  <div className="min-w-0">
                    {document.usedFor.length > 0 ? (
                      <p className="truncate text-sm text-slate-600">{document.usedFor.join(", ")}</p>
                    ) : (
                      <OperationsBadge tone="muted">Not yet referenced</OperationsBadge>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">{formatOperationsDate(document.uploadedAt)}</p>
                  <form action={openOperationsDocumentAction}>
                    <input name="id" type="hidden" value={document.id} />
                    <button
                      className="inline-flex min-h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-[11px] uppercase tracking-[0.12em] text-slate-800 transition hover:border-[#D8A932]"
                      style={{ fontFamily: operationsFont.rajdhani, fontWeight: 700 }}
                      type="submit"
                    >
                      Open
                    </button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <OperationsEmptyState
              action={<OperationsActionLink href="/operations/documents" variant="outline">Open Documents</OperationsActionLink>}
            >
              No finance source documents yet. USA Missionaries already has an IRS determination letter and formation
              records in the legacy library — importing them in Documents makes them selectable here and in Compliance.
            </OperationsEmptyState>
          )}
        </OperationsPanel>

        <OperationsPanel title="What Finance Needs">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["IRS determination / Form 1023", "Verifies the tax period"],
              ["EIN & formation records", "Organization profile"],
              ["Arizona filings", "State compliance deadline"],
              ["Bank statements", "Banking & reconciliation"],
            ].map(([label, why]) => (
              <Link className="rounded-lg border border-slate-200 bg-slate-50 p-3 transition hover:border-[#D8A932]/70 hover:bg-white" href="/operations/documents" key={label}>
                <p className="text-sm font-semibold text-slate-950">{label}</p>
                <p className="mt-1 text-xs text-slate-500">{why}</p>
              </Link>
            ))}
          </div>
        </OperationsPanel>
      </div>
    </OperationsShell>
  );
}
