"use client";

import { ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import { FieldLabel } from "@/src/components/dos/forms/FormPrimitives";

/* DOS option selects. Moved verbatim from app/dos/app/DosMvpAppClient.tsx in USA-211. */

export function CompactOptionSelect({
  hideLabel = false,
  label,
  onChange,
  options,
  size = "default",
  value,
}: {
  hideLabel?: boolean;
  label?: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ helper?: string; label: string; value: string }>;
  size?: "compact" | "default";
  value: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const selectedOption = options.find((option) => option.value === value) ?? options[0];
  const isCompact = size === "compact";

  function close() {
    setIsOpen(false);
  }

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          close();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && isOpen) {
          event.stopPropagation();
          close();
          triggerRef.current?.focus();
        }
      }}
    >
      {label ? <FieldLabel srOnly={hideLabel}>{label}</FieldLabel> : null}
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={hideLabel ? label : undefined}
        className={`${label && !hideLabel ? "mt-2 " : ""}flex w-full items-center justify-between gap-3 border bg-white text-left transition-colors ${
          isCompact ? "min-h-10 rounded-full px-3 text-sm" : "min-h-12 rounded-2xl px-4 text-sm"
        } ${isOpen ? "border-[#2563EB] shadow-[0_10px_24px_rgba(37,99,235,0.12)]" : "border-[#E2E8F0] hover:border-[#BFDBFE]"}`}
        onClick={() => setIsOpen((current) => !current)}
        ref={triggerRef}
        type="button"
      >
        <span className="min-w-0 flex-1 truncate font-semibold text-[#0F172A]">{selectedOption?.label ?? "Select"}</span>
        <ChevronRight className={`h-4 w-4 shrink-0 text-[#94A3B8] transition-transform ${isOpen ? "-rotate-90" : "rotate-90"}`} aria-hidden="true" strokeWidth={1.8} />
      </button>
      {isOpen ? (
        <div className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-2xl border border-[#E2E8F0] bg-white p-1.5 shadow-[0_18px_45px_rgba(42,37,29,0.14)]" role="listbox">
          {options.map((option) => {
            const selected = option.value === selectedOption?.value;

            return (
              <button
                aria-selected={selected}
                className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-sm transition-colors ${
                  selected ? "bg-[#EBF2FF] text-[#1D4ED8]" : "text-[#0F172A] hover:bg-[#F1F5F9]"
                }`}
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  close();
                  triggerRef.current?.focus();
                }}
                role="option"
                type="button"
              >
                <span className="min-w-0 flex-1 truncate font-semibold">{option.label}</span>
                {option.helper ? <span className="shrink-0 text-[11px] font-medium text-[#64748B]">{option.helper}</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function FormOptionSelect({
  defaultValue = "",
  label,
  name,
  options,
}: {
  defaultValue?: string;
  label: string;
  name: string;
  options: ReadonlyArray<{ helper?: string; label: string; value: string }>;
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <>
      <input name={name} type="hidden" value={value} />
      <CompactOptionSelect label={label} onChange={setValue} options={options} value={value} />
    </>
  );
}
