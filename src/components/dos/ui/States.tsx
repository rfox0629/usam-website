"use client";

import { Search, X } from "lucide-react";
import type { ReactNode } from "react";

/** Empty state (canonical spec §3): one sentence in the secondary color and at most one action. No illustration, no card. */
export function EmptyState({ action, children }: { action?: ReactNode; children: string }) {
  return (
    <div className="py-4">
      <p className="text-dos-body text-dos-secondary">{children}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

/** 48px search field with a leading icon and a clear button once there is a value. */
export function SearchField({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <div className="relative">
      <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dos-secondary" strokeWidth={2} />
      <input
        aria-label={label}
        className="h-12 w-full rounded-dos-1 border border-dos-line bg-white pl-10 pr-11 text-dos-body text-dos-primary outline-none placeholder:text-dos-secondary focus-visible:border-dos-blue focus-visible:ring-2 focus-visible:ring-dos-blue focus-visible:ring-offset-2"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="search"
        value={value}
      />
      {value ? (
        <button
          aria-label="Clear search"
          className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-dos-3 text-dos-secondary hover:text-dos-primary"
          onClick={() => onChange("")}
          type="button"
        >
          <X aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
        </button>
      ) : null}
    </div>
  );
}
