import { canAccessOperationsModule, canManageOperationsModule, getOperationsAuthorization } from "@/src/lib/operations/auth";
import {
  financeDocumentTypeLabels,
  financeDocumentTypes,
  loadFinanceDocuments,
  loadFinanceOrganization,
} from "@/src/lib/finance/workspace";
import { OperationsAccessDenied, OperationsShell } from "../../_components/OperationsShell";
import {
  formatOperationsDate,
  OperationsBadge,
  OperationsEmptyState,
  OperationsPanel,
  operationsFont,
} from "../../_components/OperationsUI";
import { FinanceSubnav } from "../_components/FinanceSubnav";
import { openFinanceDocumentAction, uploadFinanceDocumentAction } from "./actions";

export const dynamic = "force-dynamic";

function sizeLabel(bytes: number | null) {
  if (!bytes) {
    return "";
  }

  return bytes > 1048576
    ? `${(bytes / 1048576).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default async function OperationsFinanceDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; uploaded?: string }>;
}) {
  const [query, authorization] = await Promise.all([searchParams, getOperationsAuthorization()]);

  if (authorization.status !== "authorized") {
    return null;
  }

  if (!canAccessOperationsModule(authorization, "finance")) {
    return <OperationsAccessDenied active="finance" authorization={authorization} />;
  }

  const organization = await loadFinanceOrganization();
  const canManage = canManageOperationsModule(authorization, "finance");
  const { documents, error } = organization
    ? await loadFinanceDocuments(organization.id)
    : { documents: [], error: "Organization record is unavailable." };

  return (
    <OperationsShell active="finance" authorization={authorization} title="Finance">
      <FinanceSubnav active="documents" />

      <div className="space-y-4">
        {query.uploaded ? (
          <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Document stored.
          </section>
        ) : null}

        {query.error ? (
          <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {query.error}
          </section>
        ) : null}

        {error ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {error}
          </section>
        ) : null}

        {canManage ? (
          <OperationsPanel title="Upload Source Document">
            <form action={uploadFinanceDocumentAction} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Title</span>
                <input
                  className="mt-2 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[#D8A932]"
                  name="title"
                  placeholder="Defaults to the file name"
                />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Type</span>
                <select
                  className="mt-2 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[#D8A932]"
                  defaultValue="irs_determination_letter"
                  name="documentType"
                >
                  {financeDocumentTypes.map((type) => (
                    <option key={type} value={type}>
                      {financeDocumentTypeLabels[type]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-2">
                <input
                  className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-3 file:py-2 file:text-xs file:text-slate-700"
                  name="file"
                  required
                  type="file"
                />
                <button
                  className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#D8A932] px-4 text-[11px] uppercase tracking-[0.14em] text-[#101826] transition hover:bg-[#E7BF57]"
                  style={{ fontFamily: operationsFont.rajdhani, fontWeight: 700 }}
                  type="submit"
                >
                  Upload
                </button>
              </div>
            </form>
            <p className="mt-3 text-xs text-slate-500">
              Originals are stored unchanged and never deleted. The same file uploaded twice is rejected as a duplicate.
            </p>
          </OperationsPanel>
        ) : null}

        <OperationsPanel title="Source Documents">
          {documents.length > 0 ? (
            <div className="divide-y divide-slate-100">
              <div className="hidden gap-3 pb-2 lg:grid lg:grid-cols-[minmax(0,1.3fr)_180px_minmax(0,1fr)_120px_90px]">
                {["Document", "Type", "Used For", "Uploaded", ""].map((heading, index) => (
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400" key={`${heading}-${index}`}>
                    {heading}
                  </p>
                ))}
              </div>
              {documents.map((document) => (
                <div
                  className="grid gap-2 py-3 first:pt-0 last:pb-0 lg:grid-cols-[minmax(0,1.3fr)_180px_minmax(0,1fr)_120px_90px] lg:items-center lg:gap-3"
                  key={document.id}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">{document.title}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {document.fileName} {sizeLabel(document.fileSize)}
                    </p>
                  </div>
                  <p className="truncate text-sm text-slate-700">{document.documentTypeLabel}</p>
                  <div className="min-w-0">
                    {document.usedFor.length > 0 ? (
                      <p className="truncate text-sm text-slate-600">{document.usedFor.join(", ")}</p>
                    ) : (
                      <OperationsBadge tone="muted">Not yet used</OperationsBadge>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">{formatOperationsDate(document.uploadedAt)}</p>
                  <form action={openFinanceDocumentAction}>
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
            <OperationsEmptyState>
              No source documents yet. Start with the IRS determination letter or Form 1023 — that is what verifies the tax period.
            </OperationsEmptyState>
          )}
        </OperationsPanel>
      </div>
    </OperationsShell>
  );
}
