"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/src/components/dos/Icon";

/* DOS form primitives. Moved verbatim from app/dos/app/DosMvpAppClient.tsx in
 * USA-211 (spec §3). `font.rajdhani` is the same value the client uses. */
const font = { rajdhani: "'Inter', sans-serif" };

export function FieldLabel({ children, srOnly = false }: { children: ReactNode; srOnly?: boolean }) {
  return (
    <span className={`${srOnly ? "sr-only" : ""} text-[10px] font-bold uppercase tracking-[0.16em] text-[#475569]`} style={{ fontFamily: font.rajdhani }}>
      {children}
    </span>
  );
}

export function FieldInputClass(spaced = true) {
  return `${spaced ? "mt-2 " : ""}min-h-12 w-full rounded-[18px] border border-[#D6E4F7] bg-white px-4 text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10`;
}

// Native selects render OS chrome (grey gradient, platform arrow) that does not
// belong in DOS. This resets appearance and draws a DOS chevron, keeping the
// same height, radius, border and focus ring as text inputs.
export function FieldSelectClass(spaced = true) {
  return `${spaced ? "mt-2 " : ""}min-h-12 w-full cursor-pointer appearance-none rounded-[18px] border border-[#D6E4F7] bg-white bg-[length:18px_18px] bg-[right_0.9rem_center] bg-no-repeat py-2.5 pl-4 pr-11 text-[15px] font-semibold text-dos-primary outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 disabled:cursor-not-allowed disabled:text-dos-disabled bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 24 24%22 stroke=%22%235A6473%22 stroke-width=%222.2%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpath d=%22m6 9 6 6 6-6%22/%3E%3C/svg%3E')]`;
}

export function FieldTextareaClass(spaced = true) {
  return `${spaced ? "mt-2 " : ""}min-h-24 w-full resize-none rounded-[18px] border border-[#D6E4F7] bg-white px-4 py-3 text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10`;
}

export function DosFormSection({
  children,
  description,
  icon,
  title,
}: {
  children: ReactNode;
  description?: string;
  icon: IconName;
  title: string;
}) {
  return (
    <section className="grid gap-3 border-t border-[#EAF2FF] pt-5 first:border-t-0 first:pt-0">
      <div className="grid gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#DCEBFF]">
            <Icon name={icon} size={16} />
          </span>
          <span className="min-w-0 text-sm font-black leading-5 text-[#0F172A]">{title}</span>
        </div>
        {description ? <p className="text-xs leading-5 text-[#64748B]">{description}</p> : null}
      </div>
      <div className="grid gap-3">
        {children}
      </div>
    </section>
  );
}

export function DosFormField({
  children,
  className = "",
  helper,
  label,
}: {
  children: ReactNode;
  className?: string;
  helper?: string;
  label?: ReactNode;
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      {helper ? <span className="mt-1 block text-xs leading-5 text-[#64748B]">{helper}</span> : null}
      {children}
    </label>
  );
}

export function DosFormGrid({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid gap-3 min-[380px]:grid-cols-2 ${className}`}>
      {children}
    </div>
  );
}

export function RequiredMark() {
  return (
    <span aria-hidden="true" className="ml-0.5 text-[#DC2626]">
      *
    </span>
  );
}

export function OptionalTag() {
  return (
    <span className="ml-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#94A3B8]">
      Optional
    </span>
  );
}

export function DisclosureSection({
  children,
  defaultOpen = false,
  description,
  summary,
  title,
}: {
  children: ReactNode;
  defaultOpen?: boolean;
  description?: string;
  /** Shown instead of `description` while collapsed, to report current contents. */
  summary?: string;
  title: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const subtitle = !isOpen && summary ? summary : description;

  return (
    <section className="rounded-[20px] border border-[#E2E8F0] bg-white">
      <button
        aria-expanded={isOpen}
        className={`flex min-h-[52px] w-full items-center justify-between gap-3 rounded-t-[20px] px-4 py-3 text-left transition-colors hover:bg-[#F8FBFF] ${isOpen ? "" : "rounded-b-[20px]"}`}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="min-w-0">
          <span className="block text-sm font-bold text-[#0F172A]">{title}</span>
          {subtitle ? <span className="mt-0.5 block text-xs font-medium leading-5 text-[#64748B]">{subtitle}</span> : null}
        </span>
        <ChevronRight
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-[#94A3B8] transition-transform ${isOpen ? "-rotate-90" : "rotate-90"}`}
          strokeWidth={1.9}
        />
      </button>
      {isOpen ? <div className="grid gap-4 rounded-b-[20px] border-t border-[#EAF2FF] px-4 pb-4 pt-4">{children}</div> : null}
    </section>
  );
}

// The founder preview is deliberately read-only, so its notice must not read as
// a broken form. Anything else stays an error.
export function FormMessage({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  const isReadOnlyNotice = message.startsWith("Preview mode is read-only");
  const className = isReadOnlyNotice
    ? "rounded-2xl border border-dos-rule bg-dos-band p-3 text-sm text-dos-body"
    : "rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700";

  return <p className={className}>{message}</p>;
}

export function StickyFormFooter({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-1 rounded-b-[24px] border-t border-[#EAF2FF] bg-white/97 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 backdrop-blur-sm md:rounded-b-[30px]">
      <div className="grid gap-2">{children}</div>
    </div>
  );
}
