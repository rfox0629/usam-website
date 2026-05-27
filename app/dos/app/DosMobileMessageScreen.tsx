import type { ReactNode } from "react";
import Link from "next/link";

export function DosMobileMessageScreen({
  actionHref,
  actionLabel,
  children,
  detail,
  eyebrow,
  title,
}: {
  actionHref?: string;
  actionLabel?: string;
  children?: ReactNode;
  detail?: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <main className="min-h-screen bg-[#FAFBFD] px-5 py-16 text-[#0F172A]">
      <section className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-sm flex-col justify-center">
        <div className="rounded-[30px] border border-[#E2E8F0] bg-white p-6 shadow-[0_22px_70px_rgba(15,23,42,0.08)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#2563EB]">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-[28px] font-bold leading-tight tracking-tight text-[#0F172A]">
            {title}
          </h1>
          {detail ? <p className="mt-3 text-sm leading-6 text-[#64748B]">{detail}</p> : null}
          {children ? <div className="mt-6">{children}</div> : null}
          {actionHref && actionLabel ? (
            <Link
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-4 text-sm font-bold text-white shadow-[0_12px_28px_rgba(37,99,235,0.24)]"
              href={actionHref}
            >
              {actionLabel}
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}
