import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  BarChart3,
  Building2,
  ClipboardList,
  FileText,
  FolderClosed,
  Landmark,
  LockKeyhole,
  ShieldCheck,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { signOutAdmin } from "@/app/login/actions";
import {
  canAccessOperationsModule,
  operationsRoleLabel,
  type OperationsAuthorization,
  type OperationsModule,
} from "@/src/lib/operations/auth";
import { operationsPrimaryNav, operationsSystemNav, type OperationsNavItem } from "@/src/lib/operations/navigation";
import { OperationsActionLink, OperationsBadge, operationsFont } from "./OperationsUI";

const moduleIcons: Record<OperationsModule, LucideIcon> = {
  dashboards: BarChart3,
  documents: FolderClosed,
  finance: Landmark,
  home: Activity,
  missionaries: UserRound,
  organizations: Building2,
  people: UsersRound,
  submissions: ClipboardList,
  system: FileText,
};

function statusTone(status: OperationsNavItem["status"]) {
  if (status === "live") {
    return "green";
  }

  if (status === "system") {
    return "blue";
  }

  return "amber";
}

function OperationsBrand() {
  return (
    <Link className="flex min-w-0 items-center gap-3" href="/operations">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#D8A932] text-xs font-bold text-[#111827]">
        OP
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold leading-tight text-white">
          USA Missionaries
        </span>
        <span
          className="mt-0.5 block truncate text-[10px] uppercase tracking-[0.16em] text-slate-400"
          style={{ fontFamily: operationsFont.rajdhani, fontWeight: 700 }}
        >
          Operations Platform
        </span>
      </span>
    </Link>
  );
}

function NavLink({
  active,
  item,
}: {
  active: boolean;
  item: OperationsNavItem;
}) {
  const Icon = moduleIcons[item.module];

  return (
    <Link
      className={`group grid min-h-10 grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
        active
          ? "bg-white/[0.08] text-white"
          : "text-slate-300 hover:bg-white/[0.055] hover:text-white"
      }`}
      href={item.href}
    >
      <Icon
        aria-hidden="true"
        className={`h-4 w-4 ${active ? "text-[#D8A932]" : "text-slate-500 group-hover:text-[#D8A932]"}`}
        strokeWidth={1.8}
      />
      <span className="min-w-0 truncate">{item.title}</span>
      {item.status ? (
        <span
          className={`hidden rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] md:inline-flex ${
            item.status === "live"
              ? "bg-emerald-400/10 text-emerald-300"
              : item.status === "system"
                ? "bg-blue-400/10 text-blue-300"
                : "bg-[#D8A932]/15 text-[#F2D382]"
          }`}
          style={{ fontFamily: operationsFont.rajdhani, fontWeight: 700 }}
        >
          {item.status}
        </span>
      ) : null}
    </Link>
  );
}

