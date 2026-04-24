const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

export function SiteFooter() {
  return (
    <footer className="border-t border-stone-800/30 px-6 py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rotate-45 bg-amber-500/70" />
          <span
            className="text-xs uppercase tracking-[0.3em] text-stone-500"
            style={{ fontFamily: font.oswald }}
          >
            USA MISSIONARIES
          </span>
        </div>
        <p
          className="max-w-3xl text-left text-xs uppercase tracking-[0.18em] text-stone-400 md:text-right"
          style={{ fontFamily: font.rajdhani }}
        >
          GO. MAKE DISCIPLES. BAPTIZE THEM. TEACH THEM THE COMMANDS. — MATTHEW 28:19–20
        </p>
      </div>
    </footer>
  );
}
