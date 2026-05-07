import Link from "next/link";
import type { ReactNode } from "react";
import { adminFont } from "./AdminUI";

const adminNavGroups = [
  {
    items: [
      { activeKey: "dashboard", href: "/admin/dashboard", label: "Command Center" },
      { activeKey: "missionary-profiles", href: "/admin/missionary-profiles", label: "Missionary Workspaces" },
      { activeKey: "public-experience", href: "/admin/public-experience", label: "Public Experience" },
      { activeKey: "prayer", href: "/admin/prayer-team", label: "Prayer Team" },
      { activeKey: "support-team", href: "/admin/support-team", label: "Support Team" },
      { activeKey: "product-feedback", href: "/admin/product-feedback", label: "Product Feedback" },
    ],
    title: "Main",
  },
  {
    items: [
      { activeKey: "uploads", href: "/admin/uploads", label: "Uploads" },
      { activeKey: "settings", href: "/admin/settings", label: "Settings" },
    ],
    title: "System",
  },
] as const;

type VisibleAdminNavKey = (typeof adminNavGroups)[number]["items"][number]["activeKey"];
type HiddenAdminNavKey = "financial-freedom" | "forms-pages" | "inquiries" | "pages" | "stewardship" | "support";

export type AdminNavKey = VisibleAdminNavKey | HiddenAdminNavKey;

function AdminNavLink({
  active,
  href,
  label,
}: {
  active: boolean;
  href: string;
  label: string;
}) {
  return (
    <Link
      className={`flex min-h-10 items-center border px-3 text-sm transition-colors ${
        active
          ? "border-[#C9A24A]/35 bg-[#C9A24A]/10 text-[#E4C465]"
          : "border-transparent text-stone-300 hover:border-stone-800 hover:bg-stone-950 hover:text-stone-50"
      }`}
      href={href}
    >
      {label}
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
  description: string;
  title: string;
}) {
  return (
    <main className="min-h-screen bg-[#050505] text-stone-100">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-stone-800/80 bg-[#070707] px-4 py-5 md:flex md:flex-col">
        <Link href="/admin/dashboard" className="flex min-h-11 items-center gap-3 border-b border-stone-800/70 pb-5">
          <span className="h-2 w-2 rotate-45 bg-[#C9A24A]" />
          <span className="text-xl font-semibold text-stone-100" style={{ fontFamily: adminFont.oswald }}>
            Command Center
          </span>
        </Link>

        <nav className="mt-6 flex flex-1 flex-col gap-5" aria-label="Admin navigation">
          {adminNavGroups.map((group) => (
            <div key={group.title}>
              <p className="mb-2 px-3 text-[10px] uppercase tracking-[0.16em] text-stone-400" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
                {group.title}
              </p>
              <div className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <AdminNavLink
                    key={item.activeKey}
                    active={active === item.activeKey}
                    href={item.href}
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

      <div className="md:pl-64">
        <header className="sticky top-0 z-30 border-b border-stone-800/80 bg-[#070707]/95 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center justify-between gap-4">
            <Link href="/admin/dashboard" className="flex items-center gap-3">
              <span className="h-2 w-2 rotate-45 bg-[#C9A24A]" />
              <span className="text-lg font-semibold text-stone-100" style={{ fontFamily: adminFont.oswald }}>
                Command Center
              </span>
            </Link>
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
                <p className="mb-1 text-[9px] uppercase tracking-[0.14em] text-stone-400" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
                  {group.title}
                </p>
                <div className="flex gap-2">
                  {group.items.map((item) => (
                    <Link
                      key={item.activeKey}
                      className={`shrink-0 border px-3 py-2 text-sm ${
                        active === item.activeKey
                          ? "border-[#C9A24A]/35 bg-[#C9A24A]/10 text-[#E4C465]"
                          : "border-stone-800 text-stone-300"
                      }`}
                      href={item.href}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </header>

        <section className="px-4 py-6 md:px-8 md:py-8 xl:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex flex-col gap-4 border-b border-stone-800/70 pb-5 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-stone-100 md:text-4xl">
                  {title}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-400 md:text-base">
                  {description}
                </p>
              </div>
              {action ? <div className="shrink-0">{action}</div> : null}
            </div>

            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
