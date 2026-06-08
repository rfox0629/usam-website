import Link from "next/link";
import type { ReactNode } from "react";
import { Activity, Building2, Globe, LayoutGrid, Settings, type LucideIcon } from "lucide-react";
import { adminFont } from "./AdminUI";
import { RolePreviewSelect } from "./RolePreviewSelect";

const adminNavGroups = [
  {
    items: [
      { activeKey: "dashboard", href: "/admin", icon: Activity, label: "Dashboard" },
      { activeKey: "organizations", href: "/admin/organizations", icon: Building2, label: "Organizations" },
      { activeKey: "workspaces", href: "/admin/workspaces", icon: LayoutGrid, label: "Platform" },
      { activeKey: "public-experience", href: "/admin/public-experience", icon: Globe, label: "Public Experience" },
      { activeKey: "settings", href: "/admin/settings", icon: Settings, label: "Settings" },
    ],
    title: "DOS Platform",
  },
] as const;

type VisibleAdminNavKey = (typeof adminNavGroups)[number]["items"][number]["activeKey"];
type HiddenAdminNavKey = "circle-engine" | "financial-freedom" | "forms-pages" | "inquiries" | "missionary-profiles" | "pages" | "prayer" | "product-feedback" | "relationship-intelligence" | "stewardship" | "support" | "support-team" | "uploads";

export type AdminNavKey = VisibleAdminNavKey | HiddenAdminNavKey;

function AdminNavLink({
  active,
  href,
  icon: Icon,
  label,
}: {
  active: boolean;
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link
      className={`group relative flex min-h-9 items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-[#C9A24A]/[0.08] text-[#E4C465]"
          : "text-stone-400 hover:bg-stone-900/70 hover:text-stone-100"
      }`}
      href={href}
    >
      <span
        aria-hidden="true"
        className={`absolute bottom-2 left-0 top-2 w-px rounded-full transition-colors ${
          active ? "bg-[#C9A24A]" : "bg-transparent group-hover:bg-stone-700"
        }`}
      />
      <Icon
        aria-hidden="true"
        className={`h-4 w-4 shrink-0 transition-colors ${
          active ? "text-[#D9AF43]" : "text-stone-600 group-hover:text-[#C9A24A]"
        }`}
        strokeWidth={1.8}
      />
      <span className="min-w-0 truncate">{label}</span>
    </Link>
  );
}

function AdminBrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/admin"
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
          USA Missionaries
        </span>
      </span>
    </Link>
  );
}

export function AdminShell({
  active,
  action,
  children,
  description,
  title,
}: {
  active: AdminNavKey;
  action?: ReactNode;
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050505] text-stone-100">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-stone-800/80 bg-[#070707] px-4 py-5 md:flex md:flex-col">
        <AdminBrandLockup />

        <nav className="mt-6 flex flex-1 flex-col gap-7" aria-label="Admin navigation">
          {adminNavGroups.map((group) => (
            <div key={group.title}>
              <p className="mb-2 px-3 text-[9px] uppercase tracking-[0.18em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
                {group.title}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <AdminNavLink
                    key={item.activeKey}
                    active={active === item.activeKey}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <Link
          className="mt-6 text-xs uppercase tracking-[0.16em] text-stone-500 transition-colors hover:text-[#C9A24A]"
          href="/"
          style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
        >
          Back to Site
        </Link>
      </aside>

      <div className="min-w-0 md:pl-64">
        <header className="sticky top-0 z-30 border-b border-stone-800/80 bg-[#070707]/95 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center justify-between gap-4">
            <AdminBrandLockup compact />
            <Link
              className="text-xs uppercase tracking-[0.16em] text-stone-500"
              href="/"
              style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
            >
              Site
            </Link>
          </div>
          <nav className="mt-3 flex gap-4 overflow-x-auto pb-1" aria-label="Admin mobile navigation">
            {adminNavGroups.map((group) => (
              <div key={group.title} className="shrink-0">
                <p className="mb-1 pl-1 text-[9px] uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
                  {group.title}
                </p>
                <div className="flex gap-1.5">
                  {group.items.map((item) => (
                    <Link
                      key={item.activeKey}
                      className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full px-3 text-xs transition-colors ${
                        active === item.activeKey
                          ? "bg-[#C9A24A]/[0.1] text-[#E4C465]"
                          : "text-stone-400 hover:bg-stone-900/70 hover:text-stone-100"
                      }`}
                      href={item.href}
                    >
                      <item.icon
                        aria-hidden="true"
                        className={`h-3.5 w-3.5 shrink-0 ${
                          active === item.activeKey ? "text-[#D9AF43]" : "text-stone-600"
                        }`}
                        strokeWidth={1.8}
                      />
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </header>

        <section className="min-w-0 max-w-full overflow-x-hidden px-4 py-6 md:px-8 md:py-8 xl:px-10">
          <div className="mx-auto max-w-7xl min-w-0">
            <div className="mb-6 flex flex-col gap-4 border-b border-stone-800/70 pb-5 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-stone-100 md:text-4xl">
                  {title}
                </h1>
                {description ? (
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-400 md:text-base">
                    {description}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                <RolePreviewSelect />
                {action ? <div>{action}</div> : null}
              </div>
            </div>

            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
