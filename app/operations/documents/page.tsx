import Link from "next/link";
import { canAccessOperationsModule, canManageOperationsModule, getOperationsAuthorization } from "@/src/lib/operations/auth";
import {
  documentCategories,
  documentCategoryLabels,
  documentSensitivities,
  documentSensitivityLabels,
  loadOperationsDocuments,
  type DocumentCategory,
  type OperationsDocument,
} from "@/src/lib/documents/library";
import { loadFinanceOrganization } from "@/src/lib/finance/workspace";
import { OperationsAccessDenied, OperationsShell } from "../_components/OperationsShell";
import {
  formatOperationsDate,
  OperationsBadge,
  OperationsEmptyState,
  OperationsPanel,
  operationsFont,
  type OperationsTone,
} from "../_components/OperationsUI";
import {
  openOperationsDocumentAction,
  runLegacyMigrationAction,
  uploadOperationsDocumentAction,
} from "./actions";

export const dynamic = "force-dynamic";

function sizeLabel(bytes: number | null) {
  if (!bytes) {
    return "";
  }

  return bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function sensitivityTone(value: string): OperationsTone {
  if (value === "normal") {
    return "muted";
  }

  return value === "system_restricted" ? "red" : "amber";
}

function DocumentRow({ document }: { document: OperationsDocument }) {
  return (
    <div className="grid gap-2 py-3 first:pt-0 last:pb-0 lg:grid-cols-[minmax(0,1.4fr)_160px_minmax(0,1fr)_130px_90px] lg:items-center lg:gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-950">{document.title}</p>
        <p className="mt-1 truncate text-xs text-slate-500">
          {document.fileName} {sizeLabel(document.fileSize)}
          {document.isLegacy ? " · from legacy library" : ""}
        </p>
      </div>
      <p className="truncate text-sm text-slate-700">{document.categoryLabel}</p>
      <div className="min-w-0">
        {document.usedFor.length > 0 ? (
          <p className="truncate text-sm text-slate-600">{document.usedFor.join(", ")}</p>
        ) : (
          <span className="text-sm text-slate-400">Not yet referenced</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {document.sensitivity === "normal" ? (
          <span className="text-xs text-slate-500">{formatOperationsDate(document.uploadedAt)}</span>
        ) : (
          <OperationsBadge tone={sensitivityTone(document.sensitivity)}>
            {document.sensitivityLabel}
          </OperationsBadge>
        )}
      </div>
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
  );
}

export default async function OperationsDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [query, authorization] = await Promise.all([searchParams, getOperationsAuthorization()]);

  if (authorization.status !== "authorized") {
    return null;
  }

  if (!canAccessOperationsModule(authorization, "documents")) {
    return <OperationsAccessDenied active="documents" authorization={authorization} />;
  }

  const organization = await loadFinanceOrganization();

  if (!organization) {
    return (
      <OperationsShell active="documents" authorization={authorization} title="Documents">
        <OperationsEmptyState>Organization record is unavailable.</OperationsEmptyState>
      </OperationsShell>
    );
  }

  const canManage = canManageOperationsModule(authorization, "documents");
  const activeCategory = documentCategories.includes(query.category as DocumentCategory)
    ? (query.category as DocumentCategory)
    : null;
  const search = query.q ?? "";
  const { documents, error, hiddenCount } = await loadOperationsDocuments({
    authorization,
    categories: activeCategory ? [activeCategory] : undefined,
    organizationId: organization.id,
    search,
  });

  const filterHref = (category: DocumentCategory | null) => {
    const params = new URLSearchParams();

    if (category) {
      params.set("category", category);
    }

    if (search) {
      params.set("q", search);
    }

    const suffix = params.toString();

    return suffix ? `/operations/documents?${suffix}` : "/operations/documents";
  };

  return (
    <OperationsShell active="documents" authorization={authorization} title="Documents">
      <div className="space-y-4">
        {query.uploaded ? (
          <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Document added to the library.
          </section>
        ) : null}

        {query.migration ? (
          <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
            <p className="font-semibold text-emerald-900">
              {query.migration === "dry" ? "Legacy import dry run" : "Legacy import applied"}
            </p>
            <p className="mt-1 text-emerald-900">
              {query.migration === "dry" ? `${query.create ?? 0} would be created` : `${query.created ?? 0} created`}
              {" · "}{query.already ?? 0} already imported
              {" · "}{query.dupes ?? 0} duplicates
              {" · "}{query.tests ?? 0} test artifacts
              {" · "}{query.unresolved ?? 0} unresolved
              {" · 0 files moved or deleted"}
            </p>
          </section>
        ) : null}

        {query.error ? (
          <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{query.error}</section>
        ) : null}

        {error ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</section>
        ) : null}

        <OperationsPanel title="Find a Document">
          <form action="/operations/documents" className="flex flex-wrap items-end gap-3" method="get">
            <label className="min-w-0 flex-1">
              <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Search</span>
              <input
                className="mt-2 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[#D8A932]"
                defaultValue={search}
                name="q"
                placeholder="Title or file name"
              />
            </label>
            {activeCategory ? <input name="category" type="hidden" value={activeCategory} /> : null}
            <button
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-[11px] uppercase tracking-[0.12em] text-slate-800 transition hover:border-[#D8A932]"
              style={{ fontFamily: operationsFont.rajdhani, fontWeight: 700 }}
              type="submit"
            >
              Search
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              className={`inline-flex min-h-8 items-center rounded-full border px-3 text-[11px] uppercase tracking-[0.12em] ${
                activeCategory === null
                  ? "border-[#D8A932] bg-[#FFF7DF] text-[#654500]"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
              href={filterHref(null)}
              style={{ fontFamily: operationsFont.rajdhani, fontWeight: 700 }}
            >
              All
            </Link>
            {documentCategories.map((category) => (
              <Link
                className={`inline-flex min-h-8 items-center rounded-full border px-3 text-[11px] uppercase tracking-[0.12em] ${
                  activeCategory === category
                    ? "border-[#D8A932] bg-[#FFF7DF] text-[#654500]"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
                href={filterHref(category)}
                key={category}
                style={{ fontFamily: operationsFont.rajdhani, fontWeight: 700 }}
              >
                {documentCategoryLabels[category]}
              </Link>
            ))}
          </div>
        </OperationsPanel>

        <OperationsPanel title="Library">
          {documents.length > 0 ? (
            <div className="divide-y divide-slate-100">
              <div className="hidden gap-3 pb-2 lg:grid lg:grid-cols-[minmax(0,1.4fr)_160px_minmax(0,1fr)_130px_90px]">
                {["Document", "Category", "Used For", "Added", ""].map((heading, index) => (
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400" key={`${heading}-${index}`}>
                    {heading}
                  </p>
                ))}
              </div>
              {documents.map((document) => (
                <DocumentRow document={document} key={document.id} />
              ))}
            </div>
          ) : (
            <OperationsEmptyState>
              No documents match. USA Missionaries already has documents in the legacy library — run the import below to bring them in without moving any files.
            </OperationsEmptyState>
          )}
          {hiddenCount > 0 ? (
            <p className="mt-4 text-xs text-slate-500">
              {hiddenCount} document{hiddenCount === 1 ? " is" : "s are"} hidden by your access level.
            </p>
          ) : null}
        </OperationsPanel>

        {canManage ? (
          <>
            <OperationsPanel title="Add a Document">
              <form action={uploadOperationsDocumentAction} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_190px_190px_auto] md:items-end">
                <label className="block">
                  <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Title</span>
                  <input
                    className="mt-2 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[#D8A932]"
                    name="title"
                    placeholder="Defaults to the file name"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Category</span>
                  <select
                    className="mt-2 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[#D8A932]"
                    defaultValue="irs_tax"
                    name="category"
                  >
                    {documentCategories.map((category) => (
                      <option key={category} value={category}>{documentCategoryLabels[category]}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Access</span>
                  <select
                    className="mt-2 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[#D8A932]"
                    defaultValue="normal"
                    name="sensitivity"
                  >
                    {documentSensitivities.map((sensitivity) => (
                      <option key={sensitivity} value={sensitivity}>{documentSensitivityLabels[sensitivity]}</option>
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
            </OperationsPanel>

            <OperationsPanel title="Legacy Library Import">
              <p className="mb-4 text-sm leading-6 text-slate-600">
                Brings the existing USA Missionaries documents into this library by referencing them where they already
                live. No file is copied, moved, renamed, or deleted, and the legacy library keeps working exactly as it
                does today. Running the import twice creates nothing new.
              </p>
              <div className="flex flex-wrap gap-2">
                <form action={runLegacyMigrationAction}>
                  <input name="mode" type="hidden" value="dry" />
                  <button
                    className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-[11px] uppercase tracking-[0.12em] text-slate-800 transition hover:border-[#D8A932]"
                    style={{ fontFamily: operationsFont.rajdhani, fontWeight: 700 }}
                    type="submit"
                  >
                    Dry Run
                  </button>
                </form>
                <form action={runLegacyMigrationAction}>
                  <input name="mode" type="hidden" value="apply" />
                  <button
                    className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#D8A932] px-4 text-[11px] uppercase tracking-[0.14em] text-[#101826] transition hover:bg-[#E7BF57]"
                    style={{ fontFamily: operationsFont.rajdhani, fontWeight: 700 }}
                    type="submit"
                  >
                    Import
                  </button>
                </form>
              </div>
            </OperationsPanel>
          </>
        ) : null}
      </div>
    </OperationsShell>
  );
}
