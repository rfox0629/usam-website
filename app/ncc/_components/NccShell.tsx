import Link from "next/link";
import type { ReactNode } from "react";
import { adminFont, AdminBadge } from "../../admin/_components/AdminUI";
import { nccNavItems } from "./nccNav";
import type { CurrentOrganization } from "../_lib/organization-context";

function NccNavLink({ active, href, label, status }: { active: boolean; href: string; label: string; status: string }) {
  return (
    <Link
      className={`group relative flex min-h-9 items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
        active ? "bg-[#C9A24A]/[0.08] text-[#E4C465]" : "text-stone-400 hover:bg-stone-900/70 hover:text-stone-100"
      }`}
      href={href}
    >
      <span
        aria-hidden="true"
        className={`absolute bottom-2 left-0 top-2 w-px rounded-full transition-colors ${
          active ? "bg-[#C9A24A]" : "bg-transparent group-hover:bg-stone-700"
        }`}
      />
      <span className="min-w-0 truncate">{label}</span>
      {status === "planned" ? (
        <span className="shrink-0 text-[8px] uppercase tracking-[0.14em] text-stone-600">Planned</span>
      ) : status === "legacy" ? (
        <span className="shrink-0 text-[8px] uppercase tracking-[0.14em] text-stone-600">Legacy</span>
      ) : null}
    </Link>
  );
}

function NccBrandLockup({ compact = false, organization }: { compact?: boolean; organization: CurrentOrganization }) {
  return (
    <Link
      href="/ncc"
      className={`flex min-w-0 items-start gap-3 ${compact ? "" : "min-h-12 border-b border-stone-800/70 pb-5"}`}
    >
      <span className="mt-1.5 h-2 w-2 shrink-0 rotate-45 bg-[#C9A24A]" />
      <span className="min-w-0">
        <span
          className={`${compact ? "text-base" : "text-[17px]"} block font-semibold uppercase leading-[1.05] tracking-[0.02em] text-stone-100`}
          style={{ fontFamily: adminFont.oswald }}
        >
          <span className="block">National Command</span>
          <span className="block">Center</span>
        </span>
        <span
          className="mt-1 block whitespace-nowrap text-[9px] uppercase tracking-[0.18em] text-[#C9A24A]"
          style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
        >
          {organization.name}
        </span>
      </span>
    </Link>
  );
}

export function NccShell({
  action,
  active,
  children,
  description,
  navScope = "full",
  organization,
  title,
}: {
  action?: ReactNode;
  active: string;
  children: ReactNode;
  description?: string;
  navScope?: "finance-only" | "full";
  organization: CurrentOrganization;
  title: string;
}) {
  const visibleNavItems = navScope === "finance-only" ? nccNavItems.filter((item) => item.activeKey === "finance") : nccNavItems;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050505] text-stone-100">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-stone-800/80 bg-[#070707] px-4 py-5 md:flex md:flex-col">
        <NccBrandLockup organization={organization} />

        {navScope === "finance-only" ? (
          <p className="mt-4 text-[10px] uppercase tracking-[0.16em] text-stone-600">Finance Access Only</p>
        ) : null}

        <nav className="mt-6 flex flex-1 flex-col gap-0.5 overflow-y-auto" aria-label="NCC department navigation">
          {visibleNavItems.map((item) => (
            <NccNavLink
              key={item.activeKey}
              active={active === item.activeKey}
              href={item.href}
              label={item.label}
              status={item.status}
            />
          ))}
        </nav>

        <div className="mt-4 flex flex-col gap-2 border-t border-stone-800/70 pt-4">
          {navScope === "full" ? (
            <Link
              className="text-xs uppercase tracking-[0.16em] text-stone-500 transition-colors hover:text-[#C9A24A]"
              href="/admin"
              style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
            >
              Legacy Admin
            </Link>
          ) : null}
          <Link
            className="text-xs uppercase tracking-[0.16em] text-stone-500 transition-colors hover:text-[#C9A24A]"
            href="/"
            style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
          >
            Back to Site
          </Link>
        </div>
      </aside>

      <div className="min-w-0 md:pl-64">
        <header className="sticky top-0 z-30 border-b border-stone-800/80 bg-[#070707]/95 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center justify-between gap-4">
            <NccBrandLockup compact organization={organization} />
            <Link
              className="text-xs uppercase tracking-[0.16em] text-stone-500"
              href="/"
              style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
            >
              Site
            </Link>
          </div>
          <nav className="mt-3 flex gap-1.5 overflow-x-auto pb-1" aria-label="NCC mobile department navigation">
            {visibleNavItems.map((item) => (
              <Link
                key={item.activeKey}
                className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs transition-colors ${
                  active === item.activeKey
                    ? "bg-[#C9A24A]/[0.1] text-[#E4C465]"
                    : "text-stone-400 hover:bg-stone-900/70 hover:text-stone-100"
                }`}
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <section className="min-w-0 max-w-full overflow-x-hidden px-4 py-6 md:px-8 md:py-8 xl:px-10">
          <div className="mx-auto max-w-7xl min-w-0">
            <div className="mb-6 flex flex-col gap-4 border-b border-stone-800/70 pb-5 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <AdminBadge tone="amber">NCC Preview</AdminBadge>
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-stone-100 md:text-4xl">
                  {title}
                </h1>
                {description ? (
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-400 md:text-base">
                    {description}
                  </p>
                ) : null}
              </div>
              {action ? <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">{action}</div> : null}
            </div>

            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
