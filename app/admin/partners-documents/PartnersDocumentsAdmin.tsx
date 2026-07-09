"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { adminFont } from "../_components/AdminUI";
import { deletePartnersDocument, uploadPartnersDocument } from "./actions";
import type { PartnersDocument } from "@/src/lib/partners-documents";

function formatFileSize(bytes: number | null) {
  if (!bytes) {
    return "";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}

const fieldClassName =
  "mt-1.5 w-full border border-stone-800 bg-black/40 px-3 py-2.5 text-sm text-stone-100 outline-none transition focus:border-[#C9A24A]";

export function PartnersDocumentsAdmin({
  documents,
  groupOptions,
}: {
  documents: readonly PartnersDocument[];
  groupOptions: readonly string[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploadError("");
    setIsUploading(true);

    try {
      await uploadPartnersDocument(new FormData(event.currentTarget));
      formRef.current?.reset();
      router.refresh();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(id: string, docName: string) {
    if (!window.confirm(`Remove "${docName}"? This cannot be undone.`)) {
      return;
    }

    setDeleteError("");
    setDeletingId(id);

    try {
      await deletePartnersDocument(id);
      router.refresh();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className="border border-stone-800/75 bg-[#080808]/85 p-5">
        <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-stone-100" style={{ fontFamily: adminFont.rajdhani }}>
          Upload Document
        </h2>
        <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={handleUpload} ref={formRef}>
          <label className="block sm:col-span-1">
            <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
              Category
            </span>
            <select className={fieldClassName} name="groupName" required>
              <option value="">Select a category</option>
              {groupOptions.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </label>

          <label className="block sm:col-span-1">
            <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
              Display Name (optional)
            </span>
            <input className={fieldClassName} name="docName" placeholder="Defaults to file name" type="text" />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
              File
            </span>
            <input
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              className={`${fieldClassName} file:mr-3 file:border-0 file:bg-stone-800 file:px-3 file:py-1.5 file:text-stone-100`}
              name="file"
              required
              type="file"
            />
            <span className="mt-1.5 block text-[11px] text-stone-500">PDF, Word, or image. Up to 20 MB.</span>
          </label>

          {uploadError ? <p className="text-sm text-red-300 sm:col-span-2">{uploadError}</p> : null}

          <div className="sm:col-span-2">
            <button
              className="inline-flex min-h-10 items-center justify-center border border-transparent bg-[#D4A63D] px-5 text-[11px] font-bold uppercase tracking-[0.16em] text-black transition-colors hover:bg-[#F5B942] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isUploading}
              style={{ fontFamily: adminFont.rajdhani }}
              type="submit"
            >
              {isUploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </form>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-stone-100" style={{ fontFamily: adminFont.rajdhani }}>
            Documents ({documents.length})
          </h2>
          {deleteError ? <p className="text-sm text-red-300">{deleteError}</p> : null}
        </div>

        {documents.length === 0 ? (
          <p className="mt-4 text-sm text-stone-500">No documents uploaded yet.</p>
        ) : (
          <div className="mt-4 divide-y divide-stone-800 border border-stone-800/75 bg-[#080808]/85">
            {documents.map((doc) => (
              <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between" key={doc.id}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-stone-100">{doc.docName}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
                    {doc.groupName} &middot; {formatFileSize(doc.fileSize)} &middot; {formatDate(doc.createdAt)}
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
        )}
      </section>
    </div>
  );
}
