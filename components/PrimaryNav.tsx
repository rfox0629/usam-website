"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };
const navItems = [
  { key: "mission", label: "Mission", href: "/" },
  { key: "briefing", label: "Briefing", href: "/briefing" },
  { key: "ecosystem", label: "Ecosystem", href: "/ecosystem" },
  { key: "prayer", label: "Prayer", href: "/prayer" },
  { key: "support", label: "Support", href: "/support" },
] as const;

export type PrimaryNavKey = (typeof navItems)[number]["key"];

type PrimaryNavProps = {
  active?: PrimaryNavKey;
  brandHref?: string;
  fixed?: boolean;
  hrefOverrides?: Partial<Record<PrimaryNavKey, string>>;
  labelOverrides?: Partial<Record<PrimaryNavKey, string>>;
  minimal?: boolean;
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
        active ? "text-usam-gold" : "text-[rgba(255,255,255,0.88)] hover:text-usam-gold"
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

export function PrimaryNav({
  active,
  brandHref = "/",
  fixed = false,
  hrefOverrides,
  labelOverrides,
  minimal = false,
}: PrimaryNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [active]);

  return (
    <header
      className={`${fixed ? "fixed" : "sticky"} inset-x-0 top-0 z-50 w-full border-b border-stone-800/60 bg-[rgba(13,13,13,0.9)]`}
      style={{ backdropFilter: "blur(12px)" }}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-7 py-3 md:px-10 md:py-3.5">
        <Link href={brandHref} className="flex min-h-[32px] items-center gap-3.5 md:gap-4">
          <img
            src="/brand/logo/usam-website-logo.png"
            alt="USA Missionaries"
            className="h-auto w-[67px] object-contain md:w-[72px]"
          />
          <span
            className="text-sm font-medium tracking-[0.35em] text-stone-300"
            style={{ fontFamily: font.oswald }}
          >
            USA MISSIONARIES
          </span>
        </Link>

        {minimal ? null : (
          <>
            <nav className="ml-auto hidden md:flex" aria-label="Primary navigation">
              <ul className="flex flex-row items-center justify-end gap-8 lg:gap-10 xl:gap-12">
                {navItems.map((item) => (
                  <li key={item.key} className="flex-none">
                    <NavLink
                      href={hrefOverrides?.[item.key] ?? item.href}
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
              className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-sm border border-stone-700/80 text-[rgba(255,255,255,0.88)] transition-colors duration-200 hover:text-usam-gold md:hidden"
            >
              <span className="sr-only">Menu</span>
              <span className="flex flex-col gap-1.5">
                <span className={`block h-px w-5 bg-current transition-transform duration-200 ${mobileOpen ? "translate-y-[7px] rotate-45" : ""}`} />
                <span className={`block h-px w-5 bg-current transition-opacity duration-200 ${mobileOpen ? "opacity-0" : "opacity-100"}`} />
                <span className={`block h-px w-5 bg-current transition-transform duration-200 ${mobileOpen ? "-translate-y-[7px] -rotate-45" : ""}`} />
              </span>
            </button>
          </>
        )}
      </div>

      {!minimal && mobileOpen ? (
        <nav className="border-t border-stone-800/50 md:hidden" aria-label="Mobile navigation">
          <div className="mx-auto flex w-full max-w-7xl flex-col px-8 py-3">
            {navItems.map((item) => (
              <NavLink
                key={item.key}
                href={hrefOverrides?.[item.key] ?? item.href}
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
