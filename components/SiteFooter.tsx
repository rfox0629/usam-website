import Link from "next/link";
import { domainSites } from "@/src/lib/domain-sites";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

const footerLinks = [
  { href: "/system", label: "System" },
  { href: domainSites["kitchen-table-gospel"].canonicalOrigin, label: "Kitchen Table Gospel" },
  { href: domainSites["discipleship-operating-system"].canonicalOrigin, label: "DOS" },
  { href: "https://mor-mn.com/", label: "MOR" },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-stone-800/30 px-6 py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-3.5">
          <img
            src="/brand/logo/usam-website-logo.png"
            alt="USA Missionaries"
            className="h-auto w-[78px] object-contain md:w-[84px]"
          />
          <span
            className="text-xs uppercase tracking-[0.3em] text-stone-500"
            style={{ fontFamily: font.oswald }}
          >
            USA MISSIONARIES
          </span>
        </div>
        <div className="max-w-3xl text-left md:text-right">
          <nav aria-label="System footer navigation">
            <ul className="flex flex-wrap gap-x-5 gap-y-2 md:justify-end">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400 transition-colors hover:text-usam-gold"
                    href={link.href}
                    style={{ fontFamily: font.rajdhani }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <p
            className="mt-2 text-[10px] uppercase tracking-[0.16em] text-stone-600"
            style={{ fontFamily: font.rajdhani }}
          >
            Kitchen Table Gospel and DOS are USA Missionaries initiatives. MOR is a strategic ministry partner.
          </p>
          <p
            className="mt-4 text-xs uppercase tracking-[0.18em] text-stone-400"
            style={{ fontFamily: font.rajdhani }}
          >
            GO. MAKE DISCIPLES. BAPTIZE THEM. TEACH THEM THE COMMANDS. MATTHEW 28:19&ndash;20
          </p>
          <p className="mt-3 text-[11px] leading-5 text-stone-600">
            © 2026 USA Missionaries. All rights reserved. USA Missionaries is a registered 501(c)(3) nonprofit organization. All donations are tax-deductible as allowed by law.
          </p>
        </div>
      </div>
    </footer>
  );
}
