"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

const navItems = [
  { key: "mission", label: "Mission", href: "/" },
  { key: "briefing", label: "Briefing", href: "/mission" },
  { key: "dos", label: "System", href: "/system" },
  { key: "prayer", label: "Prayer", href: "/prayer" },
  { key: "support", label: "Support", href: "/support" },
] as const;

type NavKey = (typeof navItems)[number]["key"];

type PrimaryNavProps = {
  active: NavKey;
  fixed?: boolean;
  labelOverrides?: Partial<Record<NavKey, string>>;
};

function NavLink({
  href,
  label,
  active,
  mobile = false,
}: {
  href: string;
  label: string;
  active: boolean;
  mobile?: boolean;
}) {
  const className = mobile
    ? `flex min-h-[50px] items-center border-b border-stone-900/80 py-3 text-[15px] uppercase tracking-[0.1em] transition-colors duration-200 ease-out last:border-b-0 ${
        active ? "text-amber-400" : "text-[rgba(255,255,255,0.88)] hover:text-amber-400"
      }`
    : `inline-flex min-h-[28px] items-center whitespace-nowrap px-1 py-1 text-[11px] uppercase tracking-[0.34em] transition-colors duration-200 ease-out ${
        active
          ? "text-stone-300"
          : "text-stone-500 hover:text-stone-300"
      }`;

  return (
    <Link
      href={href}
      className={className}
      style={{ fontFamily: font.rajdhani, fontWeight: 600 }}
    >
      {label}
    </Link>
  );
}

export function PrimaryNav({ active, fixed = false, labelOverrides }: PrimaryNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [active]);

  return (
    <header
      className={`${fixed ? "fixed" : "sticky"} inset-x-0 top-0 z-50 w-full border-b border-stone-800/60 bg-[rgba(5,5,5,0.9)]`}
      style={{ backdropFilter: "blur(12px)" }}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-7 py-3 md:px-10 md:py-3.5">
        <Link href="/" className="flex min-h-[32px] items-center gap-3 md:gap-3.5">
          <div className="h-2.5 w-2.5 rotate-45 bg-amber-500/70" />
          <span
            className="text-sm font-medium tracking-[0.35em] text-stone-300"
            style={{ fontFamily: font.oswald }}
          >
            USA MISSIONARIES
          </span>
        </Link>

        <nav className="ml-auto hidden md:flex" aria-label="Primary navigation">
          <ul className="flex flex-row items-center justify-end gap-8 lg:gap-10 xl:gap-12">
            {navItems.map((item) => (
              <li key={item.key} className="flex-none">
                <NavLink
                  href={item.href}
                  label={labelOverrides?.[item.key] ?? item.label}
                  active={active === item.key}
                />
              </li>
            ))}
          </ul>
        </nav>

        <button
          type="button"
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((value) => !value)}
          className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-sm border border-stone-700/80 text-[rgba(255,255,255,0.88)] transition-colors duration-200 hover:text-amber-400 md:hidden"
        >
          <span className="sr-only">Menu</span>
          <span className="flex flex-col gap-1.5">
            <span className={`block h-px w-5 bg-current transition-transform duration-200 ${mobileOpen ? "translate-y-[7px] rotate-45" : ""}`} />
            <span className={`block h-px w-5 bg-current transition-opacity duration-200 ${mobileOpen ? "opacity-0" : "opacity-100"}`} />
            <span className={`block h-px w-5 bg-current transition-transform duration-200 ${mobileOpen ? "-translate-y-[7px] -rotate-45" : ""}`} />
          </span>
        </button>
      </div>

      {mobileOpen ? (
        <nav className="border-t border-stone-800/50 md:hidden" aria-label="Mobile navigation">
          <div className="mx-auto flex w-full max-w-7xl flex-col px-8 py-3">
            {navItems.map((item) => (
              <NavLink
                key={item.key}
                href={item.href}
                label={labelOverrides?.[item.key] ?? item.label}
                active={active === item.key}
                mobile
              />
            ))}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
