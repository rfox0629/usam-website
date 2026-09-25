"use client";

import { ChevronRight } from "lucide-react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { FieldLabel } from "@/src/components/dos/forms/FormPrimitives";

/* DOS option selects. Moved verbatim from app/dos/app/DosMvpAppClient.tsx in USA-211. */

/* USA-274: one option list open at a time, across the whole screen. Opening a
   select closes whichever one was open before it. */
let closeOpenCompactSelect: (() => void) | null = null;

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
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listboxRef = useRef<HTMLDivElement | null>(null);
  const focusSelectedOnOpenRef = useRef(false);
  const selectedOption = options.find((option) => option.value === value) ?? options[0];
  const isCompact = size === "compact";

  function close() {
    setIsOpen(false);
  }

  /* USA-274: closing must not depend on focus. WebKit does not focus a tapped
     button, so a blur-only close left a list open after tapping elsewhere or
     opening a second select. While open, any pointer press outside closes it,
     and this select registers as the one open list. */
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    closeOpenCompactSelect?.();
    closeOpenCompactSelect = close;

    function closeOnOutsidePress(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node | null)) {
        close();
      }
    }

    /* Escape closes the list even when focus never entered it (a tapped
       trigger in WebKit), and stops there so an enclosing sheet stays open. */
    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      event.stopPropagation();
      close();
      triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", closeOnOutsidePress, true);
    document.addEventListener("keydown", closeOnEscape, true);
    /* Keep the options clear of a sticky footer: the list carries a bottom
       scroll margin, so "nearest" scrolls it fully into view above the footer. */
    listboxRef.current?.scrollIntoView?.({ block: "nearest" });

    if (focusSelectedOnOpenRef.current) {
      focusSelectedOnOpenRef.current = false;
      listboxRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus();
    }

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress, true);

      if (closeOpenCompactSelect === close) {
        closeOpenCompactSelect = null;
      }
    };
  }, [isOpen]);

  function moveOptionFocus(event: KeyboardEvent<HTMLDivElement>) {
    const optionButtons = Array.from(listboxRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []);
    const currentIndex = optionButtons.indexOf(document.activeElement as HTMLButtonElement);
    const lastIndex = optionButtons.length - 1;
    const nextIndex = {
      ArrowDown: currentIndex < 0 ? 0 : Math.min(currentIndex + 1, lastIndex),
      ArrowUp: currentIndex < 0 ? lastIndex : Math.max(currentIndex - 1, 0),
      End: lastIndex,
      Home: 0,
    }[event.key as "ArrowDown" | "ArrowUp" | "End" | "Home"];

    if (nextIndex === undefined || !optionButtons.length) {
      return;
    }

    event.preventDefault();
    optionButtons[nextIndex]?.focus();
  }

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null) && event.relatedTarget) {
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
      ref={rootRef}
    >
      {label ? <FieldLabel srOnly={hideLabel}>{label}</FieldLabel> : null}
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={hideLabel ? label : undefined}
        className={`${label && !hideLabel ? "mt-2 " : ""}flex w-full items-center justify-between gap-3 border bg-white text-left transition-colors ${
          isCompact ? "min-h-10 rounded-full px-3 text-sm" : "min-h-12 rounded-2xl px-4 text-sm"
        } ${isOpen ? "border-[#2563EB] shadow-[0_10px_24px_rgba(37,99,235,0.12)]" : "border-[#E2E8F0] hover:border-[#BFDBFE]"}`}
        onClick={(event) => {
          /* A keyboard activation (Enter / Space) reports detail 0: move focus
             into the list so arrow keys work straight away. */
          focusSelectedOnOpenRef.current = !isOpen && event.detail === 0;
          setIsOpen((current) => !current);
        }}
        onKeyDown={(event) => {
          if (!isOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            event.preventDefault();
            focusSelectedOnOpenRef.current = true;
            setIsOpen(true);
          }
        }}
        ref={triggerRef}
        type="button"
      >
        <span className="min-w-0 flex-1 truncate font-semibold text-[#0F172A]">{selectedOption?.label ?? "Select"}</span>
        <ChevronRight className={`h-4 w-4 shrink-0 text-[#94A3B8] transition-transform ${isOpen ? "-rotate-90" : "rotate-90"}`} aria-hidden="true" strokeWidth={1.8} />
      </button>
      {isOpen ? (
        <div
          className="absolute left-0 right-0 z-dos-popover mt-1 max-h-64 scroll-mb-28 overflow-y-auto rounded-2xl border border-[#E2E8F0] bg-white p-1.5 shadow-[0_18px_45px_rgba(42,37,29,0.14)]"
          onKeyDown={moveOptionFocus}
          ref={listboxRef}
          role="listbox"
        >
          {options.map((option) => {
            const selected = option.value === selectedOption?.value;

            return (
              <button
                aria-selected={selected}
                className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-sm transition-colors ${
                  selected ? "bg-[#EBF2FF] text-[#1D4ED8]" : "text-[#0F172A] hover:bg-[#F1F5F9]"
                }`}
                key={option.value}
                onClick={(event) => {
                  /* USA-274: a select often sits inside a <label>. Once the
                     tapped option unmounts, WebKit forwards the click to the
                     label's first control -- this trigger -- and reopens the
                     list. Cancelling the default stops that, so choosing any
                     option, including the one already selected, closes it. */
                  event.preventDefault();
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
