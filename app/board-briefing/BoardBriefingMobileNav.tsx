const font = { rajdhani: "'Rajdhani', sans-serif" };

const sections = [
  { href: "#cover", label: "Intro" },
  { href: "#who-i-am", label: "Who I Am" },
  { href: "#vision", label: "USAM" },
  { href: "#kitchen-table", label: "Kitchen Table" },
  { href: "#stewardship", label: "Stewardship" },
  { href: "#save-standard", label: "SAVE" },
  { href: "#contribution", label: "Contribution" },
  { href: "#closing", label: "Discussion" },
] as const;

export function BoardBriefingMobileNav() {
  return (
    <nav
      aria-label="Section navigation"
      className="no-print sticky top-0 z-30 overflow-x-auto border-b border-stone-800/70 bg-[rgba(13,13,13,0.95)] px-4 py-2.5 lg:hidden"
      style={{ backdropFilter: "blur(10px)" }}
    >
      <ul className="flex w-max gap-5">
        {sections.map((section) => (
          <li key={section.href}>
            <a
              className="whitespace-nowrap text-[11px] uppercase tracking-[0.16em] text-stone-500 transition-colors hover:text-usam-gold"
              href={section.href}
              style={{ fontFamily: font.rajdhani, fontWeight: 600 }}
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