function MobileNav({
  active,
  authorization,
}: {
  active: OperationsModule;
  authorization: Extract<OperationsAuthorization, { status: "authorized" }>;
}) {
  const nav = [...operationsPrimaryNav, ...operationsSystemNav]
    .filter((item) => canAccessOperationsModule(authorization, item.module));

  return (
    <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Operations navigation">
      {nav.map((item) => {
        const Icon = moduleIcons[item.module];

        return (
          <Link
            className={`grid min-h-12 grid-cols-[18px_minmax(0,1fr)] items-center gap-2 rounded-md border px-3 text-xs ${
              active === item.module
                ? "border-[#D8A932] bg-[#FFF7DF] text-[#654500]"
                : "border-slate-200 bg-white text-slate-700"
            }`}
            href={item.href}
            key={item.href}
          >
            <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
            <span className="min-w-0 truncate">{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function OperationsShell({
  action,
  active,
  authorization,
  children,
  eyebrow,
  title,
}: {
  action?: ReactNode;
  active: OperationsModule;
  authorization: Extract<OperationsAuthorization, { status: "authorized" }>;
  children: ReactNode;
  eyebrow?: string;
  title: string;
}) {
  const primaryNav = operationsPrimaryNav
    .filter((item) => canAccessOperationsModule(authorization, item.module));
  const systemNav = operationsSystemNav
    .filter((item) => canAccessOperationsModule(authorization, item.module));

  return (
    <main className="min-h-screen bg-[#F5F7FB] text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-950/20 bg-[#0B1220] px-4 py-5 lg:flex lg:flex-col">
        <OperationsBrand />

        <nav className="mt-8 flex flex-1 flex-col gap-7" aria-label="Operations navigation">
          <div>
            <p
              className="mb-2 px-3 text-[10px] uppercase tracking-[0.16em] text-slate-500"
              style={{ fontFamily: operationsFont.rajdhani, fontWeight: 700 }}
            >
              Ministry Operations
            </p>
            <div className="grid gap-1">
              {primaryNav.map((item) => (
                <NavLink active={active === item.module} item={item} key={item.href} />
              ))}
            </div>
          </div>
        </nav>

        {systemNav.length > 0 ? (
          <div className="border-t border-white/10 pt-4">
            {systemNav.map((item) => (
              <NavLink active={active === item.module} item={item} key={item.href} />
            ))}
          </div>
        ) : null}

        <div className="mt-4 grid gap-2 border-t border-white/10 pt-4">
          <Link
            className="text-xs uppercase tracking-[0.14em] text-slate-500 transition hover:text-[#D8A932]"
            href="/admin"
            style={{ fontFamily: operationsFont.rajdhani, fontWeight: 700 }}
          >
            Legacy Admin
          </Link>
          <Link
            className="text-xs uppercase tracking-[0.14em] text-slate-500 transition hover:text-[#D8A932]"
            href="/"
            style={{ fontFamily: operationsFont.rajdhani, fontWeight: 700 }}
          >
            Public Site
          </Link>
        </div>
      </aside>

      <div className="min-w-0 lg:pl-64">
        <header className="border-b border-slate-200 bg-white px-4 py-4 lg:hidden">
          <div className="rounded-lg bg-[#0B1220] p-4">
            <OperationsBrand />
          </div>
          <div className="mt-3">
            <MobileNav active={active} authorization={authorization} />
          </div>
        </header>

        <section className="px-4 py-5 md:px-7 md:py-7 xl:px-10">
          <div className="mx-auto max-w-7xl">
            <header className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  {eyebrow ? (
                    <p
                      className="text-[10px] uppercase tracking-[0.16em] text-slate-500"
                      style={{ fontFamily: operationsFont.rajdhani, fontWeight: 700 }}
                    >
                      {eyebrow}
                    </p>
                  ) : null}
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
                    {title}
                  </h1>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <OperationsBadge tone={authorization.role === "platform_owner" ? "green" : "blue"}>
                    {operationsRoleLabel(authorization.role)}
                  </OperationsBadge>
                  <OperationsBadge tone="muted">USA Missionaries</OperationsBadge>
                  {action}
                </div>
              </div>
            </header>

            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

export function OperationsAccessDenied({
  active,
  authorization,
  title = "Access Limited",
}: {
  active: OperationsModule;
  authorization: Extract<OperationsAuthorization, { status: "authorized" }>;
  title?: string;
}) {
  return (
    <OperationsShell active={active} authorization={authorization} title={title}>
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
        <div className="flex items-start gap-3">
          <LockKeyhole aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            This Operations area is outside your current role or workflow scope.
          </p>
        </div>
      </section>
    </OperationsShell>
  );
}

export function OperationsBlocked({
  detail,
  showSignOut = false,
  title,
}: {
  detail: string;
  showSignOut?: boolean;
  title: string;
}) {
  return (
    <main className="min-h-screen bg-[#0B1220] px-5 py-16 text-white">
      <section className="mx-auto max-w-xl rounded-lg border border-white/10 bg-white/[0.05] p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#D8A932] text-[#0B1220]">
          <ShieldCheck aria-hidden="true" className="h-5 w-5" />
        </div>
        <p
          className="mt-5 text-[10px] uppercase tracking-[0.18em] text-[#D8A932]"
          style={{ fontFamily: operationsFont.rajdhani, fontWeight: 700 }}
        >
          Operations Access
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">
          {title}
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          {detail}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {showSignOut ? (
            <form action={signOutAdmin}>
              <button
                className="inline-flex min-h-10 w-full items-center justify-center rounded-md bg-white px-4 text-[11px] uppercase tracking-[0.14em] text-[#0B1220] sm:w-auto"
                style={{ fontFamily: operationsFont.rajdhani, fontWeight: 700 }}
                type="submit"
              >
                Try Another Account
              </button>
            </form>
          ) : null}
          <OperationsActionLink href="/" variant="outline">
            Return Home
          </OperationsActionLink>
        </div>
      </section>
    </main>
  );
}
