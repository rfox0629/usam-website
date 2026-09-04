"use client";

import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/src/components/dos/Icon";

/* Legacy DOS controls, moved verbatim from app/dos/app/DosMvpAppClient.tsx in
 * USA-213 so screens keep rendering exactly what they render today while the
 * spec §3 controls in ./Button.tsx, ./PageHeader.tsx and ./Row.tsx are adopted
 * screen by screen. `font` carries the same values the client uses. */
const font = { oswald: "'Inter Tight', 'Inter', sans-serif", rajdhani: "'Inter', sans-serif" };

export type ButtonTone = "black" | "soft" | "white";

export function AppButton({
  children,
  disabled,
  icon,
  onClick,
  tone = "white",
  type = "button",
}: {
  children: ReactNode;
  disabled?: boolean;
  icon?: IconName;
  onClick?: () => void;
  tone?: ButtonTone;
  type?: "button" | "submit";
}) {
  const toneClass = {
    black: "bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] text-white shadow-[0_12px_28px_rgba(37,99,235,0.24)] hover:brightness-[0.98]",
    soft: "border border-[#E2E8F0] bg-[#F1F5F9] text-[#0F172A] hover:bg-white",
    white: "border border-[#E2E8F0] bg-white text-[#0F172A] hover:border-[#BFDBFE]",
  }[tone];
  const sizeClass = tone === "black" ? "min-h-[54px] text-[15px]" : "min-h-11 text-xs sm:text-sm";

  return (
    <button
      className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-4 font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${sizeClass} ${toneClass}`}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {icon ? <Icon name={icon} size={15} /> : null}
      {children}
    </button>
  );
}

export function CompactButton({
  children,
  icon,
  onClick,
}: {
  children: ReactNode;
  icon?: IconName;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex min-h-9 min-w-0 items-center justify-center gap-1.5 rounded-full border border-[#E2E8F0] bg-white px-3 text-xs font-semibold text-[#0F172A] transition-colors hover:border-[#BFDBFE] max-[350px]:px-2 max-[350px]:text-[11px]"
      onClick={onClick}
      type="button"
    >
      {icon ? <Icon name={icon} size={13} /> : null}
      <span className="min-w-0 truncate">{children}</span>
    </button>
  );
}

export function TabPageHeader({
  action,
  title,
}: {
  action?: ReactNode;
  title: string;
}) {
  return (
    <header className="flex min-h-10 items-center justify-between gap-3">
      <h1 className="text-[18px] font-black uppercase tracking-[0.12em] text-[#0F172A]" style={{ fontFamily: font.oswald }}>
        {title}
      </h1>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function SectionHeading({
  action,
  title,
}: {
  action?: ReactNode;
  title: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-4">
      <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
        {title}
      </h2>
      {action}
    </div>
  );
}

export function MoreBackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[#DCEBFF] bg-white px-3 text-xs font-bold text-[#2563EB] shadow-[0_8px_18px_rgba(37,99,235,0.06)] transition-colors hover:border-[#BFDBFE] hover:bg-[#EBF2FF]"
      onClick={onClick}
      type="button"
    >
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.9} />
      More
    </button>
  );
}

export function UserProfileAvatar({
  imageUrl,
  name,
  size = "sm",
}: {
  imageUrl?: string | null;
  name: string;
  size?: "lg" | "sm";
}) {
  const dimension = size === "lg" ? "h-20 w-20 text-2xl" : "h-11 w-11 text-sm";
  const initial = name.trim().charAt(0).toUpperCase() || "R";

  if (imageUrl) {
    return (
      <span className={`${dimension} flex shrink-0 overflow-hidden rounded-full border border-[#BFDBFE] bg-[#EBF2FF] shadow-[0_10px_24px_rgba(37,99,235,0.10)]`}>
        <img alt="" className="h-full w-full object-cover" src={imageUrl} />
      </span>
    );
  }

  return (
    <span className={`${dimension} flex shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] font-bold text-white shadow-[0_14px_30px_rgba(37,99,235,0.24)]`}>
      {initial}
    </span>
  );
}
