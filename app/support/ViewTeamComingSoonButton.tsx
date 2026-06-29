import Link from "next/link";

const font = { rajdhani: "'Rajdhani', sans-serif" };

export function ViewTeamComingSoonButton() {
  return (
    <Link
      href="/missionaries"
      className="inline-flex min-h-12 w-full items-center justify-center border border-white/[0.3] bg-transparent px-7 py-3 text-center text-xs uppercase leading-5 tracking-[0.26em] text-white transition-all duration-300 hover:border-usam-gold hover:bg-white/[0.04] sm:w-auto"
      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
    >
      View the Team
    </Link>
  );
}
