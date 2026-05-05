"use client";

import { useState } from "react";

const acceptedFileTypes = ".pdf,.png,.jpg,.jpeg,.csv,.xlsx";

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FinancialFreedomUploadField() {
  const [files, setFiles] = useState<File[]>([]);

  return (
    <div className="space-y-4">
      <label
        htmlFor="uploads"
        className="block rounded-2xl border border-dashed border-stone-300 bg-[#fbfaf7] p-5 transition-colors hover:border-[#D4A63D]/70 md:p-6"
      >
        <span className="block text-sm font-medium text-stone-950">
          Choose files
        </span>
        <span className="mt-2 block text-sm leading-7 text-stone-600">
          Upload up to 3 redacted files. Keep the total under 4 MB.
        </span>
        <input
          id="uploads"
          name="uploads"
          type="file"
          multiple
          accept={acceptedFileTypes}
          className="mt-5 block w-full cursor-pointer rounded-xl border border-stone-300 bg-white text-sm text-stone-700 shadow-sm file:mr-4 file:cursor-pointer file:border-0 file:bg-[#D4A63D] file:px-4 file:py-3 file:text-xs file:font-bold file:uppercase file:tracking-[0.16em] file:text-stone-950 hover:file:bg-[#F5B942]"
          onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
        />
      </label>

      {files.length > 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.14em] text-stone-500">
            Selected files
          </p>
          <ul className="mt-3 space-y-2">
            {files.map((file) => (
              <li key={`${file.name}-${file.lastModified}`} className="flex flex-col gap-1 text-sm text-stone-700 sm:flex-row sm:items-center sm:justify-between">
                <span className="break-all">{file.name}</span>
                <span className="shrink-0 text-xs text-stone-500">{formatFileSize(file.size)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm leading-7 text-stone-500">
          No files selected. This step is optional.
        </p>
      )}
    </div>
  );
}
