const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

export function SiteFooter() {
  return (
    <footer className="border-t border-stone-800/30 px-6 py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 md:flex-row md:items-center">
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
          <p
            className="text-xs uppercase tracking-[0.18em] text-stone-400"
            style={{ fontFamily: font.rajdhani }}
          >
            GO. MAKE DISCIPLES. BAPTIZE THEM. TEACH THEM THE COMMANDS. — MATTHEW 28:19–20
          </p>
          <p className="mt-3 text-[11px] leading-5 text-stone-600">
            © 2026 USA Missionaries. All rights reserved. USA Missionaries is a registered 501(c)(3) nonprofit organization. All donations are tax-deductible as allowed by law.
          </p>
        </div>
      </div>
    </footer>
  );
}
