"use client";

const font = { rajdhani: "'Rajdhani', sans-serif" };

export function VisionPrintButton() {
  return (
    <button
      className="no-print inline-flex items-center gap-2 border border-stone-700 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-300 transition-colors hover:border-usam-gold hover:text-usam-gold"
      onClick={() => window.print()}
      style={{ fontFamily: font.rajdhani }}
      type="button"
    >
      Print / Save as PDF
    </button>
  );
}
