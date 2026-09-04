"use client";

import { useEffect, useRef } from "react";

export type PillRailOption<T extends string> = { label: string; value: T };

/**
 * Scrollable pill tab rail (canonical spec §3, V10 treatment A).
 *
 * 36px pills, 15px horizontal padding, 6px gap, 13.5/600 ink labels on white
 * with a hairline; the active pill is filled blue with white text. The rail is
 * a native horizontal scroll view: no arrows, no truncation, no dropdown. The
 * selected pill scrolls fully into view on switch and a right-edge fade shows
 * there is more. Every pill has a 44px hit area (`h-11` button around the
 * 36px visual) and the rail is a `tablist`.
 */
export function PillRail<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  /** Accessible name for the rail, e.g. "My Record sections". */
  label: string;
  onChange: (value: T) => void;
  options: ReadonlyArray<PillRailOption<T>>;
  value: T;
}) {
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const active = railRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');

    active?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [value]);

  return (
    <div className="relative -mx-5">
      <div
        aria-label={label}
        className="flex gap-1.5 overflow-x-auto px-5 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        ref={railRef}
        role="tablist"
      >
        {options.map((option) => {
          const selected = option.value === value;

          return (
            <button
              aria-selected={selected}
              className="group flex h-11 shrink-0 items-center rounded-dos-3 focus:outline-none"
              key={option.value}
              onClick={() => onChange(option.value)}
              role="tab"
              tabIndex={selected ? 0 : -1}
              type="button"
            >
              <span
                className={`flex h-9 items-center rounded-dos-3 border px-[15px] text-dos-label transition-colors group-focus-visible:ring-2 group-focus-visible:ring-dos-blue group-focus-visible:ring-offset-2 ${
                  selected ? "border-dos-blue bg-dos-blue text-white" : "border-dos-line bg-white text-dos-primary group-hover:border-dos-blue100"
                }`}
              >
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
    </div>
  );
}

/**
 * Segmented control for two or three exclusive views inside content
 * (month / week): a surface-2 track with 4px padding; the active segment is a
 * white pill.
 */
export function Segmented<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: ReadonlyArray<PillRailOption<T>>;
  value: T;
}) {
  return (
    <div aria-label={label} className="flex rounded-dos-3 bg-dos-surface2 p-1" role="group">
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <button
            aria-pressed={selected}
            className={`flex h-9 min-w-0 flex-1 items-center justify-center rounded-dos-3 px-3 text-dos-label transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-dos-blue ${
              selected ? "bg-white text-dos-primary shadow-dos-float" : "text-dos-secondary hover:text-dos-primary"
            }`}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
