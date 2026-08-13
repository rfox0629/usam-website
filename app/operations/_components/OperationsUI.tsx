import Link from "next/link";
import type { ReactNode } from "react";

export const operationsFont = {
  oswald: "'Oswald', sans-serif",
  rajdhani: "'Rajdhani', sans-serif",
};

export type OperationsTone = "amber" | "blue" | "green" | "muted" | "red";

const toneClassName: Record<OperationsTone, string> = {
  amber: "border-[#D8A932]/35 bg-[#FFF4D6] text-[#7A5200]",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  muted: "border-slate-200 bg-slate-50 text-slate-600",
  red: "border-red-200 bg-red-50 text-red-700",
};

export function OperationsBadge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: OperationsTone;
}) {
  return (
    <span
      className={`inline-flex min-h-6 items-center justify-center rounded-full border px-2.5 text-[10px] uppercase tracking-[0.12em] ${toneClassName[tone]}`}
      style={{ fontFamily: operationsFont.rajdhani, fontWeight: 700 }}
    >
      {children}
    </span>
  );
}

export function OperationsActionLink({
  children,
  href,
  variant = "outline",
}: {
  children: ReactNode;
  href: string;
  variant?: "gold" | "outline" | "quiet";
}) {
  const className = {
    gold: "border-[#D8A932] bg-[#D8A932] text-[#101826] hover:bg-[#E7BF57]",
    outline: "border-slate-300 bg-white text-slate-800 hover:border-[#D8A932] hover:text-[#7A5200]",
    quiet: "border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900",
  }[variant];

  return (
    <Link
      className={`inline-flex min-h-9 items-center justify-center rounded-md border px-3 text-[11px] uppercase tracking-[0.12em] transition-colors ${className}`}
      href={href}
      style={{ fontFamily: operationsFont.rajdhani, fontWeight: 700 }}
    >
      {children}
    </Link>
  );
}

export function OperationsPanel({
  action,
  children,
  eyebrow,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  eyebrow?: string;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p
              className="text-[10px] uppercase tracking-[0.16em] text-[#9D7417]"
              style={{ fontFamily: operationsFont.rajdhani, fontWeight: 700 }}
            >
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-1 text-base font-semibold leading-tight text-slate-950">
            {title}
          </h2>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function OperationsMetric({
  detail,
  href,
  label,
  value,
}: {
  detail?: string;
  href?: string;
  label: string;
  value: ReactNode;
}) {
  const content = (
    <>
      <p
        className="text-[10px] uppercase tracking-[0.16em] text-slate-500"
        style={{ fontFamily: operationsFont.rajdhani, fontWeight: 700 }}
      >
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold leading-none text-slate-950">
        {value}
      </p>
      {detail ? <p className="mt-2 truncate text-xs text-slate-500">{detail}</p> : null}
    </>
  );
  const className = "rounded-lg border border-slate-200 bg-white p-4 shadow-sm";

  if (href) {
    return (
      <Link className={`${className} block transition hover:border-[#D8A932]/70 hover:shadow-md`} href={href}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

export function OperationsEmptyState({
  action,
  children,
}: {
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-500">
      <div>{children}</div>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function formatOperationsDate(value: string | null | undefined) {
  if (!value) {
    return "No date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
