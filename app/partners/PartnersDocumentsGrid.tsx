"use client";

import { useEffect, useState } from "react";
import type { PartnersDocument } from "@/src/lib/partners-documents";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

function docTypeLabel(fileType: string | null) {
  if (!fileType) {
    return "FILE";
  }

  if (fileType === "application/pdf") {
    return "PDF";
  }

  if (fileType.includes("wordprocessingml") || fileType === "application/msword") {
    return "DOC";
  }

  if (fileType.startsWith("image/")) {
    return "IMG";
  }

  return "FILE";
}

export function PartnersDocumentsGrid({
  groups,
}: {
  groups: readonly { groupName: string; documents: readonly PartnersDocument[] }[];
}) {
  const [openDoc, setOpenDoc] = useState<PartnersDocument | null>(null);

  useEffect(() => {
    if (!openDoc) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenDoc(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [openDoc]);

  if (groups.length === 0) {
    return <p className="mt-10 text-sm text-stone-500">Documents are being prepared and will be added here soon.</p>;
  }

  return (
    <>
      <div className="mt-12 space-y-10">
        {groups.map((group) => (
          <div key={group.groupName}>
            <p
              className="flex items-center gap-4 text-[11px] uppercase tracking-[0.22em] text-usam-gold"
              style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
            >
              {group.groupName}
              <span aria-hidden="true" className="h-px flex-1 bg-stone-800" />
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.documents.map((doc) => (
                <button
                  className="flex items-center justify-between gap-4 border border-stone-800 bg-white/[0.02] px-5 py-4 text-left transition-colors hover:border-usam-gold/60 hover:bg-white/[0.04]"
                  key={doc.id}
                  onClick={() => setOpenDoc(doc)}
                  type="button"
                >
                  <span>
                    <span className="block text-sm font-semibold text-stone-200">{doc.docName}</span>
                    <span
                      className="mt-1 block text-[9.5px] uppercase tracking-[0.16em] text-stone-500"
                      style={{ fontFamily: font.rajdhani }}
                    >
                      {docTypeLabel(doc.fileType)} · {group.groupName}
                    </span>
                  </span>
                  <span
                    className="flex-shrink-0 whitespace-nowrap text-[10px] uppercase tracking-[0.14em] text-usam-gold"
                    style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                  >
                    View Document
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {openDoc ? (
        <div
          aria-labelledby="partners-doc-viewer-title"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm md:p-8"
          onMouseDown={() => setOpenDoc(null)}
          role="dialog"
        >
          <div
            className="relative flex h-full max-h-[85vh] w-full max-w-4xl flex-col border border-stone-800 bg-usam-black shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-stone-800 px-5 py-3.5">
              <span className="truncate text-sm font-semibold text-stone-200" id="partners-doc-viewer-title">
                {openDoc.docName}
              </span>
              <button
                aria-label="Close document viewer"
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center border border-stone-700 text-lg leading-none text-stone-400 transition-colors hover:border-usam-gold hover:text-usam-gold"
                onClick={() => setOpenDoc(null)}
                type="button"
              >
                &times;
              </button>
            </div>
            <iframe className="h-full w-full flex-1 bg-white" src={`/api/partners/documents/${openDoc.id}`} title={openDoc.docName} />
          </div>
        </div>
      ) : null}
    </>
  );
}
