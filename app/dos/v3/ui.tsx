"use client";

import type { ReactNode } from "react";

// Shared primitives for the DOS V3 prototype.
//
// Note: app/globals.css styles the dark marketing site and sets a light default
// color on bare h1-h6/p/li/label/input. Every text node here carries an explicit
// color class so it stays readable on the app's white surfaces.

export const ink = "text-[#0F172A]";
export const muted = "text-[#64748B]";
export const accent = "text-[#2563EB]";

export function Card({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const base = "rounded-[20px] border border-[#E8EFFA] bg-white shadow-[0_10px_28px_rgba(37,99,235,0.05)]";

  if (!onClick) {
    return <div className={`${base} ${className}`}>{children}</div>;
  }

  return (
    <button
      className={`${base} w-full text-left transition hover:border-[#BFDBFE] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/35 ${className}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#64748B]">{children}</p>
      {action}
    </div>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "blue" | "green" | "amber" | "red";
}) {
  const tones = {
    neutral: "bg-[#F1F5F9] text-[#475569]",
    blue: "bg-[#EBF2FF] text-[#1D4ED8]",
    green: "bg-[#ECFDF5] text-[#047857]",
    amber: "bg-[#FEF3C7] text-[#92400E]",
    red: "bg-[#FEE2E2] text-[#B91C1C]",
  } as const;

  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Button({
  children,
  onClick,
  tone = "primary",
  size = "md",
  disabled = false,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: "primary" | "secondary" | "quiet" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  const tones = {
    primary: "bg-[#2563EB] text-white hover:bg-[#1D4ED8] shadow-[0_10px_24px_rgba(37,99,235,0.24)]",
    secondary: "border border-[#DCEBFF] bg-white text-[#0F172A] hover:border-[#2563EB]",
    quiet: "text-[#2563EB] hover:bg-[#EBF2FF]",
    danger: "border border-[#FECACA] bg-white text-[#B91C1C] hover:border-[#EF4444]",
  } as const;
  const sizes = {
    sm: "min-h-9 px-3 text-xs",
    md: "min-h-11 px-4 text-sm",
    lg: "min-h-12 px-5 text-sm",
  } as const;

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition disabled:opacity-45 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/35 ${tones[tone]} ${sizes[size]} ${className}`}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-[#64748B]">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint ? <span className="mt-1 block text-xs leading-5 text-[#94A3B8]">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-3 text-sm font-medium text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:bg-white";

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  autoFocus = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  autoFocus?: boolean;
}) {
  return (
    <input
      autoFocus={autoFocus}
      className={`${inputClass} min-h-12`}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      type={type}
      value={value}
    />
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 5,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      className={`${inputClass} leading-6`}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={rows}
      value={value}
    />
  );
}

export function ChoiceRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ label: string; value: T }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          className={`min-h-10 rounded-full px-3.5 text-xs font-bold transition ${
            value === option.value
              ? "bg-[#2563EB] text-white"
              : "border border-[#E2E8F0] bg-white text-[#475569] hover:border-[#2563EB] hover:text-[#2563EB]"
          }`}
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function ToggleChips({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[];
  selected: readonly string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isOn = selected.includes(option);

        return (
          <button
            className={`min-h-10 rounded-full px-3.5 text-xs font-bold transition ${
              isOn
                ? "bg-[#ECFDF5] text-[#047857] ring-1 ring-[#A7F3D0]"
                : "border border-[#E2E8F0] bg-white text-[#475569] hover:border-[#2563EB] hover:text-[#2563EB]"
            }`}
            key={option}
            onClick={() => onToggle(option)}
            type="button"
          >
            {isOn ? "✓ " : ""}
            {option}
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return (
    <div className="rounded-[20px] border border-dashed border-[#DCEBFF] bg-[#F8FBFF] px-4 py-8 text-center">
      <p className="text-sm font-bold text-[#0F172A]">{title}</p>
      {detail ? <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-[#64748B]">{detail}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const dimensions = size === "sm" ? "h-8 w-8 text-[11px]" : "h-10 w-10 text-xs";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] font-black text-[#1D4ED8] ${dimensions}`}
    >
      {initials}
    </span>
  );
}

export function Sheet({
  children,
  onClose,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0F172A]/35 p-0 sm:items-center sm:p-6">
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[26px] bg-white shadow-[0_-8px_40px_rgba(15,23,42,0.18)] sm:rounded-[26px]">
        <div className="flex items-center justify-between gap-3 border-b border-[#EEF2F7] px-4 py-3.5">
          <p className="text-sm font-black tracking-[-0.01em] text-[#0F172A]">{title}</p>
          <button
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#64748B] transition hover:bg-[#F1F5F9]"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
      </div>
    </div>
  );
}
