"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { adminFont } from "../../../../admin/_components/AdminUI";
import { deleteComplianceDocument, uploadComplianceDocument } from "../actions";
import { complianceDocumentCategories, complianceDocumentCategoryLabels, type ComplianceFilingDocument } from "@/src/lib/compliance/types";

function formatFileSize(bytes: number | null) {
  if (!bytes) {
    return "";
  }

  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const fieldClassName =
  "mt-1.5 w-full border border-stone-800 bg-black/40 px-3 py-2.5 text-sm text-stone-100 outline-none transition focus:border-[#C9A24A] disabled:cursor-not-allowed disabled:opacity-50";

export function ComplianceDocumentsPanel({
  documents,
  filingKey,
  isPersisted,
  periodKey,
  writeEnabled,
}: {
  documents: readonly ComplianceFilingDocument[];
  filingKey: string;
  isPersisted: boolean;
  periodKey: string;
  writeEnabled: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canUpload = writeEnabled && isPersisted;

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploadError("");
    setIsUploading(true);

    try {
      await uploadComplianceDocument(filingKey, periodKey, new FormData(event.currentTarget));
      formRef.current?.reset();
      router.refresh();
    } catch (thrown) {
      setUploadError(thrown instanceof Error ? thrown.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(id: string, docName: string) {
    if (!window.confirm(`Remove "${docName}"? This cannot be undone.`)) {
      return;
    }

    setDeletingId(id);

    try {
      await deleteComplianceDocument(id, filingKey, periodKey);
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="border border-stone-800/75 bg-[#080808]/85 p-5">
      <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-stone-100" style={{ fontFamily: adminFont.rajdhani }}>
        Source Documents ({documents.length})
      </h2>
      <p className="mt-2 text-sm leading-6 text-stone-400">
        Bank statements, payroll reports, donation reports, board records, and governing documents the
        preparation layer reads from. Stored privately; never exposed via a public URL.
      </p>

      {!canUpload ? (
        <p className="mt-3 text-sm text-stone-500">
          {isPersisted
            ? "Uploads are unavailable in this preview until the compliance_filings migration is applied."
            : "Start tracking this filing above before attaching documents."}
        </p>
      ) : null}

      <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={handleUpload} ref={formRef}>
        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
            Category
          </span>
          <select className={fieldClassName} disabled={!canUpload} name="docCategory" required>
            <option value="">Select a category</option>
            {complianceDocumentCategories.map((category) => (
              <option key={category} value={category}>
                {complianceDocumentCategoryLabels[category]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
            Display Name (optional)
          </span>
          <input className={fieldClassName} disabled={!canUpload} name="docName" type="text" />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
            File
          </span>
          <input
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            className={`${fieldClassName} file:mr-3 file:border-0 file:bg-stone-800 file:px-3 file:py-1.5 file:text-stone-100`}
            disabled={!canUpload}
            name="file"
            required
            type="file"
          />
        </label>

        {uploadError ? <p className="text-sm text-red-300 sm:col-span-2">{uploadError}</p> : null}

        <div className="sm:col-span-2">
          <button
            className="inline-flex min-h-10 items-center justify-center border border-transparent bg-[#D4A63D] px-5 text-[11px] font-bold uppercase tracking-[0.16em] text-black transition-colors hover:bg-[#F5B942] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isUploading || !canUpload}
            style={{ fontFamily: adminFont.rajdhani }}
            type="submit"
          >
            {isUploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </form>

      {documents.length > 0 ? (
        <div className="mt-5 divide-y divide-stone-800 border border-stone-800/75">
          {documents.map((doc) => (
            <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between" key={doc.id}>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-stone-100">{doc.docName}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
                  {complianceDocumentCategoryLabels[doc.docCategory]} &middot; {formatFileSize(doc.fileSize)}
                </p>
              </div>
              <button
                className="inline-flex min-h-9 flex-shrink-0 items-center justify-center border border-red-500/30 px-4 text-[11px] uppercase tracking-[0.14em] text-red-200 transition-colors hover:bg-red-950/25 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={deletingId === doc.id}
                onClick={() => handleDelete(doc.id, doc.docName)}
                style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
                type="button"
              >
                {deletingId === doc.id ? "Removing..." : "Remove"}
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
