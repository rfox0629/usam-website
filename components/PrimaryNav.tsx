"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ecosystemNavItems } from "@/src/lib/ecosystem";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };
const navItems = [
  { key: "mission", label: "Mission", href: "/" },
  { key: "briefing", label: "Briefing", href: "/briefing" },
  { key: "dos", label: "Ecosystem", href: "/discipleship-operating-system" },
  { key: "prayer", label: "Prayer", href: "/prayer" },
  { key: "support", label: "Support", href: "/support" },
] as const;

type NavKey = (typeof navItems)[number]["key"];

type PrimaryNavProps = {
  active?: NavKey;
  fixed?: boolean;
  labelOverrides?: Partial<Record<NavKey, string>>;
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

function EcosystemMenu({
  active,
  label,
  mobile = false,
}: {
  active: boolean;
  label: string;
  mobile?: boolean;
}) {
  if (mobile) {
    return (
      <div className="border-b border-stone-900/80 py-3">
        <p
          className={`text-[13px] uppercase tracking-[0.18em] ${active ? "text-usam-gold" : "text-[rgba(255,255,255,0.88)]"}`}
          style={{ fontFamily: font.rajdhani, fontWeight: 600 }}
        >
          {label}
        </p>
        <div className="mt-2 grid gap-1">
          {ecosystemNavItems.map((item) => (
            <Link
              className="flex min-h-[40px] items-center justify-between gap-4 border border-transparent px-0 py-2 text-sm text-stone-400 transition-colors duration-200 hover:text-usam-gold"
              href={item.href}
              key={item.key}
            >
              <span>{item.shortLabel}</span>
              <span className="text-[10px] uppercase tracking-[0.16em] text-stone-600" style={{ fontFamily: font.rajdhani }}>
                {item.navDescription}
              </span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="group relative flex-none">
      <Link
        className={`inline-flex min-h-[28px] items-center whitespace-nowrap px-1 py-1 text-[11px] uppercase tracking-[0.34em] transition-colors duration-200 ease-out ${
          active ? "text-stone-300" : "text-stone-500 hover:text-stone-300"
        }`}
        href="/discipleship-operating-system"
        style={{ fontFamily: font.rajdhani, fontWeight: 600 }}
      >
        {label}
      </Link>
      <div className="pointer-events-none absolute right-0 top-full w-[280px] pt-4 opacity-0 transition duration-150 ease-out group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
        <div className="border border-stone-800/80 bg-[#0D0D0D]/95 p-2 shadow-[0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <p
            className="px-3 pb-2 pt-1 text-[10px] uppercase tracking-[0.22em] text-usam-gold/75"
            style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          >
            Our Ecosystem
          </p>
          <div className="grid gap-1">
            {ecosystemNavItems.map((item) => (
              <Link
                className="block border border-transparent px-3 py-2.5 transition-colors duration-200 hover:border-stone-800/80 hover:bg-white/[0.035]"
                href={item.href}
                key={item.key}
              >
                <span className="block text-sm text-stone-200">{item.label}</span>
                <span
                  className="mt-1 block text-[10px] uppercase tracking-[0.16em] text-stone-600"
                  style={{ fontFamily: font.rajdhani, fontWeight: 600 }}
                >
                  {item.navDescription}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PrimaryNav({ active, fixed = false, labelOverrides, minimal = false }: PrimaryNavProps) {
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
        <Link href="/" className="flex min-h-[32px] items-center gap-3.5 md:gap-4">
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
                    {item.key === "dos" ? (
                      <EcosystemMenu
                        active={active === item.key}
                        label={labelOverrides?.[item.key] ?? item.label}
                      />
                    ) : (
                      <NavLink
                        href={item.href}
                        label={labelOverrides?.[item.key] ?? item.label}
                        active={active === item.key}
                      />
                    )}
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
            {navItems.map((item) => item.key === "dos" ? (
              <EcosystemMenu
                active={active === item.key}
                key={item.key}
                label={labelOverrides?.[item.key] ?? item.label}
                mobile
              />
            ) : (
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
