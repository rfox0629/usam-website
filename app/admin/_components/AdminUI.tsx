import Link from "next/link";
import type { ReactNode } from "react";

export const adminFont = {
  oswald: "'Oswald', sans-serif",
  rajdhani: "'Rajdhani', sans-serif",
};

export type AdminBadgeTone = "amber" | "blue" | "green" | "muted" | "red";

const badgeToneClassName: Record<AdminBadgeTone, string> = {
  amber: "border-[#C9A24A]/35 bg-[#C9A24A]/10 text-[#E4C465]",
  blue: "border-blue-400/25 bg-blue-950/30 text-blue-300",
  green: "border-green-500/25 bg-green-950/30 text-green-300",
  muted: "border-stone-700 bg-stone-900/70 text-stone-300",
  red: "border-red-500/35 bg-red-950/25 text-red-200",
};

export function AdminBadge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: AdminBadgeTone;
}) {
  return (
    <span
      className={`inline-flex min-h-6 items-center justify-center border px-2 text-[9px] uppercase tracking-[0.14em] ${badgeToneClassName[tone]}`}
      style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
    >
      {children}
    </span>
  );
}

export function AdminMetricCard({
  href,
  label,
  value,
}: {
  href?: string;
  label: string;
  value: ReactNode;
}) {
  const content = (
    <>
      <p
        className="text-[10px] uppercase tracking-[0.18em] text-stone-400"
        style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
      >
        {label}
      </p>
      <p
        className="mt-2 text-3xl font-bold leading-none text-stone-100"
        style={{ fontFamily: adminFont.oswald }}
      >
        {value}
      </p>
    </>
  );
  const className = "block border border-stone-800/75 bg-[#080808]/85 p-4";

  if (href) {
    return (
      <Link className={`${className} transition-colors hover:border-[#C9A24A]/55 hover:bg-[#C9A24A]/[0.04]`} href={href}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

export function AdminActionLink({
  children,
  href,
  variant = "outline",
}: {
  children: ReactNode;
  href: string;
  variant?: "blue" | "danger" | "gold" | "outline";
}) {
  const className = {
    blue: "border-blue-400/25 bg-blue-950/30 text-blue-200 hover:border-blue-300/60",
    danger: "border-red-500/30 text-red-200 hover:bg-red-950/25",
    gold: "border-transparent bg-[#D4A63D] text-black hover:bg-[#F5B942]",
    outline: "border-stone-700 text-stone-100 hover:border-[#D4A63D] hover:text-[#F5B942]",
  }[variant];

  return (
    <Link
      className={`inline-flex min-h-10 items-center justify-center border px-4 text-[11px] uppercase tracking-[0.16em] transition-colors ${className}`}
      href={href}
      style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
    >
      {children}
    </Link>
  );
}

export function AdminEmptyState({
  action,
  description,
  title,
}: {
  action?: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="border border-stone-800/75 bg-[#080808]/85 p-6">
      <p
        className="text-[10px] uppercase tracking-[0.2em] text-[#D4A63D]"
        style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
      >
        {title}
      </p>
      <p className="mt-3 text-sm leading-7 text-stone-400">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
